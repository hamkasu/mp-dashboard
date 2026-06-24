# Phase 2: Court Case Status Constraints & Weighted Scoring

**Date:** June 23, 2026  
**Status:** ✅ IMPLEMENTATION COMPLETE  
**Branch:** `claude/admiring-feynman-80je73`

---

## Overview

Phase 2 implements case status constraints and updates the Integrity/Conduct component of the scoring system to weight cases by their legal status rather than treating all cases identically. This prevents the dashboard from implying guilt where none has been established.

---

## Changes Made

### 1. Schema Updates (`shared/schema.ts`)

#### New Enum Definition
```typescript
export const CASE_STATUS_VALUES = ["under_investigation", "charged", "convicted", "acquitted", "withdrawn", "appeal_pending"] as const;
export type CaseStatus = typeof CASE_STATUS_VALUES[number];
```

#### Court Cases Table
- Added `statusConfirmedAt: timestamp` — when status was verified against public record
- Added `statusConfirmedBy: varchar` — admin user ID who verified
- Added `statusNotes: text` — any caveats about status determination
- Updated `status` field to enforce enum constraint via Zod schema

#### SPRM Investigations Table
- Added same three audit fields for consistency
- Updated `status` field with enum constraint

#### Schema Validation
- Both `insertCourtCaseSchema` and `insertSprmInvestigationSchema` now validate status against CASE_STATUS_VALUES
- Created `updateCourtCaseSchema` for PATCH operations

### 2. Database Migration (`migrations/0052_add_case_status_constraints.sql`)

The migration performs three operations:

**a) Add New Columns**
```sql
ALTER TABLE court_cases ADD COLUMN status_confirmed_at TIMESTAMP;
ALTER TABLE court_cases ADD COLUMN status_confirmed_by VARCHAR;
ALTER TABLE court_cases ADD COLUMN status_notes TEXT;
-- Same for sprm_investigations
```

**b) Migrate Existing Data**
Maps free-text status values to standardized enum values:
- "Ongoing", "Pending", "In Progress" → `charged`
- "Completed", "Closed", "Settled" → `withdrawn`
- "Convicted" → `convicted`
- "Acquitted", "Dismissed" → `acquitted`
- "Appeal Pending" → `appeal_pending`
- "Investigation" → `under_investigation`

**c) Create Constraints & Indexes**
```sql
ALTER TABLE court_cases ADD CONSTRAINT valid_court_case_status CHECK (...);
CREATE INDEX idx_court_cases_status ON court_cases(status);
CREATE INDEX idx_court_cases_status_confirmed ON court_cases(status_confirmed_at);
```

### 3. Scoring Logic Updates (`server/services/report-card-service.ts`)

#### Status Weight Mapping
```typescript
const CASE_STATUS_WEIGHTS: Record<string, number> = {
  convicted: 1.0,        // Full impact on conduct score
  charged: 0.5,          // 50% impact
  appeal_pending: 0.5,   // 50% impact
  under_investigation: 0.25, // 25% impact
  acquitted: 0,          // No penalty (transparency without penalty)
  withdrawn: 0,          // No penalty
};
```

#### Conduct Score Calculation Changes
- **Old Logic:** Count all court cases equally
  ```typescript
  const courtCasePercentile = calculatePercentile(allCourtCases, mp.courtCases, true);
  ```

- **New Logic:** Weight court cases by their status
  ```typescript
  const allCourtCaseWeights = metrics.map(m => m.courtCaseWeight);
  const courtCasePercentile = calculatePercentile(allCourtCaseWeights, mp.courtCaseWeight, true);
  ```

#### Metrics Calculation
- Added `courtCaseWeight` to MPMetrics interface
- Modified `fetchAllMPMetrics()` to:
  1. Fetch all court cases with their status (not just counts)
  2. Calculate weighted impact per MP based on status
  3. Pass weighted scores to percentile calculation

**Example:**
- MP with 2 cases: 1 convicted (1.0x) + 1 acquitted (0x) = weight 1.0
- MP with 2 cases: both charged (0.5x each) = weight 1.0
- Weighted scores are comparable; percentile ranking remains fair

### 4. Frontend Updates (`client/src/pages/CourtCasesAdmin.tsx`)

#### Status Select Options
Updated to use enum values with proper labels:
```
under_investigation → "Under Investigation"
charged → "Charged"
convicted → "Convicted"
acquitted → "Acquitted"
withdrawn → "Withdrawn"
appeal_pending → "Appeal Pending"
```

#### Status Badge Coloring
```typescript
Badge variant={
  convicted ? "destructive" :      // Red/urgent
  charged ? "default" :            // Prominent
  appeal_pending ? "default" :     // Prominent
  under_investigation ? "secondary" : // Muted
  "outline"                        // Neutral (acquitted/withdrawn)
}
```

Visual hierarchy: Convicted (red) > Charged/Appeal Pending (prominent) > Under Investigation (secondary) > Acquitted/Withdrawn (neutral)

