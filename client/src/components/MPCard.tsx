/**
 * Copyright by Calmic Sdn Bhd
 */

import { MapPin, UserCircle, Wallet, Calendar, Mic, TrendingDown, ScrollText, MessageSquareWarning, HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Mp, LegislativeProposal, ParliamentaryQuestion } from "@shared/schema";
import { Link } from "wouter";
import { calculateTotalSalary, formatCurrency } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";
import { useConstituencyByCode } from "@/hooks/use-constituencies";
import type { LanguageStat } from "./MPGrid";

interface MPCardProps {
  mp: Mp;
  bills?: LegislativeProposal[];
  oralQuestions?: ParliamentaryQuestion[];
  languageStats?: LanguageStat;
}

const PARTY_COLORS: Record<string, string> = {
  PH: "bg-chart-1 text-white",
  BN: "bg-chart-2 text-white",
  GPS: "bg-chart-3 text-white",
  GRS: "bg-chart-4 text-white",
  WARISAN: "bg-chart-5 text-white",
  KDM: "bg-primary text-primary-foreground",
  PBM: "bg-secondary text-secondary-foreground",
  PN: "bg-accent text-accent-foreground",
  MUDA: "bg-muted text-muted-foreground",
  BEBAS: "bg-destructive text-destructive-foreground",
};

