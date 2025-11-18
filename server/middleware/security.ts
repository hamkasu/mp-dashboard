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
  max: 100, // 100 requests per window
  message: 'Too many requests. Please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Light rate limiting for GET requests
export const readRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
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
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
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
  
  const token = req.headers['x-csrf-token'] as string;
  
  if (!token || !verifyCsrfToken(token)) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }
  
  next();
}

// Middleware to set CSRF token in cookie and response header
export function setCsrfToken(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    const token = generateCsrfToken(req);
    res.cookie('XSRF-TOKEN', token, {
      httpOnly: false, // Frontend needs to read this
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
    res.setHeader('X-CSRF-Token', token);
  }
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
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for external images
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'deny',
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
    userId: req.user?.id,
    username: req.user?.username,
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
