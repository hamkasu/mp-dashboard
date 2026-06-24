-- Phase 1: Hansard NLP Tagging Pipeline Schema
-- Creates tables for individual speech turns, tags, entities, and vocabulary

-- Individual speech turns extracted from Hansard sessions
CREATE TABLE IF NOT EXISTS hansard_speeches (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  hansard_record_id varchar(36) NOT NULL REFERENCES hansard_records(id) ON DELETE CASCADE,
  mp_id varchar(36) NOT NULL REFERENCES mps(id) ON DELETE RESTRICT,
  speech_text text NOT NULL,
  instance_number integer NOT NULL, -- Which turn did this MP speak (1st, 2nd, etc)
  speaking_order integer NOT NULL, -- Overall order in the session
  character_offset_start integer,
  character_offset_end integer,
  created_at timestamp DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_hansard_speeches_hansard_record_id ON hansard_speeches(hansard_record_id);
CREATE INDEX idx_hansard_speeches_mp_id ON hansard_speeches(mp_id);
CREATE INDEX idx_hansard_speeches_created_at ON hansard_speeches(created_at);

-- Controlled vocabulary for topic tags
CREATE TABLE IF NOT EXISTS hansard_topic_vocabulary (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tag_slug text NOT NULL UNIQUE,
  display_label text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  merged_into_slug text,
  created_at timestamp DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_hansard_topic_vocabulary_status ON hansard_topic_vocabulary(status);

-- Topic and sentiment tags assigned to speeches
CREATE TABLE IF NOT EXISTS hansard_tags (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  speech_id varchar(36) NOT NULL REFERENCES hansard_speeches(id) ON DELETE CASCADE,
  tag_type text NOT NULL, -- 'topic' or 'sentiment'
  tag_value text NOT NULL,
  confidence integer NOT NULL, -- 0-100
  evidence_quote text,
  is_new_tag boolean NOT NULL DEFAULT false,
  target_type text, -- sentiment only: 'government_policy', 'specific_minister', 'specific_mp', 'opposition_general', 'none'
  target_entity text,
  review_status text NOT NULL DEFAULT 'auto_published', -- 'auto_published', 'pending_review', 'approved', 'rejected', 'edited'
  review_flag_reason text,
  reviewed_at timestamp,
  reviewed_by varchar(36),
  created_at timestamp DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_hansard_tags_speech_id ON hansard_tags(speech_id);
CREATE INDEX idx_hansard_tags_tag_type ON hansard_tags(tag_type);
CREATE INDEX idx_hansard_tags_review_status ON hansard_tags(review_status);
CREATE INDEX idx_hansard_tags_confidence ON hansard_tags(confidence);
CREATE INDEX idx_hansard_tags_created_at ON hansard_tags(created_at);

-- Extracted entities from speeches
CREATE TABLE IF NOT EXISTS hansard_entities (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  speech_id varchar(36) NOT NULL REFERENCES hansard_speeches(id) ON DELETE CASCADE,
  entity_name text NOT NULL,
  entity_type text NOT NULL, -- 'organization', 'policy_or_bill', 'place', 'statistic_cited'
  created_at timestamp DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_hansard_entities_speech_id ON hansard_entities(speech_id);
CREATE INDEX idx_hansard_entities_entity_type ON hansard_entities(entity_type);

-- Seed controlled vocabulary with Malaysian parliamentary topics
INSERT INTO hansard_topic_vocabulary (tag_slug, display_label, status) VALUES
  ('epf', 'EPF / Retirement Savings', 'active'),
  ('healthcare', 'Healthcare & Public Health', 'active'),
  ('education', 'Education & Schools', 'active'),
  ('b40_welfare', 'B40 Welfare & Subsidy', 'active'),
  ('infrastructure', 'Infrastructure Development', 'active'),
  ('energy_policy', 'Energy & Utilities', 'active'),
  ('anti_corruption', 'Anti-Corruption', 'active'),
  ('cdp', 'Constituency Development Projects', 'active'),
  ('local_government', 'Local Government & Councils', 'active'),
  ('environment', 'Environment & Conservation', 'active'),
  ('housing', 'Housing & Property', 'active'),
  ('labor_employment', 'Labor & Employment', 'active'),
  ('tax_revenue', 'Taxation & Revenue', 'active'),
  ('budget_finance', 'Budget & Fiscal Policy', 'active'),
  ('judiciary', 'Judiciary & Legal System', 'active'),
  ('policing', 'Police & Internal Security', 'active'),
  ('agriculture', 'Agriculture & Rural Development', 'active'),
  ('tourism', 'Tourism & Hospitality', 'active'),
  ('business_commerce', 'Business & Commerce', 'active'),
  ('women_rights', 'Women Rights & Gender Equality', 'active'),
  ('indigenous_affairs', 'Indigenous Affairs & Orang Asli', 'active'),
  ('defense', 'Defense & Military', 'active'),
  ('immigration', 'Immigration & Citizenship', 'active'),
  ('royal_protocol', 'Royal Protocol & Monarchy', 'active'),
  ('constitution', 'Constitutional Matters', 'active')
ON CONFLICT (tag_slug) DO NOTHING;
