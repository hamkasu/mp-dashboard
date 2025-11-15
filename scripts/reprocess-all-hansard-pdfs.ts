import { db } from '../server/db';
import { hansardRecords, hansardPdfFiles, mps } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { HansardPdfParser } from '../server/hansard-pdf-parser';

async function reprocessAllHansardPdfs() {
  try {
    console.log('🔄 Re-processing all Hansard PDFs to extract speaker data...\n');

    console.log('👥 Fetching all MPs...');
    const allMps = await db.select().from(mps);
    console.log(`✅ Found ${allMps.length} MPs\n`);

    const parser = new HansardPdfParser(allMps);

    console.log('📄 Fetching all Hansard PDF files...');
    const allPdfFiles = await db
      .select({
        id: hansardPdfFiles.id,
        hansardRecordId: hansardPdfFiles.hansardRecordId,
        originalFilename: hansardPdfFiles.originalFilename,
        pdfData: hansardPdfFiles.pdfData,
      })
      .from(hansardPdfFiles);
    
    console.log(`✅ Found ${allPdfFiles.length} PDF files\n`);

    if (allPdfFiles.length === 0) {
      console.log('❌ No PDF files found to process');
      process.exit(0);
    }

    console.log('🔧 Processing PDFs and updating Hansard records...\n');

    let processedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const pdfFile of allPdfFiles) {
      try {
        processedCount++;
        
        if (processedCount % 10 === 0) {
          console.log(`   Progress: ${processedCount}/${allPdfFiles.length} PDFs...`);
        }

        const pdfBuffer = pdfFile.pdfData;
        
        console.log(`\n📄 [${processedCount}/${allPdfFiles.length}] Processing: ${pdfFile.originalFilename}`);

        const parsed = await parser.parseHansardPdf(pdfBuffer, pdfFile.originalFilename);

        const speakerStats = parsed.speakers.map((speaker, index) => {
          const speakingInstances = parsed.allSpeakingInstances.filter(
            (inst) => inst.mpId === speaker.mpId
          );
          const totalSpeeches = speakingInstances.length;

          return {
            mpId: speaker.mpId,
            mpName: speaker.mpName,
            totalSpeeches,
            speakingOrder: index + 1,
          };
        });

        const sessionSpeakerStats = {
          totalUniqueSpeakers: parsed.speakers.length,
          speakingMpIds: parsed.speakers.map((s) => s.mpId),
          speakingConstituencies: [...new Set(parsed.speakers.map((s) => s.constituency))],
          attendanceRate: parsed.speakerStats.attendanceRate,
        };

        await db
          .update(hansardRecords)
          .set({
            speakers: parsed.speakers as any,
            speakerStats: speakerStats as any,
            sessionSpeakerStats: sessionSpeakerStats as any,
            attendedMpIds: parsed.attendance.attendedMpIds as any,
            absentMpIds: parsed.attendance.absentMpIds as any,
            transcript: parsed.transcript,
            topics: parsed.topics as any,
          })
          .where(eq(hansardRecords.id, pdfFile.hansardRecordId));

        console.log(
          `   ✅ Updated: ${parsed.speakers.length} speakers, ${parsed.allSpeakingInstances.length} total speeches`
        );
      } catch (error) {
        errorCount++;
        console.error(
          `   ❌ Error processing ${pdfFile.originalFilename}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 RE-PROCESSING COMPLETE');
    console.log('='.repeat(80));
    console.log(`Total PDFs processed: ${processedCount}`);
    console.log(`Successful: ${processedCount - errorCount - skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log('='.repeat(80));

    console.log('\n✅ All Hansard PDFs have been re-processed!');
    console.log('📊 Next step: Run "npm run aggregate-speeches" to update MP totals\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

reprocessAllHansardPdfs();
