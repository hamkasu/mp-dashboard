/**
 * Diagnostic script to check parliamentary oral answers data
 */

import { getDb } from '../server/db';
import { parliamentaryOralAnswers, parliamentaryAnswerPdfFiles } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('🔍 Checking Parliamentary Oral Answers Data\n');

  const db = getDb();
  if (!db) {
    console.error('❌ Database not available');
    process.exit(1);
  }

  try {
    // Get all answers
    const answers = await db.select().from(parliamentaryOralAnswers);
    console.log(`📊 Total oral answers: ${answers.length}\n`);

    // Check first few answers
    for (let i = 0; i < Math.min(3, answers.length); i++) {
      const answer = answers[i];
      console.log(`${i + 1}. ${answer.title}`);
      console.log(`   Date: ${answer.dateAsked}`);
      console.log(`   Question No: ${answer.questionNo || 'N/A'}`);
      console.log(`   Questioner: ${answer.questionerName || 'N/A'}`);
      console.log(`   Constituency: ${answer.questionerConstituency || 'N/A'}`);
      console.log(`   Ministry: ${answer.answererMinistry || 'N/A'}`);
      console.log(`   PDF URL: ${answer.fullTextUrl || 'N/A'}`);

      // Check if PDF is stored
      const pdfFiles = await db.select()
        .from(parliamentaryAnswerPdfFiles)
        .where(eq(parliamentaryAnswerPdfFiles.answerId, answer.id));

      if (pdfFiles.length > 0) {
        console.log(`   ✅ PDF Stored: ${pdfFiles[0].originalFilename} (${(pdfFiles[0].fileSizeBytes / 1024).toFixed(2)} KB)`);
        console.log(`   PDF has data: ${pdfFiles[0].pdfData ? 'Yes' : 'No'}`);
      } else {
        console.log(`   ❌ No PDF stored`);
      }
      console.log('');
    }

    // Statistics
    const withQuestioner = answers.filter(a => a.questionerName).length;
    const withMinistry = answers.filter(a => a.answererMinistry).length;
    const withPdf = await db.select({ id: parliamentaryAnswerPdfFiles.id })
      .from(parliamentaryAnswerPdfFiles);

    console.log('📈 Statistics:');
    console.log(`   Answers with questioner: ${withQuestioner}/${answers.length}`);
    console.log(`   Answers with ministry: ${withMinistry}/${answers.length}`);
    console.log(`   PDFs stored: ${withPdf.length}`);
    console.log('');

    if (withQuestioner === 0 && withPdf.length > 0) {
      console.log('⚠️  Issue: PDFs are stored but no questioner/ministry data extracted');
      console.log('   This suggests the PDFs either:');
      console.log('   1. Are not from Parlimen 15 (and were skipped)');
      console.log('   2. Have a different format than expected');
      console.log('   3. Failed to parse for some reason');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

main();
