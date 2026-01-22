-- Add election result columns to mps table
ALTER TABLE mps
ADD COLUMN IF NOT EXISTS election_votes_received INTEGER,
ADD COLUMN IF NOT EXISTS election_total_valid_votes INTEGER,
ADD COLUMN IF NOT EXISTS election_year INTEGER DEFAULT 2022,
ADD COLUMN IF NOT EXISTS election_majority INTEGER,
ADD COLUMN IF NOT EXISTS election_turnout_percent INTEGER,
ADD COLUMN IF NOT EXISTS election_vote_percentage INTEGER;

-- Add comment to document the fields
COMMENT ON COLUMN mps.election_votes_received IS 'Number of votes received by the MP in their election';
COMMENT ON COLUMN mps.election_total_valid_votes IS 'Total valid votes cast in the constituency';
COMMENT ON COLUMN mps.election_year IS 'Year of the general election';
COMMENT ON COLUMN mps.election_majority IS 'Winning majority (vote difference from runner-up)';
COMMENT ON COLUMN mps.election_turnout_percent IS 'Voter turnout percentage * 100 (e.g., 7652 = 76.52%)';
COMMENT ON COLUMN mps.election_vote_percentage IS 'Vote percentage * 100 (e.g., 5358 = 53.58%)';
