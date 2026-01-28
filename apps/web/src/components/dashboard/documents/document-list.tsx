import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Download,
  Trash2,
  AlertTriangle,
  Loader2,
  Eye,
  Scan,
  Brain,
  ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocumentWithExtraction, DocumentType, ProcessingStatus, deleteDocument } from "@/lib/api";
import { ConfirmationDialog } from "@/components/shared";

interface DocumentListDetailedProps {
  documents: DocumentWithExtraction[];
  patientId: string;
  onDocumentDeleted?: () => void;
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
  // Completed with extraction
  if (status === "COMPLETED" && hasExtraction) {
    return (
      <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Processed
      </Badge>
    );
  }
  
  // Pending - waiting in queue
  if (status === "PENDING") {
    return (
      <Badge variant="default" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    );
  }
  
  // Preprocessing - preparing document
  if (status === "PREPROCESSING") {
    return (
      <Badge variant="default" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        Preprocessing
      </Badge>
    );
  }
  
  // OCR in progress - reading document
  if (status === "OCR_IN_PROGRESS") {
    return (
      <Badge variant="default" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">
        <Scan className="h-3 w-3 mr-1 animate-pulse" />
        Reading Document
      </Badge>
    );
  }
  
  // Extraction in progress - extracting data
  if (status === "EXTRACTION_IN_PROGRESS") {
    return (
      <Badge variant="default" className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20">
        <Brain className="h-3 w-3 mr-1 animate-pulse" />
        Extracting Data
      </Badge>
    );
  }
  
  // Validation in progress
  if (status === "VALIDATION_IN_PROGRESS") {
    return (
      <Badge variant="default" className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20">
        <ShieldCheck className="h-3 w-3 mr-1 animate-pulse" />
        Validating
      </Badge>
    );
  }
  
  // Review required
  if (status === "REVIEW_REQUIRED") {
    return (
      <Badge variant="default" className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20">
        <Eye className="h-3 w-3 mr-1" />
        Review Required
      </Badge>
    );
  }
  
  // Failed
  if (status === "FAILED") {
    return (
      <Badge variant="default" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">
        <AlertCircle className="h-3 w-3 mr-1" />
        Failed
      </Badge>
    );
  }
  
  // Completed without extraction
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

// Helper to check if document is actively processing
function isProcessing(status: ProcessingStatus): boolean {
  return [
    "PENDING",
    "PREPROCESSING", 
    "OCR_IN_PROGRESS",
    "EXTRACTION_IN_PROGRESS",
    "VALIDATION_IN_PROGRESS"
  ].includes(status);
}

export function DocumentListDetailed({
  documents,
  patientId,
  onDocumentDeleted,
}: DocumentListDetailedProps) {
  const router = useRouter();
  const [documentToDelete, setDocumentToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDocumentClick = (documentId: string) => {
    router.push(`/patients/${patientId}/documents/${documentId}`);
  };

  const handleDeleteClick = (e: React.MouseEvent, document: DocumentWithExtraction) => {
    e.stopPropagation();
    setDocumentToDelete({
      id: document.id,
      name: document.originalFilename,
    });
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!documentToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteDocument(documentToDelete.id);
      setDocumentToDelete(null);
      if (onDocumentDeleted) {
        onDocumentDeleted();
      }
    } catch (error) {
      console.error("Failed to delete document:", error);
      setDeleteError(
        error instanceof Error ? error.message : "Failed to delete document"
      );
    } finally {
      setIsDeleting(false);
    }
  };

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
      {deleteError && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {deleteError}
        </div>
      )}
      
      <div className="space-y-3">
        {documents.map((document) => (
          <Card
            key={document.id}
            className="p-4 hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer"
            onClick={() => handleDocumentClick(document.id)}
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
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => handleDeleteClick(e, document)}
                className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <ConfirmationDialog
        open={!!documentToDelete}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDocumentToDelete(null);
            setDeleteError(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Document"
        description={
          documentToDelete
            ? `Are you sure you want to delete "${documentToDelete.name}"? This action cannot be undone and will permanently remove the document and all associated data.`
            : ""
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        icon={<AlertTriangle className="h-6 w-6 text-destructive" />}
        isLoading={isDeleting}
      />
    </>
  );
}
