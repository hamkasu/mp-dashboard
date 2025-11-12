import { MapPin, UserCircle, Wallet, Calendar, Mic } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Mp } from "@shared/schema";
import { Link } from "wouter";
import { calculateTotalSalary, formatCurrency } from "@/lib/utils";

interface MPCardProps {
  mp: Mp;
}

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

function getSpeakingColor(speakingRate: number): string {
  if (speakingRate >= 70) return "text-green-600 dark:text-green-400";
  if (speakingRate >= 40) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

export function MPCard({ mp }: MPCardProps) {
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
  
  const attendanceRate = mp.totalParliamentDays > 0 
    ? (mp.daysAttended / mp.totalParliamentDays) * 100 
    : 0;
  const attendanceColor = getAttendanceColor(attendanceRate);
  
  // Calculate speaking participation rate (compared to days attended)
  const speakingRate = mp.daysAttended > 0
    ? (mp.hansardSessionsSpoke / mp.daysAttended) * 100
    : 0;
  const speakingColor = getSpeakingColor(speakingRate);

  return (
    <Link href={`/mp/${mp.id}`}>
      <Card 
        className="hover-elevate overflow-hidden transition-shadow duration-200 cursor-pointer h-full"
        data-testid={`card-mp-${mp.id}`}
      >
        <div className="aspect-[3/4] relative overflow-hidden bg-muted">
          {mp.photoUrl ? (
            <img
              src={mp.photoUrl}
              alt={mp.name}
              className="object-cover w-full h-full"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <UserCircle className="w-24 h-24 text-muted-foreground/50" />
            </div>
          )}
        </div>
        
        <CardContent className="p-4 space-y-3">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold leading-tight line-clamp-2" data-testid={`text-mp-name-${mp.id}`}>
              {mp.title && <span className="text-muted-foreground text-sm">{mp.title} </span>}
              {mp.name}
            </h3>
            
            {mp.role && (
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {mp.role}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={partyColor} data-testid={`badge-party-${mp.id}`}>
              {mp.party}
            </Badge>
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium line-clamp-1">{mp.constituency}</p>
                <p className="text-xs text-muted-foreground">{mp.state}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 space-y-1">
                <div>
                  <p className="font-semibold text-green-600 dark:text-green-400" data-testid={`text-total-earned-${mp.id}`}>
                    {formatCurrency(totalSalary)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total earned</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-muted">
                  <div>
                    <p className="font-medium" data-testid={`text-monthly-allowance-${mp.id}`}>{formatCurrency(monthlySalary)}</p>
                    <p className="text-xs text-muted-foreground">Monthly</p>
                  </div>
                  <div>
                    <p className="font-medium" data-testid={`text-yearly-allowance-${mp.id}`}>{formatCurrency(yearlySalary)}</p>
                    <p className="text-xs text-muted-foreground">Yearly</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className={`font-semibold ${attendanceColor}`} data-testid={`text-attendance-${mp.id}`}>
                  {mp.daysAttended}/{mp.totalParliamentDays} days
                </p>
                <p className="text-xs text-muted-foreground">Parliament attendance (since sworn in)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(mp.parliamentSittingAllowance * mp.daysAttended)} - Parliament sitting allowance
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <Mic className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className={`font-semibold ${speakingColor}`} data-testid={`text-speaking-${mp.id}`}>
                  Spoke in {mp.hansardSessionsSpoke} sessions
                </p>
                <p className="text-xs text-muted-foreground">Hansard speaking participation</p>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground font-mono">
              {mp.parliamentCode}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
