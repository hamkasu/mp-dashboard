# Priority 1: API Performance Optimization - COMPLETE ✅

**Status:** Implementation Complete  
**Testing:** Ready for verification  
**Expected Impact:** 80-90% latency reduction

---

## Problem Summary

### Before Optimization:
- **Latency:** 4.5-5.6 seconds per request
- **Root Cause:** Classic N+1 anti-pattern
- **Pattern:** 
  - Fetch all 223 MPs
  - Fetch all Hansard records (potentially thousands)
  - For EACH of 223 MPs, filter through ALL Hansard records
  - Total iterations: 223 × (hansard record count)

### Before vs After Complexity:
```
BEFORE: O(n × m)  where n=223 MPs, m=thousands of Hansard records
        = potentially millions of object comparisons per request

AFTER:  O(n + m)  single pass through hansard to build indexes
        = only 223 + m iterations
```

---

## Changes Made

### 1. ✅ Collapsed N+1 Query Pattern

**File:** `server/routes.ts` - `/api/mps` endpoint (line 646)

**Implementation:**
- Pre-build index maps of MP sworn-in dates: O(n)
- Initialize attendance statistics map for all MPs: O(n)
- Single-pass through hansard records: O(m)
- Build all attendance data in one loop instead of 223 separate filters

**Code Pattern:**
```typescript
// BEFORE: For each MP (loop 223 times)
for (const mp of mps) {
  // Filter through ALL hansard records for this MP
  const relevant = hansardRecords.filter(r => r.dateMatches && r.includes(mp.id))
  // Calculate attendance by filtering again
  const attended = relevant.filter(r => ...)
}

// AFTER: Single pass through hansard
for (const record of hansardRecords) {
  // Process ALL MPs mentioned in this record once
  for (const mpId of record.attendedMpIds) {
    stats.get(mpId).attended++
  }
}
```

### 2. ✅ In-Memory Caching Layer

**File:** `server/routes.ts` - `/api/mps` endpoint

**Features:**
- Cache scope: Module-level (survives multiple requests)
- TTL: 10 minutes (600,000 ms)
- Header: `Cache-Control: public, max-age=600`
- Debug header: `X-Cache: HIT/MISS` for monitoring

**Cache Behavior:**
```
Request 1 (T=0s):     Database query → Calculate → Cache → Response (500-800ms)
                                                           X-Cache: MISS

Request 2 (T=5s):     Cache HIT → Response (< 10ms)
                                  X-Cache: HIT

Request 3 (T=15min):  Cache expired → Database query → Calculate → Cache
                                                                   X-Cache: MISS
```

### 3. ✅ Single MP Endpoint Optimization

**File:** `server/routes.ts` - `/api/mps/:id` endpoint (line 742)

**Improvements:**
1. **Cache Reuse:** If full MP list is cached, find and return single MP (no DB query)
2. **Single-Pass Calculation:** For on-demand calculation, single-pass through hansard instead of multiple filters
3. **Same Caching Headers:** `Cache-Control: public, max-age=600`

**Before:**
```typescript
// Fetch single MP (OK)
const mp = storage.getMp(id)

// Fetch ALL hansard records (expensive)
const hansardRecords = storage.getAllHansardRecords()

// Filter through ALL records twice (inefficient)
const relevant = hansardRecords.filter(r => ...)
const attended = relevant.filter(r => ...)
const spoke = relevant.filter(r => ...)
```

**After:**
```typescript
// Try cache first
if (mpsCache && cached) return cached[id]

// Otherwise: single pass
for (const record of hansardRecords) {
  if (record.includes(id)) {
    attended++
    spoke++
    // single check
  }
}
```

---

## Performance Expectations

### Latency Improvements:

| Scenario | Before | After | Improvement |
|----------|--------|-------|------------|
| **First request** (cold cache) | 4.5-5.6s | 500-800ms | **80-90%** ↓ |
| **Cached request** (within 10min) | N/A | <10ms | **450-560x** faster ↓ |
| **After cache expires** (10 min) | 4.5-5.6s | 500-800ms | **80-90%** ↓ |

### Per 100 requests (typical usage):
- **Before:** ~450-560 seconds total (users wait 4.5s each)
- **After:** ~50-80 seconds + 99 cached requests at <10ms each
  - Net: ~50-80 seconds vs 450-560s = **5.6x-9x overall improvement** 🚀

### Memory Impact:
- Cache size: ~1-2 MB (223 MP records × ~5-10 KB each with attendance stats)
- Acceptable trade-off for 5-9x latency improvement

---

## Implementation Details

### Code Changes Summary:

#### Addition: Cache variables
```typescript
let mpsCache: any[] | null = null;
let mpsCacheExpiry = 0;
const MPS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
```

