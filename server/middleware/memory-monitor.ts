/**
 * Memory monitoring and management for Railway deployment
 * Helps prevent out-of-memory crashes by tracking and managing memory usage
 */
import { Request, Response, NextFunction } from 'express';

// Memory thresholds (in MB)
const MEMORY_WARNING_THRESHOLD = 1024; // 1GB - warn
const MEMORY_CRITICAL_THRESHOLD = 1280; // 1.25GB - force GC
const MEMORY_MAX_THRESHOLD = 1400; // 1.4GB - critical

let lastGcTime = Date.now();
const GC_COOLDOWN = 30000; // 30 seconds between forced GC

/**
 * Get current memory usage in MB
 */
export function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024), // Resident Set Size
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
    external: Math.round(usage.external / 1024 / 1024),
  };
}

/**
 * Force garbage collection if available
 */
function forceGC() {
  if (global.gc) {
    const now = Date.now();
    // Only GC if enough time has passed since last GC
    if (now - lastGcTime > GC_COOLDOWN) {
      console.log('♻️  Forcing garbage collection...');
      global.gc();
      lastGcTime = now;
      const afterGc = getMemoryUsage();
      console.log(`✓ GC complete. Heap: ${afterGc.heapUsed}MB / ${afterGc.heapTotal}MB`);
    }
  }
}

/**
 * Memory monitoring middleware
 */
export function memoryMonitor(req: Request, res: Response, next: NextFunction) {
  const memory = getMemoryUsage();

  // Critical level - force GC immediately
  if (memory.heapUsed > MEMORY_CRITICAL_THRESHOLD) {
    console.warn(`⚠️  Memory critical: ${memory.heapUsed}MB (threshold: ${MEMORY_CRITICAL_THRESHOLD}MB)`);
    forceGC();
  }
  // Warning level - log
  else if (memory.heapUsed > MEMORY_WARNING_THRESHOLD) {
    console.warn(`⚠️  Memory high: ${memory.heapUsed}MB (threshold: ${MEMORY_WARNING_THRESHOLD}MB)`);
  }

  // Log memory on response finish for expensive operations
  res.on('finish', () => {
    if (req.path.includes('/pdf') || req.path.includes('/hansard')) {
      const afterMemory = getMemoryUsage();
      if (afterMemory.heapUsed > memory.heapUsed + 50) { // Increased by 50MB
        console.log(`📊 ${req.path}: Memory +${afterMemory.heapUsed - memory.heapUsed}MB → ${afterMemory.heapUsed}MB`);
      }
    }
  });

  next();
}

/**
 * Log memory usage periodically
 */
export function startMemoryLogging(intervalMinutes: number = 5) {
  setInterval(() => {
    const memory = getMemoryUsage();
    console.log(`📊 Memory: Heap ${memory.heapUsed}/${memory.heapTotal}MB, RSS ${memory.rss}MB`);

    // Auto-GC if memory is high during idle times
    if (memory.heapUsed > MEMORY_WARNING_THRESHOLD) {
      forceGC();
    }
  }, intervalMinutes * 60 * 1000);
}
