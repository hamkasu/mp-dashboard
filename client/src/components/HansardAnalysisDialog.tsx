/**
 * Copyright by Calmic Sdn Bhd
 */

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  CheckCircle, 
  XCircle, 
  HelpCircle,
  BarChart3,
  MessageSquare,
  Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { HansardRecordWithPdf } from "@shared/schema";

interface MP {
  id: string;
  name: string;
  constituency: string;
  party: string;
  photoUrl: string | null;
}

interface AnalysisResult {
  success: boolean;
  mp: {
    id: string;
    name: string;
    constituency: string;
    party: string;
  };
  metadata: {
    sessionNumber: string;
    sessionDate: string;
    parliamentTerm: string;
    sitting: string;
  };
  attendanceStatus: 'present' | 'absent' | 'unknown';
  uniqueSpeakers: {
    count: number;
    speakers: Array<{
      mpId: string;
      speakingOrder: number;
    }>;
  };
  allSpeechInstances: {
    count: number;
    instances: Array<{
      position: number;
      capturedName: string;
      context: string;
      speechText: string;
    }>;
  };
  sessionStats: {
    totalUniqueSpeakers: number;
    attendedMps: number;
    absentMps: number;
    unmatchedSpeakers: number;
    unmatchedSpeakerNames: string[];
  };
}

interface HansardAnalysisDialogProps {
  hansardRecord: HansardRecordWithPdf;
  trigger: React.ReactNode;
}

