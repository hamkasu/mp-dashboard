# Database Migration Instructions

## Problem
The `bills` table is missing several required columns (`bill_number`, `introduction_date`, etc.), causing the "Generate Impact Analysis" feature to fail.

## Solution
Run the migration file: `migrations/0014_fix_bills_table_schema.sql`

---

## Option 1: Railway Dashboard (Recommended if using Railway)

1. **Go to your Railway project dashboard**
2. **Click on your PostgreSQL database service**
3. **Click on the "Data" tab**
4. **Click "Query" button** (or find the SQL query editor)
5. **Copy and paste** the entire content from `migrations/0014_fix_bills_table_schema.sql`
6. **Click "Run"** or press Execute
7. **Verify** - You should see messages like "Added bill_number column" in the results

---

## Option 2: Using psql Command Line

If you have `psql` installed locally and access to your database:

```bash
# Set your database URL (get this from Railway/your hosting provider)
export DATABASE_URL="postgresql://user:password@host:port/database"

# Run the migration
psql $DATABASE_URL -f migrations/0014_fix_bills_table_schema.sql
```

---

## Option 3: Copy and Paste Direct SQL

If the migration file doesn't work, you can copy this SQL and run it directly:

```sql
-- Step 1: Create bills table if it doesn't exist
CREATE TABLE IF NOT EXISTS "bills" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "created_at" timestamp DEFAULT NOW() NOT NULL,
  "updated_at" timestamp DEFAULT NOW() NOT NULL
);

-- Step 2: Add missing columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bills' AND column_name = 'bill_number') THEN
    ALTER TABLE "bills" ADD COLUMN "bill_number" text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bills' AND column_name = 'introduction_date') THEN
    ALTER TABLE "bills" ADD COLUMN "introduction_date" text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bills' AND column_name = 'status') THEN
    ALTER TABLE "bills" ADD COLUMN "status" text DEFAULT 'Unknown' NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bills' AND column_name = 'full_text_url') THEN
    ALTER TABLE "bills" ADD COLUMN "full_text_url" text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bills' AND column_name = 'source_url') THEN
    ALTER TABLE "bills" ADD COLUMN "source_url" text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bills' AND column_name = 'scraped_at') THEN
    ALTER TABLE "bills" ADD COLUMN "scraped_at" timestamp DEFAULT NOW() NOT NULL;
  END IF;
END $$;

-- Step 3: Create related tables
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

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS "bills_bill_number_idx" ON "bills" ("bill_number");
CREATE INDEX IF NOT EXISTS "bills_status_idx" ON "bills" ("status");
CREATE INDEX IF NOT EXISTS "bills_scraped_at_idx" ON "bills" ("scraped_at" DESC);
CREATE INDEX IF NOT EXISTS "bill_pdf_files_bill_id_idx" ON "bill_pdf_files" ("bill_id");
CREATE INDEX IF NOT EXISTS "bill_impacts_bill_id_idx" ON "bill_impacts" ("bill_id");
```

---

## Verification

After running the migration, verify it worked:

```sql
-- Check the bills table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'bills'
ORDER BY ordinal_position;
```

You should see all these columns:
- `id`
- `title`
- `bill_number` ✅
- `introduction_date` ✅
- `status` ✅
- `full_text_url` ✅
- `source_url` ✅
- `scraped_at` ✅
- `created_at`
- `updated_at`

---

## After Migration

1. **Refresh your application** - The "Generate Impact Analysis" feature should now work
2. **Test** - Click on any bill and try generating impact analysis
3. The error `column "bill_number" does not exist` should be gone! ✅
