/**
 * Copyright by Calmic Sdn Bhd
 *
 * Billing HTTP routes.
 *
 *   POST /api/billing/checkout
 *        Body: { planSlug: string }
 *        Auth: public user session required
 *        Returns: { checkoutUrl, transactionId, providerName, isTestMode }
 *
 *   GET  /api/billing/success?txId=<id>
 *        Called after a successful payment redirect from the provider.
 *        Checks DB status and redirects the browser to the frontend.
 *
 *   GET  /api/billing/cancel?txId=<id>
 *        Called when the user cancels checkout.
 *        Marks the transaction as failed, redirects to the pricing page.
 *
 *   POST /api/billing/webhook/:provider
 *        Raw webhook endpoint — body is kept unparsed for signature verification.
 *        Delegates entirely to BillingService.handleWebhookEvent().
 *
 *   GET  /api/billing/events
 *        Returns the billing event history for the authenticated user.
 *
 *   GET  /api/billing/provider-info
 *        Returns which provider is active and whether test mode is on.
 *        Useful for the frontend to show "Sandbox" badges.
 */

import type { Express, Request, Response } from "express";
import { billingService } from "./billing-service";
import type { BillingProviderName } from "./types";
import { mutationRateLimit, authRateLimit } from "../middleware/security";
import { db } from "../db";
import { billingEvents } from "../../shared/schema";
import { eq, desc } from "drizzle-orm";

const BASE_URL = () => process.env.BASE_URL ?? "";

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

export function setupBillingRoutes(app: Express): void {
  // ── POST /api/billing/checkout ────────────────────────────────────────────

  app.post("/api/billing/checkout", authRateLimit, async (req: Request, res: Response) => {
    try {
      const userId = requirePublicAuth(req, res);
      if (!userId) return;

      const { planSlug } = req.body as { planSlug?: string };
      if (!planSlug) {
        return res.status(400).json({ error: "planSlug is required" });
      }

      const session = await billingService.createCheckoutSession(userId, planSlug);

      return res.json({
        transactionId: session.transactionId,
        checkoutUrl: session.checkoutUrl,
        planName: session.planName,
        amountMyr: session.amountMyr,
        providerName: billingService.providerName,
        isTestMode: billingService.isTestMode,
      });
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      console.error("[BillingRoutes] Checkout error:", error);
      const status = error.statusCode ?? 500;
      return res.status(status).json({ error: error.message ?? "Checkout failed" });
    }
  });

  // ── GET /api/billing/success ──────────────────────────────────────────────
  // Browser redirect after a successful payment — not an API call, so we redirect.

  app.get("/api/billing/success", async (req: Request, res: Response) => {
    const { txId } = req.query as { txId?: string };

    try {
      if (!txId) return res.redirect(`${BASE_URL()}/pricing?result=error`);

      const result = await billingService.handleSuccess(txId);

      if (result.status === "paid") {
        // Invalidate the session's premium cache so the next /me call re-checks
        if (req.session) req.session.isPremium = undefined;
        return res.redirect(`${BASE_URL()}/account?subscribed=1`);
      }

      // Async providers (Billplz) may not have confirmed yet — poll on frontend
      return res.redirect(`${BASE_URL()}/account?pending=1&txId=${encodeURIComponent(txId)}`);
    } catch (err) {
      console.error("[BillingRoutes] Success handler error:", err);
      return res.redirect(`${BASE_URL()}/pricing?result=error`);
    }
  });

  // ── GET /api/billing/cancel ───────────────────────────────────────────────

  app.get("/api/billing/cancel", async (req: Request, res: Response) => {
    const { txId } = req.query as { txId?: string };

    try {
      if (txId) await billingService.handleCancel(txId);
    } catch (err) {
      console.error("[BillingRoutes] Cancel handler error:", err);
    }

    return res.redirect(`${BASE_URL()}/pricing?result=cancelled`);
  });

  // ── POST /api/billing/webhook/:provider ───────────────────────────────────
  // IMPORTANT: body-parser must NOT parse this route so rawBody is available
  // for signature verification.  Express's rawBody capture (configured in
  // server/index.ts via `verify` callback on express.json) fills req.rawBody.

  app.post(
    "/api/billing/webhook/:provider",
    mutationRateLimit,
    async (req: Request, res: Response) => {
      const providerName = req.params.provider as BillingProviderName;

      try {
        // Raw body for signature check (captured by express.json verify callback)
        const rawBody = req.rawBody as Buffer | string | undefined;

        if (!rawBody) {
          console.warn("[BillingRoutes] rawBody not available — signature cannot be verified");
        }

        await billingService.handleWebhookEvent(
          providerName,
          req.body,
          req.headers as Record<string, string | string[] | undefined>,
          rawBody ?? ""
        );

        return res.json({ received: true });
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        console.error(`[BillingRoutes] Webhook error (${providerName}):`, error.message);
        const status = error.statusCode ?? 500;
        return res.status(status).json({ error: error.message });
      }
    }
  );

  // ── GET /api/billing/events ───────────────────────────────────────────────

  app.get("/api/billing/events", async (req: Request, res: Response) => {
    try {
      const userId = requirePublicAuth(req, res);
      if (!userId) return;

      const events = await db
        .select({
          id: billingEvents.id,
          eventType: billingEvents.eventType,
          billingProvider: billingEvents.billingProvider,
          subscriptionId: billingEvents.subscriptionId,
          processedAt: billingEvents.processedAt,
        })
        .from(billingEvents)
        .where(eq(billingEvents.userId, userId))
        .orderBy(desc(billingEvents.processedAt))
        .limit(50);

      return res.json(events);
    } catch (err) {
      console.error("[BillingRoutes] Events error:", err);
      return res.status(500).json({ error: "Failed to fetch billing events" });
    }
  });

  // ── GET /api/billing/provider-info ────────────────────────────────────────

  app.get("/api/billing/provider-info", (_req: Request, res: Response) => {
    return res.json({
      provider: billingService.providerName,
      isTestMode: billingService.isTestMode,
    });
  });
}
