/**
 * @fileoverview Cache manager for optimizing Git operations and Timeline mode performance.
 *
 * @description
 * The CacheManager provides intelligent caching for Git operations, diffs, and Timeline data.
 * It implements LRU eviction, TTL expiration, and memory management to ensure optimal
 * performance while managing resource usage effectively.
 *
 * @example
 * ```typescript
 * const cache = new CacheManager({
 *   defaultTtl: 300000,
 *   maxSize: 104857600,
 *   enableCompression: true
 * })
 *
 * // Cache commit data
 * await cache.set('repo1', 'commits', 'abc123', commitData)
 *
 * // Retrieve cached data
 * const result = await cache.get('repo1', 'commits', 'abc123')
 * if (result.hit) {
 *   console.log('Cache hit:', result.data)
 * }
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { EventEmitter } from 'events'
import type {
  CacheConfig,
  CacheEntry,
  CacheKey,
  CacheCategory,
  CacheOperationResult,
  CacheStats,
  CacheEvent,
  CacheEventType,
} from '../types/cache'

/**
 * Cache manager implementing intelligent caching with TTL, LRU eviction, and compression.
 *
 * @remarks
 * The CacheManager provides a high-performance caching layer for Git operations.
 * It includes automatic cleanup, memory management, and comprehensive monitoring
 * capabilities to optimize Timeline mode performance.
 *
 * @public
 */
export class CacheManager extends EventEmitter {
  /** Cache configuration options */
  private readonly config: Required<CacheConfig>

  /** In-memory cache storage */
  private readonly cache = new Map<string, CacheEntry>()

  /** LRU access order tracking */
  private readonly accessOrder: string[] = []

  /** Cache statistics */
  private stats: CacheStats

  /** Cleanup interval timer */
  private cleanupTimer?: NodeJS.Timeout

  /**
   * Creates a new CacheManager instance.
   *
   * @param config - Cache configuration options
   *
   * @example
   * ```typescript
   * const cache = new CacheManager({
   *   defaultTtl: 300000,
   *   maxSize: 50 * 1024 * 1024, // 50MB
   *   enableCompression: true
   * })
   * ```
   */
  constructor(config: Partial<CacheConfig> = {}) {
    super()

    this.config = {
      defaultTtl: config.defaultTtl ?? 300000, // 5 minutes
      maxSize: config.maxSize ?? 104857600, // 100MB
      maxEntries: config.maxEntries ?? 10000,
      cleanupInterval: config.cleanupInterval ?? 60000, // 1 minute
      persistent: config.persistent ?? true,
      enableCompression: config.enableCompression ?? true,
      evictionStrategy: config.evictionStrategy ?? 'lru',
      storageDir: config.storageDir || '',
    }

    this.stats = this.initializeStats()
    this.startCleanupTimer()
  }

