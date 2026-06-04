/**
 * @fileoverview Test suite for IPCBridge functionality.
 *
 * @description
 * Comprehensive tests for the IPCBridge class that handles communication
 * between Electron main and renderer processes for terminal operations.
 *
 * @example
 * ```typescript
 * // Testing IPC handler setup
 * const mockIpcMain = { handle: vi.fn(), on: vi.fn() }
 * const bridge = new IPCBridge(mockIpcMain)
 * expect(mockIpcMain.handle).toHaveBeenCalledWith('create-terminal', expect.any(Function))
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import type {
  IpcMain,
  IpcMainEvent,
  IpcMainInvokeEvent,
  WebContents,
} from 'electron'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  CreateTerminalMessage,
  TerminalInputMessage,
  TerminalResizeMessage,
} from '../types/ipc'
import { IPCBridge } from './IPCBridge'
import { TerminalManager } from './TerminalManager'

// Mock TerminalManager
vi.mock('./TerminalManager')

/**
 * Mock IPC main interface for testing Electron IPC functionality.
 *
 * @remarks
 * Simulates the Electron IpcMain interface with handle, on, and
 * removeAllListeners methods for comprehensive IPC testing.
 *
 * @public
 * @since 1.0.0
 */
interface MockIpcMain extends Partial<IpcMain> {
  handle: ReturnType<typeof vi.fn>
  on: ReturnType<typeof vi.fn>
  removeAllListeners: ReturnType<typeof vi.fn>
}

/**
 * Mock WebContents interface for testing renderer communication.
 *
 * @remarks
 * Simulates the Electron WebContents interface for testing
 * message sending to renderer processes.
 *
 * @public
 * @since 1.0.0
 */
interface MockWebContents extends Partial<WebContents> {
  send: ReturnType<typeof vi.fn>
  isDestroyed: ReturnType<typeof vi.fn>
}

/**
 * Mock Terminal Manager interface for testing.
 *
 * @remarks
 * Extends Partial<TerminalManager> with properly typed mock methods
 * including the EventEmitter interface for event handling tests.
 *
 * @public
 * @since 1.0.0
 */
interface MockTerminalManager extends Partial<TerminalManager> {
  on: ReturnType<typeof vi.fn>
  createTerminal: ReturnType<typeof vi.fn>
  sendData: ReturnType<typeof vi.fn>
  resizeTerminal: ReturnType<typeof vi.fn>
  closeTerminal: ReturnType<typeof vi.fn>
  getAllTerminals: ReturnType<typeof vi.fn>
  cleanup: ReturnType<typeof vi.fn>
}

