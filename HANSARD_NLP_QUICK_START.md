# Hansard NLP Tagging Pipeline — Quick Start Guide

## Overview

This is a complete 5-phase LLM-powered tagging system for Malaysian parliamentary Hansard speeches. It extracts individual speech turns from session transcripts, tags them with topics/sentiment using Anthropic Claude, routes them through a confidence-based review workflow, and integrates approved tags into the searchable Hansard index.

## Prerequisites

- Node.js + npm + TypeScript
- Postgres database (with existing `hansardRecords` table)
- `ANTHROPIC_API_KEY` environment variable set
- At least one Hansard session in database (for testing)

## Quick Start (5 minutes)

### 1. Set API Key
```bash
export ANTHROPIC_API_KEY=sk-your-key-here
```

### 2. Run Migration
```bash
npm run db:migrate
```
Creates: `hansard_speeches`, `hansard_tags`, `hansard_entities`, `hansard_topic_vocabulary`

### 3. Extract Speech Turns
```bash
npm run extract-hansard-speeches
```
Parses `hansardRecords.transcript` → individual `hansard_speeches` rows

### 4. Tag Speeches
```bash
npm run tag-hansard-speeches 50  # Start with 50 speeches
```
Calls Anthropic Claude → creates `hansard_tags` with confidence scores

### 5. Review Queue (Web UI)
```bash
npm run dev  # Start dev server
```
Navigate to `/admin/hansard/review-queue` → approve/reject/edit tags

## Command Reference

### Extraction & Tagging
| Command | Purpose |
|---------|---------|
| `npm run extract-hansard-speeches` | Parse transcripts → speech turns |
| `npm run tag-hansard-speeches [N]` | Tag N speeches using Anthropic (default 50) |

### Calibration (Optional)
| Command | Purpose |
|---------|---------|
| `npm run calibration-sample [N]` | Sample N tagged speeches for manual review |
| `npm run calibration-report <csv>` | Analyze human judgments → recommend thresholds |

### Schema
| Command | Purpose |
|---------|---------|
| `npm run db:migrate` | Apply migrations (including Phase 1 schema) |

### Manual Review (API)
```bash
# Get pending tags
curl http://localhost:3000/admin/hansard/review-queue

# Approve a tag
curl -X POST http://localhost:3000/admin/hansard/review/[TAG_ID]/approve

# Reject a tag
curl -X POST http://localhost:3000/admin/hansard/review/[TAG_ID]/reject

# Edit a tag
curl -X POST -H "Content-Type: application/json" \
  -d '{"tagValue":"new_value"}' \
  http://localhost:3000/admin/hansard/review/[TAG_ID]/edit
```

## Data Flow

```
hansardRecords (full session transcript)
        ↓
extract-hansard-speeches
        ↓
hansard_speeches (per-turn speech text with character offsets)
        ↓
tag-hansard-speeches (Anthropic Claude)
        ↓
hansard_tags (topic/sentiment with confidence 0-100)
        ↓
Confidence Routing:
  ├─ >= 75 → auto_published (searchable immediately)
  ├─ 45-74 → pending_review (needs human approval)
  └─ < 45 → discarded (not inserted)
        ↓
Review Queue (admin UI or API)
        ↓
approved/rejected tags
        ↓
Search Index (only published/approved/edited visible)
```

## Configuration

### Confidence Thresholds (Tunable)

Edit in `scripts/hansard-tag-speeches.ts`:
```ts
if (topic.confidence >= 75) {
  reviewStatus = 'auto_published';  // ← Adjust this
} else if (topic.confidence >= 45) {
  reviewStatus = 'pending_review';  // ← Or this
}
```

Run calibration to find optimal values for your domain:
```bash
npm run calibration-sample 300
# [Manual review of CSV in spreadsheet app]
npm run calibration-report hansard-calibration-sample-*.csv
```

### Topic Vocabulary

Seed vocabulary (25 Malaysian parliamentary topics) is auto-inserted during migration.

Add more:
```sql
INSERT INTO hansard_topic_vocabulary (tag_slug, display_label, status)
VALUES ('gender_equality', 'Gender Equality & Women Rights', 'active');
```

Model can propose new tags (marked `is_new_tag=true`) → inserted with `status='pending_review'` → manually approved/merged into vocabulary.

## API Response Format

### Review Queue Item
```json
{
  "tagId": "uuid",
  "speechId": "uuid",
  "mpName": "John Doe",
  "constituency": "Petaling Jaya",
  "sittingDate": "2026-06-20",
  "tagType": "topic",
  "tagValue": "healthcare",
  "confidence": 82,
  "evidenceQuote": "...excerpt from speech...",
  "reviewFlagReason": null
}
```

