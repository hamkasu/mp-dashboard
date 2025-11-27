/**
 * Memory monitoring and management for Replit deployment
 * Helps prevent out-of-memory crashes by tracking and managing memory usage
 * 
 * Key features:
 * 1. Circuit breaker - rejects requests when memory is critically high (prevents OOM)
 * 2. Concurrent request limiter - limits parallel requests to expensive endpoints
 * 3. Automatic GC triggering at various thresholds
 */
import { Request, Response, NextFunction } from 'express';

// Memory thresholds (in MB) - configured for 6GB heap limit
const MEMORY_WARNING_THRESHOLD = 4200; // 4.2GB - warn (68% of heap)
const MEMORY_CRITICAL_THRESHOLD = 4800; // 4.8GB - force GC (78% of heap)
const MEMORY_DANGER_THRESHOLD = 5400; // 5.4GB - emergency GC (88% of heap)
const MEMORY_CIRCUIT_BREAKER_THRESHOLD = 5700; // 5.7GB - reject new requests (93%)
const HEAP_LIMIT = 6144; // 6GB heap limit

let lastGcTime = Date.now();
let lastWarningTime = 0;
let lastCircuitBreakerLog = 0;
const GC_COOLDOWN = 30000; // 30 seconds between forced GC
const EMERGENCY_GC_COOLDOWN = 10000; // 10 seconds in emergency
const WARNING_COOLDOWN = 120000; // 120 seconds (2 min) between warning logs
const CIRCUIT_BREAKER_LOG_COOLDOWN = 5000; // 5 seconds between circuit breaker logs

// Concurrent request tracking for expensive endpoints
const expensiveEndpointPatterns = [
  '/api/constituencies',
  '/api/hansard',
  '/api/mps',
  '/pdf'
];
const MAX_CONCURRENT_EXPENSIVE_REQUESTS = 3; // Limit concurrent expensive requests
let currentExpensiveRequests = 0;

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
 * Check if a request path matches expensive endpoint patterns
 */
function isExpensiveEndpoint(path: string): boolean {
  return expensiveEndpointPatterns.some(pattern => path.includes(pattern));
}

/**
 * Force garbage collection if available
 */
function forceGC(emergency: boolean = false): number {
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
      console.log(`✓ GC freed ${freed}MB. Heap: ${afterGc.heapUsed}/${afterGc.heapTotal}MB (limit: ${HEAP_LIMIT}MB)`);
      return freed;
    }
  }
  return 0;
}

/**
 * Circuit breaker - check if we should reject requests due to memory pressure
 */
function shouldRejectRequest(memory: { heapUsed: number }): boolean {
  return memory.heapUsed > MEMORY_CIRCUIT_BREAKER_THRESHOLD;
}

/**
 * Memory monitoring middleware with circuit breaker
 */
