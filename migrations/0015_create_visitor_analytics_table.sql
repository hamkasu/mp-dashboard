-- Create visitor analytics table
CREATE TABLE IF NOT EXISTS "visitorAnalytics" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "path" TEXT NOT NULL,
  "ip" TEXT,
  "country" TEXT,
  "city" TEXT,
  "region" TEXT,
  "timezone" TEXT,
  "userAgent" TEXT,
  "referrer" TEXT,
  "timestamp" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create index on path for quick lookups
CREATE INDEX IF NOT EXISTS "idx_visitor_analytics_path" ON "visitorAnalytics"("path");

-- Create index on timestamp for time-based queries
CREATE INDEX IF NOT EXISTS "idx_visitor_analytics_timestamp" ON "visitorAnalytics"("timestamp");

-- Create index on country for geographic analytics
CREATE INDEX IF NOT EXISTS "idx_visitor_analytics_country" ON "visitorAnalytics"("country");
