/**
 * Public Courts Page
 * Display court cases involving Malaysian MPs
 */

import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Gavel, Scale, User, FileText, Calendar } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import type { CourtCase, Mp } from "@shared/schema";

function getOutcomeColor(outcome: string | null | undefined): string {
  if (!outcome) return "bg-muted text-muted-foreground";
  
  const lowerOutcome = outcome.toLowerCase();
  
  if (
    lowerOutcome.includes("won") ||
    lowerOutcome.includes("acquitted") ||
    lowerOutcome.includes("discharged") ||
    lowerOutcome.includes("not guilty") ||
    lowerOutcome.includes("dismissed") ||
    lowerOutcome.includes("withdrawn by prosecution") ||
    lowerOutcome.includes("appeal allowed")
  ) {
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
  }
  
  if (
    lowerOutcome.includes("convicted") ||
    lowerOutcome.includes("guilty") ||
    lowerOutcome.includes("lost") ||
    lowerOutcome.includes("sentenced") ||
    lowerOutcome.includes("jailed") ||
    lowerOutcome.includes("fined") ||
    lowerOutcome.includes("appeal dismissed")
  ) {
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  }
  
  if (
    lowerOutcome.includes("ongoing") ||
    lowerOutcome.includes("pending") ||
    lowerOutcome.includes("appeal") ||
    lowerOutcome.includes("trial") ||
    lowerOutcome.includes("hearing")
  ) {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
  }
  
  if (
    lowerOutcome.includes("settled") ||
    lowerOutcome.includes("withdrawn") ||
    lowerOutcome.includes("discontinued")
  ) {
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
  }
  
  return "bg-muted text-muted-foreground";
}

function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status.toLowerCase()) {
    case "completed":
      return "secondary";
    case "ongoing":
      return "default";
    default:
      return "outline";
  }
}

export default function Courts() {
  const { t } = useLanguage();

  const { data: courtCases = [], isLoading: casesLoading } = useQuery<CourtCase[]>({
    queryKey: ["/api/court-cases"],
  });

  const { data: mps = [] } = useQuery<Mp[]>({
    queryKey: ["/api/mps"],
  });

  const getMpName = (mpId: string) => {
    const mp = mps.find((m) => m.id === mpId);
    return mp ? `${mp.name} (${mp.constituency})` : t('courts.unknownMp');
  };

  const ongoingCases = courtCases.filter(c => c.status.toLowerCase() === "ongoing");
  const completedCases = courtCases.filter(c => c.status.toLowerCase() === "completed");
  const criminalCases = courtCases.filter(c => !c.caseType || c.caseType === "criminal");
  const civilCases = courtCases.filter(c => c.caseType === "civil");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-6xl mx-auto px-4 py-8">
        <div className="space-y-2 mb-8">
          <div className="flex items-center gap-3">
            <Gavel className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold" data-testid="text-courts-title">
              {t('courts.title')}
            </h1>
          </div>
          <p className="text-muted-foreground" data-testid="text-courts-description">
            {t('courts.description')}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-md">
                  <Scale className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-total-cases">
                    {casesLoading ? "-" : courtCases.length}
                  </p>
                  <p className="text-sm text-muted-foreground">{t('courts.totalCases')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-md">
                  <Gavel className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-ongoing-cases">
                    {casesLoading ? "-" : ongoingCases.length}
                  </p>
                  <p className="text-sm text-muted-foreground">{t('courts.ongoingCases')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-md">
                  <FileText className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-completed-cases">
                    {casesLoading ? "-" : completedCases.length}
                  </p>
                  <p className="text-sm text-muted-foreground">{t('courts.completedCases')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-md">
                  <Gavel className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-criminal-cases">
                    {casesLoading ? "-" : criminalCases.length}
                  </p>
                  <p className="text-sm text-muted-foreground">{t('courts.criminalCases') || 'Criminal'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-md">
                  <FileText className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-civil-cases">
                    {casesLoading ? "-" : civilCases.length}
                  </p>
                  <p className="text-sm text-muted-foreground">{t('courts.civilCases') || 'Civil'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {casesLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !courtCases.length ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Scale className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">{t('courts.noCases')}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {courtCases.map((courtCase) => (
              <Card 
                key={courtCase.id} 
                className="hover-elevate"
                data-testid={`card-court-case-${courtCase.id}`}
              >
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge variant={getStatusBadgeVariant(courtCase.status)}>
                            {courtCase.status}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={courtCase.caseType === "civil" 
                              ? "border-blue-500 text-blue-600 dark:text-blue-400" 
                              : "border-red-500 text-red-600 dark:text-red-400"
                            }
                          >
                            {courtCase.caseType === "civil" ? (t('courts.civil') || 'Civil') : (t('courts.criminal') || 'Criminal')}
                          </Badge>
                          <Badge variant="outline">
                            {courtCase.courtLevel}
                          </Badge>
                          {courtCase.caseNumber && (
                            <span className="text-sm text-muted-foreground">
                              {courtCase.caseNumber}
                            </span>
                          )}
                        </div>
                        
                        <h3 
                          className="text-lg font-semibold"
                          data-testid={`text-case-title-${courtCase.id}`}
                        >
                          {courtCase.title}
                        </h3>
                        
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span data-testid={`text-case-mp-${courtCase.id}`}>
                            {getMpName(courtCase.mpId)}
                          </span>
                        </div>
                      </div>
                      
                      {courtCase.filingDate && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{t('courts.filed')}: {new Date(courtCase.filingDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    
                    {courtCase.charges && (
                      <p 
                        className="text-sm"
                        data-testid={`text-case-charges-${courtCase.id}`}
                      >
                        {courtCase.charges}
                      </p>
                    )}
                    
                    {courtCase.outcome && (
                      <div className="flex items-start gap-2">
                        <span className="text-sm font-medium text-muted-foreground">{t('courts.outcome')}:</span>
                        <span 
                          className={`text-sm px-2 py-0.5 rounded-md ${getOutcomeColor(courtCase.outcome)}`}
                          data-testid={`text-case-outcome-${courtCase.id}`}
                        >
                          {courtCase.outcome}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
