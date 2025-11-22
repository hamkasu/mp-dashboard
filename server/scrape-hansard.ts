/**
 * Copyright by Calmic Sdn Bhd
 */

import { HansardScraper } from './hansard-scraper';
import { MPNameMatcher } from './mp-name-matcher';
import { storage } from './storage';

async function scrapeAndStoreHansard() {
  const scraper = new HansardScraper();
  
  console.log('Fetching ALL Hansard records for 15th Parliament...');
  const hansardList = await scraper.getHansardListForParliament15(1000);
  
  console.log(`Found ${hansardList.length} Hansard records to process`);
  
  const allMps = await storage.getAllMps();
  const nameMatcher = new MPNameMatcher(allMps);
  console.log(`Loaded ${allMps.length} MPs for name matching`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const metadata of hansardList) {
    console.log(`\nProcessing ${metadata.sessionNumber} (${metadata.sessionDate.toISOString().split('T')[0]})...`);
    
    const existingRecords = await storage.getHansardRecordsBySessionNumber(metadata.sessionNumber);
    if (existingRecords.length > 0) {
      console.log(`  ✓ Already exists, skipping`);
      continue;
    }
    
    const transcript = await scraper.downloadAndExtractPdf(metadata.pdfUrl);
    
    if (!transcript) {
      console.log(`  ✗ Failed to extract PDF`);
      errorCount++;
      continue;
    }
    
    try {
      const topics = extractTopics(transcript);
      const attendance = scraper.extractAttendanceFromText(transcript);
      
      const attendedMpIds = nameMatcher.matchNames(attendance.attendedNames);
      const absentMpIds = nameMatcher.matchNames(attendance.absentNames);
      
      console.log(`  Attendance: ${attendedMpIds.length} present, ${absentMpIds.length} absent`);
      
      await storage.createHansardRecord({
        sessionNumber: metadata.sessionNumber,
        sessionDate: metadata.sessionDate,
        parliamentTerm: metadata.parliamentTerm,
        sitting: metadata.sitting,
        transcript: transcript.substring(0, 100000),
        pdfLinks: [metadata.pdfUrl],
        topics: topics,
        speakers: [],
        voteRecords: [],
        attendedMpIds,
        absentMpIds
      });
      
      console.log(`  ✓ Saved (${Math.floor(transcript.length / 1000)}KB of text)`);
      successCount++;
    } catch (error) {
      console.error(`  ✗ Error saving:`, error);
      errorCount++;
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Successfully processed: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Already existed: ${hansardList.length - successCount - errorCount}`);
}

function extractTopics(transcript: string): string[] {
  const topics: Set<string> = new Set();
  
  const commonTopics = [
    'Bajet', 'Budget', 'Rang Undang-Undang', 'Bill', 
    'Perlembagaan', 'Constitution', 'Soalan', 'Question',
    'Parlimen', 'Parliament', 'Ekonomi', 'Economy',
    'Pendidikan', 'Education', 'Kesihatan', 'Health'
  ];
  
  const lines = transcript.split('\n').slice(0, 100);
  
  for (const topic of commonTopics) {
    if (transcript.toLowerCase().includes(topic.toLowerCase())) {
      topics.add(topic);
    }
  }
  
  const titleMatch = transcript.match(/RANG UNDANG-UNDANG ([A-Z\s]+)/);
  if (titleMatch) {
    topics.add(titleMatch[1].trim());
  }
  
  return Array.from(topics).slice(0, 10);
}

scrapeAndStoreHansard()
  .then(() => {
    console.log('\nScraping complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
