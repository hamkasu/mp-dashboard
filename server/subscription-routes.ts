/**
 * Copyright by Calmic Sdn Bhd
 *
 * Subscription management routes.
 *
 *   GET  /api/subscription/plans          — list active plans (public)
 *   GET  /api/subscription/status         — current user's subscription (auth required)
 *   POST /api/subscription/cancel         — cancel at period end (auth required)
 *   POST /api/subscription/admin/grant    — manually grant premium (admin only)
 *   POST /api/subscription/admin/revoke   — manually revoke premium (admin only)
 *
 * Payment webhook (Billplz):
 *   POST /api/subscription/webhook/billplz
 *
 * Checkout initiation lives here too as a stub that can be wired to any
 * payment provider without changing the route contract:
 *   POST /api/subscription/checkout
 */

import type { Express, Request, Response } from "express";
import { db } from "./db";
import {
  subscriptionPlans,
  subscriptions,
  paymentTransactions,
  users,
} from "../shared/schema";
import { eq, and, gt, desc } from "drizzle-orm";
import { requireAdmin } from "./simple-auth";
import { mutationRateLimit, authRateLimit } from "./middleware/security";
import { isPremiumUser } from "./subscription-middleware";
import crypto from "crypto";

// ─── helpers ─────────────────────────────────────────────────────────────────

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

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function addYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
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

  // ── POST /api/subscription/checkout ────────────────────────────────────────
  // Stub: creates a pending transaction and returns a checkout URL.
  // Wire a real payment provider (Billplz / Stripe) by replacing the body.
  app.post("/api/subscription/checkout", authRateLimit, async (req: Request, res: Response) => {
    try {
      const userId = requirePublicAuth(req, res);
      if (!userId) return;

      const { planSlug } = req.body as { planSlug?: string };
      if (!planSlug) {
        return res.status(400).json({ error: "planSlug is required" });
      }

      const [plan] = await db
        .select()
        .from(subscriptionPlans)
        .where(and(eq(subscriptionPlans.slug, planSlug), eq(subscriptionPlans.isActive, true)));

      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }

      const [user] = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Create a pending payment transaction so we can reconcile later
      const [tx] = await db
        .insert(paymentTransactions)
        .values({
          userId,
          amountMyr: plan.priceMyr,
          status: "pending",
          billingProvider: "billplz",   // switch to 'stripe' for international
          providerPayload: {
            planSlug: plan.slug,
            planName: plan.name,
            userEmail: user.email,
            initiatedAt: new Date().toISOString(),
          },
        })
        .returning({ id: paymentTransactions.id });

      // ── Billplz integration placeholder ───────────────────────────────────
      // Replace the block below with a real Billplz API call:
      //
      //   const billplzResult = await createBillplzBill({
      //     collectionId: process.env.BILLPLZ_COLLECTION_ID!,
      //     email: user.email,
      //     name: user.name,
      //     amount: plan.priceMyr,          // in sen
      //     description: `MyParliament ${plan.name}`,
      //     redirectUrl: `${BASE_URL}/subscription/success?txId=${tx.id}`,
      //     callbackUrl: `${BASE_URL}/api/subscription/webhook/billplz`,
      //     reference1Label: "Transaction",
      //     reference1: tx.id,
      //   });
      //
      //   await db.update(paymentTransactions)
      //     .set({ providerBillId: billplzResult.id })
      //     .where(eq(paymentTransactions.id, tx.id));
      //
      //   return res.json({ checkoutUrl: billplzResult.url });
      // ── end placeholder ───────────────────────────────────────────────────

      return res.json({
        message:
          "Payment provider not yet configured. " +
          "Set BILLPLZ_API_KEY and BILLPLZ_COLLECTION_ID to enable payments.",
        transactionId: tx.id,
        checkoutUrl: null,
      });
    } catch (error) {
      console.error("[Subscription] Checkout error:", error);
      return res.status(500).json({ error: "Checkout failed" });
    }
  });

  // ── POST /api/subscription/webhook/billplz ─────────────────────────────────
  // Billplz sends a POST with x-www-form-urlencoded data after payment.
  // Signature verification uses X-Signature header (HMAC-SHA256).
  app.post(
    "/api/subscription/webhook/billplz",
    mutationRateLimit,
    async (req: Request, res: Response) => {
      try {
        const xSignature = req.headers["x-signature"] as string | undefined;
        const apiKey = process.env.BILLPLZ_API_KEY;

        if (apiKey && xSignature) {
          // Billplz signature: HMAC-SHA256 of sorted key|value pairs joined by "|"
          const payload = req.body as Record<string, string>;
          const signatureFields = [
            "amount",
            "collection_id",
            "due_at",
            "email",
            "id",
            "mobile",
            "name",
            "paid",
            "paid_amount",
            "paid_at",
            "reference_1",
            "reference_1_label",
            "reference_2",
            "reference_2_label",
            "state",
            "url",
          ];

          const message = signatureFields
            .filter((k) => k in payload)
            .map((k) => `${k}|${payload[k]}`)
            .join("|");

          const expected = crypto
            .createHmac("sha256", apiKey)
            .update(message)
            .digest("hex");

          if (expected !== xSignature) {
            console.warn("[Subscription] Billplz webhook signature mismatch");
            return res.status(400).json({ error: "Invalid signature" });
          }
        }

        const { id: billId, paid, reference_1: txId } = req.body as {
          id?: string;
          paid?: string;
          reference_1?: string;
        };

        if (!txId) {
          return res.status(400).json({ error: "Missing reference_1 (transaction id)" });
        }

        const [tx] = await db
          .select()
          .from(paymentTransactions)
          .where(eq(paymentTransactions.id, txId));

        if (!tx) {
          return res.status(404).json({ error: "Transaction not found" });
        }

        if (paid !== "true") {
          // Update transaction status to failed
          await db
            .update(paymentTransactions)
            .set({ status: "failed", providerBillId: billId ?? null })
            .where(eq(paymentTransactions.id, txId));
          return res.json({ received: true });
        }

        // Retrieve plan from transaction payload
        const payload = tx.providerPayload as { planSlug?: string } | null;
        const planSlug = payload?.planSlug;

        const [plan] = planSlug
          ? await db
              .select()
              .from(subscriptionPlans)
              .where(eq(subscriptionPlans.slug, planSlug))
          : [];

        if (!plan) {
          console.error("[Subscription] Cannot resolve plan from webhook payload:", payload);
          return res.status(400).json({ error: "Plan not found" });
        }

        const now = new Date();
        const periodEnd =
          plan.interval === "year" ? addYears(now, 1) : addMonths(now, 1);

        // Create or renew subscription
        const [newSub] = await db
          .insert(subscriptions)
          .values({
            userId: tx.userId,
            planId: plan.id,
            status: "active",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            billingProvider: "billplz",
            billingProviderId: billId ?? null,
          })
          .returning({ id: subscriptions.id });

        // Mark transaction as paid
        await db
          .update(paymentTransactions)
          .set({
            status: "paid",
            providerBillId: billId ?? null,
            subscriptionId: newSub.id,
            providerPayload: req.body,
          })
          .where(eq(paymentTransactions.id, txId));

        // Invalidate session cache — user's next request will re-check
        // (We can't directly touch the session here without its ID)

        return res.json({ received: true });
      } catch (error) {
        console.error("[Subscription] Webhook error:", error);
        return res.status(500).json({ error: "Webhook processing failed" });
      }
    }
  );

  // ── POST /api/subscription/cancel ──────────────────────────────────────────
  app.post("/api/subscription/cancel", mutationRateLimit, async (req: Request, res: Response) => {
    try {
      const userId = requirePublicAuth(req, res);
      if (!userId) return;

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
        .orderBy(desc(subscriptions.currentPeriodEnd))
        .limit(1);

      if (!sub) {
        return res.status(404).json({ error: "No active subscription found" });
      }

      await db
        .update(subscriptions)
        .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
        .where(eq(subscriptions.id, sub.id));

      return res.json({
        message:
          "Subscription will be cancelled at the end of the current billing period.",
      });
    } catch (error) {
      console.error("[Subscription] Cancel error:", error);
      return res.status(500).json({ error: "Cancellation failed" });
    }
  });

  // ── POST /api/subscription/admin/grant ─────────────────────────────────────
  // Allows an admin to manually grant premium access (e.g. for testers, press).
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

        const [plan] = await db
          .select()
          .from(subscriptionPlans)
          .where(eq(subscriptionPlans.slug, planSlug));

        if (!plan) {
          return res.status(404).json({ error: "Plan not found" });
        }

        const days = durationDays ?? 30;
        const now = new Date();
        const periodEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

        const [sub] = await db
          .insert(subscriptions)
          .values({
            userId,
            planId: plan.id,
            status: "active",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            billingProvider: "manual",
          })
          .returning();

        return res.status(201).json(sub);
      } catch (error) {
        console.error("[Subscription] Admin grant error:", error);
        return res.status(500).json({ error: "Failed to grant subscription" });
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
