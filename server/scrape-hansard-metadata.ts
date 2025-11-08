import { HansardScraper } from './hansard-scraper';
import { storage } from './storage';
import type { InsertHansardRecord } from '@shared/schema';

async function scrapeHansardMetadata() {
  console.log('Starting Hansard metadata collection for Parliament 15...\n');
  
  const scraper = new HansardScraper();
  
  try {
    console.log('Fetching Hansard list from parlimen.gov.my...');
    const hansards = await scraper.getHansardListForParliament15(250); // Get up to 250 records
    
    console.log(`\nFound ${hansards.length} Hansard sessions`);
    console.log('Saving to database...\n');
    
    let savedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const hansard of hansards) {
      try {
        // Check if this session already exists
        const existing = await storage.getHansardRecordsBySessionNumber(hansard.sessionNumber);
        if (existing.length > 0) {
          console.log(`⏭️  Skipped: ${hansard.sessionNumber} (already exists)`);
          skippedCount++;
          continue;
        }
        
        // Create the Hansard record without downloading PDF
        const record: InsertHansardRecord = {
          sessionNumber: hansard.sessionNumber,
          sessionDate: hansard.sessionDate,
          parliamentTerm: hansard.parliamentTerm,
          sitting: hansard.sitting,
          transcript: `Hansard Dewan Rakyat ${hansard.sessionNumber}. Tarikh: ${hansard.sessionDate.toLocaleDateString('ms-MY')}. Sila muat turun PDF untuk transkrip penuh.`,
          pdfLinks: [hansard.pdfUrl],
          topics: [],
          speakers: [],
          voteRecords: [],
        };
        
        await storage.createHansardRecord(record);
        console.log(`✅ ${hansard.sessionNumber} - ${hansard.sessionDate.toLocaleDateString('ms-MY')} → ${hansard.pdfUrl}`);
        savedCount++;
        
      } catch (error) {
        console.error(`❌ Error saving ${hansard.sessionNumber}:`, error);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total found: ${hansards.length}`);
    console.log(`   Newly saved: ${savedCount}`);
    console.log(`   Skipped (already exist): ${skippedCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`\n✅ Hansard metadata collection completed!`);
    console.log(`\nAll ${savedCount + skippedCount} Hansard records are now available at /hansard`);
    console.log(`Users can download PDFs directly from the page.\n`);
    
  } catch (error) {
    console.error('Fatal error during Hansard scraping:', error);
    process.exit(1);
  }
}

scrapeHansardMetadata()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
