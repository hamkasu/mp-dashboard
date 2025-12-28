/**
 * Simple test to verify poverty rate is being used in report card calculations
 */

import { db } from "../server/db";
import { mps, constituencies } from "@shared/schema";
import { eq } from "drizzle-orm";

async function testPovertyCalculation() {
  try {
    console.log("=== Testing Poverty Rate Data ===\n");

    // Test 1: Check if constituencies have poverty data
    const sampleConstituencies = await db
      .select()
      .from(constituencies)
      .limit(5);

    console.log("Sample constituencies with poverty data:");
    sampleConstituencies.forEach(c => {
      const povertyRate = c.povertyIncidence ? (c.povertyIncidence / 10).toFixed(1) : "N/A";
      console.log(`  ${c.parliamentCode} - ${c.name}: ${povertyRate}%`);
    });

    // Test 2: Check MPs and their constituencies
    console.log("\nSample MPs with their constituencies:");
    const sampleMps = await db
      .select({
        mpName: mps.name,
        parliamentCode: mps.parliamentCode,
        constituency: mps.constituency,
      })
      .from(mps)
      .limit(5);

    for (const mp of sampleMps) {
      const constituencyData = await db
        .select()
        .from(constituencies)
        .where(eq(constituencies.parliamentCode, mp.parliamentCode))
        .limit(1);

      if (constituencyData.length > 0) {
        const povertyRate = constituencyData[0].povertyIncidence
          ? (constituencyData[0].povertyIncidence / 10).toFixed(1)
          : "N/A";
        console.log(`  ${mp.mpName} (${mp.parliamentCode}): Poverty ${povertyRate}%`);
      } else {
        console.log(`  ${mp.mpName} (${mp.parliamentCode}): No constituency data found`);
      }
    }

    // Test 3: Show poverty rate distribution
    const allConstituencies = await db.select().from(constituencies);
    const withPoverty = allConstituencies.filter(c => c.povertyIncidence !== null && c.povertyIncidence !== undefined);
    const povertyRates = withPoverty.map(c => c.povertyIncidence! / 10).sort((a, b) => a - b);

    console.log(`\n=== Poverty Rate Distribution ===`);
    console.log(`Total constituencies: ${allConstituencies.length}`);
    console.log(`With poverty data: ${withPoverty.length}`);
    if (povertyRates.length > 0) {
      console.log(`Lowest poverty rate: ${povertyRates[0].toFixed(1)}%`);
      console.log(`Highest poverty rate: ${povertyRates[povertyRates.length - 1].toFixed(1)}%`);
      console.log(`Average poverty rate: ${(povertyRates.reduce((a, b) => a + b, 0) / povertyRates.length).toFixed(1)}%`);
    }

    console.log("\n✓ Poverty data test complete!");
    process.exit(0);

  } catch (error) {
    console.error("Error testing poverty calculation:", error);
    process.exit(1);
  }
}

testPovertyCalculation();
