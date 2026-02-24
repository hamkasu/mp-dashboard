/**
 * Copyright by Calmic Sdn Bhd
 *
 * Bills to Watch Component
 *
 * A dynamic section highlighting pending/controversial bills in Malaysian Parliament.
 * Data is fetched from the API and refreshed daily via cron job.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  ScrollText,
  ExternalLink,
  Users,
  ChevronDown,
  ChevronUp,
  Scale,
  ShieldCheck,
  FileSearch,
  Building2,
  BookOpen,
  Clock,
  Flame,
  X,
  CircleDot
} from "lucide-react";
import { Link } from "wouter";

// Bill status types
type BillStatus = "drafting" | "consultation" | "tabled" | "committee" | "pending" | "passed";

interface BillToWatch {
  id: string;
  titleEn: string;
  titleMs: string;
  billNumber?: string | null;
  status: string;
  summaryEn: string;
  summaryMs: string;
  detailsEn?: string | null;
  detailsMs?: string | null;
  isFeatured: boolean;
  icon: string;
  tags: string[];
  sourceUrl?: string | null;
  sortOrder: number;
  updatedAt: string;
}

interface BillsToWatchResponse {
  bills: BillToWatch[];
  lastRefresh: string | null;
}

// ============================================================================
// Component Implementation
// ============================================================================

const STATUS_CONFIG: Record<BillStatus, { labelEn: string; labelMs: string; className: string }> = {
  drafting: { labelEn: "Drafting", labelMs: "Penggubalan", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  consultation: { labelEn: "Consultation", labelMs: "Perundingan", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  tabled: { labelEn: "Tabled", labelMs: "Dibentang", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  committee: { labelEn: "Committee", labelMs: "Jawatankuasa", className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300" },
  pending: { labelEn: "Pending", labelMs: "Menunggu", className: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300" },
  passed: { labelEn: "Passed", labelMs: "Diluluskan", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
};

const ICON_MAP: Record<string, typeof Scale> = {
  scale: Scale,
  shield: ShieldCheck,
  search: FileSearch,
  building: Building2,
  book: BookOpen,
  scroll: ScrollText,
  users: Users,
};

interface BillsToWatchProps {
  className?: string;
}

export function BillsToWatch({ className }: BillsToWatchProps) {
  const { language } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const { data, isLoading } = useQuery<BillsToWatchResponse>({
    queryKey: ["/api/bills-to-watch"],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  if (isDismissed) return null;

  const isMs = language === 'ms';
  const getText = (en: string, ms: string) => isMs ? ms : en;

  const billsData = data?.bills || [];
  const lastRefresh = data?.lastRefresh;
  const featuredBill = billsData.find(b => b.isFeatured);
  const otherBills = billsData.filter(b => !b.isFeatured);

  const formatLastUpdated = (isoString: string | null | undefined) => {
    if (!isoString) return isMs ? "Februari 2026" : "February 2026";
    const date = new Date(isoString);
    return date.toLocaleDateString(isMs ? 'ms-MY' : 'en-MY', {
      year: 'numeric',
      month: 'long',
    });
  };

  // Show loading skeleton
  if (isLoading) {
    return (
      <Card className={`relative overflow-hidden border-orange-200/50 dark:border-orange-900/30 bg-gradient-to-br from-orange-50/80 via-amber-50/50 to-yellow-50/30 dark:from-orange-950/20 dark:via-amber-950/10 dark:to-yellow-950/5 ${className}`}>
        <CardHeader className="pb-4">
          <div className="flex items-start gap-3">
            <div className="bg-gradient-to-br from-orange-500 to-amber-600 text-white p-2.5 rounded-xl">
              <ScrollText className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <Skeleton className="h-7 w-48 mb-2" />
              <Skeleton className="h-4 w-72" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  // If no data at all, don't render
  if (billsData.length === 0) return null;

  return (
    <Card
      className={`relative overflow-hidden border-orange-200/50 dark:border-orange-900/30 bg-gradient-to-br from-orange-50/80 via-amber-50/50 to-yellow-50/30 dark:from-orange-950/20 dark:via-amber-950/10 dark:to-yellow-950/5 ${className}`}
      data-testid="bills-to-watch"
      role="region"
      aria-label={isMs ? "Rang Undang-Undang Untuk Diperhatikan" : "Bills to Watch"}
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
        <div className="flex items-start gap-3">
          <div className="bg-gradient-to-br from-orange-500 to-amber-600 text-white p-2.5 rounded-xl shadow-lg shadow-orange-500/20">
            <ScrollText className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-xl font-bold text-orange-900 dark:text-orange-100">
                {isMs ? "Rang Undang-Undang Untuk Diperhatikan" : "Bills to Watch"}
              </CardTitle>
              <Flame className="h-5 w-5 text-orange-500 animate-pulse" aria-hidden="true" />
            </div>
            <p className="text-sm text-muted-foreground">
              {isMs
                ? "Rang undang-undang penting yang sedang dalam proses parlimen"
                : "Key legislation currently in the parliamentary pipeline"}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Featured Bill */}
        {featuredBill && (
          <div className="bg-white/80 dark:bg-black/20 rounded-xl p-4 border border-orange-200/50 dark:border-orange-800/30 shadow-sm">
            <div className="flex items-start gap-3 mb-3">
              <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg shrink-0">
                {(() => {
                  const IconComponent = ICON_MAP[featuredBill.icon] || ScrollText;
                  return <IconComponent className="h-5 w-5 text-orange-600 dark:text-orange-400" />;
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg text-foreground">
                    {getText(featuredBill.titleEn, featuredBill.titleMs)}
                  </h3>
                  <Badge className={`text-xs ${STATUS_CONFIG[featuredBill.status as BillStatus]?.className || STATUS_CONFIG.pending.className}`}>
                    {getText(
                      STATUS_CONFIG[featuredBill.status as BillStatus]?.labelEn || featuredBill.status,
                      STATUS_CONFIG[featuredBill.status as BillStatus]?.labelMs || featuredBill.status
                    )}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {featuredBill.tags.map(tag => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-xs border-orange-300/50 text-orange-700 dark:text-orange-300 bg-orange-50/50 dark:bg-orange-950/30"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-sm text-foreground/80 mb-3">
              {getText(featuredBill.summaryEn, featuredBill.summaryMs)}
            </p>

            {/* Latest update pill */}
            <div className="flex items-center gap-1.5 mb-3">
              <CircleDot className="h-3.5 w-3.5 text-emerald-500 shrink-0" aria-hidden="true" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                {isMs ? "Kemaskini terbaru: Feb 2026" : "Latest update: Feb 2026"}
              </span>
            </div>

            {/* Expandable details */}
            {(featuredBill.detailsEn || featuredBill.detailsMs) && (
              <>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center gap-1 text-sm font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors mb-2"
                  aria-expanded={isExpanded}
                  aria-controls="featured-bill-details"
                >
                  {isExpanded
                    ? (isMs ? "Tunjuk kurang" : "Show less")
                    : (isMs ? "Baca lebih lanjut" : "Read more")}
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {isExpanded && (
                  <div
                    id="featured-bill-details"
                    className="bg-orange-50/50 dark:bg-orange-950/20 rounded-lg p-3 text-sm text-foreground/80 whitespace-pre-line border border-orange-100 dark:border-orange-900/30"
                  >
                    {getText(featuredBill.detailsEn || "", featuredBill.detailsMs || "")}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Other Bills List */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {isMs ? "Lain-lain Rang Undang-Undang Dalam Perhatian" : "Other Bills Under Watch"}
          </h4>

          <ScrollArea className="max-h-[280px]">
            <ul className="space-y-2" role="list">
              {otherBills.map(bill => {
                const IconComponent = ICON_MAP[bill.icon] || ScrollText;
                return (
                  <li
                    key={bill.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-white/60 dark:bg-black/10 border border-orange-100/50 dark:border-orange-900/20 hover:bg-white/80 dark:hover:bg-black/20 transition-colors"
                  >
                    <div className="bg-orange-100/80 dark:bg-orange-900/20 p-1.5 rounded-md shrink-0 mt-0.5">
                      <IconComponent className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">
                          {getText(bill.titleEn, bill.titleMs)}
                        </span>
                        <Badge className={`text-xs ${STATUS_CONFIG[bill.status as BillStatus]?.className || STATUS_CONFIG.pending.className}`}>
                          {getText(
                            STATUS_CONFIG[bill.status as BillStatus]?.labelEn || bill.status,
                            STATUS_CONFIG[bill.status as BillStatus]?.labelMs || bill.status
                          )}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {getText(bill.summaryEn, bill.summaryMs)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            asChild
            size="sm"
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/20"
          >
            <Link href="/" aria-label={isMs ? "Hubungi Ahli Parlimen anda" : "Message your MP"}>
              <Users className="h-4 w-4 mr-1.5" />
              {isMs ? "Hubungi MP Anda" : "Message Your MP"}
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-950/30"
          >
            <a
              href="https://www.parlimen.gov.my"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={isMs ? "Jejak kemajuan di parlimen.gov.my" : "Track progress at parlimen.gov.my"}
            >
              <ExternalLink className="h-4 w-4 mr-1.5" />
              {isMs ? "Jejak di Parlimen.gov.my" : "Track at Parlimen.gov.my"}
            </a>
          </Button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-orange-200/30 dark:border-orange-800/20">
          <p className="text-xs text-muted-foreground">
            {isMs
              ? `Dikemas kini: ${formatLastUpdated(lastRefresh)} • Sumber: Kenyataan rasmi kerajaan`
              : `Last updated: ${formatLastUpdated(lastRefresh)} • Source: Official government statements`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
