/**
 * Phase 3: Calibration Report Generator
 * Analyzes completed calibration samples and recommends threshold adjustments
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

interface CalibrationRecord {
  speech_id: string;
  mp_name: string;
  sitting_date: string;
  speech_preview: string;
  proposed_tag: string;
  tag_type: 'topic' | 'sentiment';
  confidence: number;
  evidence_quote: string;
  human_judgment: string;
}

interface BandAccuracy {
  band: string;
  minConfidence: number;
  maxConfidence: number;
  totalItems: number;
  agreementCount: number;
  partialCount: number;
  disagreementCount: number;
  accuracy: number;
  partialAccuracy: number;
}

interface RecommendedThreshold {
  category: 'topic' | 'sentiment';
  currentAutoPublishThreshold: number;
  currentPendingReviewThreshold: number;
  recommendedAutoPublishThreshold: number;
  recommendedPendingReviewThreshold: number;
  rationale: string;
}

function analyzeCalibration(csvFilepath: string) {
  console.log(`📊 Analyzing calibration sample: ${csvFilepath}\n`);

  // Read and parse CSV
  const csvContent = fs.readFileSync(csvFilepath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  }) as CalibrationRecord[];

  console.log(`📈 Loaded ${records.length} reviewed items`);

  // Validate human judgments
  const validJudgments = ['agree', 'disagree', 'partial'];
  let validCount = 0;
  for (const record of records) {
    const judgment = record.human_judgment?.toLowerCase().trim();
    if (validJudgments.includes(judgment)) {
      validCount++;
    } else {
      console.warn(`⚠️  Invalid judgment "${record.human_judgment}" for ${record.speech_id}`);
    }
  }

  if (validCount === 0) {
    console.error('❌ No valid human judgments found. Please fill "human_judgment" column with: agree / disagree / partial');
    process.exit(1);
  }

  // Separate by tag type
  const topicTags = records.filter(r => r.tag_type === 'topic');
  const sentimentTags = records.filter(r => r.tag_type === 'sentiment');

  console.log(`\n📚 Split by tag type:`);
  console.log(`   - Topic tags: ${topicTags.length}`);
  console.log(`   - Sentiment tags: ${sentimentTags.length}`);

  // Analyze each category
  const topicBandAccuracy = analyzeBands(topicTags);
  const sentimentBandAccuracy = analyzeBands(sentimentTags);

  // Generate recommendations
  const topicRecommendation = generateRecommendation('topic', topicBandAccuracy);
  const sentimentRecommendation = generateRecommendation('sentiment', sentimentBandAccuracy);

  // Print report
  console.log(`\n${'='.repeat(80)}`);
  console.log('CALIBRATION REPORT');
  console.log(`${'='.repeat(80)}\n`);

  printBandReport('TOPIC TAGS', topicBandAccuracy);
  printBandReport('SENTIMENT TAGS', sentimentBandAccuracy);

  console.log(`\n${'='.repeat(80)}`);
  console.log('RECOMMENDATIONS');
  console.log(`${'='.repeat(80)}\n`);

  printRecommendation(topicRecommendation);
  printRecommendation(sentimentRecommendation);

  // Save report to file
  const reportFilename = `hansard-calibration-report-${new Date().toISOString().split('T')[0]}.md`;
  const reportContent = generateMarkdownReport(topicBandAccuracy, sentimentBandAccuracy, [
    topicRecommendation,
    sentimentRecommendation,
  ]);

  fs.writeFileSync(reportFilename, reportContent, 'utf-8');
  console.log(`\n✅ Full report saved to: ${reportFilename}`);

  process.exit(0);
}

function analyzeBands(records: CalibrationRecord[]): BandAccuracy[] {
  const bands = [
    { name: '90+', min: 90, max: 100 },
    { name: '80-89', min: 80, max: 89 },
    { name: '70-79', min: 70, max: 79 },
    { name: '60-69', min: 60, max: 69 },
    { name: '45-59', min: 45, max: 59 },
    { name: '30-44', min: 30, max: 44 },
  ];

  const results: BandAccuracy[] = [];

  for (const band of bands) {
    const itemsInBand = records.filter(r => r.confidence >= band.min && r.confidence <= band.max);

    if (itemsInBand.length === 0) continue;

    let agreementCount = 0;
    let partialCount = 0;
    let disagreementCount = 0;

    for (const item of itemsInBand) {
      const judgment = item.human_judgment?.toLowerCase().trim();
      if (judgment === 'agree') agreementCount++;
      else if (judgment === 'partial') partialCount++;
      else if (judgment === 'disagree') disagreementCount++;
    }

    const accuracy = agreementCount / itemsInBand.length;
    const partialAccuracy = (agreementCount + partialCount) / itemsInBand.length;

    results.push({
      band: band.name,
      minConfidence: band.min,
      maxConfidence: band.max,
      totalItems: itemsInBand.length,
      agreementCount,
      partialCount,
      disagreementCount,
      accuracy: Math.round(accuracy * 100),
      partialAccuracy: Math.round(partialAccuracy * 100),
    });
  }

  return results;
}

function generateRecommendation(
  category: 'topic' | 'sentiment',
  bandAccuracy: BandAccuracy[]
): RecommendedThreshold {
  // Find confidence levels where accuracy is strong (>80% agreement)
  const strongBands = bandAccuracy.filter(b => b.accuracy >= 80);
  const reasonableBands = bandAccuracy.filter(b => b.accuracy >= 60);

  let recommendedAutoPublish = 75; // Default
  let recommendedPendingReview = 45; // Default

  if (strongBands.length > 0) {
    recommendedAutoPublish = strongBands[strongBands.length - 1].minConfidence;
  }

  if (reasonableBands.length > 0) {
    const lowestReasonable = reasonableBands[0];
    // If accuracy drops below 60% in the 45-59 range, recommend higher threshold
    const midBand = bandAccuracy.find(b => b.band === '45-59');
    if (midBand && midBand.accuracy < 60) {
      recommendedPendingReview = Math.max(50, midBand.minConfidence);
    }
  }

  const rationale =
    category === 'topic'
      ? `Topic tags with ${recommendedAutoPublish}+ confidence show strong agreement. ${recommendedPendingReview}-${recommendedAutoPublish - 1} range is appropriate for human review.`
      : `Sentiment tags are higher-stakes (reputational/legal risk). ${recommendedAutoPublish}+ is safer. ${recommendedPendingReview}-${recommendedAutoPublish - 1} requires careful review.`;

  return {
    category,
    currentAutoPublishThreshold: 75,
    currentPendingReviewThreshold: 45,
    recommendedAutoPublishThreshold: recommendedAutoPublish,
    recommendedPendingReviewThreshold: recommendedPendingReview,
    rationale,
  };
}

function printBandReport(title: string, bandAccuracy: BandAccuracy[]) {
  console.log(`\n${title}`);
  console.log('-'.repeat(80));
  console.log(
    `${'Band'.padEnd(12)} ${'Total'.padEnd(8)} ${'Agree'.padEnd(8)} ${'Partial'.padEnd(8)} ${'Disagree'.padEnd(10)} ${'Accuracy %'.padEnd(12)} ${'w/ Partial %'}`
  );
  console.log('-'.repeat(80));

  for (const band of bandAccuracy) {
    console.log(
      `${band.band.padEnd(12)} ${band.totalItems.toString().padEnd(8)} ${band.agreementCount
        .toString()
        .padEnd(8)} ${band.partialCount.toString().padEnd(8)} ${band.disagreementCount
        .toString()
        .padEnd(10)} ${band.accuracy.toString().padEnd(12)} ${band.partialAccuracy}%`
    );
  }
}

function printRecommendation(rec: RecommendedThreshold) {
  console.log(`\n${rec.category.toUpperCase()} TAGS`);
  console.log('-'.repeat(80));
  console.log(`Current thresholds:`);
  console.log(`  - Auto-publish: >= ${rec.currentAutoPublishThreshold}`);
  console.log(`  - Pending review: ${rec.currentPendingReviewThreshold}-${rec.currentAutoPublishThreshold - 1}`);
  console.log(`  - Discard: < ${rec.currentPendingReviewThreshold}`);

  if (
    rec.recommendedAutoPublishThreshold !== rec.currentAutoPublishThreshold ||
    rec.recommendedPendingReviewThreshold !== rec.currentPendingReviewThreshold
  ) {
    console.log(`\nRECOMMENDED ADJUSTMENT:`);
    console.log(`  - Auto-publish: >= ${rec.recommendedAutoPublishThreshold}`);
    console.log(
      `  - Pending review: ${rec.recommendedPendingReviewThreshold}-${rec.recommendedAutoPublishThreshold - 1}`
    );
    console.log(`  - Discard: < ${rec.recommendedPendingReviewThreshold}`);
  } else {
    console.log(`\n✅ Current thresholds appear well-calibrated.`);
  }

  console.log(`\nRationale: ${rec.rationale}`);
}

function generateMarkdownReport(
  topicBands: BandAccuracy[],
  sentimentBands: BandAccuracy[],
  recommendations: RecommendedThreshold[]
): string {
  const date = new Date().toISOString().split('T')[0];

  let md = `# Hansard Tagging Calibration Report\n\n`;
  md += `**Date:** ${date}\n`;
  md += `**Status:** `;

  const needsAdjustment = recommendations.some(
    r =>
      r.recommendedAutoPublishThreshold !== r.currentAutoPublishThreshold ||
      r.recommendedPendingReviewThreshold !== r.currentPendingReviewThreshold
  );

  md += needsAdjustment ? 'Thresholds may need adjustment\n\n' : 'Thresholds well-calibrated\n\n';

  // Topic bands
  md += `## Topic Tags\n\n`;
  md += `| Confidence Band | Count | Agree | Partial | Disagree | Accuracy | w/ Partial |\n`;
  md += `|---|---|---|---|---|---|---|\n`;
  for (const band of topicBands) {
    md += `| ${band.band} | ${band.totalItems} | ${band.agreementCount} | ${band.partialCount} | ${band.disagreementCount} | ${band.accuracy}% | ${band.partialAccuracy}% |\n`;
  }

  // Sentiment bands
  md += `\n## Sentiment Tags\n\n`;
  md += `| Confidence Band | Count | Agree | Partial | Disagree | Accuracy | w/ Partial |\n`;
  md += `|---|---|---|---|---|---|---|\n`;
  for (const band of sentimentBands) {
    md += `| ${band.band} | ${band.totalItems} | ${band.agreementCount} | ${band.partialCount} | ${band.disagreementCount} | ${band.accuracy}% | ${band.partialAccuracy}% |\n`;
  }

  // Recommendations
  md += `\n## Recommendations\n\n`;
  for (const rec of recommendations) {
    md += `### ${rec.category.charAt(0).toUpperCase() + rec.category.slice(1)} Tags\n\n`;
    md += `**Current thresholds:**\n`;
    md += `- Auto-publish: >= ${rec.currentAutoPublishThreshold}\n`;
    md += `- Pending review: ${rec.currentPendingReviewThreshold}-${rec.currentAutoPublishThreshold - 1}\n\n`;

    if (
      rec.recommendedAutoPublishThreshold !== rec.currentAutoPublishThreshold ||
      rec.recommendedPendingReviewThreshold !== rec.currentPendingReviewThreshold
    ) {
      md += `**Recommended adjustment:**\n`;
      md += `- Auto-publish: >= ${rec.recommendedAutoPublishThreshold}\n`;
      md += `- Pending review: ${rec.recommendedPendingReviewThreshold}-${rec.recommendedAutoPublishThreshold - 1}\n\n`;
    }

    md += `**Rationale:** ${rec.rationale}\n\n`;
  }

  return md;
}

// Get filepath from command line
const filepath = process.argv[2];
if (!filepath) {
  console.error('Usage: npm run calibration-report <filepath>');
  console.error('Example: npm run calibration-report hansard-calibration-sample-2026-06-23.csv');
  process.exit(1);
}

analyzeCalibration(filepath).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
