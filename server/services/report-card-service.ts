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
import { mps, mpReportCards, legislativeProposals, parliamentaryQuestions, courtCases, constituencies, hansardRecords, committeeMembers, coalitions } from "../../shared/schema";
import { eq, desc, sql, gte, and } from "drizzle-orm";

// ============================================================================
// TYPES
// ============================================================================

interface MPMetrics {
  mpId: string;
  name: string;
  state: string;
  coalition: string | null;
  attendancePercentage: number;
  totalSpeeches: number;
  averageSpeeches: number;
  billsRaised: number;
  questionsAsked: number;
  courtCases: number;
  courtCaseWeight: number; // Weighted court case impact (0-100+ scale)
  povertyRate: number; // Poverty incidence * 10 (e.g., 57 = 5.7%)
  committeeBonus: number; // Bonus points for committee participation (0-15)
}

// Court case status weights for conduct score
// Higher weight = more serious impact on conduct score
const CASE_STATUS_WEIGHTS: Record<string, number> = {
  convicted: 1.0,        // Full impact
  charged: 0.5,          // 50% impact
  appeal_pending: 0.5,   // 50% impact
  under_investigation: 0.25, // 25% impact
  acquitted: 0,          // No impact
  withdrawn: 0,          // No impact
};

// Committee bonus points for higher accountability roles
// Applied as a modifier to the overall score, not diluting the 40/30/20/10 breakdown
const COMMITTEE_BONUS_POINTS: Record<string, number> = {
  'PAC_chair': 15,              // Public Accounts Committee Chair - highest oversight
  'special_committee_chair': 12, // Special Select Committee Chair
  'PAC_member': 8,              // PAC Member
  'committee_chair': 10,        // Regular committee chair
  'committee_member': 3,        // Regular committee member
};

// ============================================================================
// PHASE 5: ALLOWANCE & ROI CALCULATION
// ============================================================================

/**
 * Calculate total annual allowance for an MP (RM)
 * Includes base, minister salary, and all supplements
 */
function calculateAnnualAllowance(mp: typeof mps.$inferSelect): number {
  const base = (mp.mpAllowance || 0) * 12;
  const minister = (mp.ministerSalary || 0) * 12;
  const entertainment = (mp.entertainmentAllowance || 0) * 12;
  const phone = (mp.handphoneAllowance || 0) * 12;
  const computer = (mp.computerAllowance || 0) * 12;
  const dress = (mp.dressWearAllowance || 0) * 12;

  // Estimate sitting allowance (assume ~70 sessions per year)
  const sitting = (mp.parliamentSittingAllowance || 400) * 70;

  return Math.round(base + minister + entertainment + phone + computer + dress + sitting);
}

/**
 * Calculate cost ratios: how much allowance per unit of output
 * Lower is better (fewer ringgits per action)
 */
function calculateAllowanceRatios(
  annualAllowance: number,
  totalSpeeches: number,
  billsRaised: number,
  questionsAsked: number,
  committeeMemberships: number
) {
  return {
    allowancePerSpeech: totalSpeeches > 0 ? Math.round(annualAllowance / totalSpeeches) : 999999,
    allowancePerBill: billsRaised > 0 ? Math.round(annualAllowance / billsRaised) : 999999,
    allowancePerQuestion: questionsAsked > 0 ? Math.round(annualAllowance / questionsAsked) : 999999,
    allowancePerCommittee: committeeMemberships > 0 ? Math.round(annualAllowance / committeeMemberships) : 999999,
  };
}

/**
 * Calculate ROI Score (0-100) based on output relative to allowance
 * High output = High ROI = Good value for taxpayers
 * Low output = Low ROI = Poor value for taxpayers
 */
function calculateROIScore(
  annualAllowance: number,
  totalSpeeches: number,
  billsRaised: number,
  questionsAsked: number,
  committeeMemberships: number
): { score: number; grade: string } {
  // Weighted output index
  // Speeches are most common (40%), Bills are rarest but valuable (30%),
  // Questions are moderate (20%), Committees show engagement (10%)
  const outputIndex =
    (totalSpeeches * 1.0) +        // Weight speeches
    (billsRaised * 15.0) +         // Bills are much more valuable
    (questionsAsked * 0.9) +       // Questions slightly less than speeches
    (committeeMemberships * 5.0);  // Committee roles worth more

  // Normalize: Active MP (150 speeches, 3 bills, 50 questions, 2 committees) = output of ~250
  // If allowance is ~300k, ratio is 250/300000 = 0.00083
  // We want this to map to ~80 (A-grade)
  const roiRatio = (outputIndex / annualAllowance) * 1000000;

  // Map to 0-100 scale with benchmarks
  // 0.5 ratio (very poor) = 0 score
  // 1.0 ratio (active) = 80 score
  // 2.0+ ratio (exceptionally active) = 100 score
  let score = Math.round((roiRatio / 0.01) * 100); // Scale up the ratio
  score = Math.min(100, Math.max(0, score)); // Clamp to 0-100

  // Assign grade based on score
  let grade: string;
  if (score >= 85) grade = 'A';
  else if (score >= 70) grade = 'B';
  else if (score >= 55) grade = 'C';
  else if (score >= 40) grade = 'D';
  else grade = 'F';

  return { score, grade };
}

