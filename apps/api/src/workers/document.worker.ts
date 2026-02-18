import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { logger } from '../utils/logger';
import { DocumentProcessingJob } from '../queues/document.queue';
import { documentService } from '../services/document.service';
import { storageService } from '../services/storage.service';
import { ocrOrchestrator } from '../services/ocr';
import { documentPreprocessor } from '../services/preprocessing.service';
import { documentClassifier, extractionOrchestrator } from '../services/extraction';
import { prisma } from '../config/database';
import { ProcessingStatus, OcrEngine } from '@prisma/client';
import { OcrPage, OcrTable, OcrKeyValuePair } from '../types/extraction.types';

class DocumentWorker {
  private worker: Worker<DocumentProcessingJob>;

  constructor() {
    this.worker = new Worker<DocumentProcessingJob>(
      'document-processing',
      async (job: Job<DocumentProcessingJob>) => {
        return await this.processDocument(job);
      },
      {
        connection: redisConnection,
        concurrency: 5,
        limiter: {
          max: 10,
          duration: 1000,
        },
      }
    );

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.worker.on('completed', (job) => {
      logger.info('Document processing completed', {
        jobId: job.id,
        documentId: job.data.documentId,
      });
    });

    this.worker.on('failed', (job, err) => {
      logger.error('Document processing failed', {
        jobId: job?.id,
        documentId: job?.data.documentId,
        error: err.message,
        stack: err.stack,
      });
    });

    this.worker.on('error', (err) => {
      logger.error('Worker error', err);
    });

    logger.info('Document worker started', { concurrency: 5 });
  }

  private async processDocument(job: Job<DocumentProcessingJob>): Promise<void> {
    const { documentId, storagePath } = job.data;

    try {
      logger.info('Starting document processing', {
        jobId: job.id,
        documentId,
        attempt: job.attemptsMade + 1,
      });

      await this.updateStatus(documentId, 'PREPROCESSING', { processingStartedAt: new Date() });
      await job.updateProgress(10);

      logger.info('Downloading file from S3', { storagePath });
      const fileBuffer = await storageService.downloadFile(storagePath);
      await job.updateProgress(20);

      const document = await prisma.document.findUnique({
        where: { id: documentId },
        select: { mimeType: true, documentType: true },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      const preprocessed = await documentPreprocessor.preprocess(fileBuffer, document.mimeType);
      await job.updateProgress(30);
      await this.updateStatus(documentId, 'OCR_IN_PROGRESS');
      const ocrResult = await ocrOrchestrator.processDocument(
        preprocessed.buffer,
        preprocessed.mimeType,
        document.documentType || undefined,
        { enableTables: true, enableForms: true }
      );
      await job.updateProgress(70);

      await prisma.ocrResult.create({
        data: {
          documentId,
          ocrEngine: ocrResult.engine,
          engineVersion: ocrResult.engineVersion,
          rawText: ocrResult.rawText,
          rawResponse: ocrResult.rawResponse as object,
          pages: ocrResult.pages as object[],
          tables: ocrResult.tables as object[],
          keyValuePairs: ocrResult.keyValuePairs as object[],
          overallConfidence: ocrResult.overallConfidence,
          wordCount: ocrResult.wordCount,
          processingTimeMs: ocrResult.processingTimeMs,
        },
      });

      await prisma.document.update({
        where: { id: documentId },
        data: { pageCount: preprocessed.pageCount },
      });
      await job.updateProgress(75);

      // ==========================================================================
      // PHASE 3: Document Classification and Extraction
      // ==========================================================================

      await this.updateStatus(documentId, 'EXTRACTION_IN_PROGRESS');

      // 1. Classify document type
      logger.info('Starting document classification', { documentId });
      const classification = await documentClassifier.classify(
        ocrResult.rawText,
        document.documentType
      );
      await job.updateProgress(80);

      // 2. Update document with classification result
      await prisma.document.update({
        where: { id: documentId },
        data: {
          classifiedDocumentType: classification.documentType,
          classificationConfidence: classification.confidence,
        },
      });

      logger.info('Document classified', {
        documentId,
        documentType: classification.documentType,
        confidence: classification.confidence,
        method: classification.method,
      });

      // 3. Extract structured data
      logger.info('Starting structured extraction', { documentId, documentType: classification.documentType });

      const ocrInput = {
        rawText: ocrResult.rawText,
        pages: ocrResult.pages as OcrPage[],
        tables: ocrResult.tables as OcrTable[],
        keyValuePairs: ocrResult.keyValuePairs as OcrKeyValuePair[],
        engine: ocrResult.engine as OcrEngine,
        overallConfidence: ocrResult.overallConfidence,
      };

      const extraction = await extractionOrchestrator.extract(
        ocrInput,
        classification.documentType
      );
      await job.updateProgress(90);

      // 4. Determine final status based on extraction results
      const finalStatus: ProcessingStatus = extraction.validationErrors.length > 0
        ? 'FAILED'
        : 'COMPLETED';

      // 5. Create DocumentExtraction record
      await prisma.documentExtraction.create({
        data: {
          documentId,
          extractedData: extraction.extractedData as object,
          extractionMethod: extraction.extractionMethod,
          ocrEnginesUsed: [ocrResult.engine],
          overallConfidence: extraction.overallConfidence,
          fieldConfidences: extraction.fieldConfidences as object,
          lowConfidenceFields: extraction.lowConfidenceFields,
          validationStatus: extraction.validationErrors.length > 0
            ? 'FAILED'
            : extraction.validationWarnings.length > 0
            ? 'PASSED_WITH_WARNINGS'
            : 'PASSED',
          validationWarnings: extraction.validationWarnings as object[],
          validationErrors: extraction.validationErrors as object[],
          processingTimeMs: extraction.processingTimeMs,
        },
      });

      await this.updateStatus(documentId, finalStatus, { processingCompletedAt: new Date() });
      await job.updateProgress(100);

      logger.info('Document processing completed successfully', {
        documentId,
        jobId: job.id,
        ocrEngine: ocrResult.engine,
        ocrConfidence: ocrResult.overallConfidence,
        documentType: classification.documentType,
        classificationConfidence: classification.confidence,
        classificationMethod: classification.method,
        extractionConfidence: extraction.overallConfidence,
        wordCount: ocrResult.wordCount,
        totalProcessingTimeMs: ocrResult.processingTimeMs + extraction.processingTimeMs,
      });
    } catch (error) {
      logger.error('Document processing error', { documentId, error });

      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          retryCount: { increment: 1 },
        },
      });

      throw error;
    }
  }

  private async updateStatus(
    documentId: string,
    status: ProcessingStatus,
    data?: { processingStartedAt?: Date; processingCompletedAt?: Date }
  ) {
    await prisma.document.update({
      where: { id: documentId },
      data: { status, ...data },
    });
    logger.info('Document status updated', { documentId, status });
  }

  async close() {
    await this.worker.close();
    logger.info('Document worker stopped');
  }
}

export const documentWorker = new DocumentWorker();
