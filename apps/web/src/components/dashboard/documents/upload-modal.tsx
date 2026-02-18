"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UploadZone } from "./upload-zone";
import { Combobox, type ComboboxOption } from "@/components/custom";
import { EmptyState } from "@/components/dashboard";
import { type DocumentType } from "@/lib/api";
import { useAllPatients } from "@/lib/hooks";

const documentTypes: ComboboxOption[] = [
  { value: "", label: "Auto-detect" },
  { value: "DISCHARGE_SUMMARY", label: "Discharge Summary" },
  { value: "LAB_RESULT", label: "Lab Result" },
  { value: "CONSULTATION_NOTE", label: "Consultation Note" },
  { value: "PRESCRIPTION", label: "Prescription" },
  { value: "RADIOLOGY_REPORT", label: "Radiology Report" },
  { value: "UNKNOWN", label: "Other" },
];

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadModal({ open, onOpenChange }: UploadModalProps) {
  const { patients, isLoading } = useAllPatients(100);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | "">("");
  const [uploadKey, setUploadKey] = useState(0);

  const patientOptions = useMemo<ComboboxOption[]>(() => {
    return patients.map((patient) => ({
      value: patient.id,
      label: patient.name,
      subtitle: patient.externalId ? `MRN: ${patient.externalId}` : undefined,
    }));
  }, [patients]);

  useEffect(() => {
    if (patients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(patients[0].id);
    }
  }, [patients, selectedPatientId]);

  useEffect(() => {
    if (!open) {
      setSelectedPatientId("");
      setSelectedDocType("");
      setUploadKey((k) => k + 1);
    }
  }, [open]);

  const handleUploadComplete = () => {
    setUploadKey((k) => k + 1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
          <DialogDescription>
            Upload medical documents for processing
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : patients.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No patients yet"
            description="Create a patient first before uploading documents"
          />
        ) : (
          <div className="space-y-6">
            {/* Patient selector */}
            <div>
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
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Document type
              </label>
              <Combobox
                options={documentTypes}
                value={selectedDocType}
                onValueChange={(value) =>
                  setSelectedDocType(value as DocumentType | "")
                }
                placeholder="Select document type..."
                searchPlaceholder="Search document types..."
                emptyText="No document types found."
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Leave as auto-detect to let the system identify the document type
              </p>
            </div>

            {/* Upload zone */}
            {selectedPatientId && (
              <UploadZone
                key={uploadKey}
                patientId={selectedPatientId}
                documentType={selectedDocType || undefined}
                onUploadComplete={handleUploadComplete}
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
