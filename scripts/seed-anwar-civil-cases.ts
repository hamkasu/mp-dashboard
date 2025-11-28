/**
 * Script to seed known civil lawsuit cases for Anwar Ibrahim
 * Run with: npx tsx scripts/seed-anwar-civil-cases.ts
 */

import { getDb } from "../server/db";
import { mps, courtCases } from "../shared/schema";
import { eq } from "drizzle-orm";

async function seedAnwarCivilCases() {
  console.log("[Seed] Starting civil case seeding for Anwar Ibrahim...");
  
  const db = getDb();
  
  // Find Anwar Ibrahim's MP record by constituency (Tambun)
  let anwarRecords = await db.select()
    .from(mps)
    .where(eq(mps.constituency, "Tambun"));
  
  if (anwarRecords.length === 0) {
    console.error("[Seed] ERROR: Could not find MP with constituency 'Tambun' (Anwar Ibrahim)");
    console.log("[Seed] Trying to find by name...");
    
    anwarRecords = await db.select()
      .from(mps)
      .where(eq(mps.name, "DATO' SERI ANWAR BIN IBRAHIM"));
    
    if (anwarRecords.length === 0) {
      console.error("[Seed] ERROR: Could not find Anwar Ibrahim in the database");
      process.exit(1);
    }
  }
  
  const anwar = anwarRecords[0];
  console.log(`[Seed] Found Anwar Ibrahim: ID=${anwar.id}, Constituency=${anwar.constituency}`);
  
  // Define the two civil cases
  const civilCases = [
    {
      mpId: anwar.id,
      caseNumber: "CIVIL-SUIT-2021-RAWTHER",
      title: "Yusoff Rawther Sexual Assault Civil Suit",
      courtLevel: "High Court",
      status: "Ongoing",
      caseType: "civil",
      filingDate: new Date("2021-07-01"),
      charges: "Muhammed Yusoff Rawther, a former research assistant, filed a civil suit claiming sexual assault by Anwar Ibrahim on October 2, 2018. Anwar denies the allegations and filed a counterclaim. Case is paused pending Federal Court review of PM immunity questions.",
      outcome: "Appeal pending - Court of Appeal granted stay on July 21, 2025",
      documentLinks: [
        "https://www.thevibes.com/articles/news/108986/anwar-to-appeal-high-court-decision-dismissing-bid-to-refer-immunity-questions-to-federal-court",
        "https://theedgemalaysia.com/node/763348"
      ]
    },
    {
      mpId: anwar.id,
      caseNumber: "SUIT-WA-22-NC-227-05/2023",
      title: "Dr Mahathir RM150 Million Defamation Suit",
      courtLevel: "High Court",
      status: "Ongoing",
      caseType: "civil",
      filingDate: new Date("2023-05-03"),
      charges: "Former PM Dr Mahathir Mohamad sued Anwar for RM150 million over statements made at a PKR congress on March 18, 2023, calling him a racist and accusing him of enriching his family while in office. Mahathir seeks RM100 million exemplary damages, RM50 million general damages, written apology, and press conference retraction.",
      outcome: "Trial ongoing - October 2025 hearing adjourned due to Mahathir's health",
      documentLinks: [
        "https://www.malaymail.com/news/malaysia/2023/10/02/high-court-dismisses-dr-mahathirs-bid-for-documents-in-rm150m-defamation-suit-against-anwar/93961",
        "https://www.freemalaysiatoday.com/category/nation/2025/08/18/dr-ms-defamation-suit-against-anwar-fixed-for-october"
      ]
    }
  ];
  
  for (const caseData of civilCases) {
    try {
      // Check if case already exists
      const existing = await db.select()
        .from(courtCases)
        .where(eq(courtCases.caseNumber, caseData.caseNumber));
      
      if (existing.length > 0) {
        console.log(`[Seed] Case ${caseData.caseNumber} already exists, skipping...`);
        continue;
      }
      
      // Insert the case
      await db.insert(courtCases).values(caseData);
      console.log(`[Seed] Successfully added: ${caseData.title}`);
    } catch (error) {
      console.error(`[Seed] Error adding case ${caseData.caseNumber}:`, error);
    }
  }
  
  console.log("[Seed] Civil case seeding completed!");
  process.exit(0);
}

seedAnwarCivilCases().catch((error) => {
  console.error("[Seed] Fatal error:", error);
  process.exit(1);
});
