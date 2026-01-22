/**
 * Extraction Service Types
 *
 * Types specific to the document classification and extraction pipeline.
 */

import { DocumentType, OcrEngine, ExtractionMethod, ValidationStatus } from '@prisma/client';
import {
  DocumentExtractionData,
  ValidationWarning,
  OcrPage,
  OcrTable,
  OcrKeyValuePair,
} from '../../types/extraction.types';

// =============================================================================
// CLASSIFICATION TYPES
// =============================================================================

export interface ClassificationResult {
  documentType: DocumentType;
  confidence: number;
  method: 'PATTERN_MATCH' | 'LLM';
  alternativeTypes?: Array<{ type: DocumentType; confidence: number }>;
  reasoning?: string;
}

export interface PatternMatchResult {
  documentType: DocumentType;
  confidence: number;
  matchedPatterns: string[];
  totalMatches: number;
}

// =============================================================================
// EXTRACTION TYPES
// =============================================================================

export interface ExtractionResult {
  extractedData: DocumentExtractionData;
  fieldConfidences: Record<string, number>;
  lowConfidenceFields: string[];
  overallConfidence: number;
  requiresReview: boolean;
  validationWarnings: ValidationWarning[];
  validationErrors: ValidationError[];
  processingTimeMs: number;
  extractionMethod: ExtractionMethod;
}

export interface ValidationError {
  field: string;
  message: string;
  code: 'MISSING_REQUIRED' | 'INVALID_FORMAT' | 'OUT_OF_RANGE' | 'PARSE_ERROR';
}

export interface OcrInput {
  rawText: string;
  pages: OcrPage[];
  tables: OcrTable[];
  keyValuePairs: OcrKeyValuePair[];
  engine: OcrEngine;
  overallConfidence: number;
}

// =============================================================================
// LLM RESPONSE TYPES
// =============================================================================

export interface LLMClassificationResponse {
  document_type: string;
  confidence: number;
  reasoning: string;
  alternative_types?: Array<{
    type: string;
    confidence: number;
  }>;
}

export interface LLMExtractionResponse {
  extracted_data: Record<string, unknown>;
  field_confidences: Record<string, number>;
  extraction_notes?: string;
}

// =============================================================================
// SCHEMA MAPPER TYPES
// =============================================================================

export interface SchemaValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  normalizedData: DocumentExtractionData | null;
}

export interface FieldNormalization {
  fieldPath: string;
  originalValue: unknown;
  normalizedValue: unknown;
  normalizationType: 'DATE' | 'NAME' | 'CODE' | 'NUMBER' | 'ENUM';
}

// =============================================================================
// PIPELINE TYPES
// =============================================================================

export interface ExtractionPipelineResult {
  classification: ClassificationResult;
  extraction: ExtractionResult;
  documentId: string;
  processingTimeMs: number;
}

export interface ExtractionPipelineOptions {
  skipClassification?: boolean;
  forceDocumentType?: DocumentType;
  confidenceThreshold?: number;
  enableValidation?: boolean;
}
