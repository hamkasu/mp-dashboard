-- Add individual social media profile columns to mps table
-- This migration adds specific columns for Facebook, Instagram, Twitter/X, and TikTok

ALTER TABLE "mps"
ADD COLUMN IF NOT EXISTS "facebook_url" text;

ALTER TABLE "mps"
ADD COLUMN IF NOT EXISTS "instagram_url" text;

ALTER TABLE "mps"
ADD COLUMN IF NOT EXISTS "twitter_url" text;

ALTER TABLE "mps"
ADD COLUMN IF NOT EXISTS "tiktok_url" text;

-- Add comments describing the columns
COMMENT ON COLUMN "mps"."facebook_url" IS 'Facebook profile URL for the MP';
COMMENT ON COLUMN "mps"."instagram_url" IS 'Instagram profile URL for the MP';
COMMENT ON COLUMN "mps"."twitter_url" IS 'Twitter/X profile URL for the MP';
COMMENT ON COLUMN "mps"."tiktok_url" IS 'TikTok profile URL for the MP';
