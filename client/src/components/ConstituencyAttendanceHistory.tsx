import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MapPin, TrendingUp, TrendingDown, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Mp {
  id: string;
  name: string;
  party: string;
  swornInDate: string;
}

interface ConstituencyHistoryData {
  constituency: string;
  state: string;
  currentMps: Mp[];
  totalSessions: number;
  sessionsAttended: number;
  sessionsAbsent: number;
  attendanceRate: number;
}

interface ConstituencyAttendanceHistoryResponse {
  totalConstituencies: number;
  totalSessions: number;
  constituencies: ConstituencyHistoryData[];
}

interface ConstituencyAttendanceHistoryProps {
  startDate?: string;
  endDate?: string;
  selectedParty?: string;
  selectedState?: string;
}

export function ConstituencyAttendanceHistory({
  startDate,
  endDate,
  selectedParty,
  selectedState
}: ConstituencyAttendanceHistoryProps) {
  const [sortBy, setSortBy] = useState<"worst" | "best" | "name">("worst");

  const queryUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (selectedParty && selectedParty !== "all") params.set("party", selectedParty);
    if (selectedState && selectedState !== "all") params.set("state", selectedState);
    const queryString = params.toString();
    return queryString ? `/api/constituencies/attendance-history?${queryString}` : "/api/constituencies/attendance-history";
  }, [startDate, endDate, selectedParty, selectedState]);

  const { data, isLoading } = useQuery<ConstituencyAttendanceHistoryResponse>({
    queryKey: [queryUrl],
  });

  const sortedConstituencies = useMemo(() => {
    if (!data?.constituencies) return [];
    
    const sorted = [...data.constituencies];
    
    if (sortBy === "worst") {
      return sorted.sort((a, b) => a.attendanceRate - b.attendanceRate);
    } else if (sortBy === "best") {
      return sorted.sort((a, b) => b.attendanceRate - a.attendanceRate);
    } else {
      return sorted.sort((a, b) => a.constituency.localeCompare(b.constituency));
    }
  }, [data, sortBy]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading constituency attendance history...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Failed to load constituency attendance history
      </div>
    );
  }

  const avgAttendanceRate = data.constituencies.length > 0
    ? data.constituencies.reduce((sum, c) => sum + c.attendanceRate, 0) / data.constituencies.length
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Total Constituencies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalConstituencies}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Hansard Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalSessions}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Avg Attendance Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgAttendanceRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>All Constituencies</CardTitle>
              <CardDescription>Historical attendance tracking from sworn-in period to present</CardDescription>
            </div>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
              <SelectTrigger data-testid="select-sort-by" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="worst">Worst Attendance First</SelectItem>
                <SelectItem value="best">Best Attendance First</SelectItem>
                <SelectItem value="name">Alphabetical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-3">
              {sortedConstituencies.map((constituency, idx) => {
                const latestMp = constituency.currentMps[0];
                const hasMultipleMps = constituency.currentMps.length > 1;
                
                return (
                  <Card key={constituency.constituency} data-testid={`card-constituency-${idx}`} className="hover-elevate">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <h3 className="font-semibold text-lg">{constituency.constituency}</h3>
                            <Badge variant="outline">{constituency.state}</Badge>
                            {hasMultipleMps && (
                              <Badge variant="secondary" className="text-xs">
                                Multiple MPs
                              </Badge>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            {constituency.currentMps.map((mp, mpIdx) => (
                              <Link key={mp.id} href={`/mp/${mp.id}`}>
                                <div className="flex items-center gap-2 text-sm hover-elevate p-2 rounded-md">
                                  <Badge variant="secondary">{mp.party}</Badge>
                                  <span className="font-medium">{mp.name}</span>
                                  {mpIdx === 0 && (
                                    <Badge variant="outline" className="text-xs">Current</Badge>
                                  )}
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="flex items-center gap-2">
                            {constituency.attendanceRate >= 75 ? (
                              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                            ) : constituency.attendanceRate >= 50 ? (
                              <TrendingUp className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                            )}
                            <span className="text-2xl font-bold">
                              {constituency.attendanceRate.toFixed(1)}%
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground text-right">
                            {constituency.sessionsAttended} / {constituency.totalSessions} sessions
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="text-right">
                              <span className="text-muted-foreground">Attended: </span>
                              <span className="font-medium text-green-600 dark:text-green-400">
                                {constituency.sessionsAttended}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-muted-foreground">Absent: </span>
                              <span className="font-medium text-orange-600 dark:text-orange-400">
                                {constituency.sessionsAbsent}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
