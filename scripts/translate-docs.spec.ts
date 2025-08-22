/**
 * @fileoverview Comprehensive tests for enhanced translate-docs.ts
 *
 * @description
 * Tests for enhanced documentation translation with advanced features:
 * - Rate limiting with per-minute and per-hour limits
 * - Exponential backoff retry strategy with jitter
 * - Batch processing with queue management
 * - Priority-based language processing
 * - Metrics tracking and reporting
 * - Enhanced error handling and recovery
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
  Mock,
} from 'vitest'
import type { ProgressInfo } from '../types/test-mocks'

// Mock fs module with inline implementation using hoisted mock
const {
  existsSync,
  rmSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
} = vi.hoisted(() => ({
  existsSync: vi.fn(),
  rmSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(),
}))

vi.mock('fs', () => ({
  default: {
    existsSync,
    rmSync,
    readFileSync,
    writeFileSync,
    mkdirSync,
    readdirSync,
  },
  existsSync,
  rmSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
}))

vi.mock('path', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    join: vi.fn((...args: string[]) => args.filter((arg) => arg).join('/')),
    dirname: vi.fn((path: string) => path.split('/').slice(0, -1).join('/')),
  }
})
vi.mock('url', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    fileURLToPath: vi.fn((url: string) => '/test/scripts/translate-docs.ts'),
  }
})

// Mock the translation module
vi.mock('../tooling/translation-system/dist/index.js', () => ({
  translateDocumentation: vi.fn(),
}))

// Import path function
import { join } from 'path'

// Import the module under test
import {
  cleanExistingTranslations,
  main,
  getConfiguration,
  RateLimiter,
  RetryStrategy,
  TranslationQueue,
} from './translate-docs'

describe('Enhanced Translate Docs Script', () => {
  let consoleLogSpy: Mock
  let consoleErrorSpy: Mock
  let consoleWarnSpy: Mock
  let processExitSpy: Mock
  let processArgvBackup: string[]
  let translateDocumentation: Mock
  let dateNowSpy: Mock

  beforeAll(async () => {
    // Get mocked translation function
    const translationModule = await import(
      '../tooling/translation-system/dist/index.js'
    )
    translateDocumentation = translationModule.translateDocumentation as Mock
  })

  beforeEach(() => {
    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Suppress unhandled rejection warnings for tests that intentionally test failures
    process.removeAllListeners('unhandledRejection')
    process.on('unhandledRejection', () => {
      // Intentionally suppress unhandled rejections during testing
      // These are expected for failure testing scenarios
    })

    // Mock Date.now for consistent timing tests
    let currentTime = 1000000
    dateNowSpy = vi.spyOn(Date, 'now').mockImplementation(() => {
      currentTime += 100
      return currentTime
    })

    // Mock process methods
    processExitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((code?: number) => {
        throw new Error(`Process exit with code ${code}`)
      })

    // Backup process.argv
    processArgvBackup = [...process.argv]

    // Don't set default mocks for fs functions as they interfere with specific test cases
    // vi.mocked(existsSync).mockReturnValue(false)
    // vi.mocked(rmSync).mockImplementation(() => {})

    // Default successful translation mock
    translateDocumentation.mockResolvedValue({
      success: true,
      stats: {
        totalFiles: 5,
        successfulFiles: 5,
        failedFiles: 0,
        totalLanguages: 1,
        totalTranslations: 5,
        averageTimePerFile: 500,
      },
      totalDuration: 2500,
      fileResults: [],
    })

    // Mock setTimeout for faster tests
    vi.useFakeTimers()
  })

  afterEach(() => {
    process.argv = processArgvBackup
    vi.restoreAllMocks()
    vi.useRealTimers()
    // Restore unhandled rejection handlers
    process.removeAllListeners('unhandledRejection')
  })

  describe('RateLimiter Class', () => {
    it('should initialize with default configuration', () => {
      const rateLimiter = new RateLimiter()
      const metrics = rateLimiter.getMetrics()

      expect(metrics.requestCount).toBe(0)
      expect(metrics.errorCount).toBe(0)
      expect(metrics.successCount).toBe(0)
      expect(metrics.hourlyRequests).toEqual([])
      expect(metrics.retryAttempts.size).toBe(0)
    })

    it('should track requests and enforce per-minute limits', async () => {
      const rateLimiter = new RateLimiter({
        requestsPerMinute: 2,
        requestsPerHour: 100,
        delayBetweenBatches: 1000,
        batchSize: 1,
      })

      // First two requests should pass
      expect(await rateLimiter.checkRateLimit()).toBe(true)
      rateLimiter.recordRequest()
      expect(await rateLimiter.checkRateLimit()).toBe(true)
      rateLimiter.recordRequest()

      // Third request should be rate limited
      const checkPromise = rateLimiter.checkRateLimit()

      // Fast-forward time
      vi.advanceTimersByTime(60000)

      expect(await checkPromise).toBe(true)
    })

    it('should track requests and enforce hourly limits', async () => {
      const rateLimiter = new RateLimiter({
        requestsPerMinute: 100,
        requestsPerHour: 2,
        delayBetweenBatches: 1000,
        batchSize: 1,
      })

      // First two requests should pass
      expect(await rateLimiter.checkRateLimit()).toBe(true)
      rateLimiter.recordRequest()
      expect(await rateLimiter.checkRateLimit()).toBe(true)
      rateLimiter.recordRequest()

      // Third request should be rate limited
      const checkPromise = rateLimiter.checkRateLimit()

      // Fast-forward time
      vi.advanceTimersByTime(3600000)

      expect(await checkPromise).toBe(true)
    })

    it('should track success and error metrics', () => {
      const rateLimiter = new RateLimiter()

      rateLimiter.recordRequest()
      rateLimiter.recordSuccess()
      rateLimiter.recordError('test-1')
      rateLimiter.recordError('test-1')
      rateLimiter.recordError('test-2')

      const metrics = rateLimiter.getMetrics()
      expect(metrics.requestCount).toBe(1)
      expect(metrics.successCount).toBe(1)
      expect(metrics.errorCount).toBe(3)
      expect(rateLimiter.getRetryCount('test-1')).toBe(2)
      expect(rateLimiter.getRetryCount('test-2')).toBe(1)
      expect(rateLimiter.getRetryCount('test-3')).toBe(0)
    })

    it('should clean old hourly requests', async () => {
      // Reset the spy and create a custom mock for this specific test
      dateNowSpy.mockReset()

      let callCount = 0
      const times = [
        1000000, // Initial time for constructor
        1000000, // First recordRequest
        1000000, // Second recordRequest
        4700000, // Time when checkRateLimit is called (over an hour later)
      ]

      dateNowSpy = vi.spyOn(Date, 'now').mockImplementation(() => {
        if (callCount < times.length) {
          return times[callCount++]
        }
        return times[times.length - 1]
      })

      const rateLimiter = new RateLimiter({
        requestsPerMinute: 100,
        requestsPerHour: 100,
        delayBetweenBatches: 1000,
        batchSize: 1,
      })

      // Add some requests at the initial time
      rateLimiter.recordRequest()
      rateLimiter.recordRequest()

      const metrics1 = rateLimiter.getMetrics()
      expect(metrics1.hourlyRequests.length).toBe(2)
      expect(metrics1.hourlyRequests).toEqual([1000000, 1000000])

      // Check rate limit with time advanced beyond an hour
      await rateLimiter.checkRateLimit()

      const metrics2 = rateLimiter.getMetrics()
      // Since we've advanced time beyond an hour (3.7 million ms), old requests should be filtered out
      expect(metrics2.hourlyRequests.length).toBe(0)
    })
  })

  describe('RetryStrategy Class', () => {
    it('should calculate exponential backoff delays', () => {
      const strategy = new RetryStrategy({
        maxRetries: 5,
        initialDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        jitterRange: 0, // No jitter for predictable tests
      })

      expect(strategy.calculateDelay(1)).toBe(1000)
      expect(strategy.calculateDelay(2)).toBe(2000)
      expect(strategy.calculateDelay(3)).toBe(4000)
      expect(strategy.calculateDelay(4)).toBe(8000)
      expect(strategy.calculateDelay(5)).toBe(16000)
      expect(strategy.calculateDelay(6)).toBe(30000) // Capped at maxDelay
    })

    it('should add jitter to delays', () => {
      const strategy = new RetryStrategy({
        maxRetries: 5,
        initialDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        jitterRange: 0.3,
      })

      const delay = strategy.calculateDelay(1)
      expect(delay).toBeGreaterThanOrEqual(700) // 1000 - 30%
      expect(delay).toBeLessThanOrEqual(1300) // 1000 + 30%
    })

    it('should execute operation successfully on first try', async () => {
      const strategy = new RetryStrategy()
      const rateLimiter = new RateLimiter()
      const operation = vi.fn().mockResolvedValue('success')

      const result = await strategy.executeWithRetry(
        operation,
        'test-op',
        rateLimiter
      )

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
      expect(rateLimiter.getMetrics().successCount).toBe(1)
      expect(rateLimiter.getMetrics().errorCount).toBe(0)
    })

    it('should retry failed operations with backoff', async () => {
      const strategy = new RetryStrategy({
        maxRetries: 3,
        initialDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
        jitterRange: 0,
      })
      const rateLimiter = new RateLimiter()

      let attempts = 0
      const operation = vi.fn().mockImplementation(() => {
        attempts++
        if (attempts < 3) {
          return Promise.reject(new Error('Temporary failure'))
        }
        return Promise.resolve('success')
      })

      const resultPromise = strategy.executeWithRetry(
        operation,
        'test-op',
        rateLimiter
      )

      // Advance through retries
      await vi.advanceTimersByTimeAsync(100) // First retry delay
      await vi.advanceTimersByTimeAsync(200) // Second retry delay

      const result = await resultPromise

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(3)
      expect(rateLimiter.getMetrics().successCount).toBe(1)
      expect(rateLimiter.getMetrics().errorCount).toBe(2)
    })

    it('should throw after max retries exceeded', async () => {
      const strategy = new RetryStrategy({
        maxRetries: 2,
        initialDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
        jitterRange: 0,
      })
      const rateLimiter = new RateLimiter()
      const operation = vi
        .fn()
        .mockRejectedValue(new Error('Persistent failure'))

      const resultPromise = strategy.executeWithRetry(
        operation,
        'test-op',
        rateLimiter
      )

      // Advance through retries
      await vi.advanceTimersByTimeAsync(100) // First retry delay
      await vi.advanceTimersByTimeAsync(200) // Second retry delay

      await expect(resultPromise).rejects.toThrow('Persistent failure')
      expect(operation).toHaveBeenCalledTimes(2)
      expect(rateLimiter.getMetrics().errorCount).toBe(2)
    })
  })

  describe('TranslationQueue Class', () => {
    it('should initialize empty queue', () => {
      const queue = new TranslationQueue()

      expect(queue.hasItems()).toBe(false)
      expect(queue.size()).toBe(0)
      expect(queue.getNextBatch()).toEqual([])
    })

    it('should add languages and maintain priority order', () => {
      const queue = new TranslationQueue(2)

      queue.addToQueue(['es', 'fr'], 5)
      queue.addToQueue(['de', 'ja'], 10)
      queue.addToQueue(['ar'], 1)

      expect(queue.size()).toBe(5)

      // Should return highest priority first
      const batch1 = queue.getNextBatch()
      expect(batch1).toEqual(['de', 'ja'])

      const batch2 = queue.getNextBatch()
      expect(batch2).toEqual(['es', 'fr'])

      const batch3 = queue.getNextBatch()
      expect(batch3).toEqual(['ar'])
    })

    it('should respect batch size limits', () => {
      const queue = new TranslationQueue(3)

      queue.addToQueue(['es', 'fr', 'de', 'ja', 'ar'], 0)

      const batch1 = queue.getNextBatch()
      expect(batch1).toHaveLength(3)
      expect(batch1).toEqual(['es', 'fr', 'de'])

      const batch2 = queue.getNextBatch()
      expect(batch2).toHaveLength(2)
      expect(batch2).toEqual(['ja', 'ar'])
    })
  })

  describe('getConfiguration Function', () => {
    it('should return default configuration', () => {
      process.argv = ['node', 'script.ts']

      const config = getConfiguration()

      expect(config.rateLimit.requestsPerMinute).toBe(20)
      expect(config.rateLimit.requestsPerHour).toBe(500)
      expect(config.rateLimit.batchSize).toBe(3)
      expect(config.retryStrategy.maxRetries).toBe(5)
      expect(config.retryStrategy.backoffMultiplier).toBe(2)
    })

    it('should parse custom rate limit configuration', () => {
      process.argv = [
        'node',
        'script.ts',
        '--requests-per-minute',
        '10',
        '--requests-per-hour',
        '200',
        '--batch-size',
        '5',
      ]

      const config = getConfiguration()

      expect(config.rateLimit.requestsPerMinute).toBe(10)
      expect(config.rateLimit.requestsPerHour).toBe(200)
      expect(config.rateLimit.batchSize).toBe(5)
    })

    it('should parse custom retry configuration', () => {
      process.argv = [
        'node',
        'script.ts',
        '--max-retries',
        '3',
        '--backoff-multiplier',
        '1.5',
      ]

      const config = getConfiguration()

      expect(config.retryStrategy.maxRetries).toBe(3)
      expect(config.retryStrategy.backoffMultiplier).toBe(1.5)
    })
  })

  describe('Enhanced main Function', () => {
    it('should process languages in batches with rate limiting', async () => {
      process.argv = ['node', 'script.ts', '--test', '--batch-size', '2']

      const mainPromise = main()

      // Advance timers for batch delays
      await vi.advanceTimersByTimeAsync(5000) // First batch delay
      await vi.advanceTimersByTimeAsync(5000) // Second batch delay

      await mainPromise

      expect(translateDocumentation).toHaveBeenCalledTimes(3) // 3 test languages
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing batch')
      )
    })

    it('should handle translation failures with retry', async () => {
      let attempts = 0
      translateDocumentation.mockImplementation(() => {
        attempts++
        if (attempts === 1) {
          return Promise.reject(new Error('Temporary API error'))
        }
        return Promise.resolve({
          success: true,
          stats: {
            totalFiles: 5,
            successfulFiles: 5,
            failedFiles: 0,
            totalLanguages: 1,
            totalTranslations: 5,
            averageTimePerFile: 500,
          },
          totalDuration: 2500,
          fileResults: [],
        })
      })

      process.argv = ['node', 'script.ts', '--test', '--batch-size', '1']

      const mainPromise = main()

      // Advance through retries and batch delays
      await vi.advanceTimersByTimeAsync(1000) // First retry
      await vi.advanceTimersByTimeAsync(5000) // Batch delay
      await vi.advanceTimersByTimeAsync(5000) // Batch delay
      await vi.advanceTimersByTimeAsync(5000) // Batch delay

      await mainPromise

      expect(translateDocumentation).toHaveBeenCalledTimes(4) // 3 languages + 1 retry
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔄 Retry')
      )
    })

    it('should display enhanced statistics with metrics', async () => {
      process.argv = ['node', 'script.ts', '--test']

      const mainPromise = main()

      // Advance timers
      await vi.advanceTimersByTimeAsync(10000)

      await mainPromise

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Total requests:')
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Success rate:')
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Average time per language:')
      )
    })

    it('should prioritize languages correctly', async () => {
      process.argv = ['node', 'script.ts']

      const mainPromise = main()

      // Advance timers
      for (let i = 0; i < 10; i++) {
        await vi.advanceTimersByTimeAsync(5000)
      }

      await mainPromise

      // Check that Spanish, French, German were in early batches
      const calls = translateDocumentation.mock.calls
      const earlyLanguages = calls.slice(0, 3).flatMap((call) => call[2])

      expect(earlyLanguages).toContain('es')
      expect(earlyLanguages).toContain('fr')
      expect(earlyLanguages).toContain('de')
    })

    it('should handle complete batch failure gracefully', async () => {
      translateDocumentation.mockRejectedValue(new Error('API down'))

      process.argv = ['node', 'script.ts', '--test', '--max-retries', '1']

      const mainPromise = main()

      // Advance through retries
      await vi.advanceTimersByTimeAsync(50000)

      await expect(mainPromise).rejects.toThrow('Process exit with code 1')

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed translations:')
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle non-Error exceptions in retry logic', async () => {
      const strategy = new RetryStrategy({
        maxRetries: 2,
        initialDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
        jitterRange: 0,
      })
      const rateLimiter = new RateLimiter()
      const operation = vi.fn().mockRejectedValue('String error')

      const resultPromise = strategy
        .executeWithRetry(operation, 'test-op', rateLimiter)
        .catch((error) => {
          // Catch any unhandled rejections to prevent test pollution
          return Promise.reject(error)
        })

      await vi.advanceTimersByTimeAsync(500)

      await expect(resultPromise).rejects.toThrow('String error')
    })

    it('should handle undefined errors gracefully', async () => {
      const strategy = new RetryStrategy({
        maxRetries: 1,
        initialDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
        jitterRange: 0,
      })
      const rateLimiter = new RateLimiter()
      const operation = vi.fn().mockRejectedValue(undefined)

      const resultPromise = strategy.executeWithRetry(
        operation,
        'test-op',
        rateLimiter
      )

      await vi.advanceTimersByTimeAsync(500)

      // Should convert undefined to an error
      await expect(resultPromise).rejects.toThrow()
    })
  })

  describe('Integration Tests', () => {
    it('should complete full translation workflow with all features', async () => {
      process.argv = [
        'node',
        'script.ts',
        '--test',
        '--batch-size',
        '2',
        '--requests-per-minute',
        '10',
        '--max-retries',
        '2',
      ]

      let callCount = 0
      translateDocumentation.mockImplementation(() => {
        callCount++
        // Fail first attempt for one language to test retry
        if (callCount === 2) {
          return Promise.reject(new Error('Temporary failure'))
        }
        return Promise.resolve({
          success: true,
          stats: {
            totalFiles: 5,
            successfulFiles: 5,
            failedFiles: 0,
            totalLanguages: 1,
            totalTranslations: 5,
            averageTimePerFile: 500,
          },
          totalDuration: 2500,
          fileResults: [],
        })
      })

      const mainPromise = main()

      // Advance through all timers
      for (let i = 0; i < 20; i++) {
        await vi.advanceTimersByTimeAsync(5000)
      }

      await mainPromise

      expect(translateDocumentation).toHaveBeenCalledTimes(4) // 3 languages + 1 retry
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('🎉 Translation process completed!')
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Successful: 3')
      )
    })

    it('should handle mixed success and failure scenarios', async () => {
      let callCount = 0
      translateDocumentation.mockImplementation(() => {
        callCount++
        // Make second language (fr) fail permanently even after retries
        // Call 1: es - success
        // Call 2: fr - fail (first attempt)
        // Call 3: fr - fail (retry)
        // Call 4: de - fail (first attempt)
        // Call 5: de - fail (retry)
        if (callCount === 2 || callCount === 3) {
          return Promise.reject(new Error(`French translation failed`))
        }
        if (callCount === 4 || callCount === 5) {
          return Promise.reject(new Error(`German translation failed`))
        }
        return Promise.resolve({
          success: true,
          stats: {
            totalFiles: 5,
            successfulFiles: 5,
            failedFiles: 0,
            totalLanguages: 1,
            totalTranslations: 5,
            averageTimePerFile: 500,
          },
          totalDuration: 2500,
          fileResults: [],
        })
      })

      process.argv = [
        'node',
        'script.ts',
        '--test',
        '--batch-size',
        '1',
        '--max-retries',
        '1',
      ]

      const mainPromise = main()

      // Advance through all operations
      for (let i = 0; i < 30; i++) {
        await vi.advanceTimersByTimeAsync(5000)
      }

      await expect(mainPromise).rejects.toThrow('Process exit with code 1')

      // Check that failed languages are reported correctly
      // Based on the output: Successful: 1, Failed: 2
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed: 2')
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Successful: 1')
      )
    })
  })

  describe('cleanExistingTranslations Function', () => {
    beforeEach(() => {
      // Reset mocks before each test
      vi.clearAllMocks()
    })

    it('should remove existing translation directories', () => {
      // The function checks these 13 languages: ar, zh-cn, es, pt, fr, de, hi, id, ja, ko, fa, ru, tr
      // Mock existsSync to return true only for specific language directories
      existsSync.mockImplementation((path) => {
        const pathStr = path.toString()
        return (
          pathStr.endsWith('/docs/es') ||
          pathStr.endsWith('/docs/fr') ||
          pathStr.endsWith('/docs/de')
        )
      })

      // Mock rmSync to not throw errors
      rmSync.mockImplementation(() => {})

      const removedCount = cleanExistingTranslations('/docs')

      expect(removedCount).toBe(3)
      expect(rmSync).toHaveBeenCalledTimes(3)
      // The function checks all 13 languages, so existsSync is called 13 times
      expect(existsSync).toHaveBeenCalledTimes(13)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ Removed es/ directory')
      )
    })

    it('should handle no existing translations', () => {
      existsSync.mockReturnValue(false)
      rmSync.mockImplementation(() => {})

      const removedCount = cleanExistingTranslations('/docs')

      expect(removedCount).toBe(0)
      expect(rmSync).not.toHaveBeenCalled()
      // The function checks all 13 languages
      expect(existsSync).toHaveBeenCalledTimes(13)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No existing translations found')
      )
    })

    it('should handle errors when removing directories', () => {
      // The function checks these 13 languages: ar, zh-cn, es, pt, fr, de, hi, id, ja, ko, fa, ru, tr
      // Mock existsSync to return true only for es directory to simplify test
      existsSync.mockImplementation((path) => {
        return path.toString().endsWith('/docs/es')
      })

      // Mock rmSync to throw errors
      rmSync.mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const removedCount = cleanExistingTranslations('/docs')

      expect(removedCount).toBe(0)
      // The function will try to remove es directory and fail, logging a warning
      expect(rmSync).toHaveBeenCalledTimes(1)
      expect(consoleWarnSpy).toHaveBeenCalled()
      const warnCalls = consoleWarnSpy.mock.calls
      expect(warnCalls[0][0]).toContain('⚠️  Failed to remove es/')
      expect(warnCalls[0][0]).toContain('Permission denied')
    })
  })
})
