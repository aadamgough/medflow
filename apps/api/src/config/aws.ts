import { TextractClient } from '@aws-sdk/client-textract';
import { ComprehendMedicalClient } from '@aws-sdk/client-comprehendmedical';
import { logger } from '../utils/logger';

const awsConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined, // Will use default credential chain if not provided
};

// Textract client for OCR
export const textractClient = new TextractClient(awsConfig);

// Comprehend Medical client for medical NER
export const comprehendMedicalClient = new ComprehendMedicalClient(awsConfig);

/**
 * Validate that AWS credentials are properly configured
 */
export function validateAwsConfig(): boolean {
  const hasCredentials = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  
  if (!hasCredentials) {
    logger.warn('AWS credentials not configured. Textract and Comprehend Medical will not be available.');
    return false;
  }
  
  logger.info('AWS configuration validated', {
    region: process.env.AWS_REGION || 'us-east-1',
    hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
  });
  
  return true;
}

/**
 * Check if AWS services are available
 */
export function isAwsConfigured(): boolean {
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

// AWS service configuration
export const awsServiceConfig = {
  textract: {
    // Maximum pages for synchronous API (async required for more)
    maxSyncPages: 1,
    // Features to enable
    defaultFeatures: ['TABLES', 'FORMS'] as const,
    // Confidence threshold for accepting results
    confidenceThreshold: 0.8,
  },
  comprehendMedical: {
    // Maximum text length per API call (20,000 characters)
    maxTextLength: 20000,
    // Entity types to extract
    entityTypes: [
      'MEDICATION',
      'MEDICAL_CONDITION',
      'PROTECTED_HEALTH_INFORMATION',
      'TEST_TREATMENT_PROCEDURE',
      'ANATOMY',
      'TIME_EXPRESSION',
    ] as const,
  },
};
