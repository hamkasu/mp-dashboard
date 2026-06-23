/**
 * Phase 4: Coalition Comparison Dashboard
 * Shows performance breakdown by political coalition
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageMeta } from "@/components/PageMeta";
import { Users, TrendingUp, Award, Target } from "lucide-react";

interface ScoreBreakdown {
  attendanceScore: number;
  participationScore: number;
  conductScore: number;
  constituencyScore: number;
  overallScore: number;
  grade: string;
}

interface CoalitionMemberData {
  mpId: string;
  name: string;
  party: string;
  state: string;
  coalition: string;
  global: ScoreBreakdown;
  coalitionPercentile?: ScoreBreakdown;
  statePercentile?: ScoreBreakdown;
}

interface CoalitionStats {
  name: string;
  code: string;
  memberCount: number;
  averageScore: number;
  topPerformer: string;
  bottomPerformer: string;
  gradeDistribution: { A: number; B: number; C: number; D: number; F: number };
  averageAttendance: number;
  averageParticipation: number;
  averageConduct: number;
  averageConstituency: number;
}

export default function CoalitionComparison() {
  const [selectedCoalition, setSelectedCoalition] = useState<string | null>(null);

  // Fetch all report cards with coalition/state percentiles
  const { data: cardsData, isLoading } = useQuery<{ total: number; data: CoalitionMemberData[] }>({
    queryKey: ["/api/report-cards/percentiles/coalition-state"],
  });

  // Calculate coalition statistics
  const coalitionStats = useMemo(() => {
    if (!cardsData?.data) return [];

    const coalitionMap = new Map<string, CoalitionMemberData[]>();

    // Group MPs by coalition
    for (const member of cardsData.data) {
      const coalition = member.coalition || "Unassigned";
      if (!coalitionMap.has(coalition)) {
        coalitionMap.set(coalition, []);
      }
      coalitionMap.get(coalition)!.push(member);
    }

    // Calculate stats for each coalition
    const stats: CoalitionStats[] = Array.from(coalitionMap.entries()).map(
      ([coalition, members]) => {
        const scores = members.map(m => m.global.overallScore);
        const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

        const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
        members.forEach(m => {
          gradeDistribution[m.global.grade as keyof typeof gradeDistribution]++;
        });

        const topPerformer = members.reduce((a, b) =>
          a.global.overallScore > b.global.overallScore ? a : b
        );
        const bottomPerformer = members.reduce((a, b) =>
          a.global.overallScore < b.global.overallScore ? a : b
        );

        const avgAttendance = Math.round(
          members.reduce((sum, m) => sum + m.global.attendanceScore, 0) / members.length
        );
        const avgParticipation = Math.round(
          members.reduce((sum, m) => sum + m.global.participationScore, 0) / members.length
        );
        const avgConduct = Math.round(
          members.reduce((sum, m) => sum + m.global.conductScore, 0) / members.length
        );
        const avgConstituency = Math.round(
          members.reduce((sum, m) => sum + m.global.constituencyScore, 0) / members.length
        );

        return {
          name: coalition,
          code: coalition.substring(0, 2).toUpperCase(),
          memberCount: members.length,
          averageScore: avgScore,
          topPerformer: topPerformer.name,
          bottomPerformer: bottomPerformer.name,
          gradeDistribution,
          averageAttendance: avgAttendance,
          averageParticipation: avgParticipation,
          averageConduct: avgConduct,
          averageConstituency: avgConstituency,
        };
      }
    );

    return stats.sort((a, b) => b.averageScore - a.averageScore);
  }, [cardsData]);

  // Chart data for coalition comparison
  const comparisonChartData = useMemo(() => {
    return coalitionStats.map(stat => ({
      coalition: stat.code,
      attendance: stat.averageAttendance,
      participation: stat.averageParticipation,
      conduct: stat.averageConduct,
      constituency: stat.averageConstituency,
    }));
  }, [coalitionStats]);

  // Radar chart data
  const radarData = useMemo(() => {
    if (!selectedCoalition) return [];
    const stat = coalitionStats.find(s => s.name === selectedCoalition);
    if (!stat) return [];

    return [
      { metric: "Attendance", value: stat.averageAttendance },
      { metric: "Participation", value: stat.averageParticipation },
      { metric: "Conduct", value: stat.averageConduct },
      { metric: "Constituency", value: stat.averageConstituency },
    ];
  }, [selectedCoalition, coalitionStats]);

  // Members of selected coalition
  const selectedCoalitionMembers = useMemo(() => {
    if (!selectedCoalition || !cardsData?.data) return [];
    return cardsData.data
      .filter(m => m.coalition === selectedCoalition)
      .sort((a, b) => b.global.overallScore - a.global.overallScore);
  }, [selectedCoalition, cardsData]);

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
        title="Coalition Comparison"
        description="Compare political coalition performance metrics"
      />
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-gray-900">Coalition Performance Comparison</h1>
          <p className="text-lg text-gray-600">
            Compare how political coalitions stack up across all performance metrics
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="comparison">Score Comparison</TabsTrigger>
            <TabsTrigger value="details">Coalition Details</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {coalitionStats.map((stat) => (
                <Card
                  key={stat.name}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedCoalition === stat.name ? "ring-2 ring-blue-500" : ""
                  }`}
                  onClick={() => setSelectedCoalition(stat.name)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{stat.code}</CardTitle>
                    <CardDescription>{stat.name}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-600">Average Score</span>
                        <Badge className="bg-blue-500 text-white">{stat.averageScore}</Badge>
                      </div>
                      <Progress value={stat.averageScore} className="h-2" />
                    </div>

                    <div className="text-sm">
                      <p className="text-gray-600">Members: <span className="font-bold text-gray-900">{stat.memberCount}</span></p>
                      <div className="flex gap-1 mt-2">
                        {Object.entries(stat.gradeDistribution).map(([grade, count]) =>
                          count > 0 && (
                            <div key={grade} className="flex items-center gap-1">
                              <Badge variant="outline" className="text-xs">
                                {grade}: {count}
                              </Badge>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Average Scores by Metric</CardTitle>
                <CardDescription>How coalitions perform across different dimensions</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={comparisonChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="coalition" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="attendance" fill="#3b82f6" name="Attendance" />
                    <Bar dataKey="participation" fill="#10b981" name="Participation" />
                    <Bar dataKey="conduct" fill="#f59e0b" name="Conduct" />
                    <Bar dataKey="constituency" fill="#ef4444" name="Constituency" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            {selectedCoalition && radarData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{selectedCoalition} Performance Profile</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="metric" />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} />
                        <Radar name={selectedCoalition} dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                      </RadarChart>
                    </ResponsiveContainer>

                    <div className="space-y-4">
                      {coalitionStats.find(s => s.name === selectedCoalition) && (
                        <>
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-gray-600">Members</p>
                            <p className="text-2xl font-bold text-blue-700">
                              {coalitionStats.find(s => s.name === selectedCoalition)?.memberCount}
                            </p>
                          </div>

                          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-gray-600">Average Score</p>
                            <p className="text-2xl font-bold text-green-700">
                              {coalitionStats.find(s => s.name === selectedCoalition)?.averageScore}
                            </p>
                          </div>

                          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-gray-600">Top Performer</p>
                            <p className="text-lg font-bold text-yellow-700">
                              {coalitionStats.find(s => s.name === selectedCoalition)?.topPerformer}
                            </p>
                          </div>

                          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-gray-600">Bottom Performer</p>
                            <p className="text-lg font-bold text-red-700">
                              {coalitionStats.find(s => s.name === selectedCoalition)?.bottomPerformer}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedCoalition && selectedCoalitionMembers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{selectedCoalition} Members</CardTitle>
                  <CardDescription>Ranked by overall performance score</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Party</TableHead>
                          <TableHead>State</TableHead>
                          <TableHead className="text-right">Global Score</TableHead>
                          <TableHead className="text-right">Coalition Score</TableHead>
                          <TableHead className="text-center">Grade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedCoalitionMembers.map((member, idx) => (
                          <TableRow key={member.mpId} className="hover:bg-gray-50">
                            <TableCell className="font-bold text-gray-900">{idx + 1}</TableCell>
                            <TableCell className="font-medium">{member.name}</TableCell>
                            <TableCell>{member.party}</TableCell>
                            <TableCell>{member.state}</TableCell>
                            <TableCell className="text-right">
                              <span className="font-bold text-gray-900">{member.global.overallScore}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              {member.coalitionPercentile ? (
                                <span className="font-bold text-blue-700">{member.coalitionPercentile.overallScore}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-gray-500">{member.global.grade}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {!selectedCoalition && (
              <Card className="text-center py-12">
                <p className="text-gray-600">Select a coalition from the overview tab to see details</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
