import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Info } from "lucide-react";
import { format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HansardSpeakingRecordProps {
  mpId: string;
}

interface SpeakingRecordData {
  sessionsSpoken: number;
  totalSessions: number;
  recentSessions: Array<{
    id: string;
    sessionNumber: string;
    sessionDate: string;
    speechCount: number;
  }>;
}

export function HansardSpeakingRecord({ mpId }: HansardSpeakingRecordProps) {
  const { data, isLoading } = useQuery<SpeakingRecordData>({
    queryKey: [`/api/mps/${mpId}/hansard-speaking-record`],
    enabled: !!mpId,
  });

  if (isLoading) {
    return (
      <Card data-testid="card-hansard-speaking-record">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Hansard Speaking Record
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card data-testid="card-hansard-speaking-record">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Hansard Speaking Record
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No speaking record available.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-hansard-speaking-record">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Hansard Speaking Record
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground">
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                Tracks parliamentary sessions where this MP has spoken and delivered speeches in the Hansard records.
              </p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Sessions Spoken</p>
          <p className="text-4xl font-bold" data-testid="text-sessions-spoken">
            {data.sessionsSpoken}
          </p>
          <p className="text-sm text-muted-foreground">parliamentary sessions</p>
        </div>

        {data.recentSessions.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Recent Sessions</p>
            <div className="space-y-2">
              {data.recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col space-y-1 p-3 rounded-md border bg-muted/30"
                  data-testid={`session-${session.id}`}
                >
                  <p className="font-semibold" data-testid={`session-number-${session.id}`}>
                    {session.sessionNumber}
                  </p>
                  <p className="text-sm text-muted-foreground" data-testid={`session-date-${session.id}`}>
                    {format(new Date(session.sessionDate), "MMM d, yyyy")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground italic pt-2">
          Source: Official Hansard Records
        </p>
      </CardContent>
    </Card>
  );
}
