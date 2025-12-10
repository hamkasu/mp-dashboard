-- ============================================
-- FIX BILLS TABLE SCHEMA - Add Missing Columns
-- Migration: 0014_fix_bills_table_schema
-- Date: 2025-12-10
-- ============================================

-- Step 1: Create bills table if it doesn't exist
CREATE TABLE IF NOT EXISTS "bills" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "created_at" timestamp DEFAULT NOW() NOT NULL,
  "updated_at" timestamp DEFAULT NOW() NOT NULL
);

-- Step 2: Add ALL missing columns to bills table (safe - only adds if missing)
DO $$
BEGIN
  -- Add bill_number column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bills' AND column_name = 'bill_number'
  ) THEN
    ALTER TABLE "bills" ADD COLUMN "bill_number" text;
    RAISE NOTICE 'Added bill_number column';
  END IF;

  -- Add introduction_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bills' AND column_name = 'introduction_date'
  ) THEN
    ALTER TABLE "bills" ADD COLUMN "introduction_date" text;
    RAISE NOTICE 'Added introduction_date column';
  END IF;

  -- Add status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bills' AND column_name = 'status'
  ) THEN
    ALTER TABLE "bills" ADD COLUMN "status" text DEFAULT 'Unknown' NOT NULL;
    RAISE NOTICE 'Added status column';
  END IF;

  -- Add full_text_url column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bills' AND column_name = 'full_text_url'
  ) THEN
    ALTER TABLE "bills" ADD COLUMN "full_text_url" text;
    RAISE NOTICE 'Added full_text_url column';
  END IF;

  -- Add source_url column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bills' AND column_name = 'source_url'
  ) THEN
    ALTER TABLE "bills" ADD COLUMN "source_url" text;
    RAISE NOTICE 'Added source_url column';
  END IF;

  -- Add scraped_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bills' AND column_name = 'scraped_at'
  ) THEN
    ALTER TABLE "bills" ADD COLUMN "scraped_at" timestamp DEFAULT NOW() NOT NULL;
    RAISE NOTICE 'Added scraped_at column';
  END IF;
END $$;

-- Step 3: Create related tables if they don't exist
CREATE TABLE IF NOT EXISTS "bill_pdf_files" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "bill_id" varchar NOT NULL REFERENCES "bills"("id") ON DELETE CASCADE,
  "original_filename" text NOT NULL,
  "file_size_bytes" integer NOT NULL,
  "content_type" text DEFAULT 'application/pdf' NOT NULL,
  "pdf_data" bytea NOT NULL,
  "md5_hash" text,
  "uploaded_at" timestamp DEFAULT NOW() NOT NULL,
  "uploaded_by" varchar,
  "downloaded_from_url" text
);

CREATE TABLE IF NOT EXISTS "bill_impacts" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "bill_id" varchar NOT NULL REFERENCES "bills"("id") ON DELETE CASCADE,
  "summary" text NOT NULL,
  "affected_groups" text[],
  "impact_type" text,
  "key_points" text[],
  "generated_by" text DEFAULT 'ai',
  "generated_at" timestamp DEFAULT NOW() NOT NULL,
  "created_at" timestamp DEFAULT NOW() NOT NULL,
  "updated_at" timestamp DEFAULT NOW() NOT NULL
);

-- Step 4: Create all necessary indexes
CREATE INDEX IF NOT EXISTS "bills_bill_number_idx" ON "bills" ("bill_number");
CREATE INDEX IF NOT EXISTS "bills_status_idx" ON "bills" ("status");
CREATE INDEX IF NOT EXISTS "bills_scraped_at_idx" ON "bills" ("scraped_at" DESC);
CREATE INDEX IF NOT EXISTS "bill_pdf_files_bill_id_idx" ON "bill_pdf_files" ("bill_id");
CREATE INDEX IF NOT EXISTS "bill_impacts_bill_id_idx" ON "bill_impacts" ("bill_id");

-- Step 5: Verify the schema (display results)
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'bills'
ORDER BY ordinal_position;