  /**
   * Retrieves data from cache.
   *
   * @param repositoryId - Repository identifier
   * @param category - Cache category
   * @param resourceId - Resource identifier
   * @param params - Additional parameters
   * @returns Promise resolving to cache operation result
   *
   * @example
   * ```typescript
   * const result = await cache.get('repo1', 'commits', 'abc123')
   * if (result.hit) {
   *   console.log('Found cached commit:', result.data)
   * }
   * ```
   */
  async get<T = unknown>(
    repositoryId: string,
    category: CacheCategory,
    resourceId: string,
    params?: Record<string, string | number | boolean>
  ): Promise<CacheOperationResult<T>> {
    const startTime = Date.now()
    const key = this.generateKey({
      repositoryId,
      category,
      resourceId,
      params: params || {},
    })

    try {
      const entry = this.cache.get(key)

      if (!entry) {
        this.updateStats('miss')
        this.emitEvent('miss', key)
        return {
          success: true,
          hit: false,
          executionTime: Date.now() - startTime,
        }
      }

      // Check expiration
      if (entry.expiresAt <= Date.now()) {
        this.cache.delete(key)
        this.removeFromAccessOrder(key)
        this.updateStats('miss')
        this.emitEvent('expire', key, { reason: 'ttl_expired' })
        return {
          success: true,
          hit: false,
          executionTime: Date.now() - startTime,
        }
      }

      // Update access information
      entry.lastAccessed = Date.now()
      entry.accessCount++
      this.updateAccessOrder(key)

      this.updateStats('hit')
      this.emitEvent('hit', key, { size: entry.size })

      return {
        success: true,
        data: entry.data as T,
        hit: true,
        executionTime: Date.now() - startTime,
        stats: this.getStats(),
      }
    } catch (error) {
      this.emitEvent('error', key, { error: String(error) })
      return {
        success: false,
        hit: false,
        executionTime: Date.now() - startTime,
        error: {
          code: 'CACHE_GET_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
      }
    }
  }

  /**
   * Stores data in cache.
   *
   * @param repositoryId - Repository identifier
   * @param category - Cache category
   * @param resourceId - Resource identifier
   * @param data - Data to cache
   * @param ttl - Custom TTL in milliseconds
   * @param tags - Tags for bulk operations
   * @returns Promise resolving to cache operation result
   *
   * @example
   * ```typescript
   * await cache.set('repo1', 'commits', 'abc123', commitData, 600000, ['branch:main'])
   * ```
   */
  async set<T = unknown>(
    repositoryId: string,
    category: CacheCategory,
    resourceId: string,
    data: T,
    ttl?: number,
    tags: string[] = []
  ): Promise<CacheOperationResult<T>> {
    const startTime = Date.now()
    const key = this.generateKey({ repositoryId, category, resourceId })

    try {
      const now = Date.now()
      const effectiveTtl = ttl ?? this.config.defaultTtl
      const size = this.calculateSize(data)

      // Check if we need to evict entries
      await this.ensureCapacity(size)

      const entry: CacheEntry<T> = {
        key,
        data,
        createdAt: now,
        lastAccessed: now,
        expiresAt: now + effectiveTtl,
        size,
        accessCount: 1,
        version: this.generateVersion(),
        tags,
        isCompressed: false, // TODO: Implement compression
      }

      this.cache.set(key, entry)
      this.updateAccessOrder(key)
      this.updateStatsOnSet(size)
      this.emitEvent('set', key, { size })

      return {
        success: true,
        data,
        hit: false,
        executionTime: Date.now() - startTime,
        stats: this.getStats(),
      }
    } catch (error) {
      this.emitEvent('error', key, { error: String(error) })
      return {
        success: false,
        hit: false,
        executionTime: Date.now() - startTime,
        error: {
          code: 'CACHE_SET_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
      }
    }
  }

  /**
   * Deletes data from cache.
   *
   * @param repositoryId - Repository identifier
   * @param category - Cache category
   * @param resourceId - Resource identifier
   * @param params - Additional parameters
   * @returns Promise resolving to whether the entry was deleted
   */
  async delete(
    repositoryId: string,
    category: CacheCategory,
    resourceId: string,
    params?: Record<string, string | number | boolean>
  ): Promise<boolean> {
    const key = this.generateKey({
      repositoryId,
      category,
      resourceId,
      params: params || {},
    })

    const entry = this.cache.get(key)
    if (!entry) {
      return false
    }

    this.cache.delete(key)
    this.removeFromAccessOrder(key)
    this.updateStatsOnDelete(entry.size)
    this.emitEvent('delete', key, { size: entry.size })

    return true
  }

  /**
   * Clears all cache entries for a repository.
   *
   * @param repositoryId - Repository identifier to clear
   * @returns Number of entries cleared
   */
  async clearRepository(repositoryId: string): Promise<number> {
    let clearedCount = 0

    for (const [key, entry] of this.cache) {
      if (key.startsWith(`${repositoryId}:`)) {
        this.cache.delete(key)
        this.removeFromAccessOrder(key)
        this.updateStatsOnDelete(entry.size)
        clearedCount++
      }
    }

    this.emitEvent('clear', undefined, { repositoryId })
    return clearedCount
  }

  /**
   * Clears all cache entries.
   *
   * @returns Number of entries cleared
   */
  async clearAll(): Promise<number> {
    const clearedCount = this.cache.size
    this.cache.clear()
    this.accessOrder.length = 0
    this.stats = this.initializeStats()
    this.emitEvent('clear')
    return clearedCount
  }

  /**
   * Gets current cache statistics.
   *
   * @returns Current cache statistics
   */
  getStats(): CacheStats {
    return {
      ...this.stats,
      timestamp: Date.now(),
    }
  }

  /**
   * Performs manual cache cleanup to remove expired entries.
   *
   * @returns Number of entries cleaned up
   */
  async cleanup(): Promise<number> {
    const now = Date.now()
    let cleanedCount = 0

    for (const [key, entry] of this.cache) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key)
        this.removeFromAccessOrder(key)
        this.updateStatsOnDelete(entry.size)
        cleanedCount++
      }
    }

    this.stats.expiredCleanups += cleanedCount
    this.emitEvent('cleanup')

