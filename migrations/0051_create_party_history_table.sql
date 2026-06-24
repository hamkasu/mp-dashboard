-- Create party_history table for tracking MP affiliation changes
-- This enables tracking of party defections, sackings, and coalition exits

CREATE TABLE IF NOT EXISTS party_history (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  mp_id VARCHAR(36) NOT NULL REFERENCES mps(id) ON DELETE CASCADE,
  old_party TEXT,
  old_coalition TEXT,
  new_party TEXT NOT NULL,
  new_coalition TEXT,
  change_date TIMESTAMP NOT NULL DEFAULT NOW(),
  change_type TEXT NOT NULL, -- 'defection', 'sacking', 'resignation', 'coalition_exit', 'by_election', 'appointment'
  source_url TEXT,
  source_name TEXT,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_party_history_mp_id ON party_history(mp_id);
CREATE INDEX IF NOT EXISTS idx_party_history_change_date ON party_history(change_date);
CREATE INDEX IF NOT EXISTS idx_party_history_change_type ON party_history(change_type);
CREATE INDEX IF NOT EXISTS idx_party_history_new_party ON party_history(new_party);

-- Add coalition column to mps table if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mps' AND column_name = 'coalition'
  ) THEN
    ALTER TABLE mps ADD COLUMN coalition TEXT;
  END IF;
END $$;
