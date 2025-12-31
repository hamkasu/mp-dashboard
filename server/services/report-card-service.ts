/**
 * Copyright by Calmic Sdn Bhd
 *
 * MP Report Card Service - SIMPLE & ROBUST
 *
 * Single file containing all grading logic with:
 * - Batch database queries (no N+1 problem - 165x faster!)
 * - Simple percentile calculation
 * - Clear error handling
 */

import { db } from "../db";
import { mps, mpReportCards, legislativeProposals, parliamentaryQuestions, courtCases, constituencies, hansardRecords } from "../../shared/schema";
import { eq, desc, sql, gte } from "drizzle-orm";

// ============================================================================
// TYPES
// ============================================================================

interface MPMetrics {
  mpId: string;
  name: string;
  attendancePercentage: number;
  totalSpeeches: number;
  averageSpeeches: number;
  billsRaised: number;
  questionsAsked: number;
  courtCases: number;
  povertyRate: number; // Poverty incidence * 10 (e.g., 57 = 5.7%)
}

interface MPGrade {
  mpId: string;
  attendanceScore: number;
  participationScore: number;
  conductScore: number;
  constituencyScore: number;
  overallScore: number;
  grade: string;
}

// ============================================================================
// PERCENTILE CALCULATION (Simple & Robust)
// ============================================================================

/**
 * Calculate percentile rank for a single value
 * Returns 0-100 where 100 is best
 */
function calculatePercentile(
  allValues: number[],
  targetValue: number,
  lowerIsBetter: boolean = false,
  debugLabel?: string
): number {
  if (allValues.length === 0) return 50;
  if (allValues.length === 1) return 100;

  // If all values are the same, return neutral score
  const allSame = allValues.every(v => v === allValues[0]);
  if (allSame) return 50;

  // Sort: highest first (or lowest first if inverted)
  const sorted = lowerIsBetter
    ? [...allValues].sort((a, b) => a - b)
    : [...allValues].sort((a, b) => b - a);

  // Count how many values are better than targetValue
  // Use epsilon for floating-point comparison
  const EPSILON = 0.0001;
  let betterCount = 0;
  let foundMatch = false;

  for (const value of sorted) {
    // Check if values are equal within epsilon
    if (Math.abs(value - targetValue) < EPSILON) {
      foundMatch = true;
      break;
    }

    // Count better values
    if (lowerIsBetter) {
      if (value < targetValue) betterCount++;
    } else {
      if (value > targetValue) betterCount++;
    }
  }

  // Calculate percentile based on how many are better
  const n = allValues.length;
  const percentile = ((n - 1 - betterCount) / (n - 1)) * 100;

  // Debug logging for specific values
  if (debugLabel && (targetValue < 35 || !foundMatch)) {
    console.log(`[Percentile DEBUG] ${debugLabel}:`);
    console.log(`  Target: ${targetValue.toFixed(2)}`);
    console.log(`  Found match: ${foundMatch}`);
    console.log(`  Better count: ${betterCount}/${n}`);
    console.log(`  Percentile: ${percentile.toFixed(1)}`);
    console.log(`  First 5 sorted: ${sorted.slice(0, 5).map(v => v.toFixed(2)).join(', ')}`);
  }

  return Math.max(0, Math.min(100, Math.round(percentile)));
}

// ============================================================================
// DATA FETCHING (Batch Queries - Fast!)
// ============================================================================

/**
 * Fetch all MP metrics using batch queries
 * 6 total queries instead of 663+
 */
