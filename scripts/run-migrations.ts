/**
 * Manual migration runner script
 * This script runs SQL migrations from the migrations directory in order
 * Use this if drizzle-kit push fails or if you need to manually apply migrations
 */

import { pool, isDatabaseAvailable } from "../server/db";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration(filename: string) {
  if (!pool) {
    console.error("Database pool not available");
    return false;
  }
  const migrationPath = join(__dirname, "..", "migrations", filename);
  console.log(`\nRunning migration: ${filename}`);

  try {
    const sql = readFileSync(migrationPath, "utf-8");
    await pool.query(sql);
    console.log(`✓ Migration ${filename} completed successfully`);
    return true;
  } catch (error: any) {
    console.error(`✗ Migration ${filename} failed:`, error.message);
    return false;
  }
}

async function main() {
  console.log("Starting manual migration process...\n");

  if (!isDatabaseAvailable() || !pool) {
    console.error("DATABASE_URL not set. Cannot run migrations.");
    process.exit(1);
  }

  // List of migrations to run in order
  const migrations = [
    "0003_create_admin_users_table.sql",
    "0004_add_missing_columns.sql",
  ];

  let successCount = 0;
  let failCount = 0;

  for (const migration of migrations) {
    const success = await runMigration(migration);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Migration Summary:`);
  console.log(`  Successful: ${successCount}`);
  console.log(`  Failed: ${failCount}`);
  console.log(`${"=".repeat(50)}\n`);

  await pool.end();

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error running migrations:", error);
  process.exit(1);
});
