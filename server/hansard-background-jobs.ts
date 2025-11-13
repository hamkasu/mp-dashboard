import { storage } from './storage';
import { HansardScraper } from './hansard-scraper';
import { MPNameMatcher } from './mp-name-matcher';
import { jobTracker } from './job-tracker';

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
      
      // Download, save PDF locally, and extract text
      const result = await scraper.downloadAndSavePdf(metadata.pdfUrl, metadata.sessionNumber);
      
      if (!result) {
        console.log(`  ✗ Failed to download/extract PDF`);
        errorCount++;
        continue;
      }
      
      const { localPath, text: transcript } = result;
      
      try {
        const topics = extractTopics(transcript);
        const attendance = scraper.extractAttendanceFromText(transcript);
        const constituencyCounts = scraper.extractConstituencyAttendanceCounts(transcript);
        
        const allMps = await storage.getAllMps();
        const nameMatcher = new MPNameMatcher(allMps);
        
        const attendedMpIds = nameMatcher.matchNames(attendance.attendedNames);
        const absentMpIds = nameMatcher.matchNames(attendance.absentNames);
        
        console.log(`  Attendance: ${attendedMpIds.length} present, ${absentMpIds.length} absent`);
        console.log(`  Constituencies: ${constituencyCounts.constituenciesPresent} present, ${constituencyCounts.constituenciesAbsent} absent, ${constituencyCounts.constituenciesAbsentRule91} absent (Rule 91)`);
        
        await storage.createHansardRecord({
          sessionNumber: metadata.sessionNumber,
          sessionDate: metadata.sessionDate,
          parliamentTerm: metadata.parliamentTerm,
          sitting: metadata.sitting,
          transcript: transcript.substring(0, 100000),
          pdfLinks: [localPath],
          topics: topics,
          speakers: [],
          speakerStats: [],
          voteRecords: [],
          attendedMpIds,
          absentMpIds,
          constituenciesPresent: constituencyCounts.constituenciesPresent,
          constituenciesAbsent: constituencyCounts.constituenciesAbsent,
          constituenciesAbsentRule91: constituencyCounts.constituenciesAbsentRule91
        });
        
        console.log(`  ✓ Saved PDF to ${localPath} (${Math.floor(transcript.length / 1000)}KB of text)`);
        successCount++;
      } catch (error) {
        console.error(`  ✗ Error saving:`, error);
        errorCount++;
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
