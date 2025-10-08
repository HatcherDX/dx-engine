# StorageAdapter Refactoring Guide for Enhanced Robustness and Testability

## Executive Summary

Based on analysis using context7 design patterns (Adapter, Strategy, Dependency Injection), this guide proposes improvements to make StorageAdapter.ts more robust and testable without breaking existing functionality.

## Current Architecture Analysis

### Strengths

1. **Good separation of concerns** - Abstract base class with clear responsibilities
2. **Feature composition** - Encryption, compression, and caching as optional services
3. **Template Method pattern** - Base class defines algorithm, subclasses implement specifics
4. **95.91% test coverage** - Already well-tested

### Areas for Improvement

1. **Tight coupling** - Services are instantiated directly in the adapter
2. **Limited testability** - Hard to mock internal services
3. **Error handling** - Could be more granular
4. **Dependency management** - No dependency injection pattern
5. **State management** - Complex internal state tracking

## Proposed Improvements (Non-Breaking)

### 1. Strategy Pattern for Service Providers

**Current Issue:** Services are created internally, making them hard to mock or replace.

**Solution:** Introduce service provider interfaces using Strategy pattern:

```typescript
// New file: src/core/ServiceProviders.ts
export interface ServiceProvider<T> {
  create(config: any): Promise<T>
  readonly type: string
}

export class EncryptionServiceProvider
  implements ServiceProvider<IEncryptionService>
{
  readonly type = 'encryption'

  async create(config: EncryptionConfig): Promise<IEncryptionService> {
    const { EncryptionService } = await import('../security/EncryptionService')
    const service = new EncryptionService(config)
    await service.deriveKey(config.passphrase || 'default-key')
    return service
  }
}

export class CompressionServiceProvider
  implements ServiceProvider<CompressionService>
{
  readonly type = 'compression'

  async create(config: CompressionConfig): Promise<CompressionService> {
    const { CompressionService } = await import(
      '../performance/CompressionService'
    )
    return new CompressionService(config)
  }
}

export class CacheServiceProvider implements ServiceProvider<CacheLayer> {
  readonly type = 'cache'

  async create(config: CacheConfig): Promise<CacheLayer> {
    const { CacheLayer } = await import('../performance/CacheLayer')
    return new CacheLayer(config)
  }
}
```

**Integration in BaseStorageAdapter:**

```typescript
export abstract class BaseStorageAdapter implements IStorageAdapter {
  // Add optional service providers
  protected encryptionProvider?: ServiceProvider<IEncryptionService>
  protected compressionProvider?: ServiceProvider<CompressionService>
  protected cacheProvider?: ServiceProvider<CacheLayer>

  constructor(
    config: StorageConfig,
    options?: {
      encryptionProvider?: ServiceProvider<IEncryptionService>
      compressionProvider?: ServiceProvider<CompressionService>
      cacheProvider?: ServiceProvider<CacheLayer>
    }
  ) {
    this.config = config
    // Use provided services or defaults
    this.encryptionProvider =
      options?.encryptionProvider || new EncryptionServiceProvider()
    this.compressionProvider =
      options?.compressionProvider || new CompressionServiceProvider()
    this.cacheProvider = options?.cacheProvider || new CacheServiceProvider()
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    // Use providers instead of direct instantiation
    if (this.config.encryption?.enabled && this.encryptionProvider) {
      this.encryption = await this.encryptionProvider.create(
        this.config.encryption
      )
    }

    if (this.config.compression?.enabled && this.compressionProvider) {
      this.compression = await this.compressionProvider.create(
        this.config.compression
      )
    }

    if (this.config.cache && this.cacheProvider) {
      this.cache = await this.cacheProvider.create(this.config.cache)
    }

    await this.initializeAdapter()
    this.initialized = true
  }
}
```

### 2. Dependency Injection Pattern

**Create a factory with dependency injection:**

```typescript
// New file: src/core/StorageAdapterFactory.ts
export interface StorageAdapterDependencies {
  encryptionService?: IEncryptionService
  compressionService?: CompressionService
  cacheLayer?: CacheLayer
  logger?: Logger
  metrics?: MetricsCollector
}

export class StorageAdapterFactory {
  private dependencies: StorageAdapterDependencies = {}

  withEncryption(service: IEncryptionService): this {
    this.dependencies.encryptionService = service
    return this
  }

  withCompression(service: CompressionService): this {
    this.dependencies.compressionService = service
    return this
  }

  withCache(cache: CacheLayer): this {
    this.dependencies.cacheLayer = cache
    return this
  }

  withLogger(logger: Logger): this {
    this.dependencies.logger = logger
    return this
  }

  create<T extends BaseStorageAdapter>(
    AdapterClass: new (
      config: StorageConfig,
      deps?: StorageAdapterDependencies
    ) => T,
    config: StorageConfig
  ): T {
    return new AdapterClass(config, this.dependencies)
  }
}

// Usage example:
const factory = new StorageAdapterFactory()
  .withLogger(customLogger)
  .withCache(customCache)

const adapter = factory.create(SQLiteAdapter, config)
```

