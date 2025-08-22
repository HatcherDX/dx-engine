/**
 * @fileoverview Comprehensive tests for watch.ts
 *
 * @description
 * Tests for the development watch script:
 * - Turbo command argument building
 * - Watch mode detection from CLI arguments
 * - Turbo process spawning and management
 * - Signal handling for graceful shutdown
 * - Error handling and process exit codes
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest'
import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'

// Mock child_process
vi.mock('child_process')

// Import functions from watch.ts
import {
  buildTurboArgs,
  isWatchMode,
  startTurbo,
  handleShutdown,
  registerSignalHandlers,
  main,
  state,
  WatchConfig,
} from './watch'

// Mock ChildProcess class
class MockChildProcess extends EventEmitter {
  kill: Mock

  constructor() {
    super()
    this.kill = vi.fn()
  }
}

describe('Watch Script', () => {
  let consoleLogSpy: Mock
  let consoleErrorSpy: Mock
  let processExitSpy: Mock
  let processOnSpy: Mock
  let processArgvBackup: string[]
  let mockTurboProcess: MockChildProcess

  beforeEach(() => {
    // Reset state
    state.turboProcess = null
    state.isWatchMode = false

    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Mock process methods
    processExitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((code?: number) => {
        throw new Error(`Process exit with code ${code}`)
      })

    processOnSpy = vi.spyOn(process, 'on')

    // Backup process.argv
    processArgvBackup = [...process.argv]

    // Create mock turbo process
    mockTurboProcess = new MockChildProcess()

    // Mock spawn to return our mock process
    vi.mocked(spawn).mockReturnValue(mockTurboProcess as any)
  })

  afterEach(() => {
    process.argv = processArgvBackup
    vi.restoreAllMocks()
  })

  describe('buildTurboArgs Function', () => {
    it('should build default arguments with parallel mode', () => {
      const args = buildTurboArgs()
      expect(args).toEqual(['run', 'dev', '--parallel'])
    })

    it('should add watch flag when watch is enabled', () => {
      const args = buildTurboArgs({ watch: true })
      expect(args).toEqual(['run', 'dev', '--parallel', '--watch'])
    })

    it('should exclude parallel flag when disabled', () => {
      const args = buildTurboArgs({ parallel: false })
      expect(args).toEqual(['run', 'dev'])
    })

    it('should combine watch and non-parallel modes', () => {
      const args = buildTurboArgs({ watch: true, parallel: false })
      expect(args).toEqual(['run', 'dev', '--watch'])
    })
  })

  describe('isWatchMode Function', () => {
    it('should detect --watch flag in arguments', () => {
      const argv = ['node', 'script.ts', '--watch']
      expect(isWatchMode(argv)).toBe(true)
    })

    it('should return false when --watch is not present', () => {
      const argv = ['node', 'script.ts', '--verbose']
      expect(isWatchMode(argv)).toBe(false)
    })

    it('should detect --watch flag regardless of position', () => {
      const argv = ['node', '--watch', 'script.ts', '--verbose']
      expect(isWatchMode(argv)).toBe(true)
    })

    it('should use process.argv by default', () => {
      process.argv = ['node', 'script.ts', '--watch']
      expect(isWatchMode()).toBe(true)

      process.argv = ['node', 'script.ts']
      expect(isWatchMode()).toBe(false)
    })
  })

  describe('startTurbo Function', () => {
    it('should spawn turbo with correct arguments', () => {
      const config: WatchConfig = {
        watch: false,
        parallel: true,
        stdio: 'inherit',
        cwd: '/test/dir',
      }

      startTurbo(config)

      expect(spawn).toHaveBeenCalledWith(
        'turbo',
        ['run', 'dev', '--parallel'],
        {
          stdio: 'inherit',
          cwd: '/test/dir',
          shell: true,
        }
      )
      expect(state.turboProcess).toBe(mockTurboProcess)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🚀 Starting DX Engine development environment...'
      )
    })

    it('should log watch mode message when enabled', () => {
      startTurbo({ watch: true })

      expect(consoleLogSpy).toHaveBeenCalledWith('👀 Watch mode enabled')
      expect(state.isWatchMode).toBe(true)
    })

    it('should use default values when config is empty', () => {
      startTurbo()

      expect(spawn).toHaveBeenCalledWith(
        'turbo',
        ['run', 'dev', '--parallel'],
        {
          stdio: 'inherit',
          cwd: process.cwd(),
          shell: true,
        }
      )
    })

    it('should respect shell option', () => {
      startTurbo({ shell: false })

      expect(spawn).toHaveBeenCalledWith(
        'turbo',
        expect.any(Array),
        expect.objectContaining({
          shell: false,
        })
      )
    })

    it('should handle turbo process error', () => {
      startTurbo()

      const error = new Error('Command not found')

      expect(() => {
        mockTurboProcess.emit('error', error)
      }).toThrow('Process exit with code 1')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Failed to start turbo:',
        'Command not found'
      )
    })

    it('should handle turbo process exit with code', () => {
      startTurbo()

      expect(() => {
        mockTurboProcess.emit('exit', 0)
      }).toThrow('Process exit with code 0')

      expect(consoleLogSpy).toHaveBeenCalledWith('🏁 Turbo exited with code 0')
    })

    it('should handle turbo process exit with non-zero code', () => {
      startTurbo()

      expect(() => {
        mockTurboProcess.emit('exit', 1)
      }).toThrow('Process exit with code 1')

      expect(consoleLogSpy).toHaveBeenCalledWith('🏁 Turbo exited with code 1')
    })

    it('should handle null exit code', () => {
      startTurbo()

      expect(() => {
        mockTurboProcess.emit('exit', null)
      }).toThrow('Process exit with code 0')

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🏁 Turbo exited with code null'
      )
    })
  })

  describe('handleShutdown Function', () => {
    it('should kill turbo process on SIGINT', () => {
      state.turboProcess = mockTurboProcess as any

      handleShutdown('SIGINT')

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '\n⏹️  Shutting down development environment (SIGINT)...'
      )
      expect(mockTurboProcess.kill).toHaveBeenCalledWith('SIGINT')
    })

    it('should kill turbo process on SIGTERM', () => {
      state.turboProcess = mockTurboProcess as any

      handleShutdown('SIGTERM')

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '\n⏹️  Shutting down development environment (SIGTERM)...'
      )
      expect(mockTurboProcess.kill).toHaveBeenCalledWith('SIGTERM')
    })

    it('should handle case when turbo process is not running', () => {
      state.turboProcess = null

      handleShutdown('SIGINT')

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '\n⏹️  Shutting down development environment (SIGINT)...'
      )
      // Should not throw error
    })

    it('should work with different signals', () => {
      state.turboProcess = mockTurboProcess as any

      handleShutdown('SIGUSR1')

      expect(mockTurboProcess.kill).toHaveBeenCalledWith('SIGUSR1')
    })
  })

  describe('registerSignalHandlers Function', () => {
    it('should register SIGINT handler', () => {
      registerSignalHandlers()

      expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function))
    })

    it('should register SIGTERM handler', () => {
      registerSignalHandlers()

      expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function))
    })

    it('should call handleShutdown when SIGINT is received', () => {
      registerSignalHandlers()

      // Get the SIGINT handler
      const sigintHandler = processOnSpy.mock.calls.find(
        (call) => call[0] === 'SIGINT'
      )?.[1] as Function

      state.turboProcess = mockTurboProcess as any

      sigintHandler()

      expect(mockTurboProcess.kill).toHaveBeenCalledWith('SIGINT')
    })

    it('should call handleShutdown when SIGTERM is received', () => {
      registerSignalHandlers()

      // Get the SIGTERM handler
      const sigtermHandler = processOnSpy.mock.calls.find(
        (call) => call[0] === 'SIGTERM'
      )?.[1] as Function

      state.turboProcess = mockTurboProcess as any

      sigtermHandler()

      expect(mockTurboProcess.kill).toHaveBeenCalledWith('SIGTERM')
    })
  })

  describe('main Function', () => {
    it('should start turbo and register signal handlers', () => {
      main()

      expect(spawn).toHaveBeenCalledWith(
        'turbo',
        ['run', 'dev', '--parallel'],
        expect.any(Object)
      )
      expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function))
      expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function))
    })

    it('should respect config options', () => {
      const config: WatchConfig = {
        watch: true,
        parallel: false,
      }

      main(config)

      expect(spawn).toHaveBeenCalledWith(
        'turbo',
        ['run', 'dev', '--watch'],
        expect.any(Object)
      )
      expect(consoleLogSpy).toHaveBeenCalledWith('👀 Watch mode enabled')
    })

    it('should detect watch mode from argv', () => {
      const config: WatchConfig = {
        argv: ['node', 'script.ts', '--watch'],
      }

      main(config)

      expect(spawn).toHaveBeenCalledWith(
        'turbo',
        ['run', 'dev', '--parallel', '--watch'],
        expect.any(Object)
      )
      expect(state.isWatchMode).toBe(true)
    })

    it('should prefer config watch over argv', () => {
      const config: WatchConfig = {
        watch: false,
        argv: ['node', 'script.ts', '--watch'],
      }

      main(config)

      expect(spawn).toHaveBeenCalledWith(
        'turbo',
        ['run', 'dev', '--parallel'],
        expect.any(Object)
      )
      expect(state.isWatchMode).toBe(false)
    })

    it('should use argv watch when config watch is undefined', () => {
      const config: WatchConfig = {
        argv: ['node', 'script.ts', '--watch'],
      }

      main(config)

      expect(spawn).toHaveBeenCalledWith(
        'turbo',
        ['run', 'dev', '--parallel', '--watch'],
        expect.any(Object)
      )
    })
  })

  describe('Integration Tests', () => {
    it('should complete full startup and shutdown sequence', () => {
      main({ watch: true })

      // Verify turbo started
      expect(state.turboProcess).toBe(mockTurboProcess)
      expect(state.isWatchMode).toBe(true)

      // Get signal handler
      const sigintHandler = processOnSpy.mock.calls.find(
        (call) => call[0] === 'SIGINT'
      )?.[1] as Function

      // Trigger shutdown
      sigintHandler()

      expect(mockTurboProcess.kill).toHaveBeenCalledWith('SIGINT')
    })

    it('should handle turbo failure during startup', () => {
      main()

      expect(() => {
        mockTurboProcess.emit('error', new Error('turbo not found'))
      }).toThrow('Process exit with code 1')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Failed to start turbo:',
        'turbo not found'
      )
    })

    it('should handle turbo exit during operation', () => {
      main()

      expect(() => {
        mockTurboProcess.emit('exit', 130)
      }).toThrow('Process exit with code 130')

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🏁 Turbo exited with code 130'
      )
    })

    it('should handle multiple configuration sources', () => {
      process.argv = ['node', 'script.ts', '--watch']

      const config: WatchConfig = {
        parallel: false,
        stdio: 'pipe',
        cwd: '/custom/dir',
      }

      main(config)

      expect(spawn).toHaveBeenCalledWith('turbo', ['run', 'dev', '--watch'], {
        stdio: 'pipe',
        cwd: '/custom/dir',
        shell: true,
      })
    })

    it('should maintain state consistency', () => {
      expect(state.turboProcess).toBe(null)
      expect(state.isWatchMode).toBe(false)

      main({ watch: true })

      expect(state.turboProcess).toBe(mockTurboProcess)
      expect(state.isWatchMode).toBe(true)

      // Simulate shutdown
      handleShutdown('SIGTERM')

      expect(mockTurboProcess.kill).toHaveBeenCalledWith('SIGTERM')
      // State should still reference the process
      expect(state.turboProcess).toBe(mockTurboProcess)
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined config in main', () => {
      main(undefined)

      expect(spawn).toHaveBeenCalled()
      expect(processOnSpy).toHaveBeenCalled()
    })

    it('should handle empty argv array', () => {
      expect(isWatchMode([])).toBe(false)
    })

    it('should handle turbo error with non-Error object', () => {
      startTurbo()

      expect(() => {
        mockTurboProcess.emit('error', 'string error' as any)
      }).toThrow('Process exit with code 1')
    })

    it('should handle rapid successive signals', () => {
      state.turboProcess = mockTurboProcess as any

      handleShutdown('SIGINT')
      handleShutdown('SIGTERM')
      handleShutdown('SIGINT')

      expect(mockTurboProcess.kill).toHaveBeenCalledTimes(3)
    })

    it('should handle special characters in cwd', () => {
      const config: WatchConfig = {
        cwd: '/path with spaces/and-special!@#chars',
      }

      startTurbo(config)

      expect(spawn).toHaveBeenCalledWith(
        'turbo',
        expect.any(Array),
        expect.objectContaining({
          cwd: '/path with spaces/and-special!@#chars',
        })
      )
    })
  })
})
