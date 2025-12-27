/**
 * Debug script to diagnose why overall_score is 0
 * Run with: npx tsx scripts/debug-grading.ts
 */

import { db } from "../server/db";
import { mps, mpReportCards } from "../shared/schema";
import { eq } from "drizzle-orm";
import {
  calculatePercentiles,
  calculateFinalScores,
  getLetterGrade,
  type RankableMetric,
} from "../server/utils/percentile-grading";

async function debugGrading() {
  console.log("=== Debugging Grading Calculation ===\n");

  // Get Syed Saddiq's data
  const syed = await db
    .select()
    .from(mps)
    .where(eq(mps.name, "Syed Saddiq Syed Abdul Rahman"))
    .limit(1);

  if (syed.length === 0) {
    console.error("Syed Saddiq not found!");
    return;
  }

  const syedData = syed[0];
  console.log("Syed Saddiq MP Data:");
  console.log(`  MP ID: ${syedData.id}`);
  console.log(`  Attendance: ${syedData.daysAttended}/${syedData.totalParliamentDays} = ${(syedData.daysAttended/syedData.totalParliamentDays*100).toFixed(2)}%`);
  console.log(`  Speeches: ${syedData.totalSpeechInstances} total, ${syedData.hansardSessionsSpoke} sessions`);
  console.log(`  Avg speeches/session: ${(syedData.totalSpeechInstances/syedData.hansardSessionsSpoke).toFixed(2)}\n`);

  // Get his report card
  const reportCard = await db
    .select()
    .from(mpReportCards)
    .where(eq(mpReportCards.mpId, syedData.id))
    .limit(1);

  if (reportCard.length > 0) {
    const card = reportCard[0];
    console.log("Syed Saddiq Report Card (from DB):");
    console.log(`  Attendance Score: ${card.attendanceScore}`);
    console.log(`  Participation Score: ${card.participationScore}`);
    console.log(`  Conduct Score: ${card.conductScore}`);
    console.log(`  Constituency Score: ${card.constituencyImpactScore}`);
    console.log(`  Overall Score: ${card.overallScore}`);
    console.log(`  Grade: ${card.grade}\n`);
  }

  // Test calculateFinalScores directly
  console.log("Testing calculateFinalScores() directly:");

  const testAttendance = new Map([[syedData.id, 97]]);
  const testParticipation = new Map([[syedData.id, 79]]);
  const testConduct = new Map([[syedData.id, 85]]);
  const testConstituency = new Map([[syedData.id, 50]]);

  console.log("\nInput Maps:");
  console.log(`  Attendance Map: ${testAttendance.get(syedData.id)}`);
  console.log(`  Participation Map: ${testParticipation.get(syedData.id)}`);
  console.log(`  Conduct Map: ${testConduct.get(syedData.id)}`);
  console.log(`  Constituency Map: ${testConstituency.get(syedData.id)}`);

  const finalScores = calculateFinalScores(
    testAttendance,
    testParticipation,
    testConduct,
    testConstituency,
    { attendance: 0.40, participation: 0.40, conduct: 0.15, constituency: 0.05 }
  );

  const finalScore = finalScores.get(syedData.id);
  console.log(`\nOutput from calculateFinalScores():`);
  console.log(`  Final Score: ${finalScore}`);
  console.log(`  Grade: ${finalScore ? getLetterGrade(finalScore) : 'N/A'}`);

  // Manual calculation
  const manualScore = (97 * 0.40) + (79 * 0.40) + (85 * 0.15) + (50 * 0.05);
  console.log(`\nManual calculation:`);
  console.log(`  (97 * 0.40) + (79 * 0.40) + (85 * 0.15) + (50 * 0.05)`);
  console.log(`  = 38.8 + 31.6 + 12.75 + 2.5`);
  console.log(`  = ${manualScore}`);
  console.log(`  Rounded: ${Math.round(manualScore)}`);
  console.log(`  Expected Grade: ${getLetterGrade(Math.round(manualScore))}`);

  // Check if Map is empty
  console.log(`\nfinalScores Map size: ${finalScores.size}`);
  console.log(`Contains Syed's ID? ${finalScores.has(syedData.id)}`);

  // Check all MPs
  console.log(`\n=== Checking All MPs ===`);
  const allMps = await db.select({ id: mps.id, name: mps.name }).from(mps).limit(5);

  for (const mp of allMps) {
    const card = await db
      .select()
      .from(mpReportCards)
      .where(eq(mpReportCards.mpId, mp.id))
      .limit(1);

    if (card.length > 0) {
      const c = card[0];
      console.log(`${mp.name}: overall=${c.overallScore}, att=${c.attendanceScore}, part=${c.participationScore}`);
    }
  }

  process.exit(0);
}

debugGrading().catch(console.error);
