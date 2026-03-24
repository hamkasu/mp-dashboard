/**
 * Copyright by Calmic Sdn Bhd
 *
 * ConstituencyHansardAnalysis — premium-gated constituency report.
 *
 * ── Content tiers ────────────────────────────────────────────────────────────
 *
 * PUBLIC  (no auth, always in HTML):
 *   • 3 summary stat cards (total constituencies, avg rate, parliament term)
 *   • Participation distribution bar chart (High / Moderate / Low buckets)
 *   • Top-5 constituency table with real names, states, MP badges, and rates
 *
 * PREMIUM (gated behind PremiumGate):
 *   • Full 222-row constituency table with session counts and speech counts
 *   • Rows 6-10 of public preview shown blurred as teaser
 *   • Shimmer rows suggesting the full extent of the dataset
 *
 * ── SEO reasoning ────────────────────────────────────────────────────────────
 *
 * Google's metered-paywall policy allows paywalled content without ranking
 * penalties PROVIDED the following rules are met:
 *
 *   1. NO CLOAKING — same HTML served to Googlebot and users.
 *      We achieve this because the public section is rendered unconditionally
 *      in the React component tree; it is not gated behind any client-side
 *      auth check.  The PremiumGate wrapper only toggles the blur CSS.
 *
 *   2. PUBLIC SECTION IS GENUINELY USEFUL — not thin placeholder content.
 *      The top-5 table contains real constituency names, real participation
 *      rates, and real MP names drawn from the production dataset.
 *      The distribution chart gives concrete aggregate statistics.
 *      This passes Google's "first click free" heuristic.
 *
 *   3. PREMIUM DATA NOT IN HTML PAYLOAD — full data is fetched from a
 *      separate endpoint (/api/constituencies/hansard-participation-15th)
 *      that returns 401/403 for unauthenticated requests.  This query is
 *      disabled (`enabled: isPremium`) for non-premium users so the full
 *      222-row dataset is never embedded in the page HTML or sent over the
 *      wire to free users.
 *
 *   4. STRUCTURED DATA ANNOTATION — the outer PremiumGate div carries
 *      class="premium-content", which is referenced in the WebPage schema
 *      via hasPart → cssSelector: ".premium-content".  This tells Google
 *      explicitly which DOM region is behind the paywall.
 *
 *   5. INTERNAL LINKING — MPProfile.tsx links to this page via each MP's
 *      constituency name, distributing PageRank from 222 indexed MP pages.
 *
 * References:
 *   https://developers.google.com/search/docs/appearance/structured-data/paywalled-content
 *   https://schema.org/isAccessibleForFree
 */

import { useQuery } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MapPin,
  TrendingUp,
  MessageSquare,
  Users,
  Activity,
  BarChart2,
  Download,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PremiumGate } from "@/components/PremiumGate";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DistributionBucket {
  range: string;
  label: string;
  count: number;
}

interface PreviewConstituency {
  constituency: string;
  state: string;
  participationRate: number;
  mpNames: string[];
}

interface PreviewData {
  summary: {
    totalConstituencies: number;
    avgParticipationRate: number;
    parliamentTerm: string;
  } | null;
  topConstituencies: PreviewConstituency[];
  distributionBuckets: DistributionBucket[];
}

