/**
 * Copyright by Calmic Sdn Bhd
 */

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Download, Trash2, AlertTriangle, CheckCircle2, RefreshCw, Upload, FileText, X, Database, Clock, History, Share2, Sparkles, StopCircle, Users, Edit, UserX, Vote } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { UnmatchedSpeakersManager } from "@/components/UnmatchedSpeakersManager";
import { AttendanceEditor } from "@/components/AttendanceEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { HansardRecord } from "@shared/schema";
import { format } from "date-fns";

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

interface SyncLogEntry {
  triggeredBy: 'manual' | 'scheduled';
  startTime: string;
  endTime: string;
  durationMs: number;
  lastKnownSession: string | null;
  recordsFound: number;
  recordsInserted: number;
  recordsSkipped: number;
  errors: Array<{ sessionNumber: string; error: string }>;
}

interface SyncLogsResponse {
  totalLogs: number;
  latestSync: SyncLogEntry | null;
  logs: SyncLogEntry[];
}

export default function HansardAdmin() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check admin authentication
  const { data: authStatus, isLoading: authLoading } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/auth-status"],
    retry: false,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !authStatus?.isAdmin) {
      setLocation("/admin-login");
    }
  }, [authStatus, authLoading, setLocation]);
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
  const [selectedHansardId, setSelectedHansardId] = useState<string>("");
  const [attendanceEditorRecord, setAttendanceEditorRecord] = useState<HansardRecord | null>(null);

  // MP Status Update states
  const [selectedMpId, setSelectedMpId] = useState("");
  const [dateOfPassing, setDateOfPassing] = useState("");
  const [byElectionDate, setByElectionDate] = useState("");
  const [byElectionNotes, setByElectionNotes] = useState("");

  // Constituency Attendance Audit states
  const [auditConstituency, setAuditConstituency] = useState("");
  const [auditResult, setAuditResult] = useState<{
    mp: { id: string; name: string; constituency: string; state: string; party: string };
    summary: { daysAttended: number; daysAbsent: number; totalSessions: number; attendanceRate: string };
    attendedSessions: Array<{ sessionNumber: string; sessionDate: string }>;
    absentSessions: Array<{ sessionNumber: string; sessionDate: string }>;
  } | null>(null);

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

  // Query for sync logs
  const { data: syncLogs, isLoading: syncLogsLoading, refetch: refetchSyncLogs } = useQuery<SyncLogsResponse>({
    queryKey: ["/api/admin/hansard-sync-logs"],
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch all MPs for status update
  const { data: allMps = [] } = useQuery<Array<{id: string; name: string; constituency: string; party: string; termEndDate: string | null}>>({
    queryKey: ["/api/mps"],
  });

  // Update MP status mutation
  const updateMpStatusMutation = useMutation({
    mutationFn: async (data: {
      mpId: string;
      termEndDate: string;
      byElectionDate?: string;
      byElectionNotes?: string;
    }) => {
      return await apiRequest("POST", "/api/admin/update-mp-status", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "MP status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/mps"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      // Reset form
      setSelectedMpId("");
      setDateOfPassing("");
      setByElectionDate("");
      setByElectionNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update MP status",
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

  const cleanupOrphanedMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/hansard-records/cleanup-orphaned");
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/hansard-records"] });
      toast({
        title: "Success",
        description: data.message || `Deleted ${data.deletedCount} orphaned records`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to clean up orphaned records",
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

  const handleCleanupOrphaned = () => {
    if (confirm("This will remove all Hansard records that don't have associated PDF files. Continue?")) {
      cleanupOrphanedMutation.mutate();
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

  // Import Election Results mutation
  const importElectionResultsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/import-election-results");
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/mps"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: `Imported election results for ${data.results.updatedMps} MPs`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to import election results",
        variant: "destructive",
      });
    },
  });

  const handleImportElectionResults = () => {
    if (confirm("This will fetch GE15 (2022) election vote data from Tindak Malaysia's GitHub repository and update all MPs. Continue?")) {
      importElectionResultsMutation.mutate();
    }
  };

  // Social Media Update mutation
  const updateSocialMediaMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/update-mp-social-media");
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/mps"] });
      toast({
        title: "Success",
        description: `Updated ${data.results.updated} MPs with social media data. ${data.results.notFound} not found.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update social media data",
        variant: "destructive",
      });
    },
  });

  const handleUpdateSocialMedia = () => {
    if (confirm("This will update MP profiles with social media URLs from the scraped data file. Continue?")) {
      updateSocialMediaMutation.mutate();
    }
  };

  // AI Analysis status query
  const { data: aiAnalysisStatus, refetch: refetchAIStatus } = useQuery({
    queryKey: ["/api/admin/analyze-hansard-status"],
    refetchInterval: (query) => {
      const data = query.state.data as any;
      return data?.job?.status === "running" ? 2000 : false;
    },
  });

  // AI Analysis mutation
  const startAIAnalysisMutation = useMutation({
    mutationFn: async (options: { forceReanalyze?: boolean; limit?: number }) => {
      const res = await apiRequest("POST", "/api/admin/analyze-hansard-bulk", options);
      return await res.json();
    },
    onSuccess: () => {
      refetchAIStatus();
      toast({
        title: "AI Analysis Started",
        description: "Background analysis of Hansard records has begun. This may take a while.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start AI analysis",
        variant: "destructive",
      });
    },
  });

  // Cancel AI Analysis mutation
  const cancelAIAnalysisMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/analyze-hansard-cancel");
      return await res.json();
    },
    onSuccess: () => {
      refetchAIStatus();
      toast({
        title: "Cancelled",
        description: "AI analysis job cancellation requested",
      });
    },
  });

  const handleStartAIAnalysis = (forceReanalyze: boolean = false) => {
    const message = forceReanalyze
      ? "This will re-analyze ALL Hansard records with AI. This may take a long time and consume API credits. Continue?"
      : "This will analyze Hansard records that don't have AI summaries yet. Continue?";
    if (confirm(message)) {
      startAIAnalysisMutation.mutate({ forceReanalyze });
    }
  };

  // Cabinet Roles Update mutation
  const updateCabinetRolesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/update-cabinet-roles");
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/mps"] });
      toast({
        title: "Cabinet Roles Updated",
        description: `Updated ${data.results.updated} MPs. ${data.results.notFound} not found.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update cabinet roles",
        variant: "destructive",
      });
    },
  });

  const handleUpdateCabinetRoles = () => {
    if (confirm("This will update MP profiles with Minister/Deputy Minister roles. Continue?")) {
      updateCabinetRolesMutation.mutate();
    }
  };

  // MP Contact Scrape mutation
  const scrapeMpContactsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/scrape-mp-contacts");
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/mps"] });
      toast({
        title: "Contact Scrape Complete",
        description: `Updated ${data.results?.updated || 0} MPs. Found ${data.results?.contactsScraped || 0} contacts.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to scrape MP contacts",
        variant: "destructive",
      });
    },
  });

  const handleScrapeMpContacts = () => {
    if (confirm("This will scrape MP contact information (emails, phone numbers) from the Parliament website. This may take several minutes. Continue?")) {
      scrapeMpContactsMutation.mutate();
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

  // Rescan All Attendance mutation
  const rescanAttendanceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/rescan-all-attendance");
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/hansard-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mps"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Attendance Rescan Complete",
        description: `Successfully rescanned ${data.successCount} of ${data.total} records. ${data.skippedCount > 0 ? `${data.skippedCount} skipped (no PDF).` : ''}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to rescan attendance data",
        variant: "destructive",
      });
    },
  });

  const handleRescanAllAttendance = () => {
    if (confirm("This will rescan attendance data from ALL Hansard PDFs. This may take several minutes. Continue?")) {
      rescanAttendanceMutation.mutate();
    }
  };

  // Constituency Attendance Audit mutation
  const auditAttendanceMutation = useMutation({
    mutationFn: async (constituency: string) => {
      const res = await apiRequest("GET", `/api/admin/constituency-attendance-audit?constituency=${encodeURIComponent(constituency)}`);
      return await res.json();
    },
    onSuccess: (data) => {
      setAuditResult(data);
      toast({
        title: "Audit Complete",
        description: `Found ${data.summary.daysAttended} days attended, ${data.summary.daysAbsent} days absent`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to audit attendance",
        variant: "destructive",
      });
      setAuditResult(null);
    },
  });

  const handleAuditAttendance = () => {
    if (!auditConstituency) {
      toast({
        title: "Error",
        description: "Please select a constituency",
        variant: "destructive",
      });
      return;
    }
    auditAttendanceMutation.mutate(auditConstituency);
  };

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      // Clear previous results when starting new upload
      setUploadResults([]);
      
      const formData = new FormData();
      files.forEach(file => {
        formData.append('pdfs', file);
      });
      
      const headers: Record<string, string> = {};
      
      const response = await fetch('/api/hansard-records/upload', {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      });
      
      const data = await response.json();
      
      // Handle partial or complete failure
      if (!response.ok && response.status !== 207) {
        throw new Error(data.error || 'Upload failed');
      }
      
      return data;
    },
    onSuccess: (data: { results: (UploadResult & { fileName: string })[] }) => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          typeof query.queryKey[0] === 'string' && 
          query.queryKey[0].startsWith('/api/hansard-records')
      });
      
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

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Don't render if not authenticated (useEffect will redirect)
  if (!authStatus?.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PageMeta
        title="Hansard Admin"
        description="Admin page for managing Hansard records."
        keywords="admin, hansard"
        url="https://myparliament.calmic.com.my/admin/hansard"
      />
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

      {/* MP Status Update Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5" />
            Update MP Status
          </CardTitle>
          <CardDescription>
            Mark an MP as former when they pass away or resign
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mp-select">Select MP *</Label>
              <Select value={selectedMpId} onValueChange={setSelectedMpId}>
                <SelectTrigger id="mp-select">
                  <SelectValue placeholder="Choose an MP..." />
                </SelectTrigger>
                <SelectContent>
                  {allMps
                    .filter((mp) => !mp.termEndDate || new Date(mp.termEndDate) > new Date())
                    .sort((a, b) => a.constituency.localeCompare(b.constituency) || a.name.localeCompare(b.name))
                    .map((mp) => (
                      <SelectItem key={mp.id} value={mp.id}>
                        {mp.name} - {mp.constituency}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="term-end-date">Date of Passing/Resignation *</Label>
              <Input
                id="term-end-date"
                type="date"
                value={dateOfPassing}
                onChange={(e) => setDateOfPassing(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="by-election-date">By-Election Date (Optional)</Label>
              <Input
                id="by-election-date"
                type="date"
                value={byElectionDate}
                onChange={(e) => setByElectionDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="by-election-notes">By-Election Notes (Optional)</Label>
              <Textarea
                id="by-election-notes"
                placeholder="Enter notes..."
                value={byElectionNotes}
                onChange={(e) => setByElectionNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => {
                if (!selectedMpId || !dateOfPassing) {
                  toast({
                    title: "Validation Error",
                    description: "Please select an MP and provide the date",
                    variant: "destructive",
                  });
                  return;
                }
                updateMpStatusMutation.mutate({
                  mpId: selectedMpId,
                  termEndDate: dateOfPassing,
                  byElectionDate: byElectionDate || undefined,
                  byElectionNotes: byElectionNotes || undefined,
                });
              }}
              disabled={!selectedMpId || !dateOfPassing || updateMpStatusMutation.isPending}
            >
              {updateMpStatusMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Update Status
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setSelectedMpId("");
                setDateOfPassing("");
                setByElectionDate("");
                setByElectionNotes("");
              }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

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
                <>
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
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Clean Up Orphaned Records
              </CardTitle>
              <CardDescription>
                Remove hansard records without associated PDF files
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading records...
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      This will remove records that were created but don't have PDF files
                      (typically from failed uploads).
                    </p>
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Orphaned records cannot display PDF content and should be cleaned up.
                      </AlertDescription>
                    </Alert>
                  </div>
                  <Button
                    onClick={handleCleanupOrphaned}
                    disabled={cleanupOrphanedMutation.isPending || isLoading || !hansardRecords || hansardRecords.length === 0}
                    variant="outline"
                    className="w-full"
                  >
                    {cleanupOrphanedMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cleaning up...
                      </>
                    ) : (
                      <>
                        <Database className="mr-2 h-4 w-4" />
                        Clean Up Orphaned Records
                      </>
                    )}
                  </Button>
                </>
              )}
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

        {/* Edit Attendance Card */}
        <Card className="border-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit MP Attendance
            </CardTitle>
            <CardDescription>
              Manually update MP attendance records for any Hansard session
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Select a Hansard session to edit attendance. You can mark MPs as attended or absent, and the system will automatically recalculate attendance statistics.
              </p>
              <Alert>
                <AlertDescription>
                  Changes will update MP attendance rates across the entire system.
                </AlertDescription>
              </Alert>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select Hansard Session</label>
              <Select
                value={selectedHansardId}
                onValueChange={(value) => {
                  setSelectedHansardId(value);
                  const record = hansardRecords?.find((r: HansardRecord) => r.id === value);
                  if (record) {
                    setAttendanceEditorRecord(record);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a session to edit..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {hansardRecords?.sort((a: HansardRecord, b: HansardRecord) =>
                    new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
                  ).map((record: HansardRecord) => (
                    <SelectItem key={record.id} value={record.id}>
                      {record.sessionNumber} - {format(new Date(record.sessionDate), "MMM dd, yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedHansardId && (
              <div className="pt-2">
                <p className="text-sm text-muted-foreground mb-3">
                  Click below to open the attendance editor for the selected session.
                </p>
                <Button
                  onClick={() => {
                    const record = hansardRecords?.find((r: HansardRecord) => r.id === selectedHansardId);
                    if (record) {
                      setAttendanceEditorRecord(record);
                    }
                  }}
                  className="w-full"
                  data-testid="button-open-attendance-editor"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Open Attendance Editor
                </Button>
              </div>
            )}
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

        {/* Import Election Results Card */}
        <Card className="border-purple-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Vote className="h-5 w-5" />
              Import Election Results
            </CardTitle>
            <CardDescription>
              Import GE15 (2022) election vote data for all MPs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                This will fetch official GE15 (2022) election results from Tindak Malaysia's GitHub repository and update all MP records with:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
                <li>Votes received</li>
                <li>Vote percentage</li>
                <li>Winning majority</li>
                <li>Voter turnout</li>
              </ul>
              <Alert>
                <AlertDescription>
                  Data is fetched directly from the official source. Run this after the migration to populate election data.
                </AlertDescription>
              </Alert>
            </div>
            <Button
              onClick={handleImportElectionResults}
              disabled={importElectionResultsMutation.isPending}
              className="w-full"
              data-testid="button-import-election-results"
            >
              {importElectionResultsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Vote className="mr-2 h-4 w-4" />
                  Import Election Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Rescan All Attendance Card */}
        <Card className="border-orange-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Rescan All Attendance
            </CardTitle>
            <CardDescription>
              Re-extract attendance data from all Hansard PDFs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                This will re-parse all Hansard PDFs and update attendance records (attended/absent MPs) for every session. Use this if the attendance parser has been improved.
              </p>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This operation may take several minutes depending on the number of Hansard records. Records without PDFs will be skipped.
                </AlertDescription>
              </Alert>
            </div>
            <Button
              onClick={handleRescanAllAttendance}
              disabled={rescanAttendanceMutation.isPending}
              className="w-full"
              data-testid="button-rescan-all-attendance"
            >
              {rescanAttendanceMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rescanning Attendance...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Rescan All Attendance Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Constituency Attendance Audit Card */}
        <Card className="border-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Constituency Attendance Audit
            </CardTitle>
            <CardDescription>
              Audit attendance records for a specific constituency
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="audit-constituency">Select Constituency</Label>
              <Select value={auditConstituency} onValueChange={setAuditConstituency}>
                <SelectTrigger data-testid="select-audit-constituency">
                  <SelectValue placeholder="Select a constituency..." />
                </SelectTrigger>
                <SelectContent>
                  {allMps
                    .filter((mp) => !mp.termEndDate || new Date(mp.termEndDate) > new Date())
                    .sort((a, b) => a.constituency.localeCompare(b.constituency))
                    .map((mp) => (
                      <SelectItem key={mp.id} value={mp.constituency}>
                        {mp.constituency} - {mp.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleAuditAttendance}
              disabled={auditAttendanceMutation.isPending || !auditConstituency}
              className="w-full"
              data-testid="button-audit-attendance"
            >
              {auditAttendanceMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Auditing...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Audit Attendance
                </>
              )}
            </Button>

            {auditResult && (
              <div className="mt-4 space-y-4">
                <div className="p-4 bg-muted rounded-md">
                  <h4 className="font-semibold mb-2">{auditResult.mp.name}</h4>
                  <p className="text-sm text-muted-foreground">{auditResult.mp.constituency}, {auditResult.mp.state} ({auditResult.mp.party})</p>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <p className="text-2xl font-bold text-green-600">{auditResult.summary.daysAttended}</p>
                      <p className="text-xs text-muted-foreground">Days Attended</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">{auditResult.summary.daysAbsent}</p>
                      <p className="text-xs text-muted-foreground">Days Absent</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{auditResult.summary.totalSessions}</p>
                      <p className="text-xs text-muted-foreground">Total Sessions</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{auditResult.summary.attendanceRate}</p>
                      <p className="text-xs text-muted-foreground">Attendance Rate</p>
                    </div>
                  </div>
                </div>

                {auditResult.absentSessions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-red-600">Absent Dates ({auditResult.absentSessions.length})</h4>
                    <div className="max-h-48 overflow-y-auto border rounded-md p-2">
                      {auditResult.absentSessions.map((session, idx) => (
                        <div key={idx} className="text-sm py-1 border-b last:border-0">
                          <span className="font-medium">{session.sessionDate}</span>
                          <span className="text-muted-foreground ml-2">({session.sessionNumber})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {auditResult.attendedSessions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-green-600">Attended Dates ({auditResult.attendedSessions.length})</h4>
                    <div className="max-h-48 overflow-y-auto border rounded-md p-2">
                      {auditResult.attendedSessions.map((session, idx) => (
                        <div key={idx} className="text-sm py-1 border-b last:border-0">
                          <span className="font-medium">{session.sessionDate}</span>
                          <span className="text-muted-foreground ml-2">({session.sessionNumber})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Update MP Social Media Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Update MP Social Media
            </CardTitle>
            <CardDescription>
              Update MP profiles with social media links from politicians.my
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                This will update MP profiles with Facebook, Instagram, Twitter/X, and TikTok URLs from the scraped data file (scripts/mp-social-media-scraped.json).
              </p>
              <Alert>
                <AlertDescription>
                  Currently contains social media data for 38 MPs. Add more MPs to the JSON file to expand coverage.
                </AlertDescription>
              </Alert>
            </div>
            <Button
              onClick={handleUpdateSocialMedia}
              disabled={updateSocialMediaMutation.isPending}
              className="w-full"
              data-testid="button-update-social-media"
            >
              {updateSocialMediaMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Social Media...
                </>
              ) : (
                <>
                  <Share2 className="mr-2 h-4 w-4" />
                  Update Social Media Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Update Cabinet Roles Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Update Cabinet Roles
            </CardTitle>
            <CardDescription>
              Update MP profiles with Minister/Deputy Minister positions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                This will update MP profiles with their cabinet positions (Ministers and Deputy Ministers) from the latest cabinet data.
              </p>
              <Alert>
                <AlertDescription>
                  Includes 28 Ministers and 27 Deputy Ministers (55 total MPs) based on the December 2023 cabinet reshuffle.
                  Note: 5 cabinet members are Senators (3 Ministers + 2 Deputy Ministers), not MPs, and are not included in this update.
                </AlertDescription>
              </Alert>
            </div>
            <Button
              onClick={handleUpdateCabinetRoles}
              disabled={updateCabinetRolesMutation.isPending}
              className="w-full"
              data-testid="button-update-cabinet-roles"
            >
              {updateCabinetRolesMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Cabinet Roles...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Update Cabinet Roles
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Scrape MP Contacts Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Update MP Contacts
            </CardTitle>
            <CardDescription>
              Scrape email addresses and phone numbers from Parliament website
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                This will fetch MP contact information from the official Parliament website (parlimen.gov.my) and update the database with email addresses, phone numbers, and other contact details.
              </p>
              <Alert>
                <AlertDescription>
                  This process may take several minutes as it needs to fetch individual MP profile pages. The scraper will match MPs by name and update their contact fields.
                </AlertDescription>
              </Alert>
            </div>
            <Button
              onClick={handleScrapeMpContacts}
              disabled={scrapeMpContactsMutation.isPending}
              className="w-full"
              data-testid="button-scrape-mp-contacts"
            >
              {scrapeMpContactsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scraping Contacts...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Scrape MP Contacts
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* AI Analysis Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Hansard Analysis
            </CardTitle>
            <CardDescription>
              Use AI (Gemini 2.0 Flash via OpenRouter) to analyze and summarize Hansard records
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(aiAnalysisStatus as any)?.configured === false && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  AI not configured. Set OPENROUTER_API_KEY environment variable.
                </AlertDescription>
              </Alert>
            )}

            {(aiAnalysisStatus as any)?.job?.status === "running" && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  <div className="font-medium">Analysis in progress...</div>
                  <div className="text-sm mt-1">
                    Processing: {(aiAnalysisStatus as any).job.currentSession || "..."}<br />
                    Progress: {(aiAnalysisStatus as any).job.processed} / {(aiAnalysisStatus as any).job.total}<br />
                    Success: {(aiAnalysisStatus as any).job.successful} | Failed: {(aiAnalysisStatus as any).job.failed}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {(aiAnalysisStatus as any)?.job?.status === "completed" && (
              <Alert className="border-green-500">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertDescription>
                  Last job completed: {(aiAnalysisStatus as any).job.successful} successful, {(aiAnalysisStatus as any).job.failed} failed
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => handleStartAIAnalysis(false)}
                disabled={startAIAnalysisMutation.isPending || (aiAnalysisStatus as any)?.job?.status === "running" || !(aiAnalysisStatus as any)?.configured}
                className="flex-1"
              >
                {startAIAnalysisMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Analyze New Records
                  </>
                )}
              </Button>

              {(aiAnalysisStatus as any)?.job?.status === "running" && (
                <Button
                  variant="destructive"
                  onClick={() => cancelAIAnalysisMutation.mutate()}
                  disabled={cancelAIAnalysisMutation.isPending}
                >
                  <StopCircle className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              )}
            </div>

            <Button
              variant="outline"
              onClick={() => handleStartAIAnalysis(true)}
              disabled={startAIAnalysisMutation.isPending || (aiAnalysisStatus as any)?.job?.status === "running" || !(aiAnalysisStatus as any)?.configured}
              className="w-full"
            >
              Re-analyze All Records
            </Button>
          </CardContent>
        </Card>

        {/* Sync Logs Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Hansard Sync Logs
            </CardTitle>
            <CardDescription>
              View history of automatic and manual Hansard sync operations (runs daily at 12:00 PM Malaysia time)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {syncLogsLoading ? "Loading..." : `${syncLogs?.totalLogs || 0} sync operations logged`}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchSyncLogs()}
                disabled={syncLogsLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncLogsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {syncLogs?.latestSync && (
              <Alert className={syncLogs.latestSync.errors.length > 0 ? "border-orange-500" : "border-green-500"}>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium">
                    Latest sync: {new Date(syncLogs.latestSync.startTime).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}
                  </div>
                  <div className="text-sm mt-1">
                    {syncLogs.latestSync.triggeredBy === 'scheduled' ? '⏰ Scheduled' : '👤 Manual'} |
                    Found: {syncLogs.latestSync.recordsFound} |
                    Inserted: {syncLogs.latestSync.recordsInserted} |
                    Skipped: {syncLogs.latestSync.recordsSkipped} |
                    Duration: {(syncLogs.latestSync.durationMs / 1000).toFixed(1)}s
                    {syncLogs.latestSync.errors.length > 0 && (
                      <span className="text-orange-600"> | Errors: {syncLogs.latestSync.errors.length}</span>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {syncLogs?.logs && syncLogs.logs.length > 0 ? (
              <div className="max-h-64 overflow-y-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Time</th>
                      <th className="p-2 text-left">Type</th>
                      <th className="p-2 text-center">Found</th>
                      <th className="p-2 text-center">Inserted</th>
                      <th className="p-2 text-center">Errors</th>
                      <th className="p-2 text-right">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncLogs.logs.map((log, index) => (
                      <tr key={index} className={`border-t ${log.errors.length > 0 ? 'bg-orange-50 dark:bg-orange-950/20' : ''}`}>
                        <td className="p-2 whitespace-nowrap">
                          {new Date(log.startTime).toLocaleString('en-MY', {
                            timeZone: 'Asia/Kuala_Lumpur',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="p-2">
                          {log.triggeredBy === 'scheduled' ? (
                            <span className="inline-flex items-center gap-1 text-blue-600">
                              <Clock className="h-3 w-3" /> Auto
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-purple-600">
                              👤 Manual
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-center">{log.recordsFound}</td>
                        <td className="p-2 text-center">
                          {log.recordsInserted > 0 ? (
                            <span className="text-green-600 font-medium">{log.recordsInserted}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          {log.errors.length > 0 ? (
                            <span className="text-orange-600 font-medium" title={log.errors.map(e => `${e.sessionNumber}: ${e.error}`).join('\n')}>
                              {log.errors.length}
                            </span>
                          ) : (
                            <span className="text-green-600">✓</span>
                          )}
                        </td>
                        <td className="p-2 text-right text-muted-foreground">
                          {(log.durationMs / 1000).toFixed(1)}s
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No sync logs yet. Logs will appear after the first sync operation.
              </div>
            )}
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

      <UnmatchedSpeakersManager />

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

      {/* Attendance Editor Dialog */}
      {attendanceEditorRecord && (
        <AttendanceEditor
          hansardRecord={attendanceEditorRecord}
          open={!!attendanceEditorRecord}
          onOpenChange={(open) => {
            if (!open) {
              setAttendanceEditorRecord(null);
              setSelectedHansardId("");
            }
          }}
        />
      )}
      </div>
    </div>
  );
}
