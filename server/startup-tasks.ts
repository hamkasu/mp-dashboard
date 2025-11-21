/**
 * Startup tasks module
 * Runs initialization tasks (db:push, migrations, data imports) asynchronously
 * after the server starts listening, so health checks can pass immediately
 */

import { spawn } from "child_process";
import { log } from "./vite";

interface TaskResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
}

function runCommand(name: string, command: string, args: string[]): Promise<TaskResult> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    log(`[Startup] Running: ${name}`);

    const child = spawn(command, args, {
      stdio: "inherit",
      shell: true,
      env: process.env,
    });

    const timeout = setTimeout(() => {
      log(`[Startup] ${name} timed out after 5 minutes, killing process`);
      child.kill("SIGTERM");
      resolve({
        name,
        success: false,
        duration: Date.now() - startTime,
        error: "Timeout after 5 minutes",
      });
    }, 5 * 60 * 1000); // 5 minute timeout per task

    child.on("close", (code) => {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;
      if (code === 0) {
        log(`[Startup] ${name} completed in ${duration}ms`);
        resolve({ name, success: true, duration });
      } else {
        log(`[Startup] ${name} failed with code ${code} in ${duration}ms`);
        resolve({ name, success: false, duration, error: `Exit code: ${code}` });
      }
    });

    child.on("error", (err) => {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;
      log(`[Startup] ${name} error: ${err.message}`);
      resolve({ name, success: false, duration, error: err.message });
    });
  });
}

export async function runStartupTasks(): Promise<void> {
  log("[Startup] Beginning startup tasks...");
  const startTime = Date.now();
  const results: TaskResult[] = [];

  // Task 1: Database schema push (critical)
  const dbPushResult = await runCommand(
    "Database schema push",
    "npx",
    ["drizzle-kit", "push", "--force"]
  );
  results.push(dbPushResult);

  // Only continue with other tasks if db:push succeeded
  if (!dbPushResult.success) {
    log("[Startup] Database push failed, skipping remaining tasks");
    logSummary(results, startTime);
    return;
  }

  // Task 2: Run migrations
  const migrationsResult = await runCommand(
    "Run migrations",
    "node",
    ["dist/scripts/run-migrations.js"]
  );
  results.push(migrationsResult);

  // Task 3: Import poverty data
  const povertyResult = await runCommand(
    "Import poverty data",
    "node",
    ["dist/scripts/import-poverty-data.js"]
  );
  results.push(povertyResult);

  // Task 4: Fix Hansard speaker IDs
  const hansardResult = await runCommand(
    "Fix Hansard speaker IDs",
    "node",
    ["dist/scripts/fix-hansard-speaker-ids.js"]
  );
  results.push(hansardResult);

  // Task 5: Aggregate all speeches
  const aggregateSpeechesResult = await runCommand(
    "Aggregate all speeches",
    "node",
    ["dist/scripts/aggregate-all-speeches.js"]
  );
  results.push(aggregateSpeechesResult);

  // Task 6: Aggregate constituency speeches
  const aggregateConstituencyResult = await runCommand(
    "Aggregate constituency speeches",
    "node",
    ["dist/scripts/aggregate-constituency-speeches.js"]
  );
  results.push(aggregateConstituencyResult);

  logSummary(results, startTime);
}

function logSummary(results: TaskResult[], startTime: number): void {
  const totalDuration = Date.now() - startTime;
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  log("\n[Startup] ========================================");
  log("[Startup] Startup Tasks Summary");
  log("[Startup] ========================================");

  for (const result of results) {
    const status = result.success ? "✓" : "✗";
    const errorInfo = result.error ? ` (${result.error})` : "";
    log(`[Startup] ${status} ${result.name}: ${result.duration}ms${errorInfo}`);
  }

  log("[Startup] ----------------------------------------");
  log(`[Startup] Total: ${successCount} succeeded, ${failCount} failed`);
  log(`[Startup] Total duration: ${totalDuration}ms`);
  log("[Startup] ========================================\n");
}
