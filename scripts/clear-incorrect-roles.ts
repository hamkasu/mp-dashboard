/**
 * Copyright by Calmic Sdn Bhd
 * Script to clear incorrect cabinet role assignments
 */

import { db } from '../server/db';
import { mps } from '../shared/schema';
import { ilike } from 'drizzle-orm';

// MPs who incorrectly have cabinet roles assigned
const incorrectAssignments = [
  "Abdul Ghani Ahmad", // Incorrectly matched with Johari Abdul Ghani
];

async function clearIncorrectRoles() {
  if (!db) {
    console.error("Database not connected");
    process.exit(1);
  }

  console.log("🔄 Clearing incorrect cabinet role assignments...\n");

  let cleared = 0;
  let notFound = 0;

  for (const name of incorrectAssignments) {
    try {
      const { eq } = await import('drizzle-orm');
      const matchingMps = await db
        .select()
        .from(mps)
        .where(ilike(mps.name, `%${name}%`))
        .limit(1);

      if (matchingMps.length > 0) {
        const mp = matchingMps[0];

        // Only clear if they have a cabinet role
        if (mp.role && (mp.role.includes('Minister') || mp.role.includes('Prime Minister'))) {
          await db
            .update(mps)
            .set({ role: null })
            .where(eq(mps.id, mp.id));

          console.log(`✅ Cleared role for: ${mp.name} (was: ${mp.role})`);
          cleared++;
        } else {
          console.log(`ℹ️  ${mp.name} has no cabinet role to clear`);
        }
      } else {
        console.log(`❌ Not found: ${name}`);
        notFound++;
      }
    } catch (error) {
      console.error(`Error clearing role for ${name}:`, error);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Cleared: ${cleared}`);
  console.log(`   Not found: ${notFound}`);
  console.log(`   Total attempted: ${incorrectAssignments.length}`);

  process.exit(0);
}

clearIncorrectRoles().catch(console.error);
