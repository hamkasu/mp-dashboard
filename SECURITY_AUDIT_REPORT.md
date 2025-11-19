# Security Audit Report - MP Dashboard

**Date:** November 19, 2025
**Auditor:** Claude Code Security Audit
**Application:** Malaysian Parliament Dashboard
**Repository Branch:** claude/security-audit-01Vb8SCD9sgByUTbVEKDcZX6

---

## Executive Summary

This security audit identified **3 Critical**, **4 High**, **5 Medium**, and **3 Low** severity issues in the MP Dashboard application. The application has many good security practices in place but requires immediate attention to several critical vulnerabilities.

### Severity Summary
- **Critical:** 3 issues
- **High:** 4 issues
- **Medium:** 5 issues
- **Low:** 3 issues

---

## Critical Vulnerabilities

### 1. Password Hash Exposure in API Responses
**Severity:** Critical
**Location:** `server/auth.ts:112`, `server/auth.ts:133`
**OWASP Category:** A01:2021 - Broken Access Control

**Description:**
The `/api/login` and `/api/user` endpoints return the complete user object including the password hash. While the password is hashed, exposing the hash allows attackers to perform offline brute-force attacks.

**Vulnerable Code:**
```typescript
// auth.ts:112 - Login endpoint
res.status(200).json(req.user);

// auth.ts:133 - User endpoint
res.json(req.user);
```

**Evidence:**
Registration properly strips password (auth.ts:87-88), but login and user endpoints do not.

**Recommendation:**
```typescript
// Fix for login endpoint (auth.ts:99-113)
app.post("/api/login", authRateLimit, passport.authenticate("local"), (req, res) => {
    // Strip password from response
    const { password, ...userWithoutPassword } = req.user as any;

    // Generate CSRF token
    const csrfToken = generateCsrfToken(req);
    res.cookie('XSRF-TOKEN', csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(200).json(userWithoutPassword);
});

// Fix for user endpoint (auth.ts:131-134)
app.get("/api/user", setCsrfToken, (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { password, ...userWithoutPassword } = req.user as any;
    res.json(userWithoutPassword);
});
```

---

### 2. Hardcoded Default Admin Password
**Severity:** Critical
**Location:** `server/storage.ts:2628`
**OWASP Category:** A07:2021 - Identification and Authentication Failures

**Description:**
The application contains a hardcoded default admin password that is used when environment variables are not set in development mode.

**Vulnerable Code:**
```typescript
const finalPassword = adminPassword || "061167@abcdeF1";
```

**Risk:**
- Password is committed to version control
- Anyone with code access knows the default credentials
- May be accidentally deployed to production

**Recommendation:**
1. Remove hardcoded password entirely
2. Generate a random password if none is provided
3. Force password change on first login

```typescript
const finalPassword = adminPassword || crypto.randomBytes(16).toString('hex');
if (!adminPassword) {
  console.warn('⚠️  SECURITY WARNING: Random admin password generated. Set ADMIN_PASSWORD in environment.');
  console.log(`Generated admin password: ${finalPassword}`);
}
```

---

### 3. Hardcoded Session Secret
**Severity:** Critical
**Location:** `server/auth.ts:19`
**OWASP Category:** A02:2021 - Cryptographic Failures

**Description:**
A predictable default session secret is used when `SESSION_SECRET` environment variable is not set.

**Vulnerable Code:**
```typescript
secret: process.env.SESSION_SECRET || "malaysian-parliament-session-secret-replace-in-production",
```

**Risk:**
- Session tokens can be forged if this secret is used
- Complete session hijacking possible
- All user sessions compromised

**Recommendation:**
```typescript
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set in production');
  }
  console.warn('⚠️  No SESSION_SECRET set - using random secret (sessions will not persist across restarts)');
}

const sessionSettings: session.SessionOptions = {
  secret: sessionSecret || crypto.randomBytes(32).toString('hex'),
  // ...
};
```

---

## High Severity Vulnerabilities

### 4. Vulnerable Dependencies
**Severity:** High
**OWASP Category:** A06:2021 - Vulnerable and Outdated Components

**Description:**
npm audit identified 9 vulnerabilities including 1 high severity issue.

**Findings:**
| Package | Severity | Issue |
|---------|----------|-------|
| glob | High | Command injection via -c/--cmd (10.3.7-10.4.5) |
| vite | Moderate | Path traversal on Windows (5.2.6-5.4.20) |
| esbuild | Moderate | Dev server cross-origin request vulnerability (<=0.24.2) |
| drizzle-kit | Moderate | Affected by esbuild vulnerability |
| express-session | Low | on-headers vulnerability |
| brace-expansion | Low | ReDoS vulnerability |

