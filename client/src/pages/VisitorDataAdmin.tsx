/**
 * Copyright by Calmic Sdn Bhd
 *
 * Visitor Data Admin Panel
 * Complete information on visitor data including detailed table,
 * geographic breakdown, referrers, hourly distribution, and export.
 */

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Globe,
  Eye,
  TrendingUp,
  Clock,
  MapPin,
  Monitor,
  ExternalLink,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Activity,
  BarChart3,
  Link2,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageMeta } from "@/components/PageMeta";
import { format, formatDistanceToNow } from "date-fns";

interface VisitorRecord {
  id: string;
  path: string;
  ip: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  timezone: string | null;
  userAgent: string | null;
  referrer: string | null;
  timestamp: string;
}

interface VisitorDataResponse {
  visitors: VisitorRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalVisits: number;
    uniqueVisitors: number;
    todayVisits: number;
    weekVisits: number;
    monthVisits: number;
  };
  topReferrers: Array<{ referrer: string; count: number }>;
  countries: Array<{ country: string; count: number }>;
  topCities: Array<{ city: string; country: string; count: number }>;
  hourlyDistribution: Array<{ hour: string; count: number }>;
}

function parseUserAgent(ua: string | null): { browser: string; os: string; device: string } {
  if (!ua) return { browser: "Unknown", os: "Unknown", device: "Unknown" };

  let browser = "Unknown";
  let os = "Unknown";
  let device = "Desktop";

  // Browser detection
  if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("OPR/") || ua.includes("Opera")) browser = "Opera";
  else if (ua.includes("Chrome/") && !ua.includes("Edg/")) browser = "Chrome";
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("bot") || ua.includes("Bot") || ua.includes("crawler")) browser = "Bot";

  // OS detection
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS X") || ua.includes("Macintosh")) os = "macOS";
  else if (ua.includes("Linux") && !ua.includes("Android")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  // Device detection
  if (ua.includes("Mobile") || ua.includes("Android") || ua.includes("iPhone")) device = "Mobile";
  else if (ua.includes("iPad") || ua.includes("Tablet")) device = "Tablet";
  else if (ua.includes("bot") || ua.includes("Bot") || ua.includes("crawler") || ua.includes("Googlebot")) device = "Bot";

  return { browser, os, device };
}

