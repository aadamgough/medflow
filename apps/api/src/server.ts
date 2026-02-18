import dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { prisma } from './config/database';
import { logger } from './utils/logger';
import { storageService } from './services/storage.service';
import { startWorkers, stopWorkers } from './workers';
import authRoutes from './routes/auth.routes';
import documentRoutes from './routes/document.routes';
import patientRoutes from './routes/patient.routes';
import chatRoutes from './routes/chat.routes';

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/chat', chatRoutes);
// app.use('/api/timeline', timelineRoutes);

app.use((err: Error, req: Request, res: Response, next: any) => {
  logger.error('Unhandled error', err);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

async function startServer() {
  try {
    await prisma.$connect();
    logger.info('✓ Connected to database');

    await storageService.ensureBucketExists();
    logger.info('✓ Storage configured');

    if (process.env.START_WORKERS !== 'false') {
      startWorkers();
      logger.info('✓ Workers started');
    } else {
      logger.info('Workers disabled - run separately with npm run worker');
    }

    app.listen(port, () => {
      logger.info(`✓ Server running on http://localhost:${port}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await stopWorkers();
  await prisma.$disconnect();
  process.exit(0);
});

startServer();