/**
 * Hansard Speech Tagging Pipeline
 * Tags extracted speeches using Anthropic Claude API
 */

import { db } from '../server/db';
import {
  hansardSpeeches,
  hansardTags,
  hansardEntities,
  hansardTopicVocabulary,
  hansardRecords,
  mps,
} from '@shared/schema';
import { HansardAnthropicTagger } from '../server/hansard-anthropic-tagger';
import { eq, isNull, and } from 'drizzle-orm';

interface TaggingStats {
  totalProcessed: number;
  autoPublished: number;
  pendingReview: number;
  discarded: number;
  newVocabCreated: number;
  errors: number;
}

async function tagSpeeches(limit: number = 50) {
  console.log(`🏷️  Starting Hansard tagging pipeline (limit: ${limit} speeches)...`);

  // Get controlled vocabulary
  const vocab = await db.select().from(hansardTopicVocabulary);
  console.log(`📚 Loaded ${vocab.length} vocabulary terms`);

  const tagger = new HansardAnthropicTagger(vocab);

  // Get untagged speeches (where no tags exist yet)
  const untaggedSpeeches = await db
    .select({
      speech: hansardSpeeches,
      record: hansardRecords,
      mp: mps,
    })
    .from(hansardSpeeches)
    .innerJoin(hansardRecords, eq(hansardSpeeches.hansardRecordId, hansardRecords.id))
    .innerJoin(mps, eq(hansardSpeeches.mpId, mps.id))
    .limit(limit);

  console.log(`📖 Found ${untaggedSpeeches.length} untagged speeches to process`);

  const stats: TaggingStats = {
    totalProcessed: 0,
    autoPublished: 0,
    pendingReview: 0,
    discarded: 0,
    newVocabCreated: 0,
    errors: 0,
  };

  for (let i = 0; i < untaggedSpeeches.length; i++) {
    const { speech, record, mp } = untaggedSpeeches[i];

    try {
      if ((i + 1) % 10 === 0) {
        console.log(`⏳ Processing ${i + 1}/${untaggedSpeeches.length}...`);
      }

      // Tag the speech
      const result = await tagger.tagSpeech(speech.speechText, mp.name, record.sessionDate);

      if (!result.success) {
        console.warn(`⚠️  Failed to tag speech ${speech.id}: ${result.error}`);
        stats.errors++;
        continue;
      }

      stats.totalProcessed++;

      // Skip if not substantive
      if (!result.isSubstantive) {
        console.log(`⏭️  Skipping non-substantive speech (${mp.name})`);
        continue;
      }

      // Process topics
      for (const topic of result.topics) {
        // Check if topic needs to be added to vocabulary
        if (topic.isNewTag && !vocab.find(v => v.tagSlug === topic.tag)) {
          await db.insert(hansardTopicVocabulary).values({
            tagSlug: topic.tag,
            displayLabel: topic.tag.replace(/_/g, ' '),
            status: 'pending_review',
          });
          stats.newVocabCreated++;
          console.log(`➕ Created new vocabulary term: ${topic.tag}`);
        }

        // Determine review status based on confidence
        let reviewStatus: 'auto_published' | 'pending_review' | 'rejected' = 'rejected';
        let reviewFlagReason: string | null = null;

        if (topic.confidence >= 75) {
          reviewStatus = 'auto_published';
          stats.autoPublished++;
        } else if (topic.confidence >= 45) {
          reviewStatus = 'pending_review';
          reviewFlagReason = result.reviewFlagReason;
          stats.pendingReview++;
        } else {
          stats.discarded++;
          continue; // Don't insert low-confidence tags
        }

        // Insert tag
        await db.insert(hansardTags).values({
          speechId: speech.id,
          tagType: 'topic',
          tagValue: topic.tag,
          confidence: topic.confidence,
          evidenceQuote: topic.evidenceQuote,
          isNewTag: topic.isNewTag,
          reviewStatus,
          reviewFlagReason,
        });
      }

      // Process sentiment
      if (result.sentiment) {
        let reviewStatus: 'auto_published' | 'pending_review' | 'rejected' = 'rejected';
        let reviewFlagReason: string | null = null;

        if (result.sentiment.confidence >= 75) {
          reviewStatus = 'auto_published';
          stats.autoPublished++;
        } else if (result.sentiment.confidence >= 45) {
          reviewStatus = 'pending_review';
          reviewFlagReason = result.reviewFlagReason;
          stats.pendingReview++;
        } else {
          stats.discarded++;
          // Don't insert low-confidence sentiment
        }

        if (reviewStatus !== 'rejected') {
          await db.insert(hansardTags).values({
            speechId: speech.id,
            tagType: 'sentiment',
            tagValue: result.sentiment.tone,
            confidence: result.sentiment.confidence,
            evidenceQuote: result.sentiment.evidenceQuote,
            isNewTag: false,
            targetType: result.sentiment.targetType,
            targetEntity: result.sentiment.targetEntity || null,
            reviewStatus,
            reviewFlagReason,
          });
        }
      }

      // Process entities
      for (const entity of result.entities) {
        await db.insert(hansardEntities).values({
          speechId: speech.id,
          entityName: entity.name,
          entityType: entity.type,
        });
      }

      console.log(`✅ Tagged speech ${speech.id} (${mp.name})`);
    } catch (error) {
      console.error(`❌ Error tagging speech ${speech.id}:`, error);
      stats.errors++;
    }

    // Rate limiting: wait 2 seconds between API calls
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n📊 Tagging Pipeline Complete!`);
  console.log(`   - Total processed: ${stats.totalProcessed}`);
  console.log(`   - Auto-published: ${stats.autoPublished}`);
  console.log(`   - Pending review: ${stats.pendingReview}`);
  console.log(`   - Discarded (low confidence): ${stats.discarded}`);
  console.log(`   - New vocabulary terms created: ${stats.newVocabCreated}`);
  console.log(`   - Errors: ${stats.errors}`);

  process.exit(0);
}

// Parse command line arguments
const limit = parseInt(process.argv[2] || '50');

tagSpeeches(limit).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
