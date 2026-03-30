/**
 * Copyright by Calmic Sdn Bhd
 *
 * Account / Billing page.
 *
 * Sections:
 *   1. Subscription status card (plan, status, next billing date, cancel)
 *   2. Billing event history table
 *   3. Account info (email, logout)
 *
 * URL params consumed:
 *   ?subscribed=1   — show "Welcome to Premium!" success banner
 *   ?pending=1      — show "Payment processing" banner
 *   &txId=X         — transaction ID for the pending banner
 */

import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Sparkles,
  CalendarDays,
  CreditCard,
  Loader2,
  LogOut,
  TestTube,
  AlertTriangle,
} from "lucide-react";
import {
  useSubscriptionStatus,
  useBillingEvents,
  useProviderInfo,
  useCancelSubscription,
  formatMyr,
} from "@/hooks/use-subscription";
import { useAuth } from "@/hooks/use-auth";

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-MY", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    active:    { label: "Active",    variant: "default" },
    trial:     { label: "Trial",     variant: "secondary" },
    cancelled: { label: "Cancelling", variant: "outline" },
    expired:   { label: "Expired",   variant: "destructive" },
  };
  const cfg = map[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

// ── SubscriptionCard ──────────────────────────────────────────────────────────

function SubscriptionCard() {
  const [, setLocation] = useLocation();
  const { data: status, isLoading } = useSubscriptionStatus();
  const { data: providerInfo } = useProviderInfo();
  const cancel = useCancelSubscription();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!status?.isPremium || !status.subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>You are on the free plan.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setLocation("/pricing")} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Upgrade to Premium
          </Button>
        </CardContent>
      </Card>
    );
  }

  const sub = status.subscription;
  const isCancelling = sub.cancelAtPeriodEnd;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {sub.planName}
            </CardTitle>
            <CardDescription className="mt-1">
              {formatMyr(sub.priceMyr)}/{sub.interval}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {statusBadge(sub.status)}
            {providerInfo?.isTestMode && (
              <Badge variant="outline" className="gap-1 text-amber-600 border-amber-400 text-xs">
                <TestTube className="h-3 w-3" />
                Sandbox
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span>
              {isCancelling ? "Access until" : "Renews on"}:{" "}
              <span className="text-foreground font-medium">
                {formatDate(sub.currentPeriodEnd)}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CreditCard className="h-4 w-4 shrink-0" />
            <span>
              Provider:{" "}
              <span className="text-foreground font-medium capitalize">
                {sub.billingProvider}
              </span>
            </span>
          </div>
        </div>

        {isCancelling && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your subscription is cancelled and will not renew. Premium access
              continues until {formatDate(sub.currentPeriodEnd)}.
            </AlertDescription>
          </Alert>
        )}

        {cancel.isError && (
          <Alert variant="destructive">
            <AlertDescription>
              {cancel.error?.message ?? "Cancellation failed. Please try again."}
            </AlertDescription>
          </Alert>
        )}

        {!isCancelling && sub.status === "active" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/5">
                Cancel subscription
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your premium access will continue until{" "}
                  <strong>{formatDate(sub.currentPeriodEnd)}</strong>. After
                  that, you'll be downgraded to the free plan. You can
                  resubscribe anytime.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep my subscription</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  onClick={() => cancel.mutate()}
                  disabled={cancel.isPending}
                >
                  {cancel.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Cancelling…</>
                  ) : (
                    "Yes, cancel"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  );
}

// ── BillingHistoryCard ────────────────────────────────────────────────────────

function BillingHistoryCard() {
  const { data: events, isLoading } = useBillingEvents();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!events || events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No billing events yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing History</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {events.map((ev) => (
            <div key={ev.id} className="flex items-center justify-between px-6 py-3 text-sm">
              <div>
                <p className="font-medium capitalize">{ev.eventType.replace(/_/g, " ")}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {ev.billingProvider}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDate(ev.processedAt)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── AccountCard ───────────────────────────────────────────────────────────────

function AccountCard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const qc = useQueryClient();

  const logout = useMutation({
    mutationFn: () =>
      fetch("/api/auth/logout", { method: "POST", credentials: "include" }).then((r) => r.json()),
    onSuccess: () => {
      qc.clear();
      setLocation("/");
    },
  });

  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm">
          <p className="text-muted-foreground">Name</p>
          <p className="font-medium">{user.name}</p>
        </div>
        <div className="text-sm">
          <p className="text-muted-foreground">Email</p>
          <p className="font-medium">{user.email}</p>
        </div>

        <Separator />

        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          {logout.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          Sign out
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Account() {
  const [, setLocation] = useLocation();
  const { user, isPremium, isLoading: authLoading } = useAuth();

  // Redirect to login if not authenticated (after loading)
  if (!authLoading && !user) {
    setLocation("/login?next=/account");
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  // Only show the success banner when the subscription is actually active in DB
  const justSubscribed = params.get("subscribed") === "1" && isPremium;
  // Show pending banner when subscribed=1 but isPremium is still false (payment processing)
  const isPending = params.get("pending") === "1" || (params.get("subscribed") === "1" && !isPremium && !authLoading);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">

        <Button
          variant="outline"
          onClick={() => setLocation("/")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold mb-6">My Account</h1>

        {/* Success/pending banners from billing redirects */}
        {justSubscribed && (
          <Alert className="mb-6 border-primary/30 bg-primary/5">
            <Sparkles className="h-4 w-4 text-primary" />
            <AlertDescription className="flex items-center justify-between flex-wrap gap-3">
              <span className="text-primary font-medium">
                Welcome to Premium! Your subscription is now active. Enjoy full
                access to all constituency intelligence features.
              </span>
              <Button size="sm" onClick={() => setLocation("/constituency-analysis")} className="shrink-0">
                Explore Premium Data →
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {isPending && (
          <Alert className="mb-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Your payment is being processed. Premium access will activate
              automatically once the payment is confirmed — usually within a
              few minutes.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          <SubscriptionCard />
          <BillingHistoryCard />
          <AccountCard />
        </div>
      </div>
    </div>
  );
}
