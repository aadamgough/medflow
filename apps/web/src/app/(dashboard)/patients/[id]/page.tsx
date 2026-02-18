"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Upload, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPatientDashboard, PatientDashboard, ProcessingStatus } from "@/lib/api";
import {
  PatientOverview,
  DocumentListDetailed,
  TimelineView,
} from "@/components/dashboard";

// Status values that indicate a document is still processing
const PROCESSING_STATUSES: ProcessingStatus[] = [
  "PENDING",
  "PREPROCESSING",
  "OCR_IN_PROGRESS",
  "EXTRACTION_IN_PROGRESS",
  "VALIDATION_IN_PROGRESS",
];

export default function PatientDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const [dashboard, setDashboard] = useState<PatientDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDashboard = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);
      const data = await getPatientDashboard(patientId);
      setDashboard(data);
    } catch (err) {
      console.error("Failed to fetch patient dashboard:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load patient data"
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [patientId]);

  // Check if any documents are processing
  const hasProcessingDocuments = dashboard?.documents.some(
    (doc) => PROCESSING_STATUSES.includes(doc.status)
  ) ?? false;

  // Initial load
  useEffect(() => {
    if (patientId) {
      fetchDashboard(true);
    }
  }, [patientId, fetchDashboard]);

  // Auto-refresh polling when documents are processing
  useEffect(() => {
    if (hasProcessingDocuments) {
      // Poll every 3 seconds when documents are processing
      pollingIntervalRef.current = setInterval(() => {
        fetchDashboard(false);
      }, 3000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [hasProcessingDocuments, fetchDashboard]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
          <p className="text-muted-foreground">Loading patient data...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <p className="text-destructive mb-4">
            {error || "Patient not found"}
          </p>
          <Button onClick={() => router.push("/patients")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to patients
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          onClick={() => router.push("/patients")}
          variant="ghost"
          size="sm"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {dashboard.patient.name}
          </h1>
          {dashboard.patient.externalId && (
            <p className="text-sm text-muted-foreground">
              MRN: {dashboard.patient.externalId}
            </p>
          )}
        </div>
      </div>

      {/* Processing indicator */}
      {hasProcessingDocuments && (
        <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-700 dark:text-blue-400 text-sm">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>
            {dashboard.stats.pendingDocuments} document{dashboard.stats.pendingDocuments !== 1 ? 's' : ''} processing...
          </span>
        </div>
      )}

      {/* Tabs with Actions */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-1">
              Documents ({dashboard.stats.totalDocuments})
              {dashboard.stats.pendingDocuments > 0 && (
                <span className="ml-1 flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              )}
            </TabsTrigger>
            <TabsTrigger value="timeline">
              Timeline ({dashboard.stats.totalTimelineEvents})
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            {isRefreshing && (
              <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            <Button
              size="sm"
              onClick={() => router.push(`/upload?patientId=${dashboard.patient.id}`)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="mt-6">
          <PatientOverview dashboard={dashboard} />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <DocumentListDetailed
            documents={dashboard.documents}
            patientId={patientId}
            onDocumentDeleted={fetchDashboard}
          />
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <TimelineView events={dashboard.timelineEvents} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
