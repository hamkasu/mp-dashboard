/**
 * Copyright by Calmic Sdn Bhd
 */

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/i18n/LanguageContext";
import { Header } from "@/components/Header";
import { SearchDialog } from "@/components/SearchDialog";
import { PageMeta } from "@/components/PageMeta";
import { StatisticsCards } from "@/components/StatisticsCards";
import { ElectionStatsCard } from "@/components/ElectionStatsCard";
import { FilterSidebar } from "@/components/FilterSidebar";
import { MPGrid } from "@/components/MPGrid";
import { RoyalAddress } from "@/components/RoyalAddress";
import { MPSpotlight } from "@/components/MPSpotlight";
import { PollWidget } from "@/components/PollWidget";
import { BillsToWatch } from "@/components/BillsToWatch";
import { Footer } from "@/components/Footer";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ExternalLink, AlertTriangle, Eye, ChevronLeft, ChevronRight, ChevronDown, UserX, TrendingUp, Info } from "lucide-react";
import { Link } from "wouter";
import type { Mp, SprmInvestigation, LegislativeProposal, ParliamentaryQuestion } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useConstituencies } from "@/hooks/use-constituencies";
import { MALAYSIAN_STATES } from "@/lib/constants";

interface PaginatedMpsResponse {
  data: Mp[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasMore: boolean;
  };
}

type SortOption = "name" | "attendance-best" | "attendance-worst" | "speeches-most" | "speeches-fewest" | "poverty-highest" | "poverty-lowest" | "bills-raised" | "oral-questions" | "inappropriate-language" | "majority-highest" | "majority-smallest";
type StatusFilter = "all" | "active" | "former";
type CabinetFilter = "all" | "ministers" | "deputy-ministers";

interface LanguageAnalysisMpStat {
  mpId: string;
  mpName: string;
  constituency: string;
  count: number;
  words: string[];
}

