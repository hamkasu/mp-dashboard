/**
 * Copyright by Calmic Sdn Bhd
 */

import { storage } from './storage';
import { HansardScraper } from './hansard-scraper';
import { InsertHansardRecord } from '@shared/schema';
import { HansardSpeechAnalyzer } from './hansard-speech-analyzer';
import { randomUUID } from 'crypto';
import { db } from './db';

async function downloadWithRetry(
  scraper: HansardScraper,
  pdfUrl: string,
  maxRetries: number
): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const transcript = await scraper.downloadAndExtractPdf(pdfUrl);
    if (transcript && transcript.length > 0) {
      return transcript;
    }
    console.log(`  ⚠️  Retry ${attempt}/${maxRetries} for ${pdfUrl}`);
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  throw new Error(`Failed to download PDF after ${maxRetries} attempts: ${pdfUrl}`);
}

async function main() {
  try {
    console.log('\n🔄 Starting full Hansard archive download...\n');
    const startTime = Date.now();
    
    // Fetch ALL available Hansard metadata (up to 1000 records)
    const scraper = new HansardScraper();
    console.log('🔍 Fetching all available Hansard metadata from parliament website...');
    const allMetadata = await scraper.getHansardListForParliament15(1000);
    
    console.log(`📊 Found ${allMetadata.length} total Hansard records in the archive`);
    
    let inserted = 0;
    let skipped = 0;
    let errors = 0;
    
    // Process each record
    for (let i = 0; i < allMetadata.length; i++) {
      const metadata = allMetadata[i];
      const recordNum = i + 1;
      
      try {
        // Check if this session already exists
        const existing = await storage.getHansardRecordsBySessionNumber(metadata.sessionNumber);
        if (existing.length > 0) {
          console.log(`[${recordNum}/${allMetadata.length}] ⏭️  Skipping (already exists): ${metadata.sessionNumber}`);
          skipped++;
          continue;
        }

        console.log(`\n[${recordNum}/${allMetadata.length}] 📥 Downloading: ${metadata.sessionNumber} (${metadata.sessionDate.toISOString().split('T')[0]})`);

        // Download and extract PDF with retries
        const transcript = await downloadWithRetry(scraper, metadata.pdfUrl, 3);

        // Extract attendance data
        const attendanceData = scraper.extractAttendanceFromText(transcript);
        const constituencyData = scraper.extractConstituencyAttendanceCounts(transcript);

        // Analyze speeches
        const allMps = await storage.getAllMps();
        const speechAnalyzer = new HansardSpeechAnalyzer(allMps);
        const speechStats = speechAnalyzer.analyzeSpeeches(
          transcript,
          metadata.sessionNumber,
          metadata.sessionDate
        );

        const speakerStatsArray = Array.from(speechStats.speakerStats.values());
        const enrichedSpeakers = speakerStatsArray.map(stat => ({
          mpId: stat.mpId,
          mpName: stat.mpName,
          speakingOrder: stat.speakingOrder || 1,
          totalSpeeches: stat.totalSpeeches
        }));

        // Create hansard record
        const hansardRecord: InsertHansardRecord = {
          sessionNumber: metadata.sessionNumber,
          sessionDate: metadata.sessionDate,
          parliamentTerm: metadata.parliamentTerm,
          sitting: metadata.sitting,
          transcript,
          pdfLinks: [metadata.pdfUrl],
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

        await storage.createHansardRecord(hansardRecord);
        inserted++;
        console.log(`  ✅ Successfully inserted: ${metadata.sessionNumber}`);

      } catch (error: any) {
        console.error(`  ❌ Error processing ${metadata.sessionNumber}:`, error.message);
        errors++;
      }
    }
    
    const duration = Date.now() - startTime;
    console.log('\n=== DOWNLOAD COMPLETE ===');
    console.log(`Total records in archive: ${allMetadata.length}`);
    console.log(`Records inserted: ${inserted}`);
    console.log(`Records skipped (already exist): ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
    
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
