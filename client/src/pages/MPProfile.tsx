import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, MapPin, UserCircle, Flag, FileText, Wallet, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import type { Mp } from "@shared/schema";
import { calculateTotalSalary, calculateYearlyBreakdown, formatCurrency } from "@/lib/utils";
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
  const totalSalary = calculateTotalSalary(mp.swornInDate, monthlySalary);
  const formattedSwornInDate = format(new Date(mp.swornInDate), "MMMM d, yyyy");
  const yearlyBreakdown = calculateYearlyBreakdown(mp.swornInDate, monthlySalary);
  
  const attendanceRate = mp.totalParliamentDays > 0 
    ? (mp.daysAttended / mp.totalParliamentDays) * 100 
    : 0;
  const attendanceColor = getAttendanceColor(attendanceRate);
  const attendanceLabel = getAttendanceLabel(attendanceRate);

  return (
    <div className="min-h-screen bg-background">
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
                            {formatCurrency(mp.parliamentSittingAllowance)}/day × {mp.daysAttended} days
                          </p>
                        </td>
                        <td className="text-center py-3 px-4 text-sm text-muted-foreground">Per Session</td>
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
          </div>
        </div>
      </div>
    </div>
  );
}
