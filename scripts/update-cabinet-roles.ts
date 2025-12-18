/**
 * Copyright by Calmic Sdn Bhd
 * Script to update MP roles with cabinet positions (Ministers/Deputy Ministers)
 */

import { db } from '../server/db';
import { mps } from '../shared/schema';
import { ilike, or } from 'drizzle-orm';

// Cabinet Ministers (as of December 2025 reshuffle)
// NOTE: Major reshuffle announced on December 16, 2025
// NOTE: Dropped ministers - Mohd Rafizi Ramli (resigned May 2025), Zaliha Mustafa, Mohd Na'im Mokhtar
// NOTE: 4 Cabinet members are Senators (Dewan Negara), not MPs, and are excluded from this update:
// Ministers (Senators):
// - Zambry Abd Kadir (Minister of Higher Education)
// - Amir Hamzah Azizan (Minister of Finance II)
// Deputy Ministers (Senators):
// - Zulkifli Hasan (Deputy Minister in PM's Department - Religious Affairs)
// - Fuziah Salleh (Deputy Minister of Domestic Trade & Cost of Living)
const ministers = [
  { name: "Anwar Ibrahim", role: "Prime Minister & Minister of Finance" },
  { name: "Ahmad Zahid Hamidi", role: "Deputy Prime Minister, Minister of Rural & Regional Development" },
  { name: "Fadillah Yusof", role: "Deputy Prime Minister, Minister of Energy Transition & Water Transformation" },
  { name: "Akmal Nasrullah Mohd Nasir", role: "Minister of Economy" },
  { name: "Arthur Joseph Kurup", role: "Minister of Natural Resources & Environmental Sustainability" },
  { name: "Mohamad Hasan", role: "Minister of Foreign Affairs" },
  { name: "Mohamed Khaled Nordin", role: "Minister of Defence" },
  { name: "Saifuddin Nasution Ismail", role: "Minister of Home Affairs" },
  { name: "Dzulkefly Ahmad", role: "Minister of Health" },
  { name: "Fadhlina Sidek", role: "Minister of Education" },
  { name: "Loke Siew Fook", role: "Minister of Transport" },
  { name: "Alexander Nanta Linggi", role: "Minister of Works" },
  { name: "Nga Kor Ming", role: "Minister of Housing & Local Government" },
  { name: "Mohamad Sabu", role: "Minister of Agriculture & Food Security" },
  { name: "Mohammed Taufiq Johari", role: "Minister of Youth & Sports" },
  { name: "Nancy Shukri", role: "Minister of Women, Family & Community Development" },
  { name: "Gobind Singh Deo", role: "Minister of Digital" },
  { name: "Ahmad Fahmi Mohamed Fadzil", role: "Minister of Communications" },
  { name: "Ramanan Ramakrishnan", role: "Minister of Human Resources" },
  { name: "Chang Lih Kang", role: "Minister of Science, Technology & Innovation" },
  { name: "Tiong King Sing", role: "Minister of Tourism, Arts & Culture" },
  { name: "Noraini Ahmad", role: "Minister of Plantation & Commodities" },
  { name: "Johari Abdul Ghani", role: "Minister of Investment, Trade & Industry" },
  { name: "Armizan Mohd Ali", role: "Minister of Domestic Trade & Cost of Living" },
  { name: "Steven Sim Chee Keong", role: "Minister of Entrepreneur Development & Cooperatives" },
  { name: "Azalina Othman", role: "Minister in PM's Department (Law & Institutional Reform)" },
  { name: "Hannah Yeoh Tseow Suan", role: "Minister in PM's Department (Federal Territories)" },
  { name: "Aaron Ago Anak Dagang", role: "Minister of Unity" },
];

// Deputy Ministers
const deputyMinisters = [
  { name: "Liew Chin Tong", role: "Deputy Minister of Finance" },
  { name: "Rubiah Wang", role: "Deputy Minister of Rural & Regional Development" },
  { name: "Abdul Rahman Haji Mohamad", role: "Deputy Minister of Energy Transition & Water Transformation" },
  { name: "Hasbi Haji Habibollah", role: "Deputy Minister of Transport" },
  { name: "Chan Foong Hin", role: "Deputy Minister of Agriculture & Food Security" },
  { name: "Shahar Abdullah", role: "Deputy Minister of Economy" },
  { name: "Aiman Athirah Sabu", role: "Deputy Minister of Housing & Local Government" },
  { name: "Lukanisman Awang Sauni", role: "Deputy Minister of Foreign Affairs" },
  { name: "Ahmad Haji Maslan", role: "Deputy Minister of Works" },
  { name: "Shamsul Anuar Haji Nasarah", role: "Deputy Minister of Home Affairs" },
  { name: "Sim Tze Tzin", role: "Deputy Minister of Investment, Trade & Industry" },
  { name: "Adly Zahari", role: "Deputy Minister of Defence" },
  { name: "Mohammad Yusof Apdal", role: "Deputy Minister of Science, Technology & Innovation" },
  { name: "Noraini Ahman", role: "Deputy Minister of Women, Family & Community Development" },
  { name: "M. Kulasegaran", role: "Deputy Minister in PM's Department (Law & Institutional Reform)" },
  { name: "Syed Ibrahim Syed Noh", role: "Deputy Minister of Natural Resources & Environmental Sustainability" },
  { name: "Mohamad Alamin", role: "Deputy Minister of Entrepreneur Development & Cooperatives" },
  { name: "Adam Adli Abd Halim", role: "Deputy Minister of Higher Education" },
  { name: "Chiew Choon Man", role: "Deputy Minister of Tourism, Arts & Culture" },
  { name: "Teo Nie Ching", role: "Deputy Minister of Communications" },
  { name: "Wong Kah Woh", role: "Deputy Minister of Education" },
  { name: "Yuneswaran Ramaraj", role: "Deputy Minister of Unity" },
  { name: "Mordi Bimol", role: "Deputy Minister of Youth & Sports" },
  { name: "Huang Tiong Sii", role: "Deputy Minister of Plantation & Commodities" },
  { name: "Hanifah Hajar Taib", role: "Deputy Minister of Health" },
  { name: "Ugak Anak Kumbong", role: "Deputy Minister of Digital" },
  { name: "Khairul Firdaus Akbar Khan", role: "Deputy Minister of Human Resources" },
];

