# Hansard Data Migration Guide

This guide documents the process for migrating existing hansard records to ensure data integrity and consistency.

## Problem Statement

Two data inconsistency issues were identified:

1. **Parliament Term Inconsistency**: Hansard records stored parliament terms in various formats (e.g., "Parlimen Ke-15 (Penggal 3)") but queries filtered for exact "15th Parliament" match, causing empty results.

2. **Stale MP IDs**: Hansard records referenced old MP UUIDs from a previous database seed, causing all MPs to show 0 sessions/speeches despite having hansard data.

## Solution Overview

### 1. Parliament Term Normalization

All hansard records now use the canonical "15th Parliament" format.

**Implementation:**
- `shared/utils.ts`: `normalizeParliamentTerm()` helper function
- `server/storage.ts`: All mutation paths (create/update) normalize terms before DB write
- `server/hansard-pdf-parser.ts`: PDF parser normalizes terms from source documents

### 2. MP ID Remapping

Hansard records now reference current MP IDs from the active database seed.

**Implementation:**
- Uses `MPNameMatcher` for fuzzy name matching
- Updates `speaker_stats`, `attended_mp_ids`, and `absent_mp_ids` arrays
- Recalculates MP speech counters from normalized data

## Migration Scripts

### Required Scripts (Run in Order)

#### 1. Normalize Parliament Terms
```bash
npx tsx scripts/backfill-normalize-parliament-terms.ts
```

**What it does:**
- Reads all hansard records
- Normalizes `parliament_term` field to "15th Parliament"
- Resets MP speech counters to 0
- Recalculates counters from normalized records

**Expected output:**
- Shows count of updated vs unchanged records
- Displays parliament term distribution
- Lists MPs with updated statistics

#### 2. Remap MP IDs
```bash
npx tsx scripts/remap-hansard-mp-ids.ts
```

**What it does:**
- Maps old MP IDs to current IDs using name matching
- Updates all MP ID references in hansard records
- Recalculates MP speech statistics with correct IDs

**Expected output:**
- Shows successful matches (name → old ID → new ID)
- Lists any unmatched names (requires manual review)
- Displays final MP statistics

#### 3. Verify Data Integrity
```bash
npx tsx scripts/verify-hansard-data.ts
```

**What it does:**
- Validates all parliament terms are canonical
- Checks MP speech statistics match expected values
- Ensures no stale MP IDs remain

**Expected output:**
- Pass/fail status for each verification check
- Detailed error messages if issues found
- Exit code 0 on success, 1 on failure

### Package.json Scripts

Add these to your `package.json` for convenience:

```json
{
  "scripts": {
    "migrate:hansard:normalize": "tsx scripts/backfill-normalize-parliament-terms.ts",
    "migrate:hansard:remap": "tsx scripts/remap-hansard-mp-ids.ts",
    "migrate:hansard:verify": "tsx scripts/verify-hansard-data.ts",
    "migrate:hansard:all": "npm run migrate:hansard:normalize && npm run migrate:hansard:remap && npm run migrate:hansard:verify"
  }
}
```

## Deployment Checklist

When deploying to a new environment or after MP data reseed:

- [ ] Run parliament term normalization: `npm run migrate:hansard:normalize`
- [ ] Run MP ID remap: `npm run migrate:hansard:remap`
- [ ] Run verification: `npm run migrate:hansard:verify`
- [ ] Check verification output for any failures
- [ ] Review unmatched MP names (if any) and update manually
- [ ] Restart application server
- [ ] Spot-check MP profiles to verify hansard data displays correctly

## Prevention Measures

### Code-Level Safeguards

1. **Storage Layer Normalization**
   - `createHansardRecord`: Normalizes parliament term
   - `createHansardRecordWithSpeechStats`: Normalizes term AND derives MP IDs from normalized record (never trusts caller-supplied IDs)
   - `updateHansardRecord`: Normalizes term if updated

2. **PDF Parser Normalization**
   - `parseMetadata`: Normalizes parliament terms from source PDFs

3. **MP ID Derivation**
   - `createHansardRecordWithSpeechStats` derives MP IDs from the normalized record's `speaker_stats` field
   - Never uses caller-supplied `speakerStats` parameter for DB updates
   - Prevents stale IDs from being persisted

### Future Improvements

- Add database constraints to enforce canonical parliament term format
- Add foreign key constraints on MP IDs (requires handling orphaned records)
- Implement automated verification in CI/CD pipeline
- Add alerts when MP name matching fails during hansard upload
- Create admin UI for reviewing and resolving unmatched MP names

## Troubleshooting

### Verification Fails: Non-Canonical Parliament Terms

**Symptom:** `verify-hansard-data.ts` shows records with non-canonical parliament terms

**Solution:**
1. Check if new hansard records were uploaded without normalization
2. Run `npm run migrate:hansard:normalize` again
3. Check `server/storage.ts` to ensure normalization is in all mutation paths

### Verification Fails: Incorrect MP Statistics

**Symptom:** MP speech counts don't match expected values

**Solution:**
1. Check if MP IDs are stale (run `npm run migrate:hansard:remap`)
2. Verify `speaker_stats` structure in hansard records matches expected format
3. Manually recalculate using: `npm run migrate:hansard:normalize`

### Verification Fails: Stale MP IDs Found

**Symptom:** Hansard records reference non-existent MP IDs

**Solution:**
1. Run `npm run migrate:hansard:remap` to update IDs
2. Check if MPs were recently deleted or re-seeded
3. Review unmatched names output and resolve manually if needed

## Contact

For questions or issues with hansard data migration, please contact the development team.
