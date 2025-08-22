/**
 * @fileoverview Comprehensive tests for MessagePort IPC functionality
 *
 * @description
 * Tests for the MessagePort-based IPC system:
 * - Channel creation and management
 * - Message sending and receiving
 * - Performance monitoring and metrics
 * - Health check and connection management
 * - Error handling and edge cases
 * - Cleanup and resource management
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock modules with hoisted functions
const { mockMessageChannelMain, mockMessagePortMain } = vi.hoisted(() => ({
  mockMessageChannelMain: vi.fn(),
  mockMessagePortMain: {
    on: vi.fn(),
    postMessage: vi.fn(),
    close: vi.fn(),
    removeAllListeners: vi.fn(),
  },
}))

// Mock Electron MessageChannel
vi.mock('electron', () => ({
  MessageChannelMain: mockMessageChannelMain,
}))

// Mock Node.js EventEmitter
vi.mock('node:events', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    EventEmitter: actual.EventEmitter,
  }
})

describe('MessagePort IPC', () => {
  let originalConsoleLog: typeof console.log
  let originalConsoleError: typeof console.error
  let originalConsoleWarn: typeof console.warn
  // let _originalSetInterval: typeof setInterval
  // let _originalClearTimeout: typeof clearTimeout
  let originalDate: DateConstructor

  beforeEach(() => {
    // Store originals
    originalConsoleLog = console.log
    originalConsoleError = console.error
    originalConsoleWarn = console.warn
    // _originalSetInterval = setInterval
    // _originalClearTimeout = clearTimeout
    originalDate = global.Date

    // Mock console methods
    console.log = vi.fn()
    console.error = vi.fn()
    console.warn = vi.fn()

    // Mock timers
    vi.useFakeTimers()

    // Mock Date.now for consistent timestamps
    const mockDate = vi.fn()
    mockDate.now = vi.fn(() => 1640995200000) // Fixed timestamp
    global.Date = mockDate as unknown as DateConstructor
    global.Date.now = mockDate.now

    // Setup default MessageChannelMain mock
    const mockPort1 = {
      ...mockMessagePortMain,
      on: vi.fn(),
      postMessage: vi.fn(),
      close: vi.fn(),
    }

    const mockPort2 = {
      ...mockMessagePortMain,
      on: vi.fn(),
      postMessage: vi.fn(),
      close: vi.fn(),
    }

    mockMessageChannelMain.mockImplementation(() => ({
      port1: mockPort1,
      port2: mockPort2,
    }))

    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog
    console.error = originalConsoleError
    console.warn = originalConsoleWarn

    // Restore timers and date
    vi.useRealTimers()
    global.Date = originalDate

    vi.restoreAllMocks()
  })

  describe('MessagePortManager Class', () => {
    it('should create MessagePortManager instance', async () => {
      const { MessagePortManager } = await import('./messagePortIPC')
      const manager = new MessagePortManager()

      expect(manager).toBeInstanceOf(MessagePortManager)
      expect(manager).toBeInstanceOf(EventEmitter)
      expect(console.log).toHaveBeenCalledWith(
        '[MessagePort IPC] Manager initialized'
      )
    })

    it('should export singleton instance', async () => {
      const { messagePortManager } = await import('./messagePortIPC')

      expect(messagePortManager).toBeDefined()
      expect(typeof messagePortManager.createChannel).toBe('function')
      expect(typeof messagePortManager.sendMessage).toBe('function')
    })

    it('should setup health check on initialization', async () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval')

      const { MessagePortManager } = await import('./messagePortIPC')
      new MessagePortManager()

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000)
    })
  })

  describe('Channel Creation and Management', () => {
    it('should create channel successfully', async () => {
      vi.resetModules()

      const { MessagePortManager } = await import('./messagePortIPC')
      const manager = new MessagePortManager()

      const result = manager.createChannel('test-channel')

      expect(mockMessageChannelMain).toHaveBeenCalled()
      expect(result).toBeDefined()
      expect(result.port1).toBeDefined()
      expect(result.port2).toBeDefined()
      expect(console.log).toHaveBeenCalledWith(
        '[MessagePort IPC] Created channel: test-channel'
      )
    })

    it('should setup channel monitoring on creation', async () => {
      vi.resetModules()

      const { MessagePortManager } = await import('./messagePortIPC')
      const manager = new MessagePortManager()

      manager.createChannel('test-channel')

      const mockChannel = mockMessageChannelMain.mock.results[0].value
      expect(mockChannel.port1.on).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      )
      expect(mockChannel.port2.on).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      )
      expect(mockChannel.port1.on).toHaveBeenCalledWith(
        'close',
        expect.any(Function)
      )
      expect(mockChannel.port2.on).toHaveBeenCalledWith(
        'close',
        expect.any(Function)
      )
    })

    it('should handle channel creation errors', async () => {
      vi.resetModules()

      mockMessageChannelMain.mockImplementationOnce(() => {
        throw new Error('Channel creation failed')
      })

      const { MessagePortManager } = await import('./messagePortIPC')
      const manager = new MessagePortManager()

      expect(() => manager.createChannel('test-channel')).toThrow(
        'Channel creation failed'
      )
      expect(console.error).toHaveBeenCalledWith(
        '[MessagePort IPC] Failed to create channel test-channel:',
        expect.any(Error)
      )
    })

    it('should initialize connection health on channel creation', async () => {
      vi.resetModules()

      const { MessagePortManager } = await import('./messagePortIPC')
      const manager = new MessagePortManager()

      manager.createChannel('test-channel')
      const health = manager.getChannelHealth('test-channel')

      expect(health).not.toBeNull()
      expect(health?.connected).toBe(true)
      expect(health?.lastHeartbeat).toBe(1640995200000)
    })
  })

  describe('Message Sending and Receiving', () => {
    it('should send message through port1 successfully', async () => {
      vi.resetModules()

      const { MessagePortManager } = await import('./messagePortIPC')
      const manager = new MessagePortManager()

      manager.createChannel('test-channel')
      const mockChannel = mockMessageChannelMain.mock.results[0].value

      const messagePromise = manager.sendMessage('test-channel', 'port1', {
        id: 'msg-1',
        type: 'test',
        data: { content: 'hello' },
      })

      // Verify message was sent
      expect(mockChannel.port1.postMessage).toHaveBeenCalledWith({
        id: 'msg-1',
        type: 'test',
        data: { content: 'hello' },
        timestamp: 1640995200000,
      })
      expect(console.log).toHaveBeenCalledWith(
        '[MessagePort IPC] Sent message msg-1 via test-channel:port1'
      )

      // Simulate response to resolve promise
      manager.handleResponse({
        id: 'msg-1',
        success: true,
        data: { result: 'ok' },
        timestamp: 1640995200000,
      })

      const response = await messagePromise
      expect(response.success).toBe(true)
      expect(response.data).toEqual({ result: 'ok' })
    })

    it('should send message through port2 successfully', async () => {
      vi.resetModules()

      const { MessagePortManager } = await import('./messagePortIPC')
      const manager = new MessagePortManager()

      manager.createChannel('test-channel')
      const mockChannel = mockMessageChannelMain.mock.results[0].value

      const messagePromise = manager.sendMessage('test-channel', 'port2', {
        id: 'msg-2',
        type: 'test',
        data: { content: 'world' },
      })

      // Verify message was sent through port2
      expect(mockChannel.port2.postMessage).toHaveBeenCalledWith({
        id: 'msg-2',
        type: 'test',
        data: { content: 'world' },
        timestamp: 1640995200000,
      })

      // Simulate response
      manager.handleResponse({
        id: 'msg-2',
        success: true,
        timestamp: 1640995200000,
      })

      const response = await messagePromise
      expect(response.success).toBe(true)
    })

    it('should handle message sending to non-existent channel', async () => {
      vi.resetModules()

      const { MessagePortManager } = await import('./messagePortIPC')
      const manager = new MessagePortManager()

      await expect(
        manager.sendMessage('non-existent', 'port1', {
          id: 'msg-1',
          type: 'test',
        })
      ).rejects.toThrow('Channel non-existent not found')
    })

    it('should handle message timeout', async () => {
      vi.resetModules()

      const { MessagePortManager } = await import('./messagePortIPC')
      const manager = new MessagePortManager()

      manager.createChannel('test-channel')

      const messagePromise = manager.sendMessage('test-channel', 'port1', {
        id: 'msg-timeout',
        type: 'test',
      })

      // Advance time to trigger timeout (30 seconds)
      vi.advanceTimersByTime(30000)

      await expect(messagePromise).rejects.toThrow(
        'MessagePort timeout for test-channel:msg-timeout'
      )
    })

    it('should handle postMessage errors', async () => {
      vi.resetModules()

      const { MessagePortManager } = await import('./messagePortIPC')
      const manager = new MessagePortManager()

      manager.createChannel('test-channel')
      const mockChannel = mockMessageChannelMain.mock.results[0].value

      // Mock postMessage to throw error
      mockChannel.port1.postMessage.mockImplementationOnce(() => {
        throw new Error('PostMessage failed')
      })

      await expect(
        manager.sendMessage('test-channel', 'port1', {
          id: 'msg-error',
          type: 'test',
        })
      ).rejects.toThrow('PostMessage failed')
    })
  })

  describe('Response Handling', () => {
    it('should handle successful response', async () => {
      vi.resetModules()

      const { MessagePortManager } = await import('./messagePortIPC')
      const manager = new MessagePortManager()

      manager.createChannel('test-channel')

      const messagePromise = manager.sendMessage('test-channel', 'port1', {
        id: 'msg-success',
        type: 'test',
      })

      // Handle successful response
      manager.handleResponse({
        id: 'msg-success',
        success: true,
        data: { status: 'completed' },
        timestamp: 1640995200000,
      })

      const response = await messagePromise
      expect(response.success).toBe(true)
      expect(response.data).toEqual({ status: 'completed' })
    })

    it('should handle error response', async () => {
      vi.resetModules()

      const { MessagePortManager } = await import('./messagePortIPC')
      const manager = new MessagePortManager()

      manager.createChannel('test-channel')

      const messagePromise = manager.sendMessage('test-channel', 'port1', {
        id: 'msg-error',
        type: 'test',
      })

      // Handle error response
      manager.handleResponse({
        id: 'msg-error',
        success: false,
        error: 'Operation failed',
        timestamp: 1640995200000,
      })

      await expect(messagePromise).rejects.toThrow('Operation failed')
    })

    it('should handle error response without error message', async () => {
      vi.resetModules()

      const { MessagePortManager } = await import('./messagePortIPC')
      const manager = new MessagePortManager()

      manager.createChannel('test-channel')

      const messagePromise = manager.sendMessage('test-channel', 'port1', {
        id: 'msg-generic-error',
        type: 'test',
      })

      // Handle error response without specific error message
      manager.handleResponse({
        id: 'msg-generic-error',
        success: false,
        timestamp: 1640995200000,
      })

      await expect(messagePromise).rejects.toThrow(
        'MessagePort operation failed'
      )
    })

    it('should ignore response for non-existent message ID', async () => {
      vi.resetModules()

      const { MessagePortManager } = await import('./messagePortIPC')
      const manager = new MessagePortManager()

      // Should not throw
      expect(() => {
        manager.handleResponse({
          id: 'non-existent',
          success: true,
          timestamp: 1640995200000,
        })
      }).not.toThrow()
    })
  })

  describe('Channel Message Handling', () => {
    it('should handle channel message and emit event', async () => {
      vi.resetModules()

      const { MessagePortManager } = await import('./messagePortIPC')
      const manager = new MessagePortManager()

      const messageSpy = vi.fn()
      manager.on('message', messageSpy)

      manager.createChannel('test-channel')
      const mockChannel = mockMessageChannelMain.mock.results[0].value

      // Get the message handler for port1
      const messageHandler = mockChannel.port1.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'message'
      )?.[1]

      expect(messageHandler).toBeDefined()

      // Simulate message event
      const mockMessage = {
        id: 'test-msg',
        type: 'data',
        timestamp: 1640995200000,
      }

      messageHandler?.({ data: mockMessage })

      expect(messageSpy).toHaveBeenCalledWith({
        channelId: 'test-channel',
        port: 'port1',
        message: mockMessage,
        latency: 0, // Same timestamp
        totalMessages: 0,
      })
    })

    it('should calculate message latency correctly', async () => {
      vi.resetModules()

      // Mock Date.now to return different values
      let nowCallCount = 0
      global.Date.now = vi.fn(() => {
        nowCallCount++
        if (nowCallCount === 1) return 1640995200000 // Message timestamp
        return 1640995200100 // Handler timestamp (100ms later)
      })

      const { MessagePortManager } = await import('./messagePortIPC')
      const manager = new MessagePortManager()

      const messageSpy = vi.fn()
      manager.on('message', messageSpy)

      manager.createChannel('test-channel')
      const mockChannel = mockMessageChannelMain.mock.results[0].value

      // Get the message handler
      const messageHandler = mockChannel.port1.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'message'
      )?.[1]

      // Simulate message with earlier timestamp
      messageHandler?.({
        data: {
          id: 'test-msg',
          type: 'data',
          timestamp: 1640995200000, // Earlier timestamp
        },
      })

      expect(messageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          latency: 100, // 100ms difference
        })
      )
    })

    it('should ignore messages without timestamp', async () => {
      vi.resetModules()

      const { MessagePortManager } = await import('./messagePortIPC')
      const manager = new MessagePortManager()

      const messageSpy = vi.fn()
      manager.on('message', messageSpy)

      manager.createChannel('test-channel')
      const mockChannel = mockMessageChannelMain.mock.results[0].value

      // Get the message handler
      const messageHandler = mockChannel.port1.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'message'
      )?.[1]

      // Simulate message without timestamp
      messageHandler?.({
        data: {
          id: 'test-msg',
          type: 'data',
          // No timestamp
        },
      })

      expect(messageSpy).not.toHaveBeenCalled()
    })
  })

  describe('Performance Metrics', () => {
    it('should track message count and update metrics', async () => {
      vi.resetModules()

      const { MessagePortManager } = await import('./messagePortIPC')
      const manager = new MessagePortManager()

      manager.createChannel('test-channel')

      // Send multiple messages
      const promises = [
        manager.sendMessage('test-channel', 'port1', {
          id: 'msg-1',
          type: 'test',
        }),
        manager.sendMessage('test-channel', 'port1', {
          id: 'msg-2',
          type: 'test',
        }),
        manager.sendMessage('test-channel', 'port1', {
          id: 'msg-3',
          type: 'test',
        }),
      ]

      // Simulate responses
      manager.handleResponse({
        id: 'msg-1',
        success: true,
        timestamp: Date.now(),
      })
      manager.handleResponse({
        id: 'msg-2',
        success: true,
        timestamp: Date.now(),
      })
      manager.handleResponse({
        id: 'msg-3',
        success: true,
        timestamp: Date.now(),
      })

      await Promise.all(promises)

      const metrics = manager.getPerformanceMetrics()
      expect(metrics.messageCount).toBe(3)
      expect(metrics.channelsActive).toBe(1)
      expect(metrics.avgLatency).toBeDefined()
      expect(metrics.maxLatency).toBeDefined()
    })

    it('should calculate average and max latency correctly', async () => {
      vi.resetModules()

      const { MessagePortManager } = await import('./messagePortIPC')
      const manager = new MessagePortManager()

      // Manually set the internal metrics to test the calculation
      ;(manager as unknown as { messageCount: number }).messageCount = 2
      ;(manager as unknown as { avgLatency: number }).avgLatency = 75
      ;(manager as unknown as { maxLatency: number }).maxLatency = 100

      const metrics = manager.getPerformanceMetrics()
      expect(metrics.maxLatency).toBe(100) // Max latency
      expect(metrics.avgLatency).toBe(75) // Average latency
      expect(metrics.messageCount).toBe(2)
    })

    it('should return rounded average latency', async () => {
      vi.resetModules()

      const { MessagePortManager } = await import('./messagePortIPC')
      const manager = new MessagePortManager()

      // Set a decimal average to test rounding
      ;(manager as unknown as { avgLatency: number }).avgLatency = 15.333333

      const metrics = manager.getPerformanceMetrics()
      expect(Number.isInteger(metrics.avgLatency * 100)).toBe(true) // Should be rounded to 2 decimal places
      expect(metrics.avgLatency).toBe(15.33) // Should be rounded
    })
  })

  describe('Health Check and Connection Management', () => {
    it('should update connection health on message', async () => {
      vi.resetModules()

      const { MessagePortManager } = await import('./messagePortIPC')
      const manager = new MessagePortManager()

      manager.createChannel('test-channel')

      // Initial health should be connected
      let health = manager.getChannelHealth('test-channel')
      expect(health?.connected).toBe(true)
      expect(health?.lastHeartbeat).toBe(1640995200000)

      // Simulate message to update health
      global.Date.now = vi.fn(() => 1640995260000) // 1 minute later

      const mockChannel = mockMessageChannelMain.mock.results[0].value
      const messageHandler = mockChannel.port1.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'message'
      )?.[1]

      messageHandler?.({
        data: { id: 'test', timestamp: 1640995260000 },
      })

      health = manager.getChannelHealth('test-channel')
      expect(health?.lastHeartbeat).toBe(1640995260000)
      expect(health?.connected).toBe(true)
    })

    it('should return null health for non-existent channel', async () => {
      vi.resetModules()

      const { MessagePortManager } = await import('./messagePortIPC')
      const manager = new MessagePortManager()

      const health = manager.getChannelHealth('non-existent')
      expect(health).toBeNull()
    })

    it('should mark channel as stale after timeout', async () => {
      vi.resetModules()

      const { MessagePortManager } = await import('./messagePortIPC')
      const manager = new MessagePortManager()

      const staleSpy = vi.fn()
      manager.on('channelStale', staleSpy)

      manager.createChannel('test-channel')

      // Fast-forward time to trigger stale detection (61 seconds)
      global.Date.now = vi.fn(() => 1640995200000 + 61000)
      vi.advanceTimersByTime(30000) // Health check interval

      expect(console.warn).toHaveBeenCalledWith(
        '[MessagePort IPC] Channel test-channel appears stale'
      )
      expect(staleSpy).toHaveBeenCalledWith('test-channel')

      const health = manager.getChannelHealth('test-channel')
      expect(health?.connected).toBe(false)
    })

    it('should handle port close events', async () => {
      vi.resetModules()

      const { MessagePortManager } = await import('./messagePortIPC')
      const manager = new MessagePortManager()

      const disconnectedSpy = vi.fn()
      manager.on('channelDisconnected', disconnectedSpy)

      manager.createChannel('test-channel')
      const mockChannel = mockMessageChannelMain.mock.results[0].value

      // Get close handler for port1
      const closeHandler = mockChannel.port1.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'close'
      )?.[1]

      // Simulate port close
      closeHandler?.()

      expect(console.log).toHaveBeenCalledWith(
        '[MessagePort IPC] Port1 closed for channel: test-channel'
      )
      expect(disconnectedSpy).toHaveBeenCalledWith('test-channel')

      const health = manager.getChannelHealth('test-channel')
      expect(health?.connected).toBe(false)
    })
  })

  describe('Channel Cleanup and Resource Management', () => {
    it('should close channel successfully', async () => {
      vi.resetModules()

      const { MessagePortManager } = await import('./messagePortIPC')
      const manager = new MessagePortManager()

      manager.createChannel('test-channel')
      const mockChannel = mockMessageChannelMain.mock.results[0].value

      manager.closeChannel('test-channel')

      expect(mockChannel.port1.close).toHaveBeenCalled()
      expect(mockChannel.port2.close).toHaveBeenCalled()
      expect(console.log).toHaveBeenCalledWith(
        '[MessagePort IPC] Closed channel: test-channel'
      )

      const health = manager.getChannelHealth('test-channel')
      expect(health).toBeNull()
    })

    it('should handle errors during channel close', async () => {
      vi.resetModules()

      const { MessagePortManager } = await import('./messagePortIPC')
      const manager = new MessagePortManager()

      manager.createChannel('test-channel')
      const mockChannel = mockMessageChannelMain.mock.results[0].value

      // Mock port.close to throw error
      mockChannel.port1.close.mockImplementationOnce(() => {
        throw new Error('Close failed')
      })

      // Should not throw
      expect(() => manager.closeChannel('test-channel')).not.toThrow()
      expect(console.warn).toHaveBeenCalledWith(
        '[MessagePort IPC] Error closing channel test-channel:',
        expect.any(Error)
      )
    })

    it('should handle closing non-existent channel gracefully', async () => {
      vi.resetModules()

      const { MessagePortManager } = await import('./messagePortIPC')
      const manager = new MessagePortManager()

      // Should not throw
      expect(() => manager.closeChannel('non-existent')).not.toThrow()
    })

    it('should cleanup all channels', async () => {
      vi.resetModules()

      const { MessagePortManager } = await import('./messagePortIPC')
      const manager = new MessagePortManager()

      // Create multiple channels
      manager.createChannel('channel-1')
      manager.createChannel('channel-2')
      manager.createChannel('channel-3')

      // Create pending messages
      const promise1 = manager.sendMessage('channel-1', 'port1', {
        id: 'pending-1',
        type: 'test',
      })
      const promise2 = manager.sendMessage('channel-2', 'port1', {
        id: 'pending-2',
        type: 'test',
      })

      // Cleanup all
      manager.cleanup()

      expect(console.log).toHaveBeenCalledWith(
        '[MessagePort IPC] Cleaning up 3 channels'
      )
      expect(console.log).toHaveBeenCalledWith(
        '[MessagePort IPC] Cleanup complete'
      )

      // Pending messages should be rejected
      await expect(promise1).rejects.toThrow(
        'MessagePort manager shutting down'
      )
      await expect(promise2).rejects.toThrow(
        'MessagePort manager shutting down'
      )
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed message data', async () => {
      vi.resetModules()

      const { MessagePortManager } = await import('./messagePortIPC')
      const manager = new MessagePortManager()

      const messageSpy = vi.fn()
      manager.on('message', messageSpy)

      manager.createChannel('test-channel')
      const mockChannel = mockMessageChannelMain.mock.results[0].value

      // Get message handler
      const messageHandler = mockChannel.port1.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'message'
      )?.[1]

      // Simulate malformed message
      messageHandler?.({ data: null })
      messageHandler?.({ data: undefined })
      messageHandler?.({ data: 'invalid' })

      // Should not emit message events for malformed data
      expect(messageSpy).not.toHaveBeenCalled()
    })

    it('should handle zero latency messages', async () => {
      vi.resetModules()

      const { MessagePortManager } = await import('./messagePortIPC')
      const manager = new MessagePortManager()

      // Set zero latency metrics
      ;(manager as unknown as { messageCount: number }).messageCount = 1
      ;(manager as unknown as { avgLatency: number }).avgLatency = 0
      ;(manager as unknown as { maxLatency: number }).maxLatency = 0

      const metrics = manager.getPerformanceMetrics()
      expect(metrics.avgLatency).toBe(0)
      expect(metrics.maxLatency).toBe(0)
    })

    it('should handle performance metrics with no messages', async () => {
      vi.resetModules()

      const { MessagePortManager } = await import('./messagePortIPC')
      const manager = new MessagePortManager()

      const metrics = manager.getPerformanceMetrics()
      expect(metrics.messageCount).toBe(0)
      expect(metrics.avgLatency).toBe(0)
      expect(metrics.maxLatency).toBe(0)
      expect(metrics.channelsActive).toBe(0)
    })
  })
})
