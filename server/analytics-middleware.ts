import type { Request, Response, NextFunction } from "express";
import geoip from "geoip-lite";
import { db } from "./db";
import { visitorAnalytics } from "@shared/schema";

export function trackVisitorAnalytics() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip tracking for static assets, API calls, and health checks
      const skipPaths = [
        '/api/',
        '/assets/',
        '/src/',
        '/@vite',
        '/node_modules/',
        '/__vite',
        '/favicon.ico',
        '/.well-known/',
        '/robots.txt',
        '/sitemap.xml',
      ];

      const shouldSkip = skipPaths.some(path => req.path.startsWith(path));
      
      if (shouldSkip) {
        return next();
      }

      // Extract IP address (handle proxies)
      const ip = (
        req.headers['x-forwarded-for'] as string ||
        req.headers['x-real-ip'] as string ||
        req.socket.remoteAddress ||
        ''
      ).split(',')[0].trim();

      // Get geolocation data
      const geo = geoip.lookup(ip);

      // Track the visit in the background (non-blocking)
      setImmediate(async () => {
        try {
          await db.insert(visitorAnalytics).values({
            path: req.path,
            ip: ip || null,
            country: geo?.country || null,
            city: geo?.city || null,
            region: geo?.region || null,
            timezone: geo?.timezone || null,
            userAgent: req.headers['user-agent'] || null,
            referrer: req.headers['referer'] || null,
          });
        } catch (error) {
          // Silent fail - don't break the request if analytics fails
          console.error('Analytics tracking error:', error);
        }
      });

      next();
    } catch (error) {
      // Don't break the request if tracking fails
      console.error('Analytics middleware error:', error);
      next();
    }
  };
}
