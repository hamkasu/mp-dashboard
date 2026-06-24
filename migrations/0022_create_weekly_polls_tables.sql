-- Weekly Polls System Migration
-- Creates tables for the weekly polling system with AI-generated topics

-- Polls table - stores the weekly poll questions
CREATE TABLE IF NOT EXISTS polls (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  question_ms TEXT,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',

  -- Week tracking
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft',

  -- AI generation metadata
  generated_by TEXT DEFAULT 'ai',
  ai_prompt_used TEXT,
  source_context TEXT,

  -- Timing
  starts_at TIMESTAMP,
  ends_at TIMESTAMP,

  -- Stats (denormalized for performance)
  total_votes INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Poll Options table - stores the answer choices for each poll
CREATE TABLE IF NOT EXISTS poll_options (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id VARCHAR NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  option_text_ms TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,

  -- Stats (denormalized for performance)
  vote_count INTEGER NOT NULL DEFAULT 0,
  vote_percentage INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Poll Votes table - stores individual votes with deduplication
CREATE TABLE IF NOT EXISTS poll_votes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id VARCHAR NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id VARCHAR NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,

  -- Voter identification for deduplication (anonymous)
  voter_fingerprint TEXT NOT NULL,
  ip_address TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_polls_status ON polls(status);
CREATE INDEX IF NOT EXISTS idx_polls_week_year ON polls(year, week_number);
CREATE INDEX IF NOT EXISTS idx_polls_starts_at ON polls(starts_at);
CREATE INDEX IF NOT EXISTS idx_polls_ends_at ON polls(ends_at);

CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_options_display_order ON poll_options(poll_id, display_order);

CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option_id ON poll_votes(option_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_fingerprint ON poll_votes(voter_fingerprint);

-- Unique constraint to prevent duplicate votes from same user
CREATE UNIQUE INDEX IF NOT EXISTS idx_poll_votes_unique_voter ON poll_votes(poll_id, voter_fingerprint);
