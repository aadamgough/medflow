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

function formatNameLastFirst(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  
  const lastName = parts[parts.length - 1];
  const firstInitial = parts[0].charAt(0).toUpperCase();
  
  return `${lastName}, ${firstInitial}.`;
}

export function PatientCard({ patient }: PatientCardProps) {
  const age = calculateAge(patient.dateOfBirth);
  const displayName = formatNameLastFirst(patient.name);

  return (
    <Link
      href={`/patients/${patient.id}`}
      className="block p-3 bg-card border border-border rounded-md hover:border-primary/50 hover:shadow-sm transition-all"
    >
      {/* Name and MRN on same row */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <h3 className="font-medium text-foreground truncate text-sm">
          {displayName}
        </h3>
        {patient.externalId && (
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
            {patient.externalId}
          </span>
        )}
      </div>

      {/* DOB and age */}
      {patient.dateOfBirth && (
        <p className="text-xs text-muted-foreground">
          {formatDate(patient.dateOfBirth)}
          {age && <span className="ml-1 text-muted-foreground/70">({age})</span>}
        </p>
      )}

      {/* Document info for summary cards */}
      {isPatientSummary(patient) && patient.documentCount > 0 && (
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {patient.documentCount} {patient.documentCount === 1 ? "doc" : "docs"}
          </span>
          {patient.lastDocumentAt && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(patient.lastDocumentAt)}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
