import { db } from '../server/db';
import { hansardRecords, mps } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';
import { normalizeParliamentTerm } from '../shared/utils';

async function backfillNormalizeParliamentTerms() {
  console.log('🔄 Starting backfill to normalize parliament terms...\n');
  
  try {
    // Step 1: Get all hansard records
    const records = await db.select().from(hansardRecords);
    console.log(`📊 Found ${records.length} hansard records to process\n`);
    
    let updatedCount = 0;
    let unchangedCount = 0;
    
    // Step 2: Normalize each record's parliament term
    for (const record of records) {
      const originalTerm = record.parliamentTerm;
      const normalizedTerm = normalizeParliamentTerm(originalTerm);
      
      if (originalTerm !== normalizedTerm) {
        console.log(`📝 Updating record ${record.sessionNumber}:`);
        console.log(`   From: "${originalTerm}"`);
        console.log(`   To:   "${normalizedTerm}"`);
        
        await db.update(hansardRecords)
          .set({ parliamentTerm: normalizedTerm })
          .where(eq(hansardRecords.id, record.id));
        
        updatedCount++;
      } else {
        unchangedCount++;
      }
    }
    
    console.log(`\n✅ Parliament term normalization complete:`);
    console.log(`   - Updated: ${updatedCount} records`);
    console.log(`   - Unchanged: ${unchangedCount} records`);
    
    // Step 3: Reset all MP speech counters to 0 before recalculating
    console.log('\n🔄 Resetting MP speech statistics...');
    await db.update(mps).set({
      hansardSessionsSpoke: 0,
      totalSpeechInstances: 0
    });
    console.log('✅ Reset complete\n');
    
    // Step 4: Recalculate MP speech statistics from normalized hansard records
    console.log('🔄 Recalculating MP speech statistics...');
    
    const updatedRecords = await db.select().from(hansardRecords);
    const mpStatsMap = new Map<string, { sessionsSpoke: number; totalSpeeches: number }>();
    
    for (const record of updatedRecords) {
      const speakerStats = record.speakerStats || [];
      
      for (const stat of speakerStats) {
        const mpId = (stat as any).mpId || (stat as any).mp_id;
        const totalSpeeches = (stat as any).totalSpeeches || (stat as any).total_speeches || 0;
        
        if (!mpId) continue;
        
        const current = mpStatsMap.get(mpId) || { sessionsSpoke: 0, totalSpeeches: 0 };
        mpStatsMap.set(mpId, {
          sessionsSpoke: current.sessionsSpoke + 1,
          totalSpeeches: current.totalSpeeches + totalSpeeches
        });
      }
    }
    
    // Step 5: Update each MP with recalculated statistics
    let mpUpdateCount = 0;
    for (const [mpId, stats] of mpStatsMap.entries()) {
      await db.update(mps)
        .set({
          hansardSessionsSpoke: stats.sessionsSpoke,
          totalSpeechInstances: stats.totalSpeeches
        })
        .where(eq(mps.id, mpId));
      mpUpdateCount++;
    }
    
    console.log(`✅ Updated speech statistics for ${mpUpdateCount} MPs\n`);
    
    // Step 6: Show summary of normalized parliament terms
    const termCounts = await db.execute(sql`
      SELECT parliament_term, COUNT(*) as count
      FROM hansard_records
      GROUP BY parliament_term
      ORDER BY count DESC
    `);
    
    console.log('📊 Parliament term distribution after normalization:');
    for (const row of termCounts.rows) {
      console.log(`   - "${row.parliament_term}": ${row.count} records`);
    }
    
    console.log('\n🎉 Backfill completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during backfill:', error);
    throw error;
  }
}

// Run the backfill
backfillNormalizeParliamentTerms()
  .then(() => {
    console.log('\n✅ Backfill script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Backfill script failed:', error);
    process.exit(1);
  });
