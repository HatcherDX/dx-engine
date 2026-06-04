/**
 * @fileoverview Tests for TerminalReadyDetector - Intelligent shell prompt detection.
 *
 * @description
 * Comprehensive test suite covering all functionality of the TerminalReadyDetector class
 * including constructor options, pattern detection, timeout handling, and state management.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Create shared mock logger instance - must be defined before mocking
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

// Mock Logger module using doMock for better control
vi.doMock('../utils/logger', () => ({
  Logger: class {
    debug = mockLogger.debug
    info = mockLogger.info
    warn = mockLogger.warn
    error = mockLogger.error
  },
}))

const { TerminalReadyDetector } = await import('./TerminalReadyDetector')
import type { TerminalReadyDetectorOptions } from './TerminalReadyDetector'

describe('TerminalReadyDetector', () => {
  let detector: TerminalReadyDetector

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()

    detector = new TerminalReadyDetector()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('Constructor', () => {
    it('should create detector with default options', () => {
      const detector = new TerminalReadyDetector()
      const options = (
        detector as unknown as {
          options: Required<TerminalReadyDetectorOptions>
          buffer: string
          lastDataTime: number
          readyCallbacks: Array<() => void>
        }
      ).options

      expect(options.timeout).toBe(5000)
      expect(options.customPatterns).toEqual([])
      expect(options.minDataLength).toBe(1)
      expect(options.debug).toBe(false)
    })

    it('should create detector with custom options', () => {
      const customOptions: TerminalReadyDetectorOptions = {
        timeout: 3000,
        customPatterns: [/custom>/],
        minDataLength: 5,
        debug: true,
      }

      const detector = new TerminalReadyDetector(customOptions)
      const options = (
        detector as unknown as {
          options: Required<TerminalReadyDetectorOptions>
          buffer: string
          lastDataTime: number
          readyCallbacks: Array<() => void>
        }
      ).options

      expect(options.timeout).toBe(3000)
      expect(options.customPatterns).toEqual([/custom>/])
      expect(options.minDataLength).toBe(5)
      expect(options.debug).toBe(true)
    })

    it('should handle partial options', () => {
      const detector = new TerminalReadyDetector({ timeout: 2000 })
      const options = (
        detector as unknown as {
          options: Required<TerminalReadyDetectorOptions>
          buffer: string
          lastDataTime: number
          readyCallbacks: Array<() => void>
        }
      ).options

      expect(options.timeout).toBe(2000)
      expect(options.customPatterns).toEqual([])
      expect(options.minDataLength).toBe(1)
      expect(options.debug).toBe(false)
    })

    it('should handle falsy values correctly', () => {
      const detector = new TerminalReadyDetector({
        timeout: 0,
        debug: false,
        minDataLength: 0,
      })
      const options = (
        detector as unknown as {
          options: Required<TerminalReadyDetectorOptions>
          buffer: string
          lastDataTime: number
          readyCallbacks: Array<() => void>
        }
      ).options

      expect(options.timeout).toBe(0)
      expect(options.debug).toBe(false)
      expect(options.minDataLength).toBe(0)
    })
  })

  describe('checkData method', () => {
    it('should return true if already ready', () => {
      detector.forceReady()
      expect(detector.checkData('$ ')).toBe(true)
    })

    it('should return false for data shorter than minDataLength', () => {
      const detector = new TerminalReadyDetector({ minDataLength: 5 })
      expect(detector.checkData('$')).toBe(false)
    })

    it('should detect bash prompts', () => {
      expect(detector.checkData('user@host:~$ ')).toBe(true)
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Terminal ready - prompt detected'
      )
    })

    it('should detect zsh prompts', () => {
      // The actual patterns match $ and > prompts
      expect(detector.checkData('user@host ~ $ ')).toBe(true)
      expect(detector.checkData('user@host ~ > ')).toBe(true)
    })

    it('should detect fish shell prompts', () => {
      expect(detector.checkData('user@host ~> ')).toBe(true)
    })

    it('should detect PowerShell prompts', () => {
      expect(detector.checkData('PS C:\\Users\\user> ')).toBe(true)
      expect(detector.checkData('PS> ')).toBe(true)
    })

    it('should detect Windows Command Prompt', () => {
      expect(detector.checkData('C:\\Users\\user>')).toBe(true)
    })

    it('should detect custom prompts', () => {
      expect(detector.checkData('[user@host]$ ')).toBe(true)
      expect(detector.checkData('(venv)> ')).toBe(true)
      expect(detector.checkData('❯ ')).toBe(true)
      expect(detector.checkData('➜ ')).toBe(true)
      expect(detector.checkData('λ ')).toBe(true)
    })

    it('should detect REPL prompts', () => {
      expect(detector.checkData('> ')).toBe(true)
      expect(detector.checkData('>>> ')).toBe(true)
      expect(detector.checkData('irb(main):001:0> ')).toBe(true)
    })

    it('should detect custom patterns from options', () => {
      const detector = new TerminalReadyDetector({
        customPatterns: [/custom\s*>/],
      })
      expect(detector.checkData('custom> ')).toBe(true)
    })

    it('should return false for initialization patterns', () => {
      expect(detector.checkData('Loading...')).toBe(false)
      expect(detector.checkData('Initializing system')).toBe(false)
      expect(detector.checkData('Starting application')).toBe(false)
      expect(detector.checkData('Welcome to Ubuntu')).toBe(false)
      expect(detector.checkData('Last login: Mon Sep 16')).toBe(false)
      expect(detector.checkData('Mon Sep 16 10:30:15')).toBe(false)
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Still initializing, detected init pattern'
      )
    })

    it('should accumulate data in buffer', () => {
      detector.checkData('user@host')
      detector.checkData(':~$ ')
      expect(detector.getIsReady()).toBe(true)
    })

    it('should trim buffer to prevent memory issues', () => {
      // Add more than 500 characters
      const longData = 'a'.repeat(600)
      detector.checkData(longData)

      const buffer = (
        detector as unknown as {
          options: Required<TerminalReadyDetectorOptions>
          buffer: string
          lastDataTime: number
          readyCallbacks: Array<() => void>
        }
      ).buffer
      expect(buffer.length).toBe(500)
      expect(buffer).toBe('a'.repeat(500))
    })

    it('should update lastDataTime', () => {
      const beforeTime = Date.now()
      detector.checkData('test')
      const afterTime = Date.now()

      const lastDataTime = (
        detector as unknown as {
          options: Required<TerminalReadyDetectorOptions>
          buffer: string
          lastDataTime: number
          readyCallbacks: Array<() => void>
        }
      ).lastDataTime
      expect(lastDataTime).toBeGreaterThanOrEqual(beforeTime)
      expect(lastDataTime).toBeLessThanOrEqual(afterTime)
    })

    it('should log debug information', () => {
      detector.checkData('test data')
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Checking data:',
        'test data'
      )
    })

    it('should use heuristic detection', () => {
      detector.checkData('some initial output\n')
      detector.checkData('user prompt ')
      expect(detector.getIsReady()).toBe(true)
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Terminal ready - heuristic match'
      )
    })

    it('should not trigger heuristic for single line', () => {
      detector.checkData('user prompt ')
      expect(detector.getIsReady()).toBe(false)
    })

    it('should not trigger heuristic for long lines', () => {
      detector.checkData('some output\n')
      detector.checkData('a'.repeat(150) + ' ')
      expect(detector.getIsReady()).toBe(false)
    })

    it('should not trigger heuristic for content without trailing space', () => {
      // Test content without trailing space - should not trigger heuristic due to no space
      const detector = new TerminalReadyDetector()
      detector.checkData('some output\n')
      detector.checkData('valid text without space') // No trailing space
      expect(detector.getIsReady()).toBe(false)
    })

    it('should not trigger heuristic for ANSI escapes', () => {
      detector.checkData('some output\n')
      detector.checkData('[31mcolor ')
      expect(detector.getIsReady()).toBe(false)
    })

    it('should not trigger heuristic without trailing space', () => {
      detector.checkData('some output\n')
      detector.checkData('prompt')
      expect(detector.getIsReady()).toBe(false)
    })
  })

  describe('waitForReady method', () => {
    it('should resolve immediately if already ready', async () => {
      detector.forceReady()
      const start = Date.now()
      await detector.waitForReady()
      const duration = Date.now() - start
      expect(duration).toBeLessThan(10)
    })

    it('should resolve when detector becomes ready', async () => {
      const promise = detector.waitForReady()

      // Simulate async operation
      setTimeout(() => {
        detector.checkData('user@host:~$ ')
      }, 100)

      vi.advanceTimersByTime(100)
      await promise

      expect(detector.getIsReady()).toBe(true)
    })

    it('should timeout and mark as ready', async () => {
      const detector = new TerminalReadyDetector({ timeout: 1000 })
      const detectorLogger = (
        detector as unknown as {
          options: Required<TerminalReadyDetectorOptions>
          buffer: string
          lastDataTime: number
          readyCallbacks: Array<() => void>
        }
      ).logger
      const promise = detector.waitForReady()

      vi.advanceTimersByTime(1000)
      await promise

      expect(detector.getIsReady()).toBe(true)
      expect(detectorLogger.warn).toHaveBeenCalledWith(
        'Terminal ready detection timed out'
      )
    })

    it('should handle multiple waiters', async () => {
      const promise1 = detector.waitForReady()
      const promise2 = detector.waitForReady()

      setTimeout(() => {
        detector.forceReady()
      }, 50)

      vi.advanceTimersByTime(50)

      await Promise.all([promise1, promise2])
      expect(detector.getIsReady()).toBe(true)
    })

    it('should clear timeout when ready via checkData', async () => {
      const detector = new TerminalReadyDetector({ timeout: 5000 })
      const promise = detector.waitForReady()

      // Make ready before timeout
      setTimeout(() => {
        detector.checkData('$ ')
      }, 100)

      vi.advanceTimersByTime(100)
      await promise

      // Should not timeout after being ready
      vi.advanceTimersByTime(5000)
      expect(detector.getIsReady()).toBe(true)
    })
  })

  describe('reset method', () => {
    it('should reset all state', () => {
      detector.checkData('test data')
      detector.forceReady()

      detector.reset()

      expect(detector.getIsReady()).toBe(false)
      expect(
        (
          detector as unknown as {
            options: Required<TerminalReadyDetectorOptions>
            buffer: string
            lastDataTime: number
            readyCallbacks: Array<() => void>
          }
        ).buffer
      ).toBe('')
      expect(
        (
          detector as unknown as {
            options: Required<TerminalReadyDetectorOptions>
            buffer: string
            lastDataTime: number
            readyCallbacks: Array<() => void>
          }
        ).lastDataTime
      ).toBe(0)
      expect(
        (
          detector as unknown as {
            options: Required<TerminalReadyDetectorOptions>
            buffer: string
            lastDataTime: number
            readyCallbacks: Array<() => void>
          }
        ).readyCallbacks
      ).toEqual([])
      expect(mockLogger.debug).toHaveBeenCalledWith('Detector reset')
    })

    it('should reset all properties to initial state', () => {
      const detector = new TerminalReadyDetector({ timeout: 1000 })

      // Set up some state first
      detector.checkData('some data to add to buffer')

      // Reset should clear everything
      detector.reset()

      // After reset, detector should be in initial state
      expect(detector.getIsReady()).toBe(false)
      expect(detector.getTimeSinceLastData()).toBe(-1)
    })

    it('should clear timeout handle when reset', () => {
      const detector = new TerminalReadyDetector({ timeout: 1000 })

      // Set timeoutHandle manually to simulate the timeout being stored
      const mockTimeout = setTimeout(() => {}, 10000)
      ;(
        detector as unknown as {
          timeoutHandle?: NodeJS.Timeout
        }
      ).timeoutHandle = mockTimeout

      // Reset should clear the timeout handle
      detector.reset()

      // Check that timeout handle was cleared
      expect(
        (
          detector as unknown as {
            timeoutHandle?: NodeJS.Timeout
          }
        ).timeoutHandle
      ).toBeUndefined()

      // Clean up
      clearTimeout(mockTimeout)
    })
  })

  describe('getIsReady method', () => {
    it('should return false initially', () => {
      expect(detector.getIsReady()).toBe(false)
    })

    it('should return true after being marked ready', () => {
      detector.forceReady()
      expect(detector.getIsReady()).toBe(true)
    })
  })

  describe('forceReady method', () => {
    it('should mark detector as ready', () => {
      detector.forceReady()
      expect(detector.getIsReady()).toBe(true)
      expect(mockLogger.debug).toHaveBeenCalledWith('Forcing ready state')
    })

    it('should trigger waiting callbacks', async () => {
      const promise = detector.waitForReady()
      detector.forceReady()

      await promise
      expect(detector.getIsReady()).toBe(true)
    })
  })

  describe('getTimeSinceLastData method', () => {
    it('should return -1 when no data received', () => {
      expect(detector.getTimeSinceLastData()).toBe(-1)
    })

    it('should return time since last data', () => {
      Date.now() // Capture time for comparison baseline
      detector.checkData('test')

      vi.advanceTimersByTime(500)

      const timeSince = detector.getTimeSinceLastData()
      expect(timeSince).toBeGreaterThanOrEqual(500)
    })
  })

  describe('setReady private method', () => {
    it('should not change state if already ready', () => {
      detector.forceReady()
      const callbacks = (
        detector as unknown as {
          options: Required<TerminalReadyDetectorOptions>
          buffer: string
          lastDataTime: number
          readyCallbacks: Array<() => void>
        }
      ).readyCallbacks
      callbacks.push(vi.fn())

      // Try to set ready again
      ;(
        detector as unknown as {
          options: Required<TerminalReadyDetectorOptions>
          buffer: string
          lastDataTime: number
          readyCallbacks: Array<() => void>
        }
      ).setReady()

      // Callback should not be triggered again
      expect(callbacks[0]).not.toHaveBeenCalled()
    })

    it('should clear timeoutHandle when set ready', async () => {
      const detector = new TerminalReadyDetector({ timeout: 1000 })

      // Start timeout
      const promise = detector.waitForReady()

      // Force ready should clear timeout
      detector.forceReady()
      await promise

      expect(
        (
          detector as unknown as {
            options: Required<TerminalReadyDetectorOptions>
            buffer: string
            lastDataTime: number
            readyCallbacks: Array<() => void>
          }
        ).timeoutHandle
      ).toBeUndefined()
    })

    it('should clear timeoutHandle when it exists', () => {
      const detector = new TerminalReadyDetector({ timeout: 1000 })

      // Manually set a timeout handle
      const mockTimeout = setTimeout(() => {}, 10000)
      ;(
        detector as unknown as {
          timeoutHandle?: NodeJS.Timeout
        }
      ).timeoutHandle = mockTimeout

      // Force ready should clear the timeout handle
      detector.forceReady()

      // Check that timeout handle was cleared
      expect(
        (
          detector as unknown as {
            timeoutHandle?: NodeJS.Timeout
          }
        ).timeoutHandle
      ).toBeUndefined()

      // Cleanup
      clearTimeout(mockTimeout)
    })

    it('should trigger all callbacks and clear them', async () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      // Manually add callbacks to test the internal mechanism
      ;(
        detector as unknown as {
          options: Required<TerminalReadyDetectorOptions>
          buffer: string
          lastDataTime: number
          readyCallbacks: Array<() => void>
        }
      ).readyCallbacks.push(callback1, callback2)

      detector.forceReady()

      expect(callback1).toHaveBeenCalled()
      expect(callback2).toHaveBeenCalled()
      expect(
        (
          detector as unknown as {
            options: Required<TerminalReadyDetectorOptions>
            buffer: string
            lastDataTime: number
            readyCallbacks: Array<() => void>
          }
        ).readyCallbacks
      ).toEqual([])
    })
  })

  describe('Static patterns', () => {
    it('should have PROMPT_PATTERNS defined', () => {
      const patterns = (
        TerminalReadyDetector as unknown as {
          PROMPT_PATTERNS: RegExp[]
          INIT_PATTERNS: RegExp[]
        }
      ).PROMPT_PATTERNS
      expect(Array.isArray(patterns)).toBe(true)
      expect(patterns.length).toBeGreaterThan(0)
    })

    it('should have INIT_PATTERNS defined', () => {
      const patterns = (
        TerminalReadyDetector as unknown as {
          PROMPT_PATTERNS: RegExp[]
          INIT_PATTERNS: RegExp[]
        }
      ).INIT_PATTERNS
      expect(Array.isArray(patterns)).toBe(true)
      expect(patterns.length).toBeGreaterThan(0)
    })

    it('should test all prompt patterns', () => {
      const testCases = [
        '$ ', // Bash/Zsh
        '> ', // Generic
        '# ', // Root
        'PS C:\\> ', // PowerShell
        'PS> ', // PowerShell short
        '~> ', // Fish
        '→ ', // Fish arrow
        'C:\\> ', // Windows CMD
        '[user]$ ', // Custom bracket
        '(env)> ', // Virtual env
        '❯ ', // Starship
        '➜ ', // Oh My Zsh
        'λ ', // Lambda
        '>>> ', // Python REPL
        'irb(main):001:0> ', // Ruby IRB
      ]

      testCases.forEach((testCase) => {
        const detector = new TerminalReadyDetector()
        expect(
          detector.checkData(testCase),
          `Pattern should match: ${testCase}`
        ).toBe(true)
      })
    })

    it('should test all init patterns', () => {
      const testCases = [
        'Loading...',
        'loading files',
        'Initializing components',
        'INITIALIZING SYSTEM',
        'Starting server',
        'starting up',
        'Welcome to Linux',
        'WELCOME TO UBUNTU',
        'Last login: Mon',
        'last login: yesterday',
        'Mon Sep 16 10:30:15',
        'Tuesday Jan 01 00:00:00',
      ]

      testCases.forEach((testCase) => {
        const detector = new TerminalReadyDetector()
        expect(
          detector.checkData(testCase),
          `Init pattern should be detected: ${testCase}`
        ).toBe(false)
      })
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle empty data', () => {
      expect(detector.checkData('')).toBe(false)
    })

    it('should handle null-like data', () => {
      expect(detector.checkData(' ')).toBe(false)
    })

    it('should handle multiple line breaks', () => {
      detector.checkData('\n\n\n$ ')
      expect(detector.getIsReady()).toBe(true)
    })

    it('should handle mixed content', () => {
      detector.checkData('Loading...\nuser@host:~$ ')
      // Should not be ready due to init pattern
      expect(detector.getIsReady()).toBe(false)
    })

    it('should handle very long input', () => {
      const longInput = 'a'.repeat(10000)
      detector.checkData(longInput)
      expect(
        (
          detector as unknown as {
            options: Required<TerminalReadyDetectorOptions>
            buffer: string
            lastDataTime: number
            readyCallbacks: Array<() => void>
          }
        ).buffer.length
      ).toBe(500)
    })

    it('should handle special characters', () => {
      detector.checkData('user@host:~/测试$ ')
      expect(detector.getIsReady()).toBe(true)
    })

    it('should handle concurrent operations', async () => {
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(detector.waitForReady())
      }

      setTimeout(() => detector.forceReady(), 50)
      vi.advanceTimersByTime(50)

      await Promise.all(promises)
      expect(detector.getIsReady()).toBe(true)
    })
  })

  describe('Date.now() mocking', () => {
    it('should use mocked time correctly', () => {
      const mockTime = 1000000
      vi.setSystemTime(mockTime)

      detector.checkData('test')
      expect(
        (
          detector as unknown as {
            options: Required<TerminalReadyDetectorOptions>
            buffer: string
            lastDataTime: number
            readyCallbacks: Array<() => void>
          }
        ).lastDataTime
      ).toBe(mockTime)

      vi.advanceTimersByTime(500)
      expect(detector.getTimeSinceLastData()).toBe(500)
    })
  })

  describe('Complex scenarios', () => {
    it('should handle realistic terminal session', async () => {
      // Create a fresh detector for this test
      const sessionDetector = new TerminalReadyDetector()

      // Simulate a typical terminal startup sequence with some non-init output first
      sessionDetector.checkData('Terminal initialized\n')
      expect(sessionDetector.getIsReady()).toBe(false)

      sessionDetector.checkData('Setting up environment\n')
      expect(sessionDetector.getIsReady()).toBe(false)

      sessionDetector.checkData('Ready for commands\n')
      expect(sessionDetector.getIsReady()).toBe(false)

      // Now the prompt should be detected
      sessionDetector.checkData('user@host:~$ ')
      expect(sessionDetector.getIsReady()).toBe(true)
    })

    it('should handle multiple reset cycles', () => {
      for (let i = 0; i < 5; i++) {
        detector.checkData('$ ')
        expect(detector.getIsReady()).toBe(true)

        detector.reset()
        expect(detector.getIsReady()).toBe(false)
      }
    })
  })
})
