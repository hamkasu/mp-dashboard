/**
 * Copyright by Calmic Sdn Bhd
 *
 * Subscription management routes.
 *
 * These routes handle subscription state that doesn't require a checkout flow.
 * All payment/checkout/webhook logic has been moved to
 * server/billing/billing-routes.ts → BillingService.
 *
 *   GET  /api/subscription/plans          — list active plans (public)
 *   GET  /api/subscription/status         — current user's subscription (auth required)
 *   POST /api/subscription/cancel         — cancel at period end (auth required)
 *   POST /api/subscription/admin/grant    — manually grant premium (admin only)
 *   POST /api/subscription/admin/revoke   — manually revoke premium (admin only)
 *
 * Checkout / webhook routes:
 *   POST /api/billing/checkout
 *   POST /api/billing/webhook/:provider
 *   GET  /api/billing/success
 *   GET  /api/billing/cancel
 */

import type { Express, Request, Response } from "express";
import { db } from "./db";
import { subscriptionPlans, subscriptions } from "../shared/schema";
import { eq, and, gt, desc } from "drizzle-orm";
import { requireAdmin } from "./simple-auth";
import { mutationRateLimit } from "./middleware/security";
import { isPremiumUser } from "./subscription-middleware";
import { billingService } from "./billing/billing-service";

// ─── auth guard ───────────────────────────────────────────────────────────────

function requirePublicAuth(req: Request, res: Response): string | null {
  const userId = req.session.publicUserId;
  if (!userId) {
    res.status(401).json({
      error: "authentication_required",
      message: "Please log in.",
      loginUrl: "/login",
    });
    return null;
  }
  return userId;
}

// ─── route registration ───────────────────────────────────────────────────────

export function setupSubscriptionRoutes(app: Express): void {
  // ── GET /api/subscription/plans ────────────────────────────────────────────

  app.get("/api/subscription/plans", async (_req: Request, res: Response) => {
    try {
      const plans = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.isActive, true))
        .orderBy(subscriptionPlans.priceMyr);

      return res.json(plans);
    } catch (error) {
      console.error("[Subscription] Error fetching plans:", error);
      return res.status(500).json({ error: "Failed to fetch plans" });
    }
  });

  // ── GET /api/subscription/status ───────────────────────────────────────────

  app.get("/api/subscription/status", async (req: Request, res: Response) => {
    try {
      const userId = requirePublicAuth(req, res);
      if (!userId) return;

      const [sub] = await db
        .select({
          id: subscriptions.id,
          status: subscriptions.status,
          isTrial: subscriptions.isTrial,
          currentPeriodStart: subscriptions.currentPeriodStart,
          currentPeriodEnd: subscriptions.currentPeriodEnd,
          cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
          billingProvider: subscriptions.billingProvider,
          planSlug: subscriptionPlans.slug,
          planName: subscriptionPlans.name,
          priceMyr: subscriptionPlans.priceMyr,
          interval: subscriptionPlans.interval,
        })
        .from(subscriptions)
        .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
        .where(
          and(
            eq(subscriptions.userId, userId),
            eq(subscriptions.status, "active"),
            gt(subscriptions.currentPeriodEnd, new Date())
          )
        )
        .orderBy(desc(subscriptions.currentPeriodEnd))
        .limit(1);

      const premium = await isPremiumUser(userId);
      req.session.isPremium = premium;

      return res.json({
        isPremium: premium,
        subscription: sub ?? null,
      });
    } catch (error) {
      console.error("[Subscription] Error fetching status:", error);
      return res.status(500).json({ error: "Failed to fetch subscription status" });
    }
  });

  // ── POST /api/subscription/cancel ──────────────────────────────────────────

  app.post("/api/subscription/cancel", mutationRateLimit, async (req: Request, res: Response) => {
    try {
      const userId = requirePublicAuth(req, res);
      if (!userId) return;

      await billingService.handleCancelAtPeriodEnd(userId);

      // Invalidate cached premium status so next request re-checks
      req.session.isPremium = undefined;

      return res.json({
        message: "Subscription will be cancelled at the end of the current billing period.",
      });
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      const status = error.statusCode ?? 500;
      return res.status(status).json({ error: error.message ?? "Cancellation failed" });
    }
  });

  // ── POST /api/subscription/admin/grant ─────────────────────────────────────

  app.post(
    "/api/subscription/admin/grant",
    requireAdmin,
    mutationRateLimit,
    async (req: Request, res: Response) => {
      try {
        const { userId, planSlug, durationDays } = req.body as {
          userId?: string;
          planSlug?: string;
          durationDays?: number;
        };

        if (!userId || !planSlug) {
          return res.status(400).json({ error: "userId and planSlug are required" });
        }

        const sub = await billingService.handleManualGrant(userId, planSlug, durationDays);
        return res.status(201).json(sub);
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        console.error("[Subscription] Admin grant error:", error);
        return res.status(error.statusCode ?? 500).json({ error: error.message ?? "Failed to grant subscription" });
      }
    }
  );

  // ── POST /api/subscription/admin/revoke ────────────────────────────────────

  app.post(
    "/api/subscription/admin/revoke",
    requireAdmin,
    mutationRateLimit,
    async (req: Request, res: Response) => {
      try {
        const { userId } = req.body as { userId?: string };

        if (!userId) {
          return res.status(400).json({ error: "userId is required" });
        }

        await db
          .update(subscriptions)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(
            and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active"))
          );

        return res.json({ message: "All active subscriptions for user revoked." });
      } catch (error) {
        console.error("[Subscription] Admin revoke error:", error);
        return res.status(500).json({ error: "Failed to revoke subscription" });
      }
    }
  );
}
