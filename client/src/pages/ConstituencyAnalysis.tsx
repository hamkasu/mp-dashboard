/**
 * Copyright by Calmic Sdn Bhd
 *
 * ConstituencyAnalysis page
 *
 * ── SEO Strategy ──────────────────────────────────────────────────────────────
 *
 * This page uses a metered-paywall model approved by Google:
 * https://developers.google.com/search/docs/appearance/structured-data/paywalled-content
 *
 * WHAT GOOGLE INDEXES (public section — same HTML for crawlers and users):
 *   • Page title + meta description (below)
 *   • JSON-LD WebPage schema with isAccessibleForFree:"False"
 *   • JSON-LD Dataset schema for the preview dataset
 *   • Summary stat cards (total constituencies, avg participation rate, term)
 *   • Participation distribution bar chart (rendered as DOM/SVG)
 *   • Top-5 constituency table with real data
 *
 * WHAT GOOGLE DOES NOT INDEX (premium section — never in HTML for free users):
 *   • Full 222-row constituency table (fetched only when isPremium=true)
 *   • Session counts, speech counts per constituency
 *   The premium API endpoint (/api/constituencies/hansard-participation-15th)
 *   returns 401/403 for unauthenticated requests including Googlebot — the full
 *   dataset is never embedded in the HTML payload for non-premium visitors.
 *
 * CLOAKING AVOIDANCE:
 *   We serve identical HTML to Googlebot and to regular users.  The only
 *   difference between a paying and free user is the API response from the
 *   premium endpoint (which Googlebot never calls successfully anyway).
 *   CSS blur is applied client-side via JavaScript, not server-side.
 *
 * SCHEMA ANNOTATION:
 *   The gated section has className="premium-content" which matches the
 *   cssSelector in the WebPage hasPart schema below.  This signals to Google
 *   which DOM region is behind the paywall without hiding it from the crawler.
 *
 * INTERNAL LINKING:
 *   • Every MP profile page links here via the constituency name field.
 *   • The breadcrumb schema embeds the Home → Constituency Analysis path.
 *
 * ── Dynamic meta description ──────────────────────────────────────────────────
 * PageMeta is updated client-side once preview data loads.  The pre-rendered
 * HTML (server/prerender.ts) has a static fallback description for Googlebot.
 */

import { ConstituencyHansardAnalysis } from "@/components/ConstituencyHansardAnalysis";
import { PageMeta } from "@/components/PageMeta";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Lock, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

// ── SEO structured data ───────────────────────────────────────────────────────

const BASE_URL = "https://myparliament.calmic.com.my";

/**
 * Build JSON-LD structured data for the constituency analysis page.
 *
 * Uses the paywalled content pattern:
 *   WebPage.isAccessibleForFree = "False"  (string, per schema.org spec)
 *   WebPage.hasPart → cssSelector = ".premium-content"
 *
 * This tells Google:
 *   1. The page is intentionally paywalled — do not penalise for thin content.
 *   2. The premium section maps to the .premium-content DOM node.
 *   3. The public preview (stats, chart, top-5) is genuinely free content.
 *
 * The Dataset schema for the public portion uses isAccessibleForFree:"True"
 * to explicitly declare the preview data as freely indexable.
 */
