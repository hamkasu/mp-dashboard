# Hansard NLP Tagging Pipeline — Verification Checklist

**Status:** Implementation Complete (Phases 0-5)  
**Date:** June 23, 2026  
**Branch:** `claude/awesome-shannon-7c0x0n`

---

## Phase 0: Investigation ✅

- [x] Tech stack confirmed: Node.js + Express + TypeScript + Postgres + Drizzle
- [x] Hansard raw data exists: `hansardRecords` table with full session transcripts
- [x] Speech turn extraction needed: decided to build segmentation from transcripts
- [x] Anthropic API integration: decided to use claude-sonnet-4-6
- [x] ANTHROPIC_API_KEY: environment variable available (not hardcoded)
- [x] Dependencies: `@anthropic-ai/sdk` installed
- [x] Migration path clear: numbered SQL migrations in place

**Blockers Resolved:** Both per-turn extraction and AI provider decisions made.

---

## Phase 1: Schema ✅

### Database Migration
- [ ] Run migration: `npm run db:migrate`
  ```bash
  # Applies 0057_add_hansard_nlp_tables.sql
  ```

### Tables Created
- [x] `hansard_speeches` — individual speech turns with character offsets
- [x] `hansard_tags` — topic/sentiment tags with confidence + review_status
- [x] `hansard_entities` — extracted entities (org, policy, place, statistic)
- [x] `hansard_topic_vocabulary` — controlled vocabulary (25-term seed)
- [x] Indexes created on: hansard_record_id, mp_id, review_status, confidence, created_at

