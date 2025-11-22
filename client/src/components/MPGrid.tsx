/**
 * Copyright by Calmic Sdn Bhd
 */

import { MPCard } from "./MPCard";
import type { Mp, LegislativeProposal, ParliamentaryQuestion } from "@shared/schema";
import { UserCircle } from "lucide-react";

export interface LanguageStat {
  mpId: string;
  mpName: string;
  constituency: string;
  count: number;
  words: string[];
}

interface MPGridProps {
  mps: Mp[];
  isLoading?: boolean;
  billsByMpId?: Map<string, LegislativeProposal[]>;
  oralQuestionsByMpId?: Map<string, ParliamentaryQuestion[]>;
  languageStatsByMpId?: Map<string, LanguageStat>;
}

function MPCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card overflow-hidden animate-pulse">
      <div className="aspect-[3/4] bg-muted" />
      <div className="p-4 space-y-3">
        <div className="space-y-2">
          <div className="h-5 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
        <div className="h-6 bg-muted rounded w-16" />
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-3 bg-muted rounded w-1/3" />
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 px-4 text-center">
      <UserCircle className="h-24 w-24 text-muted-foreground/50 mb-4" />
      <h3 className="text-xl font-semibold mb-2">No MPs Found</h3>
      <p className="text-muted-foreground max-w-sm">
        Try adjusting your filters or search query to find what you're looking for.
      </p>
    </div>
  );
}

export function MPGrid({ mps, isLoading, billsByMpId, oralQuestionsByMpId, languageStatsByMpId }: MPGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <MPCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (mps.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {mps.map((mp) => (
        <MPCard key={mp.id} mp={mp} bills={billsByMpId?.get(mp.id)} oralQuestions={oralQuestionsByMpId?.get(mp.id)} languageStats={languageStatsByMpId?.get(mp.id)} />
      ))}
    </div>
  );
}
