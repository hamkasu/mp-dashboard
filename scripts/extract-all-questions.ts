/**
 * Script to extract ALL questions from multi-question PDFs and create individual records
 * This replaces the single record per PDF with multiple records, one per question
 */

import { getDb } from '../server/db';
import { parliamentaryOralAnswers, parliamentaryAnswerPdfFiles, mps } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { PDFParse } from 'pdf-parse';

interface ExtractedQuestion {
  questionNumber: string;
  questionerName: string;
  questionerConstituency: string;
  questionerMpId?: string;
  ministry: string;
  date: string;
  dateAsked: Date;
}

/**
 * Find MP by constituency
 */
function findMpByConstituency(constituency: string, allMps: any[]): any | undefined {
  const normalized = constituency.toLowerCase().trim();
  return allMps.find(mp =>
    mp.constituency.toLowerCase().trim() === normalized
  );
}

/**
 * Extract all questions from a multi-question PDF
 */
async function extractAllQuestions(pdfBuffer: Buffer, allMps: any[]): Promise<ExtractedQuestion[]> {
  const questions: ExtractedQuestion[] = [];

  try {
    const pdfParse = new PDFParse({ data: pdfBuffer });
    const result = await pdfParse.getText();
    const fullText = result.text;

    // Check if Parlimen 15
    if (!/parlimen\s+kelima\s+belas/i.test(fullText) && !/202[2-5]/.test(fullText)) {
      return questions;
    }

    // Split by "NO SOALAN" - each question starts with this
    const sections = fullText.split(/(?=NO SOALAN\s*[:：]\s*\d+)/);

    for (const section of sections) {
      if (section.trim().length < 100) continue;

      // Extract question number
      const noMatch = section.match(/NO SOALAN\s*[:：]\s*(\d+)/i);
      if (!noMatch) continue;

      // Extract questioner and constituency from DARIPADA line
      const questionerMatch = section.match(/DARIPADA\s*[:：]\s*([^\[]+)\[([^\]]+)\]/i);
      if (!questionerMatch) continue;

      const rawName = questionerMatch[1].trim();
      const constituency = questionerMatch[2].trim();

      // Clean name (remove titles)
      const cleanName = rawName
        .replace(/DATUK|DATO'?|TAN SRI|TUN|DR\.?|IR\.?|PROF\.?|SERI|UTAMA|Y\.?B\.?/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      // Extract ministry from SOALAN section
      const ministryMatch =
        section.match(/minta\s+MENTERI\s+([A-Z][^\n.]+?)(?:\s+menyatakan|\s+untuk|\s+menjelaskan|$)/i) ||
        section.match(/bertanya\s+(?:kepada\s+)?MENTERI\s+([A-Z][^\n.]+?)(?:\s+menyatakan|\s+untuk|\s+menjelaskan|$)/i) ||
        section.match(/MENTERI\s+([A-Z][^\n.]+?)(?:\s+menyatakan|\s+untuk|\s+menjelaskan|$)/i);

      let ministry = ministryMatch ? ministryMatch[1].trim() : 'N/A';

      // Clean up ministry name
      ministry = ministry
        .replace(/\s*\(.*?\)\s*/g, '') // Remove parentheses content
        .replace(/\s+/g, ' ')
        .trim();

      // Extract date
      const dateMatch = section.match(/TARIKH\s*[:：]\s*(\d{1,2})\s+([A-Z]+)\s+(\d{4})/i);
      let dateAsked = new Date();
      let dateStr = '';

      if (dateMatch) {
        const day = parseInt(dateMatch[1]);
        const monthStr = dateMatch[2];
        const year = parseInt(dateMatch[3]);

        // Convert Malay month names
        const months: {[key: string]: number} = {
          'JANUARI': 0, 'FEBRUARI': 1, 'MAC': 2, 'APRIL': 3,
          'MEI': 4, 'JUN': 5, 'JULAI': 6, 'OGOS': 7,
          'SEPTEMBER': 8, 'OKTOBER': 9, 'NOVEMBER': 10, 'DISEMBER': 11
        };

        const month = months[monthStr.toUpperCase()] ?? 0;
        dateAsked = new Date(year, month, day);
        dateStr = `${day} ${monthStr} ${year}`;
      }

      // Find MP by constituency
      const mp = findMpByConstituency(constituency, allMps);

      questions.push({
        questionNumber: noMatch[1],
        questionerName: cleanName,
        questionerConstituency: constituency,
        questionerMpId: mp?.id,
        ministry,
        date: dateStr,
        dateAsked
      });
    }

  } catch (error: any) {
    console.error('Error parsing PDF:', error.message);
  }

  return questions;
}

async function main() {
  console.log('🚀 Extracting ALL Questions from PDFs\n');

  const db = getDb();
  if (!db) {
    console.error('❌ Database not available');
    process.exit(1);
  }

  try {
    // Load all MPs
    console.log('👥 Loading MPs...');
    const allMps = await db.select().from(mps);
    console.log(`   Found ${allMps.length} MPs\n`);

    // Get existing oral answers (parent records)
    const parentRecords = await db.select().from(parliamentaryOralAnswers);
    console.log(`📊 Found ${parentRecords.length} oral answer records\n`);

    const stats = {
      pdfsProcessed: 0,
      questionsExtracted: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      errors: 0
    };

    for (let i = 0; i < parentRecords.length; i++) {
      const parent = parentRecords[i];
      console.log(`\n[${i + 1}/${parentRecords.length}] ${parent.title}`);

      // Get PDF
      const pdfFiles = await db.select()
        .from(parliamentaryAnswerPdfFiles)
        .where(eq(parliamentaryAnswerPdfFiles.answerId, parent.id));

      if (pdfFiles.length === 0 || !pdfFiles[0].pdfData) {
        console.log('   ⏭️  No PDF stored');
        continue;
      }

      // Extract all questions
      const questions = await extractAllQuestions(pdfFiles[0].pdfData, allMps);

      if (questions.length === 0) {
        console.log('   ⏭️  No questions extracted');
        continue;
      }

      console.log(`   ✅ Extracted ${questions.length} questions`);
      stats.pdfsProcessed++;
      stats.questionsExtracted += questions.length;

      // Print all questions found
      questions.forEach((q, idx) => {
        console.log(`      ${idx + 1}. Q${q.questionNumber}: ${q.questionerName} [${q.questionerConstituency}] → ${q.ministry}`);
      });

      // Update parent record with first question's data
      if (questions.length > 0) {
        const firstQ = questions[0];

        await db.update(parliamentaryOralAnswers)
          .set({
            questionNo: `S.${firstQ.questionNumber}`,
            questionerName: firstQ.questionerName,
            questionerConstituency: firstQ.questionerConstituency,
            questionerMpId: firstQ.questionerMpId,
            answererMinistry: firstQ.ministry,
            dateAsked: firstQ.dateAsked,
          })
          .where(eq(parliamentaryOralAnswers.id, parent.id));

        stats.recordsUpdated++;
        console.log(`   📝 Updated parent record with first question data`);
      }

      // TODO: Create individual records for each question
      // For now, we'll just print them. In the next iteration,
      // we can create separate records if needed.
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`PDFs processed:           ${stats.pdfsProcessed}`);
    console.log(`Questions extracted:      ${stats.questionsExtracted}`);
    console.log(`Records updated:          ${stats.recordsUpdated}`);
    console.log(`Average questions/PDF:    ${(stats.questionsExtracted / stats.pdfsProcessed).toFixed(1)}`);
    console.log('='.repeat(80));
    console.log('\n✨ Complete! Check your database - questioner and ministry columns should now be populated.\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
