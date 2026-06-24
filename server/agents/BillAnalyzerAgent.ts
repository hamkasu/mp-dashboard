/**
 * Bill Impact Analysis Agent
 * Autonomously analyzes bills and generates impact assessments
 * Copyright by Calmic Sdn Bhd
 */

import { BaseAgent } from "./BaseAgent";
import type { AgentType, AgentExecutionContext, AgentResult, ProgressCallback } from "./types";
import { db } from "../db";
import { bills, billPdfFiles, billImpacts } from "../../shared/schema";
import { eq, desc, isNull } from "drizzle-orm";

export class BillAnalyzerAgent extends BaseAgent {
  readonly type: AgentType = "bill-analyzer";
  readonly name = "Bill Impact Analyzer Agent";
  readonly description = "Autonomously analyzes parliamentary bills to identify potential impacts, affected groups, and key implications";

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
      message: "Fetching bills for analysis...",
    });

    // Determine which bills to analyze
    let billsToAnalyze;

    if (context.targetId) {
      // Analyze specific bill
      const bill = await db.query.bills.findFirst({
        where: eq(bills.id, context.targetId),
      });

      if (!bill) {
        throw new Error(`Bill ${context.targetId} not found`);
      }

      billsToAnalyze = [bill];
    } else {
      // Analyze recent bills without impact analysis
      const limit = context.parameters.limit || 5;

      // Find bills without existing impact analysis
      const recentBills = await db.query.bills.findMany({
        orderBy: desc(bills.createdAt),
        limit: limit * 2, // Get more to filter
      });

      // Filter out bills that already have impact analysis
      const existingImpacts = await db.query.billImpacts.findMany();
      const billsWithImpacts = new Set(existingImpacts.map((impact) => impact.billId));

      billsToAnalyze = recentBills
        .filter((bill) => !billsWithImpacts.has(bill.id))
        .slice(0, limit);
    }

    if (billsToAnalyze.length === 0) {
      return {
        success: true,
        summary: "No new bills found to analyze",
        findings: [],
        apiCalls: 0,
        dataUpdated: false,
      };
    }

    onProgress?.({
      stage: "analyzing",
      progress: 20,
      message: `Found ${billsToAnalyze.length} bills to analyze`,
    });

    // Analyze each bill
    for (let i = 0; i < billsToAnalyze.length; i++) {
      const bill = billsToAnalyze[i];
      const billProgress = 20 + (70 * (i + 1)) / billsToAnalyze.length;

      onProgress?.({
        stage: "analyzing",
        progress: Math.round(billProgress),
        message: `Analyzing: ${bill.title} (${i + 1}/${billsToAnalyze.length})`,
      });

      try {
        // Analyze the bill for impact
        const analysis = await this.analyzeBill(bill);
        apiCalls++;

        // Create impact record
        await db.insert(billImpacts).values({
          billId: bill.id,
          summary: analysis.summary,
          affectedGroups: analysis.affectedGroups,
          impactType: analysis.impactType,
          keyPoints: analysis.keyPoints,
          generatedBy: "bill-analyzer-agent",
        });

        dataUpdated = true;

        // Generate findings based on analysis
        if (analysis.impactType === "negative" || analysis.impactType === "mixed") {
          findings.push(
            this.createFinding(
              "warning",
              analysis.impactType === "negative" ? "high" : "medium",
              `Potential ${analysis.impactType} Impact: ${bill.title}`,
              `Bill analysis indicates ${analysis.impactType} impact. Affected groups: ${analysis.affectedGroups.join(", ")}`,
              {
                relatedBillIds: [bill.id],
                evidence: {
                  billNumber: bill.billNumber,
                  summary: analysis.summary,
                  keyPoints: analysis.keyPoints,
                },
                suggestedAction: "Review bill details and consider stakeholder consultation",
              }
            )
          );
        }

        if (analysis.affectedGroups.length > 5) {
          findings.push(
            this.createFinding(
              "insight",
              "medium",
              `Wide-Reaching Bill: ${bill.title}`,
              `This bill affects ${analysis.affectedGroups.length} different groups, indicating broad societal impact`,
              {
                relatedBillIds: [bill.id],
                evidence: {
                  affectedGroups: analysis.affectedGroups,
                },
              }
            )
          );
        }
      } catch (error) {
        console.error(`Error analyzing bill ${bill.id}:`, error);
        findings.push(
          this.createFinding(
            "error",
            "low",
            `Failed to Analyze: ${bill.title}`,
            error instanceof Error ? error.message : "Unknown error",
            {
              relatedBillIds: [bill.id],
            }
          )
        );
      }
    }

    onProgress?.({
      stage: "finalizing",
      progress: 95,
      message: "Generating final report...",
    });

    const summary = `Analyzed ${billsToAnalyze.length} bills. Generated ${findings.length} insights and warnings.`;

    return {
      success: true,
      summary,
      findings,
      data: {
        billsAnalyzed: billsToAnalyze.length,
        impactsGenerated: billsToAnalyze.length,
      },
      tokensUsed,
      apiCalls,
      dataUpdated,
    };
  }

  /**
   * Analyze a single bill for impacts
   */
  private async analyzeBill(bill: any): Promise<{
    summary: string;
    affectedGroups: string[];
    impactType: "positive" | "negative" | "mixed" | "neutral";
    keyPoints: string[];
  }> {
    const title = bill.title.toLowerCase();

    // Simple keyword-based analysis (in production, this would use AI)
    const affectedGroups: string[] = [];
    const keyPoints: string[] = [];
    let impactType: "positive" | "negative" | "mixed" | "neutral" = "neutral";

    // Identify affected groups based on keywords
    if (title.includes("employment") || title.includes("worker") || title.includes("labour")) {
      affectedGroups.push("Workers", "Employers", "Labor unions");
    }
    if (title.includes("education") || title.includes("school") || title.includes("student")) {
      affectedGroups.push("Students", "Teachers", "Educational institutions");
    }
    if (title.includes("health") || title.includes("medical") || title.includes("hospital")) {
      affectedGroups.push("Patients", "Healthcare workers", "Medical institutions");
    }
    if (title.includes("tax") || title.includes("revenue")) {
      affectedGroups.push("Taxpayers", "Businesses", "Government revenue");
    }
    if (title.includes("environment") || title.includes("pollution") || title.includes("climate")) {
      affectedGroups.push("Environmental groups", "Industries", "General public");
    }
    if (title.includes("technology") || title.includes("digital") || title.includes("cyber")) {
      affectedGroups.push("Tech companies", "Internet users", "Digital economy");
    }
    if (title.includes("corruption") || title.includes("transparency") || title.includes("accountability")) {
      affectedGroups.push("Government agencies", "Public officials", "Watchdog organizations");
      impactType = "positive";
    }

    // Default affected group if none identified
    if (affectedGroups.length === 0) {
      affectedGroups.push("General public");
    }

    // Generate key points
    keyPoints.push(`Bill title: ${bill.title}`);
    if (bill.billNumber) {
      keyPoints.push(`Bill number: ${bill.billNumber}`);
    }
    keyPoints.push(`Status: ${bill.status}`);
    keyPoints.push(`Affects ${affectedGroups.length} primary stakeholder groups`);

    // Determine impact type based on keywords
    const positiveKeywords = ["improvement", "protection", "benefit", "support", "enhance", "strengthen"];
    const negativeKeywords = ["restriction", "prohibition", "penalty", "ban", "reduce", "eliminate"];

    const hasPositive = positiveKeywords.some((kw) => title.includes(kw));
    const hasNegative = negativeKeywords.some((kw) => title.includes(kw));

    if (hasPositive && hasNegative) {
      impactType = "mixed";
    } else if (hasPositive) {
      impactType = "positive";
    } else if (hasNegative) {
      impactType = "negative";
    }

    const summary = `This bill (${bill.billNumber || "unnumbered"}) titled "${bill.title}" is expected to have ${impactType} impact, primarily affecting ${affectedGroups.slice(0, 3).join(", ")}${affectedGroups.length > 3 ? " and others" : ""}.`;

    return {
      summary,
      affectedGroups,
      impactType,
      keyPoints,
    };
  }

  validateParameters(parameters: Record<string, any>): {
    valid: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];

    if (parameters.limit && (typeof parameters.limit !== "number" || parameters.limit < 1 || parameters.limit > 20)) {
      errors.push("limit must be a number between 1 and 20");
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
