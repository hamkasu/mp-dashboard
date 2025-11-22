/**
 * Copyright by Calmic Sdn Bhd
 */

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

/**
 * Fixes localhost URLs in PDF links by replacing them with the correct public base URL
 * This is needed because some records may have localhost URLs stored from development/Railway
 */
export function fixPdfUrl(pdfUrl: string, req?: Request): string {
  // If it's already a proper URL (not localhost), return as-is
  if (pdfUrl.startsWith('https://') && !pdfUrl.includes('localhost')) {
    return pdfUrl;
  }
  
  // If it contains localhost, extract the path and rebuild
  if (pdfUrl.includes('localhost')) {
    const match = pdfUrl.match(/attached_assets\/.+\.pdf$/);
    if (match) {
      const baseUrl = getPublicBaseUrl(req);
      return buildPdfUrl(baseUrl, match[0]);
    }
  }
  
  // If it's a relative path (no protocol), build full URL
  if (pdfUrl.startsWith('attached_assets/') || pdfUrl.startsWith('/attached_assets/')) {
    const baseUrl = getPublicBaseUrl(req);
    return buildPdfUrl(baseUrl, pdfUrl);
  }
  
  // Return as-is if we can't parse it
  return pdfUrl;
}

/**
 * Fixes all PDF URLs in a Hansard record
 */
export function fixHansardPdfUrls<T extends { pdfLinks: string[] }>(record: T, req?: Request): T {
  return {
    ...record,
    pdfLinks: record.pdfLinks.map(url => fixPdfUrl(url, req))
  };
}
