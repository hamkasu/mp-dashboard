-- Migration: 0029_subscription_system
-- Adds public user accounts, subscription plans, subscriptions, and payment audit trail.

-- Public user accounts (separate from admin_users)
CREATE TABLE IF NOT EXISTS users (
  id                        VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email                     TEXT NOT NULL UNIQUE,
  name                      TEXT NOT NULL,
  password_hash             TEXT,
  is_admin                  BOOLEAN NOT NULL DEFAULT false,
  email_verified            BOOLEAN NOT NULL DEFAULT false,
  email_verification_token  TEXT,
  password_reset_token      TEXT,
  password_reset_expires_at TIMESTAMP,
  created_at                TIMESTAMP NOT NULL DEFAULT now(),
  updated_at                TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);
CREATE INDEX IF NOT EXISTS users_email_verification_token_idx ON users (email_verification_token)
  WHERE email_verification_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_password_reset_token_idx ON users (password_reset_token)
  WHERE password_reset_token IS NOT NULL;

-- Subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id         VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT NOT NULL UNIQUE,   -- 'monthly' | 'yearly'
  name       TEXT NOT NULL,
  price_myr  INTEGER NOT NULL,       -- in sen (e.g. 1500 = RM 15.00)
  interval   TEXT NOT NULL,          -- 'month' | 'year'
  features   JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Seed default plans
INSERT INTO subscription_plans (slug, name, price_myr, interval, features)
VALUES
  (
    'monthly',
    'Premium Monthly',
    1500,
    'month',
    '["Full Constituency Reports","Hansard AI Analysis","Detailed Report Cards","MP Performance Comparisons","Data Export (CSV)"]'::jsonb
  ),
  (
    'yearly',
    'Premium Yearly',
    12000,
    'year',
    '["Full Constituency Reports","Hansard AI Analysis","Detailed Report Cards","MP Performance Comparisons","Data Export (CSV)","2 Months Free"]'::jsonb
  )
ON CONFLICT (slug) DO NOTHING;

-- User subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id                   VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id              VARCHAR NOT NULL REFERENCES subscription_plans(id),
  status               TEXT NOT NULL,            -- 'active' | 'cancelled' | 'expired' | 'trial'
  is_trial             BOOLEAN NOT NULL DEFAULT false,
  current_period_start TIMESTAMP NOT NULL,
  current_period_end   TIMESTAMP NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  billing_provider     TEXT NOT NULL DEFAULT 'manual',  -- 'billplz' | 'stripe' | 'manual'
  billing_provider_id  TEXT,
  created_at           TIMESTAMP NOT NULL DEFAULT now(),
  updated_at           TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions (status);
CREATE INDEX IF NOT EXISTS subscriptions_current_period_end_idx ON subscriptions (current_period_end);

-- Payment audit trail
CREATE TABLE IF NOT EXISTS payment_transactions (
  id               VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          VARCHAR NOT NULL REFERENCES users(id),
  subscription_id  VARCHAR REFERENCES subscriptions(id),
  amount_myr       INTEGER NOT NULL,   -- in sen
  status           TEXT NOT NULL,      -- 'pending' | 'paid' | 'failed' | 'refunded'
  billing_provider TEXT NOT NULL,
  provider_bill_id TEXT,
  provider_payload JSONB,
  created_at       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_transactions_user_id_idx ON payment_transactions (user_id);
CREATE INDEX IF NOT EXISTS payment_transactions_provider_bill_id_idx ON payment_transactions (provider_bill_id)
  WHERE provider_bill_id IS NOT NULL;
