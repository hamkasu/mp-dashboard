# Security Fixes Checklist

This document provides a prioritized checklist of security fixes to implement based on the security audit.

## 🔴 CRITICAL - Implement Immediately

### ✅ Task 1: Add Authentication to All Data Modification Endpoints

**Affected Files:** `server/routes.ts`

Add `requireAuth` middleware to all POST, PATCH, and DELETE endpoints:

```typescript
// Court Cases
app.post("/api/court-cases", requireAuth, async (req, res) => { /* ... */ });
app.patch("/api/court-cases/:id", requireAuth, async (req, res) => { /* ... */ });
app.delete("/api/court-cases/:id", requireAuth, async (req, res) => { /* ... */ });

// SPRM Investigations
app.post("/api/sprm-investigations", requireAuth, async (req, res) => { /* ... */ });
app.patch("/api/sprm-investigations/:id", requireAuth, async (req, res) => { /* ... */ });
app.delete("/api/sprm-investigations/:id", requireAuth, async (req, res) => { /* ... */ });

// Legislative Proposals
app.post("/api/legislative-proposals", requireAuth, async (req, res) => { /* ... */ });
app.patch("/api/legislative-proposals/:id", requireAuth, async (req, res) => { /* ... */ });
app.delete("/api/legislative-proposals/:id", requireAuth, async (req, res) => { /* ... */ });

// Debate Participations
app.post("/api/debate-participations", requireAuth, async (req, res) => { /* ... */ });
app.patch("/api/debate-participations/:id", requireAuth, async (req, res) => { /* ... */ });
app.delete("/api/debate-participations/:id", requireAuth, async (req, res) => { /* ... */ });

// Parliamentary Questions
app.post("/api/parliamentary-questions", requireAuth, async (req, res) => { /* ... */ });
app.patch("/api/parliamentary-questions/:id", requireAuth, async (req, res) => { /* ... */ });
app.delete("/api/parliamentary-questions/:id", requireAuth, async (req, res) => { /* ... */ });

// Hansard Records
app.post("/api/hansard-records/upload", requireAuth, upload.array('pdfs', 25), handleMulterError, async (req, res) => { /* ... */ });
app.post("/api/hansard-records", requireAuth, async (req, res) => { /* ... */ });
app.patch("/api/hansard-records/:id", requireAuth, async (req, res) => { /* ... */ });
app.delete("/api/hansard-records/:id", requireAuth, async (req, res) => { /* ... */ });
app.post("/api/hansard-records/bulk-delete", requireAuth, async (req, res) => { /* ... */ });
app.delete("/api/hansard-records", requireAuth, async (req, res) => { /* ... */ });
app.post("/api/hansard-records/reprocess-attendance", requireAuth, async (req, res) => { /* ... */ });
app.post("/api/hansard-records/download", requireAuth, async (req, res) => { /* ... */ });
app.post("/api/hansard-records/:id/summarize", requireAuth, async (req, res) => { /* ... */ });

// Speaker Mappings
app.post("/api/speaker-mappings", requireAuth, async (req, res) => { /* ... */ });

// Analysis
app.post("/api/hansard-analysis", requireAuth, async (req, res) => { /* ... */ });
app.post("/api/hansard-speaker-stats", requireAuth, upload.single('pdf'), handleMulterError, async (req, res) => { /* ... */ });
```

**Estimated Time:** 30 minutes
**Status:** ☐ Not Started

---

### ✅ Task 2: Enforce Required SESSION_SECRET

**Affected Files:** `server/auth.ts`

Replace the fallback session secret with a mandatory check:

```typescript
// Before:
secret: process.env.SESSION_SECRET || "malaysian-parliament-session-secret-replace-in-production",

// After:
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error("SESSION_SECRET environment variable must be set and at least 32 characters long");
}

// Then use:
secret: sessionSecret,
```

**Estimated Time:** 5 minutes
**Status:** ☐ Not Started

---

### ✅ Task 3: Install and Configure Rate Limiting

**Installation:**
```bash
npm install express-rate-limit
```

**Affected Files:** `server/index.ts` or `server/routes.ts`

```typescript
import rateLimit from 'express-rate-limit';

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts, please try again later.' },
  skipSuccessfulRequests: true,
});

// File upload limiter
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { error: 'Upload limit exceeded, please try again later.' },
});

// Apply in routes
export async function registerRoutes(app: Express): Promise<Server> {
  // Apply general limiter to all API routes
  app.use('/api/', apiLimiter);

  setupAuth(app);

  // Apply stricter limiters to specific routes
  app.post("/api/login", authLimiter, passport.authenticate("local"), ...);
  app.post("/api/register", authLimiter, async (req, res, next) => { ... });
  app.post("/api/hansard-records/upload", requireAuth, uploadLimiter, upload.array('pdfs', 25), ...);

  // ... rest of routes
}
```

