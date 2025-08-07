/**
 * @fileoverview Test suite for ProcessManager functionality.
 *
 * @description
 * Comprehensive tests for the ProcessManager class that handles PTY processes
 * using the enhanced terminal factory with automatic backend detection.
 *
 * @example
 * ```typescript
 * // Testing process spawning
 * const manager = new ProcessManager()
 * const process = await manager.spawn({ shell: '/bin/bash' })
 * expect(process.id).toBeDefined()
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { ProcessManager } from './ProcessManager'
import { EnhancedTerminalFactory } from './EnhancedTerminalFactory'
import type { ProcessSpawnOptions, TerminalProcess } from '../types/process'
import type { BackendProcess } from './TerminalBackend'

// Mock dependencies with vi.hoisted
const mocks = vi.hoisted(() => {
  return {
    uuidV4: vi.fn(() => 'test-uuid-123'),
  }
})

vi.mock('../EnhancedTerminalFactory')
vi.mock('uuid', () => ({
  v4: mocks.uuidV4,
}))

/**
 * Mock BackendProcess interface for testing terminal backend operations.
 *
 * @remarks
 * Simulates the BackendProcess interface with write, resize, kill methods
 * and event handling capabilities for comprehensive testing.
 *
 * @public
 * @since 1.0.0
 */
interface MockBackendProcess extends Partial<BackendProcess> {
  pid: number
  write: ReturnType<typeof vi.fn>
  resize: ReturnType<typeof vi.fn>
  kill: ReturnType<typeof vi.fn>
  on: ReturnType<typeof vi.fn>
}

