/**
 * Copyright by Calmic Sdn Bhd
 *
 * Bills to Watch Admin Panel
 * View current bills-to-watch data and manually trigger refresh
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  ScrollText,
  Calendar,
  Database
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageMeta } from "@/components/PageMeta";
import { useToast } from "@/hooks/use-toast";

interface RefreshResult {
  success: boolean;
  message: string;
  seeded: number;
  matched: number;
  updated: number;
  timestamp: string;
}

interface BillToWatch {
  id: string;
  titleEn: string;
  titleMs: string;
  status: string;
  isFeatured: boolean;
  icon: string;
  tags: string[];
  sortOrder: number;
  updatedAt: string;
}

interface BillsToWatchResponse {
  bills: BillToWatch[];
  lastRefresh: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  drafting: "bg-amber-100 text-amber-800",
  consultation: "bg-blue-100 text-blue-800",
  tabled: "bg-purple-100 text-purple-800",
  committee: "bg-indigo-100 text-indigo-800",
  pending: "bg-gray-100 text-gray-800",
  passed: "bg-green-100 text-green-800",
};

export default function BillsToWatchAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch current bills-to-watch data
  const { data, isLoading } = useQuery<BillsToWatchResponse>({
    queryKey: ["/api/bills-to-watch"],
  });

  // Fetch last refresh time
  const { data: lastRefreshData, isLoading: loadingLastRefresh } = useQuery<{ lastRefresh: string | null }>({
    queryKey: ["/api/admin/bills-to-watch/last-refresh"],
  });

  // Mutation for manual refresh
  const refreshMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/bills-to-watch/refresh", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to refresh bills to watch");
      }

      return response.json() as Promise<RefreshResult>;
    },
    onMutate: () => {
      setIsRefreshing(true);
    },
    onSuccess: (result) => {
      setIsRefreshing(false);
      toast({
        title: "Bills to Watch Refreshed",
        description: `Matched ${result.matched} bills, updated ${result.updated} statuses${result.seeded > 0 ? `, seeded ${result.seeded} new bills` : ""}.`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/bills-to-watch"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bills-to-watch/last-refresh"] });
    },
    onError: (error: Error) => {
      setIsRefreshing(false);
      toast({
        title: "Refresh Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleManualRefresh = () => {
    if (window.confirm("Refresh Bills to Watch data? This will cross-reference with scraped bills and update statuses.")) {
      refreshMutation.mutate();
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleString('en-MY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kuala_Lumpur'
    });
  };

  const billsList = data?.bills || [];

  return (
    <>
      <PageMeta
        title="Bills to Watch Admin - MP Dashboard"
        description="Administrative panel for managing Bills to Watch card refresh"
      />
      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Bills to Watch Administration</h1>
            <p className="text-muted-foreground">
              Manage the Bills to Watch card data and trigger manual refresh
            </p>
          </div>

          {/* Refresh Status */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Refresh Status
              </CardTitle>
              <CardDescription>
                Current status of Bills to Watch auto-refresh
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLastRefresh ? (
                <Skeleton className="h-24" />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-8 w-8 text-primary" />
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Last Refresh</div>
                        <div className="text-lg font-semibold">
                          {formatDate(lastRefreshData?.lastRefresh || data?.lastRefresh)}
                        </div>
                      </div>
                    </div>
                    {(lastRefreshData?.lastRefresh || data?.lastRefresh) && (
                      <Badge variant="outline" className="ml-4">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Bills to Watch data is automatically refreshed daily at 3:00 AM MYT.
                      The refresh cross-references with scraped Parliament bills to update statuses.
                      You can also trigger a manual refresh using the button below if auto-update fails.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Manual Refresh */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Manual Refresh
              </CardTitle>
              <CardDescription>
                Trigger an immediate refresh of Bills to Watch data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-accent p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Refresh Process</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Seeds initial curated bills data if table is empty</li>
                    <li>Cross-references with scraped Parliament bills</li>
                    <li>Updates bill statuses if changes detected</li>
                    <li>Updates last-refresh timestamp</li>
                  </ol>
                </div>

                <Button
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  size="lg"
                  className="w-full"
                >
                  {isRefreshing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Refreshing Bills to Watch...
                    </>
                  ) : (
                    <>
                      <Database className="mr-2 h-4 w-4" />
                      Trigger Manual Refresh
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Current Bills */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="h-5 w-5" />
                Current Bills ({billsList.length})
              </CardTitle>
              <CardDescription>
                Bills currently displayed on the Bills to Watch card
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : billsList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ScrollText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No bills to watch data yet. Click "Trigger Manual Refresh" to seed initial data.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {billsList.map((bill) => (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {bill.titleEn}
                          </span>
                          {bill.isFeatured && (
                            <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                              Featured
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${STATUS_COLORS[bill.status] || STATUS_COLORS.pending}`}>
                            {bill.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Updated: {formatDate(bill.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>

        <Footer />
      </div>
    </>
  );
}
