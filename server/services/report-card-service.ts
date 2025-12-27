/**
 * Copyright by Calmic Sdn Bhd
 *
 * MP Report Card Grading Service - SIMPLIFIED ROBUST VERSION
 * Calculates performance grades using simple, debuggable percentile ranking
 */

import { db } from "../db";
import { mps, mpReportCards, legislativeProposals, parliamentaryQuestions, courtCases } from "../../shared/schema";
import { eq, count, desc } from "drizzle-orm";
import { calculateGrades, type MPGradeData } from "../utils/percentile-grading-v2";

export interface GradingWeights {
  attendance: number;
  participation: number;
  conduct: number;
  constituencyImpact: number;
}

export const DEFAULT_WEIGHTS: GradingWeights = {
  attendance: 0.40,
  participation: 0.40,
  conduct: 0.15,
  constituencyImpact: 0.05,
};

/**
 * Fetch all MP metrics from database
 */
export async function fetchAllMPMetrics() {
  console.log("[Report Cards] Fetching MP data from database...");

  const allMps = await db.select({
    mpId: mps.id,
    name: mps.name,
    daysAttended: mps.daysAttended,
    totalParliamentDays: mps.totalParliamentDays,
    totalSpeechInstances: mps.totalSpeechInstances,
    hansardSessionsSpoke: mps.hansardSessionsSpoke,
  }).from(mps);

  console.log(`[Report Cards] Found ${allMps.length} MPs`);

  const mpsData: Array<{
    mpId: string;
    name: string;
    attendancePercentage: number;
    totalSpeeches: number;
    averageSpeeches: number;
    billsRaised: number;
    questionsAsked: number;
    courtCases: number;
    inappropriateLanguage: number;
  }> = [];

  for (const mp of allMps) {
    // Calculate attendance percentage
    const attendancePercentage = mp.totalParliamentDays > 0
      ? (mp.daysAttended / mp.totalParliamentDays) * 100
      : 0;

    // Calculate average speeches per session
    const averageSpeeches = mp.hansardSessionsSpoke > 0
      ? mp.totalSpeechInstances / mp.hansardSessionsSpoke
      : 0;

    // Count bills raised
    const billsResult = await db
      .select({ count: count() })
      .from(legislativeProposals)
      .where(eq(legislativeProposals.mpId, mp.mpId));
    const billsRaised = billsResult[0]?.count || 0;

    // Count parliamentary questions
    const questionsResult = await db
      .select({ count: count() })
      .from(parliamentaryQuestions)
      .where(eq(parliamentaryQuestions.mpId, mp.mpId));
    const questionsAsked = questionsResult[0]?.count || 0;

    // Count court cases
    const courtCasesResult = await db
      .select({ count: count() })
      .from(courtCases)
      .where(eq(courtCases.mpId, mp.mpId));
    const courtCasesCount = courtCasesResult[0]?.count || 0;

    // Inappropriate language count (not yet tracked)
    const inappropriateLanguage = 0;

    mpsData.push({
      mpId: mp.mpId,
      name: mp.name,
      attendancePercentage,
      totalSpeeches: mp.totalSpeechInstances,
      averageSpeeches,
      billsRaised,
      questionsAsked,
      courtCases: courtCasesCount,
      inappropriateLanguage,
    });
  }

  console.log("[Report Cards] Calculated metrics for all MPs");
  console.log(`[Report Cards] Sample: ${mpsData[0].name} - ${mpsData[0].attendancePercentage.toFixed(1)}% attendance, ${mpsData[0].averageSpeeches.toFixed(1)} avg speeches`);

  return mpsData;
}

/**
 * Calculate grades for all MPs
 */
export async function calculateAllGrades(): Promise<MPGradeData[]> {
  console.log("[Report Cards] Starting grade calculation...");

  const mpsData = await fetchAllMPMetrics();
  const grades = calculateGrades(mpsData);

  console.log(`[Report Cards] Calculated grades for ${grades.length} MPs`);

  return grades;
}

/**
 * Update or insert report cards for all MPs
 */
