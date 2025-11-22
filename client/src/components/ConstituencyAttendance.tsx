/**
 * Copyright by Calmic Sdn Bhd
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, UserX } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ConstituencyData {
  constituency: string;
  state: string;
  party: string;
  mpName: string;
  mpId: string;
}

interface StateStats {
  state: string;
  total: number;
  attended: number;
  absent: number;
  attendanceRate: number;
}

interface ConstituencyAttendanceData {
  sessionNumber: string;
  sessionDate: string;
  totalConstituencies: number;
  attendedConstituencies: number;
  absentConstituencies: number;
  attendanceRate: number;
  attended: ConstituencyData[];
  absent: ConstituencyData[];
  stateStats: StateStats[];
}

interface ConstituencyAttendanceProps {
  hansardRecordId: string;
  enabled?: boolean;
}

export function ConstituencyAttendance({ hansardRecordId, enabled = true }: ConstituencyAttendanceProps) {
  const { data, isLoading, isError } = useQuery<ConstituencyAttendanceData>({
    queryKey: [`/api/hansard-records/${hansardRecordId}/constituency-attendance`],
    enabled,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading constituency data...</div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Failed to load constituency attendance data
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Constituencies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalConstituencies}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Constituencies Attended
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {data.attendedConstituencies}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Attendance Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.attendanceRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="attended" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="attended" data-testid="tab-attended">
            Attended ({data.attendedConstituencies})
          </TabsTrigger>
          <TabsTrigger value="absent" data-testid="tab-absent">
            Absent ({data.absentConstituencies})
          </TabsTrigger>
          <TabsTrigger value="states" data-testid="tab-states">
            By State
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attended" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-4 h-4" />
                Constituencies Represented
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {data.attended.map((item, idx) => (
                    <div
                      key={`${item.mpId}-${idx}`}
                      data-testid={`constituency-attended-${idx}`}
                      className="flex items-start justify-between gap-2 p-3 rounded-md bg-muted/50"
                    >
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-2">
                          <MapPin className="w-3 h-3" />
                          {item.constituency}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {item.mpName}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {item.state}
                        </div>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {item.party}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="absent" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserX className="w-4 h-4" />
                Constituencies Not Represented
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {data.absent.map((item, idx) => (
                    <div
                      key={`${item.mpId}-${idx}`}
                      data-testid={`constituency-absent-${idx}`}
                      className="flex items-start justify-between gap-2 p-3 rounded-md bg-muted/50"
                    >
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-2">
                          <MapPin className="w-3 h-3" />
                          {item.constituency}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {item.mpName}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {item.state}
                        </div>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {item.party}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="states" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">State Attendance Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {data.stateStats.map((stat, idx) => (
                    <div
                      key={stat.state}
                      data-testid={`state-stat-${idx}`}
                      className="p-3 rounded-md bg-muted/50"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{stat.state}</span>
                        <Badge variant="secondary">{stat.attendanceRate.toFixed(1)}%</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <div className="text-muted-foreground">Total</div>
                          <div className="font-medium">{stat.total}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Attended</div>
                          <div className="font-medium text-green-600 dark:text-green-400">
                            {stat.attended}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Absent</div>
                          <div className="font-medium text-orange-600 dark:text-orange-400">
                            {stat.absent}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