**Estimated Time:** 20 minutes
**Status:** ☐ Not Started

---

## 🟠 HIGH PRIORITY - Implement This Week

### ✅ Task 4: Add Security Headers with Helmet

**Installation:**
```bash
npm install helmet
```

**Affected Files:** `server/index.ts`

```typescript
import helmet from 'helmet';

const app = express();

// Add helmet before other middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Adjust as needed for React
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  noSniff: true,
  xssFilter: true,
}));

// Rest of middleware...
app.use(express.json({ ... }));
```

**Note:** You may need to adjust CSP directives based on your actual needs. Test thoroughly after implementing.

**Estimated Time:** 30 minutes + testing
**Status:** ☐ Not Started

---

### ✅ Task 5: Implement CSRF Protection

**Installation:**
```bash
npm install csurf cookie-parser
```

**Affected Files:** `server/index.ts`, `server/routes.ts`

**Option 1: Traditional CSRF Tokens (Recommended for forms)**

```typescript
import csrf from 'csurf';
import cookieParser from 'cookie-parser';

const app = express();

app.use(cookieParser());

const csrfProtection = csrf({ cookie: true });

// Apply CSRF protection to all state-changing routes
app.use('/api/', (req, res, next) => {
  // Skip CSRF for GET requests
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  // Skip CSRF for specific endpoints if needed (e.g., webhooks)
  // if (req.path === '/api/webhook') return next();

  return csrfProtection(req, res, next);
});

// Endpoint to get CSRF token
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

**Client-side changes needed:**
```typescript
// In React, fetch CSRF token on app load
useEffect(() => {
  fetch('/api/csrf-token')
    .then(r => r.json())
    .then(data => {
      // Store token and include in all POST/PATCH/DELETE requests
      sessionStorage.setItem('csrfToken', data.csrfToken);
    });
}, []);

// Include in all mutations
fetch('/api/court-cases', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'CSRF-Token': sessionStorage.getItem('csrfToken'),
  },
  body: JSON.stringify(data)
});
```

**Option 2: Custom Header Verification (Simpler for SPAs)**

```typescript
// In server/index.ts or middleware file
function verifyCsrfHeader(req: Request, res: Response, next: NextFunction) {
  // Skip for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Check for custom header presence
  const customHeader = req.get('X-Requested-With');
  if (customHeader !== 'XMLHttpRequest') {
    return res.status(403).json({ error: 'Invalid request' });
  }

  next();
}

app.use('/api/', verifyCsrfHeader);
```

**Estimated Time:** 1-2 hours
**Status:** ☐ Not Started

---

### ✅ Task 6: Implement Audit Logging

**Create new file:** `server/audit-logger.ts`

```typescript
import { db } from './db';
import { sql } from 'drizzle-orm';
import type { Request } from 'express';

