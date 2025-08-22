/**
 * @fileoverview Base storage adapter implementation
 *
 * @description
 * Abstract base class that provides common functionality for all storage adapters.
 * Handles encryption, compression, caching, and metadata management.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { randomUUID } from 'crypto'
import type {
  IStorageAdapter,
  StorageConfig,
  StorageMetadata,
} from '../types/storage'
import { StorageError, StorageErrorCode } from '../types/storage'
import type { IEncryptionService, EncryptedData } from '../types/encryption'
import type { CompressionService } from '../performance/CompressionService'
import type { CompressionAlgorithm } from '../types/compression'
import type { CacheLayer } from '../performance/CacheLayer'

/**
 * Type representing the various forms of data that can be stored
 * - string: Raw unprocessed data
 * - EncryptedData: Encrypted data object
 */
type StoredValue = string | EncryptedData

/**
 * Abstract base storage adapter with common functionality
 *
 * @remarks
 * Provides encryption, compression, caching, and metadata management
 * for all storage adapter implementations. Concrete adapters only need
 * to implement the raw storage operations.
 *
 * @public
 */
export abstract class BaseStorageAdapter implements IStorageAdapter {
  protected config: StorageConfig
  protected encryption?: IEncryptionService
  protected compression?: CompressionService
  protected cache?: CacheLayer
  protected initialized = false

  constructor(config: StorageConfig) {
    this.config = config
  }

  /**
   * Initialize the storage adapter with optional services
   *
   * @returns Promise that resolves when initialization completes
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    // Initialize encryption if enabled
    if (this.config.encryption?.enabled) {
      const { EncryptionService } = await import(
        '../security/EncryptionService'
      )
      this.encryption = new EncryptionService(this.config.encryption)
      await this.encryption.deriveKey(
        this.config.encryption.passphrase || 'default-key'
      )
    }

    // Initialize compression if enabled
    if (this.config.compression?.enabled) {
      const { CompressionService } = await import(
        '../performance/CompressionService'
      )
      this.compression = new CompressionService(this.config.compression)
    }

    // Initialize cache if configured
    if (this.config.cache) {
      const { CacheLayer } = await import('../performance/CacheLayer')
      this.cache = new CacheLayer(this.config.cache)
    }

    // Initialize the concrete adapter
    await this.initializeAdapter()
    this.initialized = true
  }

  /**
   * Get value with automatic decryption/decompression
   *
   * @param key - Storage key
   * @returns Promise that resolves to value or null
   */
  async get<T>(key: string): Promise<T | null> {
    this.assertInitialized()

    // Check cache first
    if (this.cache) {
      const cached = await this.cache.get(key)
      if (cached !== undefined) {
        return cached as T
      }
    }

    const item = await this.getRaw(key)
    if (!item) {
      return null
    }

    let value = item.value

    // Decompress if needed
    if (item.metadata?.compressed && this.compression) {
      if (typeof value === 'string') {
        value = await this.compression.decompress(
          Buffer.from(value, 'base64'),
          item.metadata.compressionAlgorithm as CompressionAlgorithm
        )
      }
    }

    // Decrypt if needed
    if (
      item.metadata?.encrypted &&
      this.encryption &&
      typeof value !== 'string'
    ) {
      value = (await this.encryption.decrypt(value as EncryptedData)) as string
    }

    // Parse JSON
    const result = typeof value === 'string' ? JSON.parse(value) : value

    // Update cache
    if (this.cache) {
      await this.cache.set(key, result)
    }

    // Update access metadata (skip if encryption is enabled to avoid FTS conflicts)
    if (!this.config.encryption?.enabled) {
      await this.updateAccessMetadata(key)
    }

    return result as T
  }

  /**
   * Set value with automatic encryption/compression
   *
   * @param key - Storage key
   * @param value - Value to store
   * @returns Promise that resolves when operation completes
   */
  async set<T>(key: string, value: T): Promise<void> {
    this.assertInitialized()

    let processedValue: string = JSON.stringify(value)
    const metadata: Partial<StorageMetadata> = {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      originalSize: processedValue.length,
    }

    // Compress if enabled and beneficial
    if (
      this.compression &&
      processedValue.length > (this.config.compression?.minSize || 1024)
    ) {
      const compressed = await this.compression.compress(processedValue)
      if (compressed.compressed) {
        if (typeof compressed.data === 'string') {
          processedValue = compressed.data
        } else {
          processedValue = compressed.data.toString('base64')
        }
        metadata.compressed = true
        metadata.compressedSize =
          typeof compressed.data === 'string'
            ? compressed.data.length
            : compressed.data.length
        metadata.compressionAlgorithm = compressed.algorithm
      }
    }

    // Encrypt if enabled
    let finalValue: StoredValue = processedValue
    if (this.encryption) {
      const encryptedData = await this.encryption.encrypt(processedValue)
      finalValue = encryptedData
      metadata.encrypted = true
    }

    await this.setRaw(key, finalValue, metadata as StorageMetadata)

    // Update cache
    if (this.cache) {
      await this.cache.set(key, value)
    }
  }

