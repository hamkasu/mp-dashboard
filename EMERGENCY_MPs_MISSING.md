# Emergency: MPs Data Missing from Database

**Issue:** Dashboard shows "0 MPs found"  
**Status:** Critical - Data loss or database reset  
**Likely Cause:** 
- Database migration issue
- Initial seed data not applied
- Database connection problem

---

## Quick Diagnostic Steps

### 1. Check Database Connection
```bash
# Verify environment
echo "DATABASE_URL: $DATABASE_URL"

# Test connection (if psql available)
psql $DATABASE_URL -c "SELECT COUNT(*) FROM mps;"
```

### 2. Check Migrations Status
```bash
# List recent migrations that were run
psql $DATABASE_URL -c "SELECT * FROM _migrations ORDER BY name DESC LIMIT 10;"
```

### 3. Check if mps table exists
```bash
psql $DATABASE_URL -c "\dt mps"
# Should show the mps table exists
```

### 4. Count records in mps table
```bash
psql $DATABASE_URL -c "SELECT COUNT(*) as mp_count FROM mps;"
# Should return > 200, not 0
```

---

## Recovery Steps

### If Database is Empty:

**Option A: Restore from Backup** (Fastest)
```bash
# If backup exists
pg_restore -d mp_dashboard /path/to/backup.sql
```

**Option B: Re-import MPs Data** (If source available)
```bash
# Check if CSV or JSON file exists with MPs data
find . -name "*mp*" -type f | grep -E "\.(csv|json|sql)$"

# Run import script
npm run script:import-mps  # Or similar
```

**Option C: Run Migrations Fresh** (If tables but data lost)
```bash
# Re-run migrations (safe - migrations are idempotent)
npm run db:migrate

# Then import initial data
npm run db:seed  # If exists
```

---

## What Phase 4 Added

Our Phase 4 changes should NOT have deleted MPs:
- ✅ Added `coalitions` table
- ✅ Added `party_coalition_mapping` table  
- ✅ Added `coalition_id` column to `mps` table (foreign key)
- ❌ Did NOT modify/delete MPs data

---

## Next Actions

**Immediate:**
1. Verify database connection and table existence
2. Check if backup exists
3. Determine if initial seed needed

**If Migrations Need Re-run:**
```bash
# Safely re-run all migrations
npm run db:migrate

# Check status
npm run db:status
```

**If Data Needs Import:**
- Need source file with MPs data (CSV, JSON, SQL dump)
- Run import script against that source

---

## Information Needed from You

To help recover the data, please provide:

1. Does a database backup exist?
2. Is there an MPs data source file (CSV, JSON)?
3. When did MPs data disappear? (After which deployment?)
4. Are you running in local dev, staging, or production?

---

## Verification Once Data Restored

```bash
# Should show 200+ MPs
curl http://localhost:5000/api/mps | jq '.length'

# Dashboard should load
curl http://localhost:5000/api/mps/paginated | jq '.[0]'
```

---

**In the meantime, Phase 4 code is complete and ready once MPs data is restored.**
