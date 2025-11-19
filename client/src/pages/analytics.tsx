import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Globe, FileText, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { getQueryFn } from "@/lib/queryClient";

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
    queryKey: ["/api/analytics/timeline"],
  });

  if (summaryLoading || recentLoading || timelineLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="text-analytics-title">
          Visitor Analytics
        </h1>
        <p className="text-muted-foreground">
          Track and monitor website traffic from around the world
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-visits">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-visits">
              {summary?.totalVisits.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">All time page views</p>
          </CardContent>
        </Card>

        <Card data-testid="card-unique-visitors">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-unique-visitors">
              {summary?.uniqueVisitors.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">Distinct IP addresses</p>
          </CardContent>
        </Card>

        <Card data-testid="card-countries">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Countries</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-countries-count">
              {summary?.topCountries.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Geographic reach</p>
          </CardContent>
        </Card>

        <Card data-testid="card-pages">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Pages</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pages-count">
              {summary?.topPages.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Most visited</p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Chart */}
      {timeline && timeline.length > 0 && (
        <Card data-testid="card-timeline">
          <CardHeader>
            <CardTitle>Visits Over Time</CardTitle>
            <CardDescription>Daily visitor count for the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {timeline.map((day) => (
                <div key={day.date} className="flex items-center gap-4">
                  <div className="w-24 text-sm text-muted-foreground">
                    {format(new Date(day.date), "MMM dd")}
                  </div>
                  <div className="flex-1">
                    <div className="h-8 bg-primary/10 rounded-md relative overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-md transition-all"
                        style={{
                          width: `${Math.min(100, (day.count / (Math.max(...timeline.map(d => d.count)) || 1)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-right text-sm font-medium">
                    {day.count}
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
            <CardTitle>Top Countries</CardTitle>
            <CardDescription>Visitors by country</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary?.topCountries.slice(0, 10).map((country) => (
                <div key={country.country} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{country.country || "Unknown"}</span>
                  </div>
                  <span className="text-muted-foreground">{country.count.toLocaleString()}</span>
                </div>
              ))}
              {!summary?.topCountries.length && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No country data yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Pages */}
        <Card data-testid="card-top-pages">
          <CardHeader>
            <CardTitle>Top Pages</CardTitle>
            <CardDescription>Most visited pages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary?.topPages.slice(0, 10).map((page) => (
                <div key={page.path} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium truncate">{page.path}</span>
                  </div>
                  <span className="text-muted-foreground flex-shrink-0">
                    {page.count.toLocaleString()}
                  </span>
                </div>
              ))}
              {!summary?.topPages.length && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No page data yet
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
            <CardTitle>Recent Visits</CardTitle>
            <CardDescription>Latest visitor activity</CardDescription>
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
                  No recent visits yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
