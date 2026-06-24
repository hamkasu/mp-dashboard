# SQL Queries for Manually Updating Attendance Allowance Data

## ⚠️ WARNING
**Back up your database before running UPDATE queries!**

```sql
-- Create a backup of MPs table (optional but recommended)
CREATE TABLE mps_backup AS SELECT * FROM mps;
```

---

## 1. CHECK CURRENT STATE

### Check Last Hansard Record
```sql
-- See the most recent Hansard records
SELECT
  id,
  session_number,
  session_date,
  parliament_term,
  sitting,
  created_at,
  array_length(attended_mp_ids, 1) as attended_count,
  array_length(absent_mp_ids, 1) as absent_count,
  speaker_stats IS NOT NULL as has_speaker_stats
FROM hansard_records
ORDER BY session_date DESC
LIMIT 10;
```

### Check MP Attendance Stats
```sql
-- See current MP attendance numbers
SELECT
  id,
  name,
  days_attended,
  total_parliament_days,
  hansard_sessions_spoke,
  total_speech_instances,
  sworn_in_date
FROM mps
WHERE days_attended > 0
ORDER BY days_attended DESC
LIMIT 20;
```

### Check Last Sync Log (if table exists)
```sql
-- Check when last sync occurred
SELECT
  triggered_by,
  started_at,
  completed_at,
  duration_ms,
  records_found,
  records_inserted,
  success
FROM hansard_sync_logs
ORDER BY started_at DESC
LIMIT 10;
```

---

## 2. MANUAL UPDATE QUERIES

### Option A: Update ALL MPs' Attendance (Recommended)
This replicates what `aggregateAttendanceForAllMps()` does:

```sql
-- Update days_attended and total_parliament_days for ALL MPs
WITH attendance_counts AS (
  SELECT
    mp.id as mp_id,
    mp.name,
    mp.sworn_in_date,
    -- Count sessions where MP attended (appears in attended_mp_ids array)
    COUNT(DISTINCT hr.id) FILTER (
      WHERE mp.id = ANY(hr.attended_mp_ids)
    ) as days_attended,
    -- Count total parliament sessions since sworn in
    COUNT(DISTINCT hr.id) as total_parliament_days
  FROM mps mp
  CROSS JOIN hansard_records hr
  WHERE hr.session_date >= mp.sworn_in_date
    AND hr.speaker_stats IS NOT NULL  -- Only count records with valid speaker data
  GROUP BY mp.id, mp.name, mp.sworn_in_date
)
UPDATE mps
SET
  days_attended = attendance_counts.days_attended,
  total_parliament_days = attendance_counts.total_parliament_days
FROM attendance_counts
WHERE mps.id = attendance_counts.mp_id;

-- Verify the update
SELECT
  COUNT(*) as total_mps_updated,
  SUM(days_attended) as total_attendance_days,
  AVG(days_attended) as avg_days_attended
FROM mps;
```

### Option B: Update Speech Statistics
This replicates what `aggregateSpeechesForAllMps()` does:

```sql
-- Update hansard_sessions_spoke and total_speech_instances
WITH speech_counts AS (
  SELECT
    mp.id as mp_id,
    -- Count distinct sessions where MP spoke
    COUNT(DISTINCT hr.id) FILTER (
      WHERE (hr.speaker_stats->>mp.name)::int > 0
    ) as sessions_spoke,
    -- Sum total speech instances across all sessions
    COALESCE(
      SUM((hr.speaker_stats->>mp.name)::int),
      0
    ) as total_speeches
  FROM mps mp
  CROSS JOIN hansard_records hr
  WHERE hr.session_date >= mp.sworn_in_date
    AND hr.speaker_stats IS NOT NULL
    AND hr.speaker_stats ? mp.name  -- Check if MP's name exists in speaker_stats
  GROUP BY mp.id
)
UPDATE mps
SET
  hansard_sessions_spoke = speech_counts.sessions_spoke,
  total_speech_instances = speech_counts.total_speeches
FROM speech_counts
WHERE mps.id = speech_counts.mp_id;
```

