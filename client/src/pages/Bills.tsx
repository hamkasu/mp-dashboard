/**
 * Copyright by Calmic Sdn Bhd
 *
 * Page to display Malaysian Parliament bills scraped live from parlimen.gov.my
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/i18n/LanguageContext";
import { Header } from "@/components/Header";
import { SearchDialog } from "@/components/SearchDialog";
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
import { FileText, Search, ExternalLink, RefreshCw, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface Bill {
  id: string;
  title: string;
  billNumber?: string;
  introductionDate?: string;
  status: string;
  fullTextUrl?: string;
}

interface BillsResponse {
  bills: Bill[];
  scrapedAt: string;
  sourceUrl: string;
  error?: string;
}

export default function Bills() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);

  const { data: billsData, isLoading, error, refetch, isFetching } = useQuery<BillsResponse>({
    queryKey: ["/api/bills"],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  const bills = billsData?.bills || [];
  const scrapedAt = billsData?.scrapedAt;
  const sourceUrl = billsData?.sourceUrl;
  const scrapeError = billsData?.error;

  // Filter bills based on search query
  const filteredBills = bills.filter((bill) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      bill.title.toLowerCase().includes(query) ||
      (bill.billNumber && bill.billNumber.toLowerCase().includes(query)) ||
      bill.status.toLowerCase().includes(query)
    );
  });

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes("passed") || statusLower.includes("lulus")) {
      return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
    }
    if (statusLower.includes("pending") || statusLower.includes("menunggu")) {
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

  return (
    <div className="min-h-screen bg-background">
      <Header onSearchClick={() => setSearchDialogOpen(true)} />

      <SearchDialog
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
      />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              <FileText className="inline-block w-8 h-8 mr-2 mb-1" />
              {t('nav.bills')} - Dewan Rakyat
            </h1>
            <p className="text-muted-foreground">
              Live data from the Malaysian Parliament - Rang Undang-Undang Dewan Rakyat
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
              href={sourceUrl || "https://www.parlimen.gov.my/bills-dewan-rakyat.html?uweb=dr&"} 
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
                    href="https://www.parlimen.gov.my/bills-dewan-rakyat.html?uweb=dr&" 
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
              <CardDescription>Total Bills</CardDescription>
              <CardTitle className="text-3xl">{bills.length}</CardTitle>
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
              <CardTitle className="text-3xl">{filteredBills.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search bills by title, number, or status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="mb-4 text-sm text-muted-foreground">
          Showing {filteredBills.length} bill{filteredBills.length !== 1 ? 's' : ''}
          {searchQuery && ` matching "${searchQuery}"`}
        </div>

        {/* Bills Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                Loading bills from Parliament website...
              </div>
            ) : filteredBills.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {searchQuery ? (
                  'No bills found matching your search.'
                ) : bills.length === 0 ? (
                  <div>
                    <p className="mb-4">No bills data available.</p>
                    <a 
                      href="https://www.parlimen.gov.my/bills-dewan-rakyat.html?uweb=dr&" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      View bills on the official Parliament website →
                    </a>
                  </div>
                ) : (
                  'No bills available.'
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Bill No.</TableHead>
                      <TableHead className="min-w-[300px]">Title</TableHead>
                      <TableHead className="w-[150px]">Introduction Date</TableHead>
                      <TableHead className="w-[120px]">Status</TableHead>
                      <TableHead className="text-right w-[100px]">Full Text</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBills.map((bill) => (
                      <TableRow key={bill.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-sm">
                          {bill.billNumber || '-'}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{bill.title}</p>
                        </TableCell>
                        <TableCell className="text-sm">
                          {bill.introductionDate || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusColor(bill.status)}>
                            {bill.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {bill.fullTextUrl ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <a
                                href={bill.fullTextUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="View full text"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
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
              href="https://www.parlimen.gov.my/bills-dewan-rakyat.html?uweb=dr&"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              parlimen.gov.my
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
