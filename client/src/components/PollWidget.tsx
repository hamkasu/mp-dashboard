/**
 * Weekly Poll Widget Component
 * Displays the active poll and allows users to vote
 * Copyright by Calmic Sdn Bhd
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Vote, BarChart2, Calendar, Loader2, History, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/i18n/LanguageContext";

interface PollOption {
  id: string;
  pollId: string;
  optionText: string;
  optionTextMs: string | null;
  displayOrder: number;
  voteCount: number;
  votePercentage: number;
}

interface Poll {
  id: string;
  question: string;
  questionMs: string | null;
  description: string | null;
  category: string;
  weekNumber: number;
  year: number;
  status: string;
  totalVotes: number;
  startsAt: string | null;
  endsAt: string | null;
  options: PollOption[];
  hasVoted?: boolean;
  userVotedOptionId?: string;
}

interface PollWidgetProps {
  className?: string;
}

export function PollWidget({ className }: PollWidgetProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [expandedPollId, setExpandedPollId] = useState<string | null>(null);
  const [showPreviousPolls, setShowPreviousPolls] = useState(false);

  // Fetch active poll
  const { data, isLoading, error } = useQuery({
    queryKey: ["active-poll"],
    queryFn: async () => {
      const res = await fetch("/api/polls/active");
      if (!res.ok) throw new Error("Failed to fetch poll");
      return res.json();
    },
    refetchInterval: 60000, // Refetch every minute to get updated vote counts
  });

  // Fetch most recent closed poll as fallback when no active poll
  const { data: recentData, isLoading: recentLoading } = useQuery({
    queryKey: ["recent-closed-poll"],
    queryFn: async () => {
      const res = await fetch("/api/polls?status=closed&limit=1");
      if (!res.ok) throw new Error("Failed to fetch recent poll");
      return res.json();
    },
    enabled: !isLoading && !data?.poll, // Only fetch when active poll is absent
  });

  // Fetch previous closed polls for "Previous Results" links
  const { data: previousPollsData } = useQuery({
    queryKey: ["previous-closed-polls"],
    queryFn: async () => {
      const res = await fetch("/api/polls?status=closed&limit=10");
      if (!res.ok) throw new Error("Failed to fetch previous polls");
      return res.json();
    },
    enabled: !isLoading,
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async (optionId: string) => {
      const res = await apiRequest("POST", `/api/polls/${poll?.id}/vote`, { optionId });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to vote");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["active-poll"], { poll: data.poll });
      queryClient.invalidateQueries({ queryKey: ["recent-closed-poll"] });
      toast({
        title: language === "ms" ? "Undi berjaya!" : "Vote recorded!",
        description: language === "ms"
          ? "Terima kasih atas undian anda."
          : "Thank you for participating.",
      });
    },
    onError: (error: any) => {
      toast({
        title: language === "ms" ? "Gagal mengundi" : "Failed to vote",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const activePoll: Poll | null = data?.poll;
  const recentClosedPoll: Poll | null = recentData?.polls?.[0] ?? null;
  const poll = activePoll || recentClosedPoll;
  const isShowingPastPoll = !activePoll && !!recentClosedPoll;
  const hasVoted = poll?.hasVoted || false;
  const showResults = hasVoted || poll?.status === "closed";

  // Filter previous polls — exclude the one currently displayed
  const allClosedPolls: Poll[] = previousPollsData?.polls ?? [];
  const previousPolls = allClosedPolls.filter((p) => p.id !== poll?.id);

  const handleVote = () => {
    if (!selectedOption || !poll) return;
    voteMutation.mutate(selectedOption);
  };

  // Get localized text
  const getQuestionText = () => {
    if (!poll) return "";
    return language === "ms" && poll.questionMs ? poll.questionMs : poll.question;
  };

  const getOptionText = (option: PollOption) => {
    return language === "ms" && option.optionTextMs ? option.optionTextMs : option.optionText;
  };

  const getCategoryLabel = (category: string) => {
    const categoryLabels: Record<string, { en: string; ms: string }> = {
      politics: { en: "Politics", ms: "Politik" },
      economy: { en: "Economy", ms: "Ekonomi" },
      social: { en: "Social", ms: "Sosial" },
      education: { en: "Education", ms: "Pendidikan" },
      healthcare: { en: "Healthcare", ms: "Kesihatan" },
      environment: { en: "Environment", ms: "Alam Sekitar" },
      infrastructure: { en: "Infrastructure", ms: "Infrastruktur" },
      governance: { en: "Governance", ms: "Tadbir Urus" },
      general: { en: "General", ms: "Umum" },
    };
    return categoryLabels[category]?.[language] || category;
  };

  if (isLoading || recentLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !poll) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Vote className="h-5 w-5" />
            {language === "ms" ? "Undian Mingguan" : "Weekly Poll"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {language === "ms"
              ? "Tiada undian aktif buat masa ini. Sila semak semula nanti."
              : "No active poll at the moment. Please check back later."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {isShowingPastPoll ? (
              <History className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Vote className="h-5 w-5 text-primary" />
            )}
            {isShowingPastPoll
              ? (language === "ms" ? "Undian Lepas" : "Previous Poll")
              : (language === "ms" ? "Undian Mingguan" : "Weekly Poll")}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {getCategoryLabel(poll.category)}
          </Badge>
        </div>
        {poll.description && (
          <CardDescription className="text-xs mt-1">
            {poll.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="font-medium text-sm leading-relaxed">{getQuestionText()}</p>

        {showResults ? (
          // Show results view
          <div className="space-y-3">
            {poll.options
              .sort((a, b) => b.voteCount - a.voteCount)
              .map((option) => {
                const percentage = option.votePercentage / 100; // Convert from stored format
                const isUserVote = poll.userVotedOptionId === option.id;

                return (
                  <div key={option.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className={`flex items-center gap-2 ${isUserVote ? "font-medium" : ""}`}>
                        {isUserVote && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        {getOptionText(option)}
                      </span>
                      <span className="text-muted-foreground">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                    <Progress
                      value={percentage}
                      className={`h-2 ${isUserVote ? "[&>div]:bg-green-500" : ""}`}
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {option.voteCount} {language === "ms" ? "undi" : "votes"}
                    </p>
                  </div>
                );
              })}

            <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground border-t">
              <span className="flex items-center gap-1">
                <BarChart2 className="h-3 w-3" />
                {poll.totalVotes} {language === "ms" ? "jumlah undi" : "total votes"}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {language === "ms" ? "Minggu" : "Week"} {poll.weekNumber}, {poll.year}
              </span>
            </div>

            {/* Previous Poll Results Links */}
            {previousPolls.length > 0 && (
              <div className="pt-2 border-t">
                <button
                  onClick={() => setShowPreviousPolls((v) => !v)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                >
                  <History className="h-3 w-3" />
                  <span className="flex-1 text-left">
                    {language === "ms" ? "Keputusan Undian Lepas" : "Previous Poll Results"}
                  </span>
                  {showPreviousPolls ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>

                {showPreviousPolls && (
                  <div className="mt-2 space-y-2">
                    {previousPolls.map((prevPoll) => (
                      <div key={prevPoll.id} className="rounded-md border bg-muted/30">
                        <button
                          onClick={() =>
                            setExpandedPollId((id) =>
                              id === prevPoll.id ? null : prevPoll.id
                            )
                          }
                          className="flex items-start justify-between gap-2 w-full p-2 text-left hover:bg-muted/50 transition-colors rounded-md"
                        >
                          <span className="text-xs font-medium leading-snug flex-1">
                            {language === "ms" && prevPoll.questionMs
                              ? prevPoll.questionMs
                              : prevPoll.question}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                            W{prevPoll.weekNumber}/{prevPoll.year}
                          </span>
                          {expandedPollId === prevPoll.id ? (
                            <ChevronUp className="h-3 w-3 shrink-0 text-muted-foreground mt-0.5" />
                          ) : (
                            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground mt-0.5" />
                          )}
                        </button>

                        {expandedPollId === prevPoll.id && (
                          <div className="px-2 pb-2 space-y-1.5">
                            {prevPoll.options
                              .sort((a, b) => b.voteCount - a.voteCount)
                              .map((option) => {
                                const pct = option.votePercentage / 100;
                                return (
                                  <div key={option.id} className="space-y-0.5">
                                    <div className="flex items-center justify-between text-xs">
                                      <span>
                                        {language === "ms" && option.optionTextMs
                                          ? option.optionTextMs
                                          : option.optionText}
                                      </span>
                                      <span className="text-muted-foreground ml-2 shrink-0">
                                        {pct.toFixed(1)}%
                                      </span>
                                    </div>
                                    <Progress value={pct} className="h-1.5" />
                                  </div>
                                );
                              })}
                            <p className="text-xs text-muted-foreground text-right pt-0.5">
                              {prevPoll.totalVotes}{" "}
                              {language === "ms" ? "undi" : "votes"}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          // Show voting view
          <div className="space-y-4">
            <RadioGroup
              value={selectedOption || ""}
              onValueChange={setSelectedOption}
              className="space-y-2"
            >
              {poll.options
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((option) => (
                  <div
                    key={option.id}
                    className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedOption(option.id)}
                  >
                    <RadioGroupItem value={option.id} id={option.id} />
                    <Label htmlFor={option.id} className="flex-1 cursor-pointer text-sm">
                      {getOptionText(option)}
                    </Label>
                  </div>
                ))}
            </RadioGroup>

            <Button
              onClick={handleVote}
              disabled={!selectedOption || voteMutation.isPending}
              className="w-full"
              size="sm"
            >
              {voteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {language === "ms" ? "Mengundi..." : "Voting..."}
                </>
              ) : (
                <>
                  <Vote className="mr-2 h-4 w-4" />
                  {language === "ms" ? "Hantar Undi" : "Submit Vote"}
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              {language === "ms"
                ? "Undian adalah tanpa nama. Anda hanya boleh mengundi sekali."
                : "Voting is anonymous. You can only vote once."}
            </p>

            {/* Previous Poll Results Links (voting view) */}
            {previousPolls.length > 0 && (
              <div className="pt-2 border-t">
                <button
                  onClick={() => setShowPreviousPolls((v) => !v)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                >
                  <History className="h-3 w-3" />
                  <span className="flex-1 text-left">
                    {language === "ms" ? "Keputusan Undian Lepas" : "Previous Poll Results"}
                  </span>
                  {showPreviousPolls ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>

                {showPreviousPolls && (
                  <div className="mt-2 space-y-2">
                    {previousPolls.map((prevPoll) => (
                      <div key={prevPoll.id} className="rounded-md border bg-muted/30">
                        <button
                          onClick={() =>
                            setExpandedPollId((id) =>
                              id === prevPoll.id ? null : prevPoll.id
                            )
                          }
                          className="flex items-start justify-between gap-2 w-full p-2 text-left hover:bg-muted/50 transition-colors rounded-md"
                        >
                          <span className="text-xs font-medium leading-snug flex-1">
                            {language === "ms" && prevPoll.questionMs
                              ? prevPoll.questionMs
                              : prevPoll.question}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                            W{prevPoll.weekNumber}/{prevPoll.year}
                          </span>
                          {expandedPollId === prevPoll.id ? (
                            <ChevronUp className="h-3 w-3 shrink-0 text-muted-foreground mt-0.5" />
                          ) : (
                            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground mt-0.5" />
                          )}
                        </button>

                        {expandedPollId === prevPoll.id && (
                          <div className="px-2 pb-2 space-y-1.5">
                            {prevPoll.options
                              .sort((a, b) => b.voteCount - a.voteCount)
                              .map((option) => {
                                const pct = option.votePercentage / 100;
                                return (
                                  <div key={option.id} className="space-y-0.5">
                                    <div className="flex items-center justify-between text-xs">
                                      <span>
                                        {language === "ms" && option.optionTextMs
                                          ? option.optionTextMs
                                          : option.optionText}
                                      </span>
                                      <span className="text-muted-foreground ml-2 shrink-0">
                                        {pct.toFixed(1)}%
                                      </span>
                                    </div>
                                    <Progress value={pct} className="h-1.5" />
                                  </div>
                                );
                              })}
                            <p className="text-xs text-muted-foreground text-right pt-0.5">
                              {prevPoll.totalVotes}{" "}
                              {language === "ms" ? "undi" : "votes"}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
