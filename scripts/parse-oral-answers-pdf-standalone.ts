/**
 * Copyright by Calmic Sdn Bhd
 *
 * Standalone PDF Parser for Oral Answers
 * Parses a PDF file directly without database access
 * Usage: npm run parse-pdf <pdf-file-path> [groupBy]
 *   groupBy: 'constituency', 'ministry', or 'both' (default: 'both')
 */

import { readFileSync } from 'fs';
import { PDFParse } from 'pdf-parse';

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
 * Extract all questions from PDF text
 */
async function extractQuestionsFromPdf(pdfBuffer: Buffer): Promise<ParsedQuestion[]> {
  const questions: ParsedQuestion[] = [];

  try {
    // Parse the PDF
    const pdfParse = new PDFParse({ data: pdfBuffer });
    const result = await pdfParse.getText();
    const fullText = result.text;

    console.log(`📄 Extracted ${fullText.length} characters from PDF`);
    console.log(`📄 Pages: ${result.pages.length}\n`);

    // Check if it's from Parlimen 15
    if (!isParlimen15(fullText)) {
      console.log('⚠️  Warning: This PDF does not appear to be from Parlimen 15');
    }

    // Try different strategies to find questions
    // Strategy 1: Split by question number pattern
    const questionMatches = fullText.matchAll(/(?:^|\n)S\.(\d+)/g);
    const questionNumbers: number[] = [];
    for (const match of questionMatches) {
      questionNumbers.push(parseInt(match[1]));
    }

    console.log(`🔍 Found ${questionNumbers.length} question number(s): ${questionNumbers.join(', ')}`);

    if (questionNumbers.length === 0) {
      // If no specific question numbers found, treat the whole PDF as one question
      console.log('📝 No multiple questions detected, parsing as single document\n');
      const parsed = extractSingleQuestion(fullText);
      if (parsed && parsed.questionNumber) {
        questions.push(parsed);
      }
    } else if (questionNumbers.length === 1) {
      // Single question
      console.log('📝 Parsing single question document\n');
      const parsed = extractSingleQuestion(fullText);
      if (parsed && parsed.questionNumber) {
        questions.push(parsed);
      }
    } else {
      // Multiple questions - split text
      console.log('📝 Parsing multiple questions\n');
      const sections = fullText.split(/(?=S\.\d+)/);
      for (const section of sections) {
        if (section.trim().length < 50) continue; // Skip very short sections
        const parsed = extractSingleQuestion(section);
        if (parsed && parsed.questionNumber) {
          questions.push(parsed);
        }
      }
    }

  } catch (error: any) {
    console.error('❌ Error parsing PDF:', error.message);
    throw error;
  }

  return questions;
}

/**
 * Extract a single question from text
 */
function extractSingleQuestion(text: string): ParsedQuestion | null {
  const questionNumber = extractQuestionNumber(text);
  const questionText = extractQuestionText(text);
  const answerText = extractAnswerText(text);
  const questioner = extractQuestioner(text);
  const answerer = extractAnswerer(text);

  if (!questionNumber && !questioner.name) {
    // Not enough information to identify this as a valid question
    return null;
  }

  return {
    questionNumber: questionNumber || 'N/A',
    questionText: questionText || 'N/A',
    answerText: answerText || 'N/A',
    questionerName: questioner.name || 'Unknown',
    questionerConstituency: questioner.constituency || 'Unknown',
    answererMinistry: answerer.ministry || 'Unknown',
    answererName: answerer.name,
  };
}

/**
 * Check if PDF is from Parlimen 15
 */
function isParlimen15(text: string): boolean {
  return /parlimen\s+(?:ke[\s-]?)?15/i.test(text) || /parliament\s+(?:ke[\s-]?)?15/i.test(text);
}

/**
 * Extract question number
 */
