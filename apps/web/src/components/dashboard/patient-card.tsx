import Link from "next/link";
import { FileText, Calendar } from "lucide-react";
import type { Patient, PatientSummary } from "@/lib/api";

interface PatientCardProps {
  patient: Patient | PatientSummary;
}

function isPatientSummary(
  patient: Patient | PatientSummary
): patient is PatientSummary {
  return "documentCount" in patient;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function calculateAge(dateOfBirth: string | null): string {
  if (!dateOfBirth) return "";
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return `${age}y`;
}

export function PatientCard({ patient }: PatientCardProps) {
  const age = calculateAge(patient.dateOfBirth);

  return (
    <Link
      href={`/patients/${patient.id}`}
      className="block p-4 bg-card border border-border rounded-md hover:border-primary/50 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate">
            {patient.name}
          </h3>
          {patient.dateOfBirth && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {formatDate(patient.dateOfBirth)}
              {age && <span className="ml-1.5 text-muted-foreground/70">({age})</span>}
            </p>
          )}
        </div>
        {patient.externalId && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
            {patient.externalId}
          </span>
        )}
      </div>

      {isPatientSummary(patient) && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            {patient.documentCount} {patient.documentCount === 1 ? "doc" : "docs"}
          </span>
          {patient.lastDocumentAt && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(patient.lastDocumentAt)}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
