/**
 * Copyright by Calmic Sdn Bhd
 * Script to update MP roles with cabinet positions (Ministers/Deputy Ministers)
 */

import { db } from '../server/db';
import { mps } from '../shared/schema';
import { ilike, or } from 'drizzle-orm';

// Cabinet Ministers (as of latest update - 2025)
// NOTE: Updated ministerial list based on current cabinet composition
// NOTE: 6 Cabinet members are Senators (Dewan Negara), not MPs, and are excluded from this update:
// Ministers (Senators):
// - Zambry Abdul Kadir (Minister of Higher Education)
// - Amir Hamzah Azizan (Second Finance Minister)
// - Zulkifli Hasan (Minister in PM's Department - Religious Affairs)
// - Saifuddin Nasution Ismail (Minister of Home Affairs) - Not found in MP database
// Deputy Ministers (Senators):
// - Fuziah Salleh (Deputy Minister of Domestic Trade & Cost of Living)
// - Marhamah Rosli (Deputy Minister in PM's Department - Religious Affairs) - Not found in MP database
const ministers = [
  { name: "Anwar Ibrahim", role: "Prime Minister & Minister of Finance" },
  { name: "Ahmad Zahid Hamidi", role: "Deputy Prime Minister I & Minister of Rural & Regional Development" },
  { name: "Fadillah Yusof", role: "Deputy Prime Minister II & Minister of Energy Transition & Water Transformation" },
  { name: "Azalina Othman", role: "Minister in PM's Department (Law & Institutional Reform)" },
  { name: "Hannah Yeoh Tseow Suan", role: "Minister in PM's Department (Federal Territories)" },
  { name: "Mustapha Sakmud", role: "Minister in PM's Department (Sabah & Sarawak Affairs)" },
  { name: "Loke Siew Fook", role: "Minister of Transport" },
  { name: "Mohamad Sabu", role: "Minister of Agriculture & Food Security" },
  { name: "Nga Kor Ming", role: "Minister of Housing & Local Government" },
  { name: "Mohamad Hasan", role: "Minister of Foreign Affairs" },
  { name: "Aaron Ago Anak Dagang", role: "Minister of Unity" },
  { name: "Armizan Ali", role: "Minister of Domestic Trade & Cost of Living" },
  { name: "Johari Ghani", role: "Minister of Investment, Trade & Industry" },
  { name: "Alexander Nanta Linggi", role: "Minister of Works" },
  { name: "Mohamed Khaled Nordin", role: "Minister of Defence" },
  { name: "Chang Lih Kang", role: "Minister of Science, Technology & Innovation" },
  { name: "Gobind Singh Deo", role: "Minister of Digital" },
  { name: "Dzulkefly Ahmad", role: "Minister of Health" },
  { name: "Nancy Shukri", role: "Minister of Women, Family & Community Development" },
  { name: "Tiong King Sing", role: "Minister of Tourism, Arts & Culture" },
  { name: "Fahmi Fadzil", role: "Minister of Communications" },
  { name: "Fadhlina Sidek", role: "Minister of Education" },
  { name: "Steven Sim Chee Keong", role: "Minister of Entrepreneur Development & Cooperatives" },
  { name: "Akmal Nasrullah Mohd Nasir", role: "Minister of Economy" },
  { name: "Arthur Joseph Kurup", role: "Minister of Natural Resources & Environmental Sustainability" },
  { name: "Noraini Ahmad", role: "Minister of Plantation & Commodities" },
  { name: "R Ramanan", role: "Minister of Human Resources" },
  { name: "Mohammed Taufiq Johari", role: "Minister of Youth & Sports" },
];

