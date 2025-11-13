import type { Request } from "express";

export function getPublicBaseUrl(req?: Request): string {
  // Priority: 
  // 1. PUBLIC_BASE_URL env var (user-defined)
  // 2. RAILWAY_STATIC_URL env var (auto-set in Railway)
  // 3. RAILWAY_PUBLIC_DOMAIN env var (Railway alternative)
  // 4. REPLIT_DEV_DOMAIN env var (auto-set in Replit)
  // 5. Request host (for upload endpoints with req available)
  // 6. localhost fallback (for background jobs/cron)
  
  let baseUrl: string;
  
  if (process.env.PUBLIC_BASE_URL) {
    baseUrl = process.env.PUBLIC_BASE_URL;
  } else if (process.env.RAILWAY_STATIC_URL) {
    baseUrl = process.env.RAILWAY_STATIC_URL;
  } else if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    baseUrl = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  } else if (process.env.REPLIT_DEV_DOMAIN) {
    baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
  } else if (req) {
    baseUrl = `${req.protocol}://${req.get('host')}`;
  } else {
    // Last resort fallback - log warning in production
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️  WARNING: Using localhost fallback in production. Set PUBLIC_BASE_URL, RAILWAY_STATIC_URL, or RAILWAY_PUBLIC_DOMAIN environment variable!');
    }
    baseUrl = `http://localhost:${process.env.PORT || 5000}`;
  }
  
  // Remove trailing slash to ensure consistent URL joining
  return baseUrl.replace(/\/+$/, '');
}

export function buildPdfUrl(baseUrl: string, relativePath: string): string {
  // Remove leading "./" or "/" from relativePath, then join with base
  const cleanPath = relativePath.replace(/^(\.\/|\/)+/, '');
  return `${baseUrl}/${cleanPath}`;
}
