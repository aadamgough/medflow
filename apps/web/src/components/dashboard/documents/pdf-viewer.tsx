"use client";

import { useState } from "react";
import {
  Loader2,
  ExternalLink,
  Download,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PDFViewerProps {
  url: string;
  className?: string;
}

export function PDFViewer({ url, className = "" }: PDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const openInNewTab = () => {
    window.open(url, "_blank");
  };

  const downloadFile = () => {
    const link = document.createElement("a");
    link.href = url;
    link.download = "document.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If there's an error loading the embed, show a fallback UI
  if (hasError) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="flex-1 flex flex-col items-center justify-center bg-muted/20 p-8">
          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Preview Unavailable
          </h3>
          <p className="text-muted-foreground text-center mb-6 max-w-sm">
            Unable to display the document preview in the browser. You can open or download the file directly.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={openInNewTab}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
            <Button onClick={downloadFile}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* PDF Content using iframe - browser's native PDF viewer */}
      <div className="flex-1 relative bg-muted/20">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/30 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading document...</p>
          </div>
        )}
        
        <iframe
          src={url}
          className="w-full h-full border-0"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          title="Document Preview"
        />
      </div>
    </div>
  );
}
