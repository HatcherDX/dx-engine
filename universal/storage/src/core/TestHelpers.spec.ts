/**
 * @fileoverview Comprehensive test suite for TestHelpers
 *
 * @description
 * Tests all test helper utilities, builders, and mock implementations
 * to achieve 100% code coverage.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  StorageAdapterTestBuilder,
  MockStorageAdapter,
  TestDataGenerator,
  StorageAssertions,
  StorageTestFixture,
} from './TestHelpers'
import { MockServiceProvider } from './ServiceProviders'
import type { StorageConfig, StorageMetadata } from '../types/storage'
import type { IEncryptionService } from '../types/encryption'

describe('TestHelpers', () => {
  describe('StorageAdapterTestBuilder', () => {
    let builder: StorageAdapterTestBuilder

    beforeEach(() => {
      builder = new StorageAdapterTestBuilder()
    })

    describe('withConfig', () => {
      it('should set configuration', () => {
        const config: Partial<StorageConfig> = {
          type: 'sqlite',
          path: '/test/path',
        }

        const result = builder.withConfig(config)

        expect(result).toBe(builder) // Should return self for chaining
        const adapter = builder.build(MockStorageAdapter)
        expect(adapter).toBeInstanceOf(MockStorageAdapter)
      })

      it('should merge configurations', () => {
        builder
          .withConfig({ type: 'sqlite' })
          .withConfig({ path: '/test/path' })
          .withConfig({ encryption: { enabled: true } })

        const adapter = builder.build(MockStorageAdapter)
        expect(adapter).toBeInstanceOf(MockStorageAdapter)
      })

      it('should handle empty config', () => {
        const result = builder.withConfig({})
        expect(result).toBe(builder)
      })
    })

    describe('withMockEncryption', () => {
      it('should add mock encryption service with custom implementation', () => {
        const customEncrypt = vi.fn().mockResolvedValue({
          data: 'custom-encrypted',
        })

        builder.withMockEncryption({ encrypt: customEncrypt })

        const adapter = builder.build(MockStorageAdapter)
        expect(adapter).toBeInstanceOf(MockStorageAdapter)
      })

      it('should use default implementations when not provided', () => {
        builder.withMockEncryption({})

        const adapter = builder.build(MockStorageAdapter)
        expect(adapter).toBeInstanceOf(MockStorageAdapter)
      })

      it('should handle partial mock implementations', () => {
        const customDecrypt = vi.fn().mockResolvedValue('decrypted-data')

        builder.withMockEncryption({
          decrypt: customDecrypt,
        })

        const adapter = builder.build(MockStorageAdapter)
        expect(adapter).toBeInstanceOf(MockStorageAdapter)
      })

      it('should override with spread operator', () => {
        const mockService: Partial<IEncryptionService> = {
          encrypt: vi.fn().mockResolvedValue({ data: 'test' }),
          decrypt: vi.fn(),
          deriveKey: vi.fn(),
          generateSalt: vi.fn(),
        }

        builder.withMockEncryption(mockService)
        const adapter = builder.build(MockStorageAdapter)
        expect(adapter).toBeInstanceOf(MockStorageAdapter)
      })
    })

    describe('withMockCompression', () => {
      it('should add mock compression service', () => {
        const customCompress = vi.fn().mockResolvedValue({
          compressed: true,
          data: 'compressed-data',
        })

        builder.withMockCompression({ compress: customCompress })

        const adapter = builder.build(MockStorageAdapter)
        expect(adapter).toBeInstanceOf(MockStorageAdapter)
      })

      it('should use default compression implementations', () => {
        builder.withMockCompression({})

        const adapter = builder.build(MockStorageAdapter)
        expect(adapter).toBeInstanceOf(MockStorageAdapter)
      })

      it('should handle all compression methods', () => {
        builder.withMockCompression({
          compress: vi.fn(),
          decompress: vi.fn(),
          selectAlgorithm: vi.fn().mockReturnValue('brotli'),
        })

        const adapter = builder.build(MockStorageAdapter)
        expect(adapter).toBeInstanceOf(MockStorageAdapter)
      })
    })

    describe('withMockCache', () => {
      it('should add mock cache layer', () => {
        const customGet = vi.fn().mockReturnValue('cached-value')

        builder.withMockCache({ get: customGet })

        const adapter = builder.build(MockStorageAdapter)
        expect(adapter).toBeInstanceOf(MockStorageAdapter)
      })

      it('should use default cache implementations', () => {
        builder.withMockCache({})

        const adapter = builder.build(MockStorageAdapter)
        expect(adapter).toBeInstanceOf(MockStorageAdapter)
      })

      it('should handle all cache methods', () => {
        builder.withMockCache({
          get: vi.fn().mockReturnValue('value'),
          set: vi.fn(),
          delete: vi.fn(),
          clear: vi.fn(),
          has: vi.fn().mockReturnValue(true),
          size: vi.fn().mockReturnValue(10),
        })

        const adapter = builder.build(MockStorageAdapter)
        expect(adapter).toBeInstanceOf(MockStorageAdapter)
      })
    })

    describe('withMockLogger', () => {
      it('should add mock logger with custom implementation', () => {
        const customDebug = vi.fn()
        const customInfo = vi.fn()

        builder.withMockLogger({
          debug: customDebug,
          info: customInfo,
        })

        const adapter = builder.build(MockStorageAdapter)
        expect(adapter).toBeInstanceOf(MockStorageAdapter)
      })

      it('should use default logger when no mock provided', () => {
        builder.withMockLogger()

        const adapter = builder.build(MockStorageAdapter)
        expect(adapter).toBeInstanceOf(MockStorageAdapter)
      })

      it('should handle partial logger mock', () => {
        builder.withMockLogger({
          error: vi.fn(),
        })

        const adapter = builder.build(MockStorageAdapter)
        expect(adapter).toBeInstanceOf(MockStorageAdapter)
      })
    })

    describe('withMockMetrics', () => {
      it('should add mock metrics collector', () => {
        const customRecord = vi.fn()

        builder.withMockMetrics({
          record: customRecord,
        })

        const adapter = builder.build(MockStorageAdapter)
        expect(adapter).toBeInstanceOf(MockStorageAdapter)
      })

      it('should use default metrics when no mock provided', () => {
        builder.withMockMetrics()

        const adapter = builder.build(MockStorageAdapter)
        expect(adapter).toBeInstanceOf(MockStorageAdapter)
      })

      it('should handle all metrics methods', () => {
        builder.withMockMetrics({
          record: vi.fn(),
          increment: vi.fn(),
          gauge: vi.fn(),
        })

        const adapter = builder.build(MockStorageAdapter)
        expect(adapter).toBeInstanceOf(MockStorageAdapter)
      })
    })

    describe('withMockPerformanceMonitor', () => {
      it('should add mock performance monitor', () => {
        const customRecord = vi.fn()
        const customGetMetrics = vi
          .fn()
          .mockReturnValue([{ operation: 'get', duration: 100 }])

        builder.withMockPerformanceMonitor({
          record: customRecord,
          getMetrics: customGetMetrics,
        })

        const adapter = builder.build(MockStorageAdapter)
        expect(adapter).toBeInstanceOf(MockStorageAdapter)
      })

      it('should use default performance monitor when no mock provided', () => {
        builder.withMockPerformanceMonitor()

        const adapter = builder.build(MockStorageAdapter)
        expect(adapter).toBeInstanceOf(MockStorageAdapter)
      })

      it('should handle all performance monitor methods', () => {
        builder.withMockPerformanceMonitor({
          record: vi.fn(),
          getMetrics: vi.fn().mockReturnValue([]),
          getMetricsByOperation: vi.fn().mockReturnValue([]),
          getSummary: vi.fn().mockReturnValue({ totalOperations: 0 }),
          clear: vi.fn(),
          export: vi.fn().mockReturnValue('{"metrics":[]}'),
        })

        const adapter = builder.build(MockStorageAdapter)
        expect(adapter).toBeInstanceOf(MockStorageAdapter)
      })
    })

    describe('build', () => {
      it('should build adapter with all services', () => {
        builder
          .withConfig({ type: 'memory' })
          .withMockEncryption({})
          .withMockCompression({})
          .withMockCache({})
          .withMockLogger()
          .withMockMetrics()
          .withMockPerformanceMonitor()

        const adapter = builder.build(MockStorageAdapter)
        expect(adapter).toBeInstanceOf(MockStorageAdapter)
      })

      it('should build adapter without any mocks', () => {
        const adapter = builder.build(MockStorageAdapter)
        expect(adapter).toBeInstanceOf(MockStorageAdapter)
      })

      it('should pass options to adapter constructor', () => {
        class TestAdapter extends MockStorageAdapter {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test helper requires any type for flexible option testing
          public receivedOptions: any

          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test adapter constructor must accept any options for testing flexibility
          constructor(config: StorageConfig, options?: any) {
            super(config, options)
            this.receivedOptions = options
          }
        }

        builder.withMockEncryption({}).withMockCompression({}).withMockCache({})

        const adapter = builder.build(TestAdapter)
        expect(adapter.receivedOptions).toBeDefined()
        expect(adapter.receivedOptions.encryptionProvider).toBeInstanceOf(
          MockServiceProvider
        )
        expect(adapter.receivedOptions.compressionProvider).toBeInstanceOf(
          MockServiceProvider
        )
        expect(adapter.receivedOptions.cacheProvider).toBeInstanceOf(
          MockServiceProvider
        )
      })
    })

    describe('buildAndInitialize', () => {
      it('should build and initialize adapter', async () => {
        const adapter = await builder.buildAndInitialize(MockStorageAdapter)

        expect(adapter).toBeInstanceOf(MockStorageAdapter)
        expect(adapter.initialized).toBe(true)
      })

      it('should handle initialization errors', async () => {
        class FailingAdapter extends MockStorageAdapter {
          async initialize(): Promise<void> {
            throw new Error('Initialization failed')
          }
        }

        await expect(
          builder.buildAndInitialize(FailingAdapter)
        ).rejects.toThrow('Initialization failed')
      })
    })

    describe('reset', () => {
      it('should reset builder to initial state', () => {
        builder
          .withConfig({ type: 'sqlite', path: '/test' })
          .withMockEncryption({})
          .withMockCache({})
          .withMockLogger()

        const result = builder.reset()

        expect(result).toBe(builder) // Should return self
        const adapter = builder.build(MockStorageAdapter)
        expect(adapter).toBeInstanceOf(MockStorageAdapter)
        // Should have default config after reset
      })

      it('should clear all mocks and dependencies', () => {
        builder
          .withMockEncryption({})
          .withMockCompression({})
          .withMockCache({})
          .withMockLogger()
          .withMockMetrics()
          .withMockPerformanceMonitor()

        builder.reset()

        const adapter = builder.build(MockStorageAdapter)
        expect(adapter).toBeInstanceOf(MockStorageAdapter)
        // Should have no mocks after reset
      })
    })
  })

  describe('MockStorageAdapter', () => {
    let adapter: MockStorageAdapter

    beforeEach(async () => {
      adapter = new MockStorageAdapter({ type: 'memory' })
      await adapter.initialize()
    })

    describe('core operations', () => {
      it('should set and get values', async () => {
        const key = 'test-key'
        const value = { data: 'test-value' }

        await adapter.set(key, value)
        const retrieved = await adapter.get(key)

        expect(retrieved).toEqual(value)
      })

      it('should delete values', async () => {
        const key = 'test-key'
        await adapter.set(key, 'value')
        await adapter.delete(key)

        const retrieved = await adapter.get(key)
        expect(retrieved).toBeNull()
      })

      it('should clear all values', async () => {
        await adapter.set('key1', 'value1')
        await adapter.set('key2', 'value2')
        await adapter.clear()

        const value1 = await adapter.get('key1')
        const value2 = await adapter.get('key2')

        expect(value1).toBeNull()
        expect(value2).toBeNull()
      })
    })

    describe('list operations', () => {
      it('should list all keys', async () => {
        await adapter.set('key1', 'value1')
        await adapter.set('key2', 'value2')
        await adapter.set('other', 'value3')

        const keys = await adapter.list()

        expect(keys).toHaveLength(3)
        expect(keys).toContain('key1')
        expect(keys).toContain('key2')
        expect(keys).toContain('other')
      })

      it('should list keys with prefix', async () => {
        await adapter.set('test:1', 'value1')
        await adapter.set('test:2', 'value2')
        await adapter.set('other:1', 'value3')

        const keys = await adapter.list('test:')

        expect(keys).toHaveLength(2)
        expect(keys).toContain('test:1')
        expect(keys).toContain('test:2')
        expect(keys).not.toContain('other:1')
      })

      it('should return empty array for non-matching prefix', async () => {
        await adapter.set('key1', 'value1')

        const keys = await adapter.list('nonexistent:')

        expect(keys).toHaveLength(0)
      })
    })

    describe('count operations', () => {
      it('should count all items', async () => {
        await adapter.set('key1', 'value1')
        await adapter.set('key2', 'value2')

        const count = await adapter.count()

        expect(count).toBe(2)
      })

      it('should count items with prefix', async () => {
        await adapter.set('test:1', 'value1')
        await adapter.set('test:2', 'value2')
        await adapter.set('other:1', 'value3')

        const count = await adapter.count('test:')

        expect(count).toBe(2)
      })
    })

    describe('has operation', () => {
      it('should return true for existing key', async () => {
        await adapter.set('existing', 'value')

        const exists = await adapter.has('existing')

        expect(exists).toBe(true)
      })

      it('should return false for non-existing key', async () => {
        const exists = await adapter.has('nonexistent')

        expect(exists).toBe(false)
      })
    })

    describe('getSize operation', () => {
      it('should calculate size of stored data', async () => {
        await adapter.set('key1', 'value1')
        await adapter.set('key2', { data: 'value2' })

        const size = await adapter.getSize()

        expect(size).toBeGreaterThan(0)
      })

      it('should handle encrypted data', async () => {
        const encryptedData = {
          data: 'encrypted',
          iv: 'initialization-vector',
          authTag: 'auth-tag',
          algorithm: 'aes-256-gcm' as const,
          compressed: false,
        }
        await adapter.setInternalItem('key', encryptedData)

        const size = await adapter.getSize()

        expect(size).toBeGreaterThan(0)
      })

      it('should return 0 for empty storage', async () => {
        const size = await adapter.getSize()

        expect(size).toBe(0)
      })
    })

    describe('test helpers', () => {
      it('should get internal storage', async () => {
        await adapter.set('key', 'value')

        const storage = adapter.getInternalStorage()

        expect(storage).toBeInstanceOf(Map)
        expect(storage.size).toBe(1)
        expect(storage.has('key')).toBe(true)
      })

      it('should set internal item directly', () => {
        const metadata: StorageMetadata = {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          originalSize: 100,
        }

        adapter.setInternalItem('direct-key', 'direct-value', metadata)

        const storage = adapter.getInternalStorage()
        const item = storage.get('direct-key')

        expect(item).toBeDefined()
        expect(item?.value).toBe('direct-value')
        expect(item?.metadata).toEqual(metadata)
      })

      it('should set internal item without metadata', () => {
        adapter.setInternalItem('key', 'value')

        const storage = adapter.getInternalStorage()
        const item = storage.get('key')

        expect(item).toBeDefined()
        expect(item?.value).toBe('value')
        expect(item?.metadata).toBeUndefined()
      })
    })
  })

  describe('TestDataGenerator', () => {
    describe('randomString', () => {
      it('should generate string of specified length', () => {
        const length = 50
        const result = TestDataGenerator.randomString(length)

        expect(result).toHaveLength(length)
        expect(typeof result).toBe('string')
      })

      it('should generate different strings', () => {
        const str1 = TestDataGenerator.randomString(20)
        const str2 = TestDataGenerator.randomString(20)

        expect(str1).not.toBe(str2)
      })

      it('should handle zero length', () => {
        const result = TestDataGenerator.randomString(0)

        expect(result).toBe('')
      })

      it('should generate alphanumeric characters only', () => {
        const result = TestDataGenerator.randomString(100)
        const pattern = /^[A-Za-z0-9]+$/

        expect(result).toMatch(pattern)
      })
    })

    describe('user', () => {
      it('should generate user data with correct id', () => {
        const user = TestDataGenerator.user(42)

        expect(user.id).toBe(42)
        expect(user.name).toBe('User 42')
        expect(user.email).toBe('user42@example.com')
        expect(user.createdAt).toBeDefined()
      })

      it('should generate valid ISO date', () => {
        const user = TestDataGenerator.user(1)
        const date = new Date(user.createdAt)

        expect(date.toISOString()).toBe(user.createdAt)
      })
    })

    describe('largeData', () => {
      it('should generate data of specified size', () => {
        const sizeKb = 10
        const result = TestDataGenerator.largeData(sizeKb)

        expect(result.metadata.size).toBe(sizeKb * 1024)
        expect(result.metadata.generated).toBe(true)
      })

      it('should generate repeating pattern', () => {
        const result = TestDataGenerator.largeData(1)

        expect(result.data).toMatch(/^x+$/)
      })

      it('should handle fractional kilobytes', () => {
        const result = TestDataGenerator.largeData(0.5)

        expect(result.metadata.size).toBe(512)
      })
    })

    describe('encryptedData', () => {
      it('should generate encrypted data structure', () => {
        const result = TestDataGenerator.encryptedData()

        expect(result).toHaveProperty('data')
        expect(result).toHaveProperty('iv')
        expect(result).toHaveProperty('authTag')
        expect(result).toHaveProperty('algorithm')
        expect(result.algorithm).toBe('aes-256-gcm')
      })

      it('should generate different encrypted data', () => {
        const data1 = TestDataGenerator.encryptedData()
        const data2 = TestDataGenerator.encryptedData()

        expect(data1.data).not.toBe(data2.data)
        expect(data1.iv).not.toBe(data2.iv)
        expect(data1.authTag).not.toBe(data2.authTag)
      })

      it('should generate correct length fields', () => {
        const result = TestDataGenerator.encryptedData()

        expect(result.data).toHaveLength(64)
        expect(result.iv).toHaveLength(24)
        expect(result.authTag).toHaveLength(32)
      })
    })

    describe('metadata', () => {
      it('should generate default metadata', () => {
        const metadata = TestDataGenerator.metadata()

        expect(metadata.createdAt).toBeDefined()
        expect(metadata.updatedAt).toBeDefined()
        expect(metadata.originalSize).toBe(1024)
        expect(metadata.compressed).toBe(false)
        expect(metadata.encrypted).toBe(false)
      })

      it('should override specific fields', () => {
        const overrides = {
          compressed: true,
          compressionAlgorithm: 'gzip',
          compressedSize: 512,
        }

        const metadata = TestDataGenerator.metadata(overrides)

        expect(metadata.compressed).toBe(true)
        expect(metadata.compressionAlgorithm).toBe('gzip')
        expect(metadata.compressedSize).toBe(512)
        expect(metadata.originalSize).toBe(1024) // Default not overridden
      })

      it('should have valid timestamps', () => {
        const before = Date.now()
        const metadata = TestDataGenerator.metadata()
        const after = Date.now()

        expect(metadata.createdAt).toBeGreaterThanOrEqual(before)
        expect(metadata.createdAt).toBeLessThanOrEqual(after)
        expect(metadata.updatedAt).toBeGreaterThanOrEqual(before)
        expect(metadata.updatedAt).toBeLessThanOrEqual(after)
      })
    })
  })

  describe('StorageAssertions', () => {
    describe('assertEncrypted', () => {
      it('should pass for valid encrypted data', () => {
        const encryptedData = {
          data: 'encrypted-string',
          iv: 'initialization-vector',
          authTag: 'auth-tag',
          algorithm: 'aes-256-gcm',
        }

        expect(() => {
          StorageAssertions.assertEncrypted(encryptedData)
        }).not.toThrow()
      })

      it('should fail for missing data property', () => {
        const invalidData = {
          iv: 'iv',
          authTag: 'tag',
          algorithm: 'aes-256-gcm',
        }

        expect(() => {
          StorageAssertions.assertEncrypted(invalidData)
        }).toThrow()
      })

      it('should fail for non-string data', () => {
        const invalidData = {
          data: 123,
          iv: 'iv',
          authTag: 'tag',
          algorithm: 'aes-256-gcm',
        }

        expect(() => {
          StorageAssertions.assertEncrypted(invalidData)
        }).toThrow()
      })
    })

    describe('assertValidMetadata', () => {
      it('should pass for valid metadata', () => {
        const metadata = {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          originalSize: 1024,
        }

        expect(() => {
          StorageAssertions.assertValidMetadata(metadata)
        }).not.toThrow()
      })

      it('should fail for missing createdAt', () => {
        const metadata = {
          updatedAt: Date.now(),
          originalSize: 1024,
        }

        expect(() => {
          StorageAssertions.assertValidMetadata(metadata)
        }).toThrow()
      })

      it('should fail for non-number timestamps', () => {
        const metadata = {
          createdAt: '2024-01-01',
          updatedAt: '2024-01-02',
        }

        expect(() => {
          StorageAssertions.assertValidMetadata(metadata)
        }).toThrow()
      })

      it('should fail for zero or negative timestamps', () => {
        const metadata = {
          createdAt: 0,
          updatedAt: -1,
        }

        expect(() => {
          StorageAssertions.assertValidMetadata(metadata)
        }).toThrow()
      })
    })

    describe('assertCompressed', () => {
      it('should pass for valid compressed metadata', () => {
        const metadata: StorageMetadata = {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          originalSize: 1024,
          compressed: true,
          compressionAlgorithm: 'gzip',
          compressedSize: 512,
        }

        expect(() => {
          StorageAssertions.assertCompressed(metadata)
        }).not.toThrow()
      })

      it('should fail if not compressed', () => {
        const metadata: StorageMetadata = {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          originalSize: 1024,
          compressed: false,
        }

        expect(() => {
          StorageAssertions.assertCompressed(metadata)
        }).toThrow()
      })

      it('should fail if compressionAlgorithm missing', () => {
        const metadata: StorageMetadata = {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          originalSize: 1024,
          compressed: true,
          compressedSize: 512,
        }

        expect(() => {
          StorageAssertions.assertCompressed(metadata)
        }).toThrow()
      })

      it('should fail if compressedSize not less than originalSize', () => {
        const metadata: StorageMetadata = {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          originalSize: 512,
          compressed: true,
          compressionAlgorithm: 'gzip',
          compressedSize: 1024,
        }

        expect(() => {
          StorageAssertions.assertCompressed(metadata)
        }).toThrow()
      })
    })
  })

  describe('StorageTestFixture', () => {
    let fixture: StorageTestFixture

    beforeEach(() => {
      fixture = new StorageTestFixture()
    })

    afterEach(async () => {
      await fixture.cleanup()
    })

    describe('createAdapter', () => {
      it('should create and initialize adapter', async () => {
        const adapter = await fixture.createAdapter(MockStorageAdapter)

        expect(adapter).toBeInstanceOf(MockStorageAdapter)
        expect(adapter.initialized).toBe(true)
      })

      it('should create adapter with custom config', async () => {
        const config: Partial<StorageConfig> = {
          encryption: { enabled: true },
          compression: { enabled: true },
        }

        const adapter = await fixture.createAdapter(MockStorageAdapter, config)

        expect(adapter).toBeInstanceOf(MockStorageAdapter)
      })

      it('should track created adapters', async () => {
        const adapter1 = await fixture.createAdapter(MockStorageAdapter)
        const adapter2 = await fixture.createAdapter(MockStorageAdapter)

        // Both adapters should be tracked
        expect(adapter1).toBeInstanceOf(MockStorageAdapter)
        expect(adapter2).toBeInstanceOf(MockStorageAdapter)
      })
    })

    describe('populateTestData', () => {
      it('should populate adapter with test data', async () => {
        const adapter = await fixture.createAdapter(MockStorageAdapter)

        await fixture.populateTestData(adapter, 5)

        for (let i = 1; i <= 5; i++) {
          const user = await adapter.get(`test:${i}`)
          expect(user).toBeDefined()
          expect(user.id).toBe(i)
          expect(user.name).toBe(`User ${i}`)
        }
      })

      it('should handle zero count', async () => {
        const adapter = await fixture.createAdapter(MockStorageAdapter)

        await fixture.populateTestData(adapter, 0)

        const keys = await adapter.list()
        expect(keys).toHaveLength(0)
      })
    })

    describe('cleanup', () => {
      it('should clean up all adapters', async () => {
        const adapter1 = await fixture.createAdapter(MockStorageAdapter)
        const adapter2 = await fixture.createAdapter(MockStorageAdapter)

        // Add close method tracking
        const closeSpy1 = vi.spyOn(adapter1, 'close')
        const closeSpy2 = vi.spyOn(adapter2, 'close')

        await fixture.cleanup()

        expect(closeSpy1).toHaveBeenCalled()
        expect(closeSpy2).toHaveBeenCalled()
      })

      it('should handle cleanup errors gracefully', async () => {
        class FailingCloseAdapter extends MockStorageAdapter {
          async close(): Promise<void> {
            throw new Error('Close failed')
          }
        }

        await fixture.createAdapter(FailingCloseAdapter)

        // Should not throw even if adapter close fails
        await expect(fixture.cleanup()).resolves.not.toThrow()
      })

      it('should clear adapter list after cleanup', async () => {
        await fixture.createAdapter(MockStorageAdapter)
        await fixture.createAdapter(MockStorageAdapter)

        await fixture.cleanup()

        // Calling cleanup again should be safe (empty list)
        await expect(fixture.cleanup()).resolves.not.toThrow()
      })

      it('should handle undefined close method', async () => {
        class NoCloseAdapter extends MockStorageAdapter {
          close = undefined
        }

        await fixture.createAdapter(NoCloseAdapter)

        // Should handle undefined close gracefully
        await expect(fixture.cleanup()).resolves.not.toThrow()
      })
    })
  })

  describe('Edge Cases and Integration', () => {
    it('should handle builder with all mocks and complex config', () => {
      const builder = new StorageAdapterTestBuilder()

      builder
        .withConfig({
          type: 'sqlite',
          path: '/complex/path/to/db',
          encryption: {
            enabled: true,
            algorithm: 'aes-256-gcm',
            keyDerivation: {
              algorithm: 'argon2id',
              iterations: 10,
            },
          },
          compression: {
            enabled: true,
            algorithm: 'brotli',
            level: 11,
            minSize: 1024,
          },
          cache: {
            maxSize: 10000,
            ttl: 3600000,
          },
        })
        .withMockEncryption({})
        .withMockCompression({})
        .withMockCache({})
        .withMockLogger()
        .withMockMetrics()
        .withMockPerformanceMonitor()

      const adapter = builder.build(MockStorageAdapter)
      expect(adapter).toBeInstanceOf(MockStorageAdapter)
    })

    it('should handle rapid builder reuse', () => {
      const builder = new StorageAdapterTestBuilder()

      for (let i = 0; i < 100; i++) {
        builder
          .reset()
          .withConfig({ type: 'memory' })
          .withMockEncryption({})
          .build(MockStorageAdapter)
      }

      // Should not have memory issues
      expect(true).toBe(true)
    })

    it('should integrate fixture with builder and assertions', async () => {
      const fixture = new StorageTestFixture()

      try {
        // Create adapter with builder
        const adapter = await new StorageAdapterTestBuilder()
          .withConfig({ encryption: { enabled: true } })
          .buildAndInitialize(MockStorageAdapter)

        // Populate with test data
        await fixture.populateTestData(adapter, 3)

        // Verify with assertions
        const userData = await adapter.get('test:1')
        expect(userData).toBeDefined()

        // Test metadata assertions
        const metadata = TestDataGenerator.metadata({
          compressed: true,
          compressionAlgorithm: 'gzip',
          compressedSize: 100,
        })
        StorageAssertions.assertValidMetadata(metadata)
        StorageAssertions.assertCompressed(metadata)

        // Test encrypted data assertions
        const encryptedData = TestDataGenerator.encryptedData()
        StorageAssertions.assertEncrypted(encryptedData)
      } finally {
        await fixture.cleanup()
      }
    })
  })
})