describe('ProcessManager', () => {
  let processManager: ProcessManager
  let mockBackendProcess: MockBackendProcess
  let mockEnhancedFactory: typeof EnhancedTerminalFactory

  beforeEach(() => {
    // Reset UUID mock
    mocks.uuidV4.mockReturnValue('test-uuid-123')

    // Create mock backend process
    mockBackendProcess = {
      pid: 12345,
      write: vi.fn(),
      resize: vi.fn(),
      kill: vi.fn(),
      on: vi.fn(),
    }

    // Mock EnhancedTerminalFactory
    mockEnhancedFactory = vi.mocked(EnhancedTerminalFactory)
    mockEnhancedFactory.createTerminal = vi.fn().mockResolvedValue({
      process: mockBackendProcess,
      capabilities: {
        backend: 'node-pty',
        supportsResize: true,
        supportsKill: true,
        platform: 'linux',
      },
    })

    processManager = new ProcessManager()
  })

  afterEach(() => {
    vi.clearAllMocks()
    processManager.cleanup()
  })

  describe('Process spawning', () => {
    /**
     * Tests successful process spawning with default options.
     *
     * @returns Promise<void>
     * Should create a new terminal process with auto-generated ID
     *
     * @example
     * ```typescript
     * const process = await manager.spawn()
     * expect(process.id).toBe('test-uuid-123')
     * expect(process.state).toBe('running')
     * ```
     *
     * @public
     */
    it('should spawn a new process with default options', async () => {
      const process = await processManager.spawn()

      expect(mockEnhancedFactory.createTerminal).toHaveBeenCalledWith({
        shell: undefined,
        cwd: undefined,
        env: undefined,
        cols: 80,
        rows: 24,
        encoding: 'utf8',
      })

      expect(process).toEqual({
        id: 'test-uuid-123',
        pty: mockBackendProcess,
        info: {
          pid: 12345,
          name: 'shell',
          cmd: 'shell',
          cwd: expect.any(String),
          env: {},
          startTime: expect.any(Date),
        },
        state: 'running',
        capabilities: {
          backend: 'node-pty',
          supportsResize: true,
          supportsKill: true,
          platform: 'linux',
        },
      })
    })

    /**
     * Tests process spawning with custom options.
     *
     * @returns Promise<void>
     * Should create a terminal process with specified configuration
     *
     * @example
     * ```typescript
     * const options = { shell: '/bin/zsh', cwd: '/home/user', cols: 120, rows: 40 }
     * const process = await manager.spawn(options)
     * ```
     *
     * @public
     */
    it('should spawn a process with custom options', async () => {
      const options: ProcessSpawnOptions = {
        shell: '/bin/zsh',
        cwd: '/home/user',
        env: { PATH: '/usr/bin' },
        cols: 120,
        rows: 40,
        encoding: 'utf8',
      }

      const process = await processManager.spawn(options)

      expect(mockEnhancedFactory.createTerminal).toHaveBeenCalledWith({
        shell: '/bin/zsh',
        cwd: '/home/user',
        env: { PATH: '/usr/bin' },
        cols: 120,
        rows: 40,
        encoding: 'utf8',
      })

      expect(process.info.name).toBe('/bin/zsh')
      expect(process.info.cmd).toBe('/bin/zsh')
      expect(process.info.cwd).toBe('/home/user')
    })

    /**
     * Tests process spawning error handling.
     *
     * @throws {@link Error}
     * Should propagate errors from EnhancedTerminalFactory
     *
     * @example
     * ```typescript
     * mockEnhancedFactory.createTerminal.mockRejectedValue(new Error('Spawn failed'))
     * await expect(manager.spawn()).rejects.toThrow('Spawn failed')
     * ```
     *
     * @public
     */
    it('should handle spawn errors', async () => {
      const error = new Error('Failed to create terminal')
      mockEnhancedFactory.createTerminal = vi.fn().mockRejectedValue(error)

      await expect(processManager.spawn()).rejects.toThrow(
        'Failed to create terminal'
      )
    })

    /**
     * Tests that processCreated event is emitted on successful spawn.
     *
     * @returns Promise<void>
     * Should emit processCreated event with the new terminal process
     *
     * @example
     * ```typescript
     * const eventSpy = vi.fn()
     * manager.on('processCreated', eventSpy)
     * await manager.spawn()
     * expect(eventSpy).toHaveBeenCalledWith(expect.any(Object))
     * ```
     *
     * @public
     */
    it('should emit processCreated event on successful spawn', async () => {
      const eventSpy = vi.fn()
      processManager.on('processCreated', eventSpy)

      const process = await processManager.spawn()

      expect(eventSpy).toHaveBeenCalledWith(process)
    })
  })

  describe('Process data writing', () => {
    let process: TerminalProcess

    beforeEach(async () => {
      process = await processManager.spawn()
    })

    /**
     * Tests successful data writing to terminal process.
     *
     * @returns void
     * Should write data to the backend process and return true
     *
     * @example
     * ```typescript
     * const success = manager.write(process.id, 'echo hello\r')
     * expect(success).toBe(true)
     * expect(mockBackendProcess.write).toHaveBeenCalledWith('echo hello\r')
     * ```
     *
     * @public
     */
    it('should write data to running process', () => {
      const success = processManager.write(process.id, 'echo hello\r')

      expect(success).toBe(true)
      expect(mockBackendProcess.write).toHaveBeenCalledWith('echo hello\r')
    })

    /**
     * Tests writing to non-existent process.
     *
     * @returns void
     * Should return false when process ID is not found
     *
     * @example
     * ```typescript
     * const success = manager.write('non-existent', 'data')
     * expect(success).toBe(false)
     * ```
     *
     * @public
     */
    it('should return false for non-existent process', () => {
      const success = processManager.write('non-existent-id', 'data')

      expect(success).toBe(false)
      expect(mockBackendProcess.write).not.toHaveBeenCalled()
    })

    /**
     * Tests writing to non-running process.
     *
     * @returns void
     * Should return false when process is not in running state
     *
     * @example
     * ```typescript
     * process.state = 'exited'
     * const success = manager.write(process.id, 'data')
     * expect(success).toBe(false)
     * ```
     *
     * @public
     */
    it('should return false for non-running process', () => {
      process.state = 'exited'

      const success = processManager.write(process.id, 'data')

      expect(success).toBe(false)
      expect(mockBackendProcess.write).not.toHaveBeenCalled()
    })

    /**
     * Tests error handling during data writing.
     *
     * @returns void
     * Should return false when write operation fails
     *
     * @example
     * ```typescript
     * mockBackendProcess.write.mockImplementation(() => { throw new Error('Write failed') })
     * const success = manager.write(process.id, 'data')
     * expect(success).toBe(false)
     * ```
     *
     * @public
     */
    it('should handle write errors gracefully', () => {
      mockBackendProcess.write = vi.fn().mockImplementation(() => {
        throw new Error('Write failed')
      })

      const success = processManager.write(process.id, 'data')

      expect(success).toBe(false)
    })
  })

  describe('Process resizing', () => {
    let process: TerminalProcess

    beforeEach(async () => {
      process = await processManager.spawn()
    })

    /**
     * Tests successful terminal resizing.
     *
     * @returns void
     * Should resize the backend process and return true
     *
     * @example
     * ```typescript
     * const success = manager.resize(process.id, 120, 40)
     * expect(success).toBe(true)
     * expect(mockBackendProcess.resize).toHaveBeenCalledWith(120, 40)
     * ```
     *
     * @public
     */
    it('should resize existing process', () => {
      const success = processManager.resize(process.id, 120, 40)

      expect(success).toBe(true)
      expect(mockBackendProcess.resize).toHaveBeenCalledWith(120, 40)
    })

    /**
     * Tests resizing non-existent process.
     *
     * @returns void
     * Should return false when process ID is not found
     *
     * @example
     * ```typescript
     * const success = manager.resize('non-existent', 80, 24)
     * expect(success).toBe(false)
     * ```
     *
     * @public
     */
    it('should return false for non-existent process', () => {
      const success = processManager.resize('non-existent-id', 80, 24)

      expect(success).toBe(false)
      expect(mockBackendProcess.resize).not.toHaveBeenCalled()
    })

    /**
     * Tests handling of processes without resize capability.
     *
     * @returns void
     * Should return true even when resize method is not available
     *
     * @example
     * ```typescript
     * mockBackendProcess.resize = undefined
     * const success = manager.resize(process.id, 80, 24)
     * expect(success).toBe(true)
     * ```
     *
     * @public
     */
    it('should handle processes without resize method', () => {
      mockBackendProcess.resize = undefined

      const success = processManager.resize(process.id, 80, 24)

      expect(success).toBe(true)
    })

    /**
     * Tests error handling during resize operation.
     *
     * @returns void
     * Should return false when resize operation fails
     *
     * @example
     * ```typescript
     * mockBackendProcess.resize.mockImplementation(() => { throw new Error('Resize failed') })
     * const success = manager.resize(process.id, 80, 24)
     * expect(success).toBe(false)
     * ```
     *
     * @public
     */
    it('should handle resize errors gracefully', () => {
      mockBackendProcess.resize = vi.fn().mockImplementation(() => {
        throw new Error('Resize failed')
      })

      const success = processManager.resize(process.id, 80, 24)

      expect(success).toBe(false)
    })
  })

  describe('Process termination', () => {
    let process: TerminalProcess

    beforeEach(async () => {
      process = await processManager.spawn()
    })

    /**
     * Tests successful process termination.
     *
     * @returns void
     * Should kill the backend process and return true
     *
     * @example
     * ```typescript
     * const success = manager.kill(process.id)
     * expect(success).toBe(true)
     * expect(mockBackendProcess.kill).toHaveBeenCalledWith(undefined)
     * ```
     *
     * @public
     */
    it('should kill existing process', () => {
      const success = processManager.kill(process.id)

      expect(success).toBe(true)
      expect(mockBackendProcess.kill).toHaveBeenCalledWith(undefined)
    })

    /**
     * Tests process termination with specific signal.
     *
     * @returns void
     * Should kill the backend process with specified signal
     *
     * @example
     * ```typescript
     * const success = manager.kill(process.id, 'SIGTERM')
     * expect(success).toBe(true)
     * expect(mockBackendProcess.kill).toHaveBeenCalledWith('SIGTERM')
     * ```
     *
     * @public
     */
    it('should kill process with specific signal', () => {
      const success = processManager.kill(process.id, 'SIGTERM')

      expect(success).toBe(true)
      expect(mockBackendProcess.kill).toHaveBeenCalledWith('SIGTERM')
    })

    /**
     * Tests killing non-existent process.
     *
     * @returns void
     * Should return false when process ID is not found
     *
     * @example
     * ```typescript
     * const success = manager.kill('non-existent')
     * expect(success).toBe(false)
     * ```
     *
     * @public
     */
    it('should return false for non-existent process', () => {
      const success = processManager.kill('non-existent-id')

      expect(success).toBe(false)
      expect(mockBackendProcess.kill).not.toHaveBeenCalled()
    })

    /**
     * Tests error handling during kill operation.
     *
     * @returns void
     * Should return false when kill operation fails
     *
     * @example
     * ```typescript
     * mockBackendProcess.kill.mockImplementation(() => { throw new Error('Kill failed') })
     * const success = manager.kill(process.id)
     * expect(success).toBe(false)
     * ```
     *
     * @public
     */
    it('should handle kill errors gracefully', () => {
      mockBackendProcess.kill = vi.fn().mockImplementation(() => {
        throw new Error('Kill failed')
      })

      const success = processManager.kill(process.id)

      expect(success).toBe(false)
    })
  })

  describe('Process retrieval', () => {
    let process1: TerminalProcess
    let process2: TerminalProcess

    beforeEach(async () => {
      // Use different UUIDs for each process
      mocks.uuidV4.mockReturnValueOnce('uuid-1').mockReturnValueOnce('uuid-2')

      process1 = await processManager.spawn({ shell: '/bin/bash' })
      process2 = await processManager.spawn({ shell: '/bin/zsh' })
    })

    /**
     * Tests getting a specific process by ID.
     *
     * @returns void
     * Should return the correct process for valid ID
     *
     * @example
     * ```typescript
     * const retrieved = manager.getProcess(process.id)
     * expect(retrieved).toBe(process)
     * ```
     *
     * @public
     */
    it('should get process by ID', () => {
      const retrieved = processManager.getProcess(process1.id)
      expect(retrieved).toBe(process1)
    })

    /**
     * Tests getting non-existent process.
     *
     * @returns void
     * Should return undefined for invalid ID
     *
     * @example
     * ```typescript
     * const retrieved = manager.getProcess('non-existent')
     * expect(retrieved).toBeUndefined()
     * ```
     *
     * @public
     */
    it('should return undefined for non-existent process', () => {
      const retrieved = processManager.getProcess('non-existent-id')
      expect(retrieved).toBeUndefined()
    })

    /**
     * Tests getting all processes.
     *
     * @returns void
     * Should return array of all active processes
     *
     * @example
     * ```typescript
     * const allProcesses = manager.getAllProcesses()
     * expect(allProcesses).toHaveLength(2)
     * expect(allProcesses).toContain(process1)
     * expect(allProcesses).toContain(process2)
     * ```
     *
     * @public
     */
    it('should get all processes', () => {
      const allProcesses = processManager.getAllProcesses()

      expect(allProcesses).toHaveLength(2)
      expect(allProcesses).toContain(process1)
      expect(allProcesses).toContain(process2)
    })
  })

  describe('Event handling', () => {
    let process: TerminalProcess

    beforeEach(async () => {
      process = await processManager.spawn()
    })

    /**
     * Tests terminal data event forwarding.
     *
     * @returns void
     * Should emit processData event when backend process emits data
     *
     * @example
     * ```typescript
     * const dataSpy = vi.fn()
     * manager.on('processData', dataSpy)
     * dataHandler('Hello World')
     * expect(dataSpy).toHaveBeenCalledWith(process.id, 'Hello World')
     * ```
     *
     * @public
     */
    it('should forward data events from backend process', () => {
      const dataSpy = vi.fn()
      processManager.on('processData', dataSpy)

      // Get the data event handler
      const dataCall = mockBackendProcess.on.mock.calls.find(
        (call) => call[0] === 'data'
      )
      expect(dataCall).toBeDefined()

      const dataHandler = dataCall?.[1]
      dataHandler('Hello from terminal')

      expect(dataSpy).toHaveBeenCalledWith(process.id, 'Hello from terminal')
    })

    /**
     * Tests terminal exit event handling.
     *
     * @returns void
     * Should emit processExit event and update process state on exit
     *
     * @example
     * ```typescript
     * const exitSpy = vi.fn()
     * manager.on('processExit', exitSpy)
     * exitHandler({ exitCode: 0 })
     * expect(exitSpy).toHaveBeenCalledWith(process.id, 0)
     * expect(process.state).toBe('exited')
     * ```
     *
     * @public
     */
    it('should handle process exit events', () => {
      const exitSpy = vi.fn()
      processManager.on('processExit', exitSpy)

      // Get the exit event handler
      const exitCall = mockBackendProcess.on.mock.calls.find(
        (call) => call[0] === 'exit'
      )
      expect(exitCall).toBeDefined()

      const exitHandler = exitCall?.[1]
      exitHandler({ exitCode: 0 })

      expect(exitSpy).toHaveBeenCalledWith(process.id, 0)
      expect(process.state).toBe('exited')
      expect(process.exitCode).toBe(0)

      // Process should be removed from active processes
      expect(processManager.getProcess(process.id)).toBeUndefined()
    })

    /**
     * Tests terminal error event handling.
     *
     * @returns void
     * Should emit processError event and update process state on error
     *
     * @example
     * ```typescript
     * const errorSpy = vi.fn()
     * manager.on('processError', errorSpy)
     * const error = new Error('Connection lost')
     * errorHandler(error)
     * expect(errorSpy).toHaveBeenCalledWith(process.id, error)
     * ```
     *
     * @public
     */
    it('should handle process error events', () => {
      const errorSpy = vi.fn()
      processManager.on('processError', errorSpy)

      // Get the error event handler
      const errorCall = mockBackendProcess.on.mock.calls.find(
        (call) => call[0] === 'error'
      )
      expect(errorCall).toBeDefined()

      const errorHandler = errorCall?.[1]
      const error = new Error('Terminal connection failed')
      errorHandler(error)

      expect(errorSpy).toHaveBeenCalledWith(process.id, error)
      expect(process.state).toBe('error')
      expect(process.error).toBe(error)
    })
  })

  describe('Cleanup', () => {
    let process1: TerminalProcess

    beforeEach(async () => {
      mocks.uuidV4.mockReturnValueOnce('uuid-1').mockReturnValueOnce('uuid-2')

      process1 = await processManager.spawn()
      await processManager.spawn() // Create second process for testing cleanup
    })

    /**
     * Tests proper cleanup of all processes.
     *
     * @returns void
     * Should kill all running processes and clear internal state
     *
     * @example
     * ```typescript
     * manager.cleanup()
     * expect(mockBackendProcess.kill).toHaveBeenCalledTimes(2)
     * expect(manager.getAllProcesses()).toHaveLength(0)
     * ```
     *
     * @public
     */
    it('should cleanup all running processes', () => {
      expect(processManager.getAllProcesses()).toHaveLength(2)

      processManager.cleanup()

      // Should attempt to kill running processes
      expect(mockBackendProcess.kill).toHaveBeenCalledTimes(2)

      // Should clear all processes
      expect(processManager.getAllProcesses()).toHaveLength(0)
    })

    /**
     * Tests cleanup with non-running processes.
     *
     * @returns void
     * Should skip killing non-running processes
     *
     * @example
     * ```typescript
     * process1.state = 'exited'
     * manager.cleanup()
     * expect(mockBackendProcess.kill).toHaveBeenCalledTimes(1) // Only for running process
     * ```
     *
     * @public
     */
    it('should skip killing non-running processes during cleanup', () => {
      process1.state = 'exited'

      processManager.cleanup()

      // Should only kill the running process
      expect(mockBackendProcess.kill).toHaveBeenCalledTimes(1)
    })

    /**
     * Tests cleanup error handling.
     *
     * @returns void
     * Should continue cleanup even when kill operations fail
     *
     * @example
     * ```typescript
     * mockBackendProcess.kill.mockImplementation(() => { throw new Error('Kill failed') })
     * expect(() => manager.cleanup()).not.toThrow()
     * expect(manager.getAllProcesses()).toHaveLength(0)
     * ```
     *
     * @public
     */
    it('should handle cleanup errors gracefully', () => {
      mockBackendProcess.kill = vi.fn().mockImplementation(() => {
        throw new Error('Kill failed')
      })

      expect(() => processManager.cleanup()).not.toThrow()
      expect(processManager.getAllProcesses()).toHaveLength(0)
    })
  })
})
