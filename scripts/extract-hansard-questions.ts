/**
 * Script to extract all parliamentary questions from Hansard records and store them in database
 * This script processes all hansard_records and extracts oral, written, and ministerial questions
 */

import { getDb } from '../server/db';
import { hansardRecords, parliamentaryQuestions, mps, type Mp } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { HansardQuestionParser, ParsedQuestion } from '../server/hansard-question-parser';
import { HansardSectionParser } from '../server/hansard-section-parser';

async function extractAllHansardQuestions() {
  const db = getDb();
  if (!db) {
    console.error('❌ Database not available');
    return;
  }

  console.log('🔍 Extracting questions from all Hansard records...\n');

  // Load all MPs for name matching
  const allMps = await db.select().from(mps);
  console.log(`📋 Loaded ${allMps.length} MPs for matching\n`);

  // Initialize parsers
  const questionParser = new HansardQuestionParser(allMps);
  const sectionParser = new HansardSectionParser();

  // Get all hansard records
  const allHansardRecords = await db.select().from(hansardRecords);
  console.log(`📚 Found ${allHansardRecords.length} Hansard records to process\n`);

  let totalQuestionsExtracted = 0;
  let totalQuestionsStored = 0;
  let totalWithMpMatch = 0;
  let totalWithoutMpMatch = 0;
  let recordsProcessed = 0;
  let recordsWithErrors = 0;

  for (const record of allHansardRecords) {
    recordsProcessed++;
    console.log(`\n${'='.repeat(80)}`);
    console.log(`[${recordsProcessed}/${allHansardRecords.length}] Processing: ${record.sessionNumber}`);
    console.log(`Date: ${record.sessionDate.toISOString().split('T')[0]}`);
    console.log('='.repeat(80));

    try {
      // Check if questions already extracted for this hansard
      const existingQuestions = await db.select()
        .from(parliamentaryQuestions)
        .where(eq(parliamentaryQuestions.hansardRecordId, record.id));

      if (existingQuestions.length > 0) {
        console.log(`⏭️  Already has ${existingQuestions.length} questions, skipping...`);
        totalQuestionsStored += existingQuestions.length;
        continue;
      }

      const transcript = record.transcript;
      if (!transcript || transcript.length < 100) {
        console.log('⚠️  Transcript too short or empty, skipping...');
        continue;
      }

      console.log(`📄 Transcript length: ${transcript.length} characters`);

      // Extract question sections
      const allQuestions: ParsedQuestion[] = [];

      console.log('🔍 Extracting question sections...');
      const questionSections = sectionParser.extractQuestionsSections(transcript);
      console.log(`   Found ${questionSections.length} question sections`);

      // Parse questions from each section
      for (const section of questionSections) {
        let questionType: 'oral' | 'written' | 'minister' = 'oral';
        if (section.type === 'questions_written') {
          questionType = 'written';
        } else if (section.type === 'questions_minister') {
          questionType = 'minister';
        }

        console.log(`   📝 Parsing ${section.type} section...`);
        const questions = questionParser.parseQuestions(section.content, questionType);
        console.log(`      Found ${questions.length} questions (${questions.filter(q => q.mpId).length} with MP match)`);
        allQuestions.push(...questions);
      }

      totalQuestionsExtracted += allQuestions.length;

      // Store questions in database
      for (const question of allQuestions) {
        try {
          if (question.mpId) {
            await db.insert(parliamentaryQuestions).values({
              mpId: question.mpId,
              questionText: question.questionText,
              dateAsked: record.sessionDate,
              ministry: question.ministry,
              topic: question.topic,
              answerStatus: question.answerStatus === 'answered' ? 'Answered' : 'Pending',
              hansardReference: record.sessionNumber,
              answerText: question.answerText || null,
              questionType: question.questionType.charAt(0).toUpperCase() + question.questionType.slice(1),
              questionNumber: question.questionNumber || null,
              hansardRecordId: record.id,
            });
            totalQuestionsStored++;
            totalWithMpMatch++;
          } else {
            // Store question without MP ID (we'll try to match later)
            console.log(`      ⚠️  Question without MP match: "${question.mpName}" - ${question.questionText.substring(0, 50)}...`);
            totalWithoutMpMatch++;
          }
        } catch (error: any) {
          console.error(`      ❌ Error storing question: ${error.message}`);
        }
      }

      console.log(`✅ Stored ${allQuestions.filter(q => q.mpId).length} questions from ${record.sessionNumber}`);
      console.log(`   - Oral: ${allQuestions.filter(q => q.questionType === 'oral' && q.mpId).length}`);
      console.log(`   - Written: ${allQuestions.filter(q => q.questionType === 'written' && q.mpId).length}`);
      console.log(`   - Minister: ${allQuestions.filter(q => q.questionType === 'minister' && q.mpId).length}`);
      console.log(`   - Without MP match: ${allQuestions.filter(q => !q.mpId).length}`);

    } catch (error: any) {
      console.error(`❌ Error processing ${record.sessionNumber}: ${error.message}`);
      recordsWithErrors++;
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Hansard records processed: ${recordsProcessed}`);
  console.log(`Records with errors: ${recordsWithErrors}`);
  console.log(`Total questions extracted: ${totalQuestionsExtracted}`);
  console.log(`Total questions stored in database: ${totalQuestionsStored}`);
  console.log(`Questions with MP match: ${totalWithMpMatch}`);
  console.log(`Questions without MP match: ${totalWithoutMpMatch}`);
  console.log(`Success rate: ${((totalWithMpMatch / totalQuestionsExtracted) * 100).toFixed(1)}%`);
  console.log('='.repeat(80));
  console.log('\n✨ Done!');
}

extractAllHansardQuestions()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
