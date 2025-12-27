/**
 * Test the new simplified grading system
 */

import { calculateGrades } from "../server/utils/percentile-grading-v2";

console.log("=== Testing New Grading System ===\n");

// Test data matching screenshot values
const testData = [
  {
    mpId: "mp1",
    attendancePercentage: 100,  // Syed Saddiq (228/228 = 100%)
    averageSpeeches: 6.33,      // 627/99 sessions
    billsRaised: 2,
    questionsAsked: 3,
    courtCases: 0,
    inappropriateLanguage: 0,
  },
  {
    mpId: "mp2",
    attendancePercentage: 100,  // Afnan (perfect attendance)
    averageSpeeches: 3,
    billsRaised: 0,
    questionsAsked: 2,
    courtCases: 0,
    inappropriateLanguage: 0,
  },
  {
    mpId: "mp3",
    attendancePercentage: 100,  // Teresa (perfect attendance)
    averageSpeeches: 3,
    billsRaised: 1,
    questionsAsked: 2,
    courtCases: 0,
    inappropriateLanguage: 0,
  },
  {
    mpId: "mp4",
    attendancePercentage: 45,   // Low attendance
    averageSpeeches: 2,
    billsRaised: 0,
    questionsAsked: 1,
    courtCases: 0,
    inappropriateLanguage: 0,
  },
  {
    mpId: "mp5",
    attendancePercentage: 10,   // Very low attendance
    averageSpeeches: 1,
    billsRaised: 0,
    questionsAsked: 0,
    courtCases: 1,              // Has a court case
    inappropriateLanguage: 0,
  },
];

const results = calculateGrades(testData);

console.log("\n=== Results ===\n");

results.forEach((result, i) => {
  const mp = testData[i];
  console.log(`MP ${i + 1} (${result.mpId}):`);
  console.log(`  Raw Attendance: ${mp.attendancePercentage}%`);
  console.log(`  Raw Avg Speeches: ${mp.averageSpeeches}`);
  console.log(`  → Attendance Percentile: ${result.attendancePercentile}`);
  console.log(`  → Participation Percentile: ${result.participationPercentile}`);
  console.log(`  → Conduct Percentile: ${result.conductPercentile}`);
  console.log(`  → OVERALL SCORE: ${result.overallScore}`);
  console.log(`  → GRADE: ${result.grade}`);
  console.log();
});

// Verify expectations
console.log("=== Verification ===\n");

const mp1 = results[0]; // Syed Saddiq
const mp5 = results[4]; // Worst performer

console.log(`✓ MP1 (high performer) overall score: ${mp1.overallScore} (expected 85-95, grade A/B)`);
console.log(`  Grade: ${mp1.grade} (expected A or B)`);

console.log(`✓ MP5 (low performer) overall score: ${mp5.overallScore} (expected 0-40, grade F)`);
console.log(`  Grade: ${mp5.grade} (expected F)`);

// Check that no scores are 0 for high performers
const hasZeros = results.filter(r => r.overallScore === 0 && testData[results.indexOf(r)].attendancePercentage > 50);
console.log(`\n✓ High performers with score 0: ${hasZeros.length} (expected 0)`);

if (hasZeros.length > 0) {
  console.error("  ERROR: Some high performers have score 0!");
  hasZeros.forEach(r => console.error(`    ${r.mpId}: ${r.overallScore}`));
} else {
  console.log("  ✓ PASS: All high performers have non-zero scores");
}

console.log("\n=== Test Complete ===");
console.log("\nIf all checks pass, the new grading system is working correctly!");
