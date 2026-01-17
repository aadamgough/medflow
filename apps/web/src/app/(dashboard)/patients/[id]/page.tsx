"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPatientDashboard, PatientDashboard } from "@/lib/api";
import {
  PatientOverview,
  DocumentListDetailed,
  TimelineView,
} from "@/components/dashboard";

export default function PatientDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const [dashboard, setDashboard] = useState<PatientDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setIsLoading(true);
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
      }
    }

    if (patientId) {
      fetchDashboard();
    }
  }, [patientId]);

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
          Back
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

      {/* Tabs with Actions */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">
              Documents ({dashboard.stats.totalDocuments})
            </TabsTrigger>
            <TabsTrigger value="timeline">
              Timeline ({dashboard.stats.totalTimelineEvents})
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("documents")}
            >
              <FileText className="h-4 w-4 mr-2" />
              View All Documents
            </Button>
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
          />
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <TimelineView events={dashboard.timelineEvents} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
