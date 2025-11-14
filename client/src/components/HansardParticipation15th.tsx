import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, TrendingUp, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";

interface Session {
  id: string;
  sessionNumber: string;
  sessionDate: string;
  sitting: string;
  topics: string[];
  speechCount: number;
}

interface ParticipationData {
  totalSessions: number;
  totalSpeeches: number;
  sessionsSpoke: number;
  averageSpeeches: number;
  sessions: Session[];
}

interface HansardParticipation15thProps {
  mpId: string;
  mpName: string;
}

export function HansardParticipation15th({ mpId, mpName }: HansardParticipation15thProps) {
  const { data, isLoading } = useQuery<ParticipationData>({
    queryKey: [`/api/mps/${mpId}/hansard-participation-15th`],
    enabled: !!mpId,
  });

  if (isLoading) {
    return (
      <Card data-testid="card-hansard-participation">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            15th Parliament Hansard Participation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-20 bg-muted animate-pulse rounded" />
            <div className="h-40 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card data-testid="card-hansard-participation">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            15th Parliament Hansard Participation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No participation data available for the 15th Parliament.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const participationRate = data.totalSessions > 0 
    ? Math.round((data.sessionsSpoke / data.totalSessions) * 100) 
    : 0;

  return (
    <Card data-testid="card-hansard-participation">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          15th Parliament Hansard Participation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="space-y-1" data-testid="metric-sessions-spoke">
            <p className="text-sm text-muted-foreground">Sessions Spoke</p>
            <p className="text-2xl font-bold">{data.sessionsSpoke}</p>
            <p className="text-xs text-muted-foreground">
              of {data.totalSessions} total
            </p>
          </div>
          
          <div className="space-y-1" data-testid="metric-total-speeches">
            <p className="text-sm text-muted-foreground">Total Speeches</p>
            <p className="text-2xl font-bold">{data.totalSpeeches}</p>
          </div>
          
          <div className="space-y-1" data-testid="metric-average-speeches">
            <p className="text-sm text-muted-foreground">Avg Speeches/Session</p>
            <p className="text-2xl font-bold">{data.averageSpeeches}</p>
          </div>
          
          <div className="space-y-1" data-testid="metric-participation-rate">
            <p className="text-sm text-muted-foreground">Participation Rate</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{participationRate}%</p>
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        {data.sessions.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Speaking Record ({data.sessions.length} Sessions)
            </h4>
            <div className="max-h-96 overflow-y-auto space-y-3">
              {data.sessions.map((session) => (
                <div
                  key={session.id}
                  className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                  data-testid={`session-${session.id}`}
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" data-testid={`badge-session-${session.id}`}>
                          {session.sessionNumber}
                        </Badge>
                        <Badge variant="outline" data-testid={`badge-speeches-${session.id}`}>
                          {session.speechCount} {session.speechCount === 1 ? 'speech' : 'speeches'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Calendar className="h-4 w-4" />
                        <span data-testid={`text-date-${session.id}`}>
                          {format(new Date(session.sessionDate), "MMMM d, yyyy")}
                        </span>
                        <span className="text-muted-foreground/50">•</span>
                        <span data-testid={`text-sitting-${session.id}`}>{session.sitting}</span>
                      </div>
                    </div>
                  </div>
                  
                  {session.topics && session.topics.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        Topics Discussed:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {session.topics.slice(0, 5).map((topic, index) => (
                          <Badge 
                            key={index} 
                            variant="outline" 
                            className="text-xs"
                            data-testid={`topic-${session.id}-${index}`}
                          >
                            {topic}
                          </Badge>
                        ))}
                        {session.topics.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{session.topics.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {data.sessions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{mpName} has not spoken in any 15th Parliament Hansard sessions.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
