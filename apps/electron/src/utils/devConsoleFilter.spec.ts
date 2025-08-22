/**
 * @fileoverview Merged comprehensive tests for DevConsoleFilter system
 *
 * @description
 * Consolidated test suite combining all DevConsoleFilter test variants:
 * - Core DevConsoleFilter functionality with console method interception
 * - Development environment harmless message filtering
 * - Console output filtering and noise reduction
 * - Environment-specific behavior testing
 * - Integration with Electron development tools
 *
 * @remarks
 * This file merges 4 separate test files:
 * - apps/electron/src/devConsoleFilter.spec.ts (main tests)
 * - apps/electron/src/devConsoleFilter.simple.spec.ts (simple coverage tests)
 * - apps/electron/src/utils/devConsoleFilter.spec.ts (utils location tests)
 * - apps/electron/src/utils/devConsoleFilter.simple.spec.ts (utils simple tests)
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  setupDevConsoleFilter,
  isHarmlessDevToolsMessage,
} from './devConsoleFilter'

// Global test setup for robust cleanup
let timeoutCleanupRegistry: number[] = []
let intervalCleanupRegistry: number[] = []

// Mock setTimeout and setInterval to track them for cleanup
const originalSetTimeout = global.setTimeout
const originalSetInterval = global.setInterval

beforeEach(() => {
  // Clear registries
  timeoutCleanupRegistry = []
  intervalCleanupRegistry = []

  // Mock setTimeout and setInterval to track them
  vi.spyOn(global, 'setTimeout').mockImplementation((callback, delay) => {
    const id = originalSetTimeout(callback, delay)
    timeoutCleanupRegistry.push(id)
    return id
  })

  vi.spyOn(global, 'setInterval').mockImplementation((callback, delay) => {
    const id = originalSetInterval(callback, delay)
    intervalCleanupRegistry.push(id)
    return id
  })
})

afterEach(() => {
  // Clean up all timeouts and intervals
  timeoutCleanupRegistry.forEach((id) => {
    try {
      clearTimeout(id)
    } catch {
      // Silently handle cleanup errors
    }
  })

  intervalCleanupRegistry.forEach((id) => {
    try {
      clearInterval(id)
    } catch {
      // Silently handle cleanup errors
    }
  })

  // Clear registries
  timeoutCleanupRegistry = []
  intervalCleanupRegistry = []
})

// MERGED TEST SUITES BEGIN HERE
// ====================================

// 1. MAIN DEVCONSOLEFILTER TESTS (from devConsoleFilter.spec.ts)
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

    // Clean up environment
    delete process.env.NODE_ENV
    vi.restoreAllMocks()
  })

  describe('setupDevConsoleFilter', () => {
    it('should filter harmless DevTools messages in development', () => {
      const errorSpy = vi.fn()
      const warnSpy = vi.fn()
      console.error = errorSpy
      console.warn = warnSpy

      setupDevConsoleFilter()

      // Test harmless messages that should be filtered (real patterns)
      console.error(
        "Request Autofill.enable failed. 'Autofill.enable' wasn't found"
      )
      console.warn('Secure coding is not enabled for restorable state')
      console.error('CoreText note: Client requested name')

      // Should not call original console methods for harmless messages
      expect(errorSpy).not.toHaveBeenCalled()
      expect(warnSpy).not.toHaveBeenCalled()
    })

    it('should allow important messages through', () => {
      const errorSpy = vi.fn()
      console.error = errorSpy

      setupDevConsoleFilter()

      // Test important error that should not be filtered
      console.error('Critical application error')

      expect(errorSpy).toHaveBeenCalledWith(
        '[MAIN]',
        'Critical application error'
      )
    })

    it('should not setup filtering in production', () => {
      process.env.NODE_ENV = 'production'

      const errorSpy = vi.fn()
      console.error = errorSpy

      setupDevConsoleFilter()

      // In production, all messages should pass through
      console.error(
        'DevTools listening on ws://127.0.0.1:9222/devtools/browser'
      )

      expect(errorSpy).toHaveBeenCalledWith(
        'DevTools listening on ws://127.0.0.1:9222/devtools/browser'
      )
    })
  })

  describe('isHarmlessDevToolsMessage', () => {
    it('should identify Autofill API messages as harmless', () => {
      expect(
        isHarmlessDevToolsMessage(
          "Request Autofill.enable failed. 'Autofill.enable' wasn't found"
        )
      ).toBe(true)
    })

    it('should identify macOS warnings as harmless', () => {
      expect(
        isHarmlessDevToolsMessage(
          'Secure coding is not enabled for restorable state'
        )
      ).toBe(true)
    })

    it('should identify CoreText notes as harmless', () => {
      expect(
        isHarmlessDevToolsMessage('CoreText note: Client requested name')
      ).toBe(true)
    })

    it('should identify important errors as harmful', () => {
      expect(isHarmlessDevToolsMessage('Critical application error')).toBe(
        false
      )
      expect(
        isHarmlessDevToolsMessage('Uncaught TypeError: Cannot read property')
      ).toBe(false)
      expect(
        isHarmlessDevToolsMessage('ReferenceError: variable is not defined')
      ).toBe(false)
    })

    it('should handle empty or null messages', () => {
      expect(isHarmlessDevToolsMessage('')).toBe(false)
      expect(isHarmlessDevToolsMessage(null as unknown)).toBe(false)
      expect(isHarmlessDevToolsMessage(undefined as unknown)).toBe(false)
    })
  })

  describe('Environment-specific behavior', () => {
    it('should behave differently in test environment', () => {
      process.env.NODE_ENV = 'test'

      const errorSpy = vi.fn()
      console.error = errorSpy

      setupDevConsoleFilter()

      // In test environment, filtering should NOT work (only in development)
      console.error(
        "Request Autofill.enable failed. 'Autofill.enable' wasn't found"
      )

      expect(errorSpy).toHaveBeenCalled()
    })

    it('should handle missing NODE_ENV', () => {
      delete process.env.NODE_ENV

      const errorSpy = vi.fn()
      console.error = errorSpy

      setupDevConsoleFilter()

      // Should default to no filtering when NODE_ENV is undefined (not development)
      console.error(
        "Request Autofill.enable failed. 'Autofill.enable' wasn't found"
      )

      expect(errorSpy).toHaveBeenCalled()
    })
  })
})

// 2. SIMPLE COVERAGE TESTS (from devConsoleFilter.simple.spec.ts)
describe('DevConsoleFilter Simple Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should import DevConsoleFilter module without errors', async () => {
    const module = await import('./devConsoleFilter')
    expect(module.setupDevConsoleFilter).toBeDefined()
    expect(module.isHarmlessDevToolsMessage).toBeDefined()
  })

  it('should export setupDevConsoleFilter function', () => {
    expect(typeof setupDevConsoleFilter).toBe('function')
  })

  it('should export isHarmlessDevToolsMessage function', () => {
    expect(typeof isHarmlessDevToolsMessage).toBe('function')
  })

  it('should handle function calls without crashing', () => {
    expect(() => setupDevConsoleFilter()).not.toThrow()
    expect(() => isHarmlessDevToolsMessage('test message')).not.toThrow()
  })

  it('should return boolean from isHarmlessDevToolsMessage', () => {
    const result = isHarmlessDevToolsMessage('test message')
    expect(typeof result).toBe('boolean')
  })
})

// 3. UTILS LOCATION SPECIFIC TESTS (from utils/devConsoleFilter.spec.ts)
describe('DevConsoleFilter Utils Location Tests', () => {
  let originalConsole: {
    error: typeof console.error
    warn: typeof console.warn
    log: typeof console.log
  }

  beforeEach(() => {
    originalConsole = {
      error: console.error,
      warn: console.warn,
      log: console.log,
    }
    process.env.NODE_ENV = 'development'
  })

  afterEach(() => {
    console.error = originalConsole.error
    console.warn = originalConsole.warn
    console.log = originalConsole.log
    delete process.env.NODE_ENV
    vi.restoreAllMocks()
  })

  describe('Utils-specific functionality', () => {
    it('should handle console interception from utils location', () => {
      const errorSpy = vi.fn()
      console.error = errorSpy

      setupDevConsoleFilter()

      console.error(
        "Request Autofill.enable failed. 'Autofill.enable' wasn't found"
      )
      expect(errorSpy).not.toHaveBeenCalled()
    })

    it('should validate message patterns correctly', () => {
      const devToolsPatterns = [
        "Request Autofill.enable failed. 'Autofill.enable' wasn't found",
        'Secure coding is not enabled for restorable state',
        'CoreText note: Client requested name',
        'Unsupported engine: wanted 16.17.0, current: 18.17.0',
        '`node_modules` is present. Lockfile only installation will make it out-of-date',
      ]

      devToolsPatterns.forEach((pattern) => {
        expect(isHarmlessDevToolsMessage(pattern)).toBe(true)
      })
    })

    it('should handle multiple console method wrapping', () => {
      const errorSpy = vi.fn()
      const warnSpy = vi.fn()
      const logSpy = vi.fn()

      console.error = errorSpy
      console.warn = warnSpy
      console.log = logSpy

      setupDevConsoleFilter()

      // Test all console methods
      console.error('Secure coding is not enabled for restorable state')
      console.warn('CoreText note: Client requested name')
      console.log('This should pass through')

      expect(errorSpy).not.toHaveBeenCalled()
      expect(warnSpy).not.toHaveBeenCalled()
      expect(logSpy).toHaveBeenCalledWith('[MAIN]', 'This should pass through')
    })
  })
})

// 4. UTILS SIMPLE COVERAGE TESTS (from utils/devConsoleFilter.simple.spec.ts)
describe('DevConsoleFilter Utils Simple Coverage', () => {
  it('should provide complete module coverage from utils location', async () => {
    const module = await import('./devConsoleFilter')

    expect(module).toBeDefined()
    expect(typeof module.setupDevConsoleFilter).toBe('function')
    expect(typeof module.isHarmlessDevToolsMessage).toBe('function')
  })

  it('should handle edge cases in message filtering', () => {
    const edgeCases = ['', ' ', '\n', '\t', 'null', 'undefined', '0', 'false']

    edgeCases.forEach((testCase) => {
      expect(() => isHarmlessDevToolsMessage(testCase)).not.toThrow()
      expect(typeof isHarmlessDevToolsMessage(testCase)).toBe('boolean')
    })
  })

  it('should maintain function stability across multiple calls', () => {
    for (let i = 0; i < 10; i++) {
      expect(() => setupDevConsoleFilter()).not.toThrow()
      expect(isHarmlessDevToolsMessage('test')).toBe(false)
    }
  })

  it('should handle concurrent setup calls gracefully', () => {
    expect(() => {
      setupDevConsoleFilter()
      setupDevConsoleFilter()
      setupDevConsoleFilter()
    }).not.toThrow()
  })
})

// 5. INTEGRATION AND CROSS-CUTTING TESTS
describe('DevConsoleFilter Integration Tests', () => {
  it('should work correctly across different import patterns', async () => {
    // Test that both import methods work
    const directImport = await import('./devConsoleFilter')

    expect(directImport.setupDevConsoleFilter).toBeDefined()
    expect(directImport.isHarmlessDevToolsMessage).toBeDefined()
  })

  it('should maintain consistent behavior across test scenarios', () => {
    const testMessages = [
      "Request Autofill.enable failed. 'Autofill.enable' wasn't found",
      'Secure coding is not enabled for restorable state',
      'CoreText note: Client requested name',
      'Critical application error',
      'Uncaught TypeError: Cannot read property',
    ]

    const expectedResults = [true, true, true, false, false]

    testMessages.forEach((message, index) => {
      expect(isHarmlessDevToolsMessage(message)).toBe(expectedResults[index])
    })
  })

  it('should handle environment transitions correctly', () => {
    const originalEnv = process.env.NODE_ENV

    try {
      // Test development
      process.env.NODE_ENV = 'development'
      expect(() => setupDevConsoleFilter()).not.toThrow()

      // Test production
      process.env.NODE_ENV = 'production'
      expect(() => setupDevConsoleFilter()).not.toThrow()

      // Test test environment
      process.env.NODE_ENV = 'test'
      expect(() => setupDevConsoleFilter()).not.toThrow()
    } finally {
      process.env.NODE_ENV = originalEnv
    }
  })
})
