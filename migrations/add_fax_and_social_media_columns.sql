-- Add fax and social_media columns to mps table
-- This migration adds additional contact information fields

ALTER TABLE "mps"
ADD COLUMN IF NOT EXISTS "fax" text;

ALTER TABLE "mps"
ADD COLUMN IF NOT EXISTS "social_media" text;

-- Optional: Add comments describing the columns
COMMENT ON COLUMN "mps"."fax" IS 'Fax number for the MP';
COMMENT ON COLUMN "mps"."social_media" IS 'Social media profile URL for the MP';
