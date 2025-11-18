# Security Audit Report
**Malaysian Parliament MP Dashboard**
**Date:** 2025-11-18
**Auditor:** Claude AI Security Audit

## Executive Summary

This security audit identified **CRITICAL** and **HIGH** severity vulnerabilities in the Malaysian Parliament MP Dashboard application. The most pressing issues involve missing authentication/authorization on sensitive endpoints and inadequate CSRF protection. Immediate remediation is strongly recommended.

---

## 🔴 CRITICAL Vulnerabilities

### 1. Missing Authentication on Data Modification Endpoints

**Severity:** CRITICAL
**Impact:** Data Integrity, Unauthorized Access
**CWE:** CWE-862 (Missing Authorization)

#### Description
Multiple POST, PATCH, and DELETE endpoints allow anonymous users to create, modify, and delete sensitive parliamentary data without any authentication or authorization checks.

#### Affected Endpoints

**Court Cases:**
- `POST /api/court-cases` - Anyone can create court cases (server/routes.ts:297)
- `PATCH /api/court-cases/:id` - Anyone can modify court cases (server/routes.ts:312)
- `DELETE /api/court-cases/:id` - Anyone can delete court cases (server/routes.ts:333)

**SPRM Investigations:**
- `POST /api/sprm-investigations` (server/routes.ts:390)
- `PATCH /api/sprm-investigations/:id` (server/routes.ts:405)
- `DELETE /api/sprm-investigations/:id` (server/routes.ts:426)

**Legislative Proposals:**
- `POST /api/legislative-proposals` (server/routes.ts:485)
- `PATCH /api/legislative-proposals/:id` (server/routes.ts:500)
- `DELETE /api/legislative-proposals/:id` (server/routes.ts:521)

**Debate Participations:**
- `POST /api/debate-participations` (server/routes.ts:580)
- `PATCH /api/debate-participations/:id` (server/routes.ts:595)
- `DELETE /api/debate-participations/:id` (server/routes.ts:616)

**Parliamentary Questions:**
- `POST /api/parliamentary-questions` (server/routes.ts:822)
- `PATCH /api/parliamentary-questions/:id` (server/routes.ts:837)
- `DELETE /api/parliamentary-questions/:id` (server/routes.ts:858)

**Hansard Records:**
- `POST /api/hansard-records/upload` - Upload PDFs without authentication (server/routes.ts:1038)
- `POST /api/hansard-records` (server/routes.ts:1513)
- `PATCH /api/hansard-records/:id` (server/routes.ts:1528)
- `DELETE /api/hansard-records/:id` (server/routes.ts:949)
- `POST /api/hansard-records/bulk-delete` (server/routes.ts:1549)
- `DELETE /api/hansard-records` - Delete ALL Hansard records (server/routes.ts:2120)
- `POST /api/hansard-records/reprocess-attendance` (server/routes.ts:2131)
- `POST /api/hansard-records/download` (server/routes.ts:2239)

**Speaker Mappings:**
- `POST /api/speaker-mappings` (server/routes.ts:1613)

**Analysis Endpoints:**
- `POST /api/hansard-analysis` (server/routes.ts:1308)
- `POST /api/hansard-speaker-stats` (server/routes.ts:1453)

#### Exploitation Scenario
```bash
# Any anonymous user can delete all court cases
curl -X DELETE https://myparliament.calmic.com.my/api/court-cases/123

# Any anonymous user can create fake parliamentary records
curl -X POST https://myparliament.calmic.com.my/api/court-cases \
  -H "Content-Type: application/json" \
  -d '{"mpId":"xxx","caseNumber":"FAKE-001","description":"Fake case"}'

# Anyone can delete ALL Hansard records
curl -X DELETE https://myparliament.calmic.com.my/api/hansard-records
```

#### Recommendation
**IMMEDIATE ACTION REQUIRED:**
1. Add `requireAuth` middleware to ALL data modification endpoints (POST, PATCH, DELETE)
2. Implement role-based access control (RBAC) to distinguish admin vs regular users
3. Consider adding audit logging for all data modifications

