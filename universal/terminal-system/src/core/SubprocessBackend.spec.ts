/**
 * @fileoverview Test suite for SubprocessBackend functionality.
 *
 * @description
 * Comprehensive tests for the SubprocessBackend class that provides fallback terminal functionality
 * using Node.js child_process when PTY is not available, with cross-platform shell support.
 *
 * @example
 * ```typescript
 * // Testing Subprocess backend availability
 * const backend = new SubprocessBackend()
 * const isAvailable = await backend.isAvailable()
 * expect(isAvailable).toBe(true) // Always available as fallback
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { SubprocessBackend } from './SubprocessBackend'
import type { BackendSpawnOptions, BackendProcess } from './TerminalBackend'

// Mock dependencies with vi.hoisted
const subprocessBackendMocks = vi.hoisted(() => {
  const mockEventEmitter = {
    on: vi.fn(),
    emit: vi.fn(),
    removeListener: vi.fn(),
    removeAllListeners: vi.fn(),
  }

  return {
    platform: vi.fn(() => 'linux'),
    mockChildProcess: {
      pid: 12345,
      stdout: mockEventEmitter,
      stderr: mockEventEmitter,
      stdin: {
        write: vi.fn(),
        destroyed: false,
      },
      on: vi.fn(),
      kill: vi.fn(),
    },
    spawn: vi.fn(),
    platformUtils: {
      getDefaultShell: vi.fn(() => '/bin/bash'),
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
      platform: subprocessBackendMocks.platform,
    }
  },
  { virtual: false }
)

vi.mock(
  'node:child_process',
  async (importOriginal) => {
    const actual = await importOriginal()
    return {
      ...actual,
      spawn: subprocessBackendMocks.spawn,
    }
  },
  { virtual: false }
)

vi.mock('../../utils/platform', () => ({
  PlatformUtils: subprocessBackendMocks.platformUtils,
}))

describe('SubprocessBackend', () => {
  let backend: SubprocessBackend
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
    subprocessBackendMocks.platform.mockReturnValue('linux')

    // Ensure mockChildProcess has a valid PID
    subprocessBackendMocks.mockChildProcess.pid = 12345
    subprocessBackendMocks.spawn.mockReturnValue(
      subprocessBackendMocks.mockChildProcess
    )

    subprocessBackendMocks.platformUtils.getDefaultShell.mockReturnValue(
      '/bin/bash'
    )
    subprocessBackendMocks.platformUtils.getHomeDirectory.mockReturnValue(
      '/home/user'
    )

    backend = new SubprocessBackend()
  })

  afterEach(() => {
    vi.clearAllMocks()
    global.process = originalProcess
  })

  describe('Constructor and capabilities', () => {
    it('should create SubprocessBackend with proper capabilities', () => {
      expect(backend).toBeInstanceOf(SubprocessBackend)
      expect(backend.capabilities).toEqual({
        backend: 'subprocess',
        supportsResize: false,
        supportsColors: true,
        supportsInteractivity: true,
        supportsHistory: true,
        reliability: 'medium',
      })
    })

    it('should have correct name', () => {
      expect(backend.name).toBe('subprocess')
    })
  })

  describe('Availability detection', () => {
    it('should always return true (subprocess is always available)', async () => {
      const isAvailable = await backend.isAvailable()
      expect(isAvailable).toBe(true)
    })
  })

  describe('Process spawning', () => {
    it('should spawn process with default options', async () => {
      const options: BackendSpawnOptions = {}

      const spawnedProcess = await backend.spawn(options)

      expect(spawnedProcess.pid).toBe(12345)
      expect(subprocessBackendMocks.spawn).toHaveBeenCalledWith(
        '/bin/bash',
        ['--login', '-i'],
        expect.objectContaining({
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: '/home/user',
          env: expect.objectContaining({
            PATH: '/usr/bin',
            HOME: '/home/user',
          }),
          shell: false,
        })
      )
    })

    it('should spawn process with custom options', async () => {
      const options: BackendSpawnOptions = {
        shell: '/bin/zsh',
        cwd: '/custom/path',
        env: { CUSTOM_VAR: 'value' },
      }

      const spawnedProcess = await backend.spawn(options)

      expect(spawnedProcess.pid).toBe(12345)
      expect(subprocessBackendMocks.spawn).toHaveBeenCalledWith(
        '/bin/zsh',
        ['--login', '-i'],
        expect.objectContaining({
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: '/custom/path',
          env: expect.objectContaining({
            PATH: '/usr/bin',
            HOME: '/home/user',
            CUSTOM_VAR: 'value',
          }),
          shell: false,
        })
      )
    })

    it('should throw error when process has no PID', async () => {
      // Mock spawn to return a child process without pid
      subprocessBackendMocks.spawn.mockReturnValue({
        ...subprocessBackendMocks.mockChildProcess,
        pid: undefined,
      })

      await expect(backend.spawn({})).rejects.toThrow(
        'Failed to spawn subprocess: no PID'
      )
    })

    it('should handle spawn errors', async () => {
      const error = new Error('ENOENT: no such file or directory')
      subprocessBackendMocks.spawn.mockImplementation(() => {
        throw error
      })

      await expect(backend.spawn({})).rejects.toThrow(
        'ENOENT: no such file or directory'
      )
    })
  })

  describe('Shell arguments', () => {
    it('should use bash args when default shell is bash', async () => {
      subprocessBackendMocks.platformUtils.getDefaultShell.mockReturnValue(
        '/bin/bash'
      )

      await backend.spawn({ shell: '/custom/shell' })

      expect(subprocessBackendMocks.spawn).toHaveBeenCalledWith(
        '/custom/shell',
        ['--login', '-i'],
        expect.any(Object)
      )
    })

    it('should use zsh args when default shell is zsh', async () => {
      subprocessBackendMocks.platformUtils.getDefaultShell.mockReturnValue(
        '/bin/zsh'
      )

      await backend.spawn({ shell: '/custom/shell' })

      expect(subprocessBackendMocks.spawn).toHaveBeenCalledWith(
        '/custom/shell',
        ['-l', '-i'],
        expect.any(Object)
      )
    })

    it('should use fish args when default shell is fish', async () => {
      subprocessBackendMocks.platformUtils.getDefaultShell.mockReturnValue(
        '/usr/local/bin/fish'
      )

      await backend.spawn({ shell: '/custom/shell' })

      expect(subprocessBackendMocks.spawn).toHaveBeenCalledWith(
        '/custom/shell',
        ['--login', '--interactive'],
        expect.any(Object)
      )
    })

    it('should use empty args when default shell is unknown', async () => {
      subprocessBackendMocks.platformUtils.getDefaultShell.mockReturnValue(
        '/bin/dash'
      )

      await backend.spawn({ shell: '/custom/shell' })

      expect(subprocessBackendMocks.spawn).toHaveBeenCalledWith(
        '/custom/shell',
        [],
        expect.any(Object)
      )
    })

    describe('Windows shell handling', () => {
      beforeEach(() => {
        subprocessBackendMocks.platform.mockReturnValue('win32')
      })

      it('should use PowerShell args for PowerShell variants', async () => {
        const variants = [
          'powershell.exe',
          'powershell',
          'pwsh.exe',
          'pwsh',
          'Windows PowerShell',
        ]

        for (const variant of variants) {
          subprocessBackendMocks.platformUtils.getDefaultShell.mockReturnValue(
            variant
          )

          await backend.spawn({ shell: 'custom.exe' })

          expect(subprocessBackendMocks.spawn).toHaveBeenCalledWith(
            'custom.exe',
            ['-NoLogo', '-NoProfile', '-Interactive'],
            expect.any(Object)
          )
        }
      })

      it('should use CMD args for CMD variants', async () => {
        const variants = ['cmd.exe', 'cmd', 'command.com']

        for (const variant of variants) {
          subprocessBackendMocks.platformUtils.getDefaultShell.mockReturnValue(
            variant
          )

          await backend.spawn({ shell: 'custom.exe' })

          expect(subprocessBackendMocks.spawn).toHaveBeenCalledWith(
            'custom.exe',
            ['/Q', '/K'],
            expect.any(Object)
          )
        }
      })

      it('should use empty args for unknown Windows shells', async () => {
        subprocessBackendMocks.platformUtils.getDefaultShell.mockReturnValue(
          'unknown.exe'
        )

        await backend.spawn({ shell: 'custom.exe' })

        expect(subprocessBackendMocks.spawn).toHaveBeenCalledWith(
          'custom.exe',
          [],
          expect.any(Object)
        )
      })
    })
  })

  describe('SubprocessProcess wrapper', () => {
    let backendProcess: BackendProcess

    beforeEach(async () => {
      // Ensure stdin mock is properly set up
      subprocessBackendMocks.mockChildProcess.stdin = {
        write: vi.fn(),
        destroyed: false,
      }
      backendProcess = await backend.spawn({})
    })

    it('should emit data events from stdout', () => {
      const dataSpy = vi.fn()
      backendProcess.on('data', dataSpy)

      // Get the stdout data handler
      const stdoutCall =
        subprocessBackendMocks.mockChildProcess.stdout.on.mock.calls.find(
          (call) => call[0] === 'data'
        )
      expect(stdoutCall).toBeDefined()

      const stdoutHandler = stdoutCall[1]
      stdoutHandler(Buffer.from('Hello from stdout'))

      expect(dataSpy).toHaveBeenCalledWith('Hello from stdout')
    })

    it('should emit data events from stderr', () => {
      const dataSpy = vi.fn()
      backendProcess.on('data', dataSpy)

      // Get the stderr data handler
      const stderrCall =
        subprocessBackendMocks.mockChildProcess.stderr.on.mock.calls.find(
          (call) => call[0] === 'data'
        )
      expect(stderrCall).toBeDefined()

      const stderrHandler = stderrCall[1]
      stderrHandler(Buffer.from('Error from stderr'))

      expect(dataSpy).toHaveBeenCalledWith('Error from stderr')
    })

    it('should process output for cross-platform compatibility', () => {
      const dataSpy = vi.fn()
      backendProcess.on('data', dataSpy)

      // Get the stdout data handler
      const stdoutCall =
        subprocessBackendMocks.mockChildProcess.stdout.on.mock.calls.find(
          (call) => call[0] === 'data'
        )
      const stdoutHandler = stdoutCall[1]
      stdoutHandler(Buffer.from('Line 1\r\nLine 2\r'))

      expect(dataSpy).toHaveBeenCalledWith('Line 1\nLine 2')
    })

    it('should emit exit events from child process', () => {
      const exitSpy = vi.fn()
      backendProcess.on('exit', exitSpy)

      // Find the exit event handler
      const exitCall =
        subprocessBackendMocks.mockChildProcess.on.mock.calls.find(
          (call) => call[0] === 'exit'
        )
      expect(exitCall).toBeDefined()

      const exitHandler = exitCall[1]
      exitHandler(0)

      expect(exitSpy).toHaveBeenCalledWith({ exitCode: 0 })
    })

    it('should handle null exit code', () => {
      const exitSpy = vi.fn()
      backendProcess.on('exit', exitSpy)

      const exitCall =
        subprocessBackendMocks.mockChildProcess.on.mock.calls.find(
          (call) => call[0] === 'exit'
        )
      const exitHandler = exitCall[1]
      exitHandler(null)

      expect(exitSpy).toHaveBeenCalledWith({ exitCode: 0 })
    })

    it('should emit error events from child process', () => {
      const errorSpy = vi.fn()
      backendProcess.on('error', errorSpy)

      const errorCall =
        subprocessBackendMocks.mockChildProcess.on.mock.calls.find(
          (call) => call[0] === 'error'
        )
      expect(errorCall).toBeDefined()

      const errorHandler = errorCall[1]
      const error = new Error('Child process error')
      errorHandler(error)

      expect(errorSpy).toHaveBeenCalledWith(error)
    })

    it('should write data to child process stdin', () => {
      backendProcess.write('echo hello\n')

      expect(
        subprocessBackendMocks.mockChildProcess.stdin.write
      ).toHaveBeenCalledWith('echo hello\n')
    })

    it('should not write when stdin is destroyed', () => {
      subprocessBackendMocks.mockChildProcess.stdin.destroyed = true

      backendProcess.write('test data')

      expect(
        subprocessBackendMocks.mockChildProcess.stdin.write
      ).not.toHaveBeenCalled()
    })

    it('should handle null stdin gracefully', async () => {
      subprocessBackendMocks.mockChildProcess.stdin = null
      const processWithNullStdin = await backend.spawn({})

      expect(() => processWithNullStdin.write('test data')).not.toThrow()
    })

    it('should handle resize requests (not supported)', () => {
      expect(() => backendProcess.resize(120, 40)).not.toThrow()
      // Resize is not supported in subprocess mode, just logs
    })

    it('should kill child process with signal', () => {
      backendProcess.kill('SIGTERM')

      expect(subprocessBackendMocks.mockChildProcess.kill).toHaveBeenCalledWith(
        'SIGTERM'
      )
    })

    it('should kill child process with default signal', () => {
      backendProcess.kill()

      expect(subprocessBackendMocks.mockChildProcess.kill).toHaveBeenCalledWith(
        'SIGTERM'
      )
    })
  })

  describe('Environment handling', () => {
    it('should merge environment variables correctly', async () => {
      const options: BackendSpawnOptions = {
        env: {
          CUSTOM_VAR: 'custom_value',
          PATH: '/custom/path',
        },
      }

      await backend.spawn(options)

      expect(subprocessBackendMocks.spawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({
            PATH: '/custom/path', // Should override system PATH
            HOME: '/home/user', // Should inherit system HOME
            CUSTOM_VAR: 'custom_value', // Should add custom variable
          }),
        })
      )
    })
  })
})
