/**
 * @fileoverview Test helpers and builders for storage adapters
 *
 * @description
 * Provides test utilities, builders, and mock implementations
 * for easier and more robust testing of storage adapters.
 *
 * @example
 * ```typescript
 * const adapter = new StorageAdapterTestBuilder()
 *   .withMockEncryption({ encrypt: vi.fn() })
 *   .withConfig({ type: 'memory' })
 *   .build(TestStorageAdapter)
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { vi } from 'vitest'
import type { StorageConfig, StorageMetadata } from '../types/storage'
import type { IEncryptionService, EncryptedData } from '../types/encryption'
import type { CompressionService } from '../performance/CompressionService'
import type { CacheLayer } from '../performance/CacheLayer'
import { BaseStorageAdapter } from './StorageAdapter'
import {
  MockServiceProvider,
  type ServiceProviderOptions,
} from './ServiceProviders'
import type {
  Logger,
  MetricsCollector,
  StorageAdapterDependencies,
} from './StorageAdapterFactory'
import type { PerformanceMonitor } from './PerformanceMonitor'

/**
 * Builder for creating test storage adapters
 *
 * @remarks
 * Provides a fluent interface for creating storage adapters
 * with mock services for testing.
 *
 * @example
 * ```typescript
 * const adapter = new StorageAdapterTestBuilder()
 *   .withMockEncryption({ encrypt: vi.fn().mockResolvedValue({ data: 'encrypted' }) })
 *   .withMockCache({ get: vi.fn().mockReturnValue('cached') })
 *   .build(TestStorageAdapter)
 * ```
 *
 * @public
 */
export class StorageAdapterTestBuilder {
  private config: Partial<StorageConfig> = {
    type: 'memory',
    encryption: { enabled: false },
    compression: { enabled: false },
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mock services can be any service implementation for testing flexibility
  private mockServices: Map<string, any> = new Map()
  private dependencies: Partial<StorageAdapterDependencies> = {}

  /**
   * Sets the storage configuration
   *
   * @param config - Partial or complete storage config
   * @returns This builder for chaining
   */
  withConfig(config: Partial<StorageConfig>): this {
    this.config = { ...this.config, ...config }
    return this
  }

  /**
   * Adds a mock encryption service
   *
   * @param mock - Partial mock of encryption service
   * @returns This builder for chaining
   */
  withMockEncryption(mock: Partial<IEncryptionService>): this {
    const fullMock: IEncryptionService = {
      encrypt:
        mock.encrypt ||
        vi.fn().mockResolvedValue({
          data: 'encrypted',
          iv: 'iv',
          authTag: 'tag',
          algorithm: 'aes-256-gcm',
          compressed: false,
        }),
      decrypt: mock.decrypt || vi.fn().mockResolvedValue('decrypted'),
      deriveKey: mock.deriveKey || vi.fn().mockResolvedValue(undefined),
      encryptFields: mock.encryptFields || vi.fn().mockResolvedValue({}),
      decryptFields: mock.decryptFields || vi.fn().mockResolvedValue({}),
      rotateKeys: mock.rotateKeys || vi.fn().mockResolvedValue(undefined),
      isEncrypted: mock.isEncrypted || vi.fn().mockReturnValue(false),
      ...mock,
    }
    this.mockServices.set('encryption', fullMock)
    return this
  }

  /**
   * Adds a mock compression service
   *
   * @param mock - Partial mock of compression service
   * @returns This builder for chaining
   */
  withMockCompression(mock: Partial<CompressionService>): this {
    const fullMock: Partial<CompressionService> = {
      compress:
        mock.compress ||
        vi.fn().mockResolvedValue({
          compressed: true,
          data: 'compressed',
          algorithm: 'gzip',
          originalSize: 100,
          compressionRatio: 0.5,
        }),
      decompress: mock.decompress || vi.fn().mockResolvedValue('decompressed'),
      ...mock,
    }
    this.mockServices.set('compression', fullMock as CompressionService)
    return this
  }

  /**
   * Adds a mock cache layer
   *
   * @param mock - Partial mock of cache layer
   * @returns This builder for chaining
   */
  withMockCache(mock: Partial<CacheLayer>): this {
    const fullMock = {
      get: mock.get || vi.fn().mockReturnValue(undefined),
      set: mock.set || vi.fn(),
      delete: mock.delete || vi.fn(),
      clear: mock.clear || vi.fn(),
      has: mock.has || vi.fn().mockReturnValue(false),
      size: mock.size || vi.fn().mockReturnValue(0),
      ...mock,
    } as CacheLayer
    this.mockServices.set('cache', fullMock)
    return this
  }

  /**
   * Adds a mock logger
   *
   * @param mock - Partial mock of logger
   * @returns This builder for chaining
   */
  withMockLogger(mock?: Partial<Logger>): this {
    const fullMock: Logger = {
      debug: mock?.debug || vi.fn(),
      info: mock?.info || vi.fn(),
      warn: mock?.warn || vi.fn(),
      error: mock?.error || vi.fn(),
      ...mock,
    }
    this.dependencies.logger = fullMock
    return this
  }

  /**
   * Adds a mock metrics collector
   *
   * @param mock - Partial mock of metrics collector
   * @returns This builder for chaining
   */
  withMockMetrics(mock?: Partial<MetricsCollector>): this {
    const fullMock: MetricsCollector = {
      record: mock?.record || vi.fn(),
      increment: mock?.increment || vi.fn(),
      gauge: mock?.gauge || vi.fn(),
      ...mock,
    }
    this.dependencies.metrics = fullMock
    return this
  }

  /**
   * Adds a mock performance monitor
   *
   * @param mock - Partial mock of performance monitor
   * @returns This builder for chaining
   */
  withMockPerformanceMonitor(mock?: Partial<PerformanceMonitor>): this {
    const fullMock = {
      record: mock?.record || vi.fn(),
      getMetrics: mock?.getMetrics || vi.fn().mockReturnValue([]),
      getMetricsByOperation:
        mock?.getMetricsByOperation || vi.fn().mockReturnValue([]),
      getSummary: mock?.getSummary || vi.fn().mockReturnValue({}),
      clear: mock?.clear || vi.fn(),
      export: mock?.export || vi.fn().mockReturnValue('{}'),
      ...mock,
    } as PerformanceMonitor
    this.dependencies.performanceMonitor = fullMock
    return this
  }

  /**
   * Builds the storage adapter with configured mocks
   *
   * @typeParam T - Type of storage adapter to build
   * @param AdapterClass - The adapter class to instantiate
   * @returns The configured adapter instance
   */
  build<T extends BaseStorageAdapter>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Adapter constructor options can vary by implementation
    AdapterClass: new (config: StorageConfig, options?: any) => T
  ): T {
    const options: ServiceProviderOptions & StorageAdapterDependencies = {
      ...this.dependencies,
    }

    // Add service providers if mocks are configured
    if (this.mockServices.has('encryption')) {
      options.encryptionProvider = new MockServiceProvider(
        'encryption',
        this.mockServices.get('encryption')
      )
    }

    if (this.mockServices.has('compression')) {
      options.compressionProvider = new MockServiceProvider(
        'compression',
        this.mockServices.get('compression')
      )
    }

    if (this.mockServices.has('cache')) {
      options.cacheProvider = new MockServiceProvider(
        'cache',
        this.mockServices.get('cache')
      )
    }

    return new AdapterClass(this.config as StorageConfig, options)
  }

