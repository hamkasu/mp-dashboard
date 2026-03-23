/**
 * Copyright by Calmic Sdn Bhd
 */

import { ConstituencyHansardAnalysis } from "@/components/ConstituencyHansardAnalysis";
import { PageMeta } from "@/components/PageMeta";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Lock, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function ConstituencyAnalysis() {
  const [, setLocation] = useLocation();
  const { isPremium, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="Constituency Analysis"
        description="Comprehensive analysis of parliamentary speaking participation across all Malaysian constituencies in the 15th Parliament."
        keywords="constituency analysis, Hansard analysis, parliamentary participation, Malaysian constituencies"
        url="https://myparliament.calmic.com.my/constituency-analysis"
      />
      <div className="container mx-auto px-4 py-8 max-w-6xl">

        {/* ── Back nav ─────────────────────────────────────────────────────── */}
        <Button
          variant="outline"
          onClick={() => setLocation("/")}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex flex-wrap items-start gap-3 mb-2">
            <h1
              className="text-3xl font-bold"
              data-testid="heading-page-title"
            >
              Constituency Hansard Analysis
            </h1>

            {!isLoading && (
              isPremium ? (
                <Badge className="mt-1 gap-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
                  <Sparkles className="h-3 w-3" />
                  Premium Access
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="mt-1 gap-1 cursor-pointer"
                  onClick={() => setLocation("/pricing")}
                >
                  <Lock className="h-3 w-3" />
                  Full access requires Premium
                </Badge>
              )
            )}
          </div>

          <p className="text-muted-foreground max-w-2xl">
            Track how actively each of Malaysia's 222 parliamentary constituencies
            is represented in the 15th Parliament's Hansard.
            {!isPremium && !isLoading && (
              <>
                {" "}
                <button
                  className="text-primary underline underline-offset-2 hover:no-underline font-medium"
                  onClick={() => setLocation("/pricing")}
                >
                  Subscribe for full access →
                </button>
              </>
            )}
          </p>
        </div>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <ConstituencyHansardAnalysis />
      </div>
    </div>
  );
}