### Schema Validation
- [ ] Verify table creation:
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_name LIKE 'hansard_%';
  ```
  Should return: hansard_speeches, hansard_tags, hansard_entities, hansard_topic_vocabulary

- [ ] Verify vocabulary seed:
  ```sql
  SELECT COUNT(*) FROM hansard_topic_vocabulary WHERE status = 'active';
  ```
  Should return: 25

- [ ] Check column types:
  ```sql
  SELECT column_name, data_type FROM information_schema.columns 
  WHERE table_name = 'hansard_tags' AND column_name = 'review_status';
  ```

---

## Phase 2: Tagging Pipeline ✅

### Step 2a: Extract Speech Turns

**Test:** Run speech extraction on existing hansardRecords:
```bash
npm run extract-hansard-speeches
```

**Verify:**
- [ ] Extraction completes without errors
- [ ] Log output shows: "Extracted N speeches from session"
- [ ] Database query shows:
  ```sql
  SELECT COUNT(*) as total_speeches FROM hansard_speeches;
  SELECT COUNT(DISTINCT hansard_record_id) as records_processed FROM hansard_speeches;
  ```
  Should have: speeches > 0, records_processed > 0

- [ ] Spot-check a speech:
  ```sql
  SELECT id, mp_id, speech_text, created_at FROM hansard_speeches LIMIT 1;
  ```
  Should show: proper speech text, valid UUID for mp_id, recent timestamp

- [ ] Idempotency test — run again:
  ```bash
  npm run extract-hansard-speeches
  ```
  Should skip already-processed records (no duplicates)

### Step 2b: Tag Speeches

**Test:** Run tagging pipeline on extracted speeches:
```bash
npm run tag-hansard-speeches 10  # Start with 10 for smoke test
```

**Verify:**
- [ ] Tagging completes without errors
- [ ] Log output shows progress and final stats:
  - Total processed
  - Auto-published count
  - Pending review count
  - Discarded count (low confidence)
  - New vocabulary terms created

- [ ] Database check — tags exist:
  ```sql
  SELECT COUNT(*) as total_tags FROM hansard_tags;
  SELECT review_status, COUNT(*) FROM hansard_tags GROUP BY review_status;
  ```
  Should show: some auto_published, some pending_review

- [ ] Confidence routing working:
  ```sql
  -- >= 75 should be auto_published
  SELECT COUNT(*) FROM hansard_tags WHERE confidence >= 75 AND review_status = 'auto_published';
  
  -- 45-74 should be pending_review
  SELECT COUNT(*) FROM hansard_tags WHERE confidence BETWEEN 45 AND 74 AND review_status = 'pending_review';
  
  -- < 45 should not exist (discarded)
  SELECT COUNT(*) FROM hansard_tags WHERE confidence < 45;
  ```

- [ ] Anthropic API call validation:
  - Check logs for Claude API responses
  - Verify tool_choice='tag_hansard_speech' is being used
  - Confirm structured extraction is working

- [ ] New vocabulary insertion:
  ```sql
  SELECT COUNT(*) FROM hansard_topic_vocabulary WHERE status = 'pending_review';
  ```
  Should show newly proposed tags if model found new topics

### Example Valid Tag States

**Auto-published topic (confidence >= 75):**
```json
{
  "id": "uuid",
  "speechId": "uuid",
  "tagType": "topic",
  "tagValue": "healthcare",
  "confidence": 82,
  "isNewTag": false,
  "reviewStatus": "auto_published",
  "reviewFlagReason": null
}
```

**Pending review sentiment (45-74 confidence):**
```json
{
  "id": "uuid",
  "speechId": "uuid",
  "tagType": "sentiment",
  "tagValue": "critical",
  "confidence": 58,
  "targetType": "government_policy",
  "targetEntity": null,
  "reviewStatus": "pending_review",
  "reviewFlagReason": "criticizes government approach without naming specific minister"
}
```

---

## Phase 3: Calibration ✅

### Step 3a: Generate Sample

**Test:** Create calibration sample across confidence spectrum:
```bash
npm run calibration-sample 250
```

**Verify:**
- [ ] CSV file created: `hansard-calibration-sample-YYYY-MM-DD.csv`
- [ ] File has header: `speech_id,mp_name,sitting_date,...,human_judgment`
- [ ] Stratified sampling:
  ```bash
  # Count records by confidence band in CSV
  grep -v "^speech_id" hansard-calibration-sample-*.csv | \
    awk -F',' '{print $7}' | sort | uniq -c
  ```
  Should show: most items in 45-69 range (oversampled)

- [ ] Row count approximately 250 (or requested amount)
- [ ] Evidence quotes are populated (not null)

### Step 3b: Manual Review

**Action (Requires Human Input):**
1. Open the generated CSV in a spreadsheet app (Excel, Google Sheets)
2. Review each row's speech excerpt and proposed tag
3. Fill in `human_judgment` column:
   - `agree` — model tag is correct
   - `disagree` — model tag is incorrect
   - `partial` — partially correct or needs refinement

**Goal:** Evaluate ~250 items to test model accuracy by confidence band.

### Step 3c: Generate Report

**Test:** After filling in judgments, generate report:
```bash
npm run calibration-report hansard-calibration-sample-2026-06-23.csv
```

**Verify:**
- [ ] Report generated: `hansard-calibration-report-YYYY-MM-DD.md`
- [ ] Report contains:
  - Accuracy by confidence band (full agreement %)
  - Accuracy including partial (partial agreement %)
  - Recommended threshold adjustments
  - Rationale for recommendations

- [ ] Example good report output:
  ```
  Band 80-89: 18 total, 15 agree (83%), 2 partial (11%) → Accuracy 83%
  Band 45-59: 22 total, 10 agree (45%), 8 partial (36%) → Accuracy 81% with partial
  
  RECOMMENDATION: Current 75/45 thresholds appear well-calibrated
  ```

- [ ] Edge case: if a band has <60% accuracy, report suggests higher threshold

---

## Phase 4: Review Queue ✅

### Backend Routes

**Verify API endpoints exist:**
```bash
# Check if routes are registered in server/index.ts
grep -n "setupHansardReviewRoutes" server/index.ts
```

Should show: routes are imported and initialized.

### Test Endpoints

**Setup:** Create a test admin session (or use existing admin account)

**Test 4a: GET /admin/hansard/review-queue**
```bash
curl -H "Cookie: [your-session-cookie]" \
  'http://localhost:3000/admin/hansard/review-queue?sortBy=confidence_asc&filterBy=all'
```

**Verify:**
- [ ] Returns 200 OK
- [ ] Response includes: `items` (array), `total` (count), `sortBy`, `filterBy`
- [ ] Each item has: tagId, speechId, mpName, sittingDate, confidence, evidenceQuote
- [ ] Items sorted by confidence ascending (lowest first)
- [ ] No rejected tags in response

**Test 4b: GET /admin/hansard/review/<speech_id>/full-text**
```bash
curl -H "Cookie: [your-session-cookie]" \
  'http://localhost:3000/admin/hansard/review/[SPEECH_ID]/full-text'
```

**Verify:**
- [ ] Returns 200 OK with `{ speechText: "..." }`
- [ ] Speech text is not truncated
- [ ] Returns 404 for non-existent speech

**Test 4c: POST /admin/hansard/review/<tag_id>/approve**
```bash
curl -X POST -H "Cookie: [session]" \
  'http://localhost:3000/admin/hansard/review/[TAG_ID]/approve'
```

**Verify:**
- [ ] Returns 200 with `{ success: true }`
- [ ] Tag in DB now has:
  - `review_status = 'approved'`
  - `reviewed_at = [current timestamp]`
  - `reviewed_by = [admin user id]`

**Test 4d: POST /admin/hansard/review/<tag_id>/reject**
```bash
curl -X POST \
  'http://localhost:3000/admin/hansard/review/[TAG_ID]/reject'
