-- Migration: Create hansard_sync_logs table for tracking automated sync operations
-- This table stores a persistent record of all Hansard sync operations, allowing
-- monitoring and recovery after server restarts

CREATE TABLE IF NOT EXISTS hansard_sync_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by TEXT NOT NULL, -- 'manual', 'scheduled', 'startup-recovery'
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  duration_ms INTEGER,
  last_known_session TEXT,
  records_found INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  errors JSONB,
  success BOOLEAN DEFAULT true
);

-- Create index on started_at for quick lookup of latest syncs
CREATE INDEX IF NOT EXISTS idx_hansard_sync_logs_started_at
  ON hansard_sync_logs(started_at DESC);

-- Create index on success for monitoring failed syncs
CREATE INDEX IF NOT EXISTS idx_hansard_sync_logs_success
  ON hansard_sync_logs(success)
  WHERE success = false;

-- Comment on table
COMMENT ON TABLE hansard_sync_logs IS 'Tracks all Hansard sync operations for monitoring and recovery';
COMMENT ON COLUMN hansard_sync_logs.triggered_by IS 'Source that triggered the sync: manual, scheduled, or startup-recovery';
COMMENT ON COLUMN hansard_sync_logs.duration_ms IS 'Duration of sync operation in milliseconds';
COMMENT ON COLUMN hansard_sync_logs.errors IS 'JSON array of errors encountered during sync';