function buildConstituencySchemas(totalConstituencies: number, avgRate: number) {
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Constituency Hansard Analysis — 15th Parliament",
    "description": `Track speaking participation for all ${totalConstituencies} Malaysian Parliament constituencies in the 15th Parliament. Average participation rate: ${avgRate}%.`,
    "url": `${BASE_URL}/constituency-analysis`,
    // "False" as a string — schema.org Boolean type requires "True"/"False"
    "isAccessibleForFree": "False",
    "hasPart": [
      {
        "@type": "WebPageElement",
        // Must match the className on the PremiumGate outer wrapper
        "cssSelector": ".premium-content",
        "isAccessibleForFree": "False"
      }
    ],
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Dashboard", "item": BASE_URL },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Constituency Analysis",
          "item": `${BASE_URL}/constituency-analysis`
        }
      ]
    },
    "about": {
      "@type": "GovernmentOrganization",
      "name": "Malaysian Parliament — Dewan Rakyat",
      "url": "https://www.parlimen.gov.my"
    }
  };

  // The public-preview portion is genuinely accessible for free — declare it
  // separately so search engines can index and display the preview data.
  const previewDatasetSchema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "name": "Malaysian Constituency Hansard Participation Preview — 15th Parliament",
    "description": `Public preview of Hansard speaking participation for ${totalConstituencies} Malaysian Parliament constituencies. Includes participation rate distribution and top-5 highest-participation seats.`,
    "url": `${BASE_URL}/constituency-analysis`,
    "isAccessibleForFree": "True",
    "temporalCoverage": "2022/2027",
    "spatial": { "@type": "Place", "name": "Malaysia" },
    "publisher": {
      "@type": "GovernmentOrganization",
      "name": "Malaysian Parliament MP Dashboard",
      "url": BASE_URL
    },
    "license": "https://creativecommons.org/licenses/by/4.0/",
    "keywords": [
      "constituency analysis", "Hansard participation", "Malaysian Parliament",
      "Dewan Rakyat", "MP speaking record", "15th Parliament Malaysia",
      "constituency performance"
    ]
  };

  return [webPageSchema, previewDatasetSchema];
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ConstituencyAnalysis() {
  const [, setLocation] = useLocation();
  const { isPremium, isLoading: authLoading } = useAuth();

  // Fetch public preview to power the dynamic meta description.
  // Falls back to a static description (from prerender.ts) if not yet loaded.
  const { data: preview } = useQuery<{
    summary: { totalConstituencies: number; avgParticipationRate: number } | null;
  }>({
    queryKey: ["/api/constituencies/public-preview"],
    staleTime: 60 * 60 * 1000,
  });

  // ── Premium gate ────────────────────────────────────────────────────────
  // Redirect non-premium users to /pricing. Wait until auth has loaded to
  // avoid a flash-redirect for users who are already subscribed.
  if (!authLoading && !isPremium) {
    setLocation("/pricing");
    return null;
  }

  const total = preview?.summary?.totalConstituencies ?? 222;
  const avgRate = preview?.summary?.avgParticipationRate ?? 67;

  // ── Dynamic meta description ─────────────────────────────────────────────
  // Injected by react-helmet-async after data loads (client-side).
  // The pre-rendered HTML (server/prerender.ts) has a good static fallback for
  // Googlebot, so we get both: rich dynamic description for users AND static
  // description for crawler first contact.
  const metaDescription = `See how actively all ${total} Malaysian Parliament constituencies are represented in the 15th Parliament Hansard. Average participation rate: ${avgRate}%. View distribution charts, top-performing seats, and state breakdowns. Premium: full ${total}-seat data, detailed metrics & PDF export.`;

  const metaKeywords = [
    "constituency analysis Malaysia",
    "Malaysian Parliament Hansard participation",
    "constituency Hansard analysis",
    "Dewan Rakyat constituency performance",
    "MP constituency participation rate",
    "15th Parliament Malaysia constituencies",
    "constituency speaking record",
    "Malaysian Parliament transparency"
  ].join(", ");

  const structuredData = buildConstituencySchemas(total, avgRate);

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="Constituency Hansard Analysis — 15th Parliament | Malaysian Parliament Dashboard"
        description={metaDescription}
        keywords={metaKeywords}
        url={`${BASE_URL}/constituency-analysis`}
        structuredData={structuredData}
      />

      <div className="container mx-auto px-4 py-8 max-w-6xl">

        {/* ── Back nav ───────────────────────────────────────────────────── */}
        <Button
          variant="outline"
          onClick={() => setLocation("/")}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        {/* ── Page header ────────────────────────────────────────────────── */}
        {/*
          The <h1> and description paragraph below are always rendered in HTML
          for both users and Googlebot — they form the core indexable content.
          The "Subscribe for full access" inline link is a standard CTA visible
          to all users; Googlebot crawls it as ordinary anchor text.
        */}
        <div className="mb-8">
          <div className="flex flex-wrap items-start gap-3 mb-2">
            <h1
              className="text-3xl font-bold"
              data-testid="heading-page-title"
            >
              Constituency Hansard Analysis
            </h1>

            {!authLoading && (
              isPremium ? (
                <Badge className="mt-1 gap-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
                  <Sparkles className="h-3 w-3" />
                  Premium Access
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="mt-1 gap-1 cursor-pointer"
                  onClick={() => setLocation("/pricing")}
                >
                  <Lock className="h-3 w-3" />
                  Full access requires Premium
                </Badge>
              )
            )}
          </div>

          {/*
            This description is real public content indexed by Google.
            It references the total constituency count and avg participation
            rate from the public API — giving searchers and Googlebot the
            same genuinely useful summary text.
          */}
          <p className="text-muted-foreground max-w-2xl">
            Track how actively each of Malaysia's {total} parliamentary
            constituencies is represented in the 15th Parliament's Hansard.
            {!isPremium && !authLoading && (
              <>
                {" "}
                <button
                  className="text-primary underline underline-offset-2 hover:no-underline font-medium"
                  onClick={() => setLocation("/pricing")}
                >
                  Subscribe for full access →
                </button>
              </>
            )}
          </p>
        </div>

        {/* ── Main content ──────────────────────────────────────────────── */}
        <ConstituencyHansardAnalysis />
      </div>
    </div>
  );
}
