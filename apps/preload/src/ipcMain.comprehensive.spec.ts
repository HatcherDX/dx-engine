/**
 * @fileoverview Comprehensive test suite for IPCMain class.
 *
 * @description
 * Tests the complete IPCMain functionality including message handling,
 * listener management, multi-window communication, and error handling.
 * Focuses on achieving high test coverage for all code paths.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { IPCMain } from './ipcMain.js'
import type { MessageObj } from './types/index.js'

// Mock electron modules before any imports
vi.mock('electron', () => {
  const mockWebContents = {
    send: vi.fn(),
  }

  const mockWindow = {
    webContents: mockWebContents,
  }

  const mockBrowserWindow = {
    getAllWindows: vi.fn().mockReturnValue([mockWindow]),
  }

  const mockIpcMain = {
    handle: vi.fn(),
  }

  return {
    ipcMain: mockIpcMain,
    BrowserWindow: mockBrowserWindow,
  }
})

// Define test message types
interface TestMessage extends MessageObj<TestMessage> {
  testMethod: (arg1: string, arg2: number) => string
  asyncMethod: (data: string) => Promise<{ result: string }>
  errorMethod: () => never
  noArgsMethod: () => boolean
}

interface TestBackgroundMessage extends MessageObj<TestBackgroundMessage> {
  backgroundEvent: (eventData: { type: string; payload: unknown }) => void
  simpleNotification: (message: string) => void
}

describe('IPCMain - Comprehensive Coverage', () => {
  let ipcMainInstance: IPCMain<TestMessage, TestBackgroundMessage>

  beforeEach(async () => {
    vi.clearAllMocks()
    const { BrowserWindow } = await import('electron')
    const mockWebContents = { send: vi.fn() }
    const mockWindow = { webContents: mockWebContents }
    BrowserWindow.getAllWindows.mockReturnValue([mockWindow])
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Constructor and Initialization', () => {
    it('should create IPCMain with default channel', async () => {
      const { ipcMain } = await import('electron')
      ipcMainInstance = new IPCMain<TestMessage, TestBackgroundMessage>()

      expect(ipcMain.handle).toHaveBeenCalledWith(
        'IPC-bridge',
        expect.any(Function)
      )
    })

    it('should create IPCMain with custom channel', async () => {
      const { ipcMain } = await import('electron')
      ipcMainInstance = new IPCMain<TestMessage, TestBackgroundMessage>(
        'custom-channel'
      )

      expect(ipcMain.handle).toHaveBeenCalledWith(
        'custom-channel',
        expect.any(Function)
      )
    })

    it('should initialize with empty listeners', () => {
      ipcMainInstance = new IPCMain<TestMessage, TestBackgroundMessage>()

      // Verify internal state by testing that no listeners are registered
      expect(() => {
        ipcMainInstance.off('testMethod')
      }).not.toThrow()
    })
  })

  describe('Message Listener Management', () => {
    beforeEach(() => {
      ipcMainInstance = new IPCMain<TestMessage, TestBackgroundMessage>()
    })

    it('should register message listeners with on method', () => {
      const mockHandler = vi.fn().mockReturnValue('test-result')
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation()

      ipcMainInstance.on('testMethod', mockHandler)

      expect(consoleSpy).toHaveBeenCalledWith('on', 'testMethod')
      consoleSpy.mockRestore()
    })

    it('should throw error when registering duplicate listener', () => {
      const mockHandler = vi.fn()
      ipcMainInstance.on('testMethod', mockHandler)

      expect(() => {
        ipcMainInstance.on('testMethod', mockHandler)
      }).toThrow('Message handler testMethod already exists')
    })

    it('should remove listeners with off method', () => {
      const mockHandler = vi.fn()
      ipcMainInstance.on('testMethod', mockHandler)

      // Remove the listener
      ipcMainInstance.off('testMethod')

      // Should be able to register again without error
      expect(() => {
        ipcMainInstance.on('testMethod', mockHandler)
      }).not.toThrow()
    })

    it('should handle off method for non-existent listener', () => {
      expect(() => {
        ipcMainInstance.off('testMethod')
      }).not.toThrow()

      // Should be safe to call multiple times
      ipcMainInstance.off('testMethod')
      ipcMainInstance.off('asyncMethod')
    })
  })

  describe('Message Handling', () => {
    let handleReceivingMessage: (
      event: unknown,
      payload: unknown
    ) => Promise<unknown>

    beforeEach(async () => {
      const { ipcMain } = await import('electron')
      ipcMainInstance = new IPCMain<TestMessage, TestBackgroundMessage>()

      // Get the bound message handler
      handleReceivingMessage = ipcMain.handle.mock.calls[0][1]
    })

    it('should handle successful message with return value', async () => {
      const mockHandler = vi.fn().mockReturnValue('success-result')
      ipcMainInstance.on('testMethod', mockHandler)

      const mockEvent = { sender: { id: 1 } }
      const payload = {
        name: 'testMethod',
        payload: ['arg1', 42],
      }

      const result = await handleReceivingMessage(mockEvent, payload)

      expect(mockHandler).toHaveBeenCalledWith('arg1', 42)
      expect(result).toEqual({
        type: 'success',
        result: 'success-result',
      })
    })

    it('should handle async message with Promise return', async () => {
      const mockHandler = vi.fn().mockResolvedValue({ result: 'async-success' })
      ipcMainInstance.on('asyncMethod', mockHandler)

      const mockEvent = { sender: { id: 1 } }
      const payload = {
        name: 'asyncMethod',
        payload: ['test-data'],
      }

      const result = await handleReceivingMessage(mockEvent, payload)

      expect(mockHandler).toHaveBeenCalledWith('test-data')
      expect(result).toEqual({
        type: 'success',
        result: { result: 'async-success' },
      })
    })

    it('should handle message with no arguments', async () => {
      const mockHandler = vi.fn().mockReturnValue(true)
      ipcMainInstance.on('noArgsMethod', mockHandler)

      const mockEvent = { sender: { id: 1 } }
      const payload = {
        name: 'noArgsMethod',
        payload: [],
      }

      const result = await handleReceivingMessage(mockEvent, payload)

      expect(mockHandler).toHaveBeenCalledWith()
      expect(result).toEqual({
        type: 'success',
        result: true,
      })
    })

    it('should handle unknown message with error', async () => {
      const mockEvent = { sender: { id: 1 } }
      const payload = {
        name: 'unknownMethod',
        payload: [],
      }

      const result = await handleReceivingMessage(mockEvent, payload)

      expect(result).toEqual({
        type: 'error',
        error: 'Unknown IPC message unknownMethod',
      })
    })

    it('should handle handler throwing Error instance', async () => {
      const mockHandler = vi.fn().mockImplementation(() => {
        throw new Error('Handler error message')
      })
      ipcMainInstance.on('errorMethod', mockHandler)

      const mockEvent = { sender: { id: 1 } }
      const payload = {
        name: 'errorMethod',
        payload: [],
      }

      const result = await handleReceivingMessage(mockEvent, payload)

      expect(result).toEqual({
        type: 'error',
        error: 'Handler error message',
      })
    })

    it('should handle handler throwing non-Error value', async () => {
      const mockHandler = vi.fn().mockImplementation(() => {
        throw 'String error'
      })
      ipcMainInstance.on('testMethod', mockHandler)

      const mockEvent = { sender: { id: 1 } }
      const payload = {
        name: 'testMethod',
        payload: ['test'],
      }

      const result = await handleReceivingMessage(mockEvent, payload)

      expect(result).toEqual({
        type: 'error',
        error: 'String error',
      })
    })

    it('should handle handler throwing null/undefined', async () => {
      const mockHandler = vi.fn().mockImplementation(() => {
        throw null
      })
      ipcMainInstance.on('testMethod', mockHandler)

      const mockEvent = { sender: { id: 1 } }
      const payload = {
        name: 'testMethod',
        payload: [],
      }

      const result = await handleReceivingMessage(mockEvent, payload)

      expect(result).toEqual({
        type: 'error',
        error: 'null',
      })
    })

    it('should handle async handler rejection', async () => {
      const mockHandler = vi.fn().mockRejectedValue(new Error('Async error'))
      ipcMainInstance.on('asyncMethod', mockHandler)

      const mockEvent = { sender: { id: 1 } }
      const payload = {
        name: 'asyncMethod',
        payload: ['test'],
      }

      const result = await handleReceivingMessage(mockEvent, payload)

      expect(result).toEqual({
        type: 'error',
        error: 'Async error',
      })
    })
  })

  describe('Send Method - Multi-Window Communication', () => {
    beforeEach(() => {
      ipcMainInstance = new IPCMain<TestMessage, TestBackgroundMessage>()
    })

    it('should send messages to all open windows', async () => {
      const { BrowserWindow } = await import('electron')
      const window1 = { webContents: { send: vi.fn() } }
      const window2 = { webContents: { send: vi.fn() } }
      const window3 = { webContents: { send: vi.fn() } }

      BrowserWindow.getAllWindows.mockReturnValue([window1, window2, window3])

      await ipcMainInstance.send('backgroundEvent', {
        type: 'test',
        payload: 'data',
      })

      expect(window1.webContents.send).toHaveBeenCalledWith('IPC-bridge', {
        name: 'backgroundEvent',
        payload: [{ type: 'test', payload: 'data' }],
      })
      expect(window2.webContents.send).toHaveBeenCalledWith('IPC-bridge', {
        name: 'backgroundEvent',
        payload: [{ type: 'test', payload: 'data' }],
      })
      expect(window3.webContents.send).toHaveBeenCalledWith('IPC-bridge', {
        name: 'backgroundEvent',
        payload: [{ type: 'test', payload: 'data' }],
      })
    })

    it('should handle sending when no windows are open', async () => {
      const { BrowserWindow } = await import('electron')
      BrowserWindow.getAllWindows.mockReturnValue([])

      await expect(
        ipcMainInstance.send('simpleNotification', 'test message')
      ).resolves.not.toThrow()
    })

    it('should send message with multiple parameters', async () => {
      const { BrowserWindow } = await import('electron')
      const mockWindow = { webContents: { send: vi.fn() } }
      BrowserWindow.getAllWindows.mockReturnValue([mockWindow])

      await ipcMainInstance.send('backgroundEvent', {
        type: 'multi',
        payload: { data: [1, 2, 3] },
      })

      expect(mockWindow.webContents.send).toHaveBeenCalledWith('IPC-bridge', {
        name: 'backgroundEvent',
        payload: [{ type: 'multi', payload: { data: [1, 2, 3] } }],
      })
    })

    it('should send message with no parameters', async () => {
      const { BrowserWindow } = await import('electron')
      const mockWindow = { webContents: { send: vi.fn() } }
      BrowserWindow.getAllWindows.mockReturnValue([mockWindow])

      await ipcMainInstance.send('simpleNotification', 'simple')

      expect(mockWindow.webContents.send).toHaveBeenCalledWith('IPC-bridge', {
        name: 'simpleNotification',
        payload: ['simple'],
      })
    })

    it('should use custom channel for sending', async () => {
      const { BrowserWindow } = await import('electron')
      const mockWindow = { webContents: { send: vi.fn() } }
      BrowserWindow.getAllWindows.mockReturnValue([mockWindow])

      const customIPC = new IPCMain<TestMessage, TestBackgroundMessage>(
        'custom-send-channel'
      )

      await customIPC.send('simpleNotification', 'custom channel test')

      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        'custom-send-channel',
        {
          name: 'simpleNotification',
          payload: ['custom channel test'],
        }
      )
    })
  })

  describe('Complex Integration Scenarios', () => {
    beforeEach(() => {
      ipcMainInstance = new IPCMain<TestMessage, TestBackgroundMessage>()
    })

    it('should handle multiple listeners and messages', async () => {
      const handler1 = vi.fn().mockReturnValue('result1')
      const handler2 = vi.fn().mockResolvedValue('result2')
      const handler3 = vi.fn().mockReturnValue(true)

      ipcMainInstance.on('testMethod', handler1)
      ipcMainInstance.on('asyncMethod', handler2)
      ipcMainInstance.on('noArgsMethod', handler3)

      const { ipcMain } = await import('electron')
      const handleReceivingMessage = ipcMain.handle.mock.calls[0][1]
      const mockEvent = { sender: { id: 1 } }

      // Test all handlers
      const result1 = await handleReceivingMessage(mockEvent, {
        name: 'testMethod',
        payload: ['test', 123],
      })

      const result2 = await handleReceivingMessage(mockEvent, {
        name: 'asyncMethod',
        payload: ['async-test'],
      })

      const result3 = await handleReceivingMessage(mockEvent, {
        name: 'noArgsMethod',
        payload: [],
      })

      expect(result1.type).toBe('success')
      expect(result2.type).toBe('success')
      expect(result3.type).toBe('success')
      expect(handler1).toHaveBeenCalledWith('test', 123)
      expect(handler2).toHaveBeenCalledWith('async-test')
      expect(handler3).toHaveBeenCalledWith()
    })

    it('should handle listener lifecycle (add, remove, re-add)', () => {
      const handler = vi.fn().mockReturnValue('test')

      // Add listener
      ipcMainInstance.on('testMethod', handler)

      // Remove listener
      ipcMainInstance.off('testMethod')

      // Should be able to add again
      expect(() => {
        ipcMainInstance.on('testMethod', handler)
      }).not.toThrow()

      // Remove again
      ipcMainInstance.off('testMethod')

      // Should be able to remove non-existent listener
      ipcMainInstance.off('testMethod')
    })

    it('should handle rapid sequential sends', async () => {
      const { BrowserWindow } = await import('electron')
      const mockWindow = { webContents: { send: vi.fn() } }
      BrowserWindow.getAllWindows.mockReturnValue([mockWindow])

      const promises = [
        ipcMainInstance.send('simpleNotification', 'msg1'),
        ipcMainInstance.send('simpleNotification', 'msg2'),
        ipcMainInstance.send('simpleNotification', 'msg3'),
        ipcMainInstance.send('backgroundEvent', {
          type: 'event',
          payload: 'data',
        }),
      ]

      await Promise.all(promises)

      expect(mockWindow.webContents.send).toHaveBeenCalledTimes(4)
    })
  })

  describe('Type Safety and Edge Cases', () => {
    beforeEach(() => {
      ipcMainInstance = new IPCMain<TestMessage, TestBackgroundMessage>()
    })

    it('should handle undefined payload gracefully', async () => {
      const handler = vi.fn().mockReturnValue('handled')
      ipcMainInstance.on('testMethod', handler)

      const { ipcMain } = await import('electron')
      const handleReceivingMessage = ipcMain.handle.mock.calls[0][1]
      const mockEvent = { sender: { id: 1 } }

      // Test with undefined payload - this would cause an error
      const result = await handleReceivingMessage(mockEvent, {
        name: 'testMethod',
        payload: undefined,
      })

      // undefined payload causes spreading error, so expect error type
      expect(result.type).toBe('error')
    })

    it('should handle null payload gracefully', async () => {
      const handler = vi.fn().mockReturnValue('handled')
      ipcMainInstance.on('testMethod', handler)

      const { ipcMain } = await import('electron')
      const handleReceivingMessage = ipcMain.handle.mock.calls[0][1]
      const mockEvent = { sender: { id: 1 } }

      // Test with null payload - this would cause an error
      const result = await handleReceivingMessage(mockEvent, {
        name: 'testMethod',
        payload: null,
      })

      // null payload causes spreading error, so expect error type
      expect(result.type).toBe('error')
    })

    it('should preserve argument types in handlers', async () => {
      const handler = vi.fn().mockReturnValue('typed')
      ipcMainInstance.on('testMethod', handler)

      const { ipcMain } = await import('electron')
      const handleReceivingMessage = ipcMain.handle.mock.calls[0][1]
      const mockEvent = { sender: { id: 1 } }

      const complexArg = { nested: { data: [1, 2, 3] }, bool: true }

      await handleReceivingMessage(mockEvent, {
        name: 'testMethod',
        payload: ['string', 42, complexArg, null, undefined],
      })

      expect(handler).toHaveBeenCalledWith(
        'string',
        42,
        complexArg,
        null,
        undefined
      )
    })
  })
})
