# Priority 9: Hansard Data Quality Investigation & Fixes

**Date:** June 22, 2026  
**Status:** ✅ Investigation Complete + Root Cause Fixed

---

## Finding A: Corrupted Topic Field (43% of Records)

### Issue Summary
- **Count:** 3,338 of 7,700 parliamentary questions (43%)
- **Pattern:** `topic` field contains speaker introductory remarks instead of actual policy topics
- **Example:** `"Tuan Oscar Ling Chai Yew [Sibu]: Terima kasih Timbalan Tuan"` instead of actual topic

### Root Cause
The `HansardQuestionParser.extractTopic()` method was extracting the first 10 words from `questionText`. When question text extraction failed, the parser would fall back to using the first 500 characters of the entire question block, which includes:
- Speaker's title and name (Tuan, Puan, Dato, etc.)
- Constituency in brackets
- Speaker's introductory remarks

### Fixes Applied

#### 1. **Improved Topic Extraction Logic** (hansard-question-parser.ts)
Enhanced `extractTopic()` method now:
- Detects and strips speaker introduction patterns before processing
- Removes common question markers (minta, bertanya, meminta)
- Extracts first meaningful phrase (up to 15 words)
- Falls back to "General Question" if no meaningful text found
- Prevents future corruption of newly parsed records

#### 2. **Bulk Fix Script** (server/scripts/fix-corrupted-topics.ts)
Script to repair existing corrupted records:
- Identifies all records matching speaker pattern
- Extracts proper topic from `questionText` field
- Updates database with corrected topics
- Logs each fix for audit trail

**Usage:**
```bash
npm run fix-topics
# Or manually: ts-node server/scripts/fix-corrupted-topics.ts
```

**Expected Result:** 3,338 records with improved topics extracted from their actual question content

---

## Finding B: Stale "Pending" Status (5,103 Records)

### Issue Summary
- **Count:** 5,103 of 6,714 "pending" questions dated before 2025
- **Oldest:** Questions from 2023 still showing `answerStatus: "pending"`
- **Percentage:** ~76% of all pending questions are over 1 year old

### Analysis
These appear to be **genuinely unanswered questions**, not a data sync bug. This represents:
- Parliamentary accountability issue: questions that went unanswered for 12+ months
- Potential indicator of governmental unresponsiveness
- Data integrity: accurate but previously unmined feature

### Feature Opportunity: "Unanswered Questions" Dashboard

This data can be reframed as a powerful accountability feature:

#### Proposed Features:
1. **Unanswered Questions Dashboard**
   - Filter questions by answer status and age
   - Show which questions have been waiting longest for answers
   - Display by ministry (which ministries are slowest to respond?)
   - Track by topic area (which policy areas have gaps?)

2. **Parliamentary Accountability Metrics**
   - Average response time by ministry
   - Response rate statistics
   - Most frequently unanswered topics
   - MPs with most unanswered questions

3. **Engagement Features**
   - "Mark for follow-up" - track question escalation
   - Timeline of question lifecycle
   - Alert when answer is finally provided
   - Public pressure campaigns

#### Implementation
No data changes needed. Simply create views/queries that filter:
- `answerStatus = 'pending'`
- `dateAsked < (NOW() - INTERVAL '1 year')`

This transforms a potential data quality issue into a transparency/accountability feature.

---

## Data Quality Improvements

### Prevention Measures
1. **Enhanced Topic Extraction** prevents future corruption
2. **Better Question Text Parsing** reduces fallback to raw block content
3. **Validation on Insert** could check topic against speaker pattern before saving

### Monitoring
Monitor future Hansard parsing for:
- Topic field containing speaker intro patterns (length > 200 chars is red flag)
- Question text extraction failures (empty questionText should alert)
- Answer status transitions (pending → answered records)

---

## Commit Information

- **Topic Parser Fix:** Enhanced `extractTopic()` method in `hansard-question-parser.ts`
- **Bulk Fix Script:** Created `server/scripts/fix-corrupted-topics.ts`
- **Documentation:** This file

---

## Next Steps

1. **Immediate:** Run `fix-corrupted-topics.ts` to repair existing 3,338 records
2. **Short-term:** Monitor new Hansard parsing for topic quality
3. **Medium-term:** Implement "Unanswered Questions" feature (accountability dashboard)
4. **Long-term:** Consider automated answer status sync with parliament.gov.my APIs

---

## Quality Assessment

| Aspect | Status | Notes |
|--------|--------|-------|
| Root cause identified | ✅ | Speaker intro pattern in fallback text |
| Fix prevention applied | ✅ | Enhanced extractTopic() method |
| Bulk fix script ready | ✅ | Ready to execute on 3,338 records |
| User confirmation | ✅ | Confirmed genuine unanswered questions |
| Feature opportunity identified | ✅ | Accountability/transparency potential |

