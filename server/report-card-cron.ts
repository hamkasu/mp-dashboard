/**
 * Copyright by Calmic Sdn Bhd
 *
 * MP Report Card Cron Job
 * Automatically updates report cards on the 1st of every month
 */

import cron from "node-cron";
import { updateAllReportCards } from "./services/report-card-service";

let cronJob: cron.ScheduledTask | null = null;

/**
 * Start the monthly report card update cron job
 * Runs on the 1st of every month at 2:00 AM
 */
export function startReportCardCron() {
  // Stop existing job if any
  if (cronJob) {
    cronJob.stop();
  }

  // Schedule: "0 2 1 * *" = At 2:00 AM on the 1st of every month
  // Format: minute hour day-of-month month day-of-week
  cronJob = cron.schedule("0 2 1 * *", async () => {
    console.log("[Report Card Cron] Starting monthly report card update...");

    try {
      const result = await updateAllReportCards();

      console.log(
        `[Report Card Cron] Update complete: ${result.created} created, ${result.updated} updated`
      );
    } catch (error) {
      console.error("[Report Card Cron] Error updating report cards:", error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Kuala_Lumpur"
  });

  console.log("[Report Card Cron] Monthly update job scheduled for 1st of every month at 2:00 AM MYT");
}

/**
 * Stop the cron job
 */
export function stopReportCardCron() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log("[Report Card Cron] Monthly update job stopped");
  }
}

/**
 * Trigger an immediate update (for testing or manual triggers)
 */
export async function triggerReportCardUpdate(): Promise<{ created: number; updated: number }> {
  console.log("[Report Card Cron] Triggering immediate report card update...");

  try {
    const result = await updateAllReportCards();
    console.log(
      `[Report Card Cron] Immediate update complete: ${result.created} created, ${result.updated} updated`
    );
    return result;
  } catch (error) {
    console.error("[Report Card Cron] Error in immediate update:", error);
    throw error;
  }
}