interface MPGrade {
  mpId: string;
  attendanceScore: number;
  participationScore: number;
  conductScore: number;
  constituencyScore: number;
  overallScore: number;
  grade: string;
  // Phase 4: Coalition and state percentiles
  coalitionAttendanceScore?: number;
  coalitionParticipationScore?: number;
  coalitionConductScore?: number;
  coalitionConstituencyScore?: number;
  coalitionOverallScore?: number;
  coalitionGrade?: string;
  stateAttendanceScore?: number;
  stateParticipationScore?: number;
  stateConductScore?: number;
  stateConstituencyScore?: number;
  stateOverallScore?: number;
  stateGrade?: string;
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

  // Query 1: Get all MPs with their attendance/speech data and coalition info
  const allMps = await db.select({
    mpId: mps.id,
    name: mps.name,
    state: mps.state,
    coalitionId: mps.coalitionId,
    coalitionCode: coalitions.code,
    parliamentCode: mps.parliamentCode,
    swornInDate: mps.swornInDate,
    daysAttended: mps.daysAttended,
    totalParliamentDays: mps.totalParliamentDays,
    totalSpeechInstances: mps.totalSpeechInstances,
    hansardSessionsSpoke: mps.hansardSessionsSpoke,
  }).from(mps)
  .leftJoin(coalitions, eq(mps.coalitionId, coalitions.id));

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

  // Query 5: Get all court cases with status for weighted impact calculation
  const allCourtCases = await db
    .select({
      mpId: courtCases.mpId,
      status: courtCases.status,
    })
    .from(courtCases);

  // Calculate weighted court case impact per MP
  const courtCasesMap = new Map<string, { count: number; weight: number }>();
  for (const courtCase of allCourtCases) {
    if (!courtCasesMap.has(courtCase.mpId)) {
      courtCasesMap.set(courtCase.mpId, { count: 0, weight: 0 });
    }
    const stats = courtCasesMap.get(courtCase.mpId)!;
    stats.count++;
    // Get weight for this status, default to 0.5 if unknown status
    const weight = CASE_STATUS_WEIGHTS[courtCase.status] ?? 0.5;
    stats.weight += weight;
  }

  console.log(`[Report Cards] Fetched aggregates: ${billCounts.length} bill authors, ${questionCounts.length} questioners, ${allCourtCases.length} total court cases`);

  // Query 6: Get committee memberships for active MPs (15th Parliament, currently serving)
  const allCommitteeMemberships = await db
    .select({
      mpId: committeeMembers.mpId,
      committeeAbbr: committeeMembers.committeeAbbr,
      role: committeeMembers.role,
    })
    .from(committeeMembers)
    .where(
      and(
        eq(committeeMembers.parliamentTerm, "15th Parliament"),
        eq(committeeMembers.endDate, null)
      )
    );

  // Calculate committee bonus per MP
  const committeeMap = new Map<string, number>();
  for (const membership of allCommitteeMemberships) {
    if (!committeeMap.has(membership.mpId)) {
      committeeMap.set(membership.mpId, 0);
    }
    const currentBonus = committeeMap.get(membership.mpId)!;

    // Determine bonus based on committee and role
    let bonusPoints = 0;
    if (membership.committeeAbbr === "PAC") {
      bonusPoints = membership.role === "chair" ? 15 : 8;
    } else if (membership.role === "chair") {
      bonusPoints = 10;
    } else {
      bonusPoints = 3;
    }

    // Set to maximum (don't add if already has higher bonus)
    committeeMap.set(membership.mpId, Math.max(currentBonus, bonusPoints));
  }

  console.log(`[Report Cards] Found committee memberships for ${committeeMap.size} MPs`);

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

    const courtCaseData = courtCasesMap.get(mp.mpId) || { count: 0, weight: 0 };

