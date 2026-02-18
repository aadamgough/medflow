import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Database } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import type { ValidationWarning } from "@/lib/api";

interface ExtractionViewerProps {
  data: Record<string, any>;
  confidenceScore?: number | null;
  validationWarnings?: ValidationWarning[] | null;
  validationErrors?: Record<string, any> | null;
}

function ExpandableList({ items, maxVisible = 3 }: { items: (string | number)[]; maxVisible?: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (items.length <= maxVisible) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, index) => (
          <Badge key={index} variant="secondary" className="text-xs font-normal">
            {String(item)}
          </Badge>
        ))}
      </div>
    );
  }
  
  const visibleItems = isExpanded ? items : items.slice(0, maxVisible);
  const hiddenCount = items.length - maxVisible;
  
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {visibleItems.map((item, index) => (
          <Badge key={index} variant="secondary" className="text-xs font-normal">
            {String(item)}
          </Badge>
        ))}
      </div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-xs text-primary hover:underline"
      >
        {isExpanded ? (
          <>
            <ChevronDown className="h-3 w-3" />
          </>
        ) : (
          <>
            <ChevronRight className="h-3 w-3" />
          </>
        )}
      </button>
    </div>
  );
}

function renderValue(value: any, depth: number = 0): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">—</span>;
  }

  if (typeof value === "boolean") {
    return (
      <Badge variant={value ? "default" : "outline"} className="text-xs">
        {value ? "Yes" : "No"}
      </Badge>
    );
  }

  if (typeof value === "number") {
    const formatted = Number.isInteger(value) ? value : parseFloat(value.toFixed(2));
    return <span className="font-mono text-sm">{formatted}</span>;
  }

  if (typeof value === "string") {
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
      } catch {
      }
    }
    return <span>{value}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted-foreground italic text-sm">None</span>;
    }
    
    if (value.every(item => typeof item === "string" || typeof item === "number")) {
      return <ExpandableList items={value as (string | number)[]} />;
    }
    
    if (value.every(item => typeof item === "object" && item !== null && !Array.isArray(item))) {
      return (
        <div className="space-y-3">
          {value.map((item, index) => {
            const entries = Object.entries(item);
            const titleField = entries.find(([k]) => 
              k.toLowerCase().includes("name") || 
              k.toLowerCase().includes("test") ||
              k.toLowerCase().includes("title")
            );
            const title = titleField ? String(titleField[1]) : `Item ${index + 1}`;
            
            const keyFields = ["value", "unit", "flag", "status", "referenceRange"];
            const otherEntries = entries.filter(([k]) => 
              !keyFields.some(kf => k.toLowerCase().includes(kf.toLowerCase())) &&
              k !== titleField?.[0]
            );
            
            return (
              <div 
                key={index} 
                className="rounded-lg border bg-card p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="font-medium text-sm text-foreground">{title}</div>
                  {item.flag && (
                    <Badge 
                      variant={
                        String(item.flag).toLowerCase() === "normal" ? "secondary" :
                        String(item.flag).toLowerCase().includes("high") || 
                        String(item.flag).toLowerCase().includes("low") ? "destructive" : 
                        "outline"
                      }
                      className="text-xs shrink-0"
                    >
                      {String(item.flag)}
                    </Badge>
                  )}
                </div>
                
                {(item.value !== undefined || item.unit) && (
                  <div className="flex items-baseline gap-1">
                    {item.value !== undefined && (
                      <span className="text-lg font-semibold text-foreground">
                        {String(item.value)}
                      </span>
                    )}
                    {item.unit && (
                      <span className="text-sm text-muted-foreground">{String(item.unit)}</span>
                    )}
                    {item.referenceRange && (
                      <span className="text-xs text-muted-foreground ml-2">
                        (Ref: {typeof item.referenceRange === "object" 
                          ? `${item.referenceRange.low || ""}–${item.referenceRange.high || ""}${item.referenceRange.text ? ` ${item.referenceRange.text}` : ""}`
                          : String(item.referenceRange)
                        })
                      </span>
                    )}
                  </div>
                )}
                
                {otherEntries.length > 0 && (
                  <div className="grid grid-cols-3 gap-x-4 gap-y-1 pt-2 border-t border-border/50">
                    {otherEntries.map(([k, v]) => (
                      <div key={k} className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                          {formatFieldName(k)}
                        </span>
                        <span className="text-xs text-foreground truncate">
                          {v === null || v === undefined ? "—" : 
                           typeof v === "object" ? JSON.stringify(v) : String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        {value.map((item, index) => (
          <div key={index} className="pl-3 border-l-2 border-primary/30">
            {renderValue(item, depth + 1)}
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value);

    const simpleEntries = entries.filter(([, v]) => typeof v !== "object" || v === null);
    const complexEntries = entries.filter(([, v]) => typeof v === "object" && v !== null);
    
    if (simpleEntries.length > 0 || complexEntries.length > 0) {
      return (
        <div className="space-y-3">
          {simpleEntries.length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {simpleEntries.map(([key, val]) => (
                <div key={key} className="flex flex-col">
                  <span className="text-xs text-muted-foreground">{formatFieldName(key)}</span>
                  <span className="text-sm">{renderValue(val, depth + 1)}</span>
                </div>
              ))}
            </div>
          )}
          
          {complexEntries.map(([key, val]) => (
            <div key={key} className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">
                {formatFieldName(key)}
              </span>
              <div className="text-sm">{renderValue(val, depth + 1)}</div>
            </div>
          ))}
        </div>
      );
    }
    
    return (
      <div className="space-y-2">
        {entries.map(([key, val]) => (
          <div key={key} className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">
              {formatFieldName(key)}
            </span>
            <div className="text-sm">{renderValue(val, depth + 1)}</div>
          </div>
        ))}
      </div>
    );
  }

  return <span>{String(value)}</span>;
}

function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  if (typeof value === "string") {
    const dateMatch = value.match(/^\d{4}-\d{2}-\d{2}/);
    if (dateMatch) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
        }
      } catch {
      }
    }
    return value;
  }
  if (Array.isArray(value)) return `${value.length} items`;
  if (typeof value === "object") return "Object";
  return String(value);
}

function isMetadataKey(key: string): boolean {
  const metadataKeys = [
    "metadata", "pagecount", "extractedat", "extractionmethod", 
    "processingtimems", "overallconfidence", "warnings", "ocrengines",
    "lowconfidencefields", "confidence"
  ];
  return metadataKeys.includes(key.toLowerCase().replace(/[_\s]/g, ""));
}

function groupDataByCategory(
  data: Record<string, any>
): { metadata: Record<string, any>; categories: Record<string, Record<string, any>> } {
  const metadata: Record<string, any> = {};
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

    if (isMetadataKey(key) || (typeof value === "object" && value !== null && !Array.isArray(value) && isMetadataKey(key))) {
      metadata[key] = value;
    } else if (
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

  const filteredCategories = Object.fromEntries(
    Object.entries(categories).filter(([, value]) => Object.keys(value).length > 0)
  );

  return { metadata, categories: filteredCategories };
}

function CollapsibleCard({ 
  title, 
  icon, 
  children,
  defaultOpen = true 
}: { 
  title: string; 
  icon: React.ReactNode; 
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left"
      >
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "" : "-rotate-90"}`} />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-2 border-t border-border/50">
          {children}
        </div>
      )}
    </Card>
  );
}

function FieldGrid({ fields }: { fields: Record<string, any> }) {
  const entries = Object.entries(fields);
  
  const simpleFields: [string, any][] = [];
  const complexFields: [string, any][] = [];
  
  entries.forEach(([key, value]) => {
    if (
      value === null || 
      value === undefined || 
      typeof value === "string" || 
      typeof value === "number" || 
      typeof value === "boolean"
    ) {
      simpleFields.push([key, value]);
    } else {
      complexFields.push([key, value]);
    }
  });
  
  return (
    <div className="space-y-4">
      {simpleFields.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {simpleFields.map(([field, value]) => (
            <div key={field} className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {formatFieldName(field)}
              </div>
              <div className="text-sm text-foreground">
                {renderValue(value)}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {complexFields.length > 0 && (
        <div className="space-y-4">
          {simpleFields.length > 0 && <div className="border-t border-border pt-4" />}
          {complexFields.map(([field, value]) => (
            <div key={field} className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {formatFieldName(field)}
              </div>
              <div className="text-sm text-foreground">
                {renderValue(value)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MetadataCard({ metadata, confidenceScore }: { metadata: Record<string, any>; confidenceScore?: number | null }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const flatMetadata: Record<string, any> = {};
  Object.entries(metadata).forEach(([key, value]) => {
    if (key.toLowerCase() === "metadata" && typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.entries(value).forEach(([k, v]) => {
        flatMetadata[k] = v;
      });
    } else {
      flatMetadata[key] = value;
    }
  });
  
  if (confidenceScore !== null && confidenceScore !== undefined && !flatMetadata.overallConfidence) {
    flatMetadata.overallConfidence = confidenceScore;
  }
  
  const jsonString = JSON.stringify(flatMetadata, null, 2);
  
  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left"
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <Database className="h-4 w-4" />
          <h3 className="font-semibold text-foreground">Extraction Metadata</h3>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-border/50">
          <pre className="bg-muted p-3 rounded-lg overflow-x-auto text-xs font-mono border border-border">
            <code className="text-foreground">{jsonString}</code>
          </pre>
        </div>
      )}
    </Card>
  );
}

export function ExtractionViewer({
  data,
  confidenceScore,
  validationWarnings,
  validationErrors,
}: ExtractionViewerProps) {
  const { metadata, categories: categorizedData } = groupDataByCategory(data);
  const hasWarnings = validationWarnings && validationWarnings.length > 0;
  const hasErrors = validationErrors && Object.keys(validationErrors).length > 0;
  const hasMetadata = Object.keys(metadata).length > 0 || (confidenceScore !== null && confidenceScore !== undefined);

  return (
    <div className="space-y-3">
      {(hasErrors || hasWarnings) && (
        <Card className="p-3 border-yellow-500/50 bg-yellow-500/5">
          <div className="flex flex-wrap items-center gap-4">
            {hasErrors && (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-600 font-medium">
                  {Object.keys(validationErrors!).length} Error{Object.keys(validationErrors!).length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
            
            {hasWarnings && (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-600 font-medium">
                  {validationWarnings!.length} Warning{validationWarnings!.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>

          <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
            {hasErrors && Object.entries(validationErrors!).map(([key, val]) => (
              <div key={key} className="text-xs text-red-700 dark:text-red-400 flex gap-2">
                <span className="font-medium">{formatFieldName(key)}:</span>
                <span>{String(val)}</span>
              </div>
            ))}
            {hasWarnings && validationWarnings!.map((warning, idx) => (
              <div key={idx} className="text-xs text-yellow-700 dark:text-yellow-400 flex gap-2">
                <span className="font-medium">{formatFieldName(warning.field)}:</span>
                <span>{warning.message}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {Object.entries(categorizedData).map(([category, fields]) => (
        <CollapsibleCard
          key={category}
          title={category}
          icon={<CheckCircle2 className="h-5 w-5 text-primary" />}
        >
          <FieldGrid fields={fields} />
        </CollapsibleCard>
      ))}

      {hasMetadata && (
        <MetadataCard metadata={metadata} confidenceScore={confidenceScore} />
      )}

      {Object.keys(categorizedData).length === 0 && !hasMetadata && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No extracted data available</p>
        </Card>
      )}
    </div>
  );
}
