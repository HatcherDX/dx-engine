/**
 * @fileoverview Test suite for NodePtyBackend functionality.
 *
 * @description
 * Comprehensive tests for the NodePtyBackend class that provides full PTY functionality
 * with native terminal support using the node-pty library for cross-platform compatibility.
 *
 * @example
 * ```typescript
 * // Testing NodePty backend availability
 * const backend = new NodePtyBackend()
 * const isAvailable = await backend.isAvailable()
 * expect(isAvailable).toBe(true)
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { NodePtyBackend } from './NodePtyBackend'
import type { BackendSpawnOptions, BackendProcess } from './TerminalBackend'

// Mock dependencies with vi.hoisted
const nodePtyBackendMocks = vi.hoisted(() => {
  return {
    platform: vi.fn(() => 'linux'),
    release: vi.fn(() => '10.0.19041'),
    mockPtyProcess: {
      pid: 12345,
      onData: vi.fn(),
      onExit: vi.fn(),
      onError: vi.fn(),
      write: vi.fn(),
      resize: vi.fn(),
      kill: vi.fn(),
    },
    mockNodePty: {
      spawn: vi.fn(),
    },
    platformUtils: {
      getDefaultShell: vi.fn(() => '/bin/bash'),
      getShellArgs: vi.fn(() => ['-l']),
      getHomeDirectory: vi.fn(() => '/home/user'),
    },
  }
})

vi.mock(
  'node:os',
  async (importOriginal) => {
    const actual = await importOriginal()
    return {
      ...actual,
      platform: nodePtyBackendMocks.platform,
      release: nodePtyBackendMocks.release,
    }
  },
  { virtual: false }
)

vi.mock('../../utils/platform', () => ({
  PlatformUtils: nodePtyBackendMocks.platformUtils,
}))

/**
 * Mock node-pty module for testing PTY operations.
 *
 * @remarks
 * Provides mock implementation of node-pty library for testing
 * backend process spawning and PTY functionality without real processes.
 *
 * @public
 * @since 1.0.0
 */
vi.mock('node-pty', async () => {
  return {
    spawn: nodePtyBackendMocks.mockNodePty.spawn.mockReturnValue(
      nodePtyBackendMocks.mockPtyProcess
    ),
  }
})

