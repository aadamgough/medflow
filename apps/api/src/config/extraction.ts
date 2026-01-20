import { isAwsConfigured, validateAwsConfig } from './aws';
import { isMistralConfigured, validateMistralConfig } from './mistral';
import { logger } from '../utils/logger';

export type OcrEngine = 'AWS_TEXTRACT' | 'MISTRAL_OCR' | 'TESSERACT';

export const extractionConfig = {
  primaryEngine: (process.env.OCR_PRIMARY_ENGINE as OcrEngine) || 'MISTRAL_OCR',
  
  fallbackEngine: (process.env.OCR_FALLBACK_ENGINE as OcrEngine) || 'AWS_TEXTRACT',
  
  confidenceThreshold: parseFloat(process.env.EXTRACTION_CONFIDENCE_THRESHOLD || '0.85'),
  
  enableMedicalNer: process.env.ENABLE_MEDICAL_NER !== 'false',
  
  enableEnsembleMode: process.env.ENABLE_ENSEMBLE_OCR === 'true',
  
  maxRetries: parseInt(process.env.OCR_MAX_RETRIES || '3', 10),
  
  processingTimeout: parseInt(process.env.OCR_TIMEOUT_MS || '120000', 10),
  
  preprocessing: {
    targetDpi: 300,
    autoRotate: true,
    deskew: true,
    enhanceContrast: true,
  },
  
  validation: {
    requiredFields: {
      LAB_RESULT: ['patient', 'testResults'],
      DISCHARGE_SUMMARY: ['patient', 'admission', 'discharge', 'diagnoses'],
      PRESCRIPTION: ['patient', 'prescriber', 'medications'],
      RADIOLOGY_REPORT: ['patient', 'studyType', 'findings', 'impression'],
      CONSENT_FORM: ['patient', 'consentType'],
    } as Record<string, string[]>,
    
    reviewTriggerFields: ['patient.name', 'patient.dateOfBirth'],
  },
  
  costTracking: {
    enabled: process.env.ENABLE_COST_TRACKING !== 'false',
    costs: {
      AWS_TEXTRACT_TEXT: 0.0015,
      AWS_TEXTRACT_TABLES: 0.015,
      AWS_TEXTRACT_FORMS: 0.05,
      AWS_TEXTRACT_QUERIES: 0.015,
        AWS_COMPREHEND_MEDICAL: 0.0001,
      MISTRAL_OCR: 0.001,
      MISTRAL_OCR_BATCH: 0.0005,
    },
  },
};

export function validateExtractionConfig(): {
  isValid: boolean;
  availableEngines: OcrEngine[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const availableEngines: OcrEngine[] = [];
  
  if (validateAwsConfig()) {
    availableEngines.push('AWS_TEXTRACT');
  } else {
    warnings.push('AWS Textract not configured - will not be available');
  }
  
  if (validateMistralConfig()) {
    availableEngines.push('MISTRAL_OCR');
  } else {
    warnings.push('Mistral OCR not configured - will not be available');
  }
  
  const isValid = availableEngines.length > 0;
  
  if (!isValid) {
    logger.error('No OCR engines configured! At least one of AWS_TEXTRACT or MISTRAL_OCR must be configured.');
  } else {
    logger.info('Extraction configuration validated', {
      availableEngines,
      primaryEngine: extractionConfig.primaryEngine,
      fallbackEngine: extractionConfig.fallbackEngine,
      confidenceThreshold: extractionConfig.confidenceThreshold,
      medicalNerEnabled: extractionConfig.enableMedicalNer,
    });
  }
  
  if (!availableEngines.includes(extractionConfig.primaryEngine)) {
    warnings.push(`Primary engine ${extractionConfig.primaryEngine} is not configured`);
  }
  
  return { isValid, availableEngines, warnings };
}

export function selectOcrEngine(documentType?: string, hasComplexTables?: boolean): OcrEngine {
  const awsAvailable = isAwsConfigured();
  const mistralAvailable = isMistralConfigured();
  
  if (awsAvailable && !mistralAvailable) return 'AWS_TEXTRACT';
  if (mistralAvailable && !awsAvailable) return 'MISTRAL_OCR';
  
  if (awsAvailable && mistralAvailable) {
    if (hasComplexTables || documentType === 'LAB_RESULT') {
      return 'AWS_TEXTRACT';
    }
    
    return extractionConfig.primaryEngine;
  }
  
  return 'TESSERACT';
}

export const documentTypeSchemas = {
  LAB_RESULT: 'LabResultExtraction',
  DISCHARGE_SUMMARY: 'DischargeSummaryExtraction',
  CONSULTATION_NOTE: 'ConsultationNoteExtraction',
  PRESCRIPTION: 'PrescriptionExtraction',
  RADIOLOGY_REPORT: 'RadiologyReportExtraction',
  PATHOLOGY_REPORT: 'PathologyReportExtraction',
  OPERATIVE_NOTE: 'OperativeNoteExtraction',
  PROGRESS_NOTE: 'ProgressNoteExtraction',
  CONSENT_FORM: 'ConsentFormExtraction',
  CLINICAL_TRIAL: 'ClinicalTrialExtraction',
  PATIENT_INTAKE: 'ConsentFormExtraction',
  INSURANCE_FORM: 'ConsentFormExtraction',
  REFERRAL: 'ConsultationNoteExtraction',
  UNKNOWN: 'ProgressNoteExtraction',
} as const;
