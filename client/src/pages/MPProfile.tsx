import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, MapPin, UserCircle, Flag, FileText, Wallet, Calendar, Scale, ExternalLink, AlertTriangle, Info, MessageSquare, HelpCircle, Gavel, FileQuestion, ScrollText, Phone, Mail, MapPinned, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Summarizer } from "@/components/Summarizer";
import { HansardParticipation15th } from "@/components/HansardParticipation15th";
import { HansardSpeakingRecord } from "@/components/HansardSpeakingRecord";
import type { Mp, CourtCase, SprmInvestigation, LegislativeProposal, DebateParticipation, ParliamentaryQuestion, HansardRecord } from "@shared/schema";
import { calculateTotalSalary, calculateYearlyBreakdown, formatCurrency, getPublicationName } from "@/lib/utils";
import { format } from "date-fns";

const PARTY_COLORS: Record<string, string> = {
  PH: "bg-chart-1 text-white",
  BN: "bg-chart-2 text-white",
  GPS: "bg-chart-3 text-white",
  GRS: "bg-chart-4 text-white",
  WARISAN: "bg-chart-5 text-white",
  KDM: "bg-primary text-primary-foreground",
  PBM: "bg-secondary text-secondary-foreground",
  PN: "bg-accent text-accent-foreground",
  MUDA: "bg-muted text-muted-foreground",
  BEBAS: "bg-destructive text-destructive-foreground",
};

