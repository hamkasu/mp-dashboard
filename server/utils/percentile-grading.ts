/**
 * Copyright by Calmic Sdn Bhd
 *
 * Percentile-based Grading Utilities - FIXED VERSION
 * Implements fair, relative ranking system for MP performance evaluation
 *
 * BUG FIXES:
 * - Fixed tie-handling logic (was calculating wrong rank positions)
 * - Handle edge case when all MPs have the same value (return 50)
 * - Simplified percentile formula for clarity
 * - Prevent NaN values in composite calculations
 */

export interface RankableMetric {
  mpId: string;
  value: number;
}

/**
 * Calculate percentile rank for a set of values
 * Uses standard formula: percentile = (rank / (n-1)) * 100
 * where rank is the position from the bottom (0-indexed)
 *
 * @param metrics - Array of {mpId, value} objects
 * @param inverted - If true, lower values get higher percentiles (for negative metrics)
 * @returns Map of mpId to percentile score (0-100)
 */
export function calculatePercentiles(
  metrics: RankableMetric[],
  inverted: boolean = false
): Map<string, number> {
  const percentileMap = new Map<string, number>();

  if (metrics.length === 0) {
    return percentileMap;
  }

  // Handle edge case: single MP gets 100
  if (metrics.length === 1) {
    percentileMap.set(metrics[0].mpId, 100);
    return percentileMap;
  }

  // Check if all values are identical
  const firstValue = metrics[0].value;
  const allSame = metrics.every(m => m.value === firstValue);
  if (allSame) {
    // All MPs get neutral score (50) when values are identical
    metrics.forEach(m => percentileMap.set(m.mpId, 50));
    return percentileMap;
  }

  // Sort by value
  // For normal metrics (higher is better): sort descending (best first)
  // For inverted metrics (lower is better): sort ascending (best first)
  const sorted = [...metrics].sort((a, b) => {
    return inverted ? a.value - b.value : b.value - a.value;
  });

  // Group by value to handle ties
  const valueGroups = new Map<number, string[]>();
  sorted.forEach(m => {
    if (!valueGroups.has(m.value)) {
      valueGroups.set(m.value, []);
    }
    valueGroups.get(m.value)!.push(m.mpId);
  });

  // Assign percentiles
  let currentRank = 0;
  const n = sorted.length;

  for (const [value, mpIds] of Array.from(valueGroups.entries())) {
    const groupSize = mpIds.length;

    // For ties, use the average rank of the group
    // E.g., if ranks 5, 6, 7 are tied, use rank 6
    const avgRank = currentRank + (groupSize - 1) / 2;

    // Percentile formula: convert rank (0 = best) to percentile (100 = best)
    // percentile = (1 - rank / (n-1)) * 100
    const percentile = n === 1 ? 100 : ((n - 1 - avgRank) / (n - 1)) * 100;

    // Assign same percentile to all MPs in tie group
    mpIds.forEach(mpId => {
      percentileMap.set(mpId, Math.max(0, Math.min(100, percentile)));
    });

    currentRank += groupSize;
  }

  return percentileMap;
}

/**
 * Calculate composite participation score from multiple sub-metrics
 * Each sub-metric is ranked separately, then combined with weights
 *
 * @param speeches - Array of {mpId, value} for speech counts
 * @param bills - Array of {mpId, value} for bills raised
 * @param questions - Array of {mpId, value} for questions asked
 * @param weights - Weights for each sub-metric (should sum to 1)
 * @returns Map of mpId to composite participation percentile (0-100)
 */
export function calculateParticipationPercentiles(
  speeches: RankableMetric[],
  bills: RankableMetric[],
  questions: RankableMetric[],
  weights: { speeches: number; bills: number; questions: number } = {
    speeches: 0.4,
    bills: 0.3,
    questions: 0.3,
  }
): Map<string, number> {
  // Calculate percentiles for each sub-metric
  const speechPercentiles = calculatePercentiles(speeches, false);
  const billPercentiles = calculatePercentiles(bills, false);
  const questionPercentiles = calculatePercentiles(questions, false);

  const compositeMap = new Map<string, number>();

  // Get all unique MP IDs
  const allMpIds = new Set<string>();
  speeches.forEach(m => allMpIds.add(m.mpId));
  bills.forEach(m => allMpIds.add(m.mpId));
  questions.forEach(m => allMpIds.add(m.mpId));

  // Calculate weighted composite for each MP
  for (const mpId of allMpIds) {
    const speechPct = speechPercentiles.get(mpId) ?? 50; // Default to neutral if missing
    const billPct = billPercentiles.get(mpId) ?? 50;
    const questionPct = questionPercentiles.get(mpId) ?? 50;

    const composite =
      speechPct * weights.speeches +
      billPct * weights.bills +
      questionPct * weights.questions;

    compositeMap.set(mpId, Math.max(0, Math.min(100, composite)));
  }

  return compositeMap;
}

