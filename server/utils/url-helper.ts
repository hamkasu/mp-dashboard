import type { Request } from "express";

export function getPublicBaseUrl(req?: Request): string {
  // Priority: 
  // 1. PUBLIC_BASE_URL env var (user-defined)
  // 2. REPLIT_DEV_DOMAIN env var (auto-set in Replit)
  // 3. Request host (for upload endpoints with req available)
  // 4. localhost fallback (for background jobs/cron)
  
  let baseUrl: string;
  
  if (process.env.PUBLIC_BASE_URL) {
    baseUrl = process.env.PUBLIC_BASE_URL;
  } else if (process.env.REPLIT_DEV_DOMAIN) {
    baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
  } else if (req) {
    baseUrl = `${req.protocol}://${req.get('host')}`;
  } else {
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
