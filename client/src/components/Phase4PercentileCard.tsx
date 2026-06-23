/**
 * Phase 4: Percentile Comparison Card
 * Displays global, coalition, and state percentile scores for an MP
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Zap, TrendingUp, Users, MapPin } from "lucide-react";

interface ScoreBreakdown {
  attendanceScore: number;
  participationScore: number;
  conductScore: number;
  constituencyScore: number;
  overallScore: number;
  grade: string;
}

interface PercentileCardProps {
  mpName: string;
  party: string;
  state: string;
  coalition?: string | null;
  global: ScoreBreakdown;
  coalitionPercentile?: ScoreBreakdown;
  statePercentile?: ScoreBreakdown;
  compact?: boolean;
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A': return 'bg-green-500';
    case 'B': return 'bg-blue-500';
    case 'C': return 'bg-yellow-500';
    case 'D': return 'bg-orange-500';
    case 'F': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
}

function getGradeBadgeVariant(grade: string): "default" | "secondary" | "destructive" | "outline" {
  switch (grade) {
    case 'A': return 'default';
    case 'B': return 'secondary';
    case 'C': return 'outline';
    case 'D': return 'destructive';
    case 'F': return 'destructive';
    default: return 'default';
  }
}

function ScoreBar({ label, score, icon: Icon }: { label: string; score: number; icon: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
          {Icon}
          {label}
        </span>
        <span className={`text-sm font-bold ${score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
          {score}
        </span>
      </div>
      <Progress value={score} className="h-2" />
    </div>
  );
}

function PercentileSection({
  title,
  icon: Icon,
  data,
  highlight,
}: {
  title: string;
  icon: React.ReactNode;
  data: ScoreBreakdown;
  highlight?: boolean;
}) {
  return (
    <div className={`p-4 rounded-lg border ${highlight ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {Icon}
          <h4 className="font-semibold text-gray-900">{title}</h4>
        </div>
        <Badge className={`${getGradeColor(data.grade)} text-white`}>
          {data.grade}
        </Badge>
      </div>

      <div className="space-y-3">
        <ScoreBar label="Attendance" score={data.attendanceScore} icon="📊" />
        <ScoreBar label="Participation" score={data.participationScore} icon="💬" />
        <ScoreBar label="Conduct" score={data.conductScore} icon="⚖️" />
        <ScoreBar label="Constituency" score={data.constituencyScore} icon="🏘️" />

        <div className="pt-3 border-t border-gray-300 mt-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-gray-900">Overall</span>
            <span className={`text-lg font-bold ${data.overallScore >= 80 ? 'text-green-600' : data.overallScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
              {data.overallScore}
            </span>
          </div>
          <Progress value={data.overallScore} className="h-2 mt-2" />
        </div>
      </div>
    </div>
  );
}

export function Phase4PercentileCard({
  mpName,
  party,
  state,
  coalition,
  global,
  coalitionPercentile,
  statePercentile,
  compact = false,
}: PercentileCardProps) {
  if (compact) {
    // Compact view for list display
    return (
      <div className="p-3 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="font-semibold text-gray-900 text-sm">{mpName}</p>
            <p className="text-xs text-gray-600">{party} • {state}</p>
          </div>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge className={`${getGradeColor(global.grade)} text-white text-xs`}>
                    Global: {global.grade}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Global Overall: {global.overallScore}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {coalitionPercentile && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="text-xs">
                      Coalition: {coalitionPercentile.grade}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>{coalition || 'N/A'} Overall: {coalitionPercentile.overallScore}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {statePercentile && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="secondary" className="text-xs">
                      State: {statePercentile.grade}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>{state} Overall: {statePercentile.overallScore}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-white rounded border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">Global</p>
            <p className="text-sm font-bold text-gray-900">{global.overallScore}</p>
            <p className="text-xs text-gray-500">Rank: Global</p>
          </div>

          {coalitionPercentile && (
            <div className="text-center p-2 bg-blue-50 rounded border border-blue-200">
              <p className="text-xs text-gray-600 mb-1">Coalition</p>
              <p className="text-sm font-bold text-blue-700">{coalitionPercentile.overallScore}</p>
              <p className="text-xs text-blue-600">vs {coalition || 'N/A'}</p>
            </div>
          )}

          {statePercentile && (
            <div className="text-center p-2 bg-green-50 rounded border border-green-200">
              <p className="text-xs text-gray-600 mb-1">State</p>
              <p className="text-sm font-bold text-green-700">{statePercentile.overallScore}</p>
              <p className="text-xs text-green-600">vs {state}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full card view
  return (
    <Card className="border-2 border-slate-200 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{mpName}</CardTitle>
            <CardDescription className="text-base">
              {party} • {state}
              {coalition && ` • Coalition: ${coalition}`}
            </CardDescription>
          </div>
          <Badge className={`${getGradeColor(global.grade)} text-white text-lg px-3 py-1`}>
            {global.grade}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Global Percentile */}
        <PercentileSection
          title="Global Percentile (All MPs)"
          icon={<TrendingUp className="w-5 h-5 text-gray-600" />}
          data={global}
        />

        {/* Coalition Percentile */}
        {coalitionPercentile && (
          <PercentileSection
            title={`${coalition} Coalition Percentile`}
            icon={<Users className="w-5 h-5 text-blue-600" />}
            data={coalitionPercentile}
            highlight={true}
          />
        )}

        {/* State Percentile */}
        {statePercentile && (
          <PercentileSection
            title={`${state} State Percentile`}
            icon={<MapPin className="w-5 h-5 text-green-600" />}
            data={statePercentile}
          />
        )}

        {/* Insights */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4" /> Key Insights
          </h4>
          <ul className="text-sm text-amber-800 space-y-1">
            {coalitionPercentile && global.overallScore < 60 && coalitionPercentile.overallScore > 70 && (
              <li>✓ Coalition star: Outperforms global average within {coalition}</li>
            )}
            {statePercentile && state && (
              <li>✓ Top performer in {state}: Ranked within state peers</li>
            )}
            {global.conductScore >= 85 && (
              <li>✓ High conduct score: Strong track record on legal matters</li>
            )}
            {global.participationScore >= 85 && (
              <li>✓ Active participant: Speeches, bills, and questions above average</li>
            )}
            {!coalitionPercentile && !statePercentile && (
              <li>• Coalition and state data not yet available</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