  /**
   * Builds and initializes the adapter
   *
   * @typeParam T - Type of storage adapter to build
   * @param AdapterClass - The adapter class to instantiate
   * @returns Promise resolving to the initialized adapter
   */
  async buildAndInitialize<T extends BaseStorageAdapter>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Adapter constructor options can vary by implementation
    AdapterClass: new (config: StorageConfig, options?: any) => T
  ): Promise<T> {
    const adapter = this.build(AdapterClass)
    await adapter.initialize()
    return adapter
  }

  /**
   * Resets the builder to initial state
   *
   * @returns This builder for chaining
   */
  reset(): this {
    this.config = {
      type: 'memory',
      encryption: { enabled: false },
      compression: { enabled: false },
    }
    this.mockServices.clear()
    this.dependencies = {}
    return this
  }
}

/**
 * Mock storage adapter for testing
 *
 * @remarks
 * A fully functional in-memory storage adapter for testing.
 *
 * @public
 */
export class MockStorageAdapter extends BaseStorageAdapter {
  private storage = new Map<
    string,
    { value: string | EncryptedData; metadata?: StorageMetadata }
  >()
  public type = 'mock'

  protected async initializeAdapter(): Promise<void> {
    // Mock initialization
  }

  protected async getRaw(key: string): Promise<{
    value: string | EncryptedData
    metadata?: StorageMetadata
  } | null> {
    const item = this.storage.get(key)
    if (!item) return null

    return item.metadata !== undefined
      ? { value: item.value, metadata: item.metadata }
      : { value: item.value }
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

  public async getSize() {
    let size = 0
    for (const [key, item] of this.storage) {
      size += key.length
      if (typeof item.value === 'string') {
        size += item.value.length
      } else {
        size += JSON.stringify(item.value).length
      }
    }
    return size
  }

  // Test helpers
  public getInternalStorage() {
    return new Map(this.storage)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test helper allows any value type for flexible test data setup
  public setInternalItem(key: string, value: any, metadata: StorageMetadata) {
    this.storage.set(key, { value, metadata })
  }

  public async close(): Promise<void> {
    // Clean up resources
    this.storage.clear()
  }
}

/**
 * Test data generator for storage operations
 *
 * @remarks
 * Generates various types of test data for storage testing.
 *
 * @public
 */
export class TestDataGenerator {
  /**
   * Generates a random string
   *
   * @param length - Length of the string
   * @returns Random string
   */
  static randomString(length: number): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  /**
   * Generates test user data
   *
   * @param id - User ID
   * @returns User data object
   */
  static user(id: number) {
    return {
      id,
      name: `User ${id}`,
      email: `user${id}@example.com`,
      createdAt: new Date().toISOString(),
    }
  }

  /**
   * Generates large data for compression testing
   *
   * @param sizeKb - Size in kilobytes
   * @returns Large data object
   */
  static largeData(sizeKb: number) {
    const repeats = Math.floor((sizeKb * 1024) / 100)
    return {
      data: 'x'.repeat(repeats),
      metadata: {
        generated: true,
        size: sizeKb * 1024,
      },
    }
  }

  /**
   * Generates encrypted data mock
   *
   * @returns Mock encrypted data
   */
  static encryptedData(): EncryptedData {
    return {
      data: this.randomString(64),
      iv: this.randomString(24),
      authTag: this.randomString(32),
      algorithm: 'aes-256-gcm',
      compressed: false,
    }
  }

  /**
   * Generates storage metadata
   *
   * @param overrides - Override specific fields
   * @returns Storage metadata
   */
  static metadata(overrides?: Partial<StorageMetadata>): StorageMetadata {
    return {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      originalSize: 1024,
      compressed: false,
      encrypted: false,
      ...overrides,
    }
  }
}

/**
 * Test assertions for storage operations
 *
 * @remarks
 * Custom assertions for testing storage adapter behavior.
 *
 * @public
 */
export class StorageAssertions {
  /**
   * Asserts that a value was properly encrypted
   *
   * @param value - The value to check
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Assertion needs to validate any value structure
  static assertEncrypted(value: any): void {
    expect(value).toHaveProperty('data')
    expect(value).toHaveProperty('iv')
    expect(value).toHaveProperty('authTag')
    expect(value).toHaveProperty('algorithm')
    expect(typeof value.data).toBe('string')
  }

  /**
   * Asserts that metadata is valid
   *
   * @param metadata - The metadata to check
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Assertion needs to validate any metadata structure
  static assertValidMetadata(metadata: any): void {
    expect(metadata).toHaveProperty('createdAt')
    expect(metadata).toHaveProperty('updatedAt')
    expect(typeof metadata.createdAt).toBe('number')
    expect(typeof metadata.updatedAt).toBe('number')
    expect(metadata.createdAt).toBeGreaterThan(0)
    expect(metadata.updatedAt).toBeGreaterThan(0)
  }

  /**
   * Asserts that a value was compressed
   *
   * @param metadata - The metadata to check
   */
  static assertCompressed(metadata: StorageMetadata): void {
    expect(metadata.compressed).toBe(true)
    expect(metadata.compressionAlgorithm).toBeDefined()
    expect(metadata.compressedSize).toBeDefined()
    if (
      metadata.originalSize !== undefined &&
      metadata.compressedSize !== undefined
    ) {
      expect(metadata.compressedSize).toBeLessThan(metadata.originalSize)
    }
  }
}

/**
 * Test fixture for storage adapter testing
 *
 * @remarks
 * Sets up and tears down test environment for storage testing.
 *
 * @public
 */
export class StorageTestFixture {
  private adapters: BaseStorageAdapter[] = []

  /**
   * Creates a test adapter with default configuration
   *
   * @param AdapterClass - The adapter class to create
   * @param config - Optional configuration overrides
   * @returns Promise resolving to initialized adapter
   */
  async createAdapter<T extends BaseStorageAdapter>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Adapter constructor options can vary by implementation
    AdapterClass: new (config: StorageConfig, options?: any) => T,
    config?: Partial<StorageConfig>
  ): Promise<T> {
    const adapter = new StorageAdapterTestBuilder()
      .withConfig(config || {})
      .build(AdapterClass)

    await adapter.initialize()
    this.adapters.push(adapter)
    return adapter
  }

  /**
   * Cleans up all created adapters
   */
  async cleanup(): Promise<void> {
    for (const adapter of this.adapters) {
      try {
        await adapter.close?.()
      } catch {
        // Ignore cleanup errors
      }
    }
    this.adapters = []
  }

  /**
   * Creates test data in an adapter
   *
   * @param adapter - The adapter to populate
   * @param count - Number of items to create
   */
  async populateTestData(
    adapter: BaseStorageAdapter,
    count: number
  ): Promise<void> {
    for (let i = 1; i <= count; i++) {
      await adapter.set(`test:${i}`, TestDataGenerator.user(i))
    }
  }
}
