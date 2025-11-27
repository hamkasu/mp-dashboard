/**
 * Memory monitoring and management for Railway deployment
 * Helps prevent out-of-memory crashes by tracking and managing memory usage
 */
import { Request, Response, NextFunction } from 'express';

// Memory thresholds (in MB) - adjusted based on crash patterns
// Heap limit is 1536MB, so we need to act MUCH earlier
const MEMORY_WARNING_THRESHOLD = 900; // 900MB - warn
const MEMORY_CRITICAL_THRESHOLD = 1100; // 1.1GB - force GC (LOWERED from 1.28GB)
const MEMORY_DANGER_THRESHOLD = 1300; // 1.3GB - emergency GC with shorter cooldown

let lastGcTime = Date.now();
let lastWarningTime = 0;
const GC_COOLDOWN = 20000; // 20 seconds between forced GC (reduced from 30s)
const EMERGENCY_GC_COOLDOWN = 5000; // 5 seconds in emergency
const WARNING_COOLDOWN = 60000; // 60 seconds between warning logs (reduces spam)

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
function forceGC(emergency: boolean = false) {
  if (global.gc) {
    const now = Date.now();
    const cooldown = emergency ? EMERGENCY_GC_COOLDOWN : GC_COOLDOWN;

    // Only GC if enough time has passed since last GC
    if (now - lastGcTime > cooldown) {
      const beforeGc = getMemoryUsage();
      const level = emergency ? '🚨 EMERGENCY' : '♻️  Regular';
      console.log(`${level} GC... (Heap: ${beforeGc.heapUsed}MB)`);
      global.gc();
      lastGcTime = now;
      const afterGc = getMemoryUsage();
      const freed = beforeGc.heapUsed - afterGc.heapUsed;
      console.log(`✓ GC freed ${freed}MB. Heap: ${afterGc.heapUsed}/${afterGc.heapTotal}MB (limit: 1536MB)`);
      return freed;
    }
  }
  return 0;
}

/**
 * Memory monitoring middleware
 */
export function memoryMonitor(req: Request, res: Response, next: NextFunction) {
  const memory = getMemoryUsage();
  const now = Date.now();

  // DANGER - Emergency GC with shorter cooldown
  if (memory.heapUsed > MEMORY_DANGER_THRESHOLD) {
    console.error(`🚨🚨 DANGER: ${memory.heapUsed}MB / 1536MB (${Math.round(memory.heapUsed/1536*100)}%)`);
    forceGC(true); // Emergency GC
  }
  // Critical level - force GC
  else if (memory.heapUsed > MEMORY_CRITICAL_THRESHOLD) {
    if (now - lastWarningTime > WARNING_COOLDOWN) {
      console.warn(`🚨 CRITICAL: ${memory.heapUsed}MB (threshold: ${MEMORY_CRITICAL_THRESHOLD}MB)`);
      lastWarningTime = now;
    }
    forceGC(false);
  }
  // Warning level - only log if cooldown expired (prevents spam)
  else if (memory.heapUsed > MEMORY_WARNING_THRESHOLD) {
    if (now - lastWarningTime > WARNING_COOLDOWN) {
      console.warn(`⚠️  Elevated: ${memory.heapUsed}MB (threshold: ${MEMORY_WARNING_THRESHOLD}MB)`);
      lastWarningTime = now;
    }
  }

  // Log memory on response finish for expensive operations
  res.on('finish', () => {
    if (req.path.includes('/pdf') || req.path.includes('/hansard') || req.path.includes('/constituencies')) {
      const afterMemory = getMemoryUsage();
      const delta = afterMemory.heapUsed - memory.heapUsed;
      // Only log if memory increased significantly (>30MB, lowered from 50MB)
      if (delta > 30) {
        console.log(`📊 ${req.path}: Memory +${delta}MB → ${afterMemory.heapUsed}MB`);
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
    const pct = Math.round((memory.heapUsed / 1536) * 100);
    console.log(`📊 Memory: ${memory.heapUsed}/${memory.heapTotal}MB (${pct}% of limit), RSS ${memory.rss}MB`);

    // Auto-GC if memory is high during idle times
    if (memory.heapUsed > MEMORY_CRITICAL_THRESHOLD) {
      console.log('🧹 Periodic cleanup GC...');
      forceGC(false);
    }
  }, intervalMinutes * 60 * 1000);
}
