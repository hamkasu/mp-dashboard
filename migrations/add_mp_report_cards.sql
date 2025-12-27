-- Migration: Add MP Report Cards table
-- Created: 2025-12-27
-- Description: Creates table for storing MP performance grades and report cards

CREATE TABLE IF NOT EXISTS mp_report_cards (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  mp_id VARCHAR NOT NULL REFERENCES mps(id) ON DELETE CASCADE,

  -- Calculated scores (0-100)
  attendance_score INTEGER NOT NULL DEFAULT 0,
  participation_score INTEGER NOT NULL DEFAULT 0,
  conduct_score INTEGER NOT NULL DEFAULT 0,
  constituency_impact_score INTEGER NOT NULL DEFAULT 0,
  overall_score INTEGER NOT NULL DEFAULT 0,

  -- Letter grade (A-F)
  grade TEXT NOT NULL DEFAULT 'F',

  -- Metadata for calculations
  total_speeches INTEGER NOT NULL DEFAULT 0,
  average_speeches INTEGER NOT NULL DEFAULT 0,
  bills_raised INTEGER NOT NULL DEFAULT 0,
  questions_asked INTEGER NOT NULL DEFAULT 0,
  inappropriate_language_count INTEGER NOT NULL DEFAULT 0,
  poverty_rate INTEGER DEFAULT 0,

  -- Timestamps
  calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Ensure one report card per MP
  UNIQUE(mp_id)
);

-- Create index on mp_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_mp_report_cards_mp_id ON mp_report_cards(mp_id);

-- Create index on overall_score for faster sorting
CREATE INDEX IF NOT EXISTS idx_mp_report_cards_overall_score ON mp_report_cards(overall_score DESC);

-- Create index on grade for filtering
CREATE INDEX IF NOT EXISTS idx_mp_report_cards_grade ON mp_report_cards(grade);
