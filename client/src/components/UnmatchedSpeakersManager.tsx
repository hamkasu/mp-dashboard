/**
 * Copyright by Calmic Sdn Bhd
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, CheckCircle2, UserSearch } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UnmatchedSpeaker {
  id: string;
  hansardRecordId: string;
  extractedName: string;
  extractedConstituency: string | null;
  matchFailureReason: string;
  speakingOrder: number;
  rawHeaderText: string;
  suggestedMpIds: string[];
  isMapped: boolean;
  mappedMpId: string | null;
  createdAt: string;
}

interface SuggestedMatch {
  mpId: string;
  mpName: string;
  constituency: string;
  party: string;
  score: number;
  reason: string;
}

export function UnmatchedSpeakersManager({ hansardRecordId }: { hansardRecordId?: string }) {
  const { toast } = useToast();
  const [selectedSpeaker, setSelectedSpeaker] = useState<UnmatchedSpeaker | null>(null);
  const [selectedMpId, setSelectedMpId] = useState<string>("");
  const [viewingMode, setViewingMode] = useState<"unmapped" | "all">("unmapped");

  // Fetch unmatched speakers
  const { data: unmatchedSpeakers, isLoading } = useQuery<UnmatchedSpeaker[]>({
    queryKey: hansardRecordId 
      ? [`/api/hansard-records/${hansardRecordId}/unmatched-speakers`]
      : ["/api/unmatched-speakers", { unmappedOnly: viewingMode === "unmapped" }],
  });

  // Fetch suggestions for a specific speaker
  const { data: suggestions, isLoading: loadingSuggestions } = useQuery<{
    unmatchedSpeaker: UnmatchedSpeaker;
    suggestions: SuggestedMatch[];
  }>({
    queryKey: selectedSpeaker ? [`/api/unmatched-speakers/${selectedSpeaker.id}/suggestions`] : [],
    enabled: !!selectedSpeaker,
  });

  // Create mapping mutation
  const createMappingMutation = useMutation({
    mutationFn: async (data: {
      unmatchedSpeakerId: string;
      mpId: string;
      confidence: number;
      notes?: string;
    }) => {
      const res = await apiRequest("POST", "/api/speaker-mappings", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Mapping Created",
        description: "Speaker has been successfully mapped to MP",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/unmatched-speakers"] });
      queryClient.invalidateQueries({ queryKey: [`/api/hansard-records/${hansardRecordId}/unmatched-speakers`] });
      setSelectedSpeaker(null);
      setSelectedMpId("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create speaker mapping",
        variant: "destructive",
      });
    },
  });

  const handleCreateMapping = () => {
    if (!selectedSpeaker || !selectedMpId) return;
    
    createMappingMutation.mutate({
      unmatchedSpeakerId: selectedSpeaker.id,
      mpId: selectedMpId,
      confidence: 1.0,
      notes: `Manually mapped from Hansard session`,
    });
  };

  const unmappedCount = unmatchedSpeakers?.filter(s => !s.isMapped).length || 0;
  const totalCount = unmatchedSpeakers?.length || 0;

  return (
    <Card data-testid="card-unmatched-speakers">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserSearch className="h-5 w-5" />
          Unmatched Speakers
        </CardTitle>
        <CardDescription>
          Review and manually map speakers that couldn't be automatically matched
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" data-testid="badge-unmapped-count">
                    {unmappedCount} Unmapped
                  </Badge>
                  <Badge variant="secondary" data-testid="badge-total-count">
                    {totalCount} Total
                  </Badge>
                </div>
              </div>
              
              {!hansardRecordId && (
                <Select 
                  value={viewingMode} 
                  onValueChange={(value: "unmapped" | "all") => setViewingMode(value)}
                >
                  <SelectTrigger className="w-[180px]" data-testid="select-viewing-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unmapped">Unmapped Only</SelectItem>
                    <SelectItem value="all">All Speakers</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {unmatchedSpeakers && unmatchedSpeakers.length > 0 ? (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Constituency</TableHead>
                      <TableHead>Failure Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unmatchedSpeakers.map((speaker) => (
                      <TableRow key={speaker.id} data-testid={`row-speaker-${speaker.id}`}>
                        <TableCell className="font-medium" data-testid={`text-name-${speaker.id}`}>
                          {speaker.extractedName}
                        </TableCell>
                        <TableCell data-testid={`text-constituency-${speaker.id}`}>
                          {speaker.extractedConstituency || (
                            <span className="text-muted-foreground italic">Not extracted</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground" data-testid={`text-reason-${speaker.id}`}>
                          {speaker.matchFailureReason}
                        </TableCell>
                        <TableCell>
                          {speaker.isMapped ? (
                            <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                              <CheckCircle2 className="h-3 w-3" />
                              Mapped
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                              <AlertCircle className="h-3 w-3" />
                              Unmapped
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedSpeaker(speaker)}
                                disabled={speaker.isMapped}
                                data-testid={`button-map-${speaker.id}`}
                              >
                                Map to MP
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Map Speaker to MP</DialogTitle>
                                <DialogDescription>
                                  Review extracted information and select the correct MP
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-md">
                                  <div>
                                    <div className="text-sm font-medium">Extracted Name</div>
                                    <div className="text-sm text-muted-foreground">{speaker.extractedName}</div>
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium">Extracted Constituency</div>
                                    <div className="text-sm text-muted-foreground">
                                      {speaker.extractedConstituency || "Not extracted"}
                                    </div>
                                  </div>
                                  <div className="col-span-2">
                                    <div className="text-sm font-medium">Raw Header Text</div>
                                    <div className="text-sm text-muted-foreground font-mono">
                                      {speaker.rawHeaderText}
                                    </div>
                                  </div>
                                  <div className="col-span-2">
                                    <div className="text-sm font-medium">Failure Reason</div>
                                    <div className="text-sm text-muted-foreground">
                                      {speaker.matchFailureReason}
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <div className="text-sm font-medium mb-2">Suggested Matches</div>
                                  {loadingSuggestions ? (
                                    <div className="flex items-center justify-center p-4">
                                      <Loader2 className="h-6 w-6 animate-spin" />
                                    </div>
                                  ) : suggestions && suggestions.suggestions.length > 0 ? (
                                    <div className="space-y-2">
                                      {suggestions.suggestions.map((match) => (
                                        <div
                                          key={match.mpId}
                                          className={`flex items-center justify-between p-3 border rounded-md hover-elevate active-elevate-2 cursor-pointer ${
                                            selectedMpId === match.mpId ? "bg-accent" : ""
                                          }`}
                                          onClick={() => setSelectedMpId(match.mpId)}
                                          data-testid={`suggestion-${match.mpId}`}
                                        >
                                          <div>
                                            <div className="font-medium">{match.mpName}</div>
                                            <div className="text-sm text-muted-foreground">
                                              {match.constituency} • {match.party}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                              {match.reason}
                                            </div>
                                          </div>
                                          <Badge variant="secondary">
                                            {(match.score * 100).toFixed(0)}% match
                                          </Badge>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-sm text-muted-foreground text-center p-4">
                                      No suggestions available
                                    </div>
                                  )}
                                </div>

                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedSpeaker(null);
                                      setSelectedMpId("");
                                    }}
                                    data-testid="button-cancel-mapping"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={handleCreateMapping}
                                    disabled={!selectedMpId || createMappingMutation.isPending}
                                    data-testid="button-confirm-mapping"
                                  >
                                    {createMappingMutation.isPending && (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Confirm Mapping
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center p-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2" />
                <p>No unmatched speakers found</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
