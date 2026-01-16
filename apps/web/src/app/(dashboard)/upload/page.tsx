"use client";

import { useState, useEffect } from "react";
import { Loader2, Users } from "lucide-react";
import { Header, UploadZone, EmptyState } from "@/components/dashboard";
import { getPatients, type Patient, type DocumentType } from "@/lib/api";

const documentTypes: { value: DocumentType; label: string }[] = [
  { value: "DISCHARGE_SUMMARY", label: "Discharge Summary" },
  { value: "LAB_RESULT", label: "Lab Result" },
  { value: "CONSULTATION_NOTE", label: "Consultation Note" },
  { value: "PRESCRIPTION", label: "Prescription" },
  { value: "RADIOLOGY_REPORT", label: "Radiology Report" },
  { value: "UNKNOWN", label: "Other" },
];

export default function UploadPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [uploadKey, setUploadKey] = useState(0);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await getPatients({ limit: 100 });
        setPatients(response.patients);
        if (response.patients.length > 0) {
          setSelectedPatientId(response.patients[0].id);
        }
      } catch (err) {
        console.error("Failed to load patients:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPatients();
  }, []);

  const handleUploadComplete = () => {
    setUploadKey((k) => k + 1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div>
        <Header
          title="Upload"
          description="Upload medical documents for processing"
        />
        <EmptyState
          icon={Users}
          title="No patients yet"
          description="Create a patient first before uploading documents"
          action={
            <a
              href="/patients"
              className="inline-flex items-center justify-center h-9 px-4 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
            >
              Go to Patients
            </a>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Upload"
        description="Upload medical documents for processing"
      />

      <div className="max-w-xl">
        {/* Patient selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Patient <span className="text-destructive">*</span>
          </label>
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="w-full h-10 px-3 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.name}
                {patient.externalId && ` (${patient.externalId})`}
              </option>
            ))}
          </select>
        </div>

        {/* Document type selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Document type
          </label>
          <select
            value={selectedDocType}
            onChange={(e) =>
              setSelectedDocType(e.target.value as DocumentType | "")
            }
            className="w-full h-10 px-3 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Auto-detect</option>
            {documentTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Leave as auto-detect to let the system identify the document type
          </p>
        </div>

        {/* Upload zone */}
        <UploadZone
          key={uploadKey}
          patientId={selectedPatientId}
          documentType={selectedDocType || undefined}
          onUploadComplete={handleUploadComplete}
        />
      </div>
    </div>
  );
}
