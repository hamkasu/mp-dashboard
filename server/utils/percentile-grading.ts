/**
 * Copyright by Calmic Sdn Bhd
 *
 * Percentile-based Grading Utilities
 * Implements fair, relative ranking system for MP performance evaluation
 */

export interface RankableMetric {
  mpId: string;
  value: number;
}

/**
 * Calculate percentile rank for a set of values
 * Returns a map of mpId -> percentile score (0-100)
 *
 * @param metrics - Array of {mpId, value} objects
 * @param inverted - If true, lower values get higher percentiles (for negative metrics like poverty)
 * @returns Map of mpId to percentile score (0-100)
 */
export function calculatePercentiles(
  metrics: RankableMetric[],
  inverted: boolean = false
): Map<string, number> {
  if (metrics.length === 0) {
    return new Map();
  }

  // Sort by value (ascending or descending based on inversion)
  const sorted = [...metrics].sort((a, b) => {
    return inverted ? a.value - b.value : b.value - a.value;
  });

  const percentileMap = new Map<string, number>();

  // Calculate percentile for each MP
  // Percentile = (Number of values below this value / Total number of values) * 100
  for (let i = 0; i < sorted.length; i++) {
    const mp = sorted[i];

    // Handle ties: MPs with same value get the average percentile of their tie group
    const sameValueCount = sorted.filter(m => m.value === mp.value).length;
    const rankStart = i;
    const rankEnd = i + sameValueCount - 1;

    // Percentile rank formula: (rank / (n-1)) * 100
    // where rank is the number of values strictly below this value
    const percentile = sorted.length === 1
      ? 100
      : ((sorted.length - 1 - ((rankStart + rankEnd) / 2)) / (sorted.length - 1)) * 100;

    percentileMap.set(mp.mpId, Math.max(0, Math.min(100, percentile)));
  }

  return percentileMap;
}

/**
 * Calculate composite participation score from multiple sub-metrics
 * Each sub-metric is normalized to percentile, then averaged
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
  const speechPercentiles = calculatePercentiles(speeches, false);
  const billPercentiles = calculatePercentiles(bills, false);
  const questionPercentiles = calculatePercentiles(questions, false);

  const compositeMap = new Map<string, number>();

  // Combine percentiles for each MP
  const allMpIds = new Set([
    ...speeches.map(m => m.mpId),
    ...bills.map(m => m.mpId),
    ...questions.map(m => m.mpId),
  ]);

  for (const mpId of allMpIds) {
    const speechPct = speechPercentiles.get(mpId) || 0;
    const billPct = billPercentiles.get(mpId) || 0;
    const questionPct = questionPercentiles.get(mpId) || 0;

    const composite =
      speechPct * weights.speeches +
      billPct * weights.bills +
      questionPct * weights.questions;

    compositeMap.set(mpId, composite);
  }

  return compositeMap;
}

/**
 * Calculate composite conduct score from inappropriate language and court cases
 * Both are inverted (lower is better)
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
  // Both are inverted - lower values are better
  const inappropriatePercentiles = calculatePercentiles(inappropriateLanguage, true);
  const courtCasePercentiles = calculatePercentiles(courtCases, true);

  const compositeMap = new Map<string, number>();

  const allMpIds = new Set([
    ...inappropriateLanguage.map(m => m.mpId),
    ...courtCases.map(m => m.mpId),
  ]);

  for (const mpId of allMpIds) {
    const inappropriatePct = inappropriatePercentiles.get(mpId) || 0;
    const courtCasePct = courtCasePercentiles.get(mpId) || 0;

    const composite =
      inappropriatePct * weights.inappropriateLanguage +
      courtCasePct * weights.courtCases;

    compositeMap.set(mpId, composite);
  }

  return compositeMap;
}

/**
 * Calculate final weighted composite score from all metric percentiles
 *
 * @param attendance - Attendance percentiles
 * @param participation - Participation percentiles
 * @param conduct - Conduct percentiles
 * @param constituency - Constituency impact percentiles
 * @param weights - Overall weights for each category
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

  const allMpIds = new Set([
    ...attendance.keys(),
    ...participation.keys(),
    ...conduct.keys(),
    ...constituency.keys(),
  ]);

  for (const mpId of allMpIds) {
    const attendancePct = attendance.get(mpId) || 0;
    const participationPct = participation.get(mpId) || 0;
    const conductPct = conduct.get(mpId) || 0;
    const constituencyPct = constituency.get(mpId) || 50; // Neutral default

    const finalScore =
      attendancePct * weights.attendance +
      participationPct * weights.participation +
      conductPct * weights.conduct +
      constituencyPct * weights.constituency;

    finalScores.set(mpId, Math.round(finalScore));
  }

  return finalScores;
}

/**
 * Convert numerical score to letter grade
 * Uses standard curve: A (90+), B (80-90), C (70-80), D (60-70), F (<60)
 */
export function getLetterGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}
