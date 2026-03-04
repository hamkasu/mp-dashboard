/**
 * Copyright by Calmic Sdn Bhd
 * Memory-optimized: Added GC calls between iterations to prevent OOM crashes
 */

import cron from 'node-cron';
import { storage } from './storage';
import { HansardScraper } from './hansard-scraper';
import { InsertHansardRecord, hansardPdfFiles } from '@shared/schema';
import { HansardSpeechAnalyzer } from './hansard-speech-analyzer';
import crypto from 'crypto';
import { getPublicBaseUrl, buildPdfUrl } from './utils/url-helper';
import { db } from './db';
import { forceGC, getMemoryUsage } from './middleware/memory-monitor';

export interface HansardSyncResult {
  triggeredBy: 'manual' | 'scheduled' | 'startup-recovery';
  startTime: Date;
  endTime: Date;
  durationMs: number;
  lastKnownSession: string | null;
  recordsFound: number;
  recordsInserted: number;
  recordsSkipped: number;
  errors: Array<{ sessionNumber: string; error: string }>;
}

export async function runHansardSync(options: { triggeredBy: 'manual' | 'scheduled' | 'startup-recovery' }): Promise<HansardSyncResult> {
  const startTime = new Date();
  const result: HansardSyncResult = {
    triggeredBy: options.triggeredBy,
    startTime,
    endTime: new Date(),
    durationMs: 0,
    lastKnownSession: null,
    recordsFound: 0,
    recordsInserted: 0,
    recordsSkipped: 0,
    errors: []
  };

  try {
    console.log(`\n🔄 [Hansard Sync] Starting sync (${options.triggeredBy}) at ${startTime.toISOString()}`);

    // Get the latest hansard record from the database
    const latestRecord = await storage.getLatestHansardRecord();
    const latestDate = latestRecord ? new Date(latestRecord.sessionDate) : null;
    result.lastKnownSession = latestRecord?.sessionNumber || null;

    if (latestDate) {
      console.log(`📅 [Hansard Sync] Latest known session: ${result.lastKnownSession} on ${latestDate.toISOString().split('T')[0]}`);
    } else {
      console.log(`📅 [Hansard Sync] No existing records found. Will fetch all available records.`);
    }

    // Fetch new hansard metadata from parliament website
    const scraper = new HansardScraper();
    console.log(`🔍 [Hansard Sync] Fetching hansard metadata from parliament website...`);
    const allMetadata = await scraper.getHansardListForParliament15(1000);
    
    // Filter to only records newer than the latest we have
    const newMetadata = latestDate
      ? allMetadata.filter(metadata => new Date(metadata.sessionDate) > latestDate)
      : allMetadata;
    
    result.recordsFound = newMetadata.length;
    console.log(`📊 [Hansard Sync] Found ${newMetadata.length} new hansard records to process`);

    if (newMetadata.length === 0) {
      console.log(`✅ [Hansard Sync] No new records found. Database is up to date.`);
      result.endTime = new Date();
      result.durationMs = result.endTime.getTime() - startTime.getTime();
      return result;
    }

    // Process each new record
    for (const metadata of newMetadata) {
      const recordStartTime = Date.now();
      try {
        // Check if this session already exists (duplicate detection)
        const existing = await storage.getHansardRecordsBySessionNumber(metadata.sessionNumber);
        if (existing.length > 0) {
          console.log(`⏭️  [Hansard Sync] Skipping duplicate: ${metadata.sessionNumber} (${metadata.sessionDate.toISOString().split('T')[0]})`);
          result.recordsSkipped++;
          continue;
        }

        console.log(`📥 [Hansard Sync] Processing: ${metadata.sessionNumber} on ${metadata.sessionDate.toISOString().split('T')[0]}`);

        // Download PDF and extract text with retries
        const downloadResult = await downloadAndSaveWithRetry(scraper, metadata.pdfUrl, metadata.sessionNumber, 3);
        const { buffer, text: transcript, originalFilename } = downloadResult;

        // Extract attendance data
        const attendanceData = scraper.extractAttendanceFromText(transcript);
        const constituencyData = scraper.extractConstituencyAttendanceCounts(transcript);

        // Analyze speeches using the HansardSpeechAnalyzer
        const allMps = await storage.getAllMps();
        const speechAnalyzer = new HansardSpeechAnalyzer(allMps);
        const speechStats = speechAnalyzer.analyzeSpeeches(
          transcript,
          metadata.sessionNumber,
          metadata.sessionDate
        );

        // Convert speakerStats map to array for storage (all speakers)
        const speakerStatsArray = Array.from(speechStats.speakerStats.values());

        // Enrich speakers with totalSpeeches count (ALL speakers, not just top 10)
        const enrichedSpeakers = speakerStatsArray.map(stat => ({
          mpId: stat.mpId,
          mpName: stat.mpName,
          speakingOrder: stat.speakingOrder || 1,
          totalSpeeches: stat.totalSpeeches
        }));

        // Create hansard record with speech statistics
        const hansardRecord: InsertHansardRecord = {
          sessionNumber: metadata.sessionNumber,
          sessionDate: metadata.sessionDate,
          parliamentTerm: metadata.parliamentTerm,
          sitting: metadata.sitting,
          transcript,
          pdfLinks: [], // No longer using pdfLinks
          topics: [],
          speakers: enrichedSpeakers,
          speakerStats: speakerStatsArray,
          voteRecords: [],
          attendedMpIds: [],
          absentMpIds: [],
          senatorsAttending: attendanceData.senatorsAttending || [],
          constituenciesPresent: constituencyData.constituenciesPresent,
          constituenciesAbsent: constituencyData.constituenciesAbsent,
          constituenciesAbsentRule91: constituencyData.constituenciesAbsentRule91
        };

        // Create hansard record with speech statistics (transactional)
        // This will atomically insert the record and update MP aggregates
        const uniqueSpeakerStats = Array.from(
          new Map(speakerStatsArray.map(s => [s.mpId, s])).values()
        );
        
        const createdRecord = await storage.createHansardRecordWithSpeechStats(hansardRecord, uniqueSpeakerStats);
        
        // Save PDF to database with deduplication
        const md5Hash = crypto.createHash('md5').update(buffer).digest('hex');
        
        // Check if a PDF with this hash already exists for this record
        const { eq, and } = await import("drizzle-orm");
        const [existingPdf] = await db.select().from(hansardPdfFiles)
          .where(and(
            eq(hansardPdfFiles.hansardRecordId, createdRecord.id),
            eq(hansardPdfFiles.md5Hash, md5Hash)
          ));
        
        if (existingPdf) {
          // Duplicate found - ensure it's marked as primary
          if (!existingPdf.isPrimary) {
            await db.update(hansardPdfFiles)
              .set({ isPrimary: false })
              .where(eq(hansardPdfFiles.hansardRecordId, createdRecord.id));
            
            await db.update(hansardPdfFiles)
              .set({ isPrimary: true })
              .where(eq(hansardPdfFiles.id, existingPdf.id));
          }
        } else {
          // New PDF - clear previous primary flags and insert
          await db.update(hansardPdfFiles)
            .set({ isPrimary: false })
            .where(eq(hansardPdfFiles.hansardRecordId, createdRecord.id));
          
          await db.insert(hansardPdfFiles).values({
            hansardRecordId: createdRecord.id,
            originalFilename,
            fileSizeBytes: buffer.length,
            contentType: 'application/pdf',
            pdfData: buffer,
            md5Hash,
            isPrimary: true,
          });
        }
        
        result.recordsInserted++;
        
        const recordDuration = Date.now() - recordStartTime;
        console.log(`✅ [Hansard Sync] Inserted: ${metadata.sessionNumber} on ${metadata.sessionDate.toISOString().split('T')[0]} (took ${(recordDuration / 1000).toFixed(2)}s)`);

      } catch (error: any) {
        const recordDuration = Date.now() - recordStartTime;
        console.error(`❌ [Hansard Sync] Error processing ${metadata.sessionNumber} on ${metadata.sessionDate.toISOString().split('T')[0]} after ${(recordDuration / 1000).toFixed(2)}s:`, error.message);
        result.errors.push({
          sessionNumber: `${metadata.sessionNumber} (${metadata.sessionDate.toISOString().split('T')[0]})`,
          error: error.message
        });
      }

      // Memory cleanup after each record to prevent OOM during large syncs
      const memory = getMemoryUsage();
      if (memory.heapUsed > 300) { // If using more than 300MB, force GC
        console.log(`🧹 [Hansard Sync] Memory cleanup (${memory.heapUsed}MB used)`);
        forceGC(true);
      }
    }

    result.endTime = new Date();
    result.durationMs = result.endTime.getTime() - startTime.getTime();

    console.log(`\n✅ [Hansard Sync] Sync completed in ${(result.durationMs / 1000).toFixed(2)}s`);
    console.log(`📊 [Hansard Sync] Summary:`);
    console.log(`   - Records found: ${result.recordsFound}`);
    console.log(`   - Records inserted: ${result.recordsInserted}`);
    console.log(`   - Records skipped (duplicates): ${result.recordsSkipped}`);
    console.log(`   - Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log(`\n⚠️  [Hansard Sync] Errors encountered:`);
      result.errors.forEach(err => {
        console.log(`   - ${err.sessionNumber}: ${err.error}`);
      });
    }

    // Run full MP data refresh (attendance + speeches) if new records were inserted
    if (result.recordsInserted > 0) {
      console.log(`\n📊 [Hansard Sync] Running MP data refresh for ${result.recordsInserted} new records...`);
      try {
        const { refreshAllMpData } = await import('./aggregate-speeches');
        const aggregationResult = await refreshAllMpData();
        console.log(`✅ [Hansard Sync] MP data refresh complete:`);
        console.log(`   - Attendance: ${aggregationResult.attendance.totalMpsUpdated} MPs updated from ${aggregationResult.attendance.totalRecordsProcessed} records`);
        console.log(`   - Speeches: ${aggregationResult.speeches.totalMpsUpdated} MPs updated`);
      } catch (error: any) {
        console.error(`❌ [Hansard Sync] MP data refresh failed: ${error.message}`);
        // Don't fail the entire sync if aggregation fails
      }
    }

    return result;

  } catch (error: any) {
    const errorMsg = `Fatal error during Hansard sync: ${error.message}`;
    console.error(`❌ [Hansard Sync] ${errorMsg}`);
    result.endTime = new Date();
    result.durationMs = result.endTime.getTime() - startTime.getTime();
    result.errors.push({
      sessionNumber: 'N/A',
      error: errorMsg
    });
    
    // Rethrow fatal errors so the cron job knows it failed
    throw new Error(errorMsg);
  }
}

async function downloadAndSaveWithRetry(
  scraper: HansardScraper,
  pdfUrl: string,
  sessionNumber: string,
  maxRetries: number
): Promise<{ buffer: Buffer; text: string; originalFilename: string }> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await scraper.downloadAndSavePdf(pdfUrl, sessionNumber);
      if (result) {
        return result;
      }
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
        console.log(`⏳ [Hansard Sync] Retry ${attempt}/${maxRetries} failed. Waiting ${backoffMs / 1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }
  
  throw new Error(`All ${maxRetries} download attempts failed for ${pdfUrl}: ${lastError?.message}`);
}

let cronJob: ReturnType<typeof cron.schedule> | null = null;
let cronJob1pm: ReturnType<typeof cron.schedule> | null = null;
let cronJob2pm: ReturnType<typeof cron.schedule> | null = null;

// Store sync logs in memory (last 50 syncs)
const MAX_SYNC_LOGS = 50;
const syncLogs: HansardSyncResult[] = [];

export function addSyncLog(result: HansardSyncResult): void {
  syncLogs.unshift(result); // Add to beginning (newest first)
  if (syncLogs.length > MAX_SYNC_LOGS) {
    syncLogs.pop(); // Remove oldest
  }
}

export function getSyncLogs(): HansardSyncResult[] {
  return [...syncLogs];
}

export function getLatestSyncLog(): HansardSyncResult | null {
  return syncLogs[0] || null;
}

async function runScheduledSync(): Promise<void> {
  console.log('\n⏰ [Hansard Cron] Scheduled sync triggered');
  try {
    const result = await runHansardSync({ triggeredBy: 'scheduled' });
    addSyncLog(result);
    await persistSyncLogToDb(result);
  } catch (error: any) {
    const failedResult = {
      triggeredBy: 'scheduled' as 'scheduled',
      startTime: new Date(),
      endTime: new Date(),
      durationMs: 0,
      lastKnownSession: null,
      recordsFound: 0,
      recordsInserted: 0,
      recordsSkipped: 0,
      errors: [{ sessionNumber: 'N/A', error: error.message }]
    };
    addSyncLog(failedResult);
    await persistSyncLogToDb(failedResult);
  }
}

export function startHansardCron(): void {
  if (cronJob) {
    console.log('⚠️  [Hansard Cron] Cron job already running');
    return;
  }

  // 12:00 PM Malaysia time
  cronJob = cron.schedule('0 12 * * *', runScheduledSync, { timezone: 'Asia/Kuala_Lumpur' });

  // 1:00 PM Malaysia time
  cronJob1pm = cron.schedule('0 13 * * *', runScheduledSync, { timezone: 'Asia/Kuala_Lumpur' });

  // 2:00 PM Malaysia time
  cronJob2pm = cron.schedule('0 14 * * *', runScheduledSync, { timezone: 'Asia/Kuala_Lumpur' });

  console.log('✅ [Hansard Cron] Daily sync scheduled at 12:00, 13:00 and 14:00 Malaysia time (Asia/Kuala_Lumpur)');
}

export function stopHansardCron(): void {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
  }
  if (cronJob1pm) {
    cronJob1pm.stop();
    cronJob1pm = null;
  }
  if (cronJob2pm) {
    cronJob2pm.stop();
    cronJob2pm = null;
  }
  console.log('🛑 [Hansard Cron] Cron jobs stopped');
}

// ============================================================================
// DATABASE-BACKED SYNC LOGGING & RECOVERY
// ============================================================================

/**
 * Persist sync result to database for permanent monitoring
 */
export async function persistSyncLogToDb(result: HansardSyncResult): Promise<void> {
  try {
    if (!db) {
      console.warn('⚠️  [Hansard Cron] Database not available, cannot persist sync log');
      return;
    }

    const { eq, desc, sql } = await import('drizzle-orm');
    const { hansardSyncLogs } = await import('@shared/schema');

    await db.insert(hansardSyncLogs).values({
      triggeredBy: result.triggeredBy,
      startedAt: result.startTime,
      completedAt: result.endTime,
      durationMs: result.durationMs,
      lastKnownSession: result.lastKnownSession,
      recordsFound: result.recordsFound,
      recordsInserted: result.recordsInserted,
      recordsSkipped: result.recordsSkipped,
      errors: result.errors,
      success: result.errors.length === 0,
    });

    console.log('✅ [Hansard Cron] Sync log persisted to database');
  } catch (error: any) {
    console.error('❌ [Hansard Cron] Failed to persist sync log to database:', error.message);
  }
}

/**
 * Get last sync from database
 */
export async function getLastSyncFromDb(): Promise<{ startedAt: Date; success: boolean } | null> {
  try {
    if (!db) {
      return null;
    }

    const { desc } = await import('drizzle-orm');
    const { hansardSyncLogs } = await import('@shared/schema');

    const result = await db
      .select()
      .from(hansardSyncLogs)
      .orderBy(desc(hansardSyncLogs.startedAt))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return {
      startedAt: new Date(result[0].startedAt),
      success: result[0].success || false,
    };
  } catch (error: any) {
    console.error('❌ [Hansard Cron] Failed to get last sync from database:', error.message);
    return null;
  }
}

/**
 * Check if startup recovery is needed and run if necessary
 * This prevents data staleness after server restarts
 */
export async function checkAndRunStartupRecovery(): Promise<void> {
  try {
    console.log('🔍 [Hansard Cron] Checking if startup recovery is needed...');

    const lastSync = await getLastSyncFromDb();

    if (!lastSync) {
      console.log('ℹ️  [Hansard Cron] No previous sync found, skipping startup recovery');
      return;
    }

    const hoursSinceLastSync = (Date.now() - lastSync.startedAt.getTime()) / (1000 * 60 * 60);

    console.log(`ℹ️  [Hansard Cron] Last sync was ${hoursSinceLastSync.toFixed(1)} hours ago (${lastSync.success ? 'successful' : 'failed'})`);

    // If last sync was more than 36 hours ago, run recovery sync
    // (36 hours = 1.5 days, allowing for weekends/holidays with some buffer)
    if (hoursSinceLastSync > 36) {
      console.log('🚨 [Hansard Cron] Last sync was more than 36 hours ago, running startup recovery...');

      const result = await runHansardSync({ triggeredBy: 'startup-recovery' });

      // Add to in-memory logs for API access
      addSyncLog(result);

      // Persist to database
      await persistSyncLogToDb(result);

      console.log(`✅ [Hansard Cron] Startup recovery completed (${result.recordsInserted} new records inserted)`);
    } else {
      console.log('✅ [Hansard Cron] No startup recovery needed, last sync is recent');
    }
  } catch (error: any) {
    console.error('❌ [Hansard Cron] Startup recovery failed:', error.message);
  }
}

/**
 * Enhanced cron start with startup recovery
 */
export async function startHansardCronWithRecovery(): Promise<void> {
  // First, check if we need to run a recovery sync
  await checkAndRunStartupRecovery();

  // Then start the regular cron job
  startHansardCron();
}
