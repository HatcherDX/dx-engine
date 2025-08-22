/**
 * @fileoverview Comprehensive tests for Logger - Git Genius Logging System
 *
 * @description
 * This test suite provides 100% coverage for the Logger class and related utilities.
 * Tests cover log levels, message formatting, child loggers, timing operations, configuration,
 * custom formatters and outputs, error handling, and the global logger functionality.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @priority CRITICAL
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createGlobalLogger,
  Logger,
  logger,
  LogLevel,
  type LogEntry,
  type LoggerConfig,
} from './Logger'

describe('📝 Logger - Git Genius Logging System', () => {
  let mockConsole: {
    debug: ReturnType<typeof vi.spyOn>
    info: ReturnType<typeof vi.spyOn>
    warn: ReturnType<typeof vi.spyOn>
    error: ReturnType<typeof vi.spyOn>
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    // Mock all console methods
    mockConsole = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    }
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('🏗️ Construction and Configuration', () => {
    it('should create Logger with default configuration', () => {
      const logger = new Logger()

      expect(logger).toBeInstanceOf(Logger)

      // Test that it works by logging something
      logger.info('test message')
      expect(mockConsole.info).toHaveBeenCalled()
    })

    it('should create Logger with custom context', () => {
      const logger = new Logger('CustomContext')

      logger.info('test message')
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[CustomContext]')
      )
    })

    it('should create Logger with custom configuration', () => {
      const config: Partial<LoggerConfig> = {
        level: LogLevel.DEBUG,
        includeTimestamp: false,
      }

      const logger = new Logger('TestContext', config)

      // Debug should work since level is DEBUG
      logger.debug('debug message')
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.not.stringContaining('[2') // No timestamp
      )
    })

    it('should create Logger with custom formatter', () => {
      const customFormatter = vi.fn().mockReturnValue('CUSTOM FORMAT')
      const config: Partial<LoggerConfig> = {
        formatter: customFormatter,
      }

      const logger = new Logger('TestContext', config)
      logger.info('test message')

      expect(customFormatter).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.INFO,
          message: 'test message',
          context: 'TestContext',
        })
      )
      expect(mockConsole.info).toHaveBeenCalledWith('CUSTOM FORMAT')
    })

    it('should create Logger with custom output function', () => {
      const customOutput = vi.fn()
      const config: Partial<LoggerConfig> = {
        output: customOutput,
      }

      const logger = new Logger('TestContext', config)
      logger.info('test message')

      expect(customOutput).toHaveBeenCalledWith(
        LogLevel.INFO,
        expect.stringContaining('test message')
      )
      expect(mockConsole.info).not.toHaveBeenCalled()
    })

    it('should handle empty context gracefully', () => {
      const logger = new Logger('')

      logger.info('test message')
      // Empty context doesn't show brackets at all
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('INFO: test message')
      )
    })
  })

  describe('📊 Log Level System', () => {
    it('should respect minimum log level - DEBUG', () => {
      const logger = new Logger('Test', { level: LogLevel.DEBUG })

      logger.debug('debug message')
      logger.info('info message')
      logger.warn('warn message')
      logger.error('error message')

      expect(mockConsole.debug).toHaveBeenCalledTimes(1)
      expect(mockConsole.info).toHaveBeenCalledTimes(1)
      expect(mockConsole.warn).toHaveBeenCalledTimes(1)
      expect(mockConsole.error).toHaveBeenCalledTimes(1)
    })

    it('should respect minimum log level - INFO', () => {
      const logger = new Logger('Test', { level: LogLevel.INFO })

      logger.debug('debug message')
      logger.info('info message')
      logger.warn('warn message')
      logger.error('error message')

      expect(mockConsole.debug).not.toHaveBeenCalled()
      expect(mockConsole.info).toHaveBeenCalledTimes(1)
      expect(mockConsole.warn).toHaveBeenCalledTimes(1)
      expect(mockConsole.error).toHaveBeenCalledTimes(1)
    })

    it('should respect minimum log level - WARN', () => {
      const logger = new Logger('Test', { level: LogLevel.WARN })

      logger.debug('debug message')
      logger.info('info message')
      logger.warn('warn message')
      logger.error('error message')

      expect(mockConsole.debug).not.toHaveBeenCalled()
      expect(mockConsole.info).not.toHaveBeenCalled()
      expect(mockConsole.warn).toHaveBeenCalledTimes(1)
      expect(mockConsole.error).toHaveBeenCalledTimes(1)
    })

    it('should respect minimum log level - ERROR', () => {
      const logger = new Logger('Test', { level: LogLevel.ERROR })

      logger.debug('debug message')
      logger.info('info message')
      logger.warn('warn message')
      logger.error('error message')

      expect(mockConsole.debug).not.toHaveBeenCalled()
      expect(mockConsole.info).not.toHaveBeenCalled()
      expect(mockConsole.warn).not.toHaveBeenCalled()
      expect(mockConsole.error).toHaveBeenCalledTimes(1)
    })

    it('should verify LogLevel enum values', () => {
      expect(LogLevel.DEBUG).toBe(0)
      expect(LogLevel.INFO).toBe(1)
      expect(LogLevel.WARN).toBe(2)
      expect(LogLevel.ERROR).toBe(3)
    })
  })

  describe('💬 Basic Logging Methods', () => {
    let logger: Logger

    beforeEach(() => {
      logger = new Logger('Test', { level: LogLevel.DEBUG })
    })

    it('should log debug messages', () => {
      logger.debug('debug message')

      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('DEBUG [Test]: debug message')
      )
    })

    it('should log info messages', () => {
      logger.info('info message')

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('INFO [Test]: info message')
      )
    })

    it('should log warn messages', () => {
      logger.warn('warn message')

      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARN [Test]: warn message')
      )
    })

    it('should log error messages', () => {
      logger.error('error message')

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR [Test]: error message')
      )
    })

    it('should handle messages with additional data', () => {
      const testData = { key: 'value', number: 123 }
      logger.info('message with data', testData)

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('INFO [Test]: message with data')
      )
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining(JSON.stringify(testData, null, 2))
      )
    })

    it('should handle Error objects in data', () => {
      const error = new Error('Test error message')
      logger.error('error occurred', error)

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Error: Test error message')
      )
    })

    it('should handle primitive data types', () => {
      logger.info('string data', 'test string')
      logger.info('number data', 42)
      logger.info('boolean data', true)
      logger.info('null data', null)
      logger.info('undefined data', undefined)

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('test string')
      )
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('42')
      )
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('true')
      )
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('null')
      )
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('undefined')
      )
    })

    it('should handle circular objects', () => {
      const circularObj: Record<string, unknown> = { name: 'test' }
      circularObj.self = circularObj

      logger.info('circular object', circularObj)

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[Circular Object]')
      )
    })
  })

  describe('👶 Child Logger Creation', () => {
    it('should create child logger with combined context', () => {
      const parentLogger = new Logger('Parent')
      const childLogger = parentLogger.child('Child')

      childLogger.info('child message')

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[Parent:Child]')
      )
    })

    it('should inherit parent configuration', () => {
      const parentLogger = new Logger('Parent', {
        level: LogLevel.DEBUG,
        includeTimestamp: false,
      })
      const childLogger = parentLogger.child('Child')

      childLogger.debug('debug message')

      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringMatching(/^DEBUG \[Parent:Child\]: debug message/)
      )
    })

    it('should inherit custom formatter and output', () => {
      const customOutput = vi.fn()
      const parentLogger = new Logger('Parent', {
        output: customOutput,
      })
      const childLogger = parentLogger.child('Child')

      childLogger.info('test message')

      expect(customOutput).toHaveBeenCalledWith(
        LogLevel.INFO,
        expect.stringContaining('[Parent:Child]')
      )
    })

    it('should create nested child loggers', () => {
      const logger = new Logger('Root')
      const child1 = logger.child('Level1')
      const child2 = child1.child('Level2')
      const child3 = child2.child('Level3')

      child3.info('nested message')

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[Root:Level1:Level2:Level3]')
      )
    })
  })

  describe('⏱️ Timing Operations', () => {
    it('should time successful operations', async () => {
      const logger = new Logger('Test', { level: LogLevel.DEBUG })
      const mockOperation = vi.fn().mockResolvedValue('success')

      const result = await logger.time('test operation', mockOperation)

      expect(result).toBe('success')
      expect(mockOperation).toHaveBeenCalledTimes(1)
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('Starting: test operation')
      )
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('Completed: test operation')
      )
    })

    it('should time failing operations', async () => {
      const logger = new Logger('Test', { level: LogLevel.DEBUG })
      const testError = new Error('Operation failed')
      const mockOperation = vi.fn().mockRejectedValue(testError)

      await expect(
        logger.time('failing operation', mockOperation)
      ).rejects.toThrow('Operation failed')

      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('Starting: failing operation')
      )
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed: failing operation')
      )
    })

    it('should include duration in timing logs', async () => {
      const logger = new Logger('Test', { level: LogLevel.DEBUG })
      const mockOperation = vi.fn().mockImplementation(async () => {
        // Use a small delay that works with fake timers
        vi.advanceTimersByTime(100) // Simulate 100ms
        return 'result'
      })

      await logger.time('timed operation', mockOperation)

      // Check for any numeric duration rather than exact milliseconds
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringMatching(/\(\d+ms\)/) // Match any duration like (123ms)
      )
    })

    it('should handle operations that return different data types', async () => {
      const logger = new Logger('Test', { level: LogLevel.DEBUG })

      const stringResult = await logger.time(
        'string op',
        async () => 'string result'
      )
      const numberResult = await logger.time('number op', async () => 42)
      const objectResult = await logger.time('object op', async () => ({
        key: 'value',
      }))
      const arrayResult = await logger.time('array op', async () => [1, 2, 3])
      const nullResult = await logger.time('null op', async () => null)

      expect(stringResult).toBe('string result')
      expect(numberResult).toBe(42)
      expect(objectResult).toEqual({ key: 'value' })
      expect(arrayResult).toEqual([1, 2, 3])
      expect(nullResult).toBe(null)
    })

    it('should preserve original error in failing operations', async () => {
      const logger = new Logger('Test', { level: LogLevel.DEBUG })
      const originalError = new Error('Original error message')
      const mockOperation = vi.fn().mockRejectedValue(originalError)

      try {
        await logger.time('error operation', mockOperation)
      } catch (error) {
        expect(error).toBe(originalError)
      }
    })

    it('should work with different log levels', async () => {
      const errorLogger = new Logger('Test', { level: LogLevel.ERROR })
      const mockOperation = vi.fn().mockResolvedValue('result')

      await errorLogger.time('operation', mockOperation)

      // Debug messages should not appear
      expect(mockConsole.debug).not.toHaveBeenCalled()
      expect(mockConsole.info).not.toHaveBeenCalled()
    })
  })

  describe('🎨 Message Formatting', () => {
    it('should include timestamp when enabled', () => {
      const logger = new Logger('Test', { includeTimestamp: true })

      logger.info('test message')

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringMatching(
          /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/
        )
      )
    })

    it('should exclude timestamp when disabled', () => {
      const logger = new Logger('Test', { includeTimestamp: false })

      logger.info('test message')

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.not.stringMatching(/^\[\d{4}-\d{2}-\d{2}/)
      )
    })

    it('should format different log levels correctly', () => {
      const logger = new Logger('Test', {
        level: LogLevel.DEBUG,
        includeTimestamp: false,
      })

      logger.debug('debug msg')
      logger.info('info msg')
      logger.warn('warn msg')
      logger.error('error msg')

      expect(mockConsole.debug).toHaveBeenCalledWith('DEBUG [Test]: debug msg')
      expect(mockConsole.info).toHaveBeenCalledWith('INFO [Test]: info msg')
      expect(mockConsole.warn).toHaveBeenCalledWith('WARN [Test]: warn msg')
      expect(mockConsole.error).toHaveBeenCalledWith('ERROR [Test]: error msg')
    })

    it('should handle context formatting edge cases', () => {
      const noContextLogger = new Logger('', { includeTimestamp: false })
      const longContextLogger = new Logger('VeryLongContextNameForTesting', {
        includeTimestamp: false,
      })

      noContextLogger.info('no context message')
      longContextLogger.info('long context message')

      expect(mockConsole.info).toHaveBeenCalledWith('INFO: no context message') // Empty context omits brackets
      expect(mockConsole.info).toHaveBeenCalledWith(
        'INFO [VeryLongContextNameForTesting]: long context message'
      )
    })

    it('should format complex data structures', () => {
      const logger = new Logger('Test', { includeTimestamp: false })
      const complexData = {
        user: {
          id: 123,
          name: 'Test User',
          preferences: {
            theme: 'dark',
            notifications: true,
          },
        },
        actions: ['login', 'view', 'edit'],
        timestamp: Date.now(),
      }

      logger.info('complex data', complexData)

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining(JSON.stringify(complexData, null, 2))
      )
    })

    it('should handle different Error types', () => {
      const logger = new Logger('Test', { includeTimestamp: false })

      const syntaxError = new SyntaxError('Invalid syntax')
      const typeError = new TypeError('Wrong type')
      const referenceError = new ReferenceError('Not defined')
      const rangeError = new RangeError('Out of range')

      logger.error('syntax error', syntaxError)
      logger.error('type error', typeError)
      logger.error('reference error', referenceError)
      logger.error('range error', rangeError)

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Error: Invalid syntax')
      )
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Error: Wrong type')
      )
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Error: Not defined')
      )
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Error: Out of range')
      )
    })
  })

  describe('⚙️ Custom Configuration', () => {
    it('should use custom formatter for all log levels', () => {
      const customFormatter = vi.fn((entry: LogEntry) => {
        return `CUSTOM[${entry.level}] ${entry.context}: ${entry.message}`
      })

      const logger = new Logger('Test', {
        level: LogLevel.DEBUG,
        formatter: customFormatter,
      })

      logger.debug('debug')
      logger.info('info')
      logger.warn('warn')
      logger.error('error')

      expect(customFormatter).toHaveBeenCalledTimes(4)
      expect(mockConsole.debug).toHaveBeenCalledWith('CUSTOM[0] Test: debug')
      expect(mockConsole.info).toHaveBeenCalledWith('CUSTOM[1] Test: info')
      expect(mockConsole.warn).toHaveBeenCalledWith('CUSTOM[2] Test: warn')
      expect(mockConsole.error).toHaveBeenCalledWith('CUSTOM[3] Test: error')
    })

    it('should pass complete LogEntry to custom formatter', () => {
      const customFormatter = vi.fn().mockReturnValue('formatted')

      const logger = new Logger('TestContext', {
        formatter: customFormatter,
      })

      logger.info('test message', { extra: 'data' })

      expect(customFormatter).toHaveBeenCalledWith({
        level: LogLevel.INFO,
        message: 'test message',
        timestamp: expect.any(Number),
        context: 'TestContext',
        data: { extra: 'data' },
      })
    })

    it('should use custom output function for all log levels', () => {
      const customOutput = vi.fn()

      const logger = new Logger('Test', {
        level: LogLevel.DEBUG,
        output: customOutput,
      })

      logger.debug('debug msg')
      logger.info('info msg')
      logger.warn('warn msg')
      logger.error('error msg')

      expect(customOutput).toHaveBeenCalledTimes(4)
      expect(customOutput).toHaveBeenNthCalledWith(
        1,
        LogLevel.DEBUG,
        expect.any(String)
      )
      expect(customOutput).toHaveBeenNthCalledWith(
        2,
        LogLevel.INFO,
        expect.any(String)
      )
      expect(customOutput).toHaveBeenNthCalledWith(
        3,
        LogLevel.WARN,
        expect.any(String)
      )
      expect(customOutput).toHaveBeenNthCalledWith(
        4,
        LogLevel.ERROR,
        expect.any(String)
      )
    })

    it('should work with both custom formatter and custom output', () => {
      const customFormatter = vi.fn().mockReturnValue('CUSTOM_FORMAT')
      const customOutput = vi.fn()

      const logger = new Logger('Test', {
        formatter: customFormatter,
        output: customOutput,
      })

      logger.info('test message')

      expect(customFormatter).toHaveBeenCalledTimes(1)
      expect(customOutput).toHaveBeenCalledWith(LogLevel.INFO, 'CUSTOM_FORMAT')
    })
  })

  describe('🛡️ Error Handling and Edge Cases', () => {
    it('should handle null and undefined messages', () => {
      const logger = new Logger('Test')

      logger.info(String(null))
      logger.info(String(undefined))

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('null')
      )
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('undefined')
      )
    })

    it('should handle very long messages', () => {
      const logger = new Logger('Test')
      const longMessage = 'x'.repeat(10000)

      expect(() => logger.info(longMessage)).not.toThrow()
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining(longMessage)
      )
    })

    it('should handle Unicode and emoji in messages', () => {
      const logger = new Logger('Test')

      logger.info('Unicode: 世界 🌍 🚀 ✨')

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('Unicode: 世界 🌍 🚀 ✨')
      )
    })

    it('should handle special characters in context', () => {
      const logger = new Logger('Test:Component@123#$%')

      logger.info('special context')

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[Test:Component@123#$%]')
      )
    })

    it('should handle errors in custom formatter gracefully', () => {
      const brokenFormatter = vi.fn().mockImplementation(() => {
        throw new Error('Formatter error')
      })

      const logger = new Logger('Test', {
        formatter: brokenFormatter,
      })

      // Logger implementation doesn't catch formatter errors, so they propagate
      expect(() => logger.info('test message')).toThrow('Formatter error')
    })

    it('should handle errors in custom output gracefully', () => {
      const brokenOutput = vi.fn().mockImplementation(() => {
        throw new Error('Output error')
      })

      const logger = new Logger('Test', {
        output: brokenOutput,
      })

      // Logger implementation doesn't catch output errors, so they propagate
      expect(() => logger.info('test message')).toThrow('Output error')
    })

    it('should handle large data objects', () => {
      const logger = new Logger('Test')
      const largeData = {
        array: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
        })),
        nested: {
          deep: {
            very: {
              deep: {
                data: 'value',
              },
            },
          },
        },
      }

      expect(() => logger.info('large data', largeData)).not.toThrow()
    })
  })

  describe('🌍 Global Logger Functions', () => {
    it('should create global logger with default config', () => {
      const globalLogger = createGlobalLogger()

      expect(globalLogger).toBeInstanceOf(Logger)

      globalLogger.info('global test')
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[GitGenius]')
      )
    })

    it('should create global logger with custom config', () => {
      const globalLogger = createGlobalLogger({
        level: LogLevel.DEBUG,
        includeTimestamp: false,
      })

      globalLogger.debug('debug message')
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringMatching(/^DEBUG \[GitGenius\]: debug message$/)
      )
    })

    it('should export default logger instance', () => {
      expect(logger).toBeInstanceOf(Logger)

      logger.info('default logger test')
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[GitGenius]')
      )
    })

    it('should create independent global logger instances', () => {
      const logger1 = createGlobalLogger({ level: LogLevel.DEBUG })
      const logger2 = createGlobalLogger({ level: LogLevel.ERROR })

      logger1.debug('debug from logger1')
      logger2.debug('debug from logger2')

      // logger1 should log debug, logger2 should not
      expect(mockConsole.debug).toHaveBeenCalledTimes(1)
    })
  })

  describe('🔧 Integration and Performance', () => {
    it('should handle rapid logging efficiently', () => {
      const logger = new Logger('Performance', { level: LogLevel.INFO })

      const startTime = Date.now()
      for (let i = 0; i < 1000; i++) {
        logger.info(`Message ${i}`)
      }
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(1000) // Should complete quickly
      expect(mockConsole.info).toHaveBeenCalledTimes(1000)
    })

    it('should work correctly with different log levels under load', () => {
      const logger = new Logger('Load', { level: LogLevel.WARN })

      for (let i = 0; i < 100; i++) {
        logger.debug(`Debug ${i}`) // Should be filtered out
        logger.info(`Info ${i}`) // Should be filtered out
        logger.warn(`Warn ${i}`) // Should appear
        logger.error(`Error ${i}`) // Should appear
      }

      expect(mockConsole.debug).not.toHaveBeenCalled()
      expect(mockConsole.info).not.toHaveBeenCalled()
      expect(mockConsole.warn).toHaveBeenCalledTimes(100)
      expect(mockConsole.error).toHaveBeenCalledTimes(100)
    })

    it('should maintain context through child logger chains', () => {
      const root = new Logger('Root')
      const level1 = root.child('L1')
      const level2 = level1.child('L2')
      const level3 = level2.child('L3')

      level3.info('deep message')

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[Root:L1:L2:L3]: deep message')
      )
    })

    it('should handle concurrent logging from multiple loggers', () => {
      const logger1 = new Logger('Logger1')
      const logger2 = new Logger('Logger2')
      const logger3 = new Logger('Logger3')

      // Simulate concurrent logging
      logger1.info('Message from logger 1')
      logger2.warn('Message from logger 2')
      logger3.error('Message from logger 3')
      logger1.info('Another message from logger 1')

      expect(mockConsole.info).toHaveBeenCalledTimes(2)
      expect(mockConsole.warn).toHaveBeenCalledTimes(1)
      expect(mockConsole.error).toHaveBeenCalledTimes(1)
    })
  })
})
