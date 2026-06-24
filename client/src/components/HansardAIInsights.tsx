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
  RefreshCw,
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

interface ComprehensiveAnalysis {
  id: string;
  hansardRecordId: string;
  language: string;
  introduction: string;
  sections: Array<{
    title: string;
    overview: string;
    keyPoints: Array<{
      heading: string;
      detail: string;
    }>;
  }>;
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
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [topicSummary, setTopicSummary] = useState<{
    summary: string;
    keyPoints: string[];
    speakers: string[];
    quotes: string[];
  } | null>(null);

  const { data: allAnalysis, isLoading: analysisLoading } = useQuery<{
    topics: TopicAnalysis | null;
    sentiment: SentimentAnalysis | null;
    speakers: SpeakerAnalysis | null;
    detailedSummary: {
      en: DetailedSummary | null;
      ms: DetailedSummary | null;
    };
    comprehensiveAnalysis: {
      en: ComprehensiveAnalysis | null;
      ms: ComprehensiveAnalysis | null;
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
    mutationFn: () => apiRequest("POST", `/api/analyze/speakers/${hansardRecord.id}`, { force: true }),
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

  const comprehensiveMutation = useMutation({
    mutationFn: (language: "en" | "ms") =>
      apiRequest("POST", `/api/analyze/comprehensive/${hansardRecord.id}`, { language }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/analyze/${hansardRecord.id}`] });
      toast({
        title: "Analysis Generated",
        description: "AI has created a comprehensive thematic analysis of this debate",
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

  const topicSummaryMutation = useMutation({
    mutationFn: async (topicName: string) => {
      const response = await apiRequest("POST", `/api/hansard/${hansardRecord.id}/topic-summary`, {
        topicName,
      });
      const data = await response.json();
      return data as { summary: string; keyPoints: string[]; speakers: string[]; quotes: string[] };
    },
    onSuccess: (data) => {
      setTopicSummary(data);
      toast({
        title: "Topic Summary Generated",
        description: "AI has analyzed this specific topic",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Generate Summary",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTopicClick = (topicName: string) => {
    setSelectedTopic(topicName);
    setTopicSummary(null);
    topicSummaryMutation.mutate(topicName);
  };

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
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Analysis - {hansardRecord.sessionNumber}
          </DialogTitle>
          <DialogDescription>
            Powered by Gemini 2.0 Flash via OpenRouter (FREE!) - Comprehensive analysis of parliamentary debates
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
                  <Card
                    key={idx}
                    data-testid={`card-topic-${idx}`}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleTopicClick(topic.topic)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <CardTitle className="text-base">{topic.topic}</CardTitle>
                        <Badge variant="secondary">{Math.round(topic.relevance)}%</Badge>
                      </div>
                      <Progress value={topic.relevance} className="h-2" />
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
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-lg font-semibold">
                    {allAnalysis.speakers.speakerInsights.length} Speakers Analyzed
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => speakersMutation.mutate()}
                    disabled={speakersMutation.isPending}
                    data-testid="button-reanalyze-speakers"
                  >
                    {speakersMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Re-analyze
                  </Button>
                </div>
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
                  ) : !allAnalysis?.comprehensiveAnalysis?.[lang as "en" | "ms"] ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-lg font-medium mb-2">Generate Comprehensive Analysis</p>
                        <p className="text-sm text-muted-foreground mb-4">
                          Get a detailed thematic analysis in {lang === "en" ? "English" : "Bahasa Malaysia"}
                        </p>
                        <Button
                          onClick={() => comprehensiveMutation.mutate(lang as "en" | "ms")}
                          disabled={comprehensiveMutation.isPending}
                          data-testid={`button-generate-comprehensive-${lang}`}
                        >
                          {comprehensiveMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generating Analysis...
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-4 w-4" />
                              Generate Analysis
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <ScrollArea className="h-[600px] pr-4">
                      <div className="space-y-6">
                        {/* Introduction */}
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <p className="text-base leading-relaxed text-muted-foreground italic">
                            {allAnalysis.comprehensiveAnalysis[lang as "en" | "ms"]?.introduction}
                          </p>
                        </div>

                        {/* Thematic Sections */}
                        {allAnalysis.comprehensiveAnalysis[lang as "en" | "ms"]?.sections.map((section, idx) => (
                          <Card key={idx} className="border-l-4 border-l-primary" data-testid={`section-${idx}`}>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <span className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">
                                  {idx + 1}
                                </span>
                                {section.title}
                              </CardTitle>
                              <CardDescription className="text-sm leading-relaxed mt-2">
                                {section.overview}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                {section.keyPoints.map((point, pidx) => (
                                  <div key={pidx} className="pl-4 border-l-2 border-muted">
                                    <p className="font-medium text-sm text-foreground mb-1">
                                      {point.heading}
                                    </p>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                      {point.detail}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        ))}

                        {/* Re-analyze button */}
                        <div className="flex justify-end pt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => comprehensiveMutation.mutate(lang as "en" | "ms")}
                            disabled={comprehensiveMutation.isPending}
                          >
                            {comprehensiveMutation.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="mr-2 h-4 w-4" />
                            )}
                            Re-analyze
                          </Button>
                        </div>
                      </div>
                    </ScrollArea>
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

    {/* Topic Summary Modal */}
    <Dialog open={!!selectedTopic} onOpenChange={() => setSelectedTopic(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tags className="w-5 h-5 text-primary" />
              {selectedTopic}
            </DialogTitle>
            <DialogDescription>
              AI-powered deep dive into this specific topic
            </DialogDescription>
          </DialogHeader>

          {topicSummaryMutation.isPending ? (
            <div className="space-y-4 py-8">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
              <p className="text-center text-sm text-muted-foreground">
                Analyzing topic with AI...
              </p>
            </div>
          ) : topicSummary ? (
            <div className="space-y-6">
              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{topicSummary.summary || "No summary available"}</p>
                </CardContent>
              </Card>

              {/* Key Points */}
              {topicSummary.keyPoints && topicSummary.keyPoints.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Key Points</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {topicSummary.keyPoints.map((point, idx) => (
                        <li key={idx} className="flex gap-2 text-sm">
                          <span className="text-primary flex-shrink-0">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Speakers */}
              {topicSummary.speakers && topicSummary.speakers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Speakers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {topicSummary.speakers.map((speaker, idx) => (
                        <Badge key={idx} variant="secondary">
                          <Users className="w-3 h-3 mr-1" />
                          {speaker}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notable Quotes */}
              {topicSummary.quotes && topicSummary.quotes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Notable Quotes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {topicSummary.quotes.map((quote, idx) => (
                        <blockquote key={idx} className="border-l-4 border-primary pl-4 italic text-sm text-muted-foreground">
                          "{quote}"
                        </blockquote>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="py-8 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Failed to load topic summary
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
