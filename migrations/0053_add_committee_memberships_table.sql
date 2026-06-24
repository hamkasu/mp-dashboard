-- Phase 3: Add parliamentary committee membership tracking
-- Enables scoring bonus for MPs in high-accountability roles (PAC, Select committees, etc.)

-- Create enum type for committee roles
CREATE TYPE committee_role AS ENUM ('chair', 'member', 'vice-chair');

-- Create committee_memberships table
CREATE TABLE committee_memberships (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  mp_id VARCHAR NOT NULL REFERENCES mps(id) ON DELETE CASCADE,

  -- Committee identification
  committee_name TEXT NOT NULL,              -- "Public Accounts Committee"
  committee_abbr TEXT,                       -- "PAC" - optional

  -- Role and status
  role committee_role NOT NULL,              -- "chair", "member", "vice-chair"

  -- Session tracking
  parliament_term TEXT NOT NULL,             -- "15th Parliament", "14th Parliament"
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,                        -- null = currently serving

  -- Data quality
  source_url TEXT,                           -- Verification source
  verification_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_committee_memberships_mp_id ON committee_memberships(mp_id);
CREATE INDEX idx_committee_memberships_committee ON committee_memberships(committee_abbr);
CREATE INDEX idx_committee_memberships_parliament_term ON committee_memberships(parliament_term);
CREATE INDEX idx_committee_memberships_role ON committee_memberships(role);
CREATE INDEX idx_committee_memberships_current ON committee_memberships(mp_id, end_date)
  WHERE end_date IS NULL;

-- Create index for active members (currently serving, 15th Parliament)
CREATE INDEX idx_committee_memberships_active_15th ON committee_memberships(mp_id)
  WHERE parliament_term = '15th Parliament' AND end_date IS NULL;

-- Add constraint to prevent duplicate current memberships (one active per MP per committee per term)
CREATE UNIQUE INDEX uidx_committee_memberships_current_per_mp_committee ON committee_memberships(mp_id, committee_abbr, parliament_term)
  WHERE end_date IS NULL;
