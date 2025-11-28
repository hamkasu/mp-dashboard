/**
 * Court Case Scraper Cron Job
 * Schedules automated court case news monitoring
 */

import cron from 'node-cron';
import { courtCaseScraper } from './court-case-scraper';

let isRunning = false;
let lastRunAt: Date | null = null;
let lastRunResult: { articlesScraped: number; articlesWithData: number } | null = null;

/**
 * Run the court case scraper
 */
async function runCourtCaseScrape() {
  if (isRunning) {
    console.log("[CourtCaseCron] Scrape already in progress, skipping...");
    return;
  }
  
  isRunning = true;
  console.log("[CourtCaseCron] Starting scheduled court case news scrape...");
  
  try {
    lastRunResult = await courtCaseScraper.runScrape();
    lastRunAt = new Date();
    console.log(`[CourtCaseCron] Completed at ${lastRunAt.toISOString()}`);
  } catch (error) {
    console.error("[CourtCaseCron] Scrape failed:", error);
  } finally {
    isRunning = false;
  }
}

/**
 * Schedule the court case scraper cron job
 * Runs twice daily at 8 AM and 6 PM Malaysia time
 */
export function scheduleCourtCaseScraper() {
  // Run at 8:00 AM Malaysia time (UTC+8)
  cron.schedule('0 8 * * *', () => {
    runCourtCaseScrape();
  }, {
    timezone: 'Asia/Kuala_Lumpur'
  });
  
  // Run at 6:00 PM Malaysia time (UTC+8)
  cron.schedule('0 18 * * *', () => {
    runCourtCaseScrape();
  }, {
    timezone: 'Asia/Kuala_Lumpur'
  });
  
  console.log("✅ [CourtCaseCron] Scheduled court case news scraper at 8:00 AM and 6:00 PM Malaysia time");
}

/**
 * Manually trigger a scrape run
 */
export async function triggerManualScrape(): Promise<{ articlesScraped: number; articlesWithData: number }> {
  if (isRunning) {
    throw new Error("Scrape already in progress");
  }
  
  isRunning = true;
  try {
    const result = await courtCaseScraper.runScrape();
    lastRunAt = new Date();
    lastRunResult = result;
    return result;
  } finally {
    isRunning = false;
  }
}

/**
 * Get scraper status
 */
export function getScraperStatus() {
  return {
    isRunning,
    lastRunAt,
    lastRunResult,
  };
}
