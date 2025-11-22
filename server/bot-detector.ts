/**
 * Copyright by Calmic Sdn Bhd
 */

import type { Request } from 'express';

const BOT_USER_AGENTS = [
  'googlebot',
  'bingbot',
  'slurp',
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'sogou',
  'exabot',
  'facebot',
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
  'whatsapp',
  'telegrambot',
  'applebot',
  'ia_archiver',
  'archive.org_bot'
];

export function isBot(req: Request): boolean {
  const userAgent = (req.get('user-agent') || '').toLowerCase();
  if (!userAgent) {
    return false;
  }
  return BOT_USER_AGENTS.some(bot => userAgent.includes(bot));
}

export function normalizePathForPrerender(urlPath: string): string {
  return urlPath.replace(/\/$/, '') || '/';
}

export function shouldServePrerendered(req: Request): boolean {
  if (!isBot(req)) {
    return false;
  }
  
  const path = normalizePathForPrerender(req.path);
  
  return path === '/' || 
    path.startsWith('/mp/') || 
    path === '/activity' ||
    path === '/hansard' ||
    path === '/attendance' ||
    path === '/allowances';
}
