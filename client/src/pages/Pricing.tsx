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
import {
  ArrowLeft, Check, Loader2, Sparkles, Shield, TestTube, TrendingUp,
  BarChart3, MapPin, ArrowLeftRight, FileText, Bell, BookOpen,
  Newspaper, GraduationCap, Target, Building2,
} from "lucide-react";
import {
  useSubscriptionPlans,
  useSubscriptionStatus,
  useProviderInfo,
  useCheckout,
  formatMyr,
  type SubscriptionPlan,
} from "@/hooks/use-subscription";
import { useAuth } from "@/hooks/use-auth";

// ── Free tier features (static display card — no API backing) ────────────────

const FREE_FEATURES = [
  "MP profiles — name, party, constituency",
  "Recent speeches (current session only)",
  "Attendance overview for active MPs",
  "Public voting records",
  "Basic Hansard search",
];

// ── Premium plan feature bullets ──────────────────────────────────────────────

const PLAN_FEATURES = [
  "Full MP intelligence — every session, every metric",
  "All 222 constituency Hansard analyses",
  "MP vs MP and constituency comparisons",
  "PDF report generation",
  "CSV data export",
  "Alerts & watchlists (coming soon)",
  "Saved research workspace (coming soon)",
];

// ── Capability tiles ──────────────────────────────────────────────────────────

const CAPABILITIES = [
  {
    icon: BarChart3,
    title: "MP Intelligence",
    description:
      "Track any MP across every session — speech frequency, participation rate, party-line consistency, and attendance trends in one profile.",
  },
  {
    icon: MapPin,
    title: "Constituency Intelligence",
    description:
      "Detailed analysis across all 222 constituencies: Hansard contributions, MP performance alignment, and session-by-session comparisons.",
  },
  {
    icon: ArrowLeftRight,
    title: "Comparison Tools",
    description:
      "Compare MPs directly — same metrics, same timeframe, same methodology. Built for election analysis, candidate assessment, and policy coverage.",
  },
  {
    icon: FileText,
    title: "PDF Reports & CSV Export",
    description:
      "Generate clean, shareable PDF summaries or export raw data to CSV. Built for editorial workflows, academic submissions, and briefing documents.",
  },
  {
    icon: Bell,
    title: "Alerts & Watchlists",
    badge: "Coming Soon",
    description:
      "Set up watchlists for specific MPs, constituencies, or topics. Get notified when activity crosses a threshold.",
  },
  {
    icon: BookOpen,
    title: "Saved Research Workspace",
    badge: "Coming Soon",
    description:
      "Bookmark MPs and constituencies, annotate findings, and save comparison views. Your research context, preserved across sessions.",
  },
] as const;

// ── Preview cards (What You Get) ─────────────────────────────────────────────

const PREVIEW_CARDS = [
  {
    icon: MapPin,
    title: "Constituency Report",
    caption: "Full breakdown for any of Malaysia's 222 parliamentary seats.",
    highlights: [
      "Hansard contribution count by session",
      "MP performance vs constituency expectation score",
      "Downloadable PDF in one click",
    ],
  },
  {
    icon: ArrowLeftRight,
    title: "MP Comparison Dashboard",
    caption: "Place any two MPs side-by-side across the same metrics.",
    highlights: [
      "Speech frequency, attendance rate, and voting alignment",
      "Session-by-session trend comparison",
      "Exportable comparison table",
    ],
  },
  {
    icon: TrendingUp,
    title: "Trend & Performance View",
    caption: "Track how an MP's activity evolves across parliamentary terms.",
    highlights: [
      "Participation rate across all available sessions",
      "Topic focus areas and keyword trends",
      "Flags when activity drops below historical average",
    ],
  },
  {
    icon: Bell,
    title: "Watchlist & Alerts",
    badge: "Coming Soon",
    caption: "Monitor MPs, constituencies, or topics without checking manually.",
    highlights: [
      "Add any MP or constituency to a personal watchlist",
      "Get notified on new speeches or attendance changes",
      "Set activity thresholds for instant alerts",
    ],
  },
  {
    icon: FileText,
    title: "Export & Report Builder",
    caption: "Turn any view into a shareable, presentation-ready document.",
    highlights: [
      "PDF export with clean, structured layout",
      "CSV download for analysis in Excel or R",
      "Share links for collaborative research",
    ],
  },
] as const;

// ── Audience tiles ────────────────────────────────────────────────────────────

