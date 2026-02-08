-- Create hansard Q&A analysis cache table for persistent storage of parliamentary questions analysis
CREATE TABLE IF NOT EXISTS "hansard_qa_analysis_cache" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "hansard_record_id" varchar NOT NULL REFERENCES "hansard_records"("id") ON DELETE CASCADE,
  "section_type" varchar NOT NULL DEFAULT 'menteri',
  "session_info" text NOT NULL,
  "questions" jsonb NOT NULL DEFAULT '[]',
  "total_questions" integer NOT NULL DEFAULT 0,
  "analyzed_at" timestamp NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by hansard record and section type
CREATE INDEX IF NOT EXISTS "idx_qa_analysis_hansard_record_id" ON "hansard_qa_analysis_cache" ("hansard_record_id", "section_type");
