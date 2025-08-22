/**
 * @fileoverview Comprehensive tests for TerminalManager class.
 *
 * @description
 * Tests for the main terminal controller following VSCode architecture.
 * This covers terminal lifecycle management, ProcessManager integration,
 * event handling, and Map-based terminal storage.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TerminalManager } from './TerminalManager'
import { ProcessManager } from './ProcessManager'
import type {
  TerminalState,
  CreateTerminalOptions,
  TerminalDataEvent,
  TerminalLifecycleEvent,
  TerminalResize,
} from '../types/terminal'
import type { TerminalProcess } from '../types/process'
import type { BackendProcess } from './TerminalBackend'

// Mock ProcessManager
vi.mock('./ProcessManager')
vi.mock('../utils/logger', () => ({
  Logger: vi.fn().mockImplementation(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

describe('TerminalManager', () => {
  let terminalManager: TerminalManager
  let mockProcessManager: ProcessManager
  let mockProcessManagerEvents: Map<string, ((...args: unknown[]) => void)[]>

  beforeEach(() => {
    // Setup event emitter mock for ProcessManager
    mockProcessManagerEvents = new Map()

    const mockEventEmitter = {
      on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
        if (!mockProcessManagerEvents.has(event)) {
          mockProcessManagerEvents.set(event, [])
        }
        mockProcessManagerEvents.get(event)!.push(callback)
      }),
      emit: vi.fn((event: string, ...args: unknown[]) => {
        const callbacks = mockProcessManagerEvents.get(event) || []
        callbacks.forEach((callback) => callback(...args))
      }),
      removeAllListeners: vi.fn(),
    }

    // Mock ProcessManager implementation
    mockProcessManager = {
      ...mockEventEmitter,
      spawn: vi.fn(),
      write: vi.fn(),
      resize: vi.fn(),
      kill: vi.fn(),
      getProcess: vi.fn(),
      getAllProcesses: vi.fn(),
      cleanup: vi.fn(),
    } as ProcessManager

    // Mock the ProcessManager constructor
    vi.mocked(ProcessManager).mockImplementation(() => mockProcessManager)

    terminalManager = new TerminalManager()
  })

  afterEach(() => {
    vi.clearAllMocks()
    mockProcessManagerEvents.clear()
  })

  describe('constructor', () => {
    it('should initialize with ProcessManager and setup events', () => {
      expect(ProcessManager).toHaveBeenCalledOnce()
      expect(mockProcessManager.on).toHaveBeenCalledWith(
        'processData',
        expect.any(Function)
      )
      expect(mockProcessManager.on).toHaveBeenCalledWith(
        'processExit',
        expect.any(Function)
      )
      expect(mockProcessManager.on).toHaveBeenCalledWith(
        'processError',
        expect.any(Function)
      )
    })

    it('should start with empty terminal counter', () => {
      expect(terminalManager.getAllTerminals()).toHaveLength(0)
      expect(terminalManager.getRunningCount()).toBe(0)
    })
  })

  describe('createTerminal', () => {
    const mockProcess: TerminalProcess = {
      id: 'test-terminal-1',
      pty: {} as BackendProcess,
      info: {
        pid: 1234,
        name: 'bash',
        cmd: 'bash',
        cwd: '/home/user',
        env: {},
        startTime: new Date('2024-01-01T10:00:00Z'),
      },
      state: 'running',
      capabilities: {
        backend: 'node-pty',
        supportsResize: true,
        supportsColors: true,
        supportsInteractivity: true,
        supportsHistory: true,
        reliability: 'high',
      },
    }

    beforeEach(() => {
      vi.mocked(mockProcessManager.spawn).mockResolvedValue(mockProcess)
    })

    it('should create terminal with default options', async () => {
      const terminal = await terminalManager.createTerminal()

      expect(mockProcessManager.spawn).toHaveBeenCalledWith({
        shell: undefined,
        cwd: undefined,
        env: undefined,
        cols: undefined,
        rows: undefined,
      })

      expect(terminal).toEqual({
        id: 'test-terminal-1',
        name: 'Terminal 1',
        isActive: false,
        isRunning: true,
        pid: 1234,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        lastActivity: expect.any(Date),
      })
    })

    it('should create terminal with custom options', async () => {
      const options: CreateTerminalOptions = {
        name: 'Custom Terminal',
        shell: '/bin/zsh',
        cwd: '/workspace',
        env: { NODE_ENV: 'development' },
        cols: 120,
        rows: 40,
      }

      const terminal = await terminalManager.createTerminal(options)

      expect(mockProcessManager.spawn).toHaveBeenCalledWith({
        shell: '/bin/zsh',
        cwd: '/workspace',
        env: { NODE_ENV: 'development' },
        cols: 120,
        rows: 40,
      })

      expect(terminal.name).toBe('Custom Terminal')
    })

    it('should increment terminal counter for each terminal', async () => {
      const terminal1 = await terminalManager.createTerminal()
      expect(terminal1.name).toBe('Terminal 1')

      // Mock new process for second terminal
      const mockProcess2 = { ...mockProcess, id: 'test-terminal-2' }
      vi.mocked(mockProcessManager.spawn).mockResolvedValue(mockProcess2)

      const terminal2 = await terminalManager.createTerminal()
      expect(terminal2.name).toBe('Terminal 2')
    })

    it('should store terminal in internal map', async () => {
      const terminal = await terminalManager.createTerminal()

      expect(terminalManager.getTerminal(terminal.id)).toEqual(terminal)
      expect(terminalManager.getAllTerminals()).toContain(terminal)
    })

    it('should emit terminalCreated event', async () => {
      const eventSpy = vi.fn()
      terminalManager.on('terminalCreated', eventSpy)

      const terminal = await terminalManager.createTerminal()

      expect(eventSpy).toHaveBeenCalledWith(terminal)
    })

    it('should handle spawn errors gracefully', async () => {
      const error = new Error('Failed to spawn process')
      vi.mocked(mockProcessManager.spawn).mockRejectedValue(error)

      await expect(terminalManager.createTerminal()).rejects.toThrow(
        'Failed to spawn process'
      )
    })
  })

  describe('sendData', () => {
    let terminal: TerminalState

    beforeEach(async () => {
      const mockProcess: TerminalProcess = {
        id: 'test-terminal-1',
        pty: {} as BackendProcess,
        info: {
          pid: 1234,
          name: 'bash',
          cmd: 'bash',
          cwd: '/home',
          env: {},
          startTime: new Date(),
        },
        state: 'running',
        capabilities: {
          backend: 'node-pty',
          supportsResize: true,
          supportsColors: true,
          supportsInteractivity: true,
          supportsHistory: true,
          reliability: 'high',
        },
      }
      vi.mocked(mockProcessManager.spawn).mockResolvedValue(mockProcess)
      terminal = await terminalManager.createTerminal()
    })

    it('should send data to running terminal', () => {
      vi.mocked(mockProcessManager.write).mockReturnValue(true)

      const result = terminalManager.sendData(terminal.id, 'echo test\n')

      expect(mockProcessManager.write).toHaveBeenCalledWith(
        terminal.id,
        'echo test\n'
      )
      expect(result).toBe(true)
    })

    it('should update lastActivity when sending data', () => {
      vi.mocked(mockProcessManager.write).mockReturnValue(true)
      const beforeTime = terminal.lastActivity.getTime()

      terminalManager.sendData(terminal.id, 'test')

      expect(terminal.lastActivity.getTime()).toBeGreaterThanOrEqual(beforeTime)
    })

    it('should return false for non-existent terminal', () => {
      const result = terminalManager.sendData('non-existent', 'test')

      expect(result).toBe(false)
      expect(mockProcessManager.write).not.toHaveBeenCalled()
    })

    it('should return false for non-running terminal', () => {
      terminal.isRunning = false

      const result = terminalManager.sendData(terminal.id, 'test')

      expect(result).toBe(false)
      expect(mockProcessManager.write).not.toHaveBeenCalled()
    })
  })

  describe('resizeTerminal', () => {
    let terminal: TerminalState

    beforeEach(async () => {
      const mockProcess: TerminalProcess = {
        id: 'test-terminal-1',
        pty: {} as BackendProcess,
        info: {
          pid: 1234,
          name: 'bash',
          cmd: 'bash',
          cwd: '/home',
          env: {},
          startTime: new Date(),
        },
        state: 'running',
        capabilities: {
          backend: 'node-pty',
          supportsResize: true,
          supportsColors: true,
          supportsInteractivity: true,
          supportsHistory: true,
          reliability: 'high',
        },
      }
      vi.mocked(mockProcessManager.spawn).mockResolvedValue(mockProcess)
      terminal = await terminalManager.createTerminal()
    })

    it('should resize existing terminal', () => {
      vi.mocked(mockProcessManager.resize).mockReturnValue(true)
      const resize: TerminalResize = { id: terminal.id, cols: 120, rows: 40 }

      const result = terminalManager.resizeTerminal(resize)

      expect(mockProcessManager.resize).toHaveBeenCalledWith(
        terminal.id,
        120,
        40
      )
      expect(result).toBe(true)
    })

    it('should return false for non-existent terminal', () => {
      const resize: TerminalResize = { id: 'non-existent', cols: 80, rows: 24 }

      const result = terminalManager.resizeTerminal(resize)

      expect(result).toBe(false)
      expect(mockProcessManager.resize).not.toHaveBeenCalled()
    })
  })

  describe('closeTerminal', () => {
    let terminal: TerminalState

    beforeEach(async () => {
      const mockProcess: TerminalProcess = {
        id: 'test-terminal-1',
        pty: {} as BackendProcess,
        info: {
          pid: 1234,
          name: 'bash',
          cmd: 'bash',
          cwd: '/home',
          env: {},
          startTime: new Date(),
        },
        state: 'running',
        capabilities: {
          backend: 'node-pty',
          supportsResize: true,
          supportsColors: true,
          supportsInteractivity: true,
          supportsHistory: true,
          reliability: 'high',
        },
      }
      vi.mocked(mockProcessManager.spawn).mockResolvedValue(mockProcess)
      terminal = await terminalManager.createTerminal()
    })

    it('should close existing terminal successfully', () => {
      vi.mocked(mockProcessManager.kill).mockReturnValue(true)

      const result = terminalManager.closeTerminal(terminal.id)

      expect(mockProcessManager.kill).toHaveBeenCalledWith(terminal.id)
      expect(result).toBe(true)
      expect(terminal.isRunning).toBe(false)
      expect(terminal.lastActivity).toBeInstanceOf(Date)
    })

    it('should return false for non-existent terminal', () => {
      const result = terminalManager.closeTerminal('non-existent')

      expect(result).toBe(false)
      expect(mockProcessManager.kill).not.toHaveBeenCalled()
    })

    it('should not update state if kill fails', () => {
      vi.mocked(mockProcessManager.kill).mockReturnValue(false)
      const wasRunning = terminal.isRunning

      const result = terminalManager.closeTerminal(terminal.id)

      expect(result).toBe(false)
      expect(terminal.isRunning).toBe(wasRunning)
    })
  })

  describe('setActiveTerminal', () => {
    let terminal1: TerminalState
    let terminal2: TerminalState

    beforeEach(async () => {
      // Create first terminal
      const mockProcess1: TerminalProcess = {
        id: 'test-terminal-1',
        pty: {} as BackendProcess,
        info: {
          pid: 1234,
          name: 'bash',
          cmd: 'bash',
          cwd: '/home',
          env: {},
          startTime: new Date(),
        },
        state: 'running',
        capabilities: {
          backend: 'node-pty',
          supportsResize: true,
          supportsColors: true,
          supportsInteractivity: true,
          supportsHistory: true,
          reliability: 'high',
        },
      }
      vi.mocked(mockProcessManager.spawn).mockResolvedValue(mockProcess1)
      terminal1 = await terminalManager.createTerminal({ name: 'Terminal 1' })

      // Create second terminal
      const mockProcess2: TerminalProcess = {
        id: 'test-terminal-2',
        pty: {} as BackendProcess,
        info: {
          pid: 1235,
          name: 'bash',
          cmd: 'bash',
          cwd: '/home',
          env: {},
          startTime: new Date(),
        },
        state: 'running',
        capabilities: {
          backend: 'node-pty',
          supportsResize: true,
          supportsColors: true,
          supportsInteractivity: true,
          supportsHistory: true,
          reliability: 'high',
        },
      }
      vi.mocked(mockProcessManager.spawn).mockResolvedValue(mockProcess2)
      terminal2 = await terminalManager.createTerminal({ name: 'Terminal 2' })
    })

    it('should set terminal as active', () => {
      const result = terminalManager.setActiveTerminal(terminal1.id)

      expect(result).toBe(true)
      expect(terminal1.isActive).toBe(true)
      expect(terminal1.lastActivity).toBeInstanceOf(Date)
    })

    it('should deactivate other terminals when setting one active', () => {
      terminalManager.setActiveTerminal(terminal1.id)
      expect(terminal1.isActive).toBe(true)
      expect(terminal2.isActive).toBe(false)

      terminalManager.setActiveTerminal(terminal2.id)
      expect(terminal1.isActive).toBe(false)
      expect(terminal2.isActive).toBe(true)
    })

    it('should return false for non-existent terminal', () => {
      const result = terminalManager.setActiveTerminal('non-existent')

      expect(result).toBe(false)
      expect(terminal1.isActive).toBe(false)
      expect(terminal2.isActive).toBe(false)
    })
  })

  describe('terminal retrieval methods', () => {
    let terminal1: TerminalState
    let terminal2: TerminalState

    beforeEach(async () => {
      // Create terminals
      const mockProcess1: TerminalProcess = {
        id: 'test-terminal-1',
        pty: {} as BackendProcess,
        info: {
          pid: 1234,
          name: 'bash',
          cmd: 'bash',
          cwd: '/home',
          env: {},
          startTime: new Date(),
        },
        state: 'running',
        capabilities: {
          backend: 'node-pty',
          supportsResize: true,
          supportsColors: true,
          supportsInteractivity: true,
          supportsHistory: true,
          reliability: 'high',
        },
      }
      vi.mocked(mockProcessManager.spawn).mockResolvedValue(mockProcess1)
      terminal1 = await terminalManager.createTerminal({ name: 'Terminal 1' })

      const mockProcess2: TerminalProcess = {
        id: 'test-terminal-2',
        pty: {} as BackendProcess,
        info: {
          pid: 1235,
          name: 'bash',
          cmd: 'bash',
          cwd: '/home',
          env: {},
          startTime: new Date(),
        },
        state: 'running',
        capabilities: {
          backend: 'node-pty',
          supportsResize: true,
          supportsColors: true,
          supportsInteractivity: true,
          supportsHistory: true,
          reliability: 'high',
        },
      }
      vi.mocked(mockProcessManager.spawn).mockResolvedValue(mockProcess2)
      terminal2 = await terminalManager.createTerminal({ name: 'Terminal 2' })
    })

    describe('getTerminal', () => {
      it('should return terminal by ID', () => {
        expect(terminalManager.getTerminal(terminal1.id)).toEqual(terminal1)
        expect(terminalManager.getTerminal(terminal2.id)).toEqual(terminal2)
      })

      it('should return undefined for non-existent ID', () => {
        expect(terminalManager.getTerminal('non-existent')).toBeUndefined()
      })
    })

    describe('getAllTerminals', () => {
      it('should return all terminals', () => {
        const allTerminals = terminalManager.getAllTerminals()
        expect(allTerminals).toHaveLength(2)
        expect(allTerminals).toContain(terminal1)
        expect(allTerminals).toContain(terminal2)
      })
    })

    describe('getActiveTerminal', () => {
      it('should return active terminal', () => {
        terminalManager.setActiveTerminal(terminal1.id)
        expect(terminalManager.getActiveTerminal()).toEqual(terminal1)

        terminalManager.setActiveTerminal(terminal2.id)
        expect(terminalManager.getActiveTerminal()).toEqual(terminal2)
      })

      it('should return undefined when no terminal is active', () => {
        expect(terminalManager.getActiveTerminal()).toBeUndefined()
      })
    })

    describe('getRunningCount', () => {
      it('should return count of running terminals', () => {
        expect(terminalManager.getRunningCount()).toBe(2)

        terminal1.isRunning = false
        expect(terminalManager.getRunningCount()).toBe(1)

        terminal2.isRunning = false
        expect(terminalManager.getRunningCount()).toBe(0)
      })
    })
  })

  describe('ProcessManager event handling', () => {
    let terminal: TerminalState

    beforeEach(async () => {
      const mockProcess: TerminalProcess = {
        id: 'test-terminal-1',
        pty: {} as BackendProcess,
        info: {
          pid: 1234,
          name: 'bash',
          cmd: 'bash',
          cwd: '/home',
          env: {},
          startTime: new Date(),
        },
        state: 'running',
        capabilities: {
          backend: 'node-pty',
          supportsResize: true,
          supportsColors: true,
          supportsInteractivity: true,
          supportsHistory: true,
          reliability: 'high',
        },
      }
      vi.mocked(mockProcessManager.spawn).mockResolvedValue(mockProcess)
      terminal = await terminalManager.createTerminal()
    })

    describe('processData event', () => {
      it('should handle process data and emit terminalData', () => {
        const dataSpy = vi.fn()
        terminalManager.on('terminalData', dataSpy)

        // Trigger processData event
        mockProcessManager.emit('processData', terminal.id, 'test output')

        expect(dataSpy).toHaveBeenCalledWith({
          id: terminal.id,
          data: 'test output',
          timestamp: expect.any(Date),
        })
        expect(terminal.lastActivity).toBeInstanceOf(Date)
      })

      it('should ignore data for non-existent terminals', () => {
        const dataSpy = vi.fn()
        terminalManager.on('terminalData', dataSpy)

        mockProcessManager.emit('processData', 'non-existent', 'test')

        expect(dataSpy).not.toHaveBeenCalled()
      })
    })

    describe('processExit event', () => {
      it('should handle process exit and emit terminalExit', () => {
        const exitSpy = vi.fn()
        terminalManager.on('terminalExit', exitSpy)

        mockProcessManager.emit('processExit', terminal.id, 0)

        expect(exitSpy).toHaveBeenCalledWith({
          id: terminal.id,
          event: 'exited',
          data: { exitCode: 0 },
          timestamp: expect.any(Date),
        })
        expect(terminal.isRunning).toBe(false)
        expect(terminal.exitCode).toBe(0)
      })

      it('should remove terminal from map after exit', () => {
        mockProcessManager.emit('processExit', terminal.id, 0)

        expect(terminalManager.getTerminal(terminal.id)).toBeUndefined()
      })

      it('should ignore exit for non-existent terminals', () => {
        const exitSpy = vi.fn()
        terminalManager.on('terminalExit', exitSpy)

        mockProcessManager.emit('processExit', 'non-existent', 0)

        expect(exitSpy).not.toHaveBeenCalled()
      })
    })

    describe('processError event', () => {
      it('should handle process error and emit terminalError', () => {
        const errorSpy = vi.fn()
        terminalManager.on('terminalError', errorSpy)
        const error = new Error('Process failed')

        mockProcessManager.emit('processError', terminal.id, error)

        expect(errorSpy).toHaveBeenCalledWith({
          id: terminal.id,
          event: 'error',
          data: { error: 'Process failed' },
          timestamp: expect.any(Date),
        })
        expect(terminal.isRunning).toBe(false)
      })

      it('should ignore errors for non-existent terminals', () => {
        const errorSpy = vi.fn()
        terminalManager.on('terminalError', errorSpy)

        mockProcessManager.emit(
          'processError',
          'non-existent',
          new Error('Test')
        )

        expect(errorSpy).not.toHaveBeenCalled()
      })
    })
  })

  describe('cleanup', () => {
    let terminal1: TerminalState
    let terminal2: TerminalState

    beforeEach(async () => {
      // Create multiple terminals
      const mockProcess1: TerminalProcess = {
        id: 'test-terminal-1',
        pty: {} as BackendProcess,
        info: {
          pid: 1234,
          name: 'bash',
          cmd: 'bash',
          cwd: '/home',
          env: {},
          startTime: new Date(),
        },
        state: 'running',
        capabilities: {
          backend: 'node-pty',
          supportsResize: true,
          supportsColors: true,
          supportsInteractivity: true,
          supportsHistory: true,
          reliability: 'high',
        },
      }
      vi.mocked(mockProcessManager.spawn).mockResolvedValue(mockProcess1)
      terminal1 = await terminalManager.createTerminal()

      const mockProcess2: TerminalProcess = {
        id: 'test-terminal-2',
        pty: {} as BackendProcess,
        info: {
          pid: 1235,
          name: 'bash',
          cmd: 'bash',
          cwd: '/home',
          env: {},
          startTime: new Date(),
        },
        state: 'running',
        capabilities: {
          backend: 'node-pty',
          supportsResize: true,
          supportsColors: true,
          supportsInteractivity: true,
          supportsHistory: true,
          reliability: 'high',
        },
      }
      vi.mocked(mockProcessManager.spawn).mockResolvedValue(mockProcess2)
      terminal2 = await terminalManager.createTerminal()
    })

    it('should cleanup ProcessManager and clear terminals', () => {
      expect(terminalManager.getAllTerminals()).toHaveLength(2)

      // Verify terminals exist before cleanup
      expect(terminal1).toBeDefined()
      expect(terminal2).toBeDefined()

      terminalManager.cleanup()

      expect(mockProcessManager.cleanup).toHaveBeenCalledOnce()
      expect(terminalManager.getAllTerminals()).toHaveLength(0)
    })

    it('should remove all event listeners', () => {
      const removeAllListenersSpy = vi.spyOn(
        terminalManager,
        'removeAllListeners'
      )

      terminalManager.cleanup()

      expect(removeAllListenersSpy).toHaveBeenCalledOnce()
    })
  })

  describe('TypeScript type safety', () => {
    it('should have proper type definitions for events', () => {
      // Type safety test - these should compile without errors
      terminalManager.on('terminalCreated', (terminal: TerminalState) => {
        expect(terminal.id).toBeTypeOf('string')
        expect(terminal.name).toBeTypeOf('string')
        expect(terminal.isActive).toBeTypeOf('boolean')
      })

      terminalManager.on('terminalData', (event: TerminalDataEvent) => {
        expect(event.id).toBeTypeOf('string')
        expect(event.data).toBeTypeOf('string')
        expect(event.timestamp).toBeInstanceOf(Date)
      })

      terminalManager.on('terminalExit', (event: TerminalLifecycleEvent) => {
        expect(event.id).toBeTypeOf('string')
        expect(event.event).toBe('exited')
        expect(event.timestamp).toBeInstanceOf(Date)
      })

      terminalManager.on('terminalError', (event: TerminalLifecycleEvent) => {
        expect(event.id).toBeTypeOf('string')
        expect(event.event).toBe('error')
        expect(event.timestamp).toBeInstanceOf(Date)
      })
    })

    it('should validate CreateTerminalOptions interface', () => {
      // Test optional properties
      const options1: CreateTerminalOptions = {}
      const options2: CreateTerminalOptions = {
        name: 'Test Terminal',
        shell: '/bin/bash',
        cwd: '/workspace',
        env: { NODE_ENV: 'test' },
        cols: 80,
        rows: 24,
      }

      expect(options1).toBeDefined()
      expect(options2.name).toBe('Test Terminal')
    })

    it('should validate TerminalResize interface', () => {
      const resize: TerminalResize = {
        id: 'terminal-1',
        cols: 120,
        rows: 40,
      }

      expect(resize.id).toBeTypeOf('string')
      expect(resize.cols).toBeTypeOf('number')
      expect(resize.rows).toBeTypeOf('number')
    })
  })

  describe('error scenarios and edge cases', () => {
    it('should handle multiple terminals with same process ID gracefully', async () => {
      const mockProcess: TerminalProcess = {
        id: 'terminal-1',
        pty: {} as BackendProcess,
        info: {
          pid: 1234,
          name: 'bash',
          cmd: 'bash',
          cwd: '/home',
          env: {},
          startTime: new Date(),
        },
        state: 'running',
        capabilities: {
          backend: 'node-pty',
          supportsResize: true,
          supportsColors: true,
          supportsInteractivity: true,
          supportsHistory: true,
          reliability: 'high',
        },
      }

      vi.mocked(mockProcessManager.spawn).mockResolvedValue(mockProcess)

      const terminal1 = await terminalManager.createTerminal({
        name: 'Terminal 1',
      })
      expect(terminal1.pid).toBe(1234)

      // Different terminal ID but same PID should be fine
      const mockProcess2 = { ...mockProcess, id: 'terminal-2' }
      vi.mocked(mockProcessManager.spawn).mockResolvedValue(mockProcess2)

      const terminal2 = await terminalManager.createTerminal({
        name: 'Terminal 2',
      })
      expect(terminal2.pid).toBe(1234)
      expect(terminal2.id).not.toBe(terminal1.id)

      // Use both terminals to avoid unused variable warnings
      expect(terminal1.name).toBe('Terminal 1')
      expect(terminal2.name).toBe('Terminal 2')
    })

    it('should handle rapid terminal creation and destruction', async () => {
      const terminals: TerminalState[] = []

      // Create multiple terminals rapidly
      for (let i = 0; i < 5; i++) {
        const mockProcess: TerminalProcess = {
          id: `terminal-${i}`,
          pty: {} as BackendProcess,
          info: {
            pid: 1000 + i,
            name: 'bash',
            cmd: 'bash',
            cwd: '/home',
            env: {},
            startTime: new Date(),
          },
          state: 'running',
          capabilities: {
            backend: 'node-pty',
            supportsResize: true,
            supportsColors: true,
            supportsInteractivity: true,
            supportsHistory: true,
            reliability: 'high',
          },
        }
        vi.mocked(mockProcessManager.spawn).mockResolvedValue(mockProcess)

        const terminal = await terminalManager.createTerminal({
          name: `Terminal ${i + 1}`,
        })
        terminals.push(terminal)
      }

      expect(terminalManager.getAllTerminals()).toHaveLength(5)

      // Destroy terminals rapidly
      vi.mocked(mockProcessManager.kill).mockReturnValue(true)
      terminals.forEach((terminal) => {
        terminalManager.closeTerminal(terminal.id)
      })

      // Verify all terminals are marked as not running
      terminals.forEach((terminal) => {
        expect(terminal.isRunning).toBe(false)
      })
    })

    it('should handle concurrent active terminal changes', () => {
      // This test verifies that only one terminal can be active at a time
      // even with rapid state changes
      const terminal1 = { id: 'term1', isActive: false } as TerminalState
      const terminal2 = { id: 'term2', isActive: false } as TerminalState
      const terminal3 = { id: 'term3', isActive: false } as TerminalState

      // Manually add terminals to internal map for this test
      // Access private property for testing
      ;(
        terminalManager as unknown as { terminals: Map<string, unknown> }
      ).terminals.set('term1', terminal1)
      // Access private property for testing
      ;(
        terminalManager as unknown as { terminals: Map<string, unknown> }
      ).terminals.set('term2', terminal2)
      // Access private property for testing
      ;(
        terminalManager as unknown as { terminals: Map<string, unknown> }
      ).terminals.set('term3', terminal3)

      // Rapid active changes
      terminalManager.setActiveTerminal('term1')
      terminalManager.setActiveTerminal('term2')
      terminalManager.setActiveTerminal('term3')

      // Verify only one terminal is active
      const activeCount = [terminal1, terminal2, terminal3].filter(
        (t) => t.isActive
      ).length
      expect(activeCount).toBe(1)
      expect(terminal3.isActive).toBe(true)
    })
  })

  describe('integration scenarios', () => {
    it('should handle full terminal lifecycle correctly', async () => {
      const lifecycle: string[] = []

      // Create terminal
      const mockProcess: TerminalProcess = {
        id: 'lifecycle-terminal',
        pty: {} as BackendProcess,
        info: {
          pid: 9999,
          name: 'bash',
          cmd: 'bash',
          cwd: '/test',
          env: {},
          startTime: new Date(),
        },
        state: 'running',
        capabilities: {
          backend: 'node-pty',
          supportsResize: true,
          supportsColors: true,
          supportsInteractivity: true,
          supportsHistory: true,
          reliability: 'high',
        },
      }
      vi.mocked(mockProcessManager.spawn).mockResolvedValue(mockProcess)
      vi.mocked(mockProcessManager.write).mockReturnValue(true)
      vi.mocked(mockProcessManager.resize).mockReturnValue(true)
      vi.mocked(mockProcessManager.kill).mockReturnValue(true)

      // Track lifecycle events
      terminalManager.on('terminalCreated', () => lifecycle.push('created'))
      terminalManager.on('terminalData', () => lifecycle.push('data'))
      terminalManager.on('terminalExit', () => lifecycle.push('exit'))

      // 1. Create terminal
      const terminal = await terminalManager.createTerminal({
        name: 'Lifecycle Test',
      })
      expect(lifecycle).toContain('created')

      // 2. Set as active
      terminalManager.setActiveTerminal(terminal.id)
      expect(terminal.isActive).toBe(true)

      // 3. Send data
      terminalManager.sendData(terminal.id, 'echo test\n')

      // 4. Receive data (simulate ProcessManager event)
      mockProcessManager.emit('processData', terminal.id, 'test\n')
      expect(lifecycle).toContain('data')

      // 5. Resize terminal
      terminalManager.resizeTerminal({ id: terminal.id, cols: 100, rows: 30 })

      // 6. Close terminal
      terminalManager.closeTerminal(terminal.id)
      expect(terminal.isRunning).toBe(false)

      // 7. Simulate process exit
      mockProcessManager.emit('processExit', terminal.id, 0)
      expect(lifecycle).toContain('exit')

      // Verify terminal is removed from map
      expect(terminalManager.getTerminal(terminal.id)).toBeUndefined()
    })

    it('should work correctly with multiple concurrent terminals', async () => {
      const terminalIds: string[] = []

      // Create 3 terminals concurrently
      const promises = Array.from({ length: 3 }, async (_, i) => {
        const mockProcess: TerminalProcess = {
          id: `concurrent-${i}`,
          pty: {} as BackendProcess,
          info: {
            pid: 2000 + i,
            name: 'bash',
            cmd: 'bash',
            cwd: '/home',
            env: {},
            startTime: new Date(),
          },
          state: 'running',
          capabilities: {
            backend: 'node-pty',
            supportsResize: true,
            supportsColors: true,
            supportsInteractivity: true,
            supportsHistory: true,
            reliability: 'high',
          },
        }
        vi.mocked(mockProcessManager.spawn).mockResolvedValue(mockProcess)
        return terminalManager.createTerminal({ name: `Concurrent ${i + 1}` })
      })

      const terminals = await Promise.all(promises)
      terminals.forEach((terminal) => terminalIds.push(terminal.id))

      expect(terminalManager.getAllTerminals()).toHaveLength(3)
      expect(terminalManager.getRunningCount()).toBe(3)

      // Test operations on all terminals
      vi.mocked(mockProcessManager.write).mockReturnValue(true)
      terminals.forEach((terminal) => {
        const result = terminalManager.sendData(terminal.id, 'test command\n')
        expect(result).toBe(true)
      })

      // Test setting active terminal
      terminalManager.setActiveTerminal(terminals[1].id)
      expect(terminals[1].isActive).toBe(true)
      expect(terminals[0].isActive).toBe(false)
      expect(terminals[2].isActive).toBe(false)

      // Verify all terminals are properly tracked
      terminalIds.forEach((id) => {
        expect(terminalManager.getTerminal(id)).toBeDefined()
      })
    })
  })
})
