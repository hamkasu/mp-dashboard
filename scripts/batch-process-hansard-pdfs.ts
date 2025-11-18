import fs from 'fs';
import path from 'path';
import { db } from '../server/db';
import { mps, hansardRecords } from '../shared/schema';
import { HansardPdfParser } from '../server/hansard-pdf-parser';
import type { InsertHansardRecord } from '../shared/schema';

/**
 * Batch process all Hansard PDFs in attached_assets/ directory
 * Parses each PDF and saves to database with speaker statistics
 */
async function batchProcessHansardPdfs() {
  try {
    console.log('📁 Scanning attached_assets/ for Hansard PDFs...\n');

    const attachedAssetsDir = path.join(process.cwd(), 'attached_assets');
    const allFiles = fs.readdirSync(attachedAssetsDir);
    const pdfFiles = allFiles.filter(file => file.startsWith('DR-') && file.endsWith('.pdf'));

    console.log(`✅ Found ${pdfFiles.length} Hansard PDF files\n`);

    console.log('👥 Loading MPs from database...');
    const allMps = await db.select().from(mps);
    console.log(`✅ Loaded ${allMps.length} MPs\n`);

    const parser = new HansardPdfParser(allMps);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    console.log('📊 Starting batch processing...\n');
    console.log('='.repeat(80));

    for (let i = 0; i < pdfFiles.length; i++) {
      const pdfFile = pdfFiles[i];
      const pdfPath = path.join(attachedAssetsDir, pdfFile);
      
      console.log(`\n[${i + 1}/${pdfFiles.length}] Processing: ${pdfFile}`);
      console.log('-'.repeat(80));

      try {
        // Read PDF buffer
        const pdfBuffer = fs.readFileSync(pdfPath);
        console.log(`   📄 File size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);

        // Parse PDF
        console.log('   🔍 Parsing PDF...');
        const parsed = await parser.parseHansardPdf(pdfBuffer, pdfFile);

        // Check if this session already exists
        const existing = await db.select()
          .from(hansardRecords);
        
        const sessionExists = existing.some(r => 
          r.sessionNumber === parsed.metadata.sessionNumber && 
          r.sessionDate.getTime() === parsed.metadata.sessionDate.getTime()
        );

        if (sessionExists) {
          console.log(`   ⚠️  Session ${parsed.metadata.sessionNumber} already exists - skipping`);
          skippedCount++;
          continue;
        }

        // Count speeches per MP from allSpeakingInstances
        const speechCounts = new Map<string, number>();
        for (const instance of parsed.allSpeakingInstances) {
          speechCounts.set(instance.mpId, (speechCounts.get(instance.mpId) || 0) + 1);
        }

        // Create speakerStats array with totalSpeeches for each MP
        const speakerStatsArray = parsed.speakers.map(s => ({
          mpId: s.mpId,
          mpName: s.mpName,
          totalSpeeches: speechCounts.get(s.mpId) || 0,
          speakingOrder: s.speakingOrder,
        }));

        // Prepare Hansard record
        const hansardRecord: InsertHansardRecord = {
          sessionNumber: parsed.metadata.sessionNumber,
          sessionDate: parsed.metadata.sessionDate,
          parliamentTerm: parsed.metadata.parliamentTerm,
          sitting: parsed.metadata.sitting,
          transcript: parsed.transcript,
          pdfLinks: [pdfFile],
          topics: parsed.topics,
          speakers: parsed.speakers.map(s => ({
            mpId: s.mpId,
            mpName: s.mpName,
            speakingOrder: s.speakingOrder,
            totalSpeeches: speechCounts.get(s.mpId) || 0,
          })),
          speakerStats: speakerStatsArray,
          sessionSpeakerStats: parsed.speakerStats,
          voteRecords: [],
          attendedMpIds: parsed.attendance.attendedMpIds,
          absentMpIds: parsed.attendance.absentMpIds,
          constituenciesPresent: parsed.attendance.attendedConstituencies.length,
          constituenciesAbsent: parsed.attendance.absentConstituencies.length,
        };

        // Save to database
        console.log('   💾 Saving to database...');
        const created = await db.insert(hansardRecords).values(hansardRecord).returning();

        console.log(`   ✅ Successfully saved session: ${parsed.metadata.sessionNumber}`);
        console.log(`      Date: ${parsed.metadata.sessionDate.toLocaleDateString()}`);
        console.log(`      Speakers: ${speakerStatsArray.length} MPs`);
        console.log(`      Attendance: ${parsed.attendance.attendedMpIds.length}/${allMps.length} MPs`);
        console.log(`      Unmatched speakers: ${parsed.unmatchedSpeakers.length}`);

        if (parsed.unmatchedSpeakers.length > 0) {
          console.log(`      ⚠️  Unmatched: ${parsed.unmatchedSpeakers.slice(0, 3).join(', ')}${parsed.unmatchedSpeakers.length > 3 ? '...' : ''}`);
        }

        successCount++;

      } catch (error: any) {
        console.error(`   ❌ Error processing ${pdfFile}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 BATCH PROCESSING COMPLETE');
    console.log('='.repeat(80));
    console.log(`✅ Successfully processed: ${successCount} files`);
    console.log(`⚠️  Skipped (already exists): ${skippedCount} files`);
    console.log(`❌ Errors: ${errorCount} files`);
    console.log(`📁 Total files: ${pdfFiles.length}`);
    console.log('='.repeat(80));

    if (successCount > 0) {
      console.log('\n💡 Next step: Run "npm run aggregate-speeches" to update MP statistics\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error in batch processing:', error);
    process.exit(1);
  }
}

batchProcessHansardPdfs();
