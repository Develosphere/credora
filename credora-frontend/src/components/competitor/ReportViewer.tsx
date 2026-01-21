/**
 * Modal component for viewing competitor analysis reports
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  X, 
  Download, 
  FileText, 
  Loader2,
  AlertCircle,
  Copy,
  Check
} from "lucide-react";
import { getReportContent, downloadReport } from "@/lib/api/competitor";

interface ReportViewerProps {
  reportPath: string;
  businessName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ReportViewer({ reportPath, businessName, isOpen, onClose }: ReportViewerProps) {
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (isOpen && reportPath) {
      loadReportContent();
    }
  }, [isOpen, reportPath]);

  const loadReportContent = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const reportContent = await getReportContent(reportPath);
      setContent(reportContent);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    
    try {
      const blob = await downloadReport(reportPath);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = reportPath.split('/').pop() || 'competitor_report.txt';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download report");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      setError("Failed to copy to clipboard");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Competitor Analysis Report
              </CardTitle>
              <CardDescription>
                Detailed analysis for {businessName}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                disabled={isLoading || !content}
              >
                {isCopied ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                {isCopied ? "Copied!" : "Copy"}
              </Button>
              <Button
                size="sm"
                onClick={handleDownload}
                disabled={isDownloading || isLoading || !content}
              >
                {isDownloading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download
              </Button>
              <Button size="sm" variant="ghost" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="max-h-[70vh] overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                Loading report...
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {content && !isLoading && (
              <div className="space-y-4">
                {/* Report Metadata */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground border-b pb-4">
                  <span>📄 {reportPath}</span>
                  <span>📊 {content.split('\n').length} lines</span>
                  <span>📝 {Math.round(content.length / 1024)}KB</span>
                </div>

                {/* Report Content */}
                <div className="rounded-lg bg-muted p-4">
                  <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                    {content}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}