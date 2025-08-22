/**
 * @fileoverview High-performance LRU cache layer for storage optimization
 *
 * @description
 * Memory-efficient cache layer using LRU (Least Recently Used) eviction policy.
 * Provides fast access to frequently used data while automatically managing
 * memory usage through intelligent cache sizing and TTL expiration.
 *
 * @example
 * ```typescript
 * const cache = new CacheLayer({
 *   maxSize: 100,
 *   maxMemory: 50 * 1024 * 1024, // 50MB
 *   ttl: 300000 // 5 minutes
 * })
 *
 * await cache.set('user:123', userData)
 * const user = await cache.get('user:123')
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

/**
 * Cache configuration options
 *
 * @public
 */
export interface CacheConfig {
  /**
   * Maximum number of items to cache
   * @defaultValue 1000
   */
  maxSize?: number

  /**
   * Maximum memory usage in bytes
   * @defaultValue 100MB
   */
  maxMemory?: number

  /**
   * Time-to-live for cache entries in milliseconds
   * @defaultValue 300000 (5 minutes)
   */
  ttl?: number

  /**
   * Whether to enable cache statistics tracking
   * @defaultValue true
   */
  enableStats?: boolean
}

/**
 * Cache entry with metadata
 *
 * @internal
 */
interface CacheEntry<T> {
  /**
   * Cached value
   */
  value: T

  /**
   * Creation timestamp
   */
  createdAt: number

  /**
   * Last access timestamp
   */
  accessedAt: number

  /**
   * Estimated size in bytes
   */
  size: number

  /**
   * Access count for analytics
   */
  hits: number

  /**
   * Custom TTL for this specific entry (optional)
   */
  customTTL?: number
}

/**
 * Cache statistics for monitoring performance
 *
 * @public
 */
export interface CacheStats {
  /**
   * Total number of cache hits
   */
  hits: number

  /**
   * Total number of cache misses
   */
  misses: number

  /**
   * Cache hit ratio (hits / (hits + misses))
   */
  hitRatio: number

  /**
   * Current number of cached items
   */
  size: number

  /**
   * Estimated memory usage in bytes
   */
  memoryUsage: number

  /**
   * Maximum configured size
   */
  maxSize: number

  /**
   * Maximum configured memory
   */
  maxMemory: number

  /**
   * Number of items evicted due to size limits
   */
  evictions: number

  /**
   * Number of items expired due to TTL
   */
  expirations: number
}

/**
 * High-performance LRU cache implementation with TTL and memory management
 *
 * @remarks
 * Implements Least Recently Used (LRU) eviction policy with additional
 * time-to-live (TTL) expiration and memory usage tracking. Automatically
 * manages cache size to prevent memory leaks while providing fast access
 * to frequently used data.
 *
 * @example
 * ```typescript
 * const cache = new CacheLayer({
 *   maxSize: 500,
 *   maxMemory: 25 * 1024 * 1024, // 25MB
 *   ttl: 600000 // 10 minutes
 * })
 *
 * // Cache expensive database query results
 * const cacheKey = `query:${JSON.stringify(queryParams)}`
 * let result = await cache.get(cacheKey)
 * if (!result) {
 *   result = await expensiveDbQuery(queryParams)
 *   await cache.set(cacheKey, result)
 * }
 * ```
 *
 * @public
 */
