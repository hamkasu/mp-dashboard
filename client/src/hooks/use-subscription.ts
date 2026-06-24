/**
 * Copyright by Calmic Sdn Bhd
 *
 * use-subscription.ts — hooks for subscription plans, status, checkout, and cancellation.
 *
 * API surface used:
 *   GET  /api/subscription/plans     — public, no auth
 *   GET  /api/subscription/status    — auth required (returns null on 401)
 *   POST /api/billing/checkout       — auth required
 *   POST /api/subscription/cancel    — auth required
 *   GET  /api/billing/events         — auth required
 *   GET  /api/billing/provider-info  — public
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SubscriptionPlan {
  id: string;
  slug: string;
  name: string;
  /** Price in sen (1/100 of RM). e.g. 1500 = RM 15.00 */
  priceMyr: number;
  interval: "month" | "year";
  features: string[];
  isActive: boolean;
}

export interface ActiveSubscription {
  id: string;
  status: "active" | "cancelled" | "expired" | "trial";
  isTrial: boolean;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  billingProvider: "billplz" | "stripe" | "manual";
  planSlug: string;
  planName: string;
  priceMyr: number;
  interval: "month" | "year";
}

export interface SubscriptionStatus {
  isPremium: boolean;
  subscription: ActiveSubscription | null;
}

export interface CheckoutSession {
  transactionId: string;
  checkoutUrl: string | null;
  planName: string;
  amountMyr: number;
  providerName: string;
  isTestMode: boolean;
}

export interface BillingEvent {
  id: string;
  eventType: string;
  billingProvider: string;
  subscriptionId: string | null;
  processedAt: string;
}

export interface ProviderInfo {
  provider: string;
  isTestMode: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format sen amount to "RM X.XX" string */
export function formatMyr(sen: number): string {
  return `RM ${(sen / 100).toFixed(2).replace(/\.00$/, "")}`;
}

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as T;
}

async function apiGet<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { credentials: "include" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Fetch all active subscription plans (public, no auth). */
export function useSubscriptionPlans() {
  return useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription/plans"],
    staleTime: 10 * 60 * 1000, // 10 min — plans rarely change
  });
}

/**
 * Fetch the current user's subscription status.
 * Returns null when not authenticated (no 401 thrown).
 * Only fetches when `enabled` is true (default: always).
 */
export function useSubscriptionStatus(enabled = true) {
  return useQuery<SubscriptionStatus | null>({
    queryKey: ["/api/subscription/status"],
    queryFn: () => apiGet<SubscriptionStatus>("/api/subscription/status"),
    staleTime: 60 * 1000, // 1 min — revalidate frequently post-checkout
    enabled,
    retry: false,
  });
}

/** Fetch billing event history for the current user. */
export function useBillingEvents(enabled = true) {
  return useQuery<BillingEvent[]>({
    queryKey: ["/api/billing/events"],
    queryFn: async () => {
      const res = await apiGet<BillingEvent[]>("/api/billing/events");
      return res ?? [];
    },
    staleTime: 2 * 60 * 1000,
    enabled,
    retry: false,
  });
}

/** Fetch active billing provider info (public). */
export function useProviderInfo() {
  return useQuery<ProviderInfo>({
    queryKey: ["/api/billing/provider-info"],
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Initiate a checkout session for a given plan slug.
 * On success, redirect to the provider's checkout URL.
 * Returns the full session data so the caller can handle redirects.
 */
export function useCheckout() {
  return useMutation<CheckoutSession, Error, { planSlug: string }>({
    mutationFn: ({ planSlug }) =>
      apiPost<CheckoutSession>("/api/billing/checkout", { planSlug }),
  });
}

/**
 * Cancel the current subscription at the end of the billing period.
 * Invalidates the subscription status query on success.
 */
export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation<{ message: string }, Error, void>({
    mutationFn: () => apiPost("/api/subscription/cancel", {}),
    onSuccess: () => {
      // Force re-fetch of subscription status so UI reflects cancellation
      qc.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });
}
