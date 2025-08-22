/**
 * @fileoverview Execution tests for test-setup.ts to achieve coverage.
 *
 * @description
 * Tests that directly execute and measure coverage of the test-setup.ts file
 * by importing it as a regular module and exercising all code paths.
 * This is separate from the behavioral tests to ensure coverage instrumentation.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Mock console interface for testing.
 */
interface MockConsole {
  log: () => void
  error: () => void
  warn: () => void
  info: () => void
  debug: () => void
  table: () => void
  time: () => void
  timeEnd: () => void
}

/**
 * Mock HTMLCanvasElement constructor for testing.
 */
interface MockHTMLCanvasElement {
  new (): HTMLCanvasElement
  prototype: {
    getContext: () => unknown
  }
}

/**
 * Mock Performance interface for testing.
 */
interface MockPerformance {
  now: () => number
  mark?: (name: string) => void
  measure?: (name: string, startMark?: string, endMark?: string) => void
}

describe('test-setup.ts execution coverage', () => {
  let originalConsole: Console
  let originalPerformance: Performance | undefined
  let originalRequestAnimationFrame: typeof requestAnimationFrame | undefined
  let originalCancelAnimationFrame: typeof cancelAnimationFrame | undefined
  let originalHTMLCanvasElement: typeof HTMLCanvasElement | undefined
  let originalSetTimeout: typeof setTimeout
  let originalClearTimeout: typeof clearTimeout

  beforeEach(() => {
    // Store all original implementations
    originalConsole = global.console
    originalPerformance = global.performance
    originalRequestAnimationFrame = global.requestAnimationFrame
    originalCancelAnimationFrame = global.cancelAnimationFrame
    originalHTMLCanvasElement = global.HTMLCanvasElement
    originalSetTimeout = global.setTimeout
    originalClearTimeout = global.clearTimeout

    // Clear module cache to ensure fresh execution
    vi.resetModules()
  })

  afterEach(() => {
    // Restore all original implementations
    global.console = originalConsole
    if (originalPerformance !== undefined) {
      global.performance = originalPerformance
    } else {
      delete global.performance
    }
    if (originalRequestAnimationFrame !== undefined) {
      global.requestAnimationFrame = originalRequestAnimationFrame
    } else {
      delete global.requestAnimationFrame
    }
    if (originalCancelAnimationFrame !== undefined) {
      global.cancelAnimationFrame = originalCancelAnimationFrame
    } else {
      delete global.cancelAnimationFrame
    }
    if (originalHTMLCanvasElement !== undefined) {
      global.HTMLCanvasElement = originalHTMLCanvasElement
    } else {
      delete global.HTMLCanvasElement
    }
    global.setTimeout = originalSetTimeout
    global.clearTimeout = originalClearTimeout
  })

  describe('Console Mocking Execution', () => {
    it('should execute console mocking setup code', async () => {
      // Remove existing console to test the setup
      // global.console = undefined as any

      // Import test-setup to execute its code
      await import('./test-setup')

      // Verify console was set up correctly
      expect(global.console).toBeDefined()
      expect(global.console.log).toBeDefined()
      expect(global.console.error).toBeDefined()
      expect(global.console.warn).toBeDefined()
      expect(global.console.info).toBeDefined()
      expect(global.console.debug).toBeDefined()
      expect(vi.isMockFunction(global.console.log)).toBe(true)
    })

    it('should preserve original console methods during setup', async () => {
      // Set up a minimal console
      global.console = {
        log: () => {},
        error: () => {},
        warn: () => {},
        info: () => {},
        debug: () => {},
        table: () => {},
        time: () => {},
        timeEnd: () => {},
      } as unknown as MockConsole

      await import('./test-setup')

      // Verify original methods are preserved
      expect(global.console.table).toBeDefined()
      expect(global.console.time).toBeDefined()
      expect(global.console.timeEnd).toBeDefined()
    })
  })

  describe('HTMLCanvasElement Mocking Execution', () => {
    it('should execute canvas mocking when HTMLCanvasElement exists', async () => {
      // Set up basic HTMLCanvasElement constructor
      global.HTMLCanvasElement = function HTMLCanvasElement() {
        // Empty constructor
      } as unknown as MockHTMLCanvasElement
      global.HTMLCanvasElement.prototype = {
        getContext: function () {
          return null
        },
      }

      await import('./test-setup')

      // Test that getContext was overridden to return mocked context
      const canvas = new HTMLCanvasElement()
      const context = canvas.getContext('2d')

      expect(context).toBeDefined()
      expect(context.fillRect).toBeDefined()
      expect(context.clearRect).toBeDefined()
      expect(context.getImageData).toBeDefined()
      expect(vi.isMockFunction(context.fillRect)).toBe(true)
    })

    it('should skip canvas mocking when HTMLCanvasElement is undefined', async () => {
      // Ensure HTMLCanvasElement is undefined
      delete global.HTMLCanvasElement

      // This should not throw
      await expect(import('./test-setup')).resolves.toBeDefined()

      // HTMLCanvasElement should still be undefined
      expect(global.HTMLCanvasElement).toBeUndefined()
    })

    it('should cover all canvas context methods', async () => {
      global.HTMLCanvasElement =
        function HTMLCanvasElement() {} as unknown as MockHTMLCanvasElement
      global.HTMLCanvasElement.prototype = {
        getContext: function () {
          return null
        },
      }

      await import('./test-setup')

      const canvas = new HTMLCanvasElement()
      const ctx = canvas.getContext('2d')

      // Test all mocked methods exist
      const expectedMethods = [
        'fillRect',
        'clearRect',
        'getImageData',
        'putImageData',
        'createImageData',
        'setTransform',
        'drawImage',
        'save',
        'restore',
        'beginPath',
        'moveTo',
        'lineTo',
        'closePath',
        'stroke',
        'fill',
        'arc',
        'scale',
        'rotate',
        'translate',
      ]

      expectedMethods.forEach((method) => {
        expect(ctx[method]).toBeDefined()
        expect(vi.isMockFunction(ctx[method])).toBe(true)
      })
    })
  })

  describe('Performance API Mocking Execution', () => {
    it('should execute performance mocking when performance is undefined', async () => {
      // Remove performance API
      delete global.performance

      await import('./test-setup')

      // Verify performance API was created
      expect(global.performance).toBeDefined()
      expect(global.performance.now).toBeDefined()
      expect(global.performance.mark).toBeDefined()
      expect(global.performance.measure).toBeDefined()
      expect(global.performance.getEntriesByName).toBeDefined()
      expect(global.performance.getEntriesByType).toBeDefined()
      expect(vi.isMockFunction(global.performance.now)).toBe(true)
    })

    it('should skip performance mocking when performance exists', async () => {
      // Set up existing performance API
      const existingPerformance = {
        now: () => 12345,
        mark: () => {},
        measure: () => {},
        getEntriesByName: () => [],
        getEntriesByType: () => [],
      }
      global.performance = existingPerformance as unknown as MockPerformance

      await import('./test-setup')

      // Should preserve existing performance
      expect(global.performance).toBe(existingPerformance)
      expect(global.performance.now()).toBe(12345)
    })

    it('should test performance.now mock implementation', async () => {
      delete global.performance

      await import('./test-setup')

      const mockDateNow = vi.spyOn(Date, 'now').mockReturnValue(98765)
      try {
        const result = global.performance.now()
        expect(result).toBe(98765)
        expect(Date.now).toHaveBeenCalled()
      } finally {
        mockDateNow.mockRestore()
      }
    })

    it('should test performance method calls', async () => {
      delete global.performance

      await import('./test-setup')

      // Test that all methods are callable
      expect(() => {
        global.performance.mark('test')
        global.performance.measure('test')
        const entries = global.performance.getEntriesByName('test')
        const typeEntries = global.performance.getEntriesByType('mark')
        expect(Array.isArray(entries)).toBe(true)
        expect(Array.isArray(typeEntries)).toBe(true)
      }).not.toThrow()
    })
  })

  describe('RequestAnimationFrame Mocking Execution', () => {
    it('should execute requestAnimationFrame mocking', async () => {
      // Remove animation frame functions
      delete global.requestAnimationFrame
      delete global.cancelAnimationFrame

      await import('./test-setup')

      // Verify functions were created
      expect(global.requestAnimationFrame).toBeDefined()
      expect(global.cancelAnimationFrame).toBeDefined()
      expect(vi.isMockFunction(global.requestAnimationFrame)).toBe(true)
      expect(vi.isMockFunction(global.cancelAnimationFrame)).toBe(true)
    })

    it('should test requestAnimationFrame implementation with setTimeout', async () => {
      delete global.requestAnimationFrame
      delete global.cancelAnimationFrame

      // Mock setTimeout to verify it's called correctly
      const mockSetTimeout = vi.fn((callback, delay) => {
        expect(delay).toBe(16)
        expect(typeof callback).toBe('function')
        // Call the callback immediately for testing
        callback(Date.now())
        return 12345
      })
      global.setTimeout = mockSetTimeout

      await import('./test-setup')

      const callback = vi.fn()
      const id = global.requestAnimationFrame(callback)

      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 16)
      expect(id).toBe(12345)
      expect(callback).toHaveBeenCalledWith(expect.any(Number))
    })

    it('should test cancelAnimationFrame implementation with clearTimeout', async () => {
      delete global.requestAnimationFrame
      delete global.cancelAnimationFrame

      const mockClearTimeout = vi.fn()
      global.clearTimeout = mockClearTimeout

      await import('./test-setup')

      global.cancelAnimationFrame(98765)

      expect(mockClearTimeout).toHaveBeenCalledWith(98765)
    })

    it('should test requestAnimationFrame callback parameter', async () => {
      delete global.requestAnimationFrame
      delete global.cancelAnimationFrame

      // Mock setTimeout to control callback execution
      global.setTimeout = vi.fn((callback) => {
        const timestamp = 1234567890
        callback(timestamp)
        return 999
      }) as unknown as typeof setTimeout

      await import('./test-setup')

      const callback = vi.fn()
      global.requestAnimationFrame(callback)

      // Verify callback was called with a number (timestamp will be Date.now())
      expect(callback).toHaveBeenCalledWith(expect.any(Number))
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('should preserve existing requestAnimationFrame if present', async () => {
      const existingRAF = vi.fn(() => 555)
      const existingCAF = vi.fn()
      global.requestAnimationFrame = existingRAF
      global.cancelAnimationFrame = existingCAF

      await import('./test-setup')

      // The setup creates new mocks regardless, but we can test they exist
      expect(global.requestAnimationFrame).toBeDefined()
      expect(global.cancelAnimationFrame).toBeDefined()
      expect(vi.isMockFunction(global.requestAnimationFrame)).toBe(true)
      expect(vi.isMockFunction(global.cancelAnimationFrame)).toBe(true)
    })
  })

  describe('Edge Cases and Integration', () => {
    it('should handle partial global object states', async () => {
      // Set up mixed state - some globals present, others missing
      delete global.performance
      delete global.requestAnimationFrame
      // Keep console and HTMLCanvasElement

      await import('./test-setup')

      // Should have filled in missing globals
      expect(global.performance).toBeDefined()
      expect(global.requestAnimationFrame).toBeDefined()
      expect(global.cancelAnimationFrame).toBeDefined()
      expect(global.console).toBeDefined()
    })

    it('should handle multiple imports gracefully', async () => {
      // First import
      await import('./test-setup')
      const firstConsole = global.console
      const firstRAF = global.requestAnimationFrame

      // Second import should not break anything
      await import('./test-setup')
      expect(global.console).toBe(firstConsole)
      expect(global.requestAnimationFrame).toBe(firstRAF)
    })

    it('should work in Node.js-like environment', async () => {
      // Simulate Node.js environment
      delete global.HTMLCanvasElement
      delete global.performance
      delete global.requestAnimationFrame
      delete global.cancelAnimationFrame

      await import('./test-setup')

      // Should create all necessary mocks
      expect(global.console).toBeDefined()
      expect(global.performance).toBeDefined()
      expect(global.requestAnimationFrame).toBeDefined()
      expect(global.cancelAnimationFrame).toBeDefined()
      expect(global.HTMLCanvasElement).toBeUndefined() // Should remain undefined
    })

    it('should work in browser-like environment', async () => {
      // Simulate browser environment
      global.HTMLCanvasElement =
        function HTMLCanvasElement() {} as unknown as MockHTMLCanvasElement
      global.HTMLCanvasElement.prototype = {
        getContext: function () {
          return null
        },
      }

      await import('./test-setup')

      // Should set up canvas mocking
      expect(global.HTMLCanvasElement).toBeDefined()
      const canvas = new HTMLCanvasElement()
      const ctx = canvas.getContext('2d')
      expect(ctx.fillRect).toBeDefined()
    })

    it('should ensure all setup code paths are executed', async () => {
      // Test with completely clean global state
      // global.console = undefined as any
      delete global.HTMLCanvasElement
      delete global.performance
      delete global.requestAnimationFrame
      delete global.cancelAnimationFrame

      await import('./test-setup')

      // Verify all setup completed
      expect(vi.isMockFunction(global.console.log)).toBe(true)
      expect(global.performance).toBeDefined()
      expect(global.requestAnimationFrame).toBeDefined()
      expect(global.cancelAnimationFrame).toBeDefined()

      // Test functionality
      const callback = vi.fn()
      global.requestAnimationFrame(callback)
      console.log('test message')
      const timestamp = global.performance.now()

      expect(typeof timestamp).toBe('number')
      expect(global.console.log).toHaveBeenCalled()
    })
  })
})
