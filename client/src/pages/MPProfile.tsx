import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, MapPin, UserCircle, Flag, FileText, Wallet, Calendar, Scale, ExternalLink, AlertTriangle, Info, MessageSquare, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Summarizer } from "@/components/Summarizer";
import type { Mp, CourtCase, SprmInvestigation, LegislativeProposal, DebateParticipation, ParliamentaryQuestion } from "@shared/schema";
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

  const [activityTab, setActivityTab] = useState("legislation");

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
  const monthlySalary = mp.mpAllowance + mp.ministerSalary;
  const yearlySalary = monthlySalary * 12;
  const totalSalary = calculateTotalSalary(mp.swornInDate, monthlySalary, mp.daysAttended, mp.parliamentSittingAllowance);
  const formattedSwornInDate = format(new Date(mp.swornInDate), "MMMM d, yyyy");
  const yearlyBreakdown = calculateYearlyBreakdown(mp.swornInDate, monthlySalary);
  
  const attendanceRate = mp.totalParliamentDays > 0 
    ? (mp.daysAttended / mp.totalParliamentDays) * 100 
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
                    {mp.daysAttended}/{mp.totalParliamentDays}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">days attended</p>
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
                  Source: Malaysian Parliament Records
                </p>
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
                      {mp.ministerSalary > 0 && (
                        <tr className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-3 px-4 font-medium">Minister Salary</td>
                          <td className="text-center py-3 px-4 text-sm text-muted-foreground">Monthly</td>
                          <td className="text-right py-3 px-4 font-semibold" data-testid="text-minister-salary">
                            {formatCurrency(mp.ministerSalary)}
                          </td>
                        </tr>
                      )}
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
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="legislation" data-testid="tab-activity-legislation">
                          <FileText className="w-4 h-4 mr-2" />
                          Legislation ({legislativeProposals.length})
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

                      <TabsContent value="legislation" className="mt-4 space-y-3">
                        {legislativeProposals.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No legislative proposals on record for this MP.</p>
                          </div>
                        ) : (
                          legislativeProposals.map((proposal) => (
                            <div
                              key={proposal.id}
                              data-testid={`activity-proposal-${proposal.id}`}
                              className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-4 mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline">{proposal.status}</Badge>
                                    <Badge variant="secondary">{proposal.type}</Badge>
                                  </div>
                                  <h5 className="font-semibold mb-1">{proposal.title}</h5>
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {proposal.description}
                                  </p>
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground mb-2">
                                <span>Proposed: {format(new Date(proposal.dateProposed), "MMM d, yyyy")}</span>
                              </div>
                              {proposal.outcome && (
                                <p className="text-sm mb-2">
                                  <span className="font-medium">Outcome: </span>
                                  {proposal.outcome}
                                </p>
                              )}
                              {proposal.hansardReference && (
                                <p className="text-xs text-muted-foreground">
                                  <span className="font-medium">Hansard: </span>
                                  {proposal.hansardReference}
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

                      <TabsContent value="questions" className="mt-4 space-y-3">
                        {parliamentaryQuestions.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No parliamentary questions on record for this MP.</p>
                          </div>
                        ) : (
                          parliamentaryQuestions.map((question) => (
                            <div
                              key={question.id}
                              data-testid={`activity-question-${question.id}`}
                              className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">{question.answerStatus}</Badge>
                                <Badge variant="secondary">{question.ministry}</Badge>
                              </div>
                              <h5 className="font-semibold mb-1">{question.topic}</h5>
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
                          ))
                        )}
                      </TabsContent>
                    </Tabs>
                  )}
                </CardContent>
              </Card>
            )}

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
