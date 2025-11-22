/**
 * Copyright by Calmic Sdn Bhd
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/i18n/LanguageContext";
import { Header } from "@/components/Header";
import { SearchDialog } from "@/components/SearchDialog";
import { AddActivityDialog } from "@/components/AddActivityDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, MessageSquare, HelpCircle, Plus, Search, ExternalLink, Scale, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import type { Mp, LegislativeProposal, DebateParticipation, ParliamentaryQuestion, CourtCase, SprmInvestigation } from "@shared/schema";

export default function ParliamentaryActivity() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("legislation");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);

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

  const { data: courtCases = [], isLoading: courtCasesLoading } = useQuery<CourtCase[]>({
    queryKey: ["/api/court-cases"],
  });

  const { data: sprmInvestigations = [], isLoading: sprmLoading } = useQuery<SprmInvestigation[]>({
    queryKey: ["/api/sprm-investigations"],
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

  const filteredCourtCases = courtCases.filter(courtCase => {
    if (!searchQuery) return true;
    const mp = getMpById(courtCase.mpId);
    return (
      courtCase.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      courtCase.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mp?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      courtCase.charges.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredSprmInvestigations = sprmInvestigations.filter(investigation => {
    if (!searchQuery) return true;
    const mp = getMpById(investigation.mpId);
    return (
      investigation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (investigation.caseNumber && investigation.caseNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      mp?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      investigation.charges.toLowerCase().includes(searchQuery.toLowerCase())
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
      <Header onSearchClick={() => setSearchDialogOpen(true)} />
      
      <SearchDialog 
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
      />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t('activity.title')}</h1>
            <p className="text-muted-foreground">
              {t('activity.subtitle')}
            </p>
          </div>
          <Button
            data-testid="button-add-activity"
            variant="default"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('activity.addActivity')}
          </Button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search"
            placeholder={t('activity.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 gap-2">
            <TabsTrigger value="legislation" data-testid="tab-legislation">
              <FileText className="w-4 h-4 mr-2" />
              {t('activity.legislation')} ({filteredProposals.length})
            </TabsTrigger>
            <TabsTrigger value="debates" data-testid="tab-debates">
              <MessageSquare className="w-4 h-4 mr-2" />
              {t('activity.debates')} ({filteredDebates.length})
            </TabsTrigger>
            <TabsTrigger value="questions" data-testid="tab-questions">
              <HelpCircle className="w-4 h-4 mr-2" />
              {t('activity.questions')} ({filteredQuestions.length})
            </TabsTrigger>
            <TabsTrigger value="court-cases" data-testid="tab-court-cases">
              <Scale className="w-4 h-4 mr-2" />
              {t('activity.courtCases')} ({filteredCourtCases.length})
            </TabsTrigger>
            <TabsTrigger value="sprm" data-testid="tab-sprm">
              <AlertTriangle className="w-4 h-4 mr-2" />
              {t('activity.sprm')} ({filteredSprmInvestigations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="legislation" className="space-y-4">
            {proposalsLoading ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">{t('activity.loadingProposals')}</p>
                </CardContent>
              </Card>
            ) : filteredProposals.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">
                    {searchQuery ? t('activity.noProposalsSearch') : t('activity.noProposals')}
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
                          <span className="font-medium">{t('activity.proposed')}:</span>{" "}
                          {format(new Date(proposal.dateProposed), "dd MMM yyyy")}
                        </div>
                        {proposal.outcome && (
                          <div>
                            <span className="font-medium">{t('activity.outcome')}:</span> {proposal.outcome}
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
                            {t('activity.viewHansard')}
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
                  <p className="text-center text-muted-foreground">{t('activity.loadingDebates')}</p>
                </CardContent>
              </Card>
            ) : filteredDebates.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">
                    {searchQuery ? t('activity.noDebatesSearch') : t('activity.noDebates')}
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
                        <p className="text-sm font-medium">{t('activity.contribution')}:</p>
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
                            {t('activity.viewHansard')}
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
                  <p className="text-center text-muted-foreground">{t('activity.loadingQuestions')}</p>
                </CardContent>
              </Card>
            ) : filteredQuestions.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">
                    {searchQuery ? t('activity.noQuestionsSearch') : t('activity.noQuestions')}
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
                        <p className="text-sm font-medium">{t('activity.question')}:</p>
                        <p className="text-sm">{question.questionText}</p>
                      </div>

                      {question.answerText && (
                        <div className="space-y-2 bg-muted p-4 rounded-md">
                          <p className="text-sm font-medium">{t('activity.answer')}:</p>
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
                          {t('activity.viewHansard')}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="court-cases" className="space-y-4">
            {courtCasesLoading ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">{t('activity.loadingCourtCases')}</p>
                </CardContent>
              </Card>
            ) : filteredCourtCases.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">
                    {searchQuery ? t('activity.noCourtCasesSearch') : t('activity.noCourtCases')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredCourtCases.map((courtCase) => {
                const mp = getMpById(courtCase.mpId);
                return (
                  <Card key={courtCase.id} data-testid={`card-court-case-${courtCase.id}`} className="hover-elevate">
                    <CardHeader>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant="outline" className={getStatusColor(courtCase.status)}>
                              {courtCase.status}
                            </Badge>
                            <Badge variant="secondary">{courtCase.courtLevel}</Badge>
                          </div>
                          <CardTitle className="text-xl mb-2">{courtCase.title}</CardTitle>
                          <CardDescription>{t('activity.caseNumber')} #{courtCase.caseNumber}</CardDescription>
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
                        <p className="text-sm font-medium">{t('activity.charges')}:</p>
                        <p className="text-sm text-muted-foreground">{courtCase.charges}</p>
                      </div>

                      {courtCase.outcome && (
                        <div className="space-y-2 bg-muted p-4 rounded-md">
                          <p className="text-sm font-medium">{t('activity.outcome')}:</p>
                          <p className="text-sm text-muted-foreground">{courtCase.outcome}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">{t('activity.filed')}:</span>{" "}
                          {format(new Date(courtCase.filingDate), "dd MMM yyyy")}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="sprm" className="space-y-4">
            {sprmLoading ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">{t('activity.loadingSprm')}</p>
                </CardContent>
              </Card>
            ) : filteredSprmInvestigations.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">
                    {searchQuery ? t('activity.noSprmSearch') : t('activity.noSprm')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredSprmInvestigations.map((investigation) => {
                const mp = getMpById(investigation.mpId);
                return (
                  <Card key={investigation.id} data-testid={`card-sprm-${investigation.id}`} className="hover-elevate">
                    <CardHeader>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant="outline" className={getStatusColor(investigation.status)}>
                              {investigation.status}
                            </Badge>
                            {investigation.caseNumber && (
                              <Badge variant="secondary">{t('activity.caseNumber')} #{investigation.caseNumber}</Badge>
                            )}
                          </div>
                          <CardTitle className="text-xl mb-2">{investigation.title}</CardTitle>
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
                        <p className="text-sm font-medium">{t('activity.allegations')}:</p>
                        <p className="text-sm text-muted-foreground">{investigation.charges}</p>
                      </div>

                      {investigation.outcome && (
                        <div className="space-y-2 bg-muted p-4 rounded-md">
                          <p className="text-sm font-medium">{t('activity.outcome')}:</p>
                          <p className="text-sm text-muted-foreground">{investigation.outcome}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">{t('activity.started')}:</span>{" "}
                          {format(new Date(investigation.startDate), "dd MMM yyyy")}
                        </div>
                        {investigation.endDate && (
                          <div>
                            <span className="font-medium">{t('activity.ended')}:</span>{" "}
                            {format(new Date(investigation.endDate), "dd MMM yyyy")}
                          </div>
                        )}
                      </div>
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
