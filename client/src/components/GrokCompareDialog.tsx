/**
 * Copyright by Calmic Sdn Bhd
 */

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Brain,
  AlertCircle,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface Mp {
  id: string;
  name: string;
  party: string;
  constituency: string;
  state: string;
}

interface MpReportCard {
  id: string;
  mpId: string;
  grade: string;
  overallScore: number;
  attendanceScore: number;
  attendancePercentage: number;
  participationScore: number;
  conductScore: number;
  constituencyImpactScore: number;
  totalSpeeches: number;
  questionsAsked: number;
  billsRaised: number;
  inappropriateLanguageCount: number;
  mp: Mp;
}

interface GrokCompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mp1?: MpReportCard;
  mp2?: MpReportCard;
  onCompareComplete?: () => void;
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A': return 'bg-green-500';
    case 'B': return 'bg-blue-500';
    case 'C': return 'bg-yellow-500';
    case 'D': return 'bg-orange-500';
    case 'F': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
}

export function GrokCompareDialog({
  open,
  onOpenChange,
  mp1,
  mp2,
  onCompareComplete
}: GrokCompareDialogProps) {
  const { toast } = useToast();
  const [comparison, setComparison] = useState<string>("");

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!mp1 || !mp2) {
        throw new Error("Both MPs must be selected");
      }

      const response = await apiRequest("POST", `/api/report-cards/compare-grok`, {
        mp1Id: mp1.mpId,
        mp2Id: mp2.mpId,
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(error.error || "Failed to generate comparison");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setComparison(data.comparison);
      toast({
        title: "Comparison Complete",
        description: "Grok AI has analyzed and compared both MPs.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Comparison Failed",
        description: error.message || "Failed to generate comparison. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Auto-generate comparison when dialog opens with both MPs
  useEffect(() => {
    if (open && mp1 && mp2 && !comparison && !generateMutation.isPending) {
      generateMutation.mutate();
    }
  }, [open, mp1, mp2]);

  // Reset comparison when dialog closes
  useEffect(() => {
    if (!open) {
      setComparison("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Grok AI MP Comparison
          </DialogTitle>
          <DialogDescription>
            Comprehensive comparison of two Members of Parliament
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh] pr-4">
          <div className="space-y-4">
            {/* MP Cards */}
            {mp1 && mp2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{mp1.mp.name}</CardTitle>
                      <Badge className={getGradeColor(mp1.grade)}>{mp1.grade}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Party:</span>
                        <span className="font-medium">{mp1.mp.party}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Constituency:</span>
                        <span className="font-medium">{mp1.mp.constituency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Overall Score:</span>
                        <span className="font-bold">{mp1.overallScore}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Attendance:</span>
                        <span>{mp1.attendancePercentage}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Participation:</span>
                        <span>{mp1.participationScore}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Speeches:</span>
                        <span>{mp1.totalSpeeches}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Questions:</span>
                        <span>{mp1.questionsAsked}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{mp2.mp.name}</CardTitle>
                      <Badge className={getGradeColor(mp2.grade)}>{mp2.grade}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Party:</span>
                        <span className="font-medium">{mp2.mp.party}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Constituency:</span>
                        <span className="font-medium">{mp2.mp.constituency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Overall Score:</span>
                        <span className="font-bold">{mp2.overallScore}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Attendance:</span>
                        <span>{mp2.attendancePercentage}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Participation:</span>
                        <span>{mp2.participationScore}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Speeches:</span>
                        <span>{mp2.totalSpeeches}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Questions:</span>
                        <span>{mp2.questionsAsked}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Comparison Analysis */}
            {generateMutation.isPending ? (
              <Card>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    <p className="text-lg font-medium">Grok AI is analyzing both MPs...</p>
                    <p className="text-sm text-muted-foreground">This may take a moment</p>
                  </div>
                </CardContent>
              </Card>
            ) : comparison ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    AI Comparison Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                    {comparison}
                  </div>
                </CardContent>
              </Card>
            ) : generateMutation.isError ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive opacity-50" />
                  <h3 className="font-semibold text-lg mb-2">Comparison Failed</h3>
                  <p className="text-muted-foreground mb-4">
                    {generateMutation.error?.message || "Failed to generate comparison. Please try again."}
                  </p>
                  <Button onClick={() => generateMutation.mutate()}>
                    <Brain className="w-4 h-4 mr-2" />
                    Retry Comparison
                  </Button>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
