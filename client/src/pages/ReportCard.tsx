/**
 * Copyright by Calmic Sdn Bhd
 *
 * MP Report Card Page
 * Displays performance grades for all MPs with filtering and sorting
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  TrendingUp,
  TrendingDown,
  Award,
  Users,
  BarChart3,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Calendar,
  MessageSquare,
  Shield,
  MapPin,
  Brain,
  CheckSquare,
  Square
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageMeta } from "@/components/PageMeta";
import { GrokCompareDialog } from "@/components/GrokCompareDialog";

interface Mp {
  id: string;
  name: string;
  party: string;
  constituency: string;
  state: string;
  gender: string;
  title?: string;
  role?: string;
}

interface MpReportCard {
  id: string;
  mpId: string;
  attendanceScore: number;
  attendancePercentage: number; // Raw attendance %
  participationScore: number;
  conductScore: number;
  constituencyImpactScore: number;
  overallScore: number;
  grade: string;
  totalSpeeches: number;
  averageSpeeches: number;
  billsRaised: number;
  questionsAsked: number;
  inappropriateLanguageCount: number;
  povertyRate: number;
  calculatedAt: string;
  updatedAt: string;
  mp: Mp;
}

interface AggregateStats {
  totalMPs: number;
  averageGrade: number;
  gradeDistribution: { A: number; B: number; C: number; D: number; F: number };
  averageScores: {
    attendance: number;
    participation: number;
    conduct: number;
    constituencyImpact: number;
    overall: number;
  };
}

type SortField = 'name' | 'grade' | 'overallScore' | 'attendance' | 'participation' | 'party' | 'constituency';
type SortOrder = 'asc' | 'desc';

function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A': return 'bg-green-500';
    case 'B': return 'bg-blue-500';
    case 'C': return 'bg-yellow-500';
    case 'D': return 'bg-orange-500';
    case 'F': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600';
  if (score >= 80) return 'text-blue-600';
  if (score >= 70) return 'text-yellow-600';
  if (score >= 60) return 'text-orange-600';
  return 'text-red-600';
}

export default function ReportCard() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [coalitionFilter, setCoalitionFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>('overallScore');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedMPs, setSelectedMPs] = useState<string[]>([]);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);

  // Fetch report cards
  const { data: reportCards = [], isLoading: cardsLoading } = useQuery<MpReportCard[]>({
    queryKey: ["/api/report-cards"],
  });

  // Fetch aggregate stats
  const { data: stats, isLoading: statsLoading } = useQuery<AggregateStats>({
    queryKey: ["/api/report-cards/stats"],
  });

  // Fetch visitor count for this page
  const { data: visitorData } = useQuery<{ path: string; views: number }>({
    queryKey: ["/api/analytics/page-views?path=/report-card"],
  });

  // Get unique states and coalitions for filters
  const uniqueStates = useMemo(() => {
    const states = new Set(reportCards.map(card => card.mp.state));
    return Array.from(states).sort();
  }, [reportCards]);

  const governmentParties = ['UMNO', 'PKR', 'DAP', 'PH', 'BN', 'GPS', 'GRS', 'WARISAN'];

  // Filter and sort report cards
  const filteredAndSortedCards = useMemo(() => {
    let filtered = reportCards.filter(card => {
      // Search filter
      const searchMatch = searchQuery === "" ||
        card.mp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.mp.party.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.mp.constituency.toLowerCase().includes(searchQuery.toLowerCase());

      // Grade filter
      const gradeMatch = gradeFilter === "all" || card.grade === gradeFilter;

      // State filter
      const stateMatch = stateFilter === "all" || card.mp.state === stateFilter;

      // Coalition filter
      const isGovernment = governmentParties.some(p => card.mp.party.toUpperCase().includes(p));
      const coalitionMatch = coalitionFilter === "all" ||
        (coalitionFilter === "government" && isGovernment) ||
        (coalitionFilter === "opposition" && !isGovernment);

      return searchMatch && gradeMatch && stateMatch && coalitionMatch;
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortField) {
        case 'name':
          aVal = a.mp.name;
          bVal = b.mp.name;
          break;
        case 'grade':
          aVal = a.grade;
          bVal = b.grade;
          break;
        case 'overallScore':
          aVal = a.overallScore;
          bVal = b.overallScore;
          break;
        case 'attendance':
          aVal = a.attendancePercentage;
          bVal = b.attendancePercentage;
          break;
        case 'participation':
          aVal = a.participationScore;
          bVal = b.participationScore;
          break;
        case 'party':
          aVal = a.mp.party;
          bVal = b.mp.party;
          break;
        case 'constituency':
          aVal = a.mp.constituency;
          bVal = b.mp.constituency;
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
    });

    return filtered;
  }, [reportCards, searchQuery, gradeFilter, stateFilter, coalitionFilter, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleMPSelection = (mpId: string, checked: boolean) => {
    if (checked) {
      if (selectedMPs.length < 2) {
        setSelectedMPs([...selectedMPs, mpId]);
      }
    } else {
      setSelectedMPs(selectedMPs.filter(id => id !== mpId));
    }
  };

  const handleCompareClick = () => {
    if (selectedMPs.length === 2) {
      setCompareDialogOpen(true);
    }
  };

  const selectedMPsData = useMemo(() => {
    return reportCards.filter(card => selectedMPs.includes(card.mpId));
  }, [reportCards, selectedMPs]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4 inline" />;
    return sortOrder === 'asc'
      ? <ArrowUp className="ml-2 h-4 w-4 inline" />
      : <ArrowDown className="ml-2 h-4 w-4 inline" />;
  };

  const top10 = useMemo(() => {
    return [...reportCards]
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 10);
  }, [reportCards]);

  const bottom10 = useMemo(() => {
    return [...reportCards]
      .sort((a, b) => a.overallScore - b.overallScore)
      .slice(0, 10);
  }, [reportCards]);

  return (
    <>
      <PageMeta
        title="MP Report Card - Performance Grades"
        description="View performance grades and evaluations for all 221 Malaysian Members of Parliament based on attendance, participation, conduct, and constituency impact."
      />
      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1 container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">MP Report Card</h1>
            <p className="text-muted-foreground">
              Performance evaluation and grading for all Members of Parliament
            </p>
            {visitorData && (
              <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                <Eye className="h-4 w-4" />
                <span>{visitorData.views.toLocaleString()} visitors to this page</span>
              </div>
            )}
          </div>

          {/* Aggregate Statistics */}
          {statsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Total MPs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalMPs}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Evaluated members
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Average Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.averageGrade}/100</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Overall performance
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Top Performers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.gradeDistribution.A}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Grade A MPs
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Grade Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-1 items-end h-12">
                    {Object.entries(stats.gradeDistribution).map(([grade, count]) => (
                      <div key={grade} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className={`w-full ${getGradeColor(grade)} rounded-t`}
                          style={{ height: `${(count / stats.totalMPs) * 100}%`, minHeight: '4px' }}
                        />
                        <span className="text-xs font-medium">{grade}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Scoring Legend */}
          <Card className="mb-8 bg-muted/30">
            <CardHeader>
              <CardTitle>Scoring Methodology</CardTitle>
              <CardDescription>How we calculate overall performance scores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex gap-3 items-start">
                  <Calendar className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Attendance</p>
                    <p className="text-xs text-muted-foreground mt-0.5">40% of overall score</p>
                    <p className="text-xs text-muted-foreground">Parliament session attendance percentage</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <MessageSquare className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Participation</p>
                    <p className="text-xs text-muted-foreground mt-0.5">30% of overall score</p>
                    <p className="text-xs text-muted-foreground">Speeches, bills raised, and questions asked</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <Shield className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Conduct</p>
                    <p className="text-xs text-muted-foreground mt-0.5">20% of overall score</p>
                    <p className="text-xs text-muted-foreground">Inappropriate language incidents and court cases</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <MapPin className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Constituency Impact</p>
                    <p className="text-xs text-muted-foreground mt-0.5">10% of overall score</p>
                    <p className="text-xs text-muted-foreground">Poverty rate in constituency</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-semibold mb-2">Grade Scale</p>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-500">A</Badge>
                    <span className="text-xs">90-100</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-500">B</Badge>
                    <span className="text-xs">80-89</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-yellow-500">C</Badge>
                    <span className="text-xs">70-79</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-orange-500">D</Badge>
                    <span className="text-xs">60-69</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-500">F</Badge>
                    <span className="text-xs">Below 60</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top and Bottom Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Top 10 Performers
                </CardTitle>
                <CardDescription>Highest overall scores</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b">
                      <TableHead className="w-12 text-center font-semibold text-foreground">Rank</TableHead>
                      <TableHead className="font-semibold text-foreground">Name</TableHead>
                      <TableHead className="hidden sm:table-cell font-semibold text-foreground">Constituency</TableHead>
                      <TableHead className="text-right font-semibold text-foreground w-16">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help underline decoration-dotted">Score</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Overall performance score (0-100) based on:</p>
                            <p className="text-xs mt-1">• Attendance (40%)</p>
                            <p className="text-xs">• Participation (30%)</p>
                            <p className="text-xs">• Conduct (20%)</p>
                            <p className="text-xs">• Constituency Impact (10%)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {top10.map((card, index) => (
                      <TableRow
                        key={card.id}
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => navigate(`/mp/${card.mpId}`)}
                        data-testid={`row-top-performer-${index}`}
                      >
                        <TableCell className="text-center font-bold text-green-600">#{index + 1}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-foreground">{card.mp.name}</span>
                            <span className="text-xs text-muted-foreground sm:hidden">{card.mp.constituency}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{card.mp.constituency}</TableCell>
                        <TableCell className="text-right">
                          <Badge className={`${getGradeColor(card.grade)} font-bold`}>{card.grade}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  Bottom 10 Performers
                </CardTitle>
                <CardDescription>Lowest overall scores</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b">
                      <TableHead className="w-12 text-center font-semibold text-foreground">Rank</TableHead>
                      <TableHead className="font-semibold text-foreground">Name</TableHead>
                      <TableHead className="hidden sm:table-cell font-semibold text-foreground">Constituency</TableHead>
                      <TableHead className="text-right font-semibold text-foreground w-16">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help underline decoration-dotted">Score</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Overall performance score (0-100) based on:</p>
                            <p className="text-xs mt-1">• Attendance (40%)</p>
                            <p className="text-xs">• Participation (30%)</p>
                            <p className="text-xs">• Conduct (20%)</p>
                            <p className="text-xs">• Constituency Impact (10%)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bottom10.map((card, index) => (
                      <TableRow
                        key={card.id}
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => navigate(`/mp/${card.mpId}`)}
                        data-testid={`row-bottom-performer-${index}`}
                      >
                        <TableCell className="text-center font-bold text-red-600">#{reportCards.length - index}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-foreground">{card.mp.name}</span>
                            <span className="text-xs text-muted-foreground sm:hidden">{card.mp.constituency}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{card.mp.constituency}</TableCell>
                        <TableCell className="text-right">
                          <Badge className={`${getGradeColor(card.grade)} font-bold`}>{card.grade}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filter & Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, party, or constituency..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Select value={gradeFilter} onValueChange={setGradeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Grades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    <SelectItem value="A">Grade A</SelectItem>
                    <SelectItem value="B">Grade B</SelectItem>
                    <SelectItem value="C">Grade C</SelectItem>
                    <SelectItem value="D">Grade D</SelectItem>
                    <SelectItem value="F">Grade F</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {uniqueStates.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={coalitionFilter} onValueChange={setCoalitionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Coalitions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Coalitions</SelectItem>
                    <SelectItem value="government">Government</SelectItem>
                    <SelectItem value="opposition">Opposition</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(searchQuery || gradeFilter !== "all" || stateFilter !== "all" || coalitionFilter !== "all") && (
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Showing {filteredAndSortedCards.length} of {reportCards.length} MPs
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setGradeFilter("all");
                      setStateFilter("all");
                      setCoalitionFilter("all");
                    }}
                  >
                    Clear filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Report Card Table */}
          <Card>
            <CardHeader>
              <CardTitle>All MPs Report Cards</CardTitle>
              <CardDescription>
                Click on any MP to view their detailed profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cardsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help underline decoration-dotted">Select</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Select 2 MPs to compare with Grok AI</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                          Name <SortIcon field="name" />
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('party')}>
                          Party <SortIcon field="party" />
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('constituency')}>
                          Constituency <SortIcon field="constituency" />
                        </TableHead>
                        <TableHead className="cursor-pointer text-center" onClick={() => handleSort('grade')}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help underline decoration-dotted">Grade <SortIcon field="grade" /></span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Overall letter grade from performance score:</p>
                              <p className="text-xs mt-1">A: 90-100 | B: 80-89 | C: 70-79</p>
                              <p className="text-xs">D: 60-69 | F: Below 60</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                        <TableHead className="cursor-pointer text-center" onClick={() => handleSort('overallScore')}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help underline decoration-dotted">Score <SortIcon field="overallScore" /></span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Overall performance score (0-100) based on:</p>
                              <p className="text-xs mt-1">• Attendance (25%)</p>
                              <p className="text-xs">• Participation (25%)</p>
                              <p className="text-xs">• Conduct (25%)</p>
                              <p className="text-xs">• Constituency Impact (25%)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                        <TableHead className="cursor-pointer text-center" onClick={() => handleSort('attendance')}>
                          Attendance <SortIcon field="attendance" />
                        </TableHead>
                        <TableHead className="cursor-pointer text-center" onClick={() => handleSort('participation')}>
                          Participation <SortIcon field="participation" />
                        </TableHead>
                        <TableHead className="text-center">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedCards.map((card) => (
                        <TableRow
                          key={card.id}
                          className="hover:bg-accent"
                        >
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleMPSelection(card.mpId, !selectedMPs.includes(card.mpId))}
                                disabled={selectedMPs.length >= 2 && !selectedMPs.includes(card.mpId)}
                              >
                                {selectedMPs.includes(card.mpId) ? (
                                  <CheckSquare className="h-5 w-5 text-primary" />
                                ) : (
                                  <Square className="h-5 w-5 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="cursor-pointer" onClick={() => navigate(`/mp/${card.mpId}`)}>
                            <div>
                              <div className="font-medium">{card.mp.name}</div>
                              {card.mp.title && (
                                <div className="text-xs text-muted-foreground">{card.mp.title}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="cursor-pointer" onClick={() => navigate(`/mp/${card.mpId}`)}>{card.mp.party}</TableCell>
                          <TableCell className="cursor-pointer" onClick={() => navigate(`/mp/${card.mpId}`)}>
                            <div>
                              <div>{card.mp.constituency}</div>
                              <div className="text-xs text-muted-foreground">{card.mp.state}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center cursor-pointer" onClick={() => navigate(`/mp/${card.mpId}`)}>
                            <Badge className={getGradeColor(card.grade)}>{card.grade}</Badge>
                          </TableCell>
                          <TableCell className="text-center cursor-pointer" onClick={() => navigate(`/mp/${card.mpId}`)}>
                            <span className={`font-bold ${getScoreColor(card.overallScore)}`}>
                              {card.overallScore}
                            </span>
                          </TableCell>
                          <TableCell className="text-center cursor-pointer" onClick={() => navigate(`/mp/${card.mpId}`)}>
                            <div className="flex items-center gap-2">
                              <Progress value={card.attendancePercentage} className="w-16 h-2" />
                              <span className="text-xs w-8">{card.attendancePercentage}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center cursor-pointer" onClick={() => navigate(`/mp/${card.mpId}`)}>
                            <div className="flex items-center gap-2">
                              <Progress value={card.participationScore} className="w-16 h-2" />
                              <span className="text-xs w-8">{card.participationScore}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/mp/${card.mpId}`)}>
                              View Profile
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {!cardsLoading && filteredAndSortedCards.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No MPs found matching your filters
                </div>
              )}
            </CardContent>
          </Card>

          {/* Grading Methodology */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Grading Methodology</CardTitle>
              <CardDescription>How MP grades are calculated</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Overall Score Calculation (0-100)</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    The overall score is calculated using weighted averages of four key metrics:
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="font-medium min-w-[140px]">Attendance (40%):</span>
                      <span className="text-muted-foreground">Parliament session attendance percentage</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-medium min-w-[140px]">Participation (30%):</span>
                      <span className="text-muted-foreground">Speeches, bills raised, and questions asked</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-medium min-w-[140px]">Conduct (20%):</span>
                      <span className="text-muted-foreground">Inappropriate language incidents and court cases</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-medium min-w-[140px]">Constituency Impact (10%):</span>
                      <span className="text-muted-foreground">Poverty rate in constituency</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Letter Grades</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-green-500">A: 90-100</Badge>
                    <Badge className="bg-blue-500">B: 80-89</Badge>
                    <Badge className="bg-yellow-500">C: 70-79</Badge>
                    <Badge className="bg-orange-500">D: 60-69</Badge>
                    <Badge className="bg-red-500">F: Below 60</Badge>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground pt-2 border-t">
                  <p>
                    Report cards are automatically updated on the 1st of every month.
                    Last updated: {stats && reportCards[0]?.updatedAt ? new Date(reportCards[0].updatedAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Floating Compare Button */}
          {selectedMPs.length === 2 && (
            <div className="fixed bottom-8 right-8 z-50">
              <Button
                size="lg"
                onClick={handleCompareClick}
                className="shadow-lg gap-2"
                data-testid="button-compare-mps"
              >
                <Brain className="w-5 h-5" />
                Compare {selectedMPsData.length} MPs with Grok AI
              </Button>
            </div>
          )}

          {/* Grok Compare Dialog */}
          <GrokCompareDialog
            open={compareDialogOpen}
            onOpenChange={setCompareDialogOpen}
            mp1={selectedMPsData[0]}
            mp2={selectedMPsData[1]}
            onCompareComplete={() => {
              setSelectedMPs([]);
              setCompareDialogOpen(false);
            }}
          />
        </main>

        <Footer />
      </div>
    </>
  );
}
