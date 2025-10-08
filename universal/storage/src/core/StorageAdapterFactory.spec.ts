/**
 * @fileoverview Comprehensive test suite for StorageAdapterFactory
 *
 * @description
 * Tests the factory pattern implementation for creating storage adapters
 * with dependency injection, achieving 100% code coverage.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  StorageAdapterFactory,
  type Logger,
  type MetricsCollector,
  type StorageAdapterDependencies,
} from './StorageAdapterFactory'
import { BaseStorageAdapter } from './StorageAdapter'
import type { StorageConfig } from '../types/storage'
import type { IEncryptionService } from '../types/encryption'
import type { CompressionService } from '../performance/CompressionService'
import type { CacheLayer } from '../performance/CacheLayer'
import type { PerformanceMonitor } from './PerformanceMonitor'

// Test adapter for testing factory
class TestStorageAdapter extends BaseStorageAdapter {
  public receivedDependencies: StorageAdapterDependencies | undefined

  constructor(config: StorageConfig, deps?: StorageAdapterDependencies) {
    super(config)
    this.receivedDependencies = deps
  }

  protected async initializeAdapter(): Promise<void> {
    // Test implementation
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Test implementation doesn't require key parameter
  protected async getRaw(_key: string) {
    return null
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any -- Test implementation doesn't require parameters, flexible metadata type for testing
  protected async setRaw(_key: string, _value: string, _metadata: any) {
    // Test implementation
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Test implementation doesn't require key parameter
  protected async deleteRaw(_key: string) {
    // Test implementation
  }

  protected async clearRaw() {
    // Test implementation
  }
}

describe('StorageAdapterFactory', () => {
  let factory: StorageAdapterFactory

  beforeEach(() => {
    factory = new StorageAdapterFactory()
  })

  describe('withEncryption', () => {
    it('should add encryption service to dependencies', () => {
      const mockEncryption: IEncryptionService = {
        encrypt: vi.fn(),
        decrypt: vi.fn(),
        deriveKey: vi.fn(),
        generateSalt: vi.fn(),
      }

      const result = factory.withEncryption(mockEncryption)

      expect(result).toBe(factory) // Should return self for chaining

      const config: StorageConfig = { type: 'memory' }
      const adapter = factory.create(TestStorageAdapter, config)

      expect(adapter.receivedDependencies?.encryptionService).toBe(
        mockEncryption
      )
    })

    it('should support method chaining', () => {
      const mockEncryption: IEncryptionService = {
        encrypt: vi.fn(),
        decrypt: vi.fn(),
        deriveKey: vi.fn(),
        generateSalt: vi.fn(),
      }

      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      factory.withEncryption(mockEncryption).withLogger(mockLogger)

      const adapter = factory.create(TestStorageAdapter, { type: 'memory' })

      expect(adapter.receivedDependencies?.encryptionService).toBe(
        mockEncryption
      )
      expect(adapter.receivedDependencies?.logger).toBe(mockLogger)
    })
  })

  describe('withCompression', () => {
    it('should add compression service to dependencies', () => {
      const mockCompression = {
        compress: vi.fn(),
        decompress: vi.fn(),
        selectAlgorithm: vi.fn(),
      } as unknown as CompressionService

      const result = factory.withCompression(mockCompression)

      expect(result).toBe(factory)

      const adapter = factory.create(TestStorageAdapter, { type: 'memory' })
      expect(adapter.receivedDependencies?.compressionService).toBe(
        mockCompression
      )
    })
  })

  describe('withCache', () => {
    it('should add cache layer to dependencies', () => {
      const mockCache = {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        has: vi.fn(),
        size: vi.fn(),
      } as unknown as CacheLayer

      const result = factory.withCache(mockCache)

      expect(result).toBe(factory)

      const adapter = factory.create(TestStorageAdapter, { type: 'memory' })
      expect(adapter.receivedDependencies?.cacheLayer).toBe(mockCache)
    })
  })

  describe('withLogger', () => {
    it('should add logger to dependencies', () => {
      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      const result = factory.withLogger(mockLogger)

      expect(result).toBe(factory)

      const adapter = factory.create(TestStorageAdapter, { type: 'memory' })
      expect(adapter.receivedDependencies?.logger).toBe(mockLogger)
    })

    it('should handle all logger methods', () => {
      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      factory.withLogger(mockLogger)
      const adapter = factory.create(TestStorageAdapter, { type: 'memory' })
      const logger = adapter.receivedDependencies?.logger

      // Test all logger methods
      logger?.debug('debug message', { extra: 'data' })
      logger?.info('info message', 123)
      logger?.warn('warning message')
      logger?.error('error message', new Error('test'))

      expect(mockLogger.debug).toHaveBeenCalledWith('debug message', {
        extra: 'data',
      })
      expect(mockLogger.info).toHaveBeenCalledWith('info message', 123)
      expect(mockLogger.warn).toHaveBeenCalledWith('warning message')
      expect(mockLogger.error).toHaveBeenCalledWith(
        'error message',
        new Error('test')
      )
    })
  })

  describe('withMetrics', () => {
    it('should add metrics collector to dependencies', () => {
      const mockMetrics: MetricsCollector = {
        record: vi.fn(),
        increment: vi.fn(),
        gauge: vi.fn(),
      }

      const result = factory.withMetrics(mockMetrics)

      expect(result).toBe(factory)

      const adapter = factory.create(TestStorageAdapter, { type: 'memory' })
      expect(adapter.receivedDependencies?.metrics).toBe(mockMetrics)
    })

    it('should handle all metrics methods with tags', () => {
      const mockMetrics: MetricsCollector = {
        record: vi.fn(),
        increment: vi.fn(),
        gauge: vi.fn(),
      }

      factory.withMetrics(mockMetrics)
      const adapter = factory.create(TestStorageAdapter, { type: 'memory' })
      const metrics = adapter.receivedDependencies?.metrics

      // Test all metrics methods with and without tags
      metrics?.record('latency', 100, { operation: 'get' })
      metrics?.record('size', 1024)
      metrics?.increment('requests', { status: 'success' })
      metrics?.increment('errors')
      metrics?.gauge('connections', 5, { pool: 'main' })
      metrics?.gauge('memory', 256)

      expect(mockMetrics.record).toHaveBeenCalledWith('latency', 100, {
        operation: 'get',
      })
      expect(mockMetrics.record).toHaveBeenCalledWith('size', 1024)
      expect(mockMetrics.increment).toHaveBeenCalledWith('requests', {
        status: 'success',
      })
      expect(mockMetrics.increment).toHaveBeenCalledWith('errors')
      expect(mockMetrics.gauge).toHaveBeenCalledWith('connections', 5, {
        pool: 'main',
      })
      expect(mockMetrics.gauge).toHaveBeenCalledWith('memory', 256)
    })
  })

  describe('withPerformanceMonitor', () => {
    it('should add performance monitor to dependencies', () => {
      const mockMonitor = {
        record: vi.fn(),
        getMetrics: vi.fn(),
        getSummary: vi.fn(),
        clear: vi.fn(),
        export: vi.fn(),
      } as unknown as PerformanceMonitor

      const result = factory.withPerformanceMonitor(mockMonitor)

      expect(result).toBe(factory)

      const adapter = factory.create(TestStorageAdapter, { type: 'memory' })
      expect(adapter.receivedDependencies?.performanceMonitor).toBe(mockMonitor)
    })
  })

  describe('withDependencies', () => {
    it('should set all dependencies at once', () => {
      const dependencies: StorageAdapterDependencies = {
        encryptionService: {
          encrypt: vi.fn(),
          decrypt: vi.fn(),
          deriveKey: vi.fn(),
          generateSalt: vi.fn(),
        },
        compressionService: {
          compress: vi.fn(),
          decompress: vi.fn(),
          selectAlgorithm: vi.fn(),
        } as unknown as CompressionService,
        cacheLayer: {
          get: vi.fn(),
          set: vi.fn(),
          delete: vi.fn(),
          clear: vi.fn(),
          has: vi.fn(),
          size: vi.fn(),
        } as unknown as CacheLayer,
        logger: {
          debug: vi.fn(),
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
        metrics: {
          record: vi.fn(),
          increment: vi.fn(),
          gauge: vi.fn(),
        },
        performanceMonitor: {
          record: vi.fn(),
          getMetrics: vi.fn(),
          getSummary: vi.fn(),
          clear: vi.fn(),
          export: vi.fn(),
        } as unknown as PerformanceMonitor,
      }

      const result = factory.withDependencies(dependencies)

      expect(result).toBe(factory)

      const adapter = factory.create(TestStorageAdapter, { type: 'memory' })
      expect(adapter.receivedDependencies?.encryptionService).toBe(
        dependencies.encryptionService
      )
      expect(adapter.receivedDependencies?.compressionService).toBe(
        dependencies.compressionService
      )
      expect(adapter.receivedDependencies?.cacheLayer).toBe(
        dependencies.cacheLayer
      )
      expect(adapter.receivedDependencies?.logger).toBe(dependencies.logger)
      expect(adapter.receivedDependencies?.metrics).toBe(dependencies.metrics)
      expect(adapter.receivedDependencies?.performanceMonitor).toBe(
        dependencies.performanceMonitor
      )
    })

    it('should merge with existing dependencies', () => {
      const logger1: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      const logger2: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      const metrics: MetricsCollector = {
        record: vi.fn(),
        increment: vi.fn(),
        gauge: vi.fn(),
      }

      factory.withLogger(logger1)

      factory.withDependencies({
        logger: logger2,
        metrics: metrics,
      })

      const adapter = factory.create(TestStorageAdapter, { type: 'memory' })
      expect(adapter.receivedDependencies?.logger).toBe(logger2) // Should override
      expect(adapter.receivedDependencies?.metrics).toBe(metrics)
    })

    it('should handle empty dependencies', () => {
      const result = factory.withDependencies({})

      expect(result).toBe(factory)

      const adapter = factory.create(TestStorageAdapter, { type: 'memory' })
      expect(adapter.receivedDependencies).toEqual({})
    })
  })

  describe('create', () => {
    it('should create adapter with config and dependencies', () => {
      const config: StorageConfig = {
        type: 'sqlite',
        path: '/test/db.sqlite',
        encryption: { enabled: true },
      }

      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      factory.withLogger(mockLogger)

      const adapter = factory.create(TestStorageAdapter, config)

      expect(adapter).toBeInstanceOf(TestStorageAdapter)
      expect(adapter.config).toEqual(config)
      expect(adapter.receivedDependencies?.logger).toBe(mockLogger)
    })

    it('should create adapter without dependencies', () => {
      const config: StorageConfig = { type: 'memory' }

      const adapter = factory.create(TestStorageAdapter, config)

      expect(adapter).toBeInstanceOf(TestStorageAdapter)
      expect(adapter.config).toEqual(config)
      expect(adapter.receivedDependencies).toEqual({})
    })

    it('should pass dependencies to adapter constructor', () => {
      class DependencyAwareAdapter extends TestStorageAdapter {
        constructor(config: StorageConfig, deps?: StorageAdapterDependencies) {
          super(config, deps)
          if (deps?.logger) {
            deps.logger.info('Adapter created')
          }
        }
      }

      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      factory.withLogger(mockLogger)

      factory.create(DependencyAwareAdapter, { type: 'memory' })

      expect(mockLogger.info).toHaveBeenCalledWith('Adapter created')
    })
  })

  describe('createAndInitialize', () => {
    it('should create and initialize adapter', async () => {
      const config: StorageConfig = { type: 'memory' }

      const adapter = await factory.createAndInitialize(
        TestStorageAdapter,
        config
      )

      expect(adapter).toBeInstanceOf(TestStorageAdapter)
      expect(adapter.initialized).toBe(true)
    })

    it('should pass dependencies to initialized adapter', async () => {
      const mockMetrics: MetricsCollector = {
        record: vi.fn(),
        increment: vi.fn(),
        gauge: vi.fn(),
      }

      factory.withMetrics(mockMetrics)

      const adapter = await factory.createAndInitialize(TestStorageAdapter, {
        type: 'memory',
      })

      expect(adapter.receivedDependencies?.metrics).toBe(mockMetrics)
      expect(adapter.initialized).toBe(true)
    })

    it('should handle initialization errors', async () => {
      class FailingAdapter extends TestStorageAdapter {
        async initialize(): Promise<void> {
          throw new Error('Init failed')
        }
      }

      await expect(
        factory.createAndInitialize(FailingAdapter, { type: 'memory' })
      ).rejects.toThrow('Init failed')
    })

    it('should initialize with all dependencies', async () => {
      const dependencies: StorageAdapterDependencies = {
        logger: {
          debug: vi.fn(),
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
        metrics: {
          record: vi.fn(),
          increment: vi.fn(),
          gauge: vi.fn(),
        },
      }

      factory.withDependencies(dependencies)

      const adapter = await factory.createAndInitialize(TestStorageAdapter, {
        type: 'memory',
      })

      expect(adapter.receivedDependencies?.logger).toBe(dependencies.logger)
      expect(adapter.receivedDependencies?.metrics).toBe(dependencies.metrics)
      expect(adapter.initialized).toBe(true)
    })
  })

  describe('clone', () => {
    it('should create a copy with same dependencies', () => {
      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      const mockMetrics: MetricsCollector = {
        record: vi.fn(),
        increment: vi.fn(),
        gauge: vi.fn(),
      }

      factory.withLogger(mockLogger).withMetrics(mockMetrics)

      const cloned = factory.clone()

      expect(cloned).not.toBe(factory) // Should be a new instance
      expect(cloned).toBeInstanceOf(StorageAdapterFactory)

      const adapter = cloned.create(TestStorageAdapter, { type: 'memory' })
      expect(adapter.receivedDependencies?.logger).toBe(mockLogger)
      expect(adapter.receivedDependencies?.metrics).toBe(mockMetrics)
    })

    it('should allow independent modification of cloned factory', () => {
      const logger1: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      const logger2: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      factory.withLogger(logger1)
      const cloned = factory.clone()

      // Modify cloned factory
      cloned.withLogger(logger2)

      // Original should keep logger1
      const adapter1 = factory.create(TestStorageAdapter, { type: 'memory' })
      expect(adapter1.receivedDependencies?.logger).toBe(logger1)

      // Cloned should have logger2
      const adapter2 = cloned.create(TestStorageAdapter, { type: 'memory' })
      expect(adapter2.receivedDependencies?.logger).toBe(logger2)
    })

    it('should clone empty factory', () => {
      const cloned = factory.clone()

      expect(cloned).not.toBe(factory)
      expect(cloned).toBeInstanceOf(StorageAdapterFactory)

      const adapter = cloned.create(TestStorageAdapter, { type: 'memory' })
      expect(adapter.receivedDependencies).toEqual({})
    })

    it('should support chaining after clone', () => {
      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      const cloned = factory.clone().withLogger(mockLogger)

      const adapter = cloned.create(TestStorageAdapter, { type: 'memory' })
      expect(adapter.receivedDependencies?.logger).toBe(mockLogger)
    })
  })

  describe('reset', () => {
    it('should clear all dependencies', () => {
      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      const mockMetrics: MetricsCollector = {
        record: vi.fn(),
        increment: vi.fn(),
        gauge: vi.fn(),
      }

      factory.withLogger(mockLogger).withMetrics(mockMetrics)

      const result = factory.reset()

      expect(result).toBe(factory) // Should return self

      const adapter = factory.create(TestStorageAdapter, { type: 'memory' })
      expect(adapter.receivedDependencies).toEqual({})
    })

    it('should allow adding new dependencies after reset', () => {
      const logger1: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      const logger2: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      factory.withLogger(logger1)
      factory.reset()
      factory.withLogger(logger2)

      const adapter = factory.create(TestStorageAdapter, { type: 'memory' })
      expect(adapter.receivedDependencies?.logger).toBe(logger2)
    })

    it('should support method chaining after reset', () => {
      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      factory.withLogger(mockLogger)

      const mockMetrics: MetricsCollector = {
        record: vi.fn(),
        increment: vi.fn(),
        gauge: vi.fn(),
      }

      factory.reset().withMetrics(mockMetrics)

      const adapter = factory.create(TestStorageAdapter, { type: 'memory' })
      expect(adapter.receivedDependencies?.logger).toBeUndefined()
      expect(adapter.receivedDependencies?.metrics).toBe(mockMetrics)
    })
  })

  describe('Complex Scenarios', () => {
    it('should handle all dependencies together', () => {
      const dependencies: StorageAdapterDependencies = {
        encryptionService: {
          encrypt: vi.fn(),
          decrypt: vi.fn(),
          deriveKey: vi.fn(),
          generateSalt: vi.fn(),
        },
        compressionService: {
          compress: vi.fn(),
          decompress: vi.fn(),
        } as unknown as CompressionService,
        cacheLayer: {
          get: vi.fn(),
          set: vi.fn(),
        } as unknown as CacheLayer,
        logger: {
          debug: vi.fn(),
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
        metrics: {
          record: vi.fn(),
          increment: vi.fn(),
          gauge: vi.fn(),
        },
        performanceMonitor: {
          record: vi.fn(),
        } as unknown as PerformanceMonitor,
      }

      factory
        .withEncryption(dependencies.encryptionService!)
        .withCompression(dependencies.compressionService!)
        .withCache(dependencies.cacheLayer!)
        .withLogger(dependencies.logger!)
        .withMetrics(dependencies.metrics!)
        .withPerformanceMonitor(dependencies.performanceMonitor!)

      const adapter = factory.create(TestStorageAdapter, { type: 'memory' })

      expect(adapter.receivedDependencies?.encryptionService).toBeDefined()
      expect(adapter.receivedDependencies?.compressionService).toBeDefined()
      expect(adapter.receivedDependencies?.cacheLayer).toBeDefined()
      expect(adapter.receivedDependencies?.logger).toBeDefined()
      expect(adapter.receivedDependencies?.metrics).toBeDefined()
      expect(adapter.receivedDependencies?.performanceMonitor).toBeDefined()
    })

    it('should support fluent builder pattern completely', () => {
      const adapter = new StorageAdapterFactory()
        .withLogger({
          debug: vi.fn(),
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        })
        .withMetrics({
          record: vi.fn(),
          increment: vi.fn(),
          gauge: vi.fn(),
        })
        .create(TestStorageAdapter, { type: 'memory' })

      expect(adapter).toBeInstanceOf(TestStorageAdapter)
      expect(adapter.receivedDependencies?.logger).toBeDefined()
      expect(adapter.receivedDependencies?.metrics).toBeDefined()
    })

    it('should handle rapid factory reuse', async () => {
      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      factory.withLogger(mockLogger)

      // Create multiple adapters rapidly
      const adapters = await Promise.all([
        factory.createAndInitialize(TestStorageAdapter, { type: 'memory' }),
        factory.createAndInitialize(TestStorageAdapter, { type: 'sqlite' }),
        factory.createAndInitialize(TestStorageAdapter, {
          type: 'indexeddb',
        }),
      ])

      adapters.forEach((adapter) => {
        expect(adapter).toBeInstanceOf(TestStorageAdapter)
        expect(adapter.initialized).toBe(true)
        expect(adapter.receivedDependencies?.logger).toBe(mockLogger)
      })
    })
  })
})
