/**
 * Copyright by Calmic Sdn Bhd
 *
 * Page to review bills that have not been passed yet
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Search, Download, ExternalLink, Filter } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import type { Mp, LegislativeProposal } from "@shared/schema";

export default function UnpassedBills() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all-unpassed");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);

  const { data: mps = [] } = useQuery<Mp[]>({
    queryKey: ["/api/mps"],
  });

  const { data: legislativeProposals = [], isLoading: proposalsLoading } = useQuery<LegislativeProposal[]>({
    queryKey: ["/api/legislative-proposals"],
  });

  const getMpById = (id: string) => mps.find(mp => mp.id === id);

  // Filter unpassed bills
  const filteredBills = legislativeProposals.filter(proposal => {
    // Status filter
    const statusLower = proposal.status.toLowerCase();
    const isUnpassed = statusLower !== 'passed' && statusLower !== 'withdrawn';

    if (statusFilter === 'all-unpassed') {
      if (!isUnpassed) return false;
    } else if (statusFilter === 'pending') {
      if (statusLower !== 'pending') return false;
    } else if (statusFilter === 'in-progress') {
      if (statusLower !== 'in progress') return false;
    } else if (statusFilter === 'all') {
      // Show all bills
    }

    // Type filter
    if (typeFilter !== 'all' && proposal.type !== typeFilter) {
      return false;
    }

    // Search filter
    if (!searchQuery) return true;
    const mp = getMpById(proposal.mpId);
    return (
      proposal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mp?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proposal.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (proposal.billNumber && proposal.billNumber.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  // Get unique bill types for filter
  const billTypes = Array.from(new Set(legislativeProposals.map(p => p.type)));

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "passed":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "in progress":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      case "pending":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
      case "rejected":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
      case "withdrawn":
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
      default:
        return "bg-muted";
    }
  };

  const exportToCSV = () => {
    const headers = ['Bill Number', 'Title', 'Type', 'Status', 'Proposed By', 'Date Proposed', 'Description'];
    const rows = filteredBills.map(bill => {
      const mp = getMpById(bill.mpId);
      return [
        bill.billNumber || '',
        bill.title,
        bill.type,
        bill.status,
        mp?.name || '',
        format(new Date(bill.dateProposed), 'yyyy-MM-dd'),
        bill.description.replace(/"/g, '""'), // Escape quotes
      ];
    });

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unpassed-bills-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="Unpassed Bills"
        description="Review bills that have not been passed yet in the Malaysian Parliament. Track pending legislation and legislative proposals."
        keywords="unpassed bills, pending legislation, Malaysian Parliament, legislative proposals, bill status"
        url="https://myparliament.calmic.com.my/unpassed-bills"
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
              <FileText className="inline-block w-8 h-8 mr-2 mb-1" />
              Unpassed Bills Review
            </h1>
            <p className="text-muted-foreground">
              Review and track bills that have not been passed yet in the Dewan Rakyat
            </p>
          </div>
          <Button
            variant="outline"
            onClick={exportToCSV}
            disabled={filteredBills.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export to CSV
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Unpassed</CardDescription>
              <CardTitle className="text-3xl">
                {legislativeProposals.filter(p =>
                  p.status.toLowerCase() !== 'passed' &&
                  p.status.toLowerCase() !== 'withdrawn'
                ).length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending</CardDescription>
              <CardTitle className="text-3xl text-yellow-600">
                {legislativeProposals.filter(p => p.status.toLowerCase() === 'pending').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>In Progress</CardDescription>
              <CardTitle className="text-3xl text-blue-600">
                {legislativeProposals.filter(p => p.status.toLowerCase() === 'in progress').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Rejected</CardDescription>
              <CardTitle className="text-3xl text-red-600">
                {legislativeProposals.filter(p => p.status.toLowerCase() === 'rejected').length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search bills, MPs, bill numbers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-unpassed">All Unpassed Bills</SelectItem>
                  <SelectItem value="pending">Pending Only</SelectItem>
                  <SelectItem value="in-progress">In Progress Only</SelectItem>
                  <SelectItem value="all">All Bills (Including Passed)</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {billTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            {proposalsLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                Loading bills...
              </div>
            ) : filteredBills.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {searchQuery ? 'No bills found matching your search.' : 'No unpassed bills found.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Bill No.</TableHead>
                      <TableHead className="min-w-[300px]">Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Proposed By</TableHead>
                      <TableHead>Date Proposed</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBills.map((bill) => {
                      const mp = getMpById(bill.mpId);
                      return (
                        <TableRow key={bill.id} className="hover:bg-muted/50">
                          <TableCell className="font-mono text-sm">
                            {bill.billNumber || '-'}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{bill.title}</p>
                              {bill.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                  {bill.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{bill.type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getStatusColor(bill.status)}>
                              {bill.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {mp ? (
                              <Link href={`/mp/${mp.id}`}>
                                <Button variant="link" className="h-auto p-0 text-left">
                                  <div>
                                    <p className="font-medium">{mp.name}</p>
                                    <p className="text-xs text-muted-foreground">{mp.constituency}</p>
                                  </div>
                                </Button>
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(bill.dateProposed), 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell className="text-right">
                            {bill.hansardReference && (
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                              >
                                <a
                                  href={bill.hansardReference}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
