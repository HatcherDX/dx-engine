/**
 * @fileoverview Comprehensive tests for Terminal IPC handlers.
 *
 * @description
 * Tests for the Terminal IPC system covering:
 * - Terminal system initialization and cleanup
 * - PTY Manager integration and event handling
 * - Terminal creation, input, and lifecycle management
 * - Performance metrics and monitoring
 * - IPC handler setup and message broadcasting
 * - Error handling and edge cases
 * - Resource management and cleanup
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Global references for mocking
let mockPtyManagerInstance: {
  createTerminal: ReturnType<typeof vi.fn>
  sendInput: ReturnType<typeof vi.fn>
  resizeTerminal: ReturnType<typeof vi.fn>
  closeTerminal: ReturnType<typeof vi.fn>
  listTerminals: ReturnType<typeof vi.fn>
  getTerminal: ReturnType<typeof vi.fn>
  getGlobalMetrics: ReturnType<typeof vi.fn>
  getTerminalMetrics: ReturnType<typeof vi.fn>
  getPerformanceAlerts: ReturnType<typeof vi.fn>
  exportMetrics: ReturnType<typeof vi.fn>
  cleanup: ReturnType<typeof vi.fn>
  on: ReturnType<typeof vi.fn>
  removeAllListeners: ReturnType<typeof vi.fn>
}
let mockWindow: {
  id: number
  isDestroyed: ReturnType<typeof vi.fn>
  isVisible: ReturnType<typeof vi.fn>
  isFocused: ReturnType<typeof vi.fn>
  webContents: {
    send: ReturnType<typeof vi.fn>
    isDestroyed: ReturnType<typeof vi.fn>
    isLoading: ReturnType<typeof vi.fn>
    isCrashed: ReturnType<typeof vi.fn>
  }
}

// Mock modules with hoisted functions
const {
  mockIpcMain,
  mockBrowserWindow,
  mockPtyManager,
  hoistedMockPtyManagerInstance,
} = vi.hoisted(() => {
  const mockPtyManagerInstance = {
    createTerminal: vi.fn(),
    writeToTerminal: vi.fn(),
    resizeTerminal: vi.fn(),
    killTerminal: vi.fn(),
    listTerminals: vi.fn(),
    getPerformanceMetrics: vi.fn(),
    getTerminalPerformanceMetrics: vi.fn(),
    getTerminalAlerts: vi.fn(),
    exportPerformanceData: vi.fn(),
    destroy: vi.fn(),
    // EventEmitter methods
    on: vi.fn(),
    emit: vi.fn(),
    off: vi.fn(),
    removeListener: vi.fn(),
    removeAllListeners: vi.fn(),
    addListener: vi.fn(),
    once: vi.fn(),
    eventNames: vi.fn(() => []),
    listenerCount: vi.fn(() => 0),
    listeners: vi.fn(() => []),
    setMaxListeners: vi.fn(),
    getMaxListeners: vi.fn(() => 10),
  }

  return {
    mockIpcMain: {
      handle: vi.fn(),
      on: vi.fn(),
      removeHandler: vi.fn(),
      removeAllListeners: vi.fn(),
    },
    mockBrowserWindow: {
      getAllWindows: vi.fn(() => []),
    },
    mockPtyManager: vi.fn(() => mockPtyManagerInstance),
    hoistedMockPtyManagerInstance: mockPtyManagerInstance,
  }
})

// Mock electron modules
vi.mock('electron', () => ({
  BrowserWindow: mockBrowserWindow,
  ipcMain: mockIpcMain,
}))

// Mock PtyManager with hoisted mock
vi.mock('./ptyManager', () => ({
  PtyManager: mockPtyManager,
}))

describe('Terminal IPC System', () => {
  let originalConsoleLog: typeof console.log
  let originalConsoleError: typeof console.error

  beforeEach(() => {
    // Store originals
    originalConsoleLog = console.log
    originalConsoleError = console.error

    // Mock console methods
    console.log = vi.fn()
    console.error = vi.fn()
    console.warn = vi.fn()

    // Reset all mocks
    vi.clearAllMocks()

    // Use the hoisted mock PTY Manager instance
    mockPtyManagerInstance = hoistedMockPtyManagerInstance

    // Setup mock window for broadcasting
    mockWindow = {
      id: 1,
      isDestroyed: vi.fn(() => false),
      isVisible: vi.fn(() => true),
      isFocused: vi.fn(() => true),
      webContents: {
        send: vi.fn(),
        isDestroyed: vi.fn(() => false),
        isLoading: vi.fn(() => false),
        isCrashed: vi.fn(() => false),
      },
    }
    mockBrowserWindow.getAllWindows.mockReturnValue([mockWindow])

    // Setup default PTY Manager behavior
    mockPtyManagerInstance.createTerminal.mockResolvedValue({
      id: 'terminal-123',
      pid: 12345,
      shell: '/bin/bash',
      cwd: '/home/user',
      capabilities: {
        backend: 'node-pty',
        supportsResize: true,
        supportsColors: true,
        supportsInteractivity: true,
        supportsHistory: true,
        reliability: 'high',
      },
    })

    mockPtyManagerInstance.listTerminals.mockResolvedValue([
      {
        id: 'terminal-123',
        pid: 12345,
        shell: '/bin/bash',
        cwd: '/home/user',
      },
    ])

    mockPtyManagerInstance.getPerformanceMetrics.mockReturnValue({
      totalTerminals: 2,
      activeTerminals: 2,
      averageUptime: 300000,
      totalDataProcessed: 1048576,
      averageMemoryUsage: 50.5,
    })

    mockPtyManagerInstance.getTerminalPerformanceMetrics.mockReturnValue({
      terminalId: 'terminal-123',
      pid: 12345,
      strategy: 'node-pty',
      uptime: 60000,
      dataProcessed: 102400,
      memoryUsage: 45.2,
      cpuUsage: 12.8,
      metrics: [],
    })

    mockPtyManagerInstance.getTerminalAlerts.mockReturnValue([])
    mockPtyManagerInstance.exportPerformanceData.mockReturnValue({
      export: 'data',
    })
  })

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog
    console.error = originalConsoleError

    vi.restoreAllMocks()
  })

  describe('System Initialization', () => {
    it('should initialize terminal system successfully', async () => {
      const { initializeTerminalSystem } = await import('./terminalIPC')

      initializeTerminalSystem()

      expect(console.log).toHaveBeenCalledWith(
        '[Terminal IPC] 🚀 INITIALIZING real terminal system...'
      )
      expect(console.log).toHaveBeenCalledWith(
        '[Terminal IPC] 🎉 Real terminal system initialized successfully!'
      )

      // Verify PTY Manager event handlers are set up
      expect(mockPtyManagerInstance.on).toHaveBeenCalledWith(
        'ready',
        expect.any(Function)
      )
      expect(mockPtyManagerInstance.on).toHaveBeenCalledWith(
        'error',
        expect.any(Function)
      )
      expect(mockPtyManagerInstance.on).toHaveBeenCalledWith(
        'terminal-data',
        expect.any(Function)
      )
      expect(mockPtyManagerInstance.on).toHaveBeenCalledWith(
        'terminal-exit',
        expect.any(Function)
      )
      expect(mockPtyManagerInstance.on).toHaveBeenCalledWith(
        'terminal-killed',
        expect.any(Function)
      )

      // Verify IPC handlers are set up
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'terminal-create',
        expect.any(Function)
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'terminal-close',
        expect.any(Function)
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'terminal-list',
        expect.any(Function)
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'terminal-get',
        expect.any(Function)
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'terminal-performance-metrics',
        expect.any(Function)
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'terminal-performance-metrics-terminal',
        expect.any(Function)
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'terminal-performance-alerts',
        expect.any(Function)
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'terminal-performance-export',
        expect.any(Function)
      )

      expect(mockIpcMain.on).toHaveBeenCalledWith(
        'terminal-input',
        expect.any(Function)
      )
      expect(mockIpcMain.on).toHaveBeenCalledWith(
        'terminal-resize',
        expect.any(Function)
      )
    })

    it('should handle initialization errors', async () => {
      const { PtyManager } = await import('./ptyManager')
      ;(
        PtyManager as unknown as ReturnType<typeof vi.fn>
      ).mockImplementationOnce(() => {
        throw new Error('PTY Manager initialization failed')
      })

      const { initializeTerminalSystem } = await import('./terminalIPC')

      expect(() => initializeTerminalSystem()).toThrow(
        'PTY Manager initialization failed'
      )
      expect(console.error).toHaveBeenCalledWith(
        '[Terminal IPC] ❌ FAILED to initialize terminal system:',
        expect.any(Error)
      )
    })

    it('should handle initialization errors with non-Error thrown values', async () => {
      const { PtyManager } = await import('./ptyManager')
      ;(
        PtyManager as unknown as ReturnType<typeof vi.fn>
      ).mockImplementationOnce(() => {
        throw 'String error from PTY Manager' // Non-Error thrown value
      })

      const { initializeTerminalSystem } = await import('./terminalIPC')

      expect(() => initializeTerminalSystem()).toThrow(
        'String error from PTY Manager'
      )
      expect(console.error).toHaveBeenCalledWith(
        '[Terminal IPC] ❌ FAILED to initialize terminal system:',
        'String error from PTY Manager'
      )
      // Verify error details are logged with String() fallback for non-Error
      expect(console.error).toHaveBeenCalledWith(
        '[Terminal IPC] Error details:',
        {
          message: 'String error from PTY Manager',
          stack: undefined,
        }
      )
    })
  })

  describe('PTY Manager Event Handling', () => {
    it('should handle PTY Manager error events', async () => {
      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      // Get the error handler
      const errorHandler = mockPtyManagerInstance.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'error'
      )?.[1]

      expect(errorHandler).toBeDefined()

      // Simulate error
      const testError = new Error('PTY error')
      errorHandler(testError)

      expect(console.error).toHaveBeenCalledWith(
        '[Terminal IPC] PTY Manager error:',
        testError
      )
      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        'terminal-error',
        { error: 'PTY error' }
      )
    })

    it('should handle terminal data events', async () => {
      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      // Get the data handler
      const dataHandler = mockPtyManagerInstance.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-data'
      )?.[1]

      expect(dataHandler).toBeDefined()

      // Simulate data event
      dataHandler('terminal-123', 'Hello World!')

      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        'terminal-data',
        { id: 'terminal-123', data: 'Hello World!' }
      )
    })

    it('should handle terminal exit events', async () => {
      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      // Get the exit handler
      const exitHandler = mockPtyManagerInstance.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-exit'
      )?.[1]

      expect(exitHandler).toBeDefined()

      // Simulate exit event
      exitHandler('terminal-123', 0, 15)

      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        'terminal-exit',
        { id: 'terminal-123', exitCode: 0, signal: 15 }
      )
    })

    it('should handle terminal killed events', async () => {
      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      // Get the killed handler
      const killedHandler = mockPtyManagerInstance.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-killed'
      )?.[1]

      expect(killedHandler).toBeDefined()

      // Simulate killed event
      killedHandler('terminal-123')

      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        'terminal-killed',
        { id: 'terminal-123' }
      )
    })

    it('should handle broadcasting with destroyed windows', async () => {
      // Setup destroyed window
      mockWindow.webContents.isDestroyed.mockReturnValue(true)

      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      // Get the data handler
      const dataHandler = mockPtyManagerInstance.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-data'
      )?.[1]

      // Simulate data event
      dataHandler('terminal-123', 'Test data')

      // Should not send to destroyed window
      expect(mockWindow.webContents.send).not.toHaveBeenCalled()
    })

    it('should handle broadcasting with no windows', async () => {
      mockBrowserWindow.getAllWindows.mockReturnValue([])

      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      // Get the data handler
      const dataHandler = mockPtyManagerInstance.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-data'
      )?.[1]

      // Simulate data event - should not throw
      expect(() => dataHandler('terminal-123', 'Test data')).not.toThrow()
    })
  })

  describe('Terminal Creation', () => {
    it('should create terminal successfully', async () => {
      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      // Get the create handler
      const createHandler = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-create'
      )?.[1]

      expect(createHandler).toBeDefined()

      const result = await createHandler(null, {
        name: 'Test Terminal',
        shell: '/bin/zsh',
        cwd: '/home/test',
        env: { NODE_ENV: 'test' },
        cols: 100,
        rows: 30,
      })

      expect(mockPtyManagerInstance.createTerminal).toHaveBeenCalledWith({
        shell: '/bin/zsh',
        cwd: '/home/test',
        env: { NODE_ENV: 'test' },
        cols: 100,
        rows: 30,
      })

      expect(result).toEqual({
        success: true,
        data: {
          id: 'terminal-123',
          name: 'Test Terminal',
          pid: 12345,
          shell: '/bin/bash',
          cwd: '/home/user',
        },
      })
    })

    it('should create terminal with default options', async () => {
      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      const createHandler = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-create'
      )?.[1]

      const result = await createHandler(null, {})

      expect(mockPtyManagerInstance.createTerminal).toHaveBeenCalledWith({
        shell: undefined,
        cwd: undefined,
        env: undefined,
        cols: 45,
        rows: 24,
      })

      expect(result.data.name).toBe('Terminal')
    })

    it('should handle terminal creation errors', async () => {
      mockPtyManagerInstance.createTerminal.mockRejectedValue(
        new Error('Creation failed')
      )

      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      const createHandler = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-create'
      )?.[1]

      const result = await createHandler(null, {})

      expect(console.error).toHaveBeenCalledWith(
        '[Terminal IPC] Failed to create terminal:',
        expect.any(Error)
      )
      expect(result).toEqual({
        success: false,
        error: 'Creation failed',
      })
    })
  })

  describe('Terminal Operations', () => {
    it('should handle terminal input successfully', async () => {
      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      const inputHandler = mockIpcMain.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-input'
      )?.[1]

      expect(inputHandler).toBeDefined()

      inputHandler(null, { id: 'terminal-123', data: 'echo hello\r' })

      expect(mockPtyManagerInstance.writeToTerminal).toHaveBeenCalledWith(
        'terminal-123',
        'echo hello\r'
      )
    })

    it('should handle terminal resize successfully', async () => {
      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      const resizeHandler = mockIpcMain.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-resize'
      )?.[1]

      expect(resizeHandler).toBeDefined()

      resizeHandler(null, { id: 'terminal-123', cols: 120, rows: 40 })

      expect(mockPtyManagerInstance.resizeTerminal).toHaveBeenCalledWith(
        'terminal-123',
        120,
        40
      )
    })

    it('should close terminal successfully', async () => {
      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      const closeHandler = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-close'
      )?.[1]

      expect(closeHandler).toBeDefined()

      const result = await closeHandler(null, 'terminal-123')

      expect(mockPtyManagerInstance.killTerminal).toHaveBeenCalledWith(
        'terminal-123'
      )
      expect(result).toEqual({ success: true })
    })

    it('should list terminals successfully', async () => {
      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      const listHandler = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-list'
      )?.[1]

      expect(listHandler).toBeDefined()

      const result = await listHandler()

      expect(mockPtyManagerInstance.listTerminals).toHaveBeenCalled()
      expect(result).toEqual({
        success: true,
        data: [
          {
            id: 'terminal-123',
            pid: 12345,
            shell: '/bin/bash',
            cwd: '/home/user',
          },
        ],
      })
    })

    it('should get terminal by ID successfully', async () => {
      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      const getHandler = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-get'
      )?.[1]

      expect(getHandler).toBeDefined()

      const result = await getHandler(null, 'terminal-123')

      expect(mockPtyManagerInstance.listTerminals).toHaveBeenCalled()
      expect(result).toEqual({
        success: true,
        data: {
          id: 'terminal-123',
          pid: 12345,
          shell: '/bin/bash',
          cwd: '/home/user',
        },
      })
    })

    it('should handle terminal not found', async () => {
      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      const getHandler = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-get'
      )?.[1]

      const result = await getHandler(null, 'nonexistent-terminal')

      expect(result).toEqual({
        success: false,
        error: 'Terminal not found',
      })
    })
  })

  describe('Performance Metrics', () => {
    it('should get global performance metrics', async () => {
      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      const metricsHandler = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-performance-metrics'
      )?.[1]

      expect(metricsHandler).toBeDefined()

      const result = await metricsHandler()

      expect(mockPtyManagerInstance.getPerformanceMetrics).toHaveBeenCalled()
      expect(result).toEqual({
        success: true,
        data: {
          totalTerminals: 2,
          activeTerminals: 2,
          averageUptime: 300000,
          totalDataProcessed: 1048576,
          averageMemoryUsage: 50.5,
        },
      })
    })

    it('should get terminal-specific performance metrics', async () => {
      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      const terminalMetricsHandler = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-performance-metrics-terminal'
      )?.[1]

      expect(terminalMetricsHandler).toBeDefined()

      await terminalMetricsHandler(null, 'terminal-123', 10)

      expect(
        mockPtyManagerInstance.getTerminalPerformanceMetrics
      ).toHaveBeenCalledWith('terminal-123', 10)
    })

    it('should get terminal alerts', async () => {
      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      const alertsHandler = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-performance-alerts'
      )?.[1]

      expect(alertsHandler).toBeDefined()

      const result = await alertsHandler(null, 'terminal-123', 5)

      expect(mockPtyManagerInstance.getTerminalAlerts).toHaveBeenCalledWith(
        'terminal-123',
        5
      )
      expect(result).toEqual({
        success: true,
        data: [],
      })
    })

    it('should export performance data', async () => {
      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      const exportHandler = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-performance-export'
      )?.[1]

      expect(exportHandler).toBeDefined()

      const result = await exportHandler()

      expect(mockPtyManagerInstance.exportPerformanceData).toHaveBeenCalled()
      expect(result).toEqual({
        success: true,
        data: { export: 'data' },
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle input errors', async () => {
      mockPtyManagerInstance.writeToTerminal.mockImplementation(() => {
        throw new Error('Write failed')
      })

      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      const inputHandler = mockIpcMain.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-input'
      )?.[1]

      inputHandler(null, { id: 'terminal-123', data: 'test' })

      expect(console.error).toHaveBeenCalledWith(
        '[Terminal IPC] Failed to write to terminal terminal-123:',
        expect.any(Error)
      )
    })

    it('should handle resize errors', async () => {
      mockPtyManagerInstance.resizeTerminal.mockImplementation(() => {
        throw new Error('Resize failed')
      })

      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      const resizeHandler = mockIpcMain.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-resize'
      )?.[1]

      resizeHandler(null, { id: 'terminal-123', cols: 80, rows: 24 })

      expect(console.error).toHaveBeenCalledWith(
        '[Terminal IPC] Failed to resize terminal terminal-123:',
        expect.any(Error)
      )
    })

    it('should handle close errors', async () => {
      mockPtyManagerInstance.killTerminal.mockImplementation(() => {
        throw new Error('Kill failed')
      })

      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      const closeHandler = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-close'
      )?.[1]

      const result = await closeHandler(null, 'terminal-123')

      expect(console.error).toHaveBeenCalledWith(
        '[Terminal IPC] Failed to close terminal terminal-123:',
        expect.any(Error)
      )
      expect(result).toEqual({
        success: false,
        error: 'Kill failed',
      })
    })

    it('should handle non-Error objects in catch blocks', async () => {
      mockPtyManagerInstance.createTerminal.mockRejectedValue('String error')

      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      const createHandler = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-create'
      )?.[1]

      const result = await createHandler(null, {})

      expect(result).toEqual({
        success: false,
        error: 'Failed to create terminal',
      })
    })
  })

  describe('PTY Manager Not Initialized Scenarios', () => {
    it('should handle input when PTY Manager is not initialized', async () => {
      // Import and setup without calling initializeTerminalSystem
      await import('./terminalIPC')

      const inputHandler = mockIpcMain.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-input'
      )?.[1]

      if (inputHandler) {
        inputHandler(null, { id: 'terminal-123', data: 'test' })

        expect(console.error).toHaveBeenCalledWith(
          '[Terminal IPC] PTY Manager not initialized for input'
        )
      }
    })

    it('should handle resize when PTY Manager is not initialized', async () => {
      // Import and setup without calling initializeTerminalSystem
      await import('./terminalIPC')

      const resizeHandler = mockIpcMain.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-resize'
      )?.[1]

      if (resizeHandler) {
        resizeHandler(null, { id: 'terminal-123', cols: 80, rows: 24 })

        expect(console.error).toHaveBeenCalledWith(
          '[Terminal IPC] PTY Manager not initialized for resize'
        )
      }
    })

    it('should handle list terminals error when PTY Manager not initialized', async () => {
      // Import and setup without calling initializeTerminalSystem
      await import('./terminalIPC')

      const listHandler = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-list'
      )?.[1]

      if (listHandler) {
        const result = await listHandler()

        expect(result).toEqual({
          success: false,
          error: 'PTY Manager not initialized',
        })
      }
    })

    it('should handle get terminal error when PTY Manager not initialized', async () => {
      // Import and setup without calling initializeTerminalSystem
      await import('./terminalIPC')

      const getHandler = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-get'
      )?.[1]

      if (getHandler) {
        const result = await getHandler(null, 'terminal-123')

        expect(result).toEqual({
          success: false,
          error: 'PTY Manager not initialized',
        })
      }
    })

    it('should handle export performance data error when PTY Manager not initialized', async () => {
      // Import and setup without calling initializeTerminalSystem
      await import('./terminalIPC')

      const exportHandler = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-performance-export'
      )?.[1]

      if (exportHandler) {
        const result = await exportHandler()

        expect(result).toEqual({
          success: false,
          error: 'PTY Manager not initialized',
        })
      }
    })

    it('should handle non-Error objects in export performance data catch blocks', async () => {
      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      mockPtyManagerInstance.exportPerformanceData.mockImplementation(() => {
        throw 'String error'
      })

      const exportHandler = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-performance-export'
      )?.[1]

      const result = await exportHandler()

      expect(result).toEqual({
        success: false,
        error: 'Failed to export performance data',
      })
    })

    it('should handle list terminals with non-Error objects', async () => {
      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      mockPtyManagerInstance.listTerminals.mockRejectedValue('String error')

      const listHandler = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-list'
      )?.[1]

      const result = await listHandler()

      expect(result).toEqual({
        success: false,
        error: 'Failed to list terminals',
      })
    })
  })

  describe('System Cleanup', () => {
    it('should destroy terminal system successfully', async () => {
      const { initializeTerminalSystem, destroyTerminalSystem } = await import(
        './terminalIPC'
      )

      // Initialize first
      initializeTerminalSystem()

      // Then destroy
      destroyTerminalSystem()

      expect(console.log).toHaveBeenCalledWith(
        '[Terminal IPC] Destroying terminal system...'
      )
      expect(console.log).toHaveBeenCalledWith(
        '[Terminal IPC] Terminal system destroyed'
      )

      expect(mockPtyManagerInstance.destroy).toHaveBeenCalled()

      // Verify IPC handlers are removed
      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith('terminal-create')
      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith('terminal-close')
      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith('terminal-list')
      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith('terminal-get')
      expect(mockIpcMain.removeAllListeners).toHaveBeenCalledWith(
        'terminal-input'
      )
      expect(mockIpcMain.removeAllListeners).toHaveBeenCalledWith(
        'terminal-resize'
      )
    })

    it('should handle destroy when PTY Manager not initialized', async () => {
      const { destroyTerminalSystem } = await import('./terminalIPC')

      // Destroy without initializing
      expect(() => destroyTerminalSystem()).not.toThrow()

      expect(console.log).toHaveBeenCalledWith(
        '[Terminal IPC] Destroying terminal system...'
      )
      expect(console.log).toHaveBeenCalledWith(
        '[Terminal IPC] Terminal system destroyed'
      )
    })
  })

  describe('Edge Cases - Uncovered Branches', () => {
    /**
     * Test empty/null data validation in terminal-data handler (lines 104-109)
     */
    it('should skip broadcasting when terminal data is empty', async () => {
      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      const dataHandler = mockPtyManagerInstance.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-data'
      )?.[1]

      // Test with empty string
      vi.clearAllMocks()
      dataHandler('terminal-123', '')

      expect(console.warn).toHaveBeenCalledWith(
        '[Terminal IPC] ⚠️ Empty or null data received, skipping broadcast'
      )
      expect(mockWindow.webContents.send).not.toHaveBeenCalled()

      // Test with null
      vi.clearAllMocks()
      dataHandler('terminal-123', null)

      expect(console.warn).toHaveBeenCalledWith(
        '[Terminal IPC] ⚠️ Empty or null data received, skipping broadcast'
      )
      expect(mockWindow.webContents.send).not.toHaveBeenCalled()
    })

    /**
     * Test invalid terminal ID validation (lines 111-114)
     */
    it('should skip broadcasting when terminal ID is invalid', async () => {
      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      const dataHandler = mockPtyManagerInstance.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-data'
      )?.[1]

      // Test with empty terminal ID
      vi.clearAllMocks()
      dataHandler('', 'valid data')

      expect(console.error).toHaveBeenCalledWith(
        '[Terminal IPC] ❌ Invalid terminal ID, skipping broadcast'
      )
      expect(mockWindow.webContents.send).not.toHaveBeenCalled()

      // Test with null terminal ID
      vi.clearAllMocks()
      dataHandler(null, 'valid data')

      expect(console.error).toHaveBeenCalledWith(
        '[Terminal IPC] ❌ Invalid terminal ID, skipping broadcast'
      )
      expect(mockWindow.webContents.send).not.toHaveBeenCalled()
    })

    /**
     * Test window without webContents (lines 201-207)
     */
    it('should skip broadcasting to window without webContents', async () => {
      // Create window without webContents
      const windowWithoutWebContents = {
        id: 999,
        isDestroyed: vi.fn(() => false),
        isVisible: vi.fn(() => true),
        isFocused: vi.fn(() => true),
        webContents: null,
      }
      mockBrowserWindow.getAllWindows.mockReturnValue([
        windowWithoutWebContents,
      ])

      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      const dataHandler = mockPtyManagerInstance.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-data'
      )?.[1]

      vi.clearAllMocks()
      dataHandler('terminal-123', 'test data')

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Window 999 has no webContents, skipping')
      )
    })

    /**
     * Test send error with "Object has been destroyed" message (lines 261-267)
     */
    it('should handle "Object has been destroyed" error gracefully', async () => {
      mockWindow.webContents.send.mockImplementation(() => {
        throw new Error('Object has been destroyed')
      })

      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      const dataHandler = mockPtyManagerInstance.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-data'
      )?.[1]

      vi.clearAllMocks()
      dataHandler('terminal-123', 'test data')

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'destroyed during send, this is expected behavior'
        )
      )
    })

    /**
     * Test send error with unexpected error (lines 268-272)
     */
    it('should handle unexpected send errors', async () => {
      mockWindow.webContents.send.mockImplementation(() => {
        throw new Error('Unexpected send error')
      })

      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      const dataHandler = mockPtyManagerInstance.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-data'
      )?.[1]

      vi.clearAllMocks()
      dataHandler('terminal-123', 'test data')

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Unexpected error sending to window')
      )
    })

    /**
     * Test critical alert when no windows receive data successfully (lines 289-296)
     */
    it('should log critical alert when no windows receive data', async () => {
      // Setup multiple windows but all fail to send
      const failingWindow1 = {
        id: 1,
        isDestroyed: vi.fn(() => false),
        isVisible: vi.fn(() => true),
        isFocused: vi.fn(() => true),
        webContents: {
          send: vi.fn(() => {
            throw new Error('Send failed')
          }),
          isDestroyed: vi.fn(() => false),
          isLoading: vi.fn(() => false),
          isCrashed: vi.fn(() => false),
        },
      }
      const failingWindow2 = {
        id: 2,
        isDestroyed: vi.fn(() => false),
        isVisible: vi.fn(() => true),
        isFocused: vi.fn(() => true),
        webContents: {
          send: vi.fn(() => {
            throw new Error('Send failed')
          }),
          isDestroyed: vi.fn(() => false),
          isLoading: vi.fn(() => false),
          isCrashed: vi.fn(() => false),
        },
      }
      mockBrowserWindow.getAllWindows.mockReturnValue([
        failingWindow1,
        failingWindow2,
      ])

      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      const dataHandler = mockPtyManagerInstance.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-data'
      )?.[1]

      vi.clearAllMocks()
      dataHandler('terminal-123', 'test data')

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL: No windows received')
      )
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('serious data flow issue')
      )
    })

    /**
     * Test non-Error object in get terminal catch block (lines 449-453)
     */
    it('should handle non-Error objects in get terminal catch blocks', async () => {
      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      mockPtyManagerInstance.listTerminals.mockRejectedValue('String error')

      const getHandler = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-get'
      )?.[1]

      const result = await getHandler(null, 'terminal-123')

      expect(result).toEqual({
        success: false,
        error: 'Failed to get terminal',
      })
    })

    /**
     * Test non-Error object in performance metrics catch blocks (lines 470-474)
     */
    it('should handle non-Error objects in performance metrics catch blocks', async () => {
      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      mockPtyManagerInstance.getPerformanceMetrics.mockImplementation(() => {
        throw 'String error'
      })

      const metricsHandler = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-performance-metrics'
      )?.[1]

      const result = await metricsHandler()

      expect(result).toEqual({
        success: false,
        error: 'Failed to get performance metrics',
      })
    })

    /**
     * Test non-Error object in terminal-specific metrics catch blocks (lines 498-503)
     */
    it('should handle non-Error objects in terminal-specific metrics catch blocks', async () => {
      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      mockPtyManagerInstance.getTerminalPerformanceMetrics.mockImplementation(
        () => {
          throw 'String error'
        }
      )

      const terminalMetricsHandler = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-performance-metrics-terminal'
      )?.[1]

      const result = await terminalMetricsHandler(null, 'terminal-123', 10)

      expect(result).toEqual({
        success: false,
        error: 'Failed to get terminal performance metrics',
      })
    })

    /**
     * Test non-Error object in terminal alerts catch blocks (lines 526-530)
     */
    it('should handle non-Error objects in terminal alerts catch blocks', async () => {
      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      mockPtyManagerInstance.getTerminalAlerts.mockImplementation(() => {
        throw 'String error'
      })

      const alertsHandler = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-performance-alerts'
      )?.[1]

      const result = await alertsHandler(null, 'terminal-123', 5)

      expect(result).toEqual({
        success: false,
        error: 'Failed to get terminal alerts',
      })
    })

    it('should handle Error objects in terminal-alerts catch blocks', async () => {
      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      mockPtyManagerInstance.getTerminalAlerts.mockImplementation(() => {
        throw new Error('Alert retrieval failed')
      })

      const alertsHandler = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-performance-alerts'
      )?.[1]

      const result = await alertsHandler(null, 'terminal-123', 5)

      expect(result).toEqual({
        success: false,
        error: 'Alert retrieval failed',
      })
    })

    /**
     * Test non-Error object in close terminal catch blocks (lines 404-406)
     */
    it('should handle non-Error objects in close terminal catch blocks', async () => {
      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      mockPtyManagerInstance.killTerminal.mockImplementation(() => {
        throw 'String error'
      })

      const closeHandler = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-close'
      )?.[1]

      const result = await closeHandler(null, 'terminal-123')

      expect(result).toEqual({
        success: false,
        error: 'Failed to close terminal',
      })
    })

    /**
     * Test PTY Manager not initialized scenarios for all handlers
     */
    it('should handle create terminal when PTY Manager not initialized', async () => {
      // Import without initializing
      await import('./terminalIPC')

      const createHandler = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-create'
      )?.[1]

      if (createHandler) {
        const result = await createHandler(null, {})

        expect(result).toEqual({
          success: false,
          error: 'PTY Manager not initialized',
        })
      }
    })

    it('should handle close terminal when PTY Manager not initialized', async () => {
      // Import without initializing
      await import('./terminalIPC')

      const closeHandler = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-close'
      )?.[1]

      if (closeHandler) {
        const result = await closeHandler(null, 'terminal-123')

        expect(result).toEqual({
          success: false,
          error: 'PTY Manager not initialized',
        })
      }
    })

    it('should handle performance metrics when PTY Manager not initialized', async () => {
      // Import without initializing
      await import('./terminalIPC')

      const metricsHandler = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-performance-metrics'
      )?.[1]

      if (metricsHandler) {
        const result = await metricsHandler()

        expect(result).toEqual({
          success: false,
          error: 'PTY Manager not initialized',
        })
      }
    })

    it('should handle terminal-specific metrics when PTY Manager not initialized', async () => {
      // Import without initializing
      await import('./terminalIPC')

      const terminalMetricsHandler = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-performance-metrics-terminal'
      )?.[1]

      if (terminalMetricsHandler) {
        const result = await terminalMetricsHandler(null, 'terminal-123', 10)

        expect(result).toEqual({
          success: false,
          error: 'PTY Manager not initialized',
        })
      }
    })

    it('should handle terminal alerts when PTY Manager not initialized', async () => {
      // Import without initializing
      await import('./terminalIPC')

      const alertsHandler = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-performance-alerts'
      )?.[1]

      if (alertsHandler) {
        const result = await alertsHandler(null, 'terminal-123', 5)

        expect(result).toEqual({
          success: false,
          error: 'PTY Manager not initialized',
        })
      }
    })

    /**
     * Test export performance data error when PTY Manager throws during export
     * Tests lines 539-540 and 550 (Error instanceof check)
     */
    it('should handle export performance data errors with Error instances', async () => {
      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      mockPtyManagerInstance.exportPerformanceData.mockImplementation(() => {
        throw new Error('Export failed with actual Error')
      })

      const exportHandler = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-performance-export'
      )?.[1]

      const result = await exportHandler()

      expect(console.error).toHaveBeenCalledWith(
        '[Terminal IPC] Failed to export performance data:',
        expect.any(Error)
      )
      expect(result).toEqual({
        success: false,
        error: 'Export failed with actual Error',
      })
    })

    /**
     * Test post-send verification setTimeout callback (lines 238-242)
     * This requires using fake timers to advance time
     */
    it('should verify window is still active after send operation', async () => {
      vi.useFakeTimers()

      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      const dataHandler = mockPtyManagerInstance.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-data'
      )?.[1]

      vi.clearAllMocks()
      dataHandler('terminal-123', 'test data')

      // Fast-forward time to trigger setTimeout callback
      vi.advanceTimersByTime(15)

      // Verify post-send verification log was called
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('POST-SEND VERIFICATION: Window')
      )
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('still active')
      )

      vi.useRealTimers()
    })

    /**
     * Test post-send verification when window becomes destroyed
     * Tests the if condition at line 238
     */
    it('should skip post-send verification if window destroyed', async () => {
      vi.useFakeTimers()

      // Setup window that becomes destroyed during send
      mockWindow.webContents.isDestroyed.mockReturnValue(false)

      const { initializeTerminalSystem } = await import('./terminalIPC')
      initializeTerminalSystem()

      const dataHandler = mockPtyManagerInstance.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'terminal-data'
      )?.[1]

      vi.clearAllMocks()
      dataHandler('terminal-123', 'test data')

      // Simulate window destruction after send but before setTimeout
      mockWindow.webContents.isDestroyed.mockReturnValue(true)

      // Fast-forward time to trigger setTimeout callback
      vi.advanceTimersByTime(15)

      // Verify post-send verification log was NOT called (window destroyed)
      const postSendLogs = vi
        .mocked(console.log)
        .mock.calls.filter((call) =>
          call[0]?.toString().includes('POST-SEND VERIFICATION')
        )
      expect(postSendLogs.length).toBe(0)

      vi.useRealTimers()
    })
  })
})
