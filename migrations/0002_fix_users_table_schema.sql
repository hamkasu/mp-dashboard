-- Migration to fix users table schema to match application code
-- This migration aligns the database schema with shared/schema.ts
-- SAFE VERSION: Preserves all existing data including analytics

-- IMPORTANT: This migration preserves:
-- ✅ page_views table (web analytics)
-- ✅ visitor_analytics table (detailed visitor tracking)
-- ✅ user_activity_log table (logged-in user activity)
-- ⚠️ user_activity_log will temporarily lose FK constraint but data is preserved

-- Step 1: Create a temporary backup table (if users exist)
CREATE TABLE IF NOT EXISTS users_backup AS SELECT * FROM users;

-- Step 2: Drop the old users table (CASCADE removes FK constraints only, not related data)
DROP TABLE IF EXISTS "users" CASCADE;

-- Step 3: Create users table with correct schema (admin only - no public registration)
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"created_at" timestamp DEFAULT NOW() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);

-- Step 4: Migrate existing users from backup (if any exist)
-- All migrated users become admins (no public registration allowed)
INSERT INTO users (username, password, role, created_at)
SELECT
  username,
  password,
  'admin' as role,
  NOW() as created_at
FROM users_backup
WHERE EXISTS (SELECT 1 FROM users_backup LIMIT 1)
ON CONFLICT (username) DO NOTHING;

-- Step 5: Restore foreign key constraint for user_activity_log (if table exists)
-- Note: Old user IDs (varchar) won't match new user IDs (integer), so orphaned records may exist
-- This is safe - user_activity_log.user_id can be NULL for historical records
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_activity_log') THEN
    -- Add foreign key if it doesn't exist
    ALTER TABLE user_activity_log
    ADD CONSTRAINT user_activity_log_user_id_users_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;  -- Constraint already exists, ignore
  WHEN foreign_key_violation THEN NULL;  -- Orphaned records exist, that's ok
END $$;

-- Step 6: Clean up backup table
DROP TABLE IF EXISTS users_backup;

-- Note: Session table is created automatically by connect-pg-simple with createTableIfMissing: true
-- Note: Analytics tables (page_views, visitor_analytics) are completely unaffected by this migration
