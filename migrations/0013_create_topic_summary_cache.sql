-- Migration: Create topic summary cache table
-- Created: 2025-12-10

CREATE TABLE IF NOT EXISTS topic_summary_cache (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  hansard_record_id VARCHAR NOT NULL REFERENCES hansard_records(id) ON DELETE CASCADE,
  topic_name TEXT NOT NULL,
  summary TEXT NOT NULL,
  key_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  speakers JSONB NOT NULL DEFAULT '[]'::jsonb,
  quotes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(hansard_record_id, topic_name)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS topic_summary_cache_hansard_record_id_idx
ON topic_summary_cache (hansard_record_id);

CREATE INDEX IF NOT EXISTS topic_summary_cache_topic_name_idx
ON topic_summary_cache (topic_name);
