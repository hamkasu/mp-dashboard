/**
 * Phase 4: Coalition Achievement Badges
 * Displays achievement badges based on coalition and state performance
 */

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Trophy, Star, Award, Zap } from "lucide-react";

interface ScoreBreakdown {
  attendanceScore: number;
  participationScore: number;
  conductScore: number;
  constituencyScore: number;
  overallScore: number;
  grade: string;
}

interface CoalitionAchievementBadgesProps {
  global: ScoreBreakdown;
  coalitionPercentile?: ScoreBreakdown;
  statePercentile?: ScoreBreakdown;
  coalition?: string | null;
  state?: string;
  compact?: boolean;
}

export function CoalitionAchievementBadges({
  global,
  coalitionPercentile,
  statePercentile,
  coalition,
  state,
  compact = false,
}: CoalitionAchievementBadgesProps) {
  const badges: Array<{
    icon: React.ReactNode;
    label: string;
    tooltip: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }> = [];

  // Global achievements
  if (global.grade === 'A') {
    badges.push({
      icon: <Trophy className="w-3 h-3" />,
      label: compact ? "A Grade" : "Grade A (Top 10%)",
      tooltip: `Top 10% overall performer with score ${global.overallScore}`,
      variant: "default",
    });
  }

  if (global.attendanceScore >= 95) {
    badges.push({
      icon: <Star className="w-3 h-3" />,
      label: compact ? "Perfect Attendance" : "Perfect Attendance",
      tooltip: `Attendance score: ${global.attendanceScore}`,
      variant: "default",
    });
  }

  if (global.conductScore >= 90) {
    badges.push({
      icon: <Award className="w-3 h-3" />,
      label: compact ? "Clean Record" : "Clean Legal Record",
      tooltip: `Conduct score: ${global.conductScore}`,
      variant: "secondary",
    });
  }

  // Coalition achievements
  if (coalitionPercentile && coalition) {
    if (coalitionPercentile.grade === 'A') {
      badges.push({
        icon: <Zap className="w-3 h-3" />,
        label: compact ? `🥇 Coalition` : `#1 in ${coalition}`,
        tooltip: `Top performer in ${coalition} coalition (Score: ${coalitionPercentile.overallScore})`,
        variant: "outline",
      });
    }

    if (coalitionPercentile.overallScore >= 85) {
      badges.push({
        icon: <Star className="w-3 h-3" />,
        label: compact ? `Top 5% Coalition` : `Top 5% in ${coalition}`,
        tooltip: `Top 5% performer within ${coalition} coalition`,
        variant: "outline",
      });
    }

    // Relative performance: strong in coalition but weak globally
    if (global.grade >= 'C' && global.grade < 'A' && coalitionPercentile.grade === 'A') {
      badges.push({
        icon: <Trophy className="w-3 h-3" />,
        label: compact ? "Coalition Star" : "Coalition Star",
        tooltip: `Outperforms coalition average despite modest global rank`,
        variant: "secondary",
      });
    }
  }

  // State achievements
  if (statePercentile && state) {
    if (statePercentile.overallScore >= 90) {
      badges.push({
        icon: <Trophy className="w-3 h-3" />,
        label: compact ? `Top ${state}` : `#1 in ${state}`,
        tooltip: `Top performer in ${state} state (Score: ${statePercentile.overallScore})`,
        variant: "outline",
      });
    }

    if (statePercentile.overallScore >= 80 && statePercentile.overallScore < 90) {
      badges.push({
        icon: <Star className="w-3 h-3" />,
        label: compact ? `Top 5 ${state}` : `Top 5 in ${state}`,
        tooltip: `Top 5 performer in ${state} state`,
        variant: "outline",
      });
    }
  }

  // Overachiever badge (strong globally AND in coalition/state)
  if (
    global.grade === 'A' &&
    coalitionPercentile?.grade === 'A' &&
    statePercentile?.grade === 'A'
  ) {
    badges.push({
      icon: <Zap className="w-3 h-3" />,
      label: compact ? "Triple A" : "Triple A Achievement",
      tooltip: "Grade A performer globally, in coalition, and in state",
      variant: "default",
    });
  }

  if (badges.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex gap-1 flex-wrap">
        {badges.map((badge, idx) => (
          <TooltipProvider key={idx}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant={badge.variant} className="text-xs gap-1 cursor-help">
                  {badge.icon}
                  {badge.label}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>{badge.tooltip}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">Achievements</h3>
      <div className="flex flex-wrap gap-2">
        {badges.map((badge, idx) => (
          <TooltipProvider key={idx}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant={badge.variant} className="gap-2 cursor-help">
                  {badge.icon}
                  {badge.label}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>{badge.tooltip}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  );
}
