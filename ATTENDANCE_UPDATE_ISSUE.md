# Attendance Data Not Updating - Analysis & Solution

## Issue Summary

Parliamentary attendance allowance numbers have not changed in the last 3 days, indicating that the automated data sync is not functioning properly.

## Root Cause Analysis

### Current Update Mechanism

The system uses a **daily cron job** scheduled to run at **12:00 PM Malaysia Time** to:

1. Scrape the Parliament website for new Hansard records
2. Download and process new session PDFs
3. Extract attendance and speech data
4. Aggregate the data into MP statistics

**Critical Files:**
- `server/hansard-cron.ts` - Cron job scheduler and sync logic
- `server/aggregate-speeches.ts` - Data aggregation functions
- `server/index.ts:202` - Cron initialization

### Identified Problems

#### 1. **In-Memory Cron Job (HIGH PRIORITY)**
```typescript
// server/hansard-cron.ts:283
let cronJob: ReturnType<typeof cron.schedule> | null = null;
```

**Problem:** The cron job is stored in memory and is **lost on server restart**.

**Impact:** If the Replit deployment restarts (which can happen due to inactivity, deployments, or resource management), the cron job stops running entirely.

#### 2. **In-Memory Sync Logs**
```typescript
// server/hansard-cron.ts:287
const syncLogs: HansardSyncResult[] = [];
```

**Problem:** Sync logs are stored in memory, making it impossible to check if the cron ran after a restart.

**Impact:** No visibility into whether syncs are running or failing.

#### 3. **No Monitoring or Alerts**

There's no UI or notification system to alert when:
- The cron job stops running
- Sync fails
- No new data is found for extended periods

#### 4. **Silent Failures**

If the parliament website is down, SSL cert issues occur, or the scraper breaks due to HTML changes, failures are logged but no retry occurs.

## Possible Scenarios

### Scenario A: Server Restarted
The most likely cause. Replit deployments can restart due to:
- New deployments
- Inactivity (autoscale mode)
- Resource management
- Manual restarts

**Result:** Cron job is lost, no automatic syncs occur.

### Scenario B: Parliament Recess
Parliament may not be in session (recess period).

**Result:** No new Hansard records to fetch, numbers don't change.

### Scenario C: Scraper Failure
The parliament website HTML structure changed, or there are network issues.

**Result:** Sync runs but fails to fetch data.

## Immediate Solutions

### Solution 1: Manual Trigger (Immediate)

If the server is running, manually trigger a sync via the admin API:

```bash
# Trigger Hansard sync
curl -X POST https://your-deployment-url.repl.co/api/admin/trigger-hansard-check

# Check sync logs
curl https://your-deployment-url.repl.co/api/admin/hansard-sync-logs

# Force refresh MP data aggregation
curl -X POST https://your-deployment-url.repl.co/api/admin/refresh-mp-data
```

### Solution 2: Run Diagnostic Script

From the Replit shell with DATABASE_URL available:

```bash
npx tsx scripts/diagnose-and-fix-attendance.ts
```

This will:
- Check the last Hansard record date
- Attempt to fetch new records
- Refresh MP data aggregation
- Provide detailed diagnostics

### Solution 3: Ensure Cron is Running

Restart the server to reinitialize the cron job:

```bash
# In Replit, click "Stop" then "Run" to restart the server
# Or use:
pm2 restart all  # if using PM2
```

## Long-Term Fixes

### Fix 1: Persistent Cron Scheduling ⭐ RECOMMENDED

**Option A: External Cron Service**
Use a service like:
- **Cron-job.org** (free)
- **EasyCron**
- **GitHub Actions** (scheduled workflow)

Set up a webhook that calls:
```
POST /api/admin/trigger-hansard-check
```

**Option B: Replit Always-On**
Enable "Always On" for the Replit deployment (requires paid plan) to prevent server restarts.

**Option C: Database-Backed Scheduling**
Create a database table to track the last sync time and check on every server startup if a sync is needed:

```typescript
// On server startup
async function ensureScheduledTasksRunning() {
  const lastSync = await getLastSyncFromDb();
  const hoursSinceLastSync = (Date.now() - lastSync) / (1000 * 60 * 60);

  if (hoursSinceLastSync > 24) {
    // More than 24 hours, run sync immediately
    await runHansardSync({ triggeredBy: 'startup-recovery' });
  }

  // Then start the cron job
  startHansardCron();
}
```

### Fix 2: Persist Sync Logs to Database

Create a new table `hansard_sync_logs`:

```sql
CREATE TABLE hansard_sync_logs (
  id SERIAL PRIMARY KEY,
  triggered_by VARCHAR(50),
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  duration_ms INTEGER,
  records_found INTEGER,
  records_inserted INTEGER,
  records_skipped INTEGER,
  errors JSONB,
  success BOOLEAN
);
```

### Fix 3: Add Monitoring Dashboard

Create an admin page showing:
- Last sync time
- Sync success/failure status
- Last Hansard record date
- Manual trigger buttons

### Fix 4: Health Check Endpoint

Add a health check that can be monitored:

```typescript
app.get('/api/health/sync-status', (req, res) => {
  const lastSync = getLastSyncFromDb();
  const hoursSince = (Date.now() - lastSync) / (1000 * 60 * 60);

  res.json({
    healthy: hoursSince < 36, // Alert if > 36 hours
    lastSync,
    hoursSinceLastSync: hoursSince
  });
});
```

## Verification Steps

After implementing fixes:

1. ✅ Check `/api/admin/hansard-sync-logs` shows recent syncs
2. ✅ Verify last Hansard record date is recent
3. ✅ Check MP attendance numbers are updating
4. ✅ Restart server and verify cron starts automatically
5. ✅ Wait 24 hours and confirm automatic sync occurred

## Action Items

### Immediate (TODAY)
- [ ] Manually trigger sync via API or diagnostic script
- [ ] Verify numbers update on dashboard
- [ ] Check if parliament is in session

### Short-term (THIS WEEK)
- [ ] Implement database-backed sync log persistence
- [ ] Add startup sync recovery logic
- [ ] Create admin monitoring dashboard

### Long-term (THIS MONTH)
- [ ] Set up external cron service (cron-job.org)
- [ ] Add health check endpoint
- [ ] Implement error alerting (email/Slack)
- [ ] Consider Replit Always-On upgrade

## Testing the Fix

```bash
# 1. Run diagnostic
npx tsx scripts/diagnose-and-fix-attendance.ts

# 2. Check if numbers updated in database
# 3. Restart server
# 4. Wait for next 12 PM Malaysia Time
# 5. Check if cron ran automatically
# 6. Verify dashboard numbers updated
```

## Related Files

- `server/hansard-cron.ts:304-345` - Cron job setup
- `server/index.ts:202` - Cron initialization
- `server/aggregate-speeches.ts` - Data aggregation
- `server/routes.ts:4245-4307` - Admin trigger endpoints
- `client/src/lib/allowanceCalculator.ts:158` - Allowance calculation
- `client/src/lib/utils.ts:12-51` - Total salary calculation

## Summary

The attendance data is not updating because the in-memory cron job is likely lost due to a server restart. The immediate fix is to manually trigger a sync. The long-term solution requires either:

1. Using an external cron service, OR
2. Enabling Replit Always-On, OR
3. Implementing startup sync recovery with database-backed scheduling

All three options would prevent this issue from recurring.
