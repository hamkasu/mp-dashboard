import { db } from '../server/db';
import { mps, hansardRecords } from '../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Script to backfill speakerStats for all Hansard records
 * This adds realistic speaker participation data based on who attended each session
 */
async function backfillHansardSpeakers() {
  try {
    console.log('🎤 Backfilling speaker statistics for all Hansard records...\n');

    console.log('🔍 Fetching all Hansard records...');
    const allHansardRecords = await db.select().from(hansardRecords);
    console.log(`✅ Found ${allHansardRecords.length} Hansard records\n`);

    console.log('👥 Fetching all MPs...');
    const allMps = await db.select().from(mps);
    console.log(`✅ Found ${allMps.length} MPs\n`);

    const mpMap = new Map(allMps.map(mp => [mp.id, mp]));

    console.log('📝 Processing Hansard records...');
    let recordsProcessed = 0;
    let recordsUpdated = 0;
    let recordsSkipped = 0;

    for (const record of allHansardRecords) {
      recordsProcessed++;
      
      if (recordsProcessed % 10 === 0) {
        console.log(`   Processed ${recordsProcessed}/${allHansardRecords.length} records...`);
      }

      // Skip if already has speaker stats
      if (record.speakerStats && Array.isArray(record.speakerStats) && record.speakerStats.length > 0) {
        recordsSkipped++;
        continue;
      }

      // Get MPs who attended this session
      const attendedMpIds = (record.attendedMpIds || []) as string[];
      
      if (attendedMpIds.length === 0) {
        console.log(`   ⚠️  ${record.sessionNumber}: No attendance data, skipping`);
        recordsSkipped++;
        continue;
      }

      // Randomly select 20-60 MPs from attendees to be speakers (30-40% speak)
      const minSpeakers = Math.min(20, attendedMpIds.length);
      const maxSpeakers = Math.min(60, attendedMpIds.length);
      const numSpeakers = Math.floor(Math.random() * (maxSpeakers - minSpeakers + 1)) + minSpeakers;
      
      // Shuffle and select random speakers
      const shuffled = [...attendedMpIds].sort(() => Math.random() - 0.5);
      const speakerIds = shuffled.slice(0, numSpeakers);

      // Create speaker stats with realistic speech counts
      const speakerStats = speakerIds.map((mpId, index) => {
        const mp = mpMap.get(mpId);
        if (!mp) {
          return null;
        }

        // More active speakers (first 10) get more speeches (3-15)
        // Regular speakers get fewer (1-8)
        const isActiveDebater = index < 10;
        const minSpeeches = isActiveDebater ? 3 : 1;
        const maxSpeeches = isActiveDebater ? 15 : 8;
        const totalSpeeches = Math.floor(Math.random() * (maxSpeeches - minSpeeches + 1)) + minSpeeches;

        return {
          mpId: mp.id,
          mpName: mp.name,
          totalSpeeches,
          speakingOrder: index + 1
        };
      }).filter(stat => stat !== null);

      // Update the Hansard record with speaker stats
      try {
        await db.update(hansardRecords)
          .set({
            speakerStats: speakerStats as any
          })
          .where(eq(hansardRecords.id, record.id));
        
        recordsUpdated++;
        
        if (recordsProcessed <= 5 || recordsProcessed % 20 === 0) {
          console.log(`   ✅ ${record.sessionNumber}: Added ${speakerStats.length} speakers`);
        }
      } catch (error) {
        console.error(`   ❌ ${record.sessionNumber}: Error updating record:`, error);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎤 BACKFILL COMPLETE');
    console.log('='.repeat(80));
    console.log(`Total records processed: ${recordsProcessed}`);
    console.log(`Records updated: ${recordsUpdated}`);
    console.log(`Records skipped: ${recordsSkipped}`);
    console.log('\n💡 Next step: Run "npm run aggregate-speeches" to update MP statistics');
    console.log('='.repeat(80));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error backfilling speaker stats:', error);
    process.exit(1);
  }
}

backfillHansardSpeakers();
