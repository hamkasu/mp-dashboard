-- Migration: 0030_billing_events
-- Adds billing_events table for durable event log.
-- Every lifecycle event emitted by the billing service is recorded here:
--   subscription_created, payment_success, payment_failed, cancelled, renewed, refunded

CREATE TABLE IF NOT EXISTS billing_events (
  id                VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           VARCHAR NOT NULL REFERENCES users(id),
  subscription_id   VARCHAR REFERENCES subscriptions(id),
  transaction_id    VARCHAR REFERENCES payment_transactions(id),
  event_type        TEXT NOT NULL,        -- 'subscription_created' | 'payment_success' | ...
  billing_provider  TEXT NOT NULL,
  provider_event_id TEXT,                -- idempotency key (Billplz bill id, Stripe event id)
  payload           JSONB,               -- full raw event for audit / replay
  processed_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS billing_events_user_id_idx
  ON billing_events (user_id);

CREATE INDEX IF NOT EXISTS billing_events_event_type_idx
  ON billing_events (event_type);

CREATE INDEX IF NOT EXISTS billing_events_provider_event_id_idx
  ON billing_events (provider_event_id)
  WHERE provider_event_id IS NOT NULL;

-- Unique constraint so we never process the same provider event twice
CREATE UNIQUE INDEX IF NOT EXISTS billing_events_idempotency_idx
  ON billing_events (billing_provider, provider_event_id)
  WHERE provider_event_id IS NOT NULL;