function extractQuestionNumber(text: string): string | undefined {
  const patterns = [
    /S\.?\s*(\d+)/i,
    /Soalan\s+No\.?\s*(\d+)/i,
    /Question\s+No\.?\s*(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return `S.${match[1]}`;
  }
  return undefined;
}

/**
 * Extract question text
 */
function extractQuestionText(text: string): string | undefined {
  const patterns = [
    /(?:Soalan|SOALAN|Question)\s*[:–-]\s*(.*?)(?=(?:Jawapan|JAWAPAN|Answer|Menteri)\s*[:–-]|$)/is,
    /(?:bertanya|minta).*?(?=(?:Jawapan|Menteri|Minister))/is,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const questionText = match[1].trim();
      if (questionText.length > 20) {
        return questionText.substring(0, 1000);
      }
    }
  }
  return undefined;
}

/**
 * Extract answer text
 */
function extractAnswerText(text: string): string | undefined {
  const patterns = [
    /(?:Jawapan|JAWAPAN|Answer|ANSWER)\s*[:–-]\s*(.*?)$/is,
    /(?:Menteri|Minister).*?(?:menjawab|menyatakan|berkata|bertanggungjawab)[:–-]?\s*(.*?)$/is,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const answerText = match[1].trim();
      if (answerText.length > 20) {
        return answerText.substring(0, 1000);
      }
    }
  }
  return undefined;
}

/**
 * Extract questioner
 */
