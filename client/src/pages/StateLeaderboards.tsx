/**
 * Phase 4: State Leaderboards
 * Shows top performing MPs by state
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageMeta } from "@/components/PageMeta";
import { Trophy, MapPin, TrendingUp } from "lucide-react";
import { MALAYSIAN_STATES } from "@/lib/constants";

interface ScoreBreakdown {
  attendanceScore: number;
  participationScore: number;
  conductScore: number;
  constituencyScore: number;
  overallScore: number;
  grade: string;
}

interface StateMemberData {
  mpId: string;
  name: string;
  party: string;
  state: string;
  coalition?: string | null;
  global: ScoreBreakdown;
  statePercentile?: ScoreBreakdown;
}

interface StateStats {
  state: string;
  memberCount: number;
  averageScore: number;
  topScore: number;
  gradeDistribution: { A: number; B: number; C: number; D: number; F: number };
}

export default function StateLeaderboards() {
  const [selectedState, setSelectedState] = useState<string | null>(null);

  // Fetch all report cards with state percentiles
  const { data: cardsData, isLoading } = useQuery<{ total: number; data: StateMemberData[] }>({
    queryKey: ["/api/report-cards/percentiles/coalition-state"],
  });

  // Calculate state statistics
  const stateStats = useMemo(() => {
    if (!cardsData?.data) return [];

    const stateMap = new Map<string, StateMemberData[]>();

    // Group MPs by state
    for (const member of cardsData.data) {
      const state = member.state;
      if (!stateMap.has(state)) {
        stateMap.set(state, []);
      }
      stateMap.get(state)!.push(member);
    }

    // Calculate stats for each state
    const stats: StateStats[] = Array.from(stateMap.entries()).map(([state, members]) => {
      const scores = members.map(m => m.global.overallScore);
      const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      const topScore = Math.max(...scores);

      const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
      members.forEach(m => {
        gradeDistribution[m.global.grade as keyof typeof gradeDistribution]++;
      });

      return {
        state,
        memberCount: members.length,
        averageScore: avgScore,
        topScore,
        gradeDistribution,
      };
    });

    return stats.sort((a, b) => b.averageScore - a.averageScore);
  }, [cardsData]);

  // Members of selected state
  const selectedStateMembers = useMemo(() => {
    if (!selectedState || !cardsData?.data) return [];
    return cardsData.data
      .filter(m => m.state === selectedState)
      .sort((a, b) => b.global.overallScore - a.global.overallScore);
  }, [selectedState, cardsData]);

  // State comparison chart data
  const stateChartData = useMemo(() => {
    return stateStats.slice(0, 10).map(stat => ({
      state: stat.state.substring(0, 3),
      average: stat.averageScore,
      top: stat.topScore,
      members: stat.memberCount,
    }));
  }, [stateStats]);

  // Grade distribution chart data for selected state
  const gradeChartData = useMemo(() => {
    if (!selectedState) return [];
    const stat = stateStats.find(s => s.state === selectedState);
    if (!stat) return [];

    return [
      { grade: 'A', count: stat.gradeDistribution.A },
      { grade: 'B', count: stat.gradeDistribution.B },
      { grade: 'C', count: stat.gradeDistribution.C },
      { grade: 'D', count: stat.gradeDistribution.D },
      { grade: 'F', count: stat.gradeDistribution.F },
    ].filter(g => g.count > 0);
  }, [selectedState, stateStats]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PageMeta
        title="State Leaderboards"
        description="View top performing MPs by Malaysian state"
      />
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-gray-900">State Performance Leaderboards</h1>
          <p className="text-lg text-gray-600">
            Compare MP performance metrics by state and discover top performers in your region
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">State Overview</TabsTrigger>
            <TabsTrigger value="ranking">State Rankings</TabsTrigger>
            <TabsTrigger value="leaderboard">State Leaderboard</TabsTrigger>
          </TabsList>

          {/* State Overview */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Top 10 States by Average Performance</CardTitle>
                <CardDescription>Average MP scores by state</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={stateChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="state" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip
                      formatter={(value) => [`${value}`, '']}
                      labelFormatter={(label) => `State: ${label}`}
                    />
                    <Legend />
                    <Bar dataKey="average" fill="#3b82f6" name="Average Score" />
                    <Bar dataKey="top" fill="#10b981" name="Top Score" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stateStats.slice(0, 6).map((stat) => (
                <Card
                  key={stat.state}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedState === stat.state ? "ring-2 ring-blue-500" : ""
                  }`}
                  onClick={() => setSelectedState(stat.state)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        {stat.state}
                      </CardTitle>
                      <Badge className="bg-blue-500 text-white">{stat.averageScore}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm">
                      <p className="text-gray-600">Members: <span className="font-bold text-gray-900">{stat.memberCount}</span></p>
                      <p className="text-gray-600">Top Score: <span className="font-bold text-gray-900">{stat.topScore}</span></p>
                    </div>

                    <div className="flex gap-1">
                      {Object.entries(stat.gradeDistribution).map(([grade, count]) =>
                        count > 0 && (
                          <Badge key={grade} variant="outline" className="text-xs">
                            {grade}: {count}
                          </Badge>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* State Rankings */}
          <TabsContent value="ranking" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>All States Ranked by Average Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-center w-12">Rank</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead className="text-center">Members</TableHead>
                        <TableHead className="text-right">Avg Score</TableHead>
                        <TableHead className="text-right">Top Score</TableHead>
                        <TableHead>Grade Distribution</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stateStats.map((stat, idx) => (
                        <TableRow
                          key={stat.state}
                          className="cursor-pointer hover:bg-blue-50"
                          onClick={() => setSelectedState(stat.state)}
                        >
                          <TableCell className="text-center font-bold">
                            {idx === 0 && "🥇"}
                            {idx === 1 && "🥈"}
                            {idx === 2 && "🥉"}
                            {idx > 2 && idx + 1}
                          </TableCell>
                          <TableCell className="font-medium">{stat.state}</TableCell>
                          <TableCell className="text-center">{stat.memberCount}</TableCell>
                          <TableCell className="text-right font-bold text-blue-700">
                            {stat.averageScore}
                          </TableCell>
                          <TableCell className="text-right font-bold text-green-700">
                            {stat.topScore}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {Object.entries(stat.gradeDistribution).map(([grade, count]) =>
                                count > 0 && (
                                  <Badge key={grade} variant="outline" className="text-xs">
                                    {grade}: {count}
                                  </Badge>
                                )
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* State Leaderboard */}
          <TabsContent value="leaderboard" className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <label className="text-sm font-medium text-gray-700">Select State:</label>
              <Select value={selectedState || ""} onValueChange={setSelectedState}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Choose a state..." />
                </SelectTrigger>
                <SelectContent>
                  {MALAYSIAN_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedState && gradeChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Grade Distribution - {selectedState}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={gradeChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="grade" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" name="Number of MPs" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {selectedState && selectedStateMembers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    {selectedState} MP Leaderboard
                  </CardTitle>
                  <CardDescription>Top performers by overall score</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-center w-12">Rank</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Party</TableHead>
                          <TableHead className="text-right">Global Score</TableHead>
                          <TableHead className="text-right">State Score</TableHead>
                          <TableHead className="text-center">Attendance</TableHead>
                          <TableHead className="text-center">Participation</TableHead>
                          <TableHead className="text-center">Conduct</TableHead>
                          <TableHead className="text-center">Grade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedStateMembers.map((member, idx) => (
                          <TableRow key={member.mpId} className="hover:bg-gray-50">
                            <TableCell className="text-center font-bold">
                              {idx === 0 && "🥇"}
                              {idx === 1 && "🥈"}
                              {idx === 2 && "🥉"}
                              {idx > 2 && idx + 1}
                            </TableCell>
                            <TableCell className="font-medium">{member.name}</TableCell>
                            <TableCell>{member.party}</TableCell>
                            <TableCell className="text-right font-bold text-blue-700">
                              {member.global.overallScore}
                            </TableCell>
                            <TableCell className="text-right font-bold text-green-700">
                              {member.statePercentile?.overallScore || '-'}
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              <Badge variant="outline">{member.global.attendanceScore}</Badge>
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              <Badge variant="outline">{member.global.participationScore}</Badge>
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              <Badge variant="outline">{member.global.conductScore}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={
                                member.global.grade === 'A' ? 'bg-green-500' :
                                member.global.grade === 'B' ? 'bg-blue-500' :
                                member.global.grade === 'C' ? 'bg-yellow-500' :
                                member.global.grade === 'D' ? 'bg-orange-500' :
                                'bg-red-500'
                              }>
                                {member.global.grade}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {!selectedState && (
              <Card className="text-center py-12">
                <p className="text-gray-600">Select a state to view the leaderboard</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
