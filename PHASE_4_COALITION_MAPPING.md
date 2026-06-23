# Phase 4: Coalition Data Population Guide

**Status:** Ready to populate  
**Date:** June 23, 2026  
**Method:** SQL-based mapping by party affiliation

---

## Coalition Groupings (15th Parliament, 2023-2027)

### 1. **Barisan Nasional (BN)** — Government Coalition
**Parties:** UMNO, MCA, MIC, PBB, SUPP, PBS, UPKO, LDP  
**Role:** Primary government coalition  
**Expected MPs:** ~45-50

| Party | Role | MPs |
|-------|------|-----|
| UMNO | Largest party | ~37 |
| MCA | Chinese majority | ~3 |
| MIC | Indian majority | ~1 |
| PBB | Sarawak-based | ~2 |
| SUPP | Sarawak-based | ~1 |
| PBS | Sabah-based | ~1 |
| UPKO | Sabah-based | ~1 |
| LDP | Sarawak-based | ~1 |

---

### 2. **Pakatan Harapan (PH)** — Opposition Coalition
**Parties:** PKR, DAP, AMANAH, BERSATU  
**Role:** Leading opposition coalition  
**Expected MPs:** ~80-85

| Party | Role | MPs |
|-------|------|-----|
| PKR | Largest in PH | ~50 |
| DAP | Chinese majority | ~25 |
| AMANAH | Islamic faction | ~5 |
| BERSATU | Malay-focused | ~5 |

---

### 3. **Gabungan Parti Sarawak (GPS)** — Regional Coalition
**Parties:** GPS members (PDS, PBB component in Sarawak)  
**Role:** Sarawak regional coalition  
**Expected MPs:** ~20-23

| Party | Role | MPs |
|-------|------|-----|
| GPS | Main | ~20 |

---

### 4. **Perikatan Nasional (PN)** — Opposition Coalition
**Parties:** PAS, BERSATU-PN  
**Role:** Islamic-focused opposition  
**Expected MPs:** ~15-20

| Party | Role | MPs |
|-------|------|-----|
| PAS | Islamic party | ~15 |

---

### 5. **Independent (IND)** — Unaligned
**Status:** MPs without coalition affiliation  
**Expected MPs:** ~1-3

---

## Population Method

### Option A: Automated SQL (Recommended)

Run migration `0055_populate_coalition_data.sql`:

```bash
# Via migration framework
npm run db:migrate  # Will run 0055 if using standard migration runner

# Or direct SQL
psql $DATABASE_URL < migrations/0055_populate_coalition_data.sql
```

This migration:
1. ✅ Verifies coalitions exist
2. ✅ Maps each party to coalition (5 UPDATE statements)
3. ✅ Handles edge cases (unassigned MPs)
4. ✅ Provides verification queries
5. ✅ Shows distribution by party/coalition

### Option B: Manual Party-by-Party Assignment

If you need to assign specific MPs to different coalitions:

```sql
-- Single MP to specific coalition
UPDATE mps
SET coalition_id = (SELECT id FROM coalitions WHERE code = 'BN')
WHERE id = 'mp-uuid-here' AND party = 'UMNO';

-- Verify
SELECT name, party, coalition_id FROM mps WHERE id = 'mp-uuid-here';
```

---

## SQL Mapping Statements

### BN Assignment
```sql
UPDATE mps
SET coalition_id = (SELECT id FROM coalitions WHERE code = 'BN')
WHERE party IN ('UMNO', 'MCA', 'MIC', 'PBB', 'SUPP', 'PBS', 'UPKO', 'LDP');
```

### PH Assignment
```sql
UPDATE mps
SET coalition_id = (SELECT id FROM coalitions WHERE code = 'PH')
WHERE party IN ('PKR', 'DAP', 'AMANAH', 'BERSATU');
```

### GPS Assignment
```sql
UPDATE mps
SET coalition_id = (SELECT id FROM coalitions WHERE code = 'GPS')
WHERE party IN ('GPS', 'PDS');
```

### PN Assignment
```sql
UPDATE mps
SET coalition_id = (SELECT id FROM coalitions WHERE code = 'PN')
WHERE party IN ('PAS', 'BERSATU-PN');
```

### Independent Assignment (Catch-all)
```sql
UPDATE mps
SET coalition_id = (SELECT id FROM coalitions WHERE code = 'IND')
WHERE coalition_id IS NULL;
```

---

## Verification Queries

### 1. Coalition Distribution
```sql
SELECT
    c.code,
    c.name,
    COUNT(m.id) as mp_count,
    STRING_AGG(DISTINCT m.party, ', ') as parties
FROM coalitions c
LEFT JOIN mps m ON c.id = m.coalition_id
GROUP BY c.id, c.code, c.name
ORDER BY mp_count DESC;
```

