import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  User,
  Edit,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PatientDashboard } from "@/lib/api";

interface PatientOverviewProps {
  dashboard: PatientDashboard;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function calculateAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function PatientOverview({ dashboard }: PatientOverviewProps) {
  const { patient, stats } = dashboard;
  const age = calculateAge(patient.dateOfBirth);

  return (
    <div className="space-y-6">
      {/* Patient Info Card */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Patient Information
            </h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // TODO: Implement edit patient functionality
              console.log("Edit patient");
            }}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="text-base font-medium text-foreground">
                {patient.name}
              </p>
            </div>
          </div>

          {patient.dateOfBirth && (
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Date of Birth</p>
                <p className="text-base font-medium text-foreground">
                  {formatDate(patient.dateOfBirth)}
                  {age !== null && (
                    <span className="text-sm text-muted-foreground ml-2">
                      ({age} years old)
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {patient.externalId && (
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">
                  Medical Record Number
                </p>
                <p className="text-base font-medium text-foreground">
                  {patient.externalId}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Patient Since</p>
              <p className="text-base font-medium text-foreground">
                {formatDate(patient.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {stats.totalDocuments}
              </p>
              <p className="text-sm text-muted-foreground">Total Documents</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {stats.processedDocuments}
              </p>
              <p className="text-sm text-muted-foreground">Processed</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {stats.pendingDocuments}
              </p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {stats.failedDocuments}
              </p>
              <p className="text-sm text-muted-foreground">Failed</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity Summary */}
      {stats.totalTimelineEvents > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Timeline Events
          </h3>
          <p className="text-muted-foreground">
            {stats.totalTimelineEvents} event
            {stats.totalTimelineEvents !== 1 ? "s" : ""} recorded. Switch to the
            Timeline tab to view details.
          </p>
        </Card>
      )}
    </div>
  );
}
