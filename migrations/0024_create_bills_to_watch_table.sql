-- Bills to Watch table
-- Stores curated key legislation for the homepage card
-- Supports daily auto-refresh and manual admin updates

CREATE TABLE IF NOT EXISTS bills_to_watch (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en TEXT NOT NULL,
  title_ms TEXT NOT NULL,
  bill_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  summary_en TEXT NOT NULL,
  summary_ms TEXT NOT NULL,
  details_en TEXT,
  details_ms TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  icon TEXT NOT NULL DEFAULT 'scroll',
  tags JSONB DEFAULT '[]'::jsonb,
  source_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
