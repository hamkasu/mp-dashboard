-- Create bills table for storing scraped Parliament bills
CREATE TABLE IF NOT EXISTS "bills" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "bill_number" text,
  "introduction_date" text,
  "status" text DEFAULT 'Unknown' NOT NULL,
  "full_text_url" text,
  "source_url" text,
  "scraped_at" timestamp DEFAULT NOW() NOT NULL,
  "created_at" timestamp DEFAULT NOW() NOT NULL,
  "updated_at" timestamp DEFAULT NOW() NOT NULL
);

-- Create bill_pdf_files table for storing PDF files of bills
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "bills_bill_number_idx" ON "bills" ("bill_number");
CREATE INDEX IF NOT EXISTS "bills_status_idx" ON "bills" ("status");
CREATE INDEX IF NOT EXISTS "bills_scraped_at_idx" ON "bills" ("scraped_at" DESC);
CREATE INDEX IF NOT EXISTS "bill_pdf_files_bill_id_idx" ON "bill_pdf_files" ("bill_id");
