/**
 * Copyright by Calmic Sdn Bhd
 *
 * Billplz payment provider.
 *
 * Environment variables:
 *   BILLPLZ_API_KEY        — API key from Billplz dashboard
 *   BILLPLZ_COLLECTION_ID  — Collection (payment page) ID
 *   BILLPLZ_TEST_MODE      — "true" to use sandbox; auto-true if no API key
 *   BASE_URL               — public server URL (used for callback URL)
 */

import crypto from "crypto";
import type {
  IBillingProvider,
  BillingProviderName,
  CreateCheckoutParams,
  CheckoutSession,
  ParsedWebhookEvent,
} from "../types";

interface BillplzBillResponse {
  id: string;
  url: string;
  collection_id: string;
  paid: boolean;
  state: string;
}

export class BillplzProvider implements IBillingProvider {
  readonly name: BillingProviderName = "billplz";
  readonly isTestMode: boolean;

  private readonly apiKey: string;
  private readonly collectionId: string;
  private readonly apiBase: string;

  constructor() {
    this.apiKey = process.env.BILLPLZ_API_KEY || "";
    this.collectionId = process.env.BILLPLZ_COLLECTION_ID || "";
    this.isTestMode =
      process.env.BILLPLZ_TEST_MODE === "true" || !this.apiKey;

    this.apiBase = this.isTestMode
      ? "https://www.billplz-sandbox.com/api/v3"
      : "https://www.billplz.com/api/v3";
  }

  // ── createCheckoutSession ─────────────────────────────────────────────────

  async createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSession> {
    if (!this.apiKey || !this.collectionId) {
      console.warn(
        "[BillplzProvider] BILLPLZ_API_KEY or BILLPLZ_COLLECTION_ID not set — " +
          "returning null checkout URL"
      );
      return { transactionId: params.transactionId, checkoutUrl: null };
    }

    const baseUrl = process.env.BASE_URL || "";
    const webhookUrl = `${baseUrl}/api/billing/webhook/billplz`;

    const body = new URLSearchParams({
      collection_id: this.collectionId,
      email: params.userEmail,
      name: params.userName,
      amount: String(params.amountMyr),
      description: `MyParliament ${params.planName}`,
      redirect_url: params.successUrl,
      callback_url: webhookUrl,
      reference_1_label: "Transaction",
      reference_1: params.transactionId,
      reference_2_label: "Plan",
      reference_2: params.planSlug,
    });

    const response = await fetch(`${this.apiBase}/bills`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.apiKey}:`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`[BillplzProvider] Bill creation failed ${response.status}: ${text}`);
    }

    const data = (await response.json()) as BillplzBillResponse;

    return {
      transactionId: params.transactionId,
      checkoutUrl: data.url,
      providerBillId: data.id,
    };
  }

  // ── verifyWebhookSignature ────────────────────────────────────────────────

  verifyWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer | string
  ): boolean {
    if (!this.apiKey) {
      // Cannot verify without key — fail safe (deny)
      return false;
    }

    const xSignature = headers["x-signature"] as string | undefined;
    if (!xSignature) return false;

    // Billplz signs a pipe-delimited, sorted key|value string using HMAC-SHA256
    const bodyStr = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
    const params = new URLSearchParams(bodyStr);
    const payload: Record<string, string> = Object.fromEntries(params.entries());

    const SIGNED_FIELDS = [
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

    const message = SIGNED_FIELDS.filter((k) => k in payload)
      .map((k) => `${k}|${payload[k]}`)
      .join("|");

    const expected = crypto
      .createHmac("sha256", this.apiKey)
      .update(message)
      .digest("hex");

    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(xSignature));
  }

  // ── parseWebhookEvent ─────────────────────────────────────────────────────

  async parseWebhookEvent(
    body: unknown,
    _headers: Record<string, string | string[] | undefined>
  ): Promise<ParsedWebhookEvent> {
    const payload = body as Record<string, string>;

    const paid = payload.paid === "true";
    const eventType = paid ? "payment_success" : "payment_failed";

    return {
      type: eventType,
      transactionId: payload.reference_1 || "",
      providerBillId: payload.id || "",
      rawPayload: payload,
      amountPaid: paid ? parseInt(payload.paid_amount || "0", 10) : undefined,
    };
  }
}
