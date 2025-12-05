/**
 * Copyright by Calmic Sdn Bhd
 */

import { Users, Flag, UserCircle, MapPin, Calendar, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Statistics {
  totalMps: number;
  partyBreakdown: { party: string; count: number }[];
  genderBreakdown: { gender: string; count: number }[];
  stateCount: number;
  averageAttendanceRate?: number;
}

interface FilteredStatistics {
  totalMps: number;
  genderBreakdown: { gender: string; count: number }[];
  stateCount: number;
  averageAttendanceRate?: number;
}

interface StatisticsCardsProps {
  stats: Statistics;
  filteredStats?: FilteredStatistics | null;
  isLoading?: boolean;
  hasPartyFilter?: boolean;
}

export function StatisticsCards({ stats, filteredStats, isLoading, hasPartyFilter = false }: StatisticsCardsProps) {
  if (isLoading) {
    const skeletonCount = hasPartyFilter ? 3 : 5;
    const gridCols = hasPartyFilter ? "lg:grid-cols-3" : "lg:grid-cols-5";
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 ${gridCols} gap-4 md:gap-6`}>
        {Array.from({ length: skeletonCount }, (_, i) => i + 1).map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-4 w-4 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted rounded mb-1" />
              <div className="h-3 w-24 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Define government coalition parties (Unity Government)
  const governmentParties = ['PH', 'BN', 'GPS', 'GRS', 'WARISAN', 'UPKO', 'PBRS', 'STAR'];

  // Calculate government vs opposition MPs
  const governmentMps = stats.partyBreakdown
    .filter(p => governmentParties.includes(p.party.toUpperCase()))
    .reduce((sum, p) => sum + p.count, 0);

  const oppositionMps = stats.totalMps - governmentMps;

  // Use filtered stats when available (party/state filter active), otherwise use global stats
  const activeStats = hasPartyFilter && filteredStats ? filteredStats : stats;

  const femaleCount = activeStats.genderBreakdown.find((g) => g.gender === "Female")?.count ?? 0;
  const totalForPercentage = activeStats.totalMps;
  const femalePercentage = totalForPercentage > 0 ? ((femaleCount / totalForPercentage) * 100).toFixed(1) : "0.0";

  const stateCount = activeStats.stateCount;

  const attendanceRate = activeStats.averageAttendanceRate ?? 0;
  const getAttendanceColor = (rate: number) => {
    if (rate >= 85) return "text-green-600 dark:text-green-400";
    if (rate >= 70) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const gridCols = hasPartyFilter ? "lg:grid-cols-3" : "lg:grid-cols-5";

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 ${gridCols} gap-4 md:gap-6`}>
      {!hasPartyFilter && (
        <Card data-testid="card-total-mps">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total MPs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl md:text-4xl font-bold" data-testid="text-total-mps">
              {stats.totalMps}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Members of Parliament
            </p>
          </CardContent>
        </Card>
      )}

      {!hasPartyFilter && (
        <Card data-testid="card-party-breakdown">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coalition Numbers</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl md:text-4xl font-bold">
              {governmentMps}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Government {governmentMps} MPs
            </p>
            <p className="text-xs text-muted-foreground">
              Opposition {oppositionMps} MPs
            </p>
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-gender-stats">
        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gender Diversity</CardTitle>
          <UserCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl md:text-4xl font-bold">{femaleCount}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Female MPs ({femalePercentage}%)
          </p>
        </CardContent>
      </Card>

      <Card data-testid="card-state-coverage">
        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">State Coverage</CardTitle>
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl md:text-4xl font-bold">{stateCount}</div>
          <p className="text-xs text-muted-foreground mt-1">
            States & Territories
          </p>
        </CardContent>
      </Card>

      <Card data-testid="card-attendance">
        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
          <div className="flex items-center gap-1">
            <CardTitle className="text-sm font-medium">Avg Attendance</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <button data-testid="button-avg-attendance-info">
                  <Info className="h-3 w-3 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Average attendance rate across {hasPartyFilter ? "selected party" : "all"} MPs, calculated from parliamentary sitting days attended vs. total sitting days.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {activeStats.averageAttendanceRate !== undefined ? (
            <>
              <div className={`text-3xl md:text-4xl font-bold ${getAttendanceColor(attendanceRate)}`} data-testid="text-avg-attendance">
                {attendanceRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Parliament attendance
              </p>
              <p className="text-xs text-muted-foreground italic mt-2" data-testid="text-avg-attendance-source">
                Source: Parliament Records
              </p>
            </>
          ) : (
            <>
              <div className="text-3xl md:text-4xl font-bold text-muted-foreground">—</div>
              <p className="text-xs text-muted-foreground mt-1">
                Loading...
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
