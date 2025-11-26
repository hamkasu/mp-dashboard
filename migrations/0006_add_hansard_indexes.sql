-- Add indexes to optimize hansard analysis queries
-- This migration adds missing indexes on frequently-queried columns

-- Index for hansard PDF file lookups (fixes N+1 query in /api/hansard-records)
CREATE INDEX IF NOT EXISTS "hansard_pdf_files_hansard_record_id_idx"
ON "hansard_pdf_files" ("hansard_record_id");

-- Index for primary PDF filtering
CREATE INDEX IF NOT EXISTS "hansard_pdf_files_is_primary_idx"
ON "hansard_pdf_files" ("is_primary");

-- Composite index for common query pattern (hansard_record_id + is_primary)
CREATE INDEX IF NOT EXISTS "hansard_pdf_files_record_primary_idx"
ON "hansard_pdf_files" ("hansard_record_id", "is_primary");

-- Index for hansard records sorting by date
CREATE INDEX IF NOT EXISTS "hansard_records_session_date_idx"
ON "hansard_records" ("session_date" DESC);

-- Index for hansard records session number lookups
CREATE INDEX IF NOT EXISTS "hansard_records_session_number_idx"
ON "hansard_records" ("session_number");

-- Indexes for legislative proposals foreign keys
CREATE INDEX IF NOT EXISTS "legislative_proposals_mp_id_idx"
ON "legislative_proposals" ("mp_id");

CREATE INDEX IF NOT EXISTS "legislative_proposals_hansard_record_id_idx"
ON "legislative_proposals" ("hansard_record_id");

-- Indexes for parliamentary questions foreign keys
CREATE INDEX IF NOT EXISTS "parliamentary_questions_mp_id_idx"
ON "parliamentary_questions" ("mp_id");

CREATE INDEX IF NOT EXISTS "parliamentary_questions_hansard_record_id_idx"
ON "parliamentary_questions" ("hansard_record_id");

-- Index for unmatched speakers lookups
CREATE INDEX IF NOT EXISTS "unmatched_speakers_hansard_record_id_idx"
ON "unmatched_speakers" ("hansard_record_id");

CREATE INDEX IF NOT EXISTS "unmatched_speakers_is_mapped_idx"
ON "unmatched_speakers" ("is_mapped");

-- Index for speaker mappings
CREATE INDEX IF NOT EXISTS "speaker_mappings_unmatched_speaker_id_idx"
ON "speaker_mappings" ("unmatched_speaker_id");

CREATE INDEX IF NOT EXISTS "speaker_mappings_mp_id_idx"
ON "speaker_mappings" ("mp_id");

-- Indexes for debate participations
CREATE INDEX IF NOT EXISTS "debate_participations_mp_id_idx"
ON "debate_participations" ("mp_id");

CREATE INDEX IF NOT EXISTS "debate_participations_date_idx"
ON "debate_participations" ("date" DESC);

-- Indexes for court cases and investigations
CREATE INDEX IF NOT EXISTS "court_cases_mp_id_idx"
ON "court_cases" ("mp_id");

CREATE INDEX IF NOT EXISTS "sprm_investigations_mp_id_idx"
ON "sprm_investigations" ("mp_id");

-- Add hansard records created_at index for chronological queries
CREATE INDEX IF NOT EXISTS "hansard_records_created_at_idx"
ON "hansard_records" ("created_at" DESC);