export function HansardAnalysisDialog({ hansardRecord, trigger }: HansardAnalysisDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedHansardId, setSelectedHansardId] = useState<string>(hansardRecord?.id || "");
  const [selectedMpId, setSelectedMpId] = useState<string>("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const { data: mps, isLoading: mpsLoading } = useQuery<MP[]>({
    queryKey: ["/api/mps"],
  });

  const { data: allHansardRecords, isLoading: hansardLoading } = useQuery<HansardRecordWithPdf[]>({
    queryKey: ["/api/hansard-records"],
  });

  // Filter to only show hansard records that have PDFs available
  const hansardRecords = allHansardRecords?.filter(record => record.hasPdf) || [];

  // Get the currently selected hansard record (either from dropdown or prop)
  const selectedHansard = allHansardRecords?.find(r => r.id === selectedHansardId) || hansardRecord;

  const filteredMps = (() => {
    if (!mps) return [];

    if (!selectedHansard?.speakers || selectedHansard.speakers.length === 0) {
      return mps;
    }

    const speakerMpIds = selectedHansard.speakers
      .filter(speaker => speaker.mpId)
      .map(speaker => speaker.mpId);

    if (speakerMpIds.length === 0) {
      return mps;
    }

    const filtered = mps.filter(mp => speakerMpIds.includes(mp.id));

    return filtered.length > 0 ? filtered : mps;
  })();

  const analyzeMutation = useMutation({
    mutationFn: async (data: { hansardRecordId: string; mpId: string }) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      
      const response = await fetch("/api/hansard-analysis", {
        method: "POST",
        body: JSON.stringify(data),
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Analysis failed" }));
        throw new Error(error.error || error.details || "Analysis failed");
      }

      return response.json() as Promise<AnalysisResult>;
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      toast({
        title: "Analysis Complete",
        description: `Found ${data.allSpeechInstances.count} speech instances for ${data.mp.name}`,
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

  const handleAnalyze = () => {
    if (!selectedHansardId) {
      toast({
        title: "No Session Selected",
        description: "Please select a Hansard session",
        variant: "destructive",
      });
      return;
    }
    if (!selectedMpId) {
      toast({
        title: "No MP Selected",
        description: "Please select an MP to analyze",
        variant: "destructive",
      });
      return;
    }

    analyzeMutation.mutate({ hansardRecordId: selectedHansardId, mpId: selectedMpId });
  };

  const getAttendanceIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'absent':
        return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
      default:
        return <HelpCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getAttendanceBadgeVariant = (status: string): "default" | "secondary" | "destructive" => {
    switch (status) {
      case 'present':
        return 'default';
      case 'absent':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSelectedHansardId(hansardRecord?.id || "");
      setSelectedMpId("");
      setAnalysisResult(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Hansard Speech Analysis</DialogTitle>
          <DialogDescription>
            {hansardRecord?.sessionNumber || "Select a session"} - Analyze speaking instances for MPs who spoke in this session
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upload & Analyze</CardTitle>
                <CardDescription>Select a session and MP to analyze</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hansard-select-dialog">Hansard Session</Label>
                  {hansardLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select
                      value={selectedHansardId}
                      onValueChange={(value) => {
                        setSelectedHansardId(value);
                        setSelectedMpId(""); // Reset MP selection when session changes
                        setAnalysisResult(null); // Clear previous results
                      }}
                      disabled={analyzeMutation.isPending}
                    >
                      <SelectTrigger id="hansard-select-dialog" data-testid="select-hansard-dialog">
                        <SelectValue placeholder="Choose a Hansard session" />
                      </SelectTrigger>
                      <SelectContent>
                        {hansardRecords && hansardRecords.length > 0 ? (
                          [...hansardRecords]
                            .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())
                            .map((record) => (
                              <SelectItem key={record.id} value={record.id}>
                                {record.sessionNumber} - {new Date(record.sessionDate).toLocaleDateString('en-MY')}
                              </SelectItem>
                            ))
                        ) : (
                          <SelectItem value="none" disabled>
                            No Hansard sessions with PDFs available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mp-select-dialog">Select MP</Label>
                  {mpsLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select
                      value={selectedMpId}
                      onValueChange={setSelectedMpId}
                      disabled={analyzeMutation.isPending}
                    >
                      <SelectTrigger id="mp-select-dialog" data-testid="select-mp-dialog">
                        <SelectValue placeholder={filteredMps.length > 0 ? "Choose a Constituency" : "No MPs spoke in this session"} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredMps.length > 0 ? (
                          [...filteredMps].sort((a, b) => a.constituency.localeCompare(b.constituency)).map((mp) => (
                            <SelectItem key={mp.id} value={mp.id}>
                              {mp.constituency} - {mp.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>
                            No MPs spoke in this session
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                  {filteredMps.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Showing {filteredMps.length} MP{filteredMps.length !== 1 ? 's' : ''} who spoke in this session
                    </p>
                  )}
                </div>

                <Button
                  data-testid="button-analyze-dialog"
                  onClick={handleAnalyze}
                  disabled={!selectedHansardId || !selectedMpId || analyzeMutation.isPending || filteredMps.length === 0}
                  className="w-full"
                >
                  {analyzeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Analyze Speech
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            {analyzeMutation.isPending && (
              <Card>
                <CardContent className="p-12">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-lg font-medium">Analyzing Hansard PDF...</p>
                    <p className="text-sm text-muted-foreground">
                      This may take a moment for large files
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {!analyzeMutation.isPending && !analysisResult && (
              <Card>
                <CardContent className="p-12">
                  <div className="flex flex-col items-center justify-center space-y-4 text-center">
                    <BarChart3 className="h-12 w-12 text-muted-foreground" />
                    <div>
                      <p className="text-lg font-medium mb-2">Ready to Analyze</p>
                      <p className="text-sm text-muted-foreground">
                        Select a Hansard session (with PDF) and an MP to begin analysis
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {analysisResult && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Analysis Results</CardTitle>
                    <CardDescription>
                      {analysisResult.metadata.sessionNumber} - {new Date(analysisResult.metadata.sessionDate).toLocaleDateString('en-MY', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">MP</p>
                        <p className="text-lg font-semibold" data-testid="text-mp-name-dialog">{analysisResult.mp.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {analysisResult.mp.constituency} • {analysisResult.mp.party}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Attendance</p>
                        <div className="flex items-center gap-2">
                          {getAttendanceIcon(analysisResult.attendanceStatus)}
                          <Badge variant={getAttendanceBadgeVariant(analysisResult.attendanceStatus)} data-testid="badge-attendance-dialog">
                            {analysisResult.attendanceStatus.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid gap-4 md:grid-cols-3">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Unique Speakers
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-3xl font-bold" data-testid="text-unique-count-dialog">{analysisResult.uniqueSpeakers.count}</p>
                          <p className="text-xs text-muted-foreground mt-1">Distinct speaking slots</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" />
                            Total Speeches
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-3xl font-bold" data-testid="text-total-count-dialog">{analysisResult.allSpeechInstances.count}</p>
                          <p className="text-xs text-muted-foreground mt-1">All speech instances</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Session Speakers
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-3xl font-bold" data-testid="text-session-speakers-dialog">{analysisResult.sessionStats.totalUniqueSpeakers}</p>
                          <p className="text-xs text-muted-foreground mt-1">Total MPs spoke</p>
                        </CardContent>
                      </Card>
                    </div>

                    {analysisResult.allSpeechInstances.count > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Speech Instances</h3>
                          <div className="space-y-3 max-h-[600px] overflow-y-auto">
                            {analysisResult.allSpeechInstances.instances.map((instance, idx) => (
                              <Card key={idx} data-testid={`card-speech-dialog-${idx}`}>
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-3 mb-3">
                                    <Badge variant="outline" className="flex-shrink-0">#{idx + 1}</Badge>
                                    <div className="space-y-1 flex-1 min-w-0">
                                      <p className="text-sm font-medium">
                                        Captured as: "{instance.capturedName}"
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {instance.context}
                                      </p>
                                    </div>
                                  </div>
                                  <Separator className="mb-3" />
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">Speech Content</p>
                                    <ScrollArea className="h-48 w-full rounded-md border p-3" data-testid={`speech-text-${idx}`}>
                                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                        {instance.speechText}
                                      </p>
                                    </ScrollArea>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {analysisResult.sessionStats.unmatchedSpeakerNames.length > 0 && 
                     analysisResult.sessionStats.unmatchedSpeakerNames.length <= 10 && (
                      <>
                        <Separator />
                        <Alert>
                          <HelpCircle className="h-4 w-4" />
                          <AlertTitle>Unmatched Speakers</AlertTitle>
                          <AlertDescription>
                            <p className="text-sm mb-2">
                              The following speakers could not be matched to MPs in the database:
                            </p>
                            <ul className="text-sm list-disc list-inside space-y-1">
                              {analysisResult.sessionStats.unmatchedSpeakerNames.map((name, idx) => (
                                <li key={idx}>{name}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
