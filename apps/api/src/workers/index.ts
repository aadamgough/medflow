import { documentWorker } from './document.worker';
import { logger } from '../utils/logger';

// Initialize all workers
export function startWorkers() {
  logger.info('Starting all workers...');
  
  // Workers are initialized in their respective files
  // This file serves as the central point for worker management
  
  logger.info('All workers started successfully');
}

// Graceful shutdown
export async function stopWorkers() {
  logger.info('Stopping all workers...');
  
  try {
    await documentWorker.close();
    logger.info('All workers stopped successfully');
  } catch (error) {
    logger.error('Error stopping workers', error);
  }
}

// Handle process termination
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down workers');
  await stopWorkers();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down workers');
  await stopWorkers();
  process.exit(0);
});
