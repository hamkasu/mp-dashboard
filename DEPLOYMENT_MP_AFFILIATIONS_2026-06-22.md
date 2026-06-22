# MP Affiliation Update - Deployment Guide
**Date:** 2026-06-22  
**Version:** 1.0  
**Status:** Ready for Production Deployment

---

## Quick Start

### Dry Run (Recommended First)
```bash
DRY_RUN=true node scripts/deploy-mp-affiliation-updates.mjs
```

### Live Deployment
```bash
DATABASE_URL="postgresql://user:pass@host:port/db" \
node scripts/deploy-mp-affiliation-updates.mjs
```

---

## What This Deployment Does

### Changes Applied
- ✅ **5 MPs → Independent** (Bersatu sackings)
- ✅ **3 Coalition Exits** (UPKO from PH, STAR from GRS)
- ✅ **1 By-Election Update** (Kinabatangan seat change)

### Database Changes
1. **Creates `party_history` table** with full audit trail
2. **Adds `coalition` column** to `mps` table
3. **Updates party/coalition** for 9 MPs
4. **Inserts 9 historical records** for tracking

### Safety Features
- ✅ All updates in single PostgreSQL transaction
- ✅ Atomic: either all succeed or all rollback
- ✅ Dry-run mode for testing without changes
- ✅ Verification queries after deployment
- ✅ Detailed logging of all operations

---

## Deployment Steps

### Step 1: Pre-Deployment Checklist
- [ ] DATABASE_URL environment variable set
- [ ] Database backup created (recommended)
- [ ] Dry-run executed and verified
- [ ] Read this guide completely
- [ ] Notified relevant stakeholders

### Step 2: Run Dry-Run
```bash
cd /path/to/mp-dashboard
DRY_RUN=true node scripts/deploy-mp-affiliation-updates.mjs
```

Expected output:
```
✅ MP Affiliation Update Deployment
═══════════════════════════════════════════════════════════════════════
Database connection ✅
Verify mps table exists ✅
...
DRY RUN: Skipping migration execution
DRY RUN: Skipping update execution
```

### Step 3: Execute Live Deployment
```bash
DATABASE_URL="postgresql://user:pass@host:port/db" \
NODE_ENV=production \
node scripts/deploy-mp-affiliation-updates.mjs
```

Expected output:
```
✅ DEPLOYMENT COMPLETE
🎉 MP Affiliation Update Successfully Applied!

📝 Next Steps:
   1. Verify changes on live site
   2. Test affected constituency pages
   3. Check dashboard aggregates
```

### Step 4: Verify on Live Site
1. Navigate to Larut (P147) - should show Hamzah Zainudin as Independent
2. Check Tuaran (P209) - should show UPKO as primary coalition
3. Visit Keningau (P197) - should show STAR as primary coalition
4. View Kinabatangan (P199) - should show Mohammad Naim (UMNO)

---

## Files Modified

### Database
- **mps table**: `party` and `coalition` columns updated for 9 records
- **party_history table**: 9 new records inserted (created if doesn't exist)

### Schema
- **migrations/0051_create_party_history_table.sql**: Migration to add table and column
- **SQL_UPDATE_MP_AFFILIATIONS_2026-06-22.sql**: All update statements

### Application
- No code changes required - schema-only updates

---

## Rollback Procedure

If you need to rollback (⚠️ use only if critical issues found):

### Option 1: Using Transaction Rollback (Recommended)
If deployment failed partway through, PostgreSQL will automatically rollback all changes.

### Option 2: Manual Restore
If deployment succeeded but needs reversal:

```sql
-- Restore previous party values
UPDATE mps SET party = 'Bersatu' WHERE parliament_code IN ('P147', 'P172', 'P156', 'P169', 'P127');
UPDATE mps SET coalition = 'PH' WHERE parliament_code IN ('P209', 'P210');
UPDATE mps SET coalition = 'GRS' WHERE parliament_code = 'P197';
UPDATE mps SET name = 'Bung Moktar Radin' WHERE parliament_code = 'P199';

-- Delete party history records
DELETE FROM party_history WHERE change_date >= '2026-06-22'::date;
```

---

## Deployment Verification Queries

### Verify All Changes Applied
```sql
-- Should return 9 records
SELECT COUNT(*) FROM party_history WHERE change_date >= '2026-06-22'::date;

-- Verify Independent MPs
SELECT parliament_code, name, party, coalition
FROM mps
WHERE parliament_code IN ('P147', 'P172', 'P156', 'P169', 'P127');

-- Verify Coalition Changes
SELECT parliament_code, name, coalition
FROM mps
WHERE parliament_code IN ('P209', 'P210', 'P197');

-- Verify By-Election
SELECT parliament_code, name, party
FROM mps
WHERE parliament_code = 'P199';
```

### Verify Party History Records
```sql
-- All changes by type
SELECT change_type, COUNT(*) as count
FROM party_history
WHERE change_date >= '2026-06-22'::date
GROUP BY change_type;

-- Sacking records
SELECT mp_id, old_party, new_party, change_date, notes
FROM party_history
WHERE change_type = 'sacking'
ORDER BY change_date;
```

---

## Troubleshooting

### Error: DATABASE_URL not set
```bash
# Fix: Set database URL
export DATABASE_URL="postgresql://user:pass@host:port/database"
```

### Error: Connection timeout
- Check network connectivity to database
- Verify DATABASE_URL is correct
- Check database is running and accepting connections
- Increase connection timeout: add `?connect_timeout=20` to URL

### Error: Migration fails
- Check if party_history table already exists
- Verify you have sufficient permissions on database
- Check for conflicts with other running queries

### Partial update detected
- All updates are in a transaction, so this shouldn't happen
- If it does, rollback entire transaction
- Contact database administrator

---

## After Deployment

### Immediate (1-2 hours)
1. ✅ Verify all 9 changes on live site
2. ✅ Test constituency pages load correctly
3. ✅ Check MP profile pages display updated info
4. ✅ Monitor error logs for issues

### Short-term (1-7 days)
1. ✅ Validate Skor Prestasi calculations
2. ✅ Check dashboard coalition seat counts
3. ✅ Review user feedback for any confusion
4. ✅ Document any edge cases found

### Long-term (ongoing)
1. ✅ Continue monitoring party_history for new changes
2. ✅ Use party_history for future party-hopping analysis
3. ✅ Consider adding more historical records for MPs changed before 2026-06-22

---

## Support & Questions

If you encounter issues:
1. Check this guide's Troubleshooting section
2. Review deployment logs (full output from script)
3. Run verification queries to assess state
4. Check party_history table for detailed change records

---

## Deployment Record

| Field | Value |
|-------|-------|
| Date Deployed | 2026-06-22 |
| Deployed By | [Your Name] |
| Environment | Production |
| Total Changes | 9 |
| Sackings | 5 |
| Coalition Exits | 3 |
| By-Elections | 1 |
| Status | ✅ Complete |
| Issues | None |

---

**Generated:** 2026-06-22  
**Documentation Version:** 1.0
