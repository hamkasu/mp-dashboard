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
    status: "consultation",
    isFeatured: true,
    icon: "scale",
    tags: ["Reform", "Anti-Corruption", "Transparency"],
    summaryEn: "Public consultation phase complete. Bill now under final review before Cabinet deliberation, targeting tabling in Parliament by mid-2026.",
    summaryMs: "Fasa perundingan awam selesai. Rang undang-undang kini dalam semakan akhir sebelum perbincangan Kabinet, menyasarkan pembentangan di Parlimen menjelang pertengahan 2026.",
    detailsEn: `✓ 20+ stakeholder sessions completed by BHEUU.
✓ IIUM-led public perception study concluded Feb 2026.

Key proposals:
• Mandatory public disclosure of party finances
• Donation caps: RM50k/individual, RM100k/company, RM500k/large groups
• Protect small donor anonymity (disclose donations >RM10k only)
• Possible public funding for parties
• Restrictions to end "donations-for-contracts" perception

Next steps: Cabinet review expected Q2 2026, followed by tabling in Parliament.

Opposition raises concerns about enforcement and fear-of-reprisal for donors.`,
    detailsMs: `✓ 20+ sesi pemegang taruh telah selesai oleh BHEUU.
✓ Kajian persepsi awam diketuai IIUM selesai Feb 2026.

Cadangan utama:
• Pendedahan mandatori kewangan parti kepada awam
• Had derma: RM50k/individu, RM100k/syarikat, RM500k/kumpulan besar
• Lindungi kerahsiaan penderma kecil (dedahkan derma >RM10k sahaja)
• Kemungkinan pembiayaan awam untuk parti
• Sekatan untuk menamatkan persepsi "derma-untuk-kontrak"

Langkah seterusnya: Semakan Kabinet dijangka S2 2026, diikuti pembentangan di Parlimen.

Pembangkang membangkitkan kebimbangan mengenai penguatkuasaan dan ketakutan pembalasan terhadap penderma.`,
    sourceUrl: "https://www.parlimen.gov.my",
    sortOrder: 0,
  },
  {
    titleEn: "Prime Minister Term Limit Bill",
    titleMs: "RUU Had Penggal Perdana Menteri",
    status: "tabled",
    icon: "shield",
    tags: ["Constitutional Reform", "Governance", "Power Limits"],
    summaryEn: "Proposes capping PM tenure at cumulative 10 years (or 2 full terms); automatic cessation upon reaching limit. Applies to current and future PMs (excludes service after dissolution in some cases); former PMs with 10+ years ineligible to return. Tabled by Minister Azalina Othman Said; fulfills GE15 promise—politically sensitive but advancing quickly.",
    summaryMs: "Mencadangkan had tempoh PM kepada 10 tahun kumulatif (atau 2 penggal penuh); penamatan automatik apabila mencapai had. Terpakai kepada PM semasa dan masa hadapan (mengecualikan perkhidmatan selepas pembubaran dalam sesetengah kes); bekas PM yang berkhidmat 10 tahun ke atas tidak layak kembali. Dibentangkan oleh Menteri Azalina Othman Said; memenuhi janji PRU15—sensitif secara politik tetapi bergerak dengan cepat.",
    detailsEn: `Tabled for First Reading on February 23, 2026; Second and Third Readings scheduled in the current parliamentary sitting.

Key provisions:
• Cumulative 10-year tenure cap or 2 full terms
• Automatic cessation upon reaching the limit
• Applies to current and future Prime Ministers
• Excludes service after dissolution in some cases
• Former PMs who have served 10+ years are ineligible to return

Politically sensitive but advancing quickly as part of GE15 reform commitments. Tabled by Minister Azalina Othman Said.`,
    detailsMs: `Dibentangkan untuk Bacaan Pertama pada 23 Februari 2026; Bacaan Kedua dan Ketiga dijadualkan dalam persidangan parlimen semasa.

Peruntukan utama:
• Had tempoh kumulatif 10 tahun atau 2 penggal penuh
• Penamatan automatik apabila mencapai had
• Terpakai kepada PM semasa dan masa hadapan
• Mengecualikan perkhidmatan selepas pembubaran dalam sesetengah kes
• Bekas PM yang telah berkhidmat 10 tahun ke atas tidak layak kembali

Sensitif secara politik tetapi bergerak dengan cepat sebagai sebahagian daripada komitmen pembaharuan PRU15. Dibentangkan oleh Menteri Azalina Othman Said.`,
    sourceUrl: "https://www.parlimen.gov.my",
    sortOrder: 1,
  },
  {
    titleEn: "Attorney-General/Public Prosecutor Separation Bill",
    titleMs: "RUU Pengasingan Peguam Negara/Pendakwa Raya",
    status: "tabled",
    icon: "scale",
    tags: ["Judicial Independence", "Anti-Corruption", "Rule of Law"],
    summaryEn: "Seeks to split AG's advisory role from prosecutorial functions; establishes distinct Public Prosecutor to reduce political interference in legal proceedings. Controversial among legal circles but tabled alongside PM term limit bill—part of broader institutional reforms.",
    summaryMs: "Bertujuan mengasingkan peranan nasihat Peguam Negara daripada fungsi pendakwaan; menubuhkan Pendakwa Raya yang berasingan untuk mengurangkan campur tangan politik dalam prosiding undang-undang. Kontroversi dalam kalangan badan undang-undang tetapi dibentangkan bersama RUU had penggal PM—sebahagian daripada pembaharuan institusi yang lebih luas.",
    detailsEn: `Tabled for First Reading on February 23, 2026, alongside the Prime Minister Term Limit Bill.

Key objectives:
• Split the AG's advisory role (legal advisor to the government) from prosecutorial functions
• Establish a distinct and independent Public Prosecutor
• Reduce political interference in criminal proceedings
• Strengthen rule of law and judicial independence

Controversial among legal circles but part of the government's broader anti-corruption and institutional reform agenda.`,
    detailsMs: `Dibentangkan untuk Bacaan Pertama pada 23 Februari 2026, bersama dengan RUU Had Penggal Perdana Menteri.

Objektif utama:
• Mengasingkan peranan nasihat Peguam Negara (penasihat undang-undang kepada kerajaan) daripada fungsi pendakwaan
• Menubuhkan Pendakwa Raya yang berasingan dan bebas
• Mengurangkan campur tangan politik dalam prosiding jenayah
• Mengukuhkan kedaulatan undang-undang dan kebebasan kehakiman

Kontroversi dalam kalangan badan undang-undang tetapi merupakan sebahagian daripada agenda pembaharuan anti-rasuah dan institusi kerajaan yang lebih luas.`,
    sourceUrl: "https://www.parlimen.gov.my",
    sortOrder: 2,
  },
  {
    titleEn: "Ombudsman Bill",
    titleMs: "RUU Ombudsman",
    status: "consultation",
    icon: "search",
    tags: ["Oversight", "Anti-Maladministration", "Accountability"],
    summaryEn: "To establish independent body investigating public administration complaints/maladministration. Scope and executive independence still under debate; listed among key reforms to be tabled this year (per PM Anwar statements).",
    summaryMs: "Untuk menubuhkan badan bebas menyiasat aduan pentadbiran awam/salah tadbir. Skop dan kebebasan eksekutif masih dalam perbahasan; disenaraikan antara pembaharuan utama untuk dibentangkan tahun ini (menurut kenyataan PM Anwar).",
    detailsEn: `Consultation / In Pipeline stage; promised for 2026 tabling per PM Anwar's statements.

Key objectives:
• Establish an independent body to investigate public administration complaints
• Address maladministration by government bodies and agencies
• Provide citizens a formal channel outside the courts for redress
• Scope and executive independence still under active debate

Listed among the government's key institutional reforms to be tabled this year.`,
    detailsMs: `Peringkat Rundingan / Dalam Saluran; dijanjikan untuk pembentangan 2026 menurut kenyataan PM Anwar.

Objektif utama:
• Menubuhkan badan bebas untuk menyiasat aduan pentadbiran awam
• Menangani salah tadbir oleh badan dan agensi kerajaan
• Menyediakan saluran rasmi kepada rakyat di luar mahkamah untuk mendapatkan remedi
• Skop dan kebebasan eksekutif masih dalam perbahasan aktif

Disenaraikan antara pembaharuan institusi utama kerajaan yang akan dibentangkan tahun ini.`,
    sourceUrl: "https://www.parlimen.gov.my",
    sortOrder: 3,
  },
  {
    titleEn: "Freedom of Information Bill",
    titleMs: "RUU Kebebasan Maklumat",
    status: "drafting",
    icon: "search",
    tags: ["Transparency", "Public Access", "Governance"],
    summaryEn: "Aims to enhance access to government information, with safeguards for national security, intelligence, and race-religion-royalty (3R) issues. Cabinet committee approved in principle; expected tabling this year to promote accountability (e.g., project tenders, abuse prevention). Complements other anti-corruption reforms.",
    summaryMs: "Bertujuan meningkatkan akses kepada maklumat kerajaan, dengan perlindungan untuk keselamatan negara, perisikan, dan isu bangsa-agama-raja (3R). Jawatankuasa Kabinet meluluskan secara prinsip; jangkaan pembentangan tahun ini untuk menggalakkan akauntabiliti (contoh: tender projek, pencegahan penyalahgunaan). Melengkapi pembaharuan anti-rasuah lain.",
    detailsEn: `Cabinet committee approved in principle; bill currently in drafting stage for expected tabling in 2026.

Key objectives:
• Enhance public access to government information
• Promote transparency in project tenders and public spending
• Prevent abuse and maladministration
• Safeguards for national security, intelligence matters, and 3R (race, religion, royalty) issues

Complements other anti-corruption reforms such as the Political Financing Bill and Ombudsman Bill. Expected to strengthen accountability mechanisms across government.`,
    detailsMs: `Jawatankuasa Kabinet meluluskan secara prinsip; rang undang-undang sedang dalam peringkat penggubalan untuk pembentangan pada 2026.

Objektif utama:
• Meningkatkan akses awam kepada maklumat kerajaan
• Menggalakkan ketelusan dalam tender projek dan perbelanjaan awam
• Mencegah penyalahgunaan dan salah tadbir
• Perlindungan untuk keselamatan negara, perkara perisikan, dan isu 3R (kaum, agama, raja)

Melengkapi pembaharuan anti-rasuah lain seperti RUU Pembiayaan Politik dan RUU Ombudsman. Dijangka mengukuhkan mekanisme akauntabiliti seluruh kerajaan.`,
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
 * Sync curated content: update existing bills with latest content from SEED_BILLS.
 * Matches by title_en; updates all curated fields so stale DB records always
 * reflect the latest editorial copy without needing a DB wipe.
 */
async function syncCuratedContent(): Promise<number> {
  const db = getDb();
  if (!db) return 0;

  let synced = 0;
  try {
    for (const bill of SEED_BILLS) {
      const existing = await db
        .select({ id: billsToWatch.id })
        .from(billsToWatch)
        .where(eq(billsToWatch.titleEn, bill.titleEn))
        .limit(1);

      if (existing.length === 0) continue;

      await db
        .update(billsToWatch)
        .set({
          titleMs: bill.titleMs,
          status: bill.status,
          icon: bill.icon ?? "scroll",
          tags: bill.tags ?? [],
          summaryEn: bill.summaryEn,
          summaryMs: bill.summaryMs,
          detailsEn: bill.detailsEn ?? null,
          detailsMs: bill.detailsMs ?? null,
          sourceUrl: bill.sourceUrl ?? null,
          sortOrder: bill.sortOrder ?? 0,
          updatedAt: new Date(),
        })
        .where(eq(billsToWatch.titleEn, bill.titleEn));

      synced++;
    }
    console.log(`[Bills to Watch] Synced curated content for ${synced} bills`);
  } catch (error) {
    console.error("[Bills to Watch] Error syncing curated content:", error);
  }
  return synced;
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
 * Refresh bills-to-watch data: seed if empty, sync curated content, then
 * cross-reference with scraped bills for live status updates
 */
export async function refreshBillsToWatch(): Promise<{
  seeded: number;
  matched: number;
  updated: number;
  timestamp: string;
}> {
  console.log("[Bills to Watch] Starting refresh...");

  const seeded = await seedBillsToWatch();
  // Always sync curated editorial content so existing records stay up-to-date
  await syncCuratedContent();
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

  // Run seed + content sync on startup so latest editorial copy is always live
  seedBillsToWatch()
    .then(() => syncCuratedContent())
    .catch(err => {
      console.error("[Bills to Watch Cron] Error during startup seed/sync:", err);
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
