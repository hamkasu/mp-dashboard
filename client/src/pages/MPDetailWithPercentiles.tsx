/**
 * Phase 4: Enhanced MP Detail Page
 * Shows MP profile with global, coalition, and state percentile scores
 */

import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Phase4PercentileCard } from "@/components/Phase4PercentileCard";
import { CoalitionAchievementBadges } from "@/components/CoalitionAchievementBadges";
import { MapPin, Users, TrendingUp, AlertCircle } from "lucide-react";

interface ScoreBreakdown {
  attendanceScore: number;
  participationScore: number;
  conductScore: number;
  constituencyScore: number;
  overallScore: number;
  grade: string;
}

interface MPDetailWithPercentile {
  mpId: string;
  name: string;
  party: string;
  state: string;
  coalition?: string | null;
  global: ScoreBreakdown;
  coalitionPercentile?: ScoreBreakdown;
  statePercentile?: ScoreBreakdown;
  mp?: {
    id: string;
    name: string;
    party: string;
    constituency: string;
    state: string;
    gender: string;
    photoUrl?: string;
    title?: string;
    role?: string;
  };
}

export default function MPDetailWithPercentiles() {
  const { mpId } = useParams<{ mpId: string }>();

  const { data: mpDetail, isLoading, error } = useQuery<MPDetailWithPercentile>({
    queryKey: [`/api/report-cards/${mpId}/with-coalition-state`],
    enabled: !!mpId,
  });

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

  if (error || !mpDetail) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load MP details. Please try again later.
            </AlertDescription>
          </Alert>
        </main>
        <Footer />
      </div>
    );
  }

  // Prepare chart data
  const scoreComparisonData = [
    {
      metric: "Attendance",
      global: mpDetail.global.attendanceScore,
      coalition: mpDetail.coalitionPercentile?.attendanceScore,
      state: mpDetail.statePercentile?.attendanceScore,
    },
    {
      metric: "Participation",
      global: mpDetail.global.participationScore,
      coalition: mpDetail.coalitionPercentile?.participationScore,
      state: mpDetail.statePercentile?.participationScore,
    },
    {
      metric: "Conduct",
      global: mpDetail.global.conductScore,
      coalition: mpDetail.coalitionPercentile?.conductScore,
      state: mpDetail.statePercentile?.conductScore,
    },
    {
      metric: "Constituency",
      global: mpDetail.global.constituencyScore,
      coalition: mpDetail.coalitionPercentile?.constituencyScore,
      state: mpDetail.statePercentile?.constituencyScore,
    },
  ];

  const radarData = [
    { metric: "Attendance", value: mpDetail.global.attendanceScore },
    { metric: "Participation", value: mpDetail.global.participationScore },
    { metric: "Conduct", value: mpDetail.global.conductScore },
    { metric: "Constituency", value: mpDetail.global.constituencyScore },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <PageMeta
        title={`${mpDetail.name} - Performance Report`}
        description={`Global, coalition, and state performance scores for ${mpDetail.name}`}
      />
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          {mpDetail.mp?.photoUrl && (
            <img
              src={mpDetail.mp.photoUrl}
              alt={mpDetail.name}
              className="w-32 h-32 rounded-full object-cover mb-4 border-4 border-blue-500"
            />
          )}
          <h1 className="text-4xl font-bold mb-2 text-gray-900">{mpDetail.name}</h1>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <Badge className="bg-blue-500 text-white px-3 py-2 text-sm">
              {mpDetail.party}
            </Badge>
            <div className="flex items-center gap-1 text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>{mpDetail.state}</span>
            </div>
            {mpDetail.coalition && (
              <div className="flex items-center gap-1 text-gray-600">
                <Users className="w-4 h-4" />
                <span>Coalition: {mpDetail.coalition}</span>
              </div>
            )}
          </div>

          {mpDetail.mp?.role && (
            <p className="text-lg text-gray-700 mb-4">{mpDetail.mp.role}</p>
          )}
        </div>

        {/* Main Percentile Card */}
        <div className="mb-8">
          <Phase4PercentileCard
            mpName={mpDetail.name}
            party={mpDetail.party}
            state={mpDetail.state}
            coalition={mpDetail.coalition}
            global={mpDetail.global}
            coalitionPercentile={mpDetail.coalitionPercentile}
            statePercentile={mpDetail.statePercentile}
          />
        </div>

        {/* Achievement Badges */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Achievements & Recognition</CardTitle>
          </CardHeader>
          <CardContent>
            <CoalitionAchievementBadges
              global={mpDetail.global}
              coalitionPercentile={mpDetail.coalitionPercentile}
              statePercentile={mpDetail.statePercentile}
              coalition={mpDetail.coalition}
              state={mpDetail.state}
            />
          </CardContent>
        </Card>

        {/* Detailed Analysis Tabs */}
        <Tabs defaultValue="comparison" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="comparison">Score Comparison</TabsTrigger>
            <TabsTrigger value="radar">Performance Profile</TabsTrigger>
            <TabsTrigger value="ranking">Your Ranking</TabsTrigger>
          </TabsList>

          {/* Score Comparison Chart */}
          <TabsContent value="comparison" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Global vs Coalition vs State</CardTitle>
                <CardDescription>
                  How {mpDetail.name} performs across different ranking levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={scoreComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="metric" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="global" fill="#3b82f6" name="Global" />
                    {mpDetail.coalitionPercentile && (
                      <Bar dataKey="coalition" fill="#10b981" name={`${mpDetail.coalition}`} />
                    )}
                    {mpDetail.statePercentile && (
                      <Bar dataKey="state" fill="#f59e0b" name={mpDetail.state} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Radar Chart */}
          <TabsContent value="radar" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Global Performance Profile</CardTitle>
                <CardDescription>
                  Radar view of {mpDetail.name}'s performance across all dimensions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Radar
                        name={mpDetail.name}
                        dataKey="value"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.6}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Interpretation */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Interpretation</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Larger area = stronger overall performer</li>
                    <li>• Uneven shape = specialized strengths/weaknesses</li>
                    <li>• Target: All metrics above 70 for consistent excellence</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ranking Information */}
          <TabsContent value="ranking" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Global Ranking */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Global Ranking
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Overall Score</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold text-blue-700">
                        {mpDetail.global.overallScore}
                      </p>
                      <Badge className="bg-gray-500">
                        {mpDetail.global.grade}
                      </Badge>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Attendance</span>
                      <span className="font-bold text-gray-900">
                        {mpDetail.global.attendanceScore}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Participation</span>
                      <span className="font-bold text-gray-900">
                        {mpDetail.global.participationScore}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Conduct</span>
                      <span className="font-bold text-gray-900">
                        {mpDetail.global.conductScore}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Constituency</span>
                      <span className="font-bold text-gray-900">
                        {mpDetail.global.constituencyScore}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Coalition Ranking */}
              {mpDetail.coalitionPercentile && mpDetail.coalition && (
                <Card className="border-2 border-green-200 bg-green-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      {mpDetail.coalition}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Coalition Score</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold text-green-700">
                          {mpDetail.coalitionPercentile.overallScore}
                        </p>
                        <Badge className="bg-green-600">
                          {mpDetail.coalitionPercentile.grade}
                        </Badge>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-green-200 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Attendance</span>
                        <span className="font-bold text-gray-900">
                          {mpDetail.coalitionPercentile.attendanceScore}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Participation</span>
                        <span className="font-bold text-gray-900">
                          {mpDetail.coalitionPercentile.participationScore}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Conduct</span>
                        <span className="font-bold text-gray-900">
                          {mpDetail.coalitionPercentile.conductScore}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Constituency</span>
                        <span className="font-bold text-gray-900">
                          {mpDetail.coalitionPercentile.constituencyScore}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* State Ranking */}
              {mpDetail.statePercentile && mpDetail.state && (
                <Card className="border-2 border-amber-200 bg-amber-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      {mpDetail.state}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-2">State Score</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold text-amber-700">
                          {mpDetail.statePercentile.overallScore}
                        </p>
                        <Badge className="bg-amber-600">
                          {mpDetail.statePercentile.grade}
                        </Badge>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-amber-200 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Attendance</span>
                        <span className="font-bold text-gray-900">
                          {mpDetail.statePercentile.attendanceScore}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Participation</span>
                        <span className="font-bold text-gray-900">
                          {mpDetail.statePercentile.participationScore}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Conduct</span>
                        <span className="font-bold text-gray-900">
                          {mpDetail.statePercentile.conductScore}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Constituency</span>
                        <span className="font-bold text-gray-900">
                          {mpDetail.statePercentile.constituencyScore}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
