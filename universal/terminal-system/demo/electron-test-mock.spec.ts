/**
 * @fileoverview Test suite for electron-test-mock.mjs achieving 100% coverage.
 *
 * @description
 * This test suite validates the test mock module exports and aliases,
 * ensuring all mock objects and their methods work correctly.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, beforeEach } from 'vitest'
// Dynamic import to ensure coverage
const electronTestMock = await import('./electron-test-mock.mjs')
const { mockContextBridge, mockIpcRenderer, contextBridge, ipcRenderer } =
  electronTestMock

describe('electron-test-mock.mjs', () => {
  beforeEach(() => {
    // Clear all mock call history
    mockContextBridge.exposeInMainWorld.mockClear()
    mockIpcRenderer.invoke.mockClear()
    mockIpcRenderer.on.mockClear()
    mockIpcRenderer.removeListener.mockClear()
  })

  describe('mockContextBridge', () => {
    it('should export mockContextBridge with exposeInMainWorld', () => {
      expect(mockContextBridge).toBeDefined()
      expect(mockContextBridge.exposeInMainWorld).toBeDefined()
      expect(typeof mockContextBridge.exposeInMainWorld).toBe('function')
    })

    it('should track calls to exposeInMainWorld', () => {
      const api = { test: 'value' }
      mockContextBridge.exposeInMainWorld('testAPI', api)

      expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledTimes(1)
      expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith(
        'testAPI',
        api
      )
    })
  })

  describe('mockIpcRenderer', () => {
    it('should export mockIpcRenderer with all methods', () => {
      expect(mockIpcRenderer).toBeDefined()
      expect(mockIpcRenderer.invoke).toBeDefined()
      expect(mockIpcRenderer.on).toBeDefined()
      expect(mockIpcRenderer.removeListener).toBeDefined()
    })

    it('should track calls to invoke', async () => {
      mockIpcRenderer.invoke.mockResolvedValue({ result: 'success' })

      const result = await mockIpcRenderer.invoke('test:channel', 'arg1')

      expect(mockIpcRenderer.invoke).toHaveBeenCalledTimes(1)
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'test:channel',
        'arg1'
      )
      expect(result).toEqual({ result: 'success' })
    })

    it('should track calls to on', () => {
      const listener = vi.fn()
      mockIpcRenderer.on('test:event', listener)

      expect(mockIpcRenderer.on).toHaveBeenCalledTimes(1)
      expect(mockIpcRenderer.on).toHaveBeenCalledWith('test:event', listener)
    })

    it('should track calls to removeListener', () => {
      const listener = vi.fn()
      mockIpcRenderer.removeListener('test:event', listener)

      expect(mockIpcRenderer.removeListener).toHaveBeenCalledTimes(1)
      expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith(
        'test:event',
        listener
      )
    })
  })

  describe('exported aliases', () => {
    it('should export contextBridge as an alias to mockContextBridge', () => {
      expect(contextBridge).toBe(mockContextBridge)
      expect(contextBridge.exposeInMainWorld).toBe(
        mockContextBridge.exposeInMainWorld
      )
    })

    it('should export ipcRenderer as an alias to mockIpcRenderer', () => {
      expect(ipcRenderer).toBe(mockIpcRenderer)
      expect(ipcRenderer.invoke).toBe(mockIpcRenderer.invoke)
      expect(ipcRenderer.on).toBe(mockIpcRenderer.on)
      expect(ipcRenderer.removeListener).toBe(mockIpcRenderer.removeListener)
    })

    it('should track calls through aliases', () => {
      contextBridge.exposeInMainWorld('aliasAPI', { test: true })
      ipcRenderer.invoke('alias:channel')

      expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledTimes(1)
      expect(mockIpcRenderer.invoke).toHaveBeenCalledTimes(1)
    })
  })

  describe('mock behavior configuration', () => {
    it('should allow configuring mock return values', async () => {
      // Configure invoke to return different values
      mockIpcRenderer.invoke
        .mockResolvedValueOnce({ first: 'call' })
        .mockResolvedValueOnce({ second: 'call' })

      const result1 = await mockIpcRenderer.invoke('channel1')
      const result2 = await mockIpcRenderer.invoke('channel2')

      expect(result1).toEqual({ first: 'call' })
      expect(result2).toEqual({ second: 'call' })
    })

    it('should allow simulating events through on mock', () => {
      const eventCallback = vi.fn()

      // Configure on to immediately trigger callback
      mockIpcRenderer.on.mockImplementation((channel, callback) => {
        if (channel === 'immediate:event') {
          callback('event', { immediate: true })
        }
      })

      mockIpcRenderer.on('immediate:event', eventCallback)

      expect(eventCallback).toHaveBeenCalledWith('event', { immediate: true })
    })

    it('should handle async operations with invoke', async () => {
      mockIpcRenderer.invoke.mockImplementation(async (channel) => {
        if (channel === 'slow:operation') {
          await new Promise((resolve) => setTimeout(resolve, 10))
          return { delayed: true }
        }
        return { immediate: true }
      })

      const slowResult = await mockIpcRenderer.invoke('slow:operation')
      const fastResult = await mockIpcRenderer.invoke('fast:operation')

      expect(slowResult).toEqual({ delayed: true })
      expect(fastResult).toEqual({ immediate: true })
    })
  })

  describe('usage in preload script testing', () => {
    it('should support typical preload API patterns', () => {
      // Simulate creating a preload API
      const api = {
        sendMessage: (msg: string) => ipcRenderer.invoke('send', msg),
        onMessage: (callback: (...args: unknown[]) => void) => {
          ipcRenderer.on('message', callback)
          return () => ipcRenderer.removeListener('message', callback)
        },
      }

      contextBridge.exposeInMainWorld('electronAPI', api)

      expect(contextBridge.exposeInMainWorld).toHaveBeenCalledWith(
        'electronAPI',
        api
      )
    })

    it('should handle multiple API registrations', () => {
      contextBridge.exposeInMainWorld('api1', { version: 1 })
      contextBridge.exposeInMainWorld('api2', { version: 2 })
      contextBridge.exposeInMainWorld('api3', { version: 3 })

      expect(contextBridge.exposeInMainWorld).toHaveBeenCalledTimes(3)
    })
  })
})
