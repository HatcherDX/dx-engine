/**
 * @fileoverview Comprehensive tests for Subprocess Terminal implementation.
 *
 * @description
 * Tests for the SubprocessTerminal covering:
 * - Terminal creation and shell detection
 * - Child process spawning and management
 * - Data handling and filtering
 * - Buffer manager integration
 * - Terminal operations (write, resize, kill)
 * - Error handling and edge cases
 * - Performance metrics and health monitoring
 * - Event emission and lifecycle management
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock modules with hoisted functions
const { mockSpawn, mockOs, mockTerminalBufferManager, createMockChildProcess } =
  vi.hoisted(() => ({
    mockSpawn: vi.fn(),
    mockOs: {
      platform: vi.fn(() => 'linux'),
      hostname: vi.fn(() => 'test-host'),
      userInfo: vi.fn(() => ({ username: 'testuser' })),
    },
    mockTerminalBufferManager: vi.fn(),
    createMockChildProcess: () => ({
      stdin: {
        write: vi.fn(),
      },
      stdout: {
        on: vi.fn(),
        emit: vi.fn(),
      },
      stderr: {
        on: vi.fn(),
        emit: vi.fn(),
      },
      pid: 12345,
      killed: false,
      kill: vi.fn(),
      on: vi.fn(),
      removeAllListeners: vi.fn(),
    }),
  }))

// Mock child_process with proper default export and named exports
vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>()
  return {
    ...actual,
    default: {
      ...actual,
      spawn: mockSpawn,
    },
    spawn: mockSpawn,
    ChildProcess: actual.ChildProcess,
  }
})

// Mock os
vi.mock('node:os', () => mockOs)

// Mock TerminalBufferManager
vi.mock('./terminalBufferManager', () => ({
  TerminalBufferManager: mockTerminalBufferManager,
}))

describe('SubprocessTerminal', () => {
  let originalConsoleLog: typeof console.log
  let originalConsoleError: typeof console.error
  let originalConsoleWarn: typeof console.warn
  let originalSetTimeout: typeof setTimeout
  let originalSetInterval: typeof setInterval
  let mockBufferManagerInstance: {
    write: ReturnType<typeof vi.fn>
    destroy: ReturnType<typeof vi.fn>
    pause: ReturnType<typeof vi.fn>
    resume: ReturnType<typeof vi.fn>
    getMetrics: ReturnType<typeof vi.fn>
    on: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    // Store originals
    originalConsoleLog = console.log
    originalConsoleError = console.error
    originalConsoleWarn = console.warn
    originalSetTimeout = setTimeout
    originalSetInterval = setInterval

    // Mock console methods
    console.log = vi.fn()
    console.error = vi.fn()
    console.warn = vi.fn()

    // Mock timers
    global.setTimeout = vi.fn(() => {
      const id = Math.random()
      return id as unknown as number
    }) as unknown as typeof setTimeout
    global.setInterval = vi.fn(() => {
      const id = Math.random()
      return id as unknown as number
    }) as unknown as typeof setInterval

    // Create mock buffer manager instance
    mockBufferManagerInstance = {
      write: vi.fn(),
      destroy: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      getMetrics: vi.fn(() => ({
        totalWrites: 10,
        totalBytes: 1024,
        chunksProcessed: 5,
        averageChunkSize: 204.8,
        flushCount: 2,
      })),
      getHealthStatus: vi.fn(() => ({
        isHealthy: true,
        backpressure: 0.1,
        bufferUtilization: 0.05,
        lastFlushMs: 16,
        warnings: [],
      })),
      on: vi.fn(),
      emit: vi.fn(),
    }

    mockTerminalBufferManager.mockImplementation(
      () => mockBufferManagerInstance
    )

    // Setup default spawn behavior
    mockSpawn.mockImplementation(() => createMockChildProcess())

    // Clear all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog
    console.error = originalConsoleError
    console.warn = originalConsoleWarn

    // Restore timers
    global.setTimeout = originalSetTimeout
    global.setInterval = originalSetInterval

    vi.restoreAllMocks()
  })

  describe('SubprocessTerminal Class', () => {
    it('should create SubprocessTerminal instance', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      expect(terminal).toBeInstanceOf(SubprocessTerminal)
      expect(terminal).toBeInstanceOf(EventEmitter)
    })

    it('should initialize with default options', async () => {
      process.env.HOME = '/home/testuser'

      const { SubprocessTerminal } = await import('./subprocessTerminal')
      new SubprocessTerminal('test-terminal')

      expect(mockTerminalBufferManager).toHaveBeenCalledWith('test-terminal', {
        maxBufferSize: 8 * 1024 * 1024,
        chunkSize: 32 * 1024,
        maxChunksPerFlush: 50,
        flushInterval: 16,
        dropThreshold: 0.75,
      })
    })

    it('should initialize with custom options', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('custom-terminal', {
        shell: '/bin/bash',
        cwd: '/custom/dir',
        env: { CUSTOM: 'value' },
        cols: 120,
        rows: 30,
      })

      expect(terminal).toBeInstanceOf(SubprocessTerminal)
    })

    it('should setup buffer manager event handlers', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      new SubprocessTerminal('test-terminal')

      expect(mockBufferManagerInstance.on).toHaveBeenCalledWith(
        'dataReady',
        expect.any(Function)
      )
      expect(mockBufferManagerInstance.on).toHaveBeenCalledWith(
        'chunksDropped',
        expect.any(Function)
      )
    })
  })

  describe('Shell Detection', () => {
    it('should detect Linux shell correctly', async () => {
      mockOs.platform.mockReturnValue('linux')
      process.env.SHELL = '/bin/bash'

      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      terminal.spawn()

      expect(mockSpawn).toHaveBeenCalledWith('/bin/bash', [], {
        cwd: expect.any(String),
        env: expect.objectContaining({
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
          COLUMNS: '80',
          LINES: '24',
        }),
        stdio: ['pipe', 'pipe', 'pipe'],
      })
    })

    it('should detect Windows shell correctly', async () => {
      mockOs.platform.mockReturnValue('win32')
      delete process.env.SHELL
      process.env.COMSPEC = 'C:\\Windows\\System32\\cmd.exe'

      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      terminal.spawn()

      expect(mockSpawn).toHaveBeenCalledWith(
        'C:\\Windows\\System32\\cmd.exe',
        [],
        expect.objectContaining({
          stdio: ['pipe', 'pipe', 'pipe'],
        })
      )
    })

    it('should prefer PowerShell on Windows when available', async () => {
      mockOs.platform.mockReturnValue('win32')
      delete process.env.SHELL
      process.env.COMSPEC =
        'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'

      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      terminal.spawn()

      expect(mockSpawn).toHaveBeenCalledWith(
        'powershell.exe',
        [],
        expect.any(Object)
      )
    })

    it('should detect macOS shell correctly', async () => {
      mockOs.platform.mockReturnValue('darwin')
      process.env.SHELL = '/bin/zsh'

      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      terminal.spawn()

      expect(mockSpawn).toHaveBeenCalledWith('/bin/zsh', [], expect.any(Object))
    })

    it('should fallback to zsh on macOS when SHELL not set', async () => {
      mockOs.platform.mockReturnValue('darwin')
      delete process.env.SHELL

      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      terminal.spawn()

      expect(mockSpawn).toHaveBeenCalledWith('/bin/zsh', [], expect.any(Object))
    })

    it('should fallback to bash on Linux when SHELL not set', async () => {
      mockOs.platform.mockReturnValue('linux')
      delete process.env.SHELL

      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      terminal.spawn()

      expect(mockSpawn).toHaveBeenCalledWith(
        '/bin/bash',
        [],
        expect.any(Object)
      )
    })
  })

  describe('Terminal Spawning', () => {
    it('should spawn terminal successfully', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      terminal.spawn()

      expect(mockSpawn).toHaveBeenCalled()
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[Subprocess Terminal] Spawning shell:')
      )
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          '[Subprocess Terminal] Successfully spawned terminal'
        )
      )
      expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), 500)
      expect(global.setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        10000
      )
    })

    it('should handle spawn errors', async () => {
      mockSpawn.mockImplementationOnce(() => {
        throw new Error('Spawn failed')
      })

      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      const errorSpy = vi.fn()
      terminal.on('error', errorSpy)

      terminal.spawn()

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(
          '[Subprocess Terminal] Failed to spawn terminal'
        ),
        expect.any(Error)
      )
      expect(errorSpy).toHaveBeenCalledWith(expect.any(Error))
    })

    it('should handle missing stdio streams', async () => {
      mockSpawn.mockImplementationOnce(() => ({
        stdin: null, // Missing stdin
        stdout: {
          on: vi.fn(),
          emit: vi.fn(),
        },
        stderr: {
          on: vi.fn(),
          emit: vi.fn(),
        },
        on: vi.fn(),
        kill: vi.fn(),
        pid: 12345,
      }))

      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      const errorSpy = vi.fn()
      terminal.on('error', errorSpy)

      terminal.spawn()

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to create stdio streams' })
      )
    })

    it('should setup process event handlers correctly', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      terminal.spawn()

      const mockProcess = mockSpawn.mock.results[0].value
      expect(mockProcess.on).toHaveBeenCalledWith('error', expect.any(Function))
      expect(mockProcess.on).toHaveBeenCalledWith('exit', expect.any(Function))
    })

    it('should emit initial prompt after delay', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      const dataSpy = vi.fn()
      terminal.on('data', dataSpy)

      terminal.spawn()

      // Get the timeout callback and call it
      const timeoutCall = (
        global.setTimeout as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call: unknown[]) => call[1] === 500)
      expect(timeoutCall).toBeDefined()

      timeoutCall[0]() // Call the timeout callback

      expect(dataSpy).toHaveBeenCalledWith('$ ')
    })
  })

  describe('Data Handling', () => {
    it('should handle stdout data with filtering', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      terminal.spawn()

      const mockProcess = mockSpawn.mock.results[0].value

      // Get the stdout data handler
      const stdoutDataHandler = mockProcess.stdout.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'data'
      )?.[1]

      expect(stdoutDataHandler).toBeDefined()

      // Simulate stdout data
      stdoutDataHandler(Buffer.from('Hello World!\n'))

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[Subprocess] Raw stdout received'),
        expect.stringContaining('Hello World!')
      )
      expect(mockBufferManagerInstance.write).toHaveBeenCalledWith(
        'Hello World!\n'
      )
    })

    it('should handle stderr data with filtering', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      terminal.spawn()

      const mockProcess = mockSpawn.mock.results[0].value

      // Get the stderr data handler
      const stderrDataHandler = mockProcess.stderr.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'data'
      )?.[1]

      expect(stderrDataHandler).toBeDefined()

      // Simulate stderr data
      stderrDataHandler(Buffer.from('Error message\n'))

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[Subprocess] Raw stderr received'),
        expect.stringContaining('Error message')
      )
      expect(mockBufferManagerInstance.write).toHaveBeenCalledWith(
        'Error message\n'
      )
    })

    it('should filter out empty data', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      terminal.spawn()

      const mockProcess = mockSpawn.mock.results[0].value

      // Get the stdout data handler
      const stdoutDataHandler = mockProcess.stdout.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'data'
      )?.[1]

      // Simulate empty/whitespace only data
      stdoutDataHandler(Buffer.from('   \n\n   '))

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          '[Subprocess] Stdout data was completely filtered out'
        )
      )
      expect(mockBufferManagerInstance.write).not.toHaveBeenCalled()
    })

    it('should handle buffer manager dataReady events', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      const dataSpy = vi.fn()
      terminal.on('data', dataSpy)

      // Get the dataReady handler from buffer manager setup
      const dataReadyHandler = mockBufferManagerInstance.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'dataReady'
      )?.[1]

      expect(dataReadyHandler).toBeDefined()

      // Simulate buffer manager emitting dataReady
      dataReadyHandler('Processed terminal data')

      expect(dataSpy).toHaveBeenCalledWith('Processed terminal data')
    })

    it('should handle buffer manager chunksDropped events', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      new SubprocessTerminal('test-terminal')

      // Get the chunksDropped handler from buffer manager setup
      const chunksDroppedHandler = mockBufferManagerInstance.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'chunksDropped'
      )?.[1]

      expect(chunksDroppedHandler).toBeDefined()

      // Simulate buffer manager emitting chunksDropped
      chunksDroppedHandler({ droppedCount: 5 })

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Buffer dropped 5 chunks due to high load')
      )
    })
  })

  describe('Data Filtering', () => {
    it('should filter problematic characters', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      // Access private method for testing
      const filterMethod = (
        terminal as { filterTerminalOutput: (data: string) => string }
      ).filterTerminalOutput.bind(terminal)

      // Test null bytes removal
      expect(filterMethod('Hello\0World')).toBe('HelloWorld')

      // Test repeating characters removal
      expect(filterMethod('WWWWWWWWWWWWW')).toBe('')

      // Test escape sequence removal
      expect(filterMethod('Hello\x1b[31mRed\x1b[0mWorld')).toBe('HelloRedWorld')

      // Test control character removal
      expect(filterMethod('Hello\x07World')).toBe('HelloWorld')

      // Test excessive whitespace reduction
      expect(filterMethod('Hello\n\n\n\nWorld')).toBe('Hello\n\nWorld')
    })

    it('should preserve printable characters', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      const filterMethod = (
        terminal as { filterTerminalOutput: (data: string) => string }
      ).filterTerminalOutput.bind(terminal)

      const input = 'Hello World! 123 @#$%^&*()'
      expect(filterMethod(input)).toBe(input)
    })
  })

  describe('Terminal Operations', () => {
    it('should write data to terminal with echo', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      const dataSpy = vi.fn()
      terminal.on('data', dataSpy)

      terminal.spawn()

      const mockProcess = mockSpawn.mock.results[0].value

      // Write printable character
      terminal.write('a')

      expect(dataSpy).toHaveBeenCalledWith('a')
      expect(mockProcess.stdin.write).toHaveBeenCalledWith('a')
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          '[Subprocess Terminal] Writing user input to shell:'
        ),
        '"a"'
      )
    })

    it('should handle Enter key correctly', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      const dataSpy = vi.fn()
      terminal.on('data', dataSpy)

      terminal.spawn()

      const mockProcess = mockSpawn.mock.results[0].value

      // Write Enter key
      terminal.write('\r')

      expect(dataSpy).toHaveBeenCalledWith('\r\n')
      expect(mockProcess.stdin.write).toHaveBeenCalledWith('\n')
    })

    it('should handle backspace correctly', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      const dataSpy = vi.fn()
      terminal.on('data', dataSpy)

      terminal.spawn()

      // Write backspace
      terminal.write('\x7f')

      expect(dataSpy).toHaveBeenCalledWith('\b \b')
    })

    it('should handle non-printable characters', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      terminal.spawn()

      const mockProcess = mockSpawn.mock.results[0].value

      // Write control character
      terminal.write('\x03') // Ctrl+C

      expect(mockProcess.stdin.write).toHaveBeenCalledWith('\x03')
    })

    it('should handle write when no process available', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      // Don't spawn - no process available
      terminal.write('test')

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Cannot write - no process or stdin available')
      )
    })

    it('should resize terminal on Unix systems', async () => {
      mockOs.platform.mockReturnValue('linux')

      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      // Mock process.kill
      const originalKill = process.kill
      process.kill = vi.fn()

      terminal.spawn()

      terminal.resize(120, 30)

      expect(process.kill).toHaveBeenCalledWith(12345, 'SIGWINCH')

      // Restore original
      process.kill = originalKill
    })

    it('should not resize on Windows', async () => {
      mockOs.platform.mockReturnValue('win32')

      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      const originalKill = process.kill
      process.kill = vi.fn()

      terminal.spawn()

      terminal.resize(120, 30)

      expect(process.kill).not.toHaveBeenCalled()

      process.kill = originalKill
    })

    it('should handle resize signal errors', async () => {
      mockOs.platform.mockReturnValue('linux')

      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      // Mock process.kill to throw error
      const originalKill = process.kill
      process.kill = vi.fn(() => {
        throw new Error('Kill failed')
      })

      terminal.spawn()

      terminal.resize(120, 30)

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send resize signal:'),
        expect.any(Error)
      )

      process.kill = originalKill
    })

    it('should kill terminal gracefully', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      terminal.spawn()

      const mockProcess = mockSpawn.mock.results[0].value

      terminal.kill()

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[Subprocess Terminal] Killing terminal')
      )
      expect(mockBufferManagerInstance.destroy).toHaveBeenCalled()
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM')
      expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), 5000)
    })

    it('should force kill after timeout', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      terminal.spawn()

      const mockProcess = mockSpawn.mock.results[0].value
      mockProcess.killed = false // Still running

      terminal.kill()

      // Get the timeout callback and call it
      const killTimeoutCall = (
        global.setTimeout as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call: unknown[]) => call[1] === 5000)
      expect(killTimeoutCall).toBeDefined()

      killTimeoutCall[0]() // Call the timeout callback

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[Subprocess Terminal] Force killing terminal')
      )
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL')
    })

    it('should not force kill if already killed', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      terminal.spawn()

      const mockProcess = mockSpawn.mock.results[0].value
      mockProcess.killed = true // Already killed

      terminal.kill()

      // Get the timeout callback and call it
      const killTimeoutCall = (
        global.setTimeout as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call: unknown[]) => call[1] === 5000)
      killTimeoutCall[0]()

      expect(mockProcess.kill).toHaveBeenCalledTimes(1) // Only SIGTERM, not SIGKILL
    })
  })

  describe('Process Event Handling', () => {
    it('should handle process errors', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      const errorSpy = vi.fn()
      terminal.on('error', errorSpy)

      terminal.spawn()

      const mockProcess = mockSpawn.mock.results[0].value

      // Get the error handler and call it
      const errorHandler = mockProcess.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'error'
      )?.[1]

      expect(errorHandler).toBeDefined()

      const testError = new Error('Process error')
      errorHandler(testError)

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(
          '[Subprocess Terminal] Error in test-terminal:'
        ),
        testError
      )
      expect(errorSpy).toHaveBeenCalledWith(testError)
    })

    it('should handle process exit', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      const exitSpy = vi.fn()
      terminal.on('exit', exitSpy)

      terminal.spawn()

      const mockProcess = mockSpawn.mock.results[0].value

      // Get the exit handler and call it
      const exitHandler = mockProcess.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'exit'
      )?.[1]

      expect(exitHandler).toBeDefined()

      exitHandler(0, 'SIGTERM')

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          '[Subprocess Terminal] Process test-terminal exited with code 0, signal SIGTERM'
        )
      )
      expect(exitSpy).toHaveBeenCalledWith(0, 'SIGTERM')
    })

    it('should handle null exit code', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      const exitSpy = vi.fn()
      terminal.on('exit', exitSpy)

      terminal.spawn()

      const mockProcess = mockSpawn.mock.results[0].value

      const exitHandler = mockProcess.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'exit'
      )?.[1]

      exitHandler(null, 'SIGKILL')

      expect(exitSpy).toHaveBeenCalledWith(0, 'SIGKILL') // null code becomes 0
    })
  })

  describe('Properties and Status', () => {
    it('should return correct PID', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      terminal.spawn()

      expect(terminal.pid).toBe(12345)
    })

    it('should return undefined PID when not spawned', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      expect(terminal.pid).toBeUndefined()
    })

    it('should return correct running status', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      // Not running initially
      expect(terminal.isRunning).toBe(false)

      terminal.spawn()

      // Running after spawn
      expect(terminal.isRunning).toBe(true)
    })

    it('should return false for running when killed', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      terminal.spawn()

      const mockProcess = mockSpawn.mock.results[0].value
      mockProcess.killed = true

      expect(terminal.isRunning).toBe(false)
    })
  })

  describe('Buffer Management Integration', () => {
    it('should get buffer metrics', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      const metrics = terminal.getBufferMetrics()

      expect(mockBufferManagerInstance.getMetrics).toHaveBeenCalled()
      expect(metrics).toEqual({
        totalWrites: 10,
        totalBytes: 1024,
        chunksProcessed: 5,
        averageChunkSize: 204.8,
        flushCount: 2,
      })
    })

    it('should get buffer health status', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      const health = terminal.getBufferHealth()

      expect(mockBufferManagerInstance.getHealthStatus).toHaveBeenCalled()
      expect(health).toEqual({
        isHealthy: true,
        backpressure: 0.1,
        bufferUtilization: 0.05,
        lastFlushMs: 16,
        warnings: [],
      })
    })

    it('should pause buffer processing', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      terminal.pauseBuffer()

      expect(mockBufferManagerInstance.pause).toHaveBeenCalled()
    })

    it('should resume buffer processing', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      terminal.resumeBuffer()

      expect(mockBufferManagerInstance.resume).toHaveBeenCalled()
    })
  })

  describe('Welcome Message Generation', () => {
    it('should generate welcome message', async () => {
      mockOs.hostname.mockReturnValue('test-host')
      mockOs.userInfo.mockReturnValue({ username: 'testuser' })

      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal', {
        cwd: '/home/testuser',
      })

      // Access private method for testing
      const welcomeMessage = (
        terminal as { getWelcomeMessage: () => string }
      ).getWelcomeMessage()

      expect(welcomeMessage).toBe(
        '\r\nWelcome to DX Engine Terminal\r\ntestuser@test-host:/home/testuser$ '
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle no process for kill operation', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      // Don't spawn - no process to kill
      expect(() => terminal.kill()).not.toThrow()
    })

    it('should handle no process for resize operation', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      // Don't spawn - no process to resize
      expect(() => terminal.resize(80, 24)).not.toThrow()
    })

    it('should handle empty environment variables', async () => {
      delete process.env.HOME
      delete process.env.SHELL

      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      terminal.spawn()

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        [],
        expect.objectContaining({
          cwd: expect.any(String),
          env: expect.objectContaining({
            TERM: 'xterm-256color',
            COLORTERM: 'truecolor',
          }),
        })
      )
    })

    it('should handle buffer manager creation errors', async () => {
      mockTerminalBufferManager.mockImplementationOnce(() => {
        throw new Error('Buffer manager creation failed')
      })

      const { SubprocessTerminal } = await import('./subprocessTerminal')

      expect(() => new SubprocessTerminal('test-terminal')).toThrow(
        'Buffer manager creation failed'
      )
    })
  })
})
