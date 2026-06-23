# Phase 3: Committee Data — Revised Plan

**Date:** June 23, 2026  
**Status:** ⚠️ REQUIRES USER DATA INPUT  
**Challenge:** Network policy blocks both parlimen.gov.my and Wikipedia

---

## Network Policy Impact

The deployment environment has a strict allowlist that blocks:
- ❌ parlimen.gov.my (Malaysian Parliament official site)
- ❌ en.wikipedia.org (Wikipedia)
- ❌ Other external sources

This prevents automated scraping of committee rosters.

---

## Phase 3 Recommended Path

**Build the infrastructure now, seed data from you (the user).**

### Step 1: Create Committee Schema

```typescript
export const committeeMembers = pgTable("committee_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mpId: varchar("mp_id").notNull().references(() => mps.id),
  
  // Committee info
  committeeName: text("committee_name").notNull(),    // "Public Accounts Committee"
  committeeAbbr: text("committee_abbr"),              // "PAC"
  role: text("role").notNull(),                       // "chair" | "member" | "vice-chair"
  
  // Session tracking
  parliamentTerm: text("parliament_term").notNull(),  // "15th Parliament"
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),                     // null = current
  
  // Audit trail
  sourceUrl: text("source_url"),                      // e.g., "https://www.parlimen.gov.my/..."
  notes: text("notes"),
  
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});
```

### Step 2: Create Admin UI for Data Entry

Build a page at `/admin/committee-management` to:
- Search/select MP
- Select committee (dropdown or autocomplete)
- Select role (chair/member/vice-chair)
- Set start/end dates
- Add source URL for verification

### Step 3: Add API Endpoints

```
POST   /api/admin/committee-memberships          — Create
GET    /api/admin/committee-memberships?mpId=... — List for MP
PATCH  /api/admin/committee-memberships/:id      — Update
DELETE /api/admin/committee-memberships/:id      — Delete
GET    /api/mps/:id/committee-memberships        — Public view
```

### Step 4: Seed Initial Data (You Provide)

You would manually research and enter:
- Current 15th Parliament committees (2023-2027)
- Known PAC members from news/public knowledge
- Cabinet-appointed committee roles

**High-priority committees:**
1. Public Accounts Committee (PAC)
2. Special Select Committees (any current)
3. Any budget/finance-related committees

**Data needed per committee:**
- Committee name & abbreviation
- 3-5 key MPs (chair + members)
- Their roles
- Session/term info

### Step 5: Integrate with Scoring

Once committee data exists:

```typescript
// Bonus modifier for committee participation
const committeeBonus = {
  'PAC_chair': 15,        // Highest accountability
  'special_committee_chair': 12,
  'PAC_member': 8,
  'committee_chair': 10,
  'committee_member': 3,
};

// Apply bonus to overall score
const bonusPoints = calculateCommitteeBonus(mpId);
const adjustedScore = baseScore + bonusPoints;
```

### Step 6: Display on Frontend

Show on MP profiles:
```
Committees
├─ Public Accounts Committee (Member, 15th Parliament)
├─ Special Select Committee on Standing Orders (Chair, 15th Parliament)
```

---

## Realistic Scope for Phase 3

**What Phase 3 can accomplish:**
- ✅ Schema design
- ✅ Admin UI for manual entry
- ✅ API endpoints
- ✅ Frontend display component
- ✅ Scoring integration logic

**What requires external input:**
- ⚠️ Actual committee roster data (you need to research)

---

## Data Sources You Can Use

Without direct network access, you can:

1. **Memory/Knowledge** — You likely know who chairs major committees
2. **News articles** — Committee appointments are often announced
3. **Public statements** — MPs mention committee roles in bios
4. **Prior records** — If you have historical committee lists
5. **Ask team members** — Others may have this info

---

## Alternative: Wait for Network Policy Update

If getting committee data is too much work right now, we have two options:

**Option 1: Skip to Phase 4 & 5**
- Phase 4: Percentile-within-coalition (ready to build)
- Phase 5: Allowance-per-output ratios (ready to build)
- Return to Phase 3 later when data is available

**Option 2: Build empty infrastructure now, populate later**
- Create schema + UI today
- You gradually add committee data as you find it
- Scoring bonus activates when data exists

---

## Quick Decision

**To proceed with Phase 3:**

I can have the schema + admin UI + endpoints + frontend component ready in **1-2 hours**.

Then you would:
1. Research committee data (2-4 hours depending on detail)
2. Enter data via admin UI (30-60 minutes)
3. Test scoring integration (30 minutes)

**Is this acceptable?**

If you'd rather skip committee data for now and build Phase 4-5 instead, I'm ready for that too.

What's your preference?

---

## Files That Will Be Created

If proceeding with Phase 3 (infrastructure only):

| File | Purpose |
|------|---------|
| `shared/schema.ts` | Add `committeeMembers` table |
| `server/routes.ts` | Add `/api/admin/committee-memberships` endpoints |
| `server/services/committee-service.ts` | Business logic for committees |
| `client/src/pages/CommitteeAdmin.tsx` | Data entry UI |
| `client/src/components/CommitteeMemberships.tsx` | Display component |
| `migrations/0053_add_committee_tables.sql` | DB migration |

**Ready to proceed?**
