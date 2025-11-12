-- Add hansard_sessions_spoke column to mps table
-- This migration adds speaking participation tracking

ALTER TABLE "mps" 
ADD COLUMN IF NOT EXISTS "hansard_sessions_spoke" integer DEFAULT 0 NOT NULL;

-- Optional: Update existing MPs with their current speaking counts
-- This will be populated automatically by the backend on next data fetch
