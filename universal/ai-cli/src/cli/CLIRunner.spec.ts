/**
 * @fileoverview Tests for CLIRunner.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CLIRunner } from './CLIRunner'
import { spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { Readable, Writable } from 'node:stream'
import type { ChildProcess } from 'node:child_process'

vi.mock('node:child_process')
vi.mock('node:readline')

/**
 * Mock stdin interface for testing.
 * Provides minimal Writable stream interface needed for CLI tests.
 */
interface MockStdin extends Partial<Writable> {
  write: ReturnType<typeof vi.fn>
  end: ReturnType<typeof vi.fn>
}

/**
 * Mock readline interface for testing stream execution.
 * Represents an async iterable that yields string lines.
 */
type MockReadlineInterface = AsyncIterableIterator<string>

describe('CLIRunner', () => {
  let runner: CLIRunner

  beforeEach(() => {
    runner = new CLIRunner()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('execute', () => {
    it('should execute command successfully and return stdout', async () => {
      const mockChild = new EventEmitter() as ChildProcess
      mockChild.stdout = new EventEmitter() as Readable
      mockChild.stderr = new EventEmitter() as Readable
      mockChild.stdin = {
        write: vi.fn(),
        end: vi.fn(),
      } as MockStdin

      vi.mocked(spawn).mockReturnValue(mockChild)

      const executePromise = runner.execute('echo', ['Hello'])

      setImmediate(() => {
        mockChild.stdout.emit('data', Buffer.from('Hello\n'))
        mockChild.emit('close', 0)
      })

      const result = await executePromise

      expect(result.stdout).toBe('Hello\n')
      expect(result.stderr).toBe('')
      expect(result.exitCode).toBe(0)
    })

    it('should collect stderr output', async () => {
      const mockChild = new EventEmitter() as ChildProcess
      mockChild.stdout = new EventEmitter() as Readable
      mockChild.stderr = new EventEmitter() as Readable
      mockChild.stdin = {
        write: vi.fn(),
        end: vi.fn(),
      } as MockStdin

      vi.mocked(spawn).mockReturnValue(mockChild)

      const executePromise = runner.execute('test', [])

      setImmediate(() => {
        mockChild.stderr.emit('data', Buffer.from('Error\n'))
        mockChild.emit('close', 1)
      })

      const result = await executePromise

      expect(result.stderr).toBe('Error\n')
      expect(result.exitCode).toBe(1)
    })

    it('should handle null exitCode as 0', async () => {
      const mockChild = new EventEmitter() as ChildProcess
      mockChild.stdout = new EventEmitter() as Readable
      mockChild.stderr = new EventEmitter() as Readable
      mockChild.stdin = {
        write: vi.fn(),
        end: vi.fn(),
      } as MockStdin

      vi.mocked(spawn).mockReturnValue(mockChild)

      const executePromise = runner.execute('test', [])

      setImmediate(() => {
        mockChild.emit('close', null)
      })

      const result = await executePromise

      expect(result.exitCode).toBe(0)
    })

    it('should write input to stdin when provided', async () => {
      const mockChild = new EventEmitter() as ChildProcess
      mockChild.stdout = new EventEmitter() as Readable
      mockChild.stderr = new EventEmitter() as Readable
      const mockWrite = vi.fn()
      const mockEnd = vi.fn()
      mockChild.stdin = {
        write: mockWrite,
        end: mockEnd,
      } as MockStdin

      vi.mocked(spawn).mockReturnValue(mockChild)

      const executePromise = runner.execute('cat', [], { input: 'test' })

      setImmediate(() => {
        mockChild.emit('close', 0)
      })

      await executePromise

      expect(mockWrite).toHaveBeenCalledWith('test')
      expect(mockEnd).toHaveBeenCalled()
    })

    it('should use custom cwd', async () => {
      const mockChild = new EventEmitter() as ChildProcess
      mockChild.stdout = new EventEmitter() as Readable
      mockChild.stderr = new EventEmitter() as Readable
      mockChild.stdin = {
        write: vi.fn(),
        end: vi.fn(),
      } as MockStdin

      vi.mocked(spawn).mockReturnValue(mockChild)

      const executePromise = runner.execute('ls', [], { cwd: '/tmp' })

      setImmediate(() => {
        mockChild.emit('close', 0)
      })

      await executePromise

      expect(spawn).toHaveBeenCalledWith('ls', [], {
        cwd: '/tmp',
        env: process.env,
        shell: false,
      })
    })

    it('should merge custom env variables', async () => {
      const mockChild = new EventEmitter() as ChildProcess
      mockChild.stdout = new EventEmitter() as Readable
      mockChild.stderr = new EventEmitter() as Readable
      mockChild.stdin = {
        write: vi.fn(),
        end: vi.fn(),
      } as MockStdin

      vi.mocked(spawn).mockReturnValue(mockChild)

      const customEnv = { VAR: 'value' }
      const executePromise = runner.execute('env', [], { env: customEnv })

      setImmediate(() => {
        mockChild.emit('close', 0)
      })

      await executePromise

      expect(spawn).toHaveBeenCalledWith('env', [], {
        cwd: process.cwd(),
        env: { ...process.env, ...customEnv },
        shell: false,
      })
    })

    it('should timeout and reject', async () => {
      const mockChild = new EventEmitter() as ChildProcess
      mockChild.stdout = new EventEmitter() as Readable
      mockChild.stderr = new EventEmitter() as Readable
      mockChild.stdin = {
        write: vi.fn(),
        end: vi.fn(),
      } as MockStdin
      mockChild.kill = vi.fn()

      vi.mocked(spawn).mockReturnValue(mockChild)

      vi.useFakeTimers()

      const executePromise = runner.execute('sleep', ['10'], { timeout: 1000 })

      vi.advanceTimersByTime(1000)

      await expect(executePromise).rejects.toThrow(
        'Command timed out after 1000ms'
      )

      expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM')

      vi.useRealTimers()
    })

    it('should clear timeout on success', async () => {
      const mockChild = new EventEmitter() as ChildProcess
      mockChild.stdout = new EventEmitter() as Readable
      mockChild.stderr = new EventEmitter() as Readable
      mockChild.stdin = {
        write: vi.fn(),
        end: vi.fn(),
      } as MockStdin

      vi.mocked(spawn).mockReturnValue(mockChild)

      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      const executePromise = runner.execute('test', [], { timeout: 5000 })

      setImmediate(() => {
        mockChild.emit('close', 0)
      })

      await executePromise

      expect(clearTimeoutSpy).toHaveBeenCalled()

      clearTimeoutSpy.mockRestore()
    })

    it('should clear timeout on error', async () => {
      const mockChild = new EventEmitter() as ChildProcess
      mockChild.stdout = new EventEmitter() as Readable
      mockChild.stderr = new EventEmitter() as Readable
      mockChild.stdin = {
        write: vi.fn(),
        end: vi.fn(),
      } as MockStdin

      vi.mocked(spawn).mockReturnValue(mockChild)

      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      const executePromise = runner.execute('test', [], { timeout: 5000 })

      setImmediate(() => {
        mockChild.emit('error', new Error('Failed'))
      })

      await expect(executePromise).rejects.toThrow('Failed')

      expect(clearTimeoutSpy).toHaveBeenCalled()

      clearTimeoutSpy.mockRestore()
    })

    it('should reject on process error', async () => {
      const mockChild = new EventEmitter() as ChildProcess
      mockChild.stdout = new EventEmitter() as Readable
      mockChild.stderr = new EventEmitter() as Readable
      mockChild.stdin = {
        write: vi.fn(),
        end: vi.fn(),
      } as MockStdin

      vi.mocked(spawn).mockReturnValue(mockChild)

      const executePromise = runner.execute('invalid', [])

      setImmediate(() => {
        mockChild.emit('error', new Error('Command not found'))
      })

      await expect(executePromise).rejects.toThrow('Command not found')
    })
  })

  describe('streamExecute', () => {
    it('should stream output line by line', async () => {
      const mockChild = new EventEmitter() as ChildProcess
      mockChild.stdout = new EventEmitter() as Readable
      mockChild.stderr = new EventEmitter() as Readable
      mockChild.stdin = {
        write: vi.fn(),
        end: vi.fn(),
      } as MockStdin

      vi.mocked(spawn).mockReturnValue(mockChild)

      const mockReader = (async function* () {
        yield 'Line 1'
        yield 'Line 2'
      })()

      const { createInterface } = await import('node:readline')
      vi.mocked(createInterface).mockReturnValue(
        mockReader as unknown as MockReadlineInterface
      )

      const streamPromise = (async () => {
        const lines: string[] = []
        for await (const line of runner.streamExecute('test', [])) {
          lines.push(line)
        }
        return lines
      })()

      setImmediate(() => {
        mockChild.emit('close', 0)
      })

      const lines = await streamPromise

      expect(lines).toEqual(['Line 1', 'Line 2'])
    })

    it('should write input to stdin when streaming', async () => {
      const mockChild = new EventEmitter() as ChildProcess
      mockChild.stdout = new EventEmitter() as Readable
      mockChild.stderr = new EventEmitter() as Readable
      const mockWrite = vi.fn()
      const mockEnd = vi.fn()
      mockChild.stdin = {
        write: mockWrite,
        end: mockEnd,
      } as MockStdin

      vi.mocked(spawn).mockReturnValue(mockChild)

      const mockReader = (async function* () {
        yield 'output'
      })()

      const { createInterface } = await import('node:readline')
      vi.mocked(createInterface).mockReturnValue(
        mockReader as unknown as MockReadlineInterface
      )

      const streamPromise = (async () => {
        const lines: string[] = []
        for await (const line of runner.streamExecute('cat', [], {
          input: 'test',
        })) {
          lines.push(line)
        }
        return lines
      })()

      setImmediate(() => {
        mockChild.emit('close', 0)
      })

      await streamPromise

      expect(mockWrite).toHaveBeenCalledWith('test')
      expect(mockEnd).toHaveBeenCalled()
    })

    it('should use custom cwd when streaming', async () => {
      const mockChild = new EventEmitter() as ChildProcess
      mockChild.stdout = new EventEmitter() as Readable
      mockChild.stderr = new EventEmitter() as Readable
      mockChild.stdin = {
        write: vi.fn(),
        end: vi.fn(),
      } as MockStdin

      vi.mocked(spawn).mockReturnValue(mockChild)

      const mockReader = (async function* () {
        yield 'output'
      })()

      const { createInterface } = await import('node:readline')
      vi.mocked(createInterface).mockReturnValue(
        mockReader as unknown as MockReadlineInterface
      )

      const streamPromise = (async () => {
        const lines: string[] = []
        for await (const line of runner.streamExecute('ls', [], {
          cwd: '/tmp',
        })) {
          lines.push(line)
        }
        return lines
      })()

      setImmediate(() => {
        mockChild.emit('close', 0)
      })

      await streamPromise

      expect(spawn).toHaveBeenCalledWith('ls', [], {
        cwd: '/tmp',
        env: process.env,
        shell: false,
      })
    })

    it('should log stderr output', async () => {
      const mockChild = new EventEmitter() as ChildProcess
      mockChild.stdout = new EventEmitter() as Readable
      mockChild.stderr = new EventEmitter() as Readable
      mockChild.stdin = {
        write: vi.fn(),
        end: vi.fn(),
      } as MockStdin

      vi.mocked(spawn).mockReturnValue(mockChild)

      const mockReader = (async function* () {
        yield 'output'
      })()

      const { createInterface } = await import('node:readline')
      vi.mocked(createInterface).mockReturnValue(
        mockReader as unknown as MockReadlineInterface
      )

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation()

      const streamPromise = (async () => {
        const lines: string[] = []
        for await (const line of runner.streamExecute('test', [])) {
          lines.push(line)
        }
        return lines
      })()

      setImmediate(() => {
        mockChild.stderr.emit('data', Buffer.from('Error\n'))
      })

      setImmediate(() => {
        mockChild.emit('close', 0)
      })

      await streamPromise

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[CLIRunner] stderr:',
        'Error'
      )

      consoleErrorSpy.mockRestore()
    })

    it('should reject on non-zero exit code', async () => {
      const mockChild = new EventEmitter() as ChildProcess
      mockChild.stdout = new EventEmitter() as Readable
      mockChild.stderr = new EventEmitter() as Readable
      mockChild.stdin = {
        write: vi.fn(),
        end: vi.fn(),
      } as MockStdin

      vi.mocked(spawn).mockReturnValue(mockChild)

      const mockReader = (async function* () {
        yield 'output'
      })()

      const { createInterface } = await import('node:readline')
      vi.mocked(createInterface).mockReturnValue(
        mockReader as unknown as MockReadlineInterface
      )

      const streamPromise = (async () => {
        const lines: string[] = []
        for await (const line of runner.streamExecute('test', [])) {
          lines.push(line)
        }
        return lines
      })()

      setImmediate(() => {
        mockChild.emit('close', 1)
      })

      await expect(streamPromise).rejects.toThrow('Command exited with code 1')
    })

    it('should reject on process error', async () => {
      const mockChild = new EventEmitter() as ChildProcess
      mockChild.stdout = new EventEmitter() as Readable
      mockChild.stderr = new EventEmitter() as Readable
      mockChild.stdin = {
        write: vi.fn(),
        end: vi.fn(),
      } as MockStdin

      vi.mocked(spawn).mockReturnValue(mockChild)

      const mockReader = (async function* () {
        yield 'output'
      })()

      const { createInterface } = await import('node:readline')
      vi.mocked(createInterface).mockReturnValue(
        mockReader as unknown as MockReadlineInterface
      )

      const streamPromise = (async () => {
        const lines: string[] = []
        for await (const line of runner.streamExecute('test', [])) {
          lines.push(line)
        }
        return lines
      })()

      setImmediate(() => {
        mockChild.emit('error', new Error('Failed'))
      })

      await expect(streamPromise).rejects.toThrow('Failed')
    })

    it('should throw error when reader throws', async () => {
      const mockChild = new EventEmitter() as ChildProcess
      mockChild.stdout = new EventEmitter() as Readable
      mockChild.stderr = new EventEmitter() as Readable
      mockChild.stdin = {
        write: vi.fn(),
        end: vi.fn(),
      } as MockStdin

      vi.mocked(spawn).mockReturnValue(mockChild)

      // eslint-disable-next-line require-yield
      const mockReader = (async function* () {
        throw new Error('Reader error')
      })()

      const { createInterface } = await import('node:readline')
      vi.mocked(createInterface).mockReturnValue(
        mockReader as unknown as MockReadlineInterface
      )

      const streamPromise = (async () => {
        const lines: string[] = []
        for await (const line of runner.streamExecute('test', [])) {
          lines.push(line)
        }
        return lines
      })()

      await expect(streamPromise).rejects.toThrow('Reader error')
    })

    it('should handle non-Error throw in reader', async () => {
      const mockChild = new EventEmitter() as ChildProcess
      mockChild.stdout = new EventEmitter() as Readable
      mockChild.stderr = new EventEmitter() as Readable
      mockChild.stdin = {
        write: vi.fn(),
        end: vi.fn(),
      } as MockStdin

      vi.mocked(spawn).mockReturnValue(mockChild)

      // eslint-disable-next-line require-yield
      const mockReader = (async function* () {
        throw 'String error'
      })()

      const { createInterface } = await import('node:readline')
      vi.mocked(createInterface).mockReturnValue(
        mockReader as unknown as MockReadlineInterface
      )

      const streamPromise = (async () => {
        const lines: string[] = []
        for await (const line of runner.streamExecute('test', [])) {
          lines.push(line)
        }
        return lines
      })()

      await expect(streamPromise).rejects.toThrow('String error')
    })

    it('should include stderr in error message when reader throws with stderr output', async () => {
      const mockChild = new EventEmitter() as ChildProcess
      mockChild.stdout = new EventEmitter() as Readable
      mockChild.stderr = new EventEmitter() as Readable
      mockChild.stdin = {
        write: vi.fn(),
        end: vi.fn(),
      } as MockStdin

      vi.mocked(spawn).mockReturnValue(mockChild)

      // Create a mock reader that waits before throwing to allow stderr to accumulate
      // eslint-disable-next-line require-yield
      const mockReader = (async function* () {
        // Wait a bit to allow stderr handler to register and emit
        await new Promise((resolve) => setTimeout(resolve, 10))
        throw new Error('Reader failure')
      })()

      const { createInterface } = await import('node:readline')
      vi.mocked(createInterface).mockReturnValue(
        mockReader as unknown as MockReadlineInterface
      )

      const streamPromise = (async () => {
        const lines: string[] = []
        for await (const line of runner.streamExecute('test', [])) {
          lines.push(line)
        }
        return lines
      })()

      // Emit stderr immediately so it's captured before reader throws
      mockChild.stderr.emit('data', Buffer.from('Command failed: invalid\n'))

      await expect(streamPromise).rejects.toThrow(
        'CLI execution failed: Reader failure\nStderr: Command failed: invalid'
      )
    })
  })
})
