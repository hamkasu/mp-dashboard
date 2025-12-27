/**
 * Copyright by Calmic Sdn Bhd
 *
 * MP Report Card Grading Service - PERCENTILE-BASED GRADING
 * Calculates performance grades for MPs using fair, relative ranking system
 *
 * GRADING METHODOLOGY:
 * - Uses percentile ranking instead of absolute thresholds
 * - Each metric is ranked relative to all 221 MPs
 * - Composite score from weighted percentiles
 * - Letter grades: A (90+), B (80-90), C (70-80), D (60-70), F (<60)
 *
 * WEIGHTS:
 * - Attendance: 40%
 * - Participation: 40% (speeches 40%, bills 30%, questions 30%)
 * - Conduct: 15% (inappropriate language 70%, court cases 30%)
 * - Constituency Impact: 5% (currently neutral - poverty data not available for federal MPs)
 */

import { db } from "../db";
import { mps, mpReportCards, legislativeProposals, parliamentaryQuestions, courtCases } from "../../shared/schema";
import { eq, count, desc } from "drizzle-orm";
import {
  calculatePercentiles,
  calculateParticipationPercentiles,
  calculateConductPercentiles,
  calculateFinalScores,
  getLetterGrade,
  type RankableMetric,
} from "../utils/percentile-grading";

export interface GradingWeights {
  attendance: number;      // 40%
  participation: number;   // 40%
  conduct: number;         // 15%
  constituencyImpact: number; // 5%
}

export const DEFAULT_WEIGHTS: GradingWeights = {
  attendance: 0.40,
  participation: 0.40,
  conduct: 0.15,
  constituencyImpact: 0.05,
};

export interface MPMetrics {
  mpId: string;
  attendancePercentage: number;
  totalSpeeches: number;
  averageSpeeches: number;
  billsRaised: number;
  questionsAsked: number;
  inappropriateLanguageCount: number;
  povertyRate: number;
  courtCases: number;
}

export interface CalculatedGrade {
  mpId: string;
  attendanceScore: number;
  participationScore: number;
  conductScore: number;
  constituencyImpactScore: number;
  overallScore: number;
  grade: string;
}

/**
 * Fetch all MP metrics from database
 */
export async function fetchAllMPMetrics(): Promise<MPMetrics[]> {
  const allMps = await db.select({
    mpId: mps.id,
    name: mps.name,
    daysAttended: mps.daysAttended,
    totalParliamentDays: mps.totalParliamentDays,
    totalSpeechInstances: mps.totalSpeechInstances,
    hansardSessionsSpoke: mps.hansardSessionsSpoke,
  }).from(mps);

  const metrics: MPMetrics[] = [];

  for (const mp of allMps) {
    // Calculate attendance percentage
    const attendancePercentage = mp.totalParliamentDays > 0
      ? (mp.daysAttended / mp.totalParliamentDays) * 100
      : 0;

    // Calculate average speeches per session
    const averageSpeeches = mp.hansardSessionsSpoke > 0
      ? Math.round(mp.totalSpeechInstances / mp.hansardSessionsSpoke)
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

    // Poverty rate data is not available in mps table (only in dunMembers for state assembly)
    // Using neutral value (0) for all MPs
    // TODO: If federal constituency poverty data becomes available, fetch it here
    const povertyRate = 0;

    // Count inappropriate language instances from hansard records
    // For now, this needs to be tracked separately - using 0 as default
    // TODO: Implement inappropriate language tracking from hansard analysis
    const inappropriateLanguageCount = 0;

    metrics.push({
      mpId: mp.mpId,
      attendancePercentage,
      totalSpeeches: mp.totalSpeechInstances,
      averageSpeeches,
      billsRaised,
      questionsAsked,
      inappropriateLanguageCount,
      povertyRate,
      courtCases: courtCasesCount,
    });
  }

  return metrics;
}

/**
 * Calculate grades for all MPs using PERCENTILE-BASED RANKING
 * This ensures a fair distribution of grades based on relative performance
 */
