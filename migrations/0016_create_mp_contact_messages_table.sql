-- Create MP contact messages table
CREATE TABLE IF NOT EXISTS "mp_contact_messages" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "mp_id" VARCHAR NOT NULL REFERENCES "mps"("id") ON DELETE CASCADE,

  -- Sender information
  "sender_name" TEXT NOT NULL,
  "sender_email" TEXT NOT NULL,
  "sender_phone" TEXT,

  -- Message content
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,

  -- Categorization for anonymized summaries
  "category" TEXT NOT NULL DEFAULT 'general',

  -- Status tracking
  "status" TEXT NOT NULL DEFAULT 'pending',

  -- Privacy and moderation
  "is_public" BOOLEAN NOT NULL DEFAULT false,
  "is_spam" BOOLEAN NOT NULL DEFAULT false,

  -- Response tracking
  "replied_at" TIMESTAMP,
  "replied_by" VARCHAR,
  "reply_message" TEXT,

  -- Metadata
  "ip_address" TEXT,
  "user_agent" TEXT,
  "email_sent" BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "read_at" TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS "idx_mp_contact_messages_mp_id" ON "mp_contact_messages"("mp_id");
CREATE INDEX IF NOT EXISTS "idx_mp_contact_messages_status" ON "mp_contact_messages"("status");
CREATE INDEX IF NOT EXISTS "idx_mp_contact_messages_category" ON "mp_contact_messages"("category");
CREATE INDEX IF NOT EXISTS "idx_mp_contact_messages_created_at" ON "mp_contact_messages"("created_at");
CREATE INDEX IF NOT EXISTS "idx_mp_contact_messages_is_public" ON "mp_contact_messages"("is_public");

-- Add constraint for valid categories
ALTER TABLE "mp_contact_messages"
  ADD CONSTRAINT "valid_category"
  CHECK ("category" IN (
    'general',
    'flooding_drainage',
    'education',
    'healthcare',
    'infrastructure',
    'housing',
    'employment',
    'safety_crime',
    'environment',
    'transportation',
    'corruption',
    'youth_sports',
    'poverty_welfare',
    'other'
  ));

-- Add constraint for valid status
ALTER TABLE "mp_contact_messages"
  ADD CONSTRAINT "valid_status"
  CHECK ("status" IN ('pending', 'read', 'replied', 'resolved', 'spam'));

-- Comment on table
COMMENT ON TABLE "mp_contact_messages" IS 'Stores constituent messages sent to MPs via the contact form';