  /**
   * Delete value and clear from cache
   *
   * @param key - Storage key to delete
   * @returns Promise that resolves when operation completes
   */
  async delete(key: string): Promise<void> {
    this.assertInitialized()

    await this.deleteRaw(key)

    // Clear from cache
    if (this.cache) {
      this.cache.delete(key)
    }
  }

  /**
   * Clear all storage and cache
   *
   * @returns Promise that resolves when operation completes
   */
  async clear(): Promise<void> {
    this.assertInitialized()

    await this.clearRaw()

    // Clear cache
    if (this.cache) {
      this.cache.clear()
    }
  }

  /**
   * Get multiple values efficiently
   *
   * @param keys - Array of storage keys
   * @returns Promise that resolves to map of key-value pairs
   */
  async getMany<T>(keys: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>()

    // Use batch operation if available, otherwise get individually
    if (this.getManyRaw) {
      const items = await this.getManyRaw(keys)
      for (const [key, item] of items) {
        if (item) {
          const value = await this.processRetrievedValue<T>(item)
          if (value !== null) {
            result.set(key, value)
          } else {
            result.set(key, null as T)
          }
        } else {
          result.set(key, null as T)
        }
      }
    } else {
      // Fallback to individual gets
      await Promise.all(
        keys.map(async (key) => {
          const value = await this.get<T>(key)
          result.set(key, value as T)
        })
      )
    }

    return result
  }

  /**
   * Set multiple values efficiently
   *
   * @param items - Map of key-value pairs to store
   * @returns Promise that resolves when operation completes
   */
  async setMany<T>(items: Map<string, T>): Promise<void> {
    // Use batch operation if available, otherwise set individually
    if (this.setManyRaw) {
      const processedItems = new Map<
        string,
        { value: StoredValue; metadata: StorageMetadata }
      >()

      for (const [key, value] of items) {
        const processed = await this.processValueForStorage(value)
        processedItems.set(key, processed)
      }

      await this.setManyRaw(processedItems)
    } else {
      // Fallback to individual sets
      await Promise.all(
        Array.from(items.entries()).map(([key, value]) => this.set(key, value))
      )
    }

    // Update cache for all items
    if (this.cache) {
      for (const [key, value] of items) {
        await this.cache.set(key, value)
      }
    }
  }

  // Abstract methods that concrete adapters must implement

  /**
   * Initialize the concrete storage adapter
   *
   * @returns Promise that resolves when adapter initialization completes
   */
  protected abstract initializeAdapter(): Promise<void>

  /**
   * Raw get operation (without processing)
   *
   * @param key - Storage key
   * @returns Promise that resolves to raw storage item or null
   */
  protected abstract getRaw(
    key: string
  ): Promise<{ value: StoredValue; metadata?: StorageMetadata } | null>

  /**
   * Raw set operation (without processing)
   *
   * @param key - Storage key
   * @param value - Processed value to store
   * @param metadata - Storage metadata
   * @returns Promise that resolves when operation completes
   */
  protected abstract setRaw(
    key: string,
    value: StoredValue,
    metadata: StorageMetadata
  ): Promise<void>

  /**
   * Raw delete operation
   *
   * @param key - Storage key to delete
   * @returns Promise that resolves when operation completes
   */
  protected abstract deleteRaw(key: string): Promise<void>

  /**
   * Raw clear operation
   *
   * @returns Promise that resolves when operation completes
   */
  protected abstract clearRaw(): Promise<void>

  /**
   * List keys with optional prefix
   *
   * @param prefix - Optional prefix to filter keys
   * @returns Promise that resolves to array of matching keys
   */
  public abstract list(prefix?: string): Promise<string[]>

  /**
   * Count items with optional prefix
   *
   * @param prefix - Optional prefix to filter keys
   * @returns Promise that resolves to count of items
   */
  public abstract count(prefix?: string): Promise<number>

  /**
   * Check if key exists
   *
   * @param key - Storage key to check
   * @returns Promise that resolves to true if key exists
   */
  public abstract has(key: string): Promise<boolean>

