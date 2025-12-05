/**
 * Script to update MP record when an MP has passed away
 * Updates termEndDate and adds a note to the role field
 */

import { getDb } from '../server/db';
import { mps } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function updateDeceasedMP() {
  const db = getDb();
  if (!db) {
    console.error('❌ Database not available');
    return;
  }

  const constituency = 'Kinabatangan';
  const mpName = 'Bung Moktar Radin';
  const dateOfPassing = new Date('2025-12-05'); // Update this date as needed

  console.log(`\n🔄 Updating record for ${mpName} (${constituency})`);
  console.log(`   Date of passing: ${dateOfPassing.toISOString().split('T')[0]}\n`);

  try {
    // Find the MP
    const [mp] = await db.select()
      .from(mps)
      .where(eq(mps.constituency, constituency));

    if (!mp) {
      console.error(`❌ MP not found for constituency: ${constituency}`);
      return;
    }

    console.log(`✓ Found MP: ${mp.name}`);
    console.log(`  Current termEndDate: ${mp.termEndDate || 'Not set'}`);

    // Update the MP record
    const [updatedMp] = await db.update(mps)
      .set({
        termEndDate: dateOfPassing,
        role: 'Former Member of Parliament (Deceased)',
      })
      .where(eq(mps.constituency, constituency))
      .returning();

    console.log(`\n✅ Successfully updated record for ${updatedMp.name}`);
    console.log(`   Term End Date: ${updatedMp.termEndDate?.toISOString().split('T')[0]}`);
    console.log(`   Role: ${updatedMp.role}`);
    console.log(`\nNote: This MP will still appear in historical records but marked as former MP.`);

  } catch (error: any) {
    console.error(`\n❌ Error updating MP record: ${error.message}`);
    throw error;
  }
}

updateDeceasedMP()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