export async function updateAllReportCards(): Promise<{ updated: number; created: number }> {
  console.log("[Report Cards] Updating report cards in database...");

  const mpsData = await fetchAllMPMetrics();
  const grades = calculateGrades(mpsData);

  let updated = 0;
  let created = 0;

  for (let i = 0; i < grades.length; i++) {
    const grade = grades[i];
    const mpData = mpsData[i];

    // Verify mpId matches
    if (grade.mpId !== mpData.mpId) {
      console.error(`[Report Cards] ERROR: MP ID mismatch at index ${i}!`);
      console.error(`  Grade mpId: ${grade.mpId}`);
      console.error(`  MP Data mpId: ${mpData.mpId}`);
      continue;
    }

    // Check if report card exists
    const existing = await db
      .select()
      .from(mpReportCards)
      .where(eq(mpReportCards.mpId, grade.mpId))
      .limit(1);

    const reportCardData = {
      mpId: grade.mpId,
      attendanceScore: grade.attendancePercentile,
      participationScore: grade.participationPercentile,
      conductScore: grade.conductPercentile,
      constituencyImpactScore: grade.constituencyPercentile,
      overallScore: grade.overallScore,
      grade: grade.grade,
      totalSpeeches: mpData.totalSpeeches,
      averageSpeeches: Math.round(mpData.averageSpeeches),
      billsRaised: mpData.billsRaised,
      questionsAsked: mpData.questionsAsked,
      inappropriateLanguageCount: mpData.inappropriateLanguage,
      povertyRate: 0,
      updatedAt: new Date(),
    };

    // Debug first few records
    if (i < 3) {
      console.log(`[Report Cards] Saving MP ${i + 1}:`, {
        name: mpData.name.substring(0, 20),
        overallScore: grade.overallScore,
        grade: grade.grade,
        attendance: grade.attendancePercentile,
        participation: grade.participationPercentile
      });
    }

    if (existing.length > 0) {
      await db
        .update(mpReportCards)
        .set(reportCardData)
        .where(eq(mpReportCards.mpId, grade.mpId));
      updated++;
    } else {
      await db.insert(mpReportCards).values(reportCardData);
      created++;
    }
  }

  console.log(`[Report Cards] Update complete: ${updated} updated, ${created} created`);

  return { updated, created };
}

/**
 * Get report cards with MP details
 */
export async function getReportCardsWithDetails() {
  const results = await db
    .select({
      reportCard: mpReportCards,
      mp: mps,
    })
    .from(mpReportCards)
    .innerJoin(mps, eq(mpReportCards.mpId, mps.id))
    .orderBy(desc(mpReportCards.overallScore));

  return results.map(r => ({
    ...r.reportCard,
    mp: r.mp,
  }));
}

/**
 * Get aggregate statistics
 */
export async function getAggregateStats() {
  const allCards = await db.select().from(mpReportCards);

  if (allCards.length === 0) {
    return {
      totalMPs: 0,
      averageGrade: 0,
      gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 },
      averageScores: {
        attendance: 0,
        participation: 0,
        conduct: 0,
        constituencyImpact: 0,
        overall: 0,
      },
    };
  }

  const averageScore = allCards.reduce((sum, card) => sum + card.overallScore, 0) / allCards.length;

  const gradeDistribution = allCards.reduce((dist, card) => {
    dist[card.grade as keyof typeof dist] = (dist[card.grade as keyof typeof dist] || 0) + 1;
    return dist;
  }, { A: 0, B: 0, C: 0, D: 0, F: 0 });

  const averageScores = {
    attendance: Math.round(allCards.reduce((sum, card) => sum + card.attendanceScore, 0) / allCards.length),
    participation: Math.round(allCards.reduce((sum, card) => sum + card.participationScore, 0) / allCards.length),
    conduct: Math.round(allCards.reduce((sum, card) => sum + card.conductScore, 0) / allCards.length),
    constituencyImpact: Math.round(allCards.reduce((sum, card) => sum + card.constituencyImpactScore, 0) / allCards.length),
    overall: Math.round(averageScore),
  };

  return {
    totalMPs: allCards.length,
    averageGrade: Math.round(averageScore),
    gradeDistribution,
    averageScores,
  };
}
