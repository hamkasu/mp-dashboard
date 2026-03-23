/**
 * Copyright by Calmic Sdn Bhd
 *
 * Subscription enforcement middleware.
 *
 * isPremiumUser(userId) — pure function, no HTTP context required.
 * requirePremium        — Express middleware, returns 403 if not premium.
 *
 * Premium = an active subscription whose current_period_end is in the future.
 * Admin users (is_admin = true) bypass the premium check.
 */

import type { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { subscriptions, users } from "../shared/schema";
import { eq, and, gt } from "drizzle-orm";

/**
 * Checks whether a user currently has an active premium subscription.
 * Does NOT touch the session — the caller is responsible for caching.
 */
export async function isPremiumUser(userId: string): Promise<boolean> {
  // Admin users always have access to everything
  const [user] = await db
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, userId));

  if (user?.isAdmin) return true;

  // Check for a valid active subscription
  const [sub] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active"),
        gt(subscriptions.currentPeriodEnd, new Date())
      )
    )
    .limit(1);

  return !!sub;
}

/**
 * Express middleware that enforces premium access on a route.
 *
 * Resolution order (fast → slow):
 *   1. Session cache  — req.session.isPremium === true  → allow
 *   2. Admin session  — req.session.isAdmin === true    → allow (admin bypass)
 *   3. DB lookup      — live subscription check         → allow / deny
 *
 * On denial returns:
 *   HTTP 401 when not logged in  { error: 'authentication_required' }
 *   HTTP 403 when logged in      { error: 'premium_required', upgradeUrl: '/pricing' }
 */
export async function requirePremium(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Admin bypass (no subscription needed)
    if (req.session.isAdmin) {
      return next();
    }

    const userId = req.session.publicUserId;

    if (!userId) {
      res.status(401).json({
        error: "authentication_required",
        message: "Please log in to access this content.",
        loginUrl: "/login",
      });
      return;
    }

    // Use session cache when available; always re-verify on first call per session
    if (req.session.isPremium === true) {
      return next();
    }

    // Live DB check — also refreshes the session cache
    const premium = await isPremiumUser(userId);
    req.session.isPremium = premium;

    if (!premium) {
      res.status(403).json({
        error: "premium_required",
        message: "This feature requires a premium subscription.",
        upgradeUrl: "/pricing",
      });
      return;
    }

    return next();
  } catch (error) {
    console.error("[requirePremium] Error:", error);
    res.status(500).json({ error: "Access check failed" });
  }
}
