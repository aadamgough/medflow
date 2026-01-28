"use client";

import { useState, useEffect } from "react";
import { Search, Users, Plus, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PatientCard } from "./patient-card";
import { EmptyState } from "../common/empty-state";
import { usePatients } from "@/lib/hooks";

const PATIENTS_PER_PAGE = 25;

interface PatientListProps {
  onAddPatient?: () => void;
}

export function PatientList({ onAddPatient }: PatientListProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 when search changes
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const offset = (page - 1) * PATIENTS_PER_PAGE;
  const { patients, total, isLoading, error } = usePatients({
    search: debouncedSearch || undefined,
    limit: PATIENTS_PER_PAGE,
    offset,
  });
  
  // Only show full loading state on initial load (no data yet)
  const showFullLoading = isLoading && patients.length === 0;

  const totalPages = Math.ceil(total / PATIENTS_PER_PAGE);

  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage(page + 1);
  };

  const handlePageClick = (pageNum: number) => {
    setPage(pageNum);
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      
      if (page > 3) pages.push("ellipsis");
      
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (page < totalPages - 2) pages.push("ellipsis");
      
      pages.push(totalPages);
    }
    
    return pages;
  };

  if (showFullLoading) {
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
        description={error instanceof Error ? error.message : "Failed to load patients"}
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
      {/* Search and count */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search patients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {total > 0 && (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {total} {total === 1 ? "patient" : "patients"}
          </span>
        )}
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
        <>
          {/* Patient grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {patients.map((patient) => (
              <PatientCard key={patient.id} patient={patient} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-8">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevPage}
                disabled={page === 1 || isLoading}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {getPageNumbers().map((pageNum, idx) =>
                pageNum === "ellipsis" ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-2 text-muted-foreground"
                  >
                    ...
                  </span>
                ) : (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageClick(pageNum)}
                    disabled={isLoading}
                    className="h-8 w-8 p-0"
                  >
                    {pageNum}
                  </Button>
                )
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextPage}
                disabled={page === totalPages || isLoading}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Page info */}
          {totalPages > 1 && (
            <p className="text-center text-xs text-muted-foreground mt-3">
              Showing {(page - 1) * PATIENTS_PER_PAGE + 1}–
              {Math.min(page * PATIENTS_PER_PAGE, total)} of {total}
            </p>
          )}
        </>
      )}
    </div>
  );
}
