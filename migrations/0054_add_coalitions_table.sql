-- Phase 4: Coalition-based percentile scoring
-- Enables relative performance comparison within political coalitions and states

-- Create coalitions table
CREATE TABLE coalitions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,                -- "Barisan Nasional", "Pakatan Harapan", etc.
  code TEXT NOT NULL UNIQUE,                -- "BN", "PH", "GPS", "IND"
  color_hex TEXT,                           -- UI color for coalition (e.g., "#FF0000")
  description TEXT,                         -- Coalition description/notes
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on coalition code for fast lookups
CREATE INDEX idx_coalitions_code ON coalitions(code);

-- Add coalition_id foreign key to mps table
ALTER TABLE mps ADD COLUMN coalition_id VARCHAR REFERENCES coalitions(id) ON DELETE SET NULL;

-- Create index on coalition_id for performance
CREATE INDEX idx_mps_coalition_id ON mps(coalition_id);

-- Seed initial coalition data (15th Parliament, 2023-2027)
INSERT INTO coalitions (name, code, color_hex, description) VALUES
  ('Barisan Nasional', 'BN', '#0055CC', 'Coalition: UMNO, MCA, MIC, PBB, SUPP, PBS, UPKO, LDP'),
  ('Pakatan Harapan', 'PH', '#E62E04', 'Coalition: PKR, DAP, AMANAH, Bersatu'),
  ('Gabungan Parti Sarawak', 'GPS', '#3366CC', 'Sarawak-based coalition: PDS, PBB members'),
  ('Perikatan Nasional', 'PN', '#8B0000', 'Coalition: PAS, UMNO (2021-2023), Bersatu'),
  ('Independent', 'IND', '#808080', 'Independent MPs (not aligned with any coalition')
ON CONFLICT (code) DO NOTHING;

-- Map parties to coalitions based on 15th Parliament composition
-- This requires manual review and adjustment based on actual parliamentary data
-- For now, we create mappings for major parties
CREATE TABLE party_coalition_mapping (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  party_name TEXT NOT NULL,
  coalition_id VARCHAR NOT NULL REFERENCES coalitions(id),
  effective_date TIMESTAMP NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP,
  notes TEXT,
  UNIQUE(party_name, coalition_id, effective_date)
);

-- Seed party-coalition mappings
INSERT INTO party_coalition_mapping (party_name, coalition_id, notes) VALUES
  ('UMNO', (SELECT id FROM coalitions WHERE code = 'BN'), 'United Malays National Organisation'),
  ('MCA', (SELECT id FROM coalitions WHERE code = 'BN'), 'Malaysian Chinese Association'),
  ('MIC', (SELECT id FROM coalitions WHERE code = 'BN'), 'Malaysian Indian Congress'),
  ('PBB', (SELECT id FROM coalitions WHERE code = 'BN'), 'Sarawak Land Dayak Party'),
  ('SUPP', (SELECT id FROM coalitions WHERE code = 'BN'), 'Sarawak United People''s Party'),
  ('PBS', (SELECT id FROM coalitions WHERE code = 'BN'), 'Sabah Progress Party'),
  ('UPKO', (SELECT id FROM coalitions WHERE code = 'BN'), 'United Pasok Momogun'),
  ('LDP', (SELECT id FROM coalitions WHERE code = 'BN'), 'Liberal Democratic Party'),
  ('PKR', (SELECT id FROM coalitions WHERE code = 'PH'), 'Peoples Justice Party'),
  ('DAP', (SELECT id FROM coalitions WHERE code = 'PH'), 'Democratic Action Party'),
  ('AMANAH', (SELECT id FROM coalitions WHERE code = 'PH'), 'Islamic National Trust Party'),
  ('BERSATU', (SELECT id FROM coalitions WHERE code = 'PH'), 'Bersatu Party (post-2023)'),
  ('PAS', (SELECT id FROM coalitions WHERE code = 'PN'), 'Pan-Malaysian Islamic Party');
