/**
 * @fileoverview Test suite for electron-preload.js achieving 100% coverage.
 *
 * @description
 * This test suite uses the ESM wrapper to test the preload script logic
 * while maintaining CommonJS compatibility for Electron.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createTerminalAPI } from '../src/electron-preload-wrapper.mjs'

describe('electron-preload.js', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Terminal API type varies during test execution
  let terminalAPI: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Console spy needs flexible mock type
  let consoleLogSpy: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Console spy needs flexible mock type
  let consoleErrorSpy: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- IPC renderer mock needs flexible interface for testing
  let mockIpcRenderer: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Context bridge mock needs flexible interface for testing
  let mockContextBridge: any

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks()

    // Setup console spies
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Create mock objects
    mockIpcRenderer = {
      invoke: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn(),
    }

    mockContextBridge = {
      exposeInMainWorld: vi.fn(),
    }

    // Create the API using the wrapper
    terminalAPI = createTerminalAPI(mockContextBridge, mockIpcRenderer)

    // Verify the API was exposed
    expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledTimes(1)
    expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith(
      'terminalAPI',
      expect.any(Object)
    )
  })

  afterEach(() => {
    // Restore console spies
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()

    // Clear module cache to ensure fresh import on next test
    vi.resetModules()
  })

  describe('API Methods', () => {
    it('should expose all required methods', () => {
      expect(terminalAPI).toBeDefined()
      expect(terminalAPI.getCapabilities).toBeTypeOf('function')
      expect(terminalAPI.create).toBeTypeOf('function')
      expect(terminalAPI.write).toBeTypeOf('function')
      expect(terminalAPI.resize).toBeTypeOf('function')
      expect(terminalAPI.kill).toBeTypeOf('function')
      expect(terminalAPI.onData).toBeTypeOf('function')
      expect(terminalAPI.onExit).toBeTypeOf('function')
    })

    it('should call getCapabilities correctly', async () => {
      mockIpcRenderer.invoke.mockResolvedValueOnce({ backend: 'node-pty' })

      const result = await terminalAPI.getCapabilities()

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'terminal:getCapabilities'
      )
      expect(result).toEqual({ backend: 'node-pty' })
    })

    it('should call create with options', async () => {
      const options = { shell: '/bin/bash', cwd: '/home/user' }
      mockIpcRenderer.invoke.mockResolvedValueOnce({
        id: 'terminal-1',
        success: true,
      })

      const result = await terminalAPI.create(options)

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'terminal:create',
        options
      )
      expect(result).toEqual({ id: 'terminal-1', success: true })
    })

    it('should call write with id and data', async () => {
      mockIpcRenderer.invoke.mockResolvedValueOnce(undefined)

      await terminalAPI.write('terminal-1', 'ls -la\n')

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'terminal:write',
        'terminal-1',
        'ls -la\n'
      )
    })

    it('should call resize with dimensions', async () => {
      mockIpcRenderer.invoke.mockResolvedValueOnce(undefined)

      await terminalAPI.resize('terminal-1', 120, 40)

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'terminal:resize',
        'terminal-1',
        120,
        40
      )
    })

    it('should call kill with terminal id', async () => {
      mockIpcRenderer.invoke.mockResolvedValueOnce(undefined)

      await terminalAPI.kill('terminal-1')

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'terminal:kill',
        'terminal-1'
      )
    })
  })

  describe('onData listener', () => {
    it('should register listener and handle valid data', () => {
      const callback = vi.fn()
      const cleanup = terminalAPI.onData(callback)

      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        'terminal:data',
        expect.any(Function)
      )

      // Get the registered listener
      const listener = mockIpcRenderer.on.mock.calls[0][1]

      // Test valid data with both data and terminalId
      const validData = { data: 'terminal output', terminalId: 'terminal-1' }
      listener({}, validData)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Preload] Received terminal:data from main:',
        {
          hasData: true,
          type: 'object',
          preview: JSON.stringify(validData).slice(0, 200),
        }
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Preload] Forwarding data to renderer:',
        'terminal output'
      )
      expect(callback).toHaveBeenCalledWith(validData)

      // Test cleanup
      expect(cleanup).toBeTypeOf('function')
      cleanup()
      expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith(
        'terminal:data',
        listener
      )
    })

    it('should handle data with long content (truncation test)', () => {
      const callback = vi.fn()
      terminalAPI.onData(callback)

      const listener = mockIpcRenderer.on.mock.calls[0][1]
      const longData = {
        data: 'x'.repeat(100), // Long data to test truncation
        terminalId: 'terminal-1',
      }

      listener({}, longData)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Preload] Forwarding data to renderer:',
        'x'.repeat(50) // Should be truncated to 50 chars
      )
      expect(callback).toHaveBeenCalledWith(longData)
    })

    it('should handle null data (invalid branch)', () => {
      const callback = vi.fn()
      terminalAPI.onData(callback)

      const listener = mockIpcRenderer.on.mock.calls[0][1]
      listener({}, null)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Preload] Received terminal:data from main:',
        { hasData: false, type: 'object', preview: 'no data' }
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Preload] Invalid data format received:',
        null
      )
      expect(callback).not.toHaveBeenCalled()
    })

    it('should handle undefined data (invalid branch)', () => {
      const callback = vi.fn()
      terminalAPI.onData(callback)

      const listener = mockIpcRenderer.on.mock.calls[0][1]
      listener({}, undefined)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Preload] Received terminal:data from main:',
        { hasData: false, type: 'undefined', preview: 'no data' }
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Preload] Invalid data format received:',
        undefined
      )
      expect(callback).not.toHaveBeenCalled()
    })

    it('should handle object without data property (invalid branch)', () => {
      const callback = vi.fn()
      terminalAPI.onData(callback)

      const listener = mockIpcRenderer.on.mock.calls[0][1]
      const invalidData = { terminalId: 'terminal-1' } // Missing data property

      listener({}, invalidData)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Preload] Received terminal:data from main:',
        {
          hasData: true,
          type: 'object',
          preview: JSON.stringify(invalidData).slice(0, 200),
        }
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Preload] Invalid data format received:',
        invalidData
      )
      expect(callback).not.toHaveBeenCalled()
    })

    it('should handle non-object data types (invalid branch)', () => {
      const callback = vi.fn()
      terminalAPI.onData(callback)

      const listener = mockIpcRenderer.on.mock.calls[0][1]

      // Test with string
      listener({}, 'plain string')

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Preload] Received terminal:data from main:',
        {
          hasData: true,
          type: 'string',
          preview: '"plain string"',
        }
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Preload] Invalid data format received:',
        'plain string'
      )
      expect(callback).not.toHaveBeenCalled()
    })

    it('should handle boolean false data (edge case)', () => {
      const callback = vi.fn()
      terminalAPI.onData(callback)

      const listener = mockIpcRenderer.on.mock.calls[0][1]
      listener({}, false)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Preload] Received terminal:data from main:',
        {
          hasData: false,
          type: 'boolean',
          preview: 'no data',
        }
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Preload] Invalid data format received:',
        false
      )
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('onExit listener', () => {
    it('should register listener and handle exit events', () => {
      const callback = vi.fn()
      const cleanup = terminalAPI.onExit(callback)

      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        'terminal:exit',
        expect.any(Function)
      )

      // Get the registered listener
      const listener = mockIpcRenderer.on.mock.calls[0][1]

      // Test exit event
      const exitData = { terminalId: 'terminal-1', exitCode: 0 }
      listener({}, exitData)

      expect(callback).toHaveBeenCalledWith(exitData)

      // Test cleanup
      expect(cleanup).toBeTypeOf('function')
      cleanup()
      expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith(
        'terminal:exit',
        listener
      )
    })
  })
})
