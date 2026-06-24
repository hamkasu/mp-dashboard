/**
 * Data Quality Agent - Enhanced Version
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
    let suggestionCount = 0;

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
      limit: context.parameters.limit || 50,
      orderBy: (speakers, { desc }) => [desc(speakers.createdAt)],
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

    // Create a map of constituencies for faster lookup
    const constituencyMap = new Map<string, typeof allMps>();
    allMps.forEach(mp => {
      const key = this.normalizeConstituency(mp.constituency);
      if (!constituencyMap.has(key)) {
        constituencyMap.set(key, []);
      }
      constituencyMap.get(key)!.push(mp);
    });

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
        // Attempt intelligent fuzzy matching
        const match = this.findBestMatch(speaker, allMps, constituencyMap);

        if (match && match.confidence >= 85) {
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
            notes: `Automatically matched by Data Quality Agent. Reason: ${match.reason}`,
            createdBy: "data-quality-agent",
          });

          resolvedCount++;
          dataUpdated = true;

          findings.push(
            this.createFinding(
              "insight",
              "info",
              `Auto-resolved: ${speaker.extractedName}`,
              `Successfully matched "${speaker.extractedName}" to MP "${match.mpName}" with ${match.confidence}% confidence`,
              {
                relatedMpIds: [match.mpId],
                evidence: {
                  extractedName: speaker.extractedName,
                  matchedName: match.mpName,
                  confidence: match.confidence,
                  constituency: speaker.extractedConstituency,
                  matchReason: match.reason,
                },
              }
            )
          );
        } else if (match && match.confidence >= 60) {
          // Medium confidence - suggest manual review
          await db
            .update(unmatchedSpeakers)
            .set({
              suggestedMpIds: [match.mpId],
            })
            .where(eq(unmatchedSpeakers.id, speaker.id));

          suggestionCount++;

          findings.push(
            this.createFinding(
              "suggestion",
              "low",
              `Possible Match: ${speaker.extractedName}`,
              `Found possible match for "${speaker.extractedName}" → "${match.mpName}" (${match.confidence}% confidence). Manual review recommended.`,
              {
                relatedMpIds: [match.mpId],
                evidence: {
                  extractedName: speaker.extractedName,
                  matchedName: match.mpName,
                  confidence: match.confidence,
                  matchReason: match.reason,
                },
                suggestedAction: "Review and confirm match in Hansard Admin panel under Unmatched Speakers",
              }
            )
          );
        } else if (speaker.extractedName && speaker.extractedName.length > 5) {
          // Only flag meaningful names that couldn't be matched
          findings.push(
            this.createFinding(
              "warning",
              "low",
              `Unable to Match: ${speaker.extractedName}`,
              `Could not find confident match for "${speaker.extractedName}"${speaker.extractedConstituency ? ` from ${speaker.extractedConstituency}` : ""}`,
              {
                evidence: {
                  extractedName: speaker.extractedName,
                  constituency: speaker.extractedConstituency,
                  rawHeaderText: speaker.rawHeaderText,
                  bestMatch: match ? { name: match.mpName, confidence: match.confidence } : null,
                },
                suggestedAction: "Manual intervention required - check if this is a new MP, senator, or data entry error",
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

    const summary = `Processed ${unmatchedSpeakerRecords.length} unmatched speakers. Auto-resolved ${resolvedCount} (${Math.round(resolvedCount/unmatchedSpeakerRecords.length*100)}%). Suggested ${suggestionCount} for review.`;

    return {
      success: true,
      summary,
      findings,
      data: {
        totalProcessed: unmatchedSpeakerRecords.length,
        autoResolved: resolvedCount,
        needsReview: suggestionCount,
        unresolved: unmatchedSpeakerRecords.length - resolvedCount - suggestionCount,
        resolutionRate: Math.round((resolvedCount / unmatchedSpeakerRecords.length) * 100),
      },
      apiCalls,
      dataUpdated,
    };
  }

  /**
   * Enhanced fuzzy matching with constituency awareness
   */
  private findBestMatch(
    speaker: any,
    allMps: any[],
    constituencyMap: Map<string, any[]>
  ): { mpId: string; mpName: string; confidence: number; reason: string } | null {
    let bestMatch: { mpId: string; mpName: string; confidence: number; reason: string } | null = null;
    let bestScore = 0;

    const extractedName = this.normalizeName(speaker.extractedName);
    const extractedConstituency = speaker.extractedConstituency
      ? this.normalizeConstituency(speaker.extractedConstituency)
      : null;

    // Strategy 1: If constituency is provided, search within that constituency first
    if (extractedConstituency) {
      const constituencyMps = constituencyMap.get(extractedConstituency) || [];
      for (const mp of constituencyMps) {
        const score = this.calculateNameMatchScore(extractedName, this.normalizeName(mp.name));
        if (score > bestScore) {
          bestScore = score + 30; // Bonus for constituency match
          bestMatch = {
            mpId: mp.id,
            mpName: mp.name,
            confidence: Math.min(Math.round(bestScore), 100),
            reason: `Name match in correct constituency (${mp.constituency})`,
          };
        }
      }
    }

    // Strategy 2: Full search across all MPs
    for (const mp of allMps) {
      const mpName = this.normalizeName(mp.name);
      let score = this.calculateNameMatchScore(extractedName, mpName);

      // Constituency match bonus (if available)
      if (extractedConstituency && this.normalizeConstituency(mp.constituency) === extractedConstituency) {
        score += 25;
      }

      if (score > bestScore) {
        bestScore = score;
        let reason = "Name similarity";
        if (extractedConstituency && this.normalizeConstituency(mp.constituency) === extractedConstituency) {
          reason = `Strong name match + constituency confirmation`;
        }

        bestMatch = {
          mpId: mp.id,
          mpName: mp.name,
          confidence: Math.min(Math.round(score), 100),
          reason,
        };
      }
    }

    return bestMatch;
  }

  /**
   * Calculate name match score using multiple algorithms
   */
  private calculateNameMatchScore(name1: string, name2: string): number {
    // Exact match
    if (name1 === name2) return 95;

    // Contains match
    if (name1.includes(name2) || name2.includes(name1)) return 80;

    // Word-based matching
    const words1 = name1.split(/\s+/).filter(w => w.length > 2);
    const words2 = name2.split(/\s+/).filter(w => w.length > 2);

    if (words1.length === 0 || words2.length === 0) return 0;

    // Calculate word overlap
    const commonWords = words1.filter(w => words2.includes(w));
    const wordOverlapScore = (commonWords.length / Math.max(words1.length, words2.length)) * 70;

    // Levenshtein distance for overall similarity
    const levenshteinScore = this.levenshteinSimilarity(name1, name2) * 50;

    return Math.max(wordOverlapScore, levenshteinScore);
  }

  /**
   * Calculate Levenshtein similarity (0-1)
   */
  private levenshteinSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Normalize name for comparison
   */
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .replace(/\b(yang berhormat|yb|dato|datin|tuan|puan|encik|cik|dr|tan sri|datuk|seri)\b/g, '')
      .trim();
  }

  /**
   * Normalize constituency for comparison
   */
  private normalizeConstituency(constituency: string): string {
    return constituency
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '');
  }

  validateParameters(parameters: Record<string, any>): {
    valid: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];

    if (parameters.limit && (typeof parameters.limit !== "number" || parameters.limit < 1 || parameters.limit > 200)) {
      errors.push("limit must be a number between 1 and 200");
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
