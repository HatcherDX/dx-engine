/**
 * @fileoverview Enhanced storage adapter with backward compatibility
 *
 * @description
 * Extends BaseStorageAdapter with new features while maintaining
 * full backward compatibility. This can be used as a drop-in replacement
 * for BaseStorageAdapter with additional capabilities.
 *
 * @example
 * ```typescript
 * class MyAdapter extends EnhancedStorageAdapter {
 *   // Implementation
 * }
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { BaseStorageAdapter } from './StorageAdapter'
import type { StorageConfig, IStorageAdapter } from '../types/storage'
import type { ServiceProviderOptions } from './ServiceProviders'
import {
  EncryptionServiceProvider,
  CompressionServiceProvider,
  CacheServiceProvider,
} from './ServiceProviders'
import type {
  StorageAdapterDependencies,
  Logger,
} from './StorageAdapterFactory'
import type { PerformanceMonitor } from './PerformanceMonitor'
import { DefaultPerformanceMonitor } from './PerformanceMonitor'
import type { ErrorRecoveryStrategy, ErrorContext } from './ErrorHandling'
import {
  RetryStrategy,
  CircuitBreakerStrategy,
  CompositeStrategy,
} from './ErrorHandling'
import type { AdapterMiddleware, MiddlewareContext } from './AdapterMiddleware'

/**
 * Enhanced storage adapter configuration
 *
 * @public
 */
export interface EnhancedStorageConfig extends StorageConfig {
  /**
   * Enable performance monitoring
   */
  monitoring?: {
    enabled: boolean
    maxMetrics?: number
  }

  /**
   * Enable error recovery strategies
   */
  errorRecovery?: {
    enabled: boolean
    strategies?: string[]
  }

  /**
   * Enable middleware support
   */
  middleware?: {
    enabled: boolean
  }
}

/**
 * Enhanced storage adapter with new features and backward compatibility
 *
 * @remarks
 * This adapter extends the base adapter with:
 * - Service provider pattern for dependency injection
 * - Performance monitoring
 * - Error recovery strategies
 * - Middleware support
 * - Enhanced testability
 *
 * All new features are opt-in and don't affect existing functionality.
 *
 * @public
 */
