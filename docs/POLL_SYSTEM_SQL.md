# Weekly Polling System - SQL Queries for Manual Database Management

This document contains SQL queries for manually managing the weekly polling system in the database.

## Table Structure

The polling system uses three tables:
- `polls` - The poll questions and metadata
- `poll_options` - Answer choices for each poll
- `poll_votes` - Individual votes (with fingerprint-based deduplication)

---

## Creating a Poll Manually

### Create a new poll

```sql
-- Create a new poll for week 5 of 2026
INSERT INTO polls (
  question,
  question_ms,
  description,
  category,
  week_number,
  year,
  status,
  generated_by,
  starts_at,
  ends_at
) VALUES (
  'How would you rate the government''s performance this year?',
  'Bagaimana anda menilai prestasi kerajaan tahun ini?',
  'Share your opinion on the government''s overall performance.',
  'governance',
  5,
  2026,
  'active',  -- Can be: draft, active, closed, archived
  'manual',
  NOW(),
  NOW() + INTERVAL '7 days'
) RETURNING id;
```

### Add options to a poll

```sql
-- Add options to a poll (replace 'POLL_ID_HERE' with actual poll ID)
INSERT INTO poll_options (poll_id, option_text, option_text_ms, display_order)
VALUES
  ('POLL_ID_HERE', 'Excellent', 'Cemerlang', 0),
  ('POLL_ID_HERE', 'Good', 'Baik', 1),
  ('POLL_ID_HERE', 'Average', 'Sederhana', 2),
  ('POLL_ID_HERE', 'Poor', 'Lemah', 3),
  ('POLL_ID_HERE', 'Very Poor', 'Sangat Lemah', 4);
```

---

## Viewing Polls and Results

### View all active polls

```sql
SELECT
  p.id,
  p.question,
  p.category,
  p.week_number,
  p.year,
  p.total_votes,
  p.status,
  p.created_at
FROM polls p
WHERE p.status = 'active'
ORDER BY p.created_at DESC;
```

### View poll with options and vote counts

```sql
SELECT
  p.id AS poll_id,
  p.question,
  p.total_votes,
  po.id AS option_id,
  po.option_text,
  po.vote_count,
  po.vote_percentage / 100.0 AS percentage
FROM polls p
JOIN poll_options po ON po.poll_id = p.id
WHERE p.id = 'POLL_ID_HERE'
ORDER BY po.display_order;
```

### View all polls for a specific week

```sql
SELECT
  p.*,
  COUNT(po.id) AS option_count
FROM polls p
LEFT JOIN poll_options po ON po.poll_id = p.id
WHERE p.year = 2026 AND p.week_number = 5
GROUP BY p.id
ORDER BY p.created_at DESC;
```

### View top voted polls

```sql
SELECT
  p.id,
  p.question,
  p.category,
  p.total_votes,
  p.week_number,
  p.year
FROM polls p
WHERE p.status IN ('active', 'closed')
ORDER BY p.total_votes DESC
LIMIT 10;
```

---

## Updating Polls

### Change poll status

```sql
-- Activate a draft poll
UPDATE polls
SET status = 'active', updated_at = NOW()
WHERE id = 'POLL_ID_HERE';

-- Close an active poll
UPDATE polls
SET status = 'closed', updated_at = NOW()
WHERE id = 'POLL_ID_HERE';

-- Archive an old poll
UPDATE polls
SET status = 'archived', updated_at = NOW()
WHERE id = 'POLL_ID_HERE';
```

### Update poll question

```sql
UPDATE polls
SET
  question = 'New question text?',
  question_ms = 'Teks soalan baharu?',
  updated_at = NOW()
WHERE id = 'POLL_ID_HERE';
```

### Extend poll end date

```sql
UPDATE polls
SET
  ends_at = ends_at + INTERVAL '7 days',
  updated_at = NOW()
WHERE id = 'POLL_ID_HERE';
```

### Close all expired polls (run periodically)

```sql
UPDATE polls
SET status = 'closed', updated_at = NOW()
WHERE status = 'active' AND ends_at < NOW();
```

---

## Managing Options

### Add a new option to an existing poll

```sql
INSERT INTO poll_options (poll_id, option_text, option_text_ms, display_order)
VALUES ('POLL_ID_HERE', 'New Option', 'Pilihan Baharu',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM poll_options WHERE poll_id = 'POLL_ID_HERE')
);
```

### Update option text

```sql
UPDATE poll_options
SET
  option_text = 'Updated text',
  option_text_ms = 'Teks dikemaskini'
WHERE id = 'OPTION_ID_HERE';
```

### Reorder options

