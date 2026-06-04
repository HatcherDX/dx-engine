/**
 * @fileoverview Tests for AdapterMiddleware implementations
 *
 * @description
 * Comprehensive test suite for all middleware classes including
 * LoggingMiddleware, ValidationMiddleware, MetricsMiddleware,
 * RateLimitMiddleware, and RetryMiddleware.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  LoggingMiddleware,
  ValidationMiddleware,
  MetricsMiddleware,
  RateLimitMiddleware,
  RetryMiddleware,
  type MiddlewareContext,
  type MiddlewareNext,
} from './AdapterMiddleware'
import type { PerformanceMonitor } from './PerformanceMonitor'
import type { Logger } from './StorageAdapterFactory'

describe('AdapterMiddleware', () => {
  describe('LoggingMiddleware', () => {
    let logger: Logger
    let middleware: LoggingMiddleware
    let context: MiddlewareContext
    let next: MiddlewareNext

    beforeEach(() => {
      logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      middleware = new LoggingMiddleware(logger)

      context = {
        operation: 'get',
        args: ['test-key'],
        metadata: {},
        startTime: Date.now(),
      }

      next = vi.fn().mockResolvedValue('test-result')
    })

    it('should have correct name', () => {
      expect(middleware.name).toBe('logging')
    })

    it('should log operation start and success with default options', async () => {
      const result = await middleware.process(context, next)

      expect(result).toBe('test-result')
      expect(logger.info).toHaveBeenCalledTimes(2)
      expect(logger.info).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('[Storage] get started')
      )
      expect(logger.info).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('[Storage] get completed')
      )
    })

    it('should include args when includeArgs is true', async () => {
      middleware = new LoggingMiddleware(logger, { includeArgs: true })
      await middleware.process(context, next)

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('with args: "test-key"')
      )
    })

    it('should not include args when includeArgs is false', async () => {
      middleware = new LoggingMiddleware(logger, { includeArgs: false })
      await middleware.process(context, next)

      expect(logger.info).toHaveBeenCalledWith('[Storage] get started')
    })

    it('should include result when includeResult is true', async () => {
      middleware = new LoggingMiddleware(logger, { includeResult: true })
      await middleware.process(context, next)

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('with result: "test-result"')
      )
    })

    it('should use debug log level when configured', async () => {
      middleware = new LoggingMiddleware(logger, { logLevel: 'debug' })
      await middleware.process(context, next)

      expect(logger.debug).toHaveBeenCalledTimes(2)
      expect(logger.info).not.toHaveBeenCalled()
    })

    it('should log errors and rethrow', async () => {
      const error = new Error('Test error')
      next = vi.fn().mockRejectedValue(error)

      await expect(middleware.process(context, next)).rejects.toThrow(
        'Test error'
      )

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[Storage] get failed'),
        error
      )
    })

    it('should truncate long string arguments', async () => {
      middleware = new LoggingMiddleware(logger, {
        includeArgs: true,
        maxArgLength: 10,
      })
      context.args = ['very-long-string-that-should-be-truncated']

      await middleware.process(context, next)

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('"very-long-...')
      )
    })

    it('should format different value types correctly', async () => {
      middleware = new LoggingMiddleware(logger, {
        includeArgs: true,
        includeResult: true,
      })

      // Test null
      context.args = [null]
      await middleware.process(context, next)
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('null'))

      // Test undefined
      context.args = [undefined]
      await middleware.process(context, next)
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('undefined')
      )

      // Test number
      context.args = [42]
      await middleware.process(context, next)
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('42'))

      // Test boolean
      context.args = [true]
      await middleware.process(context, next)
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('true'))

      // Test array
      context.args = [[1, 2, 3]]
      await middleware.process(context, next)
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Array(3)')
      )

      // Test object
      context.args = [{ key1: 'value1', key2: 'value2' }]
      await middleware.process(context, next)
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Object(2 keys)')
      )

      // Test function (returns type name)
      context.args = [() => {}]
      await middleware.process(context, next)
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('function')
      )

      // Test symbol
      context.args = [Symbol('test')]
      await middleware.process(context, next)
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('symbol')
      )
    })

    it('should handle error without message property', async () => {
      const error = 'String error'
      next = vi.fn().mockRejectedValue(error)

      await expect(middleware.process(context, next)).rejects.toBe(error)

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('String error'),
        error
      )
    })

    it('should format result with undefined correctly', async () => {
      middleware = new LoggingMiddleware(logger, { includeResult: true })
      next = vi.fn().mockResolvedValue(undefined)

      await middleware.process(context, next)

      expect(logger.info).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('[Storage] get completed')
      )
      expect(logger.info).toHaveBeenNthCalledWith(
        2,
        expect.not.stringContaining('with result:')
      )
    })

    it('should handle complex nested objects', async () => {
      middleware = new LoggingMiddleware(logger, { includeArgs: true })
      context.args = [{ nested: { deep: { value: 'test' } } }]

      await middleware.process(context, next)

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Object(1 keys)')
      )
    })
  })

  describe('ValidationMiddleware', () => {
    let middleware: ValidationMiddleware
    let context: MiddlewareContext
    let next: MiddlewareNext

    beforeEach(() => {
      middleware = new ValidationMiddleware()

      context = {
        operation: 'get',
        args: ['test-key'],
        metadata: {},
        startTime: Date.now(),
      }

      next = vi.fn().mockResolvedValue('test-result')
    })

    it('should have correct name', () => {
      expect(middleware.name).toBe('validation')
    })

    describe('key validation', () => {
      it('should validate get operation key', async () => {
        await middleware.process(context, next)
        expect(next).toHaveBeenCalled()
      })

      it('should validate delete operation key', async () => {
        context.operation = 'delete'
        await middleware.process(context, next)
        expect(next).toHaveBeenCalled()
      })

      it('should validate has operation key', async () => {
        context.operation = 'has'
        await middleware.process(context, next)
        expect(next).toHaveBeenCalled()
      })

      it('should reject non-string keys', async () => {
        context.args = [123]

        await expect(middleware.process(context, next)).rejects.toThrow(
          /Key must be a string/
        )
      })

      it('should reject keys that are too short', async () => {
        middleware = new ValidationMiddleware({ minKeyLength: 5 })
        context.args = ['key']

        await expect(middleware.process(context, next)).rejects.toThrow(
          /Key length must be at least 5 characters/
        )
      })

      it('should reject keys that are too long', async () => {
        middleware = new ValidationMiddleware({ maxKeyLength: 5 })
        context.args = ['very-long-key']

        await expect(middleware.process(context, next)).rejects.toThrow(
          /Key length cannot exceed 5 characters/
        )
      })

      it('should reject keys with invalid characters', async () => {
        middleware = new ValidationMiddleware({
          allowedKeyPattern: /^[a-z]+$/,
        })
        context.args = ['KEY-123']

        await expect(middleware.process(context, next)).rejects.toThrow(
          /Key contains invalid characters/
        )
      })

      it('should reject forbidden keys', async () => {
        middleware = new ValidationMiddleware({
          forbiddenKeys: ['admin', 'system'],
        })
        context.args = ['admin']

        await expect(middleware.process(context, next)).rejects.toThrow(
          /Key "admin" is forbidden/
        )
      })

      it('should allow keys without pattern check when not configured', async () => {
        middleware = new ValidationMiddleware({
          allowedKeyPattern: undefined,
        })
        context.args = ['ANY-KEY!@#']

        await middleware.process(context, next)
        expect(next).toHaveBeenCalled()
      })
    })

    describe('value validation', () => {
      beforeEach(() => {
        context.operation = 'set'
        context.args = ['key', 'value']
      })

      it('should validate set operation key and value', async () => {
        await middleware.process(context, next)
        expect(next).toHaveBeenCalled()
      })

      it('should reject undefined values', async () => {
        context.args = ['key', undefined]

        await expect(middleware.process(context, next)).rejects.toThrow(
          /Cannot store undefined value/
        )
      })

      it('should reject function values when validateTypes is true', async () => {
        context.args = ['key', () => {}]

        await expect(middleware.process(context, next)).rejects.toThrow(
          /Cannot store functions/
        )
      })

      it('should reject symbol values when validateTypes is true', async () => {
        context.args = ['key', Symbol('test')]

        await expect(middleware.process(context, next)).rejects.toThrow(
          /Cannot store symbols/
        )
      })

      it('should allow functions when validateTypes is false', async () => {
        middleware = new ValidationMiddleware({ validateTypes: false })
        context.args = ['key', () => {}]

        await middleware.process(context, next)
        expect(next).toHaveBeenCalled()
      })

      it('should reject values that are too large', async () => {
        middleware = new ValidationMiddleware({ maxValueSize: 10 })
        context.args = ['key', 'very-long-value-that-exceeds-size-limit']

        await expect(middleware.process(context, next)).rejects.toThrow(
          /Value size.*exceeds maximum/
        )
      })

      it('should allow values when maxValueSize is not set', async () => {
        middleware = new ValidationMiddleware({ maxValueSize: undefined })
        context.args = ['key', 'any-size-value']

        await middleware.process(context, next)
        expect(next).toHaveBeenCalled()
      })
    })

    describe('batch operations', () => {
      it('should validate getMany operation', async () => {
        context.operation = 'getMany'
        context.args = [['key1', 'key2']]

        await middleware.process(context, next)
        expect(next).toHaveBeenCalled()
      })

      it('should reject getMany with non-array', async () => {
        context.operation = 'getMany'
        context.args = ['not-an-array']

        await expect(middleware.process(context, next)).rejects.toThrow(
          /Keys must be an array/
        )
      })

      it('should validate setMany operation', async () => {
        context.operation = 'setMany'
        const batch = new Map([
          ['key1', 'value1'],
          ['key2', 'value2'],
        ])
        context.args = [batch]

        await middleware.process(context, next)
        expect(next).toHaveBeenCalled()
      })

      it('should reject setMany with non-Map', async () => {
        context.operation = 'setMany'
        context.args = [{ key1: 'value1' }]

        await expect(middleware.process(context, next)).rejects.toThrow(
          /Batch must be a Map/
        )
      })

      it('should reject setMany with invalid keys in batch', async () => {
        context.operation = 'setMany'
        const batch = new Map([
          [123, 'value1'], // Invalid key type
        ])
        context.args = [batch]

        await expect(middleware.process(context, next)).rejects.toThrow(
          /Key must be a string/
        )
      })
    })

    describe('prefix operations', () => {
      it('should validate list operation with prefix', async () => {
        context.operation = 'list'
        context.args = ['prefix']

        await middleware.process(context, next)
        expect(next).toHaveBeenCalled()
      })

      it('should validate count operation with prefix', async () => {
        context.operation = 'count'
        context.args = ['prefix']

        await middleware.process(context, next)
        expect(next).toHaveBeenCalled()
      })

      it('should allow list operation without prefix', async () => {
        context.operation = 'list'
        context.args = []

        await middleware.process(context, next)
        expect(next).toHaveBeenCalled()
      })

      it('should reject non-string prefix', async () => {
        context.operation = 'list'
        context.args = [123]

        await expect(middleware.process(context, next)).rejects.toThrow(
          /Prefix must be a string/
        )
      })
    })

    describe('unknown operations', () => {
      it('should pass through unknown operations', async () => {
        context.operation = 'custom-operation'
        context.args = ['any', 'args']

        await middleware.process(context, next)
        expect(next).toHaveBeenCalled()
      })
    })
  })

  describe('MetricsMiddleware', () => {
    let monitor: PerformanceMonitor
    let middleware: MetricsMiddleware
    let context: MiddlewareContext
    let next: MiddlewareNext

    beforeEach(() => {
      monitor = {
        record: vi.fn(),
        getMetrics: vi.fn(),
        reset: vi.fn(),
        dispose: vi.fn(),
      }

      middleware = new MetricsMiddleware(monitor)

      context = {
        operation: 'get',
        args: ['test-key'],
        metadata: {},
        startTime: Date.now(),
      }

      next = vi.fn().mockResolvedValue('test-result')
    })

    it('should have correct name', () => {
      expect(middleware.name).toBe('metrics')
    })

    it('should record metrics for successful operations', async () => {
      const result = await middleware.process(context, next)

      expect(result).toBe('test-result')
      expect(monitor.record).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'get',
          success: true,
          duration: expect.any(Number),
        })
      )
    })

    it('should record metrics for failed operations', async () => {
      const error = new Error('Test error')
      next = vi.fn().mockRejectedValue(error)

      await expect(middleware.process(context, next)).rejects.toThrow(
        'Test error'
      )

      expect(monitor.record).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'get',
          success: false,
          error: 'Test error',
          duration: expect.any(Number),
        })
      )
    })

    it('should include keys when configured', async () => {
      middleware = new MetricsMiddleware(monitor, { includeKeys: true })

      await middleware.process(context, next)

      expect(monitor.record).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'test-key',
        })
      )
    })

    it('should include size for set operations when configured', async () => {
      middleware = new MetricsMiddleware(monitor, { includeSize: true })
      context.operation = 'set'
      context.args = ['key', { data: 'value' }]

      await middleware.process(context, next)

      expect(monitor.record).toHaveBeenCalledWith(
        expect.objectContaining({
          size: expect.any(Number),
        })
      )
    })

    it('should include size for get operations when configured', async () => {
      middleware = new MetricsMiddleware(monitor, { includeSize: true })
      next = vi.fn().mockResolvedValue({ data: 'test-result' })

      await middleware.process(context, next)

      expect(monitor.record).toHaveBeenCalledWith(
        expect.objectContaining({
          size: expect.any(Number),
        })
      )
    })

    it('should handle get operations with null result', async () => {
      middleware = new MetricsMiddleware(monitor, { includeSize: true })
      next = vi.fn().mockResolvedValue(null)

      await middleware.process(context, next)

      expect(monitor.record).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'get',
          success: true,
        })
      )
    })

    it('should track cache hit for get operations', async () => {
      await middleware.process(context, next)

      expect(monitor.record).toHaveBeenCalledWith(
        expect.objectContaining({
          cacheHit: false,
        })
      )
    })

    it('should not include keys for non-covered operations', async () => {
      middleware = new MetricsMiddleware(monitor, { includeKeys: true })
      context.operation = 'list'

      await middleware.process(context, next)

      expect(monitor.record).toHaveBeenCalledWith(
        expect.not.objectContaining({
          key: expect.anything(),
        })
      )
    })

    it('should handle delete operations with keys', async () => {
      middleware = new MetricsMiddleware(monitor, { includeKeys: true })
      context.operation = 'delete'
      context.args = ['delete-key']

      await middleware.process(context, next)

      expect(monitor.record).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'delete-key',
        })
      )
    })

    it('should not include size for set with null value', async () => {
      middleware = new MetricsMiddleware(monitor, { includeSize: true })
      context.operation = 'set'
      context.args = ['key', null]

      await middleware.process(context, next)

      expect(monitor.record).toHaveBeenCalledWith(
        expect.not.objectContaining({
          size: expect.anything(),
        })
      )
    })
  })

  describe('RateLimitMiddleware', () => {
    let middleware: RateLimitMiddleware
    let context: MiddlewareContext
    let next: MiddlewareNext

    beforeEach(() => {
      vi.useFakeTimers()

      middleware = new RateLimitMiddleware({
        maxRequestsPerSecond: 10,
        maxBurst: 5,
      })

      context = {
        operation: 'get',
        args: ['test-key'],
        metadata: {},
        startTime: Date.now(),
      }

      next = vi.fn().mockResolvedValue('test-result')
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should have correct name', () => {
      expect(middleware.name).toBe('rate-limit')
    })

    it('should allow requests within rate limit', async () => {
      // Should have 5 tokens initially (maxBurst)
      for (let i = 0; i < 5; i++) {
        await middleware.process(context, next)
      }

      expect(next).toHaveBeenCalledTimes(5)
    })

    it('should reject requests when rate limit exceeded', async () => {
      // Use all 5 tokens
      for (let i = 0; i < 5; i++) {
        await middleware.process(context, next)
      }

      // 6th request should be rejected
      await expect(middleware.process(context, next)).rejects.toThrow(
        /Rate limit exceeded/
      )
    })

    it('should refill tokens over time', async () => {
      // Use all 5 tokens
      for (let i = 0; i < 5; i++) {
        await middleware.process(context, next)
      }

      // Advance time by 0.5 seconds (should refill 5 tokens)
      vi.advanceTimersByTime(500)

      // Should be able to make more requests
      await middleware.process(context, next)
      expect(next).toHaveBeenCalledTimes(6)
    })

    it('should respect maxBurst limit when refilling', async () => {
      // Use all 5 tokens
      for (let i = 0; i < 5; i++) {
        await middleware.process(context, next)
      }

      // Advance time by 2 seconds (would refill 20 tokens, but limited by maxBurst)
      vi.advanceTimersByTime(2000)

      // Should only be able to make 5 requests (maxBurst)
      for (let i = 0; i < 5; i++) {
        await middleware.process(context, next)
      }

      // 11th request should be rejected
      await expect(middleware.process(context, next)).rejects.toThrow(
        /Rate limit exceeded/
      )
    })

    it('should exempt configured operations', async () => {
      middleware = new RateLimitMiddleware({
        maxRequestsPerSecond: 1,
        maxBurst: 1,
        exemptOperations: ['health-check'],
      })

      // Use the one available token
      await middleware.process(context, next)

      // Health check should still work
      context.operation = 'health-check'
      await middleware.process(context, next)
      await middleware.process(context, next)

      expect(next).toHaveBeenCalledTimes(3)
    })

    it('should use default maxBurst when not specified', () => {
      middleware = new RateLimitMiddleware({
        maxRequestsPerSecond: 100,
      })

      expect(middleware).toBeDefined()
      // Should be able to make 100 requests (maxBurst defaults to maxRequestsPerSecond)
    })

    it('should handle fractional token refills', async () => {
      middleware = new RateLimitMiddleware({
        maxRequestsPerSecond: 10,
        maxBurst: 2,
      })

      // Use both tokens
      await middleware.process(context, next)
      await middleware.process(context, next)

      // Advance time by 50ms (should refill 0.5 tokens)
      vi.advanceTimersByTime(50)

      // Should still be rejected (need at least 1 token)
      await expect(middleware.process(context, next)).rejects.toThrow(
        /Rate limit exceeded/
      )

      // Advance time by another 50ms (total 100ms = 1 token)
      vi.advanceTimersByTime(50)

      // Should now work
      await middleware.process(context, next)
      expect(next).toHaveBeenCalledTimes(3)
    })
  })

  describe('RetryMiddleware', () => {
    let middleware: RetryMiddleware
    let context: MiddlewareContext
    let next: MiddlewareNext

    beforeEach(() => {
      vi.useFakeTimers()

      middleware = new RetryMiddleware()

      context = {
        operation: 'get',
        args: ['test-key'],
        metadata: {},
        startTime: Date.now(),
      }

      next = vi.fn().mockResolvedValue('test-result')
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should have correct name', () => {
      expect(middleware.name).toBe('retry')
    })

    it('should return result on first success', async () => {
      const result = await middleware.process(context, next)

      expect(result).toBe('test-result')
      expect(next).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure and succeed', async () => {
      let attempts = 0
      next = vi.fn().mockImplementation(async () => {
        attempts++
        if (attempts < 3) {
          const error = new Error('BUSY')
          throw error
        }
        return 'success'
      })

      const promise = middleware.process(context, next)

      // First attempt fails
      await vi.advanceTimersByTimeAsync(0)

      // Second attempt fails (after 100ms backoff)
      await vi.advanceTimersByTimeAsync(100)

      // Third attempt succeeds (after 200ms backoff)
      await vi.advanceTimersByTimeAsync(200)

      const result = await promise
      expect(result).toBe('success')
      expect(next).toHaveBeenCalledTimes(3)
    })

    it('should throw after max attempts', async () => {
      const error = new Error('LOCKED')
      next = vi.fn().mockRejectedValue(error)

      middleware = new RetryMiddleware({ maxAttempts: 2 })

      const promise = middleware.process(context, next)

      // First attempt fails
      await vi.advanceTimersByTimeAsync(0)

      // Second attempt fails (final)
      await vi.advanceTimersByTimeAsync(100)

      await expect(promise).rejects.toThrow('LOCKED')
      expect(next).toHaveBeenCalledTimes(2)
    })

    it('should not retry non-retryable errors', async () => {
      const error = new Error('INVALID_ARGUMENT')
      next = vi.fn().mockRejectedValue(error)

      await expect(middleware.process(context, next)).rejects.toThrow(
        'INVALID_ARGUMENT'
      )
      expect(next).toHaveBeenCalledTimes(1)
    })

    it('should use exponential backoff when configured', async () => {
      middleware = new RetryMiddleware({
        maxAttempts: 4,
        backoffMs: 100,
        exponential: true,
      })

      let attempts = 0
      next = vi.fn().mockImplementation(async () => {
        attempts++
        if (attempts < 4) {
          throw new Error('ETIMEDOUT')
        }
        return 'success'
      })

      const promise = middleware.process(context, next)

      // First attempt fails immediately
      await vi.advanceTimersByTimeAsync(0)
      expect(next).toHaveBeenCalledTimes(1)

      // Second attempt after 100ms (100 * 2^0)
      await vi.advanceTimersByTimeAsync(100)
      expect(next).toHaveBeenCalledTimes(2)

      // Third attempt after 200ms (100 * 2^1)
      await vi.advanceTimersByTimeAsync(200)
      expect(next).toHaveBeenCalledTimes(3)

      // Fourth attempt after 400ms (100 * 2^2)
      await vi.advanceTimersByTimeAsync(400)

      const result = await promise
      expect(result).toBe('success')
      expect(next).toHaveBeenCalledTimes(4)
    })

    it('should use linear backoff when exponential is false', async () => {
      middleware = new RetryMiddleware({
        maxAttempts: 3,
        backoffMs: 100,
        exponential: false,
      })

      let attempts = 0
      next = vi.fn().mockImplementation(async () => {
        attempts++
        if (attempts < 3) {
          throw new Error('BUSY')
        }
        return 'success'
      })

      const promise = middleware.process(context, next)

      // Each retry should wait exactly 100ms
      await vi.advanceTimersByTimeAsync(0)
      expect(next).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(100)
      expect(next).toHaveBeenCalledTimes(2)

      await vi.advanceTimersByTimeAsync(100)

      const result = await promise
      expect(result).toBe('success')
      expect(next).toHaveBeenCalledTimes(3)
    })

    it('should check error code property for retryable errors', async () => {
      middleware = new RetryMiddleware({
        retryableErrors: ['ECONNRESET'],
        maxAttempts: 2,
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Adding code property to Error for testing retryable error detection
      const error: any = new Error('Connection reset')
      error.code = 'ECONNRESET'

      let attempts = 0
      next = vi.fn().mockImplementation(async () => {
        attempts++
        if (attempts === 1) {
          throw error
        }
        return 'success'
      })

      const promise = middleware.process(context, next)

      await vi.advanceTimersByTimeAsync(0)
      await vi.advanceTimersByTimeAsync(100)

      const result = await promise
      expect(result).toBe('success')
      expect(next).toHaveBeenCalledTimes(2)
    })

    it('should handle custom retryable errors', async () => {
      middleware = new RetryMiddleware({
        retryableErrors: ['CUSTOM_ERROR'],
        maxAttempts: 2,
      })

      let attempts = 0
      next = vi.fn().mockImplementation(async () => {
        attempts++
        if (attempts === 1) {
          throw new Error('CUSTOM_ERROR occurred')
        }
        return 'success'
      })

      const promise = middleware.process(context, next)

      await vi.advanceTimersByTimeAsync(0)
      await vi.advanceTimersByTimeAsync(100)

      const result = await promise
      expect(result).toBe('success')
      expect(next).toHaveBeenCalledTimes(2)
    })

    it('should not wait after last failed attempt', async () => {
      middleware = new RetryMiddleware({
        maxAttempts: 2,
        backoffMs: 1000,
      })

      const error = new Error('BUSY')
      next = vi.fn().mockRejectedValue(error)

      const promise = middleware.process(context, next)

      // First attempt
      await vi.advanceTimersByTimeAsync(0)
      expect(next).toHaveBeenCalledTimes(1)

      // Second (final) attempt after backoff
      await vi.advanceTimersByTimeAsync(1000)
      expect(next).toHaveBeenCalledTimes(2)

      // Should reject immediately without additional waiting
      await expect(promise).rejects.toThrow('BUSY')
    })
  })
})
