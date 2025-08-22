/**
 * @fileoverview Comprehensive tests for System Terminal IPC handlers.
 *
 * @description
 * Tests for the System Terminal IPC module covering:
 * - IPC handler initialization and setup
 * - System terminal initialization with project context
 * - System logging operations (info, warn, error)
 * - Git operation logging with Causa-Efecto pattern
 * - Terminal state management (get, list, set active, clear)
 * - Terminal line filtering and retrieval
 * - Configuration updates and broadcasting
 * - Event broadcasting to renderer processes
 * - Error handling and edge cases
 * - Cleanup and resource management
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
// import { EventEmitter } from 'node:events'

// Mock modules with hoisted functions
const {
  mockIpcMain,
  mockBrowserWindow,
  mockSystemLogger,
  mockReadOnlyTerminalManager,
  mockWebContents,
  createMockTerminalState,
} = vi.hoisted(() => ({
  mockIpcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
  mockBrowserWindow: {
    getAllWindows: vi.fn(() => []),
  },
  mockSystemLogger: {
    on: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    logCommand: vi.fn(),
    logResult: vi.fn(),
  },
  mockReadOnlyTerminalManager: {
    on: vi.fn(),
    initializeSystemTerminals: vi.fn(),
    getTerminal: vi.fn(),
    getAllTerminals: vi.fn(),
    setActiveTerminal: vi.fn(),
    clearTerminal: vi.fn(),
    getTerminalLines: vi.fn(),
    updateTerminalConfig: vi.fn(),
  },
  mockWebContents: {
    send: vi.fn(),
    isDestroyed: vi.fn(() => false),
  },
  createMockTerminalState: () => ({
    id: 'system',
    type: 'system' as const,
    isActive: true,
    config: { autoScroll: true, maxLines: 1000 },
    lines: [],
    createdAt: new Date(),
    lastActivity: new Date(),
  }),
}))

// Mock Electron modules
vi.mock('electron', () => ({
  BrowserWindow: mockBrowserWindow,
  ipcMain: mockIpcMain,
}))

// Mock terminal system modules
vi.mock('@hatcherdx/terminal-system', () => ({
  systemLogger: mockSystemLogger,
  readOnlyTerminalManager: mockReadOnlyTerminalManager,
}))

describe('SystemTerminalIPC', () => {
  let originalConsoleLog: typeof console.log
  let originalConsoleError: typeof console.error
  let originalDateNow: typeof Date.now

  beforeEach(() => {
    // Store originals
    originalConsoleLog = console.log
    originalConsoleError = console.error
    originalDateNow = Date.now

    // Mock console methods
    console.log = vi.fn()
    console.error = vi.fn()

    // Mock Date.now for consistent execution times
    Date.now = vi.fn(() => 1640995200000)

    // Setup default mocks
    mockSystemLogger.on.mockImplementation(() => {
      // Store handlers for testing
      return mockSystemLogger
    })

    mockReadOnlyTerminalManager.on.mockImplementation(() => {
      return mockReadOnlyTerminalManager
    })

    mockReadOnlyTerminalManager.initializeSystemTerminals.mockResolvedValue(
      undefined
    )

    const mockSystemTerminal = createMockTerminalState()
    const mockTimelineTerminal = {
      ...createMockTerminalState(),
      id: 'timeline',
      type: 'timeline' as const,
    }

    mockReadOnlyTerminalManager.getTerminal.mockImplementation((type) => {
      if (type === 'system') return mockSystemTerminal
      if (type === 'timeline') return mockTimelineTerminal
      return null
    })

    mockReadOnlyTerminalManager.getAllTerminals.mockReturnValue([
      mockSystemTerminal,
      mockTimelineTerminal,
    ])

    mockReadOnlyTerminalManager.setActiveTerminal.mockReturnValue(true)
    mockReadOnlyTerminalManager.clearTerminal.mockReturnValue(true)
    mockReadOnlyTerminalManager.updateTerminalConfig.mockReturnValue(true)
    mockReadOnlyTerminalManager.getTerminalLines.mockReturnValue([])

    // Setup mock windows with web contents
    mockBrowserWindow.getAllWindows.mockReturnValue([
      {
        webContents: mockWebContents,
      },
    ])

    // Clear all mocks
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog
    console.error = originalConsoleError

    // Restore Date.now
    Date.now = originalDateNow

    vi.restoreAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize system terminal IPC handlers successfully', async () => {
      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )

      initializeSystemTerminalIPC()

      expect(console.log).toHaveBeenCalledWith(
        '[System Terminal IPC] Initializing system terminal handlers...'
      )
      expect(console.log).toHaveBeenCalledWith(
        '[System Terminal IPC] System terminal IPC initialized successfully'
      )

      // Verify event listeners are setup
      expect(mockSystemLogger.on).toHaveBeenCalledWith(
        'systemEvent',
        expect.any(Function)
      )
      expect(mockReadOnlyTerminalManager.on).toHaveBeenCalledWith(
        'terminalOutput',
        expect.any(Function)
      )
      expect(mockReadOnlyTerminalManager.on).toHaveBeenCalledWith(
        'terminalActivated',
        expect.any(Function)
      )
      expect(mockReadOnlyTerminalManager.on).toHaveBeenCalledWith(
        'terminalCleared',
        expect.any(Function)
      )

      // Verify IPC handlers are registered
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'system-terminal-initialize',
        expect.any(Function)
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'system-terminal-log',
        expect.any(Function)
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'system-terminal-git-operation',
        expect.any(Function)
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'system-terminal-get',
        expect.any(Function)
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'system-terminal-list',
        expect.any(Function)
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'system-terminal-set-active',
        expect.any(Function)
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'system-terminal-clear',
        expect.any(Function)
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'system-terminal-get-lines',
        expect.any(Function)
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'system-terminal-update-config',
        expect.any(Function)
      )
    })

    it('should handle initialization errors', async () => {
      mockSystemLogger.on.mockImplementationOnce(() => {
        throw new Error('Event setup failed')
      })

      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )

      expect(() => initializeSystemTerminalIPC()).toThrow('Event setup failed')
      expect(console.error).toHaveBeenCalledWith(
        '[System Terminal IPC] Failed to initialize system terminal IPC:',
        expect.any(Error)
      )
    })
  })

  describe('Event Broadcasting', () => {
    it('should broadcast system events to renderer processes', async () => {
      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      // Get the system event handler
      const systemEventHandler = mockSystemLogger.on.mock.calls.find(
        (call) => call[0] === 'systemEvent'
      )?.[1]

      expect(systemEventHandler).toBeDefined()

      // Simulate system event
      const testEvent = {
        level: 'info',
        message: 'Test system event',
        terminal: 'system' as const,
        timestamp: new Date(),
      }

      systemEventHandler?.(testEvent)

      expect(mockWebContents.send).toHaveBeenCalledWith(
        'system-terminal-event',
        {
          event: testEvent,
          terminal: testEvent.terminal,
        }
      )
    })

    it('should broadcast terminal output events', async () => {
      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      // Get the terminal output handler
      const outputHandler = mockReadOnlyTerminalManager.on.mock.calls.find(
        (call) => call[0] === 'terminalOutput'
      )?.[1]

      expect(outputHandler).toBeDefined()

      const testOutput = {
        terminalId: 'system',
        line: {
          id: 'line-1',
          type: 'info' as const,
          content: 'Test output',
          timestamp: new Date(),
        },
      }

      outputHandler?.(testOutput)

      expect(mockWebContents.send).toHaveBeenCalledWith(
        'system-terminal-output',
        testOutput
      )
    })

    it('should broadcast terminal activation events', async () => {
      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      // Get the activation handler
      const activationHandler = mockReadOnlyTerminalManager.on.mock.calls.find(
        (call) => call[0] === 'terminalActivated'
      )?.[1]

      expect(activationHandler).toBeDefined()

      const testTerminal = createMockTerminalState()
      activationHandler?.(testTerminal)

      expect(mockWebContents.send).toHaveBeenCalledWith(
        'system-terminal-activated',
        {
          terminalId: testTerminal.id,
          terminalType: testTerminal.type,
        }
      )
    })

    it('should broadcast terminal cleared events', async () => {
      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      // Get the cleared handler
      const clearedHandler = mockReadOnlyTerminalManager.on.mock.calls.find(
        (call) => call[0] === 'terminalCleared'
      )?.[1]

      expect(clearedHandler).toBeDefined()

      const testTerminal = createMockTerminalState()
      clearedHandler?.(testTerminal)

      expect(mockWebContents.send).toHaveBeenCalledWith(
        'system-terminal-cleared',
        {
          terminalId: testTerminal.id,
          terminalType: testTerminal.type,
        }
      )
    })

    it('should handle destroyed web contents gracefully', async () => {
      mockWebContents.isDestroyed.mockReturnValue(true)
      mockBrowserWindow.getAllWindows.mockReturnValue([
        {
          webContents: mockWebContents,
        },
      ])

      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      // Get the system event handler
      const systemEventHandler = mockSystemLogger.on.mock.calls.find(
        (call) => call[0] === 'systemEvent'
      )?.[1]

      // Should not crash when web contents is destroyed
      expect(() =>
        systemEventHandler?.({
          level: 'info',
          message: 'Test',
          terminal: 'system',
          timestamp: new Date(),
        })
      ).not.toThrow()

      // Should not send to destroyed web contents
      expect(mockWebContents.send).not.toHaveBeenCalled()
    })

    it('should handle windows with no web contents', async () => {
      mockBrowserWindow.getAllWindows.mockReturnValue([
        {
          webContents: null,
        },
      ])

      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      // Get the system event handler
      const systemEventHandler = mockSystemLogger.on.mock.calls.find(
        (call) => call[0] === 'systemEvent'
      )?.[1]

      // Should not crash when web contents is null
      expect(() =>
        systemEventHandler?.({
          level: 'info',
          message: 'Test',
          terminal: 'system',
          timestamp: new Date(),
        })
      ).not.toThrow()
    })
  })

  describe('System Terminal Initialization Handler', () => {
    it('should initialize system terminals successfully', async () => {
      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      // Get the initialization handler
      const initHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'system-terminal-initialize'
      )?.[1]

      expect(initHandler).toBeDefined()

      const result = await initHandler?.(
        {},
        {
          projectName: 'Test Project',
          projectType: 'Vue',
          packageManager: 'pnpm',
          projectPath: '/test/path',
        }
      )

      expect(
        mockReadOnlyTerminalManager.initializeSystemTerminals
      ).toHaveBeenCalled()
      expect(mockSystemLogger.info).toHaveBeenCalledWith(
        'Initializing Hatcher workspace: Test Project'
      )
      expect(mockSystemLogger.info).toHaveBeenCalledWith(
        'Project detected: Vue with pnpm'
      )

      expect(result).toEqual({
        success: true,
        message: 'System terminals initialized successfully',
        data: {
          systemTerminal: expect.any(Object),
          timelineTerminal: expect.any(Object),
        },
      })
    })

    it('should handle already initialized terminals', async () => {
      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      const initHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'system-terminal-initialize'
      )?.[1]

      // First initialization
      await initHandler?.({}, {})

      // Second initialization should return already initialized
      const result = await initHandler?.({}, {})

      expect(result).toEqual({
        success: true,
        message: 'System terminals already initialized',
        data: {
          systemTerminal: expect.any(Object),
          timelineTerminal: expect.any(Object),
        },
      })
    })

    it('should handle initialization with minimal options', async () => {
      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      const initHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'system-terminal-initialize'
      )?.[1]

      const result = await initHandler?.({}, {})

      expect(mockSystemLogger.info).toHaveBeenCalledWith(
        'Initializing Hatcher workspace...'
      )
      expect(result.success).toBe(true)
    })

    it('should handle initialization errors', async () => {
      mockReadOnlyTerminalManager.initializeSystemTerminals.mockRejectedValue(
        new Error('Initialization failed')
      )

      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      const initHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'system-terminal-initialize'
      )?.[1]

      const result = await initHandler?.({}, {})

      expect(console.error).toHaveBeenCalledWith(
        '[System Terminal IPC] Failed to initialize system terminals:',
        expect.any(Error)
      )
      expect(result).toEqual({
        success: false,
        error: 'Initialization failed',
      })
    })
  })

  describe('System Logging Handler', () => {
    it('should handle info log requests', async () => {
      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      const logHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'system-terminal-log'
      )?.[1]

      expect(logHandler).toBeDefined()

      const result = await logHandler?.(
        {},
        {
          level: 'info',
          message: 'Test info message',
          terminal: 'system',
          context: { key: 'value' },
        }
      )

      expect(mockSystemLogger.info).toHaveBeenCalledWith(
        'Test info message',
        'system',
        { key: 'value' }
      )
      expect(result).toEqual({ success: true })
    })

    it('should handle warn log requests', async () => {
      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      const logHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'system-terminal-log'
      )?.[1]

      const result = await logHandler?.(
        {},
        {
          level: 'warn',
          message: 'Test warning',
          terminal: 'timeline',
        }
      )

      expect(mockSystemLogger.warn).toHaveBeenCalledWith(
        'Test warning',
        'timeline',
        undefined
      )
      expect(result).toEqual({ success: true })
    })

    it('should handle error log requests', async () => {
      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      const logHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'system-terminal-log'
      )?.[1]

      const result = await logHandler?.(
        {},
        {
          level: 'error',
          message: 'Test error',
        }
      )

      expect(mockSystemLogger.error).toHaveBeenCalledWith(
        'Test error',
        'system',
        undefined
      )
      expect(result).toEqual({ success: true })
    })

    it('should default to info for unknown log levels', async () => {
      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      const logHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'system-terminal-log'
      )?.[1]

      const result = await logHandler?.(
        {},
        {
          level: 'unknown' as 'error' | 'warn' | 'info',
          message: 'Test message',
        }
      )

      expect(mockSystemLogger.info).toHaveBeenCalledWith(
        'Test message',
        'system',
        undefined
      )
      expect(result).toEqual({ success: true })
    })

    it('should handle logging errors', async () => {
      mockSystemLogger.info.mockImplementationOnce(() => {
        throw new Error('Logging failed')
      })

      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      const logHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'system-terminal-log'
      )?.[1]

      const result = await logHandler?.(
        {},
        {
          level: 'info',
          message: 'Test message',
        }
      )

      expect(console.error).toHaveBeenCalledWith(
        '[System Terminal IPC] Failed to log system message:',
        expect.any(Error)
      )
      expect(result).toEqual({
        success: false,
        error: 'Logging failed',
      })
    })
  })

  describe('Git Operation Handler', () => {
    it('should handle git operations with Causa-Efecto logging', async () => {
      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      const gitHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'system-terminal-git-operation'
      )?.[1]

      expect(gitHandler).toBeDefined()

      const result = await gitHandler?.(
        {},
        {
          operation: 'status',
          args: ['--porcelain'],
          context: { branch: 'main' },
        }
      )

      expect(mockSystemLogger.logCommand).toHaveBeenCalledWith(
        'git-genius.status',
        ['--porcelain'],
        'timeline'
      )
      expect(mockSystemLogger.logResult).toHaveBeenCalledWith(
        'GIT',
        'Repository status retrieved (0ms)',
        'timeline',
        expect.objectContaining({
          operation: 'status',
          args: ['--porcelain'],
          context: { branch: 'main' },
        })
      )
      expect(result).toEqual({
        success: true,
        message: 'Repository status retrieved (0ms)',
        executionTime: 0,
      })
    })

    it('should format different git operations correctly', async () => {
      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      const gitHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'system-terminal-git-operation'
      )?.[1]

      // Test commit operation
      Date.now = vi.fn().mockReturnValueOnce(1000).mockReturnValueOnce(2500) // 1500ms execution time

      const result = await gitHandler?.(
        {},
        { operation: 'commit', args: ['-m', 'Test commit'] }
      )

      expect(result.message).toBe('Commit created successfully (1.5s)')
    })

    it('should handle unknown git operations', async () => {
      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      const gitHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'system-terminal-git-operation'
      )?.[1]

      const result = await gitHandler?.({}, { operation: 'custom-operation' })

      expect(result.message).toContain(
        'Git custom-operation completed successfully'
      )
    })

    it('should handle git operation errors', async () => {
      mockSystemLogger.logCommand.mockImplementationOnce(() => {
        throw new Error('Git logging failed')
      })

      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      const gitHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'system-terminal-git-operation'
      )?.[1]

      const result = await gitHandler?.({}, { operation: 'status' })

      expect(console.error).toHaveBeenCalledWith(
        '[System Terminal IPC] Failed to log git operation:',
        expect.any(Error)
      )
      expect(result).toEqual({
        success: false,
        error: 'Git logging failed',
      })
    })
  })

  describe('Terminal State Handlers', () => {
    it('should get specific terminal state', async () => {
      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      const getHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'system-terminal-get'
      )?.[1]

      expect(getHandler).toBeDefined()

      const result = await getHandler?.({}, 'system')

      expect(mockReadOnlyTerminalManager.getTerminal).toHaveBeenCalledWith(
        'system'
      )
      expect(result).toEqual({
        success: true,
        data: expect.any(Object),
      })
    })

    it('should handle non-existent terminal', async () => {
      mockReadOnlyTerminalManager.getTerminal.mockReturnValue(null)

      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      const getHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'system-terminal-get'
      )?.[1]

      const result = await getHandler?.({}, 'nonexistent')

      expect(result).toEqual({
        success: false,
        error: "Terminal 'nonexistent' not found",
      })
    })

    it('should handle get terminal errors', async () => {
      mockReadOnlyTerminalManager.getTerminal.mockImplementationOnce(() => {
        throw new Error('Get terminal failed')
      })

      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      const getHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'system-terminal-get'
      )?.[1]

      const result = await getHandler?.({}, 'system')

      expect(result).toEqual({
        success: false,
        error: 'Get terminal failed',
      })
    })

    it('should list all terminals', async () => {
      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      const listHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'system-terminal-list'
      )?.[1]

      expect(listHandler).toBeDefined()

      const result = await listHandler?.({})

      expect(mockReadOnlyTerminalManager.getAllTerminals).toHaveBeenCalled()
      expect(result).toEqual({
        success: true,
        data: expect.any(Array),
      })
    })

    it('should handle list terminals errors', async () => {
      mockReadOnlyTerminalManager.getAllTerminals.mockImplementationOnce(() => {
        throw new Error('List failed')
      })

      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      const listHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'system-terminal-list'
      )?.[1]

      const result = await listHandler?.({})

      expect(result).toEqual({
        success: false,
        error: 'List failed',
      })
    })

    it('should set active terminal', async () => {
      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      const setActiveHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'system-terminal-set-active'
      )?.[1]

      expect(setActiveHandler).toBeDefined()

      const result = await setActiveHandler?.({}, 'timeline')

      expect(
        mockReadOnlyTerminalManager.setActiveTerminal
      ).toHaveBeenCalledWith('timeline')
      expect(result).toEqual({ success: true })
    })

    it('should handle set active terminal failure', async () => {
      mockReadOnlyTerminalManager.setActiveTerminal.mockReturnValue(false)

      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      const setActiveHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'system-terminal-set-active'
      )?.[1]

      const result = await setActiveHandler?.({}, 'invalid')

      expect(result).toEqual({
        success: false,
        error: "Failed to activate terminal 'invalid'",
      })
    })

    it('should clear terminal', async () => {
      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      const clearHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'system-terminal-clear'
      )?.[1]

      expect(clearHandler).toBeDefined()

      const result = await clearHandler?.({}, 'system')

      expect(mockReadOnlyTerminalManager.clearTerminal).toHaveBeenCalledWith(
        'system'
      )
      expect(result).toEqual({ success: true })
    })

    it('should handle clear terminal failure', async () => {
      mockReadOnlyTerminalManager.clearTerminal.mockReturnValue(false)

      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      const clearHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'system-terminal-clear'
      )?.[1]

      const result = await clearHandler?.({}, 'system')

      expect(result).toEqual({
        success: false,
        error: "Failed to clear terminal 'system'",
      })
    })
  })

  describe('Terminal Lines Handler', () => {
    it('should get terminal lines with filtering', async () => {
      const mockLines = [
        {
          id: 'line-1',
          type: 'info' as const,
          content: 'Test line',
          timestamp: new Date(),
        },
      ]
      mockReadOnlyTerminalManager.getTerminalLines.mockReturnValue(mockLines)

      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      const getLinesHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'system-terminal-get-lines'
      )?.[1]

      expect(getLinesHandler).toBeDefined()

      const result = await getLinesHandler?.({}, 'system', {
        limit: 100,
        type: 'info',
        since: '2023-01-01T00:00:00.000Z',
      })

      expect(mockReadOnlyTerminalManager.getTerminalLines).toHaveBeenCalledWith(
        'system',
        {
          limit: 100,
          type: 'info',
          since: new Date('2023-01-01T00:00:00.000Z'),
        }
      )
      expect(result).toEqual({
        success: true,
        data: mockLines,
      })
    })

    it('should handle get lines with default options', async () => {
      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      const getLinesHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'system-terminal-get-lines'
      )?.[1]

      const result = await getLinesHandler?.({}, 'system', {})

      expect(mockReadOnlyTerminalManager.getTerminalLines).toHaveBeenCalledWith(
        'system',
        { since: undefined }
      )
      expect(result.success).toBe(true)
    })

    it('should handle get lines errors', async () => {
      mockReadOnlyTerminalManager.getTerminalLines.mockImplementationOnce(
        () => {
          throw new Error('Get lines failed')
        }
      )

      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      const getLinesHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'system-terminal-get-lines'
      )?.[1]

      const result = await getLinesHandler?.({}, 'system', {})

      expect(result).toEqual({
        success: false,
        error: 'Get lines failed',
      })
    })
  })

  describe('Terminal Configuration Handler', () => {
    it('should update terminal configuration', async () => {
      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      const updateConfigHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'system-terminal-update-config'
      )?.[1]

      expect(updateConfigHandler).toBeDefined()

      const result = await updateConfigHandler?.({}, 'system', {
        autoScroll: false,
        maxLines: 2000,
      })

      expect(
        mockReadOnlyTerminalManager.updateTerminalConfig
      ).toHaveBeenCalledWith('system', {
        autoScroll: false,
        maxLines: 2000,
      })
      expect(result).toEqual({ success: true })
    })

    it('should handle config update failure', async () => {
      mockReadOnlyTerminalManager.updateTerminalConfig.mockReturnValue(false)

      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      const updateConfigHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'system-terminal-update-config'
      )?.[1]

      const result = await updateConfigHandler?.({}, 'system', {
        autoScroll: true,
      })

      expect(result).toEqual({
        success: false,
        error: "Failed to update terminal 'system' configuration",
      })
    })

    it('should handle config update errors', async () => {
      mockReadOnlyTerminalManager.updateTerminalConfig.mockImplementationOnce(
        () => {
          throw new Error('Config update failed')
        }
      )

      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      const updateConfigHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'system-terminal-update-config'
      )?.[1]

      const result = await updateConfigHandler?.({}, 'system', {
        maxLines: 1000,
      })

      expect(result).toEqual({
        success: false,
        error: 'Config update failed',
      })
    })
  })

  describe('Cleanup', () => {
    it('should destroy system terminal IPC handlers', async () => {
      const { destroySystemTerminalIPC } = await import('./systemTerminalIPC')

      destroySystemTerminalIPC()

      expect(console.log).toHaveBeenCalledWith(
        '[System Terminal IPC] Destroying system terminal handlers...'
      )
      expect(console.log).toHaveBeenCalledWith(
        '[System Terminal IPC] System terminal IPC destroyed'
      )

      // Verify all handlers are removed
      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith(
        'system-terminal-initialize'
      )
      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith(
        'system-terminal-log'
      )
      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith(
        'system-terminal-git-operation'
      )
      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith(
        'system-terminal-get'
      )
      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith(
        'system-terminal-list'
      )
      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith(
        'system-terminal-set-active'
      )
      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith(
        'system-terminal-clear'
      )
      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith(
        'system-terminal-get-lines'
      )
      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith(
        'system-terminal-update-config'
      )
    })
  })

  describe('Git Operation Message Formatting', () => {
    it('should format execution time correctly', async () => {
      // Test milliseconds
      Date.now = vi.fn().mockReturnValueOnce(1000).mockReturnValueOnce(1500) // 500ms

      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      const gitHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'system-terminal-git-operation'
      )?.[1]

      const result = await gitHandler?.({}, { operation: 'status' })
      expect(result.message).toContain('(500ms)')

      // Test seconds
      Date.now = vi.fn().mockReturnValueOnce(1000).mockReturnValueOnce(3500) // 2500ms = 2.5s

      const result2 = await gitHandler?.({}, { operation: 'commit' })
      expect(result2.message).toContain('(2.5s)')
    })

    it('should format different git operation messages', async () => {
      const testCases = [
        { operation: 'push', expected: 'Changes pushed to remote repository' },
        {
          operation: 'pull',
          expected: 'Changes pulled from remote repository',
        },
        { operation: 'checkout', expected: 'Branch switch completed' },
        { operation: 'switch', expected: 'Branch switch completed' },
        { operation: 'clone', expected: 'Repository cloned successfully' },
        { operation: 'add', expected: 'Files staged for commit' },
        { operation: 'branch', expected: 'Branch operation completed' },
        { operation: 'log', expected: 'Commit history retrieved' },
      ]

      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      const gitHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'system-terminal-git-operation'
      )?.[1]

      for (const testCase of testCases) {
        const result = await gitHandler?.({}, { operation: testCase.operation })
        expect(result.message).toContain(testCase.expected)
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle operations with non-Error exceptions', async () => {
      mockSystemLogger.info.mockImplementationOnce(() => {
        throw 'String error'
      })

      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      const logHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'system-terminal-log'
      )?.[1]

      const result = await logHandler?.({}, { level: 'info', message: 'test' })

      expect(result).toEqual({
        success: false,
        error: 'Failed to log system message',
      })
    })

    it('should handle operations with no windows available', async () => {
      mockBrowserWindow.getAllWindows.mockReturnValue([])

      const { initializeSystemTerminalIPC } = await import(
        './systemTerminalIPC'
      )
      initializeSystemTerminalIPC()

      // Get system event handler
      const systemEventHandler = mockSystemLogger.on.mock.calls.find(
        (call) => call[0] === 'systemEvent'
      )?.[1]

      // Should not crash with no windows
      expect(() =>
        systemEventHandler?.({
          level: 'info',
          message: 'Test',
          terminal: 'system',
          timestamp: new Date(),
        })
      ).not.toThrow()

      expect(mockWebContents.send).not.toHaveBeenCalled()
    })
  })
})
