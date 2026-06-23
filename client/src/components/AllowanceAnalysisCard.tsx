/**
 * Copyright by Calmic Sdn Bhd
 *
 * Allowance Analysis Card Component
 *
 * Featured section highlighting MP ROI analysis and allowance efficiency metrics.
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  TrendingUp,
  Trophy,
  DollarSign,
  ArrowRight,
  X,
  Zap,
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

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
}

interface AllowanceAnalysisCardProps {
  className?: string;
}

const getGradeColor = (grade: string) => {
  switch (grade) {
    case "A":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "B":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "C":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    case "D":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
    case "F":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
  }
};

export function AllowanceAnalysisCard({ className }: AllowanceAnalysisCardProps) {
  const { t, language } = useLanguage();
  const [isDismissed, setIsDismissed] = useState(false);

  const { data, isLoading } = useQuery<AllowanceEfficiencyData>({
    queryKey: ["/api/analytics/allowance-efficiency"],
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (isDismissed) return null;

  const isMs = language === 'ms';

  // Show loading skeleton
  if (isLoading) {
    return (
      <Card className={`relative overflow-hidden border-purple-200/50 dark:border-purple-900/30 bg-gradient-to-br from-purple-50/80 via-blue-50/50 to-indigo-50/30 dark:from-purple-950/20 dark:via-blue-950/10 dark:to-indigo-950/5 ${className}`}>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white p-2.5 rounded-xl">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <Skeleton className="h-7 w-64 mb-2" />
                <Skeleton className="h-4 w-72" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-10 w-48 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  // If no data, don't render
  if (!data) return null;

  const { summary, topPerformer, lowestPerformer } = data;

  return (
    <Card
      className={`relative overflow-hidden border-purple-200/50 dark:border-purple-900/30 bg-gradient-to-br from-purple-50/80 via-blue-50/50 to-indigo-50/30 dark:from-purple-950/20 dark:via-blue-950/10 dark:to-indigo-950/5 ${className}`}
      data-testid="allowance-analysis-card"
      role="region"
      aria-label={isMs ? "Analisis Elaun Ahli Parlimen" : "MP Allowance Analysis"}
    >
      {/* Dismiss button */}
      <button
        onClick={() => setIsDismissed(true)}
        className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors z-10"
        aria-label={isMs ? "Tutup seksyen ini" : "Dismiss this section"}
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>

      <CardHeader className="pb-4">
        <div className="flex items-start gap-3 pr-8">
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white p-2.5 rounded-xl shadow-lg shadow-purple-500/20">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-xl font-bold text-purple-900 dark:text-purple-100">
                {isMs ? "Analisis Elaun & ROI" : "Allowance & ROI Analysis"}
              </CardTitle>
              <Zap className="h-5 w-5 text-purple-500" aria-hidden="true" />
            </div>
            <p className="text-sm text-muted-foreground">
              {isMs
                ? "Analisis kecekapan ROI bagi semua Ahli Parlimen berdasarkan output parlimen"
                : "Analyze ROI efficiency across all MPs based on parliamentary output"}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-white/70 dark:bg-black/20 rounded-lg p-3 border border-purple-200/50 dark:border-purple-800/30">
            <p className="text-xs text-muted-foreground mb-1">
              {isMs ? "Rata-rata ROI" : "Average ROI"}
            </p>
            <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
              {summary.averageROI.toFixed(0)}
            </p>
          </div>

          <div className="bg-white/70 dark:bg-black/20 rounded-lg p-3 border border-purple-200/50 dark:border-purple-800/30">
            <p className="text-xs text-muted-foreground mb-1">
              {isMs ? "ROI Median" : "Median ROI"}
            </p>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
              {summary.medianROI.toFixed(0)}
            </p>
          </div>

          <div className="bg-white/70 dark:bg-black/20 rounded-lg p-3 border border-purple-200/50 dark:border-purple-800/30">
            <p className="text-xs text-muted-foreground mb-1">
              {isMs ? "Jumlah Ahli" : "Total MPs"}
            </p>
            <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
              {summary.totalMPs}
            </p>
          </div>
        </div>

        {/* Top Performer */}
        <div className="bg-white/70 dark:bg-black/20 rounded-lg p-3 border border-purple-200/50 dark:border-purple-800/30">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                {isMs ? "Pemain Terbaik" : "Top Performer"}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">
                {topPerformer.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {topPerformer.party}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-sm text-purple-700 dark:text-purple-300">
                {topPerformer.roiScore}
              </p>
              <Badge className={`text-xs ${getGradeColor(topPerformer.roiGrade)}`}>
                {topPerformer.roiGrade}
              </Badge>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="flex gap-2 pt-2">
          <Button
            asChild
            size="sm"
            className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-md shadow-purple-500/20 flex-1"
          >
            <Link href="/allowance-analysis" aria-label={isMs ? "Lihat analisis lengkap" : "View full analysis"}>
              <ArrowRight className="h-4 w-4 mr-2" />
              {isMs ? "Lihat Analisis Penuh" : "View Full Analysis"}
            </Link>
          </Button>
        </div>

        {/* Footer */}
        <div className="text-xs text-muted-foreground pt-2 border-t border-purple-200/30 dark:border-purple-800/20">
          {isMs
            ? "Berdasarkan output parlimen: ucapan, rang undang-undang yang dibangkitkan, dan soalan"
            : "Based on parliamentary output: speeches, bills raised, and questions"}
        </div>
      </CardContent>
    </Card>
  );
}
