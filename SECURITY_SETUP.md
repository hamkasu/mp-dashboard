# Security Setup Guide

This Malaysian Parliament Dashboard application has been hardened with comprehensive security measures. This guide explains the security features and how to configure them properly.

## 🔒 Security Features Implemented

### 1. Authentication & Authorization
- **Required Authentication**: All data modification endpoints (POST/PATCH/DELETE) require user login
- **Session Management**: Secure session handling with configurable secrets
- **Password Hashing**: bcrypt-based password hashing for user credentials

### 2. CSRF Protection
- **Double-Submit Cookie Pattern**: Protects against Cross-Site Request Forgery attacks by validating that cookie token matches header token
- **Origin/Referer Validation**: Enforces same-origin policy by checking Origin and Referer headers
- **Signature Verification**: Server signs tokens with CSRF_SECRET and validates signature on each request
- **Token Lifecycle**: New tokens generated on login/registration, cleared on logout
- **Automatic Token Management**: Frontend automatically includes CSRF tokens in all mutations
- **Token Expiration**: CSRF tokens expire after 24 hours
- **Validation**: Origin must match, both cookie and header must exist, tokens must match exactly, and signature must be valid
- **DoS Protection**: Buffer length validation prevents crashes from malformed tokens
- **Scope**: CSRF protection defends against cross-site attacks. XSS prevention is handled separately via CSP headers and input sanitization

### 3. Rate Limiting
Four tiers of rate limiting protect against abuse:

| Tier | Endpoints | Limit | Window |
|------|-----------|-------|--------|
| **Aggressive** | Login, Registration | 5 attempts | 15 minutes |
| **Strict** | File Uploads | 10 uploads | 1 hour |
| **Moderate** | All Mutations | 100 requests | 15 minutes |
| **Light** | Read Operations | 1000 requests | 15 minutes |

### 4. Security Headers (Helmet)
- **Content Security Policy (CSP)**: Prevents XSS attacks
- **HSTS**: Forces HTTPS in production
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing
- **XSS Filter**: Additional XSS protection

### 5. Audit Logging
All sensitive operations are logged with:
- User ID and username
- Action type and resource
- Timestamp and IP address
- Success/failure status
- Error messages (if failed)

## ⚙️ Configuration

### Required Environment Variables

#### SESSION_SECRET (CRITICAL)
This secret is used to sign session cookies. **NEVER use the default in production!**

```bash
# Generate a secure random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to your .env file
SESSION_SECRET=your-generated-secret-here
```

⚠️ **Warning**: Using the hardcoded fallback in production could enable session hijacking!

#### CSRF_SECRET (Optional)
This secret is used to sign CSRF tokens. Auto-generated if not provided.

```bash
# Generate a secure random secret (optional)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to your .env file
CSRF_SECRET=your-generated-secret-here
```

#### ALLOWED_ORIGINS (Production Only)
Comma-separated list of trusted origins for CSRF protection. Replit automatically provides `REPLIT_DOMAINS` when deployed.

```bash
# For custom domains or non-Replit deployments
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**Note**: In development, only `http://localhost:5000` is trusted. In production without `REPLIT_DOMAINS` or `ALLOWED_ORIGINS`, CSRF protection will reject all requests.

### Example .env Configuration

```env
# CRITICAL: Change these in production
SESSION_SECRET=abc123...your-32-byte-hex-string-here
CSRF_SECRET=def456...your-32-byte-hex-string-here

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Environment
NODE_ENV=production
```

## 🛡️ Protected Endpoints

All the following endpoints now require authentication:

### Parliamentary Data
- Court Cases: POST, PATCH, DELETE
- SPRM Investigations: POST, PATCH, DELETE
- Legislative Proposals: POST, PATCH, DELETE
- Debate Participations: POST, PATCH, DELETE
- Parliamentary Questions: POST, PATCH, DELETE

### Hansard Records
- Create, Update, Delete Hansard records
- Upload PDFs (rate-limited to 10/hour)
- Analyze speaker statistics
- Reprocess attendance
- Bulk operations

### Public Endpoints (No Auth Required)
- GET requests (viewing data)
- POST /api/page-views (analytics tracking)

## 🧪 Testing Security

### Test Rate Limiting
```bash
# Try logging in with wrong password 6 times - should block after 5 attempts
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"wrong"}'
done
```

### Test CSRF Protection
```bash
# Try mutation without CSRF token - should fail with 403
curl -X POST http://localhost:5000/api/court-cases \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=your-session-cookie" \
  -d '{"mpId":"P001","caseTitle":"Test"}'
```

### Test Authentication
```bash
# Try mutation without authentication - should fail with 401
curl -X POST http://localhost:5000/api/court-cases \
  -H "Content-Type: application/json" \
  -d '{"mpId":"P001","caseTitle":"Test"}'
```

## 📊 Audit Log Access

Audit logs are stored in memory (last 10,000 entries). To view logs:

```typescript
// In server code
import { getAuditLogs } from "./middleware/security";

const recentLogs = getAuditLogs(100); // Get last 100 entries
```

Consider implementing persistent audit logging for production (database or log aggregation service).

## 🔐 Best Practices

1. **Always use HTTPS in production** - Session cookies have `secure` flag enabled
2. **Rotate secrets regularly** - Change SESSION_SECRET periodically
3. **Monitor audit logs** - Watch for suspicious patterns
4. **Keep dependencies updated** - Run `npm audit` regularly
5. **Use strong admin passwords** - Change default admin credentials immediately

## 🚨 Incident Response

If you suspect a security breach:

1. **Immediately rotate SESSION_SECRET** - This invalidates all existing sessions
2. **Review audit logs** - Check for unauthorized access patterns
3. **Check rate limit violations** - Look for brute force attempts
4. **Reset compromised user passwords**
5. **Enable additional monitoring**

## 📝 Security Checklist

Before deploying to production:

- [ ] Generate and set unique SESSION_SECRET
- [ ] Generate and set unique CSRF_SECRET (optional)
- [ ] Change default admin credentials
- [ ] Enable HTTPS (NODE_ENV=production)
- [ ] Review and adjust rate limits for your use case
- [ ] Set up persistent audit logging
- [ ] Configure CSP headers for your domains
- [ ] Enable security monitoring/alerting
- [ ] Test all protected endpoints
- [ ] Document your security procedures

## 🆘 Support

For security issues or questions:
- Review audit logs first
- Check rate limit headers in responses
- Verify environment variables are set correctly
- Ensure cookies are enabled in browser

## 📚 References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [CSRF Protection Guide](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