### Option C: Combined Update (Both Attendance & Speeches)
```sql
-- Update EVERYTHING in one query
WITH attendance_counts AS (
  SELECT
    mp.id as mp_id,
    COUNT(DISTINCT hr.id) FILTER (
      WHERE mp.id = ANY(hr.attended_mp_ids)
    ) as days_attended,
    COUNT(DISTINCT hr.id) as total_parliament_days
  FROM mps mp
  CROSS JOIN hansard_records hr
  WHERE hr.session_date >= mp.sworn_in_date
    AND hr.speaker_stats IS NOT NULL
  GROUP BY mp.id
),
speech_counts AS (
  SELECT
    mp.id as mp_id,
    COUNT(DISTINCT hr.id) FILTER (
      WHERE (hr.speaker_stats->>mp.name)::int > 0
    ) as sessions_spoke,
    COALESCE(
      SUM((hr.speaker_stats->>mp.name)::int),
      0
    ) as total_speeches
  FROM mps mp
  CROSS JOIN hansard_records hr
  WHERE hr.session_date >= mp.sworn_in_date
    AND hr.speaker_stats IS NOT NULL
    AND hr.speaker_stats ? mp.name
  GROUP BY mp.id
)
UPDATE mps
SET
  days_attended = COALESCE(attendance_counts.days_attended, 0),
  total_parliament_days = COALESCE(attendance_counts.total_parliament_days, 0),
  hansard_sessions_spoke = COALESCE(speech_counts.sessions_spoke, 0),
  total_speech_instances = COALESCE(speech_counts.total_speeches, 0)
FROM attendance_counts
FULL OUTER JOIN speech_counts ON attendance_counts.mp_id = speech_counts.mp_id
WHERE mps.id = COALESCE(attendance_counts.mp_id, speech_counts.mp_id);
```

### Option D: Update Specific MP by Name
```sql
-- Update attendance for a single MP
WITH mp_attendance AS (
  SELECT
    COUNT(DISTINCT hr.id) FILTER (
      WHERE mp.id = ANY(hr.attended_mp_ids)
    ) as days_attended,
    COUNT(DISTINCT hr.id) as total_parliament_days
  FROM mps mp
  CROSS JOIN hansard_records hr
  WHERE mp.name = 'Anwar Ibrahim'  -- Change this name
    AND hr.session_date >= mp.sworn_in_date
    AND hr.speaker_stats IS NOT NULL
)
UPDATE mps
SET
  days_attended = mp_attendance.days_attended,
  total_parliament_days = mp_attendance.total_parliament_days
FROM mp_attendance
WHERE name = 'Anwar Ibrahim';  -- Change this name
```

---

## 3. VERIFY THE UPDATES

### Check Total Salary Calculation
```sql
-- This shows the calculated total salary for top MPs
SELECT
  name,
  party,
  constituency,
  sworn_in_date,
  days_attended,
  total_parliament_days,
  -- Calculate base monthly salary (varies by position)
  25700 as base_monthly_salary,
  -- Calculate months since sworn in
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, sworn_in_date)) * 12 +
  EXTRACT(MONTH FROM AGE(CURRENT_DATE, sworn_in_date)) + 1 as months_served,
  -- Calculate parliament sitting allowance
  days_attended * 400 as parliament_allowance,
  -- Calculate approximate total (base salary * months + allowances)
  (25700 * (EXTRACT(YEAR FROM AGE(CURRENT_DATE, sworn_in_date)) * 12 +
            EXTRACT(MONTH FROM AGE(CURRENT_DATE, sworn_in_date)) + 1)) +
  (days_attended * 400) as approximate_total_salary
FROM mps
WHERE days_attended > 0
ORDER BY days_attended DESC
LIMIT 10;
```

### Compare Before and After (if you made backup)
```sql
-- Compare changes if you created backup
SELECT
  m.name,
  m.days_attended as new_days_attended,
  b.days_attended as old_days_attended,
  m.days_attended - b.days_attended as difference,
  m.total_parliament_days as new_total,
  b.total_parliament_days as old_total
FROM mps m
INNER JOIN mps_backup b ON m.id = b.id
WHERE m.days_attended != b.days_attended
   OR m.total_parliament_days != b.total_parliament_days
ORDER BY ABS(m.days_attended - b.days_attended) DESC
LIMIT 50;
```

### Check Data Quality
```sql
-- Identify potential data issues
SELECT
  'MPs with 0 attendance' as issue,
  COUNT(*) as count
FROM mps
WHERE days_attended = 0 AND sworn_in_date < CURRENT_DATE - INTERVAL '30 days'

UNION ALL

SELECT
  'MPs attended more than total sessions' as issue,
  COUNT(*)
FROM mps
WHERE days_attended > total_parliament_days

UNION ALL

SELECT
  'MPs with attendance but 0 speeches' as issue,
  COUNT(*)
FROM mps
WHERE days_attended > 10 AND (hansard_sessions_spoke = 0 OR hansard_sessions_spoke IS NULL)

UNION ALL

SELECT
  'Total Hansard records' as issue,
  COUNT(*)
FROM hansard_records

UNION ALL

SELECT
  'Hansard records with speaker stats' as issue,
  COUNT(*)
FROM hansard_records
WHERE speaker_stats IS NOT NULL;
```

