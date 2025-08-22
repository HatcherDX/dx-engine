/**
 * @fileoverview Main storage manager implementation
 *
 * @description
 * Central storage manager that provides a unified interface for all storage operations.
 * Handles adapter selection, namespace management, and high-level storage APIs.
 *
 * @example
 * ```typescript
 * const storage = new StorageManager({
 *   type: 'sqlite',
 *   path: './data/app.db',
 *   encryption: { enabled: true, passphrase: 'user-passphrase' },
 *   compression: { enabled: true, algorithm: 'auto' }
 * })
 *
 * await storage.initialize()
 * await storage.set('user:preferences', { theme: 'dark' })
 * const prefs = await storage.get('user:preferences')
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import type {
  IStorageAdapter,
  StorageConfig,
  NamespacedStorage,
} from '../types/storage'
import { StorageError, StorageErrorCode } from '../types/storage'
import type { IVault } from '../types/encryption'
import type { QueryBuilder } from '../types/query'
import { MigrationManager, type Migration } from '../migration/MigrationManager'
import { UniversalQueryBuilder } from '../query/QueryBuilder'

/**
 * Main storage manager providing unified storage interface
 *
 * @remarks
 * Central hub for all storage operations. Automatically selects appropriate
 * adapter based on configuration and environment. Provides namespace support
 * and high-level storage APIs.
 *
 * @public
 */
export class StorageManager {
  private adapter: IStorageAdapter | undefined
  private vault?: IVault
  private namespaces = new Map<string, NamespacedStorage>()
  private migrationManager: MigrationManager | undefined
  private pendingMigrations: Migration[] = []

  /**
   * Create new storage manager instance
   *
   * @param config - Storage configuration
   *
   * @throws {@link StorageError}
   * Thrown when configuration is invalid
   */
  private adapterPromise: Promise<IStorageAdapter>

  constructor(private config: StorageConfig) {
    this.adapterPromise = this.createAdapter(config)
    this.adapterPromise
      .then((adapter) => {
        this.adapter = adapter
        this.migrationManager = new MigrationManager(adapter)
      })
      .catch(() => {
        // Prevent unhandled promise rejection
        // Error will be handled during initialize()
      })
  }

