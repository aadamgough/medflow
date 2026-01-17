import { useState } from "react";
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Download,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DocumentWithExtraction, DocumentType, ProcessingStatus } from "@/lib/api";
import { DocumentDetailModal } from "./document-detail-modal";

interface DocumentListDetailedProps {
  documents: DocumentWithExtraction[];
  patientId: string;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getDocumentTypeLabel(type: DocumentType | null): string {
  if (!type) return "Unknown";
  const labels: Record<DocumentType, string> = {
    DISCHARGE_SUMMARY: "Discharge Summary",
    LAB_RESULT: "Lab Result",
    CONSULTATION_NOTE: "Consultation Note",
    PRESCRIPTION: "Prescription",
    RADIOLOGY_REPORT: "Radiology Report",
    UNKNOWN: "Unknown",
  };
  return labels[type] || type;
}

function getStatusBadge(status: ProcessingStatus, hasExtraction: boolean) {
  if (status === "COMPLETED" && hasExtraction) {
    return (
      <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Processed
      </Badge>
    );
  }
  if (status === "PENDING" || status === "PROCESSING") {
    return (
      <Badge variant="default" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">
        <Clock className="h-3 w-3 mr-1" />
        {status === "PROCESSING" ? "Processing" : "Pending"}
      </Badge>
    );
  }
  if (status === "FAILED") {
    return (
      <Badge variant="default" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">
        <AlertCircle className="h-3 w-3 mr-1" />
        Failed
      </Badge>
    );
  }
  if (status === "COMPLETED" && !hasExtraction) {
    return (
      <Badge variant="default" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Completed
      </Badge>
    );
  }
  return null;
}

export function DocumentListDetailed({
  documents,
  patientId,
}: DocumentListDetailedProps) {
  const [selectedDocument, setSelectedDocument] =
    useState<DocumentWithExtraction | null>(null);

  if (documents.length === 0) {
    return (
      <Card className="p-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No documents yet
        </h3>
        <p className="text-muted-foreground mb-4">
          Upload documents to see them here
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {documents.map((document) => (
          <Card
            key={document.id}
            className="p-4 hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer"
            onClick={() => setSelectedDocument(document)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-foreground truncate">
                      {document.originalFilename}
                    </h3>
                    {getStatusBadge(document.status, !!document.extraction)}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {document.documentType && (
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {getDocumentTypeLabel(document.documentType)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(document.uploadedAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      {formatFileSize(document.fileSize)}
                    </span>
                  </div>
                  {document.extraction && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Extracted {formatDate(document.extraction.extractedAt)}
                      {document.extraction.confidenceScore !== null && (
                        <span className="ml-2">
                          • Confidence:{" "}
                          {(document.extraction.confidenceScore * 100).toFixed(
                            0
                          )}
                          %
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {selectedDocument && (
        <DocumentDetailModal
          document={selectedDocument}
          open={!!selectedDocument}
          onClose={() => setSelectedDocument(null)}
        />
      )}
    </>
  );
}
