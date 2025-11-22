/**
 * Copyright by Calmic Sdn Bhd
 */

import { ConstituencyHansardAnalysis } from "@/components/ConstituencyHansardAnalysis";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ConstituencyAnalysis() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <h1 className="text-3xl font-bold" data-testid="heading-page-title">
            Constituency Hansard Analysis
          </h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive analysis of parliamentary speaking participation across all Malaysian constituencies in the 15th Parliament
          </p>
        </div>

        <ConstituencyHansardAnalysis />
      </div>
    </div>
  );
}
