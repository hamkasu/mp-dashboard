/**
 * Copyright by Calmic Sdn Bhd
 *
 * CLI helper: generate and register a new API key.
 *
 * Usage:
 *   tsx scripts/generate-api-key.ts "<client_name>" <client_email> [tier]
 *
 * Available tiers (and their default daily call limits):
 *   free          1,000  calls/day
 *   starter       5,000  calls/day
 *   professional 20,000  calls/day
 *   research     50,000  calls/day
 *   intelligence200,000  calls/day
 *
 * The raw key is printed ONCE to stdout and is NEVER stored.
 * Revoke a key by setting is_active = FALSE in the api_keys table.
 */

import crypto from "crypto";
import { pool, isDatabaseAvailable } from "../server/db";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DAILY_LIMITS: Record<string, number> = {
  free:          1_000,
  starter:       5_000,
  professional: 20_000,
  research:     50_000,
  intelligence: 200_000,
};

const KEY_PREFIX = "mp_live_";

// ---------------------------------------------------------------------------
// Core function (exported for programmatic use)
// ---------------------------------------------------------------------------

export async function generateApiKey(
  clientName: string,
  clientEmail: string,
  tier = "free"
): Promise<string> {
  if (!isDatabaseAvailable() || !pool) {
    throw new Error("DATABASE_URL is not set — cannot connect to the database.");
  }

  const validTiers = Object.keys(DAILY_LIMITS);
  if (!validTiers.includes(tier)) {
    throw new Error(`Invalid tier '${tier}'. Valid tiers: ${validTiers.join(", ")}`);
  }

  // Generate: "mp_live_" + 40 random hex chars = 48-char key
  const rawKey = `${KEY_PREFIX}${crypto.randomBytes(20).toString("hex")}`;
  const keyHash = crypto.createHash("sha256").update(rawKey, "utf8").digest("hex");
  const keyPrefix = rawKey.slice(0, 12); // e.g. "mp_live_abcd"
  const dailyLimit = DAILY_LIMITS[tier];

  await pool.query(
    `INSERT INTO api_keys
       (key_hash, key_prefix, client_name, client_email, tier, daily_limit)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [keyHash, keyPrefix, clientName, clientEmail, tier, dailyLimit]
  );

  console.log("\n✓  API key created successfully\n");
  console.log(`   Client : ${clientName} <${clientEmail}>`);
  console.log(`   Tier   : ${tier}`);
  console.log(`   Limit  : ${dailyLimit.toLocaleString()} calls / day`);
  console.log(`   Prefix : ${keyPrefix}`);
  console.log(`\n   KEY — save this now, it will NOT be shown again:\n`);
  console.log(`   ${rawKey}\n`);

  return rawKey;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const [, , clientName, clientEmail, tier] = process.argv;

if (!clientName || !clientEmail) {
  console.error(
    "\nUsage: tsx scripts/generate-api-key.ts \"<client_name>\" <client_email> [tier]\n"
  );
  console.error("Example:");
  console.error(
    "  tsx scripts/generate-api-key.ts \"Tan Wei Ming\" wm@example.com professional\n"
  );
  process.exit(1);
}

generateApiKey(clientName, clientEmail, tier ?? "free")
  .then(() => pool?.end())
  .catch((err) => {
    console.error("\nError generating API key:", err.message);
    process.exit(1);
  });
