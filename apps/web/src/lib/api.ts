const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface User {
  id: string;
  email: string;
  name: string | null;
  profilePicture?: string | null;
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

export type ProcessingStatus = 
  | "PENDING" 
  | "PREPROCESSING" 
  | "OCR_IN_PROGRESS" 
  | "EXTRACTION_IN_PROGRESS" 
  | "VALIDATION_IN_PROGRESS"
  | "REVIEW_REQUIRED"
  | "COMPLETED" 
  | "FAILED";

export type EventType =
  | "DIAGNOSIS"
  | "MEDICATION_START"
  | "MEDICATION_STOP"
  | "MEDICATION_CHANGE"
  | "PROCEDURE"
  | "LAB_RESULT"
  | "HOSPITAL_ADMISSION"
  | "HOSPITAL_DISCHARGE"
  | "OFFICE_VISIT"
  | "OTHER";

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export type ValidationWarning = {
  field: string;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  suggestedValue?: string;
};

export interface DocumentExtraction {
  id: string;
  documentId: string;
  extractedData: Record<string, any>;
  overallConfidence: number | null;
  processingTimeMs: number | null;
  extractedAt: string;
  validationWarnings: ValidationWarning[] | null;
  validationErrors: Record<string, any> | null;
}

export interface DocumentWithExtraction extends Document {
  extraction: DocumentExtraction | null;
}

export interface TimelineEvent {
  id: string;
  patientId: string;
  extractionId: string;
  eventType: EventType;
  eventDate: string;
  description: string;
  structuredData: Record<string, any> | null;
  confidence: number | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  extraction: {
    id: string;
    documentId: string;
    extractedData: Record<string, any>;
    document: {
      id: string;
      originalFilename: string;
      documentType: DocumentType | null;
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

export interface PatientDashboard {
  patient: Patient;
  documents: DocumentWithExtraction[];
  timelineEvents: TimelineEvent[];
  stats: PatientDashboardStats;
}

export interface AuthResponse {
  user: User;
  token: string;
}

const USER_KEY = "medflow_user";

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

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function setUser(user: User): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function removeUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_KEY);
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
  setUser(response.user);
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
  setUser(response.user);
  return response;
}

export function logout(): void {
  removeToken();
  removeUser();
}

export async function refreshToken(): Promise<{ token: string }> {
  const response = await apiFetch<{ token: string }>("/api/auth/refresh", {
    method: "POST",
  });

  setToken(response.token);
  return response;
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

export async function getPatientDashboard(
  id: string
): Promise<PatientDashboard> {
  return apiFetch(`/api/patients/${id}/dashboard`);
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

  return apiFetch("/api/documents", {
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

export async function getDocumentUrl(id: string): Promise<{ url: string }> {
  return apiFetch(`/api/documents/${id}/url`);
}

export async function uploadProfilePicture(file: File): Promise<{ user: User }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiFetch<{ user: User }>("/api/auth/profile-picture", {
    method: "POST",
    body: formData,
  });

  // Update the stored user with the new profile picture
  const currentUser = getUser();
  if (currentUser) {
    setUser({ ...currentUser, profilePicture: response.user.profilePicture });
  }

  return response;
}

export async function removeProfilePicture(): Promise<{ user: User }> {
  const response = await apiFetch<{ user: User }>("/api/auth/profile-picture", {
    method: "DELETE",
  });

  // Update the stored user to remove the profile picture
  const currentUser = getUser();
  if (currentUser) {
    setUser({ ...currentUser, profilePicture: null });
  }

  return response;
}

export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM';

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  sources: unknown | null;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  documentId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export async function getChatSession(documentId: string): Promise<{ session: ChatSession | null }> {
  return apiFetch(`/api/chat/document/${documentId}`);
}

export async function sendChatMessage(
  documentId: string,
  message: string
): Promise<{
  sessionId: string;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}> {
  return apiFetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ documentId, message }),
  });
}

export async function streamChatMessage(
  documentId: string,
  message: string,
  onChunk: (content: string) => void,
  onDone: (data: { sessionId: string; userMessageId: string; assistantMessageId: string }) => void,
  onError: (error: string) => void
): Promise<void> {
  const token = getToken();
  
  const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ documentId, message }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Stream failed');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'chunk') {
            onChunk(parsed.content);
          } else if (parsed.type === 'done') {
            onDone({
              sessionId: parsed.sessionId,
              userMessageId: parsed.userMessageId,
              assistantMessageId: parsed.assistantMessageId,
            });
          } else if (parsed.type === 'error') {
            onError(parsed.error);
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }
}

export async function deleteChatSession(sessionId: string): Promise<{ message: string }> {
  return apiFetch(`/api/chat/${sessionId}`, {
    method: 'DELETE',
  });
}
