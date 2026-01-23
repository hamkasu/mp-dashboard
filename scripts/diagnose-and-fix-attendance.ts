/**
 * Diagnostic and Fix Script for Attendance Data Update Issues
 *
 * This script:
 * 1. Checks the last Hansard record in the database
 * 2. Attempts to scrape for new Hansard records
 * 3. Manually triggers data aggregation
 * 4. Provides detailed diagnostics
 */

import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { runHansardSync } from "../server/hansard-cron";
import { refreshAllMpData } from "../server/aggregate-speeches";

async function diagnoseAndFix() {
  console.log("=".repeat(70));
  console.log("ATTENDANCE DATA DIAGNOSTIC AND FIX TOOL");
  console.log("=".repeat(70));
  console.log();

  // Step 1: Check last Hansard record
  console.log("📊 STEP 1: Checking last Hansard record in database...\n");
  try {
    const result = await db.execute(sql`
      SELECT
        id,
        session_number,
        session_date,
        created_at,
        speaker_stats,
        attended_mp_ids,
        absent_mp_ids
      FROM hansard_records
      ORDER BY session_date DESC
      LIMIT 1
    `);

    if (!result.rows || result.rows.length === 0) {
      console.log("❌ ERROR: No Hansard records found in database!");
      console.log("   This is a critical issue. The database needs to be populated.");
      process.exit(1);
    }

    const lastRecord: any = result.rows[0];
    const sessionDate = new Date(lastRecord.session_date);
    const createdAt = new Date(lastRecord.created_at);
    const daysSinceSession = Math.floor((Date.now() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysSinceCreated = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    console.log("✅ Latest Hansard Record:");
    console.log(`   Session Number: ${lastRecord.session_number}`);
    console.log(`   Session Date: ${sessionDate.toISOString()}`);
    console.log(`   Days Since Session: ${daysSinceSession} days ago`);
    console.log(`   Created At: ${createdAt.toISOString()}`);
    console.log(`   Days Since Created: ${daysSinceCreated} days ago`);
    console.log(`   Has Speaker Stats: ${lastRecord.speaker_stats ? 'Yes' : 'No'}`);
    console.log(`   MPs Attended: ${lastRecord.attended_mp_ids?.length || 0}`);
    console.log(`   MPs Absent: ${lastRecord.absent_mp_ids?.length || 0}`);
    console.log();

    if (daysSinceCreated >= 3) {
      console.log("⚠️  WARNING: Last record was created 3+ days ago!");
      console.log("   This suggests the automated sync may not be running.\n");
    }

    // Get total count
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as total FROM hansard_records
    `);
    console.log(`   Total Hansard records: ${countResult.rows[0]?.total || 0}\n`);

  } catch (error) {
    console.error("❌ ERROR checking database:", error);
    process.exit(1);
  }

  // Step 2: Check sample MP data
  console.log("📊 STEP 2: Checking sample MP attendance data...\n");
  try {
    const mpCheck = await db.execute(sql`
      SELECT
        id,
        name,
        days_attended,
        total_parliament_days,
        hansard_sessions_spoke,
        total_speech_instances,
        sworn_in_date
      FROM mps
      WHERE days_attended > 0
      ORDER BY days_attended DESC
      LIMIT 5
    `);

    console.log("Top 5 MPs by attendance:");
    mpCheck.rows.forEach((mp: any, index: number) => {
      console.log(`   ${index + 1}. ${mp.name}:`);
      console.log(`      Days Attended: ${mp.days_attended}/${mp.total_parliament_days}`);
      console.log(`      Sessions Spoke: ${mp.hansard_sessions_spoke}`);
      console.log(`      Total Speeches: ${mp.total_speech_instances}`);
    });
    console.log();

  } catch (error) {
    console.error("❌ ERROR checking MP data:", error);
  }

  // Step 3: Attempt to fetch new Hansard records
  console.log("📥 STEP 3: Attempting to fetch new Hansard records...\n");
  try {
    console.log("   Starting Hansard sync (this may take a few minutes)...\n");
    const syncResult = await runHansardSync({ triggeredBy: 'manual-diagnostic' });

    console.log("✅ Sync completed!");
    console.log(`   Duration: ${syncResult.durationMs}ms`);
    console.log(`   Records Found: ${syncResult.recordsFound}`);
    console.log(`   Records Inserted: ${syncResult.recordsInserted}`);
    console.log(`   Records Skipped: ${syncResult.recordsSkipped}`);

    if (syncResult.errors && syncResult.errors.length > 0) {
      console.log(`   ⚠️  Errors: ${syncResult.errors.length}`);
      syncResult.errors.forEach((error, i) => {
        console.log(`      ${i + 1}. ${error}`);
      });
    }
    console.log();

    if (syncResult.recordsInserted === 0) {
      console.log("ℹ️  INFO: No new records were found.");
      console.log("   This could mean:");
      console.log("   - Parliament hasn't had sessions in the last few days");
      console.log("   - The parliament website doesn't have new published records yet");
      console.log("   - It's a parliamentary recess period");
      console.log();
    }

  } catch (error: any) {
    console.error("❌ ERROR during Hansard sync:", error.message);
    console.log("\n   This could indicate:");
    console.log("   - Network connectivity issues");
    console.log("   - Parliament website is down or has changed structure");
    console.log("   - SSL/TLS certificate issues");
    console.log();
  }

  // Step 4: Manually refresh MP data aggregation
  console.log("🔄 STEP 4: Refreshing MP data aggregation...\n");
  try {
    console.log("   Aggregating attendance and speech data for all MPs...\n");
    await refreshAllMpData();
    console.log("✅ MP data aggregation completed successfully!\n");

  } catch (error) {
    console.error("❌ ERROR during MP data refresh:", error);
    console.log();
  }

  // Step 5: Verify the update
  console.log("✅ STEP 5: Verifying updates...\n");
  try {
    const mpCheckAfter = await db.execute(sql`
      SELECT
        id,
        name,
        days_attended,
        total_parliament_days,
        hansard_sessions_spoke
      FROM mps
      WHERE days_attended > 0
      ORDER BY days_attended DESC
      LIMIT 5
    `);

    console.log("Updated Top 5 MPs by attendance:");
    mpCheckAfter.rows.forEach((mp: any, index: number) => {
      console.log(`   ${index + 1}. ${mp.name}: ${mp.days_attended}/${mp.total_parliament_days} days, ${mp.hansard_sessions_spoke} sessions spoke`);
    });
    console.log();

  } catch (error) {
    console.error("❌ ERROR verifying updates:", error);
  }

  // Step 6: Recommendations
  console.log("=".repeat(70));
  console.log("RECOMMENDATIONS");
  console.log("=".repeat(70));
  console.log();
  console.log("1. ✅ Ensure the server is running continuously (use PM2 or similar)");
  console.log("2. ✅ Check server logs daily for Hansard sync status");
  console.log("3. ✅ Consider persisting sync logs to database instead of memory");
  console.log("4. ✅ Add monitoring/alerting for failed syncs");
  console.log("5. ✅ Verify cron job is running: check server logs for '⏰ [Hansard Cron]'");
  console.log();
  console.log("📝 To check sync logs via API (if server is running):");
  console.log("   GET /api/admin/hansard-sync-logs");
  console.log();
  console.log("📝 To manually trigger sync via API:");
  console.log("   POST /api/admin/trigger-hansard-check");
  console.log();

  console.log("=".repeat(70));
  console.log("DIAGNOSTIC COMPLETE");
  console.log("=".repeat(70));

  process.exit(0);
}

// Run the diagnostic
diagnoseAndFix().catch((error) => {
  console.error("\n💥 FATAL ERROR:", error);
  process.exit(1);
});
