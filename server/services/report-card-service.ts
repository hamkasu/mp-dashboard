/**
 * Copyright by Calmic Sdn Bhd
 *
 * MP Report Card Grading Service
 * Calculates performance grades for MPs based on weighted metrics
 */

import { db } from "../db";
import { mps, mpReportCards, legislativeProposals, parliamentaryQuestions, courtCases } from "../../shared/schema";
import { eq, count, sql, and, desc } from "drizzle-orm";

export interface GradingWeights {
  attendance: number;      // 40%
  participation: number;   // 30%
  conduct: number;         // 20%
  constituencyImpact: number; // 10%
}

export const DEFAULT_WEIGHTS: GradingWeights = {
  attendance: 0.40,
  participation: 0.30,
  conduct: 0.20,
  constituencyImpact: 0.10,
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
 * Calculate letter grade from numerical score
 */
export function getLetterGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Normalize a value to 0-100 scale
 */
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 100;
  const normalized = ((value - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, normalized));
}

/**
 * Calculate attendance score (0-100)
 * Based on attendance percentage
 */
function calculateAttendanceScore(attendancePercentage: number): number {
  return Math.min(100, attendancePercentage);
}

/**
 * Calculate participation score (0-100)
 * Based on speeches, bills raised, and questions asked
 */
function calculateParticipationScore(
  totalSpeeches: number,
  billsRaised: number,
  questionsAsked: number,
  maxSpeeches: number,
  maxBills: number,
  maxQuestions: number
): number {
  const speechScore = normalize(totalSpeeches, 0, maxSpeeches);
  const billScore = normalize(billsRaised, 0, maxBills);
  const questionScore = normalize(questionsAsked, 0, maxQuestions);

  // Weighted average within participation
  return (speechScore * 0.4) + (billScore * 0.3) + (questionScore * 0.3);
}

/**
 * Calculate conduct score (0-100)
 * Lower inappropriate language count = higher score
 * Court cases also reduce score
 */
function calculateConductScore(
  inappropriateLanguageCount: number,
  courtCasesCount: number,
  maxInappropriate: number,
  maxCourtCases: number
): number {
  // Inverse scoring - fewer incidents = better score
  const inappropriateScore = inappropriateLanguageCount === 0
    ? 100
    : 100 - normalize(inappropriateLanguageCount, 0, maxInappropriate);

  const courtCaseScore = courtCasesCount === 0
    ? 100
    : 100 - normalize(courtCasesCount, 0, maxCourtCases);

  // Weighted average
  return (inappropriateScore * 0.7) + (courtCaseScore * 0.3);
}

/**
 * Calculate constituency impact score (0-100)
 * Lower poverty rate = higher score
 */
function calculateConstituencyImpactScore(povertyRate: number, maxPoverty: number): number {
  if (povertyRate === 0 || maxPoverty === 0) return 50; // Neutral if no data

  // Inverse scoring - lower poverty = better score
  return 100 - normalize(povertyRate, 0, maxPoverty);
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

    // Get poverty rate (placeholder - would need to be from constituency data)
    const povertyRate = 0; // TODO: Implement poverty rate lookup

    metrics.push({
      mpId: mp.mpId,
      attendancePercentage,
      totalSpeeches: mp.totalSpeechInstances,
      averageSpeeches,
      billsRaised,
      questionsAsked,
      inappropriateLanguageCount: 0, // TODO: Implement inappropriate language tracking
      povertyRate,
      courtCases: courtCasesCount,
    });
  }

  return metrics;
}

/**
 * Calculate grades for all MPs
 */
export async function calculateAllGrades(
  weights: GradingWeights = DEFAULT_WEIGHTS
): Promise<CalculatedGrade[]> {
  const metrics = await fetchAllMPMetrics();

  if (metrics.length === 0) {
    return [];
  }

  // Find max values for normalization
  const maxSpeeches = Math.max(...metrics.map(m => m.totalSpeeches), 1);
  const maxBills = Math.max(...metrics.map(m => m.billsRaised), 1);
  const maxQuestions = Math.max(...metrics.map(m => m.questionsAsked), 1);
  const maxInappropriate = Math.max(...metrics.map(m => m.inappropriateLanguageCount), 1);
  const maxPoverty = Math.max(...metrics.map(m => m.povertyRate), 1);
  const maxCourtCases = Math.max(...metrics.map(m => m.courtCases), 1);

  // Calculate grades for each MP
  const grades: CalculatedGrade[] = metrics.map(metric => {
    const attendanceScore = calculateAttendanceScore(metric.attendancePercentage);

    const participationScore = calculateParticipationScore(
      metric.totalSpeeches,
      metric.billsRaised,
      metric.questionsAsked,
      maxSpeeches,
      maxBills,
      maxQuestions
    );

    const conductScore = calculateConductScore(
      metric.inappropriateLanguageCount,
      metric.courtCases,
      maxInappropriate,
      maxCourtCases
    );

    const constituencyImpactScore = calculateConstituencyImpactScore(
      metric.povertyRate,
      maxPoverty
    );

    // Calculate weighted overall score
    const overallScore = Math.round(
      (attendanceScore * weights.attendance) +
      (participationScore * weights.participation) +
      (conductScore * weights.conduct) +
      (constituencyImpactScore * weights.constituencyImpact)
    );

    const grade = getLetterGrade(overallScore);

    return {
      mpId: metric.mpId,
      attendanceScore: Math.round(attendanceScore),
      participationScore: Math.round(participationScore),
      conductScore: Math.round(conductScore),
      constituencyImpactScore: Math.round(constituencyImpactScore),
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
      povertyRate: metric.povertyRate,
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
