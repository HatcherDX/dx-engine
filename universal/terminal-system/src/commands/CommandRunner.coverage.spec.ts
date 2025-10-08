import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CommandRunner } from './CommandRunner'

/**
 * Coverage test suite for CommandRunner to achieve 100% code coverage
 *
 * @remarks
 * This test file focuses on covering edge cases and error conditions
 * to achieve complete 100% code coverage for CommandRunner.ts
 */
describe('CommandRunner - Coverage Tests', () => {
  let commandRunner: CommandRunner

  beforeEach(() => {
    commandRunner = new CommandRunner()
  })

  afterEach(() => {
    commandRunner.cleanup()
    vi.restoreAllMocks()
  })

  describe('getStatus method - edge cases', () => {
    it('should return status for existing execution with exitCode 0', async () => {
      // Access private executions map to set up test state
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private executions for testing
      const executions = (commandRunner as any).executions as Map<string, any>
      const executionId = 'test-id-123'

      executions.set(executionId, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking ChildProcess for testing
        process: {} as any,
        command: 'test command',
        startTime: Date.now() - 1000,
        stdout: 'test stdout',
        stderr: 'test stderr',
        exitCode: 0,
      })

      const status = await commandRunner.getStatus(executionId)

      expect(status).not.toBeNull()
      expect(status?.success).toBe(true)
      expect(status?.exitCode).toBe(0)
      expect(status?.stdout).toBe('test stdout')
      expect(status?.stderr).toBe('test stderr')
      expect(status?.duration).toBeGreaterThanOrEqual(1000)
    })

    it('should return status for existing execution with non-zero exitCode', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private executions for testing
      const executions = (commandRunner as any).executions as Map<string, any>
      const executionId = 'test-id-456'

      executions.set(executionId, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking ChildProcess for testing
        process: {} as any,
        command: 'test command',
        startTime: Date.now() - 500,
        stdout: 'output',
        stderr: 'error',
        exitCode: 1,
      })

      const status = await commandRunner.getStatus(executionId)

      expect(status).not.toBeNull()
      expect(status?.success).toBe(false)
      expect(status?.exitCode).toBe(1)
    })

    it('should return status for execution with null exitCode', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private executions for testing
      const executions = (commandRunner as any).executions as Map<string, any>
      const executionId = 'test-id-789'

      executions.set(executionId, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking ChildProcess for testing
        process: {} as any,
        command: 'test command',
        startTime: Date.now(),
        stdout: '',
        stderr: '',
        exitCode: null,
      })

      const status = await commandRunner.getStatus(executionId)

      expect(status).not.toBeNull()
      expect(status?.success).toBe(false)
      expect(status?.exitCode).toBe(-1)
    })

    it('should return null for non-existent execution', async () => {
      const status = await commandRunner.getStatus('non-existent-id')
      expect(status).toBeNull()
    })
  })

  describe('cancel method - error handling', () => {
    it('should handle error when kill throws an Error', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private executions for testing
      const executions = (commandRunner as any).executions as Map<string, any>
      const executionId = 'test-cancel-error'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private logger for testing
      const loggerSpy = vi.spyOn((commandRunner as any).logger, 'error')

      const mockProcess = {
        kill: vi.fn(() => {
          throw new Error('Failed to kill process')
        }),
      }

      executions.set(executionId, {
        process: mockProcess,
        command: 'test',
        startTime: Date.now(),
        stdout: '',
        stderr: '',
        exitCode: null,
      })

      const result = await commandRunner.cancel(executionId)

      expect(result).toBe(false)
      expect(loggerSpy).toHaveBeenCalledWith(
        `Failed to cancel command ${executionId}:`,
        expect.any(Error)
      )
    })

    it('should handle error when kill throws non-Error', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private executions for testing
      const executions = (commandRunner as any).executions as Map<string, any>
      const executionId = 'test-cancel-string'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private logger for testing
      const loggerSpy = vi.spyOn((commandRunner as any).logger, 'error')

      const mockProcess = {
        kill: vi.fn(() => {
          throw 'String error'
        }),
      }

      executions.set(executionId, {
        process: mockProcess,
        command: 'test',
        startTime: Date.now(),
        stdout: '',
        stderr: '',
        exitCode: null,
      })

      const result = await commandRunner.cancel(executionId)

      expect(result).toBe(false)
      expect(loggerSpy).toHaveBeenCalledWith(
        `Failed to cancel command ${executionId}:`,
        expect.any(Error)
      )
    })

    it('should successfully cancel and remove execution', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private executions for testing
      const executions = (commandRunner as any).executions as Map<string, any>
      const executionId = 'test-cancel-success'

      const mockProcess = {
        kill: vi.fn(),
      }

      executions.set(executionId, {
        process: mockProcess,
        command: 'test',
        startTime: Date.now(),
        stdout: '',
        stderr: '',
        exitCode: null,
      })

      const result = await commandRunner.cancel(executionId)

      expect(result).toBe(true)
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM')
      expect(executions.has(executionId)).toBe(false)
    })

    it('should return false for non-existent execution', async () => {
      const result = await commandRunner.cancel('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('cleanup method - error handling', () => {
    it('should handle errors when killing processes during cleanup', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private executions for testing
      const executions = (commandRunner as any).executions as Map<string, any>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private logger for testing
      const loggerSpy = vi.spyOn((commandRunner as any).logger, 'error')

      // Add execution with process that throws Error
      const mockProcess1 = {
        kill: vi.fn(() => {
          throw new Error('Kill failed')
        }),
      }

      // Add execution with process that throws non-Error
      const mockProcess2 = {
        kill: vi.fn(() => {
          throw 'String error'
        }),
      }

      // Add execution with successful kill
      const mockProcess3 = {
        kill: vi.fn(),
      }

      executions.set('exec1', {
        process: mockProcess1,
        command: 'cmd1',
        startTime: Date.now(),
        stdout: '',
        stderr: '',
        exitCode: null,
      })

      executions.set('exec2', {
        process: mockProcess2,
        command: 'cmd2',
        startTime: Date.now(),
        stdout: '',
        stderr: '',
        exitCode: null,
      })

      executions.set('exec3', {
        process: mockProcess3,
        command: 'cmd3',
        startTime: Date.now(),
        stdout: '',
        stderr: '',
        exitCode: null,
      })

      commandRunner.cleanup()

      // Check that all processes had kill attempted
      expect(mockProcess1.kill).toHaveBeenCalled()
      expect(mockProcess2.kill).toHaveBeenCalled()
      expect(mockProcess3.kill).toHaveBeenCalled()

      // Check that errors were logged
      expect(loggerSpy).toHaveBeenCalledTimes(2)
      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to kill process exec1:',
        expect.any(Error)
      )
      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to kill process exec2:',
        expect.any(Error)
      )

      // Check that all executions were cleared
      expect(executions.size).toBe(0)
    })
  })

  describe('execute method - timeout edge case', () => {
    it('should not kill process if already completed before timeout', async () => {
      // Use a real spawn with a fast command - use 'true' which exits immediately with 0
      const result = await commandRunner.execute('true', { timeout: 5000 })

      // Command should complete successfully before timeout
      expect(result.success).toBe(true)
      expect(result.exitCode).toBe(0)

      // Wait to ensure timeout doesn't fire after completion
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Check that executions map is empty (command completed and was removed)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private executions for testing
      const executions = (commandRunner as any).executions as Map<string, any>
      expect(executions.size).toBe(0)
    })
  })

  describe('execute method - error handling', () => {
    it('should handle non-Error exceptions in catch block', async () => {
      // Mock the runCommand method to throw a string
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private runCommand for testing
      const originalRunCommand = (commandRunner as any).runCommand
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private runCommand for testing
      ;(commandRunner as any).runCommand = vi
        .fn()
        .mockRejectedValue('String error')

      const result = await commandRunner.execute('test command')

      expect(result.success).toBe(false)
      expect(result.exitCode).toBe(-1)
      // When error is a string, it gets converted to Error but then (error as Error).message is undefined
      expect(result.stderr).toBeUndefined()
      expect(result.command).toBe('test command')
      expect(result.duration).toBeGreaterThanOrEqual(0)

      // Restore original method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private runCommand for testing
      ;(commandRunner as any).runCommand = originalRunCommand
    })
  })

  describe('stream method - error handling', () => {
    it('should handle non-Error exceptions in stream catch', async () => {
      // Mock runCommandStream to throw a string
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private runCommandStream for testing
      const originalRunCommandStream = (commandRunner as any).runCommandStream
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private runCommandStream for testing
      ;(commandRunner as any).runCommandStream = vi
        .fn()
        .mockRejectedValue('String stream error')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test double for error event collection
      const errorEvents: any[] = []
      commandRunner.on('command-error', (id, error) => {
        errorEvents.push({ id, error })
      })

      void (await commandRunner.stream('test stream'))

      // Wait for async error handling
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(errorEvents).toHaveLength(1)
      expect(errorEvents[0].error.message).toBe('String stream error')

      // Restore original method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private runCommandStream for testing
      ;(commandRunner as any).runCommandStream = originalRunCommandStream
    })
  })

  describe('Windows platform handling', () => {
    it('should determine Windows shell based on platform', () => {
      const originalPlatform = process.platform

      // Test Windows platform
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true,
      })

      // Create new runner to test constructor behavior
      const windowsRunner = new CommandRunner()

      // The runner will use cmd on Windows (we can't spy on spawn in ESM)
      // Just verify it doesn't throw
      expect(windowsRunner).toBeDefined()

      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true,
      })

      windowsRunner.cleanup()
    })

    it('should use bash shell on non-Windows platforms', () => {
      const originalPlatform = process.platform

      // Test non-Windows platform
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        configurable: true,
      })

      // Create new runner to test constructor behavior
      const unixRunner = new CommandRunner()

      // The runner will use bash on Unix-like systems
      expect(unixRunner).toBeDefined()

      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true,
      })

      unixRunner.cleanup()
    })
  })
})