### 3. Error Handling Enhancement

**Introduce error context and recovery strategies:**

```typescript
// New file: src/core/ErrorHandling.ts
export interface ErrorContext {
  operation: string
  key?: string
  metadata?: Record<string, unknown>
  timestamp: number
}

export interface ErrorRecoveryStrategy {
  canRecover(error: Error, context: ErrorContext): boolean
  recover(error: Error, context: ErrorContext): Promise<void>
}

export class RetryStrategy implements ErrorRecoveryStrategy {
  constructor(
    private maxRetries = 3,
    private backoffMs = 100
  ) {}

  canRecover(error: Error): boolean {
    return error.message.includes('BUSY') || error.message.includes('LOCKED')
  }

  async recover(error: Error, context: ErrorContext): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, this.backoffMs))
  }
}

export class CircuitBreakerStrategy implements ErrorRecoveryStrategy {
  private failures = 0
  private lastFailure = 0
  private readonly threshold = 5
  private readonly resetTime = 60000

  canRecover(): boolean {
    const now = Date.now()
    if (now - this.lastFailure > this.resetTime) {
      this.failures = 0
    }
    return this.failures < this.threshold
  }

  async recover(error: Error): Promise<void> {
    this.failures++
    this.lastFailure = Date.now()
    if (this.failures >= this.threshold) {
      throw new StorageError(
        StorageErrorCode.CIRCUIT_BREAKER_OPEN,
        'Too many failures, circuit breaker is open'
      )
    }
  }
}
```

### 4. Enhanced Testability Features

**Add test helpers and mock implementations:**

```typescript
// New file: src/core/TestHelpers.ts
export class MockServiceProvider<T> implements ServiceProvider<T> {
  constructor(
    public readonly type: string,
    private mockService: T
  ) {}

  async create(): Promise<T> {
    return this.mockService
  }
}

export class StorageAdapterTestBuilder {
  private config: Partial<StorageConfig> = {}
  private mockServices: Map<string, any> = new Map()

  withMockEncryption(mock: Partial<IEncryptionService>): this {
    this.mockServices.set('encryption', mock)
    return this
  }

  withMockCompression(mock: Partial<CompressionService>): this {
    this.mockServices.set('compression', mock)
    return this
  }

  withMockCache(mock: Partial<CacheLayer>): this {
    this.mockServices.set('cache', mock)
    return this
  }

  build<T extends BaseStorageAdapter>(
    AdapterClass: new (config: StorageConfig, options?: any) => T
  ): T {
    const options = {
      encryptionProvider: this.mockServices.has('encryption')
        ? new MockServiceProvider(
            'encryption',
            this.mockServices.get('encryption')
          )
        : undefined,
      compressionProvider: this.mockServices.has('compression')
        ? new MockServiceProvider(
            'compression',
            this.mockServices.get('compression')
          )
        : undefined,
      cacheProvider: this.mockServices.has('cache')
        ? new MockServiceProvider('cache', this.mockServices.get('cache'))
        : undefined,
    }

    return new AdapterClass(this.config as StorageConfig, options)
  }
}

// Usage in tests:
const adapter = new StorageAdapterTestBuilder()
  .withMockEncryption({
    encrypt: vi.fn().mockResolvedValue({ data: 'encrypted' }),
  })
  .withMockCache({
    get: vi.fn().mockReturnValue('cached-value'),
  })
  .build(TestStorageAdapter)
```

### 5. Performance Monitoring

**Add observability without breaking changes:**

```typescript
// New file: src/core/PerformanceMonitor.ts
export interface PerformanceMetrics {
  operation: string
  duration: number
  size?: number
  cacheHit?: boolean
  compressed?: boolean
  encrypted?: boolean
}

export interface PerformanceMonitor {
  record(metrics: PerformanceMetrics): void
  getMetrics(): PerformanceMetrics[]
}

export class DefaultPerformanceMonitor implements PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []

  record(metric: PerformanceMetrics): void {
    this.metrics.push(metric)
    this.cleanup()
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics]
  }

  private cleanup(): void {
    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }
  }
}

// Integration in BaseStorageAdapter:
export abstract class BaseStorageAdapter {
  protected performanceMonitor?: PerformanceMonitor

  async get<T>(key: string): Promise<T | null> {
    const start = Date.now()
    let cacheHit = false

    try {
      // Check cache first
      if (this.cache) {
        const cached = this.cache.get(key)
        if (cached !== undefined) {
          cacheHit = true
          return cached as T
        }
      }

      // ... rest of get implementation
    } finally {
      this.performanceMonitor?.record({
        operation: 'get',
        duration: Date.now() - start,
        cacheHit,
        key,
      })
    }
  }
}
```

