const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface User {
  id: string;
  email: string;
  name: string | null;
}

export interface Patient {
  id: string;
  userId: string;
  name: string;
  dateOfBirth: string | null;
  externalId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface PatientSummary extends Patient {
  documentCount: number;
  lastDocumentAt: string | null;
  processingDocuments: number;
}

export interface Document {
  id: string;
  patientId: string;
  userId: string;
  originalFilename: string;
  storagePath: string;
  storageBucket: string;
  fileSize: number;
  mimeType: string;
  documentType: DocumentType | null;
  uploadedAt: string;
  status: ProcessingStatus;
  processingStartedAt: string | null;
  processingCompletedAt: string | null;
}

export type DocumentType =
  | "DISCHARGE_SUMMARY"
  | "LAB_RESULT"
  | "CONSULTATION_NOTE"
  | "PRESCRIPTION"
  | "RADIOLOGY_REPORT"
  | "UNKNOWN";

export type ProcessingStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("medflow_token");
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("medflow_token", token);
}

export function removeToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("medflow_token");
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: HeadersInit = {
    ...options.headers,
  };

  if (!(options.body instanceof FormData)) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  console.log("[API] Fetching:", url); // Debug

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      errorData.error || `Request failed with status ${response.status}`
    );
  }

  return response.json();
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  setToken(response.token);
  return response;
}

export async function signup(
  email: string,
  password: string,
  name?: string
): Promise<AuthResponse> {
  const response = await apiFetch<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });

  setToken(response.token);
  return response;
}

export function logout(): void {
  removeToken();
}

export async function getPatients(options?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ patients: Patient[]; total: number; limit: number; offset: number }> {
  const params = new URLSearchParams();
  if (options?.search) params.set("search", options.search);
  if (options?.limit) params.set("limit", options.limit.toString());
  if (options?.offset) params.set("offset", options.offset.toString());

  const queryString = params.toString();
  const endpoint = `/api/patients${queryString ? `?${queryString}` : ""}`;

  return apiFetch(endpoint);
}

export async function getPatient(id: string): Promise<{ patient: Patient }> {
  return apiFetch(`/api/patients/${id}`);
}

export async function getPatientSummary(
  id: string
): Promise<{ patient: PatientSummary }> {
  return apiFetch(`/api/patients/${id}/summary`);
}

export async function createPatient(data: {
  name: string;
  dateOfBirth?: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ patient: Patient }> {
  return apiFetch("/api/patients", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updatePatient(
  id: string,
  data: {
    name?: string;
    dateOfBirth?: string | null;
    externalId?: string | null;
    metadata?: Record<string, unknown> | null;
  }
): Promise<{ patient: Patient }> {
  return apiFetch(`/api/patients/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deletePatient(id: string): Promise<{ message: string }> {
  return apiFetch(`/api/patients/${id}`, {
    method: "DELETE",
  });
}

export async function uploadDocument(
  file: File,
  patientId: string,
  documentType?: DocumentType
): Promise<{ message: string; document: Document }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("patientId", patientId);
  if (documentType) {
    formData.append("documentType", documentType);
  }

  return apiFetch("/api/documents/upload", {
    method: "POST",
    body: formData,
  });
}

export async function getDocument(id: string): Promise<{ document: Document }> {
  return apiFetch(`/api/documents/${id}`);
}

export async function getPatientDocuments(
  patientId: string
): Promise<{ documents: Document[]; count: number }> {
  return apiFetch(`/api/documents/patient/${patientId}`);
}

export async function deleteDocument(id: string): Promise<{ message: string }> {
  return apiFetch(`/api/documents/${id}`, {
    method: "DELETE",
  });
}