describe('IPCBridge', () => {
  let mockIpcMain: MockIpcMain
  let mockWebContents: MockWebContents
  let mockTerminalManager: MockTerminalManager
  let ipcBridge: IPCBridge

  beforeEach(() => {
    // Create mock IpcMain
    mockIpcMain = {
      handle: vi.fn(),
      on: vi.fn(),
      removeAllListeners: vi.fn(),
    }

    // Create mock WebContents
    mockWebContents = {
      send: vi.fn(),
      isDestroyed: vi.fn(() => false),
    }

    // Create mock TerminalManager
    mockTerminalManager = {
      createTerminal: vi.fn(),
      sendData: vi.fn(),
      resizeTerminal: vi.fn(),
      closeTerminal: vi.fn(),
      getAllTerminals: vi.fn(() => []),
      cleanup: vi.fn(),
      on: vi.fn(),
    }

    // Mock TerminalManager constructor
    vi.mocked(TerminalManager).mockImplementation(
      () => mockTerminalManager as unknown as TerminalManager
    )

    // Create IPCBridge instance
    ipcBridge = new IPCBridge(mockIpcMain as IpcMain)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Construction and setup', () => {
    /**
     * Tests proper IPC handler setup during construction.
     *
     * @returns void
     * Should register all required IPC handlers with correct event names
     *
     * @example
     * ```typescript
     * const bridge = new IPCBridge(mockIpcMain)
     * expect(mockIpcMain.handle).toHaveBeenCalledWith('create-terminal', expect.any(Function))
     * ```
     *
     * @public
     */
    it('should setup IPC handlers during construction', () => {
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'create-terminal',
        expect.any(Function)
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'list-terminals',
        expect.any(Function)
      )
      expect(mockIpcMain.on).toHaveBeenCalledWith(
        'terminal-input',
        expect.any(Function)
      )
      expect(mockIpcMain.on).toHaveBeenCalledWith(
        'resize-terminal',
        expect.any(Function)
      )
      expect(mockIpcMain.on).toHaveBeenCalledWith(
        'close-terminal',
        expect.any(Function)
      )
    })

    /**
     * Tests TerminalManager event handler setup during construction.
     *
     * @returns void
     * Should register event listeners for terminal manager events
     *
     * @example
     * ```typescript
     * expect(mockTerminalManager.on).toHaveBeenCalledWith('terminalCreated', expect.any(Function))
     * ```
     *
     * @public
     */
    it('should setup TerminalManager event handlers', () => {
      expect(mockTerminalManager.on).toHaveBeenCalledWith(
        'terminalCreated',
        expect.any(Function)
      )
      expect(mockTerminalManager.on).toHaveBeenCalledWith(
        'terminalData',
        expect.any(Function)
      )
      expect(mockTerminalManager.on).toHaveBeenCalledWith(
        'terminalExit',
        expect.any(Function)
      )
      expect(mockTerminalManager.on).toHaveBeenCalledWith(
        'terminalError',
        expect.any(Function)
      )
    })

    /**
     * Tests TerminalManager instance creation and access.
     *
     * @returns void
     * Should create TerminalManager instance and provide access via getter
     *
     * @example
     * ```typescript
     * const manager = bridge.getTerminalManager()
     * expect(manager).toBeDefined()
     * ```
     *
     * @public
     */
    it('should create and provide access to TerminalManager', () => {
      expect(TerminalManager).toHaveBeenCalledTimes(1)
      const manager = ipcBridge.getTerminalManager()
      expect(manager).toBe(mockTerminalManager)
    })
  })

  describe('WebContents management', () => {
    /**
     * Tests WebContents setting and retrieval.
     *
     * @returns void
     * Should store WebContents reference for renderer communication
     *
     * @example
     * ```typescript
     * bridge.setWebContents(mockWebContents)
     * // WebContents should be available for message sending
     * ```
     *
     * @public
     */
    it('should set and store WebContents reference', () => {
      ipcBridge.setWebContents(mockWebContents as WebContents)
      // WebContents is stored internally, no direct access method
      expect(mockWebContents.isDestroyed).not.toHaveBeenCalled()
    })
  })

  describe('Terminal creation handler', () => {
    /**
     * Tests successful terminal creation via IPC.
     *
     * @returns Promise<void>
     * Should handle create-terminal IPC calls and return terminal data
     *
     * @example
     * ```typescript
     * const mockTerminal = { id: 'term1', name: 'Terminal', pid: 1234 }
     * mockTerminalManager.createTerminal.mockResolvedValue(mockTerminal)
     * ```
     *
     * @public
     */
    it('should handle terminal creation requests', async () => {
      const mockTerminal = {
        id: 'terminal-1',
        name: 'Test Terminal',
        pid: 1234,
      }

      mockTerminalManager.createTerminal = vi
        .fn()
        .mockResolvedValue(mockTerminal)

      // Get the create-terminal handler
      const createTerminalCall = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'create-terminal'
      )
      expect(createTerminalCall).toBeDefined()

      const createHandler = createTerminalCall?.[1]
      expect(createHandler).toBeTypeOf('function')

      // Test the handler
      const options: CreateTerminalMessage = {
        name: 'Test Terminal',
        shell: '/bin/bash',
        cwd: '/home/user',
      }

      const mockEvent = {} as IpcMainInvokeEvent
      const result = await createHandler?.(mockEvent, options)

      expect(mockTerminalManager.createTerminal).toHaveBeenCalledWith(options)
      expect(result).toEqual({
        id: 'terminal-1',
        name: 'Test Terminal',
        pid: 1234,
      })
    })

    /**
     * Tests terminal creation when terminal has no pid.
     *
     * @returns Promise<void>
     * Should handle create-terminal IPC calls with missing pid
     *
     * @public
     */
    it('should handle terminal creation with no pid', async () => {
      const mockTerminal = {
        id: 'terminal-1',
        name: 'Test Terminal',
        // No pid property
      }

      mockTerminalManager.createTerminal = vi
        .fn()
        .mockResolvedValue(mockTerminal)

      // Get the create-terminal handler
      const createTerminalCall = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'create-terminal'
      )
      const createHandler = createTerminalCall?.[1]

      const options: CreateTerminalMessage = {
        name: 'Test Terminal',
      }

      const mockEvent = {} as IpcMainInvokeEvent
      const result = await createHandler?.(mockEvent, options)

      expect(result).toEqual({
        id: 'terminal-1',
        name: 'Test Terminal',
        pid: 0, // Should default to 0
      })
    })

    /**
     * Tests error handling in terminal creation.
     *
     * @throws {@link Error}
     * Should propagate errors from TerminalManager terminal creation
     *
     * @example
     * ```typescript
     * const error = new Error('Creation failed')
     * mockTerminalManager.createTerminal.mockRejectedValue(error)
     * ```
     *
     * @public
     */
    it('should handle terminal creation errors', async () => {
      const error = new Error('Failed to create terminal')
      mockTerminalManager.createTerminal = vi.fn().mockRejectedValue(error)

      const createTerminalCall = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'create-terminal'
      )
      const createHandler = createTerminalCall?.[1]

      const options: CreateTerminalMessage = { name: 'Test Terminal' }
      const mockEvent = {} as IpcMainInvokeEvent

      await expect(createHandler?.(mockEvent, options)).rejects.toThrow(
        'Failed to create terminal'
      )
    })
  })

  describe('Terminal input handler', () => {
    /**
     * Tests terminal input message handling.
     *
     * @returns void
     * Should forward input messages to TerminalManager
     *
     * @example
     * ```typescript
     * const inputMessage = { id: 'term1', data: 'echo hello\r' }
     * inputHandler(mockEvent, inputMessage)
     * expect(mockTerminalManager.sendData).toHaveBeenCalledWith('term1', 'echo hello\r')
     * ```
     *
     * @public
     */
    it('should handle terminal input messages', () => {
      const terminalInputCall = mockIpcMain.on.mock.calls.find(
        (call) => call[0] === 'terminal-input'
      )
      expect(terminalInputCall).toBeDefined()

      const inputHandler = terminalInputCall?.[1]
      expect(inputHandler).toBeTypeOf('function')

      const inputMessage: TerminalInputMessage = {
        id: 'terminal-1',
        data: 'echo "Hello World"\r',
      }

      const mockEvent = {} as IpcMainEvent
      inputHandler?.(mockEvent, inputMessage)

      expect(mockTerminalManager.sendData).toHaveBeenCalledWith(
        'terminal-1',
        'echo "Hello World"\r'
      )
    })

    /**
     * Tests error handling in terminal input.
     *
     * @returns void
     * Should handle errors gracefully without crashing
     *
     * @example
     * ```typescript
     * mockTerminalManager.sendData.mockImplementation(() => { throw new Error('Send failed') })
     * // Should not throw, just log error
     * ```
     *
     * @public
     */
    it('should handle terminal input errors gracefully', () => {
      mockTerminalManager.sendData = vi.fn().mockImplementation(() => {
        throw new Error('Failed to send data')
      })

      const terminalInputCall = mockIpcMain.on.mock.calls.find(
        (call) => call[0] === 'terminal-input'
      )
      const inputHandler = terminalInputCall?.[1]

      const inputMessage: TerminalInputMessage = {
        id: 'terminal-1',
        data: 'test command',
      }

      const mockEvent = {} as IpcMainEvent

      // Should not throw
      expect(() => inputHandler?.(mockEvent, inputMessage)).not.toThrow()
    })
  })

  describe('Terminal resize handler', () => {
    /**
     * Tests terminal resize message handling.
     *
     * @returns void
     * Should forward resize requests to TerminalManager
     *
     * @example
     * ```typescript
     * const resizeMessage = { id: 'term1', cols: 120, rows: 40 }
     * resizeHandler(mockEvent, resizeMessage)
     * expect(mockTerminalManager.resizeTerminal).toHaveBeenCalledWith(resizeMessage)
     * ```
     *
     * @public
     */
    it('should handle terminal resize messages', () => {
      const resizeCall = mockIpcMain.on.mock.calls.find(
        (call) => call[0] === 'resize-terminal'
      )
      expect(resizeCall).toBeDefined()

      const resizeHandler = resizeCall?.[1]
      expect(resizeHandler).toBeTypeOf('function')

      const resizeMessage: TerminalResizeMessage = {
        id: 'terminal-1',
        cols: 120,
        rows: 30,
      }

      const mockEvent = {} as IpcMainEvent
      resizeHandler?.(mockEvent, resizeMessage)

      expect(mockTerminalManager.resizeTerminal).toHaveBeenCalledWith({
        id: 'terminal-1',
        cols: 120,
        rows: 30,
      })
    })

    /**
     * Tests error handling in terminal resize.
     *
     * @returns void
     * Should handle errors gracefully without crashing
     *
     * @public
     */
    it('should handle terminal resize errors gracefully', () => {
      mockTerminalManager.resizeTerminal = vi.fn().mockImplementation(() => {
        throw new Error('Failed to resize terminal')
      })

      const resizeCall = mockIpcMain.on.mock.calls.find(
        (call) => call[0] === 'resize-terminal'
      )
      const resizeHandler = resizeCall?.[1]

      const resizeMessage: TerminalResizeMessage = {
        id: 'terminal-1',
        cols: 120,
        rows: 30,
      }

      const mockEvent = {} as IpcMainEvent

      // Should not throw
      expect(() => resizeHandler?.(mockEvent, resizeMessage)).not.toThrow()
    })
  })

  describe('Terminal close handler', () => {
    /**
     * Tests terminal close message handling.
     *
     * @returns void
     * Should forward close requests to TerminalManager
     *
     * @example
     * ```typescript
     * closeHandler(mockEvent, 'terminal-1')
     * expect(mockTerminalManager.closeTerminal).toHaveBeenCalledWith('terminal-1')
     * ```
     *
     * @public
     */
    it('should handle terminal close messages', () => {
      const closeCall = mockIpcMain.on.mock.calls.find(
        (call) => call[0] === 'close-terminal'
      )
      expect(closeCall).toBeDefined()

      const closeHandler = closeCall?.[1]
      expect(closeHandler).toBeTypeOf('function')

      const mockEvent = {} as IpcMainEvent
      closeHandler?.(mockEvent, 'terminal-1')

      expect(mockTerminalManager.closeTerminal).toHaveBeenCalledWith(
        'terminal-1'
      )
    })

    /**
     * Tests error handling in terminal close.
     *
     * @returns void
     * Should handle errors gracefully without crashing
     *
     * @public
     */
    it('should handle terminal close errors gracefully', () => {
      mockTerminalManager.closeTerminal = vi.fn().mockImplementation(() => {
        throw new Error('Failed to close terminal')
      })

      const closeCall = mockIpcMain.on.mock.calls.find(
        (call) => call[0] === 'close-terminal'
      )
      const closeHandler = closeCall?.[1]

      const mockEvent = {} as IpcMainEvent

      // Should not throw
      expect(() => closeHandler?.(mockEvent, 'terminal-1')).not.toThrow()
    })
  })

  describe('List terminals handler', () => {
    /**
     * Tests terminal list retrieval via IPC.
     *
     * @returns void
     * Should return list of terminals from TerminalManager
     *
     * @example
     * ```typescript
     * const mockTerminals = [{ id: 'term1', name: 'Terminal' }]
     * mockTerminalManager.getAllTerminals.mockReturnValue(mockTerminals)
     * ```
     *
     * @public
     */
    it('should handle list terminals requests', () => {
      const mockTerminals = [
        { id: 'terminal-1', name: 'Terminal 1' },
        { id: 'terminal-2', name: 'Terminal 2' },
      ]

      mockTerminalManager.getAllTerminals = vi
        .fn()
        .mockReturnValue(mockTerminals)

      const listCall = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'list-terminals'
      )
      expect(listCall).toBeDefined()

      const listHandler = listCall?.[1]
      expect(listHandler).toBeTypeOf('function')

      const result = listHandler?.()

      expect(mockTerminalManager.getAllTerminals).toHaveBeenCalled()
      expect(result).toEqual(mockTerminals)
    })

    /**
     * Tests error handling in list terminals.
     *
     * @throws {@link Error}
     * Should propagate errors from TerminalManager
     *
     * @public
     */
    it('should handle list terminals errors', () => {
      const error = new Error('Failed to list terminals')
      mockTerminalManager.getAllTerminals = vi.fn().mockImplementation(() => {
        throw error
      })

      const listCall = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'list-terminals'
      )
      const listHandler = listCall?.[1]

      expect(() => listHandler?.()).toThrow('Failed to list terminals')
    })
  })

  describe('Terminal manager event forwarding', () => {
    beforeEach(() => {
      ipcBridge.setWebContents(mockWebContents as WebContents)
    })

    describe('without WebContents', () => {
      /**
       * Tests event handling when WebContents is not set.
       *
       * @returns void
       * Should not crash or throw when no WebContents is available
       *
       * @public
       */
      it('should handle terminalCreated events without WebContents', () => {
        // Clear all previous mocks
        vi.clearAllMocks()

        // Create fresh mocks
        const freshIpcMain = {
          handle: vi.fn(),
          on: vi.fn(),
          removeAllListeners: vi.fn(),
        }

        const freshTerminalManager = {
          createTerminal: vi.fn(),
          sendData: vi.fn(),
          resizeTerminal: vi.fn(),
          closeTerminal: vi.fn(),
          getAllTerminals: vi.fn(() => []),
          cleanup: vi.fn(),
          on: vi.fn(),
        }

        vi.mocked(TerminalManager).mockImplementation(
          () => freshTerminalManager as unknown as TerminalManager
        )

        // Create new bridge without setting WebContents to trigger event handlers
        void new IPCBridge(freshIpcMain as IpcMain)

        const terminalCreatedCall = freshTerminalManager.on.mock.calls.find(
          (call: Parameters<typeof freshTerminalManager.on>) =>
            call[0] === 'terminalCreated'
        )
        const eventHandler = terminalCreatedCall[1]

        const mockTerminal = {
          id: 'terminal-1',
          name: 'Test Terminal',
          pid: 1234,
        }

        // Should not throw when WebContents is null
        expect(() => eventHandler(mockTerminal)).not.toThrow()
      })

      /**
       * Tests event handling when WebContents is not set for exit events.
       *
       * @returns void
       * Should not crash when no WebContents is available
       *
       * @public
       */
      it('should handle terminalExit events without WebContents', () => {
        // Clear all previous mocks
        vi.clearAllMocks()

        // Create fresh mocks
        const freshIpcMain = {
          handle: vi.fn(),
          on: vi.fn(),
          removeAllListeners: vi.fn(),
        }

        const freshTerminalManager = {
          createTerminal: vi.fn(),
          sendData: vi.fn(),
          resizeTerminal: vi.fn(),
          closeTerminal: vi.fn(),
          getAllTerminals: vi.fn(() => []),
          cleanup: vi.fn(),
          on: vi.fn(),
        }

        vi.mocked(TerminalManager).mockImplementation(
          () => freshTerminalManager as unknown as TerminalManager
        )

        // Create new bridge without setting WebContents to trigger event handlers
        void new IPCBridge(freshIpcMain as IpcMain)

        const terminalExitCall = freshTerminalManager.on.mock.calls.find(
          (call: Parameters<typeof freshTerminalManager.on>) =>
            call[0] === 'terminalExit'
        )
        const eventHandler = terminalExitCall[1]

        const exitEvent = {
          id: 'terminal-1',
          data: { exitCode: 0 },
        }

        // Should not throw when WebContents is null
        expect(() => eventHandler(exitEvent)).not.toThrow()
      })

      /**
       * Tests event handling when WebContents is not set for error events.
       *
       * @returns void
       * Should not crash when no WebContents is available
       *
       * @public
       */
      it('should handle terminalError events without WebContents', () => {
        // Clear all previous mocks
        vi.clearAllMocks()

        // Create fresh mocks
        const freshIpcMain = {
          handle: vi.fn(),
          on: vi.fn(),
          removeAllListeners: vi.fn(),
        }

        const freshTerminalManager = {
          createTerminal: vi.fn(),
          sendData: vi.fn(),
          resizeTerminal: vi.fn(),
          closeTerminal: vi.fn(),
          getAllTerminals: vi.fn(() => []),
          cleanup: vi.fn(),
          on: vi.fn(),
        }

        vi.mocked(TerminalManager).mockImplementation(
          () => freshTerminalManager as unknown as TerminalManager
        )

        // Create new bridge without setting WebContents to trigger event handlers
        void new IPCBridge(freshIpcMain as IpcMain)

        const terminalErrorCall = freshTerminalManager.on.mock.calls.find(
          (call: Parameters<typeof freshTerminalManager.on>) =>
            call[0] === 'terminalError'
        )
        const eventHandler = terminalErrorCall[1]

        const errorEvent = {
          id: 'terminal-1',
          data: { error: 'Terminal connection failed' },
        }

        // Should not throw when WebContents is null
        expect(() => eventHandler(errorEvent)).not.toThrow()
      })
    })

    /**
     * Tests terminal created event forwarding to renderer.
     *
     * @returns void
     * Should forward terminalCreated events to WebContents
     *
     * @example
     * ```typescript
     * const eventHandler = mockTerminalManager.on.mock.calls.find(call => call[0] === 'terminalCreated')[1]
     * eventHandler({ id: 'term1', name: 'Terminal', pid: 1234 })
     * expect(mockWebContents.send).toHaveBeenCalledWith('terminal-created', { id: 'term1', name: 'Terminal', pid: 1234 })
     * ```
     *
     * @public
     */
    it('should forward terminal created events to renderer', () => {
      const terminalCreatedCall = mockTerminalManager.on.mock.calls.find(
        (call: Parameters<typeof mockTerminalManager.on>) =>
          call[0] === 'terminalCreated'
      )
      expect(terminalCreatedCall).toBeDefined()

      const eventHandler = terminalCreatedCall[1]
      const mockTerminal = {
        id: 'terminal-1',
        name: 'Test Terminal',
        pid: 1234,
      }

      eventHandler(mockTerminal)

      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-created', {
        id: 'terminal-1',
        name: 'Test Terminal',
        pid: 1234,
      })
    })

    /**
     * Tests terminal created event forwarding when terminal has no pid.
     *
     * @returns void
     * Should forward terminalCreated events with pid defaulted to 0
     *
     * @public
     */
    it('should handle terminal created events with no pid', () => {
      const terminalCreatedCall = mockTerminalManager.on.mock.calls.find(
        (call: Parameters<typeof mockTerminalManager.on>) =>
          call[0] === 'terminalCreated'
      )
      const eventHandler = terminalCreatedCall[1]

      const mockTerminal = {
        id: 'terminal-1',
        name: 'Test Terminal',
        // No pid property
      }

      eventHandler(mockTerminal)

      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-created', {
        id: 'terminal-1',
        name: 'Test Terminal',
        pid: 0, // Should default to 0
      })
    })

    /**
     * Tests terminal data event forwarding to renderer.
     *
     * @returns void
     * Should forward terminalData events to WebContents
     *
     * @example
     * ```typescript
     * const dataEvent = { id: 'term1', data: 'Hello World' }
     * eventHandler(dataEvent)
     * expect(mockWebContents.send).toHaveBeenCalledWith('terminal-data', dataEvent)
     * ```
     *
     * @public
     */
    it('should forward terminal data events to renderer', () => {
      const terminalDataCall = mockTerminalManager.on.mock.calls.find(
        (call: Parameters<typeof mockTerminalManager.on>) =>
          call[0] === 'terminalData'
      )
      expect(terminalDataCall).toBeDefined()

      const eventHandler = terminalDataCall[1]
      const dataEvent = {
        id: 'terminal-1',
        data: 'Hello from terminal',
      }

      eventHandler(dataEvent)

      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-data', {
        id: 'terminal-1',
        data: 'Hello from terminal',
      })
    })

    /**
     * Tests terminal exit event forwarding with proper exit code handling.
     *
     * @returns void
     * Should forward terminalExit events with exit codes to WebContents
     *
     * @example
     * ```typescript
     * const exitEvent = { id: 'term1', data: { exitCode: 0 } }
     * eventHandler(exitEvent)
     * expect(mockWebContents.send).toHaveBeenCalledWith('terminal-exit', { id: 'term1', exitCode: 0 })
     * ```
     *
     * @public
     */
    it('should forward terminal exit events to renderer', () => {
      const terminalExitCall = mockTerminalManager.on.mock.calls.find(
        (call: Parameters<typeof mockTerminalManager.on>) =>
          call[0] === 'terminalExit'
      )
      expect(terminalExitCall).toBeDefined()

      const eventHandler = terminalExitCall[1]
      const exitEvent = {
        id: 'terminal-1',
        data: { exitCode: 0 },
      }

      eventHandler(exitEvent)

      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-exit', {
        id: 'terminal-1',
        exitCode: 0,
      })
    })

    /**
     * Tests terminal exit event forwarding with missing exit code.
     *
     * @returns void
     * Should forward terminalExit events with default exit code when data is missing
     *
     * @public
     */
    it('should handle terminal exit events with missing data', () => {
      const terminalExitCall = mockTerminalManager.on.mock.calls.find(
        (call: Parameters<typeof mockTerminalManager.on>) =>
          call[0] === 'terminalExit'
      )
      const eventHandler = terminalExitCall[1]

      const exitEvent = {
        id: 'terminal-1',
        data: null, // No data
      }

      eventHandler(exitEvent)

      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-exit', {
        id: 'terminal-1',
        exitCode: 0, // Should default to 0
      })
    })

    /**
     * Tests terminal error event forwarding to renderer.
     *
     * @returns void
     * Should forward terminalError events with error messages to WebContents
     *
     * @example
     * ```typescript
     * const errorEvent = { id: 'term1', data: { error: 'Connection failed' } }
     * eventHandler(errorEvent)
     * expect(mockWebContents.send).toHaveBeenCalledWith('terminal-error', { id: 'term1', error: 'Connection failed' })
     * ```
     *
     * @public
     */
    it('should forward terminal error events to renderer', () => {
      const terminalErrorCall = mockTerminalManager.on.mock.calls.find(
        (call: Parameters<typeof mockTerminalManager.on>) =>
          call[0] === 'terminalError'
      )
      expect(terminalErrorCall).toBeDefined()

      const eventHandler = terminalErrorCall[1]
      const errorEvent = {
        id: 'terminal-1',
        data: { error: 'Terminal connection failed' },
      }

      eventHandler(errorEvent)

      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-error', {
        id: 'terminal-1',
        error: 'Terminal connection failed',
      })
    })

    /**
     * Tests terminal error event forwarding with missing error message.
     *
     * @returns void
     * Should forward terminalError events with default error when data is missing
     *
     * @public
     */
    it('should handle terminal error events with missing data', () => {
      const terminalErrorCall = mockTerminalManager.on.mock.calls.find(
        (call: Parameters<typeof mockTerminalManager.on>) =>
          call[0] === 'terminalError'
      )
      const eventHandler = terminalErrorCall[1]

      const errorEvent = {
        id: 'terminal-1',
        data: null, // No data
      }

      eventHandler(errorEvent)

      expect(mockWebContents.send).toHaveBeenCalledWith('terminal-error', {
        id: 'terminal-1',
        error: 'Unknown error', // Should default to 'Unknown error'
      })
    })

    /**
     * Tests handling of destroyed WebContents.
     *
     * @returns void
     * Should not send events when WebContents is destroyed
     *
     * @example
     * ```typescript
     * mockWebContents.isDestroyed.mockReturnValue(true)
     * eventHandler(mockEvent)
     * expect(mockWebContents.send).not.toHaveBeenCalled()
     * ```
     *
     * @public
     */
    it('should not send events when WebContents is destroyed', () => {
      mockWebContents.isDestroyed = vi.fn(() => true)

      const terminalDataCall = mockTerminalManager.on.mock.calls.find(
        (call: Parameters<typeof mockTerminalManager.on>) =>
          call[0] === 'terminalData'
      )
      const eventHandler = terminalDataCall[1]
      const dataEvent = { id: 'terminal-1', data: 'test' }

      eventHandler(dataEvent)

      expect(mockWebContents.send).not.toHaveBeenCalled()
    })
  })

  describe('Cleanup', () => {
    /**
     * Tests proper resource cleanup.
     *
     * @returns void
     * Should clean up TerminalManager and remove IPC handlers
     *
     * @example
     * ```typescript
     * bridge.cleanup()
     * expect(mockTerminalManager.cleanup).toHaveBeenCalled()
     * expect(mockIpcMain.removeAllListeners).toHaveBeenCalledTimes(5)
     * ```
     *
     * @public
     */
    it('should cleanup resources properly', () => {
      ipcBridge.cleanup()

      expect(mockTerminalManager.cleanup).toHaveBeenCalled()
      expect(mockIpcMain.removeAllListeners).toHaveBeenCalledWith(
        'create-terminal'
      )
      expect(mockIpcMain.removeAllListeners).toHaveBeenCalledWith(
        'terminal-input'
      )
      expect(mockIpcMain.removeAllListeners).toHaveBeenCalledWith(
        'resize-terminal'
      )
      expect(mockIpcMain.removeAllListeners).toHaveBeenCalledWith(
        'close-terminal'
      )
      expect(mockIpcMain.removeAllListeners).toHaveBeenCalledWith(
        'list-terminals'
      )
    })
  })
})
