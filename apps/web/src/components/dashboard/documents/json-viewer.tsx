import { useState } from "react";
import { Copy, Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface JsonViewerProps {
  data: Record<string, any>;
}

export function JsonViewer({ data }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `extraction-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download:", err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          disabled={copied}
          title={copied ? "Copied!" : "Copy JSON"}
          className="h-7 w-7 p-0"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          title="Download JSON"
          className="h-7 w-7 p-0"
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="relative">
        <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono border border-border">
          <code className="text-foreground">{jsonString}</code>
        </pre>
      </div>
    </div>
  );
}
