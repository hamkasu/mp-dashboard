# MP Report Card SQL Queries

## Quick Reference SQL Queries for Database Management

---

## 🔄 Triggering Grade Recalculation

**⚠️ IMPORTANT**: Grades are calculated via the **backend service**, not direct SQL. The percentile-based grading requires comparing all 221 MPs, which is done in the application code.

### Method 1: Via Admin API (Recommended)
```bash
# Login as admin, then:
curl -X POST http://localhost:5000/api/admin/report-cards/update \
  -H "Content-Type: application/json" \
  --cookie "session=YOUR_SESSION_COOKIE"
```

### Method 2: Via Admin Panel UI
1. Navigate to: `http://localhost:5000/report-card-admin`
2. Login as admin
3. Click "Trigger Update Now"

### Method 3: Via Direct Function Call (Development)
```bash
npm run db:migrate  # Ensure tables exist
node -e "
  import('./dist/server/services/report-card-service.js').then(async (module) => {
    const result = await module.updateAllReportCards();
    console.log('Updated:', result.updated, 'Created:', result.created);
    process.exit(0);
  });
"
```

---

## 📊 Inspection & Verification Queries

### 1. **Check Current Grade Distribution**
```sql
SELECT
  grade,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM mp_report_cards), 1) as percentage
FROM mp_report_cards
GROUP BY grade
ORDER BY
  CASE grade
    WHEN 'A' THEN 1
    WHEN 'B' THEN 2
    WHEN 'C' THEN 3
    WHEN 'D' THEN 4
    WHEN 'F' THEN 5
  END;
```

**Expected Output**:
```
grade | count | percentage
------|-------|------------
A     |  22   |   10.0%
B     |  55   |   25.0%
C     |  88   |   40.0%
D     |  44   |   20.0%
F     |  12   |    5.0%
```

---

### 2. **View Top 20 Performers**
```sql
SELECT
  m.name,
  m.party,
  m.constituency,
  m.state,
  rc.grade,
  rc.overall_score,
  rc.attendance_score,
  rc.participation_score,
  rc.conduct_score,
  rc.constituency_impact_score
FROM mp_report_cards rc
JOIN mps m ON rc.mp_id = m.id
ORDER BY rc.overall_score DESC
LIMIT 20;
```

---

### 3. **View Bottom 20 Performers**
```sql
SELECT
  m.name,
  m.party,
  m.constituency,
  m.state,
  rc.grade,
  rc.overall_score,
  rc.attendance_score,
  rc.participation_score,
  rc.conduct_score
FROM mp_report_cards rc
JOIN mps m ON rc.mp_id = m.id
ORDER BY rc.overall_score ASC
LIMIT 20;
```

---

### 4. **Calculate Average Scores**
```sql
SELECT
  ROUND(AVG(overall_score), 1) as avg_overall,
  ROUND(AVG(attendance_score), 1) as avg_attendance,
  ROUND(AVG(participation_score), 1) as avg_participation,
  ROUND(AVG(conduct_score), 1) as avg_conduct,
  ROUND(AVG(constituency_impact_score), 1) as avg_constituency
FROM mp_report_cards;
```

**Expected Output**:
```
avg_overall | avg_attendance | avg_participation | avg_conduct | avg_constituency
------------|----------------|-------------------|-------------|------------------
   72.5     |      50.0      |       50.0        |    50.0     |       50.0
```
*(Percentile averages should be close to 50)*

---

### 5. **Compare Grade Distribution by Coalition**
```sql
SELECT
  CASE
    WHEN m.party IN ('UMNO', 'PKR', 'DAP', 'PH', 'BN', 'GPS', 'GRS', 'WARISAN')
    THEN 'Government'
    ELSE 'Opposition'
  END as coalition,
  rc.grade,
  COUNT(*) as count
FROM mp_report_cards rc
JOIN mps m ON rc.mp_id = m.id
GROUP BY coalition, rc.grade
ORDER BY coalition,
  CASE grade
    WHEN 'A' THEN 1
    WHEN 'B' THEN 2
    WHEN 'C' THEN 3
    WHEN 'D' THEN 4
    WHEN 'F' THEN 5
  END;
```

---

### 6. **Compare Grade Distribution by State**
```sql
SELECT
  m.state,
  rc.grade,
  COUNT(*) as count,
  ROUND(AVG(rc.overall_score), 1) as avg_score
FROM mp_report_cards rc
JOIN mps m ON rc.mp_id = m.id
GROUP BY m.state, rc.grade
ORDER BY m.state,
  CASE grade
    WHEN 'A' THEN 1
    WHEN 'B' THEN 2
    WHEN 'C' THEN 3
    WHEN 'D' THEN 4
    WHEN 'F' THEN 5
  END;
```