Example fix:
```typescript
// In server/routes.ts
app.post("/api/court-cases", requireAuth, async (req, res) => {
  // existing code...
});

app.patch("/api/court-cases/:id", requireAuth, async (req, res) => {
  // existing code...
});

app.delete("/api/court-cases/:id", requireAuth, async (req, res) => {
  // existing code...
});
```

---

### 2. Weak Default Session Secret

**Severity:** CRITICAL
**Impact:** Session Hijacking, Authentication Bypass
**CWE:** CWE-798 (Use of Hard-coded Credentials)

#### Description
The session secret has a default hardcoded value that is disclosed in the source code (server/auth.ts:18).

```typescript
secret: process.env.SESSION_SECRET || "malaysian-parliament-session-secret-replace-in-production",
```

#### Impact
If `SESSION_SECRET` environment variable is not set in production:
- Attackers can forge session cookies
- Complete authentication bypass possible
- Session data can be decrypted

#### Recommendation
1. **IMMEDIATE:** Verify that `SESSION_SECRET` is set in production environment
2. Remove the default value entirely and fail fast if not set:
```typescript
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET environment variable must be set");
}
```
3. Use a cryptographically strong random value (at least 64 characters)
4. Rotate the secret periodically

---

## 🟠 HIGH Severity Vulnerabilities

### 3. Missing CSRF Protection

**Severity:** HIGH
**Impact:** Cross-Site Request Forgery
**CWE:** CWE-352 (Cross-Site Request Forgery)

#### Description
The application does not implement CSRF protection for state-changing operations. While the session cookie uses `sameSite: "lax"` (server/auth.ts:26), this is not sufficient protection for all scenarios.

#### Impact
- Attackers can trick authenticated users into performing unwanted actions
- Data modification through malicious websites
- Account compromise

#### Recommendation
Implement CSRF protection using one of these methods:
1. Use `csurf` middleware for CSRF tokens
2. Verify custom headers for AJAX requests
3. Implement double-submit cookie pattern
4. Change `sameSite` to `"strict"` for admin operations

Example:
```typescript
import csrf from 'csurf';
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);
```

---

### 4. Missing Security Headers

**Severity:** HIGH
**Impact:** XSS, Clickjacking, MIME Sniffing
**CWE:** CWE-1021 (Improper Restriction of Rendered UI Layers)

#### Description
The application does not set important security headers:
- No `Content-Security-Policy` header
- No `X-Frame-Options` header
- No `X-Content-Type-Options` header
- No `Strict-Transport-Security` header (HSTS)

#### Impact
- Vulnerable to clickjacking attacks
- MIME-type confusion attacks possible
- No protection against inline script injection
- Man-in-the-middle attacks (no HSTS)

#### Recommendation
Install and configure `helmet` middleware:
```bash
npm install helmet
```

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

### 5. Rate Limiting Not Implemented

**Severity:** HIGH
**Impact:** Denial of Service, Brute Force Attacks
**CWE:** CWE-770 (Allocation of Resources Without Limits)

#### Description
No rate limiting is implemented on any endpoints, including:
- Authentication endpoints (`/api/login`, `/api/register`)
- File upload endpoints (`/api/hansard-records/upload`)
- Data modification endpoints

#### Impact
- Brute force attacks on login
- Account enumeration
- Resource exhaustion through unlimited uploads
- API abuse

#### Recommendation
Implement rate limiting using `express-rate-limit`:
```typescript
import rateLimit from 'express-rate-limit';

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per 15 minutes
  message: 'Too many login attempts, please try again later.'
});

// File upload limiter
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: 'Upload limit exceeded, please try again later.'
});

app.use('/api/', apiLimiter);
app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);
app.use('/api/hansard-records/upload', uploadLimiter);
```

---

## 🟡 MEDIUM Severity Vulnerabilities

### 6. Insufficient Input Validation

**Severity:** MEDIUM
**Impact:** Data Integrity
**CWE:** CWE-20 (Improper Input Validation)

