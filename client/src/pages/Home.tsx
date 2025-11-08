import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { StatisticsCards } from "@/components/StatisticsCards";
import { FilterSidebar } from "@/components/FilterSidebar";
import { MPGrid } from "@/components/MPGrid";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Scale, ExternalLink, AlertTriangle, Eye } from "lucide-react";
import { Link } from "wouter";
import type { Mp, CourtCase, SprmInvestigation } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

type SortOption = "name" | "attendance-best" | "attendance-worst";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedParties, setSelectedParties] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const { data: mps = [], isLoading: mpsLoading } = useQuery<Mp[]>({
    queryKey: ["/api/mps"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalMps: number;
    partyBreakdown: { party: string; count: number }[];
    genderBreakdown: { gender: string; count: number }[];
    stateCount: number;
    averageAttendanceRate?: number;
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
        mp.constituency.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesParty =
        selectedParties.length === 0 || selectedParties.includes(mp.party);

      const matchesState =
        selectedStates.length === 0 || selectedStates.includes(mp.state);

      return matchesSearch && matchesParty && matchesState;
    });

    // Apply sorting
    if (sortBy === "attendance-best") {
      filtered = [...filtered].sort((a, b) => {
        const rateA = a.totalParliamentDays > 0 ? (a.daysAttended / a.totalParliamentDays) : 0;
        const rateB = b.totalParliamentDays > 0 ? (b.daysAttended / b.totalParliamentDays) : 0;
        return rateB - rateA;
      });
    } else if (sortBy === "attendance-worst") {
      filtered = [...filtered].sort((a, b) => {
        const rateA = a.totalParliamentDays > 0 ? (a.daysAttended / a.totalParliamentDays) : 0;
        const rateB = b.totalParliamentDays > 0 ? (b.daysAttended / b.totalParliamentDays) : 0;
        return rateA - rateB;
      });
    } else {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  }, [mps, searchQuery, selectedParties, selectedStates, sortBy]);

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
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onMenuClick={() => setMobileFiltersOpen(true)}
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
            {/* Page Title */}
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                  Members of Parliament
                </h2>
                {pageViewData && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground" data-testid="page-view-count">
                    <Eye className="w-4 h-4" />
                    <span>{pageViewData.count.toLocaleString()} views</span>
                  </div>
                )}
              </div>
              <p className="text-muted-foreground">
                Browse all {filteredMps.length} of {(stats || defaultStats).totalMps} MPs from Dewan Rakyat
              </p>
            </div>

            {/* SPRM Investigations Section */}
            {!sprmInvestigationsLoading && mpsWithSprmInvestigations.length > 0 && (
              <Card className="border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20" data-testid="sprm-investigations-section">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-900 dark:text-red-100">
                    <AlertTriangle className="h-5 w-5" />
                    MPs with SPRM Investigations
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
                              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    Click on any MP to view detailed SPRM investigation information.
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
                    MPs with Court Cases
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
                                      {ongoingCount} Ongoing
                                    </Badge>
                                  )}
                                  {completedCount > 0 && (
                                    <Badge variant="secondary" className="text-xs" data-testid={`badge-completed-${mp.id}`}>
                                      {completedCount} Completed
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
                    Click on any MP to view detailed court case information with links to news articles from The Star and New Straits Times.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Statistics */}
            <StatisticsCards stats={stats || defaultStats} isLoading={isLoading} />

            {/* MP Grid */}
            <MPGrid mps={filteredMps} isLoading={isLoading} />
          </div>
        </main>
      </div>
    </div>
  );
}