function extractQuestioner(text: string): { name?: string; constituency?: string } {
  const patterns = [
    /(?:Tuan|Puan|Dato'?|Datuk|Y\.?B\.?)\s+([A-Z][^[\n]+?)\s*\[([^\]]+)\]/i,
    /(?:Asked by|Ditanya oleh)\s*[:–-]?\s*([A-Z][^[\n]+?)\s*\[([^\]]+)\]/i,
    /([A-Z][A-Za-z\s.'@-]+?)\s*\[([^\]]+)\]\s*(?:bertanya|minta)/i,
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

  // Fallback: try to find just the name
  const namePattern = /(?:Tuan|Puan|Dato'?|Datuk|Y\.?B\.?)\s+([A-Z][A-Za-z\s.'@-]+?)(?:\s+bertanya|\s+minta|\[|$)/i;
  const nameMatch = text.match(namePattern);
  if (nameMatch) {
    return { name: nameMatch[1].trim() };
  }

  return {};
}

/**
 * Extract answerer
 */
function extractAnswerer(text: string): { name?: string; ministry?: string } {
  const patterns = [
    /(?:Menteri|Minister)\s+([A-Z][^[\n]+?)(?:\[|bertangg?ungjawab|answered|menjawab)/i,
    /(?:Jawapan|Answer)\s*[:–-]?\s*(?:Menteri|Minister)\s+([^[\n]+?)(?:\[|:|$)/i,
    /Kementerian\s+([A-Z][^[\n.]+?)(?:\[|$)/i,
    /Ministry\s+of\s+([A-Z][^[\n.]+?)(?:\[|$)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const ministry = match[1].trim();

      // Try to extract minister name
      const namePattern = /(?:Dato'?|Datuk|Y\.?B\.?|Tuan|Puan)\s+([A-Z][A-Za-z\s.'@-]+?)(?:\[|,|–|-|menjawab|bertanggungjawab|$)/i;
      const nameMatch = text.match(namePattern);

      return {
        ministry,
        name: nameMatch ? nameMatch[1].trim() : undefined,
      };
    }
  }

  return {};
}

/**
 * Display questions by constituency
 */
function displayByConstituency(questions: ParsedQuestion[]) {
  console.log('\n' + '='.repeat(80));
  console.log('📍 ORAL ANSWERS ORGANIZED BY CONSTITUENCY');
  console.log('='.repeat(80));

  const byConstituency: ConstituencyQuestions = {};

  questions.forEach(q => {
    const constituency = q.questionerConstituency || 'Unknown';
    if (!byConstituency[constituency]) {
      byConstituency[constituency] = [];
    }
    byConstituency[constituency].push(q);
  });

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
      const qText = q.questionText.replace(/\n/g, '\n     ');
      console.log(`     ${qText.substring(0, 300)}${qText.length > 300 ? '...' : ''}`);
      console.log(`\n     Answer:`);
      const aText = q.answerText.replace(/\n/g, '\n     ');
      console.log(`     ${aText.substring(0, 300)}${aText.length > 300 ? '...' : ''}`);
    });
  });

  console.log('\n' + '='.repeat(80));
}

/**
 * Display questions by ministry
 */
function displayByMinistry(questions: ParsedQuestion[]) {
  console.log('\n' + '='.repeat(80));
  console.log('🏛️  ORAL ANSWERS ORGANIZED BY MINISTRY');
  console.log('='.repeat(80));

  const byMinistry: MinistryQuestions = {};

  questions.forEach(q => {
    const ministry = q.answererMinistry || 'Unknown';
    if (!byMinistry[ministry]) {
      byMinistry[ministry] = [];
    }
    byMinistry[ministry].push(q);
  });

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
      const qText = q.questionText.replace(/\n/g, '\n     ');
      console.log(`     ${qText.substring(0, 300)}${qText.length > 300 ? '...' : ''}`);
      console.log(`\n     Answer:`);
      const aText = q.answerText.replace(/\n/g, '\n     ');
      console.log(`     ${aText.substring(0, 300)}${aText.length > 300 ? '...' : ''}`);
    });
  });

  console.log('\n' + '='.repeat(80));
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: npm run parse-pdf <pdf-file-path> [groupBy]');
    console.log('  groupBy: "constituency", "ministry", or "both" (default: "both")');
    console.log('\nExample:');
    console.log('  npm run parse-pdf ./downloads/JDR02122025.pdf both');
    process.exit(1);
  }

  const pdfPath = args[0];
  const groupBy = args[1] || 'both';

  console.log('🚀 Standalone Oral Answers PDF Parser\n');
  console.log(`📄 PDF File: ${pdfPath}`);
  console.log(`📊 Group by: ${groupBy}\n`);

  try {
    // Read the PDF file
    console.log('📥 Reading PDF file...');
    const pdfBuffer = readFileSync(pdfPath);
    console.log(`   ✅ Loaded ${(pdfBuffer.length / 1024).toFixed(2)} KB\n`);

    // Extract questions
    console.log('🔍 Parsing PDF...\n');
    const questions = await extractQuestionsFromPdf(pdfBuffer);

    if (questions.length === 0) {
      console.log('\n⚠️  No questions were extracted from the PDF');
      console.log('\nPlease check:');
      console.log('1. The PDF is a valid oral answers document');
      console.log('2. The PDF contains readable text (not scanned images)');
      console.log('3. The PDF follows the expected format');
      process.exit(0);
    }

    console.log(`\n✅ Extracted ${questions.length} question(s)\n`);

    // Display results
    if (groupBy === 'constituency' || groupBy === 'both') {
      displayByConstituency(questions);
    }

    if (groupBy === 'ministry' || groupBy === 'both') {
      displayByMinistry(questions);
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY STATISTICS');
    console.log('='.repeat(80));

    const uniqueConstituencies = new Set(questions.map(q => q.questionerConstituency));
    const uniqueMinistries = new Set(questions.map(q => q.answererMinistry));

    console.log(`Total Questions:        ${questions.length}`);
    console.log(`Constituencies:         ${uniqueConstituencies.size}`);
    console.log(`Ministries:             ${uniqueMinistries.size}`);
    console.log('='.repeat(80));

    console.log('\n✨ Parsing complete!\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 'ENOENT') {
      console.error(`\n   File not found: ${pdfPath}`);
      console.error('   Please check the file path and try again.');
    }
    process.exit(1);
  }
}

// Run the script
main();
