/**
 * Copyright by Calmic Sdn Bhd
 *
 * Stripe payment provider.
 *
 * Environment variables:
 *   STRIPE_SECRET_KEY       — sk_live_... or sk_test_...
 *   STRIPE_WEBHOOK_SECRET   — whsec_... (from Stripe dashboard webhook endpoint)
 *   STRIPE_TEST_MODE        — "true" to force test mode regardless of key prefix
 *   BASE_URL                — public server URL
 *
 * Install when ready:  npm install stripe
 */

import crypto from "crypto";
import type {
  IBillingProvider,
  BillingProviderName,
  CreateCheckoutParams,
  CheckoutSession,
  ParsedWebhookEvent,
  BillingEventType,
} from "../types";

// Stripe event types we handle → our canonical event types
const STRIPE_EVENT_MAP: Record<string, BillingEventType> = {
  "checkout.session.completed": "payment_success",
  "invoice.paid": "renewed",
  "invoice.payment_failed": "payment_failed",
  "customer.subscription.deleted": "cancelled",
  "charge.refunded": "refunded",
};

export class StripeProvider implements IBillingProvider {
  readonly name: BillingProviderName = "stripe";
  readonly isTestMode: boolean;

  private readonly secretKey: string;
  private readonly webhookSecret: string;
  private stripe: unknown = null; // Loaded lazily to avoid import errors when not installed

  constructor() {
    this.secretKey = process.env.STRIPE_SECRET_KEY || "";
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
    this.isTestMode =
      process.env.STRIPE_TEST_MODE === "true" ||
      !this.secretKey ||
      this.secretKey.startsWith("sk_test_");
  }

  private async getStripe(): Promise<unknown> {
    if (!this.stripe) {
      try {
        // Dynamic import so the app doesn't crash if stripe is not installed
        const Stripe = (await import("stripe" as never)).default as new (key: string) => unknown;
        this.stripe = new Stripe(this.secretKey);
      } catch {
        throw new Error(
          "[StripeProvider] stripe package not installed. Run: npm install stripe"
        );
      }
    }
    return this.stripe;
  }

  // ── createCheckoutSession ─────────────────────────────────────────────────

  async createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSession> {
    if (!this.secretKey) {
      console.warn(
        "[StripeProvider] STRIPE_SECRET_KEY not set — returning null checkout URL"
      );
      return { transactionId: params.transactionId, checkoutUrl: null };
    }

    const stripe = await this.getStripe() as {
      checkout: {
        sessions: {
          create: (params: Record<string, unknown>) => Promise<{ id: string; url: string | null }>;
        };
      };
    };

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: params.userEmail,
      line_items: [
        {
          price_data: {
            currency: "myr",
            unit_amount: params.amountMyr,
            recurring: { interval: params.interval === "year" ? "year" : "month" },
            product_data: { name: `MyParliament ${params.planName}` },
          },
          quantity: 1,
        },
      ],
      metadata: {
        transactionId: params.transactionId,
        userId: params.userId,
        planSlug: params.planSlug,
      },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });

    return {
      transactionId: params.transactionId,
      checkoutUrl: session.url,
      providerBillId: session.id,
    };
  }

  // ── verifyWebhookSignature ────────────────────────────────────────────────
  // Stripe uses a timestamp + HMAC-SHA256 scheme (Stripe-Signature header).

  verifyWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer | string
  ): boolean {
    if (!this.webhookSecret) return false;

    const sigHeader = headers["stripe-signature"] as string | undefined;
    if (!sigHeader) return false;

    // Parse: t=<timestamp>,v1=<sig1>,v1=<sig2>,...
    const parts: Record<string, string[]> = {};
    for (const part of sigHeader.split(",")) {
      const idx = part.indexOf("=");
      if (idx === -1) continue;
      const key = part.slice(0, idx);
      const val = part.slice(idx + 1);
      parts[key] = [...(parts[key] ?? []), val];
    }

    const timestamp = parts["t"]?.[0];
    const signatures = parts["v1"] ?? [];

    if (!timestamp || signatures.length === 0) return false;

    // Reject events older than 5 minutes (replay protection)
    const age = Date.now() / 1000 - parseInt(timestamp, 10);
    if (age > 300) return false;

    const bodyStr = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
    const signedPayload = `${timestamp}.${bodyStr}`;
    const expected = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(signedPayload)
      .digest("hex");

    return signatures.some((sig) => {
      try {
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
      } catch {
        return false;
      }
    });
  }

  // ── parseWebhookEvent ─────────────────────────────────────────────────────

  async parseWebhookEvent(
    body: unknown,
    _headers: Record<string, string | string[] | undefined>
  ): Promise<ParsedWebhookEvent> {
    const event = body as { type: string; id: string; data: { object: Record<string, unknown> } };
    const eventType: BillingEventType =
      STRIPE_EVENT_MAP[event.type] ?? "payment_failed";

    const obj = event.data.object;

    // Extract our internal reference from metadata (checkout.session / subscription)
    const metadata = (obj.metadata ?? {}) as Record<string, string>;
    const transactionId = metadata.transactionId ?? "";
    const providerBillId = (obj.id as string) ?? event.id;
    const amountPaid =
      typeof obj.amount_paid === "number"
        ? (obj.amount_paid as number)
        : typeof obj.amount_total === "number"
        ? (obj.amount_total as number)
        : undefined;

    return {
      type: eventType,
      transactionId,
      providerBillId,
      rawPayload: body,
      amountPaid,
    };
  }
}
