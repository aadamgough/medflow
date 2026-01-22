/**
 * Document Classifier Service
 *
 * Analyzes OCR text to determine document type using pattern matching
 * as the primary method with LLM fallback for ambiguous cases.
 */

import { DocumentType } from '@prisma/client';
import { getMistralClient, isMistralConfigured } from '../../config/mistral';
import { extractionConfig, classificationConfig } from '../../config/extraction';
import { logger } from '../../utils/logger';
import { ClassificationResult, PatternMatchResult, LLMClassificationResponse } from './types';
import {
  CLASSIFICATION_SYSTEM_PROMPT,
  CLASSIFICATION_USER_PROMPT,
  CLASSIFICATION_FEW_SHOT_EXAMPLES,
} from './prompts/classification.prompts';

/**
 * Pattern indicators for each document type.
 * Patterns are case-insensitive and matched against the full OCR text.
 */
const DOCUMENT_PATTERNS: Record<DocumentType, string[]> = {
  LAB_RESULT: [
    'reference range',
    'specimen',
    'collection date',
    'lab result',
    'laboratory report',
    'CBC',
    'complete blood count',
    'BMP',
    'basic metabolic panel',
    'comprehensive metabolic',
    'lipid panel',
    'hemoglobin',
    'hematocrit',
    'WBC',
    'RBC',
    'platelet',
    'glucose',
    'creatinine',
    'urinalysis',
    'blood gas',
    'electrolytes',
    'K/uL',
    'mg/dL',
    'mEq/L',
    'g/dL',
    'accession',
  ],
  DISCHARGE_SUMMARY: [
    'discharge summary',
    'admission date',
    'discharge date',
    'hospital course',
    'discharge instructions',
    'discharge diagnosis',
    'discharge medications',
    'admission diagnosis',
    'length of stay',
    'discharge disposition',
    'discharge condition',
    'follow-up appointments',
    'attending physician',
    'admitted to',
    'discharged to',
    'discharge plan',
  ],
  CONSULTATION_NOTE: [
    'consultation',
    'consult note',
    'reason for consultation',
    'consulting physician',
    'thank you for this consultation',
    'thank you for referring',
    'appreciate the consultation',
    'consultation requested',
    'consultative opinion',
    'recommendations',
    'assessment and plan',
    'differential diagnosis',
  ],
  PRESCRIPTION: [
    'rx',
    'prescription',
    'dispense',
    'refill',
    'sig:',
    'take by mouth',
    'tablets',
    'capsules',
    'DEA',
    'NPI',
    'quantity:',
    'days supply',
    'substitution',
    'dispense as written',
    'may substitute',
    'prn',
    'refills:',
    'pharmacy',
  ],
  RADIOLOGY_REPORT: [
    'radiology report',
    'imaging report',
    'impression:',
    'findings:',
    'technique:',
    'comparison:',
    'CT scan',
    'MRI',
    'X-ray',
    'ultrasound',
    'radiologist',
    'contrast',
    'no acute',
    'unremarkable',
    'examination:',
    'clinical indication',
    'fluoroscopy',
    'mammogram',
    'DEXA',
    'nuclear medicine',
  ],
  PATHOLOGY_REPORT: [
    'pathology report',
    'surgical pathology',
    'gross description',
    'microscopic description',
    'microscopic examination',
    'specimen received',
    'specimen submitted',
    'diagnosis:',
    'biopsy',
    'histologic',
    'immunohistochemistry',
    'tumor grade',
    'margin status',
    'pathologist',
    'cytology',
    'frozen section',
    'TNM staging',
  ],
  OPERATIVE_NOTE: [
    'operative report',
    'operative note',
    'surgical report',
    'preoperative diagnosis',
    'postoperative diagnosis',
    'procedure performed',
    'operation performed',
    'anesthesia:',
    'surgeon:',
    'estimated blood loss',
    'specimens removed',
    'drains',
    'complications:',
    'sponge count',
    'instrument count',
    'disposition from OR',
  ],
  PROGRESS_NOTE: [
    'progress note',
    'daily note',
    'SOAP',
    'subjective:',
    'objective:',
    'assessment:',
    'plan:',
    'vital signs',
    'chief complaint',
    'history of present illness',
    'review of systems',
    'physical exam',
    'current medications',
    'problem list',
    'hospital day',
  ],
  CONSENT_FORM: [
    'consent',
    'informed consent',
    'i consent to',
    'i understand',
    'risks and benefits',
    'patient signature',
    'witness signature',
    'authorization',
    'i hereby authorize',
    'alternatives explained',
    'right to refuse',
    'voluntary',
    'date of signature',
  ],
  PATIENT_INTAKE: [
    'patient registration',
    'new patient',
    'intake form',
    'demographic',
    'emergency contact',
    'insurance information',
    'medical history',
    'allergies list',
    'current medications list',
    'family history',
    'social history',
    'primary care physician',
  ],
  INSURANCE_FORM: [
    'insurance',
    'policy number',
    'group number',
    'member ID',
    'claim',
    'prior authorization',
    'pre-certification',
    'benefits',
    'coverage',
    'subscriber',
    'explanation of benefits',
    'EOB',
    'copay',
    'deductible',
  ],
  REFERRAL: [
    'referral',
    'refer this patient',
    'referring physician',
    'referred to',
    'reason for referral',
    'please evaluate',
    'please see',
    'consultation requested',
    'specialist evaluation',
    'urgent referral',
  ],
  CLINICAL_TRIAL: [
    'clinical trial',
    'research study',
    'protocol',
    'investigator',
    'sponsor',
    'informed consent for research',
    'NCT',
    'IRB',
    'adverse event',
    'study visit',
    'randomization',
    'placebo',
    'study drug',
    'inclusion criteria',
    'exclusion criteria',
  ],
  UNKNOWN: [],
};

