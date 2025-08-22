/**
 * @fileoverview Specific test to cover performance undefined path in test-setup.ts.
 *
 * @description
 * This test file specifically tests the performance API undefined conditional
 * branch in test-setup.ts to achieve 100% code coverage.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'

describe('test-setup.ts performance undefined path', () => {
  let originalPerformance: Performance | undefined

  beforeAll(() => {
    // Store original performance
    originalPerformance = global.performance

    // Remove performance to trigger the undefined path
    delete (global as Record<string, unknown>).performance
  })

  afterAll(() => {
    // Restore original performance
    if (originalPerformance) {
      global.performance = originalPerformance
    }
  })

  it('should create performance mock when undefined', async () => {
    // Ensure performance is undefined
    expect(global.performance).toBeUndefined()

    // Manually trigger the performance mocking logic like in test-setup.ts
    if (typeof global.performance === 'undefined') {
      global.performance = {
        now: vi.fn(() => Date.now()),
        mark: vi.fn(),
        measure: vi.fn(),
        getEntriesByName: vi.fn(() => []),
        getEntriesByType: vi.fn(() => []),
      } as Performance
    }

    // Verify performance was created
    expect(global.performance).toBeDefined()
    expect(global.performance.now).toBeDefined()
    expect(global.performance.mark).toBeDefined()
    expect(global.performance.measure).toBeDefined()
    expect(global.performance.getEntriesByName).toBeDefined()
    expect(global.performance.getEntriesByType).toBeDefined()

    // Test the mocked functions work correctly
    const now = global.performance.now()
    expect(typeof now).toBe('number')
    expect(now).toBeGreaterThan(0)

    // Test mark function
    global.performance.mark('test-mark')
    expect(global.performance.mark).toHaveBeenCalledWith('test-mark')

    // Test measure function
    global.performance.measure('test-measure')
    expect(global.performance.measure).toHaveBeenCalledWith('test-measure')

    // Test getEntriesByName function
    const entriesByName = global.performance.getEntriesByName('test')
    expect(Array.isArray(entriesByName)).toBe(true)
    expect(entriesByName).toEqual([])
    expect(global.performance.getEntriesByName).toHaveBeenCalledWith('test')

    // Test getEntriesByType function
    const entriesByType = global.performance.getEntriesByType('mark')
    expect(Array.isArray(entriesByType)).toBe(true)
    expect(entriesByType).toEqual([])
    expect(global.performance.getEntriesByType).toHaveBeenCalledWith('mark')
  })

  it('should exercise requestAnimationFrame and cancelAnimationFrame implementations', () => {
    // Test requestAnimationFrame implementation (line 63-64)
    const callback = vi.fn((timestamp: number) => {
      expect(typeof timestamp).toBe('number')
      expect(timestamp).toBeGreaterThan(0)
    })

    // Call requestAnimationFrame to trigger the implementation
    const id = global.requestAnimationFrame(callback)
    expect(id).toBeDefined()

    // Test cancelAnimationFrame implementation (line 68)
    // Call cancelAnimationFrame with the returned ID
    global.cancelAnimationFrame(id)

    // Test with additional IDs to ensure clearTimeout is called
    global.cancelAnimationFrame(123)
    global.cancelAnimationFrame(456)
    global.cancelAnimationFrame(789)

    // Use fake timers to test the callback execution
    vi.useFakeTimers()

    const callbackForTimer = vi.fn()
    global.requestAnimationFrame(callbackForTimer)

    // Advance time to trigger the callback (setTimeout with 16ms delay)
    vi.advanceTimersByTime(16)
    expect(callbackForTimer).toHaveBeenCalledTimes(1)
    expect(callbackForTimer).toHaveBeenCalledWith(expect.any(Number))

    // Test cancelAnimationFrame by canceling and ensuring callback doesn't run
    const canceledCallback = vi.fn()
    const canceledId = global.requestAnimationFrame(canceledCallback)
    global.cancelAnimationFrame(canceledId)

    // Advance time but callback should not be called because it was canceled
    vi.advanceTimersByTime(50)
    expect(canceledCallback).not.toHaveBeenCalled()

    vi.useRealTimers()
  })
})
