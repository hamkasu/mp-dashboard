-- Create blog posts table for managing blog articles
CREATE TABLE IF NOT EXISTS "blog_posts" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title_en" text NOT NULL,
  "title_ms" text NOT NULL,
  "excerpt_en" text NOT NULL,
  "excerpt_ms" text NOT NULL,
  "content_en" text NOT NULL,
  "content_ms" text NOT NULL,
  "category" text NOT NULL,
  "author" text NOT NULL,
  "read_time" integer NOT NULL,
  "published_at" timestamp NOT NULL,
  "is_published" boolean DEFAULT false NOT NULL,
  "slug" text NOT NULL,
  "image_url" text,
  "created_by" varchar,
  "created_at" timestamp DEFAULT NOW() NOT NULL,
  "updated_at" timestamp DEFAULT NOW() NOT NULL,
  CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "blog_posts_published_at_idx" ON "blog_posts" ("published_at" DESC);
CREATE INDEX IF NOT EXISTS "blog_posts_is_published_idx" ON "blog_posts" ("is_published");
CREATE INDEX IF NOT EXISTS "blog_posts_category_idx" ON "blog_posts" ("category");
CREATE INDEX IF NOT EXISTS "blog_posts_slug_idx" ON "blog_posts" ("slug");
