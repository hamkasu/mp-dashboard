import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FileText, Search, ChevronDown, ExternalLink, Calendar, Users, Clock } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import type { HansardRecord, Mp } from "@shared/schema";

export default function Hansard() {
  const [globalSearch, setGlobalSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");

  const { data: hansardRecords = [], isLoading } = useQuery<HansardRecord[]>({
    queryKey: ["/api/hansard-records"],
  });

  const { data: mps = [] } = useQuery<Mp[]>({
    queryKey: ["/api/mps"],
  });

  const getMpById = (id: string) => mps.find(mp => mp.id === id);

  const filteredRecords = hansardRecords.filter(record => {
    const matchesSearch = !searchQuery || 
      record.sessionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.transcript.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.topics.some(topic => topic.toLowerCase().includes(searchQuery.toLowerCase())) ||
      record.speakers.some(speaker => speaker.mpName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSession = !sessionFilter || record.sessionNumber.includes(sessionFilter);

    return matchesSearch && matchesSession;
  });

  const uniqueSessions = Array.from(new Set(hansardRecords.map(r => r.sessionNumber))).sort();

  return (
    <div className="min-h-screen bg-background">
      <Header searchQuery={globalSearch} onSearchChange={setGlobalSearch} />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Hansard Records</h1>
            <p className="text-muted-foreground">
              Browse parliamentary session transcripts and proceedings
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by session, topic, speaker, or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-hansard"
              />
            </div>
          </div>
          
          <div className="w-48">
            <select
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              data-testid="select-session-filter"
            >
              <option value="">All Sessions</option>
              {uniqueSessions.map(session => (
                <option key={session} value={session}>{session}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading Hansard records...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Records Found</h3>
              <p className="text-muted-foreground">
                {searchQuery || sessionFilter 
                  ? "Try adjusting your search or filters" 
                  : "No Hansard records available yet"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRecords.map((record) => (
              <Card key={record.id} data-testid={`card-hansard-${record.id}`}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant="outline" className="font-mono" data-testid={`badge-session-${record.id}`}>
                          {record.sessionNumber}
                        </Badge>
                        <Badge variant="secondary">{record.parliamentTerm}</Badge>
                        <Badge variant="secondary">{record.sitting}</Badge>
                      </div>
                      <CardTitle className="text-xl mb-2">
                        Parliamentary Session {record.sessionNumber}
                      </CardTitle>
                      <CardDescription className="flex flex-wrap items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(record.sessionDate), "PPP")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {record.speakers.length} Speaker{record.speakers.length !== 1 ? 's' : ''}
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {record.topics.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Topics Discussed:</h4>
                      <div className="flex flex-wrap gap-2">
                        {record.topics.map((topic, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-between gap-2"
                        data-testid={`button-toggle-speakers-${record.id}`}
                      >
                        <span className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          View Speakers ({record.speakers.length})
                        </span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 mt-2">
                      {record.speakers
                        .sort((a, b) => a.speakingOrder - b.speakingOrder)
                        .map((speaker, idx) => {
                          const mp = getMpById(speaker.mpId);
                          const initials = speaker.mpName
                            .split(" ")
                            .map(n => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2);
                          
                          return (
                            <div 
                              key={idx} 
                              className="flex items-center gap-3 p-3 rounded-md border"
                              data-testid={`speaker-${record.id}-${idx}`}
                            >
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  {mp ? (
                                    <Link href={`/mp/${mp.id}`}>
                                      <button className="font-medium hover:underline" data-testid={`link-speaker-${speaker.mpId}`}>
                                        {speaker.mpName}
                                      </button>
                                    </Link>
                                  ) : (
                                    <span className="font-medium">{speaker.mpName}</span>
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    #{speaker.speakingOrder}
                                  </Badge>
                                </div>
                                {mp && (
                                  <p className="text-sm text-muted-foreground">
                                    {mp.party} • {mp.constituency}
                                  </p>
                                )}
                              </div>
                              {speaker.duration && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {speaker.duration} min
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </CollapsibleContent>
                  </Collapsible>

                  {record.voteRecords && record.voteRecords.length > 0 && (
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-between gap-2"
                          data-testid={`button-toggle-votes-${record.id}`}
                        >
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            View Vote Records ({record.voteRecords.length})
                          </span>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 mt-2">
                        {record.voteRecords.map((vote, idx) => (
                          <div 
                            key={idx} 
                            className="p-3 rounded-md border"
                            data-testid={`vote-${record.id}-${idx}`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                              <span className="font-medium">{vote.motion}</span>
                              <Badge 
                                variant={vote.result === "Passed" ? "default" : "destructive"}
                                className="text-xs"
                              >
                                {vote.result}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{vote.voteType}</p>
                            <div className="flex flex-wrap gap-4 text-sm">
                              <span className="text-green-600 dark:text-green-400">
                                Yes: {vote.yesCount}
                              </span>
                              <span className="text-red-600 dark:text-red-400">
                                No: {vote.noCount}
                              </span>
                              <span className="text-muted-foreground">
                                Abstain: {vote.abstainCount}
                              </span>
                            </div>
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-between gap-2"
                        data-testid={`button-toggle-transcript-${record.id}`}
                      >
                        <span className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          View Transcript
                        </span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="p-4 rounded-md bg-muted/50 border">
                        <p className="text-sm whitespace-pre-wrap" data-testid={`transcript-${record.id}`}>
                          {record.transcript}
                        </p>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {record.pdfLinks && record.pdfLinks.length > 0 && (
                    <div className="pt-2 border-t">
                      <h4 className="text-sm font-semibold mb-2">Official Documents:</h4>
                      <div className="flex flex-wrap gap-2">
                        {record.pdfLinks.map((link, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            asChild
                            data-testid={`button-pdf-${record.id}-${idx}`}
                          >
                            <a href={link} target="_blank" rel="noopener noreferrer" className="gap-2">
                              <ExternalLink className="h-3 w-3" />
                              PDF {idx + 1}
                            </a>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