---

## 4. ADVANCED QUERIES

### Recalculate for Specific Date Range
```sql
-- Update attendance only from specific sessions (e.g., last 6 months)
WITH recent_attendance AS (
  SELECT
    mp.id as mp_id,
    COUNT(DISTINCT hr.id) FILTER (
      WHERE mp.id = ANY(hr.attended_mp_ids)
    ) as recent_days_attended,
    COUNT(DISTINCT hr.id) as recent_total_days
  FROM mps mp
  CROSS JOIN hansard_records hr
  WHERE hr.session_date >= CURRENT_DATE - INTERVAL '6 months'
    AND hr.session_date >= mp.sworn_in_date
    AND hr.speaker_stats IS NOT NULL
  GROUP BY mp.id
)
SELECT
  m.name,
  recent_attendance.recent_days_attended,
  recent_attendance.recent_total_days,
  ROUND(
    (recent_attendance.recent_days_attended::numeric /
     NULLIF(recent_attendance.recent_total_days, 0) * 100),
    2
  ) as attendance_percentage
FROM mps m
INNER JOIN recent_attendance ON m.id = recent_attendance.mp_id
ORDER BY attendance_percentage DESC;
```

### Find Missing Hansard Data
```sql
-- Check for gaps in Hansard record dates
SELECT
  session_date,
  LAG(session_date) OVER (ORDER BY session_date) as previous_session_date,
  session_date - LAG(session_date) OVER (ORDER BY session_date) as days_gap,
  session_number
FROM hansard_records
WHERE parliament_term = 15
ORDER BY session_date DESC
LIMIT 50;
```

### MPs with Stale Data (Not Updated Recently)
```sql
-- Find MPs whose attendance seems outdated
WITH latest_session AS (
  SELECT MAX(session_date) as max_date
  FROM hansard_records
)
SELECT
  m.name,
  m.days_attended,
  m.total_parliament_days,
  latest_session.max_date as latest_hansard_date,
  -- Count how many sessions exist after MP's last counted session
  (SELECT COUNT(*)
   FROM hansard_records hr
   WHERE hr.session_date > m.sworn_in_date) as total_sessions_available
FROM mps m, latest_session
WHERE m.days_attended > 0
ORDER BY m.name;
```

---

## 5. ROLLBACK (If Something Goes Wrong)

```sql
-- Restore from backup
UPDATE mps
SET
  days_attended = b.days_attended,
  total_parliament_days = b.total_parliament_days,
  hansard_sessions_spoke = b.hansard_sessions_spoke,
  total_speech_instances = b.total_speech_instances
FROM mps_backup b
WHERE mps.id = b.id;

-- Drop backup table when satisfied
DROP TABLE IF EXISTS mps_backup;
```

---

## 6. QUICK ONE-LINER FOR PRODUCTION

```sql
-- Use this if you just want to update everything NOW
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Update attendance
  WITH attendance_counts AS (
    SELECT
      mp.id as mp_id,
      COUNT(DISTINCT hr.id) FILTER (WHERE mp.id = ANY(hr.attended_mp_ids)) as days_attended,
      COUNT(DISTINCT hr.id) as total_parliament_days
    FROM mps mp
    CROSS JOIN hansard_records hr
    WHERE hr.session_date >= mp.sworn_in_date
      AND hr.speaker_stats IS NOT NULL
    GROUP BY mp.id
  )
  UPDATE mps
  SET
    days_attended = attendance_counts.days_attended,
    total_parliament_days = attendance_counts.total_parliament_days
  FROM attendance_counts
  WHERE mps.id = attendance_counts.mp_id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % MPs', updated_count;
END $$;
```

---

## 📝 NOTES

1. **Run Option C (Combined Update)** for the most complete update
2. **Always check** with SELECT queries before running UPDATE
3. **Backup first** if you're nervous
4. **These queries replicate** what the TypeScript functions do
5. **Performance**: These queries may take 10-30 seconds on large datasets

## 🔗 Related API Endpoints

Instead of SQL, you can also trigger updates via API:

```bash
# Trigger Hansard sync (downloads new records + updates MPs)
curl -X POST https://your-domain.com/api/admin/trigger-hansard-check \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Manually refresh MP data aggregation
curl -X POST https://your-domain.com/api/admin/refresh-mp-data \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```
