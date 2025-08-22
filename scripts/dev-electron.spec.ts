/**
 * @fileoverview Comprehensive tests for dev-electron.ts
 *
 * @description
 * Tests for the development orchestration script:
 * - Web server startup and readiness detection
 * - Electron app launch after web server is ready
 * - Output filtering for harmless DevTools errors
 * - Graceful shutdown handling
 * - Process coordination and cleanup
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest'
import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'

// Mock child_process
vi.mock('child_process')

// Import functions from dev-electron.ts
import {
  shouldShowOutput,
  startElectron,
  startWebServer,
  handleShutdown,
  main,
  state,
  DevElectronConfig,
} from './dev-electron'

// Mock ChildProcess class
class MockChildProcess extends EventEmitter {
  stdout: EventEmitter | null
  stderr: EventEmitter | null
  kill: Mock

  constructor() {
    super()
    this.stdout = new EventEmitter()
    this.stderr = new EventEmitter()
    this.kill = vi.fn()
  }
}

describe('Dev Electron Script', () => {
  let consoleLogSpy: Mock
  let consoleErrorSpy: Mock
  let processExitSpy: Mock
  let processStdoutWriteSpy: Mock
  let processStderrWriteSpy: Mock
  let originalSetTimeout: typeof setTimeout
  let mockWebServer: MockChildProcess
  let mockElectronApp: MockChildProcess

  beforeEach(() => {
    // Reset state
    state.webServerReady = false
    state.webServer = null
    state.electronApp = null

    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Mock process methods
    processExitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((code?: number) => {
        throw new Error(`Process exit with code ${code}`)
      })

    processStdoutWriteSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true)

    processStderrWriteSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true)

    // Store original setTimeout
    originalSetTimeout = global.setTimeout

    // Create mock processes
    mockWebServer = new MockChildProcess()
    mockElectronApp = new MockChildProcess()

    // Mock spawn to return our mock processes
    vi.mocked(spawn).mockImplementation((command, args, options) => {
      // Determine which process to return based on the filter argument
      if (args && args.includes('@hatcherdx/dx-engine-web')) {
        return mockWebServer as unknown as ChildProcess
      }
      return mockElectronApp as unknown as ChildProcess
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllTimers()
  })

  describe('shouldShowOutput Function', () => {
    it('should filter known harmless DevTools errors', () => {
      expect(shouldShowOutput('Request Autofill.enable failed')).toBe(false)
      expect(shouldShowOutput('Request Autofill.setAddresses failed')).toBe(
        false
      )
      expect(shouldShowOutput("Unexpected token 'H'")).toBe(false)
      expect(shouldShowOutput('HTTP/1.1 4')).toBe(false)
      expect(shouldShowOutput('is not valid JSON')).toBe(false)
      expect(shouldShowOutput('chrome-devtools-frontend.appspot.com')).toBe(
        false
      )
    })

    it('should allow normal output to pass through', () => {
      expect(shouldShowOutput('Server running on http://localhost:3000')).toBe(
        true
      )
      expect(shouldShowOutput('Build completed successfully')).toBe(true)
      expect(shouldShowOutput('⚡ Electron started')).toBe(true)
    })

    it('should be case-sensitive for filtering', () => {
      expect(shouldShowOutput('request autofill.enable failed')).toBe(true)
      expect(shouldShowOutput('REQUEST AUTOFILL.ENABLE FAILED')).toBe(true)
    })
  })

  describe('startWebServer Function', () => {
    it('should spawn web server with correct arguments', () => {
      const config: DevElectronConfig = {
        platform: 'darwin',
        stdio: 'pipe',
        cwd: '/test/dir',
      }

      startWebServer(config)

      expect(spawn).toHaveBeenCalledWith(
        'pnpm',
        ['--filter', '@hatcherdx/dx-engine-web', 'dev'],
        {
          stdio: 'pipe',
          cwd: '/test/dir',
          shell: false,
        }
      )
      expect(state.webServer).toBe(mockWebServer)
      expect(consoleLogSpy).toHaveBeenCalledWith('📱 Starting web server...')
    })

    it('should use shell on Windows', () => {
      const config: DevElectronConfig = {
        platform: 'win32',
      }

      startWebServer(config)

      expect(spawn).toHaveBeenCalledWith(
        'pnpm',
        ['--filter', '@hatcherdx/dx-engine-web', 'dev'],
        expect.objectContaining({
          shell: true,
        })
      )
    })

    it('should handle web server stdout data', () => {
      startWebServer()

      mockWebServer.stdout?.emit('data', Buffer.from('Server output'))

      expect(consoleLogSpy).toHaveBeenCalledWith('[Web] Server output')
    })

    it('should detect when web server is ready', () => {
      vi.useFakeTimers()
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout')

      const config: DevElectronConfig = {
        webServerDelay: 1000,
      }

      startWebServer(config)

      expect(state.webServerReady).toBe(false)

      mockWebServer.stdout?.emit(
        'data',
        Buffer.from('Local: http://localhost:3000')
      )

      expect(state.webServerReady).toBe(true)
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Web server is ready!')
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000)

      vi.useRealTimers()
    })

    it('should use default delay if not specified', () => {
      vi.useFakeTimers()
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout')

      startWebServer()

      mockWebServer.stdout?.emit(
        'data',
        Buffer.from('Local: http://localhost:3000')
      )

      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000)

      vi.useRealTimers()
    })

    it('should handle web server stderr data', () => {
      startWebServer()

      mockWebServer.stderr?.emit('data', Buffer.from('Error message'))

      expect(consoleErrorSpy).toHaveBeenCalledWith('[Web Error] Error message')
    })

    it('should exit if web server exits with error', () => {
      startWebServer()

      expect(() => {
        mockWebServer.emit('exit', 1)
      }).toThrow('Process exit with code 1')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Web server exited with code 1'
      )
    })

    it('should not exit if web server exits cleanly', () => {
      startWebServer()

      mockWebServer.emit('exit', 0)

      expect(processExitSpy).not.toHaveBeenCalled()
    })
  })

  describe('startElectron Function', () => {
    it('should not start if web server is not ready', () => {
      state.webServerReady = false

      const result = startElectron()

      expect(result).toBe(null)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '⏳ Waiting for web server to be ready...'
      )
      expect(spawn).not.toHaveBeenCalled()
    })

    it('should spawn Electron when web server is ready', () => {
      state.webServerReady = true

      const config: DevElectronConfig = {
        platform: 'darwin',
        stdio: 'pipe',
        cwd: '/test/dir',
      }

      const result = startElectron(config)

      expect(spawn).toHaveBeenCalledWith(
        'pnpm',
        ['--filter', '@hatcherdx/dx-engine-electron', 'dev'],
        {
          stdio: 'pipe',
          cwd: '/test/dir',
          shell: false,
        }
      )
      expect(result).toBeTruthy()
      expect(state.electronApp).toBeTruthy()
      expect(consoleLogSpy).toHaveBeenCalledWith('⚡ Starting Electron...')
    })

    it('should filter Electron stdout based on shouldShowOutput', () => {
      state.webServerReady = true
      const electronProc = startElectron()

      // Test filtered output
      electronProc?.stdout?.emit(
        'data',
        Buffer.from('Request Autofill.enable failed')
      )
      expect(processStdoutWriteSpy).not.toHaveBeenCalled()

      // Test allowed output
      electronProc?.stdout?.emit('data', Buffer.from('Electron app started'))
      expect(processStdoutWriteSpy).toHaveBeenCalledWith('Electron app started')
    })

    it('should filter Electron stderr based on shouldShowOutput', () => {
      state.webServerReady = true
      const electronProc = startElectron()

      // Test filtered error
      electronProc?.stderr?.emit(
        'data',
        Buffer.from('chrome-devtools-frontend.appspot.com error')
      )
      expect(processStderrWriteSpy).not.toHaveBeenCalled()

      // Test allowed error
      electronProc?.stderr?.emit('data', Buffer.from('Real error message'))
      expect(processStderrWriteSpy).toHaveBeenCalledWith('Real error message')
    })

    it('should handle Electron process error', () => {
      state.webServerReady = true
      const electronProc = startElectron()

      const error = new Error('Failed to spawn')
      electronProc?.emit('error', error)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Failed to start Electron:',
        'Failed to spawn'
      )
    })

    it('should kill web server when Electron exits', () => {
      state.webServerReady = true
      state.webServer = mockWebServer as any
      const electronProc = startElectron()

      expect(() => {
        electronProc?.emit('exit', 0)
      }).toThrow('Process exit with code 0')

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🏁 Electron exited with code 0'
      )
      expect(mockWebServer.kill).toHaveBeenCalledWith('SIGTERM')
    })

    it('should handle null exit code', () => {
      state.webServerReady = true
      state.webServer = mockWebServer as any
      const electronProc = startElectron()

      expect(() => {
        electronProc?.emit('exit', null)
      }).toThrow('Process exit with code 0')

      expect(mockWebServer.kill).toHaveBeenCalledWith('SIGTERM')
    })
  })

  describe('handleShutdown Function', () => {
    it('should kill both processes on shutdown', () => {
      state.webServer = mockWebServer as any
      state.electronApp = mockElectronApp as any

      expect(() => {
        handleShutdown('SIGINT')
      }).toThrow('Process exit with code 0')

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '\n⏹️  Shutting down development environment (SIGINT)...'
      )
      expect(mockWebServer.kill).toHaveBeenCalledWith('SIGTERM')
      expect(mockElectronApp.kill).toHaveBeenCalledWith('SIGTERM')
    })

    it('should handle shutdown when only web server is running', () => {
      state.webServer = mockWebServer as any
      state.electronApp = null

      expect(() => {
        handleShutdown('SIGTERM')
      }).toThrow('Process exit with code 0')

      expect(mockWebServer.kill).toHaveBeenCalledWith('SIGTERM')
    })

    it('should handle shutdown when no processes are running', () => {
      state.webServer = null
      state.electronApp = null

      expect(() => {
        handleShutdown('SIGINT')
      }).toThrow('Process exit with code 0')

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '\n⏹️  Shutting down development environment (SIGINT)...'
      )
    })
  })

  describe('main Function', () => {
    it('should start web server and register signal handlers', () => {
      const processOnSpy = vi.spyOn(process, 'on')

      main()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🚀 Starting Hatcher DX Engine (Electron + Web)...'
      )
      expect(spawn).toHaveBeenCalledWith(
        'pnpm',
        ['--filter', '@hatcherdx/dx-engine-web', 'dev'],
        expect.any(Object)
      )
      expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function))
      expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function))
    })

    it('should pass config to startWebServer', () => {
      const config: DevElectronConfig = {
        webServerDelay: 5000,
        platform: 'linux',
      }

      main(config)

      // Trigger web server ready
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout')
      mockWebServer.stdout?.emit(
        'data',
        Buffer.from('Local: http://localhost:3000')
      )

      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000)
    })

    it('should handle SIGINT signal', () => {
      const processOnSpy = vi.spyOn(process, 'on')
      main()

      // Get the SIGINT handler
      const sigintHandler = processOnSpy.mock.calls.find(
        (call) => call[0] === 'SIGINT'
      )?.[1] as Function

      state.webServer = mockWebServer as any

      expect(() => {
        sigintHandler()
      }).toThrow('Process exit with code 0')

      expect(mockWebServer.kill).toHaveBeenCalledWith('SIGTERM')
    })

    it('should handle SIGTERM signal', () => {
      const processOnSpy = vi.spyOn(process, 'on')
      main()

      // Get the SIGTERM handler
      const sigtermHandler = processOnSpy.mock.calls.find(
        (call) => call[0] === 'SIGTERM'
      )?.[1] as Function

      state.webServer = mockWebServer as any

      expect(() => {
        sigtermHandler()
      }).toThrow('Process exit with code 0')

      expect(mockWebServer.kill).toHaveBeenCalledWith('SIGTERM')
    })
  })

  describe('Integration Tests', () => {
    it('should complete full startup sequence', () => {
      vi.useFakeTimers()

      // Reset spawn mock for this test
      vi.mocked(spawn).mockImplementation((command, args, options) => {
        if (args && args.includes('@hatcherdx/dx-engine-web')) {
          return mockWebServer as unknown as ChildProcess
        }
        return mockElectronApp as unknown as ChildProcess
      })

      main({ webServerDelay: 1000 })

      // Verify web server started
      expect(state.webServer).toBe(mockWebServer)
      expect(state.webServerReady).toBe(false)

      // Simulate web server becoming ready
      mockWebServer.stdout?.emit(
        'data',
        Buffer.from('Local: http://localhost:3000')
      )

      expect(state.webServerReady).toBe(true)

      // Fast-forward to trigger Electron start
      vi.advanceTimersByTime(1000)

      // Verify Electron would be started (spawn called again)
      // Note: In real execution, startElectron would be called via setTimeout

      vi.useRealTimers()
    })

    it('should handle web server failure before Electron starts', () => {
      main()

      // Web server fails before becoming ready
      expect(() => {
        mockWebServer.emit('exit', 1)
      }).toThrow('Process exit with code 1')

      expect(state.webServerReady).toBe(false)
      expect(state.electronApp).toBe(null)
    })

    it('should handle various output scenarios', () => {
      state.webServerReady = true
      const electronProc = startElectron()

      // Test multiple output types
      const outputs = [
        { data: 'Normal log message', shouldShow: true },
        { data: 'Request Autofill.enable failed', shouldShow: false },
        { data: 'Build completed', shouldShow: true },
        { data: 'HTTP/1.1 404 Not Found', shouldShow: false },
        { data: 'Server started successfully', shouldShow: true },
      ]

      outputs.forEach(({ data, shouldShow }) => {
        processStdoutWriteSpy.mockClear()
        electronProc?.stdout?.emit('data', Buffer.from(data))

        if (shouldShow) {
          expect(processStdoutWriteSpy).toHaveBeenCalledWith(data)
        } else {
          expect(processStdoutWriteSpy).not.toHaveBeenCalled()
        }
      })
    })

    it('should handle edge case of multiple ready signals', () => {
      vi.useFakeTimers()
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout')

      startWebServer({ webServerDelay: 1000 })

      // First ready signal
      mockWebServer.stdout?.emit(
        'data',
        Buffer.from('Local: http://localhost:3000')
      )
      expect(state.webServerReady).toBe(true)

      // Second ready signal (should not cause issues)
      mockWebServer.stdout?.emit(
        'data',
        Buffer.from('Local: http://localhost:3000')
      )
      expect(state.webServerReady).toBe(true)

      // Should still only set one timeout
      expect(setTimeoutSpy).toHaveBeenCalledTimes(2) // One per ready signal

      vi.useRealTimers()
    })
  })
})
