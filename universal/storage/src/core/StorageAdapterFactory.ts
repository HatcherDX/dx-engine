/**
 * @fileoverview Factory for creating storage adapters with dependency injection
 *
 * @description
 * Implements the Factory and Builder patterns to create storage adapters
 * with flexible dependency injection. This enables better testability
 * and configuration flexibility.
 *
 * @example
 * ```typescript
 * const factory = new StorageAdapterFactory()
 *   .withLogger(customLogger)
 *   .withCache(customCache)
 *
 * const adapter = factory.create(SQLiteAdapter, config)
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import type { IEncryptionService } from '../types/encryption'
import type { CompressionService } from '../performance/CompressionService'
import type { CacheLayer } from '../performance/CacheLayer'
import type { StorageConfig } from '../types/storage'
import type { BaseStorageAdapter } from './StorageAdapter'
import type { PerformanceMonitor } from './PerformanceMonitor'
import type { ServiceProviderOptions } from './ServiceProviders'

/**
 * Logger interface for storage operations
 *
 * @public
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
}

/**
 * Metrics collector interface for storage operations
 *
 * @public
 */
export interface MetricsCollector {
  record(metric: string, value: number, tags?: Record<string, string>): void
  increment(metric: string, tags?: Record<string, string>): void
  gauge(metric: string, value: number, tags?: Record<string, string>): void
}

/**
 * Dependencies that can be injected into storage adapters
 *
 * @remarks
 * All dependencies are optional to maintain backward compatibility.
 *
 * @public
 */
export interface StorageAdapterDependencies extends ServiceProviderOptions {
  /**
   * Optional encryption service instance
   */
  encryptionService?: IEncryptionService

  /**
   * Optional compression service instance
   */
  compressionService?: CompressionService

  /**
   * Optional cache layer instance
   */
  cacheLayer?: CacheLayer

  /**
   * Optional logger for storage operations
   */
  logger?: Logger

  /**
   * Optional metrics collector for monitoring
   */
  metrics?: MetricsCollector

  /**
   * Optional performance monitor
   */
  performanceMonitor?: PerformanceMonitor
}

/**
 * Factory for creating storage adapters with dependency injection
 *
 * @remarks
 * Provides a fluent builder interface for configuring and creating
 * storage adapters with custom dependencies.
 *
 * @example
 * ```typescript
 * const factory = new StorageAdapterFactory()
 *   .withLogger(new ConsoleLogger())
 *   .withMetrics(new PrometheusCollector())
 *   .withCache(new InMemoryCache())
 *
 * const adapter = factory.create(SQLiteAdapter, {
 *   type: 'sqlite',
 *   path: './database.db'
 * })
 * ```
 *
 * @public
 */
export class StorageAdapterFactory {
  private dependencies: StorageAdapterDependencies = {}

  /**
   * Adds an encryption service to the dependencies
   *
   * @param service - The encryption service instance
   * @returns This factory instance for chaining
   *
   * @example
   * ```typescript
   * factory.withEncryption(customEncryptionService)
   * ```
   */
  withEncryption(service: IEncryptionService): this {
    this.dependencies.encryptionService = service
    return this
  }

  /**
   * Adds a compression service to the dependencies
   *
   * @param service - The compression service instance
   * @returns This factory instance for chaining
   *
   * @example
   * ```typescript
   * factory.withCompression(customCompressionService)
   * ```
   */
  withCompression(service: CompressionService): this {
    this.dependencies.compressionService = service
    return this
  }

  /**
   * Adds a cache layer to the dependencies
   *
   * @param cache - The cache layer instance
   * @returns This factory instance for chaining
   *
   * @example
   * ```typescript
   * factory.withCache(new LRUCache({ maxSize: 1000 }))
   * ```
   */
  withCache(cache: CacheLayer): this {
    this.dependencies.cacheLayer = cache
    return this
  }

  /**
   * Adds a logger to the dependencies
   *
   * @param logger - The logger instance
   * @returns This factory instance for chaining
   *
   * @example
   * ```typescript
   * factory.withLogger(winston.createLogger())
   * ```
   */
  withLogger(logger: Logger): this {
    this.dependencies.logger = logger
    return this
  }

  /**
   * Adds a metrics collector to the dependencies
   *
   * @param metrics - The metrics collector instance
   * @returns This factory instance for chaining
   *
   * @example
   * ```typescript
   * factory.withMetrics(new PrometheusCollector())
   * ```
   */
  withMetrics(metrics: MetricsCollector): this {
    this.dependencies.metrics = metrics
    return this
  }

  /**
   * Adds a performance monitor to the dependencies
   *
   * @param monitor - The performance monitor instance
   * @returns This factory instance for chaining
   *
   * @example
   * ```typescript
   * factory.withPerformanceMonitor(new DefaultPerformanceMonitor())
   * ```
   */
  withPerformanceMonitor(monitor: PerformanceMonitor): this {
    this.dependencies.performanceMonitor = monitor
    return this
  }

  /**
   * Sets all dependencies at once
   *
   * @param dependencies - All dependencies to inject
   * @returns This factory instance for chaining
   *
   * @example
   * ```typescript
   * factory.withDependencies({
   *   logger: customLogger,
   *   metrics: customMetrics,
   *   cacheLayer: customCache
   * })
   * ```
   */
  withDependencies(dependencies: StorageAdapterDependencies): this {
    this.dependencies = { ...this.dependencies, ...dependencies }
    return this
  }

  /**
   * Creates a storage adapter instance with injected dependencies
   *
   * @typeParam T - The type of storage adapter to create
   * @param AdapterClass - The adapter class constructor
   * @param config - Storage configuration
   * @returns The configured storage adapter instance
   *
   * @example
   * ```typescript
   * const adapter = factory.create(MemoryAdapter, {
   *   type: 'memory',
   *   cache: { maxSize: 100 }
   * })
   * ```
   */
  create<T extends BaseStorageAdapter>(
    AdapterClass: new (
      config: StorageConfig,
      deps?: StorageAdapterDependencies
    ) => T,
    config: StorageConfig
  ): T {
    return new AdapterClass(config, this.dependencies)
  }

  /**
   * Creates a storage adapter and initializes it
   *
   * @typeParam T - The type of storage adapter to create
   * @param AdapterClass - The adapter class constructor
   * @param config - Storage configuration
   * @returns Promise that resolves to the initialized adapter
   *
   * @example
   * ```typescript
   * const adapter = await factory.createAndInitialize(SQLiteAdapter, {
   *   type: 'sqlite',
   *   path: ':memory:'
   * })
   * ```
   */
  async createAndInitialize<T extends BaseStorageAdapter>(
    AdapterClass: new (
      config: StorageConfig,
      deps?: StorageAdapterDependencies
    ) => T,
    config: StorageConfig
  ): Promise<T> {
    const adapter = this.create(AdapterClass, config)
    await adapter.initialize()
    return adapter
  }

  /**
   * Clones this factory with the same dependencies
   *
   * @returns A new factory instance with the same dependencies
   *
   * @example
   * ```typescript
   * const factory2 = factory.clone()
   *   .withLogger(differentLogger)
   * ```
   */
  clone(): StorageAdapterFactory {
    const newFactory = new StorageAdapterFactory()
    newFactory.dependencies = { ...this.dependencies }
    return newFactory
  }

  /**
   * Resets all dependencies
   *
   * @returns This factory instance for chaining
   *
   * @example
   * ```typescript
   * factory.reset().withLogger(newLogger)
   * ```
   */
  reset(): this {
    this.dependencies = {}
    return this
  }
}