export default function Home() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedParties, setSelectedParties] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedCabinetPositions, setSelectedCabinetPositions] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [cabinetFilter, setCabinetFilter] = useState<CabinetFilter>("all");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Special sort modes require all MPs for client-side filtering/sorting
  const SPECIAL_SORT_MODES: SortOption[] = ["bills-raised", "oral-questions", "inappropriate-language", "poverty-highest", "poverty-lowest", "majority-highest", "majority-smallest"];
  const isSpecialSortMode = SPECIAL_SORT_MODES.includes(sortBy);

  // Build query string for paginated API
  const paginatedQueryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', currentPage.toString());
    params.set('limit', ITEMS_PER_PAGE.toString());
    if (sortBy !== 'name') params.set('sortBy', sortBy);
    if (searchQuery) params.set('search', searchQuery);
    if (selectedParties.length > 0) params.set('parties', selectedParties.join(','));
    if (selectedStates.length > 0) params.set('states', selectedStates.join(','));
    if (selectedCabinetPositions.length > 0) params.set('cabinetPositions', selectedCabinetPositions.join(','));
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (cabinetFilter !== 'all') params.set('cabinetFilter', cabinetFilter);
    return params.toString();
  }, [currentPage, sortBy, searchQuery, selectedParties, selectedStates, selectedCabinetPositions, statusFilter, cabinetFilter]);

  // Use paginated API for standard sorts, non-paginated for special sorts
  const { data: paginatedData, isLoading: paginatedLoading } = useQuery<PaginatedMpsResponse>({
    queryKey: ["/api/mps/paginated", paginatedQueryParams],
    queryFn: async () => {
      const response = await fetch(`/api/mps/paginated?${paginatedQueryParams}`);
      if (!response.ok) throw new Error('Failed to fetch MPs');
      return response.json();
    },
    enabled: !isSpecialSortMode,
  });

  // Fetch all MPs for special sort modes that need client-side processing
  const { data: allMps = [], isLoading: allMpsLoading } = useQuery<Mp[]>({
    queryKey: ["/api/mps"],
    enabled: isSpecialSortMode,
  });

  // Use paginated data for standard sorts, all data for special sorts
  const mps = isSpecialSortMode ? allMps : (paginatedData?.data ?? []);
  const pagination = isSpecialSortMode ? null : paginatedData?.pagination;
  const mpsLoading = isSpecialSortMode ? allMpsLoading : paginatedLoading;

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, searchQuery, selectedParties, selectedStates, selectedCabinetPositions, statusFilter, cabinetFilter]);

  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalMps: number;
    partyBreakdown: { party: string; count: number }[];
    genderBreakdown: { gender: string; count: number }[];
    stateCount: number;
    averageAttendanceRate?: number;
    totalCumulativeCosts?: number;
    electionStats?: {
      year: number;
      totalVotes: number;
      governmentVotes: number;
      oppositionVotes: number;
    };
  }>({
    queryKey: ["/api/stats"],
  });

  // Build query params for filtered stats
  const hasActiveFilter = selectedParties.length > 0 || selectedStates.length > 0 || selectedCabinetPositions.length > 0;
  const filteredStatsParams = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedParties.length > 0) params.set('parties', selectedParties.join(','));
    if (selectedStates.length > 0) params.set('states', selectedStates.join(','));
    if (selectedCabinetPositions.length > 0) params.set('cabinetPositions', selectedCabinetPositions.join(','));
    return params.toString();
  }, [selectedParties, selectedStates, selectedCabinetPositions]);

  // Fetch filtered stats when party/state/cabinet filter is active
  const { data: filteredStats, isLoading: filteredStatsLoading } = useQuery<{
    totalMps: number;
    genderBreakdown: { gender: string; count: number }[];
    stateCount: number;
    averageAttendanceRate?: number;
  }>({
    queryKey: ["/api/stats/filtered", filteredStatsParams],
    queryFn: async () => {
      const response = await fetch(`/api/stats/filtered?${filteredStatsParams}`);
      if (!response.ok) throw new Error('Failed to fetch filtered stats');
      return response.json();
    },
    enabled: hasActiveFilter,
  });

  const { data: sprmInvestigations = [], isLoading: sprmInvestigationsLoading } = useQuery<SprmInvestigation[]>({
    queryKey: ["/api/sprm-investigations"],
  });

  // Fetch visitor analytics summary for total visits
  const { data: analyticsData } = useQuery<{ totalVisits: number; uniqueVisitors: number }>({
    queryKey: ["/api/analytics/summary"],
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });

  // Fetch constituency data for poverty sorting
  const { data: constituencies = [] } = useConstituencies();

  // Fetch legislative proposals for bills sorting
  const { data: legislativeProposals = [] } = useQuery<LegislativeProposal[]>({
    queryKey: ["/api/legislative-proposals"],
  });

  // Fetch language analysis for inappropriate language sorting
  const { data: languageAnalysis, isLoading: languageAnalysisLoading } = useQuery<{
    summary: { totalRecordsAnalyzed: number; totalInstancesFound: number; uniqueMpsIdentified: number };
    mpRanking: LanguageAnalysisMpStat[];
  }>({
    queryKey: ["/api/admin/analyze-language"],
    retry: false,
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes (matches server cache)
  });

  // Fetch parliamentary questions for oral questions sorting
  const { data: parliamentaryQuestions = [] } = useQuery<ParliamentaryQuestion[]>({
    queryKey: ["/api/parliamentary-questions"],
  });

  // Fetch oral answers counts from PDF scraper (Parlimen 15 complete data)
  const { data: oralAnswersCountsData = {} } = useQuery<Record<string, number>>({
    queryKey: ["/api/oral-answers/counts-by-mp"],
    enabled: sortBy === "oral-questions" || isSpecialSortMode,
  });

  // Create a lookup map for oral questions count by MP ID (combining both sources)
  const oralQuestionsCountByMpId = useMemo(() => {
    const map = new Map<string, number>();

    // Add counts from Hansard records
    parliamentaryQuestions
      .filter(q => q.questionType?.toLowerCase() === 'oral' || q.questionType?.toLowerCase() === 'lisan')
      .forEach((q) => {
        const current = map.get(q.mpId) || 0;
        map.set(q.mpId, current + 1);
      });

    // Add counts from Jawapan Lisan PDFs (all Parlimen 15)
    Object.entries(oralAnswersCountsData).forEach(([mpId, count]) => {
      const current = map.get(mpId) || 0;
      map.set(mpId, current + count);
    });

    return map;
  }, [parliamentaryQuestions, oralAnswersCountsData]);

  // Create a lookup map for inappropriate language count by MP ID
  const inappropriateLanguageByMpId = useMemo(() => {
    const map = new Map<string, LanguageAnalysisMpStat>();
    if (languageAnalysis?.mpRanking) {
      languageAnalysis.mpRanking.forEach((stat) => {
        map.set(stat.mpId, stat);
      });
    }
    return map;
  }, [languageAnalysis]);

  // Create a lookup map for bills count by MP ID
  const billsCountByMpId = useMemo(() => {
    const map = new Map<string, number>();
    legislativeProposals
      .filter(p => p.type?.toLowerCase() === 'bill')
      .forEach((p) => {
        const current = map.get(p.mpId) || 0;
        map.set(p.mpId, current + 1);
      });
    return map;
  }, [legislativeProposals]);

  // Create a lookup map for bills (with details) by MP ID
  const billsByMpId = useMemo(() => {
    const map = new Map<string, LegislativeProposal[]>();
    legislativeProposals
      .filter(p => p.type?.toLowerCase() === 'bill')
      .forEach((p) => {
        const existing = map.get(p.mpId) || [];
        map.set(p.mpId, [...existing, p]);
      });
    return map;
  }, [legislativeProposals]);

  // Create a lookup map for oral questions (with details) by MP ID
  const oralQuestionsByMpId = useMemo(() => {
    const map = new Map<string, ParliamentaryQuestion[]>();
    parliamentaryQuestions
      .filter(q => q.questionType?.toLowerCase() === 'oral' || q.questionType?.toLowerCase() === 'lisan')
      .forEach((q) => {
        const existing = map.get(q.mpId) || [];
        map.set(q.mpId, [...existing, q]);
      });
    return map;
  }, [parliamentaryQuestions]);

  // Create a lookup map for poverty by parliament code
  const povertyByCode = useMemo(() => {
    const map = new Map<string, number>();
    constituencies.forEach((c) => {
      if (c.povertyIncidence !== null) {
        map.set(c.parliamentCode, c.povertyIncidence);
      }
    });
    return map;
  }, [constituencies]);

  useEffect(() => {
    apiRequest("POST", "/api/page-views", { page: "home" });
  }, []);

  const isLoading = mpsLoading || statsLoading;

  // Simple client-side filtering for special sort modes
  const filteredMps = useMemo(() => {
    // For standard sorts, server already filtered and sorted
    if (!isSpecialSortMode) return mps;

    // For special sorts, start with all MPs and apply filters
    let result = [...mps];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(mp =>
        mp.name.toLowerCase().includes(query) ||
        mp.constituency.toLowerCase().includes(query) ||
        mp.party.toLowerCase().includes(query) ||
        mp.state.toLowerCase().includes(query)
      );
    }

    // Filter by party
    if (selectedParties.length > 0) {
      result = result.filter(mp => selectedParties.includes(mp.party));
    }

    // Filter by state
    if (selectedStates.length > 0) {
      result = result.filter(mp => selectedStates.includes(mp.state));
    }

    // Filter by cabinet position - simple OR logic
    if (selectedCabinetPositions.length > 0) {
      result = result.filter(mp => {
        if (selectedCabinetPositions.includes("ministers") && mp.isMinister) return true;
        if (selectedCabinetPositions.includes("deputy-ministers") && mp.isDeputyMinister) return true;
        return false;
      });
    }

    // Apply special sorts
    if (sortBy === "poverty-highest" || sortBy === "poverty-lowest") {
      result.sort((a, b) => {
        const codeA = a.parliamentCode.replace(/^P(\d+)$/, (_, n: string) => `P.${n.padStart(3, '0')}`);
        const codeB = b.parliamentCode.replace(/^P(\d+)$/, (_, n: string) => `P.${n.padStart(3, '0')}`);
        const povertyA = povertyByCode.get(codeA) ?? (sortBy === "poverty-highest" ? -1 : Infinity);
        const povertyB = povertyByCode.get(codeB) ?? (sortBy === "poverty-highest" ? -1 : Infinity);
        return sortBy === "poverty-highest" ? povertyB - povertyA : povertyA - povertyB;
      });
    } else if (sortBy === "bills-raised") {
      result = result.filter(mp => (billsCountByMpId.get(mp.id) ?? 0) > 0);
      result.sort((a, b) => (billsCountByMpId.get(b.id) ?? 0) - (billsCountByMpId.get(a.id) ?? 0));
    } else if (sortBy === "oral-questions") {
      result = result.filter(mp => (oralQuestionsCountByMpId.get(mp.id) ?? 0) > 0);
      result.sort((a, b) => (oralQuestionsCountByMpId.get(b.id) ?? 0) - (oralQuestionsCountByMpId.get(a.id) ?? 0));
    } else if (sortBy === "inappropriate-language") {
      result = result.filter(mp => (inappropriateLanguageByMpId.get(mp.id)?.count ?? 0) > 0);
      result.sort((a, b) => {
        const countA = inappropriateLanguageByMpId.get(a.id)?.count ?? 0;
        const countB = inappropriateLanguageByMpId.get(b.id)?.count ?? 0;
        return countB - countA;
      });
    } else if (sortBy === "majority-highest" || sortBy === "majority-smallest") {
      result.sort((a, b) => {
        const majorityA = a.electionMajority ?? (sortBy === "majority-highest" ? -1 : Infinity);
        const majorityB = b.electionMajority ?? (sortBy === "majority-highest" ? -1 : Infinity);
        return sortBy === "majority-highest" ? majorityB - majorityA : majorityA - majorityB;
      });
    }

    return result;
  }, [mps, isSpecialSortMode, searchQuery, selectedParties, selectedStates, selectedCabinetPositions, sortBy, povertyByCode, billsCountByMpId, oralQuestionsCountByMpId, inappropriateLanguageByMpId]);

  const availableStates = useMemo(() => {
    // Include all Malaysian states, not just those with MPs in database
    return [...MALAYSIAN_STATES].sort();
  }, []);

  const mpsWithSprmInvestigations = useMemo(() => {
    if (!sprmInvestigations.length || !mps.length) return [];
    
    const mpIdsWithInvestigations = new Set(sprmInvestigations.map(i => i.mpId));
    return mps.filter(mp => mpIdsWithInvestigations.has(mp.id));
  }, [mps, sprmInvestigations]);

  const defaultStats = {
    totalMps: 0,
    partyBreakdown: [],
    genderBreakdown: [],
    stateCount: 0,
  };

  const handlePartyToggle = (party: string) => {
    setSelectedParties((prev) =>
      prev.includes(party)
        ? prev.filter((p) => p !== party)
        : [...prev, party]
    );
  };

  const handleStateToggle = (state: string) => {
    setSelectedStates((prev) =>
      prev.includes(state)
        ? prev.filter((s) => s !== state)
        : [...prev, state]
    );
  };

  const handleCabinetPositionToggle = (position: string) => {
    setSelectedCabinetPositions((prev) =>
      prev.includes(position)
        ? prev.filter((p) => p !== position)
        : [...prev, position]
    );
  };

  const handleClearFilters = () => {
    setSelectedParties([]);
    setSelectedStates([]);
    setSelectedCabinetPositions([]);
    setStatusFilter("active");
    setCabinetFilter("all");
  };

  const handleStatusFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter);
  };

  const handleCabinetFilterChange = (filter: CabinetFilter) => {
    setCabinetFilter(filter);
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Blue Abstract Background */}
      <div
        className="fixed inset-0 -z-10 bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(96, 165, 250, 0.2) 0%, transparent 50%),
            radial-gradient(circle at 40% 80%, rgba(59, 130, 246, 0.2) 0%, transparent 50%),
            linear-gradient(135deg, transparent 40%, rgba(59, 130, 246, 0.1) 60%, transparent 80%),
            linear-gradient(45deg, transparent 30%, rgba(96, 165, 250, 0.15) 50%, transparent 70%)
          `,
          backgroundSize: '100% 100%, 100% 100%, 100% 100%, 200% 200%, 200% 200%',
        }}
      >
        {/* Curved Light Elements */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 50% -20%, rgba(147, 197, 253, 0.3), transparent),
              radial-gradient(ellipse 60% 30% at 50% 120%, rgba(147, 197, 253, 0.2), transparent)
            `
          }}
        />
      </div>

      {/* Content overlay */}
      <div className="relative z-10">
        <PageMeta
          title={t("dashboard.title")}
          description="Track Malaysian Parliament MPs, voting records, and parliamentary activities. Comprehensive Dewan Rakyat dashboard with attendance tracking, court cases, and SPRM investigations."
          keywords="Malaysian Parliament, MP dashboard, Dewan Rakyat, voting records, parliamentary activities, MP attendance, court cases, SPRM investigations, Malaysia MPs"
          url="https://myparliament.calmic.com.my"
          structuredData={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "How many MPs are in the Malaysian Parliament?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "There are 222 Members of Parliament (MPs) in Dewan Rakyat, representing constituencies across Malaysia."
                }
              },
              {
                "@type": "Question",
                "name": "Can I track my MP's attendance?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes, the Malaysian Parliament Dashboard provides real-time attendance tracking for all 222 MPs, including detailed statistics and voting records."
                }
              },
              {
                "@type": "Question",
                "name": "What information is available about MPs?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "The dashboard tracks MP attendance, parliamentary activities, Hansard speeches, court cases, SPRM investigations, allowances, and voting records for complete transparency."
                }
              },
              {
                "@type": "Question",
                "name": "How often is the data updated?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "The Malaysian Parliament Dashboard is updated regularly to reflect the latest parliamentary activities, attendance records, and official announcements."
                }
              },
              {
                "@type": "Question",
                "name": "Is the Malaysian Parliament Dashboard official?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "This is an independent platform created to increase transparency and public access to Malaysian Parliament data. It aggregates publicly available information about MPs and parliamentary activities."
                }
              }
            ]
          }}
        />
        <Header
          onMenuClick={() => setMobileFiltersOpen(true)}
          onSearchClick={() => setSearchDialogOpen(true)}
        />
      
      <SearchDialog 
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
      />

      <div className="flex max-w-7xl mx-auto bg-background/95 backdrop-blur-sm">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 lg:w-72 shrink-0 sticky top-20 h-[calc(100vh-5rem)] border-r bg-background/98">
          <FilterSidebar
            parties={(stats || defaultStats).partyBreakdown}
            states={availableStates}
            selectedParties={selectedParties}
            selectedStates={selectedStates}
            selectedCabinetPositions={selectedCabinetPositions}
            sortBy={sortBy}
            statusFilter={statusFilter}
            onPartyToggle={handlePartyToggle}
            onStateToggle={handleStateToggle}
            onCabinetPositionToggle={handleCabinetPositionToggle}
            onSortChange={setSortBy}
            onStatusFilterChange={handleStatusFilterChange}
            onClearFilters={handleClearFilters}
          />
        </aside>

        {/* Mobile Sidebar */}
        <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <SheetContent side="left" className="p-0 w-80">
            <FilterSidebar
              parties={(stats || defaultStats).partyBreakdown}
              states={availableStates}
              selectedParties={selectedParties}
              selectedStates={selectedStates}
              selectedCabinetPositions={selectedCabinetPositions}
              sortBy={sortBy}
              statusFilter={statusFilter}
              onPartyToggle={handlePartyToggle}
              onStateToggle={handleStateToggle}
              onCabinetPositionToggle={handleCabinetPositionToggle}
              onSortChange={setSortBy}
              onStatusFilterChange={handleStatusFilterChange}
              onClearFilters={handleClearFilters}
              isMobile
              onClose={() => setMobileFiltersOpen(false)}
            />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <main className="flex-1 px-4 md:px-6 lg:px-8 py-6 md:py-8">
          <div className="space-y-6 md:space-y-8">
            {/* Featured Cards: Royal Address, MP Spotlight & Weekly Poll */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg blur opacity-25 pointer-events-none" />
                <RoyalAddress />
              </div>
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 to-orange-500/10 rounded-lg blur opacity-25 pointer-events-none" />
                <MPSpotlight />
              </div>
              <div className="relative md:col-span-2 xl:col-span-1">
                <div className="absolute -inset-1 bg-gradient-to-r from-green-500/20 to-emerald-500/10 rounded-lg blur opacity-25 pointer-events-none" />
                <PollWidget />
              </div>
            </div>

            {/* Bills to Watch Section */}
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/20 to-amber-500/10 rounded-lg blur opacity-25 pointer-events-none" />
              <BillsToWatch />
            </div>

            {/* SEO Landing Section */}
            <div className="space-y-3" data-testid="landing-section">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                  {t('home.title')}
                </h1>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 gap-2 rounded-full border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-colors" 
                      data-testid="button-mp-role-info"
                    >
                      <Info className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium text-foreground">MP Role Guide</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold mb-4">The Role of an MP in Malaysia</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 text-sm md:text-base text-muted-foreground leading-relaxed">
                      <p>
                        In Malaysia's parliamentary system, the Cabinet (part of the executive branch) typically initiates and drafts most bills, but Members of Parliament (MPs)—primarily referring to those in the Dewan Rakyat (House of Representatives)—play a multifaceted role beyond just approval. They are elected to represent their constituencies and contribute to the governance process in several key ways:
                      </p>
                      
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-bold text-foreground">Legislative functions</h4>
                          <p>MPs debate, propose amendments to, and vote on proposed laws (bills) during parliamentary sessions. While the Cabinet formulates many bills, Parliament has the authority to pass, amend, or even repeal them, ensuring they align with public interest. This includes participating in readings and committee stages where bills are scrutinized.</p>
                        </div>
                        
                        <div>
                          <h4 className="font-bold text-foreground">Representation of constituents</h4>
                          <p>Each MP acts as the voice for their specific electoral area, raising local issues, concerns, and needs in Parliament through questions, motions, or speeches to influence policy and resource allocation.</p>
                        </div>
                        
                        <div>
                          <h4 className="font-bold text-foreground">Oversight and accountability</h4>
                          <p>MPs monitor the government's actions by questioning ministers, debating policies, and serving on parliamentary committees that investigate executive performance, corruption, or inefficiencies. This helps ensure transparency and good governance.</p>
                        </div>
                        
                        <div>
                          <h4 className="font-bold text-foreground">Financial control</h4>
                          <p>Parliament, through MPs, approves the national budget, audits public spending, and authorizes taxation or loans, preventing unchecked executive expenditure.</p>
                        </div>
                        
                        <div>
                          <h4 className="font-bold text-foreground">Policy influence and national discourse</h4>
                          <p>MPs contribute to discussions on broader issues like economic development, social welfare, and international relations, shaping Malaysia's direction through motions, adjournment debates, or private member's bills (though these are less common).</p>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-lg text-muted-foreground max-w-3xl">
                {t('home.subtitle')} {t('home.description')}
              </p>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">✓</span>
                  <span>{t('home.avgAttendance')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">✓</span>
                  <span>{t('nav.hansard')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">✓</span>
                  <span>{t('profile.courtCases')} & {t('profile.sprmInvestigations')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">✓</span>
                  <span>{t('allowances.title')}</span>
                </div>
              </div>
            </div>

            {/* Page Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                    {t('nav.mps')}
                  </h2>
                  {analyticsData && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground" data-testid="page-view-count">
                      <Eye className="w-4 h-4" />
                      <span>{analyticsData.totalVisits.toLocaleString()} visits</span>
                    </div>
                  )}
                </div>
                <p className="text-muted-foreground">
                  {(stats || defaultStats).totalMps} {t('nav.mps')}
                </p>
              </div>

              {/* Mobile Quick Sort/Filter */}
              <div className="flex md:hidden items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="shrink-0 gap-2">
                      <TrendingUp className="w-4 h-4" />
                      <span>{t('filters.sortBy')}</span>
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[200px] max-h-[300px] overflow-y-auto">
                    {[
                      { value: "name", label: t('filters.sortName') },
                      { value: "attendance-best", label: t('filters.sortBestAttendance') },
                      { value: "attendance-worst", label: t('filters.sortWorstAttendance') },
                      { value: "speeches-most", label: t('filters.sortMostSpeeches') },
                      { value: "speeches-fewest", label: t('filters.sortFewestSpeeches') },
                      { value: "poverty-highest", label: t('filters.sortHighestPoverty') },
                      { value: "poverty-lowest", label: t('filters.sortLowestPoverty') },
                      { value: "bills-raised", label: t('filters.sortBillsRaised') },
                      { value: "oral-questions", label: t('filters.sortOralQuestions') },
                      { value: "inappropriate-language", label: t('filters.sortInappropriateLanguage') }
                    ].map((opt) => (
                      <DropdownMenuItem 
                        key={opt.value} 
                        onSelect={() => setSortBy(opt.value as SortOption)}
                        className={sortBy === opt.value ? "bg-accent" : ""}
                      >
                        {opt.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="shrink-0 gap-2">
                      <UserX className="w-4 h-4" />
                      <span>Status</span>
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {[
                      { value: "active", label: t('filters.activeMPs') },
                      { value: "all", label: t('filters.allMPs') },
                      { value: "former", label: t('filters.formerMPs') }
                    ].map((opt) => (
                      <DropdownMenuItem 
                        key={opt.value} 
                        onSelect={() => handleStatusFilterChange(opt.value as StatusFilter)}
                        className={statusFilter === opt.value ? "bg-accent" : ""}
                      >
                        {opt.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Cumulative Costs Section */}
            {!statsLoading && stats?.totalCumulativeCosts !== undefined && (
              <Card className="border-blue-200 dark:border-blue-900 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20" data-testid="cumulative-costs-section">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100 text-base">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Total MP Salaries & Allowances Since Sworn In
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div>
                      <div className="text-3xl font-bold text-blue-900 dark:text-blue-100" data-testid="text-cumulative-costs">
                        RM {stats.totalCumulativeCosts.toLocaleString('en-MY')}
                      </div>
                      <p className="text-xs text-blue-800 dark:text-blue-200 mt-1">
                        Cumulative costs for all {stats.totalMps} MPs since their respective sworn-in dates
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div className="bg-white/50 dark:bg-black/20 rounded-md p-2.5">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Includes:</p>
                        <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-0.5">
                          <li>• Base salaries (RM 25,700/month)</li>
                          <li>• Ministers' salaries and allowances*</li>
                          <li>• Monthly fixed allowances (entertainment, travel, fuel, etc.)</li>
                        </ul>
                      </div>
                      <div className="bg-white/50 dark:bg-black/20 rounded-md p-2.5">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Plus attendance-based:</p>
                        <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-0.5">
                          <li>• Parliament sitting allowances (RM 400/day)</li>
                          <li>• Government meeting allowances (RM 300/day)**</li>
                        </ul>
                      </div>
                    </div>
                    <p className="text-xs text-blue-800 dark:text-blue-200 mt-2">
                      *Note: PM receives no salary. Other ministers have taken a 20% voluntary paycut.
                    </p>
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      **Government meeting attendance data not yet available.
                    </p>
                    <p className="text-xs text-muted-foreground italic">
                      Calculated based on individual sworn-in dates and attendance records. Does not include periodic allowances (handphone, computer, attire purchases).
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 2022 Election Statistics */}
            <ElectionStatsCard
              stats={stats?.electionStats}
              isLoading={statsLoading}
            />

            {/* Statistics */}
            <StatisticsCards 
              stats={stats || defaultStats} 
              filteredStats={hasActiveFilter ? filteredStats : null}
              isLoading={statsLoading || (hasActiveFilter && filteredStatsLoading)} 
              hasPartyFilter={selectedParties.length > 0} 
            />


            {/* MP Grid */}
            {sortBy === "inappropriate-language" && languageAnalysisLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Analyzing Hansard transcripts for inappropriate language...</p>
                <p className="text-xs text-muted-foreground">This may take a moment on first load</p>
              </div>
            ) : (
              <MPGrid mps={filteredMps} isLoading={isLoading} billsByMpId={billsByMpId} oralQuestionsByMpId={oralQuestionsByMpId} languageStatsByMpId={inappropriateLanguageByMpId} />
            )}

            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-6 pb-4" data-testid="pagination-controls">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || mpsLoading}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Page</span>
                  <span className="font-medium text-foreground">{currentPage}</span>
                  <span>of</span>
                  <span className="font-medium text-foreground">{pagination.totalPages}</span>
                  <span className="hidden sm:inline">({pagination.totalItems} MPs)</span>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={currentPage >= pagination.totalPages || mpsLoading}
                  data-testid="button-next-page"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
      <Footer />
      </div>
    </div>
  );
}
