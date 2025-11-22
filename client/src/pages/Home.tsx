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
import { Scale, ExternalLink, AlertTriangle, Eye } from "lucide-react";
import { Link } from "wouter";
import type { Mp, CourtCase, SprmInvestigation, LegislativeProposal } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useConstituencies } from "@/hooks/use-constituencies";

type SortOption = "name" | "attendance-best" | "attendance-worst" | "speeches-most" | "speeches-fewest" | "poverty-highest" | "poverty-lowest" | "bills-raised";

export default function Home() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedParties, setSelectedParties] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);

  const { data: mps = [], isLoading: mpsLoading } = useQuery<Mp[]>({
    queryKey: ["/api/mps"],
  });

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

  const { data: courtCases = [], isLoading: courtCasesLoading } = useQuery<CourtCase[]>({
    queryKey: ["/api/court-cases"],
  });

  const { data: sprmInvestigations = [], isLoading: sprmInvestigationsLoading } = useQuery<SprmInvestigation[]>({
    queryKey: ["/api/sprm-investigations"],
  });
  
  const { data: pageViewData } = useQuery<{ count: number }>({
    queryKey: ["/api/page-views", "home"],
  });

  // Fetch constituency data for poverty sorting
  const { data: constituencies = [] } = useConstituencies();

  // Fetch legislative proposals for bills sorting
  const { data: legislativeProposals = [] } = useQuery<LegislativeProposal[]>({
    queryKey: ["/api/legislative-proposals"],
  });

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

  // Filter and sort MPs
  const filteredMps = useMemo(() => {
    let filtered = mps.filter((mp) => {
      const matchesSearch =
        searchQuery === "" ||
        mp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mp.constituency.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (mp.parliamentCode ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (mp.state ?? "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesParty =
        selectedParties.length === 0 || selectedParties.includes(mp.party);

      const matchesState =
        selectedStates.length === 0 || selectedStates.includes(mp.state);

      return matchesSearch && matchesParty && matchesState;
    });

    // Apply sorting
    if (sortBy === "attendance-best") {
      filtered = [...filtered].sort((a, b) => {
        // Use Hansard-based attendance if available
        const totalA = (a as any).totalHansardSessions ?? a.totalParliamentDays;
        const attendedA = (a as any).hansardSessionsAttended ?? a.daysAttended;
        const totalB = (b as any).totalHansardSessions ?? b.totalParliamentDays;
        const attendedB = (b as any).hansardSessionsAttended ?? b.daysAttended;
        
        const rateA = totalA > 0 ? (attendedA / totalA) : 0;
        const rateB = totalB > 0 ? (attendedB / totalB) : 0;
        return rateB - rateA;
      });
    } else if (sortBy === "attendance-worst") {
      filtered = [...filtered].sort((a, b) => {
        // Use Hansard-based attendance if available
        const totalA = (a as any).totalHansardSessions ?? a.totalParliamentDays;
        const attendedA = (a as any).hansardSessionsAttended ?? a.daysAttended;
        const totalB = (b as any).totalHansardSessions ?? b.totalParliamentDays;
        const attendedB = (b as any).hansardSessionsAttended ?? b.daysAttended;
        
        const rateA = totalA > 0 ? (attendedA / totalA) : 0;
        const rateB = totalB > 0 ? (attendedB / totalB) : 0;
        return rateA - rateB;
      });
    } else if (sortBy === "speeches-most") {
      filtered = [...filtered].sort((a, b) => {
        return b.totalSpeechInstances - a.totalSpeechInstances;
      });
    } else if (sortBy === "speeches-fewest") {
      filtered = [...filtered].sort((a, b) => {
        return a.totalSpeechInstances - b.totalSpeechInstances;
      });
    } else if (sortBy === "poverty-highest") {
      filtered = [...filtered].sort((a, b) => {
        // Normalize code format: P210 -> P.210
        const codeA = a.parliamentCode.replace(/^P(\d+)$/, (_, num) => `P.${num.padStart(3, '0')}`);
        const codeB = b.parliamentCode.replace(/^P(\d+)$/, (_, num) => `P.${num.padStart(3, '0')}`);
        const povertyA = povertyByCode.get(codeA) ?? -1;
        const povertyB = povertyByCode.get(codeB) ?? -1;
        return povertyB - povertyA; // Highest first
      });
    } else if (sortBy === "poverty-lowest") {
      filtered = [...filtered].sort((a, b) => {
        // Normalize code format: P210 -> P.210
        const codeA = a.parliamentCode.replace(/^P(\d+)$/, (_, num) => `P.${num.padStart(3, '0')}`);
        const codeB = b.parliamentCode.replace(/^P(\d+)$/, (_, num) => `P.${num.padStart(3, '0')}`);
        const povertyA = povertyByCode.get(codeA) ?? Infinity;
        const povertyB = povertyByCode.get(codeB) ?? Infinity;
        return povertyA - povertyB; // Lowest first
      });
    } else if (sortBy === "bills-raised") {
      filtered = [...filtered].sort((a, b) => {
        const billsA = billsCountByMpId.get(a.id) ?? 0;
        const billsB = billsCountByMpId.get(b.id) ?? 0;
        return billsB - billsA; // Most bills first
      });
    } else {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  }, [mps, searchQuery, selectedParties, selectedStates, sortBy, povertyByCode, billsCountByMpId]);

  const availableStates = useMemo(() => {
    const states = Array.from(new Set(mps.map((mp) => mp.state)));
    return states.sort();
  }, [mps]);

  const mpsWithCourtCases = useMemo(() => {
    if (!courtCases.length || !mps.length) return [];
    
    const mpIdsWithCases = new Set(courtCases.map(c => c.mpId));
    return mps.filter(mp => mpIdsWithCases.has(mp.id));
  }, [mps, courtCases]);

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

  const handleClearFilters = () => {
    setSelectedParties([]);
    setSelectedStates([]);
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
            onPartyToggle={handlePartyToggle}
            onStateToggle={handleStateToggle}
            onSortChange={setSortBy}
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
              onPartyToggle={handlePartyToggle}
              onStateToggle={handleStateToggle}
              onSortChange={setSortBy}
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
                {pageViewData && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground" data-testid="page-view-count">
                    <Eye className="w-4 h-4" />
                    <span>{pageViewData.count.toLocaleString()} views</span>
                  </div>
                )}
              </div>
              <p className="text-muted-foreground">
                {filteredMps.length} {t('common.of')} {(stats || defaultStats).totalMps} {t('nav.mps')}
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
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-900 dark:text-red-100">
                    <AlertTriangle className="h-5 w-5" />
                    {t('nav.mps')} {t('profile.sprmInvestigations')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {mpsWithSprmInvestigations.map((mp) => {
                      const mpInvestigations = sprmInvestigations.filter(i => i.mpId === mp.id);
                      const ongoingCount = mpInvestigations.filter(i => i.status === "Ongoing").length;
                      const completedCount = mpInvestigations.filter(i => i.status === "Completed").length;

                      return (
                        <Link key={mp.id} href={`/mp/${mp.id}`} data-testid={`sprm-investigation-mp-${mp.id}`}>
                          <div className="group cursor-pointer rounded-lg border bg-card p-4 hover:bg-accent transition-colors">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-12 w-12 shrink-0">
                                <AvatarImage src={mp.photoUrl || undefined} alt={mp.name} />
                                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                  {mp.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors truncate">
                                  {mp.name}
                                </h4>
                                <div className="flex items-center gap-2 mb-2">
                                  <p className="text-xs text-muted-foreground">{mp.party}</p>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {ongoingCount > 0 && (
                                    <Badge variant="destructive" className="text-xs" data-testid={`badge-sprm-ongoing-${mp.id}`}>
                                      {ongoingCount} {t('profile.ongoing')}
                                    </Badge>
                                  )}
                                  {completedCount > 0 && (
                                    <Badge variant="secondary" className="text-xs" data-testid={`badge-sprm-completed-${mp.id}`}>
                                      {completedCount} {t('profile.completed')}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    {t('profile.sprmInvestigations')}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Court Cases Section */}
            {!courtCasesLoading && mpsWithCourtCases.length > 0 && (
              <Card className="border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20" data-testid="court-cases-section">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-900 dark:text-red-100">
                    <Scale className="h-5 w-5" />
                    {t('nav.mps')} {t('profile.courtCases')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {mpsWithCourtCases.map((mp) => {
                      const mpCases = courtCases.filter(c => c.mpId === mp.id);
                      const ongoingCount = mpCases.filter(c => c.status === "Ongoing").length;
                      const completedCount = mpCases.filter(c => c.status === "Completed").length;

                      return (
                        <Link key={mp.id} href={`/mp/${mp.id}`} data-testid={`court-case-mp-${mp.id}`}>
                          <div className="group cursor-pointer rounded-lg border bg-card p-4 hover:bg-accent transition-colors">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-12 w-12 shrink-0">
                                <AvatarImage src={mp.photoUrl || undefined} alt={mp.name} />
                                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                  {mp.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors truncate">
                                  {mp.name}
                                </h4>
                                <div className="flex items-center gap-2 mb-2">
                                  <p className="text-xs text-muted-foreground">{mp.party}</p>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {ongoingCount > 0 && (
                                    <Badge variant="destructive" className="text-xs" data-testid={`badge-ongoing-${mp.id}`}>
                                      {ongoingCount} {t('profile.ongoing')}
                                    </Badge>
                                  )}
                                  {completedCount > 0 && (
                                    <Badge variant="secondary" className="text-xs" data-testid={`badge-completed-${mp.id}`}>
                                      {completedCount} {t('profile.completed')}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    {t('profile.courtCases')}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Statistics */}
            <StatisticsCards stats={stats || defaultStats} isLoading={isLoading} />

            {/* MP Grid */}
            <MPGrid mps={filteredMps} isLoading={isLoading} billsByMpId={billsByMpId} />
          </div>
        </main>
      </div>
    </div>
  );
}
