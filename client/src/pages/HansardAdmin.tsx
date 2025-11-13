import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Download, Trash2, AlertTriangle, CheckCircle2, RefreshCw, Upload, FileText, X } from "lucide-react";
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
}

export default function HansardAdmin() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
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

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('pdf', file);
      
      const response = await fetch('/api/hansard-records/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
      
      return await response.json();
    },
    onSuccess: (data: UploadResult) => {
      queryClient.invalidateQueries({ queryKey: ["/api/hansard-records"] });
      setUploadResult(data);
      setSelectedFile(null);
      toast({
        title: "Upload Successful",
        description: `Successfully parsed Hansard ${data.sessionNumber}. Found ${data.speakersFound} speakers.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (file: File) => {
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid File",
        description: "Please select a PDF file",
        variant: "destructive",
      });
      return;
    }
    setSelectedFile(file);
    setUploadResult(null);
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
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
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
            {selectedFile ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <FileText className="h-10 w-10 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedFile(null)}
                    data-testid="button-remove-file"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending}
                  className="w-full"
                  data-testid="button-upload-pdf"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Parsing PDF...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload and Parse
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <p className="text-lg font-medium">
                    Drag and drop your Hansard PDF here
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    or click to browse files
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
                  onChange={handleFileInputChange}
                  className="hidden"
                  data-testid="input-file"
                />
              </div>
            )}
          </div>

          {uploadResult && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">
                    Successfully parsed Hansard {uploadResult.sessionNumber}
                  </p>
                  <div className="text-sm space-y-1">
                    <p>✅ {uploadResult.speakersFound} MPs detected as speakers</p>
                    <p>✅ {uploadResult.attendedCount} MPs attended</p>
                    <p>✅ {uploadResult.absentCount} MPs absent</p>
                    {uploadResult.unmatchedSpeakers && uploadResult.unmatchedSpeakers.length > 0 && (
                      <p className="text-yellow-600">
                        ⚠️ {uploadResult.unmatchedSpeakers.length} speakers could not be matched
                      </p>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
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
      </div>

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
