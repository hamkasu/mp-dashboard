/**
 * Agent Service
 * Service layer for executing and managing AI agents
 * Copyright by Calmic Sdn Bhd
 */

import { db } from "../db";
import { aiAgentExecutions, aiAgentFindings, aiAgentSchedules } from "../../shared/schema";
import { AgentRegistry } from "../agents/AgentRegistry";
import type { AgentType, AgentExecutionContext, AgentResult, ProgressCallback } from "../agents/types";
import { eq, desc } from "drizzle-orm";

export class AgentService {
  /**
   * Execute an agent
   */
  static async executeAgent(
    agentType: AgentType,
    options: {
      targetId?: string;
      targetType?: "hansard" | "bill" | "mp" | "constituency" | "global";
      parameters?: Record<string, any>;
      triggeredBy?: string;
      triggeredByUserId?: string;
      onProgress?: ProgressCallback;
    }
  ): Promise<{ executionId: string; result: AgentResult }> {
    // Get the agent
    const agent = AgentRegistry.getAgent(agentType);
    if (!agent) {
      throw new Error(`Agent type '${agentType}' not found`);
    }

    // Create execution record
    const [execution] = await db
      .insert(aiAgentExecutions)
      .values({
        agentType,
        targetId: options.targetId,
        targetType: options.targetType,
        parameters: options.parameters || {},
        triggeredBy: options.triggeredBy || "manual",
        triggeredByUserId: options.triggeredByUserId,
        status: "pending",
      })
      .returning();

    // Create execution context
    const context: AgentExecutionContext = {
      executionId: execution.id,
      agentType,
      targetId: options.targetId,
      targetType: options.targetType,
      parameters: options.parameters || {},
      triggeredBy: options.triggeredBy || "manual",
      triggeredByUserId: options.triggeredByUserId,
    };

    // Execute the agent
    try {
      const result = await agent.execute(context, options.onProgress);
      return {
        executionId: execution.id,
        result,
      };
    } catch (error) {
      // Error is already logged in BaseAgent
      throw error;
    }
  }

  /**
   * Execute an agent and return a flattened result
   * Convenience wrapper used by cron jobs and admin routes
   */
  static async runAgent(
    agentType: AgentType,
    options: {
      targetId?: string;
      targetType?: "hansard" | "bill" | "mp" | "constituency" | "global";
      parameters?: Record<string, any>;
      triggeredBy?: string;
      triggeredByUserId?: string;
      onProgress?: ProgressCallback;
    }
  ): Promise<AgentResult & { executionId: string }> {
    const { executionId, result } = await this.executeAgent(agentType, options);
    return { ...result, executionId };
  }

  /**
   * Get execution by ID
   */
  static async getExecution(executionId: string) {
    return await db.query.aiAgentExecutions.findFirst({
      where: eq(aiAgentExecutions.id, executionId),
    });
  }

  /**
   * Get recent executions
   */
  static async getRecentExecutions(limit: number = 50) {
    return await db.query.aiAgentExecutions.findMany({
      orderBy: desc(aiAgentExecutions.startedAt),
      limit,
    });
  }

  /**
   * Get executions for a specific agent type
   */
  static async getExecutionsByAgent(agentType: AgentType, limit: number = 50) {
    return await db.query.aiAgentExecutions.findMany({
      where: eq(aiAgentExecutions.agentType, agentType),
      orderBy: desc(aiAgentExecutions.startedAt),
      limit,
    });
  }

  /**
   * Get findings for an execution
   */
  static async getExecutionFindings(executionId: string) {
    return await db.query.aiAgentFindings.findMany({
      where: eq(aiAgentFindings.executionId, executionId),
    });
  }

  /**
   * Get all recent findings
   */
  static async getRecentFindings(limit: number = 100) {
    return await db.query.aiAgentFindings.findMany({
      orderBy: desc(aiAgentFindings.createdAt),
      limit,
    });
  }

  /**
   * Get findings by status
   */
  static async getFindingsByStatus(status: "new" | "acknowledged" | "in_progress" | "resolved" | "dismissed") {
    return await db.query.aiAgentFindings.findMany({
      where: eq(aiAgentFindings.status, status),
      orderBy: desc(aiAgentFindings.createdAt),
    });
  }

  /**
   * Update finding status
   */
  static async updateFindingStatus(
    findingId: string,
    status: "new" | "acknowledged" | "in_progress" | "resolved" | "dismissed",
    reviewedBy?: string
  ) {
    await db
      .update(aiAgentFindings)
      .set({
        status,
        reviewedBy,
        reviewedAt: new Date(),
      })
      .where(eq(aiAgentFindings.id, findingId));
  }

  /**
   * Get all available agents
   */
  static getAvailableAgents() {
    return AgentRegistry.getAllAgents().map((agent) => ({
      type: agent.type,
      name: agent.name,
      description: agent.description,
    }));
  }

  /**
   * Get agent schedules
   */
  static async getSchedules() {
    return await db.query.aiAgentSchedules.findMany();
  }

  /**
   * Create or update a schedule
   */
  static async upsertSchedule(
    agentType: AgentType,
    config: {
      enabled: boolean;
      cronExpression?: string;
      intervalMinutes?: number;
      parameters?: Record<string, any>;
      createdBy?: string;
    }
  ) {
    // Check if schedule exists
    const existing = await db.query.aiAgentSchedules.findFirst({
      where: eq(aiAgentSchedules.agentType, agentType),
    });

    if (existing) {
      // Update existing
      await db
        .update(aiAgentSchedules)
        .set({
          ...config,
          updatedAt: new Date(),
        })
        .where(eq(aiAgentSchedules.id, existing.id));
    } else {
      // Create new
      await db.insert(aiAgentSchedules).values({
        agentType,
        ...config,
      });
    }
  }
}
