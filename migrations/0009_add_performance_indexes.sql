-- Add indexes for cost optimization and performance
-- Railway cost reduction: Reduce query time and CPU usage

-- Visitor Analytics indexes (high-traffic table)
CREATE INDEX IF NOT EXISTS "visitor_analytics_timestamp_idx"
ON "visitor_analytics" ("timestamp" DESC);

CREATE INDEX IF NOT EXISTS "visitor_analytics_path_idx"
ON "visitor_analytics" ("path");

CREATE INDEX IF NOT EXISTS "visitor_analytics_country_idx"
ON "visitor_analytics" ("country");

-- Composite index for common analytics queries (path + timestamp)
CREATE INDEX IF NOT EXISTS "visitor_analytics_path_timestamp_idx"
ON "visitor_analytics" ("path", "timestamp" DESC);

-- MPs table indexes for common lookups
CREATE INDEX IF NOT EXISTS "mps_parliament_code_idx"
ON "mps" ("parliament_code");

CREATE INDEX IF NOT EXISTS "mps_party_idx"
ON "mps" ("party");

CREATE INDEX IF NOT EXISTS "mps_state_idx"
ON "mps" ("state");

-- Blog posts indexes for filtering and sorting
CREATE INDEX IF NOT EXISTS "blog_posts_is_published_idx"
ON "blog_posts" ("is_published");

CREATE INDEX IF NOT EXISTS "blog_posts_published_at_idx"
ON "blog_posts" ("published_at" DESC);

CREATE INDEX IF NOT EXISTS "blog_posts_category_idx"
ON "blog_posts" ("category");

-- Composite index for published blog queries
CREATE INDEX IF NOT EXISTS "blog_posts_published_date_idx"
ON "blog_posts" ("is_published", "published_at" DESC);

-- Hansard QA cache for faster lookups
CREATE INDEX IF NOT EXISTS "hansard_qa_cache_hansard_record_id_idx"
ON "hansard_qa_cache" ("hansard_record_id");

CREATE INDEX IF NOT EXISTS "hansard_qa_cache_created_at_idx"
ON "hansard_qa_cache" ("created_at" DESC);

-- User activity log for analytics
CREATE INDEX IF NOT EXISTS "user_activity_log_timestamp_idx"
ON "user_activity_log" ("timestamp" DESC);

CREATE INDEX IF NOT EXISTS "user_activity_log_page_url_idx"
ON "user_activity_log" ("page_url");

-- AI Analysis tables indexes
CREATE INDEX IF NOT EXISTS "hansard_topic_analysis_hansard_record_id_idx"
ON "hansard_topic_analysis" ("hansard_record_id");

CREATE INDEX IF NOT EXISTS "hansard_sentiment_analysis_hansard_record_id_idx"
ON "hansard_sentiment_analysis" ("hansard_record_id");

CREATE INDEX IF NOT EXISTS "hansard_speaker_analysis_hansard_record_id_idx"
ON "hansard_speaker_analysis" ("hansard_record_id");

CREATE INDEX IF NOT EXISTS "hansard_detailed_summary_hansard_record_id_idx"
ON "hansard_detailed_summary" ("hansard_record_id");

CREATE INDEX IF NOT EXISTS "hansard_detailed_summary_language_idx"
ON "hansard_detailed_summary" ("language");
