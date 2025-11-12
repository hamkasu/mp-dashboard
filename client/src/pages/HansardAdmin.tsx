import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Trash2, AlertTriangle, CheckCircle2, RefreshCw, LogOut, User, Upload, FileText, X } from "lucide-react";
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
  const [, setLocation] = useLocation();
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

  const { data: authData } = useQuery<{ authenticated: boolean; user?: { username: string } }>({
    queryKey: ["/api/auth/check"],
  });

  const { data: hansardRecords, isLoading } = useQuery<any[]>({
    queryKey: ["/api/hansard-records"],
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/logout", {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.clear();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out",
      });
      setLocation("/login");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    },
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

  const downloadMutation = useMutation({
    mutationFn: async (maxRecords: number) => {
      const res = await apiRequest("POST", "/api/hansard-records/download", { maxRecords });
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/hansard-records"] });
      setDownloadStatus(data);
      toast({
        title: "Download Complete",
        description: `Successfully downloaded ${data.successful} hansard records`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to download hansard records",
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
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/hansard-records"] });
      setDownloadStatus(data);
      toast({
        title: "Refresh Complete",
        description: `Successfully refreshed ${data.successful} hansard records`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to refresh hansard records",
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
    if (confirm("This will download up to 200 hansard records from the 15th Parliament. This may take several minutes. Continue?")) {
      setDownloadStatus(null);
      downloadMutation.mutate(200);
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
          <div className="flex items-center gap-3">
            {authData?.user && (
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{authData.user.username}</span>
                <Badge variant="secondary" className="text-xs">Admin</Badge>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              data-testid="button-logout"
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
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
            disabled={refreshMutation.isPending}
            variant="default"
            className="w-full"
            data-testid="button-refresh-hansard"
          >
            {refreshMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Hansard Data
              </>
            )}
          </Button>
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
                This will download up to 200 hansard records from the Malaysian Parliament website.
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