const AUDIENCES = [
  {
    icon: Newspaper,
    title: "Journalists & Editors",
    description:
      "Cover Parliament with confidence. Verify claims, surface patterns, and produce data-backed stories faster than a manual Hansard search allows.",
  },
  {
    icon: GraduationCap,
    title: "Researchers & Academics",
    description:
      "Structured, consistent, exportable data across sessions. Cite sources, run comparisons, build datasets — without stitching spreadsheets together.",
  },
  {
    icon: Target,
    title: "Campaign & Political Teams",
    description:
      "Profile opponents, benchmark your candidate, understand constituency dynamics. Intelligence that informs strategy, not just talking points.",
  },
  {
    icon: Building2,
    title: "Policy Analysts & NGOs",
    description:
      "Track legislative participation on the issues that matter to your brief. Know which MPs engage, which don't, and how that changes over time.",
  },
] as const;

// ── FAQ items ─────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel before your next renewal date and you won't be charged again. Your access continues until the end of the period you've already paid for. No penalty, no questions asked.",
  },
  {
    q: "Where does the data come from?",
    a: "All parliamentary data is sourced from official Hansard records published by the Malaysian Parliament. MyParliament structures, indexes, and analyses that data — we do not alter the source material.",
  },
  {
    q: "What happens to my access if I cancel?",
    a: "You retain full Premium access until the end of your current billing period. After that, your account reverts to the free tier. Your saved data and export history are retained — nothing is deleted.",
  },
  {
    q: "Is there a free trial?",
    a: "There is no free trial currently. The free tier gives you a representative sample of Premium data so you can evaluate the product before subscribing. Questions before subscribing? Contact us directly.",
  },
  {
    q: "Can I get a refund?",
    a: "Subscriptions are non-refundable once a billing period has started. If you experience a technical issue or were charged in error, contact support and we'll resolve it promptly.",
  },
  {
    q: "I'm subscribing on behalf of an organisation. Is there a team plan?",
    a: "Not yet. If you need multi-seat access for a newsroom, research team, or institution, contact us — we handle these on a case-by-case basis.",
  },
] as const;

// ── FreeTierCard ──────────────────────────────────────────────────────────────