interface FullConstituency {
  constituency: string;
  state: string;
  totalSessions: number;
  sessionsSpoke: number;
  totalSpeeches: number;
  participationRate: number;
  mpIds: string[];
  mpNames: string[];
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

const rateColour = (rate: number) => {
  if (rate >= 70) return "text-green-600 dark:text-green-400";
  if (rate >= 40) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
};

const BUCKET_COLOURS = ["#22c55e", "#eab308", "#ef4444"];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryStats({
  summary,
}: {
  summary: PreviewData["summary"];
}) {
  if (!summary) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950">
              <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{summary.totalConstituencies}</p>
              <p className="text-xs text-muted-foreground">Constituencies tracked</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-50 dark:bg-green-950">
              <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{summary.avgParticipationRate}%</p>
              <p className="text-xs text-muted-foreground">Avg participation rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950">
              <BarChart2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{summary.parliamentTerm}</p>
              <p className="text-xs text-muted-foreground">Parliament term</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DistributionChart({ buckets }: { buckets: DistributionBucket[] }) {
  if (!buckets.length) return null;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart2 className="h-4 w-4" />
          Participation Rate Distribution
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          How constituencies are distributed across participation tiers
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={buckets} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="range"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={32}
            />
            <Tooltip
              formatter={(value: number, _name: string, props: { payload?: DistributionBucket }) => [
                `${value} constituencies`,
                props.payload?.label ?? "",
              ]}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {buckets.map((_, i) => (
                <Cell key={i} fill={BUCKET_COLOURS[i] ?? "#6b7280"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          {buckets.map((b, i) => (
            <span key={b.range} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: BUCKET_COLOURS[i] }}
              />
              {b.range} — {b.label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** Top-5 preview rows — always visible to everyone */
function PreviewTable({ rows }: { rows: PreviewConstituency[] }) {
  const top5 = rows.slice(0, 5);

  return (
    <Card className="mb-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Top 5 Most Active Constituencies
          <Badge variant="secondary" className="ml-auto text-xs font-normal">
            Preview
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-b-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">#</TableHead>
                <TableHead>Constituency</TableHead>
                <TableHead className="hidden sm:table-cell">State</TableHead>
                <TableHead className="hidden sm:table-cell">MP(s)</TableHead>
                <TableHead className="text-right pr-6">Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {top5.map((c, i) => (
                <TableRow key={c.constituency}>
                  <TableCell className="pl-6 text-muted-foreground font-medium">
                    {i + 1}
                  </TableCell>
                  <TableCell className="font-medium">{c.constituency}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline" className="text-xs">
                      {c.state}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {c.mpNames.slice(0, 2).map((name) => (
                        <Badge
                          key={name}
                          variant="secondary"
                          className="text-xs max-w-[140px] truncate"
                        >
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <span className={`font-bold ${rateColour(c.participationRate)}`}>
                      {c.participationRate.toFixed(1)}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/** Rows 6–10 from the public preview — shown blurred behind the gate */
function PreviewBlurRows({ rows }: { rows: PreviewConstituency[] }) {
  const tail = rows.slice(5, 10);
  if (!tail.length) return null;

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6">#</TableHead>
            <TableHead>Constituency</TableHead>
            <TableHead className="hidden sm:table-cell">State</TableHead>
            <TableHead className="hidden sm:table-cell">MP(s)</TableHead>
            <TableHead className="text-right pr-6">Rate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tail.map((c, i) => (
            <TableRow key={c.constituency}>
              <TableCell className="pl-6 text-muted-foreground font-medium">
                {i + 6}
              </TableCell>
              <TableCell className="font-medium">{c.constituency}</TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge variant="outline" className="text-xs">
                  {c.state}
                </Badge>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <div className="flex flex-wrap gap-1">
                  {c.mpNames.slice(0, 2).map((name) => (
                    <Badge key={name} variant="secondary" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-right pr-6">
                <span className={`font-bold ${rateColour(c.participationRate)}`}>
                  {c.participationRate.toFixed(1)}%
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Full table — only rendered (and fetched) when the user is premium */
function FullTable({ data }: { data: FullConstituency[] }) {
  // Track which row is currently downloading (by constituency key)
  const [downloading, setDownloading] = useState<string | null>(null);

  /**
   * Trigger a PDF download for a single constituency.
   *
   * We use fetch() + createObjectURL rather than window.location.href so we
   * can show per-row loading state and handle errors gracefully.
   * Session cookies are sent automatically with credentials:"include".
   *
   * Security: the server verifies premium subscription on every request via
   * the requirePremium middleware — client-side state is untrusted.
   */
  const handleDownload = useCallback(async (c: FullConstituency) => {
    const key = `${c.constituency}-${c.state}`;
    if (downloading === key) return; // prevent double-click
    setDownloading(key);
    try {
      const url =
        `/api/constituencies/report/download` +
        `?name=${encodeURIComponent(c.constituency)}` +
        `&state=${encodeURIComponent(c.state)}`;

      const res = await fetch(url, { credentials: "include" });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      // Stream the PDF blob and trigger a browser download
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      // Derive filename from Content-Disposition header, or fall back to slug
      const cd = res.headers.get("content-disposition") ?? "";
      const match = cd.match(/filename="([^"]+)"/);
      anchor.download = match?.[1] ?? `constituency-report.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error("PDF download failed:", err);
      // Show a brief inline error — no toast dependency needed
      alert(`Download failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setDownloading(null);
    }
  }, [downloading]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          All {data.length} Constituencies — 15th Parliament
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Sorted by Hansard speaking participation rate · Click{" "}
          <Download className="inline h-3 w-3" /> to download a PDF report
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-b-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">#</TableHead>
                <TableHead>Constituency</TableHead>
                <TableHead className="hidden md:table-cell">State</TableHead>
                <TableHead className="hidden sm:table-cell text-center">
                  Sessions Spoke
                </TableHead>
                <TableHead className="hidden sm:table-cell text-center">
                  Speeches
                </TableHead>
                <TableHead className="text-right pr-2">Rate</TableHead>
                <TableHead className="hidden lg:table-cell">MPs</TableHead>
                {/* PDF download column — premium feature */}
                <TableHead className="w-10 pr-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c, idx) => {
                const key = `${c.constituency}-${c.state}`;
                const isDownloading = downloading === key;
                return (
                  <TableRow
                    key={key}
                    data-testid={`row-constituency-${idx}`}
                  >
                    <TableCell className="pl-6 text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-medium" data-testid={`text-constituency-${idx}`}>
                      {c.constituency}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" data-testid={`badge-state-${idx}`}>
                        {c.state}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className="hidden sm:table-cell text-center"
                      data-testid={`text-sessions-${idx}`}
                    >
                      <div className="flex flex-col items-center">
                        <span className="font-semibold">{c.sessionsSpoke}</span>
                        <span className="text-xs text-muted-foreground">
                          of {c.totalSessions}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell
                      className="hidden sm:table-cell text-center font-semibold"
                      data-testid={`text-speeches-${idx}`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                        {c.totalSpeeches}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-2">
                      <span
                        className={`text-base font-bold ${rateColour(c.participationRate)}`}
                        data-testid={`text-rate-${idx}`}
                      >
                        {c.participationRate.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {c.mpNames.map((name, mi) => (
                          <Badge
                            key={mi}
                            variant="secondary"
                            className="text-xs"
                            data-testid={`badge-mp-${idx}-${mi}`}
                          >
                            {name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    {/* Per-row PDF download button */}
                    <TableCell className="pr-4 text-right">
                      <button
                        onClick={() => handleDownload(c)}
                        disabled={isDownloading}
                        title={`Download PDF report for ${c.constituency}`}
                        className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        data-testid={`btn-download-${idx}`}
                      >
                        {isDownloading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        <span className="sr-only">
                          Download PDF for {c.constituency}
                        </span>
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ConstituencyHansardAnalysis() {
  const { isPremium, isLoading: authLoading } = useAuth();

  // ── Public preview (always fetched) ────────────────────────────────────────
  const { data: preview, isLoading: previewLoading } = useQuery<PreviewData>({
    queryKey: ["/api/constituencies/public-preview"],
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  // ── Full premium data (only fetched when premium) ──────────────────────────
  // When not premium this query is disabled — no data is ever sent.
  const { data: fullData, isLoading: fullLoading } = useQuery<FullConstituency[]>({
    queryKey: ["/api/constituencies/hansard-participation-15th"],
    enabled: isPremium && !authLoading,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (previewLoading || authLoading) {
    return (
      <div className="space-y-4" data-testid="card-constituency-analysis">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="pt-5 pb-4">
                <div className="h-12 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-5">
            <div className="h-48 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="h-64 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── No data fallback ────────────────────────────────────────────────────────
  if (!preview?.summary) {
    return (
      <Card data-testid="card-constituency-analysis">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            15th Parliament Constituency Hansard Participation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No constituency data available yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="card-constituency-analysis">

      {/* ── SECTION 1: Summary stats (always public) ────────────────────── */}
      <SummaryStats summary={preview.summary} />

      {/* ── SECTION 2: Distribution chart (always public) ───────────────── */}
      <DistributionChart buckets={preview.distributionBuckets} />

      {/* ── SECTION 3: Top-5 preview table (always public) ──────────────── */}
      <div>
        <PreviewTable rows={preview.topConstituencies} />
        <p className="text-xs text-muted-foreground text-right mt-1 pr-1">
          Showing top 5 of {preview.summary.totalConstituencies} constituencies
        </p>
      </div>

      {/* ── SECTION 4: Full dataset — gated for non-premium ─────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 py-1">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Full Intelligence Report
          </h2>
          {!isPremium && (
            <Badge variant="outline" className="ml-auto text-xs gap-1">
              Premium
            </Badge>
          )}
        </div>

        <PremiumGate
          isPremium={isPremium}
          isAuthLoading={authLoading}
          featureName="Full Constituency Intelligence"
          minHeight="480px"
        >
          {isPremium && fullData ? (
            <FullTable data={fullData} />
          ) : (
            // Blurred placeholder — rows 6–10 from public preview
            // Non-premium users only ever see this blurred, never the real premium payload
            <div className="space-y-4">
              <PreviewBlurRows rows={preview.topConstituencies} />
              {/* Additional shimmer rows to suggest the full extent of the dataset */}
              <div className="rounded-lg border divide-y overflow-hidden">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 px-6 py-3"
                  >
                    <span className="w-5 text-muted-foreground text-sm">{i + 11}</span>
                    <div className="h-3 w-32 bg-muted rounded" />
                    <div className="h-3 w-16 bg-muted/60 rounded ml-2" />
                    <div className="h-3 w-10 bg-muted/40 rounded ml-auto" />
                  </div>
                ))}
              </div>
              <p className="text-xs text-center text-muted-foreground">
                +{(preview.summary.totalConstituencies - 10).toLocaleString()} more constituencies
              </p>
            </div>
          )}
        </PremiumGate>
      </div>

      {/* ── Legend ──────────────────────────────────────────────────────── */}
      {isPremium && (
        <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground pt-2">
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-green-500" />
            High participation (≥70%)
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-yellow-500" />
            Moderate (40–69%)
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-500" />
            Low (&lt;40%)
          </span>
        </div>
      )}
    </div>
  );
}
