import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, Award, X } from "lucide-react";

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

interface ROILeaderboardProps {
  mps: MPROIEntry[];
  currentMpId?: string;
}

export function ROILeaderboard({ mps, currentMpId }: ROILeaderboardProps) {
  const [selectedMp, setSelectedMp] = useState<MPROIEntry | null>(null);
  const [isOpen, setIsOpen] = useState(false);

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
                <th className="text-right py-3 px-2 font-semibold text-gray-700">Bills Raised</th>
                <th className="text-right py-3 px-2 font-semibold text-gray-700">ROI Score</th>
                <th className="text-center py-3 px-2 font-semibold text-gray-700">Grade</th>
                <th className="text-right py-3 px-2 font-semibold text-gray-700">Outputs</th>
              </tr>
            </thead>
            <tbody>
              {mps.map((mp, index) => {
                const rank = index + 1;
                const speeches = mp.totalSpeeches ?? mp.speeches ?? 0;
                const bills = mp.billsRaised ?? mp.bills ?? 0;
                const questions = mp.questionsAsked ?? mp.questions ?? 0;
                const totalOutputs = speeches + bills + questions;
                const isCurrentMp = currentMpId === (mp.mpId ?? mp.id);

                return (
                  <tr
                    key={mp.mpId ?? mp.id}
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
                    <td className="py-3 px-2">
                      <button
                        onClick={() => {
                          setSelectedMp(mp);
                          setIsOpen(true);
                        }}
                        className="font-medium text-purple-700 hover:text-purple-900 hover:underline cursor-pointer"
                      >
                        {mp.name}
                      </button>
                    </td>
                    <td className="py-3 px-2">
                      <Badge variant="outline" className="text-xs">
                        {mp.party}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-gray-600">{mp.state}</td>
                    <td className="py-3 px-2 text-right font-semibold text-green-700">{bills}</td>
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

      {/* Calculation Details Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedMp && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedMp.name}</DialogTitle>
                <DialogDescription>
                  {selectedMp.party} • {selectedMp.state}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Summary */}
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-600">ROI Score</p>
                      <p className="text-3xl font-bold text-purple-700">{selectedMp.roiScore}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Grade</p>
                      <p className="text-3xl font-bold text-green-700">{selectedMp.roiGrade}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Annual Allowance</p>
                      <p className="text-lg font-bold text-gray-900">RM{selectedMp.annualAllowance.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Output Breakdown */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-gray-900">Parliamentary Output</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-blue-50 p-3 rounded border border-blue-200">
                      <p className="text-xs text-gray-600">Speeches</p>
                      <p className="text-2xl font-bold text-blue-700">{selectedMp.totalSpeeches ?? selectedMp.speeches ?? 0}</p>
                      <p className="text-xs text-gray-500 mt-1">Weight: ×1.0</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded border border-green-200">
                      <p className="text-xs text-gray-600">Bills Raised</p>
                      <p className="text-2xl font-bold text-green-700">{selectedMp.billsRaised ?? selectedMp.bills ?? 0}</p>
                      <p className="text-xs text-gray-500 mt-1">Weight: ×8.0</p>
                    </div>
                    <div className="bg-amber-50 p-3 rounded border border-amber-200">
                      <p className="text-xs text-gray-600">Questions</p>
                      <p className="text-2xl font-bold text-amber-700">{selectedMp.questionsAsked ?? selectedMp.questions ?? 0}</p>
                      <p className="text-xs text-gray-500 mt-1">Weight: ×0.8</p>
                    </div>
                  </div>
                </div>

                {/* Calculation */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-gray-900">ROI Calculation</h3>
                  <div className="bg-gray-50 p-4 rounded border border-gray-200 space-y-3">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">1. Output Score</p>
                      <div className="bg-white p-3 rounded font-mono text-sm">
                        {(() => {
                          const speeches = selectedMp.totalSpeeches ?? selectedMp.speeches ?? 0;
                          const bills = selectedMp.billsRaised ?? selectedMp.bills ?? 0;
                          const questions = selectedMp.questionsAsked ?? selectedMp.questions ?? 0;
                          const outputScore = (speeches * 1.0) + (bills * 8.0) + (questions * 0.8);
                          return (
                            <>
                              ({speeches} × 1.0) + ({bills} × 8.0) + ({questions} × 0.8)
                              <br />
                              <span className="text-green-700 font-bold">= {outputScore.toFixed(1)}</span>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-1">2. ROI Ratio</p>
                      <div className="bg-white p-3 rounded font-mono text-sm">
                        {(() => {
                          const speeches = selectedMp.totalSpeeches ?? selectedMp.speeches ?? 0;
                          const bills = selectedMp.billsRaised ?? selectedMp.bills ?? 0;
                          const questions = selectedMp.questionsAsked ?? selectedMp.questions ?? 0;
                          const outputScore = (speeches * 1.0) + (bills * 8.0) + (questions * 0.8);
                          const roiRatio = selectedMp.annualAllowance > 0 ? outputScore / selectedMp.annualAllowance : 0;
                          return (
                            <>
                              {outputScore.toFixed(1)} ÷ {selectedMp.annualAllowance.toLocaleString()}
                              <br />
                              <span className="text-green-700 font-bold">= {roiRatio.toFixed(6)} (output per RM)</span>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-1">3. Percentile Ranking</p>
                      <p className="text-sm text-gray-700">
                        Ranked against all 223 MPs by ROI ratio to determine percentile position.
                      </p>
                      <div className="bg-white p-3 rounded font-mono text-sm mt-2">
                        <span className="text-green-700 font-bold">Score: {selectedMp.roiScore} (percentile)</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-1">4. Grade Assignment</p>
                      <div className="text-sm text-gray-700">
                        <p>Score {selectedMp.roiScore} falls in range:</p>
                        <div className="mt-2 bg-white p-3 rounded">
                          {(() => {
                            const score = selectedMp.roiScore;
                            if (score >= 80) return <span className="text-green-700 font-bold">80-100 → Grade A (Top 20%)</span>;
                            if (score >= 60) return <span className="text-blue-700 font-bold">60-80 → Grade B (Next 20%)</span>;
                            if (score >= 40) return <span className="text-amber-700 font-bold">40-60 → Grade C (Middle 20%)</span>;
                            if (score >= 20) return <span className="text-orange-700 font-bold">20-40 → Grade D (Next 20%)</span>;
                            return <span className="text-red-700 font-bold">0-20 → Grade F (Bottom 20%)</span>;
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Interpretation */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">What this means:</span> {selectedMp.name} produces {(() => {
                      const speeches = selectedMp.totalSpeeches ?? selectedMp.speeches ?? 0;
                      const bills = selectedMp.billsRaised ?? selectedMp.bills ?? 0;
                      const questions = selectedMp.questionsAsked ?? selectedMp.questions ?? 0;
                      const outputScore = (speeches * 1.0) + (bills * 8.0) + (questions * 0.8);
                      const roiRatio = selectedMp.annualAllowance > 0 ? outputScore / selectedMp.annualAllowance : 0;
                      return roiRatio.toFixed(4);
                    })()} units of parliamentary output per ringgit of annual allowance, ranking them in the {selectedMp.roiScore}th percentile ({selectedMp.roiGrade} grade).
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
