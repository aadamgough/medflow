"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Scan,
  Brain,
  ShieldCheck,
  Eye,
  Trash2,
  AlertTriangle,
  MessageSquare,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getDocument,
  getDocumentUrl,
  deleteDocument,
  DocumentWithExtraction,
  DocumentType,
  ProcessingStatus,
} from "@/lib/api";
import { PDFViewer, ExtractionViewer, JsonViewer, ChatPanel } from "@/components/dashboard/documents";
import { ConfirmationDialog } from "@/components/shared";

const PROCESSING_STATUSES: ProcessingStatus[] = [
  "PENDING",
  "PREPROCESSING",
  "OCR_IN_PROGRESS",
  "EXTRACTION_IN_PROGRESS",
  "VALIDATION_IN_PROGRESS",
];

function getProcessingStatusInfo(status: ProcessingStatus): {
  icon: React.ReactNode;
  title: string;
  description: string;
} {
  switch (status) {
    case "PENDING":
      return {
        icon: <Clock className="h-16 w-16 text-yellow-500 mx-auto mb-4" />,
        title: "Waiting in Queue",
        description: "This document is waiting to be processed. It will start processing shortly.",
      };
    case "PREPROCESSING":
      return {
        icon: <Loader2 className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-spin" />,
        title: "Preprocessing Document",
        description: "Preparing the document for analysis...",
      };
    case "OCR_IN_PROGRESS":
      return {
        icon: <Scan className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-pulse" />,
        title: "Reading Document",
        description: "Extracting text from the document using OCR...",
      };
    case "EXTRACTION_IN_PROGRESS":
      return {
        icon: <Brain className="h-16 w-16 text-purple-500 mx-auto mb-4 animate-pulse" />,
        title: "Extracting Data",
        description: "Analyzing content and extracting structured data...",
      };
    case "VALIDATION_IN_PROGRESS":
      return {
        icon: <ShieldCheck className="h-16 w-16 text-indigo-500 mx-auto mb-4 animate-pulse" />,
        title: "Validating Extraction",
        description: "Verifying extracted data for accuracy...",
      };
    case "REVIEW_REQUIRED":
      return {
        icon: <Eye className="h-16 w-16 text-orange-500 mx-auto mb-4" />,
        title: "Review Required",
        description: "This document needs manual review before data can be finalized.",
      };
    default:
      return {
        icon: <Clock className="h-16 w-16 text-yellow-500 mx-auto mb-4" />,
        title: "Processing",
        description: "This document is being processed.",
      };
  }
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

export default function DocumentViewerPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;
  const documentId = params.documentId as string;

  const [doc, setDoc] = useState<DocumentWithExtraction | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Tab states
  const [mainTab, setMainTab] = useState("parse");
  const [dataFormat, setDataFormat] = useState("markdown");
  
  // Resizable panel state
  const [leftPanelWidth, setLeftPanelWidth] = useState(50); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Delete state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check sidebar state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem("sidebarCollapsed");
    if (savedState !== null) {
      setSidebarCollapsed(savedState === "true");
    }
    
    // Listen for storage changes (when sidebar is toggled)
    const handleStorageChange = () => {
      const state = localStorage.getItem("sidebarCollapsed");
      setSidebarCollapsed(state === "true");
    };
    
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const fetchDocument = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch document details and URL in parallel
      const [docResponse, urlResponse] = await Promise.all([
        getDocument(documentId),
        getDocumentUrl(documentId),
      ]);

      setDoc(docResponse.document as DocumentWithExtraction);
      setDocumentUrl(urlResponse.url);
    } catch (err) {
      console.error("Failed to fetch document:", err);
      setError(err instanceof Error ? err.message : "Failed to load document");
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  // Initial load
  useEffect(() => {
    if (documentId) {
      fetchDocument();
    }
  }, [documentId, fetchDocument]);

  // Auto-refresh for processing documents
  useEffect(() => {
    if (doc && PROCESSING_STATUSES.includes(doc.status)) {
      const interval = setInterval(() => {
        fetchDocument();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [doc, fetchDocument]);

  // Resizable panel handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
    
    // Clamp between 20% and 80%
    setLeftPanelWidth(Math.min(Math.max(newWidth, 20), 80));
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  // Global mouse up handler to catch releases outside the component
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    // Only add listener when dragging
    if (isDragging) {
      window.addEventListener("mouseup", handleGlobalMouseUp);
      window.addEventListener("mouseleave", handleGlobalMouseUp);
      return () => {
        window.removeEventListener("mouseup", handleGlobalMouseUp);
        window.removeEventListener("mouseleave", handleGlobalMouseUp);
      };
    }
  }, [isDragging]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteDocument(documentId);
      router.push(`/patients/${patientId}`);
    } catch (err) {
      console.error("Failed to delete document:", err);
      setError(err instanceof Error ? err.message : "Failed to delete document");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive mb-4">{error || "Document not found"}</p>
          <Button onClick={() => router.push(`/patients/${patientId}`)} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Patient
          </Button>
        </div>
      </div>
    );
  }

  const hasExtraction = !!doc.extraction;
  const isProcessing = PROCESSING_STATUSES.includes(doc.status);

  return (
    <div 
      className={`fixed inset-0 flex flex-col bg-background transition-all duration-300 ${
        sidebarCollapsed ? "left-16" : "left-56"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b bg-card/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <Button
            onClick={() => router.push(`/patients/${patientId}`)}
            variant="ghost"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
          </Button>
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-foreground truncate">
                {doc.originalFilename}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {doc.documentType && (
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {getDocumentTypeLabel(doc.documentType)}
                  </Badge>
                )}
                <span>{formatFileSize(doc.fileSize)}</span>
                <span>•</span>
                <span>{formatDate(doc.uploadedAt)}</span>
              </div>
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Content - Resizable Split Panels */}
      <div 
        ref={containerRef}
        className="flex-1 flex min-h-0 overflow-hidden bg-background relative"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Drag overlay - covers iframes and captures mouse events during drag */}
        {isDragging && (
          <div 
            className="absolute inset-0 z-50 cursor-col-resize"
            style={{ background: "transparent" }}
          />
        )}

        {/* Left Panel - PDF Viewer */}
        <div 
          className="flex flex-col min-w-0"
          style={{ width: `${leftPanelWidth}%` }}
        >
          {documentUrl ? (
            <PDFViewer url={documentUrl} className="flex-1" />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-muted/20">
              <div className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Unable to load document preview</p>
              </div>
            </div>
          )}
        </div>

        <div
          className={`w-2 flex items-center justify-center cursor-col-resize transition-colors select-none ${
            isDragging ? "bg-primary" : "bg-border hover:bg-primary/50"
          }`}
          onMouseDown={handleMouseDown}
        >
          <GripVertical className={`h-5 w-5 ${isDragging ? "text-primary-foreground" : "text-muted-foreground/50 hover:text-primary"}`} />
        </div>

        <div 
          className="flex flex-col min-w-0"
          style={{ width: `${100 - leftPanelWidth}%` }}
        >
          <div className="flex items-center justify-between p-3 border-b bg-muted/30">
            <Tabs value={mainTab} onValueChange={setMainTab}>
              <TabsList className="h-8">
                <TabsTrigger value="parse" className="text-sm px-3 h-7">
                  Parse
                </TabsTrigger>
                <TabsTrigger value="chat" className="text-sm px-3 h-7">
                  <MessageSquare className="h-3 w-3 mr-1.5" />
                  Chat
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {mainTab === "parse" && hasExtraction && !isProcessing && (
              <Tabs value={dataFormat} onValueChange={setDataFormat}>
                <TabsList className="h-8">
                  <TabsTrigger value="markdown" className="text-sm px-3 h-7">
                    Markdown
                  </TabsTrigger>
                  <TabsTrigger value="json" className="text-sm px-3 h-7">
                    JSON
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            {mainTab === "parse" ? (
              <div className="h-full">
                {isProcessing ? (
                  <div className="h-full flex items-center justify-center p-4">
                    <div className="text-center max-w-sm">
                      {(() => {
                        const statusInfo = getProcessingStatusInfo(doc.status);
                        return (
                          <>
                            {statusInfo.icon}
                            <h3 className="text-xl font-semibold text-foreground mb-2">
                              {statusInfo.title}
                            </h3>
                            <p className="text-muted-foreground">
                              {statusInfo.description}
                            </p>
                            <p className="text-sm text-muted-foreground mt-4">
                              This page will automatically update when processing completes.
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ) : doc.status === "FAILED" ? (
                  <div className="h-full flex items-center justify-center p-4">
                    <div className="text-center max-w-sm">
                      <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        Processing Failed
                      </h3>
                      <p className="text-muted-foreground">
                        An error occurred while processing this document. Please try uploading it again.
                      </p>
                    </div>
                  </div>
                ) : !hasExtraction ? (
                  <div className="h-full flex items-center justify-center p-4">
                    <div className="text-center max-w-sm">
                      <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        No Extraction Data
                      </h3>
                      <p className="text-muted-foreground">
                        This document has been uploaded but no extraction data is available yet.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    {dataFormat === "markdown" ? (
                      <ExtractionViewer
                        data={doc.extraction?.extractedData || {}}
                        confidenceScore={doc.extraction?.overallConfidence}
                        validationWarnings={doc.extraction?.validationWarnings}
                        validationErrors={doc.extraction?.validationErrors}
                      />
                    ) : (
                      <JsonViewer data={doc.extraction?.extractedData || {}} />
                    )}
                  </div>
                )}
              </div>
            ) : (
              <ChatPanel documentId={documentId} />
            )}
          </div>
        </div>
      </div>

      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setShowDeleteDialog(false);
          }
        }}
        onConfirm={handleDelete}
        title="Delete Document"
        description={`Are you sure you want to delete "${doc.originalFilename}"? This action cannot be undone and will permanently remove the document and all associated data.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        icon={<AlertTriangle className="h-6 w-6 text-destructive" />}
        isLoading={isDeleting}
      />
    </div>
  );
}