### Tag Object (Database)
```json
{
  "id": "uuid",
  "speechId": "uuid",
  "tagType": "topic",
  "tagValue": "education",
  "confidence": 75,
  "evidenceQuote": "...quote...",
  "isNewTag": false,
  "reviewStatus": "auto_published",
  "reviewFlagReason": null,
  "createdAt": "2026-06-23T10:30:00Z"
}
```

## Database Queries

### Tagging Progress
```sql
SELECT 
  review_status, 
  COUNT(*) as count,
  AVG(confidence) as avg_confidence
FROM hansard_tags
GROUP BY review_status;
```

### Find Untagged Speeches
```sql
SELECT COUNT(*) FROM hansard_speeches hs
WHERE NOT EXISTS (
  SELECT 1 FROM hansard_tags ht WHERE ht.speech_id = hs.id
);
```

### Export Approved Tags (for search index)
```sql
SELECT 
  ht.speech_id,
  hs.mp_id,
  ht.tag_value,
  ht.tag_type,
  ht.confidence,
  ht.created_at
FROM hansard_tags ht
JOIN hansard_speeches hs ON hs.id = ht.speech_id
WHERE ht.review_status IN ('auto_published', 'approved', 'edited')
ORDER BY ht.confidence DESC;
```

## Troubleshooting

### Issue: "No speeches extracted"
**Check:**
```sql
SELECT COUNT(*) FROM hansard_records;  -- Should be > 0
SELECT COUNT(*) FROM hansard_speeches; -- Should be > 0 after extraction
```

### Issue: "ANTHROPIC_API_KEY not set"
**Fix:**
```bash
export ANTHROPIC_API_KEY=sk-...
# Verify:
echo $ANTHROPIC_API_KEY
```

### Issue: "Tagging script times out"
**Solution:** Run with smaller batch:
```bash
npm run tag-hansard-speeches 10  # Smaller batch size
# Or increase Anthropic API timeout in hansard-anthropic-tagger.ts
```

### Issue: "Review queue shows 0 items"
**Check:**
```sql
SELECT COUNT(*) FROM hansard_tags WHERE review_status = 'pending_review';
-- If 0: run tagging with speeches in 45-74 confidence range
```

## Performance Notes

- **Extraction:** ~100 speeches/min (depends on transcript length)
- **Tagging:** ~1 speech/2s (rate-limited, includes API call + DB write)
- **Batch size:** Default 50; adjust in scripts
- **Production:** Use Anthropic Batch API for 1000+ speeches

## File Structure

```
├── migrations/
│   └── 0057_add_hansard_nlp_tables.sql     # Phase 1 schema
├── server/
│   ├── hansard-anthropic-tagger.ts         # Phase 2 tagging service
│   ├── hansard-review-routes.ts            # Phase 4 API routes
│   └── ... (existing)
├── scripts/
│   ├── extract-hansard-speeches.ts         # Phase 2a
│   ├── hansard-tag-speeches.ts             # Phase 2b
│   ├── hansard-calibration-sample.ts       # Phase 3a
│   └── hansard-calibration-report.ts       # Phase 3c
├── client/src/components/
│   └── HansardReviewQueue.tsx              # Phase 4 UI
├── shared/
│   └── schema.ts                           # Updated with new tables
└── HANSARD_NLP_*.md                        # Documentation
```

## Next Steps

1. **Test locally:**
   ```bash
   npm run extract-hansard-speeches
   npm run tag-hansard-speeches 10
   ```

2. **Manual calibration (if needed):**
   ```bash
   npm run calibration-sample 250
   # [Review CSV in spreadsheet, fill human_judgment column]
   npm run calibration-report hansard-calibration-sample-*.csv
   ```

3. **Deploy to staging** and test review queue UI

4. **Audit search integration** (Phase 5):
   - Verify rejected tags don't appear in search
   - Test approved/edited tags are searchable

5. **Full production run:**
   ```bash
   npm run tag-hansard-speeches 500  # or higher
   ```

## Support

- See `HANSARD_NLP_VERIFICATION_CHECKLIST.md` for detailed testing
- See `HANSARD_NLP_PIPELINE_PHASE5.md` for search index integration
- Check `server/hansard-anthropic-tagger.ts` for system prompt details
- Check `shared/schema.ts` for data model

---

**Last updated:** June 23, 2026  
**Status:** Ready for deployment
