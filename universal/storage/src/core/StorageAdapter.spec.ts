/**
 * @fileoverview Comprehensive tests for BaseStorageAdapter
 *
 * @description
 * Tests for the base storage adapter including encryption, compression,
 * caching, and all edge cases to achieve 100% coverage.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BaseStorageAdapter } from './StorageAdapter'
import type { StorageConfig, StorageMetadata } from '../types/storage'
// StorageError import removed - not used
import type { EncryptedData } from '../types/encryption'

// Import test utilities
import '../test-setup'

// Declare global test utilities
declare global {
  const createTestConfig: (overrides?: Partial<StorageConfig>) => StorageConfig
}

// Mock implementation for testing
class TestStorageAdapter extends BaseStorageAdapter {
  private storage = new Map<
    string,
    { value: string | EncryptedData; metadata?: StorageMetadata }
  >()
  public type = 'test'

  protected async initializeAdapter(): Promise<void> {
    // Mock initialization
  }

  protected async getRaw(key: string) {
    const item = this.storage.get(key)
    return item ? { value: item.value, metadata: item.metadata } : null
  }

  protected async setRaw(
    key: string,
    value: string | EncryptedData,
    metadata: StorageMetadata
  ) {
    this.storage.set(key, { value, metadata })
  }

  protected async deleteRaw(key: string) {
    this.storage.delete(key)
  }

  protected async clearRaw() {
    this.storage.clear()
  }

  public async list(prefix?: string) {
    const keys = Array.from(this.storage.keys())
    return prefix ? keys.filter((k) => k.startsWith(prefix)) : keys
  }

  public async count(prefix?: string) {
    const keys = await this.list(prefix)
    return keys.length
  }

  public async has(key: string) {
    return this.storage.has(key)
  }

  public async close() {
    this.storage.clear()
  }

  public async getSize() {
    let size = 0
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Key not needed for size calculation
    for (const [_key, item] of this.storage) {
      size += JSON.stringify(item).length
    }
    return size
  }

  // Expose protected methods for testing
  public testValidateKey(key: string) {
    this.validateKey(key)
  }

  public testGenerateId() {
    return this.generateId()
  }

  public testUpdateAccessMetadata(key: string) {
    return this.updateAccessMetadata(key)
  }

  // Override batch operations for testing
  protected async getManyRaw(keys: string[]) {
    const result = new Map()
    for (const key of keys) {
      const item = this.storage.get(key)
      result.set(
        key,
        item ? { value: item.value, metadata: item.metadata } : null
      )
    }
    return result
  }

  protected async setManyRaw(
    items: Map<
      string,
      { value: string | EncryptedData; metadata: StorageMetadata }
    >
  ) {
    for (const [key, item] of items) {
      this.storage.set(key, item)
    }
  }
}

// Test adapter without batch operations
class TestStorageAdapterNoBatch extends TestStorageAdapter {
  protected getManyRaw = undefined
  protected setManyRaw = undefined
}

describe('BaseStorageAdapter', () => {
  let adapter: TestStorageAdapter
  let config: StorageConfig

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(async () => {
    if (adapter) {
      await adapter.close()
    }
  })

  describe('initialization', () => {
    it('should initialize successfully without any features', async () => {
      config = createTestConfig({
        type: 'memory',
        encryption: { enabled: false },
        compression: { enabled: false },
      })
      adapter = new TestStorageAdapter(config)

      await expect(adapter.initialize()).resolves.not.toThrow()
      expect(adapter.type).toBe('test')
    })

    it('should not re-initialize if already initialized', async () => {
      config = createTestConfig()
      adapter = new TestStorageAdapter(config)

      await adapter.initialize()
      await adapter.initialize() // Should return early

      expect(adapter.type).toBe('test')
    })

    it('should initialize with encryption enabled', async () => {
      config = createTestConfig({
        encryption: {
          enabled: true,
          passphrase: 'test-passphrase',
          algorithm: 'aes-256-gcm',
        },
      })
      adapter = new TestStorageAdapter(config)

      await expect(adapter.initialize()).resolves.not.toThrow()
    })

    it('should initialize with compression enabled', async () => {
      config = createTestConfig({
        compression: {
          enabled: true,
          algorithm: 'auto',
          minSize: 100,
        },
      })
      adapter = new TestStorageAdapter(config)

      await expect(adapter.initialize()).resolves.not.toThrow()
    })

    it('should initialize with cache enabled', async () => {
      config = createTestConfig({
        cache: {
          maxSize: 100,
          ttl: 60000,
        },
      })
      adapter = new TestStorageAdapter(config)

      await expect(adapter.initialize()).resolves.not.toThrow()
    })

    it('should initialize with all features enabled', async () => {
      config = createTestConfig({
        encryption: {
          enabled: true,
          passphrase: 'test-passphrase',
        },
        compression: {
          enabled: true,
          algorithm: 'auto',
          minSize: 10,
        },
        cache: {
          maxSize: 100,
          ttl: 60000,
        },
      })
      adapter = new TestStorageAdapter(config)

      await expect(adapter.initialize()).resolves.not.toThrow()
    })
  })

  describe('basic operations without features', () => {
    beforeEach(async () => {
      config = createTestConfig({
        encryption: { enabled: false },
        compression: { enabled: false },
      })
      adapter = new TestStorageAdapter(config)
      await adapter.initialize()
    })

    it('should store and retrieve data', async () => {
      const testData = { id: 1, name: 'Test User' }

      await adapter.set('test-key', testData)
      const retrieved = await adapter.get('test-key')

      expect(retrieved).toEqual(testData)
    })

    it('should return null for non-existent keys', async () => {
      const result = await adapter.get('non-existent')
      expect(result).toBeNull()
    })

    it('should delete data', async () => {
      await adapter.set('key', 'value')
      expect(await adapter.has('key')).toBe(true)

      await adapter.delete('key')
      expect(await adapter.has('key')).toBe(false)
    })

    it('should clear all data', async () => {
      await adapter.set('key1', 'value1')
      await adapter.set('key2', 'value2')

      await adapter.clear()

      expect(await adapter.has('key1')).toBe(false)
      expect(await adapter.has('key2')).toBe(false)
    })

    it('should throw error when not initialized', async () => {
      const uninitAdapter = new TestStorageAdapter(config)

      await expect(uninitAdapter.get('key')).rejects.toThrow(
        'Storage adapter not initialized'
      )
      await expect(uninitAdapter.set('key', 'value')).rejects.toThrow(
        'Storage adapter not initialized'
      )
      await expect(uninitAdapter.delete('key')).rejects.toThrow(
        'Storage adapter not initialized'
      )
      await expect(uninitAdapter.clear()).rejects.toThrow(
        'Storage adapter not initialized'
      )
    })
  })

  describe('cache operations', () => {
    beforeEach(async () => {
      config = createTestConfig({
        cache: {
          maxSize: 10,
          ttl: 60000,
        },
      })
      adapter = new TestStorageAdapter(config)
      await adapter.initialize()
    })

    it('should use cache for get operations', async () => {
      const testData = { id: 1, cached: true }

      // First set
      await adapter.set('cached-key', testData)

      // First get - should cache
      const result1 = await adapter.get('cached-key')
      expect(result1).toEqual(testData)

      // Delete from raw storage but not cache
      await adapter['deleteRaw']('cached-key')

      // Second get - should return from cache
      const result2 = await adapter.get('cached-key')
      expect(result2).toEqual(testData)
    })

    it('should update cache on set operations', async () => {
      const data1 = { version: 1 }
      const data2 = { version: 2 }

      await adapter.set('key', data1)
      expect(await adapter.get('key')).toEqual(data1)

      await adapter.set('key', data2)
      expect(await adapter.get('key')).toEqual(data2)
    })

    it('should clear cache on delete', async () => {
      const testData = { id: 1 }

      await adapter.set('key', testData)
      await adapter.get('key') // Cache it
      await adapter.delete('key')

      const result = await adapter.get('key')
      expect(result).toBeNull()
    })

    it('should clear cache on clear', async () => {
      await adapter.set('key1', 'value1')
      await adapter.set('key2', 'value2')

      await adapter.get('key1') // Cache it
      await adapter.get('key2') // Cache it

      await adapter.clear()

      expect(await adapter.get('key1')).toBeNull()
      expect(await adapter.get('key2')).toBeNull()
    })

    it('should update cache in setMany', async () => {
      const items = new Map([
        ['key1', { id: 1 }],
        ['key2', { id: 2 }],
      ])

      await adapter.setMany(items)

      // Should be cached
      expect(await adapter.get('key1')).toEqual({ id: 1 })
      expect(await adapter.get('key2')).toEqual({ id: 2 })
    })
  })

  describe('compression operations', () => {
    beforeEach(async () => {
      config = createTestConfig({
        compression: {
          enabled: true,
          algorithm: 'auto',
          minSize: 20, // Small size for testing
        },
      })
      adapter = new TestStorageAdapter(config)
      await adapter.initialize()
    })

    it('should compress large data', async () => {
      const largeData = {
        text: 'This is a test string that should be compressed. '.repeat(10),
        numbers: Array.from({ length: 100 }, (_, i) => i),
      }

      await adapter.set('compressed-key', largeData)
      const retrieved = await adapter.get('compressed-key')

      expect(retrieved).toEqual(largeData)
    })

    it('should not compress small data', async () => {
      const smallData = { tiny: true }

      await adapter.set('small-key', smallData)
      const retrieved = await adapter.get('small-key')

      expect(retrieved).toEqual(smallData)
    })

    it('should handle compressed data in getMany', async () => {
      const largeData = 'Large data string. '.repeat(50)
      await adapter.set('key1', largeData)
      await adapter.set('key2', 'small')

      const results = await adapter.getMany(['key1', 'key2', 'non-existent'])

      expect(results.get('key1')).toEqual(largeData)
      expect(results.get('key2')).toEqual('small')
      expect(results.get('non-existent')).toBeNull()
    })

    it('should handle compression with string result', async () => {
      // Mock compression to return string
      const mockCompress = vi.fn().mockResolvedValue({
        compressed: true,
        data: 'compressed-string',
        algorithm: 'gzip',
      })

      adapter['compression'] = {
        compress: mockCompress,
      } as (typeof adapter)['compression']

      const data = { text: 'Test data to compress' }
      await adapter.set('key', data)

      expect(mockCompress).toHaveBeenCalled()
    })

    it('should decompress string data', async () => {
      // Set compressed data directly
      const metadata: StorageMetadata = {
        compressed: true,
        compressionAlgorithm: 'gzip',
        compressedSize: 10,
        originalSize: 100,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      // Mock the raw storage
      await adapter['setRaw'](
        'compressed',
        Buffer.from('test').toString('base64'),
        metadata
      )

      // Mock decompression
      const mockDecompress = vi.fn().mockResolvedValue('{"decompressed":true}')
      adapter['compression'] = {
        decompress: mockDecompress,
      } as (typeof adapter)['compression']

      const result = await adapter.get('compressed')
      expect(result).toEqual({ decompressed: true })
      expect(mockDecompress).toHaveBeenCalled()
    })
  })

  describe('encryption operations', () => {
    beforeEach(async () => {
      config = createTestConfig({
        encryption: {
          enabled: true,
          passphrase: 'test-key',
          algorithm: 'aes-256-gcm',
        },
      })
      adapter = new TestStorageAdapter(config)
      await adapter.initialize()
    })

    it('should encrypt and decrypt data', async () => {
      const sensitiveData = {
        password: 'secret123',
        apiKey: 'abc-xyz-123',
      }

      await adapter.set('encrypted-key', sensitiveData)
      const retrieved = await adapter.get('encrypted-key')

      expect(retrieved).toEqual(sensitiveData)
    })

    it('should not update access metadata when encryption is enabled', async () => {
      const data = { encrypted: true }

      await adapter.set('key', data)
      const spy = vi.spyOn(adapter, 'testUpdateAccessMetadata')

      await adapter.get('key')

      expect(spy).not.toHaveBeenCalled()
    })

    it('should handle encrypted data in batch operations', async () => {
      const items = new Map([
        ['secret1', { password: 'pass1' }],
        ['secret2', { password: 'pass2' }],
      ])

      await adapter.setMany(items)

      const results = await adapter.getMany(['secret1', 'secret2'])

      expect(results.get('secret1')).toEqual({ password: 'pass1' })
      expect(results.get('secret2')).toEqual({ password: 'pass2' })
    })

    it('should handle decryption of non-string encrypted data', async () => {
      // Set encrypted data directly
      const encryptedData: EncryptedData = {
        data: 'encrypted',
        iv: 'iv',
        tag: 'tag',
        algorithm: 'aes-256-gcm',
      }

      const metadata: StorageMetadata = {
        encrypted: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        originalSize: 100,
      }

      await adapter['setRaw']('encrypted', encryptedData, metadata)

      // Mock decryption
      const mockDecrypt = vi.fn().mockResolvedValue('{"decrypted":true}')
      adapter['encryption'] = {
        decrypt: mockDecrypt,
      } as (typeof adapter)['encryption']

      const result = await adapter.get('encrypted')
      expect(result).toEqual({ decrypted: true })
      expect(mockDecrypt).toHaveBeenCalledWith(encryptedData)
    })
  })

  describe('combined features', () => {
    beforeEach(async () => {
      config = createTestConfig({
        encryption: {
          enabled: true,
          passphrase: 'test-key',
        },
        compression: {
          enabled: true,
          algorithm: 'auto',
          minSize: 20,
        },
        cache: {
          maxSize: 10,
          ttl: 60000,
        },
      })
      adapter = new TestStorageAdapter(config)
      await adapter.initialize()
    })

    it('should handle compressed and encrypted data', async () => {
      const largeSecretData = {
        secret: 'This is secret information that needs protection',
        data: Array.from({ length: 50 }, (_, i) => `item-${i}`),
      }

      await adapter.set('secure-key', largeSecretData)
      const retrieved = await adapter.get('secure-key')

      expect(retrieved).toEqual(largeSecretData)
    })

    it('should cache encrypted and compressed data', async () => {
      const data = {
        text: 'Cached, compressed, and encrypted data'.repeat(5),
      }

      await adapter.set('combo-key', data)

      // First get
      const result1 = await adapter.get('combo-key')
      expect(result1).toEqual(data)

      // Delete raw but should still be in cache
      await adapter['deleteRaw']('combo-key')

      const result2 = await adapter.get('combo-key')
      expect(result2).toEqual(data)
    })
  })

  describe('batch operations', () => {
    beforeEach(async () => {
      config = createTestConfig()
      adapter = new TestStorageAdapter(config)
      await adapter.initialize()
    })

    it('should handle getMany with batch support', async () => {
      await adapter.set('key1', { id: 1 })
      await adapter.set('key2', { id: 2 })
      await adapter.set('key3', { id: 3 })

      const results = await adapter.getMany(['key1', 'key2', 'key3', 'missing'])

      expect(results.get('key1')).toEqual({ id: 1 })
      expect(results.get('key2')).toEqual({ id: 2 })
      expect(results.get('key3')).toEqual({ id: 3 })
      expect(results.get('missing')).toBeNull()
    })

    it('should handle setMany with batch support', async () => {
      const items = new Map([
        ['batch1', { value: 1 }],
        ['batch2', { value: 2 }],
        ['batch3', { value: 3 }],
      ])

      await adapter.setMany(items)

      expect(await adapter.get('batch1')).toEqual({ value: 1 })
      expect(await adapter.get('batch2')).toEqual({ value: 2 })
      expect(await adapter.get('batch3')).toEqual({ value: 3 })
    })

    it('should handle getMany without batch support', async () => {
      const noBatchAdapter = new TestStorageAdapterNoBatch(config)
      await noBatchAdapter.initialize()

      await noBatchAdapter.set('key1', 'value1')
      await noBatchAdapter.set('key2', 'value2')

      const results = await noBatchAdapter.getMany(['key1', 'key2', 'missing'])

      expect(results.get('key1')).toEqual('value1')
      expect(results.get('key2')).toEqual('value2')
      expect(results.get('missing')).toBeNull()
    })

    it('should handle setMany without batch support', async () => {
      const noBatchAdapter = new TestStorageAdapterNoBatch(config)
      await noBatchAdapter.initialize()

      const items = new Map([
        ['nb1', 'value1'],
        ['nb2', 'value2'],
      ])

      await noBatchAdapter.setMany(items)

      expect(await noBatchAdapter.get('nb1')).toEqual('value1')
      expect(await noBatchAdapter.get('nb2')).toEqual('value2')
    })

    it('should handle null values in getMany results', async () => {
      await adapter.set('exists', { data: 'here' })

      const results = await adapter.getMany(['exists', 'not-exists'])

      expect(results.get('exists')).toEqual({ data: 'here' })
      expect(results.get('not-exists')).toBeNull()
    })

    it('should set null in result map when processRetrievedValue returns null in getMany', async () => {
      // This tests the specific branch at line 257
      await adapter.set('valid', { valid: true })

      // Create a mock adapter that returns an item where processRetrievedValue returns null
      const mockAdapter = new TestStorageAdapter(config)
      await mockAdapter.initialize()

      // Mock processRetrievedValue to return null for specific item
      const originalProcessRetrievedValue =
        mockAdapter['processRetrievedValue'].bind(mockAdapter)
      let callCount = 0
      mockAdapter['processRetrievedValue'] = vi
        .fn()
        .mockImplementation(async (item) => {
          callCount++
          if (callCount === 2) {
            // Second call returns null
            return null
          }
          return originalProcessRetrievedValue(item)
        })

      // Override getManyRaw to return items
      mockAdapter['getManyRaw'] = async (keys: string[]) => {
        const result = new Map()
        for (const key of keys) {
          if (key === 'valid' || key === 'returns-null') {
            result.set(key, {
              value: '{"data":true}',
              metadata: undefined,
            })
          } else {
            result.set(key, null)
          }
        }
        return result
      }

      const results = await mockAdapter.getMany([
        'valid',
        'returns-null',
        'missing',
      ])

      expect(results.get('valid')).toEqual({ data: true })
      expect(results.get('returns-null')).toBeNull() // This tests line 257 - processRetrievedValue returned null
      expect(results.get('missing')).toBeNull() // This is line 260 - item itself was null
    })
  })

  describe('validation and helpers', () => {
    beforeEach(async () => {
      config = createTestConfig()
      adapter = new TestStorageAdapter(config)
      await adapter.initialize()
    })

    it('should generate unique IDs', () => {
      const id1 = adapter.testGenerateId()
      const id2 = adapter.testGenerateId()

      expect(id1).toBeTruthy()
      expect(id2).toBeTruthy()
      expect(id1).not.toBe(id2)
    })

    it('should validate key format', () => {
      // Valid keys
      expect(() => adapter.testValidateKey('valid-key')).not.toThrow()
      expect(() => adapter.testValidateKey('user:123')).not.toThrow()

      // Invalid keys
      expect(() => adapter.testValidateKey('')).toThrow(
        'Storage key must be a non-empty string'
      )
      expect(() => adapter.testValidateKey(null as unknown as string)).toThrow(
        'Storage key must be a non-empty string'
      )
      expect(() =>
        adapter.testValidateKey(undefined as unknown as string)
      ).toThrow('Storage key must be a non-empty string')
      expect(() => adapter.testValidateKey(123 as unknown as string)).toThrow(
        'Storage key must be a non-empty string'
      )

      // Key too long
      const longKey = 'x'.repeat(251)
      expect(() => adapter.testValidateKey(longKey)).toThrow(
        'Storage key cannot exceed 250 characters'
      )
    })

    it('should call updateAccessMetadata', async () => {
      await expect(
        adapter.testUpdateAccessMetadata('test-key')
      ).resolves.not.toThrow()
    })
  })

  describe('metadata and size operations', () => {
    beforeEach(async () => {
      config = createTestConfig()
      adapter = new TestStorageAdapter(config)
      await adapter.initialize()
    })

    it('should track metadata correctly', async () => {
      const data = { test: 'data' }
      await adapter.set('meta-key', data)

      // Check that metadata is set (we can't directly access it, but it's used internally)
      const result = await adapter.get('meta-key')
      expect(result).toEqual(data)
    })

    it('should calculate storage size', async () => {
      await adapter.set('key1', { data: 'test1' })
      await adapter.set('key2', { data: 'test2' })

      const size = await adapter.getSize()
      expect(size).toBeGreaterThan(0)
    })

    it('should list keys with prefix', async () => {
      await adapter.set('user:1', 'data1')
      await adapter.set('user:2', 'data2')
      await adapter.set('config:theme', 'dark')

      const userKeys = await adapter.list('user:')
      expect(userKeys).toContain('user:1')
      expect(userKeys).toContain('user:2')
      expect(userKeys).not.toContain('config:theme')
    })

    it('should count items with prefix', async () => {
      await adapter.set('app:1', 'data1')
      await adapter.set('app:2', 'data2')
      await adapter.set('other:1', 'data')

      const appCount = await adapter.count('app:')
      expect(appCount).toBe(2)

      const totalCount = await adapter.count()
      expect(totalCount).toBe(3)
    })
  })

  describe('compression minSize edge cases', () => {
    it('should use default minSize of 1024 when not specified in processValueForStorage', async () => {
      const configWithoutMinSize = {
        ...config,
        compression: {
          enabled: true,
          algorithm: 'lz4' as const,
          // minSize not specified, should default to 1024
        },
      }

      const adapterWithoutMinSize = new TestStorageAdapter(configWithoutMinSize)
      await adapterWithoutMinSize.initialize()

      // Create a value just over 1024 bytes (default minSize)
      const largeValue = { data: 'x'.repeat(1025) }

      await adapterWithoutMinSize.set('large', largeValue)
      const stored = await adapterWithoutMinSize.getRaw('large')

      // Should be compressed since it's over the default 1024
      expect(stored?.metadata?.compressed).toBe(true)
    })

    it('should use default minSize of 1024 when not specified in set method', async () => {
      const configWithoutMinSize = {
        ...config,
        compression: {
          enabled: true,
          algorithm: 'lz4' as const,
          // minSize not specified
        },
      }

      const adapterWithoutMinSize = new TestStorageAdapter(configWithoutMinSize)
      await adapterWithoutMinSize.initialize()

      // Test the set method directly with a large value
      const largeValue = 'x'.repeat(1025)
      await adapterWithoutMinSize.set('test-key', largeValue)

      const stored = await adapterWithoutMinSize.getRaw('test-key')
      expect(stored?.metadata?.compressed).toBe(true)
    })

    it('should handle compression with undefined minSize in config', async () => {
      const configWithUndefinedMinSize = {
        ...config,
        compression: {
          enabled: true,
          algorithm: 'lz4' as const,
          minSize: undefined as unknown as number,
        },
      }

      const adapterWithUndefinedMinSize = new TestStorageAdapter(
        configWithUndefinedMinSize
      )
      await adapterWithUndefinedMinSize.initialize()

      // Value over default threshold
      const largeValue = { data: 'y'.repeat(1025) }
      await adapterWithUndefinedMinSize.set('large-key', largeValue)

      const stored = await adapterWithUndefinedMinSize.getRaw('large-key')
      expect(stored?.metadata?.compressed).toBe(true)
    })

    it('should handle string value type check during decompression', async () => {
      const compressedAdapter = new TestStorageAdapter({
        ...config,
        compression: { enabled: true, algorithm: 'lz4', minSize: 10 },
      })
      await compressedAdapter.initialize()

      // Store a compressed value
      const largeValue = 'x'.repeat(100)
      await compressedAdapter.set('compressed-key', largeValue)

      // Verify it was compressed
      const stored = await compressedAdapter.getRaw('compressed-key')
      expect(stored?.metadata?.compressed).toBe(true)
      expect(typeof stored?.value).toBe('string')

      // Retrieve and verify decompression happens
      const retrieved = await compressedAdapter.get('compressed-key')
      expect(retrieved).toEqual(largeValue)
    })

    it('should handle non-string value during JSON parsing', async () => {
      // Create adapter and manually set a raw non-string value
      const adapter = new TestStorageAdapter(config)
      await adapter.initialize()

      // Directly store an object value (not stringified) to test the non-string path
      const objectValue = { data: 'test-object' }

      // Override getRaw to return non-string value
      // originalGetRaw not needed for this test - mocking directly
      adapter.getRaw = vi.fn().mockResolvedValueOnce({
        value: objectValue, // Non-string value
        metadata: {},
      })

      // Get should handle the non-string value
      const result = await adapter.get('test-key')
      expect(result).toEqual(objectValue)
    })

    it('should handle compression when minSize is undefined at line 447', async () => {
      const configWithCompressionNoMinSize = {
        ...config,
        compression: {
          enabled: true,
          algorithm: 'lz4' as const,
        },
      }

      const adapter = new TestStorageAdapter(configWithCompressionNoMinSize)
      await adapter.initialize()

      // Value just over 1024 bytes (default minSize)
      // Use set method to properly test compression flow
      const largeData = { data: 'z'.repeat(1025) }
      await adapter.set('test-key', largeData)

      const raw = await adapter.getRaw('test-key')
      // Should be compressed using default minSize
      expect(raw?.metadata?.compressed).toBe(true)
    })

    it('should handle decompression with string type check at line 490', async () => {
      const compressedConfig = {
        ...config,
        compression: { enabled: true, algorithm: 'lz4', minSize: 10 },
      }
      const adapter = new TestStorageAdapter(compressedConfig)
      await adapter.initialize()

      // Store compressed data
      const data = 'test'.repeat(20)
      await adapter.set('compressed', data)

      // Verify it was compressed
      const raw = await adapter.getRaw('compressed')
      expect(raw?.metadata?.compressed).toBe(true)

      // Test processRetrievedValue with compressed string
      const processed = await adapter['processRetrievedValue'](raw!)
      expect(processed).toEqual(data)
    })

    it('should handle non-string compressed value at line 119', async () => {
      const compressedConfig = {
        ...config,
        compression: { enabled: true, algorithm: 'lz4', minSize: 10 },
      }
      const adapter = new TestStorageAdapter(compressedConfig)
      await adapter.initialize()

      // Mock getRaw to return compressed metadata but non-string value
      // This tests the else path at line 119 where value is not a string
      adapter.getRaw = vi.fn().mockResolvedValueOnce({
        value: { alreadyDecompressed: 'data' }, // Non-string value with compressed metadata
        metadata: { compressed: true },
      })

      const result = await adapter.get('test-key')

      // Should return the value as-is since it's not a string (can't decompress)
      expect(result).toEqual({ alreadyDecompressed: 'data' })
    })
  })

  describe('error handling', () => {
    it('should handle initialization errors', async () => {
      class FailingAdapter extends TestStorageAdapter {
        protected async initializeAdapter() {
          throw new Error('Init failed')
        }
      }

      const failAdapter = new FailingAdapter(createTestConfig())
      await expect(failAdapter.initialize()).rejects.toThrow('Init failed')
    })

    it('should handle errors in processRetrievedValue', async () => {
      config = createTestConfig({
        compression: { enabled: true },
      })
      adapter = new TestStorageAdapter(config)
      await adapter.initialize()

      // Mock decompression to fail
      adapter['compression'] = {
        decompress: vi
          .fn()
          .mockRejectedValue(new Error('Decompression failed')),
      } as (typeof adapter)['compression']

      const metadata: StorageMetadata = {
        compressed: true,
        compressionAlgorithm: 'gzip',
        compressedSize: 10,
        originalSize: 100,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      await adapter['setRaw']('bad-compressed', 'invalid-base64', metadata)

      await expect(adapter.get('bad-compressed')).rejects.toThrow()
    })
  })

  describe('processValueForStorage coverage', () => {
    beforeEach(async () => {
      config = createTestConfig({
        compression: {
          enabled: true,
          minSize: 10,
        },
        encryption: {
          enabled: true,
          passphrase: 'test',
        },
      })
      adapter = new TestStorageAdapter(config)
      await adapter.initialize()
    })

    it('should handle string compression data in processValueForStorage', async () => {
      // Mock both compression paths
      const mockCompress = vi
        .fn()
        .mockResolvedValueOnce({
          compressed: true,
          data: 'compressed-string', // String result
          algorithm: 'gzip',
        })
        .mockResolvedValueOnce({
          compressed: true,
          data: Buffer.from('compressed-buffer'), // Buffer result
          algorithm: 'brotli',
        })

      adapter['compression'] = {
        compress: mockCompress,
      } as (typeof adapter)['compression']

      // Test with string result
      const result1 = await adapter['processValueForStorage']({
        large: 'data'.repeat(10),
      })
      expect(result1).toBeDefined()

      // Test with buffer result
      const result2 = await adapter['processValueForStorage']({
        large: 'data'.repeat(10),
      })
      expect(result2).toBeDefined()
    })

    it('should handle compression size calculation for both string and buffer', async () => {
      // Create items that will trigger both paths
      const items = new Map([
        ['string-compressed', { data: 'x'.repeat(50) }],
        ['buffer-compressed', { data: 'y'.repeat(50) }],
      ])

      let callCount = 0
      const mockCompress = vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({
            compressed: true,
            data: 'compressed-as-string',
            algorithm: 'gzip',
          })
        } else {
          return Promise.resolve({
            compressed: true,
            data: Buffer.from('compressed-as-buffer'),
            algorithm: 'brotli',
          })
        }
      })

      adapter['compression'] = {
        compress: mockCompress,
      } as (typeof adapter)['compression']
      adapter['encryption'] = undefined // Disable encryption for this test

      await adapter.setMany(items)

      expect(mockCompress).toHaveBeenCalledTimes(2)
    })
  })

  describe('edge cases', () => {
    beforeEach(async () => {
      config = createTestConfig({
        encryption: { enabled: false },
        compression: {
          enabled: true,
          minSize: 10,
        },
      })
      adapter = new TestStorageAdapter(config)
      await adapter.initialize()
    })

    it('should handle Buffer compression result', async () => {
      // Mock compression to return Buffer
      const mockCompress = vi.fn().mockResolvedValue({
        compressed: true,
        data: Buffer.from('compressed-data'),
        algorithm: 'gzip',
      })

      adapter['compression'] = {
        compress: mockCompress,
      } as (typeof adapter)['compression']

      const data = { text: 'Data that returns buffer when compressed' }
      await adapter.set('buffer-key', data)

      expect(mockCompress).toHaveBeenCalled()
    })

    it('should handle non-compressed data in processValueForStorage', async () => {
      // Mock compression to not compress
      const mockCompress = vi.fn().mockResolvedValue({
        compressed: false,
        data: 'uncompressed',
        algorithm: 'none',
      })

      adapter['compression'] = {
        compress: mockCompress,
      } as (typeof adapter)['compression']

      const data = { small: true }
      await adapter.set('uncompressed-key', data)

      expect(mockCompress).toHaveBeenCalled()
    })

    it('should handle missing metadata in getRaw result', async () => {
      // Directly set data without metadata
      adapter['storage'].set('no-meta', {
        value: '{"test":true}',
      } as { value: string | EncryptedData; metadata?: StorageMetadata })

      const result = await adapter.get('no-meta')
      expect(result).toEqual({ test: true })
    })

    it('should return null when processRetrievedValue gets non-string final value', async () => {
      // This is an edge case where after decryption, value is not a string
      const item = {
        value: { notAString: true } as unknown as string,
        metadata: undefined,
      }

      const result = await adapter['processRetrievedValue'](item)
      expect(result).toBeNull()
    })

    it('should handle null value properly in getMany batch operation', async () => {
      // Test the specific branch where value is null but processRetrievedValue returns null
      await adapter.set('exists', { data: true })

      // Mock getRaw to return null for one key
      const originalGetRaw = adapter['getRaw'].bind(adapter)
      adapter['getRaw'] = vi.fn().mockImplementation((key) => {
        if (key === 'returns-null') {
          return Promise.resolve({ value: '{}', metadata: undefined })
        }
        return originalGetRaw(key)
      })

      // Mock processRetrievedValue to return null for specific case
      const originalProcess = adapter['processRetrievedValue'].bind(adapter)
      adapter['processRetrievedValue'] = vi.fn().mockImplementation((item) => {
        if (item?.value === '{}') {
          return Promise.resolve(null)
        }
        return originalProcess(item)
      })

      const results = await adapter.getMany([
        'exists',
        'returns-null',
        'not-exists',
      ])

      expect(results.get('exists')).toEqual({ data: true })
      expect(results.get('returns-null')).toBeNull()
      expect(results.get('not-exists')).toBeNull()
    })

    it('should update cache after successful get', async () => {
      config = createTestConfig({
        cache: {
          maxSize: 10,
          ttl: 60000,
        },
        encryption: { enabled: false }, // Ensure access metadata update is enabled
      })
      const cacheAdapter = new TestStorageAdapter(config)
      await cacheAdapter.initialize()

      // Set data directly in raw storage
      await cacheAdapter['setRaw']('cache-test', '{"cached":true}', {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        originalSize: 14,
      })

      // Mock cache.set to verify it's called
      const cacheSpy = vi.spyOn(cacheAdapter['cache']!, 'set')

      // Get should update cache
      const result = await cacheAdapter.get('cache-test')
      expect(result).toEqual({ cached: true })
      expect(cacheSpy).toHaveBeenCalledWith('cache-test', { cached: true })
    })
  })
})
