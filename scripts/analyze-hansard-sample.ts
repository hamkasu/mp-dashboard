import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');
const pdfParse = PDFParse;

async function analyzePDF(filename: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Analyzing: ${filename}`);
  console.log('='.repeat(60));

  const filePath = path.join(process.cwd(), 'attached_assets', filename);
  const dataBuffer = fs.readFileSync(filePath);

  try {
    const parser = new pdfParse({ data: dataBuffer });
    const pdfData = await parser.getText();
    await parser.destroy();

    const text = pdfData.text;

    // Extract session date
    const dateMatch = filename.match(/DR-(\d{2})(\d{2})(\d{4})/);
    let sessionDate = 'Unknown';
    if (dateMatch) {
      const [, day, month, year] = dateMatch;
      sessionDate = `${day}/${month}/${year}`;
    }

    console.log(`\nSession Date: ${sessionDate}`);
    console.log(`Total Pages: ${pdfData.total || 0}`);

    // Check for Table of Contents
    const hasKandungan = text.includes('KANDUNGAN');
    console.log(`\nHas Table of Contents (KANDUNGAN): ${hasKandungan ? 'Yes' : 'No'}`);

    // Check for different sections
    const hasOralQuestions = text.includes('PERTANYAAN-PERTANYAAN BAGI JAWAB LISAN');
    const hasMinisterialQuestions = text.includes('WAKTU PERTANYAAN-PERTANYAAN MENTERI');
    const hasBills = text.includes('RANG UNDANG-UNDANG');
    const hasMotions = text.includes('USUL');
    const hasAttendance = text.includes('KEHADIRAN AHLI-AHLI PARLIMEN');

    console.log(`\nSections Found:`);
    console.log(`  - Oral Questions: ${hasOralQuestions ? 'Yes' : 'No'}`);
    console.log(`  - Ministerial Questions: ${hasMinisterialQuestions ? 'Yes' : 'No'}`);
    console.log(`  - Bills (Rang Undang-undang): ${hasBills ? 'Yes' : 'No'}`);
    console.log(`  - Motions (Usul): ${hasMotions ? 'Yes' : 'No'}`);
    console.log(`  - Attendance List: ${hasAttendance ? 'Yes' : 'No'}`);

    // Try to extract some sample questions
    if (hasOralQuestions) {
      const questionPattern = /Soalan\s+No\.\s*(\d+)/gi;
      const matches = text.match(questionPattern);
      if (matches) {
        console.log(`\n  Oral Questions Found: ${matches.length}`);
        console.log(`  Sample: ${matches.slice(0, 3).join(', ')}`);
      }
    }

    // Try to extract bills
    if (hasBills) {
      const billPattern = /Rang\s+Undang-undang\s+([^\n]+?)(?:\n|$)/gi;
      const matches = text.match(billPattern);
      if (matches) {
        console.log(`\n  Bills Found: ${matches.length}`);
        if (matches.length > 0) {
          console.log(`  Samples:`);
          matches.slice(0, 3).forEach((bill, i) => {
            console.log(`    ${i + 1}. ${bill.trim()}`);
          });
        }
      }
    }

    // Try to extract motions
    if (hasMotions) {
      // Look for motion patterns
      const motionSection = text.match(/USUL:[\s\S]*?(?=RANG UNDANG-UNDANG|PERTANYAAN|$)/i);
      if (motionSection) {
        console.log(`\n  Motion section found (length: ${motionSection[0].length} chars)`);
      }
    }

    // Try to count MPs in attendance
    if (hasAttendance) {
      const attendancePattern = /\d+\.\s+[^(]+\([^)]+\)/g;
      const matches = text.match(attendancePattern);
      if (matches) {
        console.log(`\n  MPs in Attendance: ~${matches.length}`);
        console.log(`  Sample entries:`);
        matches.slice(0, 3).forEach(entry => {
          console.log(`    - ${entry.trim()}`);
        });
      }
    }

  } catch (error) {
    console.error(`Error parsing PDF: ${error}`);
  }
}

async function main() {
  console.log('Hansard PDF Analysis Tool');
  console.log('='.repeat(60));

  // Analyze a few recent PDFs
  const sampleFiles = [
    'DR-13112025_1763514446245.pdf',
    'DR-12112025_1763514142279.pdf',
    'DR-06112025_1762879372571.pdf'
  ];

  for (const file of sampleFiles) {
    const filePath = path.join(process.cwd(), 'attached_assets', file);
    if (fs.existsSync(filePath)) {
      await analyzePDF(file);
    } else {
      console.log(`\nFile not found: ${file}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Analysis Complete');
  console.log('='.repeat(60));
}

main();
