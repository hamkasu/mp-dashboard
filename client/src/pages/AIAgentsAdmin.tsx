/**
 * Copyright by Calmic Sdn Bhd
 *
 * AI Agents Admin Panel
 * Manage and monitor agentic AI capabilities
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Play,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  Database,
  Calendar,
  Loader2,
  Eye,
  AlertTriangle,
  Info,
  Sparkles
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageMeta } from "@/components/PageMeta";
import { useToast } from "@/hooks/use-toast";

interface Agent {
  type: string;
  name: string;
  description: string;
}

interface AgentExecution {
  id: string;
  agentType: string;
  targetId: string | null;
  targetType: string | null;
  status: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  result: any;
  triggeredBy: string;
  errorMessage: string | null;
}

interface AgentFinding {
  id: string;
  executionId: string;
  findingType: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  suggestedAction: string | null;
}

export default function AIAgentsAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [executing, setExecuting] = useState<string | null>(null);

  // Fetch available agents
  const { data: agentsData, isLoading: loadingAgents } = useQuery<{ agents: Agent[] }>({
    queryKey: ["/api/agents"],
  });

  // Fetch recent executions
  const { data: executionsData, isLoading: loadingExecutions } = useQuery<{ executions: AgentExecution[] }>({
    queryKey: ["/api/agents/executions"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch recent findings
  const { data: findingsData, isLoading: loadingFindings } = useQuery<{ findings: AgentFinding[] }>({
    queryKey: ["/api/agents/findings"],
  });

  // Execute agent mutation
  const executeMutation = useMutation({
    mutationFn: async ({ agentType, parameters }: { agentType: string; parameters?: any }) => {
      const response = await fetch(`/api/agents/${agentType}/execute`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ parameters: parameters || {} }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to execute agent");
      }

      return response.json();
    },
    onMutate: ({ agentType }) => {
      setExecuting(agentType);
    },
    onSuccess: (data, { agentType }) => {
      setExecuting(null);
      toast({
        title: "Agent Executed",
        description: `${agentType} completed: ${data.result.summary}`,
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/agents/executions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents/findings"] });
    },
    onError: (error: Error, { agentType }) => {
      setExecuting(null);
      toast({
        title: "Execution Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleExecuteAgent = (agentType: string) => {
    if (window.confirm(`Execute ${agentType} agent?`)) {
      executeMutation.mutate({ agentType });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { variant: "default" as const, icon: CheckCircle, label: "Completed" },
      running: { variant: "secondary" as const, icon: Loader2, label: "Running" },
      failed: { variant: "destructive" as const, icon: AlertCircle, label: "Failed" },
      pending: { variant: "outline" as const, icon: Clock, label: "Pending" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className={`h-3 w-3 ${status === 'running' ? 'animate-spin' : ''}`} />
        {config.label}
      </Badge>
    );
  };

  const getSeverityBadge = (severity: string) => {
    const severityConfig = {
      critical: { variant: "destructive" as const, icon: AlertCircle },
      high: { variant: "destructive" as const, icon: AlertTriangle },
      medium: { variant: "secondary" as const, icon: Info },
      low: { variant: "outline" as const, icon: Info },
      info: { variant: "outline" as const, icon: Sparkles },
    };

    const config = severityConfig[severity as keyof typeof severityConfig] || severityConfig.info;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </Badge>
    );
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return "N/A";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <PageMeta
        title="AI Agents Admin"
        description="Manage and monitor agentic AI capabilities"
      />
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
            <Brain className="h-8 w-8 text-blue-600" />
            Agentic AI Management
          </h1>
          <p className="text-gray-600">
            Manage autonomous AI agents that analyze parliamentary data and provide insights
          </p>
        </div>

        {/* Available Agents */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Available AI Agents
            </CardTitle>
            <CardDescription>
              Execute agents to analyze data and generate insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAgents ? (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {agentsData?.agents.map((agent) => (
                  <Card key={agent.type} className="border-2 hover:border-blue-300 transition-colors">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {agent.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => handleExecuteAgent(agent.type)}
                        disabled={executing === agent.type}
                        className="w-full"
                      >
                        {executing === agent.type ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Executing...
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Execute Agent
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Executions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Executions
            </CardTitle>
            <CardDescription>
              Monitor agent execution history and results
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingExecutions ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : executionsData?.executions && executionsData.executions.length > 0 ? (
              <div className="space-y-3">
                {executionsData.executions.slice(0, 10).map((execution) => (
                  <div
                    key={execution.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{execution.agentType}</span>
                        {getStatusBadge(execution.status)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(execution.startedAt).toLocaleString()}
                        {execution.durationMs && (
                          <span className="ml-2">• Duration: {formatDuration(execution.durationMs)}</span>
                        )}
                      </div>
                      {execution.errorMessage && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{execution.errorMessage}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                    {execution.result && (
                      <div className="text-right ml-4">
                        <div className="text-sm text-gray-600">
                          {execution.result.summary}
                        </div>
                        {execution.result.data && (
                          <div className="text-xs text-gray-400 mt-1">
                            {JSON.stringify(execution.result.data).slice(0, 100)}...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No executions yet. Run an agent to see results here.</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Findings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Findings
            </CardTitle>
            <CardDescription>
              Insights and issues discovered by AI agents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingFindings ? (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : findingsData?.findings && findingsData.findings.length > 0 ? (
              <div className="space-y-3">
                {findingsData.findings.slice(0, 15).map((finding) => (
                  <div
                    key={finding.id}
                    className="p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getSeverityBadge(finding.severity)}
                        <Badge variant="outline">{finding.findingType}</Badge>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(finding.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <h4 className="font-medium mb-1">{finding.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{finding.description}</p>
                    {finding.suggestedAction && (
                      <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                        💡 {finding.suggestedAction}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No findings yet. Agents will discover insights as they run.</p>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
