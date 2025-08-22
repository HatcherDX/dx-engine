/**
 * @fileoverview Comprehensive tests for NodePtyTerminal implementation.
 *
 * @description
 * Tests for the node-pty based terminal implementation covering:
 * - Terminal creation and initialization
 * - Shell detection across platforms
 * - PTY process spawning and management
 * - Data handling and buffer integration
 * - Terminal operations (write, resize, kill)
 * - Advanced node-pty features
 * - Error handling and edge cases
 * - Performance monitoring and metrics
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock modules with hoisted functions
const { mockNodePty, mockTerminalBufferManager, mockOs } = vi.hoisted(() => ({
  mockNodePty: {
    spawn: vi.fn(),
  },
  mockTerminalBufferManager: {
    addData: vi.fn(),
    destroy: vi.fn(),
    getMetrics: vi.fn(() => ({
      totalChunks: 10,
      totalBytes: 1024,
      droppedChunks: 0,
      avgChunkSize: 102.4,
      maxBufferSize: 16777216,
      currentBufferSize: 1024,
      processingLatency: 5,
    })),
    getHealthStatus: vi.fn(() => ({
      status: 'healthy',
      utilizationPercent: 5.2,
      averageLatency: 5,
      droppedChunksPercent: 0,
    })),
    pause: vi.fn(),
    resume: vi.fn(),
    on: vi.fn(),
  },
  mockOs: {
    platform: vi.fn(() => 'linux'),
  },
}))

// Mock PTY process
const mockPtyProcess = {
  pid: 12345,
  killed: false,
  process: 'bash',
  write: vi.fn(),
  resize: vi.fn(),
  kill: vi.fn(),
  onData: vi.fn(),
  onExit: vi.fn(),
  on: vi.fn(),
  clear: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
}

// Mock node modules
vi.mock('node-pty', () => mockNodePty)
vi.mock('node:os', () => mockOs)

// Mock TerminalBufferManager
vi.mock('./terminalBufferManager', () => ({
  TerminalBufferManager: vi.fn(() => mockTerminalBufferManager),
}))

// Mock dynamic import for node-pty
const mockDynamicImport = vi.fn(() => Promise.resolve(mockNodePty))

describe('NodePtyTerminal', () => {
  let originalConsoleLog: typeof console.log
  let originalConsoleWarn: typeof console.warn
  let originalConsoleError: typeof console.error
  // let _originalSetTimeout: typeof setTimeout

  beforeEach(() => {
    // Store originals
    originalConsoleLog = console.log
    originalConsoleWarn = console.warn
    originalConsoleError = console.error
    // _originalSetTimeout = setTimeout

    // Mock console methods
    console.log = vi.fn()
    console.warn = vi.fn()
    console.error = vi.fn()

    // Reset all mocks
    vi.clearAllMocks()
    vi.resetModules()

    // Setup default PTY spawn behavior
    mockPtyProcess.killed = false // Reset killed state
    mockNodePty.spawn.mockReturnValue(mockPtyProcess)

    // Mock global import function
    vi.stubGlobal('import', mockDynamicImport)
  })

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog
    console.warn = originalConsoleWarn
    console.error = originalConsoleError

    vi.restoreAllMocks()
  })

  describe('Constructor and Initialization', () => {
    it('should create NodePtyTerminal instance with default options', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      expect(terminal).toBeInstanceOf(NodePtyTerminal)
      expect(terminal).toBeInstanceOf(EventEmitter)
    })

    it('should initialize with custom options', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')

      const options = {
        shell: '/bin/bash',
        cwd: '/home/user',
        env: { NODE_ENV: 'test' },
        cols: 120,
        rows: 40,
      }

      const terminal = new NodePtyTerminal('test-terminal', options)

      expect(terminal).toBeInstanceOf(NodePtyTerminal)
    })

    it('should setup buffer manager with node-pty optimized settings', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const { TerminalBufferManager } = await import('./terminalBufferManager')

      new NodePtyTerminal('test-terminal')

      expect(TerminalBufferManager).toHaveBeenCalledWith('test-terminal', {
        maxBufferSize: 16 * 1024 * 1024,
        chunkSize: 128 * 1024,
        maxChunksPerFlush: 100,
        flushInterval: 8,
        dropThreshold: 0.85,
      })
    })

    it('should setup buffer manager event handlers', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')

      new NodePtyTerminal('test-terminal')

      expect(mockTerminalBufferManager.on).toHaveBeenCalledWith(
        'dataReady',
        expect.any(Function)
      )
      expect(mockTerminalBufferManager.on).toHaveBeenCalledWith(
        'chunksDropped',
        expect.any(Function)
      )
    })
  })

  describe('Shell Detection', () => {
    it('should detect Windows shell correctly', async () => {
      mockOs.platform.mockReturnValue('win32')
      process.env.SHELL = undefined
      process.env.COMSPEC = 'C:\\Windows\\System32\\cmd.exe'

      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      expect(terminal).toBeDefined()
    })

    it('should prefer PowerShell on Windows when available', async () => {
      mockOs.platform.mockReturnValue('win32')
      process.env.SHELL = undefined
      process.env.COMSPEC =
        'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'

      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      new NodePtyTerminal('test-terminal')

      // Should detect PowerShell preference
      expect(mockOs.platform).toHaveBeenCalled()
    })

    it('should detect macOS shell correctly', async () => {
      mockOs.platform.mockReturnValue('darwin')
      process.env.SHELL = '/bin/zsh'

      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      new NodePtyTerminal('test-terminal')

      expect(mockOs.platform).toHaveBeenCalled()
    })

    it('should fallback to bash on macOS when SHELL not set', async () => {
      mockOs.platform.mockReturnValue('darwin')
      delete process.env.SHELL

      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      new NodePtyTerminal('test-terminal')

      expect(mockOs.platform).toHaveBeenCalled()
    })

    it('should detect Linux shell correctly', async () => {
      mockOs.platform.mockReturnValue('linux')
      process.env.SHELL = '/bin/bash'

      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      new NodePtyTerminal('test-terminal')

      expect(mockOs.platform).toHaveBeenCalled()
    })

    it('should fallback to bash on Linux when SHELL not set', async () => {
      mockOs.platform.mockReturnValue('linux')
      delete process.env.SHELL

      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      new NodePtyTerminal('test-terminal')

      expect(mockOs.platform).toHaveBeenCalled()
    })
  })

  describe('PTY Process Spawning', () => {
    it('should spawn PTY process successfully', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      await terminal.spawn()

      expect(mockNodePty.spawn).toHaveBeenCalled()
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[Node-pty Terminal] Spawning shell:')
      )
    })

    it('should setup PTY process with correct options', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal', {
        shell: '/bin/bash',
        cwd: '/home/user',
        cols: 120,
        rows: 40,
      })

      await terminal.spawn()

      expect(mockNodePty.spawn).toHaveBeenCalledWith(
        '/bin/bash',
        [],
        expect.objectContaining({
          name: 'xterm-color',
          cols: 120,
          rows: 40,
          cwd: '/home/user',
          env: expect.objectContaining({
            TERM: 'xterm-256color',
            COLORTERM: 'truecolor',
          }),
          useConpty: process.platform === 'win32',
          encoding: 'utf8',
        })
      )
    })

    it('should setup PTY event handlers after spawn', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      await terminal.spawn()

      expect(mockPtyProcess.onData).toHaveBeenCalledWith(expect.any(Function))
      expect(mockPtyProcess.onExit).toHaveBeenCalledWith(expect.any(Function))
      expect(mockPtyProcess.on).toHaveBeenCalledWith(
        'error',
        expect.any(Function)
      )
    })

    it('should handle spawn errors gracefully', async () => {
      const testError = new Error('PTY spawn failed')
      mockNodePty.spawn.mockImplementationOnce(() => {
        throw testError
      })

      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      await expect(terminal.spawn()).rejects.toThrow(testError)
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[Node-pty Terminal] Failed to spawn terminal'),
        testError
      )
    })

    it('should log successful spawn with PID', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      await terminal.spawn()

      expect(console.log).toHaveBeenCalledWith(
        '[Node-pty Terminal] Successfully spawned terminal test-terminal with PID 12345'
      )
    })
  })

  describe('PTY Event Handling', () => {
    it('should handle PTY data events', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      await terminal.spawn()

      // Get the data handler and simulate data event
      const dataHandler = mockPtyProcess.onData.mock.calls[0][0]
      dataHandler('test data')

      expect(mockTerminalBufferManager.addData).toHaveBeenCalledWith(
        'test data'
      )
    })

    it('should handle PTY exit events', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      const exitSpy = vi.fn()
      terminal.on('exit', exitSpy)

      await terminal.spawn()

      // Get the exit handler and simulate exit event
      const exitHandler = mockPtyProcess.onExit.mock.calls[0][0]
      exitHandler(0, 9)

      expect(console.log).toHaveBeenCalledWith(
        '[Node-pty Terminal] Process test-terminal exited with code 0, signal 9'
      )
      expect(exitSpy).toHaveBeenCalledWith(0, 9)
    })

    it('should handle PTY error events', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      const errorSpy = vi.fn()
      terminal.on('error', errorSpy)

      await terminal.spawn()

      // Get the error handler and simulate error event
      const errorHandler = mockPtyProcess.on.mock.calls.find(
        (call) => call[0] === 'error'
      )?.[1]

      const testError = new Error('PTY error')
      errorHandler?.(testError)

      expect(console.error).toHaveBeenCalledWith(
        '[Node-pty Terminal] Error in test-terminal:',
        testError
      )
      expect(errorSpy).toHaveBeenCalledWith(testError)
    })

    it('should handle non-Error objects in error events', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      const errorSpy = vi.fn()
      terminal.on('error', errorSpy)

      await terminal.spawn()

      // Get the error handler and simulate error event with string
      const errorHandler = mockPtyProcess.on.mock.calls.find(
        (call) => call[0] === 'error'
      )?.[1]

      errorHandler?.('String error')

      expect(errorSpy).toHaveBeenCalledWith(expect.any(Error))
    })

    it('should handle buffer manager dataReady events', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      const dataSpy = vi.fn()
      terminal.on('data', dataSpy)

      // Get the dataReady handler from buffer manager setup
      const dataReadyHandler = mockTerminalBufferManager.on.mock.calls.find(
        (call) => call[0] === 'dataReady'
      )?.[1]

      dataReadyHandler?.('processed data')

      expect(dataSpy).toHaveBeenCalledWith('processed data')
    })

    it('should handle buffer manager chunksDropped events', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      new NodePtyTerminal('test-terminal')

      // Get the chunksDropped handler from buffer manager setup
      const chunksDroppedHandler = mockTerminalBufferManager.on.mock.calls.find(
        (call) => call[0] === 'chunksDropped'
      )?.[1]

      chunksDroppedHandler?.({ droppedCount: 5 })

      expect(console.warn).toHaveBeenCalledWith(
        '[Node-pty Terminal] Buffer dropped 5 chunks due to high load'
      )
    })
  })

  describe('Terminal Operations', () => {
    it('should write data to PTY process when running', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      await terminal.spawn()
      terminal.write('test command')

      expect(mockPtyProcess.write).toHaveBeenCalledWith('test command')
    })

    it('should warn when writing to non-running terminal', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      // Don't spawn, so process is null
      terminal.write('test command')

      expect(console.warn).toHaveBeenCalledWith(
        '[Node-pty Terminal] Cannot write to terminal test-terminal: process not running'
      )
      expect(mockPtyProcess.write).not.toHaveBeenCalled()
    })

    it('should resize PTY process successfully', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      await terminal.spawn()
      terminal.resize(120, 40)

      expect(mockPtyProcess.resize).toHaveBeenCalledWith(120, 40)
      expect(console.log).toHaveBeenCalledWith(
        '[Node-pty Terminal] Resized terminal test-terminal to 120x40'
      )
    })

    it('should handle resize errors', async () => {
      mockPtyProcess.resize.mockImplementationOnce(() => {
        throw new Error('Resize failed')
      })

      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      await terminal.spawn()
      terminal.resize(120, 40)

      expect(console.warn).toHaveBeenCalledWith(
        '[Node-pty Terminal] Failed to resize terminal test-terminal:',
        expect.any(Error)
      )
    })

    it('should resize when process not running', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      // Don't spawn
      terminal.resize(120, 40)

      expect(mockPtyProcess.resize).not.toHaveBeenCalled()
    })

    it('should kill PTY process successfully', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      await terminal.spawn()
      terminal.kill()

      expect(console.log).toHaveBeenCalledWith(
        '[Node-pty Terminal] Killing terminal test-terminal'
      )
      expect(mockTerminalBufferManager.destroy).toHaveBeenCalled()
      expect(mockPtyProcess.kill).toHaveBeenCalled()
    })

    it('should handle kill errors', async () => {
      mockTerminalBufferManager.destroy.mockImplementationOnce(() => {
        throw new Error('Buffer destroy failed')
      })

      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      await terminal.spawn()
      terminal.kill()

      expect(console.error).toHaveBeenCalledWith(
        '[Node-pty Terminal] Error killing terminal test-terminal:',
        expect.any(Error)
      )
    })

    it('should force kill after timeout', async () => {
      vi.useFakeTimers()

      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      await terminal.spawn()
      terminal.kill()

      // Advance time to trigger force kill
      vi.advanceTimersByTime(5000)

      expect(mockPtyProcess.kill).toHaveBeenCalledWith('SIGKILL')
      expect(console.log).toHaveBeenCalledWith(
        '[Node-pty Terminal] Force killing terminal test-terminal'
      )

      vi.useRealTimers()
    })

    it('should not force kill if process already stopped', async () => {
      vi.useFakeTimers()

      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      await terminal.spawn()
      terminal.kill()

      // Simulate process stopped
      mockPtyProcess.killed = true

      // Advance time
      vi.advanceTimersByTime(5000)

      expect(mockPtyProcess.kill).toHaveBeenCalledTimes(1) // Only initial kill, no SIGKILL

      vi.useRealTimers()
    })
  })

  describe('Terminal Properties', () => {
    it('should return correct PID when process is running', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      await terminal.spawn()

      expect(terminal.pid).toBe(12345)
    })

    it('should return undefined PID when process not running', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      expect(terminal.pid).toBeUndefined()
    })

    it('should return correct running status when process active', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      await terminal.spawn()
      // Mock the ptyProcess to be not killed
      mockPtyProcess.killed = false

      expect(terminal.isRunning).toBe(true)
    })

    it('should return false running status when process killed', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      await terminal.spawn()
      mockPtyProcess.killed = true

      expect(terminal.isRunning).toBe(false)
    })

    it('should return false running status when process is null', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      expect(terminal.isRunning).toBe(false)
    })
  })

  describe('Advanced Node-pty Features', () => {
    it('should clear terminal when clear method available', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      await terminal.spawn()
      terminal.clear()

      expect(mockPtyProcess.clear).toHaveBeenCalled()
    })

    it('should handle clear when method not available', async () => {
      mockPtyProcess.clear = undefined

      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      await terminal.spawn()

      expect(() => terminal.clear()).not.toThrow()
    })

    it('should pause PTY process when available', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      await terminal.spawn()
      terminal.pause()

      expect(mockPtyProcess.pause).toHaveBeenCalled()
    })

    it('should handle pause when method not available', async () => {
      mockPtyProcess.pause = undefined

      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      await terminal.spawn()

      expect(() => terminal.pause()).not.toThrow()
    })

    it('should resume PTY process when available', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      await terminal.spawn()
      terminal.resume()

      expect(mockPtyProcess.resume).toHaveBeenCalled()
    })

    it('should handle resume when method not available', async () => {
      mockPtyProcess.resume = undefined

      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      await terminal.spawn()

      expect(() => terminal.resume()).not.toThrow()
    })

    it('should get process tree when available', async () => {
      const processInfo = [
        {
          pid: 12345,
          ppid: 1,
          command: 'bash',
          arguments: [],
        },
      ]
      mockPtyProcess.process = vi.fn(() => processInfo)

      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      await terminal.spawn()
      const result = terminal.getProcessTree()

      expect(result).toEqual(processInfo)
      expect(mockPtyProcess.process).toHaveBeenCalled()
    })

    it('should return empty array when process tree not available', async () => {
      mockPtyProcess.process = 'bash' // String instead of function

      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      await terminal.spawn()
      const result = terminal.getProcessTree()

      expect(result).toEqual([])
    })

    it('should get title from process when string', async () => {
      mockPtyProcess.process = 'bash'

      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      await terminal.spawn()
      const title = terminal.getTitle()

      expect(title).toBe('bash')
    })

    it('should get title from shell when process is function', async () => {
      mockPtyProcess.process = vi.fn(() => [])

      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal', {
        shell: '/bin/zsh',
      })

      await terminal.spawn()
      const title = terminal.getTitle()

      expect(title).toBe('/bin/zsh')
    })

    it('should get title when no process', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal', {
        shell: '/bin/bash',
      })

      const title = terminal.getTitle()

      expect(title).toBe('/bin/bash')
    })
  })

  describe('Buffer Management Integration', () => {
    it('should get buffer metrics', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      const metrics = terminal.getBufferMetrics()

      expect(mockTerminalBufferManager.getMetrics).toHaveBeenCalled()
      expect(metrics).toEqual({
        totalChunks: 10,
        totalBytes: 1024,
        droppedChunks: 0,
        avgChunkSize: 102.4,
        maxBufferSize: 16777216,
        currentBufferSize: 1024,
        processingLatency: 5,
      })
    })

    it('should get buffer health status', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      const health = terminal.getBufferHealth()

      expect(mockTerminalBufferManager.getHealthStatus).toHaveBeenCalled()
      expect(health).toEqual({
        status: 'healthy',
        utilizationPercent: 5.2,
        averageLatency: 5,
        droppedChunksPercent: 0,
      })
    })

    it('should pause buffer processing', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      terminal.pauseBuffer()

      expect(mockTerminalBufferManager.pause).toHaveBeenCalled()
    })

    it('should resume buffer processing', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      terminal.resumeBuffer()

      expect(mockTerminalBufferManager.resume).toHaveBeenCalled()
    })
  })

  describe('Environment and Options Handling', () => {
    it('should use process.cwd when no cwd provided', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      await terminal.spawn()

      expect(mockNodePty.spawn).toHaveBeenCalledWith(
        expect.any(String),
        [],
        expect.objectContaining({
          cwd: expect.any(String),
        })
      )
    })

    it('should use HOME directory as fallback for cwd', async () => {
      const originalHome = process.env.HOME
      process.env.HOME = '/home/testuser'

      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal', { cwd: undefined })

      await terminal.spawn()

      expect(mockNodePty.spawn).toHaveBeenCalledWith(
        expect.any(String),
        [],
        expect.objectContaining({
          cwd: '/home/testuser',
        })
      )

      if (originalHome) {
        process.env.HOME = originalHome
      } else {
        delete process.env.HOME
      }
    })

    it('should merge custom environment with defaults', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal', {
        env: { CUSTOM_VAR: 'custom_value' },
      })

      await terminal.spawn()

      expect(mockNodePty.spawn).toHaveBeenCalledWith(
        expect.any(String),
        [],
        expect.objectContaining({
          env: expect.objectContaining({
            TERM: 'xterm-256color',
            COLORTERM: 'truecolor',
            CUSTOM_VAR: 'custom_value',
          }),
        })
      )
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle PTY spawn without error handler setup', async () => {
      mockPtyProcess.on = undefined

      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      await expect(terminal.spawn()).resolves.toBeUndefined()
    })

    it('should handle operations when no PTY process spawned', async () => {
      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      expect(() => {
        terminal.clear()
        terminal.pause()
        terminal.resume()
        terminal.getProcessTree()
      }).not.toThrow()
    })

    it('should handle missing PTY methods gracefully', async () => {
      mockPtyProcess.clear = undefined
      mockPtyProcess.pause = undefined
      mockPtyProcess.resume = undefined

      const { NodePtyTerminal } = await import('./nodePtyTerminal')
      const terminal = new NodePtyTerminal('test-terminal')

      await terminal.spawn()

      expect(() => {
        terminal.clear()
        terminal.pause()
        terminal.resume()
      }).not.toThrow()
    })
  })
})
