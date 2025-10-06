/**
 * @fileoverview Test suite for electron-mock.mjs achieving 100% coverage.
 *
 * @description
 * This test suite validates the mock electron module functionality,
 * ensuring all exports and the resetMocks function work correctly.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { contextBridge, ipcRenderer, resetMocks } from './electron-mock.mjs'

describe('electron-mock.mjs', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    resetMocks()
  })

  describe('contextBridge mock', () => {
    it('should have exposeInMainWorld method', () => {
      expect(contextBridge.exposeInMainWorld).toBeDefined()
      expect(typeof contextBridge.exposeInMainWorld).toBe('function')
    })

    it('should track calls to exposeInMainWorld', () => {
      const api = { test: 'api' }
      contextBridge.exposeInMainWorld('testAPI', api)

      expect(contextBridge.exposeInMainWorld).toHaveBeenCalledTimes(1)
      expect(contextBridge.exposeInMainWorld).toHaveBeenCalledWith(
        'testAPI',
        api
      )
    })

    it('should allow multiple calls to exposeInMainWorld', () => {
      contextBridge.exposeInMainWorld('api1', { one: 1 })
      contextBridge.exposeInMainWorld('api2', { two: 2 })

      expect(contextBridge.exposeInMainWorld).toHaveBeenCalledTimes(2)
    })
  })

  describe('ipcRenderer mock', () => {
    it('should have all required methods', () => {
      expect(ipcRenderer.invoke).toBeDefined()
      expect(ipcRenderer.on).toBeDefined()
      expect(ipcRenderer.removeListener).toBeDefined()

      expect(typeof ipcRenderer.invoke).toBe('function')
      expect(typeof ipcRenderer.on).toBe('function')
      expect(typeof ipcRenderer.removeListener).toBe('function')
    })

    it('should track calls to invoke', () => {
      ipcRenderer.invoke('test:channel', 'data')

      expect(ipcRenderer.invoke).toHaveBeenCalledTimes(1)
      expect(ipcRenderer.invoke).toHaveBeenCalledWith('test:channel', 'data')
    })

    it('should track calls to on', () => {
      const callback = () => {}
      ipcRenderer.on('test:event', callback)

      expect(ipcRenderer.on).toHaveBeenCalledTimes(1)
      expect(ipcRenderer.on).toHaveBeenCalledWith('test:event', callback)
    })

    it('should track calls to removeListener', () => {
      const callback = () => {}
      ipcRenderer.removeListener('test:event', callback)

      expect(ipcRenderer.removeListener).toHaveBeenCalledTimes(1)
      expect(ipcRenderer.removeListener).toHaveBeenCalledWith(
        'test:event',
        callback
      )
    })
  })

  describe('resetMocks function', () => {
    it('should clear all mock call history', () => {
      // Make some calls
      contextBridge.exposeInMainWorld('api', {})
      ipcRenderer.invoke('channel')
      ipcRenderer.on('event', () => {})
      ipcRenderer.removeListener('event', () => {})

      // Verify calls were tracked
      expect(contextBridge.exposeInMainWorld).toHaveBeenCalledTimes(1)
      expect(ipcRenderer.invoke).toHaveBeenCalledTimes(1)
      expect(ipcRenderer.on).toHaveBeenCalledTimes(1)
      expect(ipcRenderer.removeListener).toHaveBeenCalledTimes(1)

      // Reset mocks
      resetMocks()

      // Verify all call history is cleared
      expect(contextBridge.exposeInMainWorld).toHaveBeenCalledTimes(0)
      expect(ipcRenderer.invoke).toHaveBeenCalledTimes(0)
      expect(ipcRenderer.on).toHaveBeenCalledTimes(0)
      expect(ipcRenderer.removeListener).toHaveBeenCalledTimes(0)
    })

    it('should preserve mock functions after reset', () => {
      resetMocks()

      // Functions should still be defined and callable
      expect(typeof contextBridge.exposeInMainWorld).toBe('function')
      expect(typeof ipcRenderer.invoke).toBe('function')
      expect(typeof ipcRenderer.on).toBe('function')
      expect(typeof ipcRenderer.removeListener).toBe('function')

      // Should be able to call them after reset
      contextBridge.exposeInMainWorld('test', {})
      expect(contextBridge.exposeInMainWorld).toHaveBeenCalledTimes(1)
    })

    it('should be callable multiple times', () => {
      contextBridge.exposeInMainWorld('api1', {})
      resetMocks()

      contextBridge.exposeInMainWorld('api2', {})
      expect(contextBridge.exposeInMainWorld).toHaveBeenCalledTimes(1)

      resetMocks()
      expect(contextBridge.exposeInMainWorld).toHaveBeenCalledTimes(0)
    })
  })

  describe('integration scenarios', () => {
    it('should support typical preload script usage pattern', () => {
      // Simulate typical preload script pattern
      const terminalAPI = {
        create: () => ipcRenderer.invoke('terminal:create'),
        write: (id: string, data: string) =>
          ipcRenderer.invoke('terminal:write', id, data),
        onData: (callback: (...args: unknown[]) => void) => {
          ipcRenderer.on('terminal:data', callback)
          return () => ipcRenderer.removeListener('terminal:data', callback)
        },
      }

      contextBridge.exposeInMainWorld('terminalAPI', terminalAPI)

      expect(contextBridge.exposeInMainWorld).toHaveBeenCalledWith(
        'terminalAPI',
        terminalAPI
      )
    })

    it('should handle mock return values', async () => {
      // Configure mock return values
      ipcRenderer.invoke.mockResolvedValue({ success: true })
      ipcRenderer.on.mockImplementation((channel, callback) => {
        if (channel === 'test:event') {
          callback('event', { data: 'test' })
        }
      })

      // Test async invoke
      await expect(ipcRenderer.invoke('test')).resolves.toEqual({
        success: true,
      })

      // Test event listener
      const callback = vi.fn()
      ipcRenderer.on('test:event', callback)
      expect(callback).toHaveBeenCalledWith('event', { data: 'test' })
    })
  })
})
