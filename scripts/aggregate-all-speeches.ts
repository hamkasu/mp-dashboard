import { db, isDatabaseAvailable } from '../server/db';
import { mps, hansardRecords } from '../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Script to aggregate speech data from all Hansard records and update MP statistics
 * This counts:
 * - hansardSessionsSpoke: Number of unique sessions where MP spoke
 * - totalSpeechInstances: Total number of times MP spoke across all sessions
 */
async function aggregateAllSpeeches() {
  try {
    console.log('📊 Aggregating speech data from all Hansard records...\n');

    if (!isDatabaseAvailable() || !db) {
      console.error("DATABASE_URL not set. Cannot aggregate speeches.");
      process.exit(1);
    }

    console.log('🔍 Fetching all Hansard records...');
    const allHansardRecords = await db.select().from(hansardRecords);
    console.log(`✅ Found ${allHansardRecords.length} Hansard records\n`);

    console.log('👥 Fetching all MPs...');
    const allMps = await db.select().from(mps);
    console.log(`✅ Found ${allMps.length} MPs\n`);

    const mpSpeechData = new Map<string, {
      sessionsSpoke: number;
      totalSpeeches: number;
      mpName: string;
    }>();

    allMps.forEach(mp => {
      mpSpeechData.set(mp.id, {
        sessionsSpoke: 0,
        totalSpeeches: 0,
        mpName: mp.name
      });
    });

    console.log('📈 Processing Hansard records...');
    let recordsProcessed = 0;

    for (const record of allHansardRecords) {
      recordsProcessed++;
      
      if (recordsProcessed % 5 === 0) {
        console.log(`   Processed ${recordsProcessed}/${allHansardRecords.length} records...`);
      }

      const speakerStats = record.speakerStats as Array<{
        mpId: string;
        mpName: string;
        totalSpeeches: number;
        speakingOrder: number | null;
      }>;

      if (!speakerStats || speakerStats.length === 0) {
        continue;
      }

      for (const stat of speakerStats) {
        const mpData = mpSpeechData.get(stat.mpId);
        if (mpData) {
          mpData.sessionsSpoke++;
          mpData.totalSpeeches += stat.totalSpeeches || 0;
        }
      }
    }

    console.log(`✅ Processed all ${recordsProcessed} Hansard records\n`);

    console.log('💾 Updating MP records in database...\n');
    let updatedCount = 0;
    let unchangedCount = 0;

    for (const [mpId, data] of mpSpeechData.entries()) {
      if (data.sessionsSpoke > 0 || data.totalSpeeches > 0) {
        await db.update(mps)
          .set({
            hansardSessionsSpoke: data.sessionsSpoke,
            totalSpeechInstances: data.totalSpeeches
          })
          .where(eq(mps.id, mpId));
        
        updatedCount++;
        
        if (data.totalSpeeches > 0) {
          console.log(`   ✅ ${data.mpName}: ${data.sessionsSpoke} sessions, ${data.totalSpeeches} speeches`);
        }
      } else {
        unchangedCount++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 AGGREGATION COMPLETE');
    console.log('='.repeat(80));
    console.log(`Total MPs updated: ${updatedCount}`);
    console.log(`MPs with no speeches: ${unchangedCount}`);
    console.log(`Total Hansard records processed: ${allHansardRecords.length}`);
    
    const topSpeakers = Array.from(mpSpeechData.entries())
      .filter(([_, data]) => data.totalSpeeches > 0)
      .sort((a, b) => b[1].totalSpeeches - a[1].totalSpeeches)
      .slice(0, 10);

    if (topSpeakers.length > 0) {
      console.log('\n🎤 Top 10 Most Active Speakers:');
      topSpeakers.forEach(([_, data], idx) => {
        console.log(`   ${idx + 1}. ${data.mpName}: ${data.totalSpeeches} speeches across ${data.sessionsSpoke} sessions`);
      });
    }

    console.log('\n' + '='.repeat(80));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error aggregating speeches:', error);
    process.exit(1);
  }
}

aggregateAllSpeeches();