    return cleanedCount
  }

  /**
   * Destroys the cache manager and cleans up resources.
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }

    this.cache.clear()
    this.accessOrder.length = 0
    this.removeAllListeners()
  }

  /**
   * Generates a cache key from the provided key components.
   */
  private generateKey(keyComponents: CacheKey): string {
    const { repositoryId, category, resourceId, params } = keyComponents
    let key = `${repositoryId}:${category}:${resourceId}`

    if (params && Object.keys(params).length > 0) {
      const paramString = Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('&')
      key += `?${paramString}`
    }

    return key
  }

  /**
   * Calculates the size of data for cache management.
   */
  private calculateSize(data: unknown): number {
    // Simple estimation - could be improved with more accurate serialization
    return JSON.stringify(data).length * 2 // Approximate UTF-16 size
  }

  /**
   * Generates a version string for cache invalidation.
   */
  private generateVersion(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Ensures cache has capacity for new entry by evicting if necessary.
   */
  private async ensureCapacity(newEntrySize: number): Promise<void> {
    const currentSize = this.stats.totalSize
    const maxSize = this.config.maxSize
    const maxEntries = this.config.maxEntries

    // Check if we need to evict based on size or entry count
    while (
      (currentSize + newEntrySize > maxSize || this.cache.size >= maxEntries) &&
      this.cache.size > 0
    ) {
      await this.evictLeastRecentlyUsed()
    }
  }

  /**
   * Evicts the least recently used entry from cache.
   */
  private async evictLeastRecentlyUsed(): Promise<void> {
    if (this.accessOrder.length === 0) {
      return
    }

    const keyToEvict = this.accessOrder[0]
    if (!keyToEvict) {
      return
    }

    const entry = this.cache.get(keyToEvict)

    if (entry) {
      this.cache.delete(keyToEvict)
      this.removeFromAccessOrder(keyToEvict)
      this.updateStatsOnEvict(entry.size)
      this.emitEvent('evict', keyToEvict, {
        reason: 'lru_eviction',
        size: entry.size,
      })
    }
  }

  /**
   * Updates access order for LRU tracking.
   */
  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key)
    this.accessOrder.push(key)
  }

  /**
   * Removes key from access order tracking.
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key)
    if (index !== -1) {
      this.accessOrder.splice(index, 1)
    }
  }

  /**
   * Initializes cache statistics.
   */
  private initializeStats(): CacheStats {
    return {
      entryCount: 0,
      totalSize: 0,
      hitRate: 0,
      missRate: 0,
      totalHits: 0,
      totalMisses: 0,
      evictionCount: 0,
      memoryUsage: 0,
      expiredCleanups: 0,
      averageAccessTime: 0,
      categoryStats: {} as Record<CacheCategory, any>,
      timestamp: Date.now(),
    }
  }

  /**
   * Updates statistics for cache hits and misses.
   */
  private updateStats(type: 'hit' | 'miss'): void {
    if (type === 'hit') {
      this.stats.totalHits++
    } else {
      this.stats.totalMisses++
    }

    const total = this.stats.totalHits + this.stats.totalMisses
    this.stats.hitRate = total > 0 ? (this.stats.totalHits / total) * 100 : 0
    this.stats.missRate = total > 0 ? (this.stats.totalMisses / total) * 100 : 0
  }

  /**
   * Updates statistics when setting new entries.
   */
  private updateStatsOnSet(size: number): void {
    this.stats.entryCount = this.cache.size
    this.stats.totalSize += size
    this.stats.memoryUsage = (this.stats.totalSize / this.config.maxSize) * 100
  }

  /**
   * Updates statistics when deleting entries.
   */
  private updateStatsOnDelete(size: number): void {
    this.stats.entryCount = this.cache.size
    this.stats.totalSize = Math.max(0, this.stats.totalSize - size)
    this.stats.memoryUsage = (this.stats.totalSize / this.config.maxSize) * 100
  }

  /**
   * Updates statistics when evicting entries.
   */
  private updateStatsOnEvict(size: number): void {
    this.stats.evictionCount++
    this.updateStatsOnDelete(size)
  }

  /**
   * Emits cache events for monitoring.
   */
  private emitEvent(
    type: CacheEventType,
    key?: string,
    data?: CacheEvent['data']
  ): void {
    const event: CacheEvent = {
      type,
      key: key || '',
      timestamp: Date.now(),
      data,
    }

    this.emit('cache-event', event)
  }

  /**
   * Starts the automatic cleanup timer.
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)

    // Don't prevent process exit
    this.cleanupTimer.unref()
  }
}
