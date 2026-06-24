import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";
import { Link } from "wouter";
import { Star, ArrowRight, MessageSquare, FileText, Mic, Calendar, Quote, Vote, Users } from "lucide-react";
import { getProxiedPhotoUrl } from "@/lib/utils";

interface SpotlightData {
  mp: {
    id: string;
    name: string;
    party: string;
    constituency: string;
    state: string;
    photoUrl: string | null;
    isMinister: boolean;
    isDeputyMinister: boolean;
    ministerialPosition: string | null;
    parliamentCode: string;
  };
  stats: {
    totalSessions: number;
    sessionsAttended: number;
    sessionsSpoke: number;
    totalSpeeches: number;
    oralQuestionsCount: number;
    billsCount: number;
    attendanceRate: number;
  };
  electionResults: {
    year: number;
    votesReceived: number | null;
    totalValidVotes: number | null;
    majority: number | null;
    turnoutPercent: number | null;
    votePercentage: number | null;
  };
  constituencyData: {
    povertyIncidence: number | null;
  };
  highlightStat: {
    type: string;
    value: number;
    label: string;
  };
  hansardQuotes: {
    quote: string;
    sessionDate: string;
  }[];
  date: string;
}

export function MPSpotlight() {
  const { t } = useLanguage();

  const { data: spotlightData, isLoading, error } = useQuery<SpotlightData>({
    queryKey: ["/api/mp-spotlight"],
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  if (isLoading) {
    return (
      <Card className="border-amber-200/50 dark:border-amber-700/50 bg-gradient-to-br from-amber-50/80 to-orange-50/80 dark:from-amber-950/30 dark:to-orange-950/30 overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-amber-100/50 dark:bg-amber-900/30 px-6 py-4 flex items-center gap-3 border-b border-amber-200/50 dark:border-amber-800/50">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !spotlightData) {
    return null;
  }

  const { mp, stats, highlightStat, hansardQuotes, electionResults, constituencyData } = spotlightData;

  const getHighlightIcon = () => {
    switch (highlightStat.type) {
      case 'oral_questions':
        return <MessageSquare className="h-5 w-5" />;
      case 'bills':
        return <FileText className="h-5 w-5" />;
      case 'speeches':
      case 'sessions_spoke':
        return <Mic className="h-5 w-5" />;
      case 'attendance':
        return <Calendar className="h-5 w-5" />;
      default:
        return <Star className="h-5 w-5" />;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <Card className="border-amber-200/50 dark:border-amber-700/50 bg-gradient-to-br from-amber-50/80 to-orange-50/80 dark:from-amber-950/30 dark:to-orange-950/30 overflow-hidden h-full flex flex-col">
      <CardContent className="p-0">
        {/* Header */}
        <div className="bg-amber-100/50 dark:bg-amber-900/30 px-6 py-4 flex items-center justify-between border-b border-amber-200/50 dark:border-amber-800/50">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 text-white p-2 rounded-full">
              <Star className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-amber-900 dark:text-amber-100">
                {t("mpSpotlight.title")}
              </h2>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {t("mpSpotlight.subtitle")}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-amber-300/50 dark:border-amber-700/50 text-amber-700 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-900/30 text-xs"
          >
            {t("mpSpotlight.daily")}
          </Badge>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* MP Info Row */}
          <div className="flex items-start gap-4 mb-4">
            <Link href={`/mp/${mp.id}`}>
              <Avatar className="h-16 w-16 border-2 border-amber-200 dark:border-amber-700 cursor-pointer hover:border-amber-400 transition-colors">
                <AvatarImage
                  src={getProxiedPhotoUrl(mp.photoUrl) || undefined}
                  alt={mp.name}
                />
                <AvatarFallback className="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 font-semibold">
                  {getInitials(mp.name)}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/mp/${mp.id}`}>
                <h3 className="font-semibold text-foreground hover:text-amber-700 dark:hover:text-amber-400 transition-colors cursor-pointer truncate">
                  {mp.name}
                </h3>
              </Link>
              <p className="text-sm text-muted-foreground truncate">
                {mp.constituency}, {mp.state}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <Badge variant="secondary" className="text-xs">
                  {mp.party}
                </Badge>
                {mp.isMinister && mp.ministerialPosition && (
                  <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300">
                    {mp.ministerialPosition}
                  </Badge>
                )}
                {mp.isDeputyMinister && !mp.isMinister && (
                  <Badge variant="outline" className="text-xs border-green-300 text-green-700 dark:border-green-600 dark:text-green-300">
                    {t("mpSpotlight.deputyMinister")}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Highlight Stat */}
          <div className="bg-white/60 dark:bg-black/20 rounded-lg p-4 border border-amber-200/50 dark:border-amber-800/50">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 p-2.5 rounded-lg">
                {getHighlightIcon()}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                    {highlightStat.value}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {highlightStat.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("mpSpotlight.parliament15")}
                </p>
              </div>
            </div>
          </div>

          {/* Election Results & Constituency Data */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {/* Election Results */}
            {electionResults && electionResults.votePercentage !== null && (
              <div className="bg-white/60 dark:bg-black/20 rounded-lg p-3 border border-amber-200/50 dark:border-amber-800/50">
                <div className="flex items-center gap-2 mb-2">
                  <Vote className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                    {t("mpSpotlight.electionResults")}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{t("mpSpotlight.voteShare")}</span>
                    <span className="text-sm font-semibold text-foreground">
                      {electionResults.votePercentage.toFixed(1)}%
                    </span>
                  </div>
                  {electionResults.majority !== null && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">{t("mpSpotlight.majority")}</span>
                      <span className="text-sm font-semibold text-foreground">
                        {electionResults.majority.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {electionResults.turnoutPercent !== null && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">{t("mpSpotlight.turnout")}</span>
                      <span className="text-sm font-semibold text-foreground">
                        {electionResults.turnoutPercent.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  GE{electionResults.year === 2022 ? '15' : electionResults.year} ({electionResults.year})
                </p>
              </div>
            )}

            {/* Poverty Incidence */}
            {constituencyData && constituencyData.povertyIncidence !== null && (
              <div className="bg-white/60 dark:bg-black/20 rounded-lg p-3 border border-amber-200/50 dark:border-amber-800/50">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                    {t("mpSpotlight.constituencyData")}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{t("mpSpotlight.povertyRate")}</span>
                    <span className={`text-sm font-semibold ${
                      constituencyData.povertyIncidence > 10
                        ? 'text-red-600 dark:text-red-400'
                        : constituencyData.povertyIncidence > 5
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-green-600 dark:text-green-400'
                    }`}>
                      {constituencyData.povertyIncidence.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {mp.parliamentCode} • {mp.constituency}
                </p>
              </div>
            )}
          </div>

          {/* Hansard Quotes */}
          {hansardQuotes && hansardQuotes.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                <Quote className="h-3.5 w-3.5" />
                <span>{t("mpSpotlight.recentStatements")}</span>
              </div>
              <div className="space-y-2">
                {hansardQuotes.map((item, idx) => (
                  <blockquote
                    key={idx}
                    className="border-l-2 border-amber-300 dark:border-amber-700 pl-3 py-1"
                  >
                    <p className="text-xs text-muted-foreground italic leading-relaxed">
                      "{item.quote}"
                    </p>
                  </blockquote>
                ))}
              </div>
            </div>
          )}

          {/* View Profile Link */}
          <Link href={`/mp/${mp.id}`}>
            <div className="mt-4 flex items-center justify-end gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 cursor-pointer transition-colors group">
              <span>{t("mpSpotlight.viewProfile")}</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
