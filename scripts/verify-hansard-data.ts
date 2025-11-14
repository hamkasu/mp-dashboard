import { db } from '../server/db';
import { hansardRecords, mps } from '../shared/schema';

interface ExpectedStats {
  name: string;
  expectedSessions: number;
  expectedSpeeches: number;
}

async function verifyHansardData() {
  console.log('🔍 Verifying Hansard data integrity...\n');
  
  try {
    // Expected stats for MPs with hansard data (based on current seed)
    const expectedStats: ExpectedStats[] = [
      { name: 'Anwar Ibrahim', expectedSessions: 1, expectedSpeeches: 7 },
      { name: 'Ahmad Zahid Hamidi', expectedSessions: 1, expectedSpeeches: 4 },
      { name: 'Rafizi Ramli', expectedSessions: 1, expectedSpeeches: 5 },
      { name: 'Nancy Shukri', expectedSessions: 1, expectedSpeeches: 3 },
      { name: 'Aaron Ago Dagang', expectedSessions: 1, expectedSpeeches: 2 }
    ];
    
    // Step 1: Verify parliament term normalization
    console.log('1️⃣ Checking parliament term normalization...');
    const records = await db.select().from(hansardRecords);
    const nonCanonical = records.filter(r => r.parliamentTerm !== '15th Parliament');
    
    if (nonCanonical.length > 0) {
      console.log(`❌ FAIL: Found ${nonCanonical.length} records with non-canonical parliament terms:`);
      nonCanonical.forEach(r => {
        console.log(`   - Session ${r.sessionNumber}: "${r.parliamentTerm}"`);
      });
      return false;
    }
    console.log(`✅ PASS: All ${records.length} hansard records use "15th Parliament"\n`);
    
    // Step 2: Verify MP speech statistics
    console.log('2️⃣ Checking MP speech statistics...');
    let allCorrect = true;
    
    for (const expected of expectedStats) {
      const allMps = await db.select().from(mps);
      const mp = allMps.find(m => m.name === expected.name);
      
      if (!mp) {
        console.log(`❌ FAIL: MP "${expected.name}" not found in database`);
        allCorrect = false;
        continue;
      }
      
      const sessionsMatch = mp.hansardSessionsSpoke === expected.expectedSessions;
      const speechesMatch = mp.totalSpeechInstances === expected.expectedSpeeches;
      
      if (sessionsMatch && speechesMatch) {
        console.log(`✅ PASS: ${mp.name}`);
        console.log(`   - Sessions: ${mp.hansardSessionsSpoke}/${expected.expectedSessions}`);
        console.log(`   - Speeches: ${mp.totalSpeechInstances}/${expected.expectedSpeeches}`);
      } else {
        console.log(`❌ FAIL: ${mp.name}`);
        console.log(`   - Sessions: ${mp.hansardSessionsSpoke} (expected ${expected.expectedSessions})`);
        console.log(`   - Speeches: ${mp.totalSpeechInstances} (expected ${expected.expectedSpeeches})`);
        allCorrect = false;
      }
    }
    
    if (!allCorrect) {
      console.log('\n❌ Verification FAILED: Some MPs have incorrect statistics\n');
      return false;
    }
    
    console.log('\n✅ PASS: All MP speech statistics are correct\n');
    
    // Step 3: Verify no stale MP IDs in hansard records
    console.log('3️⃣ Checking for stale MP IDs in hansard records...');
    const allMps = await db.select().from(mps);
    const validMpIds = new Set(allMps.map(m => m.id));
    let staleIdFound = false;
    
    for (const record of records) {
      const speakerStats = record.speakerStats || [];
      
      for (const stat of speakerStats) {
        const mpId = (stat as any).mpId;
        
        if (mpId && !validMpIds.has(mpId)) {
          console.log(`❌ FAIL: Session ${record.sessionNumber} references non-existent MP ID: ${mpId}`);
          staleIdFound = true;
        }
      }
    }
    
    if (staleIdFound) {
      console.log('\n❌ Verification FAILED: Found stale MP IDs in hansard records\n');
      return false;
    }
    
    console.log(`✅ PASS: All MP IDs in hansard records are valid\n`);
    
    // Final summary
    console.log('═══════════════════════════════════════════════');
    console.log('🎉 All verification checks PASSED!');
    console.log('═══════════════════════════════════════════════');
    console.log(`✓ ${records.length} hansard records with normalized parliament terms`);
    console.log(`✓ ${expectedStats.length} MPs with correct speech statistics`);
    console.log(`✓ No stale MP IDs found\n`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
    return false;
  }
}

// Run the verification
verifyHansardData()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n❌ Verification script failed:', error);
    process.exit(1);
  });