function getAttendanceColor(attendanceRate: number): string {
  if (attendanceRate >= 85) return "text-green-600 dark:text-green-400";
  if (attendanceRate >= 70) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getSpeakingColor(speakingRate: number): string {
  if (speakingRate >= 70) return "text-green-600 dark:text-green-400";
  if (speakingRate >= 40) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getPovertyColor(povertyRate: number): string {
  if (povertyRate <= 2) return "text-green-600 dark:text-green-400";
  if (povertyRate <= 10) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

export function MPCard({ mp, bills, oralQuestions, languageStats }: MPCardProps) {
  const { t } = useLanguage();
  const { data: constituency } = useConstituencyByCode(mp.parliamentCode);
  const initials = mp.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const partyColor = PARTY_COLORS[mp.party] || "bg-muted text-muted-foreground";
  const monthlySalary = mp.mpAllowance;
  const yearlySalary = monthlySalary * 12;
  
  // Use Hansard-based attendance if available, otherwise fall back to static fields
  const totalSessions = (mp as any).totalHansardSessions ?? mp.totalParliamentDays;
  const sessionsAttended = (mp as any).hansardSessionsAttended ?? mp.daysAttended;
  
  const totalSalary = calculateTotalSalary(mp.swornInDate, monthlySalary, sessionsAttended, mp.parliamentSittingAllowance);
  
  const attendanceRate = totalSessions > 0 
    ? (sessionsAttended / totalSessions) * 100 
    : 0;
  const attendanceColor = getAttendanceColor(attendanceRate);
  
  // Calculate speaking participation rate (compared to sessions attended)
  const speakingRate = sessionsAttended > 0
    ? (mp.hansardSessionsSpoke / sessionsAttended) * 100
    : 0;
  const speakingColor = getSpeakingColor(speakingRate);

  return (
    <Link href={`/mp/${mp.id}`}>
      <Card 
        className="hover-elevate overflow-hidden transition-shadow duration-200 cursor-pointer h-full"
        data-testid={`card-mp-${mp.id}`}
      >
        <div className="aspect-[3/4] relative overflow-hidden bg-muted">
          {mp.photoUrl ? (
            <img
              src={mp.photoUrl}
              alt={mp.name}
              className="object-cover w-full h-full"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <UserCircle className="w-24 h-24 text-muted-foreground/50" />
            </div>
          )}
        </div>
        
        <CardContent className="p-4 space-y-3">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold leading-tight line-clamp-2" data-testid={`text-mp-name-${mp.id}`}>
              {mp.title && <span className="text-muted-foreground text-sm">{mp.title} </span>}
              {mp.name}
            </h3>
            
            {mp.role && (
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {mp.role}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={partyColor} data-testid={`badge-party-${mp.id}`}>
              {mp.party}
            </Badge>
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium line-clamp-1">{mp.constituency}</p>
                <p className="text-xs text-muted-foreground">{mp.state}</p>
                {constituency?.povertyIncidence !== null && constituency?.povertyIncidence !== undefined && (
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingDown className="h-3 w-3 text-muted-foreground" />
                    <p className={`text-xs font-medium ${getPovertyColor(constituency.povertyIncidence)}`}>
                      {constituency.povertyIncidence.toFixed(1)}% poverty rate
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 space-y-1">
                <div>
                  <p className="font-semibold text-green-600 dark:text-green-400" data-testid={`text-total-earned-${mp.id}`}>
                    {formatCurrency(totalSalary)}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('mpCard.totalEarned')}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-muted">
                  <div>
                    <p className="font-medium" data-testid={`text-monthly-allowance-${mp.id}`}>{formatCurrency(monthlySalary)}</p>
                    <p className="text-xs text-muted-foreground">{t('mpCard.monthly')}</p>
                  </div>
                  <div>
                    <p className="font-medium" data-testid={`text-yearly-allowance-${mp.id}`}>{formatCurrency(yearlySalary)}</p>
                    <p className="text-xs text-muted-foreground">{t('mpCard.yearly')}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className={`font-semibold ${attendanceColor}`} data-testid={`text-attendance-${mp.id}`}>
                  {sessionsAttended}/{totalSessions} {t('mpCard.sessions')}
                </p>
                <p className="text-xs text-muted-foreground">{t('mpCard.hansardAttendance')} ({attendanceRate.toFixed(1)}% {t('mpCard.sinceSwornIn')})</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(mp.parliamentSittingAllowance * sessionsAttended)} - {t('mpCard.parliamentSittingAllowance')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Mic className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className={`font-semibold ${speakingColor}`} data-testid={`text-speaking-${mp.id}`}>
                  {mp.totalSpeechInstances > 0 ? (
                    <>{mp.totalSpeechInstances} {t('mpCard.speeches')} {t('common.in')} {mp.hansardSessionsSpoke} {t('mpCard.sessions')}</>
                  ) : (
                    <>{t('mpCard.spokeIn')} {mp.hansardSessionsSpoke} {t('mpCard.sessions')}</>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {mp.totalSpeechInstances > 0
                    ? `${t('mpCard.hansardParticipation')} (${t('mpCard.avg')} ${(mp.totalSpeechInstances / (mp.hansardSessionsSpoke || 1)).toFixed(1)} ${t('mpCard.speechesPerSession')})`
                    : t('mpCard.hansardSpeakingParticipation')
                  }
                </p>
              </div>
            </div>

            {bills && bills.length > 0 && (
              <div className="flex items-start gap-2">
                <ScrollText className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-green-600 dark:text-green-400" data-testid={`text-bills-${mp.id}`}>
                    {bills.length} {bills.length === 1 ? t('mpCard.bill') : t('mpCard.bills')}
                  </p>
                  <div className="space-y-1 mt-1">
                    {bills.slice(0, 3).map((bill, index) => (
                      <p key={bill.id} className="text-xs text-muted-foreground line-clamp-1" title={bill.title}>
                        {index + 1}. {bill.title}
                      </p>
                    ))}
                    {bills.length > 3 && (
                      <p className="text-xs text-muted-foreground italic">
                        +{bills.length - 3} {t('mpCard.more')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {oralQuestions && oralQuestions.length > 0 && (
              <div className="flex items-start gap-2">
                <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-blue-600 dark:text-blue-400" data-testid={`text-questions-${mp.id}`}>
                    {oralQuestions.length} {oralQuestions.length === 1 ? t('mpCard.oralQuestion') : t('mpCard.oralQuestions')}
                  </p>
                  <div className="space-y-1 mt-1">
                    {oralQuestions.slice(0, 3).map((question, index) => (
                      <p key={question.id} className="text-xs text-muted-foreground line-clamp-1" title={question.topic}>
                        {index + 1}. {question.topic}
                      </p>
                    ))}
                    {oralQuestions.length > 3 && (
                      <p className="text-xs text-muted-foreground italic">
                        +{oralQuestions.length - 3} {t('mpCard.more')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {languageStats && languageStats.count > 0 && (
              <div className="flex items-start gap-2">
                <MessageSquareWarning className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-orange-600 dark:text-orange-400" data-testid={`text-language-${mp.id}`}>
                    {languageStats.count} {t('mpCard.inappropriateInstances')}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {languageStats.words.slice(0, 5).map((word, index) => (
                      <span key={index} className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded">
                        {word}
                      </span>
                    ))}
                    {languageStats.words.length > 5 && (
                      <span className="text-xs text-muted-foreground italic">
                        +{languageStats.words.length - 5} {t('mpCard.more')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground font-mono">
              {mp.parliamentCode}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
