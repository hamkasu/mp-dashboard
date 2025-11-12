import { db } from '../server/db';
import { hansardRecords, mps } from '@shared/schema';
import { HansardSpeakerParser } from '../server/hansard-speaker-parser';
import { storage } from '../server/storage';

interface UpdateResult {
  recordId: string;
  sessionNumber: string;
  speakersFound: number;
  unmatched: string[];
}

async function updateAllHansardSpeakers() {
  console.log('📚 Updating Hansard records with speaker information...\n');
  
  // Fetch all MPs for the parser
  const allMps = await storage.getAllMps();
  console.log(`✅ Loaded ${allMps.length} MPs for matching\n`);
  
  // Create parser instance
  const parser = new HansardSpeakerParser(allMps);
  
  // Fetch all Hansard records
  const records = await storage.getAllHansardRecords();
  console.log(`📄 Found ${records.length} Hansard records to process\n`);
  
  const results: UpdateResult[] = [];
  const allUnmatched: Set<string> = new Set();
  let processedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  
  for (const record of records) {
    processedCount++;
    console.log(`[${processedCount}/${records.length}] Processing ${record.sessionNumber}...`);
    
    // Skip if already has speakers
    if (record.speakers && record.speakers.length > 0) {
      console.log(`  ⏭️  Already has ${record.speakers.length} speakers, skipping`);
      skippedCount++;
      continue;
    }
    
    // Check if we have transcript
    if (!record.transcript || record.transcript.trim().length < 100) {
      console.log(`  ⚠️  No transcript available, skipping`);
      skippedCount++;
      continue;
    }
    
    try {
      // Extract speakers from transcript
      const { speakers, unmatched } = parser.extractSpeakers(record.transcript);
      
      // Update record with speakers
      if (speakers.length > 0) {
        await storage.updateHansardRecord(record.id, { speakers });
        updatedCount++;
        
        console.log(`  ✅ Updated with ${speakers.length} speakers`);
        
        // Track unmatched
        unmatched.forEach(name => allUnmatched.add(name));
        
        results.push({
          recordId: record.id,
          sessionNumber: record.sessionNumber,
          speakersFound: speakers.length,
          unmatched
        });
      } else {
        console.log(`  ⚠️  No speakers found in transcript`);
        skippedCount++;
      }
    } catch (error) {
      console.error(`  ❌ Error processing record:`, error);
      skippedCount++;
    }
    
    // Small delay to avoid overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total records: ${records.length}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Total speakers found: ${results.reduce((sum, r) => sum + r.speakersFound, 0)}`);
  console.log(`Unique unmatched speakers: ${allUnmatched.size}`);
  
  if (allUnmatched.size > 0) {
    console.log('\n⚠️  UNMATCHED SPEAKERS (need manual review):');
    console.log('='.repeat(60));
    Array.from(allUnmatched).sort().forEach(name => {
      console.log(`  - ${name}`);
    });
  }
  
  console.log('\n✅ Update complete!\n');
}

updateAllHansardSpeakers()
  .then(() => {
    console.log('Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