  /**
   * Initialize storage manager and underlying adapter
   *
   * @returns Promise that resolves when initialization completes
   *
   * @throws {@link StorageError}
   * Thrown when initialization fails
   */
  async initialize(): Promise<void> {
    try {
      // Wait for adapter to be created
      this.adapter = await this.adapterPromise
      this.migrationManager = new MigrationManager(this.adapter)

      await this.adapter.initialize()

      // Add any pending migrations that were added before initialization
      for (const migration of this.pendingMigrations) {
        this.migrationManager.addMigration(migration)
      }
      this.pendingMigrations = [] // Clear pending migrations

      // Run any pending migrations
      const migrationResults = await this.migrationManager.migrate()
      if (migrationResults.some((r) => !r.success)) {
        const failed = migrationResults.filter((r) => !r.success)
        throw new Error(
          `Migrations failed: ${failed.map((f) => f.version).join(', ')}`
        )
      }

      // Initialize vault if encryption is enabled
      if (this.config.encryption?.enabled) {
        const { Vault } = await import('../security/Vault')
        this.vault = new Vault(this.adapter, this.config.encryption)
      }
    } catch (error) {
      throw new StorageError(
        `Failed to initialize storage: ${error instanceof Error ? error.message : 'Unknown error'}`,
        StorageErrorCode.INITIALIZATION_ERROR,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Get value from storage
   *
   * @param key - Storage key
   * @returns Promise that resolves to value or null if not found
   */
  get<T>(key: string): Promise<T | null> {
    if (!this.adapter) {
      throw new StorageError(
        'Storage not initialized. Call initialize() first.',
        StorageErrorCode.INITIALIZATION_ERROR
      )
    }
    return this.adapter.get<T>(key)
  }

  /**
   * Set value in storage
   *
   * @param key - Storage key
   * @param value - Value to store
   * @returns Promise that resolves when operation completes
   */
  set<T>(key: string, value: T): Promise<void> {
    if (!this.adapter) {
      throw new StorageError(
        'Storage not initialized. Call initialize() first.',
        StorageErrorCode.INITIALIZATION_ERROR
      )
    }
    return this.adapter.set(key, value)
  }

  /**
   * Delete value from storage
   *
   * @param key - Storage key to delete
   * @returns Promise that resolves when operation completes
   */
  delete(key: string): Promise<void> {
    if (!this.adapter) {
      throw new StorageError(
        'Storage not initialized. Call initialize() first.',
        StorageErrorCode.INITIALIZATION_ERROR
      )
    }
    return this.adapter.delete(key)
  }

  /**
   * Clear all storage data
   *
   * @returns Promise that resolves when operation completes
   */
  clear(): Promise<void> {
    if (!this.adapter) {
      throw new StorageError(
        'Storage not initialized. Call initialize() first.',
        StorageErrorCode.INITIALIZATION_ERROR
      )
    }
    return this.adapter.clear()
  }

  /**
   * Get multiple values efficiently
   *
   * @param keys - Array of storage keys
   * @returns Promise that resolves to map of key-value pairs
   */
  getMany<T>(keys: string[]): Promise<Map<string, T>> {
    if (!this.adapter) {
      throw new StorageError(
        'Storage not initialized. Call initialize() first.',
        StorageErrorCode.INITIALIZATION_ERROR
      )
    }
    return this.adapter.getMany<T>(keys)
  }

  /**
   * Set multiple values efficiently
   *
   * @param items - Map of key-value pairs to store
   * @returns Promise that resolves when operation completes
   */
  setMany<T>(items: Map<string, T>): Promise<void> {
    if (!this.adapter) {
      throw new StorageError(
        'Storage not initialized. Call initialize() first.',
        StorageErrorCode.INITIALIZATION_ERROR
      )
    }
    return this.adapter.setMany(items)
  }

  /**
   * List all keys with optional prefix
   *
   * @param prefix - Optional prefix to filter keys
   * @returns Promise that resolves to array of matching keys
   */
  list(prefix?: string): Promise<string[]> {
    if (!this.adapter) {
      throw new StorageError(
        'Storage not initialized. Call initialize() first.',
        StorageErrorCode.INITIALIZATION_ERROR
      )
    }
    return this.adapter.list(prefix)
  }

  /**
   * Count total stored items
   *
   * @param prefix - Optional prefix to filter keys
   * @returns Promise that resolves to count of items
   */
  count(prefix?: string): Promise<number> {
    if (!this.adapter) {
      throw new StorageError(
        'Storage not initialized. Call initialize() first.',
        StorageErrorCode.INITIALIZATION_ERROR
      )
    }
    return this.adapter.count(prefix)
  }

  /**
   * Check if key exists in storage
   *
   * @param key - Storage key to check
   * @returns Promise that resolves to true if key exists
   */
  has(key: string): Promise<boolean> {
    if (!this.adapter) {
      throw new StorageError(
        'Storage not initialized. Call initialize() first.',
        StorageErrorCode.INITIALIZATION_ERROR
      )
    }
    return this.adapter.has(key)
  }

  /**
   * Get storage size in bytes
   *
   * @returns Promise that resolves to storage size
   */
  getSize(): Promise<number> {
    if (!this.adapter) {
      throw new StorageError(
        'Storage not initialized. Call initialize() first.',
        StorageErrorCode.INITIALIZATION_ERROR
      )
    }
    return this.adapter.getSize()
  }

  /**
   * Get namespaced storage instance
   *
   * @param name - Namespace name
   * @returns Namespaced storage instance
   *
   * @example
   * ```typescript
   * const userSettings = storage.namespace('user:settings')
   * await userSettings.set('theme', 'dark')
   * const theme = await userSettings.get('theme')
   * ```
   */
  namespace(name: string): NamespacedStorage {
    if (!this.adapter) {
      throw new StorageError(
        'Storage not initialized. Call initialize() first.',
        StorageErrorCode.INITIALIZATION_ERROR
      )
    }
    if (!this.namespaces.has(name)) {
      this.namespaces.set(name, new NamespacedStorageImpl(this.adapter, name))
    }
    return this.namespaces.get(name)!
  }

  /**
   * Access to vault for ultra-sensitive data
   *
   * @returns Vault instance for secure storage
   *
   * @throws {@link StorageError}
   * Thrown when vault is not available (encryption not enabled)
   */
  get vaultStorage(): IVault {
    if (!this.vault) {
      throw new StorageError(
        'Vault not available. Enable encryption to use vault storage.',
        StorageErrorCode.INITIALIZATION_ERROR
      )
    }
    return this.vault
  }

  /**
   * Close storage manager and cleanup resources
   *
   * @returns Promise that resolves when cleanup completes
   */
  async close(): Promise<void> {
    if (this.adapter) {
      await this.adapter.close()
    }
    this.namespaces.clear()
  }

  /**
   * Get the underlying storage adapter
   *
   * @returns Storage adapter instance
   */
  get underlyingAdapter(): IStorageAdapter {
    if (!this.adapter) {
      throw new StorageError(
        'Storage not initialized. Call initialize() first.',
        StorageErrorCode.INITIALIZATION_ERROR
      )
    }
    return this.adapter
  }

  /**
   * Get storage configuration
   *
   * @returns Storage configuration object
   */
  get configuration(): Readonly<StorageConfig> {
    return { ...this.config }
  }

  /**
   * Add migration to the storage manager
   *
   * @param migration - Migration definition to add
   * @throws Error when migration version already exists
   *
   * @example
   * ```typescript
   * storage.addMigration({
   *   version: '1.1.0',
   *   description: 'Add user preferences table',
   *   up: async (adapter) => {
   *     // Migration logic
   *   }
   * })
   * ```
   */
  addMigration(migration: Migration): void {
    if (!this.migrationManager) {
      // Store migrations until initialization
      this.pendingMigrations.push(migration)
    } else {
      this.migrationManager.addMigration(migration)
    }
  }

  /**
   * Get migration history
   *
   * @returns Promise that resolves to array of applied migrations
   */
  getMigrationHistory(): Promise<
    Array<{
      version: string
      appliedAt: number
      executionTime: number
      description: string
    }>
  > {
    if (!this.migrationManager) {
      throw new StorageError(
        'Cannot get migration history before storage is initialized',
        StorageErrorCode.INITIALIZATION_ERROR
      )
    }
    return this.migrationManager.getHistory()
  }

  /**
   * Get pending migrations
   *
   * @returns Promise that resolves to array of pending migration versions
   */
  getPendingMigrations(): Promise<string[]> {
    if (!this.migrationManager) {
      throw new StorageError(
        'Cannot get pending migrations before storage is initialized',
        StorageErrorCode.INITIALIZATION_ERROR
      )
    }
    return this.migrationManager.getPendingMigrations()
  }

  /**
   * Rollback to specific version
   *
   * @param targetVersion - Version to rollback to
   * @returns Promise that resolves to array of rollback results
   *
   * @example
   * ```typescript
   * await storage.rollback('1.0.0')
   * console.log('Rolled back to version 1.0.0')
   * ```
   */
  rollback(targetVersion: string): Promise<
    Array<{
      version: string
      success: boolean
      executionTime: number
      error?: string
      executedAt: number
    }>
  > {
    if (!this.migrationManager) {
      throw new StorageError(
        'Cannot rollback before storage is initialized',
        StorageErrorCode.INITIALIZATION_ERROR
      )
    }
    return this.migrationManager.rollback(targetVersion)
  }

  /**
   * Create query builder for complex data queries
   *
   * @returns New query builder instance
   *
   * @example
   * ```typescript
   * const users = await storage.query()
   *   .collection('users')
   *   .where('age', '>', 18)
   *   .where('status', '=', 'active')
   *   .orderBy('createdAt', 'desc')
   *   .limit(10)
   *   .execute()
   * ```
   */
  query(): QueryBuilder {
    if (!this.adapter) {
      throw new StorageError(
        'Storage not initialized. Call initialize() first.',
        StorageErrorCode.INITIALIZATION_ERROR
      )
    }
    return new UniversalQueryBuilder(this.adapter)
  }

  /**
   * Create appropriate storage adapter based on configuration
   *
   * @param config - Storage configuration
   * @returns Storage adapter instance
   *
   * @throws {@link StorageError}
   * Thrown when adapter type is not supported
   */
  private async createAdapter(config: StorageConfig): Promise<IStorageAdapter> {
    switch (config.type) {
      case 'sqlite': {
        const { SQLiteAdapter } = await import('../adapters/SQLiteAdapter')
        return new SQLiteAdapter(config)
      }
      case 'memory': {
        const { MemoryAdapter } = await import('../adapters/MemoryAdapter')
        return new MemoryAdapter(config)
      }
      case 'dexie':
        // Placeholder for future Dexie implementation
        throw new StorageError(
          'Dexie adapter not implemented yet. Use sqlite or memory.',
          StorageErrorCode.INITIALIZATION_ERROR
        )
      case 'custom':
        throw new StorageError(
          'Custom adapter type requires providing adapter instance',
          StorageErrorCode.INITIALIZATION_ERROR
        )
      default:
        throw new StorageError(
          `Unsupported storage type: ${(config as { type: string }).type}`,
          StorageErrorCode.INITIALIZATION_ERROR
        )
    }
  }
}

/**
 * Namespaced storage implementation
 *
 * @internal
 */
class NamespacedStorageImpl implements NamespacedStorage {
  constructor(
    private adapter: IStorageAdapter,
    public readonly namespace: string
  ) {}

  /**
   * Create namespaced key
   *
   * @param key - Original key
   * @returns Namespaced key
   */
  private namespacedKey(key: string): string {
    return `${this.namespace}:${key}`
  }

  /**
   * Remove namespace from key
   *
   * @param namespacedKey - Namespaced key
   * @returns Original key
   */
  private originalKey(namespacedKey: string): string {
    const prefix = `${this.namespace}:`
    return namespacedKey.startsWith(prefix)
      ? namespacedKey.slice(prefix.length)
      : namespacedKey
  }

  async get<T>(key: string): Promise<T | null> {
    return this.adapter.get<T>(this.namespacedKey(key))
  }

  async set<T>(key: string, value: T): Promise<void> {
    return this.adapter.set(this.namespacedKey(key), value)
  }

  async delete(key: string): Promise<void> {
    return this.adapter.delete(this.namespacedKey(key))
  }

  async clear(): Promise<void> {
    const keys = await this.list()
    await Promise.all(keys.map((key) => this.delete(key)))
  }

  async list(): Promise<string[]> {
    const allKeys = await this.adapter.list(this.namespace)
    return allKeys.map((key) => this.originalKey(key))
  }

  async count(): Promise<number> {
    return this.adapter.count(this.namespace)
  }
}
