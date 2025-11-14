import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, TrendingUp, MessageSquare } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ConstituencyParticipation {
  constituency: string;
  state: string;
  totalSessions: number;
  sessionsSpoke: number;
  totalSpeeches: number;
  participationRate: number;
  mpIds: string[];
  mpNames: string[];
}

export function ConstituencyHansardAnalysis() {
  const { data, isLoading } = useQuery<ConstituencyParticipation[]>({
    queryKey: ["/api/constituencies/hansard-participation-15th"],
  });

  if (isLoading) {
    return (
      <Card data-testid="card-constituency-analysis">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            15th Parliament Constituency Hansard Participation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card data-testid="card-constituency-analysis">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            15th Parliament Constituency Hansard Participation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No constituency participation data available.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getParticipationColor = (rate: number): string => {
    if (rate >= 70) return "text-green-600 dark:text-green-400";
    if (rate >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <Card data-testid="card-constituency-analysis">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          15th Parliament Constituency Hansard Participation
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Track speaking participation across all {data.length} constituencies in Malaysia's 15th Parliament
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Constituency</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="text-center">Sessions Spoke</TableHead>
                <TableHead className="text-center">Total Speeches</TableHead>
                <TableHead className="text-center">Participation Rate</TableHead>
                <TableHead>MPs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((constituency, index) => (
                <TableRow key={`${constituency.constituency}-${constituency.state}`} data-testid={`row-constituency-${index}`}>
                  <TableCell className="font-medium" data-testid={`text-constituency-${index}`}>
                    {constituency.constituency}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" data-testid={`badge-state-${index}`}>
                      {constituency.state}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center" data-testid={`text-sessions-${index}`}>
                    <div className="flex flex-col items-center">
                      <span className="font-semibold">{constituency.sessionsSpoke}</span>
                      <span className="text-xs text-muted-foreground">
                        of {constituency.totalSessions}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-semibold" data-testid={`text-speeches-${index}`}>
                    <div className="flex items-center justify-center gap-1">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      {constituency.totalSpeeches}
                    </div>
                  </TableCell>
                  <TableCell className="text-center" data-testid={`text-rate-${index}`}>
                    <div className="flex items-center justify-center gap-1">
                      <span className={`text-lg font-bold ${getParticipationColor(constituency.participationRate)}`}>
                        {constituency.participationRate.toFixed(1)}%
                      </span>
                      {constituency.participationRate >= 70 && (
                        <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {constituency.mpNames.map((name, mpIndex) => (
                        <Badge key={mpIndex} variant="secondary" className="text-xs" data-testid={`badge-mp-${index}-${mpIndex}`}>
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-600 dark:bg-green-400" />
            <span>High participation (≥70%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-yellow-600 dark:bg-yellow-400" />
            <span>Moderate (40-70%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-600 dark:bg-red-400" />
            <span>Low (&lt;40%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