describe('NodePtyBackend', () => {
  let backend: NodePtyBackend
  let originalProcess: typeof process

  beforeEach(() => {
    originalProcess = global.process

    // Mock process for platform detection
    global.process = {
      ...originalProcess,
      platform: 'linux',
      cwd: vi.fn(() => '/home/user'),
      env: { PATH: '/usr/bin', HOME: '/home/user' },
    } as NodeJS.Process

    // Reset all mocks
    vi.clearAllMocks()

    // Reset mock implementations
    nodePtyBackendMocks.platform.mockReturnValue('linux')
    nodePtyBackendMocks.release.mockReturnValue('10.0.19041')
    nodePtyBackendMocks.mockPtyProcess.pid = 12345 // Ensure PID is reset
    nodePtyBackendMocks.mockNodePty.spawn.mockReturnValue(
      nodePtyBackendMocks.mockPtyProcess
    )

    backend = new NodePtyBackend()
  })

  afterEach(() => {
    vi.clearAllMocks()
    global.process = originalProcess
  })

  describe('Constructor and capabilities', () => {
    /**
     * Tests NodePtyBackend construction and capabilities.
     *
     * @returns void
     * Should create backend with proper capabilities configuration
     *
     * @example
     * ```typescript
     * const backend = new NodePtyBackend()
     * expect(backend.capabilities.backend).toBe('node-pty')
     * expect(backend.capabilities.supportsResize).toBe(true)
     * ```
     *
     * @public
     */
    it('should create NodePtyBackend with proper capabilities', () => {
      expect(backend).toBeInstanceOf(NodePtyBackend)
      expect(backend.capabilities).toEqual({
        backend: 'node-pty',
        supportsResize: true,
        supportsColors: true,
        supportsInteractivity: true,
        supportsHistory: true,
        reliability: 'high',
      })
    })
  })

  describe('Availability detection', () => {
    /**
     * Tests successful availability detection.
     *
     * @returns Promise<void>
     * Should return true when node-pty is available and functional
     *
     * @example
     * ```typescript
     * const isAvailable = await backend.isAvailable()
     * expect(isAvailable).toBe(true)
     * expect(nodePtyBackendMocks.mockNodePty.spawn).toHaveBeenCalled()
     * ```
     *
     * @public
     */
    it('should return true when node-pty is available', async () => {
      const isAvailable = await backend.isAvailable()

      expect(isAvailable).toBe(true)
      expect(nodePtyBackendMocks.mockNodePty.spawn).toHaveBeenCalledWith(
        'echo',
        ['test'],
        expect.objectContaining({
          name: 'xterm-color',
          cols: 80,
          rows: 30,
          cwd: '/home/user',
        })
      )
      expect(nodePtyBackendMocks.mockPtyProcess.kill).toHaveBeenCalled()
    })

    /**
     * Tests availability detection failure.
     *
     * @returns Promise<void>
     * Should return false when node-pty is not available
     *
     * @example
     * ```typescript
     * nodePtyBackendMocks.mockNodePty.spawn.mockImplementation(() => { throw new Error('Not found') })
     * const isAvailable = await backend.isAvailable()
     * expect(isAvailable).toBe(false)
     * ```
     *
     * @public
     */
    it('should return false when node-pty is not available', async () => {
      nodePtyBackendMocks.mockNodePty.spawn.mockImplementation(() => {
        throw new Error('node-pty not found')
      })

      const isAvailable = await backend.isAvailable()

      expect(isAvailable).toBe(false)
    })

    /**
     * Tests error handling during availability check.
     *
     * @returns Promise<void>
     * Should handle module loading errors gracefully
     *
     * @example
     * ```typescript
     * vi.doMock('node-pty', () => { throw new Error('Module not found') })
     * const isAvailable = await backend.isAvailable()
     * expect(isAvailable).toBe(false)
     * ```
     *
     * @public
     */
    it('should handle import errors gracefully', async () => {
      // Mock import failure by throwing during spawn
      nodePtyBackendMocks.mockNodePty.spawn.mockImplementation(() => {
        throw new Error('Cannot find module node-pty')
      })

      const isAvailable = await backend.isAvailable()

      expect(isAvailable).toBe(false)
    })
  })

  describe('Process spawning', () => {
    /**
     * Tests successful process spawning with default options.
     *
     * @returns Promise<void>
     * Should spawn PTY process with platform-appropriate configuration
     *
     * @example
     * ```typescript
     * const process = await backend.spawn({})
     * expect(process.pid).toBe(12345)
     * expect(nodePtyBackendMocks.mockNodePty.spawn).toHaveBeenCalledWith('/bin/bash', ['-l'], expect.any(Object))
     * ```
     *
     * @public
     */
    it('should spawn process with default options', async () => {
      const options: BackendSpawnOptions = {}

      const spawnedProcess = await backend.spawn(options)

      expect(spawnedProcess.pid).toBe(12345)
      expect(nodePtyBackendMocks.mockNodePty.spawn).toHaveBeenCalledWith(
        '/bin/bash',
        ['-l'],
        expect.objectContaining({
          name: 'xterm-256color',
          cols: 80,
          rows: 24,
          cwd: '/home/user',
          env: expect.objectContaining({
            PATH: '/usr/bin',
            HOME: '/home/user',
          }),
        })
      )
    })

    /**
     * Tests process spawning with custom options.
     *
     * @returns Promise<void>
     * Should spawn PTY process with specified configuration
     *
     * @example
     * ```typescript
     * const options = { shell: '/bin/zsh', cwd: '/custom/path', cols: 120, rows: 40 }
     * const process = await backend.spawn(options)
     * expect(nodePtyBackendMocks.mockNodePty.spawn).toHaveBeenCalledWith('/bin/zsh', ['-l'], expect.objectContaining(options))
     * ```
     *
     * @public
     */
    it('should spawn process with custom options', async () => {
      const options: BackendSpawnOptions = {
        shell: '/bin/zsh',
        cwd: '/custom/path',
        env: { CUSTOM_VAR: 'value' },
        cols: 120,
        rows: 40,
      }

      const spawnedProcess = await backend.spawn(options)

      expect(spawnedProcess.pid).toBe(12345)
      expect(nodePtyBackendMocks.mockNodePty.spawn).toHaveBeenCalledWith(
        '/bin/zsh',
        ['-l'],
        expect.objectContaining({
          name: 'xterm-256color',
          cols: 120,
          rows: 40,
          cwd: '/custom/path',
          env: expect.objectContaining({
            PATH: '/usr/bin',
            HOME: '/home/user',
            CUSTOM_VAR: 'value',
          }),
        })
      )
    })

    /**
     * Tests Windows-specific ConPTY configuration.
     *
     * @returns Promise<void>
     * Should use ConPTY when available on Windows 10 1809+
     *
     * @example
     * ```typescript
     * nodePtyBackendMocks.platform.mockReturnValue('win32')
     * nodePtyBackendMocks.release.mockReturnValue('10.0.19041')
     * const process = await backend.spawn({})
     * expect(nodePtyBackendMocks.mockNodePty.spawn).toHaveBeenCalledWith(expect.any(String), expect.any(Array),
     *   expect.objectContaining({ useConpty: true }))
     * ```
     *
     * @public
     */
    it('should use ConPTY on Windows 10 1809+', async () => {
      nodePtyBackendMocks.platform.mockReturnValue('win32')
      nodePtyBackendMocks.release.mockReturnValue('10.0.19041') // Windows 10 build 19041
      nodePtyBackendMocks.platformUtils.getDefaultShell.mockReturnValue(
        'cmd.exe'
      )
      nodePtyBackendMocks.platformUtils.getShellArgs.mockReturnValue([])

      const spawnedProcess = await backend.spawn({})

      expect(spawnedProcess.pid).toBe(12345)
      expect(nodePtyBackendMocks.mockNodePty.spawn).toHaveBeenCalledWith(
        'cmd.exe',
        [],
        expect.objectContaining({
          useConpty: true,
        })
      )
    })

    /**
     * Tests Windows ConPTY detection for older versions.
     *
     * @returns Promise<void>
     * Should not use ConPTY on Windows versions before 1809
     *
     * @example
     * ```typescript
     * nodePtyBackendMocks.platform.mockReturnValue('win32')
     * nodePtyBackendMocks.release.mockReturnValue('10.0.17134') // Before ConPTY support
     * const process = await backend.spawn({})
     * expect(nodePtyBackendMocks.mockNodePty.spawn).not.toHaveBeenCalledWith(expect.any(String), expect.any(Array),
     *   expect.objectContaining({ useConpty: true }))
     * ```
     *
     * @public
     */
    it('should not use ConPTY on older Windows versions', async () => {
      nodePtyBackendMocks.platform.mockReturnValue('win32')
      nodePtyBackendMocks.release.mockReturnValue('10.0.17134') // Before ConPTY support (build 17763)
      nodePtyBackendMocks.platformUtils.getDefaultShell.mockReturnValue(
        'cmd.exe'
      )
      nodePtyBackendMocks.platformUtils.getShellArgs.mockReturnValue([])

      const spawnedProcess = await backend.spawn({})

      expect(spawnedProcess.pid).toBe(12345)
      expect(nodePtyBackendMocks.mockNodePty.spawn).toHaveBeenCalledWith(
        'cmd.exe',
        [],
        expect.objectContaining({
          useConpty: false,
        })
      )
    })

    /**
     * Tests error handling during process spawning.
     *
     * @throws {@link Error}
     * Should propagate spawn errors with proper logging
     *
     * @example
     * ```typescript
     * nodePtyBackendMocks.mockNodePty.spawn.mockImplementation(() => { throw new Error('Spawn failed') })
     * await expect(backend.spawn({})).rejects.toThrow('Spawn failed')
     * ```
     *
     * @public
     */
    it('should handle spawn errors', async () => {
      const error = new Error('Failed to spawn process')
      nodePtyBackendMocks.mockNodePty.spawn.mockImplementation(() => {
        throw error
      })

      await expect(backend.spawn({})).rejects.toThrow('Failed to spawn process')
    })
  })

  describe('NodePtyProcess wrapper', () => {
    let backendProcess: BackendProcess

    beforeEach(async () => {
      backendProcess = await backend.spawn({})
    })

    /**
     * Tests process data event handling.
     *
     * @returns void
     * Should emit data events from PTY process without modification
     *
     * @example
     * ```typescript
     * const dataSpy = vi.fn()
     * backendProcess.on('data', dataSpy)
     * const dataCallback = nodePtyBackendMocks.mockPtyProcess.onData.mock.calls[0][0]
     * dataCallback('Hello World')
     * expect(dataSpy).toHaveBeenCalledWith('Hello World')
     * ```
     *
     * @public
     */
    it('should emit data events from PTY process', () => {
      const dataSpy = vi.fn()
      backendProcess.on('data', dataSpy)

      // Get the data callback from the mock
      const dataCallback =
        nodePtyBackendMocks.mockPtyProcess.onData.mock.calls[0][0]
      dataCallback('Hello from terminal')

      expect(dataSpy).toHaveBeenCalledWith('Hello from terminal')
    })

    /**
     * Tests process exit event handling.
     *
     * @returns void
     * Should emit exit events with proper exit code
     *
     * @example
     * ```typescript
     * const exitSpy = vi.fn()
     * backendProcess.on('exit', exitSpy)
     * const exitCallback = nodePtyBackendMocks.mockPtyProcess.onExit.mock.calls[0][0]
     * exitCallback({ exitCode: 0 })
     * expect(exitSpy).toHaveBeenCalledWith({ exitCode: 0 })
     * ```
     *
     * @public
     */
    it('should emit exit events from PTY process', () => {
      const exitSpy = vi.fn()
      backendProcess.on('exit', exitSpy)

      // Get the exit callback from the mock
      const exitCallback =
        nodePtyBackendMocks.mockPtyProcess.onExit.mock.calls[0][0]
      exitCallback({ exitCode: 0 })

      expect(exitSpy).toHaveBeenCalledWith({ exitCode: 0 })
    })

    /**
     * Tests process error event handling.
     *
     * @returns void
     * Should emit error events when PTY process encounters errors
     *
     * @example
     * ```typescript
     * const errorSpy = vi.fn()
     * backendProcess.on('error', errorSpy)
     * const errorCallback = nodePtyBackendMocks.mockPtyProcess.onError.mock.calls[0][0]
     * const error = new Error('PTY error')
     * errorCallback(error)
     * expect(errorSpy).toHaveBeenCalledWith(error)
     * ```
     *
     * @public
     */
    it('should emit error events from PTY process', () => {
      const errorSpy = vi.fn()
      backendProcess.on('error', errorSpy)

      // Get the error callback from the mock
      const errorCallback =
        nodePtyBackendMocks.mockPtyProcess.onError.mock.calls[0][0]
      const error = new Error('PTY connection failed')
      errorCallback(error)

      expect(errorSpy).toHaveBeenCalledWith(error)
    })

    /**
     * Tests data writing to PTY process.
     *
     * @returns void
     * Should write data to underlying PTY process
     *
     * @example
     * ```typescript
     * backendProcess.write('echo hello\\r')
     * expect(nodePtyBackendMocks.mockPtyProcess.write).toHaveBeenCalledWith('echo hello\\r')
     * ```
     *
     * @public
     */
    it('should write data to PTY process', () => {
      backendProcess.write('echo hello\r')

      expect(nodePtyBackendMocks.mockPtyProcess.write).toHaveBeenCalledWith(
        'echo hello\r'
      )
    })

    /**
     * Tests PTY process resizing.
     *
     * @returns void
     * Should resize PTY process when resize method is available
     *
     * @example
     * ```typescript
     * backendProcess.resize(120, 40)
     * expect(nodePtyBackendMocks.mockPtyProcess.resize).toHaveBeenCalledWith(120, 40)
     * ```
     *
     * @public
     */
    it('should resize PTY process', () => {
      backendProcess.resize(120, 40)

      expect(nodePtyBackendMocks.mockPtyProcess.resize).toHaveBeenCalledWith(
        120,
        40
      )
    })

    /**
     * Tests resize handling when not supported.
     *
     * @returns void
     * Should handle missing resize method gracefully
     *
     * @example
     * ```typescript
     * nodePtyBackendMocks.mockPtyProcess.resize = undefined
     * expect(() => backendProcess.resize(80, 24)).not.toThrow()
     * ```
     *
     * @public
     */
    it('should handle missing resize method gracefully', async () => {
      // Create a new backend process without resize method
      nodePtyBackendMocks.mockPtyProcess.resize = undefined
      const processWithoutResize = await backend.spawn({})

      expect(() => processWithoutResize.resize(80, 24)).not.toThrow()
    })

    /**
     * Tests PTY process termination.
     *
     * @returns void
     * Should kill PTY process with optional signal
     *
     * @example
     * ```typescript
     * backendProcess.kill('SIGTERM')
     * expect(nodePtyBackendMocks.mockPtyProcess.kill).toHaveBeenCalledWith('SIGTERM')
     * ```
     *
     * @public
     */
    it('should kill PTY process', () => {
      backendProcess.kill('SIGTERM')

      expect(nodePtyBackendMocks.mockPtyProcess.kill).toHaveBeenCalledWith(
        'SIGTERM'
      )
    })

    /**
     * Tests PTY process termination without signal.
     *
     * @returns void
     * Should kill PTY process with default signal
     *
     * @example
     * ```typescript
     * backendProcess.kill()
     * expect(nodePtyBackendMocks.mockPtyProcess.kill).toHaveBeenCalledWith(undefined)
     * ```
     *
     * @public
     */
    it('should kill PTY process without signal', () => {
      backendProcess.kill()

      expect(nodePtyBackendMocks.mockPtyProcess.kill).toHaveBeenCalledWith(
        undefined
      )
    })
  })

  describe('Error handling', () => {
    /**
     * Tests error handling during data emission.
     *
     * @returns void
     * Should handle errors during data event emission gracefully
     *
     * @example
     * ```typescript
     * const backendProcess = await backend.spawn({})
     * backendProcess.emit = vi.fn(() => { throw new Error('Emit failed') })
     * const dataCallback = nodePtyBackendMocks.mockPtyProcess.onData.mock.calls[0][0]
     * expect(() => dataCallback('data')).not.toThrow()
     * ```
     *
     * @public
     */
    it('should handle data emission errors gracefully', async () => {
      const backendProcess = await backend.spawn({})

      // Mock emit to throw an error
      const originalEmit = backendProcess.emit
      backendProcess.emit = vi.fn(() => {
        throw new Error('Emit failed')
      })

      // Get the data callback and trigger it
      const dataCallback =
        nodePtyBackendMocks.mockPtyProcess.onData.mock.calls[0][0]

      // Should not throw
      expect(() => dataCallback('test data')).not.toThrow()

      // Restore original emit
      backendProcess.emit = originalEmit
    })

    /**
     * Tests handling PTY processes without error method.
     *
     * @returns void
     * Should handle PTY processes that don't support error events
     *
     * @example
     * ```typescript
     * nodePtyBackendMocks.mockPtyProcess.onError = undefined
     * const process = await backend.spawn({})
     * expect(process).toBeDefined()
     * expect(process.pid).toBe(12345)
     * ```
     *
     * @public
     */
    it('should handle PTY processes without error method', async () => {
      // Remove onError method
      nodePtyBackendMocks.mockPtyProcess.onError = undefined

      const spawnedProcess = await backend.spawn({})

      expect(spawnedProcess).toBeDefined()
      expect(spawnedProcess.pid).toBe(12345)
    })
  })

  describe('ConPTY detection', () => {
    /**
     * Tests ConPTY detection on Windows 11.
     *
     * @returns Promise<void>
     * Should enable ConPTY on Windows 11
     *
     * @example
     * ```typescript
     * nodePtyBackendMocks.platform.mockReturnValue('win32')
     * nodePtyBackendMocks.release.mockReturnValue('11.0.22000')
     * const process = await backend.spawn({})
     * expect(nodePtyBackendMocks.mockNodePty.spawn).toHaveBeenCalledWith(expect.any(String), expect.any(Array),
     *   expect.objectContaining({ useConpty: true }))
     * ```
     *
     * @public
     */
    it('should enable ConPTY on Windows 11', async () => {
      nodePtyBackendMocks.platform.mockReturnValue('win32')
      nodePtyBackendMocks.release.mockReturnValue('11.0.22000') // Windows 11
      nodePtyBackendMocks.platformUtils.getDefaultShell.mockReturnValue(
        'cmd.exe'
      )
      nodePtyBackendMocks.platformUtils.getShellArgs.mockReturnValue([])

      await backend.spawn({})

      expect(nodePtyBackendMocks.mockNodePty.spawn).toHaveBeenCalledWith(
        'cmd.exe',
        [],
        expect.objectContaining({
          useConpty: true,
        })
      )
    })

    /**
     * Tests ConPTY detection error handling.
     *
     * @returns Promise<void>
     * Should fallback to false when version parsing fails
     *
     * @example
     * ```typescript
     * nodePtyBackendMocks.platform.mockReturnValue('win32')
     * nodePtyBackendMocks.release.mockReturnValue('invalid-version')
     * const process = await backend.spawn({})
     * expect(nodePtyBackendMocks.mockNodePty.spawn).toHaveBeenCalledWith(expect.any(String), expect.any(Array),
     *   expect.objectContaining({ useConpty: false }))
     * ```
     *
     * @public
     */
    it('should handle ConPTY detection errors', async () => {
      nodePtyBackendMocks.platform.mockReturnValue('win32')
      nodePtyBackendMocks.release.mockReturnValue('invalid-version')
      nodePtyBackendMocks.platformUtils.getDefaultShell.mockReturnValue(
        'cmd.exe'
      )
      nodePtyBackendMocks.platformUtils.getShellArgs.mockReturnValue([])

      await backend.spawn({})

      expect(nodePtyBackendMocks.mockNodePty.spawn).toHaveBeenCalledWith(
        'cmd.exe',
        [],
        expect.objectContaining({
          useConpty: false,
        })
      )
    })
  })
})
