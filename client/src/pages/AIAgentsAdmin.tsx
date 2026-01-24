/**
 * Copyright by Calmic Sdn Bhd
 *
 * AI Agents Admin Panel - Enhanced Version
 * Manage and monitor agentic AI capabilities
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp
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

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedExecutions, setExpandedExecutions] = useState<Set<string>>(new Set());

  // Fetch available agents
  const { data: agentsData, isLoading: loadingAgents } = useQuery<{ agents: Agent[] }>({
    queryKey: ["/api/agents"],
  });

  // Fetch recent executions
  const { data: executionsData, isLoading: loadingExecutions, refetch: refetchExecutions } = useQuery<{ executions: AgentExecution[] }>({
    queryKey: ["/api/agents/executions"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch recent findings
  const { data: findingsData, isLoading: loadingFindings, refetch: refetchFindings } = useQuery<{ findings: AgentFinding[] }>({
    queryKey: ["/api/agents/findings"],
    refetchInterval: 10000, // Refresh every 10 seconds
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
        title: "Agent Executed Successfully",
        description: data.result.summary,
      });

      // Refresh data
      refetchExecutions();
      refetchFindings();
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
    if (window.confirm(`Execute ${agentType} agent? This will analyze available data and generate insights.`)) {
      executeMutation.mutate({ agentType });
    }
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedExecutions);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedExecutions(newExpanded);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { variant: "default" as const, icon: CheckCircle, label: "Completed", color: "text-green-600" },
      running: { variant: "secondary" as const, icon: Loader2, label: "Running", color: "text-blue-600" },
      failed: { variant: "destructive" as const, icon: AlertCircle, label: "Failed", color: "text-red-600" },
      pending: { variant: "outline" as const, icon: Clock, label: "Pending", color: "text-gray-600" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className={`h-3 w-3 ${status === 'running' ? 'animate-spin' : ''} ${config.color}`} />
        {config.label}
      </Badge>
    );
  };

  const getSeverityBadge = (severity: string) => {
    const severityConfig = {
      critical: { variant: "destructive" as const, icon: AlertCircle, color: "bg-red-100 text-red-800 border-red-300" },
      high: { variant: "destructive" as const, icon: AlertTriangle, color: "bg-orange-100 text-orange-800 border-orange-300" },
      medium: { variant: "secondary" as const, icon: Info, color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
      low: { variant: "outline" as const, icon: Info, color: "bg-blue-50 text-blue-700 border-blue-200" },
      info: { variant: "outline" as const, icon: Sparkles, color: "bg-gray-50 text-gray-700 border-gray-200" },
    };

    const config = severityConfig[severity as keyof typeof severityConfig] || severityConfig.info;
    const Icon = config.icon;

    return (
      <Badge className={`gap-1 ${config.color}`}>
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

  // Filter executions
  const filteredExecutions = executionsData?.executions.filter(exec => {
    if (statusFilter !== "all" && exec.status !== statusFilter) return false;
    if (searchQuery && !exec.agentType.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }) || [];

  // Filter findings
  const filteredFindings = findingsData?.findings.filter(finding => {
    if (severityFilter !== "all" && finding.severity !== severityFilter) return false;
    if (searchQuery && !finding.title.toLowerCase().includes(searchQuery.toLowerCase()) && !finding.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }) || [];

  // Get summary stats
  const stats = {
    totalExecutions: executionsData?.executions.length || 0,
    successfulExecutions: executionsData?.executions.filter(e => e.status === "completed").length || 0,
    runningExecutions: executionsData?.executions.filter(e => e.status === "running").length || 0,
    failedExecutions: executionsData?.executions.filter(e => e.status === "failed").length || 0,
    totalFindings: findingsData?.findings.length || 0,
    criticalFindings: findingsData?.findings.filter(f => f.severity === "critical" || f.severity === "high").length || 0,
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

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totalExecutions}</div>
              <div className="text-xs text-gray-500">Total Runs</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.successfulExecutions}</div>
              <div className="text-xs text-gray-500">Successful</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{stats.runningExecutions}</div>
              <div className="text-xs text-gray-500">Running</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{stats.failedExecutions}</div>
              <div className="text-xs text-gray-500">Failed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totalFindings}</div>
              <div className="text-xs text-gray-500">Total Findings</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-600">{stats.criticalFindings}</div>
              <div className="text-xs text-gray-500">High Priority</div>
            </CardContent>
          </Card>
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

        {/* Search and Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search agents, findings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => { refetchExecutions(); refetchFindings(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Recent Executions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Executions ({filteredExecutions.length})
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
            ) : filteredExecutions.length > 0 ? (
              <div className="space-y-3">
                {filteredExecutions.slice(0, 20).map((execution) => (
                  <div
                    key={execution.id}
                    className="border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer"
                      onClick={() => toggleExpanded(execution.id)}
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
                      </div>
                      {expandedExecutions.has(execution.id) ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>

                    {expandedExecutions.has(execution.id) && (
                      <div className="px-4 pb-4 border-t pt-3">
                        {execution.errorMessage && (
                          <Alert variant="destructive" className="mb-3">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{execution.errorMessage}</AlertDescription>
                          </Alert>
                        )}
                        {execution.result && (
                          <div className="space-y-2">
                            <div className="text-sm">
                              <strong>Summary:</strong> {execution.result.summary}
                            </div>
                            {execution.result.data && (
                              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                <strong>Data:</strong> {JSON.stringify(execution.result.data, null, 2)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No executions match your filters. Run an agent to see results here.</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Findings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Findings ({filteredFindings.length})
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
            ) : filteredFindings.length > 0 ? (
              <div className="space-y-3">
                {filteredFindings.slice(0, 30).map((finding) => (
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
              <p className="text-gray-500 text-center py-8">No findings match your filters. Agents will discover insights as they run.</p>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
