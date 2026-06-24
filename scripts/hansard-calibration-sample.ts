/**
 * Phase 3: Calibration Sample Generator
 * Samples tagged speeches across confidence spectrum for manual review
 */

import { db } from '../server/db';
import {
  hansardTags,
  hansardSpeeches,
  hansardRecords,
  mps,
} from '@shared/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

interface CalibrationSample {
  speechId: string;
  mpName: string;
  sittingDate: string;
  speechText: string;
  proposedTag: string;
  tagType: 'topic' | 'sentiment';
  confidence: number;
  evidenceQuote: string;
  primaryLanguage?: string;
  humanJudgment?: string; // To be filled by reviewer
}

async function generateCalibrationSample(sampleSize: number = 250) {
  console.log(`📊 Generating calibration sample (n=${sampleSize})...`);

  // Get all auto_published and pending_review tags (not edited/rejected)
  const allTags = await db
    .select({
      tag: hansardTags,
      speech: hansardSpeeches,
      record: hansardRecords,
      mp: mps,
    })
    .from(hansardTags)
    .innerJoin(hansardSpeeches, eq(hansardTags.speechId, hansardSpeeches.id))
    .innerJoin(hansardRecords, eq(hansardSpeeches.hansardRecordId, hansardRecords.id))
    .innerJoin(mps, eq(hansardSpeeches.mpId, mps.id))
    .where(
      // Include both auto_published and pending_review
      eq(hansardTags.reviewStatus, 'auto_published') ||
        eq(hansardTags.reviewStatus, 'pending_review')
    );

  console.log(`📚 Found ${allTags.length} tagged items`);

  // Group by confidence bands for stratified sampling
  const bands = {
    veryHigh: allTags.filter(t => t.tag.confidence >= 90),
    high: allTags.filter(t => t.tag.confidence >= 80 && t.tag.confidence < 90),
    medium: allTags.filter(t => t.tag.confidence >= 70 && t.tag.confidence < 80),
    borderline: allTags.filter(t => t.tag.confidence >= 45 && t.tag.confidence < 70),
    low: allTags.filter(t => t.tag.confidence >= 30 && t.tag.confidence < 45),
  };

  // Oversample borderline band (where calibration matters most)
  const samples: typeof allTags = [];
  const ratios = {
    veryHigh: Math.ceil(sampleSize * 0.1),
    high: Math.ceil(sampleSize * 0.15),
    medium: Math.ceil(sampleSize * 0.2),
    borderline: Math.ceil(sampleSize * 0.4), // Oversample
    low: Math.ceil(sampleSize * 0.15),
  };

  for (const [band, ratio] of Object.entries(ratios)) {
    const items = bands[band as keyof typeof bands];
    const toSample = Math.min(ratio, items.length);
    for (let i = 0; i < toSample; i++) {
      const idx = Math.floor(Math.random() * items.length);
      samples.push(items.splice(idx, 1)[0]);
    }
  }

  console.log(`✅ Sampled ${samples.length} items across confidence bands`);
  console.log(`   - Very High (90+): ${ratios.veryHigh} items`);
  console.log(`   - High (80-89): ${ratios.high} items`);
  console.log(`   - Medium (70-79): ${ratios.medium} items`);
  console.log(`   - Borderline (45-69): ${ratios.borderline} items`);
  console.log(`   - Low (30-44): ${ratios.low} items`);

  // Generate CSV for manual review
  const records: CalibrationSample[] = samples.map(item => ({
    speechId: item.speech.id,
    mpName: item.mp.name,
    sittingDate: item.record.sessionDate.toISOString().split('T')[0],
    speechText: item.speech.speechText.substring(0, 200) + '...',
    proposedTag: item.tag.tagValue,
    tagType: item.tag.tagType as 'topic' | 'sentiment',
    confidence: item.tag.confidence,
    evidenceQuote: item.tag.evidenceQuote || '',
  }));

  // Write CSV with proper escaping
  const csvHeader = [
    'speech_id',
    'mp_name',
    'sitting_date',
    'speech_preview',
    'proposed_tag',
    'tag_type',
    'confidence',
    'evidence_quote',
    'human_judgment (agree/disagree/partial)',
  ].join(',');

  const csvRows = records.map(r =>
    [
      r.speechId,
      `"${r.mpName}"`,
      r.sittingDate,
      `"${r.speechText.replace(/"/g, '""')}"`,
      r.proposedTag,
      r.tagType,
      r.confidence,
      `"${r.evidenceQuote.replace(/"/g, '""')}"`,
      '""', // Empty column for reviewer to fill
    ].join(',')
  );

  const csvContent = [csvHeader, ...csvRows].join('\n');

  // Write to file
  const filename = `hansard-calibration-sample-${new Date().toISOString().split('T')[0]}.csv`;
  const filepath = path.join(process.cwd(), filename);

  fs.writeFileSync(filepath, csvContent, 'utf-8');
  console.log(`\n✅ Calibration sample saved to: ${filename}`);
  console.log(
    `\n📋 Instructions for review:\n1. Open ${filename} in spreadsheet app\n2. Review each item and fill "human_judgment" column with: agree / disagree / partial\n3. Save and run: npm run calibration-report ${filename}`
  );

  process.exit(0);
}

const sampleSize = parseInt(process.argv[2] || '250');
generateCalibrationSample(sampleSize).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
