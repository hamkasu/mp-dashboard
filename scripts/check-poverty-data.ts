import { db } from "../server/db";
import { constituencies } from "@shared/schema";
import { sql } from "drizzle-orm";

async function checkPovertyData() {
  try {
    console.log("Checking poverty data in constituencies table...\n");

    // Count total constituencies
    const total = await db.select({ count: sql<number>`count(*)` }).from(constituencies);
    console.log(`Total constituencies in database: ${total[0].count}`);

    // Count constituencies with poverty data
    const withPoverty = await db
      .select({ count: sql<number>`count(*)` })
      .from(constituencies)
      .where(sql`${constituencies.povertyIncidence} IS NOT NULL`);
    console.log(`Constituencies with poverty data: ${withPoverty[0].count}`);

    // Show a few examples
    console.log("\nSample constituencies with poverty data:");
    const samples = await db
      .select()
      .from(constituencies)
      .where(sql`${constituencies.povertyIncidence} IS NOT NULL`)
      .limit(5);

    samples.forEach((c) => {
      const povertyRate = c.povertyIncidence ? (c.povertyIncidence / 10).toFixed(1) : "N/A";
      console.log(`  ${c.parliamentCode} - ${c.name}: ${povertyRate}%`);
    });

    // Show examples without poverty data if any
    const withoutPoverty = await db
      .select()
      .from(constituencies)
      .where(sql`${constituencies.povertyIncidence} IS NULL`)
      .limit(5);

    if (withoutPoverty.length > 0) {
      console.log("\nSample constituencies WITHOUT poverty data:");
      withoutPoverty.forEach((c) => {
        console.log(`  ${c.parliamentCode} - ${c.name}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error("Error checking poverty data:", error);
    process.exit(1);
  }
}

checkPovertyData();
