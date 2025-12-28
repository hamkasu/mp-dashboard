/**
 * COMPLETE REWRITE - Simple, Robust Percentile Grading
 *
 * This is a clean-slate implementation with:
 * - Simple, easy-to-debug logic
 * - Direct calculations, no complex Map operations
 * - Inline logging for debugging
 * - Clear step-by-step processing
 */

export interface MPGradeData {
  mpId: string;

  // Raw metrics
  attendancePercentage: number;
  averageSpeeches: number;
  billsRaised: number;
  questionsAsked: number;
  courtCases: number;
  inappropriateLanguage: number;

  // Percentile scores (0-100)
  attendancePercentile: number;
  participationPercentile: number;
  conductPercentile: number;
  constituencyPercentile: number;

  // Final results
  overallScore: number;
  grade: string;
}

/**
 * Calculate percentile for a single value within an array
 * Formula: (count of values below this value / total values) * 100
 */
function calculateSinglePercentile(
  allValues: number[],
  targetValue: number,
  inverted: boolean = false
): number {
  if (allValues.length === 0) return 50;
  if (allValues.length === 1) return 100;

  // Check if all values are the same
  const allSame = allValues.every(v => v === allValues[0]);
  if (allSame) return 50; // Neutral score when no differentiation possible

  // Sort values
  const sorted = inverted
    ? [...allValues].sort((a, b) => a - b)  // Lower is better
    : [...allValues].sort((a, b) => b - a); // Higher is better

  // Find position of target value
  const position = sorted.indexOf(targetValue);

  // Calculate percentile: (n-1-position) / (n-1) * 100
  const n = sorted.length;
  const percentile = ((n - 1 - position) / (n - 1)) * 100;

  return Math.max(0, Math.min(100, percentile));
}

/**
 * Main grading function - processes all MPs and returns their grades
 */
export function calculateGrades(mpsData: Array<{
  mpId: string;
  attendancePercentage: number;
  averageSpeeches: number;
  billsRaised: number;
  questionsAsked: number;
  courtCases: number;
  inappropriateLanguage: number;
}>): MPGradeData[] {

  console.log(`[Grading] Processing ${mpsData.length} MPs...`);

  if (mpsData.length === 0) {
    console.warn("[Grading] No MP data to process!");
    return [];
  }

  // Extract all values for percentile calculation
  const allAttendance = mpsData.map(mp => mp.attendancePercentage);
  const allSpeeches = mpsData.map(mp => mp.averageSpeeches);
  const allBills = mpsData.map(mp => mp.billsRaised);
  const allQuestions = mpsData.map(mp => mp.questionsAsked);
  const allCourtCases = mpsData.map(mp => mp.courtCases);
  const allInappropriate = mpsData.map(mp => mp.inappropriateLanguage);

  console.log(`[Grading] Sample attendance values: ${allAttendance.slice(0, 5).join(', ')}...`);
  console.log(`[Grading] Sample speech values: ${allSpeeches.slice(0, 5).join(', ')}...`);

  // Calculate grades for each MP
  const results: MPGradeData[] = [];

  for (let i = 0; i < mpsData.length; i++) {
    const mp = mpsData[i];

    // Calculate percentiles for each metric
    const attendancePercentile = calculateSinglePercentile(
      allAttendance,
      mp.attendancePercentage,
      false // Higher is better
    );

    const speechPercentile = calculateSinglePercentile(
      allSpeeches,
      mp.averageSpeeches,
      false
    );

    const billPercentile = calculateSinglePercentile(
      allBills,
      mp.billsRaised,
      false
    );

    const questionPercentile = calculateSinglePercentile(
      allQuestions,
      mp.questionsAsked,
      false
    );

    // Participation is weighted average of speeches, bills, questions
    const participationPercentile =
      (speechPercentile * 0.4) +
      (billPercentile * 0.3) +
      (questionPercentile * 0.3);

    // Conduct is weighted average of court cases and inappropriate language (inverted)
    const courtCasePercentile = calculateSinglePercentile(
      allCourtCases,
      mp.courtCases,
      true // Lower is better
    );

    const inappropriatePercentile = calculateSinglePercentile(
      allInappropriate,
      mp.inappropriateLanguage,
      true // Lower is better
    );

    const conductPercentile =
      (inappropriatePercentile * 0.7) +
      (courtCasePercentile * 0.3);

    // Constituency is neutral (no data available)
    const constituencyPercentile = 50;

    // Calculate overall score: weighted average of all categories
    const overallScore = Math.round(
      (attendancePercentile * 0.375) +      // 37.5% weight
      (participationPercentile * 0.375) +   // 37.5% weight
      (conductPercentile * 0.15) +          // 15% weight
      (constituencyPercentile * 0.10)       // 10% weight
    );

    // Assign letter grade
    let grade: string;
    if (overallScore >= 90) grade = 'A';
    else if (overallScore >= 80) grade = 'B';
    else if (overallScore >= 70) grade = 'C';
    else if (overallScore >= 60) grade = 'D';
    else grade = 'F';

    // Debug log for first few MPs
    if (i < 3) {
      console.log(`[Grading] MP ${i + 1}:`, {
        mpId: mp.mpId.substring(0, 8) + '...',
        attendance: `${mp.attendancePercentage.toFixed(1)}% → ${attendancePercentile.toFixed(1)}`,
        participation: `${participationPercentile.toFixed(1)}`,
        overall: overallScore,
        grade: grade
      });
    }

    results.push({
      mpId: mp.mpId,
      attendancePercentage: mp.attendancePercentage,
      averageSpeeches: mp.averageSpeeches,
      billsRaised: mp.billsRaised,
      questionsAsked: mp.questionsAsked,
      courtCases: mp.courtCases,
      inappropriateLanguage: mp.inappropriateLanguage,
      attendancePercentile: Math.round(attendancePercentile),
      participationPercentile: Math.round(participationPercentile),
      conductPercentile: Math.round(conductPercentile),
      constituencyPercentile: Math.round(constituencyPercentile),
      overallScore: overallScore,
      grade: grade
    });
  }

  // Summary statistics
  const gradeCount = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  results.forEach(r => {
    gradeCount[r.grade as keyof typeof gradeCount]++;
  });

  console.log(`[Grading] Grade distribution:`, gradeCount);
  console.log(`[Grading] Average overall score: ${(results.reduce((sum, r) => sum + r.overallScore, 0) / results.length).toFixed(1)}`);
  console.log(`[Grading] Score range: ${Math.min(...results.map(r => r.overallScore))} - ${Math.max(...results.map(r => r.overallScore))}`);

  return results;
}
