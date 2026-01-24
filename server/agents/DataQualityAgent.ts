/**
 * Data Quality Agent
 * Autonomously resolves data quality issues like unmatched speakers
 * Copyright by Calmic Sdn Bhd
 */

import { BaseAgent } from "./BaseAgent";
import type { AgentType, AgentExecutionContext, AgentResult, ProgressCallback } from "./types";
import { db } from "../db";
import { unmatchedSpeakers, mps, speakerMappings } from "../../shared/schema";
import { eq, and, isNull } from "drizzle-orm";

export class DataQualityAgent extends BaseAgent {
  readonly type: AgentType = "data-quality";
  readonly name = "Data Quality Agent";
  readonly description = "Autonomously identifies and resolves data quality issues including unmatched speakers, missing data, and inconsistencies";

  protected async run(
    context: AgentExecutionContext,
    onProgress?: ProgressCallback
  ): Promise<AgentResult> {
    const findings: any[] = [];
    let apiCalls = 0;
    let dataUpdated = false;
    let resolvedCount = 0;

    onProgress?.({
      stage: "fetching",
      progress: 10,
      message: "Fetching unmatched speakers...",
    });

    // Get all unmatched speakers that haven't been mapped
    const unmatchedSpeakerRecords = await db.query.unmatchedSpeakers.findMany({
      where: and(
        eq(unmatchedSpeakers.isMapped, false),
        isNull(unmatchedSpeakers.mappedMpId)
      ),
      limit: context.parameters.limit || 100,
    });

    if (unmatchedSpeakerRecords.length === 0) {
      return {
        success: true,
        summary: "No unmatched speakers found to resolve",
        findings: [],
        apiCalls: 0,
        dataUpdated: false,
      };
    }

    onProgress?.({
      stage: "matching",
      progress: 20,
      message: `Found ${unmatchedSpeakerRecords.length} unmatched speakers to resolve`,
    });

    // Get all MPs for fuzzy matching
    const allMps = await db.query.mps.findMany();

    // Try to resolve each unmatched speaker
    for (let i = 0; i < unmatchedSpeakerRecords.length; i++) {
      const speaker = unmatchedSpeakerRecords[i];
      const progress = 20 + (70 * (i + 1)) / unmatchedSpeakerRecords.length;

      onProgress?.({
        stage: "matching",
        progress: Math.round(progress),
        message: `Resolving speaker ${i + 1}/${unmatchedSpeakerRecords.length}: ${speaker.extractedName}`,
      });

      try {
        // Attempt fuzzy matching
        const match = this.findBestMatch(speaker, allMps);

        if (match && match.confidence >= 80) {
          // High confidence match - auto-resolve
          await db
            .update(unmatchedSpeakers)
            .set({
              isMapped: true,
              mappedMpId: match.mpId,
              mappedAt: new Date(),
            })
            .where(eq(unmatchedSpeakers.id, speaker.id));

          // Create speaker mapping record
          await db.insert(speakerMappings).values({
            unmatchedSpeakerId: speaker.id,
            mpId: match.mpId,
            mappingType: "auto-fuzzy",
            confidence: match.confidence,
            notes: `Automatically matched by Data Quality Agent`,
            createdBy: "data-quality-agent",
          });

          resolvedCount++;
          dataUpdated = true;

          findings.push(
            this.createFinding(
              "insight",
              "info",
              `Auto-resolved Speaker: ${speaker.extractedName}`,
              `Successfully matched "${speaker.extractedName}" to MP "${match.mpName}" with ${match.confidence}% confidence`,
              {
                relatedMpIds: [match.mpId],
                evidence: {
                  extractedName: speaker.extractedName,
                  matchedName: match.mpName,
                  confidence: match.confidence,
                  constituency: speaker.extractedConstituency,
                },
              }
            )
          );
        } else if (match && match.confidence >= 50) {
          // Medium confidence - suggest manual review
          await db
            .update(unmatchedSpeakers)
            .set({
              suggestedMpIds: [match.mpId],
            })
            .where(eq(unmatchedSpeakers.id, speaker.id));

          findings.push(
            this.createFinding(
              "suggestion",
              "low",
              `Possible Match Needs Review: ${speaker.extractedName}`,
              `Found possible match for "${speaker.extractedName}" → "${match.mpName}" (${match.confidence}% confidence). Manual review recommended.`,
              {
                relatedMpIds: [match.mpId],
                evidence: {
                  extractedName: speaker.extractedName,
                  matchedName: match.mpName,
                  confidence: match.confidence,
                },
                suggestedAction: "Review and confirm match in admin panel",
              }
            )
          );
        } else {
          // Low confidence - flag for attention
          findings.push(
            this.createFinding(
              "warning",
              "low",
              `Unable to Match Speaker: ${speaker.extractedName}`,
              `Could not find confident match for "${speaker.extractedName}"${speaker.extractedConstituency ? ` from ${speaker.extractedConstituency}` : ""}`,
              {
                evidence: {
                  extractedName: speaker.extractedName,
                  constituency: speaker.extractedConstituency,
                  rawHeaderText: speaker.rawHeaderText,
                },
                suggestedAction: "Manual intervention required - check if this is a new MP or data entry error",
              }
            )
          );
        }
      } catch (error) {
        console.error(`Error matching speaker ${speaker.id}:`, error);
      }
    }

    onProgress?.({
      stage: "finalizing",
      progress: 95,
      message: "Generating quality report...",
    });

    const summary = `Processed ${unmatchedSpeakerRecords.length} unmatched speakers. Auto-resolved ${resolvedCount} with high confidence. Generated ${findings.length} findings.`;

    return {
      success: true,
      summary,
      findings,
      data: {
        totalProcessed: unmatchedSpeakerRecords.length,
        autoResolved: resolvedCount,
        needsReview: findings.filter((f) => f.type === "suggestion").length,
        unresolved: findings.filter((f) => f.type === "warning").length,
      },
      apiCalls,
      dataUpdated,
    };
  }

