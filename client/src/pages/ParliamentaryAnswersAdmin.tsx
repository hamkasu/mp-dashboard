/**
 * Copyright by Calmic Sdn Bhd
 *
 * Admin page for managing Parliamentary Oral Answers and their PDF files
 */

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2, Download, AlertTriangle, CheckCircle2, RefreshCw, Upload,
  FileText, Database, MessageSquare, ExternalLink, File, Trash2
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface ParliamentaryAnswer {
  id: string;
  questionNumber?: string | null;
  title: string;
  questionerName?: string | null;
  answererName?: string | null;
  answererMinistry?: string | null;
  dateAsked?: string | null;
  status: string;
  questionText?: string | null;
  answerText?: string | null;
  fullTextUrl?: string | null;
  hasPdf?: boolean;
}

interface AnswersResponse {
  answers: ParliamentaryAnswer[];
  count: number;
}

export default function ParliamentaryAnswersAdmin() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string>("");
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

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

  // Fetch stored parliamentary answers
  const { data: answersData, isLoading: answersLoading, refetch: refetchAnswers } = useQuery<AnswersResponse>({
    queryKey: ["/api/parliamentary-answers/stored"],
  });

  const answers = answersData?.answers || [];

  // Scrape new answers mutation
  const scrapeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/parliamentary-answers/scrape");
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/parliamentary-answers/stored"] });
      toast({
        title: "Scrape Complete",
        description: `Saved: ${data.saved}, Updated: ${data.updated}, Errors: ${data.errors}`,
      });
      refetchAnswers();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to scrape parliamentary answers",
        variant: "destructive",
      });
    },
  });

  // Download all PDFs mutation
  const downloadAllPdfsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/parliamentary-answers/batch-analyze-pdfs");
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/parliamentary-answers/stored"] });
      toast({
        title: "Batch Download Complete",
        description: `Total: ${data.total}, Processed: ${data.processed}, Failed: ${data.failed}, Skipped: ${data.skipped}`,
      });
      refetchAnswers();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to download PDFs",
        variant: "destructive",
      });
    },
  });

  // Full sync mutation (scrape + download all PDFs)
  const fullSyncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/parliamentary-answers/full-sync");
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/parliamentary-answers/stored"] });
      toast({
        title: "Full Sync Complete",
        description: `Sessions: ${data.totalSessions}, Saved: ${data.saved}, PDFs Downloaded: ${data.pdfsDownloaded}`,
      });
      refetchAnswers();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete full sync",
        variant: "destructive",
      });
    },
  });

  // Upload PDF for a specific answer
  const handleFileUpload = async (answerId: string, file: File) => {
    try {
      setUploadingFor(answerId);

      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch(`/api/admin/parliamentary-answers/${answerId}/upload-pdf`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      toast({
        title: "Upload Successful",
        description: `PDF uploaded: ${result.originalFilename} (${(result.fileSizeBytes / 1024 / 1024).toFixed(2)} MB)`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/parliamentary-answers/stored"] });
      refetchAnswers();
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload PDF",
        variant: "destructive",
      });
    } finally {
      setUploadingFor(null);
    }
  };

  // Download PDF from URL
  const downloadPdfFromUrl = async (answerId: string, pdfUrl: string) => {
    try {
      setUploadingFor(answerId);

      const res = await apiRequest("POST", `/api/admin/parliamentary-answers/${answerId}/download-pdf`, {
        body: JSON.stringify({ pdfUrl }),
      });

      const result = await res.json();

      toast({
        title: "Download Successful",
        description: `PDF downloaded: ${result.originalFilename} (${(result.fileSizeBytes / 1024 / 1024).toFixed(2)} MB)`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/parliamentary-answers/stored"] });
      refetchAnswers();
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download PDF from URL",
        variant: "destructive",
      });
    } finally {
      setUploadingFor(null);
    }
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes("answered") || statusLower.includes("dijawab")) {
      return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
    }
    if (statusLower.includes("pending") || statusLower.includes("menunggu")) {
      return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
    }
    return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!authStatus?.isAdmin) {
    return null;
  }

  const answersWithPdf = answers.filter(a => a.hasPdf).length;
  const answersWithUrl = answers.filter(a => a.fullTextUrl).length;

  return (
    <div className="min-h-screen bg-background">
      <Header onSearchClick={() => {}} />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">
            <MessageSquare className="inline-block w-8 h-8 mr-2 mb-1" />
            Parliamentary Answers Admin
          </h1>
          <p className="text-muted-foreground">
            Manage parliamentary oral answers and their PDF files
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Answers</CardDescription>
              <CardTitle className="text-3xl">{answers.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>With PDF Stored</CardDescription>
              <CardTitle className="text-3xl text-green-600">{answersWithPdf}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>With PDF URL</CardDescription>
              <CardTitle className="text-3xl text-blue-600">{answersWithUrl}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Missing PDFs</CardDescription>
              <CardTitle className="text-3xl text-orange-600">
                {answers.length - answersWithPdf}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Scrape New Answers</CardTitle>
              <CardDescription>
                Fetch latest oral answers from Parliament website
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => scrapeMutation.mutate()}
                disabled={scrapeMutation.isPending}
                className="w-full"
              >
                {scrapeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scraping...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Scrape Answers
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Download All PDFs</CardTitle>
              <CardDescription>
                Download PDFs for all answers with PDF URLs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => downloadAllPdfsMutation.mutate()}
                disabled={downloadAllPdfsMutation.isPending}
                className="w-full"
              >
                {downloadAllPdfsMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download All PDFs
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Full Sync</CardTitle>
              <CardDescription>
                Scrape all historical sessions and download PDFs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => fullSyncMutation.mutate()}
                disabled={fullSyncMutation.isPending}
                variant="default"
                className="w-full"
              >
                {fullSyncMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    Full Sync
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Answers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Parliamentary Answers</CardTitle>
            <CardDescription>
              All parliamentary oral answers in the database
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {answersLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                Loading answers...
              </div>
            ) : answers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No answers in database. Click "Scrape Answers" to fetch data.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Title</TableHead>
                      <TableHead className="w-[120px]">Date</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-[80px] text-center">PDF</TableHead>
                      <TableHead className="w-[200px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {answers.map((answer) => (
                      <TableRow key={answer.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{answer.title}</p>
                          {answer.questionerName && (
                            <p className="text-xs text-muted-foreground mt-1">
                              By: {answer.questionerName}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {answer.dateAsked || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusColor(answer.status)}>
                            {answer.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {answer.hasPdf ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-orange-600 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {answer.hasPdf ? (
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                              >
                                <a
                                  href={`/api/parliamentary-answers/${answer.id}/pdf`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <File className="w-4 h-4 mr-1" />
                                  View
                                </a>
                              </Button>
                            ) : (
                              <>
                                {answer.fullTextUrl && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => downloadPdfFromUrl(answer.id, answer.fullTextUrl!)}
                                    disabled={uploadingFor === answer.id}
                                  >
                                    {uploadingFor === answer.id ? (
                                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    ) : (
                                      <Download className="w-4 h-4 mr-1" />
                                    )}
                                    Download
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedAnswerId(answer.id);
                                    fileInputRef.current?.click();
                                  }}
                                  disabled={uploadingFor === answer.id}
                                >
                                  {uploadingFor === answer.id ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  ) : (
                                    <Upload className="w-4 h-4 mr-1" />
                                  )}
                                  Upload
                                </Button>
                              </>
                            )}
                            {answer.fullTextUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                              >
                                <a
                                  href={answer.fullTextUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hidden file input for manual uploads */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && selectedAnswerId) {
              handleFileUpload(selectedAnswerId, file);
            }
            // Reset input
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }}
        />
      </main>
    </div>
  );
}
