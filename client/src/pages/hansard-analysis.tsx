import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  Upload, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  HelpCircle,
  BarChart3,
  MessageSquare,
  Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

export default function HansardAnalysis() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMpId, setSelectedMpId] = useState<string>("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const { data: mps, isLoading: mpsLoading } = useQuery<MP[]>({
    queryKey: ["/api/mps"],
  });

  const analyzeMutation = useMutation({
    mutationFn: async (data: { file: File; mpId: string }) => {
      // Validate file on frontend before sending
      if (!data.file.name.toLowerCase().endsWith('.pdf')) {
        throw new Error("Invalid file type. Please select a PDF file.");
      }
      
      if (data.file.size > 50 * 1024 * 1024) {
        throw new Error("File too large. Maximum size is 50MB.");
      }

      const formData = new FormData();
      formData.append("pdf", data.file);
      formData.append("mpId", data.mpId);

      const response = await fetch("/api/hansard-analysis", {
        method: "POST",
        body: formData,
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({
          title: "Invalid File",
          description: "Please select a PDF file",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Maximum file size is 50MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleAnalyze = () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a Hansard PDF file",
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

    analyzeMutation.mutate({ file: selectedFile, mpId: selectedMpId });
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

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Hansard Speech Analysis</h1>
        <p className="text-muted-foreground">
          Upload a Hansard PDF to analyze speaking instances for a specific MP
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Upload & Analyze</CardTitle>
              <CardDescription>Select a PDF and MP to analyze</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pdf-upload">Hansard PDF File</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="pdf-upload"
                    data-testid="input-pdf-file"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    disabled={analyzeMutation.isPending}
                  />
                  {selectedFile && (
                    <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
                {selectedFile && (
                  <p className="text-sm text-muted-foreground" data-testid="text-selected-file">
                    {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="mp-select">Select MP</Label>
                {mpsLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    value={selectedMpId}
                    onValueChange={setSelectedMpId}
                    disabled={analyzeMutation.isPending}
                  >
                    <SelectTrigger id="mp-select" data-testid="select-mp">
                      <SelectValue placeholder="Choose a Constituency" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...(mps ?? [])].sort((a, b) => a.constituency.localeCompare(b.constituency)).map((mp) => (
                        <SelectItem key={mp.id} value={mp.id}>
                          {mp.constituency} - {mp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Button
                data-testid="button-analyze"
                onClick={handleAnalyze}
                disabled={!selectedFile || !selectedMpId || analyzeMutation.isPending}
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

        <div className="lg:col-span-2">
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
                  <Upload className="h-12 w-12 text-muted-foreground" />
                  <div>
                    <p className="text-lg font-medium mb-2">No Analysis Yet</p>
                    <p className="text-sm text-muted-foreground">
                      Upload a Hansard PDF and select an MP to begin analysis
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {analysisResult && (
            <div className="space-y-6">
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
                      <p className="text-lg font-semibold" data-testid="text-mp-name">{analysisResult.mp.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {analysisResult.mp.constituency} • {analysisResult.mp.party}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Attendance</p>
                      <div className="flex items-center gap-2">
                        {getAttendanceIcon(analysisResult.attendanceStatus)}
                        <Badge variant={getAttendanceBadgeVariant(analysisResult.attendanceStatus)} data-testid="badge-attendance">
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
                        <p className="text-3xl font-bold" data-testid="text-unique-count">{analysisResult.uniqueSpeakers.count}</p>
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
                        <p className="text-3xl font-bold" data-testid="text-total-count">{analysisResult.allSpeechInstances.count}</p>
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
                        <p className="text-3xl font-bold" data-testid="text-session-speakers">{analysisResult.sessionStats.totalUniqueSpeakers}</p>
                        <p className="text-xs text-muted-foreground mt-1">Total MPs spoke</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Session Statistics</h3>
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Parliament:</span>
                        <span className="font-medium">{analysisResult.metadata.parliamentTerm}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sitting:</span>
                        <span className="font-medium">{analysisResult.metadata.sitting}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">MPs Attended:</span>
                        <span className="font-medium">{analysisResult.sessionStats.attendedMps}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">MPs Absent:</span>
                        <span className="font-medium">{analysisResult.sessionStats.absentMps}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Unmatched Speakers:</span>
                        <span className="font-medium">{analysisResult.sessionStats.unmatchedSpeakers}</span>
                      </div>
                    </div>
                  </div>

                  {analysisResult.allSpeechInstances.count > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Speech Instances</h3>
                        <div className="space-y-3 max-h-[600px] overflow-y-auto">
                          {analysisResult.allSpeechInstances.instances.map((instance, idx) => (
                            <Card key={idx} data-testid={`card-speech-${idx}`}>
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
    </div>
  );
}
