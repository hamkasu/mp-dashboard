import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Award } from "lucide-react";

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

interface ROILeaderboardProps {
  mps: MPROIEntry[];
  currentMpId?: string;
}

export function ROILeaderboard({ mps, currentMpId }: ROILeaderboardProps) {
  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) return "bg-yellow-400 text-yellow-900";
    if (rank === 2) return "bg-gray-300 text-gray-900";
    if (rank === 3) return "bg-orange-300 text-orange-900";
    return "bg-gray-200 text-gray-700";
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A":
        return "bg-green-100 text-green-800 border-green-300";
      case "B":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "C":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "D":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "F":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-purple-600" />
          <div>
            <CardTitle>ROI Leaderboard</CardTitle>
            <CardDescription>MP rankings by return on investment score</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-2 font-semibold text-gray-700">Rank</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-700">MP Name</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-700">Party</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-700">State</th>
                <th className="text-right py-3 px-2 font-semibold text-gray-700">ROI Score</th>
                <th className="text-center py-3 px-2 font-semibold text-gray-700">Grade</th>
                <th className="text-right py-3 px-2 font-semibold text-gray-700">Outputs</th>
              </tr>
            </thead>
            <tbody>
              {mps.map((mp, index) => {
                const rank = index + 1;
                const totalOutputs = mp.speeches + mp.bills + mp.questions;
                const isCurrentMp = currentMpId === mp.id;

                return (
                  <tr
                    key={mp.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      isCurrentMp ? "bg-purple-100" : ""
                    }`}
                  >
                    <td className="py-3 px-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${getRankBadgeClass(rank)}`}>
                        {rank <= 3 ? (
                          <Trophy className="w-4 h-4" />
                        ) : (
                          rank
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 font-medium text-gray-900">{mp.name}</td>
                    <td className="py-3 px-2">
                      <Badge variant="outline" className="text-xs">
                        {mp.party}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-gray-600">{mp.state}</td>
                    <td className="py-3 px-2 text-right">
                      <span className="font-bold text-lg text-purple-700">{mp.roiScore}</span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <Badge className={`font-bold text-base border-2 ${getGradeColor(mp.roiGrade)}`}>
                        {mp.roiGrade}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-right text-gray-600">{totalOutputs}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