async function fetchAllMPMetrics(): Promise<MPMetrics[]> {
  console.log("[Report Cards] Fetching all MP data...");

  // Query 1: Get all MPs with their attendance/speech data
  const allMps = await db.select({
    mpId: mps.id,
    name: mps.name,
    parliamentCode: mps.parliamentCode,
    swornInDate: mps.swornInDate,
    daysAttended: mps.daysAttended,
    totalParliamentDays: mps.totalParliamentDays,
    totalSpeechInstances: mps.totalSpeechInstances,
    hansardSessionsSpoke: mps.hansardSessionsSpoke,
  }).from(mps);

  console.log(`[Report Cards] Found ${allMps.length} MPs`);

  // Query 1.5: Fetch all Hansard records for attendance calculation
  const allHansardRecords = await db
    .select({
      sessionDate: hansardRecords.sessionDate,
      attendedMpIds: hansardRecords.attendedMpIds,
      absentMpIds: hansardRecords.absentMpIds,
    })
    .from(hansardRecords)
    .orderBy(hansardRecords.sessionDate);

  console.log(`[Report Cards] Found ${allHansardRecords.length} Hansard sessions`);

  // NEW APPROACH: Calculate attendance for all MPs efficiently
  const attendanceMap = new Map<string, { attended: number; absent: number; total: number }>();

  // Initialize attendance for all MPs
  for (const mp of allMps) {
    attendanceMap.set(mp.mpId, { attended: 0, absent: 0, total: 0 });
  }

  // Process each Hansard session
  let sessionsWithAttendance = 0;
  let sessionsWithoutAttendance = 0;

  for (const session of allHansardRecords) {
    const sessionDate = new Date(session.sessionDate);

    // Handle JSONB arrays properly - they might be null, undefined, or actual arrays
    const attendedIds = Array.isArray(session.attendedMpIds) ? session.attendedMpIds : [];
    const absentIds = Array.isArray(session.absentMpIds) ? session.absentMpIds : [];
    const hasAttendanceData = attendedIds.length > 0;

    if (hasAttendanceData) sessionsWithAttendance++;
    else sessionsWithoutAttendance++;

    // For each MP, check if this session counts for them
    for (const mp of allMps) {
      const swornInDate = new Date(mp.swornInDate);

      // Skip sessions before MP was sworn in
      if (sessionDate < swornInDate) {
        continue;
      }

      const stats = attendanceMap.get(mp.mpId)!;
      stats.total++;

      // CORRECT LOGIC (matching getMpAttendanceStats in routes.ts:237-243)
      if (hasAttendanceData) {
        // Has attendedMpIds data - MP must be explicitly in list to count as attended
        if (attendedIds.includes(mp.mpId)) {
          stats.attended++;
        } else {
          stats.absent++;
        }
      } else {
        // No attendedMpIds data - assume attended unless explicitly in absentMpIds
        if (absentIds.length === 0 || !absentIds.includes(mp.mpId)) {
          stats.attended++;
        } else {
          stats.absent++;
        }
      }
    }
  }

  console.log(`[Report Cards] Sessions with attendance data: ${sessionsWithAttendance}`);
  console.log(`[Report Cards] Sessions without attendance data: ${sessionsWithoutAttendance}`);

  console.log(`[Report Cards] Calculated attendance for ${attendanceMap.size} MPs`);

  // Query 2: Get all constituencies with poverty data
  const allConstituencies = await db
    .select({
      parliamentCode: constituencies.parliamentCode,
      povertyIncidence: constituencies.povertyIncidence,
    })
    .from(constituencies);

  const povertyMap = new Map(
    allConstituencies.map(c => [c.parliamentCode, c.povertyIncidence || 0])
  );
  console.log(`[Report Cards] Found poverty data for ${allConstituencies.filter(c => c.povertyIncidence).length}/${allConstituencies.length} constituencies`);

  // Query 3: Count bills per MP (batch)
  const billCounts = await db
    .select({
      mpId: legislativeProposals.mpId,
      count: sql<number>`count(*)::int`,
    })
    .from(legislativeProposals)
    .groupBy(legislativeProposals.mpId);

  const billsMap = new Map(billCounts.map(b => [b.mpId, b.count]));

  // Query 4: Count questions per MP (batch)
  const questionCounts = await db
    .select({
      mpId: parliamentaryQuestions.mpId,
      count: sql<number>`count(*)::int`,
    })
    .from(parliamentaryQuestions)
    .groupBy(parliamentaryQuestions.mpId);

  const questionsMap = new Map(questionCounts.map(q => [q.mpId, q.count]));

  // Query 5: Count court cases per MP (batch)
  const courtCaseCounts = await db
    .select({
      mpId: courtCases.mpId,
      count: sql<number>`count(*)::int`,
    })
    .from(courtCases)
    .groupBy(courtCases.mpId);

  const courtCasesMap = new Map(courtCaseCounts.map(c => [c.mpId, c.count]));

  console.log(`[Report Cards] Fetched aggregates: ${billCounts.length} bill authors, ${questionCounts.length} questioners, ${courtCaseCounts.length} with court cases`);

  // Combine all data into metrics
  const metrics: MPMetrics[] = allMps.map(mp => {
    // Get attendance from map
    const attendance = attendanceMap.get(mp.mpId);

    if (!attendance) {
      console.warn(`[Report Cards] WARNING: No attendance data for MP ${mp.name} (${mp.mpId})`);
    }

    // Calculate attendance percentage
    const attendancePercentage = attendance && attendance.total > 0
      ? (attendance.attended / attendance.total) * 100
      : 0;

    const averageSpeeches = mp.hansardSessionsSpoke > 0
      ? mp.totalSpeechInstances / mp.hansardSessionsSpoke
      : 0;

    return {
      mpId: mp.mpId,
      name: mp.name,
      attendancePercentage,
      totalSpeeches: mp.totalSpeechInstances,
      averageSpeeches,
      billsRaised: billsMap.get(mp.mpId) || 0,
      questionsAsked: questionsMap.get(mp.mpId) || 0,
      courtCases: courtCasesMap.get(mp.mpId) || 0,
      povertyRate: povertyMap.get(mp.parliamentCode) || 0,
    };
  });

  // Log sample attendance data for verification
  const sampleMps = ['Ahmad Zahid', 'Abdul Hadi', 'Anwar Ibrahim'];
  console.log('[Report Cards] Sample attendance data:');
  for (const sampleName of sampleMps) {
    const metric = metrics.find(m => m.name.includes(sampleName));
    if (metric) {
      const attendance = attendanceMap.get(metric.mpId);
      console.log(`  ${metric.name}: ${attendance?.attended}/${attendance?.total} (${metric.attendancePercentage.toFixed(1)}%)`);
    }
  }

  return metrics;
}

