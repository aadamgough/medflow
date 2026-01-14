import dotenv from 'dotenv';
dotenv.config();

import { startWorkers } from './workers';
import { logger } from './utils/logger';

logger.info('Starting worker process...');

// Start all workers
startWorkers();

logger.info('Worker process started successfully');
