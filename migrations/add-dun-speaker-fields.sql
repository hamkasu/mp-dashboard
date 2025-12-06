-- Add role and speaker allowance fields to dun_members table
-- Migration: add-dun-speaker-fields
-- Date: 2025-12-06

-- Add role column for Speaker/Deputy Speaker
ALTER TABLE dun_members ADD COLUMN IF NOT EXISTS role TEXT;

-- Add speaker allowance column
ALTER TABLE dun_members ADD COLUMN IF NOT EXISTS speaker_allowance INTEGER DEFAULT 0;

-- Make constituency fields nullable for Speaker (who has no constituency)
ALTER TABLE dun_members ALTER COLUMN constituency_code DROP NOT NULL;
ALTER TABLE dun_members ALTER COLUMN constituency_name DROP NOT NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_dun_members_role ON dun_members(role) WHERE role IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dun_members_state_role ON dun_members(state, role) WHERE role IS NOT NULL;

-- Comment on new fields
COMMENT ON COLUMN dun_members.role IS 'Role in assembly: "Speaker", "Deputy Speaker", or NULL for regular members';
COMMENT ON COLUMN dun_members.speaker_allowance IS 'Additional allowance for Speaker/Deputy Speaker in RM per month';
