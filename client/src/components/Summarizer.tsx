/**
 * Copyright by Calmic Sdn Bhd
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Languages } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SummarizerProps {
  text: string;
  title?: string;
  className?: string;
}

interface SummarizeResponse {
  summary: string;
  language: string;
  originalLength: number;
  summaryLength: number;
}

export function Summarizer({ text, title = "AI Summary", className = "" }: SummarizerProps) {
  const [language, setLanguage] = useState<"english" | "malay">("english");
  const [summary, setSummary] = useState<string | null>(null);
  const { toast } = useToast();

  const summarizeMutation = useMutation({
    mutationFn: async (lang: "english" | "malay") => {
      const response = await apiRequest("POST", "/api/summarize", { text, language: lang });
      return await response.json() as SummarizeResponse;
    },
    onSuccess: (data) => {
      setSummary(data.summary);
      toast({
        title: "Summary Generated",
        description: `Successfully summarized ${data.originalLength} characters into ${data.summaryLength} characters.`,
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to generate summary";
      const isRetryable = error?.retry;
      
      toast({
        title: "Summarization Failed",
        description: isRetryable 
          ? "Model is loading. Please try again in a moment." 
          : errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSummarize = (lang: "english" | "malay") => {
    setLanguage(lang);
    setSummary(null);
    summarizeMutation.mutate(lang);
  };

  if (!text || text.trim().length === 0) {
    return null;
  }

  return (
    <Card className={className} data-testid="card-summarizer">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={language === "english" && !summary ? "default" : "outline"}
            onClick={() => handleSummarize("english")}
            disabled={summarizeMutation.isPending}
            data-testid="button-summarize-english"
          >
            <Languages className="h-4 w-4 mr-1" />
            English
          </Button>
          <Button
            size="sm"
            variant={language === "malay" && !summary ? "default" : "outline"}
            onClick={() => handleSummarize("malay")}
            disabled={summarizeMutation.isPending}
            data-testid="button-summarize-malay"
          >
            <Languages className="h-4 w-4 mr-1" />
            Malay
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {summarizeMutation.isPending && (
          <div className="flex items-center justify-center py-8" data-testid="loading-summary">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-sm text-muted-foreground">
              Generating {language} summary...
            </span>
          </div>
        )}

        {summary && !summarizeMutation.isPending && (
          <div className="space-y-3" data-testid="summary-result">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" data-testid="badge-language">
                {language === "english" ? "English" : "Bahasa Malaysia"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Powered by Hugging Face mT5
              </span>
            </div>
            <p className="text-sm leading-relaxed" data-testid="text-summary">
              {summary}
            </p>
          </div>
        )}

        {!summary && !summarizeMutation.isPending && (
          <div className="text-center py-6" data-testid="prompt-select-language">
            <p className="text-sm text-muted-foreground">
              Select a language to generate an AI-powered summary
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
