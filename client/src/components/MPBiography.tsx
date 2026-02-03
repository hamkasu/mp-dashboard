/**
 * Copyright by Calmic Sdn Bhd
 *
 * MPBiography Component
 * Displays biography data sourced from MYMP.org.my (volunteer-run MP directory)
 *
 * Ethical Notes:
 * - Data is manually imported (not scraped) to respect MYMP terms
 * - Always credits MYMP as the source
 * - Links back to original MYMP profile
 * - No commercial resale of data
 */

import { useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  User,
  Calendar,
  MapPin,
  GraduationCap,
  Briefcase,
  Flag,
  Users,
  ExternalLink,
  Info,
  Star,
  Clock,
  BookOpen,
} from "lucide-react";
import type { Mp } from "@shared/schema";
import { format, differenceInYears } from "date-fns";

interface PoliticalHistoryEntry {
  party: string;
  startYear: number;
  endYear?: number;
  notes?: string;
}

interface MPBiographyProps {
  mp: Mp;
  className?: string;
}

/**
 * Calculate age from birth date
 */
function calculateAge(birthDate: Date | string | null | undefined): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  return differenceInYears(new Date(), birth);
}

/**
 * Format date for display
 */
function formatDate(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return format(d, "d MMMM yyyy");
}

/**
 * Score badge component with color coding
 */
function ScoreBadge({ score, label }: { score: number | null | undefined; label: string }) {
  if (score === null || score === undefined) return null;

  // Score is stored as 0-100 (MYMP uses 0-10, so multiply if needed)
  const displayScore = score > 10 ? score : score * 10;

  let colorClass = "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  if (displayScore >= 80) {
    colorClass = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  } else if (displayScore >= 60) {
    colorClass = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
  } else if (displayScore >= 40) {
    colorClass = "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
  } else {
    colorClass = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">{label}:</span>
      <Badge className={colorClass}>
        {displayScore.toFixed(0)}/100
      </Badge>
    </div>
  );
}

export function MPBiography({ mp, className = "" }: MPBiographyProps) {
  const { t } = useLanguage();

  // Parse JSONB fields safely
  const education = useMemo(() => {
    if (!mp.education) return [];
    if (Array.isArray(mp.education)) return mp.education as string[];
    return [];
  }, [mp.education]);

  const politicalHistory = useMemo(() => {
    if (!mp.politicalHistory) return [];
    if (Array.isArray(mp.politicalHistory)) return mp.politicalHistory as PoliticalHistoryEntry[];
    return [];
  }, [mp.politicalHistory]);

  const nonPoliticalAffiliations = useMemo(() => {
    if (!mp.nonPoliticalAffiliations) return [];
    if (Array.isArray(mp.nonPoliticalAffiliations)) return mp.nonPoliticalAffiliations as string[];
    return [];
  }, [mp.nonPoliticalAffiliations]);

  const careerHistory = useMemo(() => {
    if (!mp.careerHistory) return [];
    if (Array.isArray(mp.careerHistory)) return mp.careerHistory as string[];
    return [];
  }, [mp.careerHistory]);

  const age = calculateAge(mp.birthDate);
  const formattedBirthDate = formatDate(mp.birthDate);

  // Check if we have any MYMP data
  const hasMympData = !!(
    mp.bioSummary ||
    mp.birthDate ||
    mp.hometown ||
    education.length > 0 ||
    politicalHistory.length > 0 ||
    nonPoliticalAffiliations.length > 0 ||
    careerHistory.length > 0 ||
    mp.mympLoyaltyScore !== null ||
    mp.mympAvailabilityScore !== null ||
    mp.mympEthicsScore !== null
  );

  const mympUrl = mp.mympUrl || (mp.mympSlug ? `https://mymp.org.my/p/${mp.mympSlug}?locale=en` : null);

  // If no MYMP data and no MYMP URL, show fallback
  if (!hasMympData && !mympUrl) {
    return (
      <Card className={`border-blue-500/20 ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            {t('profile.biography')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 space-y-4">
            <User className="h-12 w-12 text-muted-foreground/50 mx-auto" />
            <p className="text-muted-foreground">
              {t('profile.dataNotAvailable')}
            </p>
            <a
              href="https://mymp.org.my"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              <Button variant="outline" size="sm" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                {t('profile.visitMymp')}
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-blue-500/20 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          {t('profile.biography')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('profile.biographyDesc')}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bio Summary */}
        {mp.bioSummary && (
          <div className="space-y-2">
            <p className="text-base leading-relaxed">{mp.bioSummary}</p>
            <Separator />
          </div>
        )}

        {/* Personal Profile Section */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <User className="h-4 w-4" />
            {t('profile.personalProfile')}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Birth Date & Age */}
            {formattedBirthDate && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('profile.birthDate')}</p>
                  <p className="font-medium">{formattedBirthDate}</p>
                  {age !== null && (
                    <p className="text-sm text-muted-foreground">
                      ({age} {t('profile.yearsOld')})
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Hometown */}
            {mp.hometown && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('profile.hometown')}</p>
                  <p className="font-medium">{mp.hometown}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Education */}
        {education.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                {t('profile.educationHistory')}
              </h4>
              <ul className="space-y-2" role="list" aria-label="Education history">
                {education.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1.5">•</span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Career History */}
        {careerHistory.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                {t('profile.careerHistory')}
              </h4>
              <ul className="space-y-2" role="list" aria-label="Career history">
                {careerHistory.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-500 mt-1.5">•</span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Political Journey */}
        {politicalHistory.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                <Flag className="h-4 w-4" />
                {t('profile.politicalJourney')}
              </h4>
              <div className="space-y-3" role="list" aria-label="Political journey">
                {politicalHistory.map((entry, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <Flag className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-medium">
                          {entry.party}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {entry.startYear} - {entry.endYear || t('profile.present')}
                        </span>
                      </div>
                      {entry.notes && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Non-Political Affiliations */}
        {nonPoliticalAffiliations.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t('profile.nonPoliticalAffiliations')}
              </h4>
              <ul className="space-y-2" role="list" aria-label="Non-political affiliations">
                {nonPoliticalAffiliations.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-purple-500 mt-1.5">•</span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* MYMP Scores (Optional) */}
        {(mp.mympLoyaltyScore !== null || mp.mympAvailabilityScore !== null || mp.mympEthicsScore !== null) && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  {t('profile.mympScores')}
                </h4>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">{t('profile.scoresDisclaimer')}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex flex-wrap gap-4">
                <ScoreBadge score={mp.mympLoyaltyScore} label={t('profile.loyaltyScore')} />
                <ScoreBadge score={mp.mympAvailabilityScore} label={t('profile.availabilityScore')} />
                <ScoreBadge score={mp.mympEthicsScore} label={t('profile.ethicsScore')} />
              </div>
            </div>
          </>
        )}

        {/* External Links Section */}
        <Separator />
        <div className="space-y-4">
          {/* Wikipedia Link */}
          {mp.wikipediaUrl && (
            <a
              href={mp.wikipediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              <BookOpen className="h-4 w-4" />
              {t('profile.wikipediaProfile')}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}

          {/* MYMP Credit and Link */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg space-y-3">
            <p className="text-xs text-muted-foreground">
              {t('profile.mympCredit')}
            </p>

            {mp.mympDataUpdatedAt && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {t('profile.lastUpdated')}: {formatDate(mp.mympDataUpdatedAt)}
              </p>
            )}

            {mympUrl && (
              <a
                href={mympUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="default" size="sm" className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  {t('profile.readMoreMymp')}
                </Button>
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default MPBiography;
