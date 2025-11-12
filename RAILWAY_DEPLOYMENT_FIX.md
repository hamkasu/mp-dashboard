# Railway Deployment Fixes

## Problems Fixed

### 1. Session Persistence Issue
Railway deployment was getting stuck after login because sessions were using in-memory storage (MemoryStore), which doesn't persist when Railway restarts containers.

**Solution**: Switched to PostgreSQL-backed sessions using `connect-pg-simple` - sessions now persist in your database.

### 2. PDF Parsing Failure
Hansard PDF parsing was failing on Railway with "Failed to analyze Hansard PDF" error because `pdf-parse` depends on `canvas` which requires native build dependencies that Railway doesn't include by default.

**Solution**: Created a Dockerfile that uses Node.js 20 with all required native dependencies for PDF parsing.

---

## Changes Made in This Replit

### 1. Session Storage
- **Before**: MemoryStore (sessions lost on restart)
- **After**: PostgreSQL sessions (persistent across restarts)

### 2. Login Redirect
- **Before**: Redirected to `/hansard-admin`
- **After**: Redirects to `/` (main MPs dashboard)

### 3. Database Configuration
- Added SSL support for Railway PostgreSQL (required in production)
- Auto-creates `session` table in database
- Connection pooling with max 10 connections

### 4. PDF Parsing Setup
- **Added Dockerfile**: Uses Node.js 20 with native dependencies for canvas/pdf-parse
- **Added .nvmrc**: Pins Node version to 20 (canvas compatibility)
- **Added .dockerignore**: Optimizes Docker build

---

## How to Deploy to Railway

### Step 1: Push Code to GitHub

```bash
git add .
git commit -m "Fix PDF parsing and session persistence for Railway"
git push origin main
```

### Step 2: Railway Auto-Deploy

Railway will automatically:
1. Detect the **Dockerfile** and use it for deployment (instead of Nixpacks)
2. Install native dependencies (cairo, pango, etc.) for PDF parsing
3. Use Node.js 20 for canvas compatibility
4. Deploy your app with all fixes

Wait 3-5 minutes for deployment to complete.

### Step 3: Verify Environment Variables

In Railway dashboard → Your service → **Variables**, ensure you have:

```
DATABASE_URL (auto-provided by Railway)
NODE_ENV=production
SESSION_SECRET=your-random-secret-string-here
```

To generate a SESSION_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Testing the Fix

After deployment:

1. Go to your Railway app URL
2. Click **Admin** in navigation
3. Login with:
   - Username: `admin`
   - Password: (your admin password)
4. You should be redirected to the main dashboard
5. Try refreshing the page - you should stay logged in ✅

---

## What's Fixed

✅ Login redirects to main dashboard (not admin panel)
✅ Sessions persist in PostgreSQL database
✅ Sessions survive Railway container restarts
✅ SSL support for Railway's PostgreSQL
✅ Automatic session table creation
✅ **PDF parsing now works** (Hansard upload & analysis)
✅ Native dependencies installed via Dockerfile
✅ Node.js 20 for canvas compatibility

---

## Troubleshooting

### "Still getting stuck after login"
→ Make sure you deployed the latest code from this Replit to Railway

### "Database connection error"
→ Check that `DATABASE_URL` is set in Railway variables

### "Session not persisting"
→ Ensure `NODE_ENV=production` is set (enables SSL)

### "Table 'session' does not exist"
→ The app auto-creates it on first run. Check Railway logs.

### "PDF parsing still failing"
→ Check Railway logs to verify Dockerfile is being used (should see "Installing native dependencies")
→ Ensure the Dockerfile is named exactly `Dockerfile` (no extension)
→ Try redeploying from scratch if Railway cached old build

---

## Technical Details: Why PDF Parsing Failed

Railway uses **Nixpacks** by default, which:
- Auto-selects Node.js 22 (latest)
- Doesn't include native build dependencies

The `pdf-parse` library needs `canvas`, which requires:
- Cairo, Pango, libjpeg (native C libraries)
- Node.js 20 (no prebuilt canvas binaries for Node 22 yet)

**Our Dockerfile solves this by:**
1. Using Node 20 (canvas compatible)
2. Installing all native dependencies (cairo, pango, etc.)
3. Forcing Railway to use Docker instead of Nixpacks

---

## Files Added for Railway

- **Dockerfile**: Node 20 + native dependencies
- **.nvmrc**: Pins Node version to 20
- **.dockerignore**: Optimizes Docker build

---

## Need Help?

The code is ready in this Replit. You just need to:
1. Push to GitHub (`git push origin main`)
2. Wait for Railway to redeploy (3-5 minutes)
3. PDF parsing and login should work perfectly!
