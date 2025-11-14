import { db } from '../server/db';
import { hansardRecords, mps } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { MPNameMatcher } from '../server/mp-name-matcher';

interface OldToNewMapping {
  oldId: string;
  newId: string;
  name: string;
  constituency?: string;
}

async function remapHansardMpIds() {
  console.log('🔄 Starting hansard MP ID remap...\n');
  
  try {
    // Step 1: Get all current MPs and build MPNameMatcher
    const allMps = await db.select().from(mps);
    console.log(`📊 Found ${allMps.length} MPs in database\n`);
    
    const nameMatcher = new MPNameMatcher(allMps);
    
    // Step 2: Get all hansard records
    const records = await db.select().from(hansardRecords);
    console.log(`📊 Found ${records.length} hansard records to process\n`);
    
    // Step 3: Build mapping of old MP IDs to new MP IDs
    const idMapping = new Map<string, OldToNewMapping>();
    const unmatchedNames = new Set<string>();
    
    for (const record of records) {
      const speakerStats = record.speakerStats || [];
      const attendedMpIds = record.attendedMpIds || [];
      const absentMpIds = record.absentMpIds || [];
      
      // Process speaker stats
      for (const stat of speakerStats) {
        const oldId = (stat as any).mpId;
        const mpName = (stat as any).mpName;
        
        if (!oldId || !mpName) continue;
        
        if (!idMapping.has(oldId)) {
          const matchedMpId = nameMatcher.matchName(mpName);
          
          if (matchedMpId) {
            const matchedMp = allMps.find(mp => mp.id === matchedMpId);
            
            if (matchedMp) {
              idMapping.set(oldId, {
                oldId,
                newId: matchedMp.id,
                name: mpName,
                constituency: matchedMp.constituency
              });
              console.log(`✅ Mapped: ${mpName} (${matchedMp.constituency})`);
              console.log(`   Old ID: ${oldId}`);
              console.log(`   New ID: ${matchedMp.id}\n`);
            } else {
              unmatchedNames.add(mpName);
              console.log(`❌ MP ID ${matchedMpId} not found for: ${mpName}\n`);
            }
          } else {
            unmatchedNames.add(mpName);
            console.log(`❌ Could not match: ${mpName}\n`);
          }
        }
      }
    }
    
    console.log(`\n📊 Mapping Summary:`);
    console.log(`   - Matched: ${idMapping.size} unique MPs`);
    console.log(`   - Unmatched: ${unmatchedNames.size} unique names`);
    
    if (unmatchedNames.size > 0) {
      console.log(`\n⚠️  Unmatched MP names:`);
      unmatchedNames.forEach(name => console.log(`   - ${name}`));
      console.log(`\nNote: These records will be skipped in the remap.\n`);
    }
    
    // Step 4: Update hansard records with new MP IDs
    let updatedRecords = 0;
    
    for (const record of records) {
      let needsUpdate = false;
      const speakerStats = record.speakerStats || [];
      const attendedMpIds = record.attendedMpIds || [];
      const absentMpIds = record.absentMpIds || [];
      
      // Remap speaker stats
      const newSpeakerStats = speakerStats.map((stat: any) => {
        const oldId = stat.mpId;
        const mapping = idMapping.get(oldId);
        
        if (mapping) {
          needsUpdate = true;
          return {
            ...stat,
            mpId: mapping.newId
          };
        }
        return stat;
      });
      
      // Remap attended MP IDs
      const newAttendedMpIds = attendedMpIds.map(oldId => {
        const mapping = idMapping.get(oldId);
        if (mapping) {
          needsUpdate = true;
          return mapping.newId;
        }
        return oldId;
      });
      
      // Remap absent MP IDs
      const newAbsentMpIds = absentMpIds.map(oldId => {
        const mapping = idMapping.get(oldId);
        if (mapping) {
          needsUpdate = true;
          return mapping.newId;
        }
        return oldId;
      });
      
      if (needsUpdate) {
        await db.update(hansardRecords)
          .set({
            speakerStats: newSpeakerStats,
            attendedMpIds: newAttendedMpIds,
            absentMpIds: newAbsentMpIds
          })
          .where(eq(hansardRecords.id, record.id));
        
        updatedRecords++;
        console.log(`✅ Updated record: ${record.sessionNumber}`);
      }
    }
    
    console.log(`\n✅ MP ID remap complete:`);
    console.log(`   - Updated: ${updatedRecords} hansard records`);
    console.log(`   - Unchanged: ${records.length - updatedRecords} records\n`);
    
    // Step 5: Reset MP speech counters (will be recalculated)
    console.log('🔄 Resetting MP speech statistics...');
    await db.update(mps).set({
      hansardSessionsSpoke: 0,
      totalSpeechInstances: 0
    });
    console.log('✅ Reset complete\n');
    
    // Step 6: Recalculate MP speech statistics from remapped hansard records
    console.log('🔄 Recalculating MP speech statistics...');
    
    const updatedRecords2 = await db.select().from(hansardRecords);
    const mpStatsMap = new Map<string, { sessionsSpoke: number; totalSpeeches: number }>();
    
    for (const record of updatedRecords2) {
      const speakerStats = record.speakerStats || [];
      
      for (const stat of speakerStats) {
        const mpId = (stat as any).mpId;
        const totalSpeeches = (stat as any).totalSpeeches || 0;
        
        if (!mpId) continue;
        
        const current = mpStatsMap.get(mpId) || { sessionsSpoke: 0, totalSpeeches: 0 };
        mpStatsMap.set(mpId, {
          sessionsSpoke: current.sessionsSpoke + 1,
          totalSpeeches: current.totalSpeeches + totalSpeeches
        });
      }
    }
    
    // Update each MP with recalculated statistics
    let mpUpdateCount = 0;
    for (const [mpId, stats] of mpStatsMap.entries()) {
      const result = await db.update(mps)
        .set({
          hansardSessionsSpoke: stats.sessionsSpoke,
          totalSpeechInstances: stats.totalSpeeches
        })
        .where(eq(mps.id, mpId))
        .returning();
      
      if (result.length > 0) {
        mpUpdateCount++;
        console.log(`✅ ${result[0].name}: ${stats.sessionsSpoke} sessions, ${stats.totalSpeeches} speeches`);
      }
    }
    
    console.log(`\n✅ Updated speech statistics for ${mpUpdateCount} MPs\n`);
    console.log('🎉 MP ID remap and counter update completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during MP ID remap:', error);
    throw error;
  }
}

// Run the remap
remapHansardMpIds()
  .then(() => {
    console.log('\n✅ Remap script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Remap script failed:', error);
    process.exit(1);
  });
