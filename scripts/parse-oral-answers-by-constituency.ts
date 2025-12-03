/**
 * Copyright by Calmic Sdn Bhd
 *
 * Script to parse oral answers PDF and itemize questions by constituency and ministry
 * This script downloads a PDF for a specific date, parses it, and displays questions
 * organized by constituency with ministry answers
 */

import { getDb } from '../server/db';
import { parliamentaryOralAnswers, parliamentaryAnswerPdfFiles, mps } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import axios from 'axios';
import https from 'https';
import { ParliamentaryAnswersPdfParser } from '../server/parliamentary-answers-pdf-parser';
import { PDFParse } from 'pdf-parse';

// SECURITY NOTE: The Malaysian Parliament website has SSL certificate validation issues
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

interface ParsedQuestion {
  questionNumber: string;
  questionText: string;
  answerText: string;
  questionerName: string;
  questionerConstituency: string;
  answererMinistry: string;
  answererName?: string;
}

interface ConstituencyQuestions {
  [constituency: string]: ParsedQuestion[];
}

interface MinistryQuestions {
  [ministry: string]: ParsedQuestion[];
}

/**
 * Download PDF from URL
 */
async function downloadPdf(url: string): Promise<Buffer> {
  console.log(`📥 Downloading PDF from: ${url}`);

  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/pdf,*/*',
    },
    timeout: 120000, // 2 minutes timeout
    httpsAgent,
  });

  return Buffer.from(response.data);
}

/**
 * Parse a single PDF page/question
 */
async function parseSingleQuestion(pdfBuffer: Buffer, allMps: any[]): Promise<any> {
  const parser = new ParliamentaryAnswersPdfParser(allMps);
  return await parser.parsePdf(pdfBuffer);
}

/**
 * Extract all questions from a multi-question PDF
 * (Note: Current parser handles one question per PDF, but this can be extended)
 */
async function extractAllQuestions(pdfBuffer: Buffer, allMps: any[]): Promise<ParsedQuestion[]> {
  const questions: ParsedQuestion[] = [];

  try {
    // Parse the PDF using pdf-parse to extract full text
    const pdfParse = new PDFParse({ data: pdfBuffer });
    const result = await pdfParse.getText();
    const fullText = result.text;

    console.log(`📄 Extracted ${fullText.length} characters from PDF`);

    // Split by question pattern (e.g., "S.1", "S.2", etc.)
    // This is a simple split - you may need to adjust based on actual PDF format
    const questionPattern = /(?=S\.\d+)/g;
    const sections = fullText.split(questionPattern).filter(s => s.trim().length > 0);

    console.log(`📋 Found ${sections.length} question sections`);

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];

      // Use the parser to extract data from each section
      const parser = new ParliamentaryAnswersPdfParser(allMps);

      // Create a mini-PDF buffer for this section (simplified approach)
      // In practice, you might need to parse the full text directly
      const parsed = await extractQuestionFromText(section, allMps);

      if (parsed && parsed.questionNumber) {
        questions.push({
          questionNumber: parsed.questionNumber,
          questionText: parsed.questionText || 'N/A',
          answerText: parsed.answerText || 'N/A',
          questionerName: parsed.questionerName || 'Unknown',
          questionerConstituency: parsed.questionerConstituency || 'Unknown',
          answererMinistry: parsed.answererMinistry || 'Unknown',
          answererName: parsed.answererName,
        });
      }
    }

  } catch (error: any) {
    console.error('❌ Error extracting questions:', error.message);
  }

  return questions;
}

/**
 * Extract question data from text section
 */
async function extractQuestionFromText(text: string, allMps: any[]): Promise<any> {
  // Create a simple parser instance
  const parser = new ParliamentaryAnswersPdfParser(allMps);

  // We'll extract data manually since we have text sections
  const questionNumber = extractQuestionNumber(text);
  const questionText = extractQuestionText(text);
  const answerText = extractAnswerText(text);
  const questioner = extractQuestioner(text, allMps);
  const answerer = extractAnswerer(text);

  return {
    questionNumber,
    questionText,
    answerText,
    questionerName: questioner.name,
    questionerConstituency: questioner.constituency,
    questionerMpId: questioner.mpId,
    answererName: answerer.name,
    answererMinistry: answerer.ministry,
  };
}