#### Optimization: Index map building
```typescript
// Pre-build maps for O(1) lookups
const mpSwornInMap = new Map<string, string>()
const attendanceMap = new Map<string, { attended, spoke, speeches }>()

// Fill maps in O(n)
for (const mp of mps) {
  mpSwornInMap.set(mp.id, date)
  attendanceMap.set(mp.id, { attended: 0, spoke: 0, speeches: 0 })
}
```

#### Optimization: Single-pass hansard processing
```typescript
// Process all records once
for (const record of hansardRecords) {
  // Check all attended MPs at once
  if (record.attendedMpIds) {
    for (const mpId of record.attendedMpIds) {
      attendanceMap.get(mpId).attended++
    }
  }
}
```

#### Addition: Cache-Control headers
```typescript
res.set('Cache-Control', 'public, max-age=600')
res.set('X-Cache', 'HIT|MISS')
res.json(data)
```

---

## Testing & Verification

### ✅ What Was Fixed:

- [x] Collapsed N+1 query pattern (single pass through hansard)
- [x] Added Cache-Control headers
- [x] Implemented in-memory caching with 10-minute TTL
- [x] Optimized `/api/mps/:id` single-MP lookup
- [x] Added X-Cache debug headers for monitoring

### 📊 How to Verify:

1. **Before metrics** (external audit results):
   - Latency: 4.5-5.6 seconds
   - No Cache-Control header
   - Repeated requests showed no improvement

2. **After metrics** (expected):
   ```bash
   # First request (should be faster)
   time curl https://myparliament.calmic.com.my/api/mps
   # Expected: 500-800ms
   # Headers should show: Cache-Control: public, max-age=600
   #                     X-Cache: MISS
   
   # Repeated request within 10 minutes
   time curl https://myparliament.calmic.com.my/api/mps
   # Expected: <10ms (from cache)
   # Headers should show: X-Cache: HIT
   
   # After 10 minutes
   time curl https://myparliament.calmic.com.my/api/mps
   # Expected: 500-800ms (cache expired)
   # Headers should show: X-Cache: MISS
   ```

3. **Single MP endpoint** (should leverage cache):
   ```bash
   # Call full list first (caches data)
   curl https://myparliament.calmic.com.my/api/mps
   
   # Call single MP (should hit cache)
   time curl https://myparliament.calmic.com.my/api/mps/[uuid]
   # Expected: <10ms
   # Headers should show: X-Cache: HIT
   ```

---

## Cache Invalidation

The in-memory cache automatically invalidates after 10 minutes. For manual invalidation (if needed in production):
- Restart the application
- Or add a future endpoint: `POST /api/admin/cache/clear` (not implemented yet)

---

## Limitations & Future Improvements

### Current Limitations:
1. **In-process cache only** - doesn't work across multiple server instances
   - Solution for scale: Use Redis for shared caching
2. **Hard-coded 10-minute TTL** - not configurable
   - Solution: Move to environment variable `API_MPS_CACHE_TTL`
3. **No cache warming** - first request is still slow
   - Solution: Pre-load cache at server startup

### Future Enhancements:
- [ ] Redis-based caching for multi-instance deployments
- [ ] Cache warming on application startup
- [ ] Configurable cache TTL via environment variables
- [ ] More granular caching (per constituency, per parliament term)
- [ ] Move attendance calculation to background job (update DB columns nightly)

---

## Configuration

**Current settings:**
```javascript
const MPS_CACHE_TTL = 10 * 60 * 1000  // 10 minutes
```

To adjust, modify line 650 in `server/routes.ts`:
```javascript
// For 5 minutes: 5 * 60 * 1000
// For 30 minutes: 30 * 60 * 1000
// For 1 hour: 60 * 60 * 1000
```

---

## Backwards Compatibility

✅ **No breaking changes:**
- API response format unchanged
- All MP data fields remain the same
- Clients don't need any changes
- Cache-Control header is additive (doesn't break existing code)

---

## Summary

**Priority 1 is COMPLETE and ready for testing.** The optimization collapses an O(n×m) query pattern into O(n+m), adds intelligent caching, and should reduce latency from 4.5-5.6 seconds to 500-800ms for the first request and <10ms for cached requests.

**Next Steps:**
1. ✅ Re-verify latency after deployment (run external audit again)
2. ✅ Monitor cache hit rates and adjust TTL if needed
3. ⏳ Plan Redis caching for multi-instance deployment (Phase 2)
4. ⏳ Consider moving to database-level caching (Phase 3)

---

**Files Modified:**
- `server/routes.ts` - `/api/mps` and `/api/mps/:id` endpoints

**Lines Changed:**
- Added cache variables: ~3 lines
- Optimized query logic: ~60 lines
- Total diff: ~120 lines (mostly optimizations, minimal additions)

**Impact:** High  
**Risk Level:** Low (backwards compatible, additive caching only)  
**Testing Required:** Latency verification + cache hit verification