#### Description
While Zod schemas are used for validation, there are areas where additional validation would be beneficial:
- File upload size limits are high (50MB per file, 25 files = 1.25GB total)
- No validation on file names (potential path traversal in logs)
- Session numbers and IDs could have stricter format validation

#### Recommendation
1. Reduce file upload limits based on actual needs
2. Sanitize file names before logging:
```typescript
const sanitizedFilename = path.basename(file.originalname);
```
3. Add format validation for session numbers and IDs

---

### 7. Password Storage Using Scrypt (Good, but could be better)

**Severity:** MEDIUM (Informational)
**Impact:** Password Cracking Resistance

#### Description
The application uses Node's `scrypt` for password hashing (server/utils/password.ts), which is good. However, the parameters are not explicitly configured, and using bcrypt would be more industry-standard.

#### Current Implementation
```typescript
const buf = (await scryptAsync(password, salt, 64)) as Buffer;
```

#### Recommendation
Consider migrating to bcrypt with explicit work factors:
```typescript
import bcrypt from 'bcryptjs';

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(12); // Work factor of 12
  return bcrypt.hash(password, salt);
}

export async function comparePasswords(supplied: string, stored: string) {
  return bcrypt.compare(supplied, stored);
}
```

Note: The current scrypt implementation is acceptable but bcrypt is more widely vetted and has better explicit configuration.

---

### 8. Information Disclosure in Error Messages

**Severity:** MEDIUM
**Impact:** Information Leakage
**CWE:** CWE-209 (Information Exposure Through Error Messages)

#### Description
Error messages sometimes leak implementation details:
- Stack traces may be exposed in development mode
- Database errors could reveal schema information
- File paths are logged and could be exposed

#### Recommendation
1. Implement proper error handling that sanitizes errors in production:
```typescript
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : err.message;

  // Log full error server-side
  console.error('Error:', err);

  // Send sanitized error to client
  res.status(status).json({
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});
```

---

### 9. Missing Audit Logging

**Severity:** MEDIUM
**Impact:** Forensics, Compliance
**CWE:** CWE-778 (Insufficient Logging)

#### Description
While the application has basic analytics tracking (server/analytics-middleware.ts), there is no comprehensive audit logging for:
- Authentication events (login, logout, failed attempts)
- Data modifications (create, update, delete operations)
- Administrative actions
- File uploads

#### Recommendation
Implement structured audit logging:
```typescript
interface AuditLog {
  timestamp: Date;
  userId?: number;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress: string;
  userAgent: string;
  result: 'success' | 'failure';
  details?: any;
}

function logAudit(log: AuditLog) {
  // Store in database or external logging service
  console.log('[AUDIT]', JSON.stringify(log));
}
```

---

## 🔵 LOW Severity / Informational

### 10. No Content Validation on PDF Uploads

**Severity:** LOW
**Impact:** Malicious File Upload

#### Description
While file type is checked via MIME type (server/routes.ts:46), there's no magic number validation to ensure files are actually PDFs.

#### Recommendation
Add magic number validation:
```typescript
function isPDF(buffer: Buffer): boolean {
  const header = buffer.slice(0, 5).toString('utf8');
  return header === '%PDF-';
}
```

---

### 11. Dependency Vulnerabilities

**Severity:** LOW to MEDIUM
**Impact:** Varies

#### Description
NPM audit revealed several vulnerabilities:
- `drizzle-kit`: Moderate severity via `@esbuild-kit/esm-loader`
- `esbuild`: Moderate severity - development server request vulnerability
- `brace-expansion`: Low severity - ReDoS vulnerability

#### Recommendation
1. Run `npm audit fix` to auto-fix what's possible
2. Consider updating or replacing affected packages
3. Implement regular dependency scanning in CI/CD
4. Use tools like Snyk or Dependabot for automated vulnerability monitoring

---

### 12. Session Configuration Could Be Hardened

**Severity:** LOW
**Impact:** Session Security

