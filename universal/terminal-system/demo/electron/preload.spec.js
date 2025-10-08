/* eslint-env node */
/* eslint-disable no-undef */
/**
 * @fileoverview Comprehensive tests for Electron preload script.
 *
 * @description
 * This test suite provides 100% coverage for the preload.js file by mocking
 * Electron's contextBridge and ipcRenderer APIs and testing all exposed methods
 * and event listeners, including their cleanup functions.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock electron module - must be defined before any imports
const mockIpcRenderer = {
  invoke: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
}

const mockContextBridge = {
  exposeInMainWorld: vi.fn(),
}

// Mock the electron module before importing preload
vi.mock('electron', () => ({
  contextBridge: mockContextBridge,
  ipcRenderer: mockIpcRenderer,
}))

describe('Electron Preload Script', () => {
  let terminalAPI

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks()

    // Reset the module to ensure fresh import
    vi.resetModules()

    // Import the preload script which will execute and call contextBridge.exposeInMainWorld
    await import('./preload.js')

    // Wait for any pending promises to resolve
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Capture the API that was exposed to the main world
    expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledTimes(1)
    expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith(
      'terminalAPI',
      expect.any(Object)
    )

    // Get the exposed API object
    terminalAPI = mockContextBridge.exposeInMainWorld.mock.calls[0][1]
  })

  describe('Terminal Lifecycle Methods', () => {
    it('should expose create method that invokes terminal:create', async () => {
      const options = { shell: '/bin/bash', cwd: '/home' }
      const expectedResult = { id: 'terminal-123' }

      mockIpcRenderer.invoke.mockResolvedValue(expectedResult)

      const result = await terminalAPI.create(options)

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'terminal:create',
        options
      )
      expect(result).toBe(expectedResult)
    })

    it('should expose write method that invokes terminal:write', async () => {
      const id = 'terminal-123'
      const data = 'ls -la\n'
      const expectedResult = { success: true }

      mockIpcRenderer.invoke.mockResolvedValue(expectedResult)

      const result = await terminalAPI.write(id, data)

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('terminal:write', {
        id,
        data,
      })
      expect(result).toBe(expectedResult)
    })

    it('should expose resize method that invokes terminal:resize', async () => {
      const id = 'terminal-123'
      const cols = 80
      const rows = 24
      const expectedResult = { success: true }

      mockIpcRenderer.invoke.mockResolvedValue(expectedResult)

      const result = await terminalAPI.resize(id, cols, rows)

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('terminal:resize', {
        id,
        cols,
        rows,
      })
      expect(result).toBe(expectedResult)
    })

    it('should expose kill method that invokes terminal:kill', async () => {
      const id = 'terminal-123'
      const expectedResult = { success: true }

      mockIpcRenderer.invoke.mockResolvedValue(expectedResult)

      const result = await terminalAPI.kill(id)

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('terminal:kill', {
        id,
      })
      expect(result).toBe(expectedResult)
    })

    it('should expose getCapabilities method that invokes terminal:capabilities', async () => {
      const expectedResult = {
        supportsColors: true,
        supportsPty: true,
        platform: 'darwin',
      }

      mockIpcRenderer.invoke.mockResolvedValue(expectedResult)

      const result = await terminalAPI.getCapabilities()

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'terminal:capabilities'
      )
      expect(result).toBe(expectedResult)
    })
  })

  describe('Event Listeners', () => {
    describe('onData', () => {
      it('should register a data listener and return cleanup function', () => {
        const callback = vi.fn()
        const mockEvent = { type: 'terminal:data' }
        const mockData = { id: 'terminal-123', data: 'output text' }

        // Setup: onData returns a cleanup function
        const cleanup = terminalAPI.onData(callback)

        // Verify that ipcRenderer.on was called
        expect(mockIpcRenderer.on).toHaveBeenCalledWith(
          'terminal:data',
          expect.any(Function)
        )

        // Get the registered listener function
        const registeredListener = mockIpcRenderer.on.mock.calls[0][1]

        // Test: trigger the listener with data
        registeredListener(mockEvent, mockData)

        // Verify callback was called with the data (without event)
        expect(callback).toHaveBeenCalledWith(mockData)
        expect(callback).toHaveBeenCalledTimes(1)

        // Test: cleanup function removes the listener
        cleanup()

        expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith(
          'terminal:data',
          registeredListener
        )
      })

      it('should handle multiple data events', () => {
        const callback = vi.fn()
        const mockEvent = { type: 'terminal:data' }
        const mockData1 = { id: 'terminal-1', data: 'first output' }
        const mockData2 = { id: 'terminal-2', data: 'second output' }

        terminalAPI.onData(callback)

        const registeredListener = mockIpcRenderer.on.mock.calls[0][1]

        // Trigger multiple events
        registeredListener(mockEvent, mockData1)
        registeredListener(mockEvent, mockData2)

        expect(callback).toHaveBeenCalledTimes(2)
        expect(callback).toHaveBeenNthCalledWith(1, mockData1)
        expect(callback).toHaveBeenNthCalledWith(2, mockData2)
      })
    })

    describe('onExit', () => {
      it('should register an exit listener and return cleanup function', () => {
        const callback = vi.fn()
        const mockEvent = { type: 'terminal:exit' }
        const mockData = { id: 'terminal-123', code: 0 }

        // Setup: onExit returns a cleanup function
        const cleanup = terminalAPI.onExit(callback)

        // Verify that ipcRenderer.on was called
        expect(mockIpcRenderer.on).toHaveBeenCalledWith(
          'terminal:exit',
          expect.any(Function)
        )

        // Get the registered listener function
        const registeredListener = mockIpcRenderer.on.mock.calls[0][1]

        // Test: trigger the listener with data
        registeredListener(mockEvent, mockData)

        // Verify callback was called with the data (without event)
        expect(callback).toHaveBeenCalledWith(mockData)
        expect(callback).toHaveBeenCalledTimes(1)

        // Test: cleanup function removes the listener
        cleanup()

        expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith(
          'terminal:exit',
          registeredListener
        )
      })

      it('should handle multiple exit events', () => {
        const callback = vi.fn()
        const mockEvent = { type: 'terminal:exit' }
        const mockData1 = { id: 'terminal-1', code: 0 }
        const mockData2 = { id: 'terminal-2', code: 1 }

        terminalAPI.onExit(callback)

        const registeredListener = mockIpcRenderer.on.mock.calls[0][1]

        // Trigger multiple events
        registeredListener(mockEvent, mockData1)
        registeredListener(mockEvent, mockData2)

        expect(callback).toHaveBeenCalledTimes(2)
        expect(callback).toHaveBeenNthCalledWith(1, mockData1)
        expect(callback).toHaveBeenNthCalledWith(2, mockData2)
      })
    })

    describe('Multiple Event Listeners', () => {
      it('should support multiple listeners for the same event', () => {
        const callback1 = vi.fn()
        const callback2 = vi.fn()
        const mockEvent = { type: 'terminal:data' }
        const mockData = { id: 'terminal-123', data: 'shared output' }

        // Register two different listeners
        const cleanup1 = terminalAPI.onData(callback1)
        const cleanup2 = terminalAPI.onData(callback2)

        // Get both registered listeners
        const listener1 = mockIpcRenderer.on.mock.calls[0][1]
        const listener2 = mockIpcRenderer.on.mock.calls[1][1]

        // Trigger both listeners
        listener1(mockEvent, mockData)
        listener2(mockEvent, mockData)

        // Both callbacks should be called
        expect(callback1).toHaveBeenCalledWith(mockData)
        expect(callback2).toHaveBeenCalledWith(mockData)

        // Cleanup should work independently
        cleanup1()
        expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith(
          'terminal:data',
          listener1
        )

        cleanup2()
        expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith(
          'terminal:data',
          listener2
        )
      })
    })
  })

  describe('API Structure', () => {
    it('should expose all expected methods and properties', () => {
      expect(terminalAPI).toBeDefined()
      expect(typeof terminalAPI.create).toBe('function')
      expect(typeof terminalAPI.write).toBe('function')
      expect(typeof terminalAPI.resize).toBe('function')
      expect(typeof terminalAPI.kill).toBe('function')
      expect(typeof terminalAPI.getCapabilities).toBe('function')
      expect(typeof terminalAPI.onData).toBe('function')
      expect(typeof terminalAPI.onExit).toBe('function')
    })

    it('should not expose any additional properties', () => {
      const expectedProperties = [
        'create',
        'write',
        'resize',
        'kill',
        'getCapabilities',
        'onData',
        'onExit',
      ]

      const actualProperties = Object.keys(terminalAPI)

      expect(actualProperties).toHaveLength(expectedProperties.length)
      expectedProperties.forEach((prop) => {
        expect(actualProperties).toContain(prop)
      })
    })
  })

  describe('Error Handling', () => {
    it('should propagate errors from ipcRenderer.invoke', async () => {
      const error = new Error('Terminal creation failed')
      mockIpcRenderer.invoke.mockRejectedValue(error)

      await expect(terminalAPI.create({})).rejects.toThrow(
        'Terminal creation failed'
      )
    })

    it('should handle errors in write method', async () => {
      const error = new Error('Write operation failed')
      mockIpcRenderer.invoke.mockRejectedValue(error)

      await expect(terminalAPI.write('id', 'data')).rejects.toThrow(
        'Write operation failed'
      )
    })

    it('should handle errors in resize method', async () => {
      const error = new Error('Resize operation failed')
      mockIpcRenderer.invoke.mockRejectedValue(error)

      await expect(terminalAPI.resize('id', 80, 24)).rejects.toThrow(
        'Resize operation failed'
      )
    })

    it('should handle errors in kill method', async () => {
      const error = new Error('Kill operation failed')
      mockIpcRenderer.invoke.mockRejectedValue(error)

      await expect(terminalAPI.kill('id')).rejects.toThrow(
        'Kill operation failed'
      )
    })

    it('should handle errors in getCapabilities method', async () => {
      const error = new Error('Failed to get capabilities')
      mockIpcRenderer.invoke.mockRejectedValue(error)

      await expect(terminalAPI.getCapabilities()).rejects.toThrow(
        'Failed to get capabilities'
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined/null values correctly', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(undefined)

      // Test with undefined options
      await terminalAPI.create(undefined)
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'terminal:create',
        undefined
      )

      // Test with null data
      await terminalAPI.write('id', null)
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('terminal:write', {
        id: 'id',
        data: null,
      })
    })

    it('should handle empty strings and zero values', async () => {
      mockIpcRenderer.invoke.mockResolvedValue({ success: true })

      // Empty string ID
      await terminalAPI.write('', 'data')
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('terminal:write', {
        id: '',
        data: 'data',
      })

      // Zero dimensions
      await terminalAPI.resize('id', 0, 0)
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('terminal:resize', {
        id: 'id',
        cols: 0,
        rows: 0,
      })
    })

    it('should handle callbacks that throw errors', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error')
      })
      const mockEvent = { type: 'terminal:data' }
      const mockData = { id: 'terminal-123', data: 'output' }

      terminalAPI.onData(errorCallback)

      const registeredListener = mockIpcRenderer.on.mock.calls[0][1]

      // Calling the listener should not throw (errors in callbacks should be handled by the caller)
      expect(() => registeredListener(mockEvent, mockData)).toThrow(
        'Callback error'
      )
      expect(errorCallback).toHaveBeenCalledWith(mockData)
    })
  })
})
