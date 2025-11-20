import { createRequire } from 'module';
import { db } from '../server/db';
import { hansardPdfFiles } from '../shared/schema';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');
const pdfParse = PDFParse;

interface AnalysisResult {
  filename: string;
  sessionDate: string;
  totalPages: number;
  hasKandungan: boolean;
  hasOralQuestions: boolean;
  hasMinisterialQuestions: boolean;
  hasBills: boolean;
  hasMotions: boolean;
  hasAttendance: boolean;
  questionCount: number;
  billCount: number;
  attendanceCount: number;
}

async function analyzePDF(filename: string, pdfBuffer: Buffer): Promise<AnalysisResult | null> {
  try {
    const parser = new pdfParse({ data: pdfBuffer });
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

    // Check for Table of Contents
    const hasKandungan = text.includes('KANDUNGAN');

    // Check for different sections
    const hasOralQuestions = text.includes('PERTANYAAN-PERTANYAAN BAGI JAWAB LISAN');
    const hasMinisterialQuestions = text.includes('WAKTU PERTANYAAN-PERTANYAAN MENTERI');
    const hasBills = text.includes('RANG UNDANG-UNDANG');
    const hasMotions = text.includes('USUL');
    const hasAttendance = text.includes('KEHADIRAN AHLI-AHLI PARLIMEN');

    // Count questions
    let questionCount = 0;
    if (hasOralQuestions) {
      const questionPattern = /Soalan\s+No\.\s*(\d+)/gi;
      const matches = text.match(questionPattern);
      questionCount = matches ? matches.length : 0;
    }

    // Count bills
    let billCount = 0;
    if (hasBills) {
      const billPattern = /Rang\s+Undang-undang\s+([^\n]+?)(?:\n|$)/gi;
      const matches = text.match(billPattern);
      billCount = matches ? matches.length : 0;
    }

    // Count MPs in attendance
    let attendanceCount = 0;
    if (hasAttendance) {
      const attendancePattern = /\d+\.\s+[^(]+\([^)]+\)/g;
      const matches = text.match(attendancePattern);
      attendanceCount = matches ? matches.length : 0;
    }

    return {
      filename,
      sessionDate,
      totalPages: pdfData.total || 0,
      hasKandungan,
      hasOralQuestions,
      hasMinisterialQuestions,
      hasBills,
      hasMotions,
      hasAttendance,
      questionCount,
      billCount,
      attendanceCount,
    };

  } catch (error) {
    console.error(`Error parsing PDF ${filename}: ${error}`);
    return null;
  }
}

async function main() {
  try {
    console.log('Hansard PDF Analysis Tool - Database Edition');
    console.log('='.repeat(80));
    console.log('📊 Analyzing ALL Hansard PDFs from the database...\n');

    // Fetch all PDFs from database
    console.log('📄 Fetching all Hansard PDF files from database...');
    const allPdfFiles = await db
      .select({
        id: hansardPdfFiles.id,
        originalFilename: hansardPdfFiles.originalFilename,
        fileSizeBytes: hansardPdfFiles.fileSizeBytes,
        pdfData: hansardPdfFiles.pdfData,
        uploadedAt: hansardPdfFiles.uploadedAt,
      })
      .from(hansardPdfFiles);

    console.log(`✅ Found ${allPdfFiles.length} PDF files in database\n`);

    if (allPdfFiles.length === 0) {
      console.log('❌ No PDF files found in database');
      process.exit(0);
    }

    console.log('🔍 Processing PDFs...\n');
    console.log('='.repeat(80));

    const results: AnalysisResult[] = [];
    let processedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < allPdfFiles.length; i++) {
      const pdfFile = allPdfFiles[i];
      console.log(`\n[${i + 1}/${allPdfFiles.length}] ${pdfFile.originalFilename}`);
      console.log(`   Size: ${(pdfFile.fileSizeBytes / 1024).toFixed(1)} KB`);

      const result = await analyzePDF(pdfFile.originalFilename, pdfFile.pdfData);

      if (result) {
        results.push(result);
        processedCount++;

        // Print quick summary
        console.log(`   Date: ${result.sessionDate}`);
        console.log(`   Pages: ${result.totalPages}`);
        console.log(`   Sections: ${[
          result.hasOralQuestions && 'Questions',
          result.hasBills && 'Bills',
          result.hasMotions && 'Motions',
          result.hasAttendance && 'Attendance'
        ].filter(Boolean).join(', ') || 'None detected'}`);
      } else {
        errorCount++;
      }

      // Progress indicator
      if ((i + 1) % 10 === 0) {
        console.log(`\n   Progress: ${i + 1}/${allPdfFiles.length} files processed...`);
      }
    }

    // Generate aggregate statistics
    console.log('\n' + '='.repeat(80));
    console.log('📊 AGGREGATE ANALYSIS RESULTS');
    console.log('='.repeat(80));
    console.log(`\nTotal PDFs Processed: ${processedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Success Rate: ${((processedCount / allPdfFiles.length) * 100).toFixed(1)}%`);

    const withKandungan = results.filter(r => r.hasKandungan).length;
    const withQuestions = results.filter(r => r.hasOralQuestions).length;
    const withMinisterialQ = results.filter(r => r.hasMinisterialQuestions).length;
    const withBills = results.filter(r => r.hasBills).length;
    const withMotions = results.filter(r => r.hasMotions).length;
    const withAttendance = results.filter(r => r.hasAttendance).length;

    console.log(`\n📋 Section Coverage:`);
    console.log(`   Table of Contents (KANDUNGAN): ${withKandungan}/${processedCount} (${((withKandungan/processedCount)*100).toFixed(1)}%)`);
    console.log(`   Oral Questions: ${withQuestions}/${processedCount} (${((withQuestions/processedCount)*100).toFixed(1)}%)`);
    console.log(`   Ministerial Questions: ${withMinisterialQ}/${processedCount} (${((withMinisterialQ/processedCount)*100).toFixed(1)}%)`);
    console.log(`   Bills (Rang Undang-undang): ${withBills}/${processedCount} (${((withBills/processedCount)*100).toFixed(1)}%)`);
    console.log(`   Motions (Usul): ${withMotions}/${processedCount} (${((withMotions/processedCount)*100).toFixed(1)}%)`);
    console.log(`   Attendance Lists: ${withAttendance}/${processedCount} (${((withAttendance/processedCount)*100).toFixed(1)}%)`);

    const totalQuestions = results.reduce((sum, r) => sum + r.questionCount, 0);
    const totalBills = results.reduce((sum, r) => sum + r.billCount, 0);
    const totalPages = results.reduce((sum, r) => sum + r.totalPages, 0);
    const avgAttendance = results.filter(r => r.attendanceCount > 0)
      .reduce((sum, r) => sum + r.attendanceCount, 0) /
      results.filter(r => r.attendanceCount > 0).length;

    console.log(`\n📈 Content Statistics:`);
    console.log(`   Total Questions Found: ${totalQuestions}`);
    console.log(`   Total Bills Found: ${totalBills}`);
    console.log(`   Total Pages: ${totalPages}`);
    console.log(`   Average MPs in Attendance: ${avgAttendance ? avgAttendance.toFixed(1) : 'N/A'}`);

    // Date range
    const dates = results
      .map(r => r.sessionDate)
      .filter(d => d !== 'Unknown')
      .sort();

    if (dates.length > 0) {
      console.log(`\n📅 Date Range:`);
      console.log(`   Earliest: ${dates[0]}`);
      console.log(`   Latest: ${dates[dates.length - 1]}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Analysis Complete');
    console.log('='.repeat(80));

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