```sql
-- Update display_order for each option
UPDATE poll_options SET display_order = 0 WHERE id = 'OPTION_1_ID';
UPDATE poll_options SET display_order = 1 WHERE id = 'OPTION_2_ID';
UPDATE poll_options SET display_order = 2 WHERE id = 'OPTION_3_ID';
```

---

## Vote Analytics

### Count votes per day for a poll

```sql
SELECT
  DATE(created_at) AS vote_date,
  COUNT(*) AS votes
FROM poll_votes
WHERE poll_id = 'POLL_ID_HERE'
GROUP BY DATE(created_at)
ORDER BY vote_date;
```

### View recent votes

```sql
SELECT
  pv.id,
  po.option_text,
  pv.created_at,
  LEFT(pv.voter_fingerprint, 8) || '...' AS fingerprint_preview
FROM poll_votes pv
JOIN poll_options po ON po.id = pv.option_id
WHERE pv.poll_id = 'POLL_ID_HERE'
ORDER BY pv.created_at DESC
LIMIT 20;
```

### Check for duplicate votes (should be none due to unique constraint)

```sql
SELECT
  voter_fingerprint,
  COUNT(*) AS vote_count
FROM poll_votes
WHERE poll_id = 'POLL_ID_HERE'
GROUP BY voter_fingerprint
HAVING COUNT(*) > 1;
```

---

## Recalculating Statistics

### Recalculate vote counts for a poll

```sql
-- Update option vote counts
UPDATE poll_options po
SET vote_count = (
  SELECT COUNT(*) FROM poll_votes pv WHERE pv.option_id = po.id
)
WHERE po.poll_id = 'POLL_ID_HERE';

-- Update poll total votes
UPDATE polls
SET total_votes = (
  SELECT COUNT(*) FROM poll_votes pv WHERE pv.poll_id = polls.id
)
WHERE id = 'POLL_ID_HERE';
```

### Recalculate percentages

```sql
-- Update vote percentages for all options in a poll
WITH poll_totals AS (
  SELECT poll_id, total_votes FROM polls WHERE id = 'POLL_ID_HERE'
)
UPDATE poll_options po
SET vote_percentage = CASE
  WHEN (SELECT total_votes FROM poll_totals) > 0
  THEN ROUND((po.vote_count::NUMERIC / (SELECT total_votes FROM poll_totals)) * 10000)
  ELSE 0
END
WHERE po.poll_id = 'POLL_ID_HERE';
```

---

## Cleanup and Maintenance

### Delete a poll (cascades to options and votes)

```sql
DELETE FROM polls WHERE id = 'POLL_ID_HERE';
```

### Delete old archived polls (older than 1 year)

```sql
DELETE FROM polls
WHERE status = 'archived'
AND created_at < NOW() - INTERVAL '1 year';
```

### Clear all votes from a poll (reset)

```sql
-- Delete votes
DELETE FROM poll_votes WHERE poll_id = 'POLL_ID_HERE';

-- Reset vote counts
UPDATE poll_options
SET vote_count = 0, vote_percentage = 0
WHERE poll_id = 'POLL_ID_HERE';

-- Reset poll total
UPDATE polls
SET total_votes = 0, updated_at = NOW()
WHERE id = 'POLL_ID_HERE';
```

---

## Useful Queries for Admin Dashboard

### Poll statistics overview

```sql
SELECT
  COUNT(*) AS total_polls,
  SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_polls,
  SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS closed_polls,
  SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft_polls,
  SUM(total_votes) AS total_votes_all_time,
  AVG(total_votes)::INTEGER AS avg_votes_per_poll
FROM polls;
```

### Most popular categories

```sql
SELECT
  category,
  COUNT(*) AS poll_count,
  SUM(total_votes) AS total_votes,
  AVG(total_votes)::INTEGER AS avg_votes
FROM polls
WHERE status IN ('active', 'closed')
GROUP BY category
ORDER BY total_votes DESC;
```

### Weekly poll creation report

```sql
SELECT
  year,
  week_number,
  COUNT(*) AS polls_created,
  SUM(total_votes) AS total_votes
FROM polls
GROUP BY year, week_number
ORDER BY year DESC, week_number DESC
LIMIT 12;
```

---

## AI Agent Integration

### View AI-generated polls

```sql
SELECT
  p.id,
  p.question,
  p.source_context,
  p.ai_prompt_used,
  p.created_at
FROM polls p
WHERE p.generated_by = 'ai'
ORDER BY p.created_at DESC;
```

### Check poll generation agent executions

```sql
SELECT
  id,
  status,
  started_at,
  completed_at,
  duration_ms,
  (result->>'pollsCreated')::INTEGER AS polls_created,
  error_message
FROM ai_agent_executions
WHERE agent_type = 'poll-generator'
ORDER BY started_at DESC
LIMIT 10;
```
