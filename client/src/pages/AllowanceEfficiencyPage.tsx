import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from "recharts";
import { TrendingUp, BarChart3, PieChart as PieChartIcon } from "lucide-react";

interface AllowanceEfficiencyStats {
  avgROI: number;
  medianROI: number;
  gradeDistribution: Record<string, number>;
  partyAverages: Array<{ party: string; avgScore: number; count: number }>;
  stateAverages: Array<{ state: string; avgScore: number; count: number }>;
  allowanceVsOutput: Array<{ name: string; allowance: number; outputs: number; roi: number }>;
}

export function AllowanceEfficiencyPage() {
  const [stats, setStats] = useState<AllowanceEfficiencyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/analytics/allowance-efficiency");
        if (!response.ok) {
          throw new Error("Failed to fetch efficiency data");
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error("Error fetching efficiency stats:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-gray-600">Loading efficiency analytics...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-600">Failed to load efficiency data</div>
      </div>
    );
  }

  const gradeData = Object.entries(stats.gradeDistribution).map(([grade, count]) => ({
    grade,
    count,
  }));

  const partyData = stats.partyAverages
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 10);

  const stateData = stats.stateAverages
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 10);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Allowance Efficiency Analytics</h1>
        <p className="text-lg text-gray-600">In-depth analysis of MP allowance return on investment</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <CardHeader className="pb-3">
            <CardDescription>Average ROI Score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <p className="text-4xl font-bold text-purple-700">{stats.avgROI}</p>
              <p className="text-sm text-gray-600 mb-1">across all 222 MPs</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="pb-3">
            <CardDescription>Median ROI Score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <p className="text-4xl font-bold text-blue-700">{stats.medianROI}</p>
              <p className="text-sm text-gray-600 mb-1">center of distribution</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grade Distribution */}
      <Card className="mb-8 border-2 border-amber-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-amber-600" />
            <div>
              <CardTitle>ROI Grade Distribution</CardTitle>
              <CardDescription>How many MPs fall into each grade category</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradeData}>
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

      {/* Party Averages */}
      <Card className="mb-8 border-2 border-green-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-600" />
            <div>
              <CardTitle>Top 10 Parties by Average ROI</CardTitle>
              <CardDescription>Average ROI score per party</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={partyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="party" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip formatter={(value) => value.toFixed(1)} />
                <Bar dataKey="avgScore" fill="#10b981" name="Average ROI Score" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* State Averages */}
      <Card className="mb-8 border-2 border-red-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-red-600" />
            <div>
              <CardTitle>Top 10 States by Average ROI</CardTitle>
              <CardDescription>Average ROI score per state</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stateData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="state" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip formatter={(value) => value.toFixed(1)} />
                <Bar dataKey="avgScore" fill="#ef4444" name="Average ROI Score" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats Table */}
      <Card className="border-2 border-gray-200">
        <CardHeader>
          <CardTitle>Summary Statistics</CardTitle>
          <CardDescription>Breakdown of ROI grades across the parliament</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Grade</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Count</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Percentage</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Interpretation</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { grade: "A", interpretation: "Excellent return on investment" },
                  { grade: "B", interpretation: "Good return on investment" },
                  { grade: "C", interpretation: "Average return on investment" },
                  { grade: "D", interpretation: "Below average return on investment" },
                  { grade: "F", interpretation: "Poor return on investment" },
                ].map(({ grade, interpretation }) => {
                  const count = stats.gradeDistribution[grade] || 0;
                  const percentage = ((count / 222) * 100).toFixed(1);
                  return (
                    <tr key={grade} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className={`inline-block w-8 h-8 rounded-full font-bold text-center text-white ${
                          grade === 'A' ? 'bg-green-600' :
                          grade === 'B' ? 'bg-blue-600' :
                          grade === 'C' ? 'bg-amber-600' :
                          grade === 'D' ? 'bg-orange-600' :
                          'bg-red-600'
                        }`}>
                          {grade}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">{count}</td>
                      <td className="py-3 px-4 text-right font-semibold">{percentage}%</td>
                      <td className="py-3 px-4">{interpretation}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
