-- Reset Railway Admin User
-- Run this SQL in your Railway database dashboard to clear existing users

-- Delete all existing users (including the old admin)
DELETE FROM users;

-- This will allow the application to create a fresh admin user
-- on the next deployment using your ADMIN_USERNAME and ADMIN_PASSWORD environment variables
