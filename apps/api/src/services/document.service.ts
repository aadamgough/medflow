import { z } from 'zod';
import { prisma } from '../config/database';
import { storageService } from './storage.service';
import { addDocumentToQueue } from '../queues/document.queue';
import { logger } from '../utils/logger';
import { DocumentType } from '@prisma/client';

const uploadDocumentSchema = z.object({
  patientId: z.string().cuid('Invalid patient ID'),
  documentType: z.nativeEnum(DocumentType).optional(),
});

export class DocumentService {
  async uploadDocument(
    file: Express.Multer.File,
    userId: string,
    patientId: string,
    documentType?: DocumentType
  ) {
    try {
      const validated = uploadDocumentSchema.parse({ patientId, documentType });

      logger.info('Starting document upload', {
        userId,
        patientId: validated.patientId,
        filename: file.originalname,
        size: file.size,
      });

      const patient = await prisma.patient.findFirst({
        where: {
          id: validated.patientId,
          userId,
        },
      });

      if (!patient) {
        throw new Error('Patient not found or access denied');
      }

      const { path: supabasePath } = await storageService.uploadFile(
        file,
        userId,
        validated.patientId
      );

      const document = await prisma.document.create({
        data: {
          userId,
          patientId: validated.patientId,
          originalFilename: file.originalname,
          storagePath: supabasePath,
          storageBucket: 'documents',
          fileSize: file.size,
          mimeType: file.mimetype,
          documentType: validated.documentType || null,
          status: 'PENDING',
        },
      });

      logger.info('Document record created', {
        documentId: document.id,
        patientId: validated.patientId,
      });

      await addDocumentToQueue({
        documentId: document.id,
        supabasePath,
        userId,
        patientId: validated.patientId,
      });

      return {
        id: document.id,
        originalFilename: document.originalFilename,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        documentType: document.documentType,
        status: document.status,
        uploadedAt: document.uploadedAt,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error('Document upload validation failed', error.issues);
        throw new Error(error.issues[0].message);
      }
      logger.error('Document upload error', error);
      throw error;
    }
  }

  async getDocumentById(documentId: string, userId: string) {
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId,
      },
      include: {
        extraction: true,
        patient: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return document;
  }

  async getDocumentsByPatient(patientId: string, userId: string) {
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        userId,
      },
    });

    if (!patient) {
      throw new Error('Patient not found or access denied');
    }

    const documents = await prisma.document.findMany({
      where: {
        patientId,
        userId,
      },
      orderBy: {
        uploadedAt: 'desc',
      },
      include: {
        extraction: {
          select: {
            id: true,
            confidenceScore: true,
            extractedAt: true,
          },
        },
      },
    });

    return documents;
  }

  async deleteDocument(documentId: string, userId: string) {
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId,
      },
    });

    if (!document) {
      throw new Error('Document not found or access denied');
    }

    try {
      await storageService.deleteFile(document.storagePath);
    } catch (error) {
      logger.warn('Failed to delete file from storage', { documentId, error });
    }

    await prisma.document.delete({
      where: { id: documentId },
    });

    logger.info('Document deleted', { documentId });
  }

  async updateDocumentStatus(
    documentId: string,
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
    processingData?: {
      processingStartedAt?: Date;
      processingCompletedAt?: Date;
    }
  ) {
    const document = await prisma.document.update({
      where: { id: documentId },
      data: {
        status,
        ...processingData,
      },
    });

    logger.info('Document status updated', {
      documentId,
      status,
    });

    return document;
  }
}

export const documentService = new DocumentService();