**Recommendation:**
```bash
npm update glob vite
npm audit fix
```

---

### 5. Content Security Policy Allows unsafe-inline and unsafe-eval
**Severity:** High
**Location:** `server/middleware/security.ts:203`
**OWASP Category:** A03:2021 - Injection

**Description:**
The CSP allows `unsafe-inline` for scripts and styles, and `unsafe-eval` for scripts, weakening XSS protection.

**Vulnerable Code:**
```typescript
scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
styleSrc: ["'self'", "'unsafe-inline'"],
```

**Recommendation:**
For production, use nonces or hashes instead of unsafe-inline. Keep unsafe-eval only for development:

```typescript
contentSecurityPolicy: {
  directives: {
    scriptSrc: process.env.NODE_ENV === 'production'
      ? ["'self'", "'nonce-{{NONCE}}'"]  // Use nonces
      : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    styleSrc: ["'self'", "'unsafe-inline'"], // Often acceptable
  },
},
```

---

### 6. Missing Rate Limiting on Some Mutation Endpoints
**Severity:** High
**Location:** `server/routes.ts`
**OWASP Category:** A04:2021 - Insecure Design

**Description:**
While auth and upload endpoints have rate limiting, some mutation endpoints lack this protection, allowing potential abuse.

**Affected Endpoints:**
- POST /api/court-cases
- PATCH /api/court-cases/:id
- DELETE /api/court-cases/:id
- POST /api/sprm-investigations
- POST /api/legislative-proposals

**Recommendation:**
Apply `mutationRateLimit` middleware to all mutation endpoints.

---

### 7. Audit Logs Not Persisted
**Severity:** High
**Location:** `server/middleware/security.ts:242`
**OWASP Category:** A09:2021 - Security Logging and Monitoring Failures

**Description:**
Audit logs are stored in memory and lost on server restart, preventing forensic analysis.

**Vulnerable Code:**
```typescript
const auditLogs: AuditLogEntry[] = [];
const MAX_AUDIT_LOGS = 10000;
```

**Recommendation:**
Store audit logs in database:
```typescript
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull(),
  userId: integer("user_id"),
  action: text("action").notNull(),
  // ...
});
```

---

## Medium Severity Vulnerabilities

### 8. XSS Risk with dangerouslySetInnerHTML
**Severity:** Medium
**Location:** `client/src/pages/MPProfile.tsx:184`
**OWASP Category:** A03:2021 - Injection

**Description:**
`dangerouslySetInnerHTML` is used for JSON-LD schema data. While current usage appears safe (stringified JSON), this pattern is risky.

**Code:**
```typescript
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
/>
```

**Risk:**
If `schemaData` ever contains user-controlled data with `</script>` tags, XSS is possible.

**Recommendation:**
Escape script-breaking sequences:
```typescript
const safeJson = JSON.stringify(schemaData).replace(/</g, '\\u003c');
```

---

### 9. Missing Input Validation on Analytics Timeline
**Severity:** Medium
**Location:** `server/routes.ts:3080-3085`
**OWASP Category:** A03:2021 - Injection

**Description:**
While the `days` parameter is validated as a number, the code uses `sql.raw()` which could be risky.

**Code:**
```typescript
.where(sql`${visitorAnalytics.timestamp} >= NOW() - INTERVAL '${sql.raw(days.toString())} days'`)
```

**Risk:**
Current validation (1-365 integer) makes this safe, but using `sql.raw()` is a risky pattern.

**Recommendation:**
Use parameterized query:
```typescript
.where(sql`${visitorAnalytics.timestamp} >= NOW() - INTERVAL '1 day' * ${days}`)
```

---

### 10. CSRF Token in Readable Cookie
**Severity:** Medium
**Location:** `server/auth.ts:78-83`, `server/middleware/security.ts:186-191`
**OWASP Category:** A01:2021 - Broken Access Control

**Description:**
The CSRF token is stored in a non-httpOnly cookie so the frontend can read it. This is intentional for the double-submit pattern but increases XSS impact.

**Risk:**
If XSS occurs, attackers can read the CSRF token and perform state-changing requests.

**Recommendation:**
This is a trade-off in the double-submit cookie pattern. Mitigate by:
1. Strengthening CSP (remove unsafe-inline)
2. Adding token binding to user session
3. Using SameSite=Strict (currently used)

---

### 11. Environment Variable for Disabling Password Validation
**Severity:** Medium
**Location:** `.env.example:25-28`
**OWASP Category:** A05:2021 - Security Misconfiguration

