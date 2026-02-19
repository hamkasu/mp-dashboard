/**
 * Copyright by Calmic Sdn Bhd
 */

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, MessageSquareText, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { HansardRecordWithPdf } from "@shared/schema";

interface QAQuestion {
  no: number;
  questioner: string;
  ministerTargeted: string;
  topic: string;
  summary: string;
}

interface QAAnalysisResult {
  sessionInfo: string;
  questions: QAQuestion[];
  totalQuestions: number;
  cached?: boolean;
  analyzedAt?: string;
}

type QASectionType = "menteri" | "lisan";

const sectionLabels: Record<QASectionType, { title: string; description: string }> = {
  menteri: {
    title: "Waktu Pertanyaan-Pertanyaan Menteri",
    description: "Minister's Question Time - questions directed to Ministers",
  },
  lisan: {
    title: "Pertanyaan-Pertanyaan Bagi Jawab Lisan",
    description: "Oral Questions - questions for oral answers in Parliament",
  },
};

interface HansardQAButtonProps {
  hansardRecord: HansardRecordWithPdf;
  trigger: React.ReactNode;
  sectionType?: QASectionType;
}

export function HansardQAButton({ hansardRecord, trigger, sectionType = "menteri" }: HansardQAButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const labels = sectionLabels[sectionType];
  const cacheQueryKey = `/api/hansard/${hansardRecord.id}/qa-analysis?sectionType=${sectionType}`;

  // Fetch cached results when dialog opens
  const { data: cachedResult, isLoading: cacheLoading } = useQuery<QAAnalysisResult | null>({
    queryKey: [cacheQueryKey],
    enabled: open,
  });

  // Mutation for triggering analysis (initial or re-analyze)
  const analysisMutation = useMutation({
    mutationFn: async (force: boolean = false) => {
      const body: Record<string, unknown> = { sectionType };
      if (force) body.force = true;
      const res = await apiRequest("POST", `/api/hansard/${hansardRecord.id}/qa-analysis`, body);
      return await res.json();
    },
    onSuccess: (data: QAAnalysisResult) => {
      // Update the cache query with fresh results
      queryClient.setQueryData([cacheQueryKey], data);
      toast({
        title: data.cached ? "Analysis Loaded" : "Analysis Complete",
        description: `Found ${data.totalQuestions} question(s) in this session`,
      });
    },
    onError: (error: Error) => {
      let description = error.message;
      // Parse JSON error responses for a cleaner message
      try {
        const jsonStart = description.indexOf("{");
        if (jsonStart !== -1) {
          const parsed = JSON.parse(description.slice(jsonStart));
          description = parsed.details || parsed.error || description;
        }
      } catch {
        // Use original message if parsing fails
      }
      toast({
        title: "Analysis Failed",
        description,
        variant: "destructive",
      });
    },
  });

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
  };

  // Trigger analysis if no cached result and dialog is open
  const result = cachedResult;
  const isLoading = cacheLoading || analysisMutation.isPending;
  const needsAnalysis = open && !cacheLoading && !result && !analysisMutation.isPending && !analysisMutation.isError;

  if (needsAnalysis) {
    analysisMutation.mutate(false);
  }

  const handleReanalyze = () => {
    analysisMutation.mutate(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareText className="w-5 h-5" />
            {labels.title} - {hansardRecord.sessionNumber}
          </DialogTitle>
          <DialogDescription>
            {labels.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {isLoading && !result && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {cacheLoading ? "Checking for cached results..." : "Analyzing parliamentary questions..."}
              </p>
              {!cacheLoading && (
                <p className="text-xs text-muted-foreground">
                  This may take a moment as the AI parses the transcript
                </p>
              )}
            </div>
          )}

          {analysisMutation.isError && !result && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <p className="text-sm text-destructive">
                {(() => {
                  const msg = analysisMutation.error?.message || "Failed to analyze Q&A sections";
                  try {
                    const jsonStart = msg.indexOf("{");
                    if (jsonStart !== -1) {
                      const parsed = JSON.parse(msg.slice(jsonStart));
                      return parsed.details || parsed.error || msg;
                    }
                  } catch {
                    // fall through
                  }
                  return msg;
                })()}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => analysisMutation.mutate(false)}
              >
                Try Again
              </Button>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{result.sessionInfo}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {result.totalQuestions} Question{result.totalQuestions !== 1 ? "s" : ""} Found
                    </Badge>
                    {result.cached && (
                      <Badge variant="outline" className="text-xs">
                        Cached
                      </Badge>
                    )}
                    {result.analyzedAt && (
                      <span className="text-xs text-muted-foreground">
                        Analyzed: {new Date(result.analyzedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReanalyze}
                  disabled={analysisMutation.isPending}
                >
                  {analysisMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Re-analyze
                </Button>
              </div>

              {result.questions.length > 0 ? (
                <ScrollArea className="h-[55vh]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">No.</TableHead>
                        <TableHead className="w-[180px]">Questioner</TableHead>
                        <TableHead className="w-[180px]">Minister Targeted</TableHead>
                        <TableHead className="w-[150px]">Topic</TableHead>
                        <TableHead>Summary</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.questions.map((q, idx) => (
                        <TableRow key={idx} className="align-top">
                          <TableCell className="font-medium align-top">{q.no}</TableCell>
                          <TableCell className="text-sm align-top">{q.questioner}</TableCell>
                          <TableCell className="text-sm align-top">{q.ministerTargeted}</TableCell>
                          <TableCell className="text-sm font-medium align-top">{q.topic}</TableCell>
                          <TableCell className="text-sm text-muted-foreground align-top">
                            {q.summary}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="text-center py-12">
                  <MessageSquareText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    No parliamentary questions found in this section
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