#### Description
Current session configuration (server/auth.ts:17-28):
```typescript
cookie: {
  maxAge: 24 * 60 * 60 * 1000, // 24 hours - quite long
  httpOnly: true, // Good ✓
  secure: process.env.NODE_ENV === "production", // Good ✓
  sameSite: process.env.NODE_ENV === "production" ? "lax" : "lax", // Could be stricter
}
```

#### Recommendation
1. Reduce session duration for admin users (e.g., 1-2 hours)
2. Implement session refresh mechanism
3. Use `sameSite: "strict"` for admin sessions
4. Add session invalidation on password change

---

## SQL Injection Analysis

✅ **GOOD:** The application uses Drizzle ORM with parameterized queries throughout. No raw SQL injection vulnerabilities were found. Drizzle properly handles query parameterization and escaping.

Example of safe query pattern used:
```typescript
await db.select().from(mps).where(eq(mps.id, id));
```

---

## XSS (Cross-Site Scripting) Analysis

✅ **MOSTLY GOOD:**
- React's default escaping protects most user input
- The only use of `dangerouslySetInnerHTML` is for JSON-LD structured data with `JSON.stringify()` (client/src/pages/MPProfile.tsx:184), which is safe
- No direct DOM manipulation or `innerHTML` usage found in unsafe contexts

⚠️ **CAUTION:** Ensure all user-generated content in parliamentary records is properly sanitized before display.

---

## Command Injection Analysis

✅ **GOOD:** No command execution functions (`exec`, `spawn`, etc.) are used with user-controlled input. The uses found in hansard parsers are for regex operations only.

---

## Authentication & Authorization Summary

❌ **CRITICAL ISSUES:**
- Authentication exists but is only enforced on `/api/admin/*` and `/api/analytics/*` endpoints
- 90%+ of data modification endpoints are completely unprotected
- No role-based access control (all authenticated users have same permissions)

✅ **GOOD:**
- Password hashing using scrypt (acceptable)
- Session management properly configured
- HTTPS enforced in production

---

## Priority Remediation Plan

### Phase 1: Immediate (Complete within 24-48 hours)
1. ✅ Add `requireAuth` to ALL data modification endpoints
2. ✅ Verify `SESSION_SECRET` is set in production
3. ✅ Implement rate limiting on critical endpoints

### Phase 2: Short-term (Complete within 1 week)
4. ✅ Add security headers using Helmet
5. ✅ Implement CSRF protection
6. ✅ Add audit logging for sensitive operations

### Phase 3: Medium-term (Complete within 2-4 weeks)
7. ✅ Implement role-based access control
8. ✅ Add comprehensive input validation
9. ✅ Fix dependency vulnerabilities
10. ✅ Implement proper error handling

---

## Security Best Practices Checklist

- ❌ Authentication on all sensitive endpoints
- ❌ Authorization/access control
- ✅ Password hashing (scrypt)
- ⚠️ Session management (needs hardening)
- ❌ CSRF protection
- ❌ Rate limiting
- ❌ Security headers
- ✅ SQL injection prevention (Drizzle ORM)
- ✅ XSS prevention (React + proper escaping)
- ⚠️ Input validation (needs improvement)
- ❌ Audit logging
- ⚠️ Error handling (leaks information)
- ✅ HTTPS in production
- ⚠️ Dependency security (vulnerabilities present)

---

## Conclusion

The Malaysian Parliament MP Dashboard has a solid foundation with good use of modern frameworks (React, Express, Drizzle ORM) that prevent common vulnerabilities like SQL injection and XSS. However, the **complete lack of authentication on data modification endpoints is a critical security flaw** that must be addressed immediately.

The application appears to be designed for public access (read operations), but write operations should absolutely require authentication and authorization. This is especially critical for a government/parliamentary system where data integrity is paramount.

**Recommended Action:** Implement Phase 1 remediations immediately before any production deployment.

---

## Contact

For questions about this security audit, please contact the development team or security officer.

**Report Generated:** 2025-11-18
**Audit Version:** 1.0
