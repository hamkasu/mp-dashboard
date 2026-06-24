/**
 * Copyright by Calmic Sdn Bhd
 *
 * Manual / admin-only provider.
 *
 * Used for:
 *  - Admin-granted subscriptions (no real payment flow)
 *  - Local development when no payment provider is configured
 *  - Automated tests
 *
 * createCheckoutSession returns a null checkout URL (no redirect needed).
 * Webhooks are not applicable — the billing service calls handleManualGrant()
 * directly instead of going through the webhook flow.
 */

import type {
  IBillingProvider,
  BillingProviderName,
  CreateCheckoutParams,
  CheckoutSession,
  ParsedWebhookEvent,
} from "../types";

export class ManualProvider implements IBillingProvider {
  readonly name: BillingProviderName = "manual";
  readonly isTestMode = true;

  async createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSession> {
    // No external checkout — caller will activate the subscription directly
    return { transactionId: params.transactionId, checkoutUrl: null };
  }

  verifyWebhookSignature(
    _headers: Record<string, string | string[] | undefined>,
    _rawBody: Buffer | string
  ): boolean {
    // Manual provider has no external webhooks
    return false;
  }

  async parseWebhookEvent(
    _body: unknown,
    _headers: Record<string, string | string[] | undefined>
  ): Promise<ParsedWebhookEvent> {
    throw new Error("[ManualProvider] Manual provider does not handle webhooks");
  }
}