/**
 * Weight multipliers for certain high-specificity patterns
 */
const PATTERN_WEIGHTS: Record<string, number> = {
  'discharge summary': 3.0,
  'operative report': 3.0,
  'operative note': 3.0,
  'pathology report': 3.0,
  'radiology report': 3.0,
  'laboratory report': 3.0,
  'consultation': 2.0,
  'progress note': 2.0,
  'informed consent': 2.5,
  'clinical trial': 3.0,
  'reference range': 2.0,
  'gross description': 2.5,
  'microscopic description': 2.5,
};

export class DocumentClassifier {
  /**
   * Classify a document based on its OCR text.
   *
   * @param ocrText - The raw OCR text from the document
   * @param userProvidedType - Optional user-provided document type to validate against
   * @returns Classification result with document type and confidence
   */
  async classify(
    ocrText: string,
    userProvidedType?: DocumentType | null
  ): Promise<ClassificationResult> {
    const startTime = Date.now();

    // First, try pattern matching
    const patternResult = this.classifyByPatterns(ocrText);

    logger.info('Pattern matching classification result', {
      documentType: patternResult.documentType,
      confidence: patternResult.confidence,
      matchedPatterns: patternResult.matchedPatterns.slice(0, 5),
      totalMatches: patternResult.totalMatches,
    });

    // If pattern matching is confident enough, use it
    if (patternResult.confidence >= classificationConfig.patternMatchMinConfidence) {
      // Validate against user-provided type if available
      if (userProvidedType && userProvidedType !== patternResult.documentType) {
        logger.warn('Classification differs from user-provided type', {
          classified: patternResult.documentType,
          userProvided: userProvidedType,
          confidence: patternResult.confidence,
        });
      }

      return {
        documentType: patternResult.documentType,
        confidence: patternResult.confidence,
        method: 'PATTERN_MATCH',
      };
    }

    // If pattern matching is not confident and LLM is available, use LLM
    if (classificationConfig.llmFallbackEnabled && isMistralConfigured()) {
      try {
        const llmResult = await this.classifyByLLM(ocrText);

        logger.info('LLM classification result', {
          documentType: llmResult.documentType,
          confidence: llmResult.confidence,
          reasoning: llmResult.reasoning,
          processingTimeMs: Date.now() - startTime,
        });

        return llmResult;
      } catch (error) {
        logger.error('LLM classification failed, falling back to pattern result', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Fall back to pattern matching result (even if low confidence)
    return {
      documentType: patternResult.documentType,
      confidence: patternResult.confidence,
      method: 'PATTERN_MATCH',
    };
  }

  /**
   * Classify document using pattern matching.
   */
  private classifyByPatterns(ocrText: string): PatternMatchResult {
    const textLower = ocrText.toLowerCase();
    const scores: Map<DocumentType, { score: number; matches: string[] }> = new Map();

    // Calculate weighted scores for each document type
    for (const [docType, patterns] of Object.entries(DOCUMENT_PATTERNS)) {
      if (docType === 'UNKNOWN') continue;

      const matches: string[] = [];
      let score = 0;

      for (const pattern of patterns) {
        const patternLower = pattern.toLowerCase();
        const regex = new RegExp(patternLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matchCount = (textLower.match(regex) || []).length;

        if (matchCount > 0) {
          matches.push(pattern);
          const weight = PATTERN_WEIGHTS[patternLower] || 1.0;
          // Diminishing returns for multiple matches of same pattern
          score += weight * Math.log2(matchCount + 1);
        }
      }

      if (score > 0) {
        scores.set(docType as DocumentType, { score, matches });
      }
    }

    // Find the best match
    let bestType: DocumentType = 'UNKNOWN';
    let bestScore = 0;
    let bestMatches: string[] = [];

    for (const [docType, result] of scores) {
      if (result.score > bestScore) {
        bestScore = result.score;
        bestType = docType;
        bestMatches = result.matches;
      }
    }

    // Calculate confidence based on score relative to document length and pattern diversity
    // Higher scores with more diverse pattern matches = higher confidence
    const patternDiversity = bestMatches.length / (DOCUMENT_PATTERNS[bestType]?.length || 1);
    const normalizedScore = Math.min(bestScore / 10, 1); // Cap at 1
    const confidence = Math.min(0.5 + normalizedScore * 0.3 + patternDiversity * 0.2, 0.99);

    return {
      documentType: bestType,
      confidence: bestScore > 0 ? confidence : 0,
      matchedPatterns: bestMatches,
      totalMatches: bestMatches.length,
    };
  }

  /**
   * Classify document using LLM.
   */
  private async classifyByLLM(ocrText: string): Promise<ClassificationResult> {
    const client = getMistralClient();

    const response = await client.chat.complete({
      model: classificationConfig.llmModel,
      messages: [
        { role: 'system', content: CLASSIFICATION_SYSTEM_PROMPT },
        ...CLASSIFICATION_FEW_SHOT_EXAMPLES,
        { role: 'user', content: CLASSIFICATION_USER_PROMPT(ocrText) },
      ],
      temperature: 0.1,
      responseFormat: { type: 'json_object' },
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No response from LLM');
    }

    // Handle content which can be string or ContentChunk[]
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    const parsed: LLMClassificationResponse = JSON.parse(contentStr);

    // Validate and map the document type
    const documentType = this.mapToDocumentType(parsed.document_type);

    return {
      documentType,
      confidence: parsed.confidence,
      method: 'LLM',
      reasoning: parsed.reasoning,
      alternativeTypes: parsed.alternative_types?.map((alt) => ({
        type: this.mapToDocumentType(alt.type),
        confidence: alt.confidence,
      })),
    };
  }

  /**
   * Map string to DocumentType enum, handling variations.
   */
  private mapToDocumentType(typeString: string): DocumentType {
    const normalized = typeString.toUpperCase().replace(/[\s-]/g, '_');

    // Check if it's a valid DocumentType
    const validTypes: DocumentType[] = [
      'LAB_RESULT',
      'DISCHARGE_SUMMARY',
      'CONSULTATION_NOTE',
      'PRESCRIPTION',
      'RADIOLOGY_REPORT',
      'PATHOLOGY_REPORT',
      'OPERATIVE_NOTE',
      'PROGRESS_NOTE',
      'CONSENT_FORM',
      'PATIENT_INTAKE',
      'INSURANCE_FORM',
      'REFERRAL',
      'CLINICAL_TRIAL',
      'UNKNOWN',
    ];

    if (validTypes.includes(normalized as DocumentType)) {
      return normalized as DocumentType;
    }

    // Handle common variations
    const mappings: Record<string, DocumentType> = {
      LAB: 'LAB_RESULT',
      LABS: 'LAB_RESULT',
      LABORATORY: 'LAB_RESULT',
      DISCHARGE: 'DISCHARGE_SUMMARY',
      CONSULT: 'CONSULTATION_NOTE',
      CONSULTATION: 'CONSULTATION_NOTE',
      RX: 'PRESCRIPTION',
      XRAY: 'RADIOLOGY_REPORT',
      IMAGING: 'RADIOLOGY_REPORT',
      RADIOLOGY: 'RADIOLOGY_REPORT',
      PATHOLOGY: 'PATHOLOGY_REPORT',
      BIOPSY: 'PATHOLOGY_REPORT',
      SURGERY: 'OPERATIVE_NOTE',
      OPERATIVE: 'OPERATIVE_NOTE',
      PROGRESS: 'PROGRESS_NOTE',
      SOAP: 'PROGRESS_NOTE',
      CONSENT: 'CONSENT_FORM',
      INTAKE: 'PATIENT_INTAKE',
      REGISTRATION: 'PATIENT_INTAKE',
      INSURANCE: 'INSURANCE_FORM',
      REFERRAL_LETTER: 'REFERRAL',
      TRIAL: 'CLINICAL_TRIAL',
      RESEARCH: 'CLINICAL_TRIAL',
    };

    return mappings[normalized] || 'UNKNOWN';
  }
}

export const documentClassifier = new DocumentClassifier();
