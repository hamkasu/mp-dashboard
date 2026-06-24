-- Migration to create initial admin user
-- This adds hamka.sulaiman@gmail.com as an admin user

INSERT INTO admin_users (id, username, password_hash, display_name, email, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'hamka.sulaiman@gmail.com',
  '$2b$10$rki8dzPJbnXJ03bBY3cX7OxDlJbaOBaPGR7konzFrResWP5p1mBNm',
  'Hamka Sulaiman',
  'hamka.sulaiman@gmail.com',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) DO NOTHING;
