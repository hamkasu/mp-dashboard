/**
 * Copyright by Calmic Sdn Bhd
 */

import { storage } from './storage';
import { HansardScraper } from './hansard-scraper';
import { MPNameMatcher } from './mp-name-matcher';
import { jobTracker } from './job-tracker';
import { getPublicBaseUrl, buildPdfUrl } from './utils/url-helper';
import { db } from './db';
import { hansardPdfFiles } from '@shared/schema';
import crypto from 'crypto';

function extractTopics(text: string): string[] {
  const topics: Set<string> = new Set();
  
  const commonTopics = [
    'Bajet', 'Budget', 'Rang Undang-Undang', 'Bill', 
    'Perlembagaan', 'Constitution', 'Soalan', 'Question',
    'Parlimen', 'Parliament', 'Ekonomi', 'Economy',
    'Pendidikan', 'Education', 'Kesihatan', 'Health'
  ];
  
  for (const topic of commonTopics) {
    if (text.toLowerCase().includes(topic.toLowerCase())) {
      topics.add(topic);
    }
  }
  
  const titleMatch = text.match(/RANG UNDANG-UNDANG ([A-Z\s]+)/);
  if (titleMatch) {
    topics.add(titleMatch[1].trim());
  }
  
  return Array.from(topics).slice(0, 10);
}

