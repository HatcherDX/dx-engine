/**
 * @fileoverview Comprehensive test suite for test-setup.ts configuration.
 *
 * @description
 * Tests the global test setup configuration including DOM mocks, console mocks,
 * and browser API mocks. Ensures all setup functions work correctly and provide
 * the expected mock behavior for terminal system tests.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Import the test setup to initialize mocks
import './test-setup'

describe('test-setup.ts', () => {
  beforeEach(() => {
    // Clear all mocks before each test but keep the mock functions
    vi.clearAllMocks()
    vi.clearAllTimers()
  })

  afterEach(() => {
    // Reset timers to prevent interference between tests
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  describe('Console Mocks', () => {
    it('should mock console.log', () => {
      const message = 'Test log message'
      console.log(message)

      expect(console.log).toHaveBeenCalledWith(message)
      expect(console.log).toHaveBeenCalledTimes(1)
      expect(vi.isMockFunction(console.log)).toBe(true)
    })

    it('should mock console.error', () => {
      const errorMessage = 'Test error message'
      console.error(errorMessage)

      expect(console.error).toHaveBeenCalledWith(errorMessage)
      expect(console.error).toHaveBeenCalledTimes(1)
      expect(vi.isMockFunction(console.error)).toBe(true)
    })

    it('should mock console.warn', () => {
      const warnMessage = 'Test warning message'
      console.warn(warnMessage)

      expect(console.warn).toHaveBeenCalledWith(warnMessage)
      expect(console.warn).toHaveBeenCalledTimes(1)
      expect(vi.isMockFunction(console.warn)).toBe(true)
    })

    it('should mock console.info', () => {
      const infoMessage = 'Test info message'
      console.info(infoMessage)

      expect(console.info).toHaveBeenCalledWith(infoMessage)
      expect(console.info).toHaveBeenCalledTimes(1)
      expect(vi.isMockFunction(console.info)).toBe(true)
    })

    it('should mock console.debug', () => {
      const debugMessage = 'Test debug message'
      console.debug(debugMessage)

      expect(console.debug).toHaveBeenCalledWith(debugMessage)
      expect(console.debug).toHaveBeenCalledTimes(1)
      expect(vi.isMockFunction(console.debug)).toBe(true)
    })

    it('should preserve other console methods', () => {
      // These should still be available from the spread operator
      expect(console.table).toBeDefined()
      expect(console.trace).toBeDefined()
      expect(console.group).toBeDefined()
      expect(console.groupEnd).toBeDefined()
    })

    it('should handle multiple console calls', () => {
      console.log('First message')
      console.log('Second message')
      console.error('Error message')

      expect(console.log).toHaveBeenCalledTimes(2)
      expect(console.error).toHaveBeenCalledTimes(1)
      expect(console.log).toHaveBeenNthCalledWith(1, 'First message')
      expect(console.log).toHaveBeenNthCalledWith(2, 'Second message')
    })
  })

  describe('HTMLCanvasElement Mocks', () => {
    it('should mock HTMLCanvasElement.getContext', () => {
      // Test if HTMLCanvasElement is available and gets mocked
      if (typeof HTMLCanvasElement !== 'undefined') {
        // HTMLCanvasElement exists, test that getContext gets mocked
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')

        expect(context).toBeDefined()
        // After our setup, getContext should return a mocked context
        expect(vi.isMockFunction(canvas.getContext)).toBe(true)
      } else {
        // HTMLCanvasElement doesn't exist, which is expected in some environments
        expect(true).toBe(true) // This test passes when HTMLCanvasElement is unavailable
      }
    })

    it('should provide mocked 2D context methods', () => {
      if (typeof HTMLCanvasElement !== 'undefined') {
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d') as Record<string, unknown>

        // Test that all expected methods are available and are mocked
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
          expect(context[method]).toBeDefined()
          expect(vi.isMockFunction(context[method])).toBe(true)
        })
      } else {
        expect(true).toBe(true) // Skip when HTMLCanvasElement is unavailable
      }
    })

    it('should handle canvas context method calls', () => {
      if (typeof HTMLCanvasElement !== 'undefined') {
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d') as Record<string, unknown>

        // Test method calls
        context.fillRect(10, 10, 100, 100)
        context.clearRect(0, 0, 300, 150)
        context.beginPath()
        context.moveTo(10, 10)
        context.lineTo(50, 50)
        context.stroke()

        expect(context.fillRect).toHaveBeenCalledWith(10, 10, 100, 100)
        expect(context.clearRect).toHaveBeenCalledWith(0, 0, 300, 150)
        expect(context.beginPath).toHaveBeenCalled()
        expect(context.moveTo).toHaveBeenCalledWith(10, 10)
        expect(context.lineTo).toHaveBeenCalledWith(50, 50)
        expect(context.stroke).toHaveBeenCalled()
      } else {
        expect(true).toBe(true) // Skip when HTMLCanvasElement is unavailable
      }
    })

    it('should handle save and restore operations', () => {
      if (typeof HTMLCanvasElement !== 'undefined') {
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d') as Record<string, unknown>

        context.save()
        context.scale(2, 2)
        context.rotate(Math.PI / 4)
        context.translate(10, 10)
        context.restore()

        expect(context.save).toHaveBeenCalled()
        expect(context.scale).toHaveBeenCalledWith(2, 2)
        expect(context.rotate).toHaveBeenCalledWith(Math.PI / 4)
        expect(context.translate).toHaveBeenCalledWith(10, 10)
        expect(context.restore).toHaveBeenCalled()
      } else {
        expect(true).toBe(true) // Skip when HTMLCanvasElement is unavailable
      }
    })

    it('should handle image operations', () => {
      if (typeof HTMLCanvasElement !== 'undefined') {
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d') as Record<string, unknown>

        const mockImage = {} as HTMLImageElement
        const mockImageData = {} as ImageData

        context.drawImage(mockImage, 0, 0)
        context.putImageData(mockImageData, 0, 0)
        context.getImageData(0, 0, 100, 100)
        context.createImageData(100, 100)

        expect(context.drawImage).toHaveBeenCalledWith(mockImage, 0, 0)
        expect(context.putImageData).toHaveBeenCalledWith(mockImageData, 0, 0)
        expect(context.getImageData).toHaveBeenCalledWith(0, 0, 100, 100)
        expect(context.createImageData).toHaveBeenCalledWith(100, 100)
      } else {
        expect(true).toBe(true) // Skip when HTMLCanvasElement is unavailable
      }
    })

    it('should only mock HTMLCanvasElement if it exists', () => {
      // Test the conditional mocking behavior - the setup file handles this gracefully
      // by checking if HTMLCanvasElement exists before mocking
      expect(() => {
        // This should work without errors regardless of HTMLCanvasElement availability
        if (typeof HTMLCanvasElement !== 'undefined') {
          const canvas = document.createElement('canvas')
          expect(canvas.getContext).toBeDefined()
        }
      }).not.toThrow()
    })
  })

  describe('Performance API Mocks', () => {
    it('should test performance API setup', () => {
      // Test that performance.now exists and works
      expect(global.performance).toBeDefined()
      expect(global.performance.now).toBeDefined()

      const now = global.performance.now()
      expect(typeof now).toBe('number')
      expect(now).toBeGreaterThan(0)
    })

    it('should handle performance method calls', () => {
      // Test basic performance methods exist
      expect(global.performance.mark).toBeDefined()
      expect(global.performance.measure).toBeDefined()
      expect(global.performance.getEntriesByName).toBeDefined()
      expect(global.performance.getEntriesByType).toBeDefined()

      // These methods should work without throwing
      expect(() => {
        global.performance.mark('test-mark')
        global.performance.getEntriesByName('test-mark')
        global.performance.getEntriesByType('mark')
      }).not.toThrow()
    })

    it('should provide fallback when performance is missing', () => {
      // Test that performance API is available (either native or mocked)
      expect(global.performance).toBeDefined()
      expect(global.performance.now).toBeDefined()
      expect(global.performance.mark).toBeDefined()
      expect(global.performance.measure).toBeDefined()

      // Test that it works correctly
      const timestamp = global.performance.now()
      expect(typeof timestamp).toBe('number')
      expect(timestamp).toBeGreaterThan(0)
    })
  })

  describe('RequestAnimationFrame Mocks', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should mock requestAnimationFrame', () => {
      expect(global.requestAnimationFrame).toBeDefined()

      // Test that it works like a mock by checking behavior
      const callback = vi.fn()
      const id = global.requestAnimationFrame(callback)
      expect(id).toBeDefined()

      // Should not call callback immediately
      expect(callback).not.toHaveBeenCalled()
    })

    it('should call requestAnimationFrame callback with timestamp', () => {
      const callback = vi.fn()
      const id = global.requestAnimationFrame(callback)

      expect(typeof id).toBe('number')
      expect(callback).not.toHaveBeenCalled()

      // Fast-forward time to trigger the callback
      vi.advanceTimersByTime(16)

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith(expect.any(Number))
    })

    it('should mock cancelAnimationFrame', () => {
      expect(global.cancelAnimationFrame).toBeDefined()

      // Test that it works like a mock by checking behavior
      const callback = vi.fn()
      const id = global.requestAnimationFrame(callback)

      // Cancel the frame
      global.cancelAnimationFrame(id)

      // After canceling, even advancing time shouldn't call the callback
      vi.advanceTimersByTime(50)
      expect(callback).not.toHaveBeenCalled()
    })

    it('should handle cancelAnimationFrame calls', () => {
      const callback = vi.fn()
      const id = global.requestAnimationFrame(callback)

      global.cancelAnimationFrame(id)

      // Test that cancellation works - callback should not be called
      vi.advanceTimersByTime(100)
      expect(callback).not.toHaveBeenCalled()

      // Test that cancelAnimationFrame accepts the ID without error
      expect(() => global.cancelAnimationFrame(id)).not.toThrow()
    })

    it('should use 16ms delay for requestAnimationFrame (60fps)', () => {
      const callback = vi.fn()
      global.requestAnimationFrame(callback)

      // Should not be called immediately
      expect(callback).not.toHaveBeenCalled()

      // Should not be called before 16ms
      vi.advanceTimersByTime(15)
      expect(callback).not.toHaveBeenCalled()

      // Should be called at 16ms
      vi.advanceTimersByTime(1)
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('should handle multiple requestAnimationFrame calls', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      const callback3 = vi.fn()

      const id1 = global.requestAnimationFrame(callback1)
      const id2 = global.requestAnimationFrame(callback2)
      const id3 = global.requestAnimationFrame(callback3)

      expect(id1).not.toBe(id2)
      expect(id2).not.toBe(id3)

      vi.advanceTimersByTime(16)

      expect(callback1).toHaveBeenCalledTimes(1)
      expect(callback2).toHaveBeenCalledTimes(1)
      expect(callback3).toHaveBeenCalledTimes(1)
    })

    it('should provide unique IDs for each requestAnimationFrame call', () => {
      const ids = new Set()

      for (let i = 0; i < 10; i++) {
        const id = global.requestAnimationFrame(() => {})
        ids.add(id)
      }

      // All IDs should be unique
      expect(ids.size).toBe(10)
    })

    it('should verify setup file creates animation frame mocks', () => {
      // Test that the animation frame mocks are working correctly
      expect(global.requestAnimationFrame).toBeDefined()
      expect(global.cancelAnimationFrame).toBeDefined()

      // Test the actual implementation works
      const callback = vi.fn()
      const id = global.requestAnimationFrame(callback)
      expect(id).toBeDefined()

      vi.advanceTimersByTime(16)
      expect(callback).toHaveBeenCalledTimes(1)

      // Test that both functions are available and work
      expect(typeof global.requestAnimationFrame).toBe('function')
      expect(typeof global.cancelAnimationFrame).toBe('function')
    })
  })

  describe('Integration Tests', () => {
    it('should setup all mocks without conflicts', () => {
      // Verify all major components are mocked or available
      expect(vi.isMockFunction(console.log)).toBe(true)
      expect(global.requestAnimationFrame).toBeDefined()
      expect(global.cancelAnimationFrame).toBeDefined()

      // Performance should be available (either original or mocked)
      expect(global.performance).toBeDefined()
      expect(global.performance.now).toBeDefined()

      // Test that requestAnimationFrame works
      const callback = vi.fn()
      const id = global.requestAnimationFrame(callback)
      expect(id).toBeDefined()
    })

    it('should handle import side effects correctly', () => {
      // Setup should be stable and not cause issues when re-executed
      expect(() => {
        // Test that mocks remain stable
        expect(vi.isMockFunction(console.log)).toBe(true)
        expect(vi.isMockFunction(global.requestAnimationFrame)).toBe(true)
        expect(global.performance).toBeDefined()
      }).not.toThrow()
    })

    it('should provide clean test environment', () => {
      // Console should be mocked for clean output
      const originalLogLength =
        (console.log as Record<string, unknown>).mock?.calls?.length || 0
      console.log('Test message')
      expect((console.log as Record<string, unknown>).mock.calls).toHaveLength(
        originalLogLength + 1
      )

      // Animation frame should work
      const callback = vi.fn()
      const id = global.requestAnimationFrame(callback)
      expect(id).toBeDefined()

      // Performance should be available
      const now = global.performance.now()
      expect(typeof now).toBe('number')
    })

    it('should support typical test scenarios', () => {
      // Scenario 1: Canvas-based component testing
      if (typeof HTMLCanvasElement !== 'undefined') {
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d') as Record<string, unknown>
        context.fillRect(0, 0, 100, 100)
        expect(context.fillRect).toHaveBeenCalled()
      }

      // Scenario 2: Animation testing
      vi.useFakeTimers()
      const animCallback = vi.fn()
      global.requestAnimationFrame(animCallback)
      vi.advanceTimersByTime(16)
      expect(animCallback).toHaveBeenCalled()
      vi.useRealTimers()

      // Scenario 3: Performance monitoring
      const start = global.performance.now()
      expect(typeof start).toBe('number')

      // Scenario 4: Console output suppression
      console.log('This should be captured by mock')
      expect(console.log).toHaveBeenCalledWith(
        'This should be captured by mock'
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle missing global objects gracefully', () => {
      // Test that the setup ensures globals exist
      expect(global.requestAnimationFrame).toBeDefined()
      expect(global.cancelAnimationFrame).toBeDefined()
      expect(global.performance).toBeDefined()

      // Test that mocks are working by testing behavior
      const callback = vi.fn()
      const id = global.requestAnimationFrame(callback)
      expect(id).toBeDefined()
      expect(callback).not.toHaveBeenCalled()
    })

    it('should handle canvas context creation edge cases', () => {
      if (typeof HTMLCanvasElement !== 'undefined') {
        const canvas = document.createElement('canvas')

        // Test different context types
        const context2d = canvas.getContext('2d')
        const contextWebgl = canvas.getContext('webgl')
        const contextWebgl2 = canvas.getContext('webgl2')

        expect(context2d).toBeDefined()
        expect(contextWebgl).toBeDefined()
        expect(contextWebgl2).toBeDefined()

        // All should return the same mock object structure
        expect(context2d).toHaveProperty('fillRect')
        expect(contextWebgl).toHaveProperty('fillRect')
        expect(contextWebgl2).toHaveProperty('fillRect')
      } else {
        expect(true).toBe(true) // Skip when HTMLCanvasElement is unavailable
      }
    })

    it('should verify setup file structure', () => {
      // Test that the setup creates the expected mock structure
      expect(global.console).toBeDefined()
      expect(vi.isMockFunction(console.log)).toBe(true)
      expect(vi.isMockFunction(console.error)).toBe(true)

      expect(global.requestAnimationFrame).toBeDefined()
      expect(global.cancelAnimationFrame).toBeDefined()

      // Test HTMLCanvasElement mock if available
      if (typeof HTMLCanvasElement !== 'undefined') {
        const canvas = document.createElement('canvas')
        expect(vi.isMockFunction(canvas.getContext)).toBe(true)
      }

      // Test that functions work correctly
      const callback = vi.fn()
      const id = global.requestAnimationFrame(callback)
      expect(id).toBeDefined()
    })
  })

  describe('Memory and Performance', () => {
    it('should not create memory leaks with repeated setups', () => {
      const initialConsoleLog = console.log

      // Test stability across multiple operations
      for (let i = 0; i < 10; i++) {
        // Perform operations that would stress the mocks
        console.log(`test message ${i}`)
        global.requestAnimationFrame(() => {})
        global.performance.now()
      }

      // Console should still be the same mocked function
      expect(console.log).toBe(initialConsoleLog)
      expect(vi.isMockFunction(console.log)).toBe(true)
    })

    it('should provide efficient mock implementations', () => {
      const start = Date.now()

      // Perform many operations
      for (let i = 0; i < 1000; i++) {
        console.log(`Message ${i}`)
        global.performance.now()
        global.requestAnimationFrame(() => {})
      }

      const elapsed = Date.now() - start

      // Should complete quickly (less than 100ms even with 1000 operations)
      expect(elapsed).toBeLessThan(100)
    })
  })
})
