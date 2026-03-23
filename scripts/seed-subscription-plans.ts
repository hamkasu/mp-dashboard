/**
 * Copyright by Calmic Sdn Bhd
 *
 * Seeds the subscription_plans table with the default monthly and yearly plans.
 * Safe to run multiple times (uses ON CONFLICT DO NOTHING via Drizzle's onConflictDoNothing).
 *
 * Usage:
 *   npx tsx scripts/seed-subscription-plans.ts
 */

import { db } from "../server/db";
import { subscriptionPlans } from "../shared/schema";
import { sql } from "drizzle-orm";

const PLANS = [
  {
    slug: "monthly",
    name: "Premium Monthly",
    priceMyr: 1500, // RM 15.00 in sen
    interval: "month",
    features: [
      "Full Constituency Reports",
      "Hansard AI Analysis",
      "Detailed MP Report Cards",
      "MP Performance Comparisons",
      "Data Export (CSV)",
    ],
    isActive: true,
  },
  {
    slug: "yearly",
    name: "Premium Yearly",
    priceMyr: 12000, // RM 120.00 in sen (2 months free vs monthly)
    interval: "year",
    features: [
      "Full Constituency Reports",
      "Hansard AI Analysis",
      "Detailed MP Report Cards",
      "MP Performance Comparisons",
      "Data Export (CSV)",
      "2 Months Free vs Monthly",
    ],
    isActive: true,
  },
] as const;

async function seed(): Promise<void> {
  console.log("Seeding subscription plans...");

  for (const plan of PLANS) {
    await db
      .insert(subscriptionPlans)
      .values(plan)
      .onConflictDoUpdate({
        target: subscriptionPlans.slug,
        set: {
          name: plan.name,
          priceMyr: plan.priceMyr,
          interval: plan.interval,
          features: sql`${JSON.stringify(plan.features)}::jsonb`,
          isActive: plan.isActive,
        },
      });

    const priceRm = (plan.priceMyr / 100).toFixed(2);
    console.log(`  ✓ ${plan.slug}: RM ${priceRm} / ${plan.interval}`);
  }

  console.log("Done.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
