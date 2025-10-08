/**
 * @fileoverview Enhanced error handling for storage operations
 *
 * @description
 * Implements error recovery strategies and circuit breaker patterns
 * for resilient storage operations. Provides context-aware error handling
 * and automatic recovery mechanisms.
 *
 * @example
 * ```typescript
 * const strategy = new RetryStrategy(3, 100)
 * if (strategy.canRecover(error, context)) {
 *   await strategy.recover(error, context)
 * }
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { StorageError, StorageErrorCode } from '../types/storage'

/**
 * Context information for storage errors
 *
 * @remarks
 * Provides detailed context about where and when an error occurred
 * to enable better error handling and recovery.
 *
 * @public
 */
export interface ErrorContext {
  /**
   * The operation that was being performed
   */
  operation: string

  /**
   * The storage key involved (if applicable)
   */
  key?: string

  /**
   * Additional metadata about the error
   */
  metadata?: Record<string, unknown>

  /**
   * Timestamp when the error occurred
   */
  timestamp: number

  /**
   * Number of retry attempts made
   */
  retryCount?: number

  /**
   * The adapter type where the error occurred
   */
  adapterType?: string
}

/**
 * Interface for error recovery strategies
 *
 * @remarks
 * Defines the contract for implementing various error recovery patterns.
 *
 * @public
 */
export interface ErrorRecoveryStrategy {
  /**
   * Determines if the error can be recovered from
   *
   * @param error - The error that occurred
   * @param context - Context about the error
   * @returns True if recovery is possible
   */
  canRecover(error: Error, context: ErrorContext): boolean

  /**
   * Attempts to recover from the error
   *
   * @param error - The error to recover from
   * @param context - Context about the error
   * @returns Promise that resolves when recovery is complete
   *
   * @throws {Error} If recovery fails
   */
  recover(error: Error, context: ErrorContext): Promise<void>

  /**
   * Gets the name of this strategy
   */
  readonly name: string
}

/**
 * Retry strategy with exponential backoff
 *
 * @remarks
 * Retries operations with exponential backoff for transient errors
 * like database locks or temporary network issues.
 *
 * @example
 * ```typescript
 * const strategy = new RetryStrategy(3, 100)
 * // Will retry up to 3 times with 100ms, 200ms, 400ms delays
 * ```
 *
 * @public
 */
export class RetryStrategy implements ErrorRecoveryStrategy {
  readonly name = 'retry'
  private attempts = new Map<string, number>()

  /**
   * Creates a retry strategy
   *
   * @param maxRetries - Maximum number of retry attempts
   * @param baseBackoffMs - Base backoff time in milliseconds
   * @param maxBackoffMs - Maximum backoff time in milliseconds
   */
  constructor(
    private maxRetries = 3,
    private baseBackoffMs = 100,
    private maxBackoffMs = 5000
  ) {}

  /**
   * Checks if the error is retryable
   *
   * @param error - The error to check
   * @param context - Error context
   * @returns True if the error can be retried
   */
  canRecover(error: Error, context: ErrorContext): boolean {
    const key = this.getContextKey(context)
    const attempts = this.attempts.get(key) || 0

    if (attempts >= this.maxRetries) {
      return false
    }

    // Retry on specific error conditions
    const retryableErrors = [
      'BUSY',
      'LOCKED',
      'EAGAIN',
      'ETIMEDOUT',
      'ECONNRESET',
      'ENOTFOUND',
    ]

    return retryableErrors.some(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Error code types vary by error source
      (code) => error.message.includes(code) || (error as any).code === code
    )
  }

  /**
   * Performs retry recovery with exponential backoff
   *
   * @param _error - The error to recover from
   * @param context - Error context
   */
  async recover(_error: Error, context: ErrorContext): Promise<void> {
    const key = this.getContextKey(context)
    const attempts = this.attempts.get(key) || 0

    this.attempts.set(key, attempts + 1)

    // Calculate backoff with exponential increase
    const backoff = Math.min(
      this.baseBackoffMs * Math.pow(2, attempts),
      this.maxBackoffMs
    )

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * backoff * 0.1
    const delay = backoff + jitter

    await new Promise((resolve) => setTimeout(resolve, delay))

    // Clean up old attempts after success
    if (attempts + 1 >= this.maxRetries) {
      this.attempts.delete(key)
    }
  }

  private getContextKey(context: ErrorContext): string {
    return `${context.operation}:${context.key || 'global'}`
  }

  /**
   * Resets retry counts for all operations
   */
  reset(): void {
    this.attempts.clear()
  }
}

/**
 * Circuit breaker pattern implementation
 *
 * @remarks
 * Prevents cascading failures by temporarily blocking operations
 * after a threshold of failures is reached.
 *
 * @example
 * ```typescript
 * const breaker = new CircuitBreakerStrategy(5, 60000)
 * // Opens after 5 failures, resets after 60 seconds
 * ```
 *
 * @public
 */
export class CircuitBreakerStrategy implements ErrorRecoveryStrategy {
  readonly name = 'circuit-breaker'
  private failures = 0
  private lastFailure = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  private successCount = 0

  /**
   * Creates a circuit breaker strategy
   *
   * @param threshold - Number of failures before opening
   * @param resetTimeMs - Time before attempting reset in milliseconds
   * @param halfOpenRequests - Requests allowed in half-open state
   */
  constructor(
    private readonly threshold = 5,
    private readonly resetTimeMs = 60000,
    private readonly halfOpenRequests = 3
  ) {}

