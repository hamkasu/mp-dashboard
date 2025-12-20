/**
 * Copyright by Calmic Sdn Bhd
 *
 * Page to display Malaysian Parliament oral answers (jawapan lisan) scraped live from parlimen.gov.my
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/i18n/LanguageContext";
import { Header } from "@/components/Header";
import { SearchDialog } from "@/components/SearchDialog";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MessageSquare, Search, ExternalLink, RefreshCw, AlertCircle, File } from "lucide-react";
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
  scrapedAt: string;
  sourceUrl: string;
  error?: string;
  fromDatabase?: boolean;
}

export default function ParliamentaryAnswers() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);

  const { data: answersData, isLoading, error, refetch, isFetching } = useQuery<AnswersResponse>({
    queryKey: ["/api/parliamentary-answers"],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
    retry: 2, // Retry failed requests twice before giving up
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
  });

  const answers = answersData?.answers || [];
  const scrapedAt = answersData?.scrapedAt;
  const sourceUrl = answersData?.sourceUrl;
  const scrapeError = answersData?.error;
  const fromDatabase = answersData?.fromDatabase;

  // Filter answers based on search query
  const filteredAnswers = answers.filter((answer) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      answer.title.toLowerCase().includes(query) ||
      (answer.questionNumber && answer.questionNumber.toLowerCase().includes(query)) ||
      (answer.questionerName && answer.questionerName.toLowerCase().includes(query)) ||
      (answer.answererMinistry && answer.answererMinistry.toLowerCase().includes(query)) ||
      answer.status.toLowerCase().includes(query)
    );
  });

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes("answered") || statusLower.includes("dijawab")) {
      return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
    }
    if (statusLower.includes("pending") || statusLower.includes("menunggu")) {
      return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
    }
    if (statusLower.includes("withdrawn") || statusLower.includes("ditarik")) {
      return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
    }
    return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
  };

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="Oral Answers"
        description="Browse oral answers (Jawapan Lisan) from Malaysian Parliament. Track ministerial responses to questions from MPs."
        keywords="oral answers, jawapan lisan, parliamentary answers, ministerial responses, Malaysian Parliament"
        url="https://myparliament.calmic.com.my/parliamentary-answers"
      />
      <Header onSearchClick={() => setSearchDialogOpen(true)} />

      <SearchDialog
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
      />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              <MessageSquare className="inline-block w-8 h-8 mr-2 mb-1" />
              Jawapan Lisan - Dewan Rakyat
            </h1>
            <p className="text-muted-foreground">
              Live data from the Malaysian Parliament - Parliamentary Oral Answers
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <a
              href={sourceUrl || "https://www.parlimen.gov.my/jawapan-lisan-dr.html?uweb=dr&"}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Official Source
              </Button>
            </a>
          </div>
        </div>

        {/* Error Alert */}
        {(error || scrapeError) && (
          <Card className="mb-6 border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-700 dark:text-yellow-400">
                    Unable to fetch live data
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {scrapeError || (error as Error)?.message || "Please try again later or visit the official source directly."}
                  </p>
                  <a
                    href="https://www.parlimen.gov.my/jawapan-lisan-dr.html?uweb=dr&"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline mt-2 inline-block"
                  >
                    Visit parlimen.gov.my directly →
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Oral Answers</CardDescription>
              <CardTitle className="text-3xl">{answers.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Last Updated</CardDescription>
              <CardTitle className="text-lg">
                {scrapedAt ? format(new Date(scrapedAt), 'dd MMM yyyy, HH:mm') : '-'}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Showing</CardDescription>
              <CardTitle className="text-3xl">{filteredAnswers.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by question number, title, questioner, ministry, or status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="mb-4 text-sm text-muted-foreground">
          Showing {filteredAnswers.length} oral answer{filteredAnswers.length !== 1 ? 's' : ''}
          {searchQuery && ` matching "${searchQuery}"`}
        </div>

        {/* Answers Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                Loading oral answers from Parliament website...
              </div>
            ) : filteredAnswers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {searchQuery ? (
                  'No oral answers found matching your search.'
                ) : answers.length === 0 ? (
                  <div>
                    <p className="mb-4">No oral answers data available.</p>
                    <a
                      href="https://www.parlimen.gov.my/jawapan-lisan-dr.html?uweb=dr&"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      View oral answers on the official Parliament website →
                    </a>
                  </div>
                ) : (
                  'No oral answers available.'
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Question No.</TableHead>
                      <TableHead className="min-w-[300px]">Title</TableHead>
                      <TableHead className="w-[150px]">Questioner</TableHead>
                      <TableHead className="w-[180px]">Ministry</TableHead>
                      <TableHead className="w-[120px]">Date</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="text-center w-[100px]">Documents</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAnswers.map((answer) => (
                      <TableRow key={answer.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-sm">
                          {answer.questionNumber || '-'}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{answer.title}</p>
                        </TableCell>
                        <TableCell className="text-sm">
                          {answer.questionerName || '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {answer.answererMinistry || answer.answererName || '-'}
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
                          <div className="flex justify-center gap-1">
                            {answer.hasPdf && (
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                title="View stored PDF"
                              >
                                <a
                                  href={`/api/parliamentary-answers/${answer.id}/pdf`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <File className="w-4 h-4 text-green-600" />
                                </a>
                              </Button>
                            )}
                            {answer.fullTextUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                title="View on Parliament website"
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
                            {!answer.hasPdf && !answer.fullTextUrl && (
                              <span className="text-muted-foreground">-</span>
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

        {/* Source attribution */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            Data sourced from{' '}
            <a
              href="https://www.parlimen.gov.my/jawapan-lisan-dr.html?uweb=dr&"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              parlimen.gov.my
            </a>
            {fromDatabase && ' (stored in database)'}
          </p>
        </div>
      </main>
    </div>
  );
}
