import { useState, useEffect } from "react";
import { ROILeaderboard } from "@/components/ROILeaderboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingUp, Users } from "lucide-react";

interface MPROIEntry {
  mpId?: string;
  id?: string;
  name: string;
  party: string;
  state: string;
  roiScore: number;
  roiGrade: string;
  annualAllowance: number;
  totalSpeeches?: number;
  speeches?: number;
  billsRaised?: number;
  bills?: number;
  questionsAsked?: number;
  questions?: number;
}

interface AllowanceEfficiencyData {
  summary: {
    totalMPs: number;
    averageROI: number;
    medianROI: number;
    averageAnnualAllowance: number;
  };
  topPerformer: {
    name: string;
    party: string;
    roiScore: number;
    roiGrade: string;
  };
  lowestPerformer: {
    name: string;
    party: string;
    roiScore: number;
    roiGrade: string;
  };
  performanceDistribution: Record<string, { count: number; avgAllowance: number }>;
}

function AllowanceAnalysisDashboard() {
  const [mps, setMps] = useState<MPROIEntry[]>([]);
  const [filteredMps, setFilteredMps] = useState<MPROIEntry[]>([]);
  const [efficiencyData, setEfficiencyData] = useState<AllowanceEfficiencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedParty, setSelectedParty] = useState<string>("all");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [parties, setParties] = useState<string[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch both endpoints, but handle failures individually
        const [leaderboardRes, efficiencyRes] = await Promise.all([
          fetch("/api/report-cards/roi-leaderboard").catch(() => null),
          fetch("/api/analytics/allowance-efficiency").catch(() => null),
        ]);

        // Process leaderboard data (required)
        if (leaderboardRes && leaderboardRes.ok) {
          const leaderboardData = await leaderboardRes.json();
          const mpsData = leaderboardData.data || leaderboardData;
          setMps(mpsData);

          const uniqueParties = Array.from(new Set(mpsData.map((mp: MPROIEntry) => mp.party))).sort() as string[];
          setParties(uniqueParties);
        } else {
          console.error("Failed to fetch leaderboard data");
        }

        // Process efficiency data (optional)
        if (efficiencyRes && efficiencyRes.ok) {
          const efficiency = await efficiencyRes.json();
          setEfficiencyData(efficiency);
        } else {
          console.error("Failed to fetch efficiency data (continuing without it)");
        }
      } catch (err) {
        console.error("Error fetching allowance data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  useEffect(() => {
    let filtered = mps;

    if (searchTerm) {
      filtered = filtered.filter((mp) =>
        mp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mp.party.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mp.state.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedParty !== "all") {
      filtered = filtered.filter((mp) => mp.party === selectedParty);
    }

    if (selectedGrade !== "all") {
      filtered = filtered.filter((mp) => mp.roiGrade === selectedGrade);
    }

    setFilteredMps(filtered);
  }, [mps, searchTerm, selectedParty, selectedGrade]);

  const gradeDistributionData = efficiencyData
    ? Object.entries(efficiencyData.performanceDistribution).map(([grade, data]) => ({
        grade,
        count: data.count,
      }))
    : [];

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-gray-600">Loading allowance analysis...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Allowance Analysis Dashboard</h1>
        <p className="text-lg text-gray-600">Analyze MP allowance efficiency and return on investment</p>
      </div>

      {/* Summary Stats */}
      {efficiencyData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
            <CardHeader className="pb-3">
              <CardDescription>Average ROI Score</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-700">{efficiencyData.summary.averageROI}</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader className="pb-3">
              <CardDescription>Median ROI Score</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-700">{efficiencyData.summary.medianROI}</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardHeader className="pb-3">
              <CardDescription>Total MPs Analyzed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6 text-green-600" />
                <p className="text-3xl font-bold text-green-700">{efficiencyData.summary.totalMPs}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Grade Distribution Chart */}
      {gradeDistributionData.length > 0 && (
        <Card className="mb-8 border-2 border-amber-200">
          <CardHeader>
            <CardTitle>Grade Distribution</CardTitle>
            <CardDescription>Number of MPs in each ROI grade category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradeDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="grade" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f59e0b" name="Number of MPs" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-8 border-2 border-gray-200">
        <CardHeader>
          <CardTitle>Filter Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Search by name, party, or state</label>
              <Input
                placeholder="Search MPs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Party</label>
              <Select value={selectedParty} onValueChange={setSelectedParty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Parties</SelectItem>
                  {parties.map((party) => (
                    <SelectItem key={party} value={party}>
                      {party}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">ROI Grade</label>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  <SelectItem value="A">A - Excellent</SelectItem>
                  <SelectItem value="B">B - Good</SelectItem>
                  <SelectItem value="C">C - Average</SelectItem>
                  <SelectItem value="D">D - Below Average</SelectItem>
                  <SelectItem value="F">F - Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <ROILeaderboard mps={filteredMps} />

      {/* Top and Lowest Performers */}
      {efficiencyData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <div>
                  <CardTitle>Top Performer</CardTitle>
                  <CardDescription>Highest ROI score</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-white rounded border border-green-200">
                  <div>
                    <p className="font-semibold text-gray-900">🏆 {efficiencyData.topPerformer.name}</p>
                    <p className="text-sm text-gray-600">{efficiencyData.topPerformer.party}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-green-700">{efficiencyData.topPerformer.roiScore}</p>
                    <p className={`text-xs font-bold ${
                      efficiencyData.topPerformer.roiGrade === 'A' ? 'text-green-600' : 'text-gray-600'
                    }`}>Grade {efficiencyData.topPerformer.roiGrade}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-white">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div>
                  <CardTitle>Lowest Performer</CardTitle>
                  <CardDescription>Lowest ROI score</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-white rounded border border-red-200">
                  <div>
                    <p className="font-semibold text-gray-900">{efficiencyData.lowestPerformer.name}</p>
                    <p className="text-sm text-gray-600">{efficiencyData.lowestPerformer.party}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-red-700">{efficiencyData.lowestPerformer.roiScore}</p>
                    <p className={`text-xs font-bold ${
                      efficiencyData.lowestPerformer.roiGrade === 'F' ? 'text-red-600' : 'text-gray-600'
                    }`}>Grade {efficiencyData.lowestPerformer.roiGrade}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default AllowanceAnalysisDashboard;
