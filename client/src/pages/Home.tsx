/**
 * Copyright by Calmic Sdn Bhd
 */

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/i18n/LanguageContext";
import { Header } from "@/components/Header";
import { SearchDialog } from "@/components/SearchDialog";
import { StatisticsCards } from "@/components/StatisticsCards";
import { FilterSidebar } from "@/components/FilterSidebar";
import { MPGrid } from "@/components/MPGrid";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ExternalLink, AlertTriangle, Eye, ChevronLeft, ChevronRight, Scale } from "lucide-react";
import { Link } from "wouter";
import type { Mp, CourtCase, SprmInvestigation, LegislativeProposal, ParliamentaryQuestion } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useConstituencies } from "@/hooks/use-constituencies";

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

type SortOption = "name" | "attendance-best" | "attendance-worst" | "speeches-most" | "speeches-fewest" | "poverty-highest" | "poverty-lowest" | "bills-raised" | "oral-questions" | "inappropriate-language";
type CabinetFilter = "all" | "ministers" | "deputy-ministers" | "cabinet";

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
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [cabinetFilter, setCabinetFilter] = useState<CabinetFilter>("all");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Special sort modes require all MPs for client-side filtering/sorting
  const SPECIAL_SORT_MODES: SortOption[] = ["bills-raised", "oral-questions", "inappropriate-language", "poverty-highest", "poverty-lowest"];
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
    if (cabinetFilter !== 'all') params.set('cabinet', cabinetFilter);
    return params.toString();
  }, [currentPage, sortBy, searchQuery, selectedParties, selectedStates, cabinetFilter]);

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
  }, [sortBy, searchQuery, selectedParties, selectedStates, cabinetFilter]);

  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalMps: number;
    partyBreakdown: { party: string; count: number }[];
    genderBreakdown: { gender: string; count: number }[];
    stateCount: number;
    averageAttendanceRate?: number;
    totalCumulativeCosts?: number;
  }>({
    queryKey: ["/api/stats"],
  });

  const { data: sprmInvestigations = [], isLoading: sprmInvestigationsLoading } = useQuery<SprmInvestigation[]>({
    queryKey: ["/api/sprm-investigations"],
  });

  const { data: courtCases = [], isLoading: courtCasesLoading } = useQuery<CourtCase[]>({
    queryKey: ["/api/court-cases"],
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

  // Create a lookup map for oral questions count by MP ID
  const oralQuestionsCountByMpId = useMemo(() => {
    const map = new Map<string, number>();
    parliamentaryQuestions
      .filter(q => q.questionType?.toLowerCase() === 'oral' || q.questionType?.toLowerCase() === 'lisan')
      .forEach((q) => {
        const current = map.get(q.mpId) || 0;
        map.set(q.mpId, current + 1);
      });
    return map;
  }, [parliamentaryQuestions]);

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

  // For special sort options (poverty, bills, oral questions, inappropriate language)
  // that require additional data not available in the paginated API,
  // apply client-side filtering and sorting to all MPs
  const filteredMps = useMemo(() => {
    let filtered = [...mps];

    // For special sort modes, apply client-side filtering since we're using /api/mps (all MPs)
    if (isSpecialSortMode) {
      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(mp => 
          mp.name.toLowerCase().includes(query) ||
          mp.constituency.toLowerCase().includes(query) ||
          mp.party.toLowerCase().includes(query) ||
          mp.state.toLowerCase().includes(query)
        );
      }

      // Apply party filter
      if (selectedParties.length > 0) {
        filtered = filtered.filter(mp => selectedParties.includes(mp.party));
      }

      // Apply state filter
      if (selectedStates.length > 0) {
        filtered = filtered.filter(mp => selectedStates.includes(mp.state));
      }

      // Apply cabinet filter
      if (cabinetFilter !== "all") {
        if (cabinetFilter === "cabinet") {
          filtered = filtered.filter(mp => mp.isMinister || mp.isDeputyMinister);
        } else if (cabinetFilter === "ministers") {
          filtered = filtered.filter(mp => mp.isMinister);
        } else if (cabinetFilter === "deputy-ministers") {
          filtered = filtered.filter(mp => mp.isDeputyMinister);
        }
      }
    }

    // Special sort options that require additional client-side data
    if (sortBy === "poverty-highest") {
      filtered = [...filtered].sort((a, b) => {
        const codeA = a.parliamentCode.replace(/^P(\d+)$/, (_, num: string) => `P.${num.padStart(3, '0')}`);
        const codeB = b.parliamentCode.replace(/^P(\d+)$/, (_, num: string) => `P.${num.padStart(3, '0')}`);
        const povertyA = povertyByCode.get(codeA) ?? -1;
        const povertyB = povertyByCode.get(codeB) ?? -1;
        return povertyB - povertyA;
      });
    } else if (sortBy === "poverty-lowest") {
      filtered = [...filtered].sort((a, b) => {
        const codeA = a.parliamentCode.replace(/^P(\d+)$/, (_, num: string) => `P.${num.padStart(3, '0')}`);
        const codeB = b.parliamentCode.replace(/^P(\d+)$/, (_, num: string) => `P.${num.padStart(3, '0')}`);
        const povertyA = povertyByCode.get(codeA) ?? Infinity;
        const povertyB = povertyByCode.get(codeB) ?? Infinity;
        return povertyA - povertyB;
      });
    } else if (sortBy === "bills-raised") {
      filtered = filtered.filter(mp => (billsCountByMpId.get(mp.id) ?? 0) > 0);
      filtered = [...filtered].sort((a, b) => {
        const billsA = billsCountByMpId.get(a.id) ?? 0;
        const billsB = billsCountByMpId.get(b.id) ?? 0;
        return billsB - billsA;
      });
    } else if (sortBy === "oral-questions") {
      filtered = filtered.filter(mp => (oralQuestionsCountByMpId.get(mp.id) ?? 0) > 0);
      filtered = [...filtered].sort((a, b) => {
        const countA = oralQuestionsCountByMpId.get(a.id) ?? 0;
        const countB = oralQuestionsCountByMpId.get(b.id) ?? 0;
        return countB - countA;
      });
    } else if (sortBy === "inappropriate-language") {
      filtered = filtered.filter(mp => (inappropriateLanguageByMpId.get(mp.id)?.count ?? 0) > 0);
      filtered = [...filtered].sort((a, b) => {
        const countA = inappropriateLanguageByMpId.get(a.id)?.count ?? 0;
        const countB = inappropriateLanguageByMpId.get(b.id)?.count ?? 0;
        return countB - countA;
      });
    }
    // For name, attendance, and speeches sorts, the server already sorted the data

    return filtered;
  }, [mps, sortBy, povertyByCode, billsCountByMpId, oralQuestionsCountByMpId, inappropriateLanguageByMpId, isSpecialSortMode, searchQuery, selectedParties, selectedStates, cabinetFilter]);

  const availableStates = useMemo(() => {
    const states = Array.from(new Set(mps.map((mp) => mp.state)));
    return states.sort();
  }, [mps]);

  const mpsWithSprmInvestigations = useMemo(() => {
    if (!sprmInvestigations.length || !mps.length) return [];
    
    const mpIdsWithInvestigations = new Set(sprmInvestigations.map(i => i.mpId));
    return mps.filter(mp => mpIdsWithInvestigations.has(mp.id));
  }, [mps, sprmInvestigations]);

  const mpsWithCourtCases = useMemo(() => {
    if (!courtCases.length || !mps.length) return [];
    
    const mpIdsWithCases = new Set(courtCases.map(c => c.mpId));
    return mps.filter(mp => mpIdsWithCases.has(mp.id));
  }, [mps, courtCases]);

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

  const handleClearFilters = () => {
    setSelectedParties([]);
    setSelectedStates([]);
    setCabinetFilter("all");
  };

  const handleCabinetFilterChange = (filter: CabinetFilter) => {
    setCabinetFilter(filter);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        onMenuClick={() => setMobileFiltersOpen(true)}
        onSearchClick={() => setSearchDialogOpen(true)}
      />
      
      <SearchDialog 
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
      />

      <div className="flex max-w-7xl mx-auto">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 lg:w-72 shrink-0 sticky top-20 h-[calc(100vh-5rem)] border-r">
          <FilterSidebar
            parties={(stats || defaultStats).partyBreakdown}
            states={availableStates}
            selectedParties={selectedParties}
            selectedStates={selectedStates}
            sortBy={sortBy}
            cabinetFilter={cabinetFilter}
            onPartyToggle={handlePartyToggle}
            onStateToggle={handleStateToggle}
            onSortChange={setSortBy}
            onCabinetFilterChange={handleCabinetFilterChange}
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
              sortBy={sortBy}
              cabinetFilter={cabinetFilter}
              onPartyToggle={handlePartyToggle}
              onStateToggle={handleStateToggle}
              onSortChange={setSortBy}
              onCabinetFilterChange={handleCabinetFilterChange}
              onClearFilters={handleClearFilters}
              isMobile
              onClose={() => setMobileFiltersOpen(false)}
            />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <main className="flex-1 px-4 md:px-6 lg:px-8 py-6 md:py-8">
          <div className="space-y-6 md:space-y-8">
            {/* SEO Landing Section */}
            <div className="space-y-3" data-testid="landing-section">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                {t('home.title')}
              </h1>
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
                          <li>• Government meeting allowances (RM 300/day)</li>
                        </ul>
                      </div>
                    </div>
                    <p className="text-xs text-blue-800 dark:text-blue-200 mt-2">
                      *Note: PM receives no salary. Other ministers have taken a 20% voluntary paycut.
                    </p>
                    <p className="text-xs text-muted-foreground italic">
                      Calculated based on individual sworn-in dates and attendance records. Does not include periodic allowances (handphone, computer, attire purchases).
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* SPRM Investigations Section */}
            {!sprmInvestigationsLoading && mpsWithSprmInvestigations.length > 0 && (
              <Card className="border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20" data-testid="sprm-investigations-section">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-red-900 dark:text-red-100">
                    <AlertTriangle className="h-5 w-5" />
                    MACC/SPRM Investigations
                  </CardTitle>
                  <p className="text-sm text-red-800/70 dark:text-red-200/70">
                    Members of Parliament under investigation by the Malaysian Anti-Corruption Commission
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                    {mpsWithSprmInvestigations.map((mp) => {
                      const mpInvestigations = sprmInvestigations.filter(i => i.mpId === mp.id);
                      const ongoingCount = mpInvestigations.filter(i => i.status === "Ongoing").length;
                      const completedCount = mpInvestigations.filter(i => i.status === "Completed").length;
                      const latestInvestigation = mpInvestigations[0];

                      return (
                        <Link key={mp.id} href={`/mp/${mp.id}`} data-testid={`sprm-investigation-mp-${mp.id}`}>
                          <div className="group cursor-pointer rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors">
                            <div className="flex items-start gap-4">
                              <Avatar className="h-14 w-14 shrink-0 border-2 border-red-200 dark:border-red-800">
                                <AvatarImage src={mp.photoUrl || undefined} alt={mp.name} />
                                <AvatarFallback className="bg-red-100 dark:bg-red-900/50 text-red-900 dark:text-red-100 font-semibold">
                                  {mp.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <h4 className="font-semibold text-base group-hover:text-primary transition-colors">
                                      {mp.name}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <Badge variant="outline" className="text-xs font-medium">
                                        {mp.party}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">{mp.constituency}</span>
                                    </div>
                                  </div>
                                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                                </div>
                                {latestInvestigation && (
                                  <div className="mt-3 p-2.5 bg-red-100/50 dark:bg-red-900/20 rounded-md">
                                    <p className="text-xs font-medium text-red-900 dark:text-red-100 mb-1">
                                      {latestInvestigation.caseNumber}
                                    </p>
                                    <p className="text-xs text-red-800 dark:text-red-200 line-clamp-2">
                                      {latestInvestigation.title}
                                    </p>
                                  </div>
                                )}
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                  {ongoingCount > 0 && (
                                    <Badge variant="destructive" className="text-xs" data-testid={`badge-sprm-ongoing-${mp.id}`}>
                                      {ongoingCount} Ongoing
                                    </Badge>
                                  )}
                                  {completedCount > 0 && (
                                    <Badge variant="secondary" className="text-xs" data-testid={`badge-sprm-completed-${mp.id}`}>
                                      {completedCount} Completed
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Court Cases Section */}
            {!courtCasesLoading && mpsWithCourtCases.length > 0 && (
              <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20" data-testid="court-cases-section">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
                    <Scale className="h-5 w-5" />
                    MPs Court Cases
                  </CardTitle>
                  <p className="text-sm text-amber-800/70 dark:text-amber-200/70">
                    Members of Parliament with ongoing or concluded court cases
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                    {mpsWithCourtCases.map((mp) => {
                      const mpCases = courtCases.filter(c => c.mpId === mp.id);
                      const ongoingCount = mpCases.filter(c => c.status === "Ongoing" || c.status === "Pending").length;
                      const completedCount = mpCases.filter(c => c.status === "Completed" || c.status === "Concluded" || c.status === "Acquitted" || c.status === "Convicted").length;
                      const latestCase = mpCases[0];

                      return (
                        <Link key={mp.id} href={`/mp/${mp.id}`} data-testid={`court-case-mp-${mp.id}`}>
                          <div className="group cursor-pointer rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors">
                            <div className="flex items-start gap-4">
                              <Avatar className="h-14 w-14 shrink-0 border-2 border-amber-200 dark:border-amber-800">
                                <AvatarImage src={mp.photoUrl || undefined} alt={mp.name} />
                                <AvatarFallback className="bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-100 font-semibold">
                                  {mp.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <h4 className="font-semibold text-base group-hover:text-primary transition-colors">
                                      {mp.name}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <Badge variant="outline" className="text-xs font-medium">
                                        {mp.party}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">{mp.constituency}</span>
                                    </div>
                                  </div>
                                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                                </div>
                                {latestCase && (
                                  <div className="mt-3 p-2.5 bg-amber-100/50 dark:bg-amber-900/20 rounded-md">
                                    <p className="text-xs font-medium text-amber-900 dark:text-amber-100 mb-1">
                                      {latestCase.caseNumber}
                                    </p>
                                    <p className="text-xs text-amber-800 dark:text-amber-200 line-clamp-2">
                                      {latestCase.title}
                                    </p>
                                  </div>
                                )}
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                  {ongoingCount > 0 && (
                                    <Badge variant="destructive" className="text-xs" data-testid={`badge-court-ongoing-${mp.id}`}>
                                      {ongoingCount} Ongoing
                                    </Badge>
                                  )}
                                  {completedCount > 0 && (
                                    <Badge variant="secondary" className="text-xs" data-testid={`badge-court-completed-${mp.id}`}>
                                      {completedCount} Completed
                                    </Badge>
                                  )}
                                  {mpCases.length > 1 && (
                                    <Badge variant="outline" className="text-xs text-muted-foreground">
                                      +{mpCases.length - 1} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Statistics */}
            <StatisticsCards stats={stats || defaultStats} isLoading={isLoading} />

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
    </div>
  );
}
