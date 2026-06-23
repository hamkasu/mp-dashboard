# Phase 5: Publish to Search Index

## Overview

Once a tag is marked `auto_published`, `approved`, or `edited`, it becomes eligible for the paid Hansard search feature. **Rejected tags must NEVER surface in search results or exports.**

## Implementation Status

### Current Search Infrastructure

The project has existing Hansard search/query paths in:
- `server/routes.ts` - API endpoints for Hansard data retrieval
- `client/src/pages/HansardSearch.tsx` - Search UI (if exists)

### Verification Needed (Confirm in your codebase)

Before Phase 5 is considered complete, verify that:

1. **Any query that feeds search results filters out rejected tags:**
   ```sql
   -- DO: Include only published/approved/edited tags
   SELECT h.* FROM hansard_tags h 
   WHERE h.review_status IN ('auto_published', 'approved', 'edited')
   
   -- DON'T: Include rejected tags
   SELECT * FROM hansard_tags h 
   WHERE h.review_status != 'rejected'  -- WRONG: allows pending_review
   ```

2. **Any export endpoint (CSV, JSON, API) enforces the same filter:**
   - If a user exports Hansard data, they get only approved/published tags
   - Pending and rejected tags are excluded

3. **Database constraints (optional but recommended):**
   - Create views for public-facing queries that automatically exclude rejected:
     ```sql
     CREATE VIEW hansard_tags_published AS
     SELECT * FROM hansard_tags 
     WHERE review_status IN ('auto_published', 'approved', 'edited');
     ```

## Data Migration Strategy

### For Existing Rejected Tags

If tags were already rejected before this pipeline (legacy data):

1. **Audit:** Query for any search indexes or caches that may include rejected tags
   ```sql
   SELECT COUNT(*) FROM hansard_tags WHERE review_status = 'rejected';
   SELECT COUNT(*) FROM hansard_tags WHERE review_status = 'pending_review';
   ```

2. **Reindex:** If there's a search index (Elasticsearch, Algolia, etc.), rebuild it with:
   ```sql
   INSERT INTO search_index SELECT * FROM hansard_tags_published;
   ```

3. **Cache invalidation:** Clear any search result caches

## Query Patterns to Audit

### Search Routes

Search for any code that retrieves hansard_tags without filtering review_status:

```bash
grep -r "hansard_tags" server/ --include="*.ts" \
  | grep -v "review_status" \
  | grep -v "rejected"
```

Each result should be audited:
- If it's public-facing → add filter: `review_status IN ('auto_published', 'approved', 'edited')`
- If it's admin-only → can allow pending_review and other statuses

### Examples of Queries to Fix

**BEFORE (Unsafe):**
```ts
const results = await db.select().from(hansardTags).where(eq(hansardTags.speechId, speechId));
```

**AFTER (Safe):**
```ts
const results = await db
  .select()
  .from(hansardTags)
  .where(
    and(
      eq(hansardTags.speechId, speechId),
      inArray(hansardTags.reviewStatus, ['auto_published', 'approved', 'edited'])
    )
  );
```

## Testing Checklist

- [ ] Search for a topic that was tagged and approved → result appears in search
- [ ] Search for a topic that was tagged and rejected → result does NOT appear
- [ ] Tag is manually rejected via review queue → disappears from search within 1 second (or refresh cache)
- [ ] Export Hansard data as CSV/JSON → no rejected tags included
- [ ] Search API returns only published tags (no pending_review visible to users)
- [ ] Admin query endpoint can still see pending_review tags (for admin purposes)

## Post-Deployment Audit

After deploying Phase 5, run:

```sql
-- Check for any search leaks
SELECT review_status, COUNT(*) as count 
FROM hansard_tags 
GROUP BY review_status;

-- Verify no rejected tags are returned by public search
-- (depends on your search implementation)
SELECT COUNT(*) as rejected_in_results 
FROM [your_search_results_table] 
WHERE review_status = 'rejected';
```

## Related Docs

- See `PHASE_0_INVESTIGATION_REPORT.md` for stack details
- See `hansard-review-routes.ts` for tag status update endpoints
- See `shared/schema.ts` for review_status enum definition

---

**Phase 5 Status:** Awaiting integration into existing search infrastructure.
