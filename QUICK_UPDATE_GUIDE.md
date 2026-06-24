# Quick Update Guide - 3 Simple Steps

## 🚀 Fast Track: Update Attendance Data NOW

### Step 1: Check Current State (30 seconds)
```sql
-- See last Hansard record
SELECT session_date, session_number, created_at
FROM hansard_records
ORDER BY session_date DESC
LIMIT 1;

-- See sample MP attendance
SELECT name, days_attended, total_parliament_days
FROM mps
WHERE days_attended > 0
ORDER BY days_attended DESC
LIMIT 5;
```

### Step 2: Run the Update (1 minute)
```sql
-- ⚡ MAIN UPDATE QUERY - Run this to fix everything
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
)
UPDATE mps
SET
  days_attended = COALESCE(attendance_counts.days_attended, 0),
  total_parliament_days = COALESCE(attendance_counts.total_parliament_days, 0)
FROM attendance_counts
WHERE mps.id = attendance_counts.mp_id;
```

### Step 3: Verify It Worked (10 seconds)
```sql
-- Check updated numbers
SELECT
  name,
  days_attended,
  total_parliament_days,
  days_attended * 400 as parliament_allowance_total
FROM mps
WHERE days_attended > 0
ORDER BY days_attended DESC
LIMIT 10;
```

---

## 🎯 Alternative: Use API Instead

If you have admin access to the running server:

```bash
# Option 1: Trigger full sync (downloads new Hansard + updates MPs)
curl -X POST http://localhost:5000/api/admin/trigger-hansard-check

# Option 2: Just refresh MP aggregations (faster, uses existing data)
curl -X POST http://localhost:5000/api/admin/refresh-mp-data
```

---

## ⚠️ Troubleshooting

### "No rows updated"
- Check if `hansard_records` table has data:
  ```sql
  SELECT COUNT(*) FROM hansard_records;
  ```
- If empty, you need to run the Hansard sync first

### "Query runs forever"
- Add a limit for testing:
  ```sql
  -- Test on just 5 MPs first
  UPDATE mps
  SET days_attended = 0
  WHERE id IN (SELECT id FROM mps LIMIT 5);
  ```

### "Numbers still look wrong"
- Check if `attended_mp_ids` column is populated:
  ```sql
  SELECT
    session_number,
    array_length(attended_mp_ids, 1) as attended_count
  FROM hansard_records
  ORDER BY session_date DESC
  LIMIT 10;
  ```
- If all show NULL or 0, the Hansard records don't have attendance data

---

## 📊 Expected Results

After running the update:
- **~220 MPs** should have updated attendance
- **Top MPs** typically have 40-80 days attended
- **Parliament allowance** = days_attended × RM 400
- **Total varies** by sworn-in date (longer tenure = more allowance)

---

## 🔗 Full Documentation

See `SQL_MANUAL_UPDATE_QUERIES.md` for:
- Detailed explanations of each query
- Speech statistics updates
- Advanced filtering options
- Backup/restore procedures
- Data quality checks
