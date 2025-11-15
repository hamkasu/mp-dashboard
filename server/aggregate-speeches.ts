import { db } from './db';
import { hansardRecords, mps } from '@shared/schema';
import { eq } from 'drizzle-orm';

export async function aggregateSpeechesForAllMps(): Promise<{
  totalMpsUpdated: number;
  mpsWithNoSpeeches: number;
  totalRecordsProcessed: number;
}> {
  console.log('📊 [Aggregation] Aggregating speech data from all Hansard records...');

  const allHansardRecords = await db.select().from(hansardRecords);
  console.log(`✅ [Aggregation] Found ${allHansardRecords.length} Hansard records`);

  const allMps = await db.select().from(mps);
  console.log(`✅ [Aggregation] Found ${allMps.length} MPs`);

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

  for (const record of allHansardRecords) {
    const speakerStats = record.speakerStats as Array<{
      mpId: string;
      mpName: string;
      totalSpeeches: number;
      speakingOrder: number | null;
    }>;

    if (!speakerStats || speakerStats.length === 0) {
      continue;
    }

    // Deduplicate speakerStats by mpId for this session
    // An MP should only count once per session, even if they have multiple entries
    const uniqueSpeakersInSession = new Map<string, {
      mpId: string;
      mpName: string;
      totalSpeeches: number;
    }>();

    for (const stat of speakerStats) {
      const existing = uniqueSpeakersInSession.get(stat.mpId);
      if (existing) {
        // MP already seen in this session - add speeches but don't increment session count
        existing.totalSpeeches += stat.totalSpeeches || 0;
      } else {
        uniqueSpeakersInSession.set(stat.mpId, {
          mpId: stat.mpId,
          mpName: stat.mpName,
          totalSpeeches: stat.totalSpeeches || 0
        });
      }
    }

    // Now increment session count once per unique MP
    for (const [mpId, stat] of uniqueSpeakersInSession.entries()) {
      const mpData = mpSpeechData.get(mpId);
      if (mpData) {
        mpData.sessionsSpoke++; // Increment only once per session
        mpData.totalSpeeches += stat.totalSpeeches;
      }
    }
  }

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
    } else {
      unchangedCount++;
    }
  }

  console.log(`✅ [Aggregation] Complete: ${updatedCount} MPs updated, ${unchangedCount} MPs with no speeches`);

  return {
    totalMpsUpdated: updatedCount,
    mpsWithNoSpeeches: unchangedCount,
    totalRecordsProcessed: allHansardRecords.length
  };
}
