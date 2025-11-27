/**
 * Backfill script to pre-compute speaker data for existing Hansard records
 * 
 * This script processes Hansard records that don't have speakerStats populated
 * and parses their PDFs to extract and save speaker information.
 * 
 * Usage: npm run backfill-speakers
 */

import { db } from "../server/db";
import { mps, hansardRecords, hansardPdfFiles } from '../shared/schema';
import { eq, or, sql } from "drizzle-orm";
import { HansardPdfParser } from "../server/hansard-pdf-parser";
import axios from "axios";
import crypto from "crypto";

const skippedRecords: string[] = [];

async function backfillHansardSpeakers() {
  console.log("🔄 Starting Hansard speaker backfill...\n");

  if (!db) {
    console.error("❌ Database not available. Exiting.");
    process.exit(1);
  }

  try {
    // Get all MPs for speaker matching
    const allMps = await db.select().from(mps);
    console.log(`📋 Loaded ${allMps.length} MPs for speaker matching\n`);

    // Find Hansard records without speaker data
    // We check for empty arrays or null speakerStats
    const recordsToProcess = await db
      .select({
        id: hansardRecords.id,
        sessionNumber: hansardRecords.sessionNumber,
        sessionDate: hansardRecords.sessionDate,
        speakerStats: hansardRecords.speakerStats,
        speakers: hansardRecords.speakers,
        pdfLinks: hansardRecords.pdfLinks,
      })
      .from(hansardRecords)
      .where(
        or(
          sql`${hansardRecords.speakerStats} = '[]'::jsonb`,
          sql`${hansardRecords.speakerStats} IS NULL`,
          sql`jsonb_array_length(${hansardRecords.speakerStats}) = 0`
        )
      )
      .orderBy(hansardRecords.sessionDate);

    console.log(`📊 Found ${recordsToProcess.length} records without speaker data\n`);

    if (recordsToProcess.length === 0) {
      console.log("✅ All records already have speaker data. Nothing to backfill.");
      return;
    }

    const parser = new HansardPdfParser(allMps);
    let processed = 0;
    let skipped = 0;
    let failed = 0;
    let downloadedFromUrl = 0;

    for (const record of recordsToProcess) {
      try {
        console.log(`\n🔍 Processing ${record.sessionNumber} (${processed + skipped + failed + 1}/${recordsToProcess.length})`);

        let pdfBuffer: Buffer | null = null;

        // PRIORITY 1: Get PDF from database
        const [pdfFile] = await db
          .select()
          .from(hansardPdfFiles)
          .where(eq(hansardPdfFiles.hansardRecordId, record.id))
          .limit(1);

        if (pdfFile && pdfFile.pdfData) {
          pdfBuffer = pdfFile.pdfData;
          console.log(`  📄 Using DB PDF: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB`);
        }
        // PRIORITY 2: Fall back to downloading from URL
        else if (record.pdfLinks && record.pdfLinks.length > 0) {
          const pdfUrl = record.pdfLinks[0];
          console.log(`  📥 Downloading from: ${pdfUrl}`);
          try {
            const response = await axios.get(pdfUrl, {
              responseType: 'arraybuffer',
              timeout: 30000,
            });
            pdfBuffer = Buffer.from(response.data);
            downloadedFromUrl++;
            console.log(`  ✅ Downloaded: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB`);
            
            // Save the downloaded PDF to database for future use
            const md5Hash = crypto.createHash('md5').update(pdfBuffer).digest('hex');
            const originalFilename = pdfUrl.split('/').pop() || `${record.sessionNumber.replace(/\./g, '')}.pdf`;
            
            await db.insert(hansardPdfFiles).values({
              hansardRecordId: record.id,
              originalFilename: originalFilename,
              fileSizeBytes: pdfBuffer.length,
              contentType: 'application/pdf',
              pdfData: pdfBuffer,
              md5Hash: md5Hash,
              isPrimary: true,
            });
            console.log(`  💾 Saved PDF to database for future use`);
          } catch (downloadError) {
            console.log(`  ⚠️  Download failed: ${downloadError instanceof Error ? downloadError.message : 'Unknown error'}`);
          }
        }

        if (!pdfBuffer) {
          console.log(`  ⏭️  Skipping - No PDF available (not in DB and no working URL)`);
          skippedRecords.push(record.sessionNumber);
          skipped++;
          continue;
        }

        // Parse the PDF
        const parsed = await parser.parseHansardPdf(pdfBuffer, record.sessionNumber);

        if (parsed.speakers.length === 0) {
          console.log(`  ⚠️  No speakers found in PDF`);
          skippedRecords.push(record.sessionNumber);
          skipped++;
          continue;
        }

        // Count speeches per MP from all speaking instances
        const speechesPerMp = new Map<string, number>();
        for (const instance of parsed.allSpeakingInstances) {
          speechesPerMp.set(instance.mpId, (speechesPerMp.get(instance.mpId) || 0) + 1);
        }

        // Build speakerStats array using parser's speaking order
        const speakerStats = parsed.speakers.map((s) => ({
          mpId: s.mpId,
          mpName: s.mpName,
          totalSpeeches: speechesPerMp.get(s.mpId) || 1,
          speakingOrder: s.speakingOrder, // Use parser's order
        }));

        // Update the record
        await db
          .update(hansardRecords)
          .set({
            speakers: parsed.speakers,
            speakerStats: speakerStats,
            sessionSpeakerStats: {
              totalUniqueSpeakers: parsed.speakers.length,
              speakingMpIds: parsed.speakers.map(s => s.mpId),
              speakingConstituencies: parsed.speakerStats.speakingConstituencies,
              constituenciesAttended: parsed.speakerStats.constituenciesAttended,
              constituenciesSpoke: parsed.speakerStats.constituenciesSpoke,
              constituenciesAttendedButSilent: parsed.speakerStats.constituenciesAttendedButSilent,
              attendanceRate: parsed.speakerStats.attendanceRate,
            },
          })
          .where(eq(hansardRecords.id, record.id));

        console.log(`  ✅ Updated with ${speakerStats.length} speakers`);
        processed++;

        // Clear buffer to free memory
        pdfBuffer = null as any;

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        // Small delay between records to prevent memory pressure
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`  ❌ Error processing ${record.sessionNumber}:`, error);
        failed++;
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("📊 BACKFILL COMPLETE");
    console.log("=".repeat(50));
    console.log(`  ✅ Processed:     ${processed}`);
    console.log(`  📥 From URL:      ${downloadedFromUrl}`);
    console.log(`  ⏭️  Skipped:       ${skipped}`);
    console.log(`  ❌ Failed:        ${failed}`);
    console.log(`  📋 Total:         ${recordsToProcess.length}`);

    if (skippedRecords.length > 0) {
      console.log("\n⚠️  Skipped records (need manual follow-up):");
      for (const sessionNum of skippedRecords) {
        console.log(`   - ${sessionNum}`);
      }
    }

  } catch (error) {
    console.error("❌ Fatal error during backfill:", error);
    process.exit(1);
  }
}

// Run if executed directly
backfillHansardSpeakers()
  .then(() => {
    console.log("\n🎉 Backfill script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
