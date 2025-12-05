-- Migration: Add by-election tracking columns
-- Created: 2025-12-05

ALTER TABLE mps
ADD COLUMN IF NOT EXISTS by_election_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS by_election_notes TEXT;