function getAttendanceColor(attendanceRate: number): string {
  if (attendanceRate >= 85) return "text-green-600 dark:text-green-400";
  if (attendanceRate >= 70) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getAttendanceLabel(attendanceRate: number): string {
  if (attendanceRate >= 85) return "Excellent";
  if (attendanceRate >= 70) return "Good";
  return "Needs Improvement";
}

export default function MPProfile() {
  const [, params] = useRoute("/mp/:id");
  const mpId = params?.id;

  const { data: mp, isLoading } = useQuery<Mp>({
    queryKey: ["/api/mps", mpId],
    enabled: !!mpId,
  });

  const { data: courtCases = [], isLoading: isLoadingCourtCases } = useQuery<CourtCase[]>({
    queryKey: [`/api/mps/${mpId}/court-cases`],
    enabled: !!mpId,
  });

  const { data: sprmInvestigations = [], isLoading: isLoadingSprmInvestigations } = useQuery<SprmInvestigation[]>({
    queryKey: [`/api/mps/${mpId}/sprm-investigations`],
    enabled: !!mpId,
  });

  const { data: legislativeProposals = [], isLoading: isLoadingProposals } = useQuery<LegislativeProposal[]>({
    queryKey: [`/api/mps/${mpId}/legislative-proposals`],
    enabled: !!mpId,
  });

  const { data: debateParticipations = [], isLoading: isLoadingDebates } = useQuery<DebateParticipation[]>({
    queryKey: [`/api/mps/${mpId}/debate-participations`],
    enabled: !!mpId,
  });

  const { data: parliamentaryQuestions = [], isLoading: isLoadingQuestions } = useQuery<ParliamentaryQuestion[]>({
    queryKey: [`/api/mps/${mpId}/parliamentary-questions`],
    enabled: !!mpId,
  });

  const { data: hansardParticipation, isLoading: isLoadingHansard } = useQuery<{ count: number; sessions: HansardRecord[] }>({
    queryKey: [`/api/mps/${mpId}/hansard-participation`],
    enabled: !!mpId,
  });

  const [activityTab, setActivityTab] = useState("bills");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-32 bg-muted rounded" />
            <div className="grid md:grid-cols-3 gap-6">
              <div className="h-80 bg-muted rounded-lg" />
              <div className="md:col-span-2 space-y-4">
                <div className="h-12 bg-muted rounded w-3/4" />
                <div className="h-6 bg-muted rounded w-1/2" />
                <div className="h-24 bg-muted rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!mp) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <UserCircle className="h-24 w-24 text-muted-foreground/50 mx-auto" />
          <h2 className="text-2xl font-bold">MP Not Found</h2>
          <Link href="/">
            <Button variant="default">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const initials = mp.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const partyColor = PARTY_COLORS[mp.party] || "bg-muted text-muted-foreground";
  const monthlySalary = mp.mpAllowance;
  const yearlySalary = monthlySalary * 12;
  
  // Use real attendance from Hansard records
  const totalSessions = (mp as any).totalHansardSessions || mp.totalParliamentDays || 0;
  const sessionsAttended = (mp as any).hansardSessionsAttended || mp.daysAttended || 0;
  
  const totalSalary = calculateTotalSalary(mp.swornInDate, monthlySalary, sessionsAttended, mp.parliamentSittingAllowance);
  const formattedSwornInDate = format(new Date(mp.swornInDate), "MMMM d, yyyy");
  const yearlyBreakdown = calculateYearlyBreakdown(mp.swornInDate, monthlySalary);
  
  const attendanceRate = totalSessions > 0 
    ? (sessionsAttended / totalSessions) * 100 
    : 0;
  const attendanceColor = getAttendanceColor(attendanceRate);
  const attendanceLabel = getAttendanceLabel(attendanceRate);

  const baseUrl = window.location.origin;
  
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": `${mp.title || ''} ${mp.name}`.trim(),
    "jobTitle": mp.role || "Member of Parliament",
    "image": mp.photoUrl || undefined,
    "url": `${baseUrl}/mp/${mp.id}`,
    "identifier": mp.parliamentCode,
    "gender": mp.gender === "M" ? "Male" : mp.gender === "F" ? "Female" : undefined,
    "worksFor": {
      "@type": "GovernmentOrganization",
      "name": "Malaysian Parliament - Dewan Rakyat",
      "url": "https://www.parlimen.gov.my",
      "department": {
        "@type": "GovernmentOrganization",
        "name": mp.party
      }
    },
    "memberOf": {
      "@type": "Organization",
      "name": mp.party
    },
    "address": {
      "@type": "PostalAddress",
      "addressLocality": mp.constituency,
      "addressRegion": mp.state,
      "addressCountry": "MY"
    },
    "knowsAbout": mp.role ? [mp.role] : ["Parliamentary Affairs", "Malaysian Politics"]
  };

  return (
    <div className="min-h-screen bg-background">
      <script 
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
        <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
          <div className="space-y-6 md:space-y-8">
          {/* Back Button */}
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>

          {/* Profile Header */}
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {/* Photo */}
            <div className="flex justify-center md:justify-start">
              <div className="w-full max-w-xs">
                <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted border">
                  {mp.photoUrl ? (
                    <img
                      src={mp.photoUrl}
                      alt={mp.name}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <UserCircle className="w-32 h-32 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="md:col-span-2 space-y-4">
              {mp.role && (
                <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium">
                  {mp.role}
                </p>
              )}
              
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2" data-testid="text-mp-name">
                  {mp.title && <span className="text-muted-foreground">{mp.title} </span>}
                  {mp.name}
                </h1>
                
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge className={`${partyColor} text-base px-3 py-1`}>
                    {mp.party}
                  </Badge>
                  <Badge variant="outline" className="text-base px-3 py-1 font-mono">
                    {mp.parliamentCode}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Details Grid */}
              <div className="grid gap-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-1">
                      Constituency
                    </p>
                    <p className="text-lg font-semibold">{mp.constituency}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Flag className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-1">
                      State
                    </p>
                    <p className="text-lg font-semibold">{mp.state}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <UserCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-1">
                      Gender
                    </p>
                    <p className="text-lg font-semibold">{mp.gender}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Information Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Parliament Attendance
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="ml-1" data-testid="button-attendance-info">
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">
                        Attendance is calculated based on parliamentary sitting days. The percentage represents days attended out of total sitting days in the current session.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Attendance Record</p>
                  <p className={`text-3xl font-bold ${attendanceColor}`} data-testid="text-attendance-fraction">
                    {sessionsAttended}/{totalSessions}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">parliamentary sessions</p>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Attendance Rate</p>
                    <p className={`text-xl font-semibold ${attendanceColor}`} data-testid="text-attendance-rate">
                      {attendanceRate.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Performance</p>
                    <p className={`text-xl font-semibold ${attendanceColor}`} data-testid="text-attendance-label">
                      {attendanceLabel}
                    </p>
                  </div>
                </div>
                <Separator />
                <p className="text-xs text-muted-foreground italic" data-testid="text-attendance-source">
                  Source: Official Hansard Records
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Hansard Speaking Record
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Number of parliamentary sessions where this MP spoke, based on official Hansard records
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoadingHansard ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-12 bg-muted rounded" />
                    <div className="h-8 bg-muted rounded" />
                  </div>
                ) : hansardParticipation ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Sessions Spoken</p>
                        <p className="text-3xl font-bold text-primary" data-testid="text-hansard-sessions-spoke">
                          {mp.hansardSessionsSpoke || hansardParticipation.count}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">sessions</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Total Speeches</p>
                        <p className="text-3xl font-bold text-chart-1" data-testid="text-hansard-total-speeches">
                          {mp.totalSpeechInstances || 0}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">instances</p>
                      </div>
                    </div>
                    {hansardParticipation.sessions.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Recent Sessions</p>
                          <div className="space-y-2" data-testid="list-recent-hansard-sessions">
                            {hansardParticipation.sessions.slice(0, 3).map((session, index) => (
                              <div key={session.id} className="text-sm">
                                <p className="font-medium" data-testid={`text-hansard-session-${index}`}>
                                  {session.sessionNumber}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(session.sessionDate), "MMM d, yyyy")}
                                  {session.topics && session.topics.length > 0 && (
                                    <span> • {session.topics[0]}</span>
                                  )}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    <Separator />
                    <p className="text-xs text-muted-foreground italic" data-testid="text-hansard-source">
                      Source: Official Hansard Records
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No speaking records found</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Parliamentary Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Parliament Code</p>
                  <p className="font-mono font-semibold">{mp.parliamentCode}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Party Affiliation</p>
                  <p className="font-semibold">{mp.party}</p>
                </div>
                {mp.role && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground">Current Role</p>
                      <p className="font-semibold">{mp.role}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Constituency Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Constituency Name</p>
                  <p className="font-semibold">{mp.constituency}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">State/Territory</p>
                  <p className="font-semibold">{mp.state}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information Section */}
          {(mp.email || mp.telephone || mp.fax || mp.mobileNumber || mp.socialMedia || mp.contactAddress || mp.serviceAddress) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mp.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email Address</p>
                      <a 
                        href={`mailto:${mp.email}`} 
                        className="font-semibold text-primary hover:underline"
                        data-testid="link-mp-email"
                      >
                        {mp.email}
                      </a>
                    </div>
                  </div>
                )}
                
                {mp.email && (mp.telephone || mp.fax || mp.mobileNumber || mp.socialMedia || mp.contactAddress || mp.serviceAddress) && <Separator />}

                {mp.telephone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Telephone</p>
                      <a
                        href={`tel:${mp.telephone}`}
                        className="font-semibold text-primary hover:underline"
                        data-testid="link-mp-telephone"
                      >
                        {mp.telephone}
                      </a>
                    </div>
                  </div>
                )}

                {mp.telephone && (mp.fax || mp.mobileNumber || mp.socialMedia || mp.contactAddress || mp.serviceAddress) && <Separator />}

                {mp.fax && (
                  <div className="flex items-start gap-3">
                    <Printer className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Fax</p>
                      <a
                        href={`tel:${mp.fax}`}
                        className="font-semibold text-primary hover:underline"
                        data-testid="link-mp-fax"
                      >
                        {mp.fax}
                      </a>
                    </div>
                  </div>
                )}

                {mp.fax && (mp.mobileNumber || mp.socialMedia || mp.contactAddress || mp.serviceAddress) && <Separator />}
                
                {mp.mobileNumber && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Mobile Number</p>
                      <a
                        href={`tel:${mp.mobileNumber}`}
                        className="font-semibold text-primary hover:underline"
                        data-testid="link-mp-mobile"
                      >
                        {mp.mobileNumber}
                      </a>
                    </div>
                  </div>
                )}

                {mp.mobileNumber && (mp.socialMedia || mp.contactAddress || mp.serviceAddress) && <Separator />}

                {mp.socialMedia && (
                  <div className="flex items-start gap-3">
                    <Share2 className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Social Media</p>
                      <a
                        href={mp.socialMedia}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-primary hover:underline"
                        data-testid="link-mp-social-media"
                      >
                        {mp.socialMedia}
                      </a>
                    </div>
                  </div>
                )}

                {mp.socialMedia && (mp.contactAddress || mp.serviceAddress) && <Separator />}
                
                {mp.contactAddress && (
                  <div className="flex items-start gap-3">
                    <MapPinned className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Contact Address</p>
                      <p className="font-semibold whitespace-pre-line" data-testid="text-mp-contact-address">
                        {mp.contactAddress}
                      </p>
                    </div>
                  </div>
                )}
                
                {mp.contactAddress && mp.serviceAddress && <Separator />}
                
                {mp.serviceAddress && (
                  <div className="flex items-start gap-3">
                    <MapPinned className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Service Address</p>
                      <p className="font-semibold whitespace-pre-line" data-testid="text-mp-service-address">
                        {mp.serviceAddress}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Legislative Activity Summary */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">Legislative Activity</h2>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p>Parliamentary activities including questions asked, bills sponsored, and motions proposed based on official Hansard records.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              {/* Questions Asked Card */}
              <Card className="hover-elevate transition-shadow" data-testid="card-questions-summary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Questions Asked
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isLoadingQuestions ? (
                    <div className="animate-pulse space-y-2">
                      <div className="h-10 bg-muted rounded" />
                      <div className="h-6 bg-muted rounded" />
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-4xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-total-questions">
                          {parliamentaryQuestions.length}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">total questions</p>
                      </div>
                      {parliamentaryQuestions.length > 0 && (
                        <>
                          <Separator />
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Oral Questions</span>
                              <Badge variant="outline" data-testid="badge-oral-count">
                                {parliamentaryQuestions.filter(q => q.questionType?.toLowerCase() === 'oral').length}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Written Questions</span>
                              <Badge variant="outline" data-testid="badge-written-count">
                                {parliamentaryQuestions.filter(q => q.questionType?.toLowerCase() === 'written').length}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Minister Questions</span>
                              <Badge variant="outline" data-testid="badge-minister-count">
                                {parliamentaryQuestions.filter(q => q.questionType?.toLowerCase() === 'minister').length}
                              </Badge>
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Bills Sponsored Card */}
              <Card className="hover-elevate transition-shadow" data-testid="card-bills-summary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ScrollText className="h-5 w-5 text-green-600 dark:text-green-400" />
                    Bills Sponsored
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isLoadingProposals ? (
                    <div className="animate-pulse space-y-2">
                      <div className="h-10 bg-muted rounded" />
                      <div className="h-6 bg-muted rounded" />
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-4xl font-bold text-green-600 dark:text-green-400" data-testid="text-total-bills">
                          {legislativeProposals.filter(p => p.type?.toLowerCase() === 'bill').length}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">bills proposed</p>
                      </div>
                      {legislativeProposals.filter(p => p.type?.toLowerCase() === 'bill').length > 0 && (
                        <>
                          <Separator />
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Pending</span>
                              <Badge variant="outline" data-testid="badge-bills-pending">
                                {legislativeProposals.filter(p => p.type?.toLowerCase() === 'bill' && p.status?.toLowerCase() === 'pending').length}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Approved / Passed</span>
                              <Badge variant="outline" data-testid="badge-bills-approved">
                                {legislativeProposals.filter(p => p.type?.toLowerCase() === 'bill' && (p.status?.toLowerCase() === 'approved' || p.status?.toLowerCase() === 'passed')).length}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Rejected</span>
                              <Badge variant="outline" data-testid="badge-bills-rejected">
                                {legislativeProposals.filter(p => p.type?.toLowerCase() === 'bill' && p.status?.toLowerCase() === 'rejected').length}
                              </Badge>
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Motions Proposed Card */}
              <Card className="hover-elevate transition-shadow" data-testid="card-motions-summary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Gavel className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    Motions Proposed
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isLoadingProposals ? (
                    <div className="animate-pulse space-y-2">
                      <div className="h-10 bg-muted rounded" />
                      <div className="h-6 bg-muted rounded" />
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-4xl font-bold text-purple-600 dark:text-purple-400" data-testid="text-total-motions">
                          {legislativeProposals.filter(p => p.type?.toLowerCase() === 'motion').length}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">motions proposed</p>
                      </div>
                      {legislativeProposals.filter(p => p.type?.toLowerCase() === 'motion').length > 0 && (
                        <>
                          <Separator />
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Pending</span>
                              <Badge variant="outline" data-testid="badge-motions-pending">
                                {legislativeProposals.filter(p => p.type?.toLowerCase() === 'motion' && p.status?.toLowerCase() === 'pending').length}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Approved / Passed</span>
                              <Badge variant="outline" data-testid="badge-motions-approved">
                                {legislativeProposals.filter(p => p.type?.toLowerCase() === 'motion' && (p.status?.toLowerCase() === 'approved' || p.status?.toLowerCase() === 'passed')).length}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Rejected</span>
                              <Badge variant="outline" data-testid="badge-motions-rejected">
                                {legislativeProposals.filter(p => p.type?.toLowerCase() === 'motion' && p.status?.toLowerCase() === 'rejected').length}
                              </Badge>
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Salary Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Sworn In Date</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="font-semibold">{formattedSwornInDate}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Monthly Allowance</p>
                      <p className="font-semibold text-lg" data-testid="text-monthly-salary">{formatCurrency(monthlySalary)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Yearly Allowance</p>
                      <p className="font-semibold text-lg" data-testid="text-yearly-salary">{formatCurrency(yearlySalary)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total Earned to Date</p>
                      <p className="font-bold text-2xl text-green-600 dark:text-green-400" data-testid="text-total-earned">
                        {formatCurrency(totalSalary)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Allowance Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="table-allowances">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold text-sm text-muted-foreground">Allowance Type</th>
                        <th className="text-center py-3 px-4 font-semibold text-sm text-muted-foreground">Frequency</th>
                        <th className="text-right py-3 px-4 font-semibold text-sm text-muted-foreground">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4 font-medium">Base MP Allowance</td>
                        <td className="text-center py-3 px-4 text-sm text-muted-foreground">Monthly</td>
                        <td className="text-right py-3 px-4 font-semibold" data-testid="text-base-allowance">
                          {formatCurrency(mp.mpAllowance)}
                        </td>
                      </tr>
                      <tr className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4 font-medium">Entertainment Allowance</td>
                        <td className="text-center py-3 px-4 text-sm text-muted-foreground">Monthly</td>
                        <td className="text-right py-3 px-4 font-semibold" data-testid="text-entertainment-allowance">
                          {formatCurrency(mp.entertainmentAllowance)}
                        </td>
                      </tr>
                      <tr className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4 font-medium">Handphone Allowance</td>
                        <td className="text-center py-3 px-4 text-sm text-muted-foreground">Monthly</td>
                        <td className="text-right py-3 px-4 font-semibold" data-testid="text-handphone-allowance">
                          {formatCurrency(mp.handphoneAllowance)}
                        </td>
                      </tr>
                      <tr className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4 font-medium">
                          Parliament Sitting Attendance
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatCurrency(mp.parliamentSittingAllowance)}/day × {mp.daysAttended} days (cumulative since sworn in)
                          </p>
                        </td>
                        <td className="text-center py-3 px-4 text-sm text-muted-foreground">Cumulative</td>
                        <td className="text-right py-3 px-4 font-semibold" data-testid="text-parliament-sitting-total">
                          {formatCurrency(mp.parliamentSittingAllowance * mp.daysAttended)}
                        </td>
                      </tr>
                      <tr className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4 font-medium">Computer Allowance</td>
                        <td className="text-center py-3 px-4 text-sm text-muted-foreground">Yearly</td>
                        <td className="text-right py-3 px-4 font-semibold" data-testid="text-computer-allowance">
                          {formatCurrency(mp.computerAllowance)}
                        </td>
                      </tr>
                      <tr className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4 font-medium">Dress Wear Allowance</td>
                        <td className="text-center py-3 px-4 text-sm text-muted-foreground">Yearly</td>
                        <td className="text-right py-3 px-4 font-semibold" data-testid="text-dresswear-allowance">
                          {formatCurrency(mp.dressWearAllowance)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Yearly Allowance Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="table-yearly-breakdown">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold text-sm text-muted-foreground">Year</th>
                        <th className="text-right py-3 px-4 font-semibold text-sm text-muted-foreground">Months Served</th>
                        <th className="text-right py-3 px-4 font-semibold text-sm text-muted-foreground">Amount Earned</th>
                      </tr>
                    </thead>
                    <tbody>
                      {yearlyBreakdown.map((item, index) => (
                        <tr 
                          key={item.year} 
                          className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                          data-testid={`row-year-${item.year}`}
                        >
                          <td className="py-3 px-4 font-medium" data-testid={`text-year-${item.year}`}>
                            {item.year}
                            {index === yearlyBreakdown.length - 1 && (
                              <span className="ml-2 text-xs text-muted-foreground">(Current)</span>
                            )}
                          </td>
                          <td className="text-right py-3 px-4" data-testid={`text-months-${item.year}`}>
                            {item.monthsServed} {item.monthsServed === 1 ? 'month' : 'months'}
                          </td>
                          <td className="text-right py-3 px-4 font-semibold text-green-600 dark:text-green-400" data-testid={`text-amount-${item.year}`}>
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-muted/30">
                        <td className="py-3 px-4 font-bold">Total</td>
                        <td className="text-right py-3 px-4 font-bold">
                          {yearlyBreakdown.reduce((sum, item) => sum + item.monthsServed, 0)} months
                        </td>
                        <td className="text-right py-3 px-4 font-bold text-lg text-green-600 dark:text-green-400" data-testid="text-total-breakdown">
                          {formatCurrency(yearlyBreakdown.reduce((sum, item) => sum + item.amount, 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Court Cases Section */}
            {(isLoadingCourtCases || courtCases.length > 0) && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="h-5 w-5" />
                    Court Cases
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingCourtCases ? (
                    <div className="space-y-3">
                      <div className="h-20 bg-muted animate-pulse rounded" />
                      <div className="h-20 bg-muted animate-pulse rounded" />
                    </div>
                  ) : courtCases.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Scale className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No court cases on record for this MP.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Ongoing Cases */}
                      {courtCases.filter(c => c.status === "Ongoing").length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                            Ongoing Cases ({courtCases.filter(c => c.status === "Ongoing").length})
                          </h4>
                          <div className="space-y-3">
                            {courtCases
                              .filter(c => c.status === "Ongoing")
                              .map((courtCase) => (
                                <div
                                  key={courtCase.id}
                                  className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                                  data-testid={`court-case-${courtCase.id}`}
                                >
                                  <div className="flex items-start justify-between gap-4 mb-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="destructive" data-testid={`badge-status-${courtCase.id}`}>
                                          {courtCase.status}
                                        </Badge>
                                        <Badge variant="outline" data-testid={`badge-court-${courtCase.id}`}>
                                          {courtCase.courtLevel}
                                        </Badge>
                                      </div>
                                      <h5 className="font-semibold mb-1" data-testid={`text-case-title-${courtCase.id}`}>
                                        {courtCase.title}
                                      </h5>
                                      <p className="text-sm text-muted-foreground mb-2" data-testid={`text-case-number-${courtCase.id}`}>
                                        Case No: {courtCase.caseNumber}
                                      </p>
                                    </div>
                                  </div>
                                  <p className="text-sm mb-2" data-testid={`text-charges-${courtCase.id}`}>
                                    <span className="font-medium">Charges: </span>
                                    {courtCase.charges}
                                  </p>
                                  <div className="text-xs text-muted-foreground mb-2">
                                    <span data-testid={`text-filing-date-${courtCase.id}`}>
                                      Filed: {format(new Date(courtCase.filingDate), "MMM d, yyyy")}
                                    </span>
                                  </div>
                                  {courtCase.documentLinks && courtCase.documentLinks.length > 0 && (
                                    <div className="space-y-1 mb-3">
                                      <p className="text-xs font-medium text-muted-foreground">Sources:</p>
                                      <div className="flex flex-wrap gap-2">
                                        {courtCase.documentLinks.map((link, index) => (
                                          <a
                                            key={index}
                                            href={link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                                            data-testid={`link-document-${courtCase.id}-${index}`}
                                          >
                                            {getPublicationName(link)}
                                            <ExternalLink className="h-3 w-3" />
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  <Summarizer 
                                    text={`Court Case: ${courtCase.title}. Charges: ${courtCase.charges}. Status: ${courtCase.status}. Court Level: ${courtCase.courtLevel}.${courtCase.outcome ? ` Outcome: ${courtCase.outcome}` : ''}`}
                                    title="Case Summary"
                                    className="mt-3"
                                  />
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Completed Cases */}
                      {courtCases.filter(c => c.status === "Completed").length > 0 && (
                        <div>
                          {courtCases.filter(c => c.status === "Ongoing").length > 0 && <Separator className="my-4" />}
                          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                            Completed Cases ({courtCases.filter(c => c.status === "Completed").length})
                          </h4>
                          <div className="space-y-3">
                            {courtCases
                              .filter(c => c.status === "Completed")
                              .map((courtCase) => (
                                <div
                                  key={courtCase.id}
                                  className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                                  data-testid={`court-case-${courtCase.id}`}
                                >
                                  <div className="flex items-start justify-between gap-4 mb-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="secondary" data-testid={`badge-status-${courtCase.id}`}>
                                          {courtCase.status}
                                        </Badge>
                                        <Badge variant="outline" data-testid={`badge-court-${courtCase.id}`}>
                                          {courtCase.courtLevel}
                                        </Badge>
                                      </div>
                                      <h5 className="font-semibold mb-1" data-testid={`text-case-title-${courtCase.id}`}>
                                        {courtCase.title}
                                      </h5>
                                      <p className="text-sm text-muted-foreground mb-2" data-testid={`text-case-number-${courtCase.id}`}>
                                        Case No: {courtCase.caseNumber}
                                      </p>
                                    </div>
                                  </div>
                                  <p className="text-sm mb-2" data-testid={`text-charges-${courtCase.id}`}>
                                    <span className="font-medium">Charges: </span>
                                    {courtCase.charges}
                                  </p>
                                  {courtCase.outcome && (
                                    <p className="text-sm mb-2 font-medium text-green-600 dark:text-green-400" data-testid={`text-outcome-${courtCase.id}`}>
                                      Outcome: {courtCase.outcome}
                                    </p>
                                  )}
                                  <div className="text-xs text-muted-foreground mb-2">
                                    <span data-testid={`text-filing-date-${courtCase.id}`}>
                                      Filed: {format(new Date(courtCase.filingDate), "MMM d, yyyy")}
                                    </span>
                                  </div>
                                  {courtCase.documentLinks && courtCase.documentLinks.length > 0 && (
                                    <div className="space-y-1 mb-3">
                                      <p className="text-xs font-medium text-muted-foreground">Sources:</p>
                                      <div className="flex flex-wrap gap-2">
                                        {courtCase.documentLinks.map((link, index) => (
                                          <a
                                            key={index}
                                            href={link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                                            data-testid={`link-document-${courtCase.id}-${index}`}
                                          >
                                            {getPublicationName(link)}
                                            <ExternalLink className="h-3 w-3" />
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  <Summarizer 
                                    text={`Court Case: ${courtCase.title}. Charges: ${courtCase.charges}. Status: ${courtCase.status}. Court Level: ${courtCase.courtLevel}.${courtCase.outcome ? ` Outcome: ${courtCase.outcome}` : ''}`}
                                    title="Case Summary"
                                    className="mt-3"
                                  />
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* SPRM Investigations Section */}
            {(isLoadingSprmInvestigations || sprmInvestigations.length > 0) && (
              <Card className="md:col-span-2 border-red-200 dark:border-red-900 bg-red-50/20 dark:bg-red-950/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-900 dark:text-red-100">
                    <AlertTriangle className="h-5 w-5" />
                    SPRM Investigations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingSprmInvestigations ? (
                    <div className="space-y-3">
                      <div className="h-20 bg-muted animate-pulse rounded" />
                    </div>
                  ) : sprmInvestigations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No SPRM investigations on record for this MP.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Ongoing Investigations */}
                      {sprmInvestigations.filter(i => i.status === "Ongoing").length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm text-red-900 dark:text-red-100 uppercase tracking-wide mb-3">
                            Ongoing Investigations ({sprmInvestigations.filter(i => i.status === "Ongoing").length})
                          </h4>
                          <div className="space-y-3">
                            {sprmInvestigations
                              .filter(i => i.status === "Ongoing")
                              .map((investigation) => (
                                <div
                                  key={investigation.id}
                                  className="border border-red-200 dark:border-red-900 rounded-lg p-4 bg-white dark:bg-background"
                                  data-testid={`sprm-investigation-${investigation.id}`}
                                >
                                  <div className="flex items-start justify-between gap-4 mb-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="destructive" data-testid={`badge-status-${investigation.id}`}>
                                          {investigation.status}
                                        </Badge>
                                        {investigation.caseNumber && (
                                          <Badge variant="outline" data-testid={`badge-case-number-${investigation.id}`}>
                                            {investigation.caseNumber}
                                          </Badge>
                                        )}
                                      </div>
                                      <h5 className="font-semibold mb-1" data-testid={`text-investigation-title-${investigation.id}`}>
                                        {investigation.title}
                                      </h5>
                                    </div>
                                  </div>
                                  <p className="text-sm mb-2" data-testid={`text-investigation-charges-${investigation.id}`}>
                                    <span className="font-medium">Allegations: </span>
                                    {investigation.charges}
                                  </p>
                                  <div className="text-xs text-muted-foreground mb-2">
                                    <span data-testid={`text-start-date-${investigation.id}`}>
                                      Started: {format(new Date(investigation.startDate), "MMM d, yyyy")}
                                    </span>
                                  </div>
                                  {investigation.documentLinks && investigation.documentLinks.length > 0 && (
                                    <div className="space-y-1 mb-3">
                                      <p className="text-xs font-medium text-muted-foreground">Sources:</p>
                                      <div className="flex flex-wrap gap-2">
                                        {investigation.documentLinks.map((link, index) => (
                                          <a
                                            key={index}
                                            href={link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                                            data-testid={`link-sprm-document-${investigation.id}-${index}`}
                                          >
                                            {getPublicationName(link)}
                                            <ExternalLink className="h-3 w-3" />
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  <Summarizer 
                                    text={`SPRM Investigation: ${investigation.title}. Allegations: ${investigation.charges}. Status: ${investigation.status}.${investigation.outcome ? ` Outcome: ${investigation.outcome}` : ''}`}
                                    title="Investigation Summary"
                                    className="mt-3"
                                  />
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Completed Investigations */}
                      {sprmInvestigations.filter(i => i.status === "Completed").length > 0 && (
                        <div>
                          {sprmInvestigations.filter(i => i.status === "Ongoing").length > 0 && <Separator className="my-4" />}
                          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                            Completed Investigations ({sprmInvestigations.filter(i => i.status === "Completed").length})
                          </h4>
                          <div className="space-y-3">
                            {sprmInvestigations
                              .filter(i => i.status === "Completed")
                              .map((investigation) => (
                                <div
                                  key={investigation.id}
                                  className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                                  data-testid={`sprm-investigation-${investigation.id}`}
                                >
                                  <div className="flex items-start justify-between gap-4 mb-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="secondary" data-testid={`badge-status-${investigation.id}`}>
                                          {investigation.status}
                                        </Badge>
                                        {investigation.caseNumber && (
                                          <Badge variant="outline" data-testid={`badge-case-number-${investigation.id}`}>
                                            {investigation.caseNumber}
                                          </Badge>
                                        )}
                                      </div>
                                      <h5 className="font-semibold mb-1" data-testid={`text-investigation-title-${investigation.id}`}>
                                        {investigation.title}
                                      </h5>
                                    </div>
                                  </div>
                                  <p className="text-sm mb-2" data-testid={`text-investigation-charges-${investigation.id}`}>
                                    <span className="font-medium">Allegations: </span>
                                    {investigation.charges}
                                  </p>
                                  {investigation.outcome && (
                                    <p className="text-sm mb-2 font-medium text-green-600 dark:text-green-400" data-testid={`text-outcome-${investigation.id}`}>
                                      Outcome: {investigation.outcome}
                                    </p>
                                  )}
                                  <div className="text-xs text-muted-foreground mb-2">
                                    <div className="flex items-center justify-between">
                                      <span data-testid={`text-start-date-${investigation.id}`}>
                                        Started: {format(new Date(investigation.startDate), "MMM d, yyyy")}
                                      </span>
                                      {investigation.endDate && (
                                        <span data-testid={`text-end-date-${investigation.id}`}>
                                          Completed: {format(new Date(investigation.endDate), "MMM d, yyyy")}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {investigation.documentLinks && investigation.documentLinks.length > 0 && (
                                    <div className="space-y-1 mb-3">
                                      <p className="text-xs font-medium text-muted-foreground">Sources:</p>
                                      <div className="flex flex-wrap gap-2">
                                        {investigation.documentLinks.map((link, index) => (
                                          <a
                                            key={index}
                                            href={link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                                            data-testid={`link-sprm-document-${investigation.id}-${index}`}
                                          >
                                            {getPublicationName(link)}
                                            <ExternalLink className="h-3 w-3" />
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  <Summarizer 
                                    text={`SPRM Investigation: ${investigation.title}. Allegations: ${investigation.charges}. Status: ${investigation.status}.${investigation.outcome ? ` Outcome: ${investigation.outcome}` : ''}`}
                                    title="Investigation Summary"
                                    className="mt-3"
                                  />
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Parliamentary Activity Section */}
            {(isLoadingProposals || isLoadingDebates || isLoadingQuestions || 
              legislativeProposals.length > 0 || debateParticipations.length > 0 || parliamentaryQuestions.length > 0) && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Parliamentary Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingProposals && isLoadingDebates && isLoadingQuestions ? (
                    <div className="space-y-3">
                      <div className="h-20 bg-muted animate-pulse rounded" />
                    </div>
                  ) : (
                    <Tabs value={activityTab} onValueChange={setActivityTab}>
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="bills" data-testid="tab-activity-bills">
                          <ScrollText className="w-4 h-4 mr-2" />
                          Bills ({legislativeProposals.filter(p => p.type?.toLowerCase() === 'bill').length})
                        </TabsTrigger>
                        <TabsTrigger value="motions" data-testid="tab-activity-motions">
                          <Gavel className="w-4 h-4 mr-2" />
                          Motions ({legislativeProposals.filter(p => p.type?.toLowerCase() === 'motion').length})
                        </TabsTrigger>
                        <TabsTrigger value="debates" data-testid="tab-activity-debates">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Debates ({debateParticipations.length})
                        </TabsTrigger>
                        <TabsTrigger value="questions" data-testid="tab-activity-questions">
                          <HelpCircle className="w-4 h-4 mr-2" />
                          Questions ({parliamentaryQuestions.length})
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="bills" className="mt-4 space-y-3">
                        {legislativeProposals.filter(p => p.type?.toLowerCase() === 'bill').length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <ScrollText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No bills on record for this MP.</p>
                          </div>
                        ) : (
                          legislativeProposals
                            .filter(p => p.type?.toLowerCase() === 'bill')
                            .map((bill) => (
                              <div
                                key={bill.id}
                                data-testid={`activity-bill-${bill.id}`}
                                className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-4 mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge 
                                        variant={
                                          bill.status?.toLowerCase() === 'approved' || bill.status?.toLowerCase() === 'passed' ? 'default' : 
                                          bill.status?.toLowerCase() === 'rejected' ? 'destructive' : 
                                          'outline'
                                        }
                                        data-testid={`badge-bill-status-${bill.id}`}
                                      >
                                        {bill.status}
                                      </Badge>
                                      {bill.billNumber && (
                                        <Badge variant="secondary" data-testid={`badge-bill-number-${bill.id}`}>
                                          {bill.billNumber}
                                        </Badge>
                                      )}
                                    </div>
                                    <h5 className="font-semibold mb-1" data-testid={`text-bill-title-${bill.id}`}>
                                      {bill.title}
                                    </h5>
                                    <p className="text-sm text-muted-foreground mb-2">
                                      {bill.description}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-xs text-muted-foreground mb-2">
                                  <span>Proposed: {format(new Date(bill.dateProposed), "MMM d, yyyy")}</span>
                                </div>
                                {bill.outcome && (
                                  <p className="text-sm mb-2">
                                    <span className="font-medium">Outcome: </span>
                                    {bill.outcome}
                                  </p>
                                )}
                                {bill.hansardReference && (
                                  <p className="text-xs text-muted-foreground">
                                    <span className="font-medium">Hansard: </span>
                                    {bill.hansardReference}
                                  </p>
                                )}
                              </div>
                            ))
                        )}
                      </TabsContent>

                      <TabsContent value="motions" className="mt-4 space-y-3">
                        {legislativeProposals.filter(p => p.type?.toLowerCase() === 'motion').length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Gavel className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No motions on record for this MP.</p>
                          </div>
                        ) : (
                          legislativeProposals
                            .filter(p => p.type?.toLowerCase() === 'motion')
                            .map((motion) => (
                              <div
                                key={motion.id}
                                data-testid={`activity-motion-${motion.id}`}
                                className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-4 mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge 
                                        variant={
                                          motion.status?.toLowerCase() === 'approved' || motion.status?.toLowerCase() === 'passed' ? 'default' : 
                                          motion.status?.toLowerCase() === 'rejected' ? 'destructive' : 
                                          'outline'
                                        }
                                        data-testid={`badge-motion-status-${motion.id}`}
                                      >
                                        {motion.status}
                                      </Badge>
                                    </div>
                                    <h5 className="font-semibold mb-1" data-testid={`text-motion-title-${motion.id}`}>
                                      {motion.title}
                                    </h5>
                                    <p className="text-sm text-muted-foreground mb-2">
                                      {motion.description}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-xs text-muted-foreground mb-2">
                                  <span>Proposed: {format(new Date(motion.dateProposed), "MMM d, yyyy")}</span>
                                </div>
                                {motion.outcome && (
                                  <p className="text-sm mb-2">
                                    <span className="font-medium">Outcome: </span>
                                    {motion.outcome}
                                  </p>
                                )}
                                {motion.hansardReference && (
                                  <p className="text-xs text-muted-foreground">
                                    <span className="font-medium">Hansard: </span>
                                    {motion.hansardReference}
                                  </p>
                                )}
                              </div>
                            ))
                        )}
                      </TabsContent>

                      <TabsContent value="debates" className="mt-4 space-y-3">
                        {debateParticipations.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No debate participations on record for this MP.</p>
                          </div>
                        ) : (
                          debateParticipations.map((debate) => (
                            <div
                              key={debate.id}
                              data-testid={`activity-debate-${debate.id}`}
                              className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                            >
                              <h5 className="font-semibold mb-1">{debate.topic}</h5>
                              <div className="text-xs text-muted-foreground mb-2">
                                <span>{format(new Date(debate.date), "MMM d, yyyy")}</span>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {debate.contribution}
                              </p>
                              {debate.position && (
                                <Badge variant="outline" className="mb-2">{debate.position}</Badge>
                              )}
                              {debate.hansardReference && (
                                <p className="text-xs text-muted-foreground">
                                  <span className="font-medium">Hansard: </span>
                                  {debate.hansardReference}
                                </p>
                              )}
                            </div>
                          ))
                        )}
                      </TabsContent>

                      <TabsContent value="questions" className="mt-4 space-y-4">
                        {parliamentaryQuestions.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No parliamentary questions on record for this MP.</p>
                          </div>
                        ) : (
                          <>
                            {/* Ministry Breakdown */}
                            <div className="bg-muted/30 rounded-lg p-4">
                              <h4 className="font-semibold text-sm mb-3">Questions by Ministry</h4>
                              <div className="flex flex-wrap gap-2">
                                {Array.from(new Set(parliamentaryQuestions.map(q => q.ministry)))
                                  .sort()
                                  .map(ministry => (
                                    <Badge 
                                      key={ministry} 
                                      variant="secondary"
                                      data-testid={`badge-ministry-${ministry.toLowerCase().replace(/\s+/g, '-')}`}
                                    >
                                      {ministry} ({parliamentaryQuestions.filter(q => q.ministry === ministry).length})
                                    </Badge>
                                  ))}
                              </div>
                            </div>

                            {/* Questions List */}
                            <div className="space-y-3">
                              {parliamentaryQuestions
                                .sort((a, b) => new Date(b.dateAsked).getTime() - new Date(a.dateAsked).getTime())
                                .map((question) => (
                                  <div
                                    key={question.id}
                                    data-testid={`activity-question-${question.id}`}
                                    className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                                  >
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                      {question.questionType && (
                                        <Badge 
                                          variant={
                                            question.questionType?.toLowerCase() === 'oral' ? 'default' : 
                                            question.questionType?.toLowerCase() === 'written' ? 'outline' : 
                                            'secondary'
                                          }
                                          className={
                                            question.questionType?.toLowerCase() === 'oral' ? 'bg-blue-600 text-white dark:bg-blue-500' : 
                                            question.questionType?.toLowerCase() === 'minister' ? 'bg-purple-600 text-white dark:bg-purple-500' : 
                                            ''
                                          }
                                          data-testid={`badge-question-type-${question.id}`}
                                        >
                                          {question.questionType.charAt(0).toUpperCase() + question.questionType.slice(1)}
                                        </Badge>
                                      )}
                                      <Badge 
                                        variant={question.answerStatus === 'Answered' ? 'default' : 'outline'}
                                        data-testid={`badge-answer-status-${question.id}`}
                                      >
                                        {question.answerStatus}
                                      </Badge>
                                      <Badge variant="secondary" data-testid={`badge-ministry-${question.id}`}>
                                        {question.ministry}
                                      </Badge>
                                      {question.questionNumber && (
                                        <Badge variant="outline" className="font-mono" data-testid={`badge-question-number-${question.id}`}>
                                          #{question.questionNumber}
                                        </Badge>
                                      )}
                                    </div>
                                    <h5 className="font-semibold mb-1" data-testid={`text-question-topic-${question.id}`}>
                                      {question.topic}
                                    </h5>
                                    <div className="text-xs text-muted-foreground mb-2">
                                      <span>Asked: {format(new Date(question.dateAsked), "MMM d, yyyy")}</span>
                                    </div>
                                    <p className="text-sm mb-2">
                                      <span className="font-medium">Question: </span>
                                      {question.questionText}
                                    </p>
                                    {question.answerText && (
                                      <div className="bg-muted p-3 rounded-md mb-2">
                                        <p className="text-sm">
                                          <span className="font-medium">Answer: </span>
                                          {question.answerText}
                                        </p>
                                      </div>
                                    )}
                                    {question.hansardReference && (
                                      <p className="text-xs text-muted-foreground">
                                        <span className="font-medium">Hansard: </span>
                                        {question.hansardReference}
                                      </p>
                                    )}
                                  </div>
                                ))}
                            </div>
                          </>
                        )}
                      </TabsContent>
                    </Tabs>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 15th Parliament Hansard Participation Section */}
            <div className="md:col-span-2">
              <HansardParticipation15th mpId={mp.id} mpName={mp.name} />
            </div>

            {/* Hansard Speaking Record Section */}
            <HansardSpeakingRecord mpId={mp.id} />

            {/* Sources & References Section */}
            {(() => {
              const allSources = new Set<string>();
              courtCases.forEach(c => {
                c.documentLinks?.forEach(link => allSources.add(link));
              });
              sprmInvestigations.forEach(i => {
                i.documentLinks?.forEach(link => allSources.add(link));
              });
              const sourcesList = Array.from(allSources);
              
              return sourcesList.length > 0 ? (
                <Card className="md:col-span-2" data-testid="sources-references-section">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Sources & References
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      All information on this page is sourced from the following publications and news outlets:
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {sourcesList.map((link, index) => (
                        <a
                          key={index}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors group"
                          data-testid={`source-link-${index}`}
                        >
                          <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm group-hover:text-primary truncate">
                              {getPublicationName(link)}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {new URL(link).hostname}
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
