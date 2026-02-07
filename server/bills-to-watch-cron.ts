/**
 * Copyright by Calmic Sdn Bhd
 *
 * Bills to Watch Cron Job
 * Automatically refreshes Bills to Watch data daily at 3:00 AM MYT
 * Seeds initial data on first run if table is empty
 */

import cron from "node-cron";
import { getDb } from "./db";
import { billsToWatch, bills, type InsertBillToWatch } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

let cronJob: cron.ScheduledTask | null = null;

// Default curated bills data (seeded on first run)
const SEED_BILLS: InsertBillToWatch[] = [
  {
    titleEn: "Political Financing Bill",
    titleMs: "RUU Pembiayaan Politik",
    status: "drafting",
    isFeatured: true,
    icon: "scale",
    tags: ["Reform", "Anti-Corruption", "High Priority"],
    summaryEn: "Landmark reform to regulate party funding, curb money politics, and increase transparency in political donations.",
    summaryMs: "Pembaharuan penting untuk mengawal selia pembiayaan parti, membendung politik wang, dan meningkatkan ketelusan dalam derma politik.",
    detailsEn: `20+ stakeholder sessions completed by BHEUU. Public perception study (IIUM-led) ends late Feb 2026.

Key proposals:
• Mandatory public disclosure of party finances
• Donation caps: RM50k/individual, RM100k/company, RM500k/large groups
• Protect small donor anonymity (disclose donations >RM10k only)
• Possible public funding for parties
• Restrictions to end "donations-for-contracts" perception

Opposition raises concerns about enforcement and fear-of-reprisal for donors.`,
    detailsMs: `20+ sesi pemegang taruh telah selesai oleh BHEUU. Kajian persepsi awam (diketuai IIUM) berakhir akhir Feb 2026.

Cadangan utama:
• Pendedahan mandatori kewangan parti kepada awam
• Had derma: RM50k/individu, RM100k/syarikat, RM500k/kumpulan besar
• Lindungi kerahsiaan penderma kecil (dedahkan derma >RM10k sahaja)
• Kemungkinan pembiayaan awam untuk parti
• Sekatan untuk menamatkan persepsi "derma-untuk-kontrak"

Pembangkang membangkitkan kebimbangan mengenai penguatkuasaan dan ketakutan pembalasan terhadap penderma.`,
    sortOrder: 0,
  },
  {
    titleEn: "Prime Minister Term Limit Bill",
    titleMs: "RUU Had Penggal Perdana Menteri",
    status: "consultation",
    icon: "shield",
    tags: ["Constitutional", "Reform"],
    summaryEn: "Constitutional amendment to limit PM tenure to 2 terms or maximum 10 years. High reform priority; politically sensitive due to power dynamics.",
    summaryMs: "Pindaan perlembagaan untuk mengehadkan tempoh PM kepada 2 penggal atau maksimum 10 tahun. Keutamaan pembaharuan tinggi; sensitif politik kerana dinamik kuasa.",
    sortOrder: 1,
  },
  {
    titleEn: "Attorney-General/Public Prosecutor Separation Bill",
    titleMs: "RUU Pengasingan Peguam Negara/Pendakwa Raya",
    status: "consultation",
    icon: "scale",
    tags: ["Judicial Reform", "Independence"],
    summaryEn: "Split AG's advisory role from prosecution to reduce political interference in legal proceedings. Controversial among legal establishment.",
    summaryMs: "Mengasingkan peranan nasihat Peguam Negara daripada pendakwaan untuk mengurangkan campur tangan politik dalam prosiding undang-undang. Kontroversi dalam kalangan badan kehakiman.",
    sortOrder: 2,
  },
  {
    titleEn: "Ombudsman Bill",
    titleMs: "RUU Ombudsman",
    status: "consultation",
    icon: "search",
    tags: ["Oversight", "Accountability"],
    summaryEn: "Establish independent oversight body to investigate maladministration. Debate expected on scope and independence from executive.",
    summaryMs: "Menubuhkan badan pengawasan bebas untuk menyiasat salah tadbir. Perdebatan dijangka mengenai skop dan kebebasan daripada eksekutif.",
    sortOrder: 3,
  },
  {
    titleEn: "Freedom of Information Bill",
    titleMs: "RUU Kebebasan Maklumat",
    status: "consultation",
    icon: "search",
    tags: ["Transparency", "3R Sensitive"],
    summaryEn: "Enhance transparency and public access to government information. Sensitive regarding national security and 3R (race, religion, royalty) matters.",
    summaryMs: "Meningkatkan ketelusan dan akses awam kepada maklumat kerajaan. Sensitif berkenaan keselamatan negara dan perkara 3R (kaum, agama, raja).",
    sortOrder: 4,
  },
  {
    titleEn: "Urban Renewal Bill 2025 (URA)",
    titleMs: "RUU Pembaharuan Bandar 2025 (URA)",
    status: "pending",
    icon: "building",
    tags: ["Property", "Development"],
    summaryEn: "Stalled bill involving land and property powers. Potential controversy over development rights and landowner protections.",
    summaryMs: "Rang undang-undang tertangguh melibatkan kuasa tanah dan harta. Potensi kontroversi mengenai hak pembangunan dan perlindungan pemilik tanah.",
    sortOrder: 5,
  },
  {
    titleEn: "Mufti (Federal Territories) Bill 2024",
    titleMs: "RUU Mufti (Wilayah Persekutuan) 2024",
    status: "pending",
    icon: "book",
    tags: ["Religious", "3R Sensitive"],
    summaryEn: "Defines authority of religious officials in Federal Territories. Highly sensitive due to 3R implications and moral/faith debates.",
    summaryMs: "Mentakrifkan kuasa pegawai agama di Wilayah Persekutuan. Sangat sensitif kerana implikasi 3R dan perdebatan moral/keimanan.",
    sortOrder: 6,
  },
];