export function memoryMonitor(req: Request, res: Response, next: NextFunction) {
  const memory = getMemoryUsage();
  const now = Date.now();
  const isExpensive = isExpensiveEndpoint(req.path);

  // CIRCUIT BREAKER - Reject requests when memory is critically high
  if (shouldRejectRequest(memory)) {
    // Force emergency GC
    forceGC(true);
    
    // Check again after GC
    const afterGcMemory = getMemoryUsage();
    if (shouldRejectRequest(afterGcMemory)) {
      if (now - lastCircuitBreakerLog > CIRCUIT_BREAKER_LOG_COOLDOWN) {
        console.error(`🛑 CIRCUIT BREAKER: Rejecting ${req.method} ${req.path} - Memory ${afterGcMemory.heapUsed}MB / ${HEAP_LIMIT}MB (${Math.round(afterGcMemory.heapUsed/HEAP_LIMIT*100)}%)`);
        lastCircuitBreakerLog = now;
      }
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        message: 'Server is under heavy load. Please try again in a few seconds.',
        retryAfter: 5
      });
    }
  }

  // CONCURRENT REQUEST LIMITER for expensive endpoints
  // Always enforce the limit to prevent memory buildup from concurrent requests
  if (isExpensive) {
    if (currentExpensiveRequests >= MAX_CONCURRENT_EXPENSIVE_REQUESTS) {
      console.warn(`⏳ Concurrent limit reached: Rejecting ${req.path} (${currentExpensiveRequests}/${MAX_CONCURRENT_EXPENSIVE_REQUESTS} concurrent, memory ${memory.heapUsed}MB)`);
      return res.status(503).json({
        error: 'Too many concurrent requests',
        message: 'Server is processing other requests. Please try again shortly.',
        retryAfter: 3
      });
    }
    
    // Track this expensive request
    currentExpensiveRequests++;
    
    // Use a flag to prevent double-decrement (both 'finish' and 'close' can fire)
    let decremented = false;
    const decrementCounter = () => {
      if (!decremented) {
        decremented = true;
        currentExpensiveRequests = Math.max(0, currentExpensiveRequests - 1);
      }
    };
    
    // Decrement counter when response finishes or connection closes
    res.on('finish', decrementCounter);
    res.on('close', decrementCounter);
  }

  // DANGER - Emergency GC with shorter cooldown
  if (memory.heapUsed > MEMORY_DANGER_THRESHOLD) {
    console.error(`🚨🚨 DANGER: ${memory.heapUsed}MB / ${HEAP_LIMIT}MB (${Math.round(memory.heapUsed/HEAP_LIMIT*100)}%)`);
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
    if (isExpensive) {
      const afterMemory = getMemoryUsage();
      const delta = afterMemory.heapUsed - memory.heapUsed;
      // Only log if memory increased significantly (>30MB)
      if (delta > 30) {
        console.log(`📊 ${req.path}: Memory +${delta}MB → ${afterMemory.heapUsed}MB`);
      }
    }
  });

  next();
}

/**
 * Middleware specifically for expensive endpoints with stricter limits
 * Use this on routes that are known to be memory-intensive
 */
export function expensiveEndpointGuard(req: Request, res: Response, next: NextFunction) {
  const memory = getMemoryUsage();
  
  // Lower threshold for expensive endpoints
  if (memory.heapUsed > MEMORY_CRITICAL_THRESHOLD) {
    // Try GC first
    forceGC(true);
    
    const afterGcMemory = getMemoryUsage();
    if (afterGcMemory.heapUsed > MEMORY_CRITICAL_THRESHOLD) {
      console.warn(`🛡️ Blocking expensive request ${req.path} - Memory ${afterGcMemory.heapUsed}MB`);
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        message: 'Server memory is constrained. Please try again in a moment.',
        retryAfter: 10
      });
    }
  }
  
  next();
}

/**
 * Get current memory status (for health check endpoints)
 */
export function getMemoryStatus() {
  const memory = getMemoryUsage();
  const pct = Math.round((memory.heapUsed / HEAP_LIMIT) * 100);
  
  let status: 'healthy' | 'warning' | 'critical' | 'danger';
  if (memory.heapUsed > MEMORY_CIRCUIT_BREAKER_THRESHOLD) {
    status = 'danger';
  } else if (memory.heapUsed > MEMORY_CRITICAL_THRESHOLD) {
    status = 'critical';
  } else if (memory.heapUsed > MEMORY_WARNING_THRESHOLD) {
    status = 'warning';
  } else {
    status = 'healthy';
  }
  
  return {
    ...memory,
    heapLimit: HEAP_LIMIT,
    percentUsed: pct,
    status,
    currentExpensiveRequests,
    maxConcurrentExpensive: MAX_CONCURRENT_EXPENSIVE_REQUESTS
  };
}

/**
 * Log memory usage periodically
 */
export function startMemoryLogging(intervalMinutes: number = 5) {
  setInterval(() => {
    const memory = getMemoryUsage();
    const pct = Math.round((memory.heapUsed / HEAP_LIMIT) * 100);
    console.log(`📊 Memory: ${memory.heapUsed}/${memory.heapTotal}MB (${pct}% of ${HEAP_LIMIT}MB limit), RSS ${memory.rss}MB, Expensive reqs: ${currentExpensiveRequests}/${MAX_CONCURRENT_EXPENSIVE_REQUESTS}`);

    // Auto-GC if memory is high during idle times
    if (memory.heapUsed > MEMORY_CRITICAL_THRESHOLD) {
      console.log('🧹 Periodic cleanup GC...');
      forceGC(false);
    }
  }, intervalMinutes * 60 * 1000);
}
