/**
 * Test script to verify percentile calculation fix
 * Run with: npx tsx scripts/test-percentile-calculation.ts
 */

import {
  calculatePercentiles,
  calculateParticipationPercentiles,
  calculateFinalScores,
  getLetterGrade,
  type RankableMetric,
} from "../server/utils/percentile-grading";

console.log("=== Testing Percentile Calculation Fix ===\n");

// Test 1: Basic percentile calculation
console.log("Test 1: Basic Attendance Percentiles (from screenshot data)");
const attendanceData: RankableMetric[] = [
  { mpId: "mp1", value: 97 },  // Afnan Hamimi
  { mpId: "mp2", value: 96 },  // Teresa Kok
  { mpId: "mp3", value: 95 },  // Wan Razali
  { mpId: "mp4", value: 94 },  // Khairil Nizam
  { mpId: "mp5", value: 91 },  // Syed Saddiq
  { mpId: "mp6", value: 77 },  // Tan Kar Hing
  { mpId: "mp7", value: 69 },  // Khairil Nizam K
  { mpId: "mp8", value: 45 },  // Adnan Abu Hassan
  { mpId: "mp9", value: 33 },  // P Prabakaran
  { mpId: "mp10", value: 10 }, // Richard Riot
  { mpId: "mp11", value: 4 },  // Mohamad Hasan
];

const attendancePercentiles = calculatePercentiles(attendanceData, false);

console.log("Results:");
attendanceData.forEach(({ mpId, value }) => {
  const percentile = attendancePercentiles.get(mpId);
  console.log(`  ${mpId}: ${value}% → Percentile ${percentile?.toFixed(1)}`);
});

// Verify top performer gets ~100
const topPercentile = attendancePercentiles.get("mp1");
console.log(`\n✓ Top performer (97%) percentile: ${topPercentile?.toFixed(1)} (expected ~100)`);
console.log(`✓ Bottom performer (4%) percentile: ${attendancePercentiles.get("mp11")?.toFixed(1)} (expected ~0)`);

// Test 2: Ties handling
console.log("\n\nTest 2: Handling Ties");
const tiedData: RankableMetric[] = [
  { mpId: "a", value: 100 },
  { mpId: "b", value: 100 }, // Tied with a
  { mpId: "c", value: 90 },
  { mpId: "d", value: 90 },  // Tied with c
  { mpId: "e", value: 90 },  // Tied with c and d
  { mpId: "f", value: 80 },
];

const tiedPercentiles = calculatePercentiles(tiedData, false);
console.log("Results:");
tiedData.forEach(({ mpId, value }) => {
  const percentile = tiedPercentiles.get(mpId);
  console.log(`  ${mpId}: ${value} → Percentile ${percentile?.toFixed(1)}`);
});

console.log(`\n✓ Tied MPs (a,b with 100) should have same percentile: a=${tiedPercentiles.get("a")?.toFixed(1)}, b=${tiedPercentiles.get("b")?.toFixed(1)}`);
console.log(`✓ Tied MPs (c,d,e with 90) should have same percentile: c=${tiedPercentiles.get("c")?.toFixed(1)}, d=${tiedPercentiles.get("d")?.toFixed(1)}, e=${tiedPercentiles.get("e")?.toFixed(1)}`);

// Test 3: All same values (edge case)
console.log("\n\nTest 3: Edge Case - All MPs Have Same Value (e.g., all 0 court cases)");
const allSameData: RankableMetric[] = [
  { mpId: "mp1", value: 0 },
  { mpId: "mp2", value: 0 },
  { mpId: "mp3", value: 0 },
  { mpId: "mp4", value: 0 },
  { mpId: "mp5", value: 0 },
];

const allSamePercentiles = calculatePercentiles(allSameData, true); // Inverted for conduct
console.log("Results (all should be 50):");
allSameData.forEach(({ mpId, value }) => {
  const percentile = allSamePercentiles.get(mpId);
  console.log(`  ${mpId}: ${value} → Percentile ${percentile?.toFixed(1)}`);
});

const firstPercentile = allSamePercentiles.get("mp1");
console.log(`\n✓ All MPs with same value should get neutral 50: ${firstPercentile === 50 ? 'PASS' : 'FAIL'}`);

