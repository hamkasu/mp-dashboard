-- Migration: Create AI Agent tables for agentic AI capabilities
-- Copyright by Calmic Sdn Bhd

-- AI Agent Executions table
CREATE TABLE IF NOT EXISTS ai_agent_executions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT NOT NULL,
  target_id VARCHAR,
  target_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  duration_ms INTEGER,
  parameters JSONB DEFAULT '{}'::jsonb,
  result JSONB,
  triggered_by TEXT NOT NULL,
  triggered_by_user_id VARCHAR,
  error_message TEXT,
  error_stack TEXT,
  tokens_used INTEGER,
  api_calls INTEGER DEFAULT 0,
  data_updated BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for ai_agent_executions
CREATE INDEX IF NOT EXISTS idx_ai_agent_executions_agent_type ON ai_agent_executions(agent_type);
CREATE INDEX IF NOT EXISTS idx_ai_agent_executions_status ON ai_agent_executions(status);
CREATE INDEX IF NOT EXISTS idx_ai_agent_executions_started_at ON ai_agent_executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agent_executions_target ON ai_agent_executions(target_type, target_id);

-- AI Agent Findings table
CREATE TABLE IF NOT EXISTS ai_agent_findings (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id VARCHAR NOT NULL REFERENCES ai_agent_executions(id) ON DELETE CASCADE,
  finding_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  related_mp_ids JSONB DEFAULT '[]'::jsonb,
  related_hansard_ids JSONB DEFAULT '[]'::jsonb,
  related_bill_ids JSONB DEFAULT '[]'::jsonb,
  evidence JSONB,
  suggested_action TEXT,
  action_taken TEXT,
  action_taken_at TIMESTAMP,
  action_taken_by VARCHAR,
  status TEXT NOT NULL DEFAULT 'new',
  reviewed_by VARCHAR,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for ai_agent_findings
CREATE INDEX IF NOT EXISTS idx_ai_agent_findings_execution_id ON ai_agent_findings(execution_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_findings_status ON ai_agent_findings(status);
CREATE INDEX IF NOT EXISTS idx_ai_agent_findings_severity ON ai_agent_findings(severity);
CREATE INDEX IF NOT EXISTS idx_ai_agent_findings_created_at ON ai_agent_findings(created_at DESC);

-- AI Agent Schedules table
CREATE TABLE IF NOT EXISTS ai_agent_schedules (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  cron_expression TEXT,
  interval_minutes INTEGER,
  parameters JSONB DEFAULT '{}'::jsonb,
  last_run_at TIMESTAMP,
  last_run_status TEXT,
  last_execution_id VARCHAR REFERENCES ai_agent_executions(id),
  next_run_at TIMESTAMP,
  created_by VARCHAR,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for ai_agent_schedules
CREATE INDEX IF NOT EXISTS idx_ai_agent_schedules_agent_type ON ai_agent_schedules(agent_type);
CREATE INDEX IF NOT EXISTS idx_ai_agent_schedules_enabled ON ai_agent_schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_ai_agent_schedules_next_run ON ai_agent_schedules(next_run_at) WHERE enabled = true;

-- Comments for documentation
COMMENT ON TABLE ai_agent_executions IS 'Tracks all AI agent execution runs';
COMMENT ON TABLE ai_agent_findings IS 'Stores insights and issues discovered by AI agents';
COMMENT ON TABLE ai_agent_schedules IS 'Manages scheduled AI agent runs';
