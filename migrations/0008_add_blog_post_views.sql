-- Add views column to blog_posts table
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS views INTEGER NOT NULL DEFAULT 0;

-- Create index for better performance on views queries
CREATE INDEX IF NOT EXISTS idx_blog_posts_views ON blog_posts(views DESC);
