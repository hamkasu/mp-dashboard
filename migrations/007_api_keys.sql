-- Migration: 007_api_keys
-- Creates the api_keys table for external API authentication and rate limiting.
-- Keys are stored as SHA-256 hashes; the raw key is printed once at generation
-- and never persisted.

CREATE TABLE IF NOT EXISTS api_keys (
    id              SERIAL PRIMARY KEY,
    key_hash        VARCHAR(64) UNIQUE NOT NULL,
    key_prefix      VARCHAR(12) NOT NULL,
    client_name     VARCHAR(100) NOT NULL,
    client_email    VARCHAR(200) NOT NULL,
    tier            VARCHAR(20) NOT NULL DEFAULT 'free',
    daily_limit     INTEGER NOT NULL DEFAULT 1000,
    calls_today     INTEGER NOT NULL DEFAULT 0,
    calls_total     BIGINT NOT NULL DEFAULT 0,
    last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
    webhook_url     VARCHAR(500),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMP,
    notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash   ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
