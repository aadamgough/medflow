/**
 * Schema Mapper Service
 *
 * Parses LLM JSON output into typed schemas, validates required fields,
 * normalizes data formats, and generates extraction metadata.
 */

import { DocumentType, OcrEngine, ExtractionMethod } from '@prisma/client';
import { extractionConfig, documentTypeSchemas } from '../../config/extraction';
import { logger } from '../../utils/logger';
import {
  DocumentExtractionData,
  ExtractionMetadata,
  ValidationWarning,
  LabResultExtraction,
  DischargeSummaryExtraction,
  ConsultationNoteExtraction,
  PrescriptionExtraction,
  RadiologyReportExtraction,
  PathologyReportExtraction,
  OperativeNoteExtraction,
  ProgressNoteExtraction,
  ConsentFormExtraction,
  ClinicalTrialExtraction,
} from '../../types/extraction.types';
import {
  SchemaValidationResult,
  ValidationError,
  LLMExtractionResponse,
  FieldNormalization,
} from './types';

/**
 * Required fields for each document type
 */
const REQUIRED_FIELDS: Record<string, string[]> = {
  LAB_RESULT: ['patient', 'testResults'],
  DISCHARGE_SUMMARY: ['patient', 'admission', 'admission.date', 'discharge', 'discharge.date', 'diagnoses'],
  CONSULTATION_NOTE: ['patient', 'consultDate', 'consultingProvider', 'reasonForConsult', 'diagnoses'],
  PRESCRIPTION: ['patient', 'prescriber', 'prescriptionDate', 'medications'],
  RADIOLOGY_REPORT: ['patient', 'radiologist', 'studyDate', 'studyType', 'findings', 'impression'],
  PATHOLOGY_REPORT: ['patient', 'pathologist', 'specimenCollectionDate', 'reportDate', 'specimenType', 'specimenSource', 'diagnosis'],
  OPERATIVE_NOTE: ['patient', 'procedureDate', 'surgeon', 'preoperativeDiagnosis', 'postoperativeDiagnosis', 'procedures'],
  PROGRESS_NOTE: ['patient', 'provider', 'noteDate'],
  CONSENT_FORM: ['patient', 'consentType'],
  CLINICAL_TRIAL: ['patient'],
  PATIENT_INTAKE: ['patient'],
  INSURANCE_FORM: ['patient'],
  REFERRAL: ['patient', 'referringProvider', 'reasonForReferral'],
  UNKNOWN: ['patient'],
};

export class SchemaMapper {
  /**
   * Parse and validate LLM extraction response into typed schema.
   */
  parseAndValidate(
    llmResponse: LLMExtractionResponse,
    documentType: DocumentType,
    ocrEngines: OcrEngine[],
    processingTimeMs: number
  ): SchemaValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const normalizations: FieldNormalization[] = [];