export default function VisitorDataAdmin() {
  const [, navigate] = useLocation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorRecord | null>(null);
  const [activeTab, setActiveTab] = useState<"table" | "geography" | "referrers" | "hourly">("table");

  // Auth check
  const { data: authStatus, isLoading: authLoading } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/auth-status"],
  });

  useEffect(() => {
    if (!authLoading && !authStatus?.isAdmin) {
      navigate("/admin-login");
    }
  }, [authLoading, authStatus, navigate]);

  // Build query params
  const queryParams = new URLSearchParams();
  queryParams.set("page", page.toString());
  queryParams.set("limit", "50");
  if (search) queryParams.set("search", search);
  if (countryFilter && countryFilter !== "all") queryParams.set("country", countryFilter);
  if (dateFrom) queryParams.set("dateFrom", dateFrom);
  if (dateTo) queryParams.set("dateTo", dateTo);

  const { data, isLoading } = useQuery<VisitorDataResponse>({
    queryKey: ["/api/admin/visitor-data", page, search, countryFilter, dateFrom, dateTo],
    queryFn: () => fetch(`/api/admin/visitor-data?${queryParams.toString()}`, { credentials: "include" }).then(r => r.json()),
    enabled: authStatus?.isAdmin === true,
  });

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (countryFilter && countryFilter !== "all") params.set("country", countryFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    window.open(`/api/admin/visitor-data/export?${params.toString()}`, "_blank");
  };

  const handleClearFilters = () => {
    setSearch("");
    setSearchInput("");
    setCountryFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  if (!authStatus?.isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground">Checking authorization...</p>
          </div>
        </main>
      </div>
    );
  }

  const maxHourlyCount = data?.hourlyDistribution ? Math.max(...data.hourlyDistribution.map(h => h.count), 1) : 1;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PageMeta
        title="Visitor Data Admin | MyParliament"
        description="Complete visitor data and analytics administration"
      />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <Eye className="h-8 w-8 text-primary" />
                Visitor Data
              </h1>
              <p className="text-muted-foreground">
                Complete information on all visitor activity and analytics
              </p>
            </div>
            <Button onClick={handleExport} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {/* Summary Cards */}
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : data?.summary && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.summary.totalVisits.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">All time</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.summary.uniqueVisitors.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Distinct IPs</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.summary.todayVisits.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Visits today</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">This Week</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.summary.weekVisits.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Last 7 days</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">This Month</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.summary.monthVisits.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <div className="lg:col-span-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search path, IP, city, referrer..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                    <Button onClick={handleSearch} size="icon" variant="outline">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Select value={countryFilter} onValueChange={(v) => { setCountryFilter(v); setPage(1); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="All countries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All countries</SelectItem>
                      {data?.countries?.map((c) => (
                        <SelectItem key={c.country} value={c.country}>
                          {c.country} ({c.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                    placeholder="From date"
                  />
                </div>

                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                    placeholder="To date"
                  />
                  <Button onClick={handleClearFilters} variant="ghost" size="sm" className="whitespace-nowrap">
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tab Navigation */}
          <div className="flex gap-1 border-b">
            <Button
              variant={activeTab === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("table")}
              className="rounded-b-none"
            >
              <Users className="h-4 w-4 mr-2" />
              Visitor Log
            </Button>
            <Button
              variant={activeTab === "geography" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("geography")}
              className="rounded-b-none"
            >
              <Globe className="h-4 w-4 mr-2" />
              Geography
            </Button>
            <Button
              variant={activeTab === "referrers" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("referrers")}
              className="rounded-b-none"
            >
              <Link2 className="h-4 w-4 mr-2" />
              Referrers
            </Button>
            <Button
              variant={activeTab === "hourly" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("hourly")}
              className="rounded-b-none"
            >
              <Clock className="h-4 w-4 mr-2" />
              Hourly Traffic
            </Button>
          </div>

          {/* Visitor Log Table */}
          {activeTab === "table" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Visitor Log</CardTitle>
                    <CardDescription>
                      {data?.pagination ? `${data.pagination.total.toLocaleString()} total records` : "Loading..."}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : !data?.visitors || data.visitors.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No visitor records found</p>
                    {(search || countryFilter !== "all" || dateFrom || dateTo) && (
                      <p className="text-sm mt-2">Try adjusting your filters</p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Timestamp</TableHead>
                            <TableHead>Path</TableHead>
                            <TableHead>IP</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Browser / OS</TableHead>
                            <TableHead>Referrer</TableHead>
                            <TableHead className="text-right">Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.visitors.map((visitor) => {
                            const ua = parseUserAgent(visitor.userAgent);
                            return (
                              <TableRow key={visitor.id} className="hover:bg-muted/50">
                                <TableCell className="whitespace-nowrap">
                                  <div className="text-sm">
                                    {format(new Date(visitor.timestamp), "MMM dd, yyyy")}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {format(new Date(visitor.timestamp), "HH:mm:ss")}
                                  </div>
                                </TableCell>
                                <TableCell className="max-w-[200px]">
                                  <div className="truncate font-medium text-sm" title={visitor.path}>
                                    {visitor.path}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="font-mono text-xs">{visitor.ip || "-"}</span>
                                </TableCell>
                                <TableCell>
                                  {visitor.country ? (
                                    <div className="text-sm">
                                      <div className="flex items-center gap-1">
                                        <Globe className="h-3 w-3 text-muted-foreground" />
                                        {visitor.country}
                                      </div>
                                      {visitor.city && (
                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                          <MapPin className="h-3 w-3" />
                                          {visitor.city}{visitor.region ? `, ${visitor.region}` : ""}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm flex items-center gap-1">
                                    <Monitor className="h-3 w-3 text-muted-foreground" />
                                    {ua.browser}
                                  </div>
                                  <div className="text-xs text-muted-foreground">{ua.os} / {ua.device}</div>
                                </TableCell>
                                <TableCell className="max-w-[150px]">
                                  {visitor.referrer ? (
                                    <span className="text-xs truncate block" title={visitor.referrer}>
                                      {visitor.referrer}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Direct</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setSelectedVisitor(visitor)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {data.pagination && data.pagination.totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-muted-foreground">
                          Page {data.pagination.page} of {data.pagination.totalPages}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= data.pagination.totalPages}
                            onClick={() => setPage(p => p + 1)}
                          >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Geography Tab */}
          {activeTab === "geography" && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Countries */}
              <Card>
                <CardHeader>
                  <CardTitle>Visitors by Country</CardTitle>
                  <CardDescription>Geographic distribution of all visitors</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8" />)}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data?.countries?.map((country, idx) => {
                        const maxCount = data.countries[0]?.count || 1;
                        return (
                          <div key={country.country} className="flex items-center gap-3">
                            <span className="w-6 text-sm text-muted-foreground text-right">{idx + 1}.</span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-sm">{country.country}</span>
                                <span className="text-sm text-muted-foreground">{country.count.toLocaleString()}</span>
                              </div>
                              <div className="h-2 bg-primary/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{ width: `${(country.count / maxCount) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {!data?.countries?.length && (
                        <p className="text-sm text-muted-foreground text-center py-4">No country data</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Cities */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Cities</CardTitle>
                  <CardDescription>Most active cities by visit count</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8" />)}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data?.topCities?.map((city, idx) => {
                        const maxCount = data.topCities[0]?.count || 1;
                        return (
                          <div key={`${city.city}-${city.country}`} className="flex items-center gap-3">
                            <span className="w-6 text-sm text-muted-foreground text-right">{idx + 1}.</span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <div>
                                  <span className="font-medium text-sm">{city.city}</span>
                                  <span className="text-xs text-muted-foreground ml-2">{city.country}</span>
                                </div>
                                <span className="text-sm text-muted-foreground">{city.count.toLocaleString()}</span>
                              </div>
                              <div className="h-2 bg-primary/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full transition-all"
                                  style={{ width: `${(city.count / maxCount) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {!data?.topCities?.length && (
                        <p className="text-sm text-muted-foreground text-center py-4">No city data</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Referrers Tab */}
          {activeTab === "referrers" && (
            <Card>
              <CardHeader>
                <CardTitle>Top Referrers</CardTitle>
                <CardDescription>Where visitors are coming from</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10" />)}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data?.topReferrers?.map((ref, idx) => {
                      const maxCount = data.topReferrers[0]?.count || 1;
                      let displayUrl = ref.referrer;
                      try {
                        const url = new URL(ref.referrer);
                        displayUrl = url.hostname + (url.pathname !== "/" ? url.pathname : "");
                      } catch {}
                      return (
                        <div key={ref.referrer} className="flex items-center gap-3">
                          <span className="w-6 text-sm text-muted-foreground text-right">{idx + 1}.</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="font-medium text-sm truncate" title={ref.referrer}>{displayUrl}</span>
                              </div>
                              <Badge variant="secondary" className="ml-2 flex-shrink-0">
                                {ref.count.toLocaleString()}
                              </Badge>
                            </div>
                            <div className="h-2 bg-primary/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full transition-all"
                                style={{ width: `${(ref.count / maxCount) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {!data?.topReferrers?.length && (
                      <div className="text-center py-12 text-muted-foreground">
                        <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No referrer data available</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Hourly Traffic Tab */}
          {activeTab === "hourly" && (
            <Card>
              <CardHeader>
                <CardTitle>Hourly Traffic Distribution</CardTitle>
                <CardDescription>Visitor traffic by hour of day (last 24 hours)</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-8" />)}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Array.from({ length: 24 }, (_, i) => {
                      const hourData = data?.hourlyDistribution?.find(h => parseInt(h.hour) === i);
                      const count = hourData?.count || 0;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="w-14 text-sm text-muted-foreground text-right font-mono">
                            {i.toString().padStart(2, "0")}:00
                          </span>
                          <div className="flex-1">
                            <div className="h-6 bg-primary/10 rounded relative overflow-hidden">
                              <div
                                className="h-full bg-primary/60 rounded transition-all"
                                style={{ width: `${maxHourlyCount > 0 ? (count / maxHourlyCount) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                          <span className="w-12 text-sm text-right font-medium">
                            {count.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />

      {/* Visitor Detail Dialog */}
      <Dialog
        open={!!selectedVisitor}
        onOpenChange={(open) => {
          if (!open) setSelectedVisitor(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Visitor Details
            </DialogTitle>
            <DialogDescription>
              {selectedVisitor?.timestamp && (
                <>Visited {formatDistanceToNow(new Date(selectedVisitor.timestamp), { addSuffix: true })}</>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedVisitor && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-muted-foreground mb-1">Timestamp</p>
                  <p>{format(new Date(selectedVisitor.timestamp), "PPpp")}</p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground mb-1">IP Address</p>
                  <p className="font-mono">{selectedVisitor.ip || "N/A"}</p>
                </div>
              </div>

              <div>
                <p className="font-semibold text-muted-foreground mb-1">Page Visited</p>
                <p className="font-medium break-all">{selectedVisitor.path}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-muted-foreground mb-1">Country</p>
                  <p className="flex items-center gap-1">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    {selectedVisitor.country || "Unknown"}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground mb-1">City / Region</p>
                  <p className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {selectedVisitor.city || "Unknown"}
                    {selectedVisitor.region ? `, ${selectedVisitor.region}` : ""}
                  </p>
                </div>
              </div>

              <div>
                <p className="font-semibold text-muted-foreground mb-1">Timezone</p>
                <p>{selectedVisitor.timezone || "Unknown"}</p>
              </div>

              <div>
                <p className="font-semibold text-muted-foreground mb-1">Referrer</p>
                {selectedVisitor.referrer ? (
                  <p className="break-all text-sm flex items-center gap-1">
                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    {selectedVisitor.referrer}
                  </p>
                ) : (
                  <p className="text-muted-foreground">Direct visit (no referrer)</p>
                )}
              </div>

              <div>
                <p className="font-semibold text-muted-foreground mb-1">Browser / Device</p>
                {(() => {
                  const ua = parseUserAgent(selectedVisitor.userAgent);
                  return (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{ua.browser}</Badge>
                      <Badge variant="secondary">{ua.os}</Badge>
                      <Badge variant="secondary">{ua.device}</Badge>
                    </div>
                  );
                })()}
              </div>

              <div>
                <p className="font-semibold text-muted-foreground mb-1">Full User Agent</p>
                <div className="bg-muted p-3 rounded-md text-xs font-mono break-all">
                  {selectedVisitor.userAgent || "N/A"}
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Record ID: {selectedVisitor.id}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
