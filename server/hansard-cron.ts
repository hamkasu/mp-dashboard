import cron from 'node-cron';
import { storage } from './storage';
import { HansardScraper } from './hansard-scraper';
import { InsertHansardRecord, hansardPdfFiles } from '@shared/schema';
import { HansardSpeechAnalyzer } from './hansard-speech-analyzer';
import crypto from 'crypto';
import { getPublicBaseUrl, buildPdfUrl } from './utils/url-helper';
import { db } from './db';

export interface HansardSyncResult {
  triggeredBy: 'manual' | 'scheduled';
  startTime: Date;
  endTime: Date;
  durationMs: number;
  lastKnownSession: string | null;
  recordsFound: number;
  recordsInserted: number;
  recordsSkipped: number;
  errors: Array<{ sessionNumber: string; error: string }>;
}

export async function runHansardSync(options: { triggeredBy: 'manual' | 'scheduled' }): Promise<HansardSyncResult> {
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

export function startHansardCron(): void {
  if (cronJob) {
    console.log('⚠️  [Hansard Cron] Cron job already running');
    return;
  }

  // Schedule cron job to run daily at 2 AM Malaysia time (Asia/Kuala_Lumpur)
  // Cron expression: "0 2 * * *" = At 02:00 every day
  cronJob = cron.schedule(
    '0 2 * * *',
    async () => {
      console.log('\n⏰ [Hansard Cron] Scheduled sync triggered');
      await runHansardSync({ triggeredBy: 'scheduled' });
    },
    {
      timezone: 'Asia/Kuala_Lumpur'
    }
  );

  console.log('✅ [Hansard Cron] Daily sync scheduled at 02:00 Malaysia time (Asia/Kuala_Lumpur)');
}

export function stopHansardCron(): void {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log('🛑 [Hansard Cron] Cron job stopped');
  }
}
