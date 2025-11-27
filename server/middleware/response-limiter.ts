/**
 * Response size limiter middleware for Railway cost optimization
 * Prevents accidentally sending huge responses that increase bandwidth costs
 */
import { Request, Response, NextFunction } from 'express';

const MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10MB max response size

export function responseSizeLimiter(req: Request, res: Response, next: NextFunction) {
  // Skip for specific paths that need large responses (like PDF downloads)
  const skipPaths = ['/api/hansard-records/', '/attached_assets/', '/api/hansard-pdf/'];
  if (skipPaths.some(path => req.path.includes(path))) {
    return next();
  }

  const originalJson = res.json;
  res.json = function(data: any) {
    // Estimate response size
    const jsonString = JSON.stringify(data);
    const sizeInBytes = Buffer.byteLength(jsonString, 'utf8');

    // Warn if response is large
    if (sizeInBytes > 1024 * 1024) { // 1MB
      console.warn(`⚠️  Large response on ${req.path}: ${(sizeInBytes / 1024 / 1024).toFixed(2)}MB`);
    }

    // Block if too large
    if (sizeInBytes > MAX_RESPONSE_SIZE) {
      console.error(`❌ Response too large on ${req.path}: ${(sizeInBytes / 1024 / 1024).toFixed(2)}MB`);
      return originalJson.call(this, {
        error: 'Response too large. Please use pagination or filter your request.',
        size: `${(sizeInBytes / 1024 / 1024).toFixed(2)}MB`,
        limit: `${MAX_RESPONSE_SIZE / 1024 / 1024}MB`
      });
    }

    return originalJson.call(this, data);
  };

  next();
}

/**
 * Add pagination helper to encourage paginated responses
 */
export function getPaginationParams(req: Request): { limit: number; offset: number } {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200); // Max 200 items
  const offset = parseInt(req.query.offset as string) || 0;
  return { limit, offset };
}
