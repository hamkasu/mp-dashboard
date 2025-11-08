import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { AddActivityDialog } from "@/components/AddActivityDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, MessageSquare, HelpCircle, Plus, Search, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import type { Mp, LegislativeProposal, DebateParticipation, ParliamentaryQuestion } from "@shared/schema";

export default function ParliamentaryActivity() {
  const [globalSearch, setGlobalSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("legislation");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: mps = [] } = useQuery<Mp[]>({
    queryKey: ["/api/mps"],
  });

  const { data: legislativeProposals = [], isLoading: proposalsLoading } = useQuery<LegislativeProposal[]>({
    queryKey: ["/api/legislative-proposals"],
  });

  const { data: debateParticipations = [], isLoading: debatesLoading } = useQuery<DebateParticipation[]>({
    queryKey: ["/api/debate-participations"],
  });

  const { data: parliamentaryQuestions = [], isLoading: questionsLoading } = useQuery<ParliamentaryQuestion[]>({
    queryKey: ["/api/parliamentary-questions"],
  });

  const getMpById = (id: string) => mps.find(mp => mp.id === id);

  const filteredProposals = legislativeProposals.filter(proposal => {
    if (!searchQuery) return true;
    const mp = getMpById(proposal.mpId);
    return (
      proposal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mp?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proposal.type.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredDebates = debateParticipations.filter(debate => {
    if (!searchQuery) return true;
    const mp = getMpById(debate.mpId);
    return (
      debate.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mp?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      debate.contribution.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredQuestions = parliamentaryQuestions.filter(question => {
    if (!searchQuery) return true;
    const mp = getMpById(question.mpId);
    return (
      question.questionText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mp?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      question.ministry.toLowerCase().includes(searchQuery.toLowerCase()) ||
      question.topic.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "passed":
      case "completed":
      case "answered":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "in progress":
      case "pending":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      case "rejected":
      case "withdrawn":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
      default:
        return "bg-muted";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header searchQuery={globalSearch} onSearchChange={setGlobalSearch} />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Parliamentary Activity</h1>
            <p className="text-muted-foreground">
              Track legislation, debates, and questions from Malaysian Parliament
            </p>
          </div>
          <Button 
            data-testid="button-add-activity" 
            variant="default"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Activity
          </Button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search"
            placeholder="Search by MP name, title, topic, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="legislation" data-testid="tab-legislation">
              <FileText className="w-4 h-4 mr-2" />
              Legislation ({filteredProposals.length})
            </TabsTrigger>
            <TabsTrigger value="debates" data-testid="tab-debates">
              <MessageSquare className="w-4 h-4 mr-2" />
              Debates ({filteredDebates.length})
            </TabsTrigger>
            <TabsTrigger value="questions" data-testid="tab-questions">
              <HelpCircle className="w-4 h-4 mr-2" />
              Questions ({filteredQuestions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="legislation" className="space-y-4">
            {proposalsLoading ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">Loading legislative proposals...</p>
                </CardContent>
              </Card>
            ) : filteredProposals.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">
                    {searchQuery ? "No legislative proposals found matching your search." : "No legislative proposals yet."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredProposals.map((proposal) => {
                const mp = getMpById(proposal.mpId);
                return (
                  <Card key={proposal.id} data-testid={`card-proposal-${proposal.id}`} className="hover-elevate">
                    <CardHeader>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant="outline" className={getStatusColor(proposal.status)}>
                              {proposal.status}
                            </Badge>
                            <Badge variant="secondary">{proposal.type}</Badge>
                          </div>
                          <CardTitle className="text-xl mb-2">{proposal.title}</CardTitle>
                          <CardDescription>{proposal.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {mp && (
                        <Link href={`/mp/${mp.id}`}>
                          <div className="flex items-center gap-3 hover-elevate p-3 rounded-md cursor-pointer">
                            <Avatar>
                              <AvatarImage src={mp.photoUrl || undefined} />
                              <AvatarFallback>{mp.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{mp.name}</p>
                              <p className="text-sm text-muted-foreground">{mp.constituency}, {mp.state}</p>
                            </div>
                          </div>
                        </Link>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Proposed:</span>{" "}
                          {format(new Date(proposal.dateProposed), "dd MMM yyyy")}
                        </div>
                        {proposal.outcome && (
                          <div>
                            <span className="font-medium">Outcome:</span> {proposal.outcome}
                          </div>
                        )}
                        {proposal.hansardReference && (
                          <Button
                            variant="ghost"
                            size="sm"
                            data-testid={`button-hansard-${proposal.id}`}
                            className="gap-2"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View Hansard
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="debates" className="space-y-4">
            {debatesLoading ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">Loading debate participations...</p>
                </CardContent>
              </Card>
            ) : filteredDebates.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">
                    {searchQuery ? "No debate participations found matching your search." : "No debate participations yet."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredDebates.map((debate) => {
                const mp = getMpById(debate.mpId);
                return (
                  <Card key={debate.id} data-testid={`card-debate-${debate.id}`} className="hover-elevate">
                    <CardHeader>
                      <CardTitle className="text-xl">{debate.topic}</CardTitle>
                      <CardDescription>
                        {format(new Date(debate.date), "dd MMM yyyy")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {mp && (
                        <Link href={`/mp/${mp.id}`}>
                          <div className="flex items-center gap-3 hover-elevate p-3 rounded-md cursor-pointer">
                            <Avatar>
                              <AvatarImage src={mp.photoUrl || undefined} />
                              <AvatarFallback>{mp.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{mp.name}</p>
                              <p className="text-sm text-muted-foreground">{mp.constituency}, {mp.state}</p>
                            </div>
                          </div>
                        </Link>
                      )}
                      
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Contribution:</p>
                        <p className="text-sm text-muted-foreground">{debate.contribution}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        {debate.position && (
                          <Badge variant="outline">{debate.position}</Badge>
                        )}
                        {debate.hansardReference && (
                          <Button
                            variant="ghost"
                            size="sm"
                            data-testid={`button-hansard-${debate.id}`}
                            className="gap-2"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View Hansard
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="questions" className="space-y-4">
            {questionsLoading ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">Loading parliamentary questions...</p>
                </CardContent>
              </Card>
            ) : filteredQuestions.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">
                    {searchQuery ? "No parliamentary questions found matching your search." : "No parliamentary questions yet."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredQuestions.map((question) => {
                const mp = getMpById(question.mpId);
                return (
                  <Card key={question.id} data-testid={`card-question-${question.id}`} className="hover-elevate">
                    <CardHeader>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant="outline" className={getStatusColor(question.answerStatus)}>
                              {question.answerStatus}
                            </Badge>
                            <Badge variant="secondary">{question.ministry}</Badge>
                          </div>
                          <CardTitle className="text-lg mb-2">{question.topic}</CardTitle>
                          <CardDescription>
                            {format(new Date(question.dateAsked), "dd MMM yyyy")}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {mp && (
                        <Link href={`/mp/${mp.id}`}>
                          <div className="flex items-center gap-3 hover-elevate p-3 rounded-md cursor-pointer">
                            <Avatar>
                              <AvatarImage src={mp.photoUrl || undefined} />
                              <AvatarFallback>{mp.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{mp.name}</p>
                              <p className="text-sm text-muted-foreground">{mp.constituency}, {mp.state}</p>
                            </div>
                          </div>
                        </Link>
                      )}
                      
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Question:</p>
                        <p className="text-sm">{question.questionText}</p>
                      </div>

                      {question.answerText && (
                        <div className="space-y-2 bg-muted p-4 rounded-md">
                          <p className="text-sm font-medium">Answer:</p>
                          <p className="text-sm text-muted-foreground">{question.answerText}</p>
                        </div>
                      )}

                      {question.hansardReference && (
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`button-hansard-${question.id}`}
                          className="gap-2"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Hansard
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </main>

      <AddActivityDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
