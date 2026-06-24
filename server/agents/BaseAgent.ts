/**
 * Base Agent Class
 * Copyright by Calmic Sdn Bhd
 */

import type { IAgent, AgentType, AgentExecutionContext, AgentResult, ProgressCallback, AgentFinding } from "./types";
import { db } from "../db";
import { aiAgentExecutions, aiAgentFindings } from "../../shared/schema";
import { eq } from "drizzle-orm";

/**
 * Abstract base class for all AI agents
 */
export abstract class BaseAgent implements IAgent {
  abstract readonly type: AgentType;
  abstract readonly name: string;
  abstract readonly description: string;

  /**
   * Main execution method that handles lifecycle management
   */
  async execute(
    context: AgentExecutionContext,
    onProgress?: ProgressCallback
  ): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      // Update status to running
      await this.updateExecutionStatus(context.executionId, "running");

      // Report initial progress
      onProgress?.({
        stage: "initialization",
        progress: 0,
        message: `Starting ${this.name}...`,
      });

      // Validate parameters
      const validation = this.validateParameters(context.parameters);
      if (!validation.valid) {
        throw new Error(`Invalid parameters: ${validation.errors?.join(", ")}`);
      }

      // Execute the agent logic
      const result = await this.run(context, onProgress);

      // Calculate duration
      const durationMs = Date.now() - startTime;

      // Save findings to database
      if (result.findings && result.findings.length > 0) {
        await this.saveFindings(context.executionId, result.findings);
      }

      // Update execution record with success
      await this.updateExecutionWithResult(
        context.executionId,
        result,
        durationMs
      );

      // Report completion
      onProgress?.({
        stage: "completed",
        progress: 100,
        message: `${this.name} completed successfully`,
        details: {
          findingsCount: result.findings.length,
          duration: durationMs,
        },
      });

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      const failureResult: AgentResult = {
        success: false,
        summary: `${this.name} failed: ${errorMessage}`,
        findings: [],
        apiCalls: 0,
        dataUpdated: false,
        error: {
          message: errorMessage,
          stack: errorStack,
        },
      };

      // Update execution record with failure
      await this.updateExecutionWithResult(
        context.executionId,
        failureResult,
        durationMs
      );

      onProgress?.({
        stage: "failed",
        progress: 0,
        message: `${this.name} failed: ${errorMessage}`,
      });

      throw error;
    }
  }

  /**
   * Abstract method that subclasses must implement
   */
  protected abstract run(
    context: AgentExecutionContext,
    onProgress?: ProgressCallback
  ): Promise<AgentResult>;

  /**
   * Default parameter validation (can be overridden)
   */
  validateParameters(parameters: Record<string, any>): {
    valid: boolean;
    errors?: string[];
  } {
    return { valid: true };
  }

  /**
   * Update execution status
   */
  protected async updateExecutionStatus(
    executionId: string,
    status: "pending" | "running" | "completed" | "failed" | "cancelled"
  ): Promise<void> {
    await db
      .update(aiAgentExecutions)
      .set({ status })
      .where(eq(aiAgentExecutions.id, executionId));
  }

  /**
   * Update execution with final result
   */
  protected async updateExecutionWithResult(
    executionId: string,
    result: AgentResult,
    durationMs: number
  ): Promise<void> {
    await db
      .update(aiAgentExecutions)
      .set({
        status: result.success ? "completed" : "failed",
        completedAt: new Date(),
        durationMs,
        result: result.data || {},
        tokensUsed: result.tokensUsed,
        apiCalls: result.apiCalls,
        dataUpdated: result.dataUpdated,
        errorMessage: result.error?.message,
        errorStack: result.error?.stack,
      })
      .where(eq(aiAgentExecutions.id, executionId));
  }

  /**
   * Save findings to database
   */
  protected async saveFindings(
    executionId: string,
    findings: AgentFinding[]
  ): Promise<void> {
    if (findings.length === 0) return;

    const findingsToInsert = findings.map((finding) => ({
      executionId,
      findingType: finding.type,
      severity: finding.severity,
      title: finding.title,
      description: finding.description,
      relatedMpIds: finding.relatedMpIds || [],
      relatedHansardIds: finding.relatedHansardIds || [],
      relatedBillIds: finding.relatedBillIds || [],
      evidence: finding.evidence || {},
      suggestedAction: finding.suggestedAction,
      status: "new" as const,
    }));

    await db.insert(aiAgentFindings).values(findingsToInsert);
  }

  /**
   * Helper to create a finding
   */
  protected createFinding(
    type: AgentFinding["type"],
    severity: AgentFinding["severity"],
    title: string,
    description: string,
    options?: Partial<AgentFinding>
  ): AgentFinding {
    return {
      type,
      severity,
      title,
      description,
      ...options,
    };
  }
}
