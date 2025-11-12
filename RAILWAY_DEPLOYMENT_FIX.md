# Railway Deployment Fix - Session Persistence Issue

## Problem
Your Railway deployment was getting stuck after login because sessions were using in-memory storage (MemoryStore), which doesn't persist when Railway restarts containers.

## Solution Applied
Switched to PostgreSQL-backed sessions using `connect-pg-simple` - sessions now persist in your database.

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

---

## How to Deploy to Railway

### Step 1: Push Code to GitHub

If you don't have GitHub set up yet:

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Fix session persistence for Railway"

# Add your GitHub remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

### Step 2: Railway Auto-Deploy

If Railway is connected to GitHub:
- Railway will automatically detect the push and redeploy
- Wait 2-3 minutes for deployment to complete

If not connected:
1. Go to Railway dashboard → Your service
2. Click **Settings** → **Source**
3. Connect your GitHub repository
4. Railway will deploy automatically

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

---

## Need Help?

The code is ready in this Replit. You just need to:
1. Push to GitHub
2. Let Railway redeploy
3. Login should work perfectly!