/**
 * Seed initial bills-to-watch data if table is empty
 */
async function seedBillsToWatch(): Promise<number> {
  const db = getDb();
  if (!db) return 0;

  try {
    const existing = await db.select({ id: billsToWatch.id }).from(billsToWatch).limit(1);
    if (existing.length > 0) {
      return 0; // Already has data
    }

    console.log("[Bills to Watch] Seeding initial data...");
    for (const bill of SEED_BILLS) {
      await db.insert(billsToWatch).values(bill);
    }
    console.log(`[Bills to Watch] Seeded ${SEED_BILLS.length} bills`);
    return SEED_BILLS.length;
  } catch (error) {
    console.error("[Bills to Watch] Error seeding data:", error);
    return 0;
  }
}

/**
 * Cross-reference bills_to_watch with scraped bills table to update statuses
 */
async function crossReferenceWithScrapedBills(): Promise<{ matched: number; updated: number }> {
  const db = getDb();
  if (!db) return { matched: 0, updated: 0 };

  const stats = { matched: 0, updated: 0 };

  try {
    const watchedBills = await db.select().from(billsToWatch);
    const scrapedBills = await db.select().from(bills);

    for (const watched of watchedBills) {
      // Try to find a matching scraped bill by title similarity
      const match = scrapedBills.find(scraped => {
        const scrapedTitle = scraped.title.toLowerCase();
        const watchedTitleEn = watched.titleEn.toLowerCase();
        const watchedTitleMs = watched.titleMs.toLowerCase();
        return scrapedTitle.includes(watchedTitleEn) ||
               scrapedTitle.includes(watchedTitleMs) ||
               watchedTitleEn.includes(scrapedTitle) ||
               watchedTitleMs.includes(scrapedTitle);
      });

      if (match) {
        stats.matched++;
        // Map scraped status to our status format
        const mappedStatus = mapScrapedStatus(match.status);
        if (mappedStatus && mappedStatus !== watched.status) {
          await db.update(billsToWatch)
            .set({ status: mappedStatus, updatedAt: new Date() })
            .where(eq(billsToWatch.id, watched.id));
          stats.updated++;
          console.log(`[Bills to Watch] Updated status for "${watched.titleEn}": ${watched.status} -> ${mappedStatus}`);
        }
      }
    }

    return stats;
  } catch (error) {
    console.error("[Bills to Watch] Error cross-referencing bills:", error);
    return stats;
  }
}

