import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ExtractionViewerProps {
  data: Record<string, any>;
  confidenceScore?: number | null;
  validationWarnings?: Record<string, any> | null;
  validationErrors?: Record<string, any> | null;
}

function renderValue(value: any, depth: number = 0): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">—</span>;
  }

  if (typeof value === "boolean") {
    return (
      <Badge variant={value ? "default" : "outline"}>
        {value ? "Yes" : "No"}
      </Badge>
    );
  }

  if (typeof value === "number") {
    return <span className="font-mono">{value}</span>;
  }

  if (typeof value === "string") {
    // Check if it's a date string
    const dateMatch = value.match(/^\d{4}-\d{2}-\d{2}/);
    if (dateMatch) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return (
            <span>
              {date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          );
        }
      } catch (e) {
        // Not a valid date, render as string
      }
    }
    return <span>{value}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted-foreground italic">None</span>;
    }
    return (
      <ul className="list-disc list-inside space-y-1 ml-2">
        {value.map((item, index) => (
          <li key={index} className="text-sm">
            {renderValue(item, depth + 1)}
          </li>
        ))}
      </ul>
    );
  }

  if (typeof value === "object") {
    return (
      <div className={`space-y-2 ${depth > 0 ? "ml-4 mt-2" : ""}`}>
        {Object.entries(value).map(([key, val]) => (
          <div key={key} className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">
              {formatFieldName(key)}:
            </span>
            <div className="ml-2">{renderValue(val, depth + 1)}</div>
          </div>
        ))}
      </div>
    );
  }

  return <span>{String(value)}</span>;
}

function formatFieldName(field: string): string {
  // Convert camelCase or snake_case to Title Case
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function groupDataByCategory(
  data: Record<string, any>
): Record<string, Record<string, any>> {
  const categories: Record<string, Record<string, any>> = {
    "Patient Information": {},
    Medications: {},
    Diagnoses: {},
    "Vitals & Labs": {},
    Procedures: {},
    Other: {},
  };

  Object.entries(data).forEach(([key, value]) => {
    const lowerKey = key.toLowerCase();

    if (
      lowerKey.includes("patient") ||
      lowerKey.includes("name") ||
      lowerKey.includes("dob") ||
      lowerKey.includes("birth") ||
      lowerKey.includes("age") ||
      lowerKey.includes("gender") ||
      lowerKey.includes("sex")
    ) {
      categories["Patient Information"][key] = value;
    } else if (
      lowerKey.includes("medication") ||
      lowerKey.includes("drug") ||
      lowerKey.includes("prescription") ||
      lowerKey.includes("rx")
    ) {
      categories["Medications"][key] = value;
    } else if (
      lowerKey.includes("diagnosis") ||
      lowerKey.includes("condition") ||
      lowerKey.includes("disease") ||
      lowerKey.includes("icd")
    ) {
      categories["Diagnoses"][key] = value;
    } else if (
      lowerKey.includes("vital") ||
      lowerKey.includes("lab") ||
      lowerKey.includes("test") ||
      lowerKey.includes("result") ||
      lowerKey.includes("blood") ||
      lowerKey.includes("pressure") ||
      lowerKey.includes("temperature") ||
      lowerKey.includes("heart") ||
      lowerKey.includes("respiratory")
    ) {
      categories["Vitals & Labs"][key] = value;
    } else if (
      lowerKey.includes("procedure") ||
      lowerKey.includes("surgery") ||
      lowerKey.includes("operation") ||
      lowerKey.includes("treatment")
    ) {
      categories["Procedures"][key] = value;
    } else {
      categories["Other"][key] = value;
    }
  });

  // Remove empty categories
  return Object.fromEntries(
    Object.entries(categories).filter(([_, value]) => Object.keys(value).length > 0)
  );
}

export function ExtractionViewer({
  data,
  confidenceScore,
  validationWarnings,
  validationErrors,
}: ExtractionViewerProps) {
  const categorizedData = groupDataByCategory(data);
  const hasWarnings = validationWarnings && Object.keys(validationWarnings).length > 0;
  const hasErrors = validationErrors && Object.keys(validationErrors).length > 0;

  return (
    <div className="space-y-6">
      {/* Confidence Score */}
      {confidenceScore !== null && confidenceScore !== undefined && (
        <Card className="p-4 bg-muted/50">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Extraction Confidence:{" "}
              <span className="font-semibold text-foreground">
                {(confidenceScore * 100).toFixed(0)}%
              </span>
            </span>
          </div>
        </Card>
      )}

      {/* Validation Errors */}
      {hasErrors && (
        <Card className="p-4 border-red-500/50 bg-red-500/5">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-500 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-600 dark:text-red-500 mb-2">
                Validation Errors
              </h4>
              <div className="text-sm text-red-700 dark:text-red-400">
                {renderValue(validationErrors)}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Validation Warnings */}
      {hasWarnings && (
        <Card className="p-4 border-yellow-500/50 bg-yellow-500/5">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-yellow-600 dark:text-yellow-500 mb-2">
                Validation Warnings
              </h4>
              <div className="text-sm text-yellow-700 dark:text-yellow-400">
                {renderValue(validationWarnings)}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Categorized Data */}
      {Object.entries(categorizedData).map(([category, fields]) => (
        <Card key={category} className="p-4">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            {category}
          </h3>
          <div className="space-y-3">
            {Object.entries(fields).map(([field, value]) => (
              <div key={field} className="border-b border-border last:border-0 pb-3 last:pb-0">
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  {formatFieldName(field)}
                </div>
                <div className="text-base text-foreground">
                  {renderValue(value)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {Object.keys(categorizedData).length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No extracted data available</p>
        </Card>
      )}
    </div>
  );
}