export async function runHansardDownloadJob(
  jobId: string,
  maxRecords: number,
  deleteExisting: boolean
): Promise<void> {
  try {
    jobTracker.startJob(jobId);
    
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    // Delete existing records if requested
    if (deleteExisting) {
      jobTracker.updateProgress(jobId, 0, 'Deleting existing Hansard records...');
      console.log('[Job] Deleting all existing Hansard records...');
      const deletedCount = await storage.deleteAllHansardRecords();
      console.log(`[Job] Deleted ${deletedCount} existing Hansard records`);
    }
    
    // Fetch Hansard list
    jobTracker.updateProgress(jobId, 0, 'Fetching Hansard list from parliament website...');
    const scraper = new HansardScraper();
    console.log('[Job] Fetching Hansard list for 15th Parliament...');
    const hansardList = await scraper.getHansardListForParliament15(maxRecords);
    console.log(`[Job] Found ${hansardList.length} Hansard records to process`);
    
    // Update the job's total to reflect the actual number of records and broadcast it
    const job = jobTracker.getJob(jobId);
    if (job) {
      job.progress.total = hansardList.length;
      // Broadcast the updated total by calling updateProgress
      jobTracker.updateProgress(jobId, 0, `Processing ${hansardList.length} Hansard records...`);
    }
    
    // Process each record
    for (let i = 0; i < hansardList.length; i++) {
      const metadata = hansardList[i];
      const recordNum = i + 1;
      
      jobTracker.updateProgress(
        jobId,
        recordNum,
        `Processing ${metadata.sessionNumber} (${recordNum}/${hansardList.length})`
      );
      
      console.log(`[Job] Processing ${metadata.sessionNumber} (${metadata.sessionDate.toISOString().split('T')[0]})...`);
      
      // Check if record already exists
      if (!deleteExisting) {
        const existingRecords = await storage.getHansardRecordsBySessionNumber(metadata.sessionNumber);
        if (existingRecords.length > 0) {
          console.log(`  ✓ Already exists, skipping`);
          skippedCount++;
          continue;
        }
      }
      
      // Download PDF and extract text
      const result = await scraper.downloadAndSavePdf(metadata.pdfUrl, metadata.sessionNumber);
      
      if (!result) {
        console.log(`  ✗ Failed to download/extract PDF`);
        errorCount++;
        continue;
      }
      
      const { buffer, text: transcript, originalFilename } = result;
      
      try {
        const topics = extractTopics(transcript);
        const attendance = scraper.extractAttendanceFromText(transcript);
        const constituencyCounts = scraper.extractConstituencyAttendanceCounts(transcript);
        
        const allMps = await storage.getAllMps();
        const nameMatcher = new MPNameMatcher(allMps);
        
        // Use constituency-based matching as primary (more reliable), with name matching as fallback
        const attendedByConstituency = nameMatcher.matchConstituencies(attendance.attendedConstituencies);
        const attendedByName = nameMatcher.matchNames(attendance.attendedNames);
        const attendedMpIds = Array.from(new Set([...attendedByConstituency, ...attendedByName]));
        
        const absentByConstituency = nameMatcher.matchConstituencies(attendance.absentConstituencies);
        const absentByName = nameMatcher.matchNames(attendance.absentNames);
        const absentMpIds = Array.from(new Set([...absentByConstituency, ...absentByName]));
        
        const senatorsAttending = attendance.senatorsAttending || [];
        
        console.log(`  Constituency matches: ${attendedByConstituency.length} present, ${absentByConstituency.length} absent`);
        console.log(`  Attendance: ${attendedMpIds.length} present, ${absentMpIds.length} absent, ${senatorsAttending.length} senators`);
        console.log(`  Constituencies: ${constituencyCounts.constituenciesPresent} present, ${constituencyCounts.constituenciesAbsent} absent, ${constituencyCounts.constituenciesAbsentRule91} absent (Rule 91)`);
        
        // Create Hansard record first
        const hansardRecord = await storage.createHansardRecord({
          sessionNumber: metadata.sessionNumber,
          sessionDate: metadata.sessionDate,
          parliamentTerm: metadata.parliamentTerm,
          sitting: metadata.sitting,
          transcript: transcript.substring(0, 100000),
          pdfLinks: [], // No longer using pdfLinks
          topics: topics,
          speakers: [],
          speakerStats: [],
          voteRecords: [],
          attendedMpIds,
          absentMpIds,
          senatorsAttending,
          constituenciesPresent: constituencyCounts.constituenciesPresent,
          constituenciesAbsent: constituencyCounts.constituenciesAbsent,
          constituenciesAbsentRule91: constituencyCounts.constituenciesAbsentRule91
        });
        
        // Save PDF to database with deduplication
        const md5Hash = crypto.createHash('md5').update(buffer).digest('hex');
        
        // Check if a PDF with this hash already exists for this record
        const { eq, and } = await import("drizzle-orm");
        const [existingPdf] = await db.select().from(hansardPdfFiles)
          .where(and(
            eq(hansardPdfFiles.hansardRecordId, hansardRecord.id),
            eq(hansardPdfFiles.md5Hash, md5Hash)
          ));
        
        if (existingPdf) {
          // Duplicate found - ensure it's marked as primary
          if (!existingPdf.isPrimary) {
            await db.update(hansardPdfFiles)
              .set({ isPrimary: false })
              .where(eq(hansardPdfFiles.hansardRecordId, hansardRecord.id));
            
            await db.update(hansardPdfFiles)
              .set({ isPrimary: true })
              .where(eq(hansardPdfFiles.id, existingPdf.id));
          }
          console.log(`  ✓ PDF already exists (same MD5 hash), using existing file as primary`);
        } else {
          // New PDF - clear previous primary flags and insert
          await db.update(hansardPdfFiles)
            .set({ isPrimary: false })
            .where(eq(hansardPdfFiles.hansardRecordId, hansardRecord.id));
          
          await db.insert(hansardPdfFiles).values({
            hansardRecordId: hansardRecord.id,
            originalFilename,
            fileSizeBytes: buffer.length,
            contentType: 'application/pdf',
            pdfData: buffer,
            md5Hash,
            isPrimary: true,
          });
          
          console.log(`  ✓ Saved new PDF to database (${Math.floor(transcript.length / 1000)}KB of text)`);
        }
        successCount++;
      } catch (error) {
        console.error(`  ✗ Error saving:`, error);
        errorCount++;
      }
    }
    
    // Run MP data refresh if any records were successfully processed
    if (successCount > 0) {
      console.log(`\n[Job] Running MP data refresh for ${successCount} new records...`);
      try {
        const { refreshAllMpData } = await import('./aggregate-speeches');
        const refreshResult = await refreshAllMpData();
        console.log(`[Job] ✅ MP data refresh complete:`);
        console.log(`[Job]    - Attendance: ${refreshResult.attendance.totalMpsUpdated} MPs updated from ${refreshResult.attendance.totalRecordsProcessed} records`);
        console.log(`[Job]    - Speeches: ${refreshResult.speeches.totalMpsUpdated} MPs updated`);
      } catch (error: any) {
        console.error(`[Job] ⚠️  MP data refresh failed: ${error.message}`);
        // Don't fail the job if refresh fails
      }
    }

    // Complete the job
    console.log(`\n[Job] === Summary ===`);
    console.log(`[Job] Successfully processed: ${successCount}`);
    console.log(`[Job] Errors: ${errorCount}`);
    console.log(`[Job] Already existed: ${skippedCount}`);

    jobTracker.completeJob(jobId, {
      successCount,
      errorCount,
      skippedCount
    });

  } catch (error) {
    console.error('[Job] Error in background job:', error);
    jobTracker.failJob(jobId, error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Background job to download hansard records from previous parliaments (1st-14th).
 * This is additive - it does NOT delete existing records, only downloads new ones.
 */
export async function runPreviousParliamentsDownloadJob(
  jobId: string,
  maxRecords: number
): Promise<void> {
  try {
    jobTracker.startJob(jobId);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // Fetch Hansard list from previous parliaments
    jobTracker.updateProgress(jobId, 0, 'Fetching hansard list from previous parliaments...');
    const scraper = new HansardScraper();
    console.log('[Job] Fetching Hansard list for previous parliaments (1st-14th)...');
    const hansardList = await scraper.getHansardListForPreviousParliaments(maxRecords);
    console.log(`[Job] Found ${hansardList.length} Hansard records from previous parliaments`);

    // Update the job total
    const job = jobTracker.getJob(jobId);
    if (job) {
      job.progress.total = hansardList.length;
      jobTracker.updateProgress(jobId, 0, `Processing ${hansardList.length} records from previous parliaments...`);
    }

    // Process each record
    for (let i = 0; i < hansardList.length; i++) {
      const metadata = hansardList[i];
      const recordNum = i + 1;

      jobTracker.updateProgress(
        jobId,
        recordNum,
        `Processing ${metadata.sessionNumber} [${metadata.parliamentTerm}] (${recordNum}/${hansardList.length})`
      );

      console.log(`[Job] Processing ${metadata.sessionNumber} [${metadata.parliamentTerm}] (${metadata.sessionDate.toISOString().split('T')[0]})...`);

      // Check if record already exists
      const existingRecords = await storage.getHansardRecordsBySessionNumber(metadata.sessionNumber);
      if (existingRecords.length > 0) {
        console.log(`  ✓ Already exists, skipping`);
        skippedCount++;
        continue;
      }

      // Download PDF and extract text
      const result = await scraper.downloadAndSavePdf(metadata.pdfUrl, metadata.sessionNumber);

      if (!result) {
        console.log(`  ✗ Failed to download/extract PDF`);
        errorCount++;
        continue;
      }

      const { buffer, text: transcript, originalFilename } = result;

      try {
        const topics = extractTopics(transcript);
        const attendance = scraper.extractAttendanceFromText(transcript);
        const constituencyCounts = scraper.extractConstituencyAttendanceCounts(transcript);

        // For previous parliaments, we still extract attendance data but don't match to current MPs
        // since the MP roster is different for each parliament
        const senatorsAttending = attendance.senatorsAttending || [];

        console.log(`  Constituencies: ${constituencyCounts.constituenciesPresent} present, ${constituencyCounts.constituenciesAbsent} absent, ${constituencyCounts.constituenciesAbsentRule91} absent (Rule 91)`);

        // Create Hansard record
        const hansardRecord = await storage.createHansardRecord({
          sessionNumber: metadata.sessionNumber,
          sessionDate: metadata.sessionDate,
          parliamentTerm: metadata.parliamentTerm,
          sitting: metadata.sitting,
          transcript: transcript.substring(0, 100000),
          pdfLinks: [],
          topics: topics,
          speakers: [],
          speakerStats: [],
          voteRecords: [],
          attendedMpIds: [],
          absentMpIds: [],
          senatorsAttending,
          constituenciesPresent: constituencyCounts.constituenciesPresent,
          constituenciesAbsent: constituencyCounts.constituenciesAbsent,
          constituenciesAbsentRule91: constituencyCounts.constituenciesAbsentRule91
        });

        // Save PDF to database with deduplication
        const md5Hash = crypto.createHash('md5').update(buffer).digest('hex');

        const { eq, and } = await import("drizzle-orm");
        const [existingPdf] = await db.select().from(hansardPdfFiles)
          .where(and(
            eq(hansardPdfFiles.hansardRecordId, hansardRecord.id),
            eq(hansardPdfFiles.md5Hash, md5Hash)
          ));

        if (existingPdf) {
          if (!existingPdf.isPrimary) {
            await db.update(hansardPdfFiles)
              .set({ isPrimary: false })
              .where(eq(hansardPdfFiles.hansardRecordId, hansardRecord.id));

            await db.update(hansardPdfFiles)
              .set({ isPrimary: true })
              .where(eq(hansardPdfFiles.id, existingPdf.id));
          }
          console.log(`  ✓ PDF already exists (same MD5 hash), using existing file as primary`);
        } else {
          await db.update(hansardPdfFiles)
            .set({ isPrimary: false })
            .where(eq(hansardPdfFiles.hansardRecordId, hansardRecord.id));

          await db.insert(hansardPdfFiles).values({
            hansardRecordId: hansardRecord.id,
            originalFilename,
            fileSizeBytes: buffer.length,
            contentType: 'application/pdf',
            pdfData: buffer,
            md5Hash,
            isPrimary: true,
          });

          console.log(`  ✓ Saved new PDF to database (${Math.floor(transcript.length / 1000)}KB of text)`);
        }
        successCount++;
      } catch (error) {
        console.error(`  ✗ Error saving:`, error);
        errorCount++;
      }
    }

    // Complete the job
    console.log(`\n[Job] === Previous Parliaments Summary ===`);
    console.log(`[Job] Successfully processed: ${successCount}`);
    console.log(`[Job] Errors: ${errorCount}`);
    console.log(`[Job] Already existed: ${skippedCount}`);

    jobTracker.completeJob(jobId, {
      successCount,
      errorCount,
      skippedCount
    });

  } catch (error) {
    console.error('[Job] Error in previous parliaments download job:', error);
    jobTracker.failJob(jobId, error instanceof Error ? error.message : 'Unknown error');
  }
}