// Deputy Ministers
const deputyMinisters = [
  { name: "M. Kulasegaran", role: "Deputy Minister in PM's Department (Law & Institutional Reform)" },
  { name: "Lo Su Fui", role: "Deputy Minister in PM's Department (Federal Territories)" },
  { name: "Liew Chin Tong", role: "Deputy Minister of Finance" },
  { name: "Rubiah Wang", role: "Deputy Minister of Rural & Regional Development" },
  { name: "Abdul Rahman Mohamad", role: "Deputy Minister of Energy Transition & Water Transformation" },
  { name: "Hasbi Haji Habibollah", role: "Deputy Minister of Transport" },
  { name: "Chan Foong Hin", role: "Deputy Minister of Agriculture & Food Security" },
  { name: "Aiman Athirah Sabu", role: "Deputy Minister of Housing & Local Government" },
  { name: "Lukanisman Awang Sauni", role: "Deputy Minister of Foreign Affairs" },
  { name: "R Yuneswaran", role: "Deputy Minister of Unity" },
  { name: "Sim Tze Tzin", role: "Deputy Minister of Investment, Trade & Industry" },
  { name: "Ahmad Haji Maslan", role: "Deputy Minister of Works" },
  { name: "Shamsul Anuar Haji Nasarah", role: "Deputy Minister of Home Affairs" },
  { name: "Adly Zahari", role: "Deputy Minister of Defence" },
  { name: "Yusof Apdal", role: "Deputy Minister of Science, Technology & Innovation" },
  { name: "Ugak Anak Kumbong", role: "Deputy Minister of Digital" },
  { name: "Hanifah Hajar Taib", role: "Deputy Minister of Health" },
  { name: "Lim Hui Ying", role: "Deputy Minister of Women, Family & Community Development" },
  { name: "Adam Adli", role: "Deputy Minister of Higher Education" },
  { name: "Chiew Choon Man", role: "Deputy Minister of Tourism, Arts & Culture" },
  { name: "Teo Nie Ching", role: "Deputy Minister of Communications" },
  { name: "Wong Kah Woh", role: "Deputy Minister of Education" },
  { name: "Mohamad Alamin", role: "Deputy Minister of Entrepreneur Development & Cooperatives" },
  { name: "Shahar Abdullah", role: "Deputy Minister of Economy" },
  { name: "Syed Ibrahim Syed Noh", role: "Deputy Minister of Natural Resources & Environmental Sustainability" },
  { name: "Huang Tiong Sii", role: "Deputy Minister of Plantation & Commodities" },
  { name: "Khairul Firdaus Akbar Khan", role: "Deputy Minister of Human Resources" },
  { name: "Mordi Bimol", role: "Deputy Minister of Youth & Sports" },
];

async function updateCabinetRoles() {
  if (!db) {
    console.error("Database not connected");
    process.exit(1);
  }

  console.log("🔄 Updating cabinet roles for Ministers and Deputy Ministers...\n");

  // Step 1: Clear all existing cabinet roles and minister flags to prevent misassignments
  console.log("📝 Clearing all existing cabinet roles, flags, and salaries...");
  const { sql } = await import('drizzle-orm');
  const clearResult = await db
    .update(mps)
    .set({
      role: null,
      isMinister: false,
      isDeputyMinister: false,
      ministerSalary: 0
    })
    .where(sql`${mps.role} IS NOT NULL AND (${mps.role} LIKE '%Minister%' OR ${mps.role} LIKE '%Prime Minister%')`);
  console.log("✓ Cleared existing cabinet roles, flags, and salaries\n");

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
        // Update the role and minister flags/salary
        const { eq } = await import('drizzle-orm');

        // Determine if this is a minister or deputy minister
        const isMinisterRole = ministers.some(m => m.name === member.name);
        const isDeputyMinisterRole = deputyMinisters.some(m => m.name === member.name);

        // Calculate ministerial salary (after 20% voluntary paycut)
        let ministerSalary = 0;
        const roleLower = member.role.toLowerCase();
        if (roleLower.includes("prime minister") && !roleLower.includes("deputy")) {
          ministerSalary = 0; // PM takes no salary
        } else if (roleLower.includes("deputy prime minister")) {
          ministerSalary = 18168.15;
        } else if (roleLower.includes("deputy minister")) {
          ministerSalary = 10847.65;
        } else if (roleLower.includes("minister")) {
          ministerSalary = 14907.20;
        }

        await db
          .update(mps)
          .set({
            role: member.role,
            isMinister: isMinisterRole,
            isDeputyMinister: isDeputyMinisterRole,
            ministerSalary: ministerSalary
          })
          .where(eq(mps.id, bestMatch.id));

        console.log(`✅ ${member.name} → ${bestMatch.name}: ${member.role} (RM ${ministerSalary.toFixed(2)})`);
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
  console.log(`\n   Note: 6 cabinet members are Senators (not MPs) and excluded from this update:`);
  console.log(`   Ministers:`);
  console.log(`   - Zambry Abdul Kadir (Minister of Higher Education)`);
  console.log(`   - Amir Hamzah Azizan (Second Finance Minister)`);
  console.log(`   - Zulkifli Hasan (Minister in PM's Department - Religious Affairs)`);
  console.log(`   - Saifuddin Nasution Ismail (Minister of Home Affairs)`);
  console.log(`   Deputy Ministers:`);
  console.log(`   - Fuziah Salleh (Deputy Minister of Domestic Trade & Cost of Living)`);
  console.log(`   - Marhamah Rosli (Deputy Minister in PM's Department - Religious Affairs)`);

  process.exit(0);
}

updateCabinetRoles().catch(console.error);