```

**Verify:**
- [ ] Returns 200 with `{ success: true }`
- [ ] Tag now has `review_status = 'rejected'`

**Test 4e: POST /admin/hansard/review/<tag_id>/edit**
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"tagValue":"new_topic"}' \
  'http://localhost:3000/admin/hansard/review/[TAG_ID]/edit'
```

**Verify:**
- [ ] Returns 200
- [ ] Tag updated: `review_status = 'edited'`, `tag_value = 'new_topic'`

**Test 4f: POST /admin/hansard/review/bulk-approve**
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"tagIds":["id1","id2","id3"]}' \
  'http://localhost:3000/admin/hansard/review/bulk-approve'
```

**Verify:**
- [ ] Returns 200 with `{ success: true, message: "Approved 3 tags" }`
- [ ] All 3 tags now have `review_status = 'approved'`

### Frontend Component

**Verify file exists:**
- [ ] `client/src/components/HansardReviewQueue.tsx`

**Manual UI Test (if app is running):**
1. Navigate to admin panel
2. Look for "Hansard Review Queue" page
3. [ ] Page loads without errors
4. [ ] Shows pending review queue items (if any exist)
5. [ ] Sort dropdown works (confidence asc/desc, date)
6. [ ] Filter dropdown works (all, topics, sentiment)
7. [ ] Approve/Reject buttons functional
8. [ ] Edit button opens inline editor (for topics)
9. [ ] "View full speech" expands/collapses
10. [ ] "Approve similar" button works for topic-only items
11. [ ] Review count increments as items are reviewed

---

## Phase 5: Search Integration ✅

**See:** `HANSARD_NLP_PIPELINE_PHASE5.md`

### Checklist

- [ ] Any public-facing Hansard search filters out rejected tags:
  ```sql
  WHERE review_status IN ('auto_published', 'approved', 'edited')
  ```

- [ ] Any Hansard data export excludes rejected tags
- [ ] Admin endpoints can still see pending_review tags (for management)
- [ ] Test: Tag something, approve it → appears in search
- [ ] Test: Tag something, reject it → does NOT appear in search
- [ ] Test: Change tag status from approved → rejected → disappears from search

---

## End-to-End Workflow Test

**Complete flow from speech extraction to search visibility:**

```bash
# 1. Run migration
npm run db:migrate

# 2. Extract speeches from existing hansardRecords
npm run extract-hansard-speeches

# 3. Tag speeches (start small)
npm run tag-hansard-speeches 20

# 4. Review queue: Approve some, reject some
# (Via curl API calls or UI)

# 5. Verify: Approved tags appear in search, rejected tags don't
SELECT * FROM hansard_tags WHERE review_status = 'approved';
SELECT * FROM hansard_tags WHERE review_status = 'rejected';

# 6. Calibration (optional): Generate sample & report
npm run calibration-sample 100
npm run calibration-report hansard-calibration-sample-*.csv
```

**Expected outcome:** Clean data flow from raw transcript → individual speeches → tagged with confidence → human-reviewed → searchable index.

---

## Known Limitations & Future Work

1. **Speech Expansion:** Borderline speeches not yet implemented in review UI. Can be added via full-text modal.
2. **Batch API:** This implementation uses synchronous API calls (rate-limited). For production backfills >1000 speeches, consider Anthropic Batch API.
3. **Search Integration:** Phase 5 requires auditing existing search routes — not automated here.
4. **Language Detection:** `primary_language` field is model-inferred, not validated against actual text.
5. **Concurrent Reviews:** No multi-reviewer auditing — scope is intentionally solo reviewer only.

---

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| `ANTHROPIC_API_KEY not set` | Set env var: `export ANTHROPIC_API_KEY=sk-...` |
| `Migration fails: table already exists` | Safe to ignore; migration includes `IF NOT EXISTS` |
| `No speeches extracted` | Verify hansardRecords has data: `SELECT COUNT(*) FROM hansard_records;` |
| `Tagging fails: tool response invalid` | Check Anthropic API status; model may be overloaded. Retry with exponential backoff. |
| `Review queue shows 0 items` | Check: `SELECT COUNT(*) FROM hansard_tags WHERE review_status = 'pending_review';` |
| `Calibration report shows 0% accuracy` | Verify CSV has `human_judgment` column filled (not empty) |

---

## Sign-Off

- [ ] Phase 0 investigation complete ✅
- [ ] Phase 1 schema deployed
- [ ] Phase 2 tagging pipeline working
- [ ] Phase 3 calibration scripts tested
- [ ] Phase 4 review queue functional
- [ ] Phase 5 search integration scoped
- [ ] No destructive operations run on production data
- [ ] All code committed to `claude/awesome-shannon-7c0x0n` branch

**Ready for:** Deployment to staging → manual testing → production rollout.

---

*Last updated: June 23, 2026*  
*Generated by: Claude Haiku 4.5*
