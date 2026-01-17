"use client";

import { useState, useEffect } from "react";
import { Loader2, Users } from "lucide-react";
import { Header, UploadZone, EmptyState } from "@/components/dashboard";
import { Combobox, type ComboboxOption } from "@/components/custom";
import { getPatients, type Patient, type DocumentType } from "@/lib/api";

const documentTypes: ComboboxOption[] = [
  { value: "", label: "Auto-detect" },
  { value: "DISCHARGE_SUMMARY", label: "Discharge Summary" },
  { value: "LAB_RESULT", label: "Lab Result" },
  { value: "CONSULTATION_NOTE", label: "Consultation Note" },
  { value: "PRESCRIPTION", label: "Prescription" },
  { value: "RADIOLOGY_REPORT", label: "Radiology Report" },
  { value: "UNKNOWN", label: "Other" },
];

export default function UploadPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientOptions, setPatientOptions] = useState<ComboboxOption[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [uploadKey, setUploadKey] = useState(0);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await getPatients({ limit: 100 });
        setPatients(response.patients);
        
        // Convert patients to combobox options
        const options: ComboboxOption[] = response.patients.map((patient) => ({
          value: patient.id,
          label: patient.name,
          subtitle: patient.externalId ? `MRN: ${patient.externalId}` : undefined,
        }));
        setPatientOptions(options);
        
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
          <Combobox
            options={patientOptions}
            value={selectedPatientId}
            onValueChange={setSelectedPatientId}
            placeholder="Select a patient..."
            searchPlaceholder="Search patients..."
            emptyText="No patients found."
          />
        </div>

        {/* Document type selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Document type
          </label>
          <Combobox
            options={documentTypes}
            value={selectedDocType}
            onValueChange={(value) => setSelectedDocType(value as DocumentType | "")}
            placeholder="Select document type..."
            searchPlaceholder="Search document types..."
            emptyText="No document types found."
          />
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
