/**
 * Copyright by Calmic Sdn Bhd
 *
 * Page to display Malaysian Parliament bills with impact analysis for Malaysians
 * Styled to match the Hansard page format
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/i18n/LanguageContext";
import { Header } from "@/components/Header";
import { SearchDialog } from "@/components/SearchDialog";
import { PageMeta } from "@/components/PageMeta";
import { BillImpactDialog } from "@/components/BillImpactDialog";
import { GrokReviewDialog } from "@/components/GrokReviewDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Search,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Download,
  Calendar,
  Sparkles,
  CheckCircle,
  Filter,
  Brain,
} from "lucide-react";
import { format } from "date-fns";

interface Bill {
  id: string;
  title: string;
  billNumber?: string | null;
  introductionDate?: string | null;
  status: string;
  fullTextUrl?: string | null;
  hasPdf?: boolean;
  impact?: {
    summary?: string;
    impactType?: string;
  } | null;
}

interface BillsResponse {
  bills: Bill[];
  scrapedAt: string;
  sourceUrl: string;
  error?: string;
  fromDatabase?: boolean;
}

export default function Bills() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: billsData, isLoading, error, refetch, isFetching } = useQuery<BillsResponse>({
    queryKey: ["/api/bills"],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  const bills = billsData?.bills || [];
  const scrapedAt = billsData?.scrapedAt;
  const sourceUrl = billsData?.sourceUrl;
  const scrapeError = billsData?.error;
  const fromDatabase = billsData?.fromDatabase;

  const filteredBills = bills.filter((bill) => {
    // Exclude incomplete/bad scraped data (no bill number and generic title)
    if (!bill.billNumber && bill.title.trim().toLowerCase() === "bill") return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        bill.title.toLowerCase().includes(query) ||
        (bill.billNumber && bill.billNumber.toLowerCase().includes(query)) ||
        bill.status.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    if (statusFilter !== "all") {
      const statusLower = bill.status.toLowerCase();
      if (statusFilter === "passed" && !statusLower.includes("passed") && !statusLower.includes("lulus")) return false;
      if (statusFilter === "pending" && !statusLower.includes("pending") && !statusLower.includes("menunggu") && !statusLower.includes("bacaan")) return false;
      if (statusFilter === "rejected" && !statusLower.includes("rejected") && !statusLower.includes("ditolak")) return false;
    }

    if (startDate || endDate) {
      const introDate = bill.introductionDate;
      if (introDate) {
        const dateMatch = introDate.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (dateMatch) {
          const billDate = new Date(`${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`);
          if (startDate && billDate < new Date(startDate)) return false;
          if (endDate && billDate > new Date(endDate)) return false;
        }
      }
    }

    return true;
  }).sort((a, b) => {
    // Sort unpassed bills first, then by bill number
    const isPassed = (status: string) => {
      const s = status.toLowerCase();
      return s.includes("passed") || s.includes("lulus");
    };

    const aPassed = isPassed(a.status);
    const bPassed = isPassed(b.status);
    if (aPassed !== bPassed) {
      return aPassed ? 1 : -1;
    }

    // Within each group, sort by year (ascending) then number (ascending)
    const parseBillNumber = (billNumber: string | null | undefined): { num: number, year: number } => {
      if (!billNumber) return { num: Infinity, year: Infinity };
      const match = billNumber.match(/(\d+)\/(\d{4})/);
      if (!match) return { num: Infinity, year: Infinity };
      return { num: parseInt(match[1], 10), year: parseInt(match[2], 10) };
    };

    const aData = parseBillNumber(a.billNumber);
    const bData = parseBillNumber(b.billNumber);

    if (aData.year !== bData.year) {
      return aData.year - bData.year;
    }
    return aData.num - bData.num;
  });

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes("passed") || statusLower.includes("lulus")) {
      return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
    }
    if (statusLower.includes("pending") || statusLower.includes("menunggu") || statusLower.includes("bacaan")) {
      return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
    }
    if (statusLower.includes("rejected") || statusLower.includes("ditolak")) {
      return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
    }
    if (statusLower.includes("withdrawn") || statusLower.includes("ditarik")) {
      return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
    }
    return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
  };

  // Extract the main status label from the full status string
  const getStatusLabel = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.startsWith("lulus")) return "Lulus";
    if (statusLower.includes("passed")) return "Passed";
    if (statusLower.includes("pending") || statusLower.includes("menunggu")) return "Pending";
    if (statusLower.includes("rejected") || statusLower.includes("ditolak")) return "Rejected";
    if (statusLower.includes("withdrawn") || statusLower.includes("ditarik")) return "Withdrawn";
    if (statusLower.includes("bacaan")) return "Dalam Proses";
    // If status is short, use it as-is
    if (status.length <= 30) return status;
    return "In Progress";
  };

  // Parse the detailed status information into structured fields
  const parseStatusDetails = (status: string) => {
    const details: { label: string; value: string }[] = [];

    // Extract Bacaan Pertama (First Reading)
    const bacaanPertamaMatch = status.match(/Bacaan Pertama Pada\s*:\s*(\d{2}\/\d{2}\/\d{4})/i);
    if (bacaanPertamaMatch) {
      details.push({ label: "Bacaan Pertama", value: bacaanPertamaMatch[1] });
    }

    // Extract Bacaan Kedua (Second Reading)
    const bacaanKeduaMatch = status.match(/Bacaan Kedua Pada\s*:\s*(\d{2}\/\d{2}\/\d{4})/i);
    if (bacaanKeduaMatch) {
      details.push({ label: "Bacaan Kedua", value: bacaanKeduaMatch[1] });
    }

    // Extract Diluluskan (Passed) date
    const diluluskanMatch = status.match(/Diluluskan Pada\s*:\s*(\d{2}\/\d{2}\/\d{4})/i);
    if (diluluskanMatch) {
      details.push({ label: "Diluluskan", value: diluluskanMatch[1] });
    }

    // Extract Dibentang Oleh (Tabled by) - get the first occurrence
    const dibentangMatch = status.match(/Dibentang Oleh\s*:\s*([^D]+?)(?=Diluluskan|Bacaan|Tutup|$)/i);
    if (dibentangMatch) {
      details.push({ label: "Dibentang Oleh", value: dibentangMatch[1].trim() });
    }

    return details;
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setStartDate("");
    setEndDate("");
  };

  return (
    <>
      <PageMeta
        title="Parliamentary Bills"
        description="Browse and track Malaysian Parliament bills. View bill status, impact analysis, and legislative proposals in the Dewan Rakyat."
        keywords="Parliamentary bills, legislation, laws, Malaysian Parliament, legislative proposals, bill status"
        url="https://myparliament.calmic.com.my/bills"
      />
      <Header onSearchClick={() => setSearchDialogOpen(true)} />
      <SearchDialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen} />

      <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileText className="w-8 h-8" />
              {t('nav.bills')} - Dewan Rakyat
            </h1>
            <p className="text-muted-foreground mt-2">
              Live data from the Malaysian Parliament - Rang Undang-Undang Dewan Rakyat
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
              data-testid="button-refresh-bills"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <a 
              href={sourceUrl || "https://www.parlimen.gov.my/bills-dewan-rakyat.html?uweb=dr&"} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button variant="outline" data-testid="button-view-source">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Official Source
              </Button>
            </a>
          </div>
        </div>

        {(error || scrapeError) && (
          <Card className="border-yellow-500/50 bg-yellow-500/5">
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
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search & Filter Bills
            </CardTitle>
            <CardDescription>
              Search by title, bill number, or filter by status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Input
                  data-testid="input-bill-search"
                  placeholder="Search bills by title or number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="passed">Passed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  data-testid="input-start-date"
                  type="date"
                  placeholder="Start Date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
                <Input
                  data-testid="input-end-date"
                  type="date"
                  placeholder="End Date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <Button
                data-testid="button-clear-filters"
                variant="outline"
                onClick={clearFilters}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {!isLoading && (
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">
                {filteredBills.length} Bills Found
              </h2>
              {scrapedAt && (
                <p className="text-sm text-muted-foreground">
                  Last updated: {format(new Date(scrapedAt), 'dd MMM yyyy, HH:mm')}
                  {fromDatabase && ' (cached)'}
                </p>
              )}
            </div>
          )}

          {isLoading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading bills from Parliament website...</p>
              </CardContent>
            </Card>
          ) : filteredBills.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <h3 className="font-semibold text-lg mb-2">No Bills Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || statusFilter !== "all"
                    ? 'Try adjusting your search or filters.'
                    : 'No bills data available.'}
                </p>
                {!searchQuery && statusFilter === "all" && (
                  <a 
                    href="https://www.parlimen.gov.my/bills-dewan-rakyat.html?uweb=dr&" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    View bills on the official Parliament website
                  </a>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredBills.map((bill) => (
              <Card key={bill.id} data-testid={`card-bill-${bill.id}`} className="hover-elevate">
                <CardHeader>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <FileText className="w-5 h-5 shrink-0" />
                        <span className="font-mono">{bill.billNumber || 'Bill'}</span>
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {bill.title}
                      </CardDescription>
                      <div className="flex items-center gap-4 mt-3 flex-wrap">
                        {bill.introductionDate && (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            {bill.introductionDate}
                          </span>
                        )}
                        <Badge variant="outline" className={getStatusColor(bill.status)}>
                          {getStatusLabel(bill.status)}
                        </Badge>
                      </div>
                      {/* Display parsed status details if available */}
                      {parseStatusDetails(bill.status).length > 0 && (
                        <div className={`mt-3 p-3 rounded-md text-sm ${getStatusColor(bill.status)}`}>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                            {parseStatusDetails(bill.status).map((detail, index) => (
                              <div key={index}>
                                <span className="font-medium">{detail.label}:</span>{" "}
                                <span>{detail.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {bill.hasPdf && (
                        <Button
                          data-testid={`button-pdf-${bill.id}`}
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a href={`/api/bills/${bill.id}/pdf`} target="_blank" rel="noopener noreferrer">
                            <Download className="w-4 h-4 mr-2" />
                            PDF
                          </a>
                        </Button>
                      )}
                      {bill.fullTextUrl && (
                        <Button
                          data-testid={`button-external-${bill.id}`}
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a href={bill.fullTextUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Source
                          </a>
                        </Button>
                      )}
                      <BillImpactDialog
                        bill={bill as any}
                        trigger={
                          <Button
                            data-testid={`button-impact-${bill.id}`}
                            variant={bill.impact ? "default" : "outline"}
                            size="sm"
                            className="gap-2"
                          >
                            <Sparkles className="w-4 h-4" />
                            Impact
                            {bill.impact && (
                              <CheckCircle className="w-3.5 h-3.5 text-green-300" />
                            )}
                          </Button>
                        }
                      />
                      <GrokReviewDialog
                        bill={bill as any}
                        trigger={
                          <Button
                            data-testid={`button-grok-review-${bill.id}`}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            disabled={!bill.hasPdf}
                          >
                            <Brain className="w-4 h-4" />
                            Review
                          </Button>
                        }
                      />
                    </div>
                  </div>
                </CardHeader>
                {bill.impact?.summary && (
                  <CardContent className="pt-0">
                    <div className="bg-muted/50 rounded-md p-3 mt-2">
                      <p className="text-sm text-muted-foreground flex items-start gap-2">
                        <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{bill.impact.summary}</span>
                      </p>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>

        <div className="text-center text-sm text-muted-foreground pt-4">
          <p>
            Data sourced from{' '}
            <a 
              href="https://www.parlimen.gov.my/bills-dewan-rakyat.html?uweb=dr&"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              parlimen.gov.my
            </a>
            {fromDatabase && ' (stored in database)'}
          </p>
        </div>
      </div>
    </>
  );
}