**Description:**
`DISABLE_PASSWORD_VALIDATION` environment variable exists that bypasses password strength requirements.

**Code:**
```
# DISABLE_PASSWORD_VALIDATION=true
```

**Risk:**
Could be accidentally enabled in production.

**Recommendation:**
Add runtime check to prevent use in production:
```typescript
if (process.env.DISABLE_PASSWORD_VALIDATION && process.env.NODE_ENV === 'production') {
  console.error('FATAL: DISABLE_PASSWORD_VALIDATION cannot be used in production');
  process.exit(1);
}
```

---

### 12. Background Job Status Exposed
**Severity:** Medium
**Location:** `server/routes.ts` - `/api/jobs/:jobId`
**OWASP Category:** A01:2021 - Broken Access Control

**Description:**
Job status endpoints may expose internal processing information without authentication.

**Recommendation:**
Add `requireAuth` middleware to job status endpoints.

---

## Low Severity Vulnerabilities

### 13. Verbose Error Messages
**Severity:** Low
**Location:** Multiple locations
**OWASP Category:** A05:2021 - Security Misconfiguration

**Description:**
Some error responses include stack traces or detailed error messages that could aid attackers.

**Recommendation:**
Return generic error messages in production:
```typescript
catch (error) {
  console.error("Error:", error);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message
  });
}
```

---

### 14. Missing Security Headers
**Severity:** Low
**OWASP Category:** A05:2021 - Security Misconfiguration

**Description:**
Some recommended security headers are missing:
- `Permissions-Policy`
- `Cross-Origin-Resource-Policy`
- `Cross-Origin-Opener-Policy`

**Recommendation:**
Add to Helmet configuration:
```typescript
helmet({
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  // Add manually:
  // 'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
})
```

---

### 15. Session Cookie SameSite Not Strict
**Severity:** Low
**Location:** `server/auth.ts:27`
**OWASP Category:** A01:2021 - Broken Access Control

**Description:**
Session cookie uses `SameSite: lax` instead of `strict`.

**Code:**
```typescript
sameSite: process.env.NODE_ENV === "production" ? "lax" : "lax",
```

**Risk:**
`lax` allows cookies on top-level navigations, potentially enabling some CSRF attacks.

**Recommendation:**
Use `strict` for session cookie (CSRF token already uses `strict`).

---

## Positive Security Implementations

The following security measures are properly implemented:

1. **Password Hashing:** Uses scrypt with salt (strong algorithm)
2. **Timing-Safe Comparison:** Uses `timingSafeEqual` to prevent timing attacks
3. **CSRF Protection:** Double-submit cookie pattern with HMAC signatures
4. **Rate Limiting:** Auth (5/15min), Upload (10/hr), Mutation (100/15min)
5. **Security Headers:** Helmet.js with HSTS, X-Frame-Options, noSniff
6. **Input Validation:** Zod schemas for request validation
7. **Secure Session Cookies:** httpOnly, secure in production
8. **Audit Logging:** Tracks sensitive operations (needs persistence)
9. **File Upload Validation:** PDF-only, size limits, rate limits
10. **Origin Validation:** Strict Origin/Referer checking for CSRF

---

## Remediation Priority

### Immediate (P0) - Fix within 24 hours
1. Password hash exposure in API responses
2. Hardcoded session secret (block production without env var)

### Urgent (P1) - Fix within 1 week
3. Hardcoded default admin password
4. Update vulnerable dependencies
5. Persist audit logs

### Important (P2) - Fix within 1 month
6. Strengthen CSP for production
7. Add rate limiting to all mutation endpoints
8. XSS mitigation for dangerouslySetInnerHTML

### Recommended (P3) - Fix when possible
9. Production check for DISABLE_PASSWORD_VALIDATION
10. Improve error message handling
11. Add missing security headers

---

## Testing Recommendations

1. **Penetration Testing:** Conduct authenticated and unauthenticated testing
2. **Dependency Scanning:** Set up automated npm audit in CI/CD
3. **SAST:** Implement static analysis for security vulnerabilities
4. **API Security Testing:** Test all endpoints for proper authorization

---

## Conclusion

The MP Dashboard has a solid security foundation with proper authentication, CSRF protection, and input validation. However, the critical vulnerabilities identified - particularly the password hash exposure and hardcoded secrets - require immediate remediation before production deployment.

The application demonstrates security-conscious development practices, and addressing the issues in this report will significantly strengthen its security posture.

---

*Report generated by Claude Code Security Audit*
