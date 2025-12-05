/**
 * Sarawak State Legislative Assembly (DUN) Page
 * Display members of the Sarawak State Legislative Assembly
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, RefreshCw, Loader2, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface DunMember {
  id: string;
  name: string;
  constituency: string;
  constituencyNumber: string;
  party: string;
  photoUrl?: string;
  profileUrl?: string;
}

interface ScraperStatus {
  isRunning: boolean;
  lastRunAt: string | null;
  lastRunResult?: {
    membersScraped: number;
    errors: number;
  };
}

export default function SarawakDun() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  // Check admin authentication
  const { data: authStatus } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/auth-status"],
    retry: false,
  });

  // Fetch DUN members
  const { data: members = [], isLoading, refetch } = useQuery<DunMember[]>({
    queryKey: ["/api/sarawak-dun/members"],
    retry: false,
  });

  // Fetch scraper status (admin only)
  const { data: scraperStatus, refetch: refetchStatus } = useQuery<ScraperStatus>({
    queryKey: ["/api/admin/sarawak-dun-scraper/status"],
    enabled: authStatus?.isAdmin === true,
    refetchInterval: 5000,
  });

  // Run scraper mutation
  const runScraperMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/sarawak-dun-scraper/run");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Scraper Completed",
        description: `Scraped ${data.membersScraped} members successfully`,
      });
      refetch();
      refetchStatus();
    },
    onError: (error: any) => {
      toast({
        title: "Scraper Failed",
        description: error.message || "Failed to run scraper",
        variant: "destructive",
      });
    },
  });

  const filteredMembers = members.filter((member) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(query) ||
      member.constituency.toLowerCase().includes(query) ||
      member.party.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="flex-1 px-4 md:px-6 lg:px-8 py-6 md:py-8 max-w-7xl mx-auto">
        <div className="space-y-6 md:space-y-8">
          {/* Page Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="h-8 w-8 text-primary" />
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                  Sarawak State Legislative Assembly
                </h1>
              </div>
              <p className="text-muted-foreground">
                Members of the Sarawak State Legislative Assembly (82 seats)
              </p>
            </div>

            {/* Admin Controls */}
            {authStatus?.isAdmin && (
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => runScraperMutation.mutate()}
                  disabled={runScraperMutation.isPending || scraperStatus?.isRunning}
                  data-testid="button-run-scraper"
                >
                  {runScraperMutation.isPending || scraperStatus?.isRunning ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Scrape DUN Data
                </Button>
                {scraperStatus && (
                  <div className="text-xs text-muted-foreground">
                    Status: <Badge variant={scraperStatus.isRunning ? "default" : "secondary"}>
                      {scraperStatus.isRunning ? "Running" : "Idle"}
                    </Badge>
                    {scraperStatus.lastRunResult && (
                      <span className="ml-2">
                        Last: {scraperStatus.lastRunResult.membersScraped} members
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Statistics Card */}
          <Card data-testid="card-dun-stats">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl md:text-4xl font-bold" data-testid="text-total-members">
                {members.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Members of State Legislative Assembly
              </p>
            </CardContent>
          </Card>

          {/* Search */}
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search member or constituency..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border rounded-md"
              data-testid="input-search"
            />
          </div>

          {/* Members Grid */}
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : members.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Users className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Member Data</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Sarawak DUN member data is not yet available.
                  {authStatus?.isAdmin && " Use the 'Scrape DUN Data' button to fetch member information."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers.map((member) => (
                <Card key={member.id} className="hover-elevate">
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      {member.photoUrl && (
                        <img
                          src={member.photoUrl}
                          alt={member.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground mb-1">
                          {member.constituencyNumber} {member.constituency}
                        </div>
                        <h3 className="font-semibold text-sm mb-1">
                          {member.name}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {member.party}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredMembers.length === 0 && members.length > 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No members found matching your search.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