export interface AuditLogEntry {
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

export async function logAudit(entry: AuditLogEntry) {
  try {
    console.log('[AUDIT]', JSON.stringify(entry));

    // TODO: Store in database
    // await db.execute(sql`
    //   INSERT INTO audit_logs (timestamp, user_id, action, resource, resource_id, ip_address, user_agent, result, details)
    //   VALUES (${entry.timestamp}, ${entry.userId}, ${entry.action}, ${entry.resource}, ${entry.resourceId},
    //           ${entry.ipAddress}, ${entry.userAgent}, ${entry.result}, ${JSON.stringify(entry.details)})
    // `);
  } catch (error) {
    console.error('Failed to log audit entry:', error);
  }
}

export function createAuditLogger(action: string, resource: string) {
  return async (req: Request, result: 'success' | 'failure', details?: any) => {
    await logAudit({
      timestamp: new Date(),
      userId: req.user?.id,
      action,
      resource,
      resourceId: req.params.id,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
      result,
      details,
    });
  };
}
```

**Usage in routes:**
```typescript
import { createAuditLogger } from './audit-logger';

app.post("/api/court-cases", requireAuth, async (req, res) => {
  const audit = createAuditLogger('create', 'court-case');

  try {
    const validatedData = insertCourtCaseSchema.parse(req.body);
    const courtCase = await storage.createCourtCase(validatedData);

    await audit(req, 'success', { courtCaseId: courtCase.id });
    res.status(201).json(courtCase);
  } catch (error) {
    await audit(req, 'failure', { error: String(error) });
    // ... error handling
  }
});
```

**Estimated Time:** 2-3 hours
**Status:** ☐ Not Started

---

## 🟡 MEDIUM PRIORITY - Implement Within 2-4 Weeks

### ✅ Task 7: Implement Role-Based Access Control

**Create new file:** `server/rbac.ts`

```typescript
import type { Request, Response, NextFunction } from 'express';

export enum Role {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

// Add role to user schema in shared/schema.ts
// role: varchar('role').default('viewer')

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userRole = (req.user as any).role as Role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
}
```

**Usage:**
```typescript
import { requireRole, Role } from './rbac';

// Only admins can delete
app.delete("/api/court-cases/:id", requireRole(Role.ADMIN), async (req, res) => { ... });

// Admins and editors can create/update
app.post("/api/court-cases", requireRole(Role.ADMIN, Role.EDITOR), async (req, res) => { ... });
```

**Estimated Time:** 3-4 hours
**Status:** ☐ Not Started

---

### ✅ Task 8: Improve Error Handling

**Create new file:** `server/error-handler.ts`

```typescript
import type { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  const statusCode = err instanceof AppError ? err.statusCode : 500;

  const response: any = {
    message: process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal Server Error'
      : err.message,
  };

  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}
```

**Update `server/index.ts`:**
```typescript
import { errorHandler } from './error-handler';

// Replace existing error handler with:
app.use(errorHandler);
```

**Estimated Time:** 1 hour
**Status:** ☐ Not Started

---

### ✅ Task 9: Add PDF Magic Number Validation

**Affected Files:** `server/routes.ts`

```typescript
function isPDF(buffer: Buffer): boolean {
  if (buffer.length < 5) return false;
  const header = buffer.slice(0, 5).toString('utf8');
  return header === '%PDF-';
}

// In upload handler:
app.post("/api/hansard-records/upload", requireAuth, upload.array('pdfs', 25), handleMulterError, async (req, res) => {
  const files = req.files as Express.Multer.File[] | undefined;

  if (!files || files.length === 0) {
    return res.status(400).json({ error: "No PDF files uploaded." });
  }

  // Validate all files are actually PDFs
  for (const file of files) {
    if (!isPDF(file.buffer)) {
      return res.status(400).json({
        error: `File ${file.originalname} is not a valid PDF`
      });
    }
  }

  // ... rest of processing
});
```

**Estimated Time:** 15 minutes
**Status:** ☐ Not Started

---

### ✅ Task 10: Reduce File Upload Limits

**Affected Files:** `server/routes.ts`

```typescript
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // Reduce to 20MB per file (was 50MB)
    files: 10, // Reduce to 10 files (was 25)
  },
  // ... rest of config
});
```

**Estimated Time:** 2 minutes
**Status:** ☐ Not Started

---

## 🔵 LOW PRIORITY - Nice to Have

### ✅ Task 11: Update Dependencies

```bash
npm audit fix
npm update
```

Review and test after updates.

**Estimated Time:** 30 minutes + testing
**Status:** ☐ Not Started

---

### ✅ Task 12: Harden Session Configuration

**Affected Files:** `server/auth.ts`

```typescript
const sessionSettings: session.SessionOptions = {
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset expiry on each request
  store: storage.sessionStore,
  cookie: {
    maxAge: 2 * 60 * 60 * 1000, // Reduce to 2 hours (was 24 hours)
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict", // Change from "lax" to "strict"
  },
};
```

**Note:** Stricter `sameSite` may affect user experience. Test thoroughly.

**Estimated Time:** 15 minutes + testing
**Status:** ☐ Not Started

---

## Environment Variables Checklist

Ensure these are set in production:

- ☐ `SESSION_SECRET` - Strong random string (min 64 chars)
- ☐ `DATABASE_URL` - Production database connection
- ☐ `NODE_ENV=production`
- ☐ `ADMIN_USERNAME` - Admin account username
- ☐ `ADMIN_PASSWORD` - Strong admin password
- ☐ `PUBLIC_BASE_URL` - Production URL

---

## Testing Checklist

After implementing fixes, verify:

- ☐ Unauthenticated users cannot access POST/PATCH/DELETE endpoints
- ☐ Rate limiting works (test with multiple requests)
- ☐ Security headers are present (check with browser DevTools)
- ☐ CSRF protection blocks cross-origin requests
- ☐ Audit logs are being created
- ☐ No sensitive information in error messages
- ☐ File uploads reject non-PDF files
- ☐ Session expires after configured time

---

## Deployment Checklist

Before deploying to production:

- ☐ All CRITICAL fixes implemented
- ☐ All HIGH priority fixes implemented
- ☐ Environment variables configured
- ☐ SSL/TLS certificate configured
- ☐ Database backups configured
- ☐ Monitoring and alerting set up
- ☐ Security testing completed
- ☐ Penetration testing (recommended)

---

## Progress Tracking

- **CRITICAL Tasks:** 0/3 completed
- **HIGH Priority Tasks:** 0/3 completed
- **MEDIUM Priority Tasks:** 0/4 completed
- **LOW Priority Tasks:** 0/2 completed

**Overall Progress:** 0/12 (0%)

Last Updated: 2025-11-18
