/**
 * Copyright by Calmic Sdn Bhd
 *
 * API key authentication middleware for the public /api/v1/* routes.
 *
 * requireApiKey([requiredTier])
 *   ─ Reads  Bearer <token> from the Authorization header
 *   ─ Looks up the SHA-256 hash in api_keys WHERE is_active = TRUE
 *   ─ Enforces daily rate limits and optional tier gating
 *   ─ Attaches the api_keys row to req.apiClient
 *   ─ Adds standard rate-limit response headers
 */

import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { pool } from "../db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiKeyRow {
  id: number;
  key_hash: string;
  key_prefix: string;
  client_name: string;
  client_email: string;
  tier: string;
  daily_limit: number;
  calls_today: number;
  calls_total: number;
  last_reset_date: Date;
  webhook_url: string | null;
  is_active: boolean;
  created_at: Date;
  expires_at: Date | null;
  notes: string | null;
}

declare global {
  namespace Express {
    interface Request {
      apiClient?: ApiKeyRow;
    }
  }
}

// ---------------------------------------------------------------------------
// Tier ordering  (lowest → highest)
// ---------------------------------------------------------------------------

const TIER_ORDER = [
  "free",
  "starter",
  "professional",
  "research",
  "intelligence",
] as const;

type Tier = (typeof TIER_ORDER)[number];

function tierIndex(tier: string): number {
  const idx = TIER_ORDER.indexOf(tier as Tier);
  return idx === -1 ? 0 : idx;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Unix timestamp (seconds) of next midnight MYT (UTC+8). */
function midnightMYTUnix(): number {
  const MYT_OFFSET_MS = 8 * 60 * 60 * 1000;
  const dayMs = 24 * 60 * 60 * 1000;
  // Shift "now" into MYT then floor to the start of the next day, then shift back
  const nowAsMYT = Date.now() + MYT_OFFSET_MS;
  const nextMidnightAsMYT = (Math.floor(nowAsMYT / dayMs) + 1) * dayMs;
  return Math.floor((nextMidnightAsMYT - MYT_OFFSET_MS) / 1000);
}

function sha256hex(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

/** YYYY-MM-DD string for today in UTC (matches Postgres CURRENT_DATE behaviour). */
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function toDateString(d: Date | string): string {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

// ---------------------------------------------------------------------------
// Middleware factory
// ---------------------------------------------------------------------------

/**
 * Express middleware that validates a Bearer API key.
 *
 * @param requiredTier  Optional minimum tier. Defaults to "free" (any tier passes).
 *
 * Attach point: req.apiClient — the full api_keys row (calls_today already
 * reflects any daily reset that happened during this request).
 *
 * Rate-limit headers added to every authenticated response:
 *   X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset (Unix s),
 *   X-API-Version: v1
 */
export function requireApiKey(requiredTier?: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!pool) {
      res.status(503).json({ error: "service_unavailable", message: "Database unavailable" });
      return;
    }

    // ── 1. Extract Bearer token ──────────────────────────────────────────
    const authHeader = req.headers.authorization ?? "";
    const spaceIdx = authHeader.indexOf(" ");
    const scheme = spaceIdx === -1 ? authHeader : authHeader.slice(0, spaceIdx);
    const rawKey = spaceIdx === -1 ? "" : authHeader.slice(spaceIdx + 1).trim();

    if (!rawKey || scheme.toLowerCase() !== "bearer") {
      res.status(401).json({
        error: "unauthorized",
        message: "Missing or malformed Authorization header. Expected: Bearer <key>",
      });
      return;
    }

    // ── 2. Hash and look up ──────────────────────────────────────────────
    const keyHash = sha256hex(rawKey);

    let row: ApiKeyRow;
    try {
      const result = await pool.query<ApiKeyRow>(
        "SELECT * FROM api_keys WHERE key_hash = $1 AND is_active = TRUE LIMIT 1",
        [keyHash]
      );
      if (result.rowCount === 0) {
        res.status(401).json({ error: "unauthorized", message: "Invalid or inactive API key" });
        return;
      }
      row = result.rows[0];
    } catch (err) {
      console.error("[requireApiKey] DB lookup error:", err);
      res.status(500).json({ error: "internal_error", message: "Authentication check failed" });
      return;
    }

    // ── 3. Expiry check ──────────────────────────────────────────────────
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      res.status(401).json({ error: "unauthorized", message: "API key has expired" });
      return;
    }

    // ── 4. Effective calls_today (account for daily reset) ───────────────
    const today = todayISO();
    const lastReset = toDateString(row.last_reset_date);
    const effectiveCalls = lastReset < today ? 0 : row.calls_today;

    // ── 5. Rate-limit check ──────────────────────────────────────────────
    if (effectiveCalls >= row.daily_limit) {
      res
        .status(429)
        .set({
          "X-RateLimit-Limit": String(row.daily_limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(midnightMYTUnix()),
          "X-API-Version": "v1",
        })
        .json({
          error: "rate_limit_exceeded",
          message: `Daily limit of ${row.daily_limit} calls reached for tier '${row.tier}'`,
          tier: row.tier,
          daily_limit: row.daily_limit,
          resets_at_unix: midnightMYTUnix(),
        });
      return;
    }

    // ── 6. Tier gate ─────────────────────────────────────────────────────
    if (requiredTier && tierIndex(row.tier) < tierIndex(requiredTier)) {
      res.status(403).json({
        error: "insufficient_tier",
        message: `This endpoint requires tier '${requiredTier}' or higher. Your tier: '${row.tier}'`,
        your_tier: row.tier,
        required_tier: requiredTier,
        upgrade_url: "https://myparliament.calmic.com.my/pricing",
      });
      return;
    }

    // ── 7. Increment counters (reset + increment in one UPDATE) ──────────
    try {
      await pool.query(
        `UPDATE api_keys
            SET calls_today     = CASE WHEN last_reset_date < CURRENT_DATE THEN 1 ELSE calls_today + 1 END,
                calls_total     = calls_total + 1,
                last_reset_date = CURRENT_DATE
          WHERE key_hash = $1`,
        [keyHash]
      );
    } catch (err) {
      console.error("[requireApiKey] Counter increment error:", err);
      // Non-fatal — still allow the request through
    }

    // ── 8. Attach client + set headers ───────────────────────────────────
    const newCallsToday = effectiveCalls + 1;
    const remaining = Math.max(0, row.daily_limit - newCallsToday);

    req.apiClient = {
      ...row,
      calls_today: newCallsToday,
      last_reset_date: new Date(today),
    };

    res.set({
      "X-RateLimit-Limit": String(row.daily_limit),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset": String(midnightMYTUnix()),
      "X-API-Version": "v1",
    });

    next();
  };
}
