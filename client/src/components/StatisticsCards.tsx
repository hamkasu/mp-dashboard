import { Users, Flag, UserCircle, MapPin, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Statistics {
  totalMps: number;
  partyBreakdown: { party: string; count: number }[];
  genderBreakdown: { gender: string; count: number }[];
  stateCount: number;
  averageAttendanceRate?: number;
}

interface StatisticsCardsProps {
  stats: Statistics;
  isLoading?: boolean;
}

export function StatisticsCards({ stats, isLoading }: StatisticsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
        {[1, 2, 3, 4, 5].map((i) => (
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

  const topParties = [...stats.partyBreakdown]
    .sort((a, b) => b.count - a.count)
    .slice(0, 2);

  const femaleCount = stats.genderBreakdown.find((g) => g.gender === "Female")?.count || 0;
  const femalePercentage = ((femaleCount / stats.totalMps) * 100).toFixed(1);
  
  const attendanceRate = stats.averageAttendanceRate || 0;
  const getAttendanceColor = (rate: number) => {
    if (rate >= 85) return "text-green-600 dark:text-green-400";
    if (rate >= 70) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
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

      <Card data-testid="card-party-breakdown">
        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Party Breakdown</CardTitle>
          <Flag className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl md:text-4xl font-bold">
            {stats.partyBreakdown.length}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {topParties.map((p) => `${p.party} (${p.count})`).join(", ")}
          </p>
        </CardContent>
      </Card>

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
          <div className="text-3xl md:text-4xl font-bold">{stats.stateCount}</div>
          <p className="text-xs text-muted-foreground mt-1">
            States & Territories
          </p>
        </CardContent>
      </Card>

      <Card data-testid="card-attendance">
        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Attendance</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {stats.averageAttendanceRate !== undefined ? (
            <>
              <div className={`text-3xl md:text-4xl font-bold ${getAttendanceColor(attendanceRate)}`} data-testid="text-avg-attendance">
                {attendanceRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Parliament attendance
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
