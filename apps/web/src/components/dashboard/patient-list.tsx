"use client";

import { useState, useEffect } from "react";
import { Search, Users, Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PatientCard } from "./patient-card";
import { EmptyState } from "./empty-state";
import { getPatients, type Patient } from "@/lib/api";

interface PatientListProps {
  onAddPatient?: () => void;
}

export function PatientList({ onAddPatient }: PatientListProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getPatients({
          search: search || undefined,
          limit: 50,
        });
        setPatients(response.patients);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load patients");
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchPatients, search ? 300 : 0);
    return () => clearTimeout(debounce);
  }, [search]);

  if (isLoading && patients.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={Users}
        title="Unable to load patients"
        description={error}
        action={
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try again
          </Button>
        }
      />
    );
  }

  return (
    <div>
      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search patients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Results */}
      {patients.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? "No patients found" : "No patients yet"}
          description={
            search
              ? "Try adjusting your search terms"
              : "Add your first patient to get started"
          }
          action={
            !search && onAddPatient ? (
              <Button onClick={onAddPatient}>
                <Plus className="h-4 w-4 mr-2" />
                Add patient
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {patients.map((patient) => (
            <PatientCard key={patient.id} patient={patient} />
          ))}
        </div>
      )}
    </div>
  );
}
