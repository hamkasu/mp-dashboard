/**
 * Agentic AI Agent Types and Interfaces
 * Copyright by Calmic Sdn Bhd
 */

import type { AiAgentExecution, AiAgentFinding } from "../../shared/schema";

export type AgentType =
  | "hansard-monitor"
  | "data-quality"
  | "bill-analyzer"
  | "mp-research"
  | "fact-checker"
  | "constituency-research"
  | "transparency-report"
  | "semantic-search";

export type AgentStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
export type FindingType = "insight" | "inconsistency" | "suggestion" | "warning" | "error";
export type FindingSeverity = "critical" | "high" | "medium" | "low" | "info";

export interface AgentExecutionContext {
  executionId: string;
  agentType: AgentType;
  targetId?: string;
  targetType?: "hansard" | "bill" | "mp" | "constituency" | "global";
  parameters: Record<string, any>;
  triggeredBy: string;
  triggeredByUserId?: string;
}

export interface AgentResult {
  success: boolean;
  summary: string;
  findings: AgentFinding[];
  data?: Record<string, any>;
  tokensUsed?: number;
  apiCalls: number;
  dataUpdated: boolean;
  error?: {
    message: string;
    stack?: string;
  };
}

export interface AgentFinding {
  type: FindingType;
  severity: FindingSeverity;
  title: string;
  description: string;
  relatedMpIds?: string[];
  relatedHansardIds?: string[];
  relatedBillIds?: string[];
  evidence?: Record<string, any>;
  suggestedAction?: string;
}

export interface AgentProgress {
  stage: string;
  progress: number; // 0-100
  message: string;
  details?: Record<string, any>;
}

export type ProgressCallback = (progress: AgentProgress) => void;

/**
 * Base interface for all AI agents
 */
export interface IAgent {
  readonly type: AgentType;
  readonly name: string;
  readonly description: string;

  /**
   * Execute the agent with given context
   */
  execute(
    context: AgentExecutionContext,
    onProgress?: ProgressCallback
  ): Promise<AgentResult>;

  /**
   * Validate parameters before execution
   */
  validateParameters(parameters: Record<string, any>): {
    valid: boolean;
    errors?: string[];
  };
}

/**
 * Agent configuration for scheduling
 */
export interface AgentScheduleConfig {
  agentType: AgentType;
  enabled: boolean;
  cronExpression?: string;
  intervalMinutes?: number;
  parameters?: Record<string, any>;
}

/**
 * Streaming result for long-running agents
 */
export interface StreamingAgentResult {
  executionId: string;
  status: AgentStatus;
  progress?: AgentProgress;
  partialFindings?: AgentFinding[];
  finalResult?: AgentResult;
}