  /**
   * Checks if the circuit breaker allows recovery
   *
   * @param _error - The error to check (unused - state-based decision)
   * @param _context - Error context (unused - state-based decision)
   * @returns True if recovery is allowed
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Parameters required by interface
  canRecover(_error: Error, _context: ErrorContext): boolean {
    const now = Date.now()

    // Check if we should transition to half-open
    if (this.state === 'open' && now - this.lastFailure > this.resetTimeMs) {
      this.state = 'half-open'
      this.successCount = 0
    }

    // Allow limited requests in half-open state
    if (this.state === 'half-open') {
      return this.successCount < this.halfOpenRequests
    }

    return this.state === 'closed'
  }

  /**
   * Handles circuit breaker state transitions
   *
   * @param _error - The error that occurred (unused - state-based decision)
   * @param _context - Error context (unused - state-based decision)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Parameters required by interface
  async recover(_error: Error, _context: ErrorContext): Promise<void> {
    this.recordFailure()

    if (this.failures >= this.threshold && this.state === 'closed') {
      this.state = 'open'
      throw new StorageError(
        `Circuit breaker open after ${this.failures} failures`,
        StorageErrorCode.CIRCUIT_BREAKER_OPEN
      )
    }

    if (this.state === 'half-open') {
      // Reset to open on failure in half-open state
      this.state = 'open'
      this.lastFailure = Date.now()
      throw new StorageError(
        'Circuit breaker re-opened due to failure in half-open state',
        StorageErrorCode.CIRCUIT_BREAKER_OPEN
      )
    }
  }

  /**
   * Records a successful operation
   */
  recordSuccess(): void {
    if (this.state === 'half-open') {
      this.successCount++
      if (this.successCount >= this.halfOpenRequests) {
        // Successfully completed requests in half-open, close the circuit
        this.state = 'closed'
        this.failures = 0
        this.successCount = 0
      }
    } else if (this.state === 'closed') {
      // Reset failure count on success
      this.failures = 0
    }
  }

  private recordFailure(): void {
    this.failures++
    this.lastFailure = Date.now()
  }

  /**
   * Gets the current state of the circuit breaker
   */
  getState(): 'closed' | 'open' | 'half-open' {
    // Check if circuit should transition to half-open
    const now = Date.now()
    if (this.state === 'open' && now - this.lastFailure > this.resetTimeMs) {
      this.state = 'half-open'
      this.successCount = 0
    }
    return this.state
  }

  /**
   * Manually resets the circuit breaker
   */
  reset(): void {
    this.state = 'closed'
    this.failures = 0
    this.successCount = 0
    this.lastFailure = 0
  }
}

/**
 * Fallback strategy for handling errors
 *
 * @remarks
 * Provides fallback values or alternative operations when
 * primary operations fail.
 *
 * @public
 */
export class FallbackStrategy implements ErrorRecoveryStrategy {
  readonly name = 'fallback'

  /**
   * Creates a fallback strategy
   *
   * @param fallbackValue - Value to return on error
   * @param errorTypes - Specific error types to handle
   */
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Fallback value can be any type
    private fallbackValue: any = null,
    private errorTypes: string[] = []
  ) {}

  /**
   * Checks if fallback can be used
   *
   * @param error - The error to check
   * @param _context - Error context (unused - error type is sufficient)
   * @returns True if fallback is applicable
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Parameter required by interface
  canRecover(error: Error, _context: ErrorContext): boolean {
    if (this.errorTypes.length === 0) {
      return true // Handle all errors if no types specified
    }

    return this.errorTypes.some(
      (type) => error.constructor.name === type || error.message.includes(type)
    )
  }

  /**
   * Returns the fallback value
   *
   * @param _error - The error that occurred (unused - fallback is always same)
   * @param _context - Error context (unused - fallback is always same)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Parameters required by interface
  async recover(_error: Error, _context: ErrorContext): Promise<void> {
    // In practice, the adapter would use the fallback value
    // This is handled at a higher level
    return Promise.resolve()
  }

  /**
   * Gets the fallback value
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Fallback value can be any type
  getFallbackValue(): any {
    return this.fallbackValue
  }
}

/**
 * Composite strategy that combines multiple strategies
 *
 * @remarks
 * Allows chaining multiple recovery strategies in order.
 *
 * @public
 */
export class CompositeStrategy implements ErrorRecoveryStrategy {
  readonly name = 'composite'

  /**
   * Creates a composite strategy
   *
   * @param strategies - Array of strategies to try in order
   */
  constructor(private strategies: ErrorRecoveryStrategy[]) {}

  /**
   * Checks if any strategy can recover
   *
   * @param error - The error to check
   * @param context - Error context
   * @returns True if any strategy can recover
   */
  canRecover(error: Error, context: ErrorContext): boolean {
    return this.strategies.some((strategy) =>
      strategy.canRecover(error, context)
    )
  }

  /**
   * Tries recovery with the first applicable strategy
   *
   * @param error - The error to recover from
   * @param context - Error context
   */
  async recover(error: Error, context: ErrorContext): Promise<void> {
    for (const strategy of this.strategies) {
      if (strategy.canRecover(error, context)) {
        return strategy.recover(error, context)
      }
    }

    throw new Error('No recovery strategy available')
  }

  /**
   * Adds a strategy to the composite
   *
   * @param strategy - Strategy to add
   */
  addStrategy(strategy: ErrorRecoveryStrategy): void {
    this.strategies.push(strategy)
  }
}
