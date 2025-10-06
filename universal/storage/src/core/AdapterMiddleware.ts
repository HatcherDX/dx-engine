/**
 * @fileoverview Middleware system for storage adapters
 *
 * @description
 * Implements a middleware pattern for adding cross-cutting concerns
 * to storage operations such as logging, validation, and monitoring.
 *
 * @example
 * ```typescript
 * const adapter = new StorageAdapter(config)
 *   .addMiddleware(new LoggingMiddleware())
 *   .addMiddleware(new ValidationMiddleware())
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { StorageError, StorageErrorCode } from '../types/storage'
import type { PerformanceMonitor } from './PerformanceMonitor'
import type { Logger } from './StorageAdapterFactory'

/**
 * Function type for proceeding to the next middleware
 *
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Middleware can return any storage operation result
export type MiddlewareNext = () => Promise<any>

/**
 * Context passed through middleware chain
 *
 * @public
 */
export interface MiddlewareContext {
  /**
   * The operation being performed
   */
  operation: string

  /**
   * Arguments passed to the operation
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Operation arguments vary by operation type
  args: any[]

  /**
   * Metadata about the operation
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Metadata values are dynamic and operation-specific
  metadata: Record<string, any>

  /**
   * Timestamp when operation started
   */
  startTime: number
}

/**
 * Interface for storage adapter middleware
 *
 * @remarks
 * Middleware can intercept and modify storage operations,
 * add logging, validation, or other cross-cutting concerns.
 *
 * @public
 */
export interface AdapterMiddleware {
  /**
   * Name of the middleware
   */
  name: string

  /**
   * Processes an operation through the middleware
   *
   * @param context - Context information about the operation
   * @param next - Function to call the next middleware
   * @returns Promise resolving to the operation result
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Returns any storage operation result
  process(context: MiddlewareContext, next: MiddlewareNext): Promise<any>
}

/**
 * Logging middleware for storage operations
 *
 * @remarks
 * Logs operation details, duration, and errors to the configured logger.
 *
 * @example
 * ```typescript
 * const middleware = new LoggingMiddleware(logger, {
 *   logLevel: 'debug',
 *   includeArgs: true
 * })
 * ```
 *
 * @public
 */
export class LoggingMiddleware implements AdapterMiddleware {
  readonly name = 'logging'

  /**
   * Creates logging middleware
   *
   * @param logger - Logger instance
   * @param options - Configuration options
   */
  constructor(
    private logger: Logger,
    private options: {
      logLevel?: 'debug' | 'info' | 'warn' | 'error'
      includeArgs?: boolean
      includeResult?: boolean
      maxArgLength?: number
    } = {}
  ) {
    this.options = {
      logLevel: 'info',
      includeArgs: true,
      includeResult: false,
      maxArgLength: 100,
      ...options,
    }
  }

