/**
 * Copyright by Calmic Sdn Bhd
 *
 * PremiumGate — high-conversion paywall wrapper.
 *
 * Usage:
 *   <PremiumGate isPremium={isPremium}>
 *     <MyLockedContent />
 *   </PremiumGate>
 *
 * When premium → renders children normally.
 * When not premium → renders blurred children + overlay CTA.
 */

import { Lock, Sparkles, TrendingUp, BarChart3, FileText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

// ─── Plan config ─────────────────────────────────────────────────────────────

const PLANS = [
  {
    slug: "monthly",
    label: "Monthly",
    price: "RM 15",
    period: "/month",
    badge: null,
  },
  {
    slug: "yearly",
    label: "Yearly",
    price: "RM 120",
    period: "/year",
    badge: "Save 33%",
  },
] as const;

// Premium features shown in the CTA
const PREMIUM_FEATURES = [
  { icon: BarChart3, text: "Full constituency analysis (222 seats)" },
  { icon: TrendingUp, text: "Detailed speech & participation trends" },
  { icon: Users, text: "MP vs constituency performance fit" },
  { icon: FileText, text: "PDF reports & CSV data export" },
];

// ─── PremiumCTABox ────────────────────────────────────────────────────────────

function PremiumCTABox({ featureName }: { featureName?: string }) {
  const [, setLocation] = useLocation();

  return (
    <div className="w-full max-w-md mx-auto rounded-2xl border border-border bg-background/95 shadow-2xl backdrop-blur-sm p-6 sm:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shrink-0">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-lg leading-tight">
            {featureName ? `Unlock ${featureName}` : "Unlock Full Constituency Intelligence"}
          </h3>
          <p className="text-sm text-muted-foreground">Premium feature</p>
        </div>
      </div>

      {/* Feature list */}
      <ul className="space-y-2 mb-6">
        {PREMIUM_FEATURES.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-2.5 text-sm">
            <Icon className="h-4 w-4 text-primary shrink-0" />
            <span>{text}</span>
          </li>
        ))}
      </ul>

      {/* Pricing cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {PLANS.map((plan) => (
          <div
            key={plan.slug}
            className="relative rounded-xl border border-border bg-muted/40 p-3 text-center"
          >
            {plan.badge && (
              <Badge
                variant="default"
                className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] px-2 py-0 bg-primary"
              >
                {plan.badge}
              </Badge>
            )}
            <p className="text-xs text-muted-foreground mb-1">{plan.label}</p>
            <p className="font-bold text-lg">{plan.price}</p>
            <p className="text-xs text-muted-foreground">{plan.period}</p>
          </div>
        ))}
      </div>

      {/* CTA buttons */}
      <div className="space-y-2">
        <Button
          className="w-full gap-2"
          size="lg"
          onClick={() => setLocation("/pricing")}
        >
          <Sparkles className="h-4 w-4" />
          Subscribe Now
        </Button>
        <Button
          variant="outline"
          className="w-full"
          size="sm"
          onClick={() => setLocation("/login")}
        >
          Already subscribed? Sign in
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-4">
        Cancel anytime · Secure payment via Billplz
      </p>
    </div>
  );
}

// ─── PremiumGate ─────────────────────────────────────────────────────────────

interface PremiumGateProps {
  /** Whether the current user has premium access */
  isPremium: boolean;
  /** Whether auth state is still loading */
  isAuthLoading?: boolean;
  /** Content to gate */
  children: React.ReactNode;
  /** Label shown in the CTA: "Unlock <featureName>" */
  featureName?: string;
  /**
   * Minimum height of the blur area so the overlay looks substantial
   * even when children haven't loaded yet. Default: "320px".
   */
  minHeight?: string;
}

export function PremiumGate({
  isPremium,
  isAuthLoading = false,
  children,
  featureName,
  minHeight = "320px",
}: PremiumGateProps) {
  // While auth is loading, render children normally so there's no flash
  if (isAuthLoading || isPremium) {
    return <>{children}</>;
  }

  return (
    <div className="relative overflow-hidden rounded-xl" style={{ minHeight }}>
      {/* Blurred background content — pointer events disabled */}
      <div
        aria-hidden="true"
        className="select-none pointer-events-none"
        style={{ filter: "blur(5px)", opacity: 0.45 }}
      >
        {children}
      </div>

      {/* Gradient fade-to-background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/60 to-background"
      />

      {/* CTA overlay — centred vertically */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <PremiumCTABox featureName={featureName} />
      </div>
    </div>
  );
}
