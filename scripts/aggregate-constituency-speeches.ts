import { db, isDatabaseAvailable } from '../server/db';
import { mps, hansardRecords } from '../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Script to aggregate speech data from all 15th Parliament Hansard records by constituency
 * This counts total speaking instances per constituency across all Hansard sessions
 */
async function aggregateConstituencySpeeches() {
  try {
    console.log('📊 Aggregating constituency speech data from 15th Parliament Hansards...\n');

    if (!isDatabaseAvailable() || !db) {
      console.error("DATABASE_URL not set. Cannot aggregate constituency speeches.");
      process.exit(1);
    }

    console.log('🔍 Fetching all 15th Parliament Hansard records...');
    const hansards = await db.select()
      .from(hansardRecords)
      .where(eq(hansardRecords.parliamentTerm, '15th Parliament'));
    console.log(`✅ Found ${hansards.length} Hansard records from 15th Parliament\n`);

    if (hansards.length === 0) {
      console.log('❌ No 15th Parliament Hansard records found');
      process.exit(0);
    }

    console.log('👥 Fetching all MPs...');
    const allMps = await db.select().from(mps);
    console.log(`✅ Found ${allMps.length} MPs\n`);

    // Create MP lookup map
    const mpLookup = new Map(allMps.map(mp => [mp.id, mp]));

    // Track constituency speech counts
    const constituencySpeechData = new Map<string, {
      totalSpeeches: number;
      sessionsSpoke: number;
      mpNames: Set<string>;
    }>();

    console.log('📈 Processing Hansard records...\n');

    for (const hansard of hansards) {
      console.log(`📄 Processing: ${hansard.sessionNumber} (${hansard.sessionDate.toLocaleDateString()})`);
      
      const speakerStats = hansard.speakerStats as Array<{
        mpId: string;
        mpName: string;
        totalSpeeches: number;
        speakingOrder: number | null;
      }>;

      if (!speakerStats || speakerStats.length === 0) {
        console.log(`   ⚠️  No speaker stats found in this session`);
        continue;
      }

      console.log(`   🎤 ${speakerStats.length} MPs spoke in this session`);

      for (const stat of speakerStats) {
        const mp = mpLookup.get(stat.mpId);
        
        if (!mp) {
          console.log(`   ⚠️  MP not found: ${stat.mpName} (${stat.mpId})`);
          continue;
        }

        const constituency = mp.constituency;
        
        if (!constituencySpeechData.has(constituency)) {
          constituencySpeechData.set(constituency, {
            totalSpeeches: 0,
            sessionsSpoke: 0,
            mpNames: new Set(),
          });
        }

        const data = constituencySpeechData.get(constituency)!;
        data.totalSpeeches += stat.totalSpeeches || 0;
        data.mpNames.add(mp.name);
      }
    }

    // Count sessions per constituency
    for (const hansard of hansards) {
      const speakerStats = hansard.speakerStats as Array<{
        mpId: string;
        mpName: string;
        totalSpeeches: number;
        speakingOrder: number | null;
      }>;

      if (!speakerStats) continue;

      const constituenciesInSession = new Set<string>();
      
      for (const stat of speakerStats) {
        const mp = mpLookup.get(stat.mpId);
        if (mp) {
          constituenciesInSession.add(mp.constituency);
        }
      }

      for (const constituency of constituenciesInSession) {
        const data = constituencySpeechData.get(constituency);
        if (data) {
          data.sessionsSpoke++;
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 CONSTITUENCY SPEECH STATISTICS - 15th PARLIAMENT');
    console.log('='.repeat(80));
    console.log(`Total Hansard sessions analyzed: ${hansards.length}`);
    console.log(`Total constituencies with speeches: ${constituencySpeechData.size}`);
    console.log('');

    // Sort by total speeches (descending)
    const sortedConstituencies = Array.from(constituencySpeechData.entries())
      .sort((a, b) => b[1].totalSpeeches - a[1].totalSpeeches);

    console.log('🏆 TOP 20 MOST ACTIVE CONSTITUENCIES:');
    console.log('='.repeat(80));
    console.log('Rank | Constituency                  | Total Speeches | Sessions | MPs');
    console.log('='.repeat(80));

    sortedConstituencies.slice(0, 20).forEach(([constituency, data], idx) => {
      const mpList = Array.from(data.mpNames).join(', ');
      console.log(
        `${String(idx + 1).padStart(4)} | ${constituency.padEnd(29)} | ${String(data.totalSpeeches).padStart(14)} | ${String(data.sessionsSpoke).padStart(8)} | ${mpList}`
      );
    });

    console.log('\n' + '='.repeat(80));
    console.log('📈 FULL CONSTITUENCY RANKING:');
    console.log('='.repeat(80));

    sortedConstituencies.forEach(([constituency, data], idx) => {
      console.log(
        `${String(idx + 1).padStart(3)}. ${constituency.padEnd(30)} - ${data.totalSpeeches} speeches across ${data.sessionsSpoke} session(s)`
      );
    });

    console.log('\n' + '='.repeat(80));
    console.log('💾 Exporting data to JSON file...');
    
    const exportData = {
      metadata: {
        parliamentTerm: '15th Parliament',
        totalSessions: hansards.length,
        totalConstituencies: constituencySpeechData.size,
        generatedAt: new Date().toISOString(),
        sessions: hansards.map(h => ({
          sessionNumber: h.sessionNumber,
          sessionDate: h.sessionDate,
        })),
      },
      constituencies: sortedConstituencies.map(([constituency, data], idx) => ({
        rank: idx + 1,
        constituency,
        totalSpeeches: data.totalSpeeches,
        sessionsSpoke: data.sessionsSpoke,
        mps: Array.from(data.mpNames),
      })),
    };

    const fs = await import('fs/promises');
    await fs.writeFile(
      'constituency-speech-analysis-15th-parliament.json',
      JSON.stringify(exportData, null, 2)
    );

    console.log('✅ Data exported to: constituency-speech-analysis-15th-parliament.json');
    console.log('='.repeat(80));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error aggregating constituency speeches:', error);
    process.exit(1);
  }
}

aggregateConstituencySpeeches();
