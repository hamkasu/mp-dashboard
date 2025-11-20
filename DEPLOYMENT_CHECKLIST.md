# Production Deployment Checklist - Authentication Feature

## ⚠️ CRITICAL: Data Loss Risk Assessment

**Before deploying, answer this question:**
- Do you have existing users in your production database?
  - Run in Railway: `SELECT COUNT(*) FROM users;`

**If count > 0**: STOP and contact support for manual migration
**If count = 0 OR table doesn't exist**: Safe to proceed

### ✅ Analytics Data is SAFE

**Your web analytics will NOT be reset:**
- ✅ `page_views` - Completely safe, no relation to users
- ✅ `visitor_analytics` - Completely safe, tracks all visitors
- ✅ `user_activity_log` - Data preserved (FK constraint restored after migration)

**Web view counts are 100% safe!**

---

## Pre-Deployment Steps

### 1. Set Required Environment Variables in Railway

**CRITICAL - Must be set before deployment:**

```bash
# Generate a secure session secret
SESSION_SECRET=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# Set admin credentials (will be created on first register if these match)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<your-secure-password-min-8-chars>
```

**Optional but recommended:**
```bash
CSRF_SECRET=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
```

### 2. Verify Railway PostgreSQL Service

- [ ] PostgreSQL service is added to your Railway project
- [ ] `DATABASE_URL` environment variable is automatically set
- [ ] Database is accessible

### 3. Pre-Deployment Database Check

Connect to Railway PostgreSQL and run:

```sql
-- Check if users table exists and has data
SELECT COUNT(*) FROM users;

-- If table exists, check the schema
\d users;
```

---

## Deployment Process

### Option A: Clean Deployment (No Existing Users)

1. **Merge Pull Request** on GitHub
2. **Railway Auto-Deploy** will:
   - Build the application
   - Run `npm run db:push` (syncs schema)
   - Start the server
3. **Create Admin Account**:
   - Go to `/auth` on your deployed app
   - Register with username and password matching `ADMIN_USERNAME` and `ADMIN_PASSWORD`
   - This account will have admin role

### Option B: Migration with Existing Users

**DO NOT USE drizzle-kit push - it will delete data!**

Instead, run manual migration:

1. **Backup existing data**:
   ```sql
   CREATE TABLE users_backup AS SELECT * FROM users;
   ```

2. **Run migration script**:
   ```bash
   # In Railway shell or local with DATABASE_URL
   psql $DATABASE_URL < migrations/0002_fix_users_table_schema.sql
   ```

3. **Verify migration**:
   ```sql
   SELECT * FROM users;
   ```

4. **Deploy application** (skip db:push or it will wipe data)

---

## Post-Deployment Verification

### 1. Health Checks

- [ ] App is running: `https://<your-app>.railway.app`
- [ ] Database connected (no errors in logs)
- [ ] Session store initialized (check for `session` table)

### 2. Authentication Flow Test

- [ ] Can access `/auth` page
- [ ] Can register a new account
- [ ] Can log in
- [ ] Can log out
- [ ] Sessions persist (refresh page shows logged in state)
- [ ] Admin account has admin role
- [ ] Admin can access `/hansard-admin` page
- [ ] Non-admin users cannot access admin pages

### 3. Security Verification

- [ ] SESSION_SECRET is set (not using default)
- [ ] HTTPS is enabled (Railway auto-provides)
- [ ] Cookies are `secure` in production
- [ ] CSRF tokens are generated
- [ ] Rate limiting is active (try 6 failed logins in 15 min)

---

## Rollback Plan

If something goes wrong:

1. **Immediate**: Revert the pull request on GitHub
2. **Database**: Restore from Railway automatic backups
3. **Emergency**: Disable auth by removing `setupAuth(app)` call

---

## Common Issues and Solutions

### Issue: "SESSION_SECRET not set" warning
**Solution**: Set SESSION_SECRET environment variable in Railway

### Issue: Users can't log in after deployment
**Solution**: Check database schema matches (`\d users` should show integer id, role text)

### Issue: Admin can't access admin pages
**Solution**: Verify user role is 'admin' not boolean: `SELECT username, role FROM users;`

### Issue: "CSRF token invalid"
**Solution**: Clear cookies and try again (browser caches old tokens)

---

## Security Notes

- **Never** commit SESSION_SECRET to git
- **Change** default admin password immediately after first login
- **Monitor** auth logs in Railway for suspicious activity
- **Review** rate limits if getting locked out frequently
- **Backup** database regularly (Railway has automatic backups)

---

## Support

If you encounter issues:
1. Check Railway logs: `railway logs`
2. Check database connection: `railway run psql $DATABASE_URL`
3. Review this checklist
4. Check GitHub issues for similar problems