  /**
   * Processes operation with logging
   *
   * @param context - Operation context
   * @param next - Next middleware function
   * @returns Operation result
   */
  async process(
    context: MiddlewareContext,
    next: MiddlewareNext
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Returns any storage operation result
  ): Promise<any> {
    const { operation, args } = context
    const logLevel = this.options.logLevel || 'info'

    // Log operation start
    const startMessage = this.formatStartMessage(operation, args)
    this.logger[logLevel](startMessage)

    const start = Date.now()

    try {
      const result = await next()
      const duration = Date.now() - start

      // Log operation success
      const successMessage = this.formatSuccessMessage(
        operation,
        duration,
        result
      )
      this.logger[logLevel](successMessage)

      return result
    } catch (error) {
      const duration = Date.now() - start

      // Log operation failure
      const errorMessage = this.formatErrorMessage(operation, duration, error)
      this.logger.error(errorMessage, error)

      throw error
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Operation arguments vary by operation type
  private formatStartMessage(operation: string, args: any[]): string {
    let message = `[Storage] ${operation} started`

    if (this.options.includeArgs && args.length > 0) {
      const formattedArgs = this.formatArgs(args)
      message += ` with args: ${formattedArgs}`
    }

    return message
  }

  private formatSuccessMessage(
    operation: string,
    duration: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Formatting requires handling any value type
    result: any
  ): string {
    let message = `[Storage] ${operation} completed in ${duration}ms`

    if (this.options.includeResult && result !== undefined) {
      const formattedResult = this.formatValue(result)
      message += ` with result: ${formattedResult}`
    }

    return message
  }

  private formatErrorMessage(
    operation: string,
    duration: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Error type varies based on operation context
    error: any
  ): string {
    return `[Storage] ${operation} failed after ${duration}ms: ${error.message || error}`
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Operation arguments vary by operation type
  private formatArgs(args: any[]): string {
    return args.map((arg) => this.formatValue(arg)).join(', ')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Formatting requires handling any value type
  private formatValue(value: any): string {
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'

    const type = typeof value

    if (type === 'string') {
      const maxLength = this.options.maxArgLength || 100
      return value.length > maxLength
        ? `"${value.substring(0, maxLength)}..."`
        : `"${value}"`
    }

    if (type === 'number' || type === 'boolean') {
      return String(value)
    }

    if (Array.isArray(value)) {
      return `Array(${value.length})`
    }

    if (type === 'object') {
      const keys = Object.keys(value)
      return `Object(${keys.length} keys)`
    }

    return type
  }
}

/**
 * Validation middleware for storage operations
 *
 * @remarks
 * Validates input parameters and data before operations.
 *
 * @example
 * ```typescript
 * const middleware = new ValidationMiddleware({
 *   maxKeyLength: 250,
 *   maxValueSize: 10485760 // 10MB
 * })
 * ```
 *
 * @public
 */
export class ValidationMiddleware implements AdapterMiddleware {
  readonly name = 'validation'

  /**
   * Creates validation middleware
   *
   * @param options - Validation options
   */
  constructor(
    private options: {
      maxKeyLength?: number
      minKeyLength?: number
      maxValueSize?: number
      allowedKeyPattern?: RegExp
      forbiddenKeys?: string[]
      validateTypes?: boolean
    } = {}
  ) {
    this.options = {
      maxKeyLength: 250,
      minKeyLength: 1,
      maxValueSize: 10485760, // 10MB
      allowedKeyPattern: /^[\w\-.:]+$/,
      forbiddenKeys: [],
      validateTypes: true,
      ...options,
    }
  }

  /**
   * Processes operation with validation
   *
   * @param context - Operation context
   * @param next - Next middleware function
   * @returns Operation result
   *
   * @throws {StorageError} If validation fails
   */
  async process(
    context: MiddlewareContext,
    next: MiddlewareNext
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Returns any storage operation result
  ): Promise<any> {
    const { operation, args } = context

    // Validate based on operation
    switch (operation) {
      case 'get':
      case 'delete':
      case 'has':
        this.validateKey(args[0])
        break

      case 'set':
        this.validateKey(args[0])
        this.validateValue(args[1])
        break

      case 'getMany':
        this.validateKeys(args[0])
        break

      case 'setMany':
        this.validateBatch(args[0])
        break

      case 'list':
      case 'count':
        if (args[0]) {
          this.validatePrefix(args[0])
        }
        break
    }

    return next()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Parameter validation requires accepting any type to check runtime type
  private validateKey(key: any): void {
    if (typeof key !== 'string') {
      throw new StorageError(
        `Key must be a string, got ${typeof key}`,
        StorageErrorCode.VALIDATION_ERROR
      )
    }

    const {
      minKeyLength = 1,
      maxKeyLength = 250,
      allowedKeyPattern,
      forbiddenKeys = [],
    } = this.options

    if (key.length < minKeyLength) {
      throw new StorageError(
        `Key length must be at least ${minKeyLength} characters`,
        StorageErrorCode.VALIDATION_ERROR
      )
    }

    if (key.length > maxKeyLength) {
      throw new StorageError(
        `Key length cannot exceed ${maxKeyLength} characters`,
        StorageErrorCode.VALIDATION_ERROR
      )
    }

    if (allowedKeyPattern && !allowedKeyPattern.test(key)) {
      throw new StorageError(
        `Key contains invalid characters`,
        StorageErrorCode.VALIDATION_ERROR
      )
    }

    if (forbiddenKeys.includes(key)) {
      throw new StorageError(
        `Key "${key}" is forbidden`,
        StorageErrorCode.VALIDATION_ERROR
      )
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Parameter validation requires accepting any type to check runtime type
  private validateKeys(keys: any): void {
    if (!Array.isArray(keys)) {
      throw new StorageError(
        'Keys must be an array',
        StorageErrorCode.VALIDATION_ERROR
      )
    }

    for (const key of keys) {
      this.validateKey(key)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Parameter validation requires accepting any type to check runtime type
  private validatePrefix(prefix: any): void {
    if (typeof prefix !== 'string') {
      throw new StorageError(
        'Prefix must be a string',
        StorageErrorCode.VALIDATION_ERROR
      )
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Parameter validation requires accepting any type to check runtime type
  private validateValue(value: any): void {
    if (value === undefined) {
      throw new StorageError(
        'Cannot store undefined value',
        StorageErrorCode.VALIDATION_ERROR
      )
    }

    if (this.options.validateTypes) {
      // Check for non-serializable types
      if (typeof value === 'function') {
        throw new StorageError(
          'Cannot store functions',
          StorageErrorCode.VALIDATION_ERROR
        )
      }

      if (typeof value === 'symbol') {
        throw new StorageError(
          'Cannot store symbols',
          StorageErrorCode.VALIDATION_ERROR
        )
      }
    }

    // Check size
    if (this.options.maxValueSize) {
      const size = this.getValueSize(value)
      if (size > this.options.maxValueSize) {
        throw new StorageError(
          `Value size (${size} bytes) exceeds maximum (${this.options.maxValueSize} bytes)`,
          StorageErrorCode.VALIDATION_ERROR
        )
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Parameter validation requires accepting any type to check runtime type
  private validateBatch(batch: any): void {
    if (!(batch instanceof Map)) {
      throw new StorageError(
        'Batch must be a Map',
        StorageErrorCode.VALIDATION_ERROR
      )
    }

    for (const [key, value] of batch) {
      this.validateKey(key)
      this.validateValue(value)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Formatting requires handling any value type
  private getValueSize(value: any): number {
    const json = JSON.stringify(value)
    return new Blob([json]).size
  }
}

/**
 * Metrics collection middleware
 *
 * @remarks
 * Collects performance metrics for all storage operations.
 *
 * @example
 * ```typescript
 * const middleware = new MetricsMiddleware(monitor, {
 *   includeKeys: false
 * })
 * ```
 *
 * @public
 */
export class MetricsMiddleware implements AdapterMiddleware {
  readonly name = 'metrics'

  /**
   * Creates metrics middleware
   *
   * @param monitor - Performance monitor instance
   * @param options - Configuration options
   */
  constructor(
    private monitor: PerformanceMonitor,
    private options: {
      includeKeys?: boolean
      includeSize?: boolean
      includeMetadata?: boolean
    } = {}
  ) {}

  /**
   * Processes operation with metrics collection
   *
   * @param context - Operation context
   * @param next - Next middleware function
   * @returns Operation result
   */
  async process(
    context: MiddlewareContext,
    next: MiddlewareNext
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Returns any storage operation result
  ): Promise<any> {
    const { operation, args } = context
    const start = Date.now()
    let error: string | undefined

    try {
      const result = await next()
      this.recordMetrics(operation, args, result, Date.now() - start, true)
      return result
    } catch (err) {
      error = (err as Error).message
      this.recordMetrics(
        operation,
        args,
        undefined,
        Date.now() - start,
        false,
        error
      )
      throw err
    }
  }

  private recordMetrics(
    operation: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Operation arguments vary by operation type
    args: any[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Formatting requires handling any value type
    result: any,
    duration: number,
    success: boolean,
    error?: string
  ): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Metrics properties vary by operation and configuration
    const metrics: any = {
      operation,
      duration,
      success,
      error,
    }

    // Add operation-specific metrics
    if (this.options.includeKeys) {
      if (
        operation === 'get' ||
        operation === 'set' ||
        operation === 'delete'
      ) {
        metrics.key = args[0]
      }
    }

    if (this.options.includeSize) {
      if (operation === 'set' && args[1]) {
        metrics.size = JSON.stringify(args[1]).length
      }
      if (operation === 'get' && result) {
        metrics.size = JSON.stringify(result).length
      }
    }

    // Check cache hit for get operations
    // Note: context metadata would be passed from the adapter
    if (operation === 'get') {
      // Cache hit information would be in result or args metadata
      metrics.cacheHit = false // Default, would be updated by adapter
    }

    this.monitor.record(metrics)
  }
}

/**
 * Rate limiting middleware
 *
 * @remarks
 * Implements rate limiting for storage operations to prevent abuse.
 *
 * @example
 * ```typescript
 * const middleware = new RateLimitMiddleware({
 *   maxRequestsPerSecond: 100,
 *   maxBurst: 10
 * })
 * ```
 *
 * @public
 */
export class RateLimitMiddleware implements AdapterMiddleware {
  readonly name = 'rate-limit'
  private tokens: number
  private lastRefill: number

  /**
   * Creates rate limiting middleware
   *
   * @param options - Rate limit configuration
   */
  constructor(
    private options: {
      maxRequestsPerSecond: number
      maxBurst?: number
      exemptOperations?: string[]
    } = {
      maxRequestsPerSecond: 100,
    }
  ) {
    this.options.maxBurst = options.maxBurst || options.maxRequestsPerSecond
    this.tokens = this.options.maxBurst
    this.lastRefill = Date.now()
  }

  /**
   * Processes operation with rate limiting
   *
   * @param context - Operation context
   * @param next - Next middleware function
   * @returns Operation result
   *
   * @throws {StorageError} If rate limit exceeded
   */
  async process(
    context: MiddlewareContext,
    next: MiddlewareNext
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Returns any storage operation result
  ): Promise<any> {
    const { operation } = context

    // Check if operation is exempt
    if (this.options.exemptOperations?.includes(operation)) {
      return next()
    }

    // Refill tokens based on time passed
    this.refillTokens()

    // Check if we have tokens available
    if (this.tokens < 1) {
      throw new StorageError(
        'Rate limit exceeded, please try again later',
        StorageErrorCode.RATE_LIMIT_EXCEEDED
      )
    }

    // Consume a token
    this.tokens--

    return next()
  }

  private refillTokens(): void {
    const now = Date.now()
    const timePassed = (now - this.lastRefill) / 1000 // seconds
    const tokensToAdd = timePassed * this.options.maxRequestsPerSecond

    this.tokens = Math.min(this.options.maxBurst!, this.tokens + tokensToAdd)

    this.lastRefill = now
  }
}

/**
 * Retry middleware for failed operations
 *
 * @remarks
 * Automatically retries failed operations with configurable backoff.
 *
 * @example
 * ```typescript
 * const middleware = new RetryMiddleware({
 *   maxAttempts: 3,
 *   backoffMs: 100
 * })
 * ```
 *
 * @public
 */
export class RetryMiddleware implements AdapterMiddleware {
  readonly name = 'retry'

  /**
   * Creates retry middleware
   *
   * @param options - Retry configuration
   */
  constructor(
    private options: {
      maxAttempts?: number
      backoffMs?: number
      exponential?: boolean
      retryableErrors?: string[]
    } = {}
  ) {
    this.options = {
      maxAttempts: 3,
      backoffMs: 100,
      exponential: true,
      retryableErrors: ['BUSY', 'LOCKED', 'ETIMEDOUT'],
      ...options,
    }
  }

  /**
   * Processes operation with retry logic
   *
   * @param _context - Operation context
   * @param next - Next middleware function
   * @returns Operation result
   */
  async process(
    _context: MiddlewareContext,
    next: MiddlewareNext
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Returns any storage operation result
  ): Promise<any> {
    let lastError: Error | undefined
    const maxAttempts = this.options.maxAttempts || 3

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await next()
      } catch (error) {
        lastError = error as Error

        // Check if error is retryable
        if (!this.isRetryable(lastError)) {
          throw lastError
        }

        // Don't retry on last attempt
        if (attempt === maxAttempts) {
          break
        }

        // Calculate backoff
        const backoff = this.calculateBackoff(attempt)
        await new Promise((resolve) => setTimeout(resolve, backoff))
      }
    }

    // All attempts failed
    throw lastError
  }

  private isRetryable(error: Error): boolean {
    const retryableErrors = this.options.retryableErrors || []
    return retryableErrors.some(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing optional code property for retryable error detection
      (code) => error.message.includes(code) || (error as any).code === code
    )
  }

  private calculateBackoff(attempt: number): number {
    const base = this.options.backoffMs || 100

    if (this.options.exponential) {
      return base * Math.pow(2, attempt - 1)
    }

    return base
  }
}
