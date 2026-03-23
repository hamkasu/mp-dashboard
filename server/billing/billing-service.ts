/**
 * Copyright by Calmic Sdn Bhd
 *
 * BillingService — provider-agnostic billing orchestrator.
 *
 * All DB writes live here; providers only deal with HTTP / signature logic.
 *
 * Lifecycle
 * ─────────
 *  1. createCheckoutSession(userId, planSlug)
 *       → inserts a pending payment_transaction
 *       → calls provider.createCheckoutSession()
 *       → returns { checkoutUrl, transactionId }
 *
 *  2. handleWebhookEvent(provider, body, headers, rawBody)
 *       → calls provider.verifyWebhookSignature()
 *       → calls provider.parseWebhookEvent()
 *       → idempotency check (billing_events unique index)
 *       → dispatches to the correct handler:
 *           payment_success  → activateSubscription()
 *           payment_failed   → failTransaction()
 *           cancelled        → cancelSubscription()
 *           renewed          → renewSubscription()
 *           refunded         → recordRefund()
 *       → inserts billing_event row
 *
 *  3. handleSuccess(transactionId)   — called after user returns from checkout
 *  4. handleCancel(transactionId)    — called when user clicks "cancel" in checkout
 *
 * Environment variables (consumed by providers, not this class):
 *   BILLING_PROVIDER         — 'billplz' | 'stripe' | 'manual'  (default: 'manual')
 *   BASE_URL                 — public server URL
 */

import { db } from "../db";
import {
  paymentTransactions,
  subscriptions,
  subscriptionPlans,
  billingEvents,
  users,
} from "../../shared/schema";
import { eq, and, gt, desc } from "drizzle-orm";

import type {
  IBillingProvider,
  BillingProviderName,
  BillingEventType,
  CheckoutSession,
  ParsedWebhookEvent,
} from "./types";
import { BillplzProvider } from "./providers/billplz-provider";
import { StripeProvider } from "./providers/stripe-provider";
import { ManualProvider } from "./providers/manual-provider";

// ─── Factory ──────────────────────────────────────────────────────────────────

const PROVIDERS: Record<BillingProviderName, IBillingProvider> = {
  billplz: new BillplzProvider(),
  stripe: new StripeProvider(),
  manual: new ManualProvider(),
};

function getActiveProvider(): IBillingProvider {
  const name = (process.env.BILLING_PROVIDER ?? "manual") as BillingProviderName;
  return PROVIDERS[name] ?? PROVIDERS.manual;
}

function getProvider(name: BillingProviderName): IBillingProvider | null {
  return PROVIDERS[name] ?? null;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function addYears(date: Date, n: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + n);
  return d;
}

function periodEnd(interval: string, from = new Date()): Date {
  return interval === "year" ? addYears(from, 1) : addMonths(from, 1);
}

// ─── BillingService ───────────────────────────────────────────────────────────

export class BillingService {
  private readonly provider: IBillingProvider;

  constructor(provider?: IBillingProvider) {
    this.provider = provider ?? getActiveProvider();
  }

  get providerName(): BillingProviderName {
    return this.provider.name;
  }

  get isTestMode(): boolean {
    return this.provider.isTestMode;
  }

  // ── createCheckoutSession ──────────────────────────────────────────────────

  async createCheckoutSession(
    userId: string,
    planSlug: string
  ): Promise<CheckoutSession & { planName: string; amountMyr: number }> {
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(and(eq(subscriptionPlans.slug, planSlug), eq(subscriptionPlans.isActive, true)));

    if (!plan) throw new Error(`Plan not found: ${planSlug}`);

    const [user] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) throw new Error(`User not found: ${userId}`);

    const base = process.env.BASE_URL ?? "";

    // Insert pending transaction as our canonical record
    const [tx] = await db
      .insert(paymentTransactions)
      .values({
        userId,
        amountMyr: plan.priceMyr,
        status: "pending",
        billingProvider: this.provider.name,
        providerPayload: {
          planSlug: plan.slug,
          planName: plan.name,
          interval: plan.interval,
          initiatedAt: new Date().toISOString(),
        },
      })
      .returning({ id: paymentTransactions.id });

