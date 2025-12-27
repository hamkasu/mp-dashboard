# DEPLOYMENT INSTRUCTIONS - Fix Grade Calculation

## ✅ The Fix is Working!

The test script confirms the percentile calculation is now working correctly:
- Top performers get percentile ~100
- Bottom performers get percentile ~0
- Ties are handled correctly
- Edge cases (all same values) return neutral 50
- Final scores are realistic (e.g., Syed Saddiq gets 93/A, not 0/F)

## 🚀 How to Deploy to Production

### Step 1: Rebuild the Backend

```bash
# In the project directory
npm run build
```

This compiles the TypeScript code (including the fixed `percentile-grading.ts`) to JavaScript in the `dist/` folder.

### Step 2: Restart the Server

```bash
# Stop the current server (method depends on your setup)
pm2 restart mp-dashboard  # If using PM2
# OR
systemctl restart mp-dashboard  # If using systemd
# OR
docker-compose restart  # If using Docker
```

### Step 3: Trigger Grade Recalculation

**Option A: Via Admin Panel (Easiest)**
1. Go to: https://myparliament.calmic.com.my/report-card-admin
2. Login as admin
3. Click **"Trigger Update Now"** button
4. Wait for confirmation (should take 10-30 seconds for 221 MPs)

**Option B: Via API**
```bash
curl -X POST https://myparliament.calmic.com.my/api/admin/report-cards/update \
  -H "Cookie: session=YOUR_SESSION_COOKIE"
```

**Option C: Via Database (Manual)**
```bash
# SSH into server
npm run db:migrate  # Ensure migrations are up to date

# Then trigger update via API or admin panel
```

### Step 4: Verify the Fix

After recalculation, check:

**1. Grade Distribution** (should be natural bell curve):
```sql
SELECT grade, COUNT(*) as count
FROM mp_report_cards
GROUP BY grade
ORDER BY grade;
```

Expected output:
```
grade | count
------|-------
A     |  ~22
B     |  ~55
C     |  ~88
D     |  ~44
F     |  ~12
```

**2. No More Zeros**:
```sql
SELECT COUNT(*) FROM mp_report_cards WHERE overall_score = 0;
```

Should return: **0**

**3. Top Performers Have Realistic Scores**:
```sql
SELECT m.name, rc.overall_score, rc.grade, rc.attendance_score, rc.participation_score
FROM mp_report_cards rc
JOIN mps m ON rc.mp_id = m.id
ORDER BY rc.overall_score DESC
LIMIT 10;
```

Should show scores in 85-100 range, grades A/B.

**4. Check Frontend**:
- Go to https://myparliament.calmic.com.my/report-card
- Should see:
  - ✅ Various grades (A, B, C, D, F) - not all F
  - ✅ Scores ranging from 0-100 - not all 0
  - ✅ Top performers with high scores (90+)

---

## 🐛 If It's Still Broken After Deployment

### Check Server Logs

Look for errors during grade calculation:
```bash
# View recent logs
tail -n 100 /var/log/mp-dashboard/error.log
# OR
pm2 logs mp-dashboard --lines 100
# OR
docker-compose logs --tail=100
```

### Common Issues:

**1. TypeScript Not Compiled**
- Check if `dist/server/utils/percentile-grading.js` exists
- Check if it has recent timestamp
- Solution: Run `npm run build` again

**2. Server Not Restarted**
- Old code still running in memory
- Solution: Force restart with `pm2 restart mp-dashboard --update-env`

**3. Database Connection Error**
- Check if DATABASE_URL is set correctly
- Solution: Verify connection with `npm run db:migrate`

**4. Caching Issue**
- Frontend might be showing cached data
- Solution: Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

---

## 📊 What to Expect After Fix

### Sample Expected Results:

| MP Name | Attendance | Participation | Expected Score | Expected Grade |
|---------|-----------|---------------|----------------|----------------|
| Syed Saddiq | 91% | 74 | ~92 | A |
| Afnan Hamimi | 97% | 52 | ~88 | A/B |
| Teresa Kok | 96% | 54 | ~89 | A/B |
| Tan Kar Hing | 77% | 76 | ~78 | C |
| Khairil Nizam | 69% | 69 | ~70 | C |
| Adnan Abu Hassan | 45% | 28 | ~40 | F |
| Richard Riot | 10% | 45 | ~35 | F |

### Grade Distribution Visualization:

```
A (90-100): ███████████ (~10%)
B (80-89):  █████████████████████ (~25%)
C (70-79):  ████████████████████████████████ (~40%)
D (60-69):  █████████████████████ (~20%)
F (<60):    ████████ (~5%)
```

---

## ✅ Quick Checklist

- [ ] Pulled latest code from `claude/add-visitor-counter-8vdJz` branch
- [ ] Ran `npm run build` successfully
- [ ] Restarted server
- [ ] Triggered grade recalculation via admin panel
- [ ] Verified grade distribution shows variety (not all F)
- [ ] Verified no MPs have score 0
- [ ] Checked top performers have realistic high scores (80-100)

---

## 🆘 Still Need Help?

If grades are still all 0 after following these steps:

1. **Share server logs** from grade recalculation
2. **Run test script** on production server:
   ```bash
   npx tsx scripts/test-percentile-calculation.ts
   ```
3. **Check database** manually:
   ```sql
   SELECT * FROM mp_report_cards LIMIT 5;
   ```

The fix is confirmed working in tests - the issue is deployment/recalculation!
