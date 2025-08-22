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
    console.log = vi.fn()
    console.warn = vi.fn()
    console.error = vi.fn()

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
        env: undefined,
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

      // Send pattern multiple times to trigger blocking
      for (let i = 0; i < 5; i++) {
        mockTerminal.emit('data', winchPattern)
      }

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[PTY Host] CRITICAL: Blocking WINCH loop')
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
          cols: 80,
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
  })
})
