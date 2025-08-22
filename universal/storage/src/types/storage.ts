/**
 * @fileoverview Core storage interfaces and types
 *
 * @description
 * Defines the fundamental storage adapter interface and related types.
 * All storage implementations must implement IStorageAdapter interface.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

/**
 * Configuration options for storage initialization
 *
 * @public
 */
export interface StorageConfig {
  /**
   * Storage adapter type
   */
  type: 'sqlite' | 'memory' | 'dexie' | 'custom'

  /**
   * Database file path (SQLite) or database name (Dexie)
   */
  path?: string

  /**
   * Database name for web storage
   */
  name?: string

  /**
   * Encryption configuration
   */
  encryption?: EncryptionConfig

  /**
   * Compression configuration
   */
  compression?: CompressionConfig

  /**
   * Cache configuration
   */
  cache?: CacheConfig

  /**
   * Migration configuration
   */
  migrations?: MigrationConfig
}

/**
 * Encryption configuration options
 *
 * @public
 */
export interface EncryptionConfig {
  /**
   * Enable encryption for all data
   */
  enabled: boolean

  /**
   * User passphrase for key derivation
   */
  passphrase?: string

  /**
   * Algorithm to use for encryption
   * @defaultValue 'aes-256-gcm'
   */
  algorithm?: 'aes-256-gcm' | 'chacha20-poly1305'

  /**
   * Fields to encrypt (if not encrypting everything)
   */
  encryptedFields?: string[]
}

/**
 * Compression configuration options
 *
 * @public
 */
export interface CompressionConfig {
  /**
   * Enable compression
   */
  enabled: boolean

  /**
   * Compression algorithm
   * @defaultValue 'auto'
   */
  algorithm?: 'lz4' | 'brotli' | 'auto'

  /**
   * Minimum size to compress (bytes)
   * @defaultValue 1024
   */
  minSize?: number
}

/**
 * Cache configuration options
 *
 * @public
 */
export interface CacheConfig {
  /**
   * Maximum number of items in cache
   * @defaultValue 1000
   */
  maxItems?: number

  /**
   * Maximum cache size in bytes
   * @defaultValue 52428800 (50MB)
   */
  maxSize?: number

  /**
   * Time to live in milliseconds
   * @defaultValue 300000 (5 minutes)
   */
  ttl?: number
}

/**
 * Migration configuration options
 *
 * @public
 */
export interface MigrationConfig {
  /**
   * Auto-run migrations on initialization
   * @defaultValue true
   */
  autoMigrate?: boolean

  /**
   * Custom migration scripts
   */
  scripts?: Migration[]
}

/**
 * Base interface for all storage adapters
 *
 * @remarks
 * All storage implementations (SQLite, Dexie, Memory, etc.) must implement this interface.
 * Provides a unified API for storage operations across different backends.
 *
 * @public
 */
export interface IStorageAdapter {
  /**
   * Retrieve a value by key
   *
   * @param key - The storage key
   * @returns Promise that resolves to the value or null if not found
   *
   * @throws {@link StorageError}
   * Thrown when storage operation fails
   */
  get<T>(key: string): Promise<T | null>

  /**
   * Store a value by key
   *
   * @param key - The storage key
   * @param value - The value to store
   * @returns Promise that resolves when operation completes
   *
   * @throws {@link StorageError}
   * Thrown when storage operation fails
   */
  set<T>(key: string, value: T): Promise<void>

  /**
   * Delete a value by key
   *
   * @param key - The storage key to delete
   * @returns Promise that resolves when operation completes
   */
  delete(key: string): Promise<void>

  /**
   * Clear all storage data
   *
   * @returns Promise that resolves when operation completes
   */
  clear(): Promise<void>

  /**
   * Retrieve multiple values by keys
   *
   * @param keys - Array of storage keys
   * @returns Promise that resolves to a map of key-value pairs
   */
  getMany<T>(keys: string[]): Promise<Map<string, T>>

  /**
   * Store multiple key-value pairs
   *
   * @param items - Map of key-value pairs to store
   * @returns Promise that resolves when operation completes
   */
  setMany<T>(items: Map<string, T>): Promise<void>

