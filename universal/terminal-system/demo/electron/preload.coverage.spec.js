/**
 * @fileoverview Comprehensive test for 100% preload.js coverage.
 *
 * @description
 * This test suite achieves 100% code coverage for the Electron preload.js file
 * by testing all exposed terminal API methods, event listeners, cleanup functions,
 * and error conditions using modern vitest patterns.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock electron module completely
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

describe('Electron Preload Script 100% Coverage', () => {
  let terminalAPI

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks()

    // Reset the module to ensure fresh import
    vi.resetModules()

    // Import the preload script which will execute and call contextBridge.exposeInMainWorld
    await import('./preload.js')

    // Wait for any pending promises
    await new Promise((resolve) => globalThis.setTimeout(resolve, 0))

    // Verify that contextBridge.exposeInMainWorld was called
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
      const options = { shell: '/bin/bash', cwd: '/home/user' }
      const expectedResult = { id: 'terminal-456', success: true }

      mockIpcRenderer.invoke.mockResolvedValue(expectedResult)

      const result = await terminalAPI.create(options)

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'terminal:create',
        options
      )
      expect(result).toBe(expectedResult)
    })

    it('should expose write method that invokes terminal:write with proper format', async () => {
      const id = 'terminal-456'
      const data = 'echo "Hello World"\n'
      const expectedResult = { success: true, bytesWritten: 18 }

      mockIpcRenderer.invoke.mockResolvedValue(expectedResult)

      const result = await terminalAPI.write(id, data)

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('terminal:write', {
        id,
        data,
      })
      expect(result).toBe(expectedResult)
    })

    it('should expose resize method that invokes terminal:resize with proper format', async () => {
      const id = 'terminal-456'
      const cols = 120
      const rows = 40
      const expectedResult = { success: true, dimensions: { cols, rows } }

      mockIpcRenderer.invoke.mockResolvedValue(expectedResult)

      const result = await terminalAPI.resize(id, cols, rows)

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('terminal:resize', {
        id,
        cols,
        rows,
      })
      expect(result).toBe(expectedResult)
    })

    it('should expose kill method that invokes terminal:kill with proper format', async () => {
      const id = 'terminal-456'
      const expectedResult = { success: true, exitCode: 0 }

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
        backend: 'node-pty',
      }

      mockIpcRenderer.invoke.mockResolvedValue(expectedResult)

      const result = await terminalAPI.getCapabilities()

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'terminal:capabilities'
      )
      expect(result).toBe(expectedResult)
    })
  })

  describe('Event Listener Methods', () => {
    describe('onData', () => {
      it('should register data listener and return cleanup function', () => {
        const callback = vi.fn()
        const mockEvent = { sender: 'test', type: 'terminal:data' }
        const mockData = { id: 'terminal-456', data: 'output from command' }

        // Call onData which should register a listener
        const cleanup = terminalAPI.onData(callback)

        // Verify that ipcRenderer.on was called with correct event and listener
        expect(mockIpcRenderer.on).toHaveBeenCalledWith(
          'terminal:data',
          expect.any(Function)
        )

        // Get the registered listener function
        const registeredListener = mockIpcRenderer.on.mock.calls[0][1]

        // Trigger the listener with mock data
        registeredListener(mockEvent, mockData)

        // Verify callback was called with the data (without event)
        expect(callback).toHaveBeenCalledWith(mockData)
        expect(callback).toHaveBeenCalledTimes(1)

        // Verify cleanup function exists and is a function
        expect(typeof cleanup).toBe('function')

        // Test cleanup function removes the listener
        cleanup()

        expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith(
          'terminal:data',
          registeredListener
        )
      })

      it('should handle multiple data events correctly', () => {
        const callback = vi.fn()
        const mockEvent = { sender: 'test', type: 'terminal:data' }
        const mockData1 = { id: 'terminal-1', data: 'first line' }
        const mockData2 = { id: 'terminal-2', data: 'second line' }

        terminalAPI.onData(callback)

        const registeredListener = mockIpcRenderer.on.mock.calls[0][1]

        // Trigger multiple events
        registeredListener(mockEvent, mockData1)
        registeredListener(mockEvent, mockData2)

        expect(callback).toHaveBeenCalledTimes(2)
        expect(callback).toHaveBeenNthCalledWith(1, mockData1)
        expect(callback).toHaveBeenNthCalledWith(2, mockData2)
      })

      it('should handle callback with undefined/null data', () => {
        const callback = vi.fn()
        const mockEvent = { sender: 'test', type: 'terminal:data' }

        terminalAPI.onData(callback)
        const registeredListener = mockIpcRenderer.on.mock.calls[0][1]

        // Test with undefined data
        registeredListener(mockEvent, undefined)
        expect(callback).toHaveBeenCalledWith(undefined)

        // Test with null data
        registeredListener(mockEvent, null)
        expect(callback).toHaveBeenCalledWith(null)
      })
    })

    describe('onExit', () => {
      it('should register exit listener and return cleanup function', () => {
        const callback = vi.fn()
        const mockEvent = { sender: 'test', type: 'terminal:exit' }
        const mockData = { id: 'terminal-456', exitCode: 0, signal: null }

        // Call onExit which should register a listener
        const cleanup = terminalAPI.onExit(callback)

        // Verify that ipcRenderer.on was called with correct event and listener
        expect(mockIpcRenderer.on).toHaveBeenCalledWith(
          'terminal:exit',
          expect.any(Function)
        )

        // Get the registered listener function
        const registeredListener = mockIpcRenderer.on.mock.calls[0][1]

        // Trigger the listener with mock data
        registeredListener(mockEvent, mockData)

        // Verify callback was called with the data (without event)
        expect(callback).toHaveBeenCalledWith(mockData)
        expect(callback).toHaveBeenCalledTimes(1)

        // Verify cleanup function exists and is a function
        expect(typeof cleanup).toBe('function')

        // Test cleanup function removes the listener
        cleanup()

        expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith(
          'terminal:exit',
          registeredListener
        )
      })

      it('should handle multiple exit events correctly', () => {
        const callback = vi.fn()
        const mockEvent = { sender: 'test', type: 'terminal:exit' }
        const mockData1 = { id: 'terminal-1', exitCode: 0 }
        const mockData2 = { id: 'terminal-2', exitCode: 1 }

        terminalAPI.onExit(callback)

        const registeredListener = mockIpcRenderer.on.mock.calls[0][1]

        // Trigger multiple events
        registeredListener(mockEvent, mockData1)
        registeredListener(mockEvent, mockData2)

        expect(callback).toHaveBeenCalledTimes(2)
        expect(callback).toHaveBeenNthCalledWith(1, mockData1)
        expect(callback).toHaveBeenNthCalledWith(2, mockData2)
      })

      it('should handle exit data with different exit codes and signals', () => {
        const callback = vi.fn()
        const mockEvent = { sender: 'test', type: 'terminal:exit' }

        terminalAPI.onExit(callback)
        const registeredListener = mockIpcRenderer.on.mock.calls[0][1]

        // Test with various exit scenarios
        const scenarios = [
          { id: 'term-1', exitCode: 0, signal: null }, // Normal exit
          { id: 'term-2', exitCode: 1, signal: null }, // Error exit
          { id: 'term-3', exitCode: null, signal: 'SIGTERM' }, // Signal termination
          { id: 'term-4', exitCode: 130, signal: 'SIGINT' }, // Ctrl+C
        ]

        scenarios.forEach((scenario, index) => {
          registeredListener(mockEvent, scenario)
          expect(callback).toHaveBeenNthCalledWith(index + 1, scenario)
        })
      })
    })

    describe('Multiple Event Listeners', () => {
      it('should support multiple independent data listeners', () => {
        const callback1 = vi.fn()
        const callback2 = vi.fn()
        const mockEvent = { sender: 'test', type: 'terminal:data' }
        const mockData = { id: 'terminal-456', data: 'shared output' }

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

      it('should support mixed data and exit listeners', () => {
        const dataCallback = vi.fn()
        const exitCallback = vi.fn()

        // Register one of each type
        const dataCleanup = terminalAPI.onData(dataCallback)
        const exitCleanup = terminalAPI.onExit(exitCallback)

        // Verify correct event types were registered
        expect(mockIpcRenderer.on).toHaveBeenCalledWith(
          'terminal:data',
          expect.any(Function)
        )
        expect(mockIpcRenderer.on).toHaveBeenCalledWith(
          'terminal:exit',
          expect.any(Function)
        )

        // Get listeners
        const dataListener = mockIpcRenderer.on.mock.calls[0][1]
        const exitListener = mockIpcRenderer.on.mock.calls[1][1]

        // Test data event
        dataListener({}, { id: 'test', data: 'output' })
        expect(dataCallback).toHaveBeenCalledWith({
          id: 'test',
          data: 'output',
        })

        // Test exit event
        exitListener({}, { id: 'test', exitCode: 0 })
        expect(exitCallback).toHaveBeenCalledWith({ id: 'test', exitCode: 0 })

        // Test independent cleanup
        dataCleanup()
        exitCleanup()

        expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith(
          'terminal:data',
          dataListener
        )
        expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith(
          'terminal:exit',
          exitListener
        )
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle IPC invoke errors gracefully', async () => {
      const error = new Error('Terminal service unavailable')
      mockIpcRenderer.invoke.mockRejectedValue(error)

      // Test that errors are properly propagated
      await expect(terminalAPI.create({})).rejects.toThrow(
        'Terminal service unavailable'
      )
      await expect(terminalAPI.write('test', 'data')).rejects.toThrow(
        'Terminal service unavailable'
      )
      await expect(terminalAPI.resize('test', 80, 24)).rejects.toThrow(
        'Terminal service unavailable'
      )
      await expect(terminalAPI.kill('test')).rejects.toThrow(
        'Terminal service unavailable'
      )
      await expect(terminalAPI.getCapabilities()).rejects.toThrow(
        'Terminal service unavailable'
      )
    })

    it('should handle edge case parameters', async () => {
      mockIpcRenderer.invoke.mockResolvedValue({ success: true })

      // Test with empty/null parameters
      await terminalAPI.create(null)
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'terminal:create',
        null
      )

      await terminalAPI.write('', '')
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('terminal:write', {
        id: '',
        data: '',
      })

      await terminalAPI.resize('test', 0, 0)
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('terminal:resize', {
        id: 'test',
        cols: 0,
        rows: 0,
      })

      // Test with undefined parameters
      await terminalAPI.create(undefined)
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'terminal:create',
        undefined
      )
    })

    it('should handle callbacks that throw errors', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback processing error')
      })

      terminalAPI.onData(errorCallback)
      const dataListener = mockIpcRenderer.on.mock.calls[0][1]

      // Should not crash when callback throws
      expect(() => dataListener({}, { id: 'test', data: 'output' })).toThrow(
        'Callback processing error'
      )

      // Similar test for onExit
      const errorExitCallback = vi.fn(() => {
        throw new Error('Exit callback error')
      })

      terminalAPI.onExit(errorExitCallback)
      const exitListener = mockIpcRenderer.on.mock.calls[1][1]

      expect(() => exitListener({}, { id: 'test', exitCode: 0 })).toThrow(
        'Exit callback error'
      )
    })
  })

  describe('API Structure and Completeness', () => {
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

    it('should not expose any unexpected properties', () => {
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

    it('should expose API with correct context bridge call', () => {
      expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith(
        'terminalAPI',
        expect.objectContaining({
          create: expect.any(Function),
          write: expect.any(Function),
          resize: expect.any(Function),
          kill: expect.any(Function),
          getCapabilities: expect.any(Function),
          onData: expect.any(Function),
          onExit: expect.any(Function),
        })
      )
    })
  })

  describe('Memory Management and Cleanup', () => {
    it('should properly manage event listener cleanup', () => {
      const callbacks = []
      const cleanupFunctions = []

      // Register multiple listeners
      for (let i = 0; i < 5; i++) {
        const callback = vi.fn()
        callbacks.push(callback)

        const dataCleanup = terminalAPI.onData(callback)
        const exitCleanup = terminalAPI.onExit(callback)

        cleanupFunctions.push(dataCleanup, exitCleanup)
      }

      // Verify all listeners were registered
      expect(mockIpcRenderer.on).toHaveBeenCalledTimes(10) // 5 data + 5 exit

      // Clean up all listeners
      cleanupFunctions.forEach((cleanup) => cleanup())

      // Verify all listeners were removed
      expect(mockIpcRenderer.removeListener).toHaveBeenCalledTimes(10)
    })

    it('should handle cleanup being called multiple times', () => {
      const callback = vi.fn()
      const cleanup = terminalAPI.onData(callback)

      // Call cleanup multiple times
      cleanup()
      cleanup()
      cleanup()

      // removeListener should be called each time (implementation dependent)
      expect(mockIpcRenderer.removeListener).toHaveBeenCalledTimes(3)
    })
  })
})
