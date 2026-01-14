import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { logger } from '../utils/logger';
import { DocumentProcessingJob } from '../queues/document.queue';
import { documentService } from '../services/document.service';
import { storageService } from '../services/storage.service';

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
        concurrency: 5, // Process up to 5 documents concurrently
        limiter: {
          max: 10, // Max 10 jobs
          duration: 1000, // per 1 second
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

    logger.info('Document worker started', {
      concurrency: 5,
    });
  }

  private async processDocument(job: Job<DocumentProcessingJob>): Promise<void> {
    const { documentId, supabasePath, userId, patientId } = job.data;

    try {
      logger.info('Starting document processing', {
        jobId: job.id,
        documentId,
        attempt: job.attemptsMade + 1,
      });

      // Update status to PROCESSING
      await documentService.updateDocumentStatus(documentId, 'PROCESSING', {
        processingStartedAt: new Date(),
      });

      // Update progress
      await job.updateProgress(10);

      // Download file from Supabase Storage
      logger.info('Downloading file from storage', { supabasePath });
      const fileBuffer = await storageService.downloadFile(supabasePath);
      await job.updateProgress(30);

      // TODO: Week 2 - Call Python service for extraction
      // For now, simulate processing with a delay
      logger.info('Processing document (simulated)', { documentId });
      await this.simulateProcessing(job, fileBuffer);
      await job.updateProgress(90);

      // Update status to COMPLETED
      await documentService.updateDocumentStatus(documentId, 'COMPLETED', {
        processingCompletedAt: new Date(),
      });

      await job.updateProgress(100);

      logger.info('Document processing completed successfully', {
        documentId,
        jobId: job.id,
      });
    } catch (error) {
      logger.error('Document processing error', {
        documentId,
        error,
      });

      // Update status to FAILED
      await documentService.updateDocumentStatus(documentId, 'FAILED');

      throw error; // Re-throw to mark job as failed
    }
  }

  /**
   * Simulates document processing
   * TODO: Replace this with actual Python service call in Week 2
   */
  private async simulateProcessing(
    job: Job<DocumentProcessingJob>,
    fileBuffer: Buffer
  ): Promise<void> {
    // Simulate processing time based on file size
    const processingTime = Math.min(5000, Math.max(1000, fileBuffer.length / 1000));

    logger.info('Simulating document processing', {
      fileSize: fileBuffer.length,
      processingTime,
    });

    // Simulate progress updates during processing
    const steps = 5;
    const stepTime = processingTime / steps;

    for (let i = 1; i <= steps; i++) {
      await new Promise((resolve) => setTimeout(resolve, stepTime));
      const progress = 30 + (i / steps) * 60; // Progress from 30% to 90%
      await job.updateProgress(progress);
    }

    // In Week 2, this will be replaced with:
    // const extractedData = await pythonService.extractDocument(fileBuffer, documentType);
    // await prisma.documentExtraction.create({ data: { documentId, extractedData, ... } });
  }

  async close() {
    await this.worker.close();
    logger.info('Document worker stopped');
  }
}

// Create and export worker instance
export const documentWorker = new DocumentWorker();
