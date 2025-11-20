import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Calculator, 
  DollarSign, 
  TrendingUp, 
  Users, 
  AlertCircle,
  Search,
  ChevronRight,
  Calendar
} from "lucide-react";
import { Link } from "wouter";
import type { Mp } from "@shared/schema";
import { 
  calculateMpAllowances, 
  formatCurrency, 
  ALLOWANCE_RATES,
  calculatePeriodicAllowances 
} from "@/lib/allowanceCalculator";
import { apiRequest } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Allowances() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: mps = [], isLoading } = useQuery<Mp[]>({
    queryKey: ["/api/mps"],
  });

  useEffect(() => {
    apiRequest("POST", "/api/page-views", { page: "allowances" });
  }, []);

  const filteredMps = useMemo(() => {
    let filtered = mps;

    if (searchQuery) {
      filtered = filtered.filter((mp) =>
        mp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mp.constituency.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mp.party.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered.sort((a, b) => {
      const aAllowance = calculateMpAllowances(a);
      const bAllowance = calculateMpAllowances(b);
      return bAllowance.totalMonthly - aAllowance.totalMonthly;
    });
  }, [mps, searchQuery]);

  const totalAllowanceStats = useMemo(() => {
    const totalMonthlyAllowances = mps.reduce(
      (sum, mp) => sum + calculateMpAllowances(mp).totalMonthly,
      0
    );

    const avgMpMonthly = mps.length > 0
      ? totalMonthlyAllowances / mps.length
      : 0;

    const totalCumulativeAttendance = mps.reduce(
      (sum, mp) => sum + calculateMpAllowances(mp).totalCumulativeAttendance,
      0
    );

    const avgCumulativeAttendance = mps.length > 0
      ? totalCumulativeAttendance / mps.length
      : 0;

    return {
      avgMpMonthly,
      totalMonthlyAllowances,
      totalCumulativeAttendance,
      avgCumulativeAttendance,
    };
  }, [mps]);

  const periodicAllowances = calculatePeriodicAllowances();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">Loading allowance data...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Calculator className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold" data-testid="text-page-title">
              MP Allowances Calculator
            </h1>
          </div>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Comprehensive breakdown of allowances for Members of Parliament based on official rates
          </p>
        </div>

        <div className="space-y-6 mb-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Monthly Recurring Allowances</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card data-testid="card-stat-total-monthly">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Monthly (Recurring)</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-monthly">
                    {formatCurrency(totalAllowanceStats.totalMonthlyAllowances)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    For all {mps.length} MPs
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-stat-mp-avg">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. MP (Monthly)</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-mp-avg">
                    {formatCurrency(totalAllowanceStats.avgMpMonthly)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Average for all {mps.length} MPs
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-stat-annual-total">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Est. Annual (Recurring)</CardTitle>
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-annual-total">
                    {formatCurrency(totalAllowanceStats.totalMonthlyAllowances * 12)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Projected yearly expenditure
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Cumulative Attendance Allowances (Since Sworn In)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card data-testid="card-stat-total-cumulative">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Cumulative Attendance</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-cumulative">
                    {formatCurrency(totalAllowanceStats.totalCumulativeAttendance)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Lifetime attendance for all {mps.length} MPs
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-stat-avg-cumulative">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Cumulative per MP</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-avg-cumulative">
                    {formatCurrency(totalAllowanceStats.avgCumulativeAttendance)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Average lifetime attendance allowance
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2" data-testid="card-monthly-allowances">
            <CardHeader>
              <CardTitle>Monthly Allowance Breakdown</CardTitle>
              <CardDescription>Standard rates for all MPs (Dewan Rakyat)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Allowance Type</TableHead>
                    <TableHead className="text-right">Amount (RM)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Base Salary (Dewan Rakyat)</TableCell>
                    <TableCell className="text-right">{formatCurrency(ALLOWANCE_RATES.DEWAN_RAKYAT_SALARY)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Entertainment Allowance</TableCell>
                    <TableCell className="text-right">{formatCurrency(ALLOWANCE_RATES.ENTERTAINMENT)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Special Payment (Non-Admin MP)</TableCell>
                    <TableCell className="text-right">{formatCurrency(ALLOWANCE_RATES.SPECIAL_NON_ADMIN_MP)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Fixed Travel Allowance</TableCell>
                    <TableCell className="text-right">{formatCurrency(ALLOWANCE_RATES.FIXED_TRAVEL)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Fuel Allowance</TableCell>
                    <TableCell className="text-right">{formatCurrency(ALLOWANCE_RATES.FUEL)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Toll Allowance</TableCell>
                    <TableCell className="text-right">{formatCurrency(ALLOWANCE_RATES.TOLL)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Driver Allowance</TableCell>
                    <TableCell className="text-right">{formatCurrency(ALLOWANCE_RATES.DRIVER)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Phone Bill Allowance</TableCell>
                    <TableCell className="text-right">{formatCurrency(ALLOWANCE_RATES.PHONE_BILL)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card data-testid="card-daily-allowances">
              <CardHeader>
                <CardTitle>Attendance Allowances</CardTitle>
                <CardDescription>Cumulative from sworn-in date</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Parliamentary Sitting</span>
                  <span className="font-semibold">{formatCurrency(ALLOWANCE_RATES.PARLIAMENT_SITTING_PER_DAY)}/day</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Government Meetings</span>
                  <span className="font-semibold">{formatCurrency(ALLOWANCE_RATES.GOVERNMENT_MEETING_PER_DAY)}/day</span>
                </div>
                <p className="text-xs text-muted-foreground pt-2">
                  Total calculated from days attended since sworn in
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-periodic-allowances">
              <CardHeader>
                <CardTitle>Periodic Allowances</CardTitle>
                <CardDescription>One-time or scheduled</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Handphone Purchase</span>
                    <span className="font-semibold">{formatCurrency(periodicAllowances.handphonePurchase)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Every 2 years</p>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Computer Purchase</span>
                    <span className="font-semibold">{formatCurrency(periodicAllowances.computerPurchase)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">One-time</p>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Black-tie Attire</span>
                    <span className="font-semibold">{formatCurrency(periodicAllowances.blacktieAttire)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Every 3 years</p>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Ceremonial Attire</span>
                    <span className="font-semibold">{formatCurrency(periodicAllowances.ceremonialAttire)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">One-time</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card data-testid="card-mp-list">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Individual MP Allowances</CardTitle>
                <CardDescription>Click on any MP to view their detailed profile</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search MPs..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search-mp"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredMps.map((mp) => {
                const allowance = calculateMpAllowances(mp);
                return (
                  <Link key={mp.id} href={`/mp/${mp.id}`}>
                    <div 
                      className="flex items-center justify-between p-4 rounded-md border hover-elevate active-elevate-2 cursor-pointer"
                      data-testid={`card-mp-${mp.id}`}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <Avatar className="h-12 w-12 flex-shrink-0">
                          <AvatarImage src={mp.photoUrl || undefined} alt={mp.name} />
                          <AvatarFallback>
                            {mp.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold truncate" data-testid={`text-mp-name-${mp.id}`}>
                              {mp.name}
                            </h3>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {mp.constituency} • {mp.party}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right space-y-1">
                          <div>
                            <p className="font-semibold" data-testid={`text-monthly-allowance-${mp.id}`}>
                              {formatCurrency(allowance.totalMonthly)}
                            </p>
                            <p className="text-xs text-muted-foreground">monthly recurring</p>
                          </div>
                          <div className="pt-1 border-t">
                            <p className="font-semibold text-green-600 dark:text-green-400" data-testid={`text-cumulative-allowance-${mp.id}`}>
                              {formatCurrency(allowance.totalCumulativeAttendance)}
                            </p>
                            <p className="text-xs text-muted-foreground">cumulative attendance</p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
