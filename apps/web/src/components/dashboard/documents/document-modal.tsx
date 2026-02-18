import { useState } from "react";
import { FileText, Clock, AlertCircle, CheckCircle2, Loader2, Scan, Brain, ShieldCheck, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DocumentWithExtraction, DocumentType, ProcessingStatus } from "@/lib/api";
import { ExtractionViewer } from "./extraction-viewer";
import { JsonViewer } from "./json-viewer";

const PROCESSING_STATUSES: ProcessingStatus[] = [
  "PENDING",
  "PREPROCESSING",
  "OCR_IN_PROGRESS",
  "EXTRACTION_IN_PROGRESS",
  "VALIDATION_IN_PROGRESS",
];

function getProcessingStatusInfo(status: ProcessingStatus): { icon: React.ReactNode; title: string; description: string } {
  switch (status) {
    case "PENDING":
      return {
        icon: <Clock className="h-12 w-12 text-yellow-500 mx-auto mb-4" />,
        title: "Waiting in Queue",
        description: "This document is waiting to be processed. It will start processing shortly.",
      };
    case "PREPROCESSING":
      return {
        icon: <Loader2 className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />,
        title: "Preprocessing Document",
        description: "Preparing the document for analysis...",
      };
    case "OCR_IN_PROGRESS":
      return {
        icon: <Scan className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-pulse" />,
        title: "Reading Document",
        description: "Extracting text from the document using OCR...",
      };
    case "EXTRACTION_IN_PROGRESS":
      return {
        icon: <Brain className="h-12 w-12 text-purple-500 mx-auto mb-4 animate-pulse" />,
        title: "Extracting Data",
        description: "Analyzing content and extracting structured data...",
      };
    case "VALIDATION_IN_PROGRESS":
      return {
        icon: <ShieldCheck className="h-12 w-12 text-indigo-500 mx-auto mb-4 animate-pulse" />,
        title: "Validating Extraction",
        description: "Verifying extracted data for accuracy...",
      };
    case "REVIEW_REQUIRED":
      return {
        icon: <Eye className="h-12 w-12 text-orange-500 mx-auto mb-4" />,
        title: "Review Required",
        description: "This document needs manual review before data can be finalized.",
      };
    default:
      return {
        icon: <Clock className="h-12 w-12 text-yellow-500 mx-auto mb-4" />,
        title: "Processing",
        description: "This document is being processed.",
      };
  }
}

interface DocumentDetailModalProps {
  document: DocumentWithExtraction;
  open: boolean;
  onClose: () => void;
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

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "long",
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

export function DocumentDetailModal({
  document,
  open,
  onClose,
}: DocumentDetailModalProps) {
  const [activeTab, setActiveTab] = useState("extracted");
  const hasExtraction = !!document.extraction;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-start gap-3 pr-8">
            <FileText className="h-6 w-6 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-lg break-words">
                {document.originalFilename}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-sm font-normal">
                {document.documentType && (
                  <Badge variant="outline">
                    {getDocumentTypeLabel(document.documentType)}
                  </Badge>
                )}
                <span className="text-muted-foreground">
                  {formatFileSize(document.fileSize)}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">
                  Uploaded {formatDate(document.uploadedAt)}
                </span>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {!hasExtraction ? (
            <div className="py-12 text-center">
              {PROCESSING_STATUSES.includes(document.status) ? (
                (() => {
                  const statusInfo = getProcessingStatusInfo(document.status);
                  return (
                    <>
                      {statusInfo.icon}
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {statusInfo.title}
                      </h3>
                      <p className="text-muted-foreground">
                        {statusInfo.description}
                      </p>
                    </>
                  );
                })()
              ) : document.status === "REVIEW_REQUIRED" ? (
                (() => {
                  const statusInfo = getProcessingStatusInfo(document.status);
                  return (
                    <>
                      {statusInfo.icon}
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {statusInfo.title}
                      </h3>
                      <p className="text-muted-foreground">
                        {statusInfo.description}
                      </p>
                    </>
                  );
                })()
              ) : document.status === "FAILED" ? (
                <>
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Processing Failed
                  </h3>
                  <p className="text-muted-foreground">
                    An error occurred while processing this document. Please try
                    uploading it again.
                  </p>
                </>
              ) : (
                <>
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No Extraction Data
                  </h3>
                  <p className="text-muted-foreground">
                    This document has been uploaded but no extraction data is
                    available yet.
                  </p>
                </>
              )}
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="extracted">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Markdown
                </TabsTrigger>
                <TabsTrigger value="raw">
                  <FileText className="h-4 w-4 mr-2" />
                  JSON
                </TabsTrigger>
              </TabsList>

              <TabsContent value="extracted" className="mt-6">
                <ExtractionViewer
                  data={document.extraction?.extractedData || {}}
                  confidenceScore={document.extraction?.overallConfidence}
                  validationWarnings={document.extraction?.validationWarnings}
                  validationErrors={document.extraction?.validationErrors}
                />
              </TabsContent>

              <TabsContent value="raw" className="mt-6">
                <JsonViewer data={document.extraction?.extractedData || {}} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
