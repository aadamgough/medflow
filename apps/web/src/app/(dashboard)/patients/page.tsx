"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header, PatientList } from "@/components/dashboard";
import { createPatient } from "@/lib/api";

export default function PatientsPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    dateOfBirth: "",
    externalId: "",
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setIsCreating(true);
      await createPatient({
        name: formData.name.trim(),
        dateOfBirth: formData.dateOfBirth || undefined,
        externalId: formData.externalId || undefined,
      });
      setShowAddForm(false);
      setFormData({ name: "", dateOfBirth: "", externalId: "" });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Failed to create patient:", err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div>
      <Header
        title="Patients"
        description="Manage your patient records"
        action={
          !showAddForm && (
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add patient
            </Button>
          )
        }
      />

      {/* Add patient form */}
      {showAddForm && (
        <div className="mb-8 p-4 border border-border rounded-md bg-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-foreground">New patient</h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <form onSubmit={handleCreatePatient} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Name <span className="text-destructive">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Patient name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Date of birth
                </label>
                <Input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) =>
                    setFormData({ ...formData, dateOfBirth: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  External ID
                </label>
                <Input
                  type="text"
                  placeholder="MRN or ID"
                  value={formData.externalId}
                  onChange={(e) =>
                    setFormData({ ...formData, externalId: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create patient"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <PatientList
        key={refreshKey}
        onAddPatient={() => setShowAddForm(true)}
      />
    </div>
  );
}
