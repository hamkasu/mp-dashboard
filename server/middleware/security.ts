import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

// Rate Limiting Configuration
// Aggressive rate limiting for authentication endpoints to prevent brute force attacks
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

// Strict rate limiting for file uploads to prevent abuse
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: 'Too many file uploads. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Moderate rate limiting for all mutation operations
export const mutationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per window
  message: 'Too many requests. Please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Light rate limiting for GET requests
export const readRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // 5000 requests per window
  message: 'Too many requests. Please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for static assets
    return req.path.startsWith('/assets/') || req.path.startsWith('/public/');
  },
});

// CSRF Protection using Double Submit Cookie Pattern
const CSRF_SECRET = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');

export function generateCsrfToken(req: Request): string {
  const token = crypto.randomBytes(32).toString('hex');
  const timestamp = Date.now();
  const signature = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(`${token}:${timestamp}`)
    .digest('hex');
  
  return `${token}:${timestamp}:${signature}`;
}

export function verifyCsrfToken(token: string): boolean {
  if (!token) return false;
  
  const parts = token.split(':');
  if (parts.length !== 3) return false;
  
  const [tokenValue, timestamp, signature] = parts;
  
  // Check if token is expired (24 hours)
  const now = Date.now();
  const tokenTime = parseInt(timestamp, 10);
  if (now - tokenTime > 24 * 60 * 60 * 1000) {
    return false;
  }
  
  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(`${tokenValue}:${timestamp}`)
    .digest('hex');
  
  // Ensure buffers are same length before timingSafeEqual to prevent DoS
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  
  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

// Trusted domain suffixes for CSRF protection (same as CORS)
const CSRF_TRUSTED_DOMAIN_SUFFIXES = [
  '.replit.dev',
  '.replit.app',
  '.repl.co',
  '.railway.app',
  '.up.railway.app',
];

// Helper function to check if origin is from a trusted domain
function isTrustedOriginForCsrf(originUrl: string): boolean {
  try {
    const url = new URL(originUrl);
    const hostname = url.hostname;
    
    // Check if hostname ends with any of the trusted suffixes
    return CSRF_TRUSTED_DOMAIN_SUFFIXES.some(suffix => 
      hostname === suffix.slice(1) || // Exact match (e.g., "replit.dev")
      hostname.endsWith(suffix)        // Subdomain match (e.g., "myapp.replit.dev")
    );
  } catch {
    return false;
  }
}

// Helper function to normalize origin URL (trim, lowercase, remove trailing slash)
function normalizeOriginForCsrf(url: string): string {
  try {
    const normalized = new URL(url.trim());
    return normalized.origin.toLowerCase();
  } catch {
    // If URL parsing fails, just trim and lowercase
    return url.trim().toLowerCase().replace(/\/+$/, '');
  }
}

// Build trusted origins list from environment
function getTrustedOriginsForCsrf(): string[] {
  const trustedOrigins: string[] = [];
  
  // Add custom origin from environment variable (for Railway or custom domains)
  if (process.env.FRONTEND_URL) {
    trustedOrigins.push(normalizeOriginForCsrf(process.env.FRONTEND_URL));
  }
  
  // Add explicitly configured origins
  if (process.env.ALLOWED_ORIGINS) {
    trustedOrigins.push(...process.env.ALLOWED_ORIGINS.split(',').map(o => normalizeOriginForCsrf(o)));
  }
  
  // Add Replit domains (both .dev and .app)
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    trustedOrigins.push(normalizeOriginForCsrf(`https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`));
    trustedOrigins.push(normalizeOriginForCsrf(`https://${process.env.REPL_SLUG}-${process.env.REPL_OWNER}.replit.app`));
  }
  
  // Add Railway public domain if available
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    trustedOrigins.push(normalizeOriginForCsrf(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`));
  }
  
  // Add Railway static URL if available
  if (process.env.RAILWAY_STATIC_URL) {
    trustedOrigins.push(normalizeOriginForCsrf(process.env.RAILWAY_STATIC_URL));
  }
  
  // For development, allow localhost
  if (process.env.NODE_ENV === 'development') {
    trustedOrigins.push('http://localhost:5000', 'http://127.0.0.1:5000');
  }
  
  return trustedOrigins;
}

// CSRF middleware for state-changing operations
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip CSRF for login/register (they have their own protection via rate limiting)
  if (req.path === '/api/login' || req.path === '/api/register') {
    return next();
  }
  
  // Verify Origin/Referer header against TRUSTED allowlist to prevent cross-origin CSRF attacks
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  
  // Build trusted origins list
  const trustedOrigins = getTrustedOriginsForCsrf();
  
  // Validate Origin header (preferred) with strict origin matching
  if (origin) {
    const normalizedOrigin = origin.trim().toLowerCase();
    
    // Check explicit trusted origins list with strict equality
    const isExplicitlyTrusted = trustedOrigins.includes(normalizedOrigin);
    
    // Check if from trusted domain suffix
    const isTrustedDomain = isTrustedOriginForCsrf(origin);
    
    if (!isExplicitlyTrusted && !isTrustedDomain) {
      return res.status(403).json({ error: 'Untrusted origin' });
    }
  }
  // Fallback to Referer if Origin is missing (use URL API for robust parsing)
  else if (referer) {
    let refererOrigin: string;
    try {
      const refererUrl = new URL(referer);
      refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`.toLowerCase();
    } catch {
      // Invalid referer URL
      return res.status(403).json({ error: 'Invalid referer format' });
    }
    
    // Check explicit trusted origins list with strict equality
    const isExplicitlyTrusted = trustedOrigins.includes(refererOrigin);
    
    // Check if from trusted domain suffix
    const isTrustedDomain = isTrustedOriginForCsrf(referer);
    
    if (!isExplicitlyTrusted && !isTrustedDomain) {
      return res.status(403).json({ error: 'Untrusted referer' });
    }
  }
  // Reject if neither Origin nor Referer present (likely direct API access or old browser)
  else {
    return res.status(403).json({ error: 'Missing Origin and Referer headers' });
  }
  
  const headerToken = req.headers['x-csrf-token'] as string;
  const cookieToken = req.cookies['XSRF-TOKEN'] as string;
  
  // Both header and cookie must exist
  if (!headerToken || !cookieToken) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }
  
  // Tokens must match (double-submit pattern)
  if (headerToken !== cookieToken) {
    return res.status(403).json({ error: 'CSRF token mismatch' });
  }
  
  // Token signature and expiry must be valid
  if (!verifyCsrfToken(headerToken)) {
    return res.status(403).json({ error: 'Invalid or expired CSRF token' });
  }
  
  next();
}

