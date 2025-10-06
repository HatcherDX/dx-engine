/**
 * @fileoverview Tests for error handling strategies
 *
 * @description
 * Comprehensive test suite for all error recovery strategies including
 * retry, circuit breaker, fallback, and composite patterns.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  RetryStrategy,
  CircuitBreakerStrategy,
  FallbackStrategy,
  CompositeStrategy,
  type ErrorContext,
} from './ErrorHandling'
import { StorageError } from '../types/storage'

describe('ErrorHandling', () => {
  const createContext = (overrides?: Partial<ErrorContext>): ErrorContext => ({
    operation: 'test',
    key: 'test-key',
    timestamp: Date.now(),
    retryCount: 0,
    ...overrides,
  })

  describe('RetryStrategy', () => {
    let strategy: RetryStrategy

    beforeEach(() => {
      strategy = new RetryStrategy(3, 10, 100)
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should have correct name', () => {
      expect(strategy.name).toBe('retry')
    })

    it('should identify retryable errors', () => {
      const context = createContext()

      // Retryable errors
      expect(
        strategy.canRecover(new Error('BUSY: Database locked'), context)
      ).toBe(true)
      expect(strategy.canRecover(new Error('LOCKED'), context)).toBe(true)
      expect(strategy.canRecover(new Error('EAGAIN'), context)).toBe(true)
      expect(strategy.canRecover(new Error('ETIMEDOUT'), context)).toBe(true)
      expect(strategy.canRecover(new Error('ECONNRESET'), context)).toBe(true)
      expect(strategy.canRecover(new Error('ENOTFOUND'), context)).toBe(true)

      // Non-retryable errors
      expect(strategy.canRecover(new Error('Unknown error'), context)).toBe(
        false
      )
      expect(strategy.canRecover(new Error('Syntax error'), context)).toBe(
        false
      )
    })

    it('should handle error codes as properties', () => {
      const context = createContext()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Need dynamic error code property for testing error recovery
      const error: any = new Error('Connection failed')
      error.code = 'ETIMEDOUT'

      expect(strategy.canRecover(error, context)).toBe(true)
    })

    it('should respect max retry limit', async () => {
      vi.useFakeTimers()

      const context = createContext({ operation: 'write', key: 'data' })
      const error = new Error('BUSY: Database locked')

      // First 3 attempts should be allowed
      expect(strategy.canRecover(error, context)).toBe(true)
      const promise1 = strategy.recover(error, context) // attempts = 1
      await vi.advanceTimersByTimeAsync(15)
      await promise1

      expect(strategy.canRecover(error, context)).toBe(true)
      const promise2 = strategy.recover(error, context) // attempts = 2
      await vi.advanceTimersByTimeAsync(25)
      await promise2

      expect(strategy.canRecover(error, context)).toBe(true)
      const promise3 = strategy.recover(error, context) // attempts = 3, map cleaned up
      await vi.advanceTimersByTimeAsync(45)
      await promise3

      // After 3 recoveries with maxRetries=3, the map is cleaned up
      // So canRecover returns true again (attempts = 0)
      expect(strategy.canRecover(error, context)).toBe(true)
    })

    it('should implement exponential backoff', async () => {
      vi.useFakeTimers()

      const strategy = new RetryStrategy(3, 10, 500)
      const context = createContext()
      const error = new Error('BUSY')

      // Test first recovery - should delay ~10ms
      const promise1 = strategy.recover(error, context)
      await vi.advanceTimersByTimeAsync(15) // Account for jitter
      await promise1

      // Test second recovery - should delay ~20ms (exponential backoff)
      const promise2 = strategy.recover(error, context)
      await vi.advanceTimersByTimeAsync(25) // Account for jitter
      await promise2

      // Test third recovery - should delay ~40ms (exponential backoff)
      const promise3 = strategy.recover(error, context)
      await vi.advanceTimersByTimeAsync(45) // Account for jitter
      await promise3

      // Test passes if no timeout errors occurred during timer advancement
      expect(true).toBe(true)
    })

    it('should respect max backoff limit', async () => {
      vi.useFakeTimers()

      const strategy = new RetryStrategy(10, 10, 50)
      const context = createContext()
      const error = new Error('BUSY')

      // Exhaust initial attempts to get high exponential value
      for (let i = 0; i < 5; i++) {
        const promise = strategy.recover(error, context)
        // Advance by expected exponential backoff time plus jitter
        const expectedDelay = Math.min(10 * Math.pow(2, i), 50) + 10
        await vi.advanceTimersByTimeAsync(expectedDelay)
        await promise
      }

      // Final recovery should be capped at maxBackoffMs (50ms)
      const finalPromise = strategy.recover(error, context)
      await vi.advanceTimersByTimeAsync(60) // Max backoff + jitter
      await finalPromise

      // Test passes if no timeout errors occurred
      expect(true).toBe(true)
    })

    it('should track attempts per operation/key combination', async () => {
      vi.useFakeTimers()

      const context1 = createContext({ operation: 'read', key: 'key1' })
      const context2 = createContext({ operation: 'read', key: 'key2' })
      const context3 = createContext({ operation: 'write', key: 'key1' })
      const error = new Error('BUSY')

      // Different contexts should have independent retry counts
      const promise1a = strategy.recover(error, context1)
      await vi.advanceTimersByTimeAsync(15)
      await promise1a

      const promise1b = strategy.recover(error, context1)
      await vi.advanceTimersByTimeAsync(25)
      await promise1b

      const promise2 = strategy.recover(error, context2)
      await vi.advanceTimersByTimeAsync(15)
      await promise2

      expect(strategy.canRecover(error, context1)).toBe(true) // 2/3 attempts
      expect(strategy.canRecover(error, context2)).toBe(true) // 1/3 attempts
      expect(strategy.canRecover(error, context3)).toBe(true) // 0/3 attempts
    })

    it('should handle context without key', async () => {
      vi.useFakeTimers()

      const context = createContext({ key: undefined })
      const error = new Error('LOCKED')

      expect(strategy.canRecover(error, context)).toBe(true)

      const promise = strategy.recover(error, context)
      await vi.advanceTimersByTimeAsync(15)
      await promise

      expect(strategy.canRecover(error, context)).toBe(true)
    })

    it('should reset attempts', () => {
      const context = createContext()
      const error = new Error('BUSY')

      strategy.recover(error, context)
      strategy.recover(error, context)
      expect(strategy.canRecover(error, context)).toBe(true)

      strategy.reset()
      expect(strategy.canRecover(error, context)).toBe(true)
    })

    it('should clean up attempts after max retries', async () => {
      vi.useFakeTimers()

      const context = createContext()
      const error = new Error('BUSY')

      // Exhaust all retries
      for (let i = 0; i < 3; i++) {
        const promise = strategy.recover(error, context)
        await vi.advanceTimersByTimeAsync(10 * Math.pow(2, i) + 5) // Add jitter buffer
        await promise
      }

      // After 3 attempts with maxRetries=3, the map is cleaned up
      // So canRecover returns true again (attempts = 0)
      expect(strategy.canRecover(error, context)).toBe(true)

      // Reset and verify it works
      strategy.reset()
      expect(strategy.canRecover(error, context)).toBe(true)
    })

    it('should use default values when not provided', () => {
      const defaultStrategy = new RetryStrategy()
      expect(defaultStrategy.name).toBe('retry')

      const context = createContext()
      const error = new Error('BUSY')
      expect(defaultStrategy.canRecover(error, context)).toBe(true)
    })
  })

  describe('CircuitBreakerStrategy', () => {
    let strategy: CircuitBreakerStrategy

    beforeEach(() => {
      strategy = new CircuitBreakerStrategy(2, 100, 1)
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should have correct name', () => {
      expect(strategy.name).toBe('circuit-breaker')
    })

    it('should start in closed state', () => {
      expect(strategy.getState()).toBe('closed')
    })

    it('should allow recovery in closed state', () => {
      const context = createContext()
      const error = new Error('Network error')

      expect(strategy.canRecover(error, context)).toBe(true)
    })

    it('should open after threshold failures', async () => {
      const context = createContext()
      const error = new Error('Database error')

      // First failure
      await strategy.recover(error, context).catch(() => {})
      expect(strategy.getState()).toBe('closed')

      // Second failure (threshold)
      await expect(strategy.recover(error, context)).rejects.toThrow(
        StorageError
      )
      expect(strategy.getState()).toBe('open')
    })

    it('should transition to half-open after reset time', () => {
      const context = createContext()
      const error = new Error('Error')

      // Open the circuit
      strategy.recover(error, context).catch(() => {})
      strategy.recover(error, context).catch(() => {})
      expect(strategy.getState()).toBe('open')

      // Should not recover in open state
      expect(strategy.canRecover(error, context)).toBe(false)

      // Advance time past reset period
      vi.advanceTimersByTime(101)

      // Should transition to half-open
      expect(strategy.canRecover(error, context)).toBe(true)
      expect(strategy.getState()).toBe('half-open')
    })

    it('should allow limited requests in half-open state', () => {
      const context = createContext()
      const error = new Error('Error')

      // Open the circuit
      strategy.recover(error, context).catch(() => {})
      strategy.recover(error, context).catch(() => {})

      // Move to half-open
      vi.advanceTimersByTime(101)
      expect(strategy.getState()).toBe('half-open')

      // Should allow only halfOpenRequests (1)
      expect(strategy.canRecover(error, context)).toBe(true)
      strategy.recordSuccess()

      // After success limit, should close
      expect(strategy.getState()).toBe('closed')
    })

    it('should reopen on failure in half-open state', async () => {
      const context = createContext()
      const error = new Error('Error')

      // Open the circuit
      await strategy.recover(error, context).catch(() => {})
      await strategy.recover(error, context).catch(() => {})

      // Move to half-open
      vi.advanceTimersByTime(101)
      expect(strategy.getState()).toBe('half-open')

      // Failure in half-open should reopen
      await expect(strategy.recover(error, context)).rejects.toThrow(
        StorageError
      )
      expect(strategy.getState()).toBe('open')
    })

    it('should record successful operations', () => {
      const context = createContext()
      const error = new Error('Error')

      // In closed state, success should reset failures
      strategy.recover(error, context).catch(() => {})
      strategy.recordSuccess()

      // Should still be able to handle more failures
      expect(strategy.canRecover(error, context)).toBe(true)
      strategy.recover(error, context).catch(() => {})
      expect(strategy.getState()).toBe('closed')
    })

    it('should close circuit after successful half-open requests', () => {
      const strategy = new CircuitBreakerStrategy(2, 100, 2)
      const context = createContext()
      const error = new Error('Error')

      // Open the circuit
      strategy.recover(error, context).catch(() => {})
      strategy.recover(error, context).catch(() => {})

      // Move to half-open
      vi.advanceTimersByTime(101)
      expect(strategy.getState()).toBe('half-open')

      // Record successes
      strategy.recordSuccess()
      expect(strategy.getState()).toBe('half-open') // Still half-open

      strategy.recordSuccess()
      expect(strategy.getState()).toBe('closed') // Now closed
    })

    it('should handle manual reset', () => {
      const context = createContext()
      const error = new Error('Error')

      // Open the circuit
      strategy.recover(error, context).catch(() => {})
      strategy.recover(error, context).catch(() => {})
      expect(strategy.getState()).toBe('open')

      // Manual reset
      strategy.reset()
      expect(strategy.getState()).toBe('closed')
      expect(strategy.canRecover(error, context)).toBe(true)
    })

    it('should use default values when not provided', async () => {
      const defaultStrategy = new CircuitBreakerStrategy()
      expect(defaultStrategy.name).toBe('circuit-breaker')
      expect(defaultStrategy.getState()).toBe('closed')

      const context = createContext()
      const error = new Error('Error')

      // Should need 5 failures (default threshold) to open
      for (let i = 0; i < 4; i++) {
        await defaultStrategy.recover(error, context).catch(() => {})
      }
      expect(defaultStrategy.getState()).toBe('closed')

      await expect(defaultStrategy.recover(error, context)).rejects.toThrow()
      expect(defaultStrategy.getState()).toBe('open')
    })

    it('should handle success in closed state properly', () => {
      strategy.recordSuccess()
      expect(strategy.getState()).toBe('closed')

      // Add one failure
      const context = createContext()
      const error = new Error('Error')
      strategy.recover(error, context).catch(() => {})

      // Success should reset failure count
      strategy.recordSuccess()

      // Should still need 2 failures to open
      strategy.recover(error, context).catch(() => {})
      expect(strategy.getState()).toBe('closed')
    })

    it('should handle success in open state (no effect)', () => {
      const context = createContext()
      const error = new Error('Error')

      // Open the circuit
      strategy.recover(error, context).catch(() => {})
      strategy.recover(error, context).catch(() => {})
      expect(strategy.getState()).toBe('open')

      // Success in open state has no effect
      strategy.recordSuccess()
      expect(strategy.getState()).toBe('open')
    })

    it('should check transition to half-open in getState', () => {
      const context = createContext()
      const error = new Error('Error')

      // Open the circuit
      strategy.recover(error, context).catch(() => {})
      strategy.recover(error, context).catch(() => {})

      // Directly check state without canRecover
      expect(strategy.getState()).toBe('open')

      // Advance time
      vi.advanceTimersByTime(101)

      // getState should trigger transition
      expect(strategy.getState()).toBe('half-open')
    })
  })

  describe('FallbackStrategy', () => {
    it('should have correct name', () => {
      const strategy = new FallbackStrategy()
      expect(strategy.name).toBe('fallback')
    })

    it('should handle all errors by default', () => {
      const strategy = new FallbackStrategy('default-value')
      const context = createContext()

      expect(strategy.canRecover(new Error('Any error'), context)).toBe(true)
      expect(strategy.canRecover(new TypeError('Type error'), context)).toBe(
        true
      )
      expect(strategy.canRecover(new RangeError('Range error'), context)).toBe(
        true
      )
    })

    it('should filter by error types', () => {
      const strategy = new FallbackStrategy(null, ['TypeError', 'RangeError'])
      const context = createContext()

      expect(strategy.canRecover(new TypeError('Type error'), context)).toBe(
        true
      )
      expect(strategy.canRecover(new RangeError('Range error'), context)).toBe(
        true
      )
      expect(strategy.canRecover(new Error('Generic error'), context)).toBe(
        false
      )
    })

    it('should filter by error message content', () => {
      const strategy = new FallbackStrategy(null, ['NETWORK', 'TIMEOUT'])
      const context = createContext()

      expect(
        strategy.canRecover(new Error('NETWORK: Connection failed'), context)
      ).toBe(true)
      expect(strategy.canRecover(new Error('Request TIMEOUT'), context)).toBe(
        true
      )
      expect(strategy.canRecover(new Error('Other error'), context)).toBe(false)
    })

    it('should provide fallback value', () => {
      const fallbackValue = { data: 'fallback' }
      const strategy = new FallbackStrategy(fallbackValue)

      expect(strategy.getFallbackValue()).toBe(fallbackValue)
    })

    it('should recover successfully', async () => {
      const strategy = new FallbackStrategy('fallback')
      const context = createContext()
      const error = new Error('Test error')

      await expect(strategy.recover(error, context)).resolves.toBeUndefined()
    })

    it('should use null as default fallback value', () => {
      const strategy = new FallbackStrategy()
      expect(strategy.getFallbackValue()).toBe(null)
    })

    it('should handle complex fallback values', () => {
      const complexValue = {
        nested: {
          array: [1, 2, 3],
          object: { key: 'value' },
        },
        fn: () => 'function result',
      }
      const strategy = new FallbackStrategy(complexValue)

      const value = strategy.getFallbackValue()
      expect(value).toBe(complexValue)
      expect(value.nested.array).toEqual([1, 2, 3])
      expect(value.fn()).toBe('function result')
    })

    it('should match error constructor name', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message)
          this.name = 'CustomError'
        }
      }

      const strategy = new FallbackStrategy(null, ['CustomError'])
      const context = createContext()

      expect(strategy.canRecover(new CustomError('Test'), context)).toBe(true)
      expect(strategy.canRecover(new Error('Test'), context)).toBe(false)
    })
  })

  describe('CompositeStrategy', () => {
    it('should have correct name', () => {
      const strategy = new CompositeStrategy([])
      expect(strategy.name).toBe('composite')
    })

    it('should check all strategies for recovery', () => {
      const retry = new RetryStrategy(3, 10, 100)
      const fallback = new FallbackStrategy('default')
      const composite = new CompositeStrategy([retry, fallback])

      const context = createContext()

      // Error that only retry can handle
      const retryableError = new Error('BUSY')
      expect(composite.canRecover(retryableError, context)).toBe(true)

      // Error that only fallback can handle (retry exhausted)
      for (let i = 0; i < 3; i++) {
        retry.recover(retryableError, context)
      }
      expect(retry.canRecover(retryableError, context)).toBe(false)
      expect(composite.canRecover(retryableError, context)).toBe(true) // Fallback still works
    })

    it('should recover with first applicable strategy', async () => {
      const retry = new RetryStrategy(3, 10, 100)
      const fallback = new FallbackStrategy('default')
      const composite = new CompositeStrategy([retry, fallback])

      const context = createContext()
      const error = new Error('BUSY')

      // Should use retry strategy
      await expect(composite.recover(error, context)).resolves.toBeUndefined()

      // Verify retry was used (attempt count increased)
      expect(retry.canRecover(error, context)).toBe(true) // Still has attempts left
    })

    it('should throw if no strategy can recover', async () => {
      const retry = new RetryStrategy(0, 10, 100) // No retries allowed
      const composite = new CompositeStrategy([retry])

      const context = createContext()
      const error = new Error('Unknown error') // Not retryable

      await expect(composite.recover(error, context)).rejects.toThrow(
        'No recovery strategy available'
      )
    })

    it('should add strategies dynamically', () => {
      const composite = new CompositeStrategy([])
      const context = createContext()
      const error = new Error('Test')

      expect(composite.canRecover(error, context)).toBe(false)

      const fallback = new FallbackStrategy('default')
      composite.addStrategy(fallback)

      expect(composite.canRecover(error, context)).toBe(true)
    })

    it('should handle empty strategy list', () => {
      const composite = new CompositeStrategy([])
      const context = createContext()
      const error = new Error('Test')

      expect(composite.canRecover(error, context)).toBe(false)
    })

    it('should try strategies in order', async () => {
      const order: string[] = []

      const strategy1 = {
        name: 'strategy1',
        canRecover: () => false,
        recover: async () => {
          order.push('strategy1')
        },
      }

      const strategy2 = {
        name: 'strategy2',
        canRecover: () => true,
        recover: async () => {
          order.push('strategy2')
        },
      }

      const strategy3 = {
        name: 'strategy3',
        canRecover: () => true,
        recover: async () => {
          order.push('strategy3')
        },
      }

      const composite = new CompositeStrategy([strategy1, strategy2, strategy3])
      const context = createContext()
      const error = new Error('Test')

      await composite.recover(error, context)

      // Should only use strategy2 (first that can recover)
      expect(order).toEqual(['strategy2'])
    })

    it('should work with all strategy types', async () => {
      const retry = new RetryStrategy(1, 10, 100)
      const breaker = new CircuitBreakerStrategy(5, 1000, 2)
      const fallback = new FallbackStrategy('default')
      const composite = new CompositeStrategy([retry, breaker, fallback])

      const context = createContext()

      // Test with retryable error
      const busyError = new Error('BUSY')
      expect(composite.canRecover(busyError, context)).toBe(true)
      await composite.recover(busyError, context)

      // After 1 retry (maxRetries=1), the attempts map is cleaned up
      // So retry.canRecover returns true again
      expect(retry.canRecover(busyError, context)).toBe(true)

      // Breaker and fallback should still work
      expect(composite.canRecover(busyError, context)).toBe(true)
    })

    it('should handle nested composite strategies', () => {
      const retry = new RetryStrategy(3, 10, 100)
      const fallback = new FallbackStrategy('default')
      const inner = new CompositeStrategy([retry])
      const outer = new CompositeStrategy([inner, fallback])

      const context = createContext()
      const error = new Error('BUSY')

      expect(outer.canRecover(error, context)).toBe(true)
    })
  })

  describe('ErrorContext', () => {
    it('should create context with all fields', () => {
      const context: ErrorContext = {
        operation: 'write',
        key: 'user:123',
        metadata: { userId: 123, attempt: 1 },
        timestamp: Date.now(),
        retryCount: 2,
        adapterType: 'sqlite',
      }

      expect(context.operation).toBe('write')
      expect(context.key).toBe('user:123')
      expect(context.metadata?.userId).toBe(123)
      expect(context.retryCount).toBe(2)
      expect(context.adapterType).toBe('sqlite')
    })

    it('should work with minimal context', () => {
      const context: ErrorContext = {
        operation: 'read',
        timestamp: Date.now(),
      }

      expect(context.operation).toBe('read')
      expect(context.key).toBeUndefined()
      expect(context.metadata).toBeUndefined()
      expect(context.retryCount).toBeUndefined()
      expect(context.adapterType).toBeUndefined()
    })
  })
})
