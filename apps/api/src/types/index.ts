import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    profilePicture?: string | null;
  };
}

export interface JWTPayload {
  userId: string;
  email: string;
}

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

// Patient types
export interface CreatePatientRequest {
  name: string;
  dateOfBirth?: string;
  externalId?: string;
  metadata?: Record<string, any>;
}

export interface UpdatePatientRequest {
  name?: string;
  dateOfBirth?: string;
  externalId?: string;
  metadata?: Record<string, any>;
}

export interface PatientResponse {
  id: string;
  name: string;
  dateOfBirth: Date | null;
  externalId: string | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PatientSummary extends PatientResponse {
  documentCount: number;
  lastDocumentAt: Date | null;
  processingDocuments: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface PatientListOptions {
  search?: string;
  limit?: number;
  offset?: number;
}

// Dashboard types
export interface DocumentExtraction {
  id: string;
  documentId: string;
  extractedData: Record<string, any>;
  confidenceScore: number | null;
  processingTimeMs: number | null;
  extractedAt: Date;
  validationWarnings: Record<string, any> | null;
  validationErrors: Record<string, any> | null;
}

export interface DocumentWithExtraction {
  id: string;
  patientId: string;
  userId: string;
  originalFilename: string;
  storagePath: string;
  storageBucket: string;
  fileSize: number;
  mimeType: string;
  documentType: string | null;
  uploadedAt: Date;
  status: string;
  processingStartedAt: Date | null;
  processingCompletedAt: Date | null;
  extraction: DocumentExtraction | null;
}

export interface TimelineEventResponse {
  id: string;
  patientId: string;
  extractionId: string;
  eventType: string;
  eventDate: Date;
  description: string;
  structuredData: Record<string, any> | null;
  confidence: number | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  extraction: {
    id: string;
    documentId: string;
    extractedData: Record<string, any>;
    document: {
      id: string;
      originalFilename: string;
      documentType: string | null;
    };
  };
}

export interface PatientDashboardStats {
  totalDocuments: number;
  processedDocuments: number;
  pendingDocuments: number;
  failedDocuments: number;
  totalTimelineEvents: number;
}

export interface PatientDashboardResponse {
  patient: PatientResponse;
  documents: DocumentWithExtraction[];
  timelineEvents: TimelineEventResponse[];
  stats: PatientDashboardStats;
}