/**
 * @fileoverview Main entry point for @hatcherdx/storage module
 *
 * @description
 * Exports all public APIs for the storage system including adapters,
 * managers, encryption services, and utility functions. Provides a
 * unified interface for all storage operations.
 *
 * @example
 * ```typescript
 * import { StorageManager, EncryptionService } from '@hatcherdx/storage'
 *
 * const storage = new StorageManager({
 *   type: 'sqlite',
 *   path: './data/app.db',
 *   encryption: { enabled: true, passphrase: 'user-passphrase' },
 *   compression: { enabled: true, algorithm: 'auto' }
 * })
 *
 * await storage.initialize()
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

// Core storage components
import { StorageManager as StorageManagerClass } from './core/StorageManager'
export { StorageManagerClass as StorageManager }
export { BaseStorageAdapter } from './core/StorageAdapter'

// Import for internal use
import type { StorageConfig } from './types/storage'

// Storage adapters
export { SQLiteAdapter } from './adapters/SQLiteAdapter'
export { MemoryAdapter } from './adapters/MemoryAdapter'

// Security services
export { EncryptionService } from './security/EncryptionService'
export { Vault } from './security/Vault'

// Performance services
export { CompressionService } from './performance/CompressionService'
export { CacheLayer } from './performance/CacheLayer'

// Query builder
export { UniversalQueryBuilder } from './query/QueryBuilder'

// Migration system
export { MigrationManager } from './migration/MigrationManager'

// Type exports
export type {
  // Storage types
  StorageConfig,
  EncryptionConfig,
  IStorageAdapter,
  NamespacedStorage,
  StorageMetadata,
  StorageError,
  StorageErrorCode,
} from './types/storage'

export type {
  // Encryption types
  EncryptedData,
  DerivedKey,
  KeyDerivationParams,
  IEncryptionService,
  IVault,
  VaultEntry,
  VaultConfig,
  EncryptionError,
  EncryptionErrorCode,
} from './types/encryption'

export type {
  // Compression types
  CompressionConfig,
  CompressionResult,
  CompressionAlgorithm,
  CompressionErrorInterface as CompressionError,
  CompressionErrorCode,
} from './types/compression'

export type {
  // Query types
  QueryBuilder,
  QueryCondition,
  QueryOperator,
  SortDirection,
  AggregateFunction,
  QueryResult,
} from './types/query'

export type {
  // Migration types
  Migration,
} from './migration/MigrationManager'

/**
 * Factory function to create storage manager with common configurations
 *
 * @param config - Storage configuration
 * @returns Configured storage manager instance
 *
 * @example
 * ```typescript
 * // SQLite with encryption and compression
 * const storage = createStorage({
 *   type: 'sqlite',
 *   path: './app.db',
 *   encryption: { enabled: true, passphrase: 'secure-passphrase' },
 *   compression: { enabled: true }
 * })
 *
 * // Memory storage for testing
 * const testStorage = createStorage({ type: 'memory' })
 * ```
 *
 * @public
 */
export function createStorage(config: StorageConfig) {
  return new StorageManagerClass(config)
}

/**
 * Utility function to create secure storage with recommended settings
 *
 * @param path - Database file path
 * @param passphrase - Encryption passphrase
 * @returns Configured storage manager with security enabled
 *
 * @example
 * ```typescript
 * const secureStorage = createSecureStorage('./secure.db', 'my-strong-passphrase')
 * await secureStorage.initialize()
 *
 * // Store sensitive data
 * await secureStorage.vaultStorage.store('api-key', 'secret-key-value')
 * ```
 *
 * @public
 */
export function createSecureStorage(path: string, passphrase: string) {
  return new StorageManagerClass({
    type: 'sqlite',
    path,
    encryption: {
      enabled: true,
      passphrase,
      algorithm: 'aes-256-gcm',
    },
    compression: {
      enabled: true,
      algorithm: 'auto',
      minSize: 1024,
    },
    cache: {
      maxItems: 1000,
      maxSize: 50 * 1024 * 1024, // 50MB
      ttl: 300000, // 5 minutes
    },
  })
}

/**
 * Utility function to create fast storage optimized for performance
 *
 * @param path - Database file path
 * @returns Configured storage manager optimized for speed
 *
 * @example
 * ```typescript
 * const fastStorage = createFastStorage('./cache.db')
 * await fastStorage.initialize()
 *
 * // Fast operations without encryption overhead
 * await fastStorage.set('temp-data', largeDataset)
 * ```
 *
 * @public
 */
export function createFastStorage(path: string) {
  return new StorageManagerClass({
    type: 'sqlite',
    path,
    encryption: { enabled: false },
    compression: {
      enabled: true,
      algorithm: 'lz4', // Prioritize speed
      minSize: 512,
    },
    cache: {
      maxItems: 2000,
      maxSize: 100 * 1024 * 1024, // 100MB
      ttl: 600000, // 10 minutes
    },
  })
}

/**
 * Version information
 *
 * @public
 */
export const VERSION = '1.0.0'
