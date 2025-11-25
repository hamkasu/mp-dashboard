/**
 * Copyright by Calmic Sdn Bhd
 * Script to update MP roles with cabinet positions (Ministers/Deputy Ministers)
 */

import { db } from '../server/db';
import { mps } from '../shared/schema';
import { ilike, or } from 'drizzle-orm';

// Cabinet Ministers (as of December 2023 reshuffle)
// NOTE: 3 Ministers are Senators (Dewan Negara), not MPs, and are excluded from this update:
// - Tengku Zafrul (Minister of Investment, Trade & Industry)
// - Zambry Abd Kadir (Minister of Higher Education)
// - Amir Hamzah Azizan (Minister of Finance II)
const ministers = [
  { name: "Anwar Ibrahim", role: "Prime Minister & Minister of Finance" },
  { name: "Ahmad Zahid Hamidi", role: "Deputy Prime Minister, Minister of Rural & Regional Development" },
  { name: "Fadillah Yusof", role: "Deputy Prime Minister, Minister of Energy Transition & Public Utilities" },
  { name: "Rafizi Ramli", role: "Minister of Economy" },
  { name: "Nik Nazmi", role: "Minister of Natural Resources & Sustainability" },
  { name: "Mohamad Hasan", role: "Minister of Foreign Affairs" },
  { name: "Mohamed Khaled Nordin", role: "Minister of Defence" },
  { name: "Saifuddin Nasution", role: "Minister of Home Affairs" },
  { name: "Dzulkefly Ahmad", role: "Minister of Health" },
  { name: "Fadhlina Sidek", role: "Minister of Education" },
  { name: "Loke Siew Fook", role: "Minister of Transport" },
  { name: "Alexander Nanta Linggi", role: "Minister of Works" },
  { name: "Nga Kor Ming", role: "Minister of Local Government Development" },
  { name: "Mohamad Sabu", role: "Minister of Agriculture & Food Securities" },
  { name: "Hannah Yeoh", role: "Minister of Youth & Sports" },
  { name: "Nancy Shukri", role: "Minister of Women, Family & Community Development" },
  { name: "Gobind Singh Deo", role: "Minister of Digital" },
  { name: "Ahmad Fahmi Mohamed Fadzil", role: "Minister of Communications" },
  { name: "Sim Chee Keong", role: "Minister of Human Resources" },
  { name: "Chang Lih Kang", role: "Minister of Science, Technology & Innovation" },
  { name: "Tiong King Sing", role: "Minister of Tourism, Arts & Culture" },
  { name: "Johari Abdul Ghani", role: "Minister of Plantation & Commodities" },
  { name: "Ewon Benedick", role: "Minister of Entrepreneur Development & Cooperatives" },
  { name: "Armizan Mohd Ali", role: "Minister of Domestic Trade & Cost of Living" },
  { name: "Azalina Othman", role: "Minister in PM's Department (Law & Institutional Reform)" },
  { name: "Mohd Na'im Mokhtar", role: "Minister in PM's Department (Religious Affairs)" },
  { name: "Zaliha Mustafa", role: "Minister in PM's Department (Federal Territories)" },
  { name: "Aaron Ago Dagang", role: "Minister of Unity" },
];

// Deputy Ministers
const deputyMinisters = [
  { name: "Lim Hui Ying", role: "Deputy Minister of Finance" },
  { name: "Rubiah Wang", role: "Deputy Minister of Rural & Regional Development" },
  { name: "Akmal Nasrullah", role: "Deputy Minister of Energy Transition & Public Utilities" },
  { name: "Hasbi Habibollah", role: "Deputy Minister of Transport" },
  { name: "Arthur Joseph Kurup", role: "Deputy Minister of Agriculture & Food Securities" },
  { name: "Hanifah Hajar Taib", role: "Deputy Minister of Economy" },
  { name: "Aiman Athirah", role: "Deputy Minister of Local Government Development" },
  { name: "Mohamad Alamin", role: "Deputy Minister of Foreign Affairs" },
  { name: "Ahmad Maslan", role: "Deputy Minister of Works" },
  { name: "Shamsul Anuar", role: "Deputy Minister of Home Affairs" },
  { name: "Liew Chin Tong", role: "Deputy Minister of Investment, Trade & Industry" },
  { name: "Adly Zahari", role: "Deputy Minister of Defence" },
  { name: "Mohammad Yusof Apdal", role: "Deputy Minister of Science, Technology & Innovation" },
  { name: "Noraini Ahmad", role: "Deputy Minister of Women, Family & Community Development" },
  { name: "Kulasegaran", role: "Deputy Minister in PM's Department (Law & Institutional Reform)" },
  { name: "Huang Tiong Sii", role: "Deputy Minister of Natural Resources & Sustainability" },
  { name: "Ramanan", role: "Deputy Minister of Entrepreneur Development & Cooperatives" },
  { name: "Mustapha Sakmud", role: "Deputy Minister of Higher Education" },
  { name: "Khairul Firdaus Akbar Khan", role: "Deputy Minister of Tourism, Arts & Culture" },
  { name: "Teo Nie Ching", role: "Deputy Minister of Communications" },
  { name: "Wong Kah Woh", role: "Deputy Minister of Education" },
  { name: "Saraswathy Kandasami", role: "Deputy Minister of Unity" },
  { name: "Zulkifli Hassan", role: "Deputy Minister in PM's Department (Religious Affairs)" },
  { name: "Adam Adli", role: "Deputy Minister of Youth & Sports" },
  { name: "Fuziah Salleh", role: "Deputy Minister of Domestic Trade & Cost of Living" },
  { name: "Chan Foon Hin", role: "Deputy Minister of Plantation & Commodities" },
  { name: "Lukanisman Awang Sauni", role: "Deputy Minister of Health" },
  { name: "Ugak Anak Kumbong", role: "Deputy Minister of Digital" },
  { name: "Abdul Rahman Mohamad", role: "Deputy Minister of Human Resources" },
];

async function updateCabinetRoles() {
  if (!db) {
    console.error("Database not connected");
    process.exit(1);
  }

  console.log("🔄 Updating cabinet roles for Ministers and Deputy Ministers...\n");

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

      for (const mp of matchingMps) {
        const mpNameLower = mp.name.toLowerCase();
        let score = 0;
        for (const term of searchTerms) {
          if (mpNameLower.includes(term.toLowerCase())) {
            score++;
          }
        }
        if (score > bestScore) {
          bestScore = score;
          bestMatch = mp;
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
  console.log(`\n   Note: 3 cabinet members are Senators (not MPs) and excluded from this update:`);
  console.log(`   - Tengku Zafrul (Minister of Investment, Trade & Industry)`);
  console.log(`   - Zambry Abd Kadir (Minister of Higher Education)`);
  console.log(`   - Amir Hamzah Azizan (Minister of Finance II)`);

  process.exit(0);
}

updateCabinetRoles().catch(console.error);
