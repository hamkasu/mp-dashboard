/**
 * Fix missing MP IDs in oral answers by matching questioner names to MPs
 * This script re-processes existing oral answers to populate questionerMpId
 */

import { getDb } from '../server/db';
import { parliamentaryOralAnswers, mps, type Mp } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Normalize name for matching
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
}

// Find MP by name
function findMpByName(questionerName: string, allMps: Mp[]): Mp | undefined {
  const normalizedName = normalizeName(questionerName);

  // Try exact match first
  let mp = allMps.find(mp => normalizeName(mp.name) === normalizedName);
  if (mp) return mp;

  // Try partial match
  mp = allMps.find(mp => {
    const mpNormalizedName = normalizeName(mp.name);
    return (
      mpNormalizedName.includes(normalizedName) ||
      normalizedName.includes(mpNormalizedName)
    );
  });

  return mp;
}

async function fixOralAnswerMpIds() {
  const db = getDb();
  if (!db) {
    console.error('❌ Database not available');
    return;
  }

  console.log('🔧 Fixing missing MP IDs in oral answers...\n');

  // Get all MPs
  const allMps = await db.select().from(mps);
  console.log(`📋 Loaded ${allMps.length} MPs\n`);

  // Get all oral answers
  const allAnswers = await db.select().from(parliamentaryOralAnswers);
  console.log(`📋 Found ${allAnswers.length} total oral answers\n`);

  // Find answers with missing MP IDs but have questioner names
  const answersToFix = allAnswers.filter(
    answer => !answer.questionerMpId && answer.questionerName
  );

  console.log(`🔍 Found ${answersToFix.length} oral answers with missing MP IDs\n`);

  let fixed = 0;
  let notFound = 0;

  for (const answer of answersToFix) {
    // Extract name without constituency
    const nameMatch = answer.questionerName!.match(/^([^[\]]+)/);
    const cleanName = nameMatch ? nameMatch[1].trim() : answer.questionerName!;

    const mp = findMpByName(cleanName, allMps);

    if (mp) {
      await db
        .update(parliamentaryOralAnswers)
        .set({
          questionerMpId: mp.id,
          updatedAt: new Date(),
        })
        .where(eq(parliamentaryOralAnswers.id, answer.id));

      fixed++;
      console.log(`✅ Fixed: "${answer.questionerName}" → ${mp.name} [${mp.constituency}]`);
    } else {
      notFound++;
      console.log(`❌ Not found: "${answer.questionerName}"`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Total to fix: ${answersToFix.length}`);
  console.log(`   ✅ Fixed: ${fixed}`);
  console.log(`   ❌ Not found: ${notFound}`);
  console.log(`   Success rate: ${((fixed / answersToFix.length) * 100).toFixed(1)}%`);
}

fixOralAnswerMpIds()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
