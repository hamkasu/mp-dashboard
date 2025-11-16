import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Download, Trash2, AlertTriangle, CheckCircle2, RefreshCw, Upload, FileText, X, Database } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UploadResult {
  success: boolean;
  sessionNumber?: string;
  speakersFound?: number;
  unmatchedSpeakers?: string[];
  attendedCount?: number;
  absentCount?: number;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

export default function HansardAdmin() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadResults, setUploadResults] = useState<(UploadResult & { fileName: string })[]>([]);
  const [downloadStatus, setDownloadStatus] = useState<{
    total?: number;
    successful?: number;
    errors?: number;
    skipped?: number;
  } | null>(null);
  const [jobStatus, setJobStatus] = useState<{
    jobId: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: {
      current: number;
      total: number;
      message: string;
    };
    result?: {
      successCount: number;
      errorCount: number;
      skippedCount: number;
    };
    error?: string;
  } | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [diagnosticsResult, setDiagnosticsResult] = useState<any>(null);
  const [reprocessResult, setReprocessResult] = useState<any>(null);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const { data: hansardRecords, isLoading } = useQuery<any[]>({
    queryKey: ["/api/hansard-records"],
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/hansard-records");
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/hansard-records"] });
      toast({
        title: "Success",
        description: `Deleted ${data.deletedCount} hansard records`,
      });
      setDownloadStatus(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete hansard records",
        variant: "destructive",
      });
    },
  });

  const pollJobStatus = async (jobId: string) => {
    try {
      const res = await apiRequest("GET", `/api/jobs/${jobId}`);
      const job = await res.json();
      setJobStatus(job);
      
      if (job.status === 'completed') {
        // Stop polling
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        
        // Update download status and invalidate cache
        if (job.result) {
          setDownloadStatus({
            total: job.progress.total,
            successful: job.result.successCount,
            errors: job.result.errorCount,
            skipped: job.result.skippedCount
          });
        }
        
        queryClient.invalidateQueries({ queryKey: ["/api/hansard-records"] });
        
        toast({
          title: "Download Complete",
          description: `Successfully downloaded ${job.result?.successCount || 0} hansard records`,
        });
      } else if (job.status === 'failed') {
        // Stop polling
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        
        toast({
          title: "Error",
          description: job.error || "Download failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error polling job status:', error);
    }
  };

  const downloadMutation = useMutation({
    mutationFn: async (maxRecords: number) => {
      const res = await apiRequest("POST", "/api/hansard-records/download", { maxRecords });
      return await res.json();
    },
    onSuccess: (data: { jobId: string; message: string }) => {
      toast({
        title: "Download Started",
        description: "Download running in background...",
      });
      
      // Start polling for job status
      const interval = setInterval(() => pollJobStatus(data.jobId), 2000);
      setPollingInterval(interval);
      
      // Initial poll
      pollJobStatus(data.jobId);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start download job",
        variant: "destructive",
      });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async (maxRecords: number) => {
      const res = await apiRequest("POST", "/api/hansard-records/download", { 
        maxRecords,
        deleteExisting: true 
      });
      return await res.json();
    },
    onSuccess: (data: { jobId: string; message: string }) => {
      toast({
        title: "Refresh Started",
        description: "Refresh running in background...",
      });
      
      // Start polling for job status
      const interval = setInterval(() => pollJobStatus(data.jobId), 2000);
      setPollingInterval(interval);
      
      // Initial poll
      pollJobStatus(data.jobId);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start refresh job",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete all ${hansardRecords?.length || 0} hansard records? This action cannot be undone.`)) {
      deleteMutation.mutate();
    }
  };

  const handleDownload = () => {
    if (confirm("This will download up to 500 hansard records from the 15th Parliament. This may take several minutes. Continue?")) {
      setDownloadStatus(null);
      downloadMutation.mutate(500);
    }
  };

  const handleRefresh = () => {
    if (confirm("This will DELETE all existing hansard records and download fresh data from the 15th Parliament. This may take several minutes. Continue?")) {
      setDownloadStatus(null);
      refreshMutation.mutate(1000);
    }
  };

  const refreshMpDataMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/refresh-mp-data");
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/mps"] });
      toast({
        title: "Success",
        description: `Updated ${data.results.attendance.mpsUpdated} MPs with attendance and speech data`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to refresh MP data",
        variant: "destructive",
      });
    },
  });

  const handleRefreshMpData = () => {
    if (confirm("This will recalculate all MP attendance, speech counts, and performance metrics from Hansard records. Continue?")) {
      refreshMpDataMutation.mutate();
    }
  };

  const diagnosticsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/admin/hansard-diagnostics");
      return await res.json();
    },
    onSuccess: (data: any) => {
      setDiagnosticsResult(data);
      toast({
        title: "Diagnostics Complete",
        description: `Found ${data.recordsNeedingReprocessing} records needing reprocessing`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to run diagnostics",
        variant: "destructive",
      });
    },
  });

  const reprocessMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/reprocess-hansard-speakers");
      return await res.json();
    },
    onSuccess: (data: any) => {
      setReprocessResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/hansard-records"] });
      toast({
        title: "Reprocessing Complete",
        description: `Successfully reprocessed ${data.successCount} records`,
      });
      setDiagnosticsResult(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reprocess Hansard records",
        variant: "destructive",
      });
    },
  });

  const handleRunDiagnostics = () => {
    diagnosticsMutation.mutate();
  };

  const handleReprocess = () => {
    if (confirm(`This will reprocess ${diagnosticsResult?.recordsNeedingReprocessing || 0} Hansard records to extract speaker data. Continue?`)) {
      reprocessMutation.mutate();
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      // Clear previous results when starting new upload
      setUploadResults([]);
      
      const formData = new FormData();
      files.forEach(file => {
        formData.append('pdfs', file);
      });
      
      const response = await fetch('/api/hansard-records/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      // Handle partial or complete failure
      if (!response.ok && response.status !== 207) {
        throw new Error(data.error || 'Upload failed');
      }
      
      return data;
    },
    onSuccess: (data: { results: (UploadResult & { fileName: string })[] }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/hansard-records"] });
      
      // Backend now includes fileName in each result
      setUploadResults(data.results);
      setSelectedFiles([]);
      
      const successCount = data.results.filter(r => r.success && !r.skipped).length;
      const skippedCount = data.results.filter(r => r.skipped).length;
      const failCount = data.results.filter(r => !r.success).length;
      
      if (successCount === 0 && failCount > 0) {
        toast({
          title: "Upload Failed",
          description: `All ${failCount} file${failCount !== 1 ? 's' : ''} failed to upload${skippedCount > 0 ? `, ${skippedCount} skipped` : ''}`,
          variant: "destructive",
        });
      } else {
        const parts = [];
        if (successCount > 0) parts.push(`${successCount} uploaded`);
        if (skippedCount > 0) parts.push(`${skippedCount} skipped`);
        if (failCount > 0) parts.push(`${failCount} failed`);
        
        toast({
          title: "Upload Complete",
          description: parts.join(', '),
          variant: failCount > 0 ? "destructive" : "default",
        });
      }
    },
    onError: (error: Error) => {
      setUploadResults([]);
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFilesSelect = (newFiles: File[]) => {
    const pdfFiles = newFiles.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length !== newFiles.length) {
      toast({
        title: "Invalid Files",
        description: `${newFiles.length - pdfFiles.length} non-PDF file(s) were skipped`,
        variant: "destructive",
      });
    }
    
    if (pdfFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...pdfFiles]);
      setUploadResults([]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFilesSelect(files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFilesSelect(Array.from(files));
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      uploadMutation.mutate(selectedFiles);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="container mx-auto p-6 space-y-6" data-testid="page-hansard-admin">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Hansard Administration</h1>
            <p className="text-muted-foreground mt-2">
              Manage parliamentary hansard records for the 15th Parliament
            </p>
          </div>
        </div>

      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Hansard PDF
          </CardTitle>
          <CardDescription>
            Upload and automatically parse Hansard PDF files to extract speakers and attendance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-md p-8 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover-elevate"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            data-testid="dropzone-upload"
          >
            {selectedFiles.length > 0 ? (
              <div className="space-y-4">
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div 
                      key={`${file.name}-${index}`}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-md"
                      data-testid={`file-item-${index}`}
                    >
                      <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                      <div className="text-left flex-1 min-w-0">
                        <p className="font-medium truncate">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFile(index)}
                        data-testid={`button-remove-file-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1"
                    data-testid="button-add-more-files"
                  >
                    Add More Files
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending}
                    className="flex-1"
                    data-testid="button-upload-pdf"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Parsing {selectedFiles.length} PDF{selectedFiles.length !== 1 ? 's' : ''}...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload {selectedFiles.length} File{selectedFiles.length !== 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <p className="text-lg font-medium">
                    Drag and drop your Hansard PDFs here
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    or click to browse files (multiple files supported)
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-browse-files"
                >
                  Browse Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleFileInputChange}
                  className="hidden"
                  data-testid="input-file"
                />
              </div>
            )}
          </div>

          {uploadResults.length > 0 && (
            <div className="space-y-2">
              {uploadResults.map((result, index) => (
                <Alert 
                  key={index} 
                  variant={result.success ? (result.skipped ? "default" : "default") : "destructive"}
                  className={result.skipped ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20" : ""}
                >
                  {result.success ? (
                    result.skipped ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">
                        {result.fileName}: {result.skipped ? 'Skipped' : (result.success ? `Hansard ${result.sessionNumber}` : 'Failed')}
                      </p>
                      {result.skipped ? (
                        <p className="text-sm text-yellow-700 dark:text-yellow-400">{result.reason}</p>
                      ) : result.success ? (
                        <div className="text-sm space-y-1">
                          <p>✅ {result.speakersFound} MPs detected as speakers</p>
                          <p>✅ {result.attendedCount} MPs attended</p>
                          <p>✅ {result.absentCount} MPs absent</p>
                          {result.unmatchedSpeakers && result.unmatchedSpeakers.length > 0 && (
                            <p className="text-yellow-600">
                              ⚠️ {result.unmatchedSpeakers.length} speakers could not be matched
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm">{result.error || 'Unknown error'}</p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Refresh All Hansard Data
          </CardTitle>
          <CardDescription>
            Delete existing records and download fresh hansard data from Parliament 15
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This will delete all existing hansard records and download up to 1,000 fresh records from the Malaysian Parliament website.
            </p>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This operation will delete all existing data and may take 10-30 minutes to complete. Use this to get the latest hansard records.
              </AlertDescription>
            </Alert>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={refreshMutation.isPending || jobStatus?.status === 'running'}
            variant="default"
            className="w-full"
            data-testid="button-refresh-hansard"
          >
            {refreshMutation.isPending || jobStatus?.status === 'running' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {jobStatus?.status === 'running' ? 'Processing...' : 'Starting...'}
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Hansard Data
              </>
            )}
          </Button>

          {jobStatus && jobStatus.status !== 'completed' && (
            <Alert className="mt-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">{jobStatus.progress.message}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-primary h-full transition-all duration-300"
                        style={{ 
                          width: `${jobStatus.progress.total > 0 ? (jobStatus.progress.current / jobStatus.progress.total) * 100 : 0}%` 
                        }}
                      />
                    </div>
                    <span className="text-muted-foreground">
                      {jobStatus.progress.current} / {jobStatus.progress.total}
                    </span>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {jobStatus?.status === 'completed' && jobStatus.result && (
            <Alert className="mt-4">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium">Download Complete</p>
                <div className="text-sm space-y-1 mt-2">
                  <p>✅ Successfully downloaded: {jobStatus.result.successCount}</p>
                  {jobStatus.result.skippedCount > 0 && (
                    <p>⏭️ Skipped (already existed): {jobStatus.result.skippedCount}</p>
                  )}
                  {jobStatus.result.errorCount > 0 && (
                    <p className="text-destructive">❌ Errors: {jobStatus.result.errorCount}</p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {jobStatus?.status === 'failed' && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium">Download Failed</p>
                <p className="text-sm mt-1">{jobStatus.error || 'Unknown error occurred'}</p>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Hansard Records
            </CardTitle>
            <CardDescription>
              Remove all existing hansard records from the database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading records...
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Current records in database: <strong>{hansardRecords?.length || 0}</strong>
                </p>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This will permanently delete all hansard records. This action cannot be undone.
                  </AlertDescription>
                </Alert>
              </div>
            )}
            <Button
              onClick={handleDelete}
              disabled={deleteMutation.isPending || isLoading || !hansardRecords || hansardRecords.length === 0}
              variant="destructive"
              className="w-full"
              data-testid="button-delete-all"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete All Records
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download Hansard Records
            </CardTitle>
            <CardDescription>
              Download hansard records from parlimen.gov.my (15th Parliament)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                This will download up to 500 hansard records from the Malaysian Parliament website.
              </p>
              <Alert>
                <AlertDescription>
                  Download may take several minutes as it processes PDF files from the parliament website.
                </AlertDescription>
              </Alert>
            </div>
            <Button
              onClick={handleDownload}
              disabled={downloadMutation.isPending}
              className="w-full"
              data-testid="button-download"
            >
              {downloadMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download 15th Parliament Hansard
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Refresh MP Data
            </CardTitle>
            <CardDescription>
              Update MP attendance and performance metrics from Hansard records
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                This will recalculate attendance rates, speech counts, and Hansard participation metrics for all MPs based on existing Hansard records.
              </p>
              <Alert>
                <AlertDescription>
                  Use this after uploading new Hansard records to update MP cards with the latest data.
                </AlertDescription>
              </Alert>
            </div>
            <Button
              onClick={handleRefreshMpData}
              disabled={refreshMpDataMutation.isPending}
              className="w-full"
              data-testid="button-refresh-mp-data"
            >
              {refreshMpDataMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Refresh MP Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Hansard Diagnostics
            </CardTitle>
            <CardDescription>
              Identify and fix Hansard records with missing speech data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Some older Hansard records may have empty speaker data arrays, causing MPs to show 0 speeches even though they participated.
              </p>
              <Alert>
                <AlertDescription>
                  Run diagnostics to identify problematic records, then reprocess them to extract speaker data from the PDFs.
                </AlertDescription>
              </Alert>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleRunDiagnostics}
                disabled={diagnosticsMutation.isPending}
                className="flex-1"
                variant="outline"
                data-testid="button-run-diagnostics"
              >
                {diagnosticsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Run Diagnostics
                  </>
                )}
              </Button>
              <Button
                onClick={handleReprocess}
                disabled={reprocessMutation.isPending || !diagnosticsResult}
                className="flex-1"
                data-testid="button-reprocess"
              >
                {reprocessMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reprocessing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reprocess All
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {diagnosticsResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {diagnosticsResult.recordsNeedingReprocessing > 0 ? (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              )}
              Diagnostic Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total records:</span>
                <strong>{diagnosticsResult.totalRecords}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">With speaker data:</span>
                <strong className="text-green-600">{diagnosticsResult.recordsWithSpeakers}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Missing speaker data:</span>
                <strong className="text-yellow-600">{diagnosticsResult.recordsNeedingReprocessing}</strong>
              </div>
            </div>
            {diagnosticsResult.problematicRecords && diagnosticsResult.problematicRecords.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Records needing reprocessing:</h4>
                <div className="max-h-40 overflow-y-auto space-y-1 text-xs">
                  {diagnosticsResult.problematicRecords.map((record: any) => (
                    <div key={record.id} className="flex justify-between py-1 border-b">
                      <span>{record.sessionNumber}</span>
                      <span className="text-muted-foreground">{record.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {reprocessResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Reprocessing Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Records processed:</span>
                <strong className="text-green-600">{reprocessResult.successCount}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Errors:</span>
                <strong className="text-red-600">{reprocessResult.errorCount}</strong>
              </div>
            </div>
            {reprocessResult.errors && reprocessResult.errors.length > 0 && (
              <Alert className="mt-4" variant="destructive">
                <AlertDescription>
                  <div className="text-xs space-y-1">
                    {reprocessResult.errors.map((error: string, i: number) => (
                      <div key={i}>{error}</div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {downloadStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Download Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total found:</span>
                <strong>{downloadStatus.total || 0}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Successfully downloaded:</span>
                <strong className="text-green-600">{downloadStatus.successful || 0}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Skipped (already exists):</span>
                <strong className="text-blue-600">{downloadStatus.skipped || 0}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Errors:</span>
                <strong className="text-red-600">{downloadStatus.errors || 0}</strong>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