async function updateCabinetRoles() {
  if (!db) {
    console.error("Database not connected");
    process.exit(1);
  }

  console.log("🔄 Updating cabinet roles for Ministers and Deputy Ministers...\n");

  // Step 1: Clear all existing cabinet roles to prevent misassignments
  console.log("📝 Clearing all existing cabinet roles...");
  const { sql } = await import('drizzle-orm');
  const clearResult = await db
    .update(mps)
    .set({ role: null })
    .where(sql`${mps.role} IS NOT NULL AND (${mps.role} LIKE '%Minister%' OR ${mps.role} LIKE '%Prime Minister%')`);
  console.log("✓ Cleared existing cabinet roles\n");

  const allCabinet = [...ministers, ...deputyMinisters];
  let updated = 0;
  let notFound = 0;

  for (const member of allCabinet) {
    try {
      // Search for MP by name (partial match)
      const searchTerms = member.name.split(" ").filter(t => t.length > 2);

      const matchingMps = await db
        .select()
        .from(mps)
        .where(
          or(
            ...searchTerms.map(term => ilike(mps.name, `%${term}%`))
          )
        )
        .limit(5);

      // Find best match (name contains most search terms)
      let bestMatch = null;
      let bestScore = 0;
      let bestMatchPercentage = 0;

      for (const mp of matchingMps) {
        const mpNameLower = mp.name.toLowerCase();

        // PARTY FILTER: Opposition parties cannot be in Unity Government cabinet
        const oppositionParties = ['PN', 'MUDA', 'WARISAN', 'BEBAS'];
        if (oppositionParties.includes(mp.party)) {
          console.log(`⚠️  Skipping opposition party member: ${mp.name} (${mp.party}) for ${member.name}`);
          continue;
        }

        let score = 0;
        for (const term of searchTerms) {
          if (mpNameLower.includes(term.toLowerCase())) {
            score++;
          }
        }

        // Calculate match percentage
        const matchPercentage = score / searchTerms.length;

        // Only consider if it matches at least 66% of terms (at least 2/3)
        // AND has the highest score so far
        if (matchPercentage >= 0.66 && score > bestScore) {
          bestScore = score;
          bestMatchPercentage = matchPercentage;
          bestMatch = mp;
        } else if (matchPercentage >= 0.66 && score === bestScore) {
          // If same score, prefer the one with more matching terms relative to MP name length
          const currentMpTerms = mp.name.split(" ").filter(t => t.length > 2).length;
          const bestMatchTerms = bestMatch ? bestMatch.name.split(" ").filter(t => t.length > 2).length : 0;

          if (currentMpTerms <= bestMatchTerms) {
            bestMatch = mp;
          }
        }
      }

      if (bestMatch && bestScore >= Math.min(2, searchTerms.length)) {
        // Update the role
        const { eq } = await import('drizzle-orm');
        await db
          .update(mps)
          .set({ role: member.role })
          .where(eq(mps.id, bestMatch.id));

        console.log(`✅ ${member.name} → ${bestMatch.name}: ${member.role}`);
        updated++;
      } else {
        console.log(`❌ Not found: ${member.name}`);
        notFound++;
      }
    } catch (error) {
      console.error(`Error updating ${member.name}:`, error);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Not found: ${notFound}`);
  console.log(`   Total attempted: ${allCabinet.length}`);
  console.log(`\n   Note: 4 cabinet members are Senators (not MPs) and excluded from this update:`);
  console.log(`   Ministers:`);
  console.log(`   - Zambry Abd Kadir (Minister of Higher Education)`);
  console.log(`   - Amir Hamzah Azizan (Minister of Finance II)`);
  console.log(`   Deputy Ministers:`);
  console.log(`   - Zulkifli Hasan (Deputy Minister in PM's Department - Religious Affairs)`);
  console.log(`   - Fuziah Salleh (Deputy Minister of Domestic Trade & Cost of Living)`);
  console.log(`\n   Note: December 2025 reshuffle dropped 3 positions:`);
  console.log(`   - Mohd Rafizi Ramli (resigned May 2025)`);
  console.log(`   - Zaliha Mustafa (dropped December 2025)`);
  console.log(`   - Saraswathy Kandasami (dropped December 2025)`);

  process.exit(0);
}

updateCabinetRoles().catch(console.error);
