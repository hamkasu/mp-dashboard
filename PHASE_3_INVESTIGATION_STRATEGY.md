# Phase 3 Investigation: Committee Membership & PAC Attendance

**Date:** June 23, 2026  
**Status:** 🔍 SOURCE INVESTIGATION IN PROGRESS  
**Branch:** `claude/admiring-feynman-80je73`

---

## Challenge: Network Access Restrictions

**Issue:** The deployment environment has restricted outbound network access. Direct scraping of parlimen.gov.my is blocked.

```
Error: Host not in allowlist: www.parlimen.gov.my
```

This aligns with the spec note that "parlimen.gov.my has previously blocked automated scraping via robots.txt for some endpoints."

---

## Phase 3 Strategy: Three Approaches

### **Option A: Manual Data Entry (Recommended for Phase 3.0)**

Given the network restrictions and the need for data accuracy, **manual committee data entry is the most practical initial approach**.

**Steps:**
1. Create `committee_memberships` schema with fields for committee name, role, session
2. Build admin UI to input committee data
3. MPs can be matched via Hansard references or Wikipedia

**Pros:**
- ✅ Accurate data (no scraping errors)
- ✅ Auditable (track who entered what)
- ✅ Can include nuance (e.g., "Chair" vs "Member")
- ✅ Works with network restrictions

**Cons:**
- ⚠️ Manual effort (223 MPs × ~2 minutes per committee assignment)
- ⚠️ Requires someone to research committee listings

**Effort:** 4-6 hours for initial population (or spread across time)

---

### **Option B: Hybrid Approach (Recommended for Phase 3+)**

Use local Wikipedia data combined with Hansard references.

**Steps:**
1. Check if Wikipedia has Malaysian parliamentary committee data (likely structured table)
2. Reference Hansard transcripts where MPs are identified speaking "as member of PAC" or similar
3. Combine both sources for validation

**Pros:**
- ✅ Partially automated (Wikipedia scrape if available)
- ✅ Cross-validated with Hansard references
- ✅ Better than no data

**Cons:**
- ⚠️ Wikipedia may not have complete 2022-2026 data
- ⚠️ Hansard references are sparse (not every session)
- ⚠️ Still requires manual follow-up

**Effort:** 2-3 hours for setup + periodic updates

---

### **Option C: External Data Source + Future Integration**

Wait for:
- Network policy expansion
- Third-party API for Malaysian parliamentary data
- User submissions of committee rosters

**Pros:**
- ✅ Minimal work now
- ✅ Higher quality future data

**Cons:**
- ❌ No feature in Phase 3
- ❌ User experience gap (scores missing committee modifier)

---

## Recommendation: **Option A (Manual) → Option B (Hybrid)**

**Phase 3.0 (Now):**
1. Build schema and admin UI for manual entry
2. Populate with leadership committees (PAC, Special, Select committees) only
3. Get data from public sources (parliament website via browser, Wikipedia)

**Phase 3.1+ (Future):**
1. Add Hansard scraper to identify PAC members from speech context
2. Enhance with Wikipedia structured data
3. Crowdsource missing data via admin interface

---

## What We Need From You

To proceed with Phase 3, I need a decision:

**A) Manual Entry First (Recommended)**
- I'll build schema + admin UI
- You (or team) manually research and enter committee data
- Expected: 1-2 hours to set up UI, 4-6 hours to populate data

**B) Hybrid with Wikipedia**
- Requires checking if Wikipedia has structured committee data
- I'll build scraper + merge logic
- Still needs manual cross-validation

**C) Skip Committee Data for Now**
- Focus on Phase 4 (percentiles) and Phase 5 (allowance ratios) instead
- Return to committee data when network policy allows or data source improves

**Which approach would you prefer?**

---

## Committee Data Details (For Any Approach)

### Schema Design (When Built)

```typescript
export const committeeMembers = pgTable("committee_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mpId: varchar("mp_id").notNull().references(() => mps.id),
  
  // Committee metadata
  committeeName: text("committee_name").notNull(),     // e.g., "Public Accounts Committee"
  committeeAbbr: text("committee_abbr"),               // e.g., "PAC"
  role: text("role").notNull(),                        // "chair", "member", "vice-chair"
  
  // Session/timing
  parliamentTerm: text("parliament_term").notNull(),   // "15th Parliament", "14th Parliament"
  startDate: timestamp("start_date").notNull(),        // When MP joined
  endDate: timestamp("end_date"),                      // When MP left (null if current)
  
  // Audit
  sourceUrl: text("source_url"),                       // Where data came from
  verifiedBy: varchar("verified_by"),                  // Admin who verified
  verifiedAt: timestamp("verified_at"),
  notes: text("notes"),                                // Any caveats
  
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});
```

### Scoring Integration Plan

Once data exists, the scoring would work like:

```typescript
// Committee participation bonus (instead of diluting existing scores)
// Apply bonus to those with higher accountability burden

const isCommitteeMember = committeeCount > 0;
const isPACMember = committees.some(c => c.abbr === 'PAC');
const isCommitteeChair = committees.some(c => c.role === 'chair');

// Bonus modifier: +5-15 points depending on role
const committeeBonusPoints = 
  isCommitteeChair ? 15 :  // High accountability
  isPACMember ? 10 :       // PAC is highest-profile
  isCommitteeMember ? 5 :  // Basic member
  0;

// Apply to overall score (not recalculating 40/30/30)
const adjustedOverallScore = baseScore + committeeBonusPoints;
```

This preserves the existing methodology (attendance 40%, participation 30%, conduct 20%, constituency 10%) while adding a bonus for committee work.

---

## Next Steps (Awaiting Your Decision)

Once you choose A, B, or C above:

**If A (Manual):** I'll build the schema and admin UI today
**If B (Hybrid):** I'll investigate Wikipedia availability  
**If C (Skip):** I'll move to Phase 4 (percentiles) or Phase 5 (allowance ratios)

**What's your preference?**