  /**
   * List all keys matching optional prefix
   *
   * @param prefix - Optional prefix to filter keys
   * @returns Promise that resolves to array of matching keys
   */
  list(prefix?: string): Promise<string[]>

  /**
   * Count total number of stored items
   *
   * @param prefix - Optional prefix to filter keys
   * @returns Promise that resolves to count of items
   */
  count(prefix?: string): Promise<number>

  /**
   * Check if a key exists
   *
   * @param key - The storage key to check
   * @returns Promise that resolves to true if key exists
   */
  has(key: string): Promise<boolean>

  /**
   * Initialize the storage adapter
   *
   * @returns Promise that resolves when initialization completes
   */
  initialize(): Promise<void>

  /**
   * Close the storage adapter and cleanup resources
   *
   * @returns Promise that resolves when cleanup completes
   */
  close(): Promise<void>

  /**
   * Get storage adapter type
   *
   * @returns The adapter type identifier
   */
  readonly type: string

  /**
   * Get current storage size in bytes
   *
   * @returns Promise that resolves to storage size
   */
  getSize(): Promise<number>
}

/**
 * Storage item metadata
 *
 * @public
 */
export interface StorageMetadata {
  /**
   * Item creation timestamp
   */
  createdAt: number

  /**
   * Item last update timestamp
   */
  updatedAt: number

  /**
   * Item last access timestamp
   */
  accessedAt?: number

  /**
   * Access count for LRU policies
   */
  accessCount?: number

  /**
   * Original size before compression
   */
  originalSize?: number

  /**
   * Compressed size
   */
  compressedSize?: number

  /**
   * Whether item is encrypted
   */
  encrypted?: boolean

  /**
   * Whether item is compressed
   */
  compressed?: boolean

  /**
   * Compression algorithm used
   */
  compressionAlgorithm?: string

  /**
   * Optional expiration timestamp
   */
  expiresAt?: number

  /**
   * Custom metadata tags
   */
  tags?: Record<string, string | number | boolean>
}

/**
 * Storage error types
 *
 * @public
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: StorageErrorCode,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'StorageError'
  }
}

/**
 * Storage error codes
 *
 * @public
 */
export enum StorageErrorCode {
  NOT_FOUND = 'NOT_FOUND',
  INVALID_KEY = 'INVALID_KEY',
  SERIALIZATION_ERROR = 'SERIALIZATION_ERROR',
  ENCRYPTION_ERROR = 'ENCRYPTION_ERROR',
  COMPRESSION_ERROR = 'COMPRESSION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  MIGRATION_ERROR = 'MIGRATION_ERROR',
  INITIALIZATION_ERROR = 'INITIALIZATION_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
}

/**
 * Migration definition
 *
 * @public
 */
export interface Migration {
  /**
   * Migration version number
   */
  version: number

  /**
   * Migration description
   */
  description: string

  /**
   * Migration upgrade function
   *
   * @param adapter - Storage adapter instance
   * @returns Promise that resolves when migration completes
   */
  up(adapter: IStorageAdapter): Promise<void>

  /**
   * Migration downgrade function (optional)
   *
   * @param adapter - Storage adapter instance
   * @returns Promise that resolves when rollback completes
   */
  down?(adapter: IStorageAdapter): Promise<void>
}

/**
 * Namespaced storage interface
 *
 * @remarks
 * Provides scoped storage operations within a specific namespace.
 * All operations are automatically prefixed with the namespace.
 *
 * @public
 */
export interface NamespacedStorage {
  /**
   * The namespace prefix
   */
  readonly namespace: string

  /**
   * Get value from namespaced storage
   */
  get<T>(key: string): Promise<T | null>

  /**
   * Set value in namespaced storage
   */
  set<T>(key: string, value: T): Promise<void>

  /**
   * Delete value from namespaced storage
   */
  delete(key: string): Promise<void>

  /**
   * Clear all values in this namespace
   */
  clear(): Promise<void>

  /**
   * List all keys in this namespace
   */
  list(): Promise<string[]>

  /**
   * Count items in this namespace
   */
  count(): Promise<number>
}
