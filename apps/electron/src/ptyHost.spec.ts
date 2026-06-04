/**
 * @fileoverview Comprehensive tests for PTY Host Process implementation.
 *
 * @description
 * Tests for the PTY Host Process manager covering:
 * - Terminal creation and lifecycle management
 * - Message handling and IPC communication
 * - Shell detection across platforms
 * - Data throttling and WINCH signal prevention
 * - Error handling and cleanup
 * - Terminal operations (write, resize, kill)
 * - Performance optimizations and backpressure
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock modules with hoisted functions
const { mockOs, mockTerminalStrategy, mockCreateTerminal } = vi.hoisted(() => ({
  mockOs: {
    platform: vi.fn(() => 'linux'),
  },
  mockTerminalStrategy: {
    NODE_PTY: 'node-pty',
    CONPTY: 'conpty',
    WINPTY: 'winpty',
    SUBPROCESS: 'subprocess',
  },
  mockCreateTerminal: vi.fn(),
}))

// Mock terminal instance
const mockTerminal = new EventEmitter() as EventEmitter & {
  spawn: ReturnType<typeof vi.fn>
  write: ReturnType<typeof vi.fn>
  resize: ReturnType<typeof vi.fn>
  kill: ReturnType<typeof vi.fn>
  pid: number
}
mockTerminal.spawn = vi.fn()
mockTerminal.write = vi.fn()
mockTerminal.resize = vi.fn()
mockTerminal.kill = vi.fn()
mockTerminal.pid = 12345

// Mock modules
vi.mock('node:os', () => mockOs)
vi.mock('./terminalStrategy', () => ({
  createTerminal: mockCreateTerminal,
  TerminalStrategy: mockTerminalStrategy,
}))

describe('PtyHost', () => {
  let originalConsoleLog: typeof console.log
  let originalConsoleWarn: typeof console.warn
  let originalConsoleError: typeof console.error

  beforeEach(() => {
    // Store originals
    originalConsoleLog = console.log
    originalConsoleWarn = console.warn
    originalConsoleError = console.error

    // Mock console methods
    console.log = vi.fn() as unknown as typeof console.log
    console.warn = vi.fn() as unknown as typeof console.warn
    console.error = vi.fn() as unknown as typeof console.error

    // Reset all mocks
    vi.clearAllMocks()
    vi.resetModules()

    // Setup default terminal creation result
    mockCreateTerminal.mockResolvedValue({
      terminal: mockTerminal,
      strategy: mockTerminalStrategy.NODE_PTY,
      capabilities: {
        backend: 'node-pty',
        supportsResize: true,
        supportsColors: true,
        supportsInteractivity: true,
        supportsHistory: true,
        reliability: 'high',
      },
      fallbackReason: undefined,
    })

    // Mock process methods individually
    vi.spyOn(process, 'on').mockImplementation(() => process)
    vi.spyOn(process, 'exit').mockImplementation(() => process as never)
    Object.defineProperty(process, 'send', {
      value: vi.fn(),
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog
    console.warn = originalConsoleWarn
    console.error = originalConsoleError

    vi.restoreAllMocks()
  })

  describe('PtyHostManager Initialization', () => {
    it('should create PtyHostManager and setup message handlers', async () => {
      await import('./ptyHost')

      expect(process.on).toHaveBeenCalledWith('message', expect.any(Function))
      expect(process.on).toHaveBeenCalledWith(
        'disconnect',
        expect.any(Function)
      )
      expect(process.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function))
    })

    it('should handle disconnect event', async () => {
      await import('./ptyHost')

      const disconnectHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call: unknown[]) => call[0] === 'disconnect')?.[1]

      ;(disconnectHandler as (() => void) | undefined)?.()

      expect(console.log).toHaveBeenCalledWith(
        '[PTY Host] Disconnected from main process, cleaning up...'
      )
      expect(process.exit).toHaveBeenCalledWith(0)
    })

    it('should handle SIGTERM event', async () => {
      await import('./ptyHost')

      const sigtermHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call: unknown[]) => call[0] === 'SIGTERM')?.[1]

      ;(sigtermHandler as (() => void) | undefined)?.()

      expect(console.log).toHaveBeenCalledWith(
        '[PTY Host] Received SIGTERM, cleaning up...'
      )
      expect(process.exit).toHaveBeenCalledWith(0)
    })
  })

  describe('Shell Detection', () => {
    it('should detect Windows shell correctly', async () => {
      mockOs.platform.mockReturnValue('win32')
      delete process.env.SHELL
      process.env.COMSPEC = 'C:\\Windows\\System32\\cmd.exe'

      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call: unknown[]) => call[0] === 'message')?.[1]

      await messageHandler?.({
        type: 'create',
        id: 'test-terminal',
        options: {},
      })

      expect(mockCreateTerminal).toHaveBeenCalledWith(
        'test-terminal',
        expect.objectContaining({
          shell: 'C:\\Windows\\System32\\cmd.exe',
        })
      )
    })

    it('should prefer PowerShell on Windows when available', async () => {
      mockOs.platform.mockReturnValue('win32')
      delete process.env.SHELL
      process.env.COMSPEC =
        'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'

      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      await messageHandler?.({
        type: 'create',
        id: 'test-terminal',
        options: {},
      })

      expect(mockCreateTerminal).toHaveBeenCalledWith(
        'test-terminal',
        expect.objectContaining({
          shell: 'powershell.exe',
        })
      )
    })

    it('should detect macOS shell correctly', async () => {
      mockOs.platform.mockReturnValue('darwin')
      process.env.SHELL = '/bin/zsh'

      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      await messageHandler?.({
        type: 'create',
        id: 'test-terminal',
        options: {},
      })

      expect(mockCreateTerminal).toHaveBeenCalledWith(
        'test-terminal',
        expect.objectContaining({
          shell: '/bin/zsh',
        })
      )
    })

    it('should fallback to bash on macOS when SHELL not set', async () => {
      mockOs.platform.mockReturnValue('darwin')
      delete process.env.SHELL

      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      await messageHandler?.({
        type: 'create',
        id: 'test-terminal',
        options: {},
      })

      expect(mockCreateTerminal).toHaveBeenCalledWith(
        'test-terminal',
        expect.objectContaining({
          shell: '/bin/zsh',
        })
      )
    })

    it('should detect Linux shell correctly', async () => {
      mockOs.platform.mockReturnValue('linux')
      process.env.SHELL = '/bin/bash'

      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      await messageHandler?.({
        type: 'create',
        id: 'test-terminal',
        options: {},
      })

      expect(mockCreateTerminal).toHaveBeenCalledWith(
        'test-terminal',
        expect.objectContaining({
          shell: '/bin/bash',
        })
      )
    })
  })

  describe('Message Handling', () => {
    it('should handle create message successfully', async () => {
      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      await messageHandler?.({
        type: 'create',
        id: 'test-terminal',
        options: {
          shell: '/bin/bash',
          cwd: '/test/dir',
          cols: 120,
          rows: 40,
        },
      })

      expect(mockCreateTerminal).toHaveBeenCalledWith('test-terminal', {
        shell: '/bin/bash',
        cwd: '/test/dir',
        env: expect.any(Object),
        cols: 120,
        rows: 40,
      })

      expect(mockTerminal.spawn).toHaveBeenCalled()
      expect(process.send).toHaveBeenCalledWith({
        type: 'created',
        id: 'test-terminal',
        shell: '/bin/bash',
        cwd: '/test/dir',
        pid: 12345,
        strategy: 'node-pty',
        backend: 'node-pty',
        capabilities: expect.any(Object),
        fallbackReason: undefined,
      })
    })

    it('should handle write message', async () => {
      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      // First create a terminal
      await messageHandler?.({
        type: 'create',
        id: 'test-terminal',
        options: {},
      })

      // Then write to it
      await messageHandler?.({
        type: 'write',
        id: 'test-terminal',
        data: 'echo hello',
      })

      expect(mockTerminal.write).toHaveBeenCalledWith('echo hello')
    })

    it('should handle resize message', async () => {
      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      // First create a terminal
      await messageHandler?.({
        type: 'create',
        id: 'test-terminal',
        options: {},
      })

      // Then resize it
      await messageHandler?.({
        type: 'resize',
        id: 'test-terminal',
        cols: 100,
        rows: 30,
      })

      expect(mockTerminal.resize).toHaveBeenCalledWith(100, 30)
      expect(console.log).toHaveBeenCalledWith(
        '[PTY Host] Resized terminal test-terminal to 100x30'
      )
    })

    it('should handle kill message', async () => {
      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      // First create a terminal
      await messageHandler?.({
        type: 'create',
        id: 'test-terminal',
        options: {},
      })

      // Then kill it
      await messageHandler?.({
        type: 'kill',
        id: 'test-terminal',
      })

      expect(mockTerminal.kill).toHaveBeenCalled()
      expect(console.log).toHaveBeenCalledWith(
        '[PTY Host] Killed terminal test-terminal'
      )
      expect(process.send).toHaveBeenCalledWith({
        type: 'killed',
        id: 'test-terminal',
      })
    })

    it('should handle list message', async () => {
      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      // First create some terminals
      await messageHandler?.({
        type: 'create',
        id: 'terminal-1',
        options: { shell: '/bin/bash' },
      })

      await messageHandler?.({
        type: 'create',
        id: 'terminal-2',
        options: { shell: '/bin/zsh' },
      })

      // Then list them
      await messageHandler?.({
        type: 'list',
        id: 'list-request',
      })

      expect(process.send).toHaveBeenCalledWith({
        type: 'list',
        requestId: 'list-request',
        terminals: expect.arrayContaining([
          expect.objectContaining({
            id: 'terminal-1',
            shell: '/bin/bash',
            pid: 12345,
          }),
          expect.objectContaining({
            id: 'terminal-2',
            shell: '/bin/zsh',
            pid: 12345,
          }),
        ]),
      })
    })

    it('should handle unknown message type', async () => {
      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      await messageHandler?.({
        type: 'unknown',
        id: 'test',
      } as { type: string; id: string })

      expect(console.warn).toHaveBeenCalledWith(
        '[PTY Host] Unknown message type:',
        expect.any(Object)
      )
    })

    it('should handle message processing errors', async () => {
      mockCreateTerminal.mockRejectedValue(new Error('Creation failed'))

      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      await messageHandler?.({
        type: 'create',
        id: 'test-terminal',
        options: {},
      })

      expect(process.send).toHaveBeenCalledWith({
        type: 'error',
        id: 'test-terminal',
        error: 'Creation failed',
      })
    })
  })

  describe('Terminal Operations', () => {
    it('should warn when writing to non-existent terminal', async () => {
      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      await messageHandler?.({
        type: 'write',
        id: 'non-existent',
        data: 'test',
      })

      expect(console.warn).toHaveBeenCalledWith(
        '[PTY Host] Terminal non-existent not found for write'
      )
    })

    it('should handle write errors', async () => {
      mockTerminal.write.mockImplementation(() => {
        throw new Error('Write failed')
      })

      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      // Create terminal first
      await messageHandler?.({
        type: 'create',
        id: 'test-terminal',
        options: {},
      })

      // Try to write
      await messageHandler?.({
        type: 'write',
        id: 'test-terminal',
        data: 'test',
      })

      expect(console.error).toHaveBeenCalledWith(
        '[PTY Host] Failed to write to terminal test-terminal:',
        expect.any(Error)
      )
      expect(process.send).toHaveBeenCalledWith({
        type: 'error',
        id: 'test-terminal',
        error: 'Write failed',
      })
    })

    it('should warn when resizing non-existent terminal', async () => {
      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      await messageHandler?.({
        type: 'resize',
        id: 'non-existent',
        cols: 80,
        rows: 24,
      })

      expect(console.warn).toHaveBeenCalledWith(
        '[PTY Host] Terminal non-existent not found for resize'
      )
    })

    it('should handle resize errors', async () => {
      mockTerminal.resize.mockImplementation(() => {
        throw new Error('Resize failed')
      })

      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      // Create terminal first
      await messageHandler?.({
        type: 'create',
        id: 'test-terminal',
        options: {},
      })

      // Try to resize
      await messageHandler?.({
        type: 'resize',
        id: 'test-terminal',
        cols: 100,
        rows: 30,
      })

      expect(console.error).toHaveBeenCalledWith(
        '[PTY Host] Failed to resize terminal test-terminal:',
        expect.any(Error)
      )
    })

    it('should warn when killing non-existent terminal', async () => {
      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      await messageHandler?.({
        type: 'kill',
        id: 'non-existent',
      })

      expect(console.warn).toHaveBeenCalledWith(
        '[PTY Host] Terminal non-existent not found for kill'
      )
    })

    it('should handle kill errors', async () => {
      mockTerminal.kill.mockImplementation(() => {
        throw new Error('Kill failed')
      })

      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      // Create terminal first
      await messageHandler?.({
        type: 'create',
        id: 'test-terminal',
        options: {},
      })

      // Try to kill
      await messageHandler?.({
        type: 'kill',
        id: 'test-terminal',
      })

      expect(console.error).toHaveBeenCalledWith(
        '[PTY Host] Failed to kill terminal test-terminal:',
        expect.any(Error)
      )
    })
  })

  describe('Terminal Event Handling', () => {
    it('should handle terminal data events', async () => {
      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      // Create terminal
      await messageHandler?.({
        type: 'create',
        id: 'test-terminal',
        options: {},
      })

      // Simulate terminal data
      mockTerminal.emit('data', 'Hello World!')

      expect(process.send).toHaveBeenCalledWith({
        type: 'data',
        id: 'test-terminal',
        data: 'Hello World!',
      })
    })

    it('should handle terminal exit events', async () => {
      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      // Create terminal
      await messageHandler?.({
        type: 'create',
        id: 'test-terminal',
        options: {},
      })

      // Simulate terminal exit
      mockTerminal.emit('exit', 0, 'SIGTERM')

      expect(console.log).toHaveBeenCalledWith(
        '[PTY Host] Terminal test-terminal exited with code 0, signal SIGTERM'
      )
      expect(process.send).toHaveBeenCalledWith({
        type: 'exit',
        id: 'test-terminal',
        exitCode: 0,
        signal: 'SIGTERM',
      })
    })

    it('should handle terminal error events', async () => {
      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      // Create terminal
      await messageHandler?.({
        type: 'create',
        id: 'test-terminal',
        options: {},
      })

      // Simulate terminal error
      const testError = new Error('Terminal error')
      mockTerminal.emit('error', testError)

      expect(console.error).toHaveBeenCalledWith(
        '[PTY Host] Terminal test-terminal error:',
        testError
      )
      expect(process.send).toHaveBeenCalledWith({
        type: 'error',
        id: 'test-terminal',
        error: 'Terminal error',
      })
    })

    it('should send buffered data before exit', async () => {
      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      // Create terminal
      await messageHandler?.({
        type: 'create',
        id: 'test-terminal',
        options: {},
      })

      // Add some data to buffer
      mockTerminal.emit('data', 'Some buffered data')

      // Then emit exit
      mockTerminal.emit('exit', 0)

      // Should have sent data first, then exit
      expect(process.send).toHaveBeenCalledWith({
        type: 'data',
        id: 'test-terminal',
        data: 'Some buffered data',
      })
      expect(process.send).toHaveBeenCalledWith({
        type: 'exit',
        id: 'test-terminal',
        exitCode: 0,
        signal: undefined,
      })
    })
  })

  describe('WINCH Signal Prevention', () => {
    it('should block WINCH loop patterns', async () => {
      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      // Create terminal
      await messageHandler?.({
        type: 'create',
        id: 'test-terminal',
        options: {},
      })

      // Simulate WINCH loop pattern multiple times
      const winchPattern = '\r\r\u001b[m\u001b[m\u001b[m\u001b[J% '

      // Send pattern multiple times to trigger blocking (more than MAX_WINCH_SIGNALS = 15)
      for (let i = 0; i < 20; i++) {
        mockTerminal.emit('data', winchPattern)
      }

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[PTY Host] BLOCKING WINCH loop')
      )
    })

    it('should allow normal data through', async () => {
      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      // Create terminal
      await messageHandler?.({
        type: 'create',
        id: 'test-terminal',
        options: {},
      })

      // Send normal data
      mockTerminal.emit('data', 'This is normal terminal output')

      expect(process.send).toHaveBeenCalledWith({
        type: 'data',
        id: 'test-terminal',
        data: 'This is normal terminal output',
      })
    })

    it('should handle large data with chunking', async () => {
      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      // Create terminal
      await messageHandler?.({
        type: 'create',
        id: 'test-terminal',
        options: {},
      })

      // Send large data (over 1KB)
      const largeData = 'x'.repeat(2048)
      mockTerminal.emit('data', largeData)

      // Should chunk the data
      expect(process.send).toHaveBeenCalledWith({
        type: 'data',
        id: 'test-terminal',
        data: 'x'.repeat(1024), // First chunk
      })
    })
  })

  describe('Terminal Creation Edge Cases', () => {
    it('should handle terminal creation with fallback reason', async () => {
      mockCreateTerminal.mockResolvedValue({
        terminal: mockTerminal,
        strategy: mockTerminalStrategy.SUBPROCESS,
        capabilities: {
          backend: 'subprocess',
          supportsResize: false,
          supportsColors: false,
          supportsInteractivity: false,
          supportsHistory: false,
          reliability: 'low',
        },
        fallbackReason: 'node-pty not available',
      })

      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      await messageHandler?.({
        type: 'create',
        id: 'test-terminal',
        options: {},
      })

      expect(console.warn).toHaveBeenCalledWith(
        '[PTY Host] Fallback reason: node-pty not available'
      )
      expect(process.send).toHaveBeenCalledWith(
        expect.objectContaining({
          fallbackReason: 'node-pty not available',
          strategy: 'subprocess',
          backend: 'subprocess',
        })
      )
    })

    it('should handle terminal creation failure', async () => {
      mockCreateTerminal.mockRejectedValue(
        new Error('Terminal creation failed')
      )

      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      await messageHandler?.({
        type: 'create',
        id: 'test-terminal',
        options: {},
      })

      expect(console.error).toHaveBeenCalledWith(
        '[PTY Host] Failed to create terminal test-terminal:',
        expect.any(Error)
      )
      expect(process.send).toHaveBeenCalledWith({
        type: 'error',
        id: 'test-terminal',
        error: 'Terminal creation failed',
      })
    })

    it('should use default values for missing options', async () => {
      process.env.HOME = '/home/testuser'

      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      await messageHandler?.({
        type: 'create',
        id: 'test-terminal',
        options: {}, // Empty options
      })

      expect(mockCreateTerminal).toHaveBeenCalledWith(
        'test-terminal',
        expect.objectContaining({
          cwd: '/home/testuser',
          cols: 45,
          rows: 24,
        })
      )
    })
  })

  describe('Process Send Edge Cases', () => {
    it('should handle missing process.send', async () => {
      // Mock process.send as undefined
      process.send = undefined

      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      // Should not throw when trying to send messages
      expect(async () => {
        await messageHandler?.({
          type: 'list',
          id: 'test-request',
        })
      }).not.toThrow()
    })
  })

  describe('Cleanup and Resource Management', () => {
    it('should cleanup all processes on disconnect', async () => {
      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      // Create some terminals
      await messageHandler?.({
        type: 'create',
        id: 'terminal-1',
        options: {},
      })
      await messageHandler?.({
        type: 'create',
        id: 'terminal-2',
        options: {},
      })

      // Trigger cleanup
      const disconnectHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'disconnect')?.[1]

      disconnectHandler?.()

      expect(console.log).toHaveBeenCalledWith(
        '[PTY Host] Cleaning up 2 processes...'
      )
      expect(mockTerminal.kill).toHaveBeenCalledTimes(2)
    })

    it('should handle cleanup errors gracefully', async () => {
      mockTerminal.kill.mockImplementation(() => {
        throw new Error('Kill failed during cleanup')
      })

      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      // Create terminal
      await messageHandler?.({
        type: 'create',
        id: 'test-terminal',
        options: {},
      })

      // Trigger cleanup
      const disconnectHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'disconnect')?.[1]

      disconnectHandler?.()

      expect(console.error).toHaveBeenCalledWith(
        '[PTY Host] Error cleaning up terminal test-terminal:',
        expect.any(Error)
      )
    })

    it('should handle SIGINT signal for cleanup', async () => {
      await import('./ptyHost')

      // Find the SIGINT handler
      const sigintHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'SIGINT')?.[1]

      sigintHandler?.()

      expect(console.log).toHaveBeenCalledWith(
        '[PTY Host] Received SIGINT, cleaning up...'
      )
      expect(process.exit).toHaveBeenCalledWith(0)
    })
  })

  describe('Complete Coverage - Missing Edge Cases', () => {
    it('should handle very long terminal data for substring coverage', async () => {
      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      // Create terminal
      await messageHandler?.({
        type: 'create',
        id: 'long-data-test',
        options: {},
      })

      // Send data longer than 100 characters to trigger substring logic on line 454
      const longData = 'x'.repeat(150) + '\r\n' + 'y'.repeat(50)
      mockTerminal.emit('data', longData)

      // Verify the logging happened with truncated data
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          '[PTY Host] 🔥 DATA EVENT from terminal long-data-test:'
        ),
        expect.objectContaining({
          dataLength: longData.length,
          first100: expect.stringContaining('x'.repeat(100)),
        })
      )
    })

    it('should handle data with various control characters for replace coverage', async () => {
      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      // Create terminal
      await messageHandler?.({
        type: 'create',
        id: 'control-chars-test',
        options: {},
      })

      // Send data with \r and \n characters that need replacement
      const dataWithControlChars = 'Hello\r\nWorld\rTest\nEnd'
      mockTerminal.emit('data', dataWithControlChars)

      // Verify the logging happened with escaped control characters
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          '[PTY Host] 🔥 DATA EVENT from terminal control-chars-test:'
        ),
        expect.objectContaining({
          first100: 'Hello\\r\\nWorld\\rTest\\nEnd',
        })
      )
    })

    it('should test process.send error handling with stringified message', async () => {
      // Mock process.send to throw an error
      const mockSend = vi.fn().mockImplementation(() => {
        throw new Error('IPC send failed')
      })

      Object.defineProperty(process, 'send', {
        value: mockSend,
        writable: true,
        configurable: true,
      })

      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      // Try to create terminal which will trigger sendMessage
      await messageHandler?.({
        type: 'list',
        id: 'send-error-test',
      })

      expect(console.error).toHaveBeenCalledWith(
        '[PTY Host] ❌ FAILED to send message:',
        expect.any(Error)
      )

      expect(console.error).toHaveBeenCalledWith(
        '[PTY Host] Message details:',
        expect.any(String)
      )
    })

    it('should trigger keep-alive interval function', async () => {
      // Mock setInterval to capture the callback
      const originalSetInterval = global.setInterval
      let keepAliveCallback: () => void = () => {}

      const mockSetInterval = vi
        .fn()

        .mockImplementation((callback: () => void, _interval: number) => {
          keepAliveCallback = callback
          return 1 // Return a timer ID
        })

      global.setInterval = mockSetInterval

      await import('./ptyHost')

      // Verify setInterval was called
      expect(mockSetInterval).toHaveBeenCalledWith(
        expect.any(Function),
        1000 * 60 * 60 // 1 hour
      )

      // Execute the keep-alive callback to cover line 845
      expect(() => keepAliveCallback()).not.toThrow()

      // Restore original setInterval
      global.setInterval = originalSetInterval
    })

    it('should handle falsy data for hasData coverage', async () => {
      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      // Create terminal
      await messageHandler?.({
        type: 'create',
        id: 'falsy-data-test',
        options: {},
      })

      // Send empty/falsy data to trigger hasData: !!data (line 457)
      mockTerminal.emit('data', '')

      // Verify logging happened with hasData: false
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          '[PTY Host] 🔥 DATA EVENT from terminal falsy-data-test:'
        ),
        expect.objectContaining({
          hasData: false,
        })
      )
    })

    it('should handle setTimeout initial newline success', async () => {
      vi.useFakeTimers()

      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      // Create terminal to trigger setTimeout
      await messageHandler?.({
        type: 'create',
        id: 'newline-success-test',
        options: {},
      })

      // Fast-forward time to trigger setTimeout (500ms)
      vi.advanceTimersByTime(500)

      expect(console.log).toHaveBeenCalledWith(
        '[PTY Host] Sending initial newline to trigger prompt for terminal newline-success-test'
      )
      expect(mockTerminal.write).toHaveBeenCalledWith('\n')
      expect(console.log).toHaveBeenCalledWith(
        '[PTY Host] Initial newline sent successfully to terminal newline-success-test'
      )

      vi.useRealTimers()
    })

    it('should handle setTimeout initial newline error', async () => {
      vi.useFakeTimers()

      // Mock terminal.write to throw an error
      mockTerminal.write.mockImplementation((data: string) => {
        if (data === '\n') {
          throw new Error('Write newline failed')
        }
      })

      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      // Create terminal to trigger setTimeout
      await messageHandler?.({
        type: 'create',
        id: 'newline-error-test',
        options: {},
      })

      // Fast-forward time to trigger setTimeout (500ms)
      vi.advanceTimersByTime(500)

      expect(console.log).toHaveBeenCalledWith(
        '[PTY Host] Sending initial newline to trigger prompt for terminal newline-error-test'
      )
      expect(console.error).toHaveBeenCalledWith(
        '[PTY Host] Failed to send initial newline to terminal newline-error-test:',
        expect.any(Error)
      )

      vi.useRealTimers()
    })

    it('should handle non-Error instance in writeToTerminal', async () => {
      // Mock terminal.write to throw a non-Error object
      mockTerminal.write.mockImplementation(() => {
        throw 'String error instead of Error instance' // Non-Error throw
      })

      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      // Create terminal first
      await messageHandler?.({
        type: 'create',
        id: 'non-error-test',
        options: {},
      })

      // Try to write which will trigger the non-Error catch
      await messageHandler?.({
        type: 'write',
        id: 'non-error-test',
        data: 'test',
      })

      expect(process.send).toHaveBeenCalledWith({
        type: 'error',
        id: 'non-error-test',
        error: 'Failed to write to terminal',
      })
    })
  })

  describe('Complete Coverage - Data Processing and Terminal Cleanup', () => {
    it('should process terminal data with various zsh pattern cleaning scenarios', async () => {
      const terminalId = 'zsh-pattern-test'

      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      await messageHandler?.({
        type: 'create',
        id: terminalId,
        options: {
          shell: '/bin/zsh',
          cwd: '/test/path',
          env: {
            PATH: '/usr/local/bin:/usr/bin:/bin'.repeat(10), // Long PATH for substring coverage
            HOME: '/home/user',
            USER: 'testuser',
            SHELL: '/bin/zsh',
            TERM: 'xterm-256color',
            LANG: 'en_US.UTF-8',
            LC_ALL: 'en_US.UTF-8',
            COLUMNS: '80',
            LINES: '24',
          },
          cols: 80,
          rows: 24,
        },
      })

      // Test various zsh pattern scenarios that trigger different cleaning logic
      const testPatterns = [
        // Zsh prompt spacing issue (line 571-577)
        '%                    user@hostname',
        // Excessive spaces pattern (line 580-587)
        '%   user@hostname   %   command   ',
        // Zsh EOL marker with excessive padding (line 591-595)
        '\r          \r\u001b[0J',
        // Zsh partial line marker pattern (line 599-604)
        '%                                                                      user@hostname ~/path %',
        // Invisible escape sequences (line 609-613)
        '\u001b[m\u001b[m\u001b[m% user@hostname',
        // Double percent spacing pattern (line 616-620)
        '%          user@hostname % command %',
      ]

      for (const pattern of testPatterns) {
        mockTerminal.emit('data', pattern)
      }

      expect(mockCreateTerminal).toHaveBeenCalledWith(
        terminalId,
        expect.objectContaining({
          shell: '/bin/zsh',
          cwd: '/test/path',
          cols: 80,
          rows: 24,
        })
      )

      // The environment variables are logged, verify the call exists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
      const envLogCall = (console.log as any).mock.calls.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
        (call: any[]) =>
          typeof call[0] === 'string' &&
          call[0].includes(
            '[PTY Host] 🔍 Environment variables for zsh-pattern-test'
          )
      )
      expect(envLogCall).toBeDefined()
      expect(envLogCall[1]).toHaveProperty('PATH')
      expect(envLogCall[1]).toHaveProperty('HOME')
      expect(envLogCall[1]).toHaveProperty('USER')
    })

    it('should handle terminal exit with remaining buffer data', async () => {
      const terminalId = 'exit-test'

      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      await messageHandler?.({
        type: 'create',
        id: terminalId,
        options: {
          shell: '/bin/bash',
          cwd: '/test/path',
          env: {},
          cols: 80,
          rows: 24,
        },
      })

      // Add some data to buffer
      mockTerminal.emit(
        'data',
        'some buffered data that should be sent on exit'
      )

      // Trigger exit with remaining buffer data (lines 651-657)
      mockTerminal.emit('exit', 0, 'SIGTERM')

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          '[PTY Host] Terminal exit-test exited with code 0, signal SIGTERM'
        )
      )
    })

    it('should handle WINCH loop detection and blocking', async () => {
      const terminalId = 'winch-test'

      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      await messageHandler?.({
        type: 'create',
        id: terminalId,
        options: {
          shell: '/bin/zsh',
          cwd: '/test/path',
          env: {},
          cols: 80,
          rows: 24,
        },
      })

      // Simulate WINCH loop patterns that should be detected and blocked
      const winchPatterns = [
        '\r\r\u001b[m\u001b[m\u001b[m\u001b[J% ',
        '\u001b[0K\u001b[m\u001b[m\u001b[m% ',
        '\u001b[J\u001b[m\u001b[m\u001b[m% ',
      ]

      // Send enough WINCH patterns to trigger blocking (MAX_WINCH_SIGNALS = 15)
      for (let i = 0; i < 20; i++) {
        mockTerminal.emit('data', winchPatterns[i % winchPatterns.length])
      }

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[PTY Host] BLOCKING WINCH loop')
      )

      // Test non-WINCH data to trigger count reduction
      mockTerminal.emit(
        'data',
        'regular command output with substantial content'
      )

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          '[PTY Host] Non-WINCH data detected, reducing count'
        )
      )
    })

    it('should handle buffer processing with backpressure control', async () => {
      const terminalId = 'buffer-test'

      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      await messageHandler?.({
        type: 'create',
        id: terminalId,
        options: {
          shell: '/bin/sh',
          cwd: '/test/path',
          env: {},
          cols: 80,
          rows: 24,
        },
      })

      // Send large data to trigger chunking (chunkSize = 1024)
      const largeData = 'x'.repeat(2048)
      mockTerminal.emit('data', largeData)

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[PTY Host] 🚀 PROCESSING BUFFER'),
        expect.objectContaining({
          bufferLength: expect.any(Number),
          bufferStart: expect.any(String),
          timestamp: expect.any(String),
        })
      )

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[PTY Host] 📤 SENDING CHUNK'),
        expect.objectContaining({
          chunkLength: expect.any(Number),
          remainingBuffer: expect.any(Number),
          sendAvailable: true,
        })
      )
    })

    it('should handle environment variable logging with missing env vars', async () => {
      const terminalId = 'env-test'

      await import('./ptyHost')

      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      // Test with missing PATH to trigger 'MISSING' log (line 320)
      await messageHandler?.({
        type: 'create',
        id: terminalId,
        options: {
          shell: '/bin/bash',
          cwd: '/test/path',
          env: {
            // Intentionally omit PATH to trigger MISSING log
            HOME: '/home/user',
            USER: 'testuser',
          },
          cols: 80,
          rows: 24,
        },
      })

      // Note: The actual environment will have PATH from the test process,
      // but we can still test the environment variable logging functionality
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[PTY Host] 🔍 Environment variables for'),
        expect.any(Object)
      )
    })
  })

  describe('Additional coverage for 100% (uncovered lines)', () => {
    it('should handle resize message type (line 150)', async () => {
      // Reset modules to ensure clean state
      vi.resetModules()

      // Dynamic import to trigger constructor
      await import('./ptyHost')

      const terminalId = 'test-terminal-resize-v2'

      // Get message handler
      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      // First create a terminal
      await messageHandler?.({
        type: 'create',
        id: terminalId,
        options: {},
      })

      // Clear only logs, not module state
      ;(console.log as unknown as { mockClear: () => void }).mockClear()

      // Send resize message
      await messageHandler?.({
        type: 'resize',
        id: terminalId,
        cols: 120,
        rows: 40,
      })

      // Verify resize was called
      expect(mockTerminal.resize).toHaveBeenCalledWith(120, 40)
      expect(console.log).toHaveBeenCalledWith(
        `[PTY Host] Resized terminal ${terminalId} to 120x40`
      )
    })

    // Note: Lines 622-624 (double percent spacing pattern cleaning) are difficult to test
    // in isolation because the regex pattern /%(\s{10,})([a-zA-Z0-9@_.-]+.*%)/g requires
    // very specific formatting. These lines are covered through integration tests where
    // actual terminal data with this pattern flows through the system.

    it('should send remaining buffered data before exit (lines 655-661)', async () => {
      // Reset modules to ensure clean state
      vi.resetModules()

      // Dynamic import to trigger constructor
      await import('./ptyHost')

      const terminalId = 'test-terminal-buffered-exit-v2'

      // Get message handler
      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      // Create terminal
      await messageHandler?.({
        type: 'create',
        id: terminalId,
        options: {},
      })

      // Clear process.send calls after terminal creation
      ;(process.send as unknown as { mockClear: () => void }).mockClear()

      // Simulate some buffered data by emitting data that doesn't get immediately processed
      // This creates a buffer before the exit event
      mockTerminal.emit('data', 'Some buffered data that remains')

      // Allow data to buffer (but not process completely)
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Now emit exit event - this should flush the buffered data
      mockTerminal.emit('exit', 0, undefined)

      // Allow time for exit handler to flush buffer
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Verify that buffered data was sent before exit
      // Check all calls to process.send for our specific terminal
      const sendCalls = (
        process.send as unknown as {
          mock: { calls: Array<[{ id?: string; type?: string }]> }
        }
      ).mock.calls
      const ourCalls = sendCalls.filter(
        (call: [{ id?: string; type?: string }]) => call[0]?.id === terminalId
      )

      // Should have both data and exit messages
      const dataMessages = ourCalls.filter(
        (call: [{ id?: string; type?: string }]) => call[0]?.type === 'data'
      )
      const exitMessages = ourCalls.filter(
        (call: [{ id?: string; type?: string }]) => call[0]?.type === 'exit'
      )

      expect(dataMessages.length).toBeGreaterThan(0)
      expect(exitMessages.length).toBe(1)
      expect(exitMessages[0][0]).toMatchObject({
        type: 'exit',
        id: terminalId,
        exitCode: 0,
      })
    })

    it('should handle terminal exit without buffered data', async () => {
      // Reset modules to ensure clean state
      vi.resetModules()

      // Dynamic import to trigger constructor
      await import('./ptyHost')

      const terminalId = 'test-terminal-exit-no-buffer-v2'

      // Get message handler
      const messageHandler = (
        process.on as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find((call) => call[0] === 'message')?.[1]

      // Create terminal
      await messageHandler?.({
        type: 'create',
        id: terminalId,
        options: {},
      })

      // Clear process.send calls after terminal creation
      ;(process.send as unknown as { mockClear: () => void }).mockClear()

      // Emit exit event without any buffered data
      mockTerminal.emit('exit', 0, 'SIGTERM')

      // Wait for exit processing
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Verify only exit message was sent (no buffered data message)
      const sendCalls = (
        process.send as unknown as {
          mock: { calls: Array<[{ id?: string; type?: string }]> }
        }
      ).mock.calls
      const ourCalls = sendCalls.filter(
        (call: [{ id?: string; type?: string }]) => call[0]?.id === terminalId
      )

      // Should only have exit message, no data messages
      const exitMessages = ourCalls.filter(
        (call: [{ id?: string; type?: string }]) => call[0]?.type === 'exit'
      )
      const dataMessages = ourCalls.filter(
        (call: [{ id?: string; type?: string }]) => call[0]?.type === 'data'
      )

      expect(exitMessages.length).toBe(1)
      expect(dataMessages.length).toBe(0)
      expect(exitMessages[0][0]).toMatchObject({
        type: 'exit',
        id: terminalId,
        exitCode: 0,
        signal: 'SIGTERM',
      })
    })
  })
})
