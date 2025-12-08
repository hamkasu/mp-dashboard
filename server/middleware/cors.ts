/**
 * Copyright by Calmic Sdn Bhd
 */

import cors from 'cors';
import { Request, Response, NextFunction } from 'express';

const TRUSTED_DOMAIN_SUFFIXES = [
  '.replit.dev',
  '.replit.app',
  '.repl.co',
  '.railway.app',
  '.up.railway.app',
];

const STATIC_ASSET_PATHS = [
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/assets/',
  '/static/',
];

function isTrustedDomain(origin: string): boolean {
  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    
    return TRUSTED_DOMAIN_SUFFIXES.some(suffix => 
      hostname === suffix.slice(1) ||
      hostname.endsWith(suffix)
    );
  } catch {
    return false;
  }
}

function normalizeOrigin(url: string): string {
  try {
    const normalized = new URL(url.trim());
    return normalized.origin.toLowerCase();
  } catch {
    return url.trim().toLowerCase().replace(/\/+$/, '');
  }
}

function generateWwwVariants(origin: string): string[] {
  const variants: string[] = [origin];
  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    
    if (hostname.startsWith('www.')) {
      const nonWww = `${url.protocol}//${hostname.slice(4)}${url.port ? ':' + url.port : ''}`;
      variants.push(normalizeOrigin(nonWww));
    } else if (!hostname.includes('.replit.') && !hostname.includes('.railway.') && !hostname.includes('localhost')) {
      const withWww = `${url.protocol}//www.${hostname}${url.port ? ':' + url.port : ''}`;
      variants.push(normalizeOrigin(withWww));
    }
  } catch {
  }
  return variants;
}

function getAllowedOrigins(): string[] {
  const origins: string[] = [];
  
  if (process.env.ALLOWED_ORIGINS) {
    const customOrigins = process.env.ALLOWED_ORIGINS.split(',')
      .map(o => o.trim())
      .filter(o => o.length > 0);
    
    for (const origin of customOrigins) {
      const normalized = normalizeOrigin(origin);
      const variants = generateWwwVariants(normalized);
      origins.push(...variants);
    }
  }
  
  if (process.env.FRONTEND_URL) {
    const normalized = normalizeOrigin(process.env.FRONTEND_URL);
    const variants = generateWwwVariants(normalized);
    origins.push(...variants);
  }
  
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    origins.push(normalizeOrigin(`https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`));
    origins.push(normalizeOrigin(`https://${process.env.REPL_SLUG}-${process.env.REPL_OWNER}.replit.app`));
  }
  
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    origins.push(normalizeOrigin(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`));
  }
  
  if (process.env.RAILWAY_STATIC_URL) {
    origins.push(normalizeOrigin(process.env.RAILWAY_STATIC_URL));
  }
  
  if (process.env.NODE_ENV === 'development') {
    origins.push('http://localhost:5000');
    origins.push('http://localhost:3000');
    origins.push('http://127.0.0.1:5000');
    origins.push('http://127.0.0.1:3000');
  }
  
  return Array.from(new Set(origins));
}

function isStaticAssetPath(path: string): boolean {
  return STATIC_ASSET_PATHS.some(staticPath => 
    path === staticPath || path.startsWith(staticPath)
  );
}

export function staticAssetCorsMiddleware(req: Request, res: Response, next: NextFunction) {
  if (isStaticAssetPath(req.path)) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
  }
  next();
}

const baseCorsConfig = cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = getAllowedOrigins();
    
    if (!origin) {
      return callback(null, true);
    }
    
    const normalizedOrigin = normalizeOrigin(origin);
    
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    
    if (isTrustedDomain(origin)) {
      return callback(null, true);
    }
    
    console.warn(`[CORS] Rejected origin: "${origin}"`);
    console.warn(`[CORS] Normalized to: "${normalizedOrigin}"`);
    console.warn(`[CORS] Allowed origins: ${JSON.stringify(allowedOrigins, null, 2)}`);
    console.warn(`[CORS] Tip: Set ALLOWED_ORIGINS="${origin}" in your environment variables`);
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400,
});

export function corsConfig(req: Request, res: Response, next: NextFunction) {
  if (isStaticAssetPath(req.path)) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    return next();
  }
  
  return baseCorsConfig(req, res, next);
}

export function isTrustedOriginForCsrf(origin: string): boolean {
  return isTrustedDomain(origin);
}
