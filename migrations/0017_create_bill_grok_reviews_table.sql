-- ============================================
-- CREATE BILL GROK REVIEWS TABLE
-- Migration: 0017_create_bill_grok_reviews_table
-- Date: 2026-01-21
-- Description: Add table for storing Grok AI-generated comprehensive reviews of bills
-- ============================================

-- Create bill_grok_reviews table
CREATE TABLE IF NOT EXISTS "bill_grok_reviews" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "bill_id" varchar NOT NULL REFERENCES "bills"("id") ON DELETE CASCADE,
  "review" text NOT NULL,
  "generated_by" text DEFAULT 'grok',
  "generated_at" timestamp DEFAULT NOW() NOT NULL,
  "created_at" timestamp DEFAULT NOW() NOT NULL,
  "updated_at" timestamp DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "bill_grok_reviews_bill_id_idx" ON "bill_grok_reviews" ("bill_id");
CREATE INDEX IF NOT EXISTS "bill_grok_reviews_generated_at_idx" ON "bill_grok_reviews" ("generated_at" DESC);

-- Verify the schema (display results)
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'bill_grok_reviews'
ORDER BY ordinal_position;
