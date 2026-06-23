/**
 * Extract individual speech turns from Hansard records
 * Populates hansard_speeches table from hansardRecords transcripts
 */

import { db } from '../server/db';
import { hansardRecords, hansardSpeeches, mps } from '@shared/schema';
import { HansardSpeakerParser } from '../server/hansard-speaker-parser';
import { eq } from 'drizzle-orm';

async function extractSpeechesFromRecords() {
  console.log('🔍 Extracting speech turns from Hansard records...');

  // Get all MPs for speaker parsing
  const allMps = await db.select().from(mps);
  const speakerParser = new HansardSpeakerParser(allMps);

  // Get all Hansard records
  const records = await db.select().from(hansardRecords);
  console.log(`📚 Found ${records.length} Hansard records`);

  let totalExtracted = 0;
  let recordsProcessed = 0;

  for (const record of records) {
    try {
      recordsProcessed++;
      if (recordsProcessed % 5 === 0) {
        console.log(`⏳ Processing record ${recordsProcessed}/${records.length}...`);
      }

      // Check if speeches already extracted for this record
      const existingSpeechCount = (
        await db
          .select({ count: hansardSpeeches.id })
          .from(hansardSpeeches)
          .where(eq(hansardSpeeches.hansardRecordId, record.id))
      ).length;

      if (existingSpeechCount > 0) {
        console.log(
          `⏭️  Skipping ${record.sessionNumber} (${existingSpeechCount} speeches already extracted)`
        );
        continue;
      }

      // Parse the transcript to extract speakers and their speeches
      const { allInstances } = speakerParser.extractSpeakers(record.transcript);

      if (allInstances.length === 0) {
        console.log(`⚠️  No speakers extracted from ${record.sessionNumber}`);
        continue;
      }

      // Create a map of mpName -> mpId for quick lookup
      const mpNameMap = new Map<string, string>();
      for (const mp of allMps) {
        mpNameMap.set(mp.name, mp.id);
      }

      // Insert each speaking instance as a speech record
      const speeches = [];
      for (const instance of allInstances) {
        const mpId = mpNameMap.get(instance.mpName);
        if (!mpId) {
          console.warn(`⚠️  Could not find MP ID for ${instance.mpName}`);
          continue;
        }

        speeches.push({
          hansardRecordId: record.id,
          mpId,
          speechText: instance.speechText || '',
          instanceNumber: instance.instanceNumber,
          speakingOrder: instance.speakingOrder,
          characterOffsetStart: instance.headerPosition,
          characterOffsetEnd:
            instance.headerPosition + (instance.headerLength || 0) + (instance.speechText?.length || 0),
        });
      }

      if (speeches.length > 0) {
        await db.insert(hansardSpeeches).values(speeches);
        totalExtracted += speeches.length;
        console.log(
          `✅ Extracted ${speeches.length} speeches from ${record.sessionNumber} (session date: ${record.sessionDate})`
        );
      }
    } catch (error) {
      console.error(`❌ Error processing record ${record.sessionNumber}:`, error);
    }
  }

  console.log(`\n📊 Extraction Complete!`);
  console.log(`   - Records processed: ${recordsProcessed}`);
  console.log(`   - Total speeches extracted: ${totalExtracted}`);

  process.exit(0);
}

// Run extraction
extractSpeechesFromRecords().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