// Middleware to set CSRF token in cookie only (not in header to prevent XSS reading)
export function setCsrfToken(req: Request, res: Response, next: NextFunction) {
  // CSRF protection disabled - no authentication
  next();
}

// Helmet configuration for security headers
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Vite needs unsafe-eval in dev
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"], // Allow parliament photos from external URLs
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'self'"], // Allow PDFs from same origin
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "blob:"], // Allow iframes for PDF viewing from same origin
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for external images
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'sameorigin', // Allow same-origin iframes for PDF viewing
  },
  noSniff: true,
  xssFilter: true,
});

// Audit logging for sensitive operations
export interface AuditLogEntry {
  timestamp: Date;
  userId?: number;
  username?: string;
  action: string;
  resource: string;
  resourceId?: string | number;
  method: string;
  path: string;
  ip: string;
  userAgent: string;
  success: boolean;
  errorMessage?: string;
}

const auditLogs: AuditLogEntry[] = [];
const MAX_AUDIT_LOGS = 10000;

export function auditLog(
  req: Request,
  action: string,
  resource: string,
  resourceId?: string | number,
  success: boolean = true,
  errorMessage?: string
) {
  const entry: AuditLogEntry = {
    timestamp: new Date(),
    userId: undefined,
    username: 'anonymous',
    action,
    resource,
    resourceId,
    method: req.method,
    path: req.path,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    success,
    errorMessage,
  };
  
  auditLogs.push(entry);
  
  // Keep only the last MAX_AUDIT_LOGS entries
  if (auditLogs.length > MAX_AUDIT_LOGS) {
    auditLogs.shift();
  }
  
  // Log to console for monitoring
  console.log(`[AUDIT] ${entry.timestamp.toISOString()} - ${entry.username || 'anonymous'} - ${entry.action} ${entry.resource} ${resourceId || ''} - ${success ? 'SUCCESS' : 'FAILED'}`);
}

export function getAuditLogs(limit: number = 100): AuditLogEntry[] {
  return auditLogs.slice(-limit).reverse();
}

// Middleware to audit all mutation operations
export function auditMiddleware(resource: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.json;
    
    res.json = function(data: any) {
      const success = res.statusCode >= 200 && res.statusCode < 300;
      const resourceId = req.params.id || (data && typeof data === 'object' && data.id);
      const action = `${req.method} ${resource}`;
      
      auditLog(
        req,
        action,
        resource,
        resourceId,
        success,
        !success && data?.error ? data.error : undefined
      );
      
      return originalSend.call(this, data);
    };
    
    next();
  };
}
