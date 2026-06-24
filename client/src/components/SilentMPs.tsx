/**
 * Copyright by Calmic Sdn Bhd
 *
 * Most Silent MPs Component
 *
 * Highlights active MPs with zero or minimal recorded speeches in Parliament.
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { VolumeX, ArrowRight, MicOff } from "lucide-react";
import { getProxiedPhotoUrl } from "@/lib/utils";
import type { Mp } from "@shared/schema";

interface PaginatedMpsResponse {
  data: Mp[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasMore: boolean;
  };
}

const PARTY_COLORS: Record<string, string> = {
  "PKR": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "DAP": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "AMANAH": "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  "BERSATU": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "UMNO": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "MCA": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "MIC": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "GPS": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  "GRS": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  "PN": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

function getPartyColor(party: string): string {
  for (const key of Object.keys(PARTY_COLORS)) {
    if (party.toUpperCase().includes(key)) return PARTY_COLORS[key];
  }
  return "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300";
}

function MPRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-0">
      <Skeleton className="h-9 w-9 rounded-full shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
  );
}

export function SilentMPs() {
  const { data, isLoading } = useQuery<PaginatedMpsResponse>({
    queryKey: ["/api/mps/paginated", "silent-mps"],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        limit: "10",
        sortBy: "speeches-fewest",
        status: "active",
      });
      const response = await fetch(`/api/mps/paginated?${params}`);
      if (!response.ok) throw new Error("Failed to fetch MPs");
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Keep only MPs with 0 or null speeches
  const silentMps = (data?.data ?? []).filter(
    (mp) => !mp.totalSpeechInstances || mp.totalSpeechInstances === 0
  );

  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <VolumeX className="h-5 w-5 text-slate-500" />
          Most Silent MPs
          <Badge variant="secondary" className="ml-auto text-xs font-normal">
            No recorded speeches
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          Active MPs with zero recorded speeches in Parliament (Hansard)
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 6 }).map((_, i) => (
              <MPRowSkeleton key={i} />
            ))}
          </div>
        ) : silentMps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
            <MicOff className="h-8 w-8 opacity-40" />
            <p className="text-sm">No silent MPs found</p>
          </div>
        ) : (
          <>
            <div className="divide-y">
              {silentMps.map((mp, index) => (
                <Link key={mp.id} href={`/mp/${mp.id}`}>
                  <div className="flex items-center gap-3 py-2.5 hover:bg-accent/50 -mx-1 px-1 rounded-md transition-colors cursor-pointer">
                    <span className="text-xs font-medium text-muted-foreground w-4 shrink-0 text-right">
                      {index + 1}
                    </span>
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage
                        src={getProxiedPhotoUrl(mp.photoUrl)}
                        alt={mp.name}
                      />
                      <AvatarFallback className="text-xs">
                        {mp.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-tight">{mp.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{mp.constituency}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={`text-xs px-1.5 py-0 ${getPartyColor(mp.party)}`}
                      >
                        {mp.party}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <MicOff className="h-3 w-3" />
                        0
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t">
              <Link href="/?sortBy=speeches-fewest">
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  View all MPs sorted by fewest speeches
                  <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
