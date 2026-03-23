/**
 * Copyright by Calmic Sdn Bhd
 *
 * Provider-agnostic billing types and interfaces.
 *
 * The IBillingProvider contract keeps payment-provider logic isolated so any
 * provider can be swapped in (or added alongside) without touching the rest of
 * the application.
 */

// ─── Literals ─────────────────────────────────────────────────────────────────

export type BillingProviderName = "billplz" | "stripe" | "manual";

export type BillingEventType =
  | "subscription_created"
  | "payment_success"
  | "payment_failed"
  | "cancelled"
  | "renewed"
  | "refunded";

// ─── Checkout ─────────────────────────────────────────────────────────────────

export interface CreateCheckoutParams {
  /** Our internal user id */
  userId: string;
  userEmail: string;
  userName: string;
  /** Plan fields duplicated here so providers don't need a DB call */
  planSlug: string;
  planName: string;
  /** Amount in sen (e.g. 1500 = RM 15.00) */
  amountMyr: number;
  /** "month" | "year" */
  interval: string;
  /** Our internal payment_transactions.id, used as idempotency / reference key */
  transactionId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  /** Our internal payment_transactions.id */
  transactionId: string;
  /** Redirect URL for the user — null when provider not configured */
  checkoutUrl: string | null;
  /** Provider's own bill / payment-intent id (if immediately available) */
  providerBillId?: string;
}

// ─── Webhooks ─────────────────────────────────────────────────────────────────

export interface ParsedWebhookEvent {
  type: BillingEventType;
  /** Our internal reference embedded in the payment as reference_1 / metadata */
  transactionId: string;
  /** Provider's own bill / payment-intent id */
  providerBillId: string;
  /** Full raw payload for audit storage */
  rawPayload: unknown;
  /** Settled amount in sen (only present for payment_success / renewed) */
  amountPaid?: number;
}

// ─── Provider interface ───────────────────────────────────────────────────────

export interface IBillingProvider {
  /** Stable provider identifier */
  readonly name: BillingProviderName;
  /** True when running against sandbox / test credentials */
  readonly isTestMode: boolean;

  /**
   * Create a hosted checkout session and return a redirect URL.
   * Implementations that are not configured must return { checkoutUrl: null }.
   */
  createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSession>;

  /**
   * Verify that the incoming webhook payload was signed by the provider.
   * Must return false (not throw) on invalid signatures.
   *
   * @param headers  Raw HTTP request headers
   * @param rawBody  Unparsed request body as a Buffer or string
   */
  verifyWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer | string
  ): boolean;

  /**
   * Parse the verified webhook payload into a canonical BillingEvent.
   *
   * @param body     Parsed body (JSON object or URLSearchParams-derived Record)
   * @param headers  Raw HTTP request headers
   */
  parseWebhookEvent(
    body: unknown,
    headers: Record<string, string | string[] | undefined>
  ): Promise<ParsedWebhookEvent>;
}