export async function calculateAllGrades(
  weights: GradingWeights = DEFAULT_WEIGHTS
): Promise<CalculatedGrade[]> {
  const metrics = await fetchAllMPMetrics();

  if (metrics.length === 0) {
    return [];
  }

  // Prepare data for percentile calculations
  const attendanceMetrics: RankableMetric[] = metrics.map(m => ({
    mpId: m.mpId,
    value: m.attendancePercentage,
  }));

  const speechMetrics: RankableMetric[] = metrics.map(m => ({
    mpId: m.mpId,
    value: m.averageSpeeches, // Use average speeches per session
  }));

  const billMetrics: RankableMetric[] = metrics.map(m => ({
    mpId: m.mpId,
    value: m.billsRaised,
  }));

  const questionMetrics: RankableMetric[] = metrics.map(m => ({
    mpId: m.mpId,
    value: m.questionsAsked,
  }));

  const inappropriateMetrics: RankableMetric[] = metrics.map(m => ({
    mpId: m.mpId,
    value: m.inappropriateLanguageCount,
  }));

  const courtCaseMetrics: RankableMetric[] = metrics.map(m => ({
    mpId: m.mpId,
    value: m.courtCases,
  }));

  const povertyMetrics: RankableMetric[] = metrics.map(m => ({
    mpId: m.mpId,
    value: m.povertyRate,
  }));

  // Calculate percentile scores for each category
  const attendancePercentiles = calculatePercentiles(attendanceMetrics, false);

  const participationPercentiles = calculateParticipationPercentiles(
    speechMetrics,
    billMetrics,
    questionMetrics,
    { speeches: 0.4, bills: 0.3, questions: 0.3 }
  );

  const conductPercentiles = calculateConductPercentiles(
    inappropriateMetrics,
    courtCaseMetrics,
    { inappropriateLanguage: 0.7, courtCases: 0.3 }
  );

  const constituencyPercentiles = calculatePercentiles(povertyMetrics, true); // Inverted: lower poverty = better

  // Calculate final composite scores
  const finalScores = calculateFinalScores(
    attendancePercentiles,
    participationPercentiles,
    conductPercentiles,
    constituencyPercentiles,
    weights
  );

  // Build result array with all scores
  const grades: CalculatedGrade[] = metrics.map(metric => {
    const attendanceScore = Math.round(attendancePercentiles.get(metric.mpId) || 0);
    const participationScore = Math.round(participationPercentiles.get(metric.mpId) || 0);
    const conductScore = Math.round(conductPercentiles.get(metric.mpId) || 0);
    const constituencyImpactScore = Math.round(constituencyPercentiles.get(metric.mpId) || 50);
    const overallScore = finalScores.get(metric.mpId) || 0;
    const grade = getLetterGrade(overallScore);

    return {
      mpId: metric.mpId,
      attendanceScore,
      participationScore,
      conductScore,
      constituencyImpactScore,
      overallScore,
      grade,
    };
  });

  return grades;
}

/**
 * Update or insert report cards for all MPs
 */
export async function updateAllReportCards(): Promise<{ updated: number; created: number }> {
  const metrics = await fetchAllMPMetrics();
  const grades = await calculateAllGrades();

  let updated = 0;
  let created = 0;

  for (let i = 0; i < grades.length; i++) {
    const grade = grades[i];
    const metric = metrics[i];

    // Check if report card exists
    const existing = await db
      .select()
      .from(mpReportCards)
      .where(eq(mpReportCards.mpId, grade.mpId))
      .limit(1);

    const reportCardData = {
      mpId: grade.mpId,
      attendanceScore: grade.attendanceScore,
      participationScore: grade.participationScore,
      conductScore: grade.conductScore,
      constituencyImpactScore: grade.constituencyImpactScore,
      overallScore: grade.overallScore,
      grade: grade.grade,
      totalSpeeches: metric.totalSpeeches,
      averageSpeeches: metric.averageSpeeches,
      billsRaised: metric.billsRaised,
      questionsAsked: metric.questionsAsked,
      inappropriateLanguageCount: metric.inappropriateLanguageCount,
      povertyRate: 0, // Poverty rate not available for federal MPs (only for state DUN members)
      updatedAt: new Date(),
    };

    if (existing.length > 0) {
      // Update existing
      await db
        .update(mpReportCards)
        .set(reportCardData)
        .where(eq(mpReportCards.mpId, grade.mpId));
      updated++;
    } else {
      // Insert new
      await db.insert(mpReportCards).values(reportCardData);
      created++;
    }
  }

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

  // Calculate average score
  const averageScore = allCards.reduce((sum, card) => sum + card.overallScore, 0) / allCards.length;

  // Count grade distribution
  const gradeDistribution = allCards.reduce((dist, card) => {
    dist[card.grade as keyof typeof dist] = (dist[card.grade as keyof typeof dist] || 0) + 1;
    return dist;
  }, { A: 0, B: 0, C: 0, D: 0, F: 0 });

  // Calculate average scores
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