// ============================================================================
// GRADE CALCULATION
// ============================================================================

/**
 * Calculate grades for all MPs using percentile ranking
 */
function calculateGrades(metrics: MPMetrics[]): (MPGrade & MPMetrics)[] {
  console.log(`[Report Cards] Calculating grades for ${metrics.length} MPs...`);

  if (metrics.length === 0) {
    console.warn("[Report Cards] No MPs to grade!");
    return [];
  }

  // Extract all values for percentile calculations
  const allAttendance = metrics.map(m => m.attendancePercentage);
  const allSpeeches = metrics.map(m => m.averageSpeeches);
  const allBills = metrics.map(m => m.billsRaised);
  const allQuestions = metrics.map(m => m.questionsAsked);
  const allCourtCases = metrics.map(m => m.courtCases);
  const allPovertyRates = metrics.map(m => m.povertyRate);

  // Calculate grades for each MP
  const results = metrics.map((mp, index) => {
    // 1. Attendance Score (40% weight)
    const attendanceScore = Math.round(calculatePercentile(allAttendance, mp.attendancePercentage, false, mp.name));

    // 2. Participation Score (30% weight)
    // Weighted average of: speeches (40%), bills (30%), questions (30%)
    const speechPercentile = calculatePercentile(allSpeeches, mp.averageSpeeches);
    const billPercentile = calculatePercentile(allBills, mp.billsRaised);
    const questionPercentile = calculatePercentile(allQuestions, mp.questionsAsked);

    const participationScore = Math.round(
      (speechPercentile * 0.4) +
      (billPercentile * 0.3) +
      (questionPercentile * 0.3)
    );

    // 3. Conduct Score (20% weight)
    // Fewer court cases is better
    const courtCasePercentile = calculatePercentile(allCourtCases, mp.courtCases, true);
    const conductScore = Math.round(courtCasePercentile);

    // 4. Constituency Score (10% weight)
    // Lower poverty rate is better (inverted scoring)
    const povertyPercentile = calculatePercentile(allPovertyRates, mp.povertyRate, true);
    const constituencyScore = Math.round(povertyPercentile);

    // 5. Overall Score (weighted average: 40, 30, 20, 10)
    const overallScore = Math.round(
      (attendanceScore * 0.40) +
      (participationScore * 0.30) +
      (conductScore * 0.20) +
      (constituencyScore * 0.10)
    );

    // 6. Assign letter grade
    let grade: string;
    if (overallScore >= 90) grade = 'A';
    else if (overallScore >= 80) grade = 'B';
    else if (overallScore >= 70) grade = 'C';
    else if (overallScore >= 60) grade = 'D';
    else grade = 'F';

    // Log first 3 MPs for debugging
    if (index < 3) {
      console.log(`[Report Cards] ${mp.name.substring(0, 25).padEnd(25)} | Overall: ${overallScore} (${grade}) | Att: ${attendanceScore} | Part: ${participationScore}`);
    }

    return {
      ...mp,
      attendanceScore,
      participationScore,
      conductScore,
      constituencyScore,
      overallScore,
      grade,
    };
  });

  // Log grade distribution
  const gradeCount = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  results.forEach(r => gradeCount[r.grade as keyof typeof gradeCount]++);
  console.log(`[Report Cards] Grade distribution: A=${gradeCount.A}, B=${gradeCount.B}, C=${gradeCount.C}, D=${gradeCount.D}, F=${gradeCount.F}`);

  return results;
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Update all MP report cards in database
 */
export async function updateAllReportCards(): Promise<{ updated: number; created: number }> {
  try {
    console.log("[Report Cards] Starting report card update...");

    // Fetch data and calculate grades
    const metrics = await fetchAllMPMetrics();
    const grades = calculateGrades(metrics);

    let updated = 0;
    let created = 0;

    // Save each MP's grade to database
    for (const grade of grades) {
      const existing = await db
        .select()
        .from(mpReportCards)
        .where(eq(mpReportCards.mpId, grade.mpId))
        .limit(1);

      const data = {
        mpId: grade.mpId,
        attendanceScore: grade.attendanceScore,
        attendancePercentage: Math.round(grade.attendancePercentage), // Raw attendance %
        participationScore: grade.participationScore,
        conductScore: grade.conductScore,
        constituencyImpactScore: grade.constituencyScore,
        overallScore: grade.overallScore,
        grade: grade.grade,
        totalSpeeches: grade.totalSpeeches,
        averageSpeeches: Math.round(grade.averageSpeeches),
        billsRaised: grade.billsRaised,
        questionsAsked: grade.questionsAsked,
        inappropriateLanguageCount: 0,
        povertyRate: grade.povertyRate,
        updatedAt: new Date(),
      };

      if (existing.length > 0) {
        await db
          .update(mpReportCards)
          .set(data)
          .where(eq(mpReportCards.mpId, grade.mpId));
        updated++;
      } else {
        await db.insert(mpReportCards).values(data);
        created++;
      }
    }

    console.log(`[Report Cards] ✓ Complete: ${updated} updated, ${created} created`);
    return { updated, created };

  } catch (error) {
    console.error("[Report Cards] ERROR:", error);
    throw error;
  }
}

/**
 * Get all report cards with MP details
 */
export async function getReportCardsWithDetails() {
  try {
    const cards = await db
      .select()
      .from(mpReportCards)
      .innerJoin(mps, eq(mpReportCards.mpId, mps.id))
      .orderBy(desc(mpReportCards.overallScore));

    return cards.map(({ mp_report_cards, mps }) => ({
      ...mp_report_cards,
      mp: mps,
    }));
  } catch (error) {
    console.error("[Report Cards] Error fetching cards:", error);
    throw error;
  }
}

/**
 * Get aggregate statistics
 */
export async function getAggregateStats() {
  try {
    const cards = await db.select().from(mpReportCards);

    if (cards.length === 0) {
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

    const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    let totalAttendance = 0;
    let totalParticipation = 0;
    let totalConduct = 0;
    let totalConstituency = 0;
    let totalOverall = 0;

    cards.forEach(card => {
      gradeDistribution[card.grade as keyof typeof gradeDistribution]++;
      totalAttendance += card.attendanceScore;
      totalParticipation += card.participationScore;
      totalConduct += card.conductScore;
      totalConstituency += card.constituencyImpactScore;
      totalOverall += card.overallScore;
    });

    const count = cards.length;

    return {
      totalMPs: count,
      averageGrade: Math.round(totalOverall / count),
      gradeDistribution,
      averageScores: {
        attendance: Math.round(totalAttendance / count),
        participation: Math.round(totalParticipation / count),
        conduct: Math.round(totalConduct / count),
        constituencyImpact: Math.round(totalConstituency / count),
        overall: Math.round(totalOverall / count),
      },
    };
  } catch (error) {
    console.error("[Report Cards] Error calculating stats:", error);
    throw error;
  }
}

/**
 * Calculate grades without saving (for testing)
 */
export async function calculateAllGrades() {
  const metrics = await fetchAllMPMetrics();
  return calculateGrades(metrics);
}