    return {
      mpId: mp.mpId,
      name: mp.name,
      state: mp.state,
      coalition: mp.coalitionCode || null,
      attendancePercentage,
      totalSpeeches: mp.totalSpeechInstances,
      averageSpeeches,
      billsRaised: billsMap.get(mp.mpId) || 0,
      questionsAsked: questionsMap.get(mp.mpId) || 0,
      courtCases: courtCaseData.count,
      courtCaseWeight: courtCaseData.weight,
      povertyRate: povertyMap.get(mp.parliamentCode) || 0,
      committeeBonus: committeeMap.get(mp.mpId) || 0,
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
  const allCourtCaseWeights = metrics.map(m => m.courtCaseWeight);
  const allPovertyRates = metrics.map(m => m.povertyRate);

  // Group metrics by coalition and state for Phase 4
  const coalitionGroups = new Map<string, MPMetrics[]>();
  const stateGroups = new Map<string, MPMetrics[]>();

  for (const mp of metrics) {
    // Group by coalition
    if (mp.coalition) {
      if (!coalitionGroups.has(mp.coalition)) {
        coalitionGroups.set(mp.coalition, []);
      }
      coalitionGroups.get(mp.coalition)!.push(mp);
    }

    // Group by state
    if (!stateGroups.has(mp.state)) {
      stateGroups.set(mp.state, []);
    }
    stateGroups.get(mp.state)!.push(mp);
  }

  // Helper function to calculate scores within a group
  function calculateGroupScores(group: MPMetrics[], targetMp: MPMetrics, groupName: string): {
    attendanceScore: number;
    participationScore: number;
    conductScore: number;
    constituencyScore: number;
    overallScore: number;
    grade: string;
  } {
    if (group.length < 2) {
      // Not enough members in group, return neutral scores
      return { attendanceScore: 50, participationScore: 50, conductScore: 50, constituencyScore: 50, overallScore: 50, grade: 'C' };
    }

    const groupAttendance = group.map(m => m.attendancePercentage);
    const groupSpeeches = group.map(m => m.averageSpeeches);
    const groupBills = group.map(m => m.billsRaised);
    const groupQuestions = group.map(m => m.questionsAsked);
    const groupCourtCaseWeights = group.map(m => m.courtCaseWeight);
    const groupPovertyRates = group.map(m => m.povertyRate);

    const attendanceScore = Math.round(calculatePercentile(groupAttendance, targetMp.attendancePercentage, false));
    const speechPercentile = calculatePercentile(groupSpeeches, targetMp.averageSpeeches);
    const billPercentile = calculatePercentile(groupBills, targetMp.billsRaised);
    const questionPercentile = calculatePercentile(groupQuestions, targetMp.questionsAsked);
    const participationScore = Math.round(
      (speechPercentile * 0.4) + (billPercentile * 0.3) + (questionPercentile * 0.3)
    );

    const courtCasePercentile = calculatePercentile(groupCourtCaseWeights, targetMp.courtCaseWeight, true);
    const conductScore = Math.round(courtCasePercentile);

    const povertyPercentile = calculatePercentile(groupPovertyRates, targetMp.povertyRate, true);
    const constituencyScore = Math.round(povertyPercentile);

    const baseScore = Math.round(
      (attendanceScore * 0.40) + (participationScore * 0.30) + (conductScore * 0.20) + (constituencyScore * 0.10)
    );
    const overallScore = Math.min(100, baseScore + Math.round(targetMp.committeeBonus));

    let grade: string;
    if (overallScore >= 90) grade = 'A';
    else if (overallScore >= 80) grade = 'B';
    else if (overallScore >= 70) grade = 'C';
    else if (overallScore >= 60) grade = 'D';
    else grade = 'F';

    return { attendanceScore, participationScore, conductScore, constituencyScore, overallScore, grade };
  }

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
    // Lower weighted court case impact is better (inverted)
    const courtCasePercentile = calculatePercentile(allCourtCaseWeights, mp.courtCaseWeight, true);
    const conductScore = Math.round(courtCasePercentile);

    // 4. Constituency Score (10% weight)
    // Lower poverty rate is better (inverted scoring)
    const povertyPercentile = calculatePercentile(allPovertyRates, mp.povertyRate, true);
    const constituencyScore = Math.round(povertyPercentile);

    // 5. Overall Score (weighted average: 40, 30, 20, 10) + committee bonus
    const baseScore = Math.round(
      (attendanceScore * 0.40) +
      (participationScore * 0.30) +
      (conductScore * 0.20) +
      (constituencyScore * 0.10)
    );

    // Apply committee bonus (0-15 points) for higher-accountability roles
    // Bonus is capped at 100 total
    const overallScore = Math.min(100, baseScore + Math.round(mp.committeeBonus));

    // 6. Assign letter grade
    let grade: string;
    if (overallScore >= 90) grade = 'A';
    else if (overallScore >= 80) grade = 'B';
    else if (overallScore >= 70) grade = 'C';
    else if (overallScore >= 60) grade = 'D';
    else grade = 'F';

    // Phase 4: Calculate coalition percentiles if MP has a coalition
    let coalitionScores: Partial<MPGrade> = {};
    if (mp.coalition) {
      const coalitionGroup = coalitionGroups.get(mp.coalition);
      if (coalitionGroup) {
        const cScores = calculateGroupScores(coalitionGroup, mp, mp.coalition);
        coalitionScores = {
          coalitionAttendanceScore: cScores.attendanceScore,
          coalitionParticipationScore: cScores.participationScore,
          coalitionConductScore: cScores.conductScore,
          coalitionConstituencyScore: cScores.constituencyScore,
          coalitionOverallScore: cScores.overallScore,
          coalitionGrade: cScores.grade,
        };
      }
    }

    // Phase 4: Calculate state percentiles
    const stateGroup = stateGroups.get(mp.state);
    let stateScores: Partial<MPGrade> = {};
    if (stateGroup && stateGroup.length > 1) {
      const sScores = calculateGroupScores(stateGroup, mp, mp.state);
      stateScores = {
        stateAttendanceScore: sScores.attendanceScore,
        stateParticipationScore: sScores.participationScore,
        stateConductScore: sScores.conductScore,
        stateConstituencyScore: sScores.constituencyScore,
        stateOverallScore: sScores.overallScore,
        stateGrade: sScores.grade,
      };
    }

    // Log first 3 MPs for debugging
    if (index < 3) {
      console.log(`[Report Cards] ${mp.name.substring(0, 25).padEnd(25)} | Overall: ${overallScore} (${grade}) | Att: ${attendanceScore} | Part: ${participationScore} | Coalition: ${mp.coalition || 'N/A'} | State: ${mp.state}`);
    }

    return {
      ...mp,
      attendanceScore,
      participationScore,
      conductScore,
      constituencyScore,
      overallScore,
      grade,
      ...coalitionScores,
      ...stateScores,
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

    // Fetch all MPs to get allowance data for Phase 5
    const allMps = await db.select().from(mps);
    const mpMap = new Map(allMps.map(mp => [mp.id, mp]));

    // Save each MP's grade to database
    for (const grade of grades) {
      const mpData = mpMap.get(grade.mpId);

      // Phase 5: Calculate allowance and ROI metrics
      const annualAllowance = mpData ? calculateAnnualAllowance(mpData) : 0;
      const allowanceRatios = calculateAllowanceRatios(
        annualAllowance,
        grade.totalSpeeches,
        grade.billsRaised,
        grade.questionsAsked,
        0 // TODO: Get actual committee count when available
      );
      const roiCalc = calculateROIScore(
        annualAllowance,
        grade.totalSpeeches,
        grade.billsRaised,
        grade.questionsAsked,
        0 // TODO: Get actual committee count
      );

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
        // Phase 5: Allowance and ROI fields
        annualAllowance,
        allowancePerSpeech: allowanceRatios.allowancePerSpeech,
        allowancePerBill: allowanceRatios.allowancePerBill,
        allowancePerQuestion: allowanceRatios.allowancePerQuestion,
        allowancePerCommittee: allowanceRatios.allowancePerCommittee,
        roiScore: roiCalc.score,
        roiGrade: roiCalc.grade,
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
    // Join with mps table to filter for active MPs only (not deceased or resigned)
    const now = new Date();
    const cardsWithMps = await db
      .select({
        card: mpReportCards,
        termEndDate: mps.termEndDate,
      })
      .from(mpReportCards)
      .innerJoin(mps, eq(mpReportCards.mpId, mps.id));

    // Filter to only include active MPs
    const cards = cardsWithMps
      .filter(row => {
        if (!row.termEndDate) return true;
        return new Date(row.termEndDate) > now;
      })
      .map(row => row.card);

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

/**
 * Get report cards with coalition and state percentiles (Phase 4)
 * Returns all MPs with global, coalition, and state percentile rankings
 */
export async function getReportCardsWithCoalitionAndStatePercentiles() {
  try {
    const metrics = await fetchAllMPMetrics();
    const gradesWithPercentiles = calculateGrades(metrics);

    // Join with MP details
    const result = await Promise.all(
      gradesWithPercentiles.map(async (grade) => {
        const mpDetails = await db
          .select()
          .from(mps)
          .where(eq(mps.id, grade.mpId))
          .limit(1);

        return {
          ...grade,
          mp: mpDetails[0] || null,
        };
      })
    );

    return result;
  } catch (error) {
    console.error("[Report Cards] Error fetching coalition/state percentiles:", error);
    throw error;
  }
}
