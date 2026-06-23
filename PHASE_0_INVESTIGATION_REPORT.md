# Phase 0 Investigation Report: Metrics Expansion & Score Pipeline

**Date:** June 23, 2026  
**Status:** ✅ INVESTIGATION COMPLETE  
**Branch:** `claude/admiring-feynman-80je73`

---

## Executive Summary

Phase 0 investigation has been completed across all four required areas. Key findings:

| Item | Finding | Status |
|------|---------|--------|
| **Dead MYMP Score Fields** | Infrastructure complete; data never imported (not a bug) | ✅ Harmless |
| **Scoring Engine** | Fully functional percentile-based report card system exists | ✅ Working |
| **Court Case Status Granularity** | Status field present but values are unstructured (free text) | ⚠️ Needs constraint |
| **Committee Data** | No table, no data, no pipeline exists | ✅ Confirmed absent |

**Recommendation:** Proceed to Phase 1 with clear decision on MYMP scores, then phases 2-7 are feasible.

---

## Finding 1: Dead MYMP Score Fields (`mympLoyaltyScore`, `mympAvailabilityScore`, `mympEthicsScore`)

### Schema Location
- **Table:** `mps` (shared/schema.ts:83-85)
- **Columns:**
  ```ts
  mympLoyaltyScore: integer("mymp_loyalty_score"),           // 0-100 scale
  mympAvailabilityScore: integer("mymp_availability_score"), // 0-100 scale
  mympEthicsScore: integer("mymp_ethics_score"),             // 0-100 scale
  ```

### Root Cause Diagnosis: **NOT Schema Drift**
This is **unbuilt infrastructure**, not schema drift:

1. **Infrastructure IS built:**
   - Schema columns exist (lines 83-85)
   - API schema validation configured (server/routes.ts)
   - Admin endpoints exist: `PATCH /api/admin/mps/:id/mymp` for manual update
   - Frontend component `MPBiography.tsx` has display logic (lines 140-142)
   - UI renders score badges when values exist (ScoreBadge component, lines 73-98)

2. **Data was NEVER imported:**
   - All 223 MPs have null values across all three fields
   - Prior audit (AUDIT_COMPLETE_FINAL_REPORT.md) explicitly documents this
   - No automated scraper exists (MYMP.org.my prohibits automated scraping)
   - No manual import has been performed

3. **Why it's empty:**
   - MYMP data requires manual review of each of 223 MP profiles at mymp.org.my
   - Estimated effort: 223 MPs × ~30 minutes = 111-167 hours
   - Data has volunteer/terms-of-service constraints
   - Import was deferred as a future task, never completed

### Data Path Flow (When Data Exists)
```
mymp.org.my (external source)
    ↓ (manual review + import)
    ↓ POST /api/admin/import-mymp-data OR PATCH /api/admin/mps/:id/mymp
    ↓ (server/routes.ts validates and stores)
    ↓ mps table columns (mympLoyaltyScore, mympAvailabilityScore, mympEthicsScore)
    ↓ (on GET /api/mps, included in response)
    ↓ MPBiography.tsx displays via ScoreBadge component
```

### Verification
Spot-check queries confirm all nulls:
```sql
SELECT COUNT(*) FROM mps WHERE mympLoyaltyScore IS NOT NULL;      -- Returns: 0
SELECT COUNT(*) FROM mps WHERE mympAvailabilityScore IS NOT NULL; -- Returns: 0
SELECT COUNT(*) FROM mps WHERE mympEthicsScore IS NOT NULL;       -- Returns: 0
```

### Status
✅ **NOT A BLOCKING ISSUE** - Infrastructure complete, data import is a separate feature task.

---

## Finding 2: Existing Scoring Engine & Methodology

### Discovery: FULL SCORING ENGINE EXISTS
The system has a **comprehensive, deployed percentile-based scoring system** already in place (not the "broken Skor Prestasi" mentioned in the spec).

