-- Migration: Add MYMP.org.my biography fields to mps table
-- Data sourced manually from https://mymp.org.my (volunteer-run MP directory)
-- This migration adds fields for MP biography data integration

-- Add MYMP profile linking fields
ALTER TABLE mps ADD COLUMN IF NOT EXISTS mymp_slug TEXT;
ALTER TABLE mps ADD COLUMN IF NOT EXISTS mymp_url TEXT;

-- Add biography/personal info fields
ALTER TABLE mps ADD COLUMN IF NOT EXISTS bio_summary TEXT;
ALTER TABLE mps ADD COLUMN IF NOT EXISTS birth_date TIMESTAMP;
ALTER TABLE mps ADD COLUMN IF NOT EXISTS hometown TEXT;

-- Add structured history fields (JSONB arrays)
ALTER TABLE mps ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '[]'::jsonb;
ALTER TABLE mps ADD COLUMN IF NOT EXISTS political_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE mps ADD COLUMN IF NOT EXISTS non_political_affiliations JSONB DEFAULT '[]'::jsonb;
ALTER TABLE mps ADD COLUMN IF NOT EXISTS career_history JSONB DEFAULT '[]'::jsonb;

-- Add optional MYMP scores (stored as integers 0-100)
ALTER TABLE mps ADD COLUMN IF NOT EXISTS mymp_loyalty_score INTEGER;
ALTER TABLE mps ADD COLUMN IF NOT EXISTS mymp_availability_score INTEGER;
ALTER TABLE mps ADD COLUMN IF NOT EXISTS mymp_ethics_score INTEGER;

-- Add external reference links
ALTER TABLE mps ADD COLUMN IF NOT EXISTS wikipedia_url TEXT;

-- Add data sync tracking
ALTER TABLE mps ADD COLUMN IF NOT EXISTS mymp_data_updated_at TIMESTAMP;

-- Create index for efficient MYMP lookups
CREATE INDEX IF NOT EXISTS idx_mps_mymp_slug ON mps(mymp_slug) WHERE mymp_slug IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN mps.mymp_slug IS 'URL slug for MYMP.org.my profile (e.g., syed-saddiq)';
COMMENT ON COLUMN mps.bio_summary IS 'Biography summary from MYMP.org.my (volunteer project)';
COMMENT ON COLUMN mps.political_history IS 'Political journey as JSONB array: [{party, startYear, endYear, notes}]';
COMMENT ON COLUMN mps.mymp_data_updated_at IS 'Timestamp when MYMP data was last manually synced';