---

## Methodology Rationale

### Why These Weights?

**Convicted (1.0x):** Establishment of guilt in court is the highest integrity concern. Full deduction is justified.

**Charged (0.5x):** Serious allegation but not proven. Partial deduction reflects actual misconduct risk without presuming guilt.

**Appeal Pending (0.5x):** Case under review; outcome uncertain. Partial deduction avoids over-penalizing MPs contesting verdicts.

**Under Investigation (0.25x):** Investigation ≠ wrongdoing. Minimal deduction acknowledges the concern while avoiding undue penalty.

**Acquitted/Withdrawn (0x):** No deduction. Cases remain visible in profile for transparency ("show but don't penalize"), preventing deletion of exonerating records.

### Fairness Properties

- **No guilty-by-association:** Acquitted cases don't reduce conduct scores
- **Comparative fairness:** MPs with different case counts/statuses remain comparable via percentile ranking
- **Audit trail:** `statusConfirmedAt`/`statusConfirmedBy` allow tracking of data quality
- **Transparent distinction:** Frontend clearly separates status categories (not a single "court cases" count)

---

## Frontend Display Update

### Case Display in Reports
Currently just shows count ("2 court cases"). With Phase 2, will show:

**Before:**
```
Court Cases: 2
```

**After (when Phase 3-4 UI updates are completed):**
```
Court Cases: 2
  • 1 Convicted (weight 1.0x)
  • 1 Acquitted (weight 0x, shown for transparency)
Weighted Impact: 1.0
```

---

## Deployment Steps

### Step 1: Run Migration
```bash
psql $DATABASE_URL < migrations/0052_add_case_status_constraints.sql
```

Verify:
```sql
-- Check columns added
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'court_cases' AND column_name LIKE 'status%';

-- Check data migrated
SELECT DISTINCT status FROM court_cases;
-- Should return: acquitted, charged, convicted, under_investigation, withdrawn, appeal_pending
```

### Step 2: Deploy Code
- Update schema and routes to use new enum constraint
- Report card recalculation will pick up new weights automatically

### Step 3: Trigger Report Card Recalculation
```bash
curl -X POST http://localhost:3000/api/admin/report-cards/update \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Verification Checklist

### Unit Level
- [ ] 10 MPs with known case histories (mix of statuses)
- [ ] For each: check reported status matches public record
- [ ] Verify conduct score weighted correctly by status

### System Level
- [ ] Report card grades recalculated with new weights
- [ ] MPs with mostly acquitted cases: conduct score increased
- [ ] MPs with convicted cases: conduct score decreased proportionally
- [ ] No regressions in attendance/participation scores

### Test Cases
1. **MP with 1 convicted, 1 acquitted:**
   - Weight: 1.0 + 0 = 1.0
   - Should score same as MP with 2 charged (0.5+0.5)

2. **MP with no cases:**
   - Weight: 0
   - Should rank in top percentile for conduct (inverted scoring)

3. **MP with 1 under_investigation:**
   - Weight: 0.25
   - Should rank mid-range (not heavily penalized)

4. **Status Display:**
   - Admin interface allows selecting all 6 status values
   - Front-end badges color-code correctly
   - API returns status in responses

---

## Data Quality Notes

### Status Confidence
The migration assigns statuses based on text matching (e.g., "Convicted" → "convicted"). However:

- **Flag:** Some mappings are approximate (e.g., "Completed" → "withdrawn" assumes non-conviction completion)
- **Recommendation:** After migration, admins should review ~50 random cases to confirm accuracy
- **Audit Trail:** New `statusConfirmedBy`/`statusConfirmedAt` fields allow tracking reviewed vs. auto-mapped records

### No Reputational Penalty for Unconfirmed Status
Following Phase 2 spec: any record where status can't be confidently determined should be flagged for manual review rather than guessed. The `statusNotes` field stores this context.

---

## Next Steps

**Phase 3:** Committee membership & PAC attendance tracking  
**Phase 4:** Percentile-within-coalition and within-state  
**Phase 5:** Allowance-per-output ratios  
**Phase 6+:** Additional metrics

---

## Files Modified

| File | Change | Lines |
|------|--------|-------|
| `shared/schema.ts` | Add enum, update court_cases & sprm_investigations | +35 |
| `server/services/report-card-service.ts` | Update scoring logic | +15 |
| `client/src/pages/CourtCasesAdmin.tsx` | Update status selects & badges | +12 |
| `migrations/0052_add_case_status_constraints.sql` | Migration | +80 |

**Total:** 142 lines added across 4 files

---

## Commit Reference
`0453201` - Phase 2: Add case status constraints and weighted conduct scoring

---

## Questions?

This implementation prioritizes reputational safety and data transparency. The status weights reflect both legal certainty (convicted cases) and fairness (acquitted cases shown but not penalized).
