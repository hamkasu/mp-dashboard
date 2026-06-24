/**
 * Fix corrupted parliamentary question topics
 *
 * This script identifies questions where the topic field contains speaker introductions
 * (e.g., "Tuan Oscar Ling Chai Yew [Sibu]: ...") instead of actual policy topics.
 *
 * It attempts to extract proper topics from the questionText field instead.
 */

import { getDb } from '../db';
import { parliamentaryQuestions } from '@shared/schema';
import { sql } from 'drizzle-orm';

const db = getDb();

// Pattern that matches speaker introduction in topic field
const SPEAKER_PATTERN = /^(Tuan|Puan|Dato|Datuk|Dr\.|Yang Berhormat|Ir\.|Ts\.)\s+([A-Za-z\s]+)(\[.*?\])?:/i;

function extractProperTopic(questionText: string, fallbackTopic: string): string {
  if (!questionText) return fallbackTopic;

  // Remove common question markers and get the meaningful content
  const cleaned = questionText
    .replace(/^(minta|bertanya|meminta|asking|requesting)\s+/i, '')
    .trim();

  // Extract first meaningful phrase (up to first period or 100 chars)
  const sentences = cleaned.split(/[.!?]/);
  const firstSentence = sentences[0].trim();

  if (firstSentence.length > 3) {
    // Get first 10-15 words as topic
    const words = firstSentence.split(/\s+/).slice(0, 15);
    return words.join(' ').substring(0, 150);
  }

  return fallbackTopic;
}

async function fixCorruptedTopics() {
  if (!db) {
    console.error('Database connection failed');
    return;
  }

  try {
    console.log('🔍 Finding questions with corrupted topics...\n');

    // Find all questions where topic matches speaker pattern
    const corruptedRecords = await db.execute(sql`
      SELECT
        id,
        topic,
        question_text,
        mp_id,
        date_asked
      FROM parliamentary_questions
      WHERE topic ~ '(Tuan|Puan|Dato|Datuk|Dr\.|Yang Berhormat|Ir\.|Ts\.)\s+[A-Za-z\s]+(\[.*?\])?:'
      ORDER BY date_asked DESC
      LIMIT 100
    `);

    const records = corruptedRecords.rows as any[];
    console.log(`Found ${records.length} potentially corrupted records\n`);

    let fixed = 0;
    let skipped = 0;

    for (const record of records) {
      try {
        // Extract proper topic from question text
        const newTopic = extractProperTopic(record.question_text, 'General Question');

        // Update the record
        await db.execute(sql`
          UPDATE parliamentary_questions
          SET topic = ${newTopic}
          WHERE id = ${record.id}
        `);

        fixed++;
        console.log(`✅ Fixed: ${record.topic.substring(0, 60)}...`);
        console.log(`   → ${newTopic.substring(0, 60)}...`);
      } catch (error) {
        skipped++;
        console.error(`❌ Error fixing record ${record.id}:`, error);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Fixed: ${fixed} records`);
    console.log(`   Skipped: ${skipped} records`);
    console.log(`   Total processed: ${fixed + skipped}`);

    if (fixed > 0) {
      console.log(`\n✨ Topic corruption fix complete!`);
    }
  } catch (error) {
    console.error('Error during topic fix:', error);
    throw error;
  }
}

// Run the fix
fixCorruptedTopics()
  .then(() => {
    console.log('\n✅ Done');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Failed:', err);
    process.exit(1);
  });
