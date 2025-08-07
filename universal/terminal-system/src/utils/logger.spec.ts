/**
 * @fileoverview Tests for Logger utility class.
 *
 * @description
 * Tests the Logger class functionality including message formatting,
 * different log levels, and environment-specific behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Logger } from './logger'

describe('Logger', () => {
  let logger: Logger
  let consoleSpies: {
    debug: ReturnType<typeof vi.spyOn>
    info: ReturnType<typeof vi.spyOn>
    warn: ReturnType<typeof vi.spyOn>
    error: ReturnType<typeof vi.spyOn>
  }

  beforeEach(() => {
    // Spy on console methods
    consoleSpies = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Constructor', () => {
    it('should create logger with default prefix', () => {
      logger = new Logger()
      logger.info('test message')

      expect(consoleSpies.info).toHaveBeenCalledWith(
        expect.stringContaining('[TerminalSystem]')
      )
    })

    it('should create logger with custom prefix', () => {
      logger = new Logger('CustomLogger')
      logger.info('test message')

      expect(consoleSpies.info).toHaveBeenCalledWith(
        expect.stringContaining('[CustomLogger]')
      )
    })
  })

  describe('Message Formatting', () => {
    beforeEach(() => {
      logger = new Logger('TestLogger')
    })

    it('should format message with timestamp, prefix, and level', () => {
      const testMessage = 'test message'
      logger.info(testMessage)

      const [formattedMessage] = consoleSpies.info.mock.calls[0]

      expect(formattedMessage).toMatch(
        /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/
      )
      expect(formattedMessage).toContain('[TestLogger]')
      expect(formattedMessage).toContain('[INFO]')
      expect(formattedMessage).toContain(testMessage)
    })
  })

  describe('Log Levels', () => {
    beforeEach(() => {
      logger = new Logger('TestLogger')
    })

    describe('debug', () => {
      it('should log debug messages in development environment', () => {
        const originalEnv = process.env.NODE_ENV
        process.env.NODE_ENV = 'development'

        logger.debug('debug message', { extra: 'data' })

        expect(consoleSpies.debug).toHaveBeenCalledWith(
          expect.stringContaining('[DEBUG] debug message'),
          { extra: 'data' }
        )

        process.env.NODE_ENV = originalEnv
      })

      it('should not log debug messages in non-development environment', () => {
        const originalEnv = process.env.NODE_ENV
        process.env.NODE_ENV = 'production'

        logger.debug('debug message')

        expect(consoleSpies.debug).not.toHaveBeenCalled()

        process.env.NODE_ENV = originalEnv
      })
    })

    describe('info', () => {
      it('should log info messages with additional arguments', () => {
        const extraData = { key: 'value' }
        logger.info('info message', extraData, 123)

        expect(consoleSpies.info).toHaveBeenCalledWith(
          expect.stringContaining('[INFO] info message'),
          extraData,
          123
        )
      })
    })

    describe('warn', () => {
      it('should log warning messages', () => {
        logger.warn('warning message')

        expect(consoleSpies.warn).toHaveBeenCalledWith(
          expect.stringContaining('[WARN] warning message')
        )
      })
    })

    describe('error', () => {
      it('should log error messages with Error object', () => {
        const error = new Error('Test error')
        logger.error('error message', error)

        expect(consoleSpies.error).toHaveBeenCalledWith(
          expect.stringContaining('[ERROR] error message'),
          error
        )
      })

      it('should log error messages without Error object', () => {
        logger.error('error message')

        expect(consoleSpies.error).toHaveBeenCalledWith(
          expect.stringContaining('[ERROR] error message'),
          undefined
        )
      })

      it('should log error messages with additional arguments', () => {
        const error = new Error('Test error')
        const context = { userId: 123 }

        logger.error('error message', error, context, 'extra')

        expect(consoleSpies.error).toHaveBeenCalledWith(
          expect.stringContaining('[ERROR] error message'),
          error,
          context,
          'extra'
        )
      })
    })
  })

  describe('Edge Cases', () => {
    beforeEach(() => {
      logger = new Logger('EdgeCaseLogger')
    })

    it('should handle empty prefix', () => {
      const emptyLogger = new Logger('')
      emptyLogger.info('test')

      expect(consoleSpies.info).toHaveBeenCalledWith(
        expect.stringContaining('[] [INFO]')
      )
    })

    it('should handle special characters in messages', () => {
      const specialMessage = 'Test with "quotes" and \\backslashes\\ and 日本語'
      logger.info(specialMessage)

      expect(consoleSpies.info).toHaveBeenCalledWith(
        expect.stringContaining(specialMessage)
      )
    })

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(1000)
      logger.info(longMessage)

      expect(consoleSpies.info).toHaveBeenCalledWith(
        expect.stringContaining(longMessage)
      )
    })
  })
})