/**
 * Calculate composite conduct score from inappropriate language and court cases
 * Both metrics are inverted (lower is better)
 *
 * @param inappropriateLanguage - Array of {mpId, value} for inappropriate language counts
 * @param courtCases - Array of {mpId, value} for court case counts
 * @param weights - Weights for each sub-metric
 * @returns Map of mpId to composite conduct percentile (0-100)
 */
export function calculateConductPercentiles(
  inappropriateLanguage: RankableMetric[],
  courtCases: RankableMetric[],
  weights: { inappropriateLanguage: number; courtCases: number } = {
    inappropriateLanguage: 0.7,
    courtCases: 0.3,
  }
): Map<string, number> {
  // Both metrics are inverted - lower values are better
  const inappropriatePercentiles = calculatePercentiles(inappropriateLanguage, true);
  const courtCasePercentiles = calculatePercentiles(courtCases, true);

  const compositeMap = new Map<string, number>();

  // Get all unique MP IDs
  const allMpIds = new Set<string>();
  inappropriateLanguage.forEach(m => allMpIds.add(m.mpId));
  courtCases.forEach(m => allMpIds.add(m.mpId));

  // Calculate weighted composite for each MP
  for (const mpId of allMpIds) {
    const inappropriatePct = inappropriatePercentiles.get(mpId) ?? 50;
    const courtCasePct = courtCasePercentiles.get(mpId) ?? 50;

    const composite =
      inappropriatePct * weights.inappropriateLanguage +
      courtCasePct * weights.courtCases;

    compositeMap.set(mpId, Math.max(0, Math.min(100, composite)));
  }

  return compositeMap;
}

/**
 * Calculate final weighted composite score from all category percentiles
 *
 * @param attendance - Attendance percentiles (0-100)
 * @param participation - Participation percentiles (0-100)
 * @param conduct - Conduct percentiles (0-100)
 * @param constituency - Constituency impact percentiles (0-100)
 * @param weights - Overall weights for each category (should sum to 1)
 * @returns Map of mpId to final composite score (0-100)
 */
export function calculateFinalScores(
  attendance: Map<string, number>,
  participation: Map<string, number>,
  conduct: Map<string, number>,
  constituency: Map<string, number>,
  weights: {
    attendance: number;
    participation: number;
    conduct: number;
    constituency: number;
  }
): Map<string, number> {
  const finalScores = new Map<string, number>();

  // Get all unique MP IDs from all categories
  const allMpIds = new Set<string>();
  attendance.forEach((_, mpId) => allMpIds.add(mpId));
  participation.forEach((_, mpId) => allMpIds.add(mpId));
  conduct.forEach((_, mpId) => allMpIds.add(mpId));
  constituency.forEach((_, mpId) => allMpIds.add(mpId));

  // Calculate weighted final score for each MP
  for (const mpId of allMpIds) {
    const attendancePct = attendance.get(mpId) ?? 50; // Default to neutral
    const participationPct = participation.get(mpId) ?? 50;
    const conductPct = conduct.get(mpId) ?? 50;
    const constituencyPct = constituency.get(mpId) ?? 50;

    const finalScore =
      attendancePct * weights.attendance +
      participationPct * weights.participation +
      conductPct * weights.conduct +
      constituencyPct * weights.constituency;

    // Round to nearest integer and ensure 0-100 range
    finalScores.set(mpId, Math.max(0, Math.min(100, Math.round(finalScore))));
  }

  return finalScores;
}

/**
 * Convert numerical score to letter grade
 * Standard curve: A (90+), B (80-90), C (70-80), D (60-70), F (<60)
 */
export function getLetterGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}