  /**
   * Close the storage adapter
   *
   * @returns Promise that resolves when cleanup completes
   */
  public abstract close(): Promise<void>

  /**
   * Get storage adapter type
   */
  public abstract readonly type: string

  /**
   * Get storage size in bytes
   *
   * @returns Promise that resolves to storage size
   */
  public abstract getSize(): Promise<number>

  // Optional methods for batch operations (concrete adapters can override)

  /**
   * Raw batch get operation (optional optimization)
   *
   * @param keys - Array of storage keys
   * @returns Promise that resolves to map of raw storage items
   */
  protected getManyRaw?(
    keys: string[]
  ): Promise<
    Map<string, { value: StoredValue; metadata?: StorageMetadata } | null>
  >

  /**
   * Raw batch set operation (optional optimization)
   *
   * @param items - Map of key to processed value and metadata
   * @returns Promise that resolves when operation completes
   */
  protected setManyRaw?(
    items: Map<string, { value: StoredValue; metadata: StorageMetadata }>
  ): Promise<void>

  // Helper methods

  /**
   * Process value for storage (compress + encrypt)
   *
   * @param value - Value to process
   * @returns Processed value with metadata
   */
  private async processValueForStorage<T>(
    value: T
  ): Promise<{ value: StoredValue; metadata: StorageMetadata }> {
    let processedValue: string = JSON.stringify(value)
    const metadata: Partial<StorageMetadata> = {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      originalSize: processedValue.length,
    }

    // Compress if enabled and beneficial
    if (
      this.compression &&
      processedValue.length > (this.config.compression?.minSize || 1024)
    ) {
      const compressed = await this.compression.compress(processedValue)
      if (compressed.compressed) {
        if (typeof compressed.data === 'string') {
          processedValue = compressed.data
        } else {
          processedValue = compressed.data.toString('base64')
        }
        metadata.compressed = true
        metadata.compressedSize =
          typeof compressed.data === 'string'
            ? compressed.data.length
            : compressed.data.length
        metadata.compressionAlgorithm = compressed.algorithm
      }
    }

    // Encrypt if enabled
    let finalValue: StoredValue = processedValue
    if (this.encryption) {
      const encryptedData = await this.encryption.encrypt(processedValue)
      finalValue = encryptedData
      metadata.encrypted = true
    }

    return { value: finalValue, metadata: metadata as StorageMetadata }
  }

  /**
   * Process retrieved value (decrypt + decompress)
   *
   * @param item - Raw storage item
   * @returns Processed value
   */
  private async processRetrievedValue<T>(item: {
    value: StoredValue
    metadata?: StorageMetadata
  }): Promise<T | null> {
    let value = item.value

    // Decompress if needed
    if (item.metadata?.compressed && this.compression) {
      if (typeof value === 'string') {
        value = await this.compression.decompress(
          Buffer.from(value, 'base64'),
          item.metadata.compressionAlgorithm as CompressionAlgorithm
        )
      }
    }

    // Decrypt if needed
    if (
      item.metadata?.encrypted &&
      this.encryption &&
      typeof value !== 'string'
    ) {
      value = (await this.encryption.decrypt(value as EncryptedData)) as string
    }

    // Parse JSON
    return typeof value === 'string' ? (JSON.parse(value) as T) : null
  }

  /**
   * Update access metadata for LRU tracking
   *
   * @param key - Storage key
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async updateAccessMetadata(_key: string): Promise<void> {
    // This is optional - concrete adapters can implement if they support metadata updates
  }

  /**
   * Assert that adapter is initialized
   *
   * @throws {@link StorageError}
   * Thrown when adapter is not initialized
   */
  protected assertInitialized(): void {
    if (!this.initialized) {
      throw new StorageError(
        'Storage adapter not initialized. Call initialize() first.',
        StorageErrorCode.INITIALIZATION_ERROR
      )
    }
  }

  /**
   * Generate unique ID for storage items
   *
   * @returns Unique identifier string
   */
  protected generateId(): string {
    return randomUUID()
  }

  /**
   * Validate storage key format
   *
   * @param key - Key to validate
   * @throws {@link StorageError}
   * Thrown when key format is invalid
   */
  protected validateKey(key: string): void {
    if (!key || typeof key !== 'string') {
      throw new StorageError(
        'Storage key must be a non-empty string',
        StorageErrorCode.INVALID_KEY
      )
    }

    if (key.length > 250) {
      throw new StorageError(
        'Storage key cannot exceed 250 characters',
        StorageErrorCode.INVALID_KEY
      )
    }

    // Additional validation can be added here
  }
}
