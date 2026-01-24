/**
 * Hansard Monitor Agent
 * Autonomously monitors and analyzes parliamentary Hansard records
 * Copyright by Calmic Sdn Bhd
 */

import { BaseAgent } from "./BaseAgent";
import type { AgentType, AgentExecutionContext, AgentResult, ProgressCallback } from "./types";
import { db } from "../db";
import { hansardRecords, mps, aiAgentExecutions } from "../../shared/schema";
import { desc, isNull, eq } from "drizzle-orm";
import { analyzeHansardWithAI } from "../services/aiService";

export class HansardMonitorAgent extends BaseAgent {
  readonly type: AgentType = "hansard-monitor";
  readonly name = "Hansard Monitor Agent";
  readonly description = "Autonomously monitors and analyzes parliamentary Hansard records for insights, trends, and notable events";

  protected async run(
    context: AgentExecutionContext,
    onProgress?: ProgressCallback
  ): Promise<AgentResult> {
    const findings: any[] = [];
    let tokensUsed = 0;
    let apiCalls = 0;
    let dataUpdated = false;

    onProgress?.({
      stage: "fetching",
      progress: 10,
      message: "Fetching recent Hansard records...",
    });

    // Determine which Hansard records to analyze
    let hansardRecordsToAnalyze;

    if (context.targetId) {
      // Analyze specific Hansard record
      const record = await db.query.hansardRecords.findFirst({
        where: eq(hansardRecords.id, context.targetId),
      });

      if (!record) {
        throw new Error(`Hansard record ${context.targetId} not found`);
      }

      hansardRecordsToAnalyze = [record];
    } else {
      // Analyze recent records without summaries
      const limit = context.parameters.limit || 5;
      hansardRecordsToAnalyze = await db.query.hansardRecords.findMany({
        where: isNull(hansardRecords.summary),
        orderBy: desc(hansardRecords.sessionDate),
        limit,
      });
    }

    if (hansardRecordsToAnalyze.length === 0) {
      return {
        success: true,
        summary: "No new Hansard records found to analyze",
        findings: [],
        apiCalls: 0,
        dataUpdated: false,
      };
    }

    onProgress?.({
      stage: "analyzing",
      progress: 20,
      message: `Found ${hansardRecordsToAnalyze.length} Hansard records to analyze`,
    });

    // Analyze each record
    for (let i = 0; i < hansardRecordsToAnalyze.length; i++) {
      const record = hansardRecordsToAnalyze[i];
      const recordProgress = 20 + (60 * (i + 1)) / hansardRecordsToAnalyze.length;

      onProgress?.({
        stage: "analyzing",
        progress: Math.round(recordProgress),
        message: `Analyzing session ${record.sessionNumber} (${i + 1}/${hansardRecordsToAnalyze.length})`,
      });

      try {
        // Extract key insights from the transcript
        const insights = await this.analyzeHansardRecord(record);
        apiCalls++;

        // Check for controversial topics
        if (insights.controversialTopics && insights.controversialTopics.length > 0) {
          findings.push(
            this.createFinding(
              "insight",
              "high",
              `Controversial Topics in Session ${record.sessionNumber}`,
              `Identified ${insights.controversialTopics.length} controversial topics: ${insights.controversialTopics.slice(0, 3).join(", ")}`,
              {
                relatedHansardIds: [record.id],
                evidence: {
                  topics: insights.controversialTopics,
                  sessionDate: record.sessionDate,
                },
              }
            )
          );
        }

        // Check for high activity debates
        if (insights.highActivityDebates && insights.highActivityDebates.length > 0) {
          findings.push(
            this.createFinding(
              "insight",
              "medium",
              `High Activity Debates Detected`,
              `Session ${record.sessionNumber} had ${insights.highActivityDebates.length} debates with unusually high participation`,
              {
                relatedHansardIds: [record.id],
                evidence: {
                  debates: insights.highActivityDebates,
                },
              }
            )
          );
        }

        // Check for attendance issues
        if (record.constituenciesAbsent && record.constituenciesAbsent > 50) {
          findings.push(
            this.createFinding(
              "warning",
              "medium",
              `Low Attendance in Session ${record.sessionNumber}`,
              `${record.constituenciesAbsent} constituencies were absent (${Math.round((record.constituenciesAbsent / 222) * 100)}% of MPs)`,
              {
                relatedHansardIds: [record.id],
                evidence: {
                  constituenciesAbsent: record.constituenciesAbsent,
                  constituenciesPresent: record.constituenciesPresent,
                  sessionDate: record.sessionDate,
                },
                suggestedAction: "Investigate reasons for low attendance and notify relevant parties",
              }
            )
          );
        }

        // Update the record with summary if generated
        if (insights.summary) {
          await db
            .update(hansardRecords)
            .set({
              summary: insights.summary,
              summarizedAt: new Date(),
            })
            .where(eq(hansardRecords.id, record.id));
          dataUpdated = true;
        }
      } catch (error) {
        console.error(`Error analyzing Hansard record ${record.id}:`, error);
        findings.push(
          this.createFinding(
            "error",
            "low",
            `Failed to Analyze Session ${record.sessionNumber}`,
            error instanceof Error ? error.message : "Unknown error",
            {
              relatedHansardIds: [record.id],
            }
          )
        );
      }
    }

    onProgress?.({
      stage: "finalizing",
      progress: 90,
      message: "Generating final report...",
    });

    const summary = `Analyzed ${hansardRecordsToAnalyze.length} Hansard records. Found ${findings.length} insights and issues. ${dataUpdated ? "Updated records with summaries." : ""}`;

    return {
      success: true,
      summary,
      findings,
      data: {
        recordsAnalyzed: hansardRecordsToAnalyze.length,
        recordsUpdated: dataUpdated ? hansardRecordsToAnalyze.length : 0,
      },
      tokensUsed,
      apiCalls,
      dataUpdated,
    };
  }

  /**
   * Analyze a single Hansard record for insights
   */
  private async analyzeHansardRecord(record: any): Promise<{
    summary?: string;
    controversialTopics?: string[];
    highActivityDebates?: string[];
    keyDecisions?: string[];
  }> {
    // Extract insights from the transcript
    const transcript = record.transcript;

    // Identify controversial keywords
    const controversialKeywords = [
      "corruption",
      "scandal",
      "resign",
      "investigation",
      "abuse",
      "illegal",
      "misconduct",
      "protest",
      "walkout",
    ];

    const controversialTopics = controversialKeywords.filter((keyword) =>
      transcript.toLowerCase().includes(keyword)
    );

    // Check for high activity (many speakers)
    const speakerCount = record.speakers?.length || 0;
    const highActivityDebates = speakerCount > 30 ? ["Main debate"] : [];

    // Generate a simple summary (first 500 chars)
    const summary = transcript.slice(0, 500) + "...";

    return {
      summary,
      controversialTopics: controversialTopics.length > 0 ? controversialTopics : undefined,
      highActivityDebates: highActivityDebates.length > 0 ? highActivityDebates : undefined,
    };
  }

  validateParameters(parameters: Record<string, any>): {
    valid: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];

    if (parameters.limit && (typeof parameters.limit !== "number" || parameters.limit < 1 || parameters.limit > 50)) {
      errors.push("limit must be a number between 1 and 50");
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