  /**
   * Find best matching MP for an unmatched speaker
   */
  private findBestMatch(
    speaker: any,
    allMps: any[]
  ): { mpId: string; mpName: string; confidence: number } | null {
    let bestMatch: { mpId: string; mpName: string; confidence: number } | null = null;
    let bestScore = 0;

    const extractedName = speaker.extractedName.toLowerCase().trim();
    const extractedConstituency = speaker.extractedConstituency?.toLowerCase().trim();

    for (const mp of allMps) {
      let score = 0;

      // Name matching (weighted heavily)
      const mpName = mp.name.toLowerCase();
      if (mpName === extractedName) {
        score += 70; // Exact match
      } else if (mpName.includes(extractedName) || extractedName.includes(mpName)) {
        score += 50; // Partial match
      } else {
        // Check for name similarity (simple word overlap)
        const extractedWords = extractedName.split(/\s+/);
        const mpWords = mpName.split(/\s+/);
        const commonWords = extractedWords.filter((word) => mpWords.includes(word));
        score += commonWords.length * 15;
      }

      // Constituency matching (if available)
      if (extractedConstituency && mp.constituency) {
        const mpConstituency = mp.constituency.toLowerCase();
        if (mpConstituency === extractedConstituency) {
          score += 30; // Exact constituency match
        } else if (mpConstituency.includes(extractedConstituency) || extractedConstituency.includes(mpConstituency)) {
          score += 20; // Partial constituency match
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          mpId: mp.id,
          mpName: mp.name,
          confidence: Math.min(score, 100),
        };
      }
    }

    return bestMatch;
  }

  validateParameters(parameters: Record<string, any>): {
    valid: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];

    if (parameters.limit && (typeof parameters.limit !== "number" || parameters.limit < 1 || parameters.limit > 500)) {
      errors.push("limit must be a number between 1 and 500");
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
