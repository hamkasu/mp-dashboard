import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function checkLastHansardUpdate() {
  console.log("Checking last Hansard record in database...\n");

  try {
    // Get the latest Hansard record
    const result = await db.execute(sql`
      SELECT
        id,
        session_number,
        session_date,
        parliament_term,
        sitting,
        created_at,
        summarized_at,
        speaker_stats,
        attended_mp_ids,
        absent_mp_ids
      FROM hansard_records
      ORDER BY session_date DESC
      LIMIT 5
    `);

    if (!result.rows || result.rows.length === 0) {
      console.log("❌ No Hansard records found in database!");
      process.exit(0);
    }

    console.log(`Found ${result.rows.length} recent Hansard records:\n`);

    result.rows.forEach((row: any, index: number) => {
      console.log(`${index + 1}. Session Number: ${row.session_number}`);
      console.log(`   Session Date: ${row.session_date}`);
      console.log(`   Created At: ${row.created_at}`);
      console.log(`   Summarized: ${row.summarized_at ? 'Yes' : 'No'}`);
      console.log(`   Has Speaker Stats: ${row.speaker_stats ? 'Yes' : 'No'}`);
      console.log(`   Attended MPs: ${row.attended_mp_ids?.length || 0}`);
      console.log(`   Absent MPs: ${row.absent_mp_ids?.length || 0}`);
      console.log("");
    });

    // Get total count
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as total FROM hansard_records
    `);
    console.log(`Total Hansard records in database: ${countResult.rows[0]?.total || 0}\n`);

    // Check when data was last aggregated by looking at a sample MP
    const mpCheck = await db.execute(sql`
      SELECT
        id,
        name,
        days_attended,
        total_parliament_days,
        hansard_sessions_spoke,
        total_speech_instances
      FROM mps
      WHERE days_attended > 0
      ORDER BY days_attended DESC
      LIMIT 3
    `);

    console.log("Sample MP attendance data:");
    mpCheck.rows.forEach((mp: any) => {
      console.log(`- ${mp.name}: ${mp.days_attended}/${mp.total_parliament_days} days attended, ${mp.hansard_sessions_spoke} sessions spoke`);
    });

  } catch (error) {
    console.error("❌ Error checking database:", error);
    process.exit(1);
  }

  process.exit(0);
}

checkLastHansardUpdate();