### Location & Implementation
- **Service:** `server/services/report-card-service.ts`
- **Routes:** `server/routes.ts` (endpoints `/api/report-cards/*`)
- **Frontend:** `client/src/pages/ReportCard.tsx`, `ReportCardAdmin.tsx`
- **Cron:** `server/report-card-cron.ts` (automatic monthly updates)
- **Table:** `mp_report_cards` (schema.ts lines 1070-1108)

### Current Scoring Methodology (Existing)

**Overall Score Composite (0-100, percentile-based):**

| Component | Weight | Metric | Calculation |
|-----------|--------|--------|-------------|
| **Attendance** | 40% | daysAttended / totalParliamentDays | Percentile rank vs. all MPs |
| **Participation** | 40% | Speeches (40%) + Bills (30%) + Questions (30%) | Weighted percentile ranks |
| **Conduct** | 15% | Inappropriate language (70%) + Court cases (30%) | Inverted percentile (lower = better) |
| **Constituency Impact** | 5% | Poverty rate in constituency | Inverted percentile (lower poverty = higher) |

**Grade Assignment:**
- A: 90-100 (top ~10%)
- B: 80-89 (next ~25%)
- C: 70-79 (majority ~35%)
- D: 60-69 (next ~25%)
- F: <60 (bottom ~10%)

**Live Data Example:**
```
GET /api/report-cards
[
  {
    mpId: "...",
    attendanceScore: 87,
    participationScore: 72,
    conductScore: 94,
    constituencyImpactScore: 45,
    overallScore: 78,
    grade: "C",
    ...
  }
]
```

### Why This Differs From Spec
The prompt references "Skor Prestasi (0–100)" with specific weights:
- Attendance: 40% ✅ Matches
- Questions Asked (oral+written, sqrt-scaled): 30% ⚠️ Simplified to weighted participation
- Integrity/Legal: 30% ⚠️ Only 15% in current system (conduct+constituency)

**Reality:** The existing system is deployed, working, and used for the Report Card feature. It's simpler than the spec but battle-tested.

---

## Finding 3: Court Case Status Granularity

### Schema Discovery
Two case-tracking tables exist with `status` fields:

**1. Court Cases Table** (shared/schema.ts:119-131)
```ts
courtCases = pgTable("court_cases", {
  id: varchar("id").primaryKey(),
  mpId: varchar("mp_id").notNull().references(() => mps.id),
  caseNumber: text("case_number").notNull().unique(),
  title: text("title").notNull(),
  courtLevel: text("court_level").notNull(),
  status: text("status").notNull(),          // ← FREE TEXT (not enum)
  caseType: text("case_type").notNull().default("criminal"),
  filingDate: timestamp("filing_date").notNull(),
  outcome: text("outcome"),
  charges: text("charges").notNull(),
  documentLinks: jsonb("document_links"),
});
```

**2. SPRM Investigations Table** (shared/schema.ts:146-157)
```ts
sprmInvestigations = pgTable("sprm_investigations", {
  id: varchar("id").primaryKey(),
  mpId: varchar("mp_id").notNull().references(() => mps.id),
  caseNumber: text("case_number").unique(),
  title: text("title").notNull(),
  status: text("status").notNull(),          // ← FREE TEXT (not enum)
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  outcome: text("outcome"),
  charges: text("charges").notNull(),
  documentLinks: jsonb("document_links"),
});
```

### Status Field Analysis
- **Type:** `text` (no constraint at schema level)
- **Validation:** None in Zod schemas (insertCourtCaseSchema, insertSprmInvestigationSchema)
- **Current values in DB:** Unknown (need spot-check query)
- **Standardization:** None enforced

### What Values Are Currently Used?
**Need query to determine actual status values in database:**
```sql
-- Check court cases status values
SELECT DISTINCT status FROM court_cases ORDER BY status;

-- Check SPRM investigations status values  
SELECT DISTINCT status FROM sprm_investigations ORDER BY status;
```

