/**
 * Copyright by Calmic Sdn Bhd
 *
 * Report Card Admin Panel
 * Manage and manually trigger report card updates
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
  TrendingUp,
  Database,
  Calendar
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageMeta } from "@/components/PageMeta";
import { useToast } from "@/hooks/use-toast";

interface UpdateResult {
  success: boolean;
  message: string;
  created: number;
  updated: number;
  timestamp: string;
}

interface LastUpdate {
  lastUpdate: string | null;
}

export default function ReportCardAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch last update time
  const { data: lastUpdate, isLoading: loadingLastUpdate } = useQuery<LastUpdate>({
    queryKey: ["/api/admin/report-cards/last-update"],
  });

  // Mutation for manual update
  const updateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/report-cards/update", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update report cards");
      }

      return response.json() as Promise<UpdateResult>;
    },
    onMutate: () => {
      setIsUpdating(true);
    },
    onSuccess: (data) => {
      setIsUpdating(false);
      toast({
        title: "Report Cards Updated",
        description: `Successfully updated ${data.updated} report cards and created ${data.created} new ones.`,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/report-cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/report-cards/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/report-cards/last-update"] });
    },
    onError: (error: Error) => {
      setIsUpdating(false);
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleManualUpdate = () => {
    if (window.confirm("Are you sure you want to trigger a manual report card update? This will recalculate grades for all MPs.")) {
      updateMutation.mutate();
    }
  };

  const formatDate = (dateString: string | null) => {
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

  return (
    <>
      <PageMeta
        title="Report Card Admin - MP Dashboard"
        description="Administrative panel for managing MP report card updates"
      />
      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Report Card Administration</h1>
            <p className="text-muted-foreground">
              Manage MP report card calculations and updates
            </p>
          </div>

          {/* Update Status */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Update Status
              </CardTitle>
              <CardDescription>
                Current status of report card updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLastUpdate ? (
                <Skeleton className="h-24" />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-8 w-8 text-primary" />
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Last Update</div>
                        <div className="text-lg font-semibold">
                          {formatDate(lastUpdate?.lastUpdate || null)}
                        </div>
                      </div>
                    </div>
                    {lastUpdate?.lastUpdate && (
                      <Badge variant="outline" className="ml-4">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Up to date
                      </Badge>
                    )}
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Report cards are automatically updated on the 1st of every month at 2:00 AM MYT.
                      You can also trigger a manual update using the button below.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Manual Update */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Manual Update
              </CardTitle>
              <CardDescription>
                Trigger an immediate recalculation of all MP report cards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-accent p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Update Process</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Fetch latest data for all MPs from the database</li>
                    <li>Calculate attendance, participation, conduct, and constituency impact scores</li>
                    <li>Compute weighted overall score and assign letter grade</li>
                    <li>Update report card records in the database</li>
                  </ol>
                </div>

                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">Important Notes</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• This process may take several seconds to complete</li>
                      <li>• All existing report cards will be recalculated</li>
                      <li>• Grades are based on current MP data in the database</li>
                      <li>• The report card page will automatically refresh with new data</li>
                    </ul>
                  </div>
                </div>

                <Button
                  onClick={handleManualUpdate}
                  disabled={isUpdating}
                  size="lg"
                  className="w-full"
                >
                  {isUpdating ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Updating Report Cards...
                    </>
                  ) : (
                    <>
                      <Database className="mr-2 h-4 w-4" />
                      Trigger Manual Update
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Grading Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Grading Methodology
              </CardTitle>
              <CardDescription>
                How scores and grades are calculated
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Score Components (0-100 scale)</h4>
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="min-w-[100px] justify-center">40%</Badge>
                      <div>
                        <div className="font-medium">Attendance Score</div>
                        <div className="text-muted-foreground">
                          Percentage of parliament sessions attended
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="min-w-[100px] justify-center">30%</Badge>
                      <div>
                        <div className="font-medium">Participation Score</div>
                        <div className="text-muted-foreground">
                          Normalized score based on speeches, bills raised, and questions asked
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="min-w-[100px] justify-center">20%</Badge>
                      <div>
                        <div className="font-medium">Conduct Score</div>
                        <div className="text-muted-foreground">
                          Inverse score based on inappropriate language and court cases - fewer is better
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="min-w-[100px] justify-center">10%</Badge>
                      <div>
                        <div className="font-medium">Constituency Impact</div>
                        <div className="text-muted-foreground">
                          Inverse score based on poverty rate - lower is better
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Letter Grade Thresholds</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-green-500">A: 90-100</Badge>
                    <Badge className="bg-blue-500">B: 80-89</Badge>
                    <Badge className="bg-yellow-500">C: 70-79</Badge>
                    <Badge className="bg-orange-500">D: 60-69</Badge>
                    <Badge className="bg-red-500">F: Below 60</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>

        <Footer />
      </div>
    </>
  );
}