    try {
      const rawData = llmResponse.extracted_data;

      // Validate required fields
      const requiredFields = REQUIRED_FIELDS[documentType] || REQUIRED_FIELDS.UNKNOWN;
      for (const field of requiredFields) {
        if (!this.hasField(rawData, field)) {
          errors.push({
            field,
            message: `Required field "${field}" is missing`,
            code: 'MISSING_REQUIRED',
          });
        }
      }

      // If critical errors, return early
      if (errors.length > 0) {
        logger.warn('Schema validation failed - missing required fields', {
          documentType,
          errors,
        });
        return {
          isValid: false,
          errors,
          warnings,
          normalizedData: null,
        };
      }

      // Normalize the data
      const normalizedData = this.normalizeData(rawData, documentType, normalizations);

      // Add metadata
      const metadata = this.createMetadata(
        llmResponse,
        documentType,
        ocrEngines,
        processingTimeMs,
        warnings
      );
      normalizedData._metadata = metadata;

      // Additional validation warnings
      this.addValidationWarnings(normalizedData, documentType, warnings);

      return {
        isValid: true,
        errors,
        warnings,
        normalizedData: normalizedData as unknown as DocumentExtractionData,
      };
    } catch (error) {
      logger.error('Schema mapping error', {
        documentType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      errors.push({
        field: '_root',
        message: `Failed to parse extraction data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: 'PARSE_ERROR',
      });

      return {
        isValid: false,
        errors,
        warnings,
        normalizedData: null,
      };
    }
  }

  /**
   * Check if a nested field exists in an object.
   */
  private hasField(obj: Record<string, unknown>, fieldPath: string): boolean {
    const parts = fieldPath.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return false;
      if (typeof current !== 'object') return false;
      current = (current as Record<string, unknown>)[part];
    }

    // Check for non-null, non-undefined, and non-empty arrays
    if (current === null || current === undefined) return false;
    if (Array.isArray(current) && current.length === 0) return false;

    return true;
  }

  /**
   * Normalize data based on document type.
   */
  private normalizeData(
    rawData: Record<string, unknown>,
    documentType: DocumentType,
    normalizations: FieldNormalization[]
  ): Record<string, unknown> {
    const normalized = { ...rawData };

    // Set document type
    normalized.documentType = documentType;

    // Normalize dates throughout the object
    this.normalizeDatesRecursively(normalized, '', normalizations);

    // Normalize patient info if present
    if (normalized.patient && typeof normalized.patient === 'object') {
      this.normalizePatientInfo(normalized.patient as Record<string, unknown>, normalizations);
    }

    // Type-specific normalizations
    switch (documentType) {
      case 'LAB_RESULT':
        this.normalizeLabResult(normalized, normalizations);
        break;
      case 'DISCHARGE_SUMMARY':
        this.normalizeDischargeSummary(normalized, normalizations);
        break;
      case 'PRESCRIPTION':
        this.normalizePrescription(normalized, normalizations);
        break;
      case 'RADIOLOGY_REPORT':
        this.normalizeRadiologyReport(normalized, normalizations);
        break;
    }

    return normalized;
  }

  /**
   * Recursively normalize date fields.
   */
  private normalizeDatesRecursively(
    obj: Record<string, unknown>,
    path: string,
    normalizations: FieldNormalization[]
  ): void {
    const dateFieldPatterns = [
      'date',
      'Date',
      'dob',
      'DOB',
      'dateOfBirth',
      'collectionDate',
      'reportDate',
      'admissionDate',
      'dischargeDate',
      'procedureDate',
      'studyDate',
      'startDate',
      'endDate',
      'onsetDate',
      'resolvedDate',
    ];

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        this.normalizeDatesRecursively(value as Record<string, unknown>, currentPath, normalizations);
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (item && typeof item === 'object') {
            this.normalizeDatesRecursively(item as Record<string, unknown>, `${currentPath}[${index}]`, normalizations);
          }
        });
      } else if (typeof value === 'string' && dateFieldPatterns.some((p) => key.includes(p))) {
        const normalizedDate = this.normalizeDate(value);
        if (normalizedDate !== value) {
          obj[key] = normalizedDate;
          normalizations.push({
            fieldPath: currentPath,
            originalValue: value,
            normalizedValue: normalizedDate,
            normalizationType: 'DATE',
          });
        }
      }
    }
  }

  /**
   * Normalize a date string to ISO format.
   */
  private normalizeDate(dateStr: string): string {
    if (!dateStr) return dateStr;

    // Already in ISO format
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      return dateStr;
    }

    // Common US formats
    const formats = [
      { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, groups: [3, 1, 2] }, // MM/DD/YYYY
      { regex: /^(\d{1,2})-(\d{1,2})-(\d{4})$/, groups: [3, 1, 2] }, // MM-DD-YYYY
      { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, groups: [3, 1, 2], addCentury: true }, // MM/DD/YY
      { regex: /^(\w+)\s+(\d{1,2}),?\s*(\d{4})$/i, handler: 'month' }, // Month DD, YYYY
    ];

    for (const format of formats) {
      if (format.handler === 'month') {
        const match = dateStr.match(format.regex);
        if (match) {
          const months: Record<string, string> = {
            january: '01', jan: '01',
            february: '02', feb: '02',
            march: '03', mar: '03',
            april: '04', apr: '04',
            may: '05',
            june: '06', jun: '06',
            july: '07', jul: '07',
            august: '08', aug: '08',
            september: '09', sep: '09', sept: '09',
            october: '10', oct: '10',
            november: '11', nov: '11',
            december: '12', dec: '12',
          };
          const month = months[match[1].toLowerCase()];
          if (month) {
            const day = match[2].padStart(2, '0');
            return `${match[3]}-${month}-${day}`;
          }
        }
      } else {
        const match = dateStr.match(format.regex);
        if (match && format.groups) {
          let year = match[format.groups[0]];
          if (format.addCentury && year.length === 2) {
            year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
          }
          const month = match[format.groups[1]].padStart(2, '0');
          const day = match[format.groups[2]].padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      }
    }

    return dateStr;
  }

  /**
   * Normalize patient information.
   */
  private normalizePatientInfo(
    patient: Record<string, unknown>,
    normalizations: FieldNormalization[]
  ): void {
    // Normalize gender
    if (patient.gender && typeof patient.gender === 'string') {
      const genderMap: Record<string, string> = {
        m: 'MALE',
        male: 'MALE',
        f: 'FEMALE',
        female: 'FEMALE',
        o: 'OTHER',
        other: 'OTHER',
        u: 'UNKNOWN',
        unknown: 'UNKNOWN',
      };
      const normalized = genderMap[patient.gender.toLowerCase()];
      if (normalized && normalized !== patient.gender) {
        normalizations.push({
          fieldPath: 'patient.gender',
          originalValue: patient.gender,
          normalizedValue: normalized,
          normalizationType: 'ENUM',
        });
        patient.gender = normalized;
      }
    }

    // Normalize name (title case)
    if (patient.name && typeof patient.name === 'string') {
      const titleCase = patient.name
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
      if (titleCase !== patient.name) {
        normalizations.push({
          fieldPath: 'patient.name',
          originalValue: patient.name,
          normalizedValue: titleCase,
          normalizationType: 'NAME',
        });
        patient.name = titleCase;
      }
    }
  }

  /**
   * Normalize lab result specific fields.
   */
  private normalizeLabResult(
    data: Record<string, unknown>,
    normalizations: FieldNormalization[]
  ): void {
    const testResults = data.testResults as Array<Record<string, unknown>> | undefined;
    if (!testResults) return;

    for (let i = 0; i < testResults.length; i++) {
      const result = testResults[i];

      // Normalize flag values
      if (result.flag && typeof result.flag === 'string') {
        const flagMap: Record<string, string> = {
          h: 'HIGH',
          high: 'HIGH',
          l: 'LOW',
          low: 'LOW',
          ch: 'CRITICAL_HIGH',
          cl: 'CRITICAL_LOW',
          a: 'ABNORMAL',
          abnormal: 'ABNORMAL',
          n: 'NORMAL',
          normal: 'NORMAL',
          '*': 'ABNORMAL',
        };
        const normalized = flagMap[result.flag.toLowerCase()];
        if (normalized) {
          result.flag = normalized;
        }
      }

      // Ensure confidence exists
      if (result.confidence === undefined) {
        result.confidence = 0.8;
      }
    }
  }

  /**
   * Normalize discharge summary specific fields.
   */
  private normalizeDischargeSummary(
    data: Record<string, unknown>,
    normalizations: FieldNormalization[]
  ): void {
    // Normalize admission source
    const admission = data.admission as Record<string, unknown> | undefined;
    if (admission?.source && typeof admission.source === 'string') {
      const sourceMap: Record<string, string> = {
        er: 'EMERGENCY',
        ed: 'EMERGENCY',
        emergency: 'EMERGENCY',
        transfer: 'TRANSFER',
        elective: 'ELECTIVE',
        observation: 'OBSERVATION',
        obs: 'OBSERVATION',
      };
      const normalized = sourceMap[admission.source.toLowerCase()];
      if (normalized) {
        admission.source = normalized;
      }
    }

    // Normalize discharge condition
    const discharge = data.discharge as Record<string, unknown> | undefined;
    if (discharge?.condition && typeof discharge.condition === 'string') {
      const conditionMap: Record<string, string> = {
        stable: 'STABLE',
        improved: 'IMPROVED',
        unchanged: 'UNCHANGED',
        deteriorated: 'DETERIORATED',
        worse: 'DETERIORATED',
      };
      const normalized = conditionMap[discharge.condition.toLowerCase()];
      if (normalized) {
        discharge.condition = normalized;
      }
    }

    // Ensure diagnoses have confidence
    const diagnoses = data.diagnoses as Array<Record<string, unknown>> | undefined;
    if (diagnoses) {
      for (const diagnosis of diagnoses) {
        if (diagnosis.confidence === undefined) {
          diagnosis.confidence = 0.8;
        }
      }
    }
  }

  /**
   * Normalize prescription specific fields.
   */
  private normalizePrescription(
    data: Record<string, unknown>,
    normalizations: FieldNormalization[]
  ): void {
    const medications = data.medications as Array<Record<string, unknown>> | undefined;
    if (!medications) return;

    for (const med of medications) {
      // Normalize route
      if (med.route && typeof med.route === 'string') {
        const routeMap: Record<string, string> = {
          po: 'ORAL',
          oral: 'ORAL',
          'by mouth': 'ORAL',
          iv: 'IV',
          intravenous: 'IV',
          im: 'IM',
          intramuscular: 'IM',
          topical: 'TOPICAL',
          inhaled: 'INHALATION',
          inhalation: 'INHALATION',
          sc: 'SUBCUTANEOUS',
          sq: 'SUBCUTANEOUS',
          subq: 'SUBCUTANEOUS',
          subcutaneous: 'SUBCUTANEOUS',
        };
        const normalized = routeMap[med.route.toLowerCase()];
        if (normalized) {
          med.route = normalized;
        }
      }

      // Ensure confidence
      if (med.confidence === undefined) {
        med.confidence = 0.8;
      }
    }
  }

  /**
   * Normalize radiology report specific fields.
   */
  private normalizeRadiologyReport(
    data: Record<string, unknown>,
    normalizations: FieldNormalization[]
  ): void {
    // Normalize laterality
    if (data.laterality && typeof data.laterality === 'string') {
      const lateralityMap: Record<string, string> = {
        left: 'LEFT',
        l: 'LEFT',
        right: 'RIGHT',
        r: 'RIGHT',
        bilateral: 'BILATERAL',
        both: 'BILATERAL',
        'n/a': 'N/A',
        na: 'N/A',
      };
      const normalized = lateralityMap[data.laterality.toLowerCase()];
      if (normalized) {
        data.laterality = normalized;
      }
    }

    // Normalize study type
    if (data.studyType && typeof data.studyType === 'string') {
      const studyTypeMap: Record<string, string> = {
        'ct scan': 'CT',
        'cat scan': 'CT',
        'computed tomography': 'CT',
        'magnetic resonance': 'MRI',
        'x-ray': 'X-Ray',
        xray: 'X-Ray',
        radiograph: 'X-Ray',
        'us': 'Ultrasound',
        sono: 'Ultrasound',
        sonogram: 'Ultrasound',
      };
      const lower = data.studyType.toLowerCase();
      for (const [pattern, normalized] of Object.entries(studyTypeMap)) {
        if (lower.includes(pattern)) {
          data.studyType = normalized;
          break;
        }
      }
    }
  }

  /**
   * Create extraction metadata.
   */
  private createMetadata(
    llmResponse: LLMExtractionResponse,
    documentType: DocumentType,
    ocrEngines: OcrEngine[],
    processingTimeMs: number,
    warnings: ValidationWarning[]
  ): ExtractionMetadata {
    const fieldConfidences = llmResponse.field_confidences || {};
    const confidenceValues = Object.values(fieldConfidences).filter(
      (v) => typeof v === 'number'
    ) as number[];
    const overallConfidence =
      confidenceValues.length > 0
        ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
        : 0.75;

    const lowConfidenceFields = Object.entries(fieldConfidences)
      .filter(([, conf]) => conf < extractionConfig.confidenceThreshold)
      .map(([field]) => field);

    return {
      extractedAt: new Date().toISOString(),
      ocrEngines: ocrEngines.map((e) => e as 'AWS_TEXTRACT' | 'MISTRAL_OCR' | 'TESSERACT'),
      extractionMethod: 'LLM_ASSISTED',
      overallConfidence,
      processingTimeMs,
      pageCount: 1, // Will be updated by caller if known
      warnings,
      lowConfidenceFields,
    };
  }

  /**
   * Add validation warnings for potentially problematic data.
   */
  private addValidationWarnings(
    data: Record<string, unknown>,
    documentType: DocumentType,
    warnings: ValidationWarning[]
  ): void {
    // Check for placeholder-like values
    const placeholderPatterns = [/^xxx+$/i, /^n\/a$/i, /^unknown$/i, /^tbd$/i, /^\?+$/];

    const checkForPlaceholders = (obj: Record<string, unknown>, path: string) => {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;

        if (typeof value === 'string') {
          for (const pattern of placeholderPatterns) {
            if (pattern.test(value)) {
              warnings.push({
                field: currentPath,
                message: `Field contains placeholder value: "${value}"`,
                severity: 'LOW',
              });
              break;
            }
          }
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
          checkForPlaceholders(value as Record<string, unknown>, currentPath);
        }
      }
    };

    checkForPlaceholders(data, '');

    // Check critical fields for review triggers
    const patient = data.patient as Record<string, unknown> | undefined;
    if (patient) {
      const metadata = data._metadata as ExtractionMetadata | undefined;
      const fieldConfidences = metadata?.lowConfidenceFields || [];

      if (fieldConfidences.includes('patient.name') || fieldConfidences.includes('patient.dateOfBirth')) {
        warnings.push({
          field: 'patient',
          message: 'Critical patient identification fields have low confidence',
          severity: 'HIGH',
        });
      }
    }
  }

  /**
   * Calculate overall confidence from field confidences.
   */
  calculateOverallConfidence(fieldConfidences: Record<string, number>): number {
    const values = Object.values(fieldConfidences);
    if (values.length === 0) return 0.75;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Determine if extraction requires human review.
   */
  shouldRequireReview(
    overallConfidence: number,
    lowConfidenceFields: string[],
    validationWarnings: ValidationWarning[]
  ): boolean {
    // Low overall confidence
    if (overallConfidence < extractionConfig.confidenceThreshold) {
      return true;
    }

    // Critical fields have low confidence
    const criticalFields = extractionConfig.validation.reviewTriggerFields;
    const hasLowConfidenceCriticalField = lowConfidenceFields.some((field) =>
      criticalFields.some((critical) => field.includes(critical))
    );
    if (hasLowConfidenceCriticalField) {
      return true;
    }

    // High severity validation warnings
    const hasHighSeverityWarning = validationWarnings.some((w) => w.severity === 'HIGH');
    if (hasHighSeverityWarning) {
      return true;
    }

    return false;
  }
}

export const schemaMapper = new SchemaMapper();
