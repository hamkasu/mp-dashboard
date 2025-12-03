/**
 * Copyright by Calmic Sdn Bhd
 *
 * Script to analyze stored PDFs and extract questioner/ministry information
 * This script processes PDFs that are already in the database and updates
 * the parliamentary_oral_answers table with extracted metadata
 */

import { getDb } from '../server/db';
import { parliamentaryOralAnswers, parliamentaryAnswerPdfFiles, mps } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { ParliamentaryAnswersPdfParser } from '../server/parliamentary-answers-pdf-parser';

interface ProcessStats {
  total: number;
  processed: number;
  updated: number;
  skipped: number;
  failed: number;
}

/**
 * Analyze a single stored PDF and update the answer record
 */
async function analyzeStoredPdf(
  answerId: string,
  pdfBuffer: Buffer,
  allMps: any[],
  answerTitle: string
): Promise<{ success: boolean; error?: string; updated?: boolean }> {
  const db = getDb();
  if (!db) {
    return { success: false, error: 'Database not available' };
  }

  try {
    console.log(`  📄 Analyzing: ${answerTitle}`);

    // Parse the PDF
    const parser = new ParliamentaryAnswersPdfParser(allMps);
    const parsed = await parser.parsePdf(pdfBuffer);

    if (!parsed) {
      console.log(`     ⚠️  Parsing returned no data (may not be from Parlimen 15)`);
      return { success: true, updated: false };
    }

    // Prepare update data
    const updateData: any = {};
    let hasUpdates = false;

    if (parsed.questionNumber) {
      updateData.questionNo = parsed.questionNumber;
      hasUpdates = true;
    }

    if (parsed.questionerName) {
      updateData.questionerName = parsed.questionerName;
      hasUpdates = true;
    }

    if (parsed.questionerConstituency) {
      updateData.questionerConstituency = parsed.questionerConstituency;
      hasUpdates = true;
    }

    if (parsed.questionerMpId) {
      updateData.questionerMpId = parsed.questionerMpId;
      hasUpdates = true;
    }

    if (parsed.answererMinistry) {
      updateData.answererMinistry = parsed.answererMinistry;
      hasUpdates = true;
    }

    if (parsed.answererName) {
      updateData.answererName = parsed.answererName;
      hasUpdates = true;
    }

    if (parsed.questionText) {
      updateData.questionText = parsed.questionText;
      hasUpdates = true;
    }

    if (parsed.answerText) {
      updateData.answerText = parsed.answerText;
      hasUpdates = true;
    }

    if (parsed.dateAsked) {
      try {
        // Try to parse the date
        const dateAsked = new Date(parsed.dateAsked);
        if (!isNaN(dateAsked.getTime())) {
          updateData.dateAsked = dateAsked;
          hasUpdates = true;
        }
      } catch (e) {
        // Date parsing failed, skip
      }
    }

    if (parsed.sessionInfo) {
      updateData.sessionInfo = parsed.sessionInfo;
      hasUpdates = true;
    }

    if (!hasUpdates) {
      console.log(`     ⏭️  No new data extracted`);
      return { success: true, updated: false };
    }

    // Update the database
    await db.update(parliamentaryOralAnswers)
      .set(updateData)
      .where(eq(parliamentaryOralAnswers.id, answerId));

    console.log(`     ✅ Updated with:`);
    if (parsed.questionNumber) console.log(`        - Question: ${parsed.questionNumber}`);
    if (parsed.questionerName) console.log(`        - Questioner: ${parsed.questionerName}`);
    if (parsed.questionerConstituency) console.log(`        - Constituency: ${parsed.questionerConstituency}`);
    if (parsed.answererMinistry) console.log(`        - Ministry: ${parsed.answererMinistry}`);

    return { success: true, updated: true };

  } catch (error: any) {
    console.error(`     ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Analyze Stored PDFs\n');
  console.log('This script will analyze all stored PDFs and extract questioner/ministry information\n');

  const db = getDb();
  if (!db) {
    console.error('❌ Database not available');
    process.exit(1);
  }

  const stats: ProcessStats = {
    total: 0,
    processed: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  try {
    // Get all MPs for matching
    console.log('👥 Loading MPs data...');
    const allMps = await db.select().from(mps);
    console.log(`   Found ${allMps.length} MPs\n`);

    // Get all answers
    console.log('📊 Fetching parliamentary answers...');
    const answers = await db.select().from(parliamentaryOralAnswers);
    console.log(`   Found ${answers.length} answers\n`);

    stats.total = answers.length;

    // Process each answer
    for (let i = 0; i < answers.length; i++) {
      const answer = answers[i];
      const progress = `[${i + 1}/${stats.total}]`;

      console.log(`\n${progress} ${answer.title}`);

      // Check if PDF exists
      const pdfFiles = await db
        .select()
        .from(parliamentaryAnswerPdfFiles)
        .where(eq(parliamentaryAnswerPdfFiles.answerId, answer.id));

      if (pdfFiles.length === 0) {
        console.log(`     ⏭️  Skipped: No PDF stored`);
        stats.skipped++;
        continue;
      }

      const pdfFile = pdfFiles[0];
      if (!pdfFile.pdfData) {
        console.log(`     ⏭️  Skipped: PDF data is null`);
        stats.skipped++;
        continue;
      }

      // Check if already has questioner and ministry data
      if (answer.questionerName && answer.answererMinistry) {
        console.log(`     ⏭️  Skipped: Already has questioner and ministry data`);
        stats.skipped++;
        continue;
      }

      // Analyze the PDF
      const result = await analyzeStoredPdf(
        answer.id,
        pdfFile.pdfData,
        allMps,
        answer.title
      );

      if (result.success) {
        stats.processed++;
        if (result.updated) {
          stats.updated++;
        }
      } else {
        stats.failed++;
      }

      // Add a small delay to avoid overwhelming the system
      if (i < answers.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 Processing Summary');
    console.log('='.repeat(80));
    console.log(`Total answers:          ${stats.total}`);
    console.log(`✅ Processed:           ${stats.processed}`);
    console.log(`📝 Updated:             ${stats.updated}`);
    console.log(`⏭️  Skipped:             ${stats.skipped}`);
    console.log(`❌ Failed:              ${stats.failed}`);
    console.log('='.repeat(80));

    if (stats.updated > 0) {
      console.log('\n🎉 Analysis complete! The questioner and ministry columns should now be populated.');
      console.log('   Refresh your browser to see the updated data.\n');
    } else {
      console.log('\n⚠️  No records were updated.');
      console.log('   This could mean:');
      console.log('   1. All PDFs already have questioner/ministry data');
      console.log('   2. PDFs are not from Parlimen 15 (and were skipped)');
      console.log('   3. PDFs could not be parsed successfully\n');
    }

  } catch (error: any) {
    console.error('\n❌ Error during processing:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
