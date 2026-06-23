-- Phase 2: Add case status constraints and confirmation tracking
-- This migration adds enum constraints and audit fields to court cases and SPRM investigations

-- Add new columns to court_cases table
ALTER TABLE court_cases
ADD COLUMN IF NOT EXISTS status_confirmed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS status_confirmed_by VARCHAR,
ADD COLUMN IF NOT EXISTS status_notes TEXT;

-- Add new columns to sprm_investigations table
ALTER TABLE sprm_investigations
ADD COLUMN IF NOT EXISTS status_confirmed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS status_confirmed_by VARCHAR,
ADD COLUMN IF NOT EXISTS status_notes TEXT;

-- Create enum type for case status
CREATE TYPE case_status AS ENUM (
  'under_investigation',
  'charged',
  'convicted',
  'acquitted',
  'withdrawn',
  'appeal_pending'
);

-- Migration helper: map existing status values to enum values
-- This updates free-text status values to standardized enum values
UPDATE court_cases
SET status = 'convicted'
WHERE LOWER(status) IN ('convicted', 'conviction');

UPDATE court_cases
SET status = 'acquitted'
WHERE LOWER(status) IN ('acquitted', 'acquittal', 'dismissed', 'discharged');

UPDATE court_cases
SET status = 'withdrawn'
WHERE LOWER(status) IN ('withdrawn', 'settlement', 'settled', 'closed', 'completed');

UPDATE court_cases
SET status = 'appeal_pending'
WHERE LOWER(status) IN ('appeal pending', 'appeal_pending', 'appealing');

UPDATE court_cases
SET status = 'charged'
WHERE LOWER(status) IN ('ongoing', 'pending', 'charged', 'in progress', 'in_progress');

UPDATE court_cases
SET status = 'under_investigation'
WHERE LOWER(status) IN ('under investigation', 'under_investigation', 'investigation');

-- Same for SPRM investigations
UPDATE sprm_investigations
SET status = 'convicted'
WHERE LOWER(status) IN ('convicted', 'conviction');

UPDATE sprm_investigations
SET status = 'acquitted'
WHERE LOWER(status) IN ('acquitted', 'acquittal', 'dismissed', 'discharged');

UPDATE sprm_investigations
SET status = 'withdrawn'
WHERE LOWER(status) IN ('withdrawn', 'settlement', 'settled', 'closed', 'completed');

UPDATE sprm_investigations
SET status = 'appeal_pending'
WHERE LOWER(status) IN ('appeal pending', 'appeal_pending', 'appealing');

UPDATE sprm_investigations
SET status = 'charged'
WHERE LOWER(status) IN ('ongoing', 'pending', 'charged', 'in progress', 'in_progress');

UPDATE sprm_investigations
SET status = 'under_investigation'
WHERE LOWER(status) IN ('under investigation', 'under_investigation', 'investigation');

-- Add check constraint to ensure only valid enum values are stored
-- (PostgreSQL enum will enforce this, but adding for clarity)
ALTER TABLE court_cases
ADD CONSTRAINT valid_court_case_status CHECK (status IN ('under_investigation', 'charged', 'convicted', 'acquitted', 'withdrawn', 'appeal_pending'));

ALTER TABLE sprm_investigations
ADD CONSTRAINT valid_sprm_status CHECK (status IN ('under_investigation', 'charged', 'convicted', 'acquitted', 'withdrawn', 'appeal_pending'));

-- Create indexes for faster filtering by status
CREATE INDEX IF NOT EXISTS idx_court_cases_status ON court_cases(status);
CREATE INDEX IF NOT EXISTS idx_sprm_investigations_status ON sprm_investigations(status);
CREATE INDEX IF NOT EXISTS idx_court_cases_status_confirmed ON court_cases(status_confirmed_at);
CREATE INDEX IF NOT EXISTS idx_sprm_investigations_status_confirmed ON sprm_investigations(status_confirmed_at);
