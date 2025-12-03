/**
 * Script to list all questioners from stored oral answer PDFs
 * Each PDF contains multiple questions - this extracts them all
 */

import { getDb } from '../server/db';
import { parliamentaryOralAnswers, parliamentaryAnswerPdfFiles } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { PDFParse } from 'pdf-parse';

async function main() {
  console.log('📋 Listing All Questioners from Stored PDFs\n');

  const db = getDb();
  if (!db) {
    console.error('❌ Database not available');
    process.exit(1);
  }

  try {
    const answers = await db.select().from(parliamentaryOralAnswers);
    console.log(`Found ${answers.length} oral answer records\n`);

    let totalQuestions = 0;
    const allQuestioners = new Set<string>();

    for (let i = 0; i < answers.length; i++) {
      const answer = answers[i];
      console.log(`\n[${ i + 1}/${answers.length}] ${answer.title}`);
      console.log('─'.repeat(80));

      // Get PDF
      const pdfFiles = await db.select()
        .from(parliamentaryAnswerPdfFiles)
        .where(eq(parliamentaryAnswerPdfFiles.answerId, answer.id));

      if (pdfFiles.length === 0 || !pdfFiles[0].pdfData) {
        console.log('⏭️  No PDF stored\n');
        continue;
      }

      // Parse PDF
      const pdfParse = new PDFParse({ data: pdfFiles[0].pdfData });
      const result = await pdfParse.getText();
      const fullText = result.text;

      // Check if Parlimen 15
      if (!/parlimen\s+kelima\s+belas/i.test(fullText)) {
        console.log('⚠️  Not from Parlimen Kelima Belas, skipping\n');
        continue;
      }

      // Find all question sections (starts with "NO SOALAN")
      const sections = fullText.split(/(?=NO SOALAN\s*[:：]\s*\d+)/);

      console.log(`📄 Found ${sections.length} question sections\n`);

      const questionsInPdf: Array<{no: string, name: string, constituency: string, ministry: string}> = [];

      for (const section of sections) {
        if (section.trim().length < 100) continue;

        // Extract question number
        const noMatch = section.match(/NO SOALAN\s*[:：]\s*(\d+)/i);
        if (!noMatch) continue;

        // Extract questioner and constituency
        const questionerMatch = section.match(/DARIPADA\s*[:：]\s*([^\[]+)\[([^\]]+)\]/i);
        if (!questionerMatch) continue;

        const rawName = questionerMatch[1].trim();
        const constituency = questionerMatch[2].trim();

        // Clean name (remove titles)
        const name = rawName
          .replace(/DATUK|DATO'?|TAN SRI|TUN|DR\.?|IR\.?|PROF\.?|SERI|UTAMA/gi, '')
          .trim();

        // Extract ministry
        const ministryMatch = section.match(/minta\s+MENTERI\s+([A-Z][^\n.]+?)(?:\s+menyatakan|\s+untuk|$)/i) ||
                             section.match(/MENTERI\s+([A-Z][^\n.]+?)(?:\s+menyatakan|\s+untuk|$)/i);
        const ministry = ministryMatch ? ministryMatch[1].trim() : 'N/A';

        questionsInPdf.push({
          no: noMatch[1],
          name,
          constituency,
          ministry
        });

        allQuestioners.add(`${name} [${constituency}]`);
        totalQuestions++;
      }

      // Print all questions from this PDF
      questionsInPdf.forEach((q, idx) => {
        console.log(`${idx + 1}. Question ${q.no}`);
        console.log(`   Questioner: ${q.name}`);
        console.log(`   Constituency: ${q.constituency}`);
        console.log(`   Ministry: ${q.ministry}`);
        console.log('');
      });
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total PDFs processed:     ${answers.length}`);
    console.log(`Total questions found:    ${totalQuestions}`);
    console.log(`Unique questioners:       ${allQuestioners.size}`);
    console.log('='.repeat(80));

    console.log('\n✨ Complete!\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