**Expected Output:**
```
code | name | mp_count | parties
-----+------+----------+----------
PH   | Pakatan Harapan | 80 | AMANAH, BERSATU, DAP, PKR
BN   | Barisan Nasional | 48 | LDP, MCA, MIC, PBB, PBS, SUPP, UMNO, UPKO
GPS  | Gabungan Parti... | 23 | GPS, PDS
PN   | Perikatan Nasional | 18 | PAS
IND  | Independent | 2 | [various]
```

### 2. Unassigned MPs
```sql
SELECT id, name, party, state FROM mps WHERE coalition_id IS NULL;
```

**Expected:** Empty result set (all MPs assigned)

### 3. Party Distribution
```sql
SELECT
    party,
    COALESCE(c.code, 'UNASSIGNED') as coalition,
    COUNT(*) as count
FROM mps m
LEFT JOIN coalitions c ON m.coalition_id = c.id
GROUP BY party, coalition
ORDER BY count DESC;
```

---

## After Population: Next Steps

### 1. Verify Data Integrity
```sql
-- Check all MPs have coalition_id
SELECT COUNT(*) as total_mps, 
       COUNT(coalition_id) as assigned,
       COUNT(CASE WHEN coalition_id IS NULL THEN 1 END) as unassigned
FROM mps;
-- Should show: total_mps = assigned, unassigned = 0
```

### 2. Test Phase 4 APIs
```bash
# Get coalition/state percentiles
curl http://localhost:5000/api/report-cards/percentiles/coalition-state | jq '.[0]'

# Get single MP with percentiles
curl http://localhost:5000/api/report-cards/MP_ID/with-coalition-state | jq '.'
```

### 3. Test Frontend Pages
- Navigate to `/coalition-comparison` — should show 5 coalition cards
- Navigate to `/state-leaderboards` — should show 13 state options
- Click into `/mp/[id]/percentiles` — should show all three ranking levels

### 4. Run Report Card Update
Once coalitions are assigned, re-run the report card scoring to calculate coalition/state percentiles:

```bash
# Via admin panel: POST /api/admin/report-cards/update
# Or via API:
curl -X POST http://localhost:5000/api/admin/report-cards/update \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## Troubleshooting

### Issue: "Coalitions table not found"
**Cause:** Migration 0054 not applied  
**Fix:** Run migration 0054 first: `npm run db:migrate`

### Issue: Some MPs still have NULL coalition_id
**Cause:** Party name mismatch or extra spaces  
**Fix:** 
```sql
-- Find unmatched parties
SELECT DISTINCT party FROM mps WHERE coalition_id IS NULL;

-- Map manually or update party name
UPDATE mps SET coalition_id = (SELECT id FROM coalitions WHERE code = 'BN')
WHERE party LIKE '%UMNO%' OR party = 'UMNO';
```

### Issue: Coalition shows 0 MPs
**Cause:** No MPs with that party in database  
**Context:** Some coalitions may not have MPs in 15th Parliament (e.g., if GRS not in current parliament)  
**Action:** Expected - leave as is

### Issue: Want to reassign an MP to different coalition
**Solution:**
```sql
-- Reassign single MP
UPDATE mps
SET coalition_id = (SELECT id FROM coalitions WHERE code = 'PH')
WHERE name = 'Anwar Ibrahim';

-- Verify
SELECT name, party, coalition_id FROM mps WHERE name = 'Anwar Ibrahim';
```

---

## Historical Notes

**Why this mapping?**
- **15th Parliament (2023-2027):** Current dataset
- **14th Parliament (2018-2022):** Different coalition alignments (PH was government)
- **Coalitions are volatile:** Parties switch coalitions; hardcoding assumes current term

**For historical analysis:**
Use `start_date`/`end_date` in `party_coalition_mapping` table to track coalition changes:

```sql
-- PAS in PN as of June 2026
SELECT * FROM party_coalition_mapping 
WHERE party_name = 'PAS' AND end_date IS NULL;

-- UMNO historically in BN
SELECT * FROM party_coalition_mapping 
WHERE party_name = 'UMNO' ORDER BY effective_date DESC;
```

---

## Files Involved

| File | Purpose |
|------|---------|
| migrations/0054_add_coalitions_table.sql | Create tables (already applied) |
| migrations/0055_populate_coalition_data.sql | Populate data (ready to run) |
| PHASE_4_COALITION_MAPPING.md | This guide |

---

## Success Criteria

✅ All 222 MPs have coalition_id assigned  
✅ No NULL coalition_id values  
✅ Coalition distribution matches expected counts (~80 PH, ~48 BN, etc.)  
✅ `/coalition-comparison` page shows all 5 coalitions with MPs  
✅ `/state-leaderboards` page functions correctly  
✅ `/mp/:id/percentiles` shows coalition and state percentiles

---

**Ready to populate?** Run migration 0055 or execute the SQL queries above.
