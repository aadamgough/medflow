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