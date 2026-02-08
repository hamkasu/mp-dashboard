/**
 * Copyright by Calmic Sdn Bhd
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
import { Loader2, MessageSquareText, AlertCircle } from "lucide-react";
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
}

interface HansardQAButtonProps {
  hansardRecord: HansardRecordWithPdf;
  trigger: React.ReactNode;
}

export function HansardQAButton({ hansardRecord, trigger }: HansardQAButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<QAAnalysisResult | null>(null);

  const analysisMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/hansard/${hansardRecord.id}/qa-analysis`);
      return await res.json();
    },
    onSuccess: (data: QAAnalysisResult) => {
      setResult(data);
      toast({
        title: "Q&A Analysis Complete",
        description: `Found ${data.totalQuestions} question(s) in this session`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !result && !analysisMutation.isPending) {
      analysisMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareText className="w-5 h-5" />
            Q&A Analysis - {hansardRecord.sessionNumber}
          </DialogTitle>
          <DialogDescription>
            Parliamentary questions (Soalan/Pertanyaan) extracted from this Hansard session
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {analysisMutation.isPending && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Analyzing parliamentary questions...
              </p>
              <p className="text-xs text-muted-foreground">
                This may take a moment as the AI parses the transcript
              </p>
            </div>
          )}

          {analysisMutation.isError && !result && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <p className="text-sm text-destructive">
                {analysisMutation.error?.message || "Failed to analyze Q&A sections"}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => analysisMutation.mutate()}
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
                  <Badge variant="secondary">
                    {result.totalQuestions} Question{result.totalQuestions !== 1 ? "s" : ""} Found
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => analysisMutation.mutate()}
                  disabled={analysisMutation.isPending}
                >
                  {analysisMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
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
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{q.no}</TableCell>
                          <TableCell className="text-sm">{q.questioner}</TableCell>
                          <TableCell className="text-sm">{q.ministerTargeted}</TableCell>
                          <TableCell className="text-sm font-medium">{q.topic}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
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
                    No parliamentary questions (Soalan/Pertanyaan) found in this session
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