    const session = await this.provider.createCheckoutSession({
      userId,
      userEmail: user.email,
      userName: user.name,
      planSlug: plan.slug,
      planName: plan.name,
      amountMyr: plan.priceMyr,
      interval: plan.interval,
      transactionId: tx.id,
      successUrl: `${base}/billing/success?txId=${tx.id}`,
      cancelUrl: `${base}/billing/cancel?txId=${tx.id}`,
    });

    // Persist provider's own bill id if available immediately (e.g. Billplz)
    if (session.providerBillId) {
      await db
        .update(paymentTransactions)
        .set({ providerBillId: session.providerBillId })
        .where(eq(paymentTransactions.id, tx.id));
    }

    return {
      ...session,
      planName: plan.name,
      amountMyr: plan.priceMyr,
    };
  }

  // ── handleWebhookEvent ─────────────────────────────────────────────────────

  /**
   * Entry point for all inbound webhook requests.
   *
   * @param providerName  Which provider sent this event (from URL param)
   * @param body          Parsed request body
   * @param headers       Raw HTTP headers
   * @param rawBody       Unparsed buffer/string for signature verification
   * @returns             { received: true } on success
   * @throws              On invalid signature or unknown transaction
   */
  async handleWebhookEvent(
    providerName: BillingProviderName,
    body: unknown,
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer | string
  ): Promise<{ received: true }> {
    const provider = getProvider(providerName);
    if (!provider) throw new Error(`Unknown provider: ${providerName}`);

    // Signature verification (skip only when no key is configured in dev)
    const signatureValid = provider.verifyWebhookSignature(headers, rawBody);
    if (!signatureValid) {
      throw Object.assign(new Error("Webhook signature verification failed"), {
        statusCode: 400,
      });
    }

    const event = await provider.parseWebhookEvent(body, headers);

    // Idempotency: skip if we already processed this exact provider event
    if (event.providerBillId) {
      const existing = await db
        .select({ id: billingEvents.id })
        .from(billingEvents)
        .where(
          and(
            eq(billingEvents.billingProvider, providerName),
            eq(billingEvents.providerEventId, event.providerBillId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        console.log(
          `[BillingService] Duplicate webhook skipped: ${providerName}/${event.providerBillId}`
        );
        return { received: true };
      }
    }

    // Dispatch to the correct handler
    switch (event.type) {
      case "subscription_created":
      case "payment_success":
        await this.handlePaymentSuccess(event, providerName);
        break;

      case "payment_failed":
        await this.handlePaymentFailed(event, providerName);
        break;

      case "cancelled":
        await this.handleCancellation(event, providerName);
        break;

      case "renewed":
        await this.handleRenewal(event, providerName);
        break;

      case "refunded":
        await this.handleRefund(event, providerName);
        break;

      default:
        console.warn(`[BillingService] Unhandled event type: ${(event as ParsedWebhookEvent).type}`);
    }

    return { received: true };
  }

  // ── handleSuccess ─────────────────────────────────────────────────────────
  // Called when the user returns to /billing/success after checkout.
  // For async providers (Billplz) the subscription may not be active yet —
  // this just gives the UI something to show.

  async handleSuccess(transactionId: string): Promise<{ status: string; subscriptionId?: string }> {
    const [tx] = await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.id, transactionId));

    if (!tx) return { status: "not_found" };

    return {
      status: tx.status,
      subscriptionId: tx.subscriptionId ?? undefined,
    };
  }

  // ── handleCancel ──────────────────────────────────────────────────────────
  // Called when the user clicks "cancel" and returns from the payment page.

  async handleCancel(transactionId: string): Promise<void> {
    const [tx] = await db
      .select({ id: paymentTransactions.id, status: paymentTransactions.status })
      .from(paymentTransactions)
      .where(eq(paymentTransactions.id, transactionId));

    if (!tx || tx.status !== "pending") return;

    await db
      .update(paymentTransactions)
      .set({ status: "failed" })
      .where(eq(paymentTransactions.id, transactionId));
  }

  // ── handleManualGrant ─────────────────────────────────────────────────────
  // For admin-granted subscriptions (no real payment).

  async handleManualGrant(
    userId: string,
    planSlug: string,
    durationDays: number = 30
  ): Promise<typeof subscriptions.$inferSelect> {
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.slug, planSlug));

    if (!plan) throw new Error(`Plan not found: ${planSlug}`);

    const now = new Date();
    const end = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // Create a zero-cost transaction record for the audit trail
    const [tx] = await db
      .insert(paymentTransactions)
      .values({
        userId,
        amountMyr: 0,
        status: "paid",
        billingProvider: "manual",
        providerPayload: { grantedAt: now.toISOString(), durationDays },
      })
      .returning({ id: paymentTransactions.id });

    const [sub] = await db
      .insert(subscriptions)
      .values({
        userId,
        planId: plan.id,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: end,
        billingProvider: "manual",
      })
      .returning();

    await db
      .update(paymentTransactions)
      .set({ subscriptionId: sub.id })
      .where(eq(paymentTransactions.id, tx.id));

    await this.recordEvent({
      userId,
      subscriptionId: sub.id,
      transactionId: tx.id,
      eventType: "subscription_created",
      billingProvider: "manual",
      rawPayload: { planSlug, durationDays },
    });

    return sub;
  }

  // ── handleCancelAtPeriodEnd ───────────────────────────────────────────────

  async handleCancelAtPeriodEnd(userId: string): Promise<void> {
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

    if (!sub) throw Object.assign(new Error("No active subscription found"), { statusCode: 404 });

    await db
      .update(subscriptions)
      .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
      .where(eq(subscriptions.id, sub.id));

    await this.recordEvent({
      userId,
      subscriptionId: sub.id,
      eventType: "cancelled",
      billingProvider: this.provider.name,
      rawPayload: { requestedAt: new Date().toISOString() },
    });
  }

  // ─── private event handlers ────────────────────────────────────────────────

  private async handlePaymentSuccess(
    event: ParsedWebhookEvent,
    providerName: BillingProviderName
  ): Promise<void> {
    const tx = await this.requireTransaction(event.transactionId);

    const payload = tx.providerPayload as { planSlug?: string; interval?: string } | null;
    const planSlug = payload?.planSlug;
    if (!planSlug) throw new Error(`[BillingService] No planSlug in transaction ${tx.id} payload`);

    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.slug, planSlug));

    if (!plan) throw new Error(`[BillingService] Plan not found: ${planSlug}`);

    const now = new Date();
    const end = periodEnd(plan.interval, now);

    const [sub] = await db
      .insert(subscriptions)
      .values({
        userId: tx.userId,
        planId: plan.id,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: end,
        billingProvider: providerName,
        billingProviderId: event.providerBillId || null,
      })
      .returning();

    await db
      .update(paymentTransactions)
      .set({
        status: "paid",
        subscriptionId: sub.id,
        providerBillId: event.providerBillId || null,
        providerPayload: event.rawPayload,
      })
      .where(eq(paymentTransactions.id, tx.id));

    await this.recordEvent({
      userId: tx.userId,
      subscriptionId: sub.id,
      transactionId: tx.id,
      eventType: "subscription_created",
      billingProvider: providerName,
      providerEventId: event.providerBillId,
      rawPayload: event.rawPayload,
    });
  }

  private async handlePaymentFailed(
    event: ParsedWebhookEvent,
    providerName: BillingProviderName
  ): Promise<void> {
    const tx = await this.requireTransaction(event.transactionId);

    await db
      .update(paymentTransactions)
      .set({
        status: "failed",
        providerBillId: event.providerBillId || null,
        providerPayload: event.rawPayload,
      })
      .where(eq(paymentTransactions.id, tx.id));

    await this.recordEvent({
      userId: tx.userId,
      transactionId: tx.id,
      eventType: "payment_failed",
      billingProvider: providerName,
      providerEventId: event.providerBillId,
      rawPayload: event.rawPayload,
    });
  }

  private async handleCancellation(
    event: ParsedWebhookEvent,
    providerName: BillingProviderName
  ): Promise<void> {
    // Find active subscription by provider id
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.billingProviderId, event.providerBillId),
          eq(subscriptions.status, "active")
        )
      )
      .limit(1);

    if (!sub) {
      console.warn(
        `[BillingService] No active subscription for providerBillId: ${event.providerBillId}`
      );
      return;
    }

    await db
      .update(subscriptions)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(subscriptions.id, sub.id));

    await this.recordEvent({
      userId: sub.userId,
      subscriptionId: sub.id,
      eventType: "cancelled",
      billingProvider: providerName,
      providerEventId: event.providerBillId,
      rawPayload: event.rawPayload,
    });
  }

  private async handleRenewal(
    event: ParsedWebhookEvent,
    providerName: BillingProviderName
  ): Promise<void> {
    const tx = await this.requireTransaction(event.transactionId);

    // Find the existing active subscription to extend it
    const [existingSub] = await db
      .select()
      .from(subscriptions)
      .where(
        and(eq(subscriptions.userId, tx.userId), eq(subscriptions.status, "active"))
      )
      .orderBy(desc(subscriptions.currentPeriodEnd))
      .limit(1);

    if (!existingSub) {
      // Treat as a new subscription_created if none found
      await this.handlePaymentSuccess(event, providerName);
      return;
    }

    const newEnd = periodEnd(existingSub.planId, existingSub.currentPeriodEnd);

    await db
      .update(subscriptions)
      .set({
        currentPeriodEnd: newEnd,
        cancelAtPeriodEnd: false,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, existingSub.id));

    await db
      .update(paymentTransactions)
      .set({
        status: "paid",
        subscriptionId: existingSub.id,
        providerBillId: event.providerBillId || null,
        providerPayload: event.rawPayload,
      })
      .where(eq(paymentTransactions.id, tx.id));

    await this.recordEvent({
      userId: tx.userId,
      subscriptionId: existingSub.id,
      transactionId: tx.id,
      eventType: "renewed",
      billingProvider: providerName,
      providerEventId: event.providerBillId,
      rawPayload: event.rawPayload,
    });
  }

  private async handleRefund(
    event: ParsedWebhookEvent,
    providerName: BillingProviderName
  ): Promise<void> {
    // Find the transaction by provider bill id
    const [tx] = await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.providerBillId, event.providerBillId))
      .limit(1);

    if (!tx) {
      console.warn(`[BillingService] No transaction for refund providerBillId: ${event.providerBillId}`);
      return;
    }

    await db
      .update(paymentTransactions)
      .set({ status: "refunded" })
      .where(eq(paymentTransactions.id, tx.id));

    // Cancel the associated subscription immediately on refund
    if (tx.subscriptionId) {
      await db
        .update(subscriptions)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(subscriptions.id, tx.subscriptionId));
    }

    await this.recordEvent({
      userId: tx.userId,
      subscriptionId: tx.subscriptionId ?? undefined,
      transactionId: tx.id,
      eventType: "refunded",
      billingProvider: providerName,
      providerEventId: event.providerBillId,
      rawPayload: event.rawPayload,
    });
  }

  // ── private helpers ────────────────────────────────────────────────────────

  private async requireTransaction(transactionId: string) {
    if (!transactionId) {
      throw Object.assign(new Error("Missing transaction id"), { statusCode: 400 });
    }

    const [tx] = await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.id, transactionId));

    if (!tx) {
      throw Object.assign(
        new Error(`Transaction not found: ${transactionId}`),
        { statusCode: 404 }
      );
    }

    return tx;
  }

  private async recordEvent(params: {
    userId: string;
    subscriptionId?: string | null;
    transactionId?: string | null;
    eventType: BillingEventType;
    billingProvider: BillingProviderName;
    providerEventId?: string;
    rawPayload?: unknown;
  }): Promise<void> {
    try {
      await db.insert(billingEvents).values({
        userId: params.userId,
        subscriptionId: params.subscriptionId ?? null,
        transactionId: params.transactionId ?? null,
        eventType: params.eventType,
        billingProvider: params.billingProvider,
        providerEventId: params.providerEventId ?? null,
        payload: params.rawPayload ?? null,
      });
    } catch (err) {
      // Idempotency constraint violation — event already recorded, ignore
      const pgErr = err as { code?: string };
      if (pgErr.code === "23505") return; // unique_violation
      throw err;
    }
  }
}

// Singleton exported for use throughout the server
export const billingService = new BillingService();
