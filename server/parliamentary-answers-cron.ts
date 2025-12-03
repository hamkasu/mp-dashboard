/**
 * Copyright by Calmic Sdn Bhd
 *
 * Parliamentary Answers Cron Job
 * Schedules automated scraping and PDF downloading from Parliament website
 */

import cron from 'node-cron';
import {
  scrapeAndSaveAnswers,
  batchProcessAnswerPdfs,
} from './parliamentary-answers-scraper';

let isRunning = false;
let lastRunAt: Date | null = null;
let lastRunResult: {
  saved: number;
  updated: number;
  errors: number;
  pdfStats?: {
    total: number;
    processed: number;
    failed: number;
    skipped: number;
  };
} | null = null;

export interface ParliamentaryAnswersSyncResult {
  triggeredBy: 'manual' | 'scheduled';
  startTime: Date;
  endTime: Date;
  durationMs: number;
  answersSaved: number;
  answersUpdated: number;
  errors: number;
  pdfsTotal: number;
  pdfsProcessed: number;
  pdfsFailed: number;
  pdfsSkipped: number;
}

// Store sync logs in memory (last 50 syncs)
const MAX_SYNC_LOGS = 50;
const syncLogs: ParliamentaryAnswersSyncResult[] = [];

export function addSyncLog(result: ParliamentaryAnswersSyncResult): void {
  syncLogs.unshift(result); // Add to beginning (newest first)
  if (syncLogs.length > MAX_SYNC_LOGS) {
    syncLogs.pop(); // Remove oldest
  }
}

export function getSyncLogs(): ParliamentaryAnswersSyncResult[] {
  return [...syncLogs];
}

export function getLatestSyncLog(): ParliamentaryAnswersSyncResult | null {
  return syncLogs[0] || null;
}

/**
 * Run the parliamentary answers scrape and PDF download
 */
export async function runParliamentaryAnswersSync(options: {
  triggeredBy: 'manual' | 'scheduled';
}): Promise<ParliamentaryAnswersSyncResult> {
  const startTime = new Date();
  const result: ParliamentaryAnswersSyncResult = {
    triggeredBy: options.triggeredBy,
    startTime,
    endTime: new Date(),
    durationMs: 0,
    answersSaved: 0,
    answersUpdated: 0,
    errors: 0,
    pdfsTotal: 0,
    pdfsProcessed: 0,
    pdfsFailed: 0,
    pdfsSkipped: 0,
  };

  try {
    console.log(`\n🔄 [Parliamentary Answers Sync] Starting sync (${options.triggeredBy}) at ${startTime.toISOString()}`);

    // Step 1: Scrape and save new answers
    console.log('📥 [Parliamentary Answers Sync] Scraping answers from Parliament website...');
    const scrapeStats = await scrapeAndSaveAnswers();

    result.answersSaved = scrapeStats.saved;
    result.answersUpdated = scrapeStats.updated;
    result.errors = scrapeStats.errors;

    console.log(`✅ [Parliamentary Answers Sync] Scrape complete: ${scrapeStats.saved} saved, ${scrapeStats.updated} updated, ${scrapeStats.errors} errors`);

    // Step 2: Download PDFs for answers with PDF URLs
    console.log('📄 [Parliamentary Answers Sync] Downloading PDFs...');
    const pdfStats = await batchProcessAnswerPdfs();

    result.pdfsTotal = pdfStats.total;
    result.pdfsProcessed = pdfStats.processed;
    result.pdfsFailed = pdfStats.failed;
    result.pdfsSkipped = pdfStats.skipped;

    console.log(`✅ [Parliamentary Answers Sync] PDF download complete: ${pdfStats.processed} processed, ${pdfStats.failed} failed, ${pdfStats.skipped} skipped`);

    result.endTime = new Date();
    result.durationMs = result.endTime.getTime() - startTime.getTime();

    console.log(`\n✅ [Parliamentary Answers Sync] Sync completed in ${(result.durationMs / 1000).toFixed(2)}s`);
    console.log(`📊 [Parliamentary Answers Sync] Summary:`);
    console.log(`   - Answers saved: ${result.answersSaved}`);
    console.log(`   - Answers updated: ${result.answersUpdated}`);
    console.log(`   - PDFs processed: ${result.pdfsProcessed}`);
    console.log(`   - PDFs skipped: ${result.pdfsSkipped}`);
    console.log(`   - Errors: ${result.errors + result.pdfsFailed}`);

    // Update last run stats
    lastRunAt = new Date();
    lastRunResult = {
      saved: result.answersSaved,
      updated: result.answersUpdated,
      errors: result.errors,
      pdfStats: {
        total: result.pdfsTotal,
        processed: result.pdfsProcessed,
        failed: result.pdfsFailed,
        skipped: result.pdfsSkipped,
      },
    };

    // Add to sync logs
    addSyncLog(result);

    return result;
  } catch (error: any) {
    const errorMsg = `Fatal error during Parliamentary Answers sync: ${error.message}`;
    console.error(`❌ [Parliamentary Answers Sync] ${errorMsg}`);

    result.endTime = new Date();
    result.durationMs = result.endTime.getTime() - startTime.getTime();
    result.errors++;

    // Add failed sync to logs
    addSyncLog(result);

    throw new Error(errorMsg);
  } finally {
    isRunning = false;
  }
}

/**
 * Schedule the parliamentary answers scraper cron job
 * Runs daily at 2:00 AM Malaysia time (after Hansard sync at 12:00 PM)
 */
export function scheduleParliamentaryAnswersSync(): void {
  // Run at 2:00 AM Malaysia time (UTC+8)
  cron.schedule(
    '0 2 * * *',
    async () => {
      if (isRunning) {
        console.log('[Parliamentary Answers Cron] Sync already in progress, skipping...');
        return;
      }

      isRunning = true;
      console.log('\n⏰ [Parliamentary Answers Cron] Scheduled sync triggered');

      try {
        await runParliamentaryAnswersSync({ triggeredBy: 'scheduled' });
      } catch (error: any) {
        console.error('[Parliamentary Answers Cron] Sync failed:', error.message);
      } finally {
        isRunning = false;
      }
    },
    {
      timezone: 'Asia/Kuala_Lumpur',
    }
  );

  console.log('✅ [Parliamentary Answers Cron] Daily sync scheduled at 2:00 AM Malaysia time (Asia/Kuala_Lumpur)');
}

/**
 * Manually trigger a sync run
 */
export async function triggerManualSync(): Promise<ParliamentaryAnswersSyncResult> {
  if (isRunning) {
    throw new Error('Sync already in progress');
  }

  isRunning = true;
  try {
    return await runParliamentaryAnswersSync({ triggeredBy: 'manual' });
  } finally {
    isRunning = false;
  }
}

/**
 * Get sync status
 */
export function getSyncStatus() {
  return {
    isRunning,
    lastRunAt,
    lastRunResult,
  };
}
