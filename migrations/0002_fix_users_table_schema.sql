-- Migration to fix users table schema to match application code
-- This migration aligns the database schema with shared/schema.ts
-- SAFE VERSION: Preserves existing user data

-- Step 1: Create a temporary backup table (if users exist)
CREATE TABLE IF NOT EXISTS users_backup AS SELECT * FROM users;

-- Step 2: Drop the old users table
DROP TABLE IF EXISTS "users" CASCADE;

-- Step 3: Create users table with correct schema
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT NOW() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);

-- Step 4: Migrate existing users from backup (if any exist)
-- Convert is_admin boolean to role text, preserve passwords
INSERT INTO users (username, password, role, created_at)
SELECT
  username,
  password,
  CASE WHEN is_admin THEN 'admin' ELSE 'user' END as role,
  NOW() as created_at
FROM users_backup
WHERE EXISTS (SELECT 1 FROM users_backup LIMIT 1)
ON CONFLICT (username) DO NOTHING;

-- Step 5: Clean up backup table
DROP TABLE IF EXISTS users_backup;

-- Note: Session table is created automatically by connect-pg-simple with createTableIfMissing: true