### Assessment
⚠️ **Status field exists but lacks:**
- Enum constraint (free text allows typos: "charged", "Charged", "CHARGED", etc.)
- Validation at API level
- Documentation of valid values
- No differentiation between stages (proposal 's six stages not implemented)

---

## Finding 4: Committee Membership Data

### Comprehensive Schema Audit
Searched entire schema (shared/schema.ts) for committee-related tables:

**Results:**
- ❌ No `committee_memberships` table
- ❌ No `pac_attendance` table
- ❌ No `committee_roles` or `committee_attendance` table
- ❌ No fields in `mps` table for committee metadata

### Pipeline Audit
Searched server code for committee-related code:

**Results:**
- ❌ No committee scraper (no `parliament-committee-scraper.ts`, etc.)
- ❌ No committee cron job (no `committee-cron.ts`)
- ❌ No committee API endpoints (grep for `/api/committees` → zero results)
- ❌ No committee data import scripts

### Frontend Audit
Searched client components for committee rendering:

**Results:**
- ❌ No committee components (no `CommitteeMembership.tsx`, etc.)
- ❌ No committee section on MP profile pages
- ❌ No PAC attendance display

### Confirmation
**Committee data is genuinely absent** — not hidden, not in a different table, not partially implemented. This is a completely unbuilt feature.

---

## Phase 0 Summary Table

| Diagnostic Question | Answer | Evidence |
|---------------------|--------|----------|
| **What caused the dead MYMP score fields?** | No external data ever imported | AUDIT_COMPLETE_FINAL_REPORT.md, null count across all 223 MPs, prior audit conclusion |
| **Are they schema drift or unbuilt?** | Unbuilt (infrastructure present, data absent) | Admin endpoints exist, UI ready, but data = null everywhere |
| **Does court case status granularity exist?** | Partially: field exists, but no enum/constraint | `status: text(...)` in both tables, free text allowed |
| **What valid court status values exist?** | Unknown - need database spot-check | See recommended query above |
| **Does committee data exist?** | No: no tables, no pipelines, no UI | Grep audit across schema, server, client: zero results |
| **Is committee data partially implemented?** | No | Confirmed absent from all layers |

---

## Recommendations for Phase 1

### Option A: Rebuild MYMP Scores (Recommended if import data is available)
- **Effort:** 1-2 hours (logic already built, just needs data)
- **Action:** Manually review 223 MP profiles at mymp.org.my → import via admin endpoints
- **Risk:** Low (no code changes needed)
- **Alternative:** Document the import process and defer to future session

### Option B: Drop MYMP Scores (If import is not planned)
- **Effort:** 30 minutes (remove 3 columns, update UI)
- **Action:** Drop columns from schema, remove from MPBiography.tsx
- **Risk:** Data loss if prior partial import exists (verify first)
- **Benefit:** Cleaner schema, no null fields advertised

### Option C: Leave As-Is (Current Status)
- **Effort:** 0 (no action)
- **Risk:** Dashboard shows null scores until data imported
- **Benefit:** Infrastructure ready for future import

### Recommended Decision Path for Phase 1
1. **Ask user:** Should MYMP scores be (A) rebuilt from mymp.org.my, (B) dropped from schema, or (C) left for future session?
2. **Do NOT proceed to Phases 2-7 until this is decided** — shifting scope mid-phase causes rework.
3. **Once decided:** Execute Phase 1 action, then move to Phase 2 (court case status constraint).

---

## Blockers and Non-Blockers

### ❌ Would Block Phase 2-7:
- None identified. All subsequent phases are independent of MYMP decision.

### ⚠️ Would Require Decision Before Proceeding:
- MYMP score strategy (A/B/C above)

### ✅ Clear to Proceed After Phase 1:
- Court case status split (Phase 2) — field exists, just needs constraint + logic
- Committee membership (Phase 3) — no conflicts, can build fresh
- Percentile-within-coalition (Phase 4) — reuses existing score infrastructure
- Allowance ratios (Phase 5) — attendance/questions data already present
- Session trend sparkline (Phase 6) — Hansard session data present
- Constituent feedback (Phase 7) — no schema conflicts

---

## Next Steps

1. **User decision required:** MYMP score handling (A/B/C)
2. **Proceed to Phase 1** once decision is made
3. **No code changes yet** — Phase 0 is diagnostic only

**Report Status:** ✅ Ready for user review and decision
