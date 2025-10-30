import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { StatisticsCards } from "@/components/StatisticsCards";
import { FilterSidebar } from "@/components/FilterSidebar";
import { MPGrid } from "@/components/MPGrid";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { Mp } from "@shared/schema";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedParties, setSelectedParties] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const { data: mps = [], isLoading: mpsLoading } = useQuery<Mp[]>({
    queryKey: ["/api/mps"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalMps: number;
    partyBreakdown: { party: string; count: number }[];
    genderBreakdown: { gender: string; count: number }[];
    stateCount: number;
  }>({
    queryKey: ["/api/stats"],
  });

  const isLoading = mpsLoading || statsLoading;

  // Filter MPs
  const filteredMps = useMemo(() => {
    return mps.filter((mp) => {
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
  }, [mps, searchQuery, selectedParties, selectedStates]);

  const availableStates = useMemo(() => {
    const states = Array.from(new Set(mps.map((mp) => mp.state)));
    return states.sort();
  }, [mps]);

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
            onPartyToggle={handlePartyToggle}
            onStateToggle={handleStateToggle}
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
              onPartyToggle={handlePartyToggle}
              onStateToggle={handleStateToggle}
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
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                Members of Parliament
              </h2>
              <p className="text-muted-foreground">
                Browse all {filteredMps.length} of {(stats || defaultStats).totalMps} MPs from Dewan Rakyat
              </p>
            </div>

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
