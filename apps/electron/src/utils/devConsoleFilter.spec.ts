import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  setupDevConsoleFilter,
  isHarmlessDevToolsMessage,
} from './devConsoleFilter'

describe('DevConsoleFilter', () => {
  let originalConsole: {
    error: typeof console.error
    warn: typeof console.warn
    log: typeof console.log
  }

  beforeEach(() => {
    // Store original console methods
    originalConsole = {
      error: console.error,
      warn: console.warn,
      log: console.log,
    }

    // Set development environment
    process.env.NODE_ENV = 'development'
  })

  afterEach(() => {
    // Restore original console methods
    console.error = originalConsole.error
    console.warn = originalConsole.warn
    console.log = originalConsole.log
  })

  describe('setupDevConsoleFilter', () => {
    it('should setup console filtering when enabled in development', () => {
      const filter = setupDevConsoleFilter({ enabled: true })

      expect(filter).toBeDefined()
      expect(filter).toHaveProperty('restore')
      expect(typeof filter.restore).toBe('function')
    })

    it('should not setup filtering when disabled', () => {
      const filter = setupDevConsoleFilter({ enabled: false })

      expect(filter).toBeUndefined()
    })

    it('should not setup filtering in production environment', () => {
      process.env.NODE_ENV = 'production'

      const filter = setupDevConsoleFilter({ enabled: true })

      expect(filter).toBeUndefined()
    })

    it('should use default options when none provided', () => {
      const filter = setupDevConsoleFilter()

      expect(filter).toBeDefined()
      expect(filter).toHaveProperty('restore')
    })

    it('should filter harmless console.error messages', () => {
      const errorSpy = vi.fn()
      console.error = errorSpy

      setupDevConsoleFilter({ enabled: true })

      // Test harmless message (should be filtered)
      console.error(
        "Request Autofill.enable failed 'Autofill.enable' wasn't found"
      )
      expect(errorSpy).not.toHaveBeenCalled()

      // Test important message (should NOT be filtered)
      console.error('This is an important error')
      expect(errorSpy).toHaveBeenCalledWith(
        '[MAIN]',
        'This is an important error'
      )
    })

    it('should filter harmless console.warn messages', () => {
      const warnSpy = vi.fn()
      console.warn = warnSpy

      setupDevConsoleFilter({ enabled: true })

      // Test harmless message (should be filtered)
      console.warn('Secure coding is not enabled for restorable state')
      expect(warnSpy).not.toHaveBeenCalled()

      // Test important message (should NOT be filtered)
      console.warn('This is an important warning')
      expect(warnSpy).toHaveBeenCalledWith(
        '[MAIN]',
        'This is an important warning'
      )
    })

    it('should filter harmless console.log messages', () => {
      const logSpy = vi.fn()
      console.log = logSpy

      setupDevConsoleFilter({ enabled: true })

      // Test harmless message (should be filtered)
      console.log(
        'chrome-devtools-frontend.appspot.com Unexpected token HTTP/1.1 4'
      )
      expect(logSpy).not.toHaveBeenCalled()

      // Test important message (should NOT be filtered)
      console.log('This is an important log')
      expect(logSpy).toHaveBeenCalledWith('[MAIN]', 'This is an important log')
    })

    it('should handle multiple arguments in console calls', () => {
      const errorSpy = vi.fn()
      console.error = errorSpy

      setupDevConsoleFilter({ enabled: true })

      // Test with multiple arguments
      console.error('Error:', 'Something went wrong', { code: 500 })
      expect(errorSpy).toHaveBeenCalledWith(
        '[MAIN]',
        'Error:',
        'Something went wrong',
        { code: 500 }
      )
    })

    it('should restore original console methods', () => {
      const originalError = console.error
      const originalWarn = console.warn
      const originalLog = console.log

      const filter = setupDevConsoleFilter({ enabled: true })

      // Verify console methods have been replaced
      expect(console.error).not.toBe(originalError)
      expect(console.warn).not.toBe(originalWarn)
      expect(console.log).not.toBe(originalLog)

      // Restore and verify
      filter.restore()
      expect(console.error).toBe(originalError)
      expect(console.warn).toBe(originalWarn)
      expect(console.log).toBe(originalLog)
    })

    it('should test all harmless patterns', () => {
      const errorSpy = vi.fn()
      console.error = errorSpy

      setupDevConsoleFilter({ enabled: true })

      // Test all harmless patterns
      const harmlessMessages = [
        "Request Autofill.enable failed 'Autofill.enable' wasn't found",
        "Request Autofill.setAddresses failed 'Autofill.setAddresses' wasn't found",
        'chrome-devtools-frontend.appspot.com Unexpected token HTTP/1.1 4',
        "Unexpected token 'H' HTTP/1.1 4 is not valid JSON",
        "devtools://devtools/ Unexpected token 'H'",
        'Secure coding is not enabled for restorable state',
        'CoreText note: Client requested name',
        'Unsupported engine: wanted current:',
        'deprecated subdependencies found:',
        '`node_modules` is present. Lockfile only installation will make it out-of-date',
      ]

      harmlessMessages.forEach((message) => {
        errorSpy.mockClear()
        console.error(message)
        expect(errorSpy).not.toHaveBeenCalled()
      })
    })
  })

  describe('isHarmlessDevToolsMessage', () => {
    it('should return true for harmless messages', () => {
      const harmlessMessages = [
        "Request Autofill.enable failed 'Autofill.enable' wasn't found",
        'Secure coding is not enabled for restorable state',
        'chrome-devtools-frontend.appspot.com Unexpected token HTTP/1.1 4',
      ]

      harmlessMessages.forEach((message) => {
        expect(isHarmlessDevToolsMessage(message)).toBe(true)
      })
    })

    it('should return false for important messages', () => {
      const importantMessages = [
        'Uncaught TypeError: Cannot read property',
        'Failed to load resource',
        'Unhandled promise rejection',
        'This is a custom error message',
      ]

      importantMessages.forEach((message) => {
        expect(isHarmlessDevToolsMessage(message)).toBe(false)
      })
    })

    it('should handle empty and undefined messages', () => {
      expect(isHarmlessDevToolsMessage('')).toBe(false)
      expect(isHarmlessDevToolsMessage('   ')).toBe(false)
    })

    it('should be case sensitive', () => {
      expect(isHarmlessDevToolsMessage('request autofill.enable failed')).toBe(
        false
      )
      expect(
        isHarmlessDevToolsMessage(
          "Request Autofill.enable failed 'Autofill.enable' wasn't found"
        )
      ).toBe(true)
    })

    it('should match partial strings in larger messages', () => {
      const message =
        "Some prefix Request Autofill.enable failed 'Autofill.enable' wasn't found some suffix"
      expect(isHarmlessDevToolsMessage(message)).toBe(true)
    })
  })

  describe('pattern testing', () => {
    it('should test regex pattern matching', () => {
      // Test specific regex patterns
      const autofillPattern =
        /Request Autofill\.enable failed.*'Autofill\.enable' wasn't found/
      expect(
        autofillPattern.test(
          "Request Autofill.enable failed 'Autofill.enable' wasn't found"
        )
      ).toBe(true)

      const devtoolsPattern =
        /chrome-devtools-frontend\.appspot\.com.*Unexpected token.*HTTP\/1\.1 4/
      expect(
        devtoolsPattern.test(
          'chrome-devtools-frontend.appspot.com Unexpected token HTTP/1.1 4'
        )
      ).toBe(true)
    })

    it('should test environment variable checks', () => {
      // Test different NODE_ENV values
      process.env.NODE_ENV = 'production'
      expect(setupDevConsoleFilter({ enabled: true })).toBeUndefined()

      process.env.NODE_ENV = 'test'
      expect(setupDevConsoleFilter({ enabled: true })).toBeUndefined()

      process.env.NODE_ENV = 'development'
      expect(setupDevConsoleFilter({ enabled: true })).toBeDefined()
    })
  })
})
