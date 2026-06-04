/**
 * @fileoverview Tests for TerminalBackpressureManager.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Terminal } from 'xterm'
import { TerminalBackpressureManager } from './BackpressureManager'

describe('TerminalBackpressureManager', () => {
  let manager: TerminalBackpressureManager
  let mockTerminal: Terminal

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock terminal
    mockTerminal = {
      write: vi.fn((data: string, callback?: () => void) => {
        // Simulate async write
        if (callback) {
          setTimeout(callback, 0)
        }
      }),
      clear: vi.fn(),
      reset: vi.fn(),
      scrollToBottom: vi.fn(),
    } as unknown as Terminal

    manager = new TerminalBackpressureManager()
  })

  afterEach(() => {
    manager.clear()
  })

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const manager = new TerminalBackpressureManager()
      expect(manager.getQueueSize()).toBe(0)
      expect(manager.getMemoryUsage()).toBe(0)
      expect(manager.isCurrentlyWriting()).toBe(false)
      expect(manager.isMemoryHealthy()).toBe(true)
    })

    it('should accept custom options', () => {
      const customManager = new TerminalBackpressureManager({
        chunkSize: 1024,
        maxQueueSize: 50,
        maxDataSize: 2048,
        writeDelay: 10,
        debug: true,
      })
      expect(customManager.getQueueSize()).toBe(0)
    })
  })

  describe('writeWithBackpressure', () => {
    it('should write small data directly', async () => {
      const data = 'Hello, World!'
      await manager.writeWithBackpressure(mockTerminal, data)

      expect(mockTerminal.write).toHaveBeenCalledWith(
        data,
        expect.any(Function)
      )
      expect(mockTerminal.write).toHaveBeenCalledTimes(1)
    })

    it('should chunk large data', async () => {
      const largeData = 'x'.repeat(1024) // Larger than default chunk size (512)
      const writePromise = manager.writeWithBackpressure(
        mockTerminal,
        largeData
      )

      // Wait for async operations
      await vi.waitFor(() => {
        // Should be called at least twice (chunked)
        return (
          (mockTerminal.write as ReturnType<typeof vi.fn>).mock.calls.length >=
          2
        )
      })

      await writePromise

      // Verify data was chunked
      const calls = (mockTerminal.write as ReturnType<typeof vi.fn>).mock.calls
      expect(calls.length).toBeGreaterThan(1)

      // Verify total data written equals original
      const totalWritten = calls.reduce((sum, call) => sum + call[0].length, 0)
      expect(totalWritten).toBe(largeData.length)
    })

    it('should reject data exceeding maximum size', async () => {
      const hugeData = 'x'.repeat(1024 * 1024 + 1) // Exceeds 1MB default

      await expect(
        manager.writeWithBackpressure(mockTerminal, hugeData)
      ).rejects.toThrow(/exceeds maximum/)
    })

    it('should queue data when already writing', async () => {
      // Set up delayed write to simulate ongoing operation
      let firstWriteCallback: (() => void) | null = null
      mockTerminal.write = vi.fn((data: string, callback?: () => void) => {
        if (!firstWriteCallback && callback) {
          firstWriteCallback = callback
          // Don't call callback immediately to simulate ongoing write
        } else if (callback) {
          callback()
        }
      })

      // Start first write
      const firstPromise = manager.writeWithBackpressure(mockTerminal, 'First')
      expect(manager.isCurrentlyWriting()).toBe(true)

      // Queue second write while first is in progress
      const secondPromise = manager.writeWithBackpressure(
        mockTerminal,
        'Second'
      )
      expect(manager.getQueueSize()).toBe(1)

      // Complete first write
      if (firstWriteCallback) {
        firstWriteCallback()
      }

      // Wait for both writes to complete
      await Promise.all([firstPromise, secondPromise])

      // Verify both were written
      expect(mockTerminal.write).toHaveBeenCalledTimes(2)
      expect(manager.getQueueSize()).toBe(0)
    })

    it('should drop oldest data when queue is full', async () => {
      const smallManager = new TerminalBackpressureManager({ maxQueueSize: 2 })

      // Block writing
      let releaseWrite: (() => void) | null = null
      mockTerminal.write = vi.fn((data: string, callback?: () => void) => {
        if (!releaseWrite && callback) {
          releaseWrite = callback
        } else if (callback) {
          callback()
        }
      })

      // Start writing and fill queue
      smallManager.writeWithBackpressure(mockTerminal, 'First')
      smallManager.writeWithBackpressure(mockTerminal, 'Second')
      smallManager.writeWithBackpressure(mockTerminal, 'Third')

      // Queue should be at max
      expect(smallManager.getQueueSize()).toBe(2)

      // Add one more - should drop oldest
      smallManager.writeWithBackpressure(mockTerminal, 'Fourth')
      expect(smallManager.getQueueSize()).toBe(2)

      // Clean up
      if (releaseWrite) releaseWrite()
      smallManager.clear()
    })

    it('should handle terminal without write function', async () => {
      const badTerminal = {} as Terminal

      await expect(
        manager.writeWithBackpressure(badTerminal, 'Test')
      ).resolves.not.toThrow()
    })

    it('should recover from write errors', async () => {
      mockTerminal.write = vi.fn(() => {
        throw new Error('Write failed')
      })

      await expect(
        manager.writeWithBackpressure(mockTerminal, 'Test')
      ).resolves.not.toThrow()

      // Queue should be cleared after error
      expect(manager.getQueueSize()).toBe(0)
    })
  })

  describe('memory management', () => {
    it('should track memory usage', async () => {
      expect(manager.getMemoryUsage()).toBe(0)
      expect(manager.getMemoryUsageMB()).toBe(0)

      // Block writing to accumulate queue
      let releaseWrite: (() => void) | null = null
      mockTerminal.write = vi.fn((data: string, callback?: () => void) => {
        if (!releaseWrite && callback) {
          releaseWrite = callback
        }
      })

      manager.writeWithBackpressure(mockTerminal, 'First')
      manager.writeWithBackpressure(mockTerminal, 'Second')

      expect(manager.getMemoryUsage()).toBe('Second'.length)
      expect(manager.getMemoryUsageMB()).toBeGreaterThan(0)

      // Clean up
      if (releaseWrite) releaseWrite()
    })

    it('should report memory health', () => {
      expect(manager.isMemoryHealthy()).toBe(true)

      // Create manager with small limits
      const smallManager = new TerminalBackpressureManager({
        maxQueueSize: 10,
        maxDataSize: 100,
      })

      // Block writing
      mockTerminal.write = vi.fn()

      // Start writing
      smallManager.writeWithBackpressure(mockTerminal, 'x'.repeat(10))

      // Fill queue near limit (80% = 8 items)
      for (let i = 0; i < 8; i++) {
        smallManager.writeWithBackpressure(mockTerminal, 'x')
      }

      // Should report unhealthy when approaching limits
      expect(smallManager.isMemoryHealthy()).toBe(false)

      smallManager.clear()
    })
  })

  describe('queue management', () => {
    it('should clear queue and reset state', () => {
      // Block writing
      mockTerminal.write = vi.fn()

      // Queue some data
      manager.writeWithBackpressure(mockTerminal, 'First')
      manager.writeWithBackpressure(mockTerminal, 'Second')

      expect(manager.getQueueSize()).toBeGreaterThan(0)

      // Clear
      manager.clear()

      expect(manager.getQueueSize()).toBe(0)
      expect(manager.getMemoryUsage()).toBe(0)
      expect(manager.isCurrentlyWriting()).toBe(false)
    })

    it('should update max queue size', () => {
      manager.setMaxQueueSize(5)

      // Block writing
      mockTerminal.write = vi.fn()

      // Start writing
      manager.writeWithBackpressure(mockTerminal, 'First')

      // Try to fill beyond new limit
      for (let i = 0; i < 10; i++) {
        manager.writeWithBackpressure(mockTerminal, `Item${i}`)
      }

      // Queue should not exceed new limit
      expect(manager.getQueueSize()).toBeLessThanOrEqual(5)

      manager.clear()
    })
  })

  describe('debug mode', () => {
    it('should log debug messages when enabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log')

      const debugManager = new TerminalBackpressureManager({ debug: true })
      await debugManager.writeWithBackpressure(mockTerminal, 'Test')

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[BackpressureManager]'),
        expect.any(Object)
      )

      consoleSpy.mockRestore()
    })

    it('should not log when debug is disabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log')

      await manager.writeWithBackpressure(mockTerminal, 'Test')

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[BackpressureManager]'),
        expect.any(Object)
      )

      consoleSpy.mockRestore()
    })

    it('should log error when data exceeds maximum size with debug', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const debugManager = new TerminalBackpressureManager({
        debug: true,
        maxDataSize: 10,
      })

      await expect(
        debugManager.writeWithBackpressure(mockTerminal, 'x'.repeat(11))
      ).rejects.toThrow()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[BackpressureManager] Size validation failed:',
        expect.any(String)
      )

      consoleErrorSpy.mockRestore()
    })

    it('should warn when dropping data with debug enabled', async () => {
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})
      const debugManager = new TerminalBackpressureManager({
        debug: true,
        maxQueueSize: 2,
      })

      // Block writing
      mockTerminal.write = vi.fn()

      // Fill queue beyond limit
      debugManager.writeWithBackpressure(mockTerminal, 'First')
      debugManager.writeWithBackpressure(mockTerminal, 'Second')
      debugManager.writeWithBackpressure(mockTerminal, 'Third')
      await debugManager.writeWithBackpressure(mockTerminal, 'Fourth')

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[BackpressureManager] Queue full, dropping oldest data'
      )

      consoleWarnSpy.mockRestore()
      debugManager.clear()
    })

    it('should log error when write fails with debug', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const debugManager = new TerminalBackpressureManager({ debug: true })

      mockTerminal.write = vi.fn(() => {
        throw new Error('Write failed')
      })

      await debugManager.writeWithBackpressure(mockTerminal, 'Test')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[BackpressureManager] Write error:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('chunking with delays', () => {
    it('should handle chunking with write delay', async () => {
      vi.useFakeTimers()

      const debugManager = new TerminalBackpressureManager({
        chunkSize: 10,
        writeDelay: 100,
        debug: true,
      })

      const largeData = 'x'.repeat(30) // Will create 3 chunks
      const writePromise = debugManager.writeWithBackpressure(
        mockTerminal,
        largeData
      )

      // Process all timers to complete chunked writes
      await vi.runAllTimersAsync()
      await writePromise

      const calls = (mockTerminal.write as ReturnType<typeof vi.fn>).mock.calls
      expect(calls.length).toBe(3) // Should have 3 chunks

      vi.useRealTimers()
    })

    it('should handle chunking without terminal write function', async () => {
      vi.useFakeTimers()

      const debugManager = new TerminalBackpressureManager({
        chunkSize: 10,
        writeDelay: 10,
      })

      const badTerminal = {} as Terminal // No write function
      const largeData = 'x'.repeat(30)

      const writePromise = debugManager.writeWithBackpressure(
        badTerminal,
        largeData
      )

      // Process all timers
      await vi.runAllTimersAsync()
      await writePromise

      // Should complete without error
      expect(debugManager.isCurrentlyWriting()).toBe(false)

      vi.useRealTimers()
    })

    it('should handle memory approaching max data size', () => {
      const manager = new TerminalBackpressureManager({
        maxDataSize: 100,
        maxQueueSize: 10,
      })

      // Block writing
      mockTerminal.write = vi.fn()

      // Start writing
      manager.writeWithBackpressure(mockTerminal, 'x')

      // Add data approaching 50% of max data size
      manager.writeWithBackpressure(mockTerminal, 'x'.repeat(51))

      expect(manager.isMemoryHealthy()).toBe(false)
      manager.clear()
    })
  })

  describe('concurrent operations', () => {
    it('should handle multiple concurrent writes', async () => {
      const writes = Array.from({ length: 10 }, (_, i) => `Write${i}`)

      const promises = writes.map((data) =>
        manager.writeWithBackpressure(mockTerminal, data)
      )

      await Promise.all(promises)

      // All writes should complete (may be batched/queued)
      const totalCalls = (mockTerminal.write as ReturnType<typeof vi.fn>).mock
        .calls.length
      expect(totalCalls).toBeGreaterThanOrEqual(1) // At least one write should occur
    })

    it('should maintain order of queued writes', async () => {
      const writes: string[] = []

      // Capture write order
      mockTerminal.write = vi.fn((data: string, callback?: () => void) => {
        writes.push(data)
        if (callback) setTimeout(callback, 0)
      })

      // Block first write temporarily
      let firstCallback: (() => void) | null = null
      mockTerminal.write = vi.fn((data: string, callback?: () => void) => {
        writes.push(data)
        if (!firstCallback && callback) {
          firstCallback = callback
        } else if (callback) {
          callback()
        }
      })

      // Queue writes
      const promise1 = manager.writeWithBackpressure(mockTerminal, 'First')
      const promise2 = manager.writeWithBackpressure(mockTerminal, 'Second')
      const promise3 = manager.writeWithBackpressure(mockTerminal, 'Third')

      // Release first write
      if (firstCallback) firstCallback()

      await Promise.all([promise1, promise2, promise3])

      // Verify order maintained
      expect(writes[0]).toBe('First')
      expect(writes[1]).toBe('Second')
      expect(writes[2]).toBe('Third')
    })
  })
})
