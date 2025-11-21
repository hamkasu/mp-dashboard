-- Migration to create admin_users table
-- This migration creates the admin_users table with proper authentication fields

-- Step 1: Create admin_users table with the correct schema
CREATE TABLE IF NOT EXISTS "admin_users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text NOT NULL,
	"email" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT NOW() NOT NULL,
	"updated_at" timestamp DEFAULT NOW() NOT NULL,
	CONSTRAINT "admin_users_username_unique" UNIQUE("username")
);

-- Step 2: Migrate existing users from users table if it exists
-- This will convert any existing users to admin_users
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    INSERT INTO admin_users (username, password_hash, display_name, email, is_active, created_at, updated_at)
    SELECT
      username,
      password as password_hash,
      username as display_name,
      NULL as email,
      true as is_active,
      COALESCE(created_at, NOW()) as created_at,
      NOW() as updated_at
    FROM users
    WHERE NOT EXISTS (
      SELECT 1 FROM admin_users WHERE admin_users.username = users.username
    );
  END IF;
END $$;

-- Step 3: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "admin_users_username_idx" ON "admin_users" ("username");
CREATE INDEX IF NOT EXISTS "admin_users_is_active_idx" ON "admin_users" ("is_active");
