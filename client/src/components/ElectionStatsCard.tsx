/**
 * Copyright by Calmic Sdn Bhd
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Vote, Users, Building2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface ElectionStats {
  year: number;
  totalVotes: number;
  governmentVotes: number;
  oppositionVotes: number;
}

interface ElectionStatsCardProps {
  stats?: ElectionStats;
  isLoading?: boolean;
}

export function ElectionStatsCard({ stats, isLoading }: ElectionStatsCardProps) {
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <Card className="border-indigo-200 dark:border-indigo-900 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20" data-testid="election-stats-card-loading">
        <CardHeader className="pb-3">
          <div className="h-5 w-48 bg-muted rounded animate-pulse" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/50 dark:bg-black/20 rounded-md p-3">
                <div className="h-4 w-20 bg-muted rounded animate-pulse mb-2" />
                <div className="h-8 w-28 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.totalVotes === 0) {
    return null;
  }

  const governmentPercentage = ((stats.governmentVotes / stats.totalVotes) * 100).toFixed(1);
  const oppositionPercentage = ((stats.oppositionVotes / stats.totalVotes) * 100).toFixed(1);

  return (
    <Card className="border-indigo-200 dark:border-indigo-900 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20" data-testid="election-stats-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-indigo-900 dark:text-indigo-100 text-base">
          <Vote className="h-5 w-5" />
          {t('electionStats.title')} (GE15 - {stats.year})
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          <p className="text-sm text-indigo-800 dark:text-indigo-200">
            {t('electionStats.description')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Votes */}
            <div className="bg-white/50 dark:bg-black/20 rounded-md p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <p className="text-xs font-medium text-muted-foreground">{t('electionStats.totalVotes')}</p>
              </div>
              <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100" data-testid="text-total-election-votes">
                {stats.totalVotes.toLocaleString('en-MY')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('electionStats.validVotes')}
              </p>
            </div>

            {/* Government Votes */}
            <div className="bg-white/50 dark:bg-black/20 rounded-md p-3">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <p className="text-xs font-medium text-muted-foreground">{t('electionStats.governmentVotes')}</p>
              </div>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300" data-testid="text-government-votes">
                {stats.governmentVotes.toLocaleString('en-MY')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {governmentPercentage}% {t('electionStats.ofTotal')}
              </p>
            </div>

            {/* Opposition Votes */}
            <div className="bg-white/50 dark:bg-black/20 rounded-md p-3">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <p className="text-xs font-medium text-muted-foreground">{t('electionStats.oppositionVotes')}</p>
              </div>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-300" data-testid="text-opposition-votes">
                {stats.oppositionVotes.toLocaleString('en-MY')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {oppositionPercentage}% {t('electionStats.ofTotal')}
              </p>
            </div>
          </div>

          {/* Vote Distribution Bar */}
          <div className="mt-4">
            <div className="flex h-4 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
              <div
                className="bg-blue-500 dark:bg-blue-600 transition-all duration-500"
                style={{ width: `${governmentPercentage}%` }}
                title={`${t('electionStats.government')}: ${governmentPercentage}%`}
              />
              <div
                className="bg-orange-500 dark:bg-orange-600 transition-all duration-500"
                style={{ width: `${oppositionPercentage}%` }}
                title={`${t('electionStats.opposition')}: ${oppositionPercentage}%`}
              />
            </div>
            <div className="flex justify-between text-xs mt-2 text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                {t('electionStats.government')} ({governmentPercentage}%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-orange-500" />
                {t('electionStats.opposition')} ({oppositionPercentage}%)
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground italic mt-2">
            {t('electionStats.note')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
