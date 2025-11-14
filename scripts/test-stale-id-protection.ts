import { db } from '../server/db';
import { hansardRecords, mps } from '../shared/schema';
import { DbStorage } from '../server/storage';
import type { InsertHansardRecord } from '../shared/schema';

async function testStaleIdProtection() {
  console.log('🧪 Testing stale MP ID protection...\n');
  
  try {
    const storage = new DbStorage();
    
    // Step 1: Get Anwar Ibrahim's CURRENT ID
    const allMps = await db.select().from(mps);
    const anwar = allMps.find(m => m.name === 'Anwar Ibrahim');
    
    if (!anwar) {
      console.log('❌ FAIL: Anwar Ibrahim not found in database');
      return false;
    }
    
    console.log(`📋 Anwar Ibrahim's current ID: ${anwar.id}`);
    console.log(`📋 Current stats: ${anwar.hansardSessionsSpoke} sessions, ${anwar.totalSpeechInstances} speeches\n`);
    
    // Step 2: Create a hansard record with a FAKE/STALE MP ID
    const fakeStaleId = 'fake-stale-uuid-12345678-1234-1234-1234-123456789012';
    console.log(`🔴 Attempting to insert record with STALE ID: ${fakeStaleId}`);
    console.log(`   (But with correct MP name: "Anwar Ibrahim")\n`);
    
    const testRecord: InsertHansardRecord = {
      sessionNumber: 'TEST.01.01.2099',
      sessionDate: new Date('2099-01-01'),
      parliamentTerm: 'Parlimen Ke-15 (Test)',
      sitting: 'Test Sitting',
      transcript: 'Test transcript content',
      pdfLinks: [],
      topics: [],
      speakers: [],
      speakerStats: [
        {
          mpId: fakeStaleId, // STALE ID - should be rewritten
          mpName: 'Anwar Ibrahim', // Correct name
          totalSpeeches: 999,
          speakingOrder: 1
        }
      ],
      voteRecords: [],
      attendedMpIds: [],
      absentMpIds: []
    };
    
    // Step 3: Insert using createHansardRecordWithSpeechStats
    const inserted = await storage.createHansardRecordWithSpeechStats(
      testRecord,
      [] // Empty array - method should derive from record.speakerStats
    );
    
    console.log(`✅ Record inserted successfully\n`);
    
    // Step 4: Verify the inserted record has the CURRENT ID, not the stale one
    const { eq } = await import('drizzle-orm');
    const retrievedRecord = await db.select()
      .from(hansardRecords)
      .where(eq(hansardRecords.id, inserted.id));
    
    if (retrievedRecord.length === 0) {
      console.log('❌ FAIL: Could not retrieve inserted record');
      return false;
    }
    
    const recordStats = retrievedRecord[0].speakerStats || [];
    const anwarStat = recordStats.find((s: any) => s.mpName === 'Anwar Ibrahim');
    
    if (!anwarStat) {
      console.log('❌ FAIL: Anwar Ibrahim not found in speaker_stats');
      return false;
    }
    
    const persistedMpId = (anwarStat as any).mpId;
    
    console.log('🔍 Verification Results:');
    console.log(`   Stale ID provided:  ${fakeStaleId}`);
    console.log(`   Current ID:         ${anwar.id}`);
    console.log(`   Persisted ID:       ${persistedMpId}\n`);
    
    if (persistedMpId === fakeStaleId) {
      console.log('❌ FAIL: Stale ID was persisted! Security hole detected.');
      return false;
    }
    
    if (persistedMpId !== anwar.id) {
      console.log('❌ FAIL: Persisted ID does not match current ID');
      return false;
    }
    
    console.log('✅ PASS: Stale ID was correctly rewritten to current ID!\n');
    
    // Step 5: Verify MP counter was updated with correct ID
    const updatedAnwar = await db.select().from(mps).where(eq(mps.id, anwar.id));
    
    if (updatedAnwar.length === 0) {
      console.log('❌ FAIL: Could not retrieve updated MP');
      return false;
    }
    
    const expectedSessions = anwar.hansardSessionsSpoke + 1;
    const expectedSpeeches = anwar.totalSpeechInstances + 999;
    
    console.log('🔍 MP Counter Verification:');
    console.log(`   Expected sessions:  ${expectedSessions}`);
    console.log(`   Actual sessions:    ${updatedAnwar[0].hansardSessionsSpoke}`);
    console.log(`   Expected speeches:  ${expectedSpeeches}`);
    console.log(`   Actual speeches:    ${updatedAnwar[0].totalSpeechInstances}\n`);
    
    if (updatedAnwar[0].hansardSessionsSpoke !== expectedSessions) {
      console.log('❌ FAIL: MP session counter not updated correctly');
      return false;
    }
    
    if (updatedAnwar[0].totalSpeechInstances !== expectedSpeeches) {
      console.log('❌ FAIL: MP speech counter not updated correctly');
      return false;
    }
    
    console.log('✅ PASS: MP counters updated correctly with normalized ID!\n');
    
    // Step 6: Clean up test record
    await db.delete(hansardRecords).where(eq(hansardRecords.id, inserted.id));
    await db.update(mps)
      .set({
        hansardSessionsSpoke: anwar.hansardSessionsSpoke,
        totalSpeechInstances: anwar.totalSpeechInstances
      })
      .where(eq(mps.id, anwar.id));
    
    console.log('🧹 Test data cleaned up\n');
    
    console.log('═══════════════════════════════════════════════');
    console.log('🎉 All stale ID protection tests PASSED!');
    console.log('═══════════════════════════════════════════════');
    console.log('✓ Stale IDs are rewritten to current IDs');
    console.log('✓ MP counters use normalized IDs');
    console.log('✓ No stale data persists in database\n');
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  }
}

// Run the test
testStaleIdProtection()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n❌ Test script failed:', error);
    process.exit(1);
  });