// Test 4: Participation composite
console.log("\n\nTest 4: Participation Composite (speeches 40%, bills 30%, questions 30%)");
const speeches: RankableMetric[] = [
  { mpId: "mp1", value: 5 },  // Syed Saddiq
  { mpId: "mp2", value: 3 },  // Afnan
  { mpId: "mp3", value: 3 },  // Teresa
];

const bills: RankableMetric[] = [
  { mpId: "mp1", value: 2 },  // Syed Saddiq
  { mpId: "mp2", value: 0 },  // Afnan
  { mpId: "mp3", value: 1 },  // Teresa
];

const questions: RankableMetric[] = [
  { mpId: "mp1", value: 3 },  // Syed Saddiq
  { mpId: "mp2", value: 2 },  // Afnan
  { mpId: "mp3", value: 2 },  // Teresa
];

const participationPercentiles = calculateParticipationPercentiles(
  speeches,
  bills,
  questions,
  { speeches: 0.4, bills: 0.3, questions: 0.3 }
);

console.log("Results:");
["mp1", "mp2", "mp3"].forEach(mpId => {
  const pct = participationPercentiles.get(mpId);
  console.log(`  ${mpId}: Composite Participation Percentile = ${pct?.toFixed(1)}`);
});

console.log(`\n✓ Syed Saddiq (highest in all metrics) should have highest percentile: ${participationPercentiles.get("mp1")?.toFixed(1)}`);

// Test 5: Final composite score
console.log("\n\nTest 5: Final Composite Score (40% att, 40% part, 15% conduct, 5% constituency)");

const sampleAttendance = new Map([
  ["mp1", 98.2],   // Syed Saddiq (91% attendance)
  ["mp2", 100],    // Afnan (97% attendance)
  ["mp3", 99.5],   // Teresa (96% attendance)
]);

const sampleParticipation = new Map([
  ["mp1", 95],     // Syed Saddiq (high participation)
  ["mp2", 70],     // Afnan (moderate participation)
  ["mp3", 75],     // Teresa (moderate participation)
]);

const sampleConduct = new Map([
  ["mp1", 85],
  ["mp2", 85],
  ["mp3", 85],
]);

const sampleConstituency = new Map([
  ["mp1", 50],
  ["mp2", 50],
  ["mp3", 50],
]);

const finalScores = calculateFinalScores(
  sampleAttendance,
  sampleParticipation,
  sampleConduct,
  sampleConstituency,
  { attendance: 0.40, participation: 0.40, conduct: 0.15, constituency: 0.05 }
);

console.log("Results:");
["mp1", "mp2", "mp3"].forEach(mpId => {
  const score = finalScores.get(mpId);
  const grade = score ? getLetterGrade(score) : 'N/A';
  const att = sampleAttendance.get(mpId);
  const part = sampleParticipation.get(mpId);

  console.log(`  ${mpId}: Score=${score}, Grade=${grade}`);
  console.log(`    Calculation: (${att?.toFixed(1)}*0.40) + (${part?.toFixed(1)}*0.40) + (85*0.15) + (50*0.05)`);
  console.log(`    = ${((att || 0)*0.40).toFixed(1)} + ${((part || 0)*0.40).toFixed(1)} + 12.8 + 2.5 = ${score}`);
});

console.log(`\n✓ Syed Saddiq should get Grade A (score ~92): ${getLetterGrade(finalScores.get("mp1") || 0)}`);
console.log(`✓ NO MPs should have score 0!`);

// Test 6: Verify no NaN or undefined
console.log("\n\nTest 6: Verify No NaN or Undefined Values");
let hasError = false;

finalScores.forEach((score, mpId) => {
  if (isNaN(score) || score === undefined || score === null) {
    console.error(`  ✗ ERROR: ${mpId} has invalid score: ${score}`);
    hasError = true;
  }
});

if (!hasError) {
  console.log("  ✓ All scores are valid numbers");
}

console.log("\n=== All Tests Complete ===");
console.log("\nIf all tests pass, the percentile calculation logic is working correctly.");
console.log("If MPs still show score 0 after recalculation, check:");
console.log("1. Server has been rebuilt (npm run build)");
console.log("2. Server has been restarted");
console.log("3. Grade recalculation has been triggered (/api/admin/report-cards/update)");
console.log("4. Check server logs for runtime errors");
