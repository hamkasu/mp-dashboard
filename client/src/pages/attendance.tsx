import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "wouter";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, ChevronDown, ChevronUp, UserX, Users, TrendingDown, MapPin } from "lucide-react";
import type { Mp } from "@shared/schema";
import { ConstituencyAttendance } from "@/components/ConstituencyAttendance";

interface AttendanceSession {
  id: string;
  sessionNumber: string;
  sessionDate: string;
  parliamentTerm: string;
  sitting: string;
  totalAbsent: number;
  totalSpeakers: number;
  attendanceRate: number;
  absentMps: Array<{
    id: string;
    name: string;
    party: string;
    state: string;
    constituency: string;
  }>;
}

interface AttendanceReport {
  summary: {
    totalSessions: number;
    averageAbsent: number;
    averageAttendanceRate: number;
    totalMpsTracked: number;
  };
  sessions: AttendanceSession[];
}

export default function AttendancePage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedParty, setSelectedParty] = useState("all");
  const [selectedState, setSelectedState] = useState("all");
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("mp");

  const { data: allMps } = useQuery<Mp[]>({
    queryKey: ["/api/mps"],
  });

  const parties = useMemo(() => {
    if (!allMps) return [];
    const uniqueParties = Array.from(new Set(allMps.map(mp => mp.party)));
    return uniqueParties.sort();
  }, [allMps]);

  const states = useMemo(() => {
    if (!allMps) return [];
    const uniqueStates = Array.from(new Set(allMps.map(mp => mp.state)));
    return uniqueStates.sort();
  }, [allMps]);

  const queryUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (selectedParty !== "all") params.set("party", selectedParty);
    if (selectedState !== "all") params.set("state", selectedState);
    const queryString = params.toString();
    return queryString ? `/api/attendance/report?${queryString}` : "/api/attendance/report";
  }, [startDate, endDate, selectedParty, selectedState]);

  const { data: report, isLoading } = useQuery<AttendanceReport>({
    queryKey: [queryUrl],
  });

  const toggleSession = (sessionId: string) => {
    setExpandedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSelectedParty("all");
    setSelectedState("all");
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading attendance report...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">MP Attendance Report</h1>
        <p className="text-muted-foreground mt-2">
          Track which MPs did not participate in parliamentary sessions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Filter Options
          </CardTitle>
          <CardDescription>Filter by date range, party, or state</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex gap-2">
              <Input
                data-testid="input-start-date"
                type="date"
                placeholder="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
              <Input
                data-testid="input-end-date"
                type="date"
                placeholder="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            <Select value={selectedParty} onValueChange={setSelectedParty}>
              <SelectTrigger data-testid="select-party" className="w-40">
                <SelectValue placeholder="All Parties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Parties</SelectItem>
                {parties.map(party => (
                  <SelectItem key={party} value={party}>{party}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger data-testid="select-state" className="w-40">
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {states.map(state => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              data-testid="button-clear-filters"
              variant="outline"
              onClick={clearFilters}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.summary.totalSessions}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Constituency Absent</CardTitle>
                <UserX className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(report.summary.averageAbsent)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Attendance Rate</CardTitle>
                <TrendingDown className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(report.summary.averageAttendanceRate)}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">MPs Tracked</CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.summary.totalMpsTracked}</div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="mp" data-testid="tab-mp-view">
                <Users className="w-4 h-4 mr-2" />
                By MP
              </TabsTrigger>
              <TabsTrigger value="constituency" data-testid="tab-constituency-view">
                <MapPin className="w-4 h-4 mr-2" />
                By Constituency
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mp" className="mt-6 space-y-4">
              <h2 className="text-2xl font-bold">{report.sessions.length} Sessions Found</h2>

              {report.sessions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No sessions found with the selected filters.</p>
                  </CardContent>
                </Card>
              ) : (
                report.sessions.map(session => {
                  const isExpanded = expandedSessions.has(session.id);
                  return (
                    <Card key={session.id}>
                      <Collapsible open={isExpanded} onOpenChange={() => toggleSession(session.id)}>
                        <CardHeader className="hover-elevate">
                          <CollapsibleTrigger data-testid={`collapsible-session-${session.id}`} className="flex items-start justify-between w-full text-left">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <CardTitle className="text-xl">{session.sessionNumber}</CardTitle>
                                <Badge variant="secondary" data-testid={`badge-session-date-${session.id}`}>
                                  {format(new Date(session.sessionDate), "MMM dd, yyyy")}
                                </Badge>
                                <Badge variant="outline">{session.sitting}</Badge>
                              </div>
                              <CardDescription className="mt-2">
                                {session.totalAbsent} MPs absent • {session.totalSpeakers} speakers • {Math.round(session.attendanceRate)}% attendance rate
                              </CardDescription>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            )}
                          </CollapsibleTrigger>
                        </CardHeader>
                        <CollapsibleContent>
                          <CardContent className="pt-0">
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm text-muted-foreground">Absent MPs ({session.totalAbsent})</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {session.absentMps.map(mp => (
                                  <Link
                                    key={mp.id}
                                    href={`/mp/${mp.id}`}
                                    data-testid={`link-absent-mp-${mp.id}`}
                                  >
                                    <Card className="hover-elevate">
                                      <CardContent className="p-3">
                                        <div className="font-medium">{mp.name}</div>
                                        <div className="text-sm text-muted-foreground">
                                          {mp.party} • {mp.constituency}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="constituency" className="mt-6 space-y-4">
              <h2 className="text-2xl font-bold">Constituency Attendance by Session</h2>

              {report.sessions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No sessions found with the selected filters.</p>
                  </CardContent>
                </Card>
              ) : (
                report.sessions.map(session => {
                  const isExpanded = expandedSessions.has(`constituency-${session.id}`);
                  return (
                    <Card key={`constituency-${session.id}`}>
                      <Collapsible open={isExpanded} onOpenChange={() => toggleSession(`constituency-${session.id}`)}>
                        <CardHeader className="hover-elevate">
                          <CollapsibleTrigger data-testid={`collapsible-constituency-${session.id}`} className="flex items-start justify-between w-full text-left">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <CardTitle className="text-xl">{session.sessionNumber}</CardTitle>
                                <Badge variant="secondary">
                                  {format(new Date(session.sessionDate), "MMM dd, yyyy")}
                                </Badge>
                                <Badge variant="outline">{session.sitting}</Badge>
                              </div>
                              <CardDescription className="mt-2">
                                Click to view constituency attendance breakdown
                              </CardDescription>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            )}
                          </CollapsibleTrigger>
                        </CardHeader>
                        <CollapsibleContent>
                          <CardContent className="pt-0">
                            <ConstituencyAttendance 
                              hansardRecordId={session.id} 
                              enabled={activeTab === 'constituency' && isExpanded}
                            />
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
    </>
  );
}