/**
 * Map scraped bill status strings to our standardized status values
 */
function mapScrapedStatus(scrapedStatus: string): string | null {
  const s = scrapedStatus.toLowerCase();
  if (s.includes("lulus") || s.includes("passed") || s.includes("approved")) return "passed";
  if (s.includes("jawatankuasa") || s.includes("committee")) return "committee";
  if (s.includes("bentang") || s.includes("tabled") || s.includes("bacaan")) return "tabled";
  if (s.includes("rundingan") || s.includes("consultation")) return "consultation";
  if (s.includes("draf") || s.includes("draft")) return "drafting";
  if (s.includes("menunggu") || s.includes("pending")) return "pending";
  return null;
}

/**
 * Refresh bills-to-watch data: seed if empty, then cross-reference with scraped bills
 */
export async function refreshBillsToWatch(): Promise<{
  seeded: number;
  matched: number;
  updated: number;
  timestamp: string;
}> {
  console.log("[Bills to Watch] Starting refresh...");

  const seeded = await seedBillsToWatch();
  const { matched, updated } = await crossReferenceWithScrapedBills();

  // Touch the updated_at on all records to track last refresh time
  const db = getDb();
  if (db && seeded === 0) {
    await db.update(billsToWatch)
      .set({ updatedAt: new Date() })
      .where(sql`true`);
  }

  const result = {
    seeded,
    matched,
    updated,
    timestamp: new Date().toISOString(),
  };

  console.log(`[Bills to Watch] Refresh complete: seeded=${seeded}, matched=${matched}, updated=${updated}`);
  return result;
}

/**
 * Get all bills to watch, ordered by sort_order
 */
export async function getBillsToWatch() {
  const db = getDb();
  if (!db) return [];

  try {
    const result = await db.select().from(billsToWatch).orderBy(billsToWatch.sortOrder);
    return result;
  } catch (error) {
    console.error("[Bills to Watch] Error fetching bills:", error);
    return [];
  }
}

/**
 * Get the last refresh timestamp
 */
export async function getLastRefreshTime(): Promise<string | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const result = await db
      .select({ updatedAt: billsToWatch.updatedAt })
      .from(billsToWatch)
      .orderBy(sql`${billsToWatch.updatedAt} DESC`)
      .limit(1);

    return result.length > 0 ? result[0].updatedAt.toISOString() : null;
  } catch (error) {
    console.error("[Bills to Watch] Error getting last refresh time:", error);
    return null;
  }
}

/**
 * Start the daily bills-to-watch refresh cron job
 * Runs daily at 3:00 AM MYT
 */
export function startBillsToWatchCron() {
  if (cronJob) {
    cronJob.stop();
  }

  // Schedule: "0 3 * * *" = At 3:00 AM every day
  cronJob = cron.schedule("0 3 * * *", async () => {
    console.log("[Bills to Watch Cron] Starting daily refresh...");

    try {
      const result = await refreshBillsToWatch();
      console.log(
        `[Bills to Watch Cron] Daily refresh complete: seeded=${result.seeded}, matched=${result.matched}, updated=${result.updated}`
      );
    } catch (error) {
      console.error("[Bills to Watch Cron] Error during daily refresh:", error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Kuala_Lumpur"
  });

  console.log("[Bills to Watch Cron] Daily refresh job scheduled for 3:00 AM MYT");

  // Run initial seed on startup
  seedBillsToWatch().catch(err => {
    console.error("[Bills to Watch Cron] Error during startup seed:", err);
  });
}

/**
 * Stop the cron job
 */
export function stopBillsToWatchCron() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log("[Bills to Watch Cron] Daily refresh job stopped");
  }
}
