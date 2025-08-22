/**
 * @fileoverview In-memory storage adapter for testing and fallback
 *
 * @description
 * Simple in-memory storage adapter that implements the IStorageAdapter interface.
 * Primarily used for testing and as a fallback when persistent storage is not available.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { BaseStorageAdapter } from '../core/StorageAdapter'
import type { StorageMetadata } from '../types/storage'
import type { EncryptedData } from '../types/encryption'

/**
 * Type representing the various forms of data that can be stored
 * - string: Raw unprocessed data
 * - EncryptedData: Encrypted data object
 */
type StoredValue = string | EncryptedData

/**
 * In-memory storage adapter implementation
 *
 * @remarks
 * Stores data in memory using Map structures. Data is lost when process exits.
 * Useful for testing and scenarios where persistent storage is not required.
 *
 * @example
 * ```typescript
 * const adapter = new MemoryAdapter({
 *   type: 'memory',
 *   encryption: { enabled: false },
 *   compression: { enabled: false }
 * })
 *
 * await adapter.initialize()
 * await adapter.set('test-key', { data: 'test' })
 * const value = await adapter.get('test-key')
 * ```
 *
 * @public
 */
export class MemoryAdapter extends BaseStorageAdapter {
  /**
   * Internal storage map for data
   */
  private storage = new Map<string, StoredValue>()

  /**
   * Internal storage map for metadata
   */
  private metadata = new Map<string, StorageMetadata>()

  /**
   * Storage adapter type identifier
   */
  public readonly type = 'memory'

  /**
   * Initialize memory adapter
   *
   * @returns Promise that resolves immediately
   */
  protected async initializeAdapter(): Promise<void> {
    // Memory adapter doesn't need initialization
    console.log('📝 Memory storage adapter initialized')
  }

  /**
   * Raw get operation from memory
   *
   * @param key - Storage key
   * @returns Storage item or null if not found
   */
  protected async getRaw(
    key: string
  ): Promise<{ value: StoredValue; metadata?: StorageMetadata } | null> {
    this.validateKey(key)

    if (!this.storage.has(key)) {
      return null
    }

    const value = this.storage.get(key)
    if (value === undefined) {
      return null
    }

    const metadata = this.metadata.get(key)
    const result: { value: StoredValue; metadata?: StorageMetadata } = { value }
    if (metadata !== undefined) {
      result.metadata = metadata
    }
    return result
  }

  /**
   * Raw set operation to memory
   *
   * @param key - Storage key
   * @param value - Value to store
   * @param metadata - Storage metadata
   * @returns Promise that resolves immediately
   */
  protected async setRaw(
    key: string,
    value: StoredValue,
    metadata: StorageMetadata
  ): Promise<void> {
    this.validateKey(key)

    this.storage.set(key, value)
    this.metadata.set(key, metadata)
  }

  /**
   * Raw delete operation from memory
   *
   * @param key - Storage key to delete
   * @returns Promise that resolves immediately
   */
  protected async deleteRaw(key: string): Promise<void> {
    this.validateKey(key)

    this.storage.delete(key)
    this.metadata.delete(key)
  }

  /**
   * Raw clear operation for memory
   *
   * @returns Promise that resolves immediately
   */
  protected async clearRaw(): Promise<void> {
    this.storage.clear()
    this.metadata.clear()
  }

  /**
   * List all keys with optional prefix
   *
   * @param prefix - Optional prefix to filter keys
   * @returns Promise that resolves to array of matching keys
   */
  async list(prefix?: string): Promise<string[]> {
    const keys = Array.from(this.storage.keys())

    if (!prefix) {
      return keys
    }

    return keys.filter((key) => key.startsWith(prefix))
  }

  /**
   * Count total stored items
   *
   * @param prefix - Optional prefix to filter keys
   * @returns Promise that resolves to count of items
   */
  async count(prefix?: string): Promise<number> {
    if (!prefix) {
      return this.storage.size
    }

    return (await this.list(prefix)).length
  }

  /**
   * Check if key exists in memory
   *
   * @param key - Storage key to check
   * @returns Promise that resolves to true if key exists
   */
  async has(key: string): Promise<boolean> {
    this.validateKey(key)
    return this.storage.has(key)
  }

  /**
   * Get storage size in bytes (estimated)
   *
   * @returns Promise that resolves to estimated storage size
   */
  async getSize(): Promise<number> {
    let totalSize = 0

    for (const [key, value] of this.storage) {
      // Estimate size based on JSON serialization
      totalSize += key.length * 2 // UTF-16 characters
      totalSize += JSON.stringify(value).length * 2
    }

    for (const metadata of this.metadata.values()) {
      totalSize += JSON.stringify(metadata).length * 2
    }

    return totalSize
  }

  /**
   * Close memory adapter (cleanup references)
   *
   * @returns Promise that resolves immediately
   */
  async close(): Promise<void> {
    this.storage.clear()
    this.metadata.clear()
    console.log('📝 Memory storage adapter closed')
  }

  /**
   * Optimized batch get operation for memory storage
   *
   * @param keys - Array of storage keys
   * @returns Promise that resolves to map of raw storage items
   */
  protected async getManyRaw(
    keys: string[]
  ): Promise<
    Map<string, { value: StoredValue; metadata?: StorageMetadata } | null>
  > {
    const result = new Map<
      string,
      { value: StoredValue; metadata?: StorageMetadata } | null
    >()

    for (const key of keys) {
      if (this.storage.has(key)) {
        const value = this.storage.get(key)
        if (value !== undefined) {
          const metadata = this.metadata.get(key)
          const item: { value: StoredValue; metadata?: StorageMetadata } = {
            value,
          }
          if (metadata !== undefined) {
            item.metadata = metadata
          }
          result.set(key, item)
        }
      }
      // Don't add non-existent keys to the result map
    }

    return result
  }

  /**
   * Optimized batch set operation for memory storage
   *
   * @param items - Map of key to processed value and metadata
   * @returns Promise that resolves immediately
   */
  protected async setManyRaw(
    items: Map<string, { value: StoredValue; metadata: StorageMetadata }>
  ): Promise<void> {
    for (const [key, item] of items) {
      this.storage.set(key, item.value)
      this.metadata.set(key, item.metadata)
    }
  }

  /**
   * Get internal storage stats (for debugging)
   *
   * @returns Storage statistics
   */
  getStats(): {
    itemCount: number
    estimatedSize: number
    largestItem: string | null
    oldestItem: string | null
  } {
    let largestSize = 0
    let largestKey: string | null = null
    let oldestTime = Date.now()
    let oldestKey: string | null = null

    for (const [key, value] of this.storage) {
      const size = JSON.stringify(value).length
      if (size > largestSize) {
        largestSize = size
        largestKey = key
      }

      const metadata = this.metadata.get(key)
      if (metadata?.createdAt && metadata.createdAt < oldestTime) {
        oldestTime = metadata.createdAt
        oldestKey = key
      }
    }

    return {
      itemCount: this.storage.size,
      estimatedSize: 0, // Will be calculated by getSize()
      largestItem: largestKey,
      oldestItem: oldestKey,
    }
  }
}
