/**
 * @fileoverview Tests for enhanced storage adapter features
 *
 * @description
 * Tests all the new features added to the storage adapter including
 * service providers, dependency injection, middleware, monitoring,
 * and error recovery strategies.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EnhancedStorageAdapter } from './EnhancedStorageAdapter'
import { StorageAdapterFactory } from './StorageAdapterFactory'
import { StorageAdapterTestBuilder, TestDataGenerator } from './TestHelpers'
import { MockServiceProvider } from './ServiceProviders'
import {
  LoggingMiddleware,
  ValidationMiddleware,
  MetricsMiddleware,
  RateLimitMiddleware,
} from './AdapterMiddleware'
import { DefaultPerformanceMonitor } from './PerformanceMonitor'
import { CircuitBreakerStrategy } from './ErrorHandling'
import type { StorageConfig } from '../types/storage'
import { StorageError } from '../types/storage'

// Test adapter using enhanced features
class TestEnhancedAdapter extends EnhancedStorageAdapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test data requires flexible typing
  private storage = new Map<string, any>()
  public type = 'test-enhanced'
  public failureCount = 0
  public shouldFail = false

  protected async initializeAdapter(): Promise<void> {
    // Mock initialization
  }

  protected async getRaw(key: string) {
    if (this.shouldFail && this.failureCount < 2) {
      this.failureCount++
      throw new Error('BUSY: Database locked')
    }
    const value = this.storage.get(key)
    return value ? { value, metadata: {} } : null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test data requires flexible typing
  protected async setRaw(key: string, value: any) {
    if (this.shouldFail && this.failureCount < 2) {
      this.failureCount++
      throw new Error('BUSY: Database locked')
    }
    this.storage.set(key, value)
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

  public async getSize() {
    return this.storage.size
  }

  public async close(): Promise<void> {
    await this.closeEnhanced()
  }
}

describe('EnhancedStorageAdapter', () => {
  let adapter: TestEnhancedAdapter
  let config: StorageConfig

  beforeEach(() => {
    vi.clearAllMocks()
    config = {
      type: 'memory',
      encryption: { enabled: false },
      compression: { enabled: false },
    }
  })

  describe('Service Providers', () => {
    it('should use injected service providers', async () => {
      const mockEncryption = {
        encrypt: vi.fn().mockResolvedValue({ data: 'encrypted' }),
        decrypt: vi.fn().mockResolvedValue('decrypted'),
        deriveKey: vi.fn(),
      }

      const mockCompression = {
        compress: vi
          .fn()
          .mockResolvedValue({ compressed: true, data: 'compressed' }),
        decompress: vi.fn().mockResolvedValue('decompressed'),
      }

      adapter = new TestEnhancedAdapter(
        {
          ...config,
          encryption: { enabled: true },
          compression: { enabled: true },
        },
        {
          encryptionProvider: new MockServiceProvider(
            'encryption',
            mockEncryption
          ),
          compressionProvider: new MockServiceProvider(
            'compression',
            mockCompression
          ),
        }
      )

      await adapter.initialize()

      // Verify services were created from providers
      expect(adapter['encryption']).toBe(mockEncryption)
      expect(adapter['compression']).toBe(mockCompression)
    })

    it('should use default providers when not injected', async () => {
      adapter = new TestEnhancedAdapter({
        ...config,
        encryption: { enabled: true, passphrase: 'test' },
        compression: { enabled: true },
      })

      await adapter.initialize()

      // Services should be created
      expect(adapter['encryption']).toBeDefined()
      expect(adapter['compression']).toBeDefined()
    })
  })

  describe('Dependency Injection with Factory', () => {
    it('should work with StorageAdapterFactory', async () => {
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      const mockMetrics = {
        record: vi.fn(),
        increment: vi.fn(),
        gauge: vi.fn(),
      }

      const factory = new StorageAdapterFactory()
        .withLogger(mockLogger)
        .withMetrics(mockMetrics)

      const adapter = await factory.createAndInitialize(
        TestEnhancedAdapter,
        config
      )

      expect(adapter['logger']).toBe(mockLogger)
      // Metrics are injected in the factory, but not directly accessible on adapter
    })
  })

  describe('Middleware Support', () => {
    beforeEach(async () => {
      adapter = new TestEnhancedAdapter(config)
      await adapter.initialize()
    })

    it('should execute middleware in order', async () => {
      const order: string[] = []

      const middleware1 = {
        name: 'test1',
        process: vi.fn(async (context, next) => {
          order.push('middleware1-before')
          const result = await next()
          order.push('middleware1-after')
          return result
        }),
      }

      const middleware2 = {
        name: 'test2',
        process: vi.fn(async (context, next) => {
          order.push('middleware2-before')
          const result = await next()
          order.push('middleware2-after')
          return result
        }),
      }

      adapter.addMiddleware(middleware1).addMiddleware(middleware2)

      await adapter.set('test', 'value')

      expect(order).toEqual([
        'middleware1-before',
        'middleware2-before',
        'middleware2-after',
        'middleware1-after',
      ])
    })

    it('should support logging middleware', async () => {
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      const loggingMiddleware = new LoggingMiddleware(mockLogger, {
        logLevel: 'info',
        includeArgs: true,
      })

      adapter.addMiddleware(loggingMiddleware)

      await adapter.set('key', 'value')
      await adapter.get('key')

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('[Storage] set started')
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('[Storage] set completed')
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('[Storage] get started')
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('[Storage] get completed')
      )
    })

    it('should support validation middleware', async () => {
      const validationMiddleware = new ValidationMiddleware({
        maxKeyLength: 10,
        minKeyLength: 2,
      })

      adapter.addMiddleware(validationMiddleware)

      // Should succeed with valid key
      await adapter.set('validkey', 'value')

      // Should fail with too long key
      await expect(
        adapter.set('verylongkeyexceeding10chars', 'value')
      ).rejects.toThrow(StorageError)

      // Should fail with too short key
      await expect(adapter.set('x', 'value')).rejects.toThrow(StorageError)
    })

    it('should support rate limiting middleware', async () => {
      const rateLimitMiddleware = new RateLimitMiddleware({
        maxRequestsPerSecond: 2,
        maxBurst: 2,
      })

      adapter.addMiddleware(rateLimitMiddleware)

      // First two requests should succeed
      await adapter.set('key1', 'value1')
      await adapter.set('key2', 'value2')

      // Third request should fail
      await expect(adapter.set('key3', 'value3')).rejects.toThrow(StorageError)
    })
  })

  describe('Performance Monitoring', () => {
    it('should track performance metrics', async () => {
      const monitor = new DefaultPerformanceMonitor()
      adapter = new TestEnhancedAdapter(
        { ...config, monitoring: { enabled: true } },
        { performanceMonitor: monitor }
      )
      await adapter.initialize()

      // Perform operations
      await adapter.set('key1', 'value1')
      await adapter.get('key1')
      await adapter.get('nonexistent')

      const summary = adapter.getPerformanceSummary()

      expect(summary?.totalOperations).toBe(3)
      expect(summary?.operationBreakdown).toHaveProperty('set')
      expect(summary?.operationBreakdown).toHaveProperty('get')
      expect(summary?.operationBreakdown.set.count).toBe(1)
      expect(summary?.operationBreakdown.get.count).toBe(2)
    })

    it('should track cache hits', async () => {
      const monitor = new DefaultPerformanceMonitor()
      adapter = new TestEnhancedAdapter(
        {
          ...config,
          cache: { maxSize: 10, ttl: 60000 },
          monitoring: { enabled: true },
        },
        { performanceMonitor: monitor }
      )
      await adapter.initialize()

      // Set a value (which populates the cache)
      await adapter.set('cached', 'value')

      // First get - cache hit (because set populated cache)
      await adapter.get('cached')

      // Second get - also cache hit
      await adapter.get('cached')

      const metrics = monitor.getMetrics()
      const getMetrics = metrics.filter((m) => m.operation === 'get')

      // There might be more metrics due to initialization and internal operations
      expect(getMetrics.length).toBeGreaterThanOrEqual(2)
      // Find the actual get operations for 'cached' key
      const cachedGetMetrics = getMetrics.filter((m) => m.key === 'cached')
      expect(cachedGetMetrics).toHaveLength(2)
      // Both should be cache hits since set populates cache
      expect(cachedGetMetrics[0].cacheHit).toBe(true)
      expect(cachedGetMetrics[1].cacheHit).toBe(true)
    })

    it('should export metrics', async () => {
      adapter = new TestEnhancedAdapter({
        ...config,
        monitoring: { enabled: true },
      })
      await adapter.initialize()

      await adapter.set('key', 'value')
      await adapter.get('key')

      const exported = adapter.exportMetrics()
      const parsed = JSON.parse(exported)

      expect(parsed).toHaveProperty('metrics')
      expect(parsed).toHaveProperty('summary')
      expect(parsed.metrics).toHaveLength(2)
    })
  })

  describe('Error Recovery Strategies', () => {
    it('should retry on transient errors', async () => {
      adapter = new TestEnhancedAdapter({
        ...config,
        errorRecovery: {
          enabled: true,
          strategies: ['retry'],
        },
      })
      await adapter.initialize()

      // Make adapter fail twice then succeed
      adapter.shouldFail = true
      adapter.failureCount = 0

      // Should retry and eventually succeed
      await adapter.set('key', 'value')
      expect(adapter.failureCount).toBe(2)

      // Reset for get operation
      adapter.failureCount = 0
      const result = await adapter.get('key')
      expect(result).toBe('value')
      expect(adapter.failureCount).toBe(2)
    })

    it('should use circuit breaker pattern', async () => {
      const circuitBreaker = new CircuitBreakerStrategy(2, 100, 1)

      adapter = new TestEnhancedAdapter(config)
      await adapter.initialize()
      adapter.addErrorStrategy(circuitBreaker)

      // Simulate failures
      const makeFailingRequest = async () => {
        adapter.shouldFail = true
        adapter.failureCount = 0
        try {
          await adapter.get('key')
        } catch {
          // Expected to fail
        }
      }

      // First two failures open the circuit
      await makeFailingRequest()
      await makeFailingRequest()

      // Circuit should be open
      expect(circuitBreaker.getState()).toBe('open')

      // Wait for reset time
      await new Promise((resolve) => setTimeout(resolve, 150))

      // Circuit should transition to half-open after reset time
      expect(circuitBreaker.getState()).toBe('half-open')

      // Successful request should close the circuit
      adapter.shouldFail = false
      await adapter.get('key')

      // Circuit should close after success
      expect(circuitBreaker.getState()).toBe('closed')
    })
  })

  describe('Test Builder Integration', () => {
    it('should work with StorageAdapterTestBuilder', async () => {
      const mockEncryption = {
        encrypt: vi
          .fn()
          .mockResolvedValue({ data: 'encrypted', iv: 'iv', tag: 'tag' }),
        decrypt: vi.fn().mockResolvedValue('decrypted'),
      }

      const mockCache = {
        get: vi.fn().mockReturnValue('cached-value'),
        set: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        has: vi.fn().mockReturnValue(true),
        size: vi.fn().mockReturnValue(1),
      }

      const adapter = await new StorageAdapterTestBuilder()
        .withConfig({
          type: 'memory',
          encryption: { enabled: true },
          cache: { maxSize: 10 },
        })
        .withMockEncryption(mockEncryption)
        .withMockCache(mockCache)
        .withMockLogger()
        .withMockMetrics()
        .buildAndInitialize(TestEnhancedAdapter)

      // Should use mock services
      await adapter.set('key', 'value')
      expect(mockEncryption.encrypt).toHaveBeenCalled()

      const result = await adapter.get('key')
      expect(mockCache.get).toHaveBeenCalledWith('key')
      expect(result).toBe('cached-value')
    })
  })

  describe('Complex Integration Scenario', () => {
    it('should handle complex workflow with all features', async () => {
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      // Create adapter with all features
      adapter = new TestEnhancedAdapter(
        {
          type: 'memory',
          encryption: { enabled: true, passphrase: 'test' },
          compression: { enabled: true, minSize: 10 },
          cache: { maxSize: 100, ttl: 60000 },
          monitoring: { enabled: true },
          errorRecovery: { enabled: true },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test data requires flexible typing
        } as any,
        {
          logger: mockLogger,
        }
      )

      // Add middlewares
      adapter
        .addMiddleware(new LoggingMiddleware(mockLogger))
        .addMiddleware(new ValidationMiddleware())
        .addMiddleware(new MetricsMiddleware(adapter['performanceMonitor']!))

      await adapter.initialize()

      // Perform various operations
      const testData = TestDataGenerator.largeData(1) // 1KB of data

      // Store data
      await adapter.set('large-data', testData)

      // Retrieve data (should be cached)
      const retrieved1 = await adapter.get('large-data')
      expect(retrieved1).toEqual(testData)

      // Retrieve again (cache hit)
      const retrieved2 = await adapter.get('large-data')
      expect(retrieved2).toEqual(testData)

      // Check metrics
      const summary = adapter.getPerformanceSummary()
      // With middleware, each operation is tracked multiple times
      expect(summary?.totalOperations).toBeGreaterThanOrEqual(3) // At least 1 set + 2 get
      expect(summary?.cacheHitRate).toBeGreaterThan(0)

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Storage adapter initialized successfully'
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('[Storage] set started')
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('[Storage] get started')
      )
    })
  })

  describe('Additional coverage scenarios', () => {
    it('should skip initialization if already initialized', async () => {
      adapter = new TestEnhancedAdapter(config)
      await adapter.initialize()

      // Mark as already initialized
      const firstEncryption = adapter['encryption']

      // Try to initialize again - should skip
      await adapter.initialize()

      // Should keep same instance
      expect(adapter['encryption']).toBe(firstEncryption)
    })

    it('should use pre-configured services when injected directly', async () => {
      const mockEncryption = {
        encrypt: vi.fn().mockResolvedValue({ data: 'encrypted' }),
        decrypt: vi.fn().mockResolvedValue('decrypted'),
        deriveKey: vi.fn(),
        generateSalt: vi.fn(),
      }

      const mockCompression = {
        compress: vi.fn().mockResolvedValue({ data: 'compressed' }),
        decompress: vi.fn().mockResolvedValue('decompressed'),
        selectAlgorithm: vi.fn(),
      }

      const mockCache = {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        has: vi.fn(),
        size: vi.fn(),
      }

      // Create adapter with pre-configured services
      adapter = new TestEnhancedAdapter(
        {
          ...config,
          encryption: { enabled: true },
          compression: { enabled: true },
          cache: { maxSize: 10 },
        },
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking EncryptionService for testing
          encryptionService: mockEncryption as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking CompressionService for testing
          compressionService: mockCompression as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking CacheLayer for testing
          cacheLayer: mockCache as any,
        }
      )

      await adapter.initialize()

      // Services should be the pre-configured ones
      expect(adapter['encryption']).toBe(mockEncryption)
      expect(adapter['compression']).toBe(mockCompression)
      expect(adapter['cache']).toBe(mockCache)
    })

    it('should fallback to direct imports when no providers', async () => {
      // Mock the dynamic imports
      vi.doMock('../security/EncryptionService', () => ({
        EncryptionService: vi.fn().mockImplementation(() => ({
          deriveKey: vi.fn().mockResolvedValue(undefined),
          encrypt: vi.fn(),
          decrypt: vi.fn(),
        })),
      }))

      vi.doMock('../performance/CompressionService', () => ({
        CompressionService: vi.fn().mockImplementation(() => ({
          compress: vi.fn(),
          decompress: vi.fn(),
        })),
      }))

      vi.doMock('../performance/CacheLayer', () => ({
        CacheLayer: vi.fn().mockImplementation(() => ({
          get: vi.fn(),
          set: vi.fn(),
          clear: vi.fn(),
        })),
      }))

      adapter = new TestEnhancedAdapter({
        ...config,
        encryption: { enabled: true },
        compression: { enabled: true },
        cache: { maxSize: 10 },
      })

      await adapter.initialize()

      // Services should be created via fallback
      expect(adapter['encryption']).toBeDefined()
      expect(adapter['compression']).toBeDefined()
      expect(adapter['cache']).toBeDefined()

      vi.doUnmock('../security/EncryptionService')
      vi.doUnmock('../performance/CompressionService')
      vi.doUnmock('../performance/CacheLayer')
    })

    it('should return cached value on cache hit', async () => {
      const cachedValue = { data: 'cached' }
      const mockCache = {
        get: vi.fn().mockReturnValue(cachedValue),
        set: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        has: vi.fn(),
        size: vi.fn(),
      }

      adapter = new TestEnhancedAdapter(
        { ...config, cache: { maxSize: 10 } },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking CacheLayer for testing
        { cacheLayer: mockCache as any }
      )
      await adapter.initialize()

      const result = await adapter.get('cached-key')

      // Should return cached value without calling parent get
      expect(result).toEqual(cachedValue)
      expect(mockCache.get).toHaveBeenCalledWith('cached-key')
    })

    it('should update cache after successful get', async () => {
      const mockCache = {
        get: vi.fn().mockReturnValue(undefined), // No cache hit
        set: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        has: vi.fn(),
        size: vi.fn(),
      }

      adapter = new TestEnhancedAdapter(
        { ...config, cache: { maxSize: 10 } },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking CacheLayer for testing
        { cacheLayer: mockCache as any }
      )
      await adapter.initialize()

      // Store value first using proper JSON-serializable data
      const testValue = { data: 'test-value' }
      await adapter.set('key', testValue)

      // Clear the mock cache to simulate no cache hit
      mockCache.get.mockReturnValue(undefined)
      mockCache.set.mockClear()

      // Get value (should update cache)
      const result = await adapter.get('key')

      expect(result).toEqual(testValue)
      expect(mockCache.set).toHaveBeenCalledWith('key', testValue)
    })

    it('should recover and retry on set error', async () => {
      adapter = new TestEnhancedAdapter({
        ...config,
        errorRecovery: {
          enabled: true,
          strategies: ['retry'],
        },
      })
      await adapter.initialize()

      // Make adapter fail once then succeed
      adapter.shouldFail = true
      adapter.failureCount = 0

      await adapter.set('key', 'value')

      // Should have retried
      expect(adapter.failureCount).toBe(2)
    })

    it('should handle error recovery strategies array being undefined', () => {
      adapter = new TestEnhancedAdapter({
        ...config,
        errorRecovery: {
          enabled: true,
          // strategies undefined - should use defaults
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test data requires flexible typing
      } as any)

      // Should create default strategies
      expect(adapter['errorStrategies']).toHaveLength(1)
    })

    it('should not add composite strategy when no valid strategies', () => {
      adapter = new TestEnhancedAdapter({
        ...config,
        errorRecovery: {
          enabled: true,
          strategies: ['invalid-strategy'],
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test data requires flexible typing
      } as any)

      // Should not add any strategies for invalid names
      expect(adapter['errorStrategies']).toHaveLength(0)
    })

    it('should remove middleware that does not exist', () => {
      adapter = new TestEnhancedAdapter(config)

      // Should not throw when removing non-existent middleware
      expect(() => adapter.removeMiddleware('non-existent')).not.toThrow()
      expect(adapter['middlewares']).toHaveLength(0)
    })

    it('should handle initialization error', async () => {
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      // Create adapter that will fail initialization
      class FailingAdapter extends TestEnhancedAdapter {
        protected async initializeAdapter(): Promise<void> {
          throw new Error('Init failed')
        }
      }

      adapter = new FailingAdapter(config, { logger: mockLogger })

      await expect(adapter.initialize()).rejects.toThrow('Init failed')
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to initialize storage adapter',
        expect.any(Error)
      )
    })

    it('should handle cache being undefined in getWithMonitoring', async () => {
      adapter = new TestEnhancedAdapter(config)
      await adapter.initialize()

      // Store a value
      await adapter.set('key', 'value')

      // Get should work without cache
      const result = await adapter.get('key')
      expect(result).toBe('value')
    })

    it('should not update cache if get returns null', async () => {
      const mockCache = {
        get: vi.fn().mockReturnValue(undefined),
        set: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        has: vi.fn(),
        size: vi.fn(),
      }

      adapter = new TestEnhancedAdapter(
        { ...config, cache: { maxSize: 10 } },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking CacheLayer for testing
        { cacheLayer: mockCache as any }
      )
      await adapter.initialize()

      // Get non-existent key
      const result = await adapter.get('non-existent')

      expect(result).toBeNull()
      // Cache.set should not be called for null results
      expect(mockCache.set).not.toHaveBeenCalled()
    })

    it('should handle error recovery returning false', async () => {
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      // Create a strategy that cannot recover
      const nonRecoverableStrategy = {
        name: 'non-recoverable',
        canRecover: () => false,
        recover: vi.fn(),
      }

      adapter = new TestEnhancedAdapter(config, { logger: mockLogger })
      adapter.addErrorStrategy(nonRecoverableStrategy)
      await adapter.initialize()

      // Make adapter fail
      adapter.shouldFail = true
      adapter.failureCount = 0

      // Should throw the error without recovery
      await expect(adapter.get('key')).rejects.toThrow('BUSY: Database locked')
      expect(nonRecoverableStrategy.recover).not.toHaveBeenCalled()
    })

    it('should handle recovery strategy throwing error', async () => {
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      // Create a strategy that throws during recovery
      const failingStrategy = {
        name: 'failing',
        canRecover: () => true,
        recover: vi.fn().mockRejectedValue(new Error('Recovery failed')),
      }

      adapter = new TestEnhancedAdapter(config, { logger: mockLogger })
      adapter.addErrorStrategy(failingStrategy)
      await adapter.initialize()

      // Make adapter fail
      adapter.shouldFail = true
      adapter.failureCount = 0

      // Should throw original error when recovery fails
      await expect(adapter.get('key')).rejects.toThrow('BUSY: Database locked')
      expect(failingStrategy.recover).toHaveBeenCalled()
      expect(mockLogger.info).not.toHaveBeenCalledWith(
        expect.stringContaining('Error recovered')
      )
    })

    it('should handle performance monitor being undefined', async () => {
      adapter = new TestEnhancedAdapter(config)
      await adapter.initialize()

      // Should work without performance monitor
      await adapter.set('key', 'value')
      const result = await adapter.get('key')

      expect(result).toBe('value')
      expect(adapter.getPerformanceSummary()).toBeUndefined()
      expect(adapter.exportMetrics()).toBe('{}')
    })

    it('should dispose performance monitor on close', async () => {
      const mockMonitor = {
        record: vi.fn(),
        getMetrics: vi.fn(),
        getSummary: vi.fn(),
        clear: vi.fn(),
        export: vi.fn(),
        dispose: vi.fn(),
      }

      adapter = new TestEnhancedAdapter(config, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking PerformanceMonitor for testing
        performanceMonitor: mockMonitor as any,
      })
      await adapter.initialize()

      await adapter.close()

      expect(mockMonitor.dispose).toHaveBeenCalled()
    })

    it('should handle parent close not existing', async () => {
      // Create adapter with no parent close method
      class NoCloseAdapter extends TestEnhancedAdapter {
        async close(): Promise<void> {
          await super.close()
        }
      }

      const adapter = new NoCloseAdapter(config)

      // Should not throw
      await expect(adapter.close()).resolves.not.toThrow()
    })

    it('should record success with circuit breakers that have recordSuccess', () => {
      const strategyWithRecordSuccess = {
        name: 'with-record',
        canRecover: () => false,
        recover: vi.fn(),
        recordSuccess: vi.fn(),
      }

      const strategyWithoutRecordSuccess = {
        name: 'without-record',
        canRecover: () => false,
        recover: vi.fn(),
      }

      adapter = new TestEnhancedAdapter(config)
      adapter.addErrorStrategy(strategyWithRecordSuccess)
      adapter.addErrorStrategy(strategyWithoutRecordSuccess)

      // Call private method
      adapter['recordOperationSuccess']()

      expect(strategyWithRecordSuccess.recordSuccess).toHaveBeenCalled()
    })

    it('should handle monitoring with maxMetrics option', async () => {
      adapter = new TestEnhancedAdapter({
        ...config,
        monitoring: {
          enabled: true,
          maxMetrics: 100,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test data requires flexible typing
      } as any)
      await adapter.initialize()

      expect(adapter['performanceMonitor']).toBeDefined()

      // Perform operations to generate metrics
      await adapter.set('key', 'value')
      const summary = adapter.getPerformanceSummary()

      expect(summary).toBeDefined()
      expect(summary?.totalOperations).toBeGreaterThan(0)
    })

    it('should fallback to direct CacheLayer import when no provider', async () => {
      // Test the fallback path for cache initialization
      adapter = new TestEnhancedAdapter({
        ...config,
        cache: {
          maxSize: 10,
          ttl: 1000,
        },
      })

      // Set cacheProvider to null to trigger fallback
      adapter['cacheProvider'] = null

      await adapter.initialize()

      // Should have cache initialized through fallback
      expect(adapter['cache']).toBeDefined()
      expect(adapter['cache'].constructor.name).toBe('CacheLayer')
    })

    it('should fallback to direct EncryptionService import when no provider', async () => {
      // Test the fallback path for encryption initialization
      adapter = new TestEnhancedAdapter({
        ...config,
        encryption: {
          enabled: true,
          passphrase: 'test-passphrase',
        },
      })

      // Set encryptionProvider to null to trigger fallback
      adapter['encryptionProvider'] = null

      await adapter.initialize()

      // Should have encryption initialized through fallback
      expect(adapter['encryption']).toBeDefined()
      expect(adapter['encryption'].constructor.name).toBe('EncryptionService')
    })

    it('should fallback to direct CompressionService import when no provider', async () => {
      // Test the fallback path for compression initialization
      adapter = new TestEnhancedAdapter({
        ...config,
        compression: {
          enabled: true,
          algorithm: 'gzip',
        },
      })

      // Set compressionProvider to null to trigger fallback
      adapter['compressionProvider'] = null

      await adapter.initialize()

      // Should have compression initialized through fallback
      expect(adapter['compression']).toBeDefined()
      expect(adapter['compression'].constructor.name).toBe('CompressionService')
    })

    it('should log when removing middleware with logger', async () => {
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      adapter = new TestEnhancedAdapter(config, { logger: mockLogger })
      await adapter.initialize()

      // Add and remove middleware
      adapter.addMiddleware({
        name: 'test-middleware',
        execute: async (operation, next) => next(),
      })

      adapter.removeMiddleware('test-middleware')

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Removed middleware: test-middleware'
      )
    })

    it('should throw error after recovery failure in set', async () => {
      adapter = new TestEnhancedAdapter({
        ...config,
        errorRecovery: {
          enabled: true,
          strategy: 'retry',
          maxRetries: 1,
          retryDelay: 0,
        },
      })
      await adapter.initialize()

      // Mock parent set to always fail
      const originalSet = Object.getPrototypeOf(
        Object.getPrototypeOf(adapter)
      ).set
      Object.getPrototypeOf(Object.getPrototypeOf(adapter)).set = vi
        .fn()
        .mockRejectedValue(new Error('Persistent error'))

      // Should throw after recovery attempts fail
      await expect(adapter.set('test-key', 'test-value')).rejects.toThrow(
        'Persistent error'
      )

      // Restore original
      Object.getPrototypeOf(Object.getPrototypeOf(adapter)).set = originalSet
    })

    it('should throw error when recovery returns false in set operation', async () => {
      // Create adapter with no error recovery
      adapter = new TestEnhancedAdapter(config)
      await adapter.initialize()

      // Clear error strategies to ensure recovery returns false
      adapter['errorStrategies'] = []

      // Mock parent set to fail
      const originalSet = Object.getPrototypeOf(
        Object.getPrototypeOf(adapter)
      ).set
      Object.getPrototypeOf(Object.getPrototypeOf(adapter)).set = vi
        .fn()
        .mockRejectedValue(new Error('Test error'))

      // Should throw when recovery returns false (no strategies)
      await expect(adapter.set('test-key', 'test-value')).rejects.toThrow(
        'Test error'
      )

      // Restore original
      Object.getPrototypeOf(Object.getPrototypeOf(adapter)).set = originalSet
    })
  })
})