export abstract class EnhancedStorageAdapter
  extends BaseStorageAdapter
  implements IStorageAdapter
{
  // New optional dependencies
  protected logger?: Logger
  protected performanceMonitor?: PerformanceMonitor
  protected errorStrategies: ErrorRecoveryStrategy[] = []
  protected middlewares: AdapterMiddleware[] = []

  // Service providers
  protected encryptionProvider?: ServiceProviderOptions['encryptionProvider']
  protected compressionProvider?: ServiceProviderOptions['compressionProvider']
  protected cacheProvider?: ServiceProviderOptions['cacheProvider']

  /**
   * Creates an enhanced storage adapter
   *
   * @param config - Storage configuration
   * @param dependencies - Optional dependencies for enhanced functionality
   */
  constructor(
    config: StorageConfig | EnhancedStorageConfig,
    dependencies?: ServiceProviderOptions & StorageAdapterDependencies
  ) {
    super(config)

    // Set up service providers (use provided or defaults)
    if (dependencies?.encryptionProvider) {
      this.encryptionProvider = dependencies.encryptionProvider
    } else if (this.config.encryption?.enabled) {
      this.encryptionProvider = new EncryptionServiceProvider()
    }

    if (dependencies?.compressionProvider) {
      this.compressionProvider = dependencies.compressionProvider
    } else if (this.config.compression?.enabled) {
      this.compressionProvider = new CompressionServiceProvider()
    }

    if (dependencies?.cacheProvider) {
      this.cacheProvider = dependencies.cacheProvider
    } else if (this.config.cache) {
      this.cacheProvider = new CacheServiceProvider()
    }

    // Set up optional dependencies
    if (dependencies?.logger) {
      this.logger = dependencies.logger
    }

    // Set up performance monitoring if enabled
    const enhancedConfig = config as EnhancedStorageConfig
    if (
      enhancedConfig.monitoring?.enabled ||
      dependencies?.performanceMonitor
    ) {
      this.performanceMonitor =
        dependencies?.performanceMonitor ||
        new DefaultPerformanceMonitor(
          enhancedConfig.monitoring?.maxMetrics !== undefined
            ? { maxMetrics: enhancedConfig.monitoring.maxMetrics }
            : {}
        )
    }

    // Set up error recovery strategies if enabled
    if (enhancedConfig.errorRecovery?.enabled) {
      this.setupErrorRecoveryStrategies(enhancedConfig.errorRecovery.strategies)
    }

    // Pre-configured services can be injected directly
    if (dependencies?.encryptionService) {
      this.encryption = dependencies.encryptionService
    }
    if (dependencies?.compressionService) {
      this.compression = dependencies.compressionService
    }
    if (dependencies?.cacheLayer) {
      this.cache = dependencies.cacheLayer
    }
  }

  /**
   * Enhanced initialization with service providers
   *
   * @returns Promise that resolves when initialization completes
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      // Use service providers if available and services not pre-injected
      if (
        !this.encryption &&
        this.config.encryption?.enabled &&
        this.encryptionProvider
      ) {
        this.encryption = await this.encryptionProvider.create(
          this.config.encryption
        )
      } else if (!this.encryption && this.config.encryption?.enabled) {
        // Fall back to original initialization for backward compatibility
        const { EncryptionService } = await import(
          '../security/EncryptionService'
        )
        this.encryption = new EncryptionService(this.config.encryption)
        await this.encryption.deriveKey(
          this.config.encryption.passphrase || 'default-key'
        )
      }

      if (
        !this.compression &&
        this.config.compression?.enabled &&
        this.compressionProvider
      ) {
        this.compression = await this.compressionProvider.create(
          this.config.compression
        )
      } else if (!this.compression && this.config.compression?.enabled) {
        // Fall back to original initialization
        const { CompressionService } = await import(
          '../performance/CompressionService'
        )
        this.compression = new CompressionService(this.config.compression)
      }

      if (!this.cache && this.config.cache && this.cacheProvider) {
        this.cache = await this.cacheProvider.create(this.config.cache)
      } else if (!this.cache && this.config.cache) {
        // Fall back to original initialization
        const { CacheLayer } = await import('../performance/CacheLayer')
        this.cache = new CacheLayer(this.config.cache)
      }

      // Initialize the concrete adapter
      await this.initializeAdapter()
      this.initialized = true

      this.logger?.info('Storage adapter initialized successfully')
    } catch (error) {
      this.logger?.error('Failed to initialize storage adapter', error)
      throw error
    }
  }

  /**
   * Enhanced get with middleware and monitoring
   *
   * @param key - Storage key
   * @returns Promise that resolves to value or null
   */
  async get<T>(key: string): Promise<T | null> {
    const context: MiddlewareContext = {
      operation: 'get',
      args: [key],
      metadata: {},
      startTime: Date.now(),
    }

    return this.runWithMiddleware(context, async () => {
      return this.getWithMonitoring<T>(key, context)
    })
  }

  /**
   * Enhanced set with middleware and monitoring
   *
   * @param key - Storage key
   * @param value - Value to store
   * @returns Promise that resolves when complete
   */
  async set<T>(key: string, value: T): Promise<void> {
    const context: MiddlewareContext = {
      operation: 'set',
      args: [key, value],
      metadata: {},
      startTime: Date.now(),
    }

    return this.runWithMiddleware(context, async () => {
      return this.setWithMonitoring(key, value, context)
    })
  }

  /**
   * Add a middleware to the adapter
   *
   * @param middleware - Middleware to add
   * @returns This adapter for chaining
   */
  addMiddleware(middleware: AdapterMiddleware): this {
    this.middlewares.push(middleware)
    this.logger?.debug(`Added middleware: ${middleware.name}`)
    return this
  }

  /**
   * Remove a middleware by name
   *
   * @param name - Name of middleware to remove
   * @returns This adapter for chaining
   */
  removeMiddleware(name: string): this {
    const index = this.middlewares.findIndex((m) => m.name === name)
    if (index !== -1) {
      this.middlewares.splice(index, 1)
      this.logger?.debug(`Removed middleware: ${name}`)
    }
    return this
  }

  /**
   * Add an error recovery strategy
   *
   * @param strategy - Recovery strategy to add
   * @returns This adapter for chaining
   */
  addErrorStrategy(strategy: ErrorRecoveryStrategy): this {
    this.errorStrategies.push(strategy)
    this.logger?.debug(`Added error strategy: ${strategy.name}`)
    return this
  }

  /**
   * Get performance metrics summary
   *
   * @returns Performance summary or undefined if not monitored
   */
  getPerformanceSummary() {
    return this.performanceMonitor?.getSummary()
  }

  /**
   * Export performance metrics
   *
   * @returns Exported metrics string or empty string
   */
  exportMetrics(): string {
    return this.performanceMonitor?.export() || '{}'
  }

  // Private helper methods

  private async getWithMonitoring<T>(
    key: string,
    context: MiddlewareContext
  ): Promise<T | null> {
    const start = Date.now()
    let cacheHit = false
    let success = true
    let errorMessage: string | undefined

    try {
      // Check cache first
      if (this.cache) {
        const cached = this.cache.get(key)
        if (cached !== undefined) {
          cacheHit = true
          context.metadata.cacheHit = true
          // Don't record metrics here - it will be recorded in finally block
          return cached as T
        }
      }

      // Call parent implementation
      const result = await super.get<T>(key)

      // Update cache if result found
      if (result !== null && this.cache) {
        this.cache.set(key, result)
      }

      context.metadata.cacheHit = false

      // Record success with circuit breakers
      this.recordOperationSuccess()

      return result
    } catch (error) {
      success = false
      errorMessage = (error as Error).message

      // Try error recovery
      const recovered = await this.tryErrorRecovery(error as Error, {
        operation: 'get',
        key,
        timestamp: Date.now(),
      })

      if (recovered) {
        return this.getWithMonitoring<T>(key, context)
      }

      throw error
    } finally {
      // Record metrics
      this.recordMetrics('get', start, {
        cacheHit,
        success,
        key,
        error: errorMessage,
      })
    }
  }

  private async setWithMonitoring<T>(
    key: string,
    value: T,
    context: MiddlewareContext
  ): Promise<void> {
    const start = Date.now()
    let success = true
    let errorMessage: string | undefined
    const size = JSON.stringify(value).length

    try {
      // Call parent implementation
      await super.set(key, value)

      // Update cache if enabled
      if (this.cache) {
        this.cache.set(key, value)
      }

      // Record success with circuit breakers
      this.recordOperationSuccess()
    } catch (error) {
      success = false
      errorMessage = (error as Error).message

      // Try error recovery
      const recovered = await this.tryErrorRecovery(error as Error, {
        operation: 'set',
        key,
        timestamp: Date.now(),
      })

      if (recovered) {
        return this.setWithMonitoring(key, value, context)
      }

      throw error
    } finally {
      // Record metrics
      this.recordMetrics('set', start, {
        success,
        key,
        size,
        error: errorMessage,
      })
    }
  }

  private async runWithMiddleware<T>(
    context: MiddlewareContext,
    handler: () => Promise<T>
  ): Promise<T> {
    // Build middleware chain
    const chain = this.middlewares.reduceRight<() => Promise<T>>(
      (next, middleware) => () =>
        middleware.process(context, next) as Promise<T>,
      handler
    )

    return chain()
  }

  private setupErrorRecoveryStrategies(strategies?: string[]): void {
    const defaultStrategies = ['retry', 'circuit-breaker']
    const strategyNames = strategies || defaultStrategies

    const strategyInstances: ErrorRecoveryStrategy[] = []

    for (const name of strategyNames) {
      switch (name) {
        case 'retry':
          strategyInstances.push(new RetryStrategy())
          break
        case 'circuit-breaker':
          strategyInstances.push(new CircuitBreakerStrategy())
          break
      }
    }

    if (strategyInstances.length > 0) {
      this.errorStrategies.push(new CompositeStrategy(strategyInstances))
    }
  }

  private async tryErrorRecovery(
    error: Error,
    context: ErrorContext
  ): Promise<boolean> {
    for (const strategy of this.errorStrategies) {
      if (strategy.canRecover(error, context)) {
        try {
          await strategy.recover(error, context)
          this.logger?.info(`Error recovered using ${strategy.name} strategy`)
          return true
        } catch {
          // Recovery failed, try next strategy
        }
      }
    }

    return false
  }

  private recordOperationSuccess(): void {
    // Notify circuit breakers of successful operation
    for (const strategy of this.errorStrategies) {
      if (
        'recordSuccess' in strategy &&
        typeof strategy.recordSuccess === 'function'
      ) {
        ;(
          strategy as ErrorRecoveryStrategy & { recordSuccess?: () => void }
        ).recordSuccess?.()
      }
    }
  }

  private recordMetrics(
    operation: string,
    startTime: number,
    details: Record<string, unknown>
  ): void {
    if (!this.performanceMonitor) {
      return
    }

    this.performanceMonitor.record({
      operation,
      duration: Date.now() - startTime,
      ...details,
    })
  }

  /**
   * Clean up resources - override in concrete implementations
   *
   * @remarks
   * Concrete classes must call this in their close() implementation
   * to ensure proper cleanup of enhanced features.
   */
  protected async closeEnhanced(): Promise<void> {
    // Dispose performance monitor if it has a dispose method
    if (this.performanceMonitor && 'dispose' in this.performanceMonitor) {
      ;(
        this.performanceMonitor as PerformanceMonitor & { dispose?: () => void }
      ).dispose?.()
    }
  }
}
