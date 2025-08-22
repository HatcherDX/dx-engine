/**
 * @fileoverview Comprehensive tests for PTY MessagePort Bridge implementation.
 *
 * @description
 * Tests for the PTY MessagePort Bridge covering:
 * - Bridge creation and initialization
 * - MessagePort connection management and setup
 * - Terminal operations (create, write, resize, kill)
 * - Message queuing and processing
 * - Connection error handling and reconnection logic
 * - Performance metrics tracking
 * - Cleanup and resource management
 * - Event emission and handling
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock modules with hoisted functions
const {
  mockMessageChannelMain,
  mockMessagePortMain,
  mockSetTimeout,
  mockClearTimeout,
} = vi.hoisted(() => ({
  mockMessageChannelMain: vi.fn(),
  mockMessagePortMain: {
    start: vi.fn(),
    postMessage: vi.fn(),
    close: vi.fn(),
    on: vi.fn(),
    removeAllListeners: vi.fn(),
  },
  mockSetTimeout: vi.fn(),
  mockClearTimeout: vi.fn(),
}))

// Mock Electron MessageChannel
vi.mock('electron', () => ({
  MessageChannelMain: mockMessageChannelMain,
}))

// Mock timers
vi.mock('node:timers', () => ({
  setTimeout: mockSetTimeout,
  clearTimeout: mockClearTimeout,
}))

describe('PtyMessagePortBridge', () => {
  let originalConsoleLog: typeof console.log
  let originalConsoleError: typeof console.error
  let originalConsoleWarn: typeof console.warn
  let originalSetTimeout: typeof setTimeout
  let originalDate: DateConstructor

  beforeEach(() => {
    // Store originals
    originalConsoleLog = console.log
    originalConsoleError = console.error
    originalConsoleWarn = console.warn
    originalSetTimeout = setTimeout
    originalDate = global.Date

    // Mock console methods
    console.log = vi.fn()
    console.error = vi.fn()
    console.warn = vi.fn()

    // Mock Date.now for consistent timestamps
    const mockDate = vi.fn()
    mockDate.now = vi.fn(() => 1640995200000)
    global.Date = mockDate as unknown as DateConstructor
    global.Date.now = mockDate.now

    // Mock setTimeout
    global.setTimeout = vi.fn(() => {
      const id = Math.random()
      return id as unknown as number
    }) as unknown as typeof setTimeout

    // Setup default MessageChannelMain mock
    const createMockPort = () => ({
      ...mockMessagePortMain,
      start: vi.fn(),
      postMessage: vi.fn(),
      close: vi.fn(),
      on: vi.fn(),
    })

    const mockPort1 = createMockPort()
    const mockPort2 = createMockPort()

    mockMessageChannelMain.mockImplementation(() => ({
      port1: mockPort1,
      port2: mockPort2,
    }))

    // Clear all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog
    console.error = originalConsoleError
    console.warn = originalConsoleWarn

    // Restore global objects
    global.setTimeout = originalSetTimeout
    global.Date = originalDate

    vi.restoreAllMocks()
  })

  describe('PtyMessagePortBridge Class', () => {
    it('should create PtyMessagePortBridge instance', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      expect(bridge).toBeInstanceOf(PtyMessagePortBridge)
      expect(bridge).toBeInstanceOf(EventEmitter)
    })

    it('should have correct channelId', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('my-terminal-channel')

      // Access private property through casting
      expect((bridge as { channelId: string }).channelId).toBe(
        'my-terminal-channel'
      )
    })

    it('should initialize with correct default values', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      const status = bridge.getConnectionStatus()
      expect(status.connected).toBe(false)
      expect(status.reconnectAttempts).toBe(0)
      expect(status.queuedMessages).toBe(0)
      expect(status.performance.messageCount).toBe(0)
      expect(status.performance.avgLatency).toBe(0)
      expect(status.performance.maxLatency).toBe(0)
    })
  })

  describe('Factory Function', () => {
    it('should create bridge instance via factory', async () => {
      const { createPtyMessagePortBridge, PtyMessagePortBridge } = await import(
        './ptyMessagePortBridge'
      )
      const bridge = createPtyMessagePortBridge('factory-channel')

      expect(bridge).toBeInstanceOf(PtyMessagePortBridge)
      expect((bridge as { channelId: string }).channelId).toBe(
        'factory-channel'
      )
    })
  })

  describe('Connection Initialization', () => {
    it('should initialize connection successfully', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      const connectedSpy = vi.fn()
      bridge.on('connected', connectedSpy)

      await bridge.initialize()

      expect(mockMessageChannelMain).toHaveBeenCalled()
      expect(console.log).toHaveBeenCalledWith(
        '[PTY MessagePort] Setting up connection: test-channel'
      )
      expect(console.log).toHaveBeenCalledWith(
        '[PTY MessagePort] Connection established: test-channel'
      )
      expect(connectedSpy).toHaveBeenCalled()

      const status = bridge.getConnectionStatus()
      expect(status.connected).toBe(true)
      expect(status.performance.channelsActive).toBe(1)
    })

    it('should setup renderer port correctly', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      await bridge.initialize()

      const mockChannel = mockMessageChannelMain.mock.results[0].value
      expect(mockChannel.port1.start).toHaveBeenCalled()
      expect(mockChannel.port1.on).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      )
      expect(mockChannel.port1.on).toHaveBeenCalledWith(
        'close',
        expect.any(Function)
      )
      expect(console.log).toHaveBeenCalledWith(
        '[PTY MessagePort] Renderer port ready: test-channel'
      )
    })

    it('should setup PTY host port correctly', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      await bridge.initialize()

      const mockChannel = mockMessageChannelMain.mock.results[0].value
      expect(mockChannel.port2.start).toHaveBeenCalled()
      expect(mockChannel.port2.on).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      )
      expect(mockChannel.port2.on).toHaveBeenCalledWith(
        'close',
        expect.any(Function)
      )
      expect(console.log).toHaveBeenCalledWith(
        '[PTY MessagePort] PTY Host port ready: test-channel'
      )
    })

    it('should handle connection setup errors', async () => {
      mockMessageChannelMain.mockImplementationOnce(() => {
        throw new Error('Channel creation failed')
      })

      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      const errorSpy = vi.fn()
      bridge.on('error', errorSpy)

      await expect(bridge.initialize()).rejects.toThrow(
        'Channel creation failed'
      )

      expect(console.error).toHaveBeenCalledWith(
        '[PTY MessagePort] Failed to setup connection:',
        expect.any(Error)
      )
      expect(errorSpy).toHaveBeenCalled()
    })
  })

  describe('Terminal Operations', () => {
    it('should create terminal successfully', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      await bridge.initialize()
      const mockChannel = mockMessageChannelMain.mock.results[0].value

      await bridge.createTerminal({
        name: 'My Terminal',
        shell: '/bin/bash',
        cwd: '/home/user',
        env: { PATH: '/usr/bin' },
      })

      expect(mockChannel.port2.postMessage).toHaveBeenCalledWith({
        type: 'create',
        terminalId: 'test-channel',
        data: {
          options: {
            name: 'My Terminal',
            shell: '/bin/bash',
            cwd: '/home/user',
            env: { PATH: '/usr/bin' },
          },
        },
        timestamp: 1640995200000,
        requestId: expect.stringContaining('create-test-channel-'),
      })

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[PTY MessagePort] Sent request: create')
      )
    })

    it('should create terminal with default options', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      await bridge.initialize()
      const mockChannel = mockMessageChannelMain.mock.results[0].value

      await bridge.createTerminal()

      expect(mockChannel.port2.postMessage).toHaveBeenCalledWith({
        type: 'create',
        terminalId: 'test-channel',
        data: { options: undefined },
        timestamp: 1640995200000,
        requestId: expect.stringContaining('create-test-channel-'),
      })
    })

    it('should write data to terminal', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      await bridge.initialize()
      const mockChannel = mockMessageChannelMain.mock.results[0].value

      await bridge.write('echo hello world\n')

      expect(mockChannel.port2.postMessage).toHaveBeenCalledWith({
        type: 'write',
        terminalId: 'test-channel',
        data: { text: 'echo hello world\n' },
        timestamp: 1640995200000,
        requestId: expect.stringContaining('write-test-channel-'),
      })
    })

    it('should resize terminal', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      await bridge.initialize()
      const mockChannel = mockMessageChannelMain.mock.results[0].value

      await bridge.resize(120, 30)

      expect(mockChannel.port2.postMessage).toHaveBeenCalledWith({
        type: 'resize',
        terminalId: 'test-channel',
        data: { cols: 120, rows: 30 },
        timestamp: 1640995200000,
        requestId: expect.stringContaining('resize-test-channel-'),
      })
    })

    it('should kill terminal', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      await bridge.initialize()
      const mockChannel = mockMessageChannelMain.mock.results[0].value

      await bridge.kill()

      expect(mockChannel.port2.postMessage).toHaveBeenCalledWith({
        type: 'kill',
        terminalId: 'test-channel',
        timestamp: 1640995200000,
        requestId: expect.stringContaining('kill-test-channel-'),
      })
    })

    it('should track performance metrics on operations', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      await bridge.initialize()

      await bridge.write('test1')
      await bridge.write('test2')
      await bridge.resize(80, 24)

      const status = bridge.getConnectionStatus()
      expect(status.performance.messageCount).toBe(3)
    })
  })

  describe('Message Queuing', () => {
    it('should queue messages when not connected', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      // Don't initialize - should queue messages
      await expect(bridge.write('queued message')).rejects.toThrow(
        'MessagePort not connected'
      )

      expect(console.warn).toHaveBeenCalledWith(
        '[PTY MessagePort] Queuing message - not connected:',
        'write'
      )

      const status = bridge.getConnectionStatus()
      expect(status.queuedMessages).toBe(1)
    })

    it('should process queued messages after connection', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      // Queue a message while disconnected
      bridge.write('queued message').catch(() => {
        /* ignore error */
      })

      expect(bridge.getConnectionStatus().queuedMessages).toBe(1)

      // Now initialize and check if queue is processed
      await bridge.initialize()
      const mockChannel = mockMessageChannelMain.mock.results[0].value

      expect(console.log).toHaveBeenCalledWith(
        '[PTY MessagePort] Processing 1 queued messages'
      )
      expect(mockChannel.port2.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'write',
          data: { text: 'queued message' },
        })
      )

      expect(bridge.getConnectionStatus().queuedMessages).toBe(0)
    })

    it('should handle queued message processing errors', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      const errorSpy = vi.fn()
      bridge.on('error', errorSpy)

      // Initialize first
      await bridge.initialize()
      const mockChannel = mockMessageChannelMain.mock.results[0].value

      // Queue a message by making disconnected
      ;(bridge as { isConnected: boolean }).isConnected = false
      bridge.write('test').catch(() => {
        /* ignore error */
      })

      // Reconnect and make postMessage throw error
      ;(bridge as { isConnected: boolean }).isConnected = true
      mockChannel.port2.postMessage.mockImplementationOnce(() => {
        throw new Error('Queue processing failed')
      })

      // Process queue should handle error
      ;(bridge as { processMessageQueue: () => void }).processMessageQueue()

      // Wait for async error handling
      await new Promise((resolve) => process.nextTick(resolve))

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Queue processing failed' })
      )
    })
  })

  describe('Message Handling', () => {
    it('should handle renderer messages', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      await bridge.initialize()
      const mockChannel = mockMessageChannelMain.mock.results[0].value

      // Get the renderer message handler
      const messageHandler = mockChannel.port1.on.mock.calls.find(
        (call) => call[0] === 'message'
      )?.[1]

      expect(messageHandler).toBeDefined()

      // Simulate renderer message
      const testRequest = {
        type: 'write' as const,
        terminalId: 'test-channel',
        data: { text: 'renderer test' },
      }

      messageHandler?.({ data: testRequest })

      expect(console.log).toHaveBeenCalledWith(
        '[PTY MessagePort] Processing renderer request: write'
      )
      expect(mockChannel.port2.postMessage).toHaveBeenCalledWith(testRequest)
    })

    it('should handle PTY host responses', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      const dataSpy = vi.fn()
      const responseSpy = vi.fn()
      bridge.on('data', dataSpy)
      bridge.on('response', responseSpy)

      await bridge.initialize()
      const mockChannel = mockMessageChannelMain.mock.results[0].value

      // Get the PTY host message handler
      const messageHandler = mockChannel.port2.on.mock.calls.find(
        (call) => call[0] === 'message'
      )?.[1]

      expect(messageHandler).toBeDefined()

      // Simulate PTY host response with data
      const testResponse = {
        success: true,
        data: { output: 'Terminal output data' },
        timestamp: 1640995200000,
        requestId: 'test-request-123',
      }

      messageHandler?.({ data: testResponse })

      expect(console.log).toHaveBeenCalledWith(
        '[PTY MessagePort] Received PTY Host response: test-request-123'
      )
      expect(dataSpy).toHaveBeenCalledWith('Terminal output data')
      expect(responseSpy).toHaveBeenCalledWith(testResponse)
    })

    it('should calculate latency correctly', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      await bridge.initialize()
      const mockChannel = mockMessageChannelMain.mock.results[0].value

      // Get PTY host message handler
      const messageHandler = mockChannel.port2.on.mock.calls.find(
        (call) => call[0] === 'message'
      )?.[1]

      // Mock Date.now to return higher value for latency calculation
      global.Date.now = vi.fn(() => 1640995200500) // 500ms later

      // Simulate response with earlier timestamp
      messageHandler?.({
        data: {
          success: true,
          timestamp: 1640995200000, // Earlier timestamp
          requestId: 'test-latency',
        },
      })

      const status = bridge.getConnectionStatus()
      expect(status.performance.maxLatency).toBe(500) // 500ms latency
    })

    it('should handle responses without output data', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      const dataSpy = vi.fn()
      const responseSpy = vi.fn()
      bridge.on('data', dataSpy)
      bridge.on('response', responseSpy)

      await bridge.initialize()
      const mockChannel = mockMessageChannelMain.mock.results[0].value

      const messageHandler = mockChannel.port2.on.mock.calls.find(
        (call) => call[0] === 'message'
      )?.[1]

      // Response without output data
      const testResponse = {
        success: true,
        requestId: 'no-output-test',
      }

      messageHandler?.({ data: testResponse })

      expect(dataSpy).not.toHaveBeenCalled()
      expect(responseSpy).toHaveBeenCalledWith(testResponse)
    })
  })

  describe('Connection Error Handling', () => {
    it('should handle renderer port close', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      const disconnectedSpy = vi.fn()
      const errorSpy = vi.fn()
      bridge.on('disconnected', disconnectedSpy)
      bridge.on('error', errorSpy)

      await bridge.initialize()
      const mockChannel = mockMessageChannelMain.mock.results[0].value

      // Get renderer port close handler
      const closeHandler = mockChannel.port1.on.mock.calls.find(
        (call) => call[0] === 'close'
      )?.[1]

      closeHandler?.()

      expect(console.warn).toHaveBeenCalledWith(
        '[PTY MessagePort] Renderer port closed'
      )
      expect(disconnectedSpy).toHaveBeenCalled()
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'MessagePort disconnected' })
      )
    })

    it('should handle PTY host port close', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      const disconnectedSpy = vi.fn()
      const errorSpy = vi.fn()
      bridge.on('disconnected', disconnectedSpy)
      bridge.on('error', errorSpy)

      await bridge.initialize()
      const mockChannel = mockMessageChannelMain.mock.results[0].value

      // Get PTY host port close handler
      const closeHandler = mockChannel.port2.on.mock.calls.find(
        (call) => call[0] === 'close'
      )?.[1]

      closeHandler?.()

      expect(console.warn).toHaveBeenCalledWith(
        '[PTY MessagePort] PTY Host port closed'
      )
      expect(disconnectedSpy).toHaveBeenCalled()
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'MessagePort disconnected' })
      )
    })

    it('should attempt reconnection with exponential backoff', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      const errorSpy = vi.fn()
      bridge.on('error', errorSpy)

      // Simulate connection error
      ;(
        bridge as { handleConnectionError: (error: Error) => void }
      ).handleConnectionError(new Error('Connection lost'))

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Connection lost' })
      )
      expect(global.setTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        2000 // First retry delay = 1000 * 2^1 = 2000ms
      )
      expect(console.log).toHaveBeenCalledWith(
        '[PTY MessagePort] Attempting reconnection 1/5 in 2000ms'
      )

      const status = bridge.getConnectionStatus()
      expect(status.connected).toBe(false)
      expect(status.reconnectAttempts).toBe(1)
    })

    it('should emit maxReconnectAttemptsReached after max attempts', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      const maxReachSpy = vi.fn()
      const errorSpy = vi.fn()
      bridge.on('maxReconnectAttemptsReached', maxReachSpy)
      bridge.on('error', errorSpy)

      // Set reconnect attempts to max
      ;(
        bridge as {
          reconnectAttempts: number
          handleConnectionError: (error: Error) => void
        }
      ).reconnectAttempts = 5

      // Trigger connection error
      ;(
        bridge as {
          reconnectAttempts: number
          handleConnectionError: (error: Error) => void
        }
      ).handleConnectionError(new Error('Final failure'))

      expect(console.error).toHaveBeenCalledWith(
        '[PTY MessagePort] Max reconnection attempts reached'
      )
      expect(maxReachSpy).toHaveBeenCalled()
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Final failure' })
      )
    })

    it('should handle postMessage errors', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      await bridge.initialize()
      const mockChannel = mockMessageChannelMain.mock.results[0].value

      // Mock postMessage to throw error
      mockChannel.port2.postMessage.mockImplementationOnce(() => {
        throw new Error('PostMessage failed')
      })

      await expect(bridge.write('test')).rejects.toThrow('PostMessage failed')
      expect(console.error).toHaveBeenCalledWith(
        '[PTY MessagePort] Failed to send request:',
        expect.any(Error)
      )
    })

    it('should handle renderer message forwarding errors', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      const errorSpy = vi.fn()
      bridge.on('error', errorSpy)

      await bridge.initialize()
      const mockChannel = mockMessageChannelMain.mock.results[0].value

      // Make sendRequest fail
      mockChannel.port2.postMessage.mockImplementationOnce(() => {
        throw new Error('Forward failed')
      })

      // Get renderer message handler
      const messageHandler = mockChannel.port1.on.mock.calls.find(
        (call) => call[0] === 'message'
      )?.[1]

      // Send renderer message that will fail to forward
      messageHandler?.({
        data: { type: 'write', terminalId: 'test', data: { text: 'fail' } },
      })

      // Wait for async error handling
      await new Promise((resolve) => process.nextTick(resolve))

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Forward failed' })
      )
    })
  })

  describe('Performance Metrics', () => {
    it('should calculate average latency correctly', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      // Manually set performance metrics
      ;(
        bridge as {
          performanceMetrics: {
            messageCount: number
            totalLatency: number
            messagesSent: number
            messagesReceived: number
            errors: number
          }
        }
      ).performanceMetrics = {
        messageCount: 4,
        totalLatency: 400, // Total 400ms across 4 messages
        maxLatency: 150,
        channelsActive: 1,
      }

      const status = bridge.getConnectionStatus()
      expect(status.performance.avgLatency).toBe(100) // 400/4 = 100ms avg
      expect(status.performance.maxLatency).toBe(150)
      expect(status.performance.messageCount).toBe(4)
    })

    it('should handle zero message count for average latency', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      const status = bridge.getConnectionStatus()
      expect(status.performance.avgLatency).toBe(0)
      expect(status.performance.messageCount).toBe(0)
    })

    it('should update max latency correctly', async () => {
      let nowCallCount = 0
      global.Date.now = vi.fn(() => {
        nowCallCount++
        if (nowCallCount === 1) return 1640995200000
        if (nowCallCount === 2) return 1640995200250 // 250ms later
        return 1640995200100 // 100ms later
      })

      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      await bridge.initialize()
      const mockChannel = mockMessageChannelMain.mock.results[0].value

      const messageHandler = mockChannel.port2.on.mock.calls.find(
        (call) => call[0] === 'message'
      )?.[1]

      // First response with higher latency
      messageHandler?.({
        data: {
          success: true,
          timestamp: 1640995200000,
          requestId: 'high-latency',
        },
      })

      // Second response with lower latency
      messageHandler?.({
        data: {
          success: true,
          timestamp: 1640995200000,
          requestId: 'low-latency',
        },
      })

      const status = bridge.getConnectionStatus()
      expect(status.performance.maxLatency).toBe(250) // Should keep the higher value
    })
  })

  describe('Manual Reconnection', () => {
    it('should force reconnection', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      await bridge.initialize()

      // Verify connected
      expect(bridge.getConnectionStatus().connected).toBe(true)

      // Mock setupConnection to avoid actual reconnection
      ;(
        bridge as { setupConnection: ReturnType<typeof vi.fn> }
      ).setupConnection = vi.fn().mockResolvedValue(undefined)

      // Force reconnection
      bridge.reconnect()

      expect(bridge.getConnectionStatus().connected).toBe(false)
      expect(bridge.getConnectionStatus().reconnectAttempts).toBe(0) // Reset
      expect(
        (bridge as { setupConnection: ReturnType<typeof vi.fn> })
          .setupConnection
      ).toHaveBeenCalled()
    })

    it('should handle manual reconnection errors', async () => {
      mockMessageChannelMain.mockImplementationOnce(() => {
        throw new Error('Manual reconnect failed')
      })

      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      const errorSpy = vi.fn()
      bridge.on('error', errorSpy)

      bridge.reconnect()

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Manual reconnect failed' })
      )
    })
  })

  describe('Cleanup and Resource Management', () => {
    it('should cleanup resources correctly', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      const cleanupSpy = vi.fn()
      bridge.on('cleanup', cleanupSpy)

      await bridge.initialize()
      const mockChannel = mockMessageChannelMain.mock.results[0].value

      bridge.cleanup()

      expect(mockChannel.port1.close).toHaveBeenCalled()
      expect(mockChannel.port2.close).toHaveBeenCalled()
      expect(cleanupSpy).toHaveBeenCalled()
      expect(console.log).toHaveBeenCalledWith(
        '[PTY MessagePort] Bridge cleaned up: test-channel'
      )

      const status = bridge.getConnectionStatus()
      expect(status.connected).toBe(false)
      expect(status.queuedMessages).toBe(0)
      expect(status.performance.channelsActive).toBe(0)
    })

    it('should cleanup even if ports are null', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      // Don't initialize - ports will be null
      expect(() => bridge.cleanup()).not.toThrow()
    })

    it('should clear message queue on cleanup', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      // Queue a message
      bridge.write('test').catch(() => {
        /* ignore error */
      })
      expect(bridge.getConnectionStatus().queuedMessages).toBe(1)

      bridge.cleanup()
      expect(bridge.getConnectionStatus().queuedMessages).toBe(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle operations without initialization', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      // Operations should be queued and fail
      await expect(bridge.createTerminal()).rejects.toThrow(
        'MessagePort not connected'
      )
      await expect(bridge.write('test')).rejects.toThrow(
        'MessagePort not connected'
      )
      await expect(bridge.resize(80, 24)).rejects.toThrow(
        'MessagePort not connected'
      )
      await expect(bridge.kill()).rejects.toThrow('MessagePort not connected')

      expect(bridge.getConnectionStatus().queuedMessages).toBe(4)
    })

    it('should handle responses without timestamps', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      await bridge.initialize()
      const mockChannel = mockMessageChannelMain.mock.results[0].value

      const messageHandler = mockChannel.port2.on.mock.calls.find(
        (call) => call[0] === 'message'
      )?.[1]

      // Response without timestamp
      const response = {
        success: true,
        requestId: 'no-timestamp',
      }

      expect(() => messageHandler?.({ data: response })).not.toThrow()
    })

    it('should handle responses without requestId', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      await bridge.initialize()
      const mockChannel = mockMessageChannelMain.mock.results[0].value

      const messageHandler = mockChannel.port2.on.mock.calls.find(
        (call) => call[0] === 'message'
      )?.[1]

      // Response without requestId
      const response = {
        success: true,
        data: { output: 'some data' },
      }

      expect(() => messageHandler?.({ data: response })).not.toThrow()
    })

    it('should handle disconnection while connected', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      const disconnectedSpy = vi.fn()
      const errorSpy = vi.fn()
      bridge.on('disconnected', disconnectedSpy)
      bridge.on('error', errorSpy)

      await bridge.initialize()

      // Verify initially connected
      expect(bridge.getConnectionStatus().connected).toBe(true)
      expect(bridge.getConnectionStatus().performance.channelsActive).toBe(1)

      // Simulate disconnection
      ;(bridge as { handleDisconnection: () => void }).handleDisconnection()

      const status = bridge.getConnectionStatus()
      expect(status.connected).toBe(false)
      expect(status.performance.channelsActive).toBe(0)
      expect(disconnectedSpy).toHaveBeenCalled()
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'MessagePort disconnected' })
      )
    })

    it('should cap exponential backoff delay', async () => {
      const { PtyMessagePortBridge } = await import('./ptyMessagePortBridge')
      const bridge = new PtyMessagePortBridge('test-channel')

      const errorSpy = vi.fn()
      bridge.on('error', errorSpy)

      // Set reconnect attempts to 4 (within limit of 5)
      ;(
        bridge as {
          reconnectAttempts: number
          handleConnectionError: (error: Error) => void
        }
      ).reconnectAttempts = 4
      ;(
        bridge as {
          reconnectAttempts: number
          handleConnectionError: (error: Error) => void
        }
      ).handleConnectionError(new Error('High attempt count'))

      // Should be capped at 10000ms (Math.min(1000 * 2^5, 10000) = 10000)
      expect(global.setTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        10000
      )
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'High attempt count' })
      )
    })
  })
})
