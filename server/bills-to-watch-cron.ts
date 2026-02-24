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
    tags: ["Reform", "Anti-Corruption", "Transparency"],
    summaryEn: "Landmark reform to regulate political party funding, curb money politics, mandate public disclosure of donations, impose caps on contributions, restrict eligible donors, and end perceived links between funding and government contracts.",
    summaryMs: "Pembaharuan penting untuk mengawal selia pembiayaan parti politik, membendung politik wang, memandatkan pendedahan awam derma, mengenakan had sumbangan, menyekat penderma yang layak, dan menamatkan persepsi kaitan antara pembiayaan dan kontrak kerajaan.",
    detailsEn: `Draft shaped by 20+ stakeholder sessions; public perception study (led by IIUM researchers) expected to complete by end-February 2026. Government awaiting results before finalizing for tabling—likely post-study.

Key proposals:
• Mandatory public disclosure of party finances
• Donation caps: RM50k/individual, RM100k/company, RM500k/large groups
• Protect small donor anonymity (disclose donations >RM10k only)
• Possible public funding for parties
• Restrictions to end "donations-for-contracts" perception

Opposition raises concerns about enforcement and fear-of-reprisal for donors.`,
    detailsMs: `Draf dibentuk melalui 20+ sesi pemegang taruh; kajian persepsi awam (diketuai penyelidik IIUM) dijangka selesai menjelang akhir Februari 2026. Kerajaan menunggu keputusan sebelum memuktamadkan untuk pembentangan—berkemungkinan selepas kajian.

Cadangan utama:
• Pendedahan mandatori kewangan parti kepada awam
• Had derma: RM50k/individu, RM100k/syarikat, RM500k/kumpulan besar
• Lindungi kerahsiaan penderma kecil (dedahkan derma >RM10k sahaja)
• Kemungkinan pembiayaan awam untuk parti
• Sekatan untuk menamatkan persepsi "derma-untuk-kontrak"

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
    summaryEn: "Constitutional amendment (Constitution (Amendment) Bill 2026) to cap PM tenure at cumulative 10 years or 2 full terms, with automatic cessation upon reaching the limit. Tabled for First Reading on February 23, 2026 by Minister Azalina Othman Said; fulfills GE15 manifesto pledge.",
    summaryMs: "Pindaan perlembagaan (Rang Undang-Undang Perlembagaan (Pindaan) 2026) untuk mengehadkan tempoh PM kepada 10 tahun kumulatif atau 2 penggal penuh, dengan penamatan automatik apabila mencapai had. Dibentangkan untuk Bacaan Pertama pada 23 Februari 2026 oleh Menteri Azalina Othman Said; memenuhi janji manifesto PRU15.",
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
    summaryEn: "Constitution (Amendment) Bill 2026 to split the AG's advisory role from prosecutorial functions; establishes a distinct Public Prosecutor to reduce political interference in legal proceedings. Tabled for First Reading on February 23, 2026 alongside the PM term limit bill.",
    summaryMs: "Rang Undang-Undang Perlembagaan (Pindaan) 2026 untuk mengasingkan peranan nasihat Peguam Negara daripada fungsi pendakwaan; menubuhkan Pendakwa Raya yang berasingan untuk mengurangkan campur tangan politik dalam prosiding undang-undang. Dibentangkan untuk Bacaan Pertama pada 23 Februari 2026 bersama RUU had penggal PM.",
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
    summaryEn: "Establishes independent oversight body to investigate public administration complaints and maladministration. Scope and executive independence still under debate; listed among key reforms to be tabled in 2026 per PM Anwar's statements.",
    summaryMs: "Menubuhkan badan pengawasan bebas untuk menyiasat aduan pentadbiran awam dan salah tadbir. Skop dan kebebasan eksekutif masih dalam perbahasan; disenaraikan antara pembaharuan utama untuk dibentangkan pada 2026 menurut kenyataan PM Anwar.",
    sortOrder: 3,
  },
  {
    titleEn: "Freedom of Information Bill",
    titleMs: "RUU Kebebasan Maklumat",
    status: "drafting",
    icon: "search",
    tags: ["Transparency", "Public Access", "Governance"],
    summaryEn: "Cabinet committee approved in principle; aims to enhance public access to government information with safeguards for national security, intelligence, and 3R issues. Expected tabling in 2026 to promote accountability in project tenders and abuse prevention.",
    summaryMs: "Jawatankuasa Kabinet meluluskan secara prinsip; bertujuan meningkatkan akses awam kepada maklumat kerajaan dengan perlindungan untuk keselamatan negara, perisikan, dan isu 3R. Jangkaan pembentangan pada 2026 untuk menggalakkan akauntabiliti dalam tender projek dan pencegahan penyalahgunaan.",
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
