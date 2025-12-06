/**
 * Add Sarawak DUN Speaker and Deputy Speaker
 * Speaker: Mohamad Asfia Awang Nassar (no constituency)
 * Deputy Speaker: Muara Tuang DUN member
 */

import { db } from '../server/db';
import { dunMembers } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

async function addSarawakSpeaker() {
  console.log('Starting Sarawak DUN Speaker and Deputy Speaker setup...');

  try {
    // Check if Speaker already exists
    const existingSpeaker = await db
      .select()
      .from(dunMembers)
      .where(and(
        eq(dunMembers.state, 'Sarawak'),
        eq(dunMembers.role, 'Speaker')
      ))
      .limit(1);

    if (existingSpeaker.length > 0) {
      console.log('✓ Speaker already exists. Skipping...');
    } else {
      // Add Speaker: Mohamad Asfia Awang Nassar
      console.log('Adding Speaker: Mohamad Asfia Awang Nassar...');

      await db.insert(dunMembers).values({
        state: 'Sarawak',
        constituencyCode: null, // Speaker has no constituency
        constituencyName: null,
        name: 'Mohamad Asfia Awang Nassar',
        title: 'YB Datuk',
        party: null, // Speaker is neutral
        role: 'Speaker',
        photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Mohamad_Asfia_Awang_Nassar.jpg/220px-Mohamad_Asfia_Awang_Nassar.jpg',
        detailUrl: 'https://en.wikipedia.org/wiki/Mohamad_Asfia_Awang_Nassar',
        // Speaker salary and allowances
        baseSalary: 30000, // RM 30,000 fixed monthly salary
        serviceAllowance: 0,
        constituencyAllowance: 15000, // RM 15,000 ordinary ADUN allowance
        sittingAllowance: 450,
        travelAllowance: 2000,
        entertainmentAllowance: 1500,
        housingAllowance: 3000,
        speakerAllowance: 15000, // Additional allowances (est. RM 10,000-20,000)
        totalMonthlyAllowance: 65000, // Total: ~RM 55,000-65,000
      });

      console.log('✓ Successfully added Speaker');
    }

    // Find and update Deputy Speaker (Muara Tuang DUN)
    console.log('Updating Deputy Speaker (Muara Tuang DUN)...');

    const muaraTuangMember = await db
      .select()
      .from(dunMembers)
      .where(and(
        eq(dunMembers.state, 'Sarawak'),
        eq(dunMembers.constituencyName, 'MUARA TUANG')
      ))
      .limit(1);

    if (muaraTuangMember.length === 0) {
      console.warn('⚠ Muara Tuang DUN member not found. Skipping Deputy Speaker update.');
    } else {
      const member = muaraTuangMember[0];

      // Deputy Speaker gets additional allowances
      // Based on the table: Fixed Monthly Salary RM 21,000, Ordinary ADUN Allowance RM 15,000
      // Total Core Monthly: RM 36,000, plus allowances (est. RM 10,000-20,000)
      // Total: ~RM 46,000-56,000

      await db
        .update(dunMembers)
        .set({
          role: 'Deputy Speaker',
          baseSalary: 21000, // RM 21,000 fixed monthly salary for Deputy Speaker
          constituencyAllowance: 15000, // RM 15,000 ordinary ADUN allowance
          speakerAllowance: 15000, // Additional allowances (est. RM 10,000-20,000)
          totalMonthlyAllowance: 56000, // Total: ~RM 46,000-56,000
          updatedAt: new Date(),
        })
        .where(eq(dunMembers.id, member.id));

      console.log(`✓ Successfully updated ${member.name} as Deputy Speaker`);
    }

    console.log('\n✓ Script completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error);
    process.exit(1);
  }
}

addSarawakSpeaker();
