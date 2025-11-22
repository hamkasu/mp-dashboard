/**
 * Copyright by Calmic Sdn Bhd
 */

import cors from 'cors';

// Trusted domain suffixes for Replit and Railway
const TRUSTED_DOMAIN_SUFFIXES = [
  '.replit.dev',
  '.replit.app',
  '.repl.co',
  '.railway.app',
  '.up.railway.app',
];

// Helper function to safely check if a hostname ends with a trusted domain suffix
function isTrustedDomain(origin: string): boolean {
  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    
    // Check if hostname ends with any of the trusted suffixes
    return TRUSTED_DOMAIN_SUFFIXES.some(suffix => 
      hostname === suffix.slice(1) || // Exact match (e.g., "replit.dev")
      hostname.endsWith(suffix)        // Subdomain match (e.g., "myapp.replit.dev")
    );
  } catch {
    // Invalid URL format
    return false;
  }
}

// Helper function to normalize origin URL (trim, lowercase, remove trailing slash)
function normalizeOrigin(url: string): string {
  try {
    const normalized = new URL(url.trim());
    return normalized.origin.toLowerCase();
  } catch {
    // If URL parsing fails, just trim and lowercase
    return url.trim().toLowerCase().replace(/\/+$/, '');
  }
}

// Dynamically determine allowed origins based on environment
function getAllowedOrigins(): string[] {
  const origins: string[] = [];
  
  // Add custom origin from environment variable (for Railway or custom domains)
  if (process.env.FRONTEND_URL) {
    origins.push(normalizeOrigin(process.env.FRONTEND_URL));
  }
  
  // Add Replit domains (both .dev and .app)
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    origins.push(normalizeOrigin(`https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`));
    origins.push(normalizeOrigin(`https://${process.env.REPL_SLUG}-${process.env.REPL_OWNER}.replit.app`));
  }
  
  // Add Railway public domain if available
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    origins.push(normalizeOrigin(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`));
  }
  
  // Add Railway static URL if available
  if (process.env.RAILWAY_STATIC_URL) {
    origins.push(normalizeOrigin(process.env.RAILWAY_STATIC_URL));
  }
  
  // For development, allow localhost
  if (process.env.NODE_ENV === 'development') {
    origins.push('http://localhost:5000');
    origins.push('http://localhost:3000');
    origins.push('http://127.0.0.1:5000');
    origins.push('http://127.0.0.1:3000');
  }
  
  return origins;
}

// CORS configuration
export const corsConfig = cors({
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    // Normalize origin for comparison
    const normalizedOrigin = origin.trim().toLowerCase();
    
    // Check if origin is in the explicit allowed list with strict equality
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    
    // Check if origin is from a trusted Replit or Railway domain using secure suffix validation
    if (isTrustedDomain(origin)) {
      return callback(null, true);
    }
    
    // Log rejected origins in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.warn(`CORS: Origin "${origin}" not allowed. Allowed origins:`, allowedOrigins);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Allow cookies and authentication headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours
});
