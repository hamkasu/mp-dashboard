# Railway Deployment Guide

## Security Update (November 2025)

This application has been updated to use **session-based authentication** instead of token-based authentication for improved security and reliability on Railway.

## Required Environment Variables

Configure the following environment variables in your Railway project:

### 1. SESSION_SECRET (REQUIRED)
**Critical for production security**

Generate a secure random string (minimum 32 characters):

```bash
# On Linux/Mac:
openssl rand -base64 32

# Or use Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Set in Railway:
```
SESSION_SECRET=your-generated-secret-here
```

### 2. DATABASE_URL (AUTO-CONFIGURED)
Railway automatically configures this when you add a PostgreSQL database. The application uses this for:
- MP data storage
- Hansard records
- Court cases and SPRM investigations
- **Session storage** (persistent across server restarts)

### 3. ADMIN_USERNAME & ADMIN_PASSWORD (OPTIONAL)
By default, the application creates an admin account with:
- Username: `admin`
- Password: `admin123`

**For production**, set custom credentials:
```
ADMIN_USERNAME=your-admin-username
ADMIN_PASSWORD=your-secure-password
```

### 4. NODE_ENV (AUTO-CONFIGURED)
Railway automatically sets `NODE_ENV=production`. This enables:
- Secure cookies (HTTPS only)
- Production optimizations
- Proper session security

## Session Storage

The application uses **PostgreSQL-based session storage** (connect-pg-simple) which:
- ✅ Persists sessions across server restarts
- ✅ Survives Railway dyno recycling
- ✅ Supports horizontal scaling
- ✅ Automatically creates `session` table in your database

**Important**: Sessions are stored in your PostgreSQL database, not in memory. This ensures admin authentication remains stable during Railway deployments.

## Authentication Flow

### Admin Login
1. Navigate to `/login` in your deployed application
2. Enter admin credentials (default: `admin` / `admin123`)
3. Session cookie is created and stored in PostgreSQL
4. Access admin features like Hansard management

### Session Management
- Sessions last 24 hours
- Cookies are httpOnly and secure (HTTPS only in production)
- Use SameSite=lax for CSRF protection
- Logout clears session from database

## Deployment Checklist

1. ✅ Add PostgreSQL database to Railway project
2. ✅ Set `SESSION_SECRET` environment variable (32+ character random string)
3. ✅ Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` (recommended for production)
4. ✅ Ensure `NODE_ENV=production` (auto-configured by Railway)
5. ✅ Deploy application
6. ✅ Verify `/login` page loads
7. ✅ Test admin login with your credentials
8. ✅ Test Hansard deletion to confirm authentication works

## Troubleshooting

### Sessions Not Persisting
- Verify `DATABASE_URL` is set and PostgreSQL is connected
- Check Railway logs for "Using PostgreSQL session store" message
- Ensure `session` table exists in your database

### "Unauthorized" Errors on Admin Actions
- Log in at `/login` first
- Check browser cookies are enabled
- Verify session hasn't expired (24 hour limit)
- Check Railway logs for session errors

### Cannot Login
- Verify `ADMIN_USERNAME` and `ADMIN_PASSWORD` are set correctly
- Check database connection (DATABASE_URL)
- Review Railway deployment logs for errors

## Security Notes

### Previous Token-Based Authentication (REMOVED)
The application previously used localStorage tokens for admin authentication. This was **removed** due to:
- XSS vulnerability (tokens stored in localStorage)
- No session expiration
- Difficult to revoke access
- Not suitable for production deployment

### Current Session-Based Authentication
- ✅ Secure httpOnly cookies (protected from XSS)
- ✅ Session expiration (24 hours)
- ✅ Persistent in PostgreSQL (survives restarts)
- ✅ CSRF protection with SameSite cookies
- ✅ Production-ready for Railway

## Support

For issues or questions:
1. Check Railway deployment logs
2. Verify environment variables are set
3. Test locally with `DATABASE_URL` set
4. Review this documentation

## Migration from Token Auth

If you previously used the token-based authentication:
1. All token logic has been removed from frontend and backend
2. Users must now log in at `/login` with admin credentials
3. Sessions persist in database, not memory
4. No code changes needed - just set environment variables
