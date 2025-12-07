/**
 * Copyright by Calmic Sdn Bhd
 */

import { db } from './db';
import { hansardRecords, mps } from '@shared/schema';
import { eq } from 'drizzle-orm';

export async function aggregateSpeechesForAllMps(): Promise<{
  totalMpsUpdated: number;
  mpsWithNoSpeeches: number;
  totalRecordsProcessed: number;
  recordsWithSpeakers: number;
  recordsWithoutSpeakers: number;
  skippedSessions: string[];
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
    swornInDate: Date;
  }>();

  allMps.forEach(mp => {
    mpSpeechData.set(mp.id, {
      sessionsSpoke: 0,
      totalSpeeches: 0,
      mpName: mp.name,
      swornInDate: new Date(mp.swornInDate)
    });
  });

  let recordsWithSpeakers = 0;
  let recordsWithoutSpeakers = 0;
  const skippedSessions: string[] = [];

  for (const record of allHansardRecords) {
    const sessionDate = new Date(record.sessionDate);
    const speakerStats = record.speakerStats as Array<{
      mpId: string;
      mpName: string;
      totalSpeeches: number;
      speakingOrder: number | null;
    }>;

    if (!speakerStats || speakerStats.length === 0) {
      recordsWithoutSpeakers++;
      skippedSessions.push(record.sessionNumber);
      console.warn(`⚠️  [Aggregation] Skipping ${record.sessionNumber} (${sessionDate.toISOString().split('T')[0]}) - No speakerStats found`);
      continue;
    }

    recordsWithSpeakers++;

    const uniqueSpeakersInSession = new Map<string, {
      mpId: string;
      mpName: string;
      totalSpeeches: number;
    }>();

    for (const stat of speakerStats) {
      const existing = uniqueSpeakersInSession.get(stat.mpId);
      if (existing) {
        existing.totalSpeeches += stat.totalSpeeches || 0;
      } else {
        uniqueSpeakersInSession.set(stat.mpId, {
          mpId: stat.mpId,
          mpName: stat.mpName,
          totalSpeeches: stat.totalSpeeches || 0
        });
      }
    }

    for (const [mpId, stat] of Array.from(uniqueSpeakersInSession.entries())) {
      const mpData = mpSpeechData.get(mpId);
      if (mpData && sessionDate >= mpData.swornInDate) {
        mpData.sessionsSpoke++;
        mpData.totalSpeeches += stat.totalSpeeches;
      }
    }
  }

  let updatedCount = 0;
  let mpsWithNoSpeeches = 0;

  for (const [mpId, data] of Array.from(mpSpeechData.entries())) {
    await db.update(mps)
      .set({
        hansardSessionsSpoke: data.sessionsSpoke,
        totalSpeechInstances: data.totalSpeeches
      })
      .where(eq(mps.id, mpId));
    
    updatedCount++;
    
    if (data.sessionsSpoke === 0 && data.totalSpeeches === 0) {
      mpsWithNoSpeeches++;
    }
  }

  console.log(`✅ [Aggregation] Complete: ${updatedCount} MPs updated, ${mpsWithNoSpeeches} MPs with no speeches`);
  console.log(`📊 [Aggregation] Records with speakers: ${recordsWithSpeakers}/${allHansardRecords.length}`);
  console.log(`⚠️  [Aggregation] Records without speakers: ${recordsWithoutSpeakers}/${allHansardRecords.length}`);
  if (skippedSessions.length > 0) {
    console.log(`⚠️  [Aggregation] Skipped sessions: ${skippedSessions.join(', ')}`);
  }

  return {
    totalMpsUpdated: updatedCount,
    mpsWithNoSpeeches,
    totalRecordsProcessed: allHansardRecords.length,
    recordsWithSpeakers,
    recordsWithoutSpeakers,
    skippedSessions
  };
}

export async function aggregateAttendanceForAllMps(): Promise<{
  totalMpsUpdated: number;
  totalRecordsProcessed: number;
}> {
  console.log('📊 [Aggregation] Aggregating attendance data from all Hansard records...');

  const allHansardRecords = await db.select().from(hansardRecords);
  console.log(`✅ [Aggregation] Found ${allHansardRecords.length} Hansard records`);

  const allMps = await db.select().from(mps);
  console.log(`✅ [Aggregation] Found ${allMps.length} MPs`);

  const mpAttendanceData = new Map<string, {
    daysAttended: number;
    totalParliamentDays: number;
    mpName: string;
    swornInDate: Date;
  }>();

  allMps.forEach(mp => {
    mpAttendanceData.set(mp.id, {
      daysAttended: 0,
      totalParliamentDays: 0,
      mpName: mp.name,
      swornInDate: new Date(mp.swornInDate)
    });
  });

  for (const record of allHansardRecords) {
    const sessionDate = new Date(record.sessionDate);
    const attendedMpIds = (record.attendedMpIds || []) as string[];
    const absentMpIds = (record.absentMpIds || []) as string[];

    const attendedSet = new Set(attendedMpIds);
    const absentSet = new Set(absentMpIds);
    
    // Check if this record has attendance data recorded
    const hasAttendanceData = attendedMpIds.length > 0;

    // For each MP, check if they were sworn in before this session
    for (const [mpId, mpData] of Array.from(mpAttendanceData.entries())) {
      // Only count sessions after MP was sworn in
      if (sessionDate >= mpData.swornInDate) {
        // Count this as a parliament day for this MP (all Hansard records = parliament sitting days)
        mpData.totalParliamentDays++;

        // Attendance logic:
        // 1. If MP is explicitly in attendedSet -> attended
        // 2. If MP is explicitly in absentSet -> absent
        // 3. If attendance was recorded but MP is in neither list -> absent (should have been recorded if present)
        // 4. If no attendance data for this session -> benefit of doubt, count as attended
        if (attendedSet.has(mpId)) {
          mpData.daysAttended++;
        } else if (absentSet.has(mpId)) {
          // Explicitly absent - don't increment daysAttended
        } else if (hasAttendanceData) {
          // Attendance was recorded but MP not in either list - count as absent
          // (they should have been recorded if they were present)
        } else {
          // No attendance data for this session - give benefit of doubt
          mpData.daysAttended++;
        }
      }
    }
  }

  let updatedCount = 0;

  for (const [mpId, data] of Array.from(mpAttendanceData.entries())) {
    await db.update(mps)
      .set({
        daysAttended: data.daysAttended,
        totalParliamentDays: data.totalParliamentDays
      })
      .where(eq(mps.id, mpId));
    
    updatedCount++;
  }

  console.log(`✅ [Aggregation] Complete: ${updatedCount} MPs updated with attendance data`);

  return {
    totalMpsUpdated: updatedCount,
    totalRecordsProcessed: allHansardRecords.length
  };
}

export async function refreshAllMpData(): Promise<{
  attendance: {
    totalMpsUpdated: number;
    totalRecordsProcessed: number;
  };
  speeches: {
    totalMpsUpdated: number;
    mpsWithNoSpeeches: number;
    totalRecordsProcessed: number;
    recordsWithSpeakers: number;
    recordsWithoutSpeakers: number;
    skippedSessions: string[];
  };
}> {
  console.log('🔄 [Refresh] Starting comprehensive MP data refresh...');
  
  const attendanceResults = await aggregateAttendanceForAllMps();
  const speechResults = await aggregateSpeechesForAllMps();
  
  console.log('✅ [Refresh] All MP data refreshed successfully!');
  
  return {
    attendance: attendanceResults,
    speeches: speechResults
  };
}
