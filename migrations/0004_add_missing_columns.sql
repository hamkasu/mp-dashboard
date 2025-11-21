-- Migration to add missing columns to existing tables
-- This ensures all tables have the columns expected by the application code

-- Add co_sponsors column to legislative_proposals if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'legislative_proposals' AND column_name = 'co_sponsors'
  ) THEN
    ALTER TABLE "legislative_proposals" ADD COLUMN "co_sponsors" jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add bill_number column to legislative_proposals if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'legislative_proposals' AND column_name = 'bill_number'
  ) THEN
    ALTER TABLE "legislative_proposals" ADD COLUMN "bill_number" text;
  END IF;
END $$;

-- Add hansard_record_id column to legislative_proposals if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'legislative_proposals' AND column_name = 'hansard_record_id'
  ) THEN
    ALTER TABLE "legislative_proposals" ADD COLUMN "hansard_record_id" varchar;
  END IF;
END $$;

-- Add created_at column to legislative_proposals if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'legislative_proposals' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "legislative_proposals" ADD COLUMN "created_at" timestamp DEFAULT NOW() NOT NULL;
  END IF;
END $$;

-- Add question_type column to parliamentary_questions if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parliamentary_questions' AND column_name = 'question_type'
  ) THEN
    ALTER TABLE "parliamentary_questions" ADD COLUMN "question_type" text;
  END IF;
END $$;

-- Add question_number column to parliamentary_questions if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parliamentary_questions' AND column_name = 'question_number'
  ) THEN
    ALTER TABLE "parliamentary_questions" ADD COLUMN "question_number" text;
  END IF;
END $$;

-- Add hansard_record_id column to parliamentary_questions if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parliamentary_questions' AND column_name = 'hansard_record_id'
  ) THEN
    ALTER TABLE "parliamentary_questions" ADD COLUMN "hansard_record_id" varchar;
  END IF;
END $$;

-- Add created_at column to parliamentary_questions if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parliamentary_questions' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "parliamentary_questions" ADD COLUMN "created_at" timestamp DEFAULT NOW() NOT NULL;
  END IF;
END $$;

-- Add total_speech_instances column to mps if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mps' AND column_name = 'total_speech_instances'
  ) THEN
    ALTER TABLE "mps" ADD COLUMN "total_speech_instances" integer DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Add term_end_date column to mps if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mps' AND column_name = 'term_end_date'
  ) THEN
    ALTER TABLE "mps" ADD COLUMN "term_end_date" timestamp;
  END IF;
END $$;

-- Add contact_address and other contact fields to mps if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mps' AND column_name = 'contact_address'
  ) THEN
    ALTER TABLE "mps" ADD COLUMN "contact_address" text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mps' AND column_name = 'email'
  ) THEN
    ALTER TABLE "mps" ADD COLUMN "email" text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mps' AND column_name = 'telephone'
  ) THEN
    ALTER TABLE "mps" ADD COLUMN "telephone" text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mps' AND column_name = 'fax'
  ) THEN
    ALTER TABLE "mps" ADD COLUMN "fax" text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mps' AND column_name = 'mobile_number'
  ) THEN
    ALTER TABLE "mps" ADD COLUMN "mobile_number" text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mps' AND column_name = 'social_media'
  ) THEN
    ALTER TABLE "mps" ADD COLUMN "social_media" text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mps' AND column_name = 'service_address'
  ) THEN
    ALTER TABLE "mps" ADD COLUMN "service_address" text;
  END IF;
END $$;

-- Add speaker_stats and session_speaker_stats to hansard_records if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hansard_records' AND column_name = 'speaker_stats'
  ) THEN
    ALTER TABLE "hansard_records" ADD COLUMN "speaker_stats" jsonb DEFAULT '[]'::jsonb NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hansard_records' AND column_name = 'session_speaker_stats'
  ) THEN
    ALTER TABLE "hansard_records" ADD COLUMN "session_speaker_stats" jsonb;
  END IF;
END $$;
