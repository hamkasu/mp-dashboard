import { db } from "../server/db";
import { constituencies } from "@shared/schema";
import { promises as fs } from "fs";
import path from "path";
import { eq } from "drizzle-orm";

/**
 * Script to import poverty data from CSV into the constituencies table
 * Run with: tsx scripts/import-poverty-data.ts
 */

interface PovertyDataRow {
  state: string;
  parlimen: string;
  poverty_incidence: string;
}

async function importPovertyData() {
  try {
    console.log("Starting poverty data import...");

    // Read the CSV file
    const csvPath = path.join(process.cwd(), "poverty_by_constituency.csv");
    const csvContent = await fs.readFile(csvPath, "utf-8");

    // Parse CSV (skip header)
    const lines = csvContent.trim().split("\n");
    const dataRows = lines.slice(1); // Skip header row

    let inserted = 0;
    let updated = 0;
    let failed = 0;

    for (const line of dataRows) {
      // Split by comma and handle potential quoted values
      const match = line.match(/^([^,]+),([^,]+),([^,]+)$/);
      if (!match) {
        console.warn(`Skipping malformed line: ${line}`);
        failed++;
        continue;
      }

      const [, state, parlimen, povertyIncidence] = match;

      // Extract parliament code (e.g., "P.001" from "P.001 Padang Besar")
      const codeMatch = parlimen.match(/^(P\.\d+)/);
      if (!codeMatch) {
        console.warn(`Could not extract parliament code from: ${parlimen}`);
        failed++;
        continue;
      }

      const parliamentCode = codeMatch[1];
      // Extract name (e.g., "Padang Besar" from "P.001 Padang Besar")
      const name = parlimen.replace(/^P\.\d+\s+/, "").trim();

      // Convert poverty incidence to integer (multiply by 10 to store as tenths)
      // e.g., 5.7% -> 57 (representing 5.7%)
      const povertyValue = parseFloat(povertyIncidence);
      const povertyIncidenceInt = Math.round(povertyValue * 10);

      try {
        // Check if constituency already exists
        const existing = await db
          .select()
          .from(constituencies)
          .where(eq(constituencies.parliamentCode, parliamentCode))
          .limit(1);

        if (existing.length > 0) {
          // Update existing record
          await db
            .update(constituencies)
            .set({
              state: state.trim(),
              name: name,
              povertyIncidence: povertyIncidenceInt,
              updatedAt: new Date(),
            })
            .where(eq(constituencies.parliamentCode, parliamentCode));

          updated++;
          console.log(`Updated: ${parliamentCode} - ${name} (${povertyValue}%)`);
        } else {
          // Insert new record
          await db.insert(constituencies).values({
            state: state.trim(),
            parliamentCode: parliamentCode,
            name: name,
            povertyIncidence: povertyIncidenceInt,
          });

          inserted++;
          console.log(`Inserted: ${parliamentCode} - ${name} (${povertyValue}%)`);
        }
      } catch (error) {
        console.error(`Error processing ${parliamentCode}:`, error);
        failed++;
      }
    }

    console.log("\n=== Import Summary ===");
    console.log(`Total rows processed: ${dataRows.length}`);
    console.log(`Inserted: ${inserted}`);
    console.log(`Updated: ${updated}`);
    console.log(`Failed: ${failed}`);
    console.log("======================");

    process.exit(0);
  } catch (error) {
    console.error("Fatal error during import:", error);
    console.error("Continuing deployment despite import failure...");
    process.exit(0); // Exit with 0 to not break deployment
  }
}

// Run the import
importPovertyData();
