import { db } from '../server/db';
import { mps, hansardRecords } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { MPNameMatcher } from '../server/mp-name-matcher';

/**
 * Fix script to re-normalize Hansard speaker IDs to match current MP IDs
 * This fixes the issue where Hansard records have old/stale MP IDs
 */
async function fixHansardSpeakerIds() {
  try {
    console.log('🔧 Fixing Hansard speaker IDs to match current MPs...\n');

    console.log('👥 Fetching all MPs...');
    const allMps = await db.select().from(mps);
    console.log(`✅ Found ${allMps.length} MPs\n`);

    console.log('📄 Fetching all Hansard records...');
    const allHansardRecords = await db.select().from(hansardRecords);
    console.log(`✅ Found ${allHansardRecords.length} Hansard records\n`);

    // Create name matcher to resolve MP names to current IDs
    const nameMatcher = new MPNameMatcher(allMps);

    let recordsUpdated = 0;
    let speakersFixed = 0;
    let speakersNotMatched = 0;

    console.log('🔄 Processing Hansard records...\n');

    for (const record of allHansardRecords) {
      const oldSpeakerStats = record.speakerStats as Array<{
        mpId: string;
        mpName: string;
        totalSpeeches: number;
        speakingOrder: number | null;
      }>;

      if (!oldSpeakerStats || oldSpeakerStats.length === 0) {
        continue;
      }

      const newSpeakerStats: Array<{
        mpId: string;
        mpName: string;
        totalSpeeches: number;
        speakingOrder: number | null;
      }> = [];
      let recordNeedsUpdate = false;

      for (const stat of oldSpeakerStats) {
        // Try to match by name to get current MP ID
        const currentMpId = nameMatcher.matchName(stat.mpName);

        if (currentMpId) {
          // Check if ID changed
          if (currentMpId !== stat.mpId) {
            recordNeedsUpdate = true;
            speakersFixed++;
            console.log(`   🔄 ${stat.mpName}: ${stat.mpId} → ${currentMpId}`);
          }

          newSpeakerStats.push({
            mpId: currentMpId, // Use current ID
            mpName: stat.mpName,
            totalSpeeches: stat.totalSpeeches,
            speakingOrder: stat.speakingOrder
          });
        } else {
          console.log(`   ⚠️  Could not match: ${stat.mpName} (keeping old ID: ${stat.mpId})`);
          speakersNotMatched++;
          
          // Keep the old entry even if we can't match
          newSpeakerStats.push(stat);
        }
      }

      if (recordNeedsUpdate) {
        // Update the record with normalized speaker stats
        await db.update(hansardRecords)
          .set({ speakerStats: newSpeakerStats })
          .where(eq(hansardRecords.id, record.id));

        recordsUpdated++;
        console.log(`   ✅ Updated: ${record.sessionNumber}\n`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('🔧 HANSARD SPEAKER ID FIX COMPLETE');
    console.log('='.repeat(80));
    console.log(`Records updated: ${recordsUpdated}`);
    console.log(`Speakers fixed: ${speakersFixed}`);
    console.log(`Speakers not matched: ${speakersNotMatched}`);
    console.log('='.repeat(80));

    console.log('\n💡 Next step: Run the aggregation scripts to update MP statistics');
    console.log('   npm run aggregate-speeches');
    console.log('   npm run aggregate-constituency\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing Hansard speaker IDs:', error);
    process.exit(1);
  }
}

fixHansardSpeakerIds();