// Helper extraction functions
function extractQuestionNumber(text: string): string | undefined {
  const patterns = [
    /S\.?\s*(\d+)/i,
    /Soalan\s+No\.?\s*(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return `S.${match[1]}`;
  }
  return undefined;
}

function extractQuestionText(text: string): string | undefined {
  const patterns = [
    /(?:Soalan|SOALAN)\s*[:–-]\s*(.*?)(?=(?:Jawapan|JAWAPAN)\s*[:–-]|$)/is,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim().substring(0, 500); // Limit for display
    }
  }
  return undefined;
}

function extractAnswerText(text: string): string | undefined {
  const patterns = [
    /(?:Jawapan|JAWAPAN)\s*[:–-]\s*(.*?)$/is,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim().substring(0, 500); // Limit for display
    }
  }
  return undefined;
}

function extractQuestioner(text: string, allMps: any[]): { name?: string; constituency?: string; mpId?: string } {
  const patterns = [
    /(?:Tuan|Puan|Dato'?|Datuk)\s+([A-Z][^[\n]+?)\s*\[([^\]]+)\]/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        name: match[1].trim(),
        constituency: match[2].trim(),
      };
    }
  }
  return {};
}

function extractAnswerer(text: string): { name?: string; ministry?: string } {
  const patterns = [
    /(?:Menteri|Minister)\s+([A-Z][^[\n]+?)(?:\[|bertangg?ungjawab)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return { ministry: match[1].trim() };
    }
  }
  return {};
}

/**
 * Display questions organized by constituency
 */
function displayByConstituency(questions: ParsedQuestion[]) {
  console.log('\n' + '='.repeat(80));
  console.log('📍 ORAL ANSWERS ORGANIZED BY CONSTITUENCY');
  console.log('='.repeat(80));

  // Group by constituency
  const byConstituency: ConstituencyQuestions = {};

  questions.forEach(q => {
    const constituency = q.questionerConstituency || 'Unknown';
    if (!byConstituency[constituency]) {
      byConstituency[constituency] = [];
    }
    byConstituency[constituency].push(q);
  });

  // Sort constituencies alphabetically
  const sortedConstituencies = Object.keys(byConstituency).sort();

  sortedConstituencies.forEach(constituency => {
    const constituencyQuestions = byConstituency[constituency];

    console.log(`\n${'─'.repeat(80)}`);
    console.log(`📍 ${constituency.toUpperCase()}`);
    console.log(`   ${constituencyQuestions.length} question(s)`);
    console.log(`${'─'.repeat(80)}`);

    constituencyQuestions.forEach((q, idx) => {
      console.log(`\n  ${idx + 1}. Question ${q.questionNumber}`);
      console.log(`     Questioner: ${q.questionerName}`);
      console.log(`     Ministry: ${q.answererMinistry}`);
      if (q.answererName) {
        console.log(`     Minister: ${q.answererName}`);
      }
      console.log(`\n     Question:`);
      console.log(`     ${q.questionText.substring(0, 200)}${q.questionText.length > 200 ? '...' : ''}`);
      console.log(`\n     Answer:`);
      console.log(`     ${q.answerText.substring(0, 200)}${q.answerText.length > 200 ? '...' : ''}`);
    });
  });

  console.log('\n' + '='.repeat(80));
}

/**
 * Display questions organized by ministry
 */
function displayByMinistry(questions: ParsedQuestion[]) {
  console.log('\n' + '='.repeat(80));
  console.log('🏛️  ORAL ANSWERS ORGANIZED BY MINISTRY');
  console.log('='.repeat(80));

  // Group by ministry
  const byMinistry: MinistryQuestions = {};

  questions.forEach(q => {
    const ministry = q.answererMinistry || 'Unknown';
    if (!byMinistry[ministry]) {
      byMinistry[ministry] = [];
    }
    byMinistry[ministry].push(q);
  });

  // Sort ministries alphabetically
  const sortedMinistries = Object.keys(byMinistry).sort();

  sortedMinistries.forEach(ministry => {
    const ministryQuestions = byMinistry[ministry];

    console.log(`\n${'─'.repeat(80)}`);
    console.log(`🏛️  ${ministry.toUpperCase()}`);
    console.log(`   ${ministryQuestions.length} question(s)`);
    console.log(`${'─'.repeat(80)}`);

    ministryQuestions.forEach((q, idx) => {
      console.log(`\n  ${idx + 1}. Question ${q.questionNumber}`);
      console.log(`     Questioner: ${q.questionerName} [${q.questionerConstituency}]`);
      if (q.answererName) {
        console.log(`     Answered by: ${q.answererName}`);
      }
      console.log(`\n     Question:`);
      console.log(`     ${q.questionText.substring(0, 200)}${q.questionText.length > 200 ? '...' : ''}`);
      console.log(`\n     Answer:`);
      console.log(`     ${q.answerText.substring(0, 200)}${q.answerText.length > 200 ? '...' : ''}`);
    });
  });

  console.log('\n' + '='.repeat(80));
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const dateArg = args[0] || '2025-12-02';
  const groupBy = args[1] || 'both'; // 'constituency', 'ministry', or 'both'

  console.log('🚀 Oral Answers PDF Parser\n');
  console.log(`📅 Date: ${dateArg}`);
  console.log(`📊 Group by: ${groupBy}\n`);

  const db = getDb();
  if (!db) {
    console.error('❌ Database not available');
    process.exit(1);
  }

  try {
    // Get all MPs for matching
    console.log('👥 Loading MPs data...');
    const allMps = await db.select().from(mps);
    console.log(`   Found ${allMps.length} MPs\n`);

    // Find the oral answer for the specified date
    console.log(`🔍 Looking for oral answers on ${dateArg}...`);
    const answers = await db
      .select()
      .from(parliamentaryOralAnswers)
      .where(eq(parliamentaryOralAnswers.dateAsked, new Date(dateArg)));

    if (answers.length === 0) {
      console.log(`\n⚠️  No oral answers found for ${dateArg}`);
      console.log('\nTrying to find by title pattern...');

      // Try to find by title pattern
      const allAnswers = await db.select().from(parliamentaryOralAnswers);
      const datePattern = new RegExp(dateArg.split('-').reverse().join('[/-]'));
      const matchingAnswers = allAnswers.filter(a =>
        a.title && (a.title.includes(dateArg) || datePattern.test(a.title))
      );

      if (matchingAnswers.length > 0) {
        console.log(`✅ Found ${matchingAnswers.length} matching answer(s) by title`);
        answers.push(...matchingAnswers);
      } else {
        console.log('\nℹ️  Available dates:');
        const uniqueDates = [...new Set(allAnswers.map(a => a.dateAsked?.toISOString().split('T')[0]))];
        uniqueDates.slice(0, 10).forEach(date => console.log(`   - ${date}`));
        process.exit(0);
      }
    }

    console.log(`✅ Found ${answers.length} oral answer document(s)\n`);

    const allQuestions: ParsedQuestion[] = [];

    // Process each answer document
    for (const answer of answers) {
      console.log(`\n📄 Processing: ${answer.title}`);

      let pdfBuffer: Buffer | null = null;

      // First, try to get PDF from database
      const storedPdf = await db
        .select()
        .from(parliamentaryAnswerPdfFiles)
        .where(eq(parliamentaryAnswerPdfFiles.answerId, answer.id))
        .limit(1);

      if (storedPdf.length > 0 && storedPdf[0].pdfData) {
        console.log('   ✅ Using stored PDF from database');
        pdfBuffer = storedPdf[0].pdfData;
      } else if (answer.fullTextUrl) {
        // Download from URL
        console.log('   📥 Downloading PDF from URL...');
        pdfBuffer = await downloadPdf(answer.fullTextUrl);
      } else {
        console.log('   ⚠️  No PDF available (no stored PDF or URL)');
        continue;
      }

      if (!pdfBuffer) {
        console.log('   ❌ Failed to get PDF');
        continue;
      }

      // Parse the PDF
      console.log('   🔍 Parsing PDF...\n');
      const questions = await extractAllQuestions(pdfBuffer, allMps);

      console.log(`   ✅ Extracted ${questions.length} question(s)`);
      allQuestions.push(...questions);
    }

    if (allQuestions.length === 0) {
      console.log('\n⚠️  No questions were extracted from the PDFs');
      process.exit(0);
    }

    console.log(`\n📊 Total questions extracted: ${allQuestions.length}\n`);

    // Display results
    if (groupBy === 'constituency' || groupBy === 'both') {
      displayByConstituency(allQuestions);
    }

    if (groupBy === 'ministry' || groupBy === 'both') {
      displayByMinistry(allQuestions);
    }

    // Summary statistics
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY STATISTICS');
    console.log('='.repeat(80));

    const uniqueConstituencies = new Set(allQuestions.map(q => q.questionerConstituency));
    const uniqueMinistries = new Set(allQuestions.map(q => q.answererMinistry));

    console.log(`Total Questions:        ${allQuestions.length}`);
    console.log(`Constituencies:         ${uniqueConstituencies.size}`);
    console.log(`Ministries:             ${uniqueMinistries.size}`);
    console.log('='.repeat(80));

    console.log('\n✨ Parsing complete!\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
