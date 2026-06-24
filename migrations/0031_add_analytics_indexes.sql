-- Add indexes to visitor_analytics table for analytics queries
-- Improves performance of /api/analytics/summary and related endpoints

CREATE INDEX IF NOT EXISTS idx_visitor_analytics_ip ON visitor_analytics(ip);
CREATE INDEX IF NOT EXISTS idx_visitor_analytics_path ON visitor_analytics(path);
CREATE INDEX IF NOT EXISTS idx_visitor_analytics_country ON visitor_analytics(country);
CREATE INDEX IF NOT EXISTS idx_visitor_analytics_timestamp ON visitor_analytics(timestamp);
