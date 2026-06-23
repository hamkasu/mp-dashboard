import { useState, useEffect } from "react";
import { ROILeaderboard } from "@/components/ROILeaderboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingUp, Users } from "lucide-react";

interface MPROIEntry {
  id: string;
  name: string;
  party: string;
  state: string;
  roiScore: number;
  roiGrade: string;
  annualAllowance: number;
  speeches: number;
  bills: number;
  questions: number;
}

interface AllowanceEfficiencyData {
  avgROI: number;
  medianROI: number;
  topPerformers: MPROIEntry[];
  lowestPerformers: MPROIEntry[];
  gradeDistribution: Record<string, number>;
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
        const [leaderboardRes, efficiencyRes] = await Promise.all([
          fetch("/api/report-cards/roi-leaderboard"),
          fetch("/api/analytics/allowance-efficiency"),
        ]);

        if (!leaderboardRes.ok || !efficiencyRes.ok) {
          throw new Error("Failed to fetch data");
        }

        const leaderboardData = await leaderboardRes.json();
        const efficiency = await efficiencyRes.json();

        setMps(leaderboardData);
        setEfficiencyData(efficiency);

        const uniqueParties = Array.from(new Set(leaderboardData.map((mp: MPROIEntry) => mp.party))).sort() as string[];
        setParties(uniqueParties);
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
    ? Object.entries(efficiencyData.gradeDistribution).map(([grade, count]) => ({
        grade,
        count,
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
              <p className="text-3xl font-bold text-purple-700">{efficiencyData.avgROI}</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader className="pb-3">
              <CardDescription>Median ROI Score</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-700">{efficiencyData.medianROI}</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardHeader className="pb-3">
              <CardDescription>Total MPs Analyzed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6 text-green-600" />
                <p className="text-3xl font-bold text-green-700">{mps.length}</p>
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
                  <CardTitle>Top Performers</CardTitle>
                  <CardDescription>Highest ROI scores</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {efficiencyData.topPerformers.slice(0, 5).map((mp, idx) => (
                  <div key={mp.id} className="flex justify-between items-center p-3 bg-white rounded border border-green-200">
                    <div>
                      <p className="font-semibold text-gray-900">#{idx + 1} {mp.name}</p>
                      <p className="text-sm text-gray-600">{mp.party} • {mp.state}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-green-700">{mp.roiScore}</p>
                      <p className={`text-xs font-bold ${
                        mp.roiGrade === 'A' ? 'text-green-600' : 'text-gray-600'
                      }`}>Grade {mp.roiGrade}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-white">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div>
                  <CardTitle>Lowest Performers</CardTitle>
                  <CardDescription>Lowest ROI scores</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {efficiencyData.lowestPerformers.slice(0, 5).map((mp, idx) => (
                  <div key={mp.id} className="flex justify-between items-center p-3 bg-white rounded border border-red-200">
                    <div>
                      <p className="font-semibold text-gray-900">#{idx + 1} {mp.name}</p>
                      <p className="text-sm text-gray-600">{mp.party} • {mp.state}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-red-700">{mp.roiScore}</p>
                      <p className={`text-xs font-bold ${
                        mp.roiGrade === 'F' ? 'text-red-600' : 'text-gray-600'
                      }`}>Grade {mp.roiGrade}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default AllowanceAnalysisDashboard;
