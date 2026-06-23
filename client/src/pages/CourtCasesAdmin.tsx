/**
 * Court Cases Admin Page
 * Manage court cases and review scraped news articles
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Loader2, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Scale, 
  Plus, 
  Edit,
  Trash2,
  ExternalLink,
  Clock,
  AlertTriangle,
  Search
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { CourtCase, Mp } from "@shared/schema";

interface NewsArticle {
  id: string;
  sourceUrl: string;
  sourceName: string;
  headline: string;
  content: string;
  publishedDate: string | null;
  extractedData: {
    mpName?: string;
    mpId?: string;
    caseNumber?: string;
    title?: string;
    courtLevel?: string;
    status?: string;
    charges?: string;
    outcome?: string;
    filingDate?: string;
  } | null;
  status: string;
  scrapedAt: string;
}

interface ScraperStatus {
  isRunning: boolean;
  lastRunAt: string | null;
  lastRunResult: {
    articlesScraped: number;
    articlesWithData: number;
  } | null;
}

interface MpListItem {
  id: string;
  name: string;
  constituency: string;
  party: string;
}

export default function CourtCasesAdmin() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<CourtCase | null>(null);
  const [manualSearchText, setManualSearchText] = useState("");
  
  // Form state for court case
  const [formData, setFormData] = useState({
    mpId: "",
    caseNumber: "",
    title: "",
    courtLevel: "High Court",
    status: "Ongoing",
    charges: "",
    filingDate: "",
    outcome: "",
    documentLinks: [] as string[],
  });

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

  // Fetch MPs list for dropdown
  const { data: mpsList } = useQuery<MpListItem[]>({
    queryKey: ["/api/admin/mps-list"],
    enabled: authStatus?.isAdmin === true,
  });

  // Fetch scraper status
  const { data: scraperStatus, refetch: refetchStatus } = useQuery<ScraperStatus>({
    queryKey: ["/api/admin/court-case-scraper/status"],
    enabled: authStatus?.isAdmin === true,
    refetchInterval: 5000,
  });

  // Fetch pending articles
  const { data: pendingArticles, isLoading: articlesLoading, refetch: refetchArticles } = useQuery<NewsArticle[]>({
    queryKey: ["/api/admin/court-case-news"],
    enabled: authStatus?.isAdmin === true,
  });

  // Fetch all court cases
  const { data: courtCases, isLoading: casesLoading, refetch: refetchCases } = useQuery<CourtCase[]>({
    queryKey: ["/api/court-cases"],
    enabled: authStatus?.isAdmin === true,
  });

  // Run scraper mutation
  const runScraperMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/court-case-scraper/run");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Scraper Completed",
        description: `Scraped ${data.articlesScraped} articles, ${data.articlesWithData} with extracted data`,
      });
      refetchArticles();
      refetchStatus();
    },
    onError: (error: any) => {
      toast({
        title: "Scraper Failed",
        description: error.message || "Failed to run scraper",
        variant: "destructive",
      });
    },
  });

  // Manual search mutation
  const manualSearchMutation = useMutation({
    mutationFn: async (searchText: string) => {
      const res = await apiRequest("POST", "/api/admin/court-case-scraper/manual-search", { searchText });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Manual Search Completed",
        description: `Found ${data.articlesScraped} articles, ${data.articlesWithData} with extracted MP data`,
      });
      setManualSearchText("");
      refetchArticles();
      refetchStatus();
    },
    onError: (error: any) => {
      toast({
        title: "Search Failed",
        description: error.message || "Failed to run manual search",
        variant: "destructive",
      });
    },
  });

  const handleManualSearch = () => {
    if (manualSearchText.trim().length >= 3) {
      manualSearchMutation.mutate(manualSearchText.trim());
    }
  };

  // Approve article mutation
  const approveArticleMutation = useMutation({
    mutationFn: async ({ articleId, courtCaseData }: { articleId: string; courtCaseData: any }) => {
      const res = await apiRequest("POST", `/api/admin/court-case-news/${articleId}/approve`, courtCaseData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Article Approved",
        description: "Court case has been created/updated successfully",
      });
      setSelectedArticle(null);
      refetchArticles();
      refetchCases();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Approve",
        description: error.message || "Failed to approve article",
        variant: "destructive",
      });
    },
  });

  // Reject article mutation
  const rejectArticleMutation = useMutation({
    mutationFn: async (articleId: string) => {
      const res = await apiRequest("POST", `/api/admin/court-case-news/${articleId}/reject`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Article Rejected",
        description: "Article has been marked as rejected",
      });
      setSelectedArticle(null);
      refetchArticles();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Reject",
        description: error.message || "Failed to reject article",
        variant: "destructive",
      });
    },
  });

  // Create court case mutation
  const createCaseMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/court-cases", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Court Case Created",
        description: "New court case has been added successfully",
      });
      setIsCreateDialogOpen(false);
      resetForm();
      refetchCases();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create",
        description: error.message || "Failed to create court case",
        variant: "destructive",
      });
    },
  });

  // Update court case mutation
  const updateCaseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/court-cases/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Court Case Updated",
        description: "Court case has been updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingCase(null);
      resetForm();
      refetchCases();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update",
        description: error.message || "Failed to update court case",
        variant: "destructive",
      });
    },
  });

  // Delete court case mutation
  const deleteCaseMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/court-cases/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Court Case Deleted",
        description: "Court case has been removed",
      });
      refetchCases();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Delete",
        description: error.message || "Failed to delete court case",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      mpId: "",
      caseNumber: "",
      title: "",
      courtLevel: "High Court",
      status: "Ongoing",
      charges: "",
      filingDate: "",
      outcome: "",
      documentLinks: [],
    });
  };

  const handleEditCase = (courtCase: CourtCase) => {
    setEditingCase(courtCase);
    setFormData({
      mpId: courtCase.mpId,
      caseNumber: courtCase.caseNumber,
      title: courtCase.title,
      courtLevel: courtCase.courtLevel,
      status: courtCase.status,
      charges: courtCase.charges,
      filingDate: courtCase.filingDate ? format(new Date(courtCase.filingDate), "yyyy-MM-dd") : "",
      outcome: courtCase.outcome || "",
      documentLinks: courtCase.documentLinks || [],
    });
    setIsEditDialogOpen(true);
  };

  const handleApproveArticle = () => {
    if (!selectedArticle) return;
    
    approveArticleMutation.mutate({
      articleId: selectedArticle.id,
      courtCaseData: {
        ...formData,
        filingDate: formData.filingDate ? new Date(formData.filingDate).toISOString() : "",
        documentLinks: [selectedArticle.sourceUrl, ...formData.documentLinks],
      },
    });
  };

  const handleSubmitCase = () => {
    if (editingCase) {
      updateCaseMutation.mutate({
        id: editingCase.id,
        data: {
          ...formData,
          filingDate: formData.filingDate ? new Date(formData.filingDate).toISOString() : undefined,
        },
      });
    } else {
      createCaseMutation.mutate({
        ...formData,
        filingDate: new Date(formData.filingDate).toISOString(),
      });
    }
  };

  // Helper to normalize date strings to YYYY-MM-DD format for HTML date input
  const normalizeDate = (dateStr: string | undefined | null): string => {
    if (!dateStr) return "";
    try {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return format(parsed, "yyyy-MM-dd");
      }
    } catch {}
    return "";
  };

  const openArticleReview = (article: NewsArticle) => {
    setSelectedArticle(article);
    // Pre-fill form with extracted data
    if (article.extractedData) {
      setFormData({
        mpId: article.extractedData.mpId || "",
        caseNumber: article.extractedData.caseNumber || "",
        title: article.extractedData.title || article.headline,
        courtLevel: article.extractedData.courtLevel || "High Court",
        status: article.extractedData.status || "Ongoing",
        charges: article.extractedData.charges || "",
        filingDate: normalizeDate(article.extractedData.filingDate),
        outcome: article.extractedData.outcome || "",
        documentLinks: [],
      });
    } else {
      setFormData({
        mpId: "",
        caseNumber: "",
        title: article.headline,
        courtLevel: "High Court",
        status: "Ongoing",
        charges: "",
        filingDate: "",
        outcome: "",
        documentLinks: [],
      });
    }
  };

  const getMpName = (mpId: string) => {
    const mp = mpsList?.find(m => m.id === mpId);
    return mp ? `${mp.name} (${mp.constituency})` : mpId;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!authStatus?.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="Court Cases Admin"
        description="Admin page for managing court cases."
        keywords="admin, court cases"
        url="https://myparliament.calmic.com.my/admin/court-cases"
      />
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Court Cases Admin</h1>
            <p className="text-muted-foreground">Manage court cases and review scraped news</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setIsCreateDialogOpen(true);
              }}
              data-testid="button-add-case"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Court Case
            </Button>
            <Button
              onClick={() => runScraperMutation.mutate()}
              disabled={runScraperMutation.isPending || scraperStatus?.isRunning}
              data-testid="button-run-scraper"
            >
              {runScraperMutation.isPending || scraperStatus?.isRunning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Run News Scraper
            </Button>
          </div>
        </div>

        {/* Scraper Status */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Scraper Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6 flex-wrap text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={scraperStatus?.isRunning ? "default" : "secondary"}>
                  {scraperStatus?.isRunning ? "Running" : "Idle"}
                </Badge>
              </div>
              {scraperStatus?.lastRunAt && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Last Run:</span>
                  <span>{format(new Date(scraperStatus.lastRunAt), "PPp")}</span>
                </div>
              )}
              {scraperStatus?.lastRunResult && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Last Result:</span>
                  <span>{scraperStatus.lastRunResult.articlesScraped} articles, {scraperStatus.lastRunResult.articlesWithData} with data</span>
                </div>
              )}
            </div>
            
            {/* Manual Search */}
            <div className="border-t pt-4">
              <Label className="text-sm font-medium mb-2 block">Manual Search</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Search for specific court cases by name, keywords, or phrases (e.g., "Anwar Ibrahim defamation", "Najib corruption trial")
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter search terms (min 3 characters)"
                  value={manualSearchText}
                  onChange={(e) => setManualSearchText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleManualSearch();
                    }
                  }}
                  disabled={manualSearchMutation.isPending || scraperStatus?.isRunning}
                  className="flex-1"
                  data-testid="input-manual-search"
                />
                <Button
                  onClick={handleManualSearch}
                  disabled={manualSearchMutation.isPending || scraperStatus?.isRunning || manualSearchText.trim().length < 3}
                  data-testid="button-manual-search"
                >
                  {manualSearchMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Search News
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="review" className="space-y-4">
          <TabsList>
            <TabsTrigger value="review" data-testid="tab-review">
              <FileText className="h-4 w-4 mr-2" />
              Review Queue
              {pendingArticles && pendingArticles.length > 0 && (
                <Badge variant="secondary" className="ml-2">{pendingArticles.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="cases" data-testid="tab-cases">
              <Scale className="h-4 w-4 mr-2" />
              All Court Cases
              {courtCases && (
                <Badge variant="secondary" className="ml-2">{courtCases.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Review Queue Tab */}
          <TabsContent value="review">
            <Card>
              <CardHeader>
                <CardTitle>News Articles for Review</CardTitle>
                <CardDescription>
                  Review scraped news articles and approve them to create court cases
                </CardDescription>
              </CardHeader>
              <CardContent>
                {articlesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : !pendingArticles || pendingArticles.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pending articles to review</p>
                    <p className="text-sm mt-2">Run the scraper to fetch new articles</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingArticles.map((article) => (
                      <Card key={article.id} className="hover-elevate cursor-pointer" onClick={() => openArticleReview(article)}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Badge variant={article.status === "needs_review" ? "default" : "secondary"}>
                                  {article.status}
                                </Badge>
                                <Badge variant="outline">{article.sourceName}</Badge>
                                {article.extractedData?.mpName && (
                                  <Badge variant="secondary">
                                    {article.extractedData.mpName}
                                  </Badge>
                                )}
                              </div>
                              <h3 className="font-medium truncate" data-testid={`text-article-headline-${article.id}`}>
                                {article.headline}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {article.content.substring(0, 200)}...
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>Scraped: {format(new Date(article.scrapedAt), "PPp")}</span>
                                {article.publishedDate && (
                                  <span>Published: {format(new Date(article.publishedDate), "PP")}</span>
                                )}
                              </div>
                            </div>
                            <Button variant="outline" size="icon" asChild onClick={(e) => e.stopPropagation()}>
                              <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Cases Tab */}
          <TabsContent value="cases">
            <Card>
              <CardHeader>
                <CardTitle>All Court Cases</CardTitle>
                <CardDescription>
                  Manage existing court cases
                </CardDescription>
              </CardHeader>
              <CardContent>
                {casesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : !courtCases || courtCases.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Scale className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No court cases found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {courtCases.map((courtCase) => (
                      <Card key={courtCase.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Badge variant={
                                  courtCase.status === "convicted" ? "destructive" :
                                  courtCase.status === "charged" ? "default" :
                                  courtCase.status === "appeal_pending" ? "default" :
                                  courtCase.status === "under_investigation" ? "secondary" :
                                  "outline"
                                }>
                                  {courtCase.status.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                </Badge>
                                <Badge variant="outline">{courtCase.courtLevel}</Badge>
                                <span className="text-xs text-muted-foreground">{courtCase.caseNumber}</span>
                              </div>
                              <h3 className="font-medium" data-testid={`text-case-title-${courtCase.id}`}>
                                {courtCase.title}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                MP: {getMpName(courtCase.mpId)}
                              </p>
                              <p className="text-sm mt-2 line-clamp-2">
                                {courtCase.charges}
                              </p>
                              {courtCase.outcome && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  Outcome: {courtCase.outcome}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                onClick={() => handleEditCase(courtCase)}
                                data-testid={`button-edit-case-${courtCase.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="icon"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this court case?")) {
                                    deleteCaseMutation.mutate(courtCase.id);
                                  }
                                }}
                                data-testid={`button-delete-case-${courtCase.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Article Review Dialog */}
        <Dialog open={!!selectedArticle} onOpenChange={(open) => !open && setSelectedArticle(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review Article</DialogTitle>
              <DialogDescription>
                Review the extracted data and approve or reject the article
              </DialogDescription>
            </DialogHeader>
            
            {selectedArticle && (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-md">
                  <h4 className="font-medium mb-2">{selectedArticle.headline}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Source: {selectedArticle.sourceName}
                  </p>
                  <p className="text-sm line-clamp-4">{selectedArticle.content.substring(0, 500)}...</p>
                  <a 
                    href={selectedArticle.sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-2"
                  >
                    Read full article <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="mpId">MP</Label>
                    <Select value={formData.mpId} onValueChange={(v) => setFormData(prev => ({ ...prev, mpId: v }))}>
                      <SelectTrigger data-testid="select-mp">
                        <SelectValue placeholder="Select MP" />
                      </SelectTrigger>
                      <SelectContent>
                        {mpsList?.slice().sort((a, b) => a.name.localeCompare(b.name)).map((mp) => (
                          <SelectItem key={mp.id} value={mp.id}>
                            {mp.name} ({mp.constituency}) - {mp.party}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="caseNumber">Case Number</Label>
                      <Input
                        id="caseNumber"
                        value={formData.caseNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, caseNumber: e.target.value }))}
                        placeholder="e.g., PP-45-272-11/2018"
                        data-testid="input-case-number"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="filingDate">Filing Date</Label>
                      <Input
                        id="filingDate"
                        type="date"
                        value={formData.filingDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, filingDate: e.target.value }))}
                        data-testid="input-filing-date"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="title">Case Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Case title"
                      data-testid="input-case-title"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="courtLevel">Court Level</Label>
                      <Select value={formData.courtLevel} onValueChange={(v) => setFormData(prev => ({ ...prev, courtLevel: v }))}>
                        <SelectTrigger data-testid="select-court-level">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sessions Court">Sessions Court</SelectItem>
                          <SelectItem value="High Court">High Court</SelectItem>
                          <SelectItem value="Court of Appeal">Court of Appeal</SelectItem>
                          <SelectItem value="Federal Court">Federal Court</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="under_investigation">Under Investigation</SelectItem>
                          <SelectItem value="charged">Charged</SelectItem>
                          <SelectItem value="convicted">Convicted</SelectItem>
                          <SelectItem value="acquitted">Acquitted</SelectItem>
                          <SelectItem value="withdrawn">Withdrawn</SelectItem>
                          <SelectItem value="appeal_pending">Appeal Pending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="charges">Charges</Label>
                    <Textarea
                      id="charges"
                      value={formData.charges}
                      onChange={(e) => setFormData(prev => ({ ...prev, charges: e.target.value }))}
                      placeholder="Summary of charges"
                      rows={3}
                      data-testid="textarea-charges"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="outcome">Outcome (if completed)</Label>
                    <Textarea
                      id="outcome"
                      value={formData.outcome}
                      onChange={(e) => setFormData(prev => ({ ...prev, outcome: e.target.value }))}
                      placeholder="Case outcome"
                      rows={2}
                      data-testid="textarea-outcome"
                    />
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => rejectArticleMutation.mutate(selectedArticle.id)}
                    disabled={rejectArticleMutation.isPending}
                  >
                    {rejectArticleMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Reject
                  </Button>
                  <Button
                    onClick={handleApproveArticle}
                    disabled={approveArticleMutation.isPending || !formData.mpId || !formData.caseNumber || !formData.title || !formData.charges || !formData.filingDate}
                  >
                    {approveArticleMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Approve & Create Case
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create/Edit Court Case Dialog */}
        <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            setEditingCase(null);
            resetForm();
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCase ? "Edit Court Case" : "Add Court Case"}</DialogTitle>
              <DialogDescription>
                {editingCase ? "Update the court case details" : "Manually add a new court case"}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="mpId">MP</Label>
                <Select value={formData.mpId} onValueChange={(v) => setFormData(prev => ({ ...prev, mpId: v }))}>
                  <SelectTrigger data-testid="select-mp-dialog">
                    <SelectValue placeholder="Select MP" />
                  </SelectTrigger>
                  <SelectContent>
                    {mpsList?.slice().sort((a, b) => a.name.localeCompare(b.name)).map((mp) => (
                      <SelectItem key={mp.id} value={mp.id}>
                        {mp.name} ({mp.constituency}) - {mp.party}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="caseNumber2">Case Number</Label>
                  <Input
                    id="caseNumber2"
                    value={formData.caseNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, caseNumber: e.target.value }))}
                    placeholder="e.g., PP-45-272-11/2018"
                    data-testid="input-case-number-dialog"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="filingDate2">Filing Date</Label>
                  <Input
                    id="filingDate2"
                    type="date"
                    value={formData.filingDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, filingDate: e.target.value }))}
                    data-testid="input-filing-date-dialog"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="title2">Case Title</Label>
                <Input
                  id="title2"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Case title"
                  data-testid="input-case-title-dialog"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="courtLevel2">Court Level</Label>
                  <Select value={formData.courtLevel} onValueChange={(v) => setFormData(prev => ({ ...prev, courtLevel: v }))}>
                    <SelectTrigger data-testid="select-court-level-dialog">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sessions Court">Sessions Court</SelectItem>
                      <SelectItem value="High Court">High Court</SelectItem>
                      <SelectItem value="Court of Appeal">Court of Appeal</SelectItem>
                      <SelectItem value="Federal Court">Federal Court</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status2">Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                    <SelectTrigger data-testid="select-status-dialog">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="under_investigation">Under Investigation</SelectItem>
                      <SelectItem value="charged">Charged</SelectItem>
                      <SelectItem value="convicted">Convicted</SelectItem>
                      <SelectItem value="acquitted">Acquitted</SelectItem>
                      <SelectItem value="withdrawn">Withdrawn</SelectItem>
                      <SelectItem value="appeal_pending">Appeal Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="charges2">Charges</Label>
                <Textarea
                  id="charges2"
                  value={formData.charges}
                  onChange={(e) => setFormData(prev => ({ ...prev, charges: e.target.value }))}
                  placeholder="Summary of charges"
                  rows={3}
                  data-testid="textarea-charges-dialog"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="outcome2">Outcome (if completed)</Label>
                <Textarea
                  id="outcome2"
                  value={formData.outcome}
                  onChange={(e) => setFormData(prev => ({ ...prev, outcome: e.target.value }))}
                  placeholder="Case outcome"
                  rows={2}
                  data-testid="textarea-outcome-dialog"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setIsEditDialogOpen(false);
                  setEditingCase(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitCase}
                disabled={createCaseMutation.isPending || updateCaseMutation.isPending || !formData.mpId || !formData.caseNumber || !formData.title || !formData.charges || !formData.filingDate}
              >
                {(createCaseMutation.isPending || updateCaseMutation.isPending) ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {editingCase ? "Update Case" : "Create Case"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
