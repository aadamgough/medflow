import { TextractClient } from '@aws-sdk/client-textract';
import { ComprehendMedicalClient } from '@aws-sdk/client-comprehendmedical';
import { S3Client } from '@aws-sdk/client-s3';
import { logger } from '../utils/logger';

const awsConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined,
};

export const textractClient = new TextractClient(awsConfig);
export const comprehendMedicalClient = new ComprehendMedicalClient(awsConfig);
export const s3Client = new S3Client(awsConfig);

export const s3Config = {
  documentsBucket: process.env.AWS_S3_DOCUMENTS_BUCKET || 'medflow-documents',
  profilePicturesBucket: process.env.AWS_S3_PROFILE_PICTURES_BUCKET || 'medflow-profile-pictures',
  region: process.env.AWS_REGION || 'us-east-1',
  uploadUrlExpiration: 3600,
  downloadUrlExpiration: 3600,
};

export function validateAwsConfig(): boolean {
  const hasCredentials = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  
  if (!hasCredentials) {
    logger.warn('AWS credentials not configured. AWS services will not be available.');
    return false;
  }
  
  logger.info('AWS configuration validated', {
    region: process.env.AWS_REGION || 'us-east-1',
    hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
    documentsBucket: s3Config.documentsBucket,
    profilePicturesBucket: s3Config.profilePicturesBucket,
  });
  
  return true;
}

export function isAwsConfigured(): boolean {
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

export const awsServiceConfig = {
  textract: {
    maxSyncPages: 1,
    defaultFeatures: ['TABLES', 'FORMS'] as const,
    confidenceThreshold: 0.8,
  },
  comprehendMedical: {
    maxTextLength: 20000,
    entityTypes: [
      'MEDICATION',
      'MEDICAL_CONDITION',
      'PROTECTED_HEALTH_INFORMATION',
      'TEST_TREATMENT_PROCEDURE',
      'ANATOMY',
      'TIME_EXPRESSION',
    ] as const,
  },
  s3: {
    maxFileSize: 50 * 1024 * 1024,
    maxProfilePictureSize: 2 * 1024 * 1024,
    allowedDocumentTypes: [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/tiff',
      'image/webp',
    ],
    allowedProfilePictureTypes: [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
    ],
  },
};
