/**
 * Copyright by Calmic Sdn Bhd
 */

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
  Loader2,
  Sparkles,
  Tags,
  Heart,
  Users,
  FileText,
  MessageCircle,
  TrendingUp,
  Send,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { HansardRecordWithPdf } from "@shared/schema";

interface TopicAnalysis {
  id: string;
  hansardRecordId: string;
  topics: Array<{
    topic: string;
    relevance: number;
    keywords: string[];
  }>;
  analyzedAt: string;
}

interface SentimentAnalysis {
  id: string;
  hansardRecordId: string;
  overallSentiment: string;
  sentimentScore: number;
  confidence: number;
  keyPoints: Array<{
    point: string;
    sentiment: string;
  }>;
  analyzedAt: string;
}

interface SpeakerAnalysis {
  id: string;
  hansardRecordId: string;
  speakerInsights: Array<{
    mpId: string;
    mpName: string;
    topicsDiscussed: string[];
    sentiment: string;
    keyArguments: string[];
  }>;
  analyzedAt: string;
}

interface DetailedSummary {
  id: string;
  hansardRecordId: string;
  language: string;
  keyArguments: string[];
  decisions: string[];
  actionItems: string[];
  controversialPoints: string[];
  summary: string;
  analyzedAt: string;
}

interface QAResult {
  id: string;
  hansardRecordId: string;
  question: string;
  answer: string;
  context: string;
  relevanceScore: number;
  createdAt: string;
}

interface HansardAIInsightsProps {
  hansardRecord: HansardRecordWithPdf;
  trigger: React.ReactNode;
}

