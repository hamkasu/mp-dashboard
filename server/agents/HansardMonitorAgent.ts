/**
 * Hansard Monitor Agent - Enhanced Version
 * Autonomously monitors and analyzes parliamentary Hansard records
 * Copyright by Calmic Sdn Bhd
 */

import { BaseAgent } from "./BaseAgent";
import type { AgentType, AgentExecutionContext, AgentResult, ProgressCallback } from "./types";
import { db } from "../db";
import { hansardRecords, mps } from "../../shared/schema";
import { desc, isNull, eq } from "drizzle-orm";

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
      // Analyze recent records that need attention
      const limit = context.parameters.limit || 10;
      const analyzeAll = context.parameters.analyzeAll || false;

      if (analyzeAll) {
        // Analyze all records without summaries
        hansardRecordsToAnalyze = await db.query.hansardRecords.findMany({
          where: isNull(hansardRecords.summary),
          orderBy: desc(hansardRecords.sessionDate),
          limit,
        });
      } else {
        // Just analyze most recent records for monitoring
        hansardRecordsToAnalyze = await db.query.hansardRecords.findMany({
          orderBy: desc(hansardRecords.sessionDate),
          limit: Math.min(limit, 5),
        });
      }
    }

    if (hansardRecordsToAnalyze.length === 0) {
      return {
        success: true,
        summary: "No Hansard records found to analyze",
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
      const recordProgress = 20 + (70 * (i + 1)) / hansardRecordsToAnalyze.length;

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
          const topTopics = insights.controversialTopics.slice(0, 3);
          findings.push(
            this.createFinding(
              "insight",
              "high",
              `Controversial Topics in Session ${record.sessionNumber}`,
              `Identified ${insights.controversialTopics.length} potentially controversial topics: ${topTopics.join(", ")}`,
              {
                relatedHansardIds: [record.id],
                evidence: {
                  topics: insights.controversialTopics,
                  sessionDate: record.sessionDate,
                  sessionNumber: record.sessionNumber,
                },
                suggestedAction: "Review Hansard transcript for context and potential follow-up required",
              }
            )
          );
        }

        // Check for high activity debates
        const speakerCount = record.speakerStats?.length || 0;
        if (speakerCount > 40) {
          findings.push(
            this.createFinding(
              "insight",
              "medium",
              `High Participation Session Detected`,
              `Session ${record.sessionNumber} had ${speakerCount} unique speakers - indicating high engagement debate`,
              {
                relatedHansardIds: [record.id],
                evidence: {
                  speakerCount,
                  sessionDate: record.sessionDate,
                  topics: record.topics,
                },
              }
            )
          );
        }

        // Check for low participation
        if (speakerCount > 0 && speakerCount < 10) {
          findings.push(
            this.createFinding(
              "warning",
              "low",
              `Low Participation in Session ${record.sessionNumber}`,
              `Only ${speakerCount} MPs spoke - unusually low participation`,
              {
                relatedHansardIds: [record.id],
                evidence: {
                  speakerCount,
                  sessionDate: record.sessionDate,
                },
              }
            )
          );
        }

        // Check for attendance issues
        const attendanceRate = record.sessionSpeakerStats?.attendanceRate;
        if (attendanceRate && attendanceRate < 60) {
          findings.push(
            this.createFinding(
              "warning",
              "medium",
              `Low Attendance in Session ${record.sessionNumber}`,
              `Attendance rate was only ${attendanceRate}% (${record.constituenciesPresent || 0}/${222} constituencies present)`,
              {
                relatedHansardIds: [record.id],
                evidence: {
                  attendanceRate,
                  constituenciesPresent: record.constituenciesPresent,
                  constituenciesAbsent: record.constituenciesAbsent,
                  sessionDate: record.sessionDate,
                },
                suggestedAction: "Monitor attendance trends and identify patterns of absenteeism",
              }
            )
          );
        }

        // Check for votes and divisions
        if (record.voteRecords && record.voteRecords.length > 0) {
          const closeVotes = record.voteRecords.filter((vote: any) => {
            const diff = Math.abs(vote.yesCount - vote.noCount);
            return diff < 10 && diff > 0;
          });

          if (closeVotes.length > 0) {
            findings.push(
              this.createFinding(
                "insight",
                "high",
                `Close Votes in Session ${record.sessionNumber}`,
                `${closeVotes.length} close vote(s) detected - indicating divided parliament`,
                {
                  relatedHansardIds: [record.id],
                  evidence: {
                    votes: closeVotes.map((v: any) => ({
                      motion: v.motion,
                      yes: v.yesCount,
                      no: v.noCount,
                      result: v.result,
                    })),
                    sessionDate: record.sessionDate,
                  },
                  suggestedAction: "Analyze voting patterns and party positions on these motions",
                }
              )
            );
          }
        }

        // Update the record with enhanced summary if needed
        if (!record.summary && insights.summary) {
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
            error instanceof Error ? error.message : "Unknown error occurred during analysis",
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

    const criticalFindings = findings.filter(f => f.severity === "critical" || f.severity === "high").length;
    const summary = `Analyzed ${hansardRecordsToAnalyze.length} Hansard records. Found ${findings.length} insights (${criticalFindings} high priority). ${dataUpdated ? "Updated summaries." : ""}`;

    return {
      success: true,
      summary,
      findings,
      data: {
        recordsAnalyzed: hansardRecordsToAnalyze.length,
        totalFindings: findings.length,
        criticalFindings,
        recordsUpdated: dataUpdated ? hansardRecordsToAnalyze.filter(r => !r.summary).length : 0,
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
    const transcript = record.transcript;
    const transcriptLower = transcript.toLowerCase();

    // Enhanced controversial keywords detection
    const controversialPatterns = [
      { keyword: "corruption", category: "Corruption/Integrity" },
      { keyword: "rasuah", category: "Corruption/Integrity" },
      { keyword: "scandal", category: "Corruption/Integrity" },
      { keyword: "resign", category: "Political Crisis" },
      { keyword: "letak jawatan", category: "Political Crisis" },
      { keyword: "investigate", category: "Investigation" },
      { keyword: "siasatan", category: "Investigation" },
      { keyword: "abuse", category: "Abuse of Power" },
      { keyword: "penyalahgunaan", category: "Abuse of Power" },
      { keyword: "illegal", category: "Legal Issues" },
      { keyword: "haram", category: "Legal Issues" },
      { keyword: "misconduct", category: "Misconduct" },
      { keyword: "salah laku", category: "Misconduct" },
      { keyword: "protest", category: "Dissent/Opposition" },
      { keyword: "protes", category: "Dissent/Opposition" },
      { keyword: "walkout", category: "Parliamentary Disruption" },
      { keyword: "keluar dewan", category: "Parliamentary Disruption" },
    ];

    const controversialTopics = new Set<string>();
    controversialPatterns.forEach(({ keyword, category }) => {
      if (transcriptLower.includes(keyword)) {
        controversialTopics.add(category);
      }
    });

    // Detect important bill discussions
    const billPatterns = [
      /rang\s+undang[-\s]undang\s+([a-z\s]+)/gi,
      /bill\s+([a-z\s]+)/gi,
    ];

    billPatterns.forEach(pattern => {
      const matches = transcript.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].trim().length > 5) {
          controversialTopics.add(`Bill: ${match[1].trim().slice(0, 50)}`);
        }
      }
    });

    // Check for policy areas being discussed
    const policyAreas = [
      { keywords: ["economy", "ekonomi", "gdp", "kdnk"], area: "Economic Policy" },
      { keywords: ["education", "pendidikan", "school", "sekolah"], area: "Education Policy" },
      { keywords: ["health", "kesihatan", "hospital"], area: "Healthcare Policy" },
      { keywords: ["environment", "alam sekitar", "climate", "iklim"], area: "Environmental Policy" },
      { keywords: ["security", "keselamatan", "defense", "pertahanan"], area: "Security/Defense" },
    ];

    policyAreas.forEach(({ keywords, area }) => {
      if (keywords.some(kw => transcriptLower.includes(kw))) {
        const count = keywords.reduce((acc, kw) => {
          const matches = transcriptLower.split(kw).length - 1;
          return acc + matches;
        }, 0);

        if (count > 5) {
          controversialTopics.add(area);
        }
      }
    });

    // Generate a concise summary
    let summary: string | undefined;
    if (!record.summary) {
      const topics = record.topics || [];
      const speakerCount = record.speakerStats?.length || 0;
      const sessionDate = new Date(record.sessionDate).toLocaleDateString();

      summary = `Parliamentary session ${record.sessionNumber} on ${sessionDate}. ${speakerCount} MPs participated. `;

      if (topics.length > 0) {
        summary += `Topics discussed: ${topics.slice(0, 3).join(", ")}. `;
      }

      if (controversialTopics.size > 0) {
        summary += `Key issues: ${Array.from(controversialTopics).slice(0, 3).join(", ")}.`;
      }
    }

    return {
      summary,
      controversialTopics: controversialTopics.size > 0 ? Array.from(controversialTopics) : undefined,
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

    if (parameters.analyzeAll !== undefined && typeof parameters.analyzeAll !== "boolean") {
      errors.push("analyzeAll must be a boolean");
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