### 6. Adapter Middleware Pattern

**Add pre/post processing hooks:**

```typescript
// New file: src/core/AdapterMiddleware.ts
export type MiddlewareNext = () => Promise<any>

export interface AdapterMiddleware {
  name: string
  process(operation: string, args: any[], next: MiddlewareNext): Promise<any>
}

export class LoggingMiddleware implements AdapterMiddleware {
  name = 'logging'

  async process(
    operation: string,
    args: any[],
    next: MiddlewareNext
  ): Promise<any> {
    console.log(`[Storage] ${operation} started`, args[0])
    const start = Date.now()

    try {
      const result = await next()
      console.log(`[Storage] ${operation} completed in ${Date.now() - start}ms`)
      return result
    } catch (error) {
      console.error(`[Storage] ${operation} failed`, error)
      throw error
    }
  }
}

export class ValidationMiddleware implements AdapterMiddleware {
  name = 'validation'

  async process(
    operation: string,
    args: any[],
    next: MiddlewareNext
  ): Promise<any> {
    // Validate based on operation
    if (operation === 'set' && args[1] === undefined) {
      throw new StorageError(
        StorageErrorCode.VALIDATION_ERROR,
        'Cannot set undefined value'
      )
    }

    return next()
  }
}

// Integration:
export abstract class BaseStorageAdapter {
  private middlewares: AdapterMiddleware[] = []

  addMiddleware(middleware: AdapterMiddleware): this {
    this.middlewares.push(middleware)
    return this
  }

  private async runWithMiddleware(
    operation: string,
    args: any[],
    handler: () => Promise<any>
  ): Promise<any> {
    const chain = this.middlewares.reduceRight(
      (next, middleware) => () => middleware.process(operation, args, next),
      handler
    )

    return chain()
  }

  async get<T>(key: string): Promise<T | null> {
    return this.runWithMiddleware('get', [key], async () => {
      // Original get implementation
    })
  }
}
```

## Migration Path (Non-Breaking)

### Phase 1: Add New Features (No Breaking Changes)

1. Add service provider interfaces
2. Add factory pattern implementation
3. Add middleware support
4. Add performance monitoring
5. Maintain backward compatibility

### Phase 2: Gradual Adoption

1. Update tests to use new patterns
2. Document new patterns
3. Deprecate direct instantiation (but keep working)
4. Provide migration examples

### Phase 3: Future Major Version

1. Remove deprecated patterns
2. Make service providers required
3. Enforce dependency injection

## Testing Improvements

### Better Mock Support

```typescript
describe('StorageAdapter with mocks', () => {
  it('should test encryption separately', async () => {
    const mockEncryption = {
      encrypt: vi.fn().mockResolvedValue({ data: 'encrypted', iv: 'iv' }),
    }

    const adapter = new StorageAdapterTestBuilder()
      .withMockEncryption(mockEncryption)
      .build(TestStorageAdapter)

    await adapter.initialize()
    await adapter.set('key', 'value')

    expect(mockEncryption.encrypt).toHaveBeenCalledWith('{"key":"value"}')
  })
})
```

### Integration Testing

```typescript
describe('StorageAdapter integration', () => {
  it('should work with real services', async () => {
    const factory = new StorageAdapterFactory()
      .withLogger(new ConsoleLogger())
      .withMetrics(new PrometheusCollector())

    const adapter = factory.create(SQLiteAdapter, {
      type: 'sqlite',
      path: ':memory:',
      encryption: { enabled: true },
      compression: { enabled: true },
    })

    await adapter.initialize()
    // Test with real services
  })
})
```

## Benefits of This Approach

1. **No Breaking Changes** - All improvements are additive
2. **Better Testability** - Easy to mock and test individual components
3. **Flexibility** - Can swap implementations at runtime
4. **Observability** - Built-in monitoring and logging
5. **Error Resilience** - Better error handling and recovery
6. **Maintainability** - Clear separation of concerns

## Conclusion

These improvements follow SOLID principles and established design patterns to enhance the StorageAdapter without breaking existing functionality. The phased approach allows gradual adoption while maintaining backward compatibility.
