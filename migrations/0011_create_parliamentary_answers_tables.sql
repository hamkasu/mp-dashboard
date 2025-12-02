-- Create parliamentary_oral_answers table for storing scraped oral answers from Parliament website
CREATE TABLE IF NOT EXISTS "parliamentary_oral_answers" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "question_number" text,
  "title" text NOT NULL,
  "questioner_name" text,
  "questioner_mp_id" varchar REFERENCES "mps"("id"),
  "answerer_name" text,
  "answerer_ministry" text,
  "date_asked" text,
  "status" text DEFAULT 'Unknown' NOT NULL,
  "answer_text" text,
  "question_text" text,
  "full_text_url" text,
  "source_url" text,
  "scraped_at" timestamp DEFAULT NOW() NOT NULL,
  "created_at" timestamp DEFAULT NOW() NOT NULL,
  "updated_at" timestamp DEFAULT NOW() NOT NULL
);

-- Create parliamentary_answer_pdf_files table for storing PDF files of answers
CREATE TABLE IF NOT EXISTS "parliamentary_answer_pdf_files" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "answer_id" varchar NOT NULL REFERENCES "parliamentary_oral_answers"("id") ON DELETE CASCADE,
  "original_filename" text NOT NULL,
  "file_size_bytes" integer NOT NULL,
  "content_type" text DEFAULT 'application/pdf' NOT NULL,
  "pdf_data" bytea NOT NULL,
  "md5_hash" text,
  "uploaded_at" timestamp DEFAULT NOW() NOT NULL,
  "uploaded_by" varchar,
  "downloaded_from_url" text
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "parliamentary_oral_answers_question_number_idx" ON "parliamentary_oral_answers" ("question_number");
CREATE INDEX IF NOT EXISTS "parliamentary_oral_answers_questioner_mp_id_idx" ON "parliamentary_oral_answers" ("questioner_mp_id");
CREATE INDEX IF NOT EXISTS "parliamentary_oral_answers_date_asked_idx" ON "parliamentary_oral_answers" ("date_asked" DESC);
CREATE INDEX IF NOT EXISTS "parliamentary_oral_answers_scraped_at_idx" ON "parliamentary_oral_answers" ("scraped_at" DESC);
CREATE INDEX IF NOT EXISTS "parliamentary_answer_pdf_files_answer_id_idx" ON "parliamentary_answer_pdf_files" ("answer_id");
