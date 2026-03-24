/**
 * Copyright by Calmic Sdn Bhd
 *
 * Pricing page — marketing-focused plan selector.
 *
 * Flow:
 *   1. Fetch plans from /api/subscription/plans (public).
 *   2. Fetch current subscription status (if logged in).
 *   3. User clicks plan → if not logged in, redirect /login?next=/pricing.
 *   4. POST /api/billing/checkout → redirect to checkoutUrl (Billplz).
 *   5. Success redirect → /account?subscribed=1.
 *
 * URL params consumed:
 *   ?result=cancelled  — show "Payment cancelled" banner (from Billplz cancel redirect)
 *   ?result=error      — show "Payment error" banner
 */

import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Check, Loader2, Sparkles, Shield, TestTube } from "lucide-react";
import {
  useSubscriptionPlans,
  useSubscriptionStatus,
  useProviderInfo,
  useCheckout,
  formatMyr,
  type SubscriptionPlan,
} from "@/hooks/use-subscription";
import { useAuth } from "@/hooks/use-auth";

// ── Feature list shown on the pricing page ────────────────────────────────────

const FEATURES = [
  "Full 222-constituency Hansard analysis",
  "Detailed speech & participation trends",
  "MP vs constituency performance fit score",
  "PDF reports & CSV data export",
  "Priority support",
];

// ── PlanCard ──────────────────────────────────────────────────────────────────

interface PlanCardProps {
  plan: SubscriptionPlan;
  isCurrentPlan: boolean;
  isPremium: boolean;
  isLoggedIn: boolean;
  onSelect: (slug: string) => void;
  isPending: boolean;
  pendingSlug: string | null;
}

function PlanCard({
  plan,
  isCurrentPlan,
  isPremium,
  isLoggedIn,
  onSelect,
  isPending,
  pendingSlug,
}: PlanCardProps) {
  const isYearly = plan.interval === "year";
  const isLoading = isPending && pendingSlug === plan.slug;

  const price = formatMyr(plan.priceMyr);
  const period = plan.interval === "month" ? "/month" : "/year";

  // Monthly equivalent for yearly plan
  const monthlyEquiv =
    isYearly ? formatMyr(Math.round(plan.priceMyr / 12)) : null;

  return (
    <div
      className={`relative rounded-2xl border p-6 flex flex-col gap-4 transition-shadow ${
        isYearly
          ? "border-primary shadow-md bg-primary/5"
          : "border-border bg-background"
      }`}
    >
      {isYearly && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-0.5">
          Best Value — Save 33%
        </Badge>
      )}

      <div>
        <p className="text-sm text-muted-foreground mb-1">{plan.name}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold">{price}</span>
          <span className="text-sm text-muted-foreground">{period}</span>
        </div>
        {monthlyEquiv && (
          <p className="text-xs text-muted-foreground mt-1">
            {monthlyEquiv}/month — billed annually
          </p>
        )}
      </div>

      {isCurrentPlan ? (
        <Button variant="outline" className="w-full" disabled>
          <Check className="h-4 w-4 mr-2" />
          Current plan
        </Button>
      ) : isPremium ? (
        <Button variant="outline" className="w-full" disabled>
          Already subscribed
        </Button>
      ) : (
        <Button
          className={`w-full ${isYearly ? "" : "variant-outline"}`}
          variant={isYearly ? "default" : "outline"}
          onClick={() => onSelect(plan.slug)}
          disabled={isPending}
        >
          {isLoading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Redirecting…</>
          ) : isLoggedIn ? (
            <><Sparkles className="h-4 w-4 mr-2" />Get {plan.name}</>
          ) : (
            `Subscribe — ${plan.name}`
          )}
        </Button>
      )}

      <ul className="space-y-2 text-sm">
        {FEATURES.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Pricing() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const isLoggedIn = !authLoading && user !== null;

  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();
  const { data: status } = useSubscriptionStatus(isLoggedIn);
  const { data: providerInfo } = useProviderInfo();
  const checkout = useCheckout();

  const currentPlanSlug = status?.subscription?.planSlug ?? null;

  // URL result param (from billing redirects)
  const resultParam = new URLSearchParams(window.location.search).get("result");

  function handleSelectPlan(slug: string) {
    if (!isLoggedIn) {
      setLocation(`/login?next=/pricing`);
      return;
    }
    checkout.mutate(
      { planSlug: slug },
      {
        onSuccess: (session) => {
          if (session.checkoutUrl) {
            window.location.href = session.checkoutUrl;
          } else {
            // Manual/test provider — no external URL, go straight to account
            setLocation("/account?subscribed=1");
          }
        },
      }
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 max-w-3xl">

        {/* Back nav */}
        <Button
          variant="outline"
          onClick={() => setLocation("/")}
          className="mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Result banners from Billplz redirects */}
        {resultParam === "cancelled" && (
          <Alert className="mb-6">
            <AlertDescription>
              Payment cancelled. No charge was made. You can try again anytime.
            </AlertDescription>
          </Alert>
        )}
        {resultParam === "error" && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>
              Something went wrong with your payment. Please try again or contact support.
            </AlertDescription>
          </Alert>
        )}

        {/* Checkout error */}
        {checkout.isError && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{checkout.error?.message ?? "Checkout failed. Please try again."}</AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3">MyParliament Premium</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Unlock the full power of Malaysia's most comprehensive parliamentary
            data platform.
          </p>

          {providerInfo?.isTestMode && (
            <Badge variant="outline" className="mt-4 gap-1 text-amber-600 border-amber-400">
              <TestTube className="h-3 w-3" />
              Sandbox mode — no real charges
            </Badge>
          )}
        </div>

        {/* Plan cards */}
        {plansLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : plans && plans.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-6 mb-10">
            {plans.map((plan) => (
              <PlanCard
                key={plan.slug}
                plan={plan}
                isCurrentPlan={currentPlanSlug === plan.slug}
                isPremium={status?.isPremium ?? false}
                isLoggedIn={isLoggedIn}
                onSelect={handleSelectPlan}
                isPending={checkout.isPending}
                pendingSlug={checkout.isPending ? (checkout.variables?.planSlug ?? null) : null}
              />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-12">
            No plans available. Please check back soon.
          </p>
        )}

        <Separator className="my-8" />

        {/* Trust signals */}
        <div className="grid sm:grid-cols-3 gap-6 text-center text-sm text-muted-foreground">
          <div className="flex flex-col items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <p className="font-medium text-foreground">Secure Payment</p>
            <p>Processed via Billplz — Malaysia's trusted payment gateway</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Check className="h-6 w-6 text-primary" />
            <p className="font-medium text-foreground">Cancel Anytime</p>
            <p>No lock-in. Cancel before renewal and you won't be charged again</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <p className="font-medium text-foreground">Instant Access</p>
            <p>Premium data unlocked immediately after payment confirmation</p>
          </div>
        </div>

        {/* Already have account */}
        {!isLoggedIn && !authLoading && (
          <p className="text-center text-sm text-muted-foreground mt-8">
            Already subscribed?{" "}
            <button
              className="text-primary underline underline-offset-2 hover:no-underline font-medium"
              onClick={() => setLocation("/login")}
            >
              Sign in to your account
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
