/**
 * Script to analyze a PDF and print all questioners
 * This helps understand the structure of multi-question PDFs
 */

import { readFileSync } from 'fs';
import { PDFParse } from 'pdf-parse';

async function analyzePdf(pdfPath: string) {
  console.log(`\n🔍 Analyzing: ${pdfPath}\n`);

  try {
    const pdfBuffer = readFileSync(pdfPath);
    const pdfParse = new PDFParse({ data: pdfBuffer });
    const result = await pdfParse.getText();
    const fullText = result.text;

    console.log(`📄 PDF Stats:`);
    console.log(`   Pages: ${result.pages.length}`);
    console.log(`   Characters: ${fullText.length}`);
    console.log('');

    // Find all question numbers
    const questionMatches = Array.from(fullText.matchAll(/(?:^|\n)S\.(\d+)/g));
    console.log(`📋 Found ${questionMatches.length} question numbers:`);
    questionMatches.forEach(match => {
      console.log(`   - S.${match[1]}`);
    });
    console.log('');

    // Find all questioners (pattern: Name [Constituency])
    const questionerMatches = Array.from(fullText.matchAll(/(?:Tuan|Puan|Dato'?|Datuk|Y\.?B\.?)\s+([A-Z][^[\n]+?)\s*\[([^\]]+)\]/gi));
    console.log(`👥 Found ${questionerMatches.length} questioner mentions:`);

    const uniqueQuestioners = new Map<string, string>();
    questionerMatches.forEach(match => {
      const name = match[1].trim();
      const constituency = match[2].trim();
      uniqueQuestioners.set(constituency, name);
    });

    console.log(`\n👥 Unique Questioners (${uniqueQuestioners.size}):`);
    Array.from(uniqueQuestioners.entries()).forEach(([constituency, name], idx) => {
      console.log(`   ${idx + 1}. ${name} [${constituency}]`);
    });
    console.log('');

    // Find all ministries
    const ministryMatches = Array.from(fullText.matchAll(/(?:Menteri|Minister)\s+([A-Z][^[\n.]+?)(?:\[|:|bertangg?ungjawab|menjawab)/gi));
    console.log(`🏛️  Found ${ministryMatches.length} ministry mentions:`);

    const uniqueMinistries = new Set<string>();
    ministryMatches.forEach(match => {
      const ministry = match[1].trim();
      if (ministry.length > 5) { // Filter out short/invalid matches
        uniqueMinistries.add(ministry);
      }
    });

    console.log(`\n🏛️  Unique Ministries (${uniqueMinistries.size}):`);
    Array.from(uniqueMinistries).forEach((ministry, idx) => {
      console.log(`   ${idx + 1}. ${ministry}`);
    });
    console.log('');

    // Try to split by question sections
    console.log('📑 Attempting to split by questions...\n');
    const sections = fullText.split(/(?=S\.\d+)/);
    console.log(`   Found ${sections.length} sections`);

    // Analyze first 3 sections
    for (let i = 0; i < Math.min(3, sections.length); i++) {
      if (sections[i].trim().length < 50) continue;

      const questionMatch = sections[i].match(/S\.(\d+)/);
      if (!questionMatch) continue;

      console.log(`\n   ━━━ Section ${i + 1}: S.${questionMatch[1]} ━━━`);

      // Extract questioner from this section
      const sectionQuestionerMatch = sections[i].match(/(?:Tuan|Puan|Dato'?|Datuk|Y\.?B\.?)\s+([A-Z][^[\n]+?)\s*\[([^\]]+)\]/i);
      if (sectionQuestionerMatch) {
        console.log(`   Questioner: ${sectionQuestionerMatch[1].trim()}`);
        console.log(`   Constituency: ${sectionQuestionerMatch[2].trim()}`);
      }

      // Extract ministry from this section
      const sectionMinistryMatch = sections[i].match(/(?:Menteri|Minister)\s+([A-Z][^[\n.]+?)(?:\[|:|bertangg?ungjawab|menjawab)/i);
      if (sectionMinistryMatch) {
        console.log(`   Ministry: ${sectionMinistryMatch[1].trim()}`);
      }

      // Show first 200 chars
      console.log(`   Preview: ${sections[i].substring(0, 200).replace(/\n/g, ' ')}...`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

// Get PDF path from command line
const pdfPath = process.argv[2];

if (!pdfPath) {
  console.log('Usage: npm run analyze-pdf-structure <pdf-file-path>');
  console.log('Example: npm run analyze-pdf-structure ./test.pdf');
  process.exit(1);
}

analyzePdf(pdfPath);