---

### 7. **Find MPs with Specific Performance Patterns**

**High Attendance but Low Participation:**
```sql
SELECT
  m.name,
  m.party,
  rc.attendance_score,
  rc.participation_score,
  rc.overall_score,
  rc.grade
FROM mp_report_cards rc
JOIN mps m ON rc.mp_id = m.id
WHERE rc.attendance_score >= 70
  AND rc.participation_score <= 30
ORDER BY rc.attendance_score DESC;
```

**High Participation but Low Attendance:**
```sql
SELECT
  m.name,
  m.party,
  rc.attendance_score,
  rc.participation_score,
  rc.overall_score,
  rc.grade
FROM mp_report_cards rc
JOIN mps m ON rc.mp_id = m.id
WHERE rc.participation_score >= 70
  AND rc.attendance_score <= 30
ORDER BY rc.participation_score DESC;
```

---

### 8. **Check Last Update Time**
```sql
SELECT
  MAX(updated_at) as last_update,
  COUNT(*) as total_cards
FROM mp_report_cards;
```

---

### 9. **View Detailed MP Report Card**
```sql
SELECT
  m.name,
  m.party,
  m.constituency,
  m.state,
  m.gender,
  -- Scores
  rc.overall_score,
  rc.grade,
  rc.attendance_score,
  rc.participation_score,
  rc.conduct_score,
  rc.constituency_impact_score,
  -- Raw metrics
  rc.total_speeches,
  rc.average_speeches,
  rc.bills_raised,
  rc.questions_asked,
  rc.inappropriate_language_count,
  rc.poverty_rate,
  -- Timestamps
  rc.calculated_at,
  rc.updated_at
FROM mp_report_cards rc
JOIN mps m ON rc.mp_id = m.id
WHERE m.name ILIKE '%Anwar%'  -- Replace with MP name
ORDER BY m.name;
```

---

### 10. **Identify MPs with Missing Report Cards**
```sql
SELECT
  m.id,
  m.name,
  m.party,
  m.constituency
FROM mps m
LEFT JOIN mp_report_cards rc ON m.id = rc.mp_id
WHERE rc.id IS NULL;
```

---

## 🗑️ Maintenance Queries

### 1. **Clear All Report Cards** (before recalculation)
```sql
-- ⚠️ WARNING: This deletes all grades. Use only before triggering recalculation.
DELETE FROM mp_report_cards;
```

### 2. **Delete Report Cards for Specific MPs**
```sql
DELETE FROM mp_report_cards
WHERE mp_id IN (
  SELECT id FROM mps WHERE name ILIKE '%specific mp name%'
);
```

### 3. **Reset Scores for Testing**
```sql
-- Set all scores to 0 (useful for testing)
UPDATE mp_report_cards
SET
  attendance_score = 0,
  participation_score = 0,
  conduct_score = 0,
  constituency_impact_score = 0,
  overall_score = 0,
  grade = 'F';
```

---

## 📈 Analytics Queries

### 1. **Correlation: Attendance vs Overall Grade**
```sql
SELECT
  CASE
    WHEN rc.attendance_score >= 80 THEN '80-100'
    WHEN rc.attendance_score >= 60 THEN '60-79'
    WHEN rc.attendance_score >= 40 THEN '40-59'
    ELSE '0-39'
  END as attendance_range,
  rc.grade,
  COUNT(*) as count
FROM mp_report_cards rc
GROUP BY attendance_range, rc.grade
ORDER BY attendance_range DESC,
  CASE grade
    WHEN 'A' THEN 1
    WHEN 'B' THEN 2
    WHEN 'C' THEN 3
    WHEN 'D' THEN 4
    WHEN 'F' THEN 5
  END;
```

### 2. **Find Statistical Outliers**
```sql
WITH stats AS (
  SELECT
    AVG(overall_score) as mean,
    STDDEV(overall_score) as stddev
  FROM mp_report_cards
)
SELECT
  m.name,
  m.party,
  rc.overall_score,
  rc.grade,
  ROUND((rc.overall_score - stats.mean) / stats.stddev, 2) as z_score
FROM mp_report_cards rc
JOIN mps m ON rc.mp_id = m.id
CROSS JOIN stats
WHERE ABS((rc.overall_score - stats.mean) / stats.stddev) > 2
ORDER BY ABS((rc.overall_score - stats.mean) / stats.stddev) DESC;
```

