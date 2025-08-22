/**
 * @fileoverview Direct import test to ensure test-setup.ts is counted in coverage.
 *
 * @description
 * This test file imports test-setup.ts directly to ensure it's included
 * in code coverage metrics. The setup file normally runs as a side effect
 * but doesn't get counted for coverage.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('test-setup.ts import coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should import test-setup.ts for coverage tracking', async () => {
    // Direct import to trigger code execution and coverage tracking
    const testSetup = await import('./test-setup')

    // Verify that the import succeeded
    expect(testSetup).toBeDefined()

    // Verify that the setup has run by checking global mocks exist
    expect(global.console).toBeDefined()
    expect(global.requestAnimationFrame).toBeDefined()
    expect(global.cancelAnimationFrame).toBeDefined()
    expect(global.performance).toBeDefined()
  })

  it('should cover all execution paths', () => {
    // Test the performance API methods to cover their implementation
    expect(global.performance).toBeDefined()
    expect(global.performance.now).toBeDefined()
    expect(global.performance.mark).toBeDefined()
    expect(global.performance.measure).toBeDefined()
    expect(global.performance.getEntriesByName).toBeDefined()
    expect(global.performance.getEntriesByType).toBeDefined()

    // Test the mocked functions to cover their implementation
    const now = global.performance.now()
    expect(typeof now).toBe('number')

    global.performance.mark('test-mark')
    global.performance.measure('test-measure')

    const entriesByName = global.performance.getEntriesByName('test')
    const entriesByType = global.performance.getEntriesByType('mark')
    expect(Array.isArray(entriesByName)).toBe(true)
    expect(Array.isArray(entriesByType)).toBe(true)
  })

  it('should cover requestAnimationFrame and cancelAnimationFrame implementations', () => {
    // Test the requestAnimationFrame implementation
    const callback = vi.fn()
    const id = global.requestAnimationFrame(callback)

    // Verify the return value (should be a timeout ID)
    expect(id).toBeDefined()
    expect(typeof id).toMatch(/number|object/) // setTimeout returns number or object depending on environment

    // Test the cancelAnimationFrame implementation
    global.cancelAnimationFrame(id)

    // Test with different IDs to ensure clearTimeout is called
    global.cancelAnimationFrame(123)
    global.cancelAnimationFrame(456)

    // Verify that the callback would be called after timeout
    vi.useFakeTimers()
    const callback2 = vi.fn()
    global.requestAnimationFrame(callback2)

    // Advance time to trigger callback
    vi.advanceTimersByTime(16)
    expect(callback2).toHaveBeenCalledTimes(1)
    expect(callback2).toHaveBeenCalledWith(expect.any(Number))

    vi.useRealTimers()
  })

  it('should cover HTMLCanvasElement conditional path', () => {
    // Test when HTMLCanvasElement exists
    if (typeof HTMLCanvasElement !== 'undefined') {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')

      // Verify the mock was applied
      expect(context).toBeDefined()
      expect(typeof context).toBe('object')

      // Test various context methods to ensure they're mocked
      const contextMethods = [
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

      contextMethods.forEach((method) => {
        expect(context).toHaveProperty(method)
        expect(typeof (context as Record<string, unknown>)[method]).toBe(
          'function'
        )
      })
    }
  })
})
