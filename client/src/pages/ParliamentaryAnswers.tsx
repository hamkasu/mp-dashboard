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
import { MessageSquare, Search, ExternalLink, RefreshCw, AlertCircle, File, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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

type SortColumn = 'questionNumber' | 'title' | 'questionerName' | 'answererMinistry' | 'dateAsked' | 'status';
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 20;

export default function ParliamentaryAnswers() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>('dateAsked');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);

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

  // Parse date string to Date object for proper sorting
  // Handles formats like: "2024-11-08", "5 NOVEMBER 2024", "17 OKTOBER 2024"
  const parseDate = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null;

    // Try ISO format first (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Date(dateStr);
    }

    // Map Malay month names to English
    const monthMap: Record<string, string> = {
      'JANUARI': 'JANUARY',
      'FEBRUARI': 'FEBRUARY',
      'MAC': 'MARCH',
      'APRIL': 'APRIL',
      'MEI': 'MAY',
      'JUN': 'JUNE',
      'JULAI': 'JULY',
      'OGOS': 'AUGUST',
      'SEPTEMBER': 'SEPTEMBER',
      'OKTOBER': 'OCTOBER',
      'NOVEMBER': 'NOVEMBER',
      'DISEMBER': 'DECEMBER',
    };

    // Try text format: "5 NOVEMBER 2024" or "17 OKTOBER 2024"
    const textMatch = dateStr.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/i);
    if (textMatch) {
      const day = parseInt(textMatch[1], 10);
      let month = textMatch[2].toUpperCase();
      const year = parseInt(textMatch[3], 10);

      // Convert Malay month to English if needed
      if (monthMap[month]) {
        month = monthMap[month];
      }

      const parsed = new Date(`${month} ${day}, ${year}`);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    // Fallback: try native Date parsing
    const fallback = new Date(dateStr);
    return isNaN(fallback.getTime()) ? null : fallback;
  };

  // Sort answers
  const sortedAnswers = [...filteredAnswers].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: string | null | undefined;
    let bValue: string | null | undefined;

    // Special handling for date column
    if (sortColumn === 'dateAsked') {
      const aDate = parseDate(a.dateAsked);
      const bDate = parseDate(b.dateAsked);

      // Handle null dates - push them to the end
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;

      const comparison = aDate.getTime() - bDate.getTime();
      return sortDirection === 'asc' ? comparison : -comparison;
    }

    switch (sortColumn) {
      case 'questionNumber':
        aValue = a.questionNumber;
        bValue = b.questionNumber;
        break;
      case 'title':
        aValue = a.title;
        bValue = b.title;
        break;
      case 'questionerName':
        aValue = a.questionerName;
        bValue = b.questionerName;
        break;
      case 'answererMinistry':
        aValue = a.answererMinistry || a.answererName;
        bValue = b.answererMinistry || b.answererName;
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      default:
        return 0;
    }

    // Handle null/undefined values - push them to the end
    if (!aValue && !bValue) return 0;
    if (!aValue) return 1;
    if (!bValue) return -1;

    const comparison = aValue.localeCompare(bValue);
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Pagination
  const totalPages = Math.ceil(sortedAnswers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedAnswers = sortedAnswers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset to page 1 when search query changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Handle column header click for sorting
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Get sort icon for column header
  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="w-4 h-4 ml-1" />
      : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('ellipsis');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }

      pages.push(totalPages);
    }

    return pages;
  };

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
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="mb-4 text-sm text-muted-foreground">
          Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, sortedAnswers.length)} of {sortedAnswers.length} oral answer{sortedAnswers.length !== 1 ? 's' : ''}
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
            ) : sortedAnswers.length === 0 ? (
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
                      <TableHead
                        className="w-[100px] cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort('questionNumber')}
                      >
                        <div className="flex items-center">
                          Question No.
                          {getSortIcon('questionNumber')}
                        </div>
                      </TableHead>
                      <TableHead
                        className="min-w-[300px] cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort('title')}
                      >
                        <div className="flex items-center">
                          Title
                          {getSortIcon('title')}
                        </div>
                      </TableHead>
                      <TableHead
                        className="w-[150px] cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort('questionerName')}
                      >
                        <div className="flex items-center">
                          Questioner
                          {getSortIcon('questionerName')}
                        </div>
                      </TableHead>
                      <TableHead
                        className="w-[180px] cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort('answererMinistry')}
                      >
                        <div className="flex items-center">
                          Ministry
                          {getSortIcon('answererMinistry')}
                        </div>
                      </TableHead>
                      <TableHead
                        className="w-[120px] cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort('dateAsked')}
                      >
                        <div className="flex items-center">
                          Date
                          {getSortIcon('dateAsked')}
                        </div>
                      </TableHead>
                      <TableHead
                        className="w-[100px] cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center">
                          Status
                          {getSortIcon('status')}
                        </div>
                      </TableHead>
                      <TableHead className="text-center w-[100px]">Documents</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAnswers.map((answer) => (
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
                                variant="outline"
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
                                variant="outline"
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) setCurrentPage(currentPage - 1);
                    }}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>

                {getPageNumbers().map((page, index) => (
                  <PaginationItem key={index}>
                    {page === 'ellipsis' ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        href="#"
                        isActive={currentPage === page}
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(page as number);
                        }}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                    }}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

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