### 3. **Grade Transition Analysis** (if you have historical data)
```sql
-- Assumes you've archived previous grades to mp_report_cards_history table
SELECT
  m.name,
  old.grade as previous_grade,
  new.grade as current_grade,
  old.overall_score as previous_score,
  new.overall_score as current_score,
  (new.overall_score - old.overall_score) as score_change
FROM mp_report_cards new
JOIN mp_report_cards_history old ON new.mp_id = old.mp_id
JOIN mps m ON new.mp_id = m.id
WHERE old.grade != new.grade
ORDER BY (new.overall_score - old.overall_score) DESC;
```

---

## 🔍 Debugging Queries

### 1. **Check for Data Quality Issues**
```sql
-- MPs with 0 attendance
SELECT m.name, m.party, rc.attendance_score
FROM mp_report_cards rc
JOIN mps m ON rc.mp_id = m.id
WHERE rc.attendance_score = 0;

-- MPs with null values
SELECT m.name, m.party
FROM mp_report_cards rc
JOIN mps m ON rc.mp_id = m.id
WHERE rc.overall_score IS NULL
   OR rc.attendance_score IS NULL
   OR rc.participation_score IS NULL;

-- MPs with impossible scores (>100 or <0)
SELECT m.name, m.party, rc.overall_score
FROM mp_report_cards rc
JOIN mps m ON rc.mp_id = m.id
WHERE rc.overall_score > 100 OR rc.overall_score < 0;
```

### 2. **Verify Percentile Distribution**
```sql
-- Should show roughly 50th percentile average for each category
SELECT
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY overall_score) as p25,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY overall_score) as p50_median,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY overall_score) as p75,
  MIN(overall_score) as min_score,
  MAX(overall_score) as max_score
FROM mp_report_cards;
```

---

## 📋 Export Queries

### 1. **Export Full Report Card Data to CSV**
```sql
COPY (
  SELECT
    m.name,
    m.party,
    m.constituency,
    m.state,
    rc.grade,
    rc.overall_score,
    rc.attendance_score,
    rc.participation_score,
    rc.conduct_score,
    rc.constituency_impact_score,
    rc.total_speeches,
    rc.average_speeches,
    rc.bills_raised,
    rc.questions_asked
  FROM mp_report_cards rc
  JOIN mps m ON rc.mp_id = m.id
  ORDER BY rc.overall_score DESC
) TO '/tmp/mp_report_cards.csv' WITH CSV HEADER;
```

### 2. **Export Summary Statistics**
```sql
COPY (
  SELECT
    grade,
    COUNT(*) as count,
    ROUND(AVG(overall_score), 1) as avg_score,
    MIN(overall_score) as min_score,
    MAX(overall_score) as max_score
  FROM mp_report_cards
  GROUP BY grade
  ORDER BY
    CASE grade
      WHEN 'A' THEN 1
      WHEN 'B' THEN 2
      WHEN 'C' THEN 3
      WHEN 'D' THEN 4
      WHEN 'F' THEN 5
    END
) TO '/tmp/grade_distribution.csv' WITH CSV HEADER;
```

---

## 🚀 Quick Start

**After deploying the percentile-based grading system:**

1. **Run the migration** (creates visitor_analytics table):
   ```bash
   npm run db:migrate
   ```

2. **Trigger grade recalculation** via admin API:
   ```bash
   curl -X POST http://localhost:5000/api/admin/report-cards/update
   ```

3. **Verify grade distribution**:
   ```sql
   SELECT grade, COUNT(*) FROM mp_report_cards GROUP BY grade;
   ```

4. **Check top performers**:
   ```sql
   SELECT m.name, rc.grade, rc.overall_score
   FROM mp_report_cards rc
   JOIN mps m ON rc.mp_id = m.id
   ORDER BY rc.overall_score DESC
   LIMIT 10;
   ```

---

## 📝 Notes

- **Percentile calculations** are done in the backend service, not SQL
- Grades are **automatically recalculated** monthly on the 1st at 2:00 AM MYT
- Use the **admin panel** for manual updates, not direct SQL manipulation
- All queries assume PostgreSQL database

---

**Need help?** Check the documentation:
- `PERCENTILE_GRADING_IMPLEMENTATION.md` - Technical details
- `REPORT_CARD_FEATURE.md` - Feature overview