export function HansardAIInsights({ hansardRecord, trigger }: HansardAIInsightsProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("topics");
  const [question, setQuestion] = useState("");
  const [qaHistory, setQaHistory] = useState<QAResult[]>([]);

  const { data: allAnalysis, isLoading: analysisLoading } = useQuery<{
    topics: TopicAnalysis | null;
    sentiment: SentimentAnalysis | null;
    speakers: SpeakerAnalysis | null;
    detailedSummary: {
      en: DetailedSummary | null;
      ms: DetailedSummary | null;
    };
  }>({
    queryKey: [`/api/analyze/${hansardRecord.id}`],
    enabled: open,
  });

  const topicsMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/analyze/topics/${hansardRecord.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/analyze/${hansardRecord.id}`] });
      toast({
        title: "Topics Extracted",
        description: "AI has identified key topics from this debate",
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

  const sentimentMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/analyze/sentiment/${hansardRecord.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/analyze/${hansardRecord.id}`] });
      toast({
        title: "Sentiment Analyzed",
        description: "AI has analyzed the emotional tone of this debate",
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

  const speakersMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/analyze/speakers/${hansardRecord.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/analyze/${hansardRecord.id}`] });
      toast({
        title: "Speakers Analyzed",
        description: "AI has analyzed what each MP discussed",
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

  const summaryMutation = useMutation({
    mutationFn: (language: "en" | "ms") =>
      apiRequest("POST", `/api/analyze/detailed-summary/${hansardRecord.id}`, { language }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/analyze/${hansardRecord.id}`] });
      toast({
        title: "Summary Generated",
        description: "AI has created a detailed summary of this debate",
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

  const qaMutation = useMutation({
    mutationFn: async (q: string) => {
      const response = await apiRequest("POST", `/api/hansard/${hansardRecord.id}/qa`, { question: q });
      return response as QAResult;
    },
    onSuccess: (data: QAResult) => {
      setQaHistory((prev) => [...prev, data]);
      setQuestion("");
      toast({
        title: "Question Answered",
        description: "AI has analyzed the transcript to answer your question",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Answer",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAskQuestion = () => {
    if (!question.trim()) {
      toast({
        title: "Empty Question",
        description: "Please enter a question",
        variant: "destructive",
      });
      return;
    }
    qaMutation.mutate(question);
  };

  const getSentimentColor = (sentiment: string) => {
    const s = sentiment.toLowerCase();
    if (s.includes("positive")) return "text-green-600 dark:text-green-400";
    if (s.includes("negative")) return "text-red-600 dark:text-red-400";
    return "text-muted-foreground";
  };

  const getSentimentBadgeVariant = (sentiment: string): "default" | "secondary" | "destructive" => {
    const s = sentiment.toLowerCase();
    if (s.includes("positive")) return "default";
    if (s.includes("negative")) return "destructive";
    return "secondary";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Analysis - {hansardRecord.sessionNumber}
          </DialogTitle>
          <DialogDescription>
            Powered by DeepSeek AI (with Gemini fallback) - Comprehensive analysis of parliamentary debates
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="topics" data-testid="tab-topics">
              <Tags className="w-4 h-4 mr-2" />
              Topics
            </TabsTrigger>
            <TabsTrigger value="sentiment" data-testid="tab-sentiment">
              <Heart className="w-4 h-4 mr-2" />
              Sentiment
            </TabsTrigger>
            <TabsTrigger value="speakers" data-testid="tab-speakers">
              <Users className="w-4 h-4 mr-2" />
              Speakers
            </TabsTrigger>
            <TabsTrigger value="summary" data-testid="tab-summary">
              <FileText className="w-4 h-4 mr-2" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="qa" data-testid="tab-qa">
              <MessageCircle className="w-4 h-4 mr-2" />
              Q&A
            </TabsTrigger>
          </TabsList>

          <TabsContent value="topics" className="space-y-4 mt-4">
            {analysisLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-8 w-1/2" />
              </div>
            ) : !allAnalysis?.topics ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Tags className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">Extract Key Topics</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Let AI identify the main discussion topics with relevance scores
                  </p>
                  <Button
                    onClick={() => topicsMutation.mutate()}
                    disabled={topicsMutation.isPending}
                    data-testid="button-extract-topics"
                  >
                    {topicsMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Extract Topics
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    {allAnalysis.topics.topics.length} Topics Identified
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => topicsMutation.mutate()}
                    disabled={topicsMutation.isPending}
                    data-testid="button-reanalyze-topics"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Re-analyze
                  </Button>
                </div>
                {allAnalysis.topics.topics.map((topic, idx) => (
                  <Card key={idx} data-testid={`card-topic-${idx}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <CardTitle className="text-base">{topic.topic}</CardTitle>
                        <Badge variant="secondary">{Math.round(topic.relevance * 100)}%</Badge>
                      </div>
                      <Progress value={topic.relevance * 100} className="h-2" />
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {topic.keywords.map((keyword, kidx) => (
                          <Badge key={kidx} variant="outline" data-testid={`keyword-${idx}-${kidx}`}>
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sentiment" className="space-y-4 mt-4">
            {analysisLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : !allAnalysis?.sentiment ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">Analyze Sentiment</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Understand the emotional tone and key points of this debate
                  </p>
                  <Button
                    onClick={() => sentimentMutation.mutate()}
                    disabled={sentimentMutation.isPending}
                    data-testid="button-analyze-sentiment"
                  >
                    {sentimentMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Analyze Sentiment
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Overall Sentiment Analysis</CardTitle>
                    <CardDescription>AI-powered emotional tone detection</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Sentiment
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Badge
                            variant={getSentimentBadgeVariant(allAnalysis.sentiment.overallSentiment)}
                            className="text-lg"
                            data-testid="badge-overall-sentiment"
                          >
                            {allAnalysis.sentiment.overallSentiment}
                          </Badge>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Score
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-3xl font-bold" data-testid="text-sentiment-score">
                            {allAnalysis.sentiment.sentimentScore}
                          </p>
                          <Progress value={Math.abs(allAnalysis.sentiment.sentimentScore)} className="h-2 mt-2" />
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Confidence
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-3xl font-bold" data-testid="text-confidence">
                            {allAnalysis.sentiment.confidence}%
                          </p>
                          <Progress value={allAnalysis.sentiment.confidence} className="h-2 mt-2" />
                        </CardContent>
                      </Card>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-semibold">Key Emotional Points</h4>
                      {allAnalysis.sentiment.keyPoints.map((point, idx) => (
                        <Card key={idx} data-testid={`card-keypoint-${idx}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Badge variant={getSentimentBadgeVariant(point.sentiment)}>
                                {point.sentiment}
                              </Badge>
                              <p className="flex-1 text-sm">{point.point}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="speakers" className="space-y-4 mt-4">
            {analysisLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : !allAnalysis?.speakers ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">Analyze Speakers</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Get AI insights on what each MP discussed and their arguments
                  </p>
                  <Button
                    onClick={() => speakersMutation.mutate()}
                    disabled={speakersMutation.isPending}
                    data-testid="button-analyze-speakers"
                  >
                    {speakersMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Analyze Speakers
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  {allAnalysis.speakers.speakerInsights.length} Speakers Analyzed
                </h3>
                <ScrollArea className="h-[500px] pr-4">
                  {allAnalysis.speakers.speakerInsights.map((speaker, idx) => (
                    <Card key={idx} className="mb-4" data-testid={`card-speaker-${idx}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <CardTitle className="text-base">{speaker.mpName}</CardTitle>
                            <CardDescription>MP ID: {speaker.mpId}</CardDescription>
                          </div>
                          <Badge variant={getSentimentBadgeVariant(speaker.sentiment)}>
                            {speaker.sentiment}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-sm font-semibold mb-2">Topics Discussed</p>
                          <div className="flex flex-wrap gap-2">
                            {speaker.topicsDiscussed.map((topic, tidx) => (
                              <Badge key={tidx} variant="secondary">
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold mb-2">Key Arguments</p>
                          <ul className="list-disc list-inside space-y-1">
                            {speaker.keyArguments.map((arg, aidx) => (
                              <li key={aidx} className="text-sm text-muted-foreground">
                                {arg}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </ScrollArea>
              </div>
            )}
          </TabsContent>

          <TabsContent value="summary" className="space-y-4 mt-4">
            <Tabs defaultValue="en" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="en" data-testid="lang-en">English</TabsTrigger>
                <TabsTrigger value="ms" data-testid="lang-ms">Bahasa Malaysia</TabsTrigger>
              </TabsList>

              {["en", "ms"].map((lang) => (
                <TabsContent key={lang} value={lang} className="space-y-4">
                  {analysisLoading ? (
                    <Skeleton className="h-64 w-full" />
                  ) : !allAnalysis?.detailedSummary[lang as "en" | "ms"] ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-lg font-medium mb-2">Generate Summary</p>
                        <p className="text-sm text-muted-foreground mb-4">
                          Get a detailed summary in {lang === "en" ? "English" : "Bahasa Malaysia"}
                        </p>
                        <Button
                          onClick={() => summaryMutation.mutate(lang as "en" | "ms")}
                          disabled={summaryMutation.isPending}
                          data-testid={`button-generate-summary-${lang}`}
                        >
                          {summaryMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-4 w-4" />
                              Generate Summary
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid={`summary-text-${lang}`}>
                            {allAnalysis.detailedSummary[lang as "en" | "ms"]?.summary}
                          </p>
                        </CardContent>
                      </Card>

                      {allAnalysis.detailedSummary[lang as "en" | "ms"]!.keyArguments.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Key Arguments</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="list-disc list-inside space-y-2">
                              {allAnalysis.detailedSummary[lang as "en" | "ms"]!.keyArguments.map((arg, idx) => (
                                <li key={idx} className="text-sm">
                                  {arg}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}

                      {allAnalysis.detailedSummary[lang as "en" | "ms"]!.decisions.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Decisions Made</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="list-disc list-inside space-y-2">
                              {allAnalysis.detailedSummary[lang as "en" | "ms"]!.decisions.map((dec, idx) => (
                                <li key={idx} className="text-sm">
                                  {dec}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}

                      {allAnalysis.detailedSummary[lang as "en" | "ms"]!.actionItems.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Action Items</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="list-disc list-inside space-y-2">
                              {allAnalysis.detailedSummary[lang as "en" | "ms"]!.actionItems.map((item, idx) => (
                                <li key={idx} className="text-sm">
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}

                      {allAnalysis.detailedSummary[lang as "en" | "ms"]!.controversialPoints.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                              Controversial Points
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="list-disc list-inside space-y-2">
                              {allAnalysis.detailedSummary[lang as "en" | "ms"]!.controversialPoints.map((point, idx) => (
                                <li key={idx} className="text-sm">
                                  {point}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>

          <TabsContent value="qa" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Ask Questions About This Debate
                </CardTitle>
                <CardDescription>
                  AI will analyze the transcript to answer your questions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="question-input">Your Question</Label>
                    <Input
                      id="question-input"
                      data-testid="input-question"
                      placeholder="What was discussed about healthcare?"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !qaMutation.isPending) {
                          handleAskQuestion();
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleAskQuestion}
                      disabled={qaMutation.isPending || !question.trim()}
                      data-testid="button-ask-question"
                    >
                      {qaMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {qaHistory.length > 0 && (
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {qaHistory.map((qa, idx) => (
                        <Card key={idx} data-testid={`card-qa-${idx}`}>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-start gap-2">
                              <MessageCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <span className="flex-1">{qa.question}</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {qa.answer}
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              Relevance: {qa.relevanceScore}%
                            </Badge>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                {qaHistory.length === 0 && (
                  <div className="text-center py-12">
                    <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      Ask questions to get AI-powered answers from this debate transcript
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
