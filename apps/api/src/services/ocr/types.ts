import { OcrEngine } from '@prisma/client';
import { OcrPage, OcrTable, OcrKeyValuePair } from '../../types/extraction.types';
import { OcrEngine as ConfigOcrEngine } from '../../config/extraction';

export interface OcrServiceResult {
  engine: OcrEngine | ConfigOcrEngine;
  engineVersion?: string;
  rawText: string;
  pages: OcrPage[];
  tables: OcrTable[];
  keyValuePairs: OcrKeyValuePair[];
  overallConfidence: number;
  wordCount: number;
  processingTimeMs: number;
  rawResponse?: unknown;
}

export interface OcrServiceOptions {
  enableTables?: boolean;
  enableForms?: boolean;
  queries?: string[];
  pageRange?: { start: number; end: number };
}

export interface IOcrService {
  processDocument(
    fileBuffer: Buffer,
    mimeType: string,
    options?: OcrServiceOptions
  ): Promise<OcrServiceResult>;

  isAvailable(): boolean;
}

export interface PreprocessedDocument {
  buffer: Buffer;
  mimeType: string;
  pageCount: number;
  dpi?: number;
  wasRotated?: boolean;
  wasDeskewed?: boolean;
  qualityScore?: number;
}

export interface TextractAsyncJobInfo {
  jobId: string;
  bucket: string;
  key: string;
}
