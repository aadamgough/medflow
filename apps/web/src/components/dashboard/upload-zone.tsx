"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadDocument, type DocumentType } from "@/lib/api";

interface UploadZoneProps {
  patientId: string;
  documentType?: DocumentType;
  onUploadComplete?: () => void;
}

type UploadStatus = "idle" | "uploading" | "success" | "error";

export function UploadZone({
  patientId,
  documentType,
  onUploadComplete,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setStatus("idle");
      setError(null);
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        setFile(selectedFile);
        setStatus("idle");
        setError(null);
      }
    },
    []
  );

  const handleUpload = async () => {
    if (!file) return;

    try {
      setStatus("uploading");
      setError(null);
      await uploadDocument(file, patientId, documentType);
      setStatus("success");
      onUploadComplete?.();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const handleClear = () => {
    setFile(null);
    setStatus("idle");
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors
          ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
          ${status === "success" ? "border-green-500 bg-green-50" : ""}
          ${status === "error" ? "border-destructive bg-destructive/5" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
        />

        {status === "success" ? (
          <div className="flex flex-col items-center">
            <CheckCircle className="h-10 w-10 text-green-500 mb-3" />
            <p className="text-sm font-medium text-green-700">
              Upload complete
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload
              className={`h-10 w-10 mb-3 ${
                isDragging ? "text-primary" : "text-muted-foreground"
              }`}
            />
            <p className="text-sm font-medium text-foreground mb-1">
              {isDragging ? "Drop file here" : "Drag and drop a file"}
            </p>
            <p className="text-xs text-muted-foreground">
              or click to browse
            </p>
          </div>
        )}
      </div>

      {/* Selected file */}
      {file && status !== "success" && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {file.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(file.size)}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="p-1 hover:bg-background rounded transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-md">
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Actions */}
      {file && status !== "success" && (
        <div className="flex gap-3">
          <Button
            onClick={handleUpload}
            disabled={status === "uploading"}
            className="flex-1"
          >
            {status === "uploading" ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload document"
            )}
          </Button>
          <Button variant="outline" onClick={handleClear}>
            Cancel
          </Button>
        </div>
      )}

      {/* Upload another */}
      {status === "success" && (
        <Button variant="outline" onClick={handleClear} className="w-full">
          Upload another
        </Button>
      )}
    </div>
  );
}
