import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';
import { logger } from '../utils/logger';

export interface DocumentProcessingJob {
  documentId: string;
  storagePath: string;
  userId: string;
  patientId: string;
}

// Create document processing queue
export const documentQueue = new Queue<DocumentProcessingJob>('document-processing', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 seconds
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

documentQueue.on('error', (error) => {
  logger.error('Document queue error', error);
});

logger.info('Document processing queue initialized');

export async function addDocumentToQueue(jobData: DocumentProcessingJob): Promise<string> {
  try {
    const job = await documentQueue.add('process-document', jobData, {
      jobId: jobData.documentId, // Use document ID as job ID to prevent duplicates
    });

    logger.info('Document added to processing queue', {
      jobId: job.id,
      documentId: jobData.documentId,
    });

    return job.id || jobData.documentId;
  } catch (error) {
    logger.error('Failed to add document to queue', error);
    throw error;
  }
}