function FreeTierCard({
  isLoggedIn,
  isPremium,
  onSignup,
}: {
  isLoggedIn: boolean;
  isPremium: boolean;
  onSignup: () => void;
}) {
  return (
    <div className="relative rounded-2xl border border-card-border bg-card shadow-sm p-6 flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
          Free
        </p>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold">RM 0</span>
          <span className="text-sm text-muted-foreground">/forever</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">No credit card required</p>
      </div>

      {isLoggedIn && !isPremium ? (
        <Button variant="outline" className="w-full" disabled>
          <Check className="h-4 w-4 mr-2" />
          Your current plan
        </Button>
      ) : isPremium ? (
        <Button variant="outline" className="w-full" disabled>
          Included with Premium
        </Button>
      ) : (
        <Button variant="outline" className="w-full" onClick={onSignup}>
          Get started free
        </Button>
      )}

      <ul className="space-y-2 text-sm">
        {FREE_FEATURES.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-muted-foreground">{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── PlanCard ──────────────────────────────────────────────────────────────────

interface PlanCardProps {
  plan: SubscriptionPlan;
  isCurrentPlan: boolean;
  isPremium: boolean;
  onSelect: (slug: string) => void;
  isPending: boolean;
  pendingSlug: string | null;
}

function PlanCard({
  plan,
  isCurrentPlan,
  isPremium,
  onSelect,
  isPending,
  pendingSlug,
}: PlanCardProps) {
  const isYearly = plan.interval === "year";
  const isLoading = isPending && pendingSlug === plan.slug;

  const price = formatMyr(plan.priceMyr);
  const period = isYearly ? "/year" : "/month";

  // Per-day equivalent (30-day month for monthly, 365-day year for annual)
  const perDay = formatMyr(Math.round(plan.priceMyr / (isYearly ? 365 : 30)));

  // Yearly: show monthly equivalent
  const monthlyEquiv = isYearly ? formatMyr(Math.round(plan.priceMyr / 12)) : null;

  // CTA label
  const ctaLabel = isYearly ? "Start Annual Plan" : "Get Premium Access";

  return (
    <div
      className={`relative rounded-2xl border p-6 flex flex-col gap-4 transition-shadow ${
        isYearly
          ? "border-primary ring-2 ring-primary/20 shadow-md hover:shadow-lg bg-primary/5"
          : "border-border shadow-sm hover:shadow-md bg-card"
      }`}
    >
      {/* Per-plan badge */}
      {isYearly ? (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-4 py-1 shadow-sm">
          Best Value — Save RM 60
        </Badge>
      ) : (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-4 py-1 shadow-sm">
          Most Popular
        </Badge>
      )}

      <div>
        {/* Tier + interval label */}
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Premium
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">
            {isYearly ? "Annual" : "Monthly"}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold">{price}</span>
          <span className="text-sm text-muted-foreground">{period}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {perDay}/day
          {monthlyEquiv && ` · ${monthlyEquiv}/month billed annually`}
        </p>
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
          className="w-full"
          variant="default"
          onClick={() => onSelect(plan.slug)}
          disabled={isPending}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Redirecting…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              {ctaLabel}
            </>
          )}
        </Button>
      )}

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Everything in Free, plus:</p>
        <ul className="space-y-2 text-sm">
          {PLAN_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function scrollToPricing() {
  document.getElementById("pricing-plans")?.scrollIntoView({ behavior: "smooth" });
}

export default function Pricing() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const isLoggedIn = !authLoading && user !== null;

  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();
  const { data: status } = useSubscriptionStatus(isLoggedIn);
  const { data: providerInfo } = useProviderInfo();
  const checkout = useCheckout();

  const currentPlanSlug = status?.subscription?.planSlug ?? null;
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
      <div className="container mx-auto px-4 py-12 max-w-4xl">

        {/* Back nav */}
        <Button variant="outline" onClick={() => setLocation("/")} className="mb-8">
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
        {checkout.isError && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>
              {checkout.error?.message ?? "Checkout failed. Please try again."}
            </AlertDescription>
          </Alert>
        )}

        {/* ── HERO ──────────────────────────────────────────────────────────── */}
        <div className="text-center mb-16">
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {["Journalists", "Researchers", "Campaign Teams", "Policy Analysts", "Serious Political Observers"].map(
              (label) => (
                <span
                  key={label}
                  className="px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-xs font-medium text-primary"
                >
                  {label}
                </span>
              )
            )}
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">
            Malaysia's Political
            <br className="hidden sm:block" /> Intelligence Platform
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            MyParliament Premium gives you structured access to every speech, vote, attendance record, and
            constituency performance metric — organised for research, formatted for reporting, ready to act on.
          </p>

          <Button size="lg" onClick={scrollToPricing}>
            <Sparkles className="h-4 w-4 mr-2" />
            Get Premium Access
          </Button>

          {providerInfo?.isTestMode && (
            <div className="mt-4">
              <Badge variant="outline" className="gap-1 text-amber-600 border-amber-400">
                <TestTube className="h-3 w-3" />
                Sandbox mode — no real charges
              </Badge>
            </div>
          )}
        </div>

        {/* ── WHY UPGRADE ───────────────────────────────────────────────────── */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold tracking-tight text-center mb-2">
            From Raw Data to Decision-Ready Intelligence
          </h2>
          <p className="text-center text-muted-foreground mb-8">
            The free tier shows you what happened. Premium tells you what it means.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="rounded-xl border border-card-border bg-card shadow-2xs p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Without Premium
              </p>
              <p className="text-sm text-muted-foreground">
                Browse MP profiles and read individual Hansard entries. Good for a quick lookup.
              </p>
            </div>
            <div className="rounded-xl border border-primary/50 bg-primary/5 shadow-sm p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
                With Premium
              </p>
              <p className="text-sm">
                Track participation trends, compare MPs across sessions, benchmark constituencies,
                export your findings, and build a research record — all in one place.
              </p>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Most political research in Malaysia still happens through manual Hansard searches,
            scattered PDFs, and institutional paywalls. Premium cuts that process from hours to minutes.
          </p>
        </div>

        <Separator className="mb-16" />

        {/* ── PREMIUM FEATURES ──────────────────────────────────────────────── */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold tracking-tight text-center mb-2">
            Everything Serious Research Requires
          </h2>
          <p className="text-center text-muted-foreground mb-8">Six capabilities, all included.</p>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {CAPABILITIES.map(({ icon: Icon, title, description, badge }) => (
              <div
                key={title}
                className="rounded-xl border border-card-border bg-card shadow-2xs hover-elevate p-5 flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{title}</p>
                    {badge && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 text-muted-foreground"
                      >
                        {badge}
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>

        <Separator className="mb-16" />

        {/* ── SAMPLE OUTPUTS ────────────────────────────────────────────────── */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold tracking-tight text-center mb-2">
            What Premium Research Actually Looks Like
          </h2>
          <p className="text-center text-muted-foreground mb-8">
            Not just more data — structured outputs you can use immediately.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            {PREVIEW_CARDS.map(({ icon: Icon, title, caption, highlights, badge }) => (
              <div
                key={title}
                className="rounded-xl border border-card-border bg-card shadow-2xs overflow-hidden flex flex-col"
              >
                {/* Chrome header */}
                <div className="flex items-center gap-2.5 px-4 py-3 bg-muted/50 border-b border-card-border">
                  <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 shrink-0">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-xs font-semibold flex-1">{title}</span>
                  {badge && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                      {badge}
                    </Badge>
                  )}
                </div>

                {/* Card body */}
                <div className="px-4 py-4 flex flex-col gap-3 flex-1">
                  <p className="text-sm text-muted-foreground leading-snug">{caption}</p>
                  <ul className="space-y-1.5">
                    {highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2 text-xs">
                        <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator className="mb-16" />

        {/* ── WHO IT'S FOR ──────────────────────────────────────────────────── */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold tracking-tight text-center mb-2">
            Built for Political Professionals
          </h2>
          <p className="text-center text-muted-foreground mb-8">
            If you've ever exported a Hansard PDF manually, this was made for you.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            {AUDIENCES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-xl border border-card-border bg-card shadow-2xs hover-elevate p-5 flex gap-4"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 shrink-0 mt-0.5">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm mb-1">{title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator className="mb-16" />

        {/* ── PLAN CARDS ────────────────────────────────────────────────────── */}
        <div id="pricing-plans" className="mb-16">
          <h2 className="text-2xl font-bold tracking-tight text-center mb-2">
            Simple, Honest Pricing
          </h2>
          <p className="text-center text-muted-foreground mb-10">
            Start free. Upgrade when you're ready. Cancel anytime.
          </p>

          {plansLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
              <FreeTierCard
                isLoggedIn={isLoggedIn}
                isPremium={status?.isPremium ?? false}
                onSignup={() => setLocation("/login")}
              />
              {plans && plans.length > 0 ? (
                plans.map((plan) => (
                  <PlanCard
                    key={plan.slug}
                    plan={plan}
                    isCurrentPlan={currentPlanSlug === plan.slug}
                    isPremium={status?.isPremium ?? false}
                    onSelect={handleSelectPlan}
                    isPending={checkout.isPending}
                    pendingSlug={checkout.isPending ? (checkout.variables?.planSlug ?? null) : null}
                  />
                ))
              ) : (
                <p className="text-center text-muted-foreground py-12 md:col-span-2">
                  No plans available. Please check back soon.
                </p>
              )}
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Less than a teh tarik a day. Cancel before your next billing date and you won't be charged again.
          </p>
        </div>

        {/* ── TRUST SIGNALS ─────────────────────────────────────────────────── */}
        <div className="grid sm:grid-cols-3 gap-6 text-center text-sm text-muted-foreground mb-16">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-full bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <p className="font-medium text-foreground">Secure Payment</p>
            <p>Processed via Billplz — Malaysia's trusted payment gateway</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-full bg-primary/10">
              <Check className="h-5 w-5 text-primary" />
            </div>
            <p className="font-medium text-foreground">Cancel Anytime</p>
            <p>No lock-in. Your access continues until the billing period ends</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-full bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <p className="font-medium text-foreground">Instant Access</p>
            <p>Premium data unlocked immediately after payment confirmation</p>
          </div>
        </div>

        <Separator className="mb-16" />

        {/* ── FAQ ───────────────────────────────────────────────────────────── */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold tracking-tight text-center mb-8">Common Questions</h2>
          <div className="max-w-2xl mx-auto">
            {FAQS.map(({ q, a }, i) => (
              <div key={q}>
                {i > 0 && <Separator />}
                <div className="py-6">
                  <p className="font-semibold text-sm mb-2">{q}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator className="mb-16" />

        {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-muted/30 px-6 sm:px-10 py-10 text-center mb-10">
          <h2 className="text-2xl font-bold tracking-tight mb-3">Start Researching Smarter</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Join journalists, researchers, and political professionals who use MyParliament Premium
            to work faster and publish with confidence.
          </p>
          <div className="flex justify-center">
            <Button size="lg" onClick={scrollToPricing}>
              <Sparkles className="h-4 w-4 mr-2" />
              Get Premium Access
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Instant access · Cancel anytime · Secure payment via Billplz
          </p>
        </div>

        {/* Already have account */}
        {!isLoggedIn && !authLoading && (
          <p className="text-center text-sm text-muted-foreground">
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