export class CacheLayer<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>()
  private accessOrder = new Set<string>()
  private stats: CacheStats
  private config: Required<CacheConfig>

  /**
   * Create new cache layer instance
   *
   * @param config - Cache configuration options
   */
  constructor(config: CacheConfig = {}) {
    this.config = {
      maxSize: config.maxSize ?? 1000,
      maxMemory: config.maxMemory ?? 100 * 1024 * 1024, // 100MB
      ttl: config.ttl ?? 300000, // 5 minutes
      enableStats: config.enableStats ?? true,
    }

    this.stats = {
      hits: 0,
      misses: 0,
      hitRatio: 0,
      size: 0,
      memoryUsage: 0,
      maxSize: this.config.maxSize,
      maxMemory: this.config.maxMemory,
      evictions: 0,
      expirations: 0,
    }

    // Start cleanup timer for TTL expiration
    this.startCleanupTimer()
  }

  /**
   * Get value from cache
   *
   * @param key - Cache key
   * @returns Cached value or undefined if not found/expired
   *
   * @example
   * ```typescript
   * const userData = cache.get('user:123')
   * if (userData) {
   *   console.log('Cache hit:', userData.name)
   * } else {
   *   console.log('Cache miss - need to fetch from DB')
   * }
   * ```
   */
  get(key: string): T | undefined {
    if (key === null || key === undefined) {
      return undefined
    }

    const entry = this.cache.get(key)

    if (!entry) {
      this.recordMiss()
      return undefined
    }

    // Check TTL expiration
    if (this.isExpired(entry)) {
      this.delete(key)
      this.stats.expirations++
      this.recordMiss()

      // Clean up other expired items during this access
      this.cleanupExpiredItems()

      return undefined
    }

    // Update access metadata
    entry.accessedAt = Date.now()
    entry.hits++

    // Move to end of LRU order
    this.accessOrder.delete(key)
    this.accessOrder.add(key)

    this.recordHit()
    return entry.value
  }

  /**
   * Set value in cache with automatic eviction management
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @returns Promise that resolves when value is cached
   *
   * @example
   * ```typescript
   * await cache.set('expensive-calculation', computedResult)
   * console.log('Result cached for future use')
   * ```
   */
  set(key: string, value: T): void {
    if (key === null || key === undefined) {
      return
    }

    const size = this.estimateSize(value)
    const now = Date.now()

    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      this.delete(key)
    }

    // Create new entry
    const entry: CacheEntry<T> = {
      value,
      createdAt: now,
      accessedAt: now,
      size,
      hits: 0,
    }

    // Add to cache
    this.cache.set(key, entry)
    this.accessOrder.add(key)

    // Update stats
    this.stats.size = this.cache.size
    this.stats.memoryUsage += size

    // Trigger eviction if necessary
    this.evictIfNecessary()
  }

  /**
   * Store value in cache with custom TTL
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in milliseconds
   */
  setWithTTL(key: string, value: T, ttl: number): void {
    if (key === null || key === undefined) {
      return
    }

    const size = this.estimateSize(value)
    const now = Date.now()

    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      this.delete(key)
    }

    // Create new entry with custom TTL
    const entry: CacheEntry<T> = {
      value,
      createdAt: now,
      accessedAt: now,
      size,
      hits: 0,
    }

    // Store custom TTL with the entry
    entry.customTTL = ttl

    // Add to cache
    this.cache.set(key, entry)
    this.accessOrder.add(key)

    // Update stats
    this.stats.size = this.cache.size
    this.stats.memoryUsage += size

    // Trigger eviction if necessary
    this.evictIfNecessary()
  }

  /**
   * Get current cache size
   *
   * @returns Number of items in cache
   */
  size(): number {
    return this.cache.size
  }

  /**
   * Delete value from cache
   *
   * @param key - Cache key to delete
   * @returns True if key existed and was deleted
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) {
      return false
    }

    this.cache.delete(key)
    this.accessOrder.delete(key)

    // Update stats
    this.stats.size = this.cache.size
    this.stats.memoryUsage -= entry.size

    return true
  }

  /**
   * Clear all cached items
   *
   * @returns Promise that resolves when cache is cleared
   */
  async clear(): Promise<void> {
    this.cache.clear()
    this.accessOrder.clear()

    // Reset stats
    this.stats.size = 0
    this.stats.memoryUsage = 0
  }

  /**
   * Check if key exists in cache (without affecting LRU order)
   *
   * @param key - Cache key to check
   * @returns True if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) {
      return false
    }

    if (this.isExpired(entry)) {
      this.delete(key)
      this.stats.expirations++
      return false
    }

    return true
  }

  /**
   * Get current cache statistics
   *
   * @returns Current cache performance metrics
   *
   * @example
   * ```typescript
   * const stats = cache.getStats()
   * console.log(`Hit ratio: ${(stats.hitRatio * 100).toFixed(1)}%`)
   * console.log(`Memory usage: ${(stats.memoryUsage / 1024 / 1024).toFixed(1)}MB`)
   * ```
   */
  getStats(): CacheStats {
    // Update hit ratio
    const total = this.stats.hits + this.stats.misses
    this.stats.hitRatio = total > 0 ? this.stats.hits / total : 0

    return {
      ...this.stats,
    }
  }

  /**
   * Get all cache keys (useful for debugging)
   *
   * @returns Array of all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Manually trigger cache cleanup (remove expired items)
   *
   * @returns Number of items removed
   */
  cleanup(): number {
    let removed = 0
    const now = Date.now()

    for (const [key, entry] of this.cache) {
      if (now - entry.createdAt > this.config.ttl) {
        this.delete(key)
        removed++
        this.stats.expirations++
      }
    }

    return removed
  }

  /**
   * Warm the cache with multiple key-value pairs
   *
   * @param items - Map of key-value pairs to cache
   * @returns Promise that resolves when all items are cached
   *
   * @example
   * ```typescript
   * await cache.warmup(new Map([
   *   ['user:123', userData],
   *   ['settings:app', appSettings]
   * ]))
   * ```
   */
  async warmup(items: Map<string, T>): Promise<void> {
    for (const [key, value] of items) {
      this.set(key, value)
    }
  }

  /**
   * Set multiple values at once
   *
   * @param items - Map of key-value pairs to cache
   */
  setBatch(items: Map<string, T>): void {
    for (const [key, value] of items) {
      this.set(key, value)
    }
  }

  /**
   * Get multiple values at once
   *
   * @param keys - Array of cache keys
   * @returns Map of key-value pairs, includes all requested keys (undefined for missing keys)
   */
  getBatch(keys: string[]): Map<string, T> {
    const result = new Map<string, T>()
    for (const key of keys) {
      const value = this.get(key)
      result.set(key, value as T)
    }
    return result
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats.hits = 0
    this.stats.misses = 0
    this.stats.hitRatio = 0
    this.stats.evictions = 0
    this.stats.expirations = 0
  }

  /**
   * Clean up all expired items from cache
   */
  private cleanupExpiredItems(): void {
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache) {
      if (this.isExpired(entry)) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      this.delete(key)
      this.stats.expirations++
    }
  }

  /**
   * Check if cache entry is expired
   *
   * @param entry - Cache entry to check
   * @returns True if entry has expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    const customTTL = entry.customTTL
    const ttl = customTTL !== undefined ? customTTL : this.config.ttl

    // TTL of 0 or negative means immediate expiration
    if (ttl <= 0) {
      return true
    }

    return Date.now() - entry.createdAt > ttl
  }

  /**
   * Estimate memory size of a value
   *
   * @param value - Value to estimate size for
   * @returns Estimated size in bytes
   */
  private estimateSize(value: T): number {
    try {
      // Rough estimate based on JSON serialization
      const serialized = JSON.stringify(value)
      return serialized.length * 2 // UTF-16 characters
    } catch {
      // Fallback for non-serializable objects
      return 1024 // 1KB default estimate
    }
  }

  /**
   * Evict items if cache exceeds size or memory limits
   *
   * @returns Promise that resolves when eviction is complete
   */
  private evictIfNecessary(): void {
    // Evict by size limit
    while (this.cache.size > this.config.maxSize) {
      const oldestKey = this.accessOrder.values().next().value
      if (oldestKey) {
        this.delete(oldestKey)
        this.stats.evictions++
      } else {
        break
      }
    }

    // Evict by memory limit
    while (this.stats.memoryUsage > this.config.maxMemory) {
      const oldestKey = this.accessOrder.values().next().value
      if (oldestKey) {
        this.delete(oldestKey)
        this.stats.evictions++
      } else {
        break
      }
    }
  }

  /**
   * Record cache hit for statistics
   */
  private recordHit(): void {
    if (this.config.enableStats) {
      this.stats.hits++
    }
  }

  /**
   * Record cache miss for statistics
   */
  private recordMiss(): void {
    if (this.config.enableStats) {
      this.stats.misses++
    }
  }

  /**
   * Start periodic cleanup timer for TTL expiration
   */
  private startCleanupTimer(): void {
    // Clean up expired entries every minute
    setInterval(() => {
      this.cleanup()
    }, 60000)
  }
}
