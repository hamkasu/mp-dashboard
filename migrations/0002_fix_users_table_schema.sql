-- Migration to fix users table schema to match application code
-- This migration aligns the database schema with shared/schema.ts

-- Drop the existing users table if it exists (with old schema)
DROP TABLE IF EXISTS "users" CASCADE;

-- Recreate users table with correct schema
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT NOW() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);

-- Update user_activity_log to reference integer user_id (if table exists)
-- The foreign key should already be correct since it references users.id
