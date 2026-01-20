import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import {
  CreatePatientRequest,
  UpdatePatientRequest,
  PatientListOptions,
  PatientSummary,
} from '../types';

// Date string validation (accepts ISO date or YYYY-MM-DD format)
const dateStringSchema = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Invalid date format' }
);

// Validation schemas
const createPatientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  dateOfBirth: dateStringSchema.optional(),
  externalId: z.string().max(100).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const updatePatientSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  dateOfBirth: dateStringSchema.optional().nullable(),
  externalId: z.string().max(100).optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
});

export class PatientService {
  async create(userId: string, data: CreatePatientRequest) {
    try {
      const validated = createPatientSchema.parse(data);

      logger.info('Creating patient', { userId, name: validated.name });

      const patient = await prisma.patient.create({
        data: {
          userId,
          name: validated.name,
          dateOfBirth: validated.dateOfBirth ? new Date(validated.dateOfBirth) : null,
          externalId: validated.externalId || null,
          metadata: validated.metadata ? (validated.metadata as Prisma.JsonValue) : Prisma.JsonNull,
        },
      });

      logger.info('Patient created successfully', { patientId: patient.id, userId });

      return patient;
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error('Patient creation validation failed', error.issues);
        throw new Error(error.issues[0].message);
      }
      logger.error('Patient creation error', error);
      throw error;
    }
  }

  async findById(patientId: string, userId: string) {
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        userId,
      },
    });

    return patient;
  }

  async findAllByUser(userId: string, options: PatientListOptions = {}) {
    const { search, limit = 20, offset = 0 } = options;

    const where: any = { userId };

    // Add search filter if provided
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { externalId: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.patient.count({ where });

    // Get paginated results
    const patients = await prisma.patient.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return {
      data: patients,
      total,
      limit,
      offset,
    };
  }

  async update(patientId: string, userId: string, data: UpdatePatientRequest) {
    try {
      const validated = updatePatientSchema.parse(data);

      // Verify patient exists and belongs to user
      const existingPatient = await prisma.patient.findFirst({
        where: {
          id: patientId,
          userId,
        },
      });

      if (!existingPatient) {
        throw new Error('Patient not found or access denied');
      }

      logger.info('Updating patient', { patientId, userId });

      // Build update data
      const updateData: any = {};
      
      if (validated.name !== undefined) {
        updateData.name = validated.name;
      }
      if (validated.dateOfBirth !== undefined) {
        updateData.dateOfBirth = validated.dateOfBirth ? new Date(validated.dateOfBirth) : null;
      }
      if (validated.externalId !== undefined) {
        updateData.externalId = validated.externalId;
      }
      if (validated.metadata !== undefined) {
        updateData.metadata = validated.metadata;
      }

      const patient = await prisma.patient.update({
        where: { id: patientId },
        data: updateData,
      });

      logger.info('Patient updated successfully', { patientId });

      return patient;
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error('Patient update validation failed', error.issues);
        throw new Error(error.issues[0].message);
      }
      throw error;
    }
  }

  async delete(patientId: string, userId: string) {
    // Verify patient exists and belongs to user
    const existingPatient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        userId,
      },
    });

    if (!existingPatient) {
      throw new Error('Patient not found or access denied');
    }

    logger.info('Deleting patient', { patientId, userId });

    // Delete patient (cascades to documents and timeline events)
    await prisma.patient.delete({
      where: { id: patientId },
    });

    logger.info('Patient deleted successfully', { patientId });
  }

  async getSummary(patientId: string, userId: string): Promise<PatientSummary | null> {
    // Get patient with document aggregation
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        userId,
      },
      include: {
        documents: {
          select: {
            id: true,
            status: true,
            uploadedAt: true,
          },
          orderBy: { uploadedAt: 'desc' },
        },
      },
    });

    if (!patient) {
      return null;
    }

    // Calculate summary stats
    const documentCount = patient.documents.length;
    const lastDocumentAt = patient.documents[0]?.uploadedAt || null;
    const processingDocuments = patient.documents.filter(
      (doc) => doc.status === 'PENDING' || doc.status === 'PROCESSING'
    ).length;

    // Remove documents from response and add summary fields
    const { documents, ...patientData } = patient;

    return {
      ...patientData,
      metadata: patientData.metadata as Record<string, any> | null,
      documentCount,
      lastDocumentAt,
      processingDocuments,
    };
  }

  async getPatientDashboard(patientId: string, userId: string) {
    // Get patient with all related data
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        userId,
      },
      include: {
        documents: {
          include: {
            extraction: true,
          },
          orderBy: { uploadedAt: 'desc' },
        },
        timelineEvents: {
          include: {
            extraction: {
              include: {
                document: {
                  select: {
                    id: true,
                    originalFilename: true,
                    documentType: true,
                  },
                },
              },
            },
          },
          orderBy: { eventDate: 'desc' },
          take: 50,
        },
      },
    });

    if (!patient) {
      return null;
    }

    // Calculate statistics
    const totalDocuments = patient.documents.length;
    const processedDocuments = patient.documents.filter(
      (doc) => doc.extraction !== null
    ).length;
    const pendingDocuments = patient.documents.filter(
      (doc) => doc.status === 'PENDING' || doc.status === 'PROCESSING'
    ).length;
    const failedDocuments = patient.documents.filter(
      (doc) => doc.status === 'FAILED'
    ).length;

    logger.info('Patient dashboard retrieved', {
      patientId,
      userId,
      totalDocuments,
      processedDocuments,
    });

    return {
      patient: {
        id: patient.id,
        userId: patient.userId,
        name: patient.name,
        dateOfBirth: patient.dateOfBirth,
        externalId: patient.externalId,
        metadata: patient.metadata as Record<string, any> | null,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt,
      },
      documents: patient.documents,
      timelineEvents: patient.timelineEvents,
      stats: {
        totalDocuments,
        processedDocuments,
        pendingDocuments,
        failedDocuments,
        totalTimelineEvents: patient.timelineEvents.length,
      },
    };
  }
}

export const patientService = new PatientService();
