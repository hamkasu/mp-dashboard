/**
 * Copyright by Calmic Sdn Bhd
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Globe, FileText, TrendingUp } from "lucide-react";
import { format, startOfWeek, startOfMonth } from "date-fns";
import { getQueryFn } from "@/lib/queryClient";
import { useLanguage } from "@/i18n/LanguageContext";

type TimePeriod = "daily" | "weekly" | "monthly";
type PageView = "technical" | "simple";

const ASSET_PATTERNS = [
  /^\/sw\.js/,
  /^\/favicon/,
  /^\/manifest/,
  /^\/apple-touch-icon/,
  /^\/calmic-logo/,
  /^\/android-chrome/,
  /^\/site\.webmanifest/,
  /\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|css|js\.map)$/,
];

function isAssetPath(path: string): boolean {
  return ASSET_PATTERNS.some((p) => p.test(path));
}

function getSimplePageName(path: string): string {
  if (path === "/" || path === "") return "Home";
  if (path.startsWith("/mp/")) return "MP Profile";
  if (path.startsWith("/blog/")) return "Blog Post";
  if (path.startsWith("/dun/sarawak")) return "Sarawak State Assembly";
  if (path.startsWith("/dun/selangor")) return "Selangor State Assembly";
  if (path.startsWith("/external/")) return "External Site";

  const map: Record<string, string> = {
    "/activity": "Parliamentary Activity",
    "/hansard": "Hansard Debates",
    "/hansard-analysis": "Hansard Analysis",
    "/hansard-questions": "Hansard Questions",
    "/bills": "Bills",
    "/unpassed-bills": "Unpassed Bills",
    "/courts": "Court Cases",
    "/blog": "Blog",
    "/attendance": "Attendance",
    "/allowances": "Allowances",
    "/fundamental-rights": "Fundamental Rights",
    "/constitution": "Constitution",
    "/parliament-guide": "Parliament Guide",
    "/analytics": "Analytics Dashboard",
    "/report-card": "MP Report Cards",
    "/audit-summary": "Audit Summary",
    "/ma63": "MA63 Dashboard",
    "/parliamentary-answers": "Parliamentary Answers",
    "/constituency-analysis": "Constituency Analysis",
    "/pricing": "Pricing",
    "/login": "Login",
    "/admin/login": "Admin Login",
    "/admin-login": "Admin Login",
    "/account": "Account",
    "/daftar": "GigHalal Registration",
    "/gig/register": "GigHalal Registration",
    "/disclaimer": "Disclaimer",
  };

  return map[path] ?? path;
}

interface AnalyticsSummary {
  totalVisits: number;
  uniqueVisitors: number;
  topCountries: Array<{ country: string; count: number }>;
  topPages: Array<{ path: string; count: number }>;
}

interface RecentVisit {
  id: string;
  path: string;
  ip: string;
  country: string;
  city: string;
  region: string;
  timezone: string;
  userAgent: string;
  referrer: string;
  timestamp: string;
}

interface TimelineData {
  date: string;
  count: number;
}

export default function Analytics() {
  const { t } = useLanguage();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("daily");
  const [pageView, setPageView] = useState<PageView>("simple");

  // Calculate days based on time period
  const daysParam = useMemo(() => {
    switch (timePeriod) {
      case "daily": return 14;
      case "weekly": return 49; // 7 weeks
      case "monthly": return 365; // 12 months
      default: return 14;
    }
  }, [timePeriod]);

  // Check if user is logged in
  const { data: user } = useQuery<{ id: number; username: string; role: string } | null>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<AnalyticsSummary>({
    queryKey: ["/api/analytics/summary"],
  });

  const { data: recentVisits, isLoading: recentLoading } = useQuery<RecentVisit[]>({
    queryKey: ["/api/analytics/recent"],
  });

  const { data: timeline, isLoading: timelineLoading } = useQuery<TimelineData[]>({
    queryKey: ["/api/analytics/timeline", daysParam],
    queryFn: () => fetch(`/api/analytics/timeline?days=${daysParam}`).then(res => res.json()),
  });

  // Aggregate timeline data based on time period
  const aggregatedTimeline = useMemo(() => {
    if (!timeline) return [];

    if (timePeriod === "daily") {
      return timeline;
    }

    const aggregated = new Map<string, { date: string; count: number; label: string }>();

    timeline.forEach((day) => {
      const date = new Date(day.date);
      let key: string;
      let label: string;

      if (timePeriod === "weekly") {
        const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Start on Monday
        key = format(weekStart, "yyyy-MM-dd");
        label = format(weekStart, "MMM dd");
      } else {
        // monthly
        const monthStart = startOfMonth(date);
        key = format(monthStart, "yyyy-MM");
        label = format(monthStart, "MMM yyyy");
      }

      const existing = aggregated.get(key);
      if (existing) {
        existing.count += day.count;
      } else {
        aggregated.set(key, { date: key, count: day.count, label });
      }
    });

    return Array.from(aggregated.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [timeline, timePeriod]);

  // Get the description based on time period
  const getTimelineDescription = () => {
    switch (timePeriod) {
      case "daily": return t('analytics.dailyVisitorCount');
      case "weekly": return t('analytics.weeklyVisitorCount');
      case "monthly": return t('analytics.monthlyVisitorCount');
      default: return t('analytics.dailyVisitorCount');
    }
  };

  if (summaryLoading || recentLoading || timelineLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">{t('analytics.loadingAnalytics')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="Visitor Analytics"
        description="View visitor statistics and analytics for the Malaysian Parliament Dashboard. Track visits, unique visitors, and top pages."
        keywords="analytics, visitor statistics, web analytics, dashboard metrics"
        url="https://myparliament.calmic.com.my/analytics"
      />
      <Header />
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-analytics-title">
            {t('analytics.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('analytics.subtitle')}
          </p>
        </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-visits">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('analytics.totalVisits')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-visits">
              {summary?.totalVisits.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">{t('analytics.allTimePageViews')}</p>
          </CardContent>
        </Card>

        <Card data-testid="card-unique-visitors">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('analytics.uniqueVisitors')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-unique-visitors">
              {summary?.uniqueVisitors.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">{t('analytics.distinctIpAddresses')}</p>
          </CardContent>
        </Card>

        <Card data-testid="card-countries">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('analytics.countries')}</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-countries-count">
              {summary?.topCountries.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">{t('analytics.geographicReach')}</p>
          </CardContent>
        </Card>

        <Card data-testid="card-pages">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('analytics.topPages')}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pages-count">
              {summary?.topPages.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">{t('analytics.mostVisited')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Chart */}
      {aggregatedTimeline && aggregatedTimeline.length > 0 && (
        <Card data-testid="card-timeline">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>{t('analytics.visitsOverTime')}</CardTitle>
                <CardDescription>{getTimelineDescription()}</CardDescription>
              </div>
              <div className="flex gap-1">
                <Button
                  variant={timePeriod === "daily" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimePeriod("daily")}
                  data-testid="btn-daily"
                >
                  {t('analytics.daily')}
                </Button>
                <Button
                  variant={timePeriod === "weekly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimePeriod("weekly")}
                  data-testid="btn-weekly"
                >
                  {t('analytics.weekly')}
                </Button>
                <Button
                  variant={timePeriod === "monthly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimePeriod("monthly")}
                  data-testid="btn-monthly"
                >
                  {t('analytics.monthly')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {aggregatedTimeline.map((item) => (
                <div key={item.date} className="flex items-center gap-4">
                  <div className="w-24 text-sm text-muted-foreground">
                    {'label' in item ? item.label : format(new Date(item.date), "MMM dd")}
                  </div>
                  <div className="flex-1">
                    <div className="h-8 bg-primary/10 rounded-md relative overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-md transition-all"
                        style={{
                          width: `${Math.min(100, (item.count / (Math.max(...aggregatedTimeline.map(d => d.count)) || 1)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-right text-sm font-medium">
                    {item.count.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Countries */}
        <Card data-testid="card-top-countries">
          <CardHeader>
            <CardTitle>{t('analytics.topCountries')}</CardTitle>
            <CardDescription>{t('analytics.visitorsByCountry')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary?.topCountries.slice(0, 10).map((country) => (
                <div key={country.country} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{country.country || t('analytics.unknown')}</span>
                  </div>
                  <span className="text-muted-foreground">{country.count.toLocaleString()}</span>
                </div>
              ))}
              {!summary?.topCountries.length && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('analytics.noCountryData')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Pages */}
        <Card data-testid="card-top-pages">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle>{t('analytics.topPages')}</CardTitle>
                <CardDescription>{t('analytics.mostVisitedPages')}</CardDescription>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  variant={pageView === "simple" ? "default" : "outline"}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setPageView("simple")}
                >
                  Simple
                </Button>
                <Button
                  variant={pageView === "technical" ? "default" : "outline"}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setPageView("technical")}
                >
                  Technical
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pageView === "technical"
                ? summary?.topPages.slice(0, 10).map((page) => (
                    <div key={page.path} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium truncate font-mono text-sm">{page.path}</span>
                      </div>
                      <span className="text-muted-foreground flex-shrink-0">
                        {page.count.toLocaleString()}
                      </span>
                    </div>
                  ))
                : summary?.topPages
                    .filter((page) => !isAssetPath(page.path))
                    .slice(0, 10)
                    .map((page) => (
                      <div key={page.path} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium truncate">{getSimplePageName(page.path)}</span>
                        </div>
                        <span className="text-muted-foreground flex-shrink-0">
                          {page.count.toLocaleString()}
                        </span>
                      </div>
                    ))}
              {!summary?.topPages.length && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('analytics.noPageData')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Visits - Only visible to logged-in users */}
      {user && (
        <Card data-testid="card-recent-visits">
          <CardHeader>
            <CardTitle>{t('analytics.recentVisits')}</CardTitle>
            <CardDescription>{t('analytics.latestVisitorActivity')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentVisits?.slice(0, 20).map((visit) => (
                <div
                  key={visit.id}
                  className="flex flex-wrap items-center gap-4 text-sm border-b pb-3 last:border-0"
                  data-testid={`visit-${visit.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{visit.path}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(visit.timestamp), "MMM dd, yyyy HH:mm:ss")}
                    </div>
                  </div>
                  {visit.country && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Globe className="h-3 w-3" />
                      <span>
                        {visit.city ? `${visit.city}, ` : ""}
                        {visit.country}
                      </span>
                    </div>
                  )}
                  {visit.ip && (
                    <div className="text-xs text-muted-foreground font-mono">
                      {visit.ip}
                    </div>
                  )}
                </div>
              ))}
              {!recentVisits?.length && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('analytics.noRecentVisits')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
