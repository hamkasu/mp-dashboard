/**
 * Copyright by Calmic Sdn Bhd
 *
 * Simple in-memory cache with LRU eviction to prevent memory bloat
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  size: number; // Approximate size in bytes
}

export class MemoryCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number; // Max cache size in bytes
  private maxAge: number; // Max age in milliseconds
  private currentSize = 0;

  constructor(maxSizeMB: number = 50, maxAgeMinutes: number = 30) {
    this.maxSize = maxSizeMB * 1024 * 1024; // Convert MB to bytes
    this.maxAge = maxAgeMinutes * 60 * 1000; // Convert minutes to milliseconds
  }

  /**
   * Get item from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set item in cache
   */
  set(key: string, data: T, estimatedSize?: number): void {
    // Estimate size if not provided (rough estimate)
    const size = estimatedSize || this.estimateSize(data);

    // If this single item is larger than max cache size, don't cache it
    if (size > this.maxSize) {
      console.warn(`⚠️  Item too large to cache (${(size / 1024 / 1024).toFixed(2)} MB > ${(this.maxSize / 1024 / 1024).toFixed(2)} MB)`);
      return;
    }

    // Remove old entry if exists
    if (this.cache.has(key)) {
      this.delete(key);
    }

    // Evict old entries if we're going to exceed max size
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      this.evictOldest();
    }

    // Add new entry
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      size,
    });

    this.currentSize += size;
    console.log(`💾 Cached: ${key} (${(size / 1024 / 1024).toFixed(2)} MB, total: ${(this.currentSize / 1024 / 1024).toFixed(2)} MB)`);
  }

  /**
   * Delete item from cache
   */
  delete(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentSize -= entry.size;
      this.cache.delete(key);
    }
  }

  /**
   * Clear all cached items
   */
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
    console.log('🗑️  Cache cleared');
  }

  /**
   * Get cache statistics
   */
  stats(): { items: number; sizeMB: number; maxSizeMB: number } {
    return {
      items: this.cache.size,
      sizeMB: this.currentSize / 1024 / 1024,
      maxSizeMB: this.maxSize / 1024 / 1024,
    };
  }

  /**
   * Evict the oldest entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      console.log(`♻️  Evicting oldest cache entry: ${oldestKey}`);
      this.delete(oldestKey);
    }
  }

  /**
   * Estimate size of data (rough approximation)
   */
  private estimateSize(data: T): number {
    try {
      return JSON.stringify(data).length * 2; // Rough estimate (2 bytes per char)
    } catch {
      return 1024; // Default to 1KB if can't estimate
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.maxAge) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.delete(key));

    if (keysToDelete.length > 0) {
      console.log(`🧹 Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }
}

// Auto-cleanup expired entries every 5 minutes
export function startCacheCleanup<T>(cache: MemoryCache<T>, intervalMinutes: number = 5): NodeJS.Timeout {
  return setInterval(() => {
    cache.cleanup();
  }, intervalMinutes * 60 * 1000);
}
