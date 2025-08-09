/**
 * @fileoverview Cache system type definitions for Git Genius.
 *
 * @description
 * Defines interfaces and types for the caching system that optimizes Git operations
 * and Timeline mode performance. The cache system provides intelligent storage and
 * retrieval of Git data with TTL support and memory management.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */
/**
 * Cache configuration options.
 *
 * @public
 */
export interface CacheConfig {
  /**
   * Default time-to-live in milliseconds
   * @default 300000 (5 minutes)
   */
  defaultTtl: number
  /**
   * Maximum cache size in bytes
   * @default 104857600 (100MB)
   */
  maxSize: number
  /**
   * Maximum number of cache entries
   * @default 10000
   */
  maxEntries: number
  /**
   * Cache cleanup interval in milliseconds
   * @default 60000 (1 minute)
   */
  cleanupInterval: number
  /**
   * Enable persistent cache storage
   * @default true
   */
  persistent: boolean
  /**
   * Cache storage directory (for persistent cache)
   */
  storageDir?: string
  /**
   * Enable cache compression
   * @default true
   */
  enableCompression: boolean
  /**
   * Cache eviction strategy
   * @default 'lru'
   */
  evictionStrategy: 'lru' | 'lfu' | 'fifo'
}
/**
 * Cache entry containing data and metadata.
 *
 * @public
 */
export interface CacheEntry<T = unknown> {
  /**
   * Cache key identifier
   */
  key: string
  /**
   * Cached data
   */
  data: T
  /**
   * Creation timestamp
   */
  createdAt: number
  /**
   * Last access timestamp
   */
  lastAccessed: number
  /**
   * Expiration timestamp
   */
  expiresAt: number
  /**
   * Entry size in bytes
   */
  size: number
  /**
   * Access count for LFU eviction
   */
  accessCount: number
  /**
   * Data version for invalidation
   */
  version: string
  /**
   * Entry tags for bulk operations
   */
  tags: string[]
  /**
   * Whether the entry is compressed
   */
  isCompressed: boolean
}
/**
 * Cache key structure for hierarchical organization.
 *
 * @public
 */
export interface CacheKey {
  /**
   * Repository identifier
   */
  repositoryId: string
  /**
   * Cache category (commits, diffs, status, etc.)
   */
  category: CacheCategory
  /**
   * Specific resource identifier
   */
  resourceId: string
  /**
   * Additional parameters for cache differentiation
   */
  params?: Record<string, string | number | boolean> | undefined
}
/**
 * Cache categories for organizing different types of Git data.
 *
 * @public
 */
export type CacheCategory =
  | 'commits'
  | 'diffs'
  | 'status'
  | 'branches'
  | 'files'
  | 'logs'
  | 'refs'
  | 'remotes'
  | 'timeline'
  | 'metadata'
/**
 * Result of cache operations.
 *
 * @public
 */
export interface CacheOperationResult<T = unknown> {
  /**
   * Whether the operation was successful
   */
  success: boolean
  /**
   * Retrieved or stored data
   */
  data?: T
  /**
   * Cache hit/miss information
   */
  hit: boolean
  /**
   * Operation execution time in milliseconds
   */
  executionTime: number
  /**
   * Error information if operation failed
   */
  error?: {
    /**
     * Error code
     */
    code: string
    /**
     * Error message
     */
    message: string
  }
  /**
   * Cache statistics at the time of operation
   */
  stats?: CacheStats
}
/**
 * Cache performance and usage statistics.
 *
 * @public
 */
export interface CacheStats {
  /**
   * Total number of cache entries
   */
  entryCount: number
  /**
   * Total cache size in bytes
   */
  totalSize: number
  /**
   * Hit rate percentage
   */
  hitRate: number
  /**
   * Miss rate percentage
   */
  missRate: number
  /**
   * Total number of cache hits
   */
  totalHits: number
  /**
   * Total number of cache misses
   */
  totalMisses: number
  /**
   * Number of cache evictions
   */
  evictionCount: number
  /**
   * Cache memory usage percentage
   */
  memoryUsage: number
  /**
   * Number of expired entries cleaned up
   */
  expiredCleanups: number
  /**
   * Average entry access time in milliseconds
   */
  averageAccessTime: number
  /**
   * Cache statistics by category
   */
  categoryStats: Record<
    CacheCategory,
    {
      /**
       * Number of entries in this category
       */
      entryCount: number
      /**
       * Total size of entries in this category
       */
      totalSize: number
      /**
       * Hit rate for this category
       */
      hitRate: number
    }
  >
  /**
   * When these statistics were calculated
   */
  timestamp: number
}
/**
 * Cache event types for monitoring and debugging.
 *
 * @public
 */
export type CacheEventType =
  | 'hit'
  | 'miss'
  | 'set'
  | 'delete'
  | 'expire'
  | 'evict'
  | 'clear'
  | 'cleanup'
  | 'error'
/**
 * Cache event for monitoring cache operations.
 *
 * @public
 */
export interface CacheEvent {
  /**
   * Event type
   */
  type: CacheEventType
  /**
   * Cache key involved in the event
   */
  key?: string
  /**
   * Event timestamp
   */
  timestamp: number
  /**
   * Event duration in milliseconds
   */
  duration?: number
  /**
   * Additional event data
   */
  data?: {
    /**
     * Size of data involved
     */
    size?: number
    /**
     * Reason for eviction/expiration
     */
    reason?: string
    /**
     * Error information
     */
    error?: string
    /**
     * Category involved
     */
    category?: CacheCategory
    /**
     * Repository ID involved
     */
    repositoryId?: string
  }
}
