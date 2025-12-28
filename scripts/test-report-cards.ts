/**
 * Simple test script for report card grading
 */

import { calculateAllGrades } from "../server/services/report-card-service";

async function testGrading() {
  console.log("=".repeat(60));
  console.log("TESTING REPORT CARD GRADING");
  console.log("=".repeat(60));

  try {
    const grades = await calculateAllGrades();

    console.log(`\n✓ Successfully calculated grades for ${grades.length} MPs`);

    // Show top 5 MPs
    console.log("\nTop 5 MPs:");
    const sorted = [...grades].sort((a, b) => b.overallScore - a.overallScore);
    sorted.slice(0, 5).forEach((mp, i) => {
      console.log(`  ${i + 1}. ${mp.name.padEnd(30)} | ${mp.grade} (${mp.overallScore}) | Att: ${mp.attendanceScore} | Part: ${mp.participationScore}`);
    });

    // Show bottom 5 MPs
    console.log("\nBottom 5 MPs:");
    sorted.slice(-5).reverse().forEach((mp, i) => {
      console.log(`  ${sorted.length - i}. ${mp.name.padEnd(30)} | ${mp.grade} (${mp.overallScore}) | Att: ${mp.attendanceScore} | Part: ${mp.participationScore}`);
    });

    // Grade distribution
    const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    grades.forEach(g => distribution[g.grade as keyof typeof distribution]++);
    console.log("\nGrade Distribution:");
    console.log(`  A: ${distribution.A} MPs`);
    console.log(`  B: ${distribution.B} MPs`);
    console.log(`  C: ${distribution.C} MPs`);
    console.log(`  D: ${distribution.D} MPs`);
    console.log(`  F: ${distribution.F} MPs`);

    // Verify no zeros
    const zeros = grades.filter(g => g.overallScore === 0);
    if (zeros.length > 0) {
      console.log(`\n⚠️  WARNING: ${zeros.length} MPs have score 0!`);
      zeros.slice(0, 3).forEach(mp => {
        console.log(`  - ${mp.name}: Att ${mp.attendanceScore}, Part ${mp.participationScore}`);
      });
    } else {
      console.log("\n✓ No MPs with score 0 (good!)");
    }

    console.log("\n" + "=".repeat(60));
    console.log("TEST COMPLETE ✓");
    console.log("=".repeat(60));

    process.exit(0);
  } catch (error) {
    console.error("\n✗ ERROR:", error);
    process.exit(1);
  }
}

testGrading();
