import { Mistral } from '@mistralai/mistralai';
import { logger } from '../utils/logger';

export const mistralClient = process.env.MISTRAL_API_KEY
  ? new Mistral({ apiKey: process.env.MISTRAL_API_KEY })
  : null;

export const MISTRAL_OCR_MODEL = process.env.MISTRAL_OCR_MODEL || 'mistral-ocr-latest';

export function validateMistralConfig(): boolean {
  if (!process.env.MISTRAL_API_KEY) {
    logger.warn('Mistral API key not configured. Mistral OCR will not be available.');
    return false;
  }
  
  logger.info('Mistral configuration validated', {
    model: MISTRAL_OCR_MODEL,
  });
  
  return true;
}

export function isMistralConfigured(): boolean {
  return !!process.env.MISTRAL_API_KEY;
}

export const mistralOcrConfig = {
  model: MISTRAL_OCR_MODEL,
  
  tableFormat: 'markdown' as const,
  
  includeImages: false,
  
  includeHeadersFooters: true,
  
  confidenceThreshold: 0.75,
  
  maxFileSize: 50 * 1024 * 1024,
  
  supportedMimeTypes: [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/tiff',
    'image/webp',
  ],
};

export function getMistralClient(): Mistral {
  if (!mistralClient) {
    throw new Error('Mistral API key not configured. Set MISTRAL_API_KEY environment variable.');
  }
  return mistralClient;
}
