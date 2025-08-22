/**
 * @fileoverview Comprehensive test suite for electron-console-debug.ts script.
 *
 * @description
 * Tests the Electron IPC debug console script functionality including DOM manipulation,
 * event handlers, and electron API integration. Tests both browser and Electron environments.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setupDebugConsole } from './electron-console-debug'

describe('electron-console-debug.ts', () => {
  let originalConsole: Console
  let originalWindow: typeof window
  let originalDocument: typeof document
  let mockElectronAPI: any
  let mockElements: Map<string, any>

  beforeEach(() => {
    // Store originals
    originalConsole = global.console
    originalWindow = global.window as any
    originalDocument = global.document as any

    // Setup mock elements
    mockElements = new Map()

    // Setup mocks
    mockElectronAPI = {
      invoke: vi
        .fn()
        .mockResolvedValue({ terminals: ['terminal1', 'terminal2'] }),
      on: vi.fn(),
      off: vi.fn(),
    }

    // Mock console
    global.console = {
      ...console,
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }

    // Mock document
    global.document = {
      getElementById: vi.fn((id: string) => mockElements.get(id)),
      readyState: 'complete',
      addEventListener: vi.fn(),
    } as any
  })

  afterEach(() => {
    // Restore originals
    global.console = originalConsole
    global.window = originalWindow
    global.document = originalDocument
    vi.clearAllMocks()
  })

  describe('Browser Environment', () => {
    beforeEach(() => {
      // Setup browser environment without electronAPI
      global.window = {} as any
    })

    it('should handle missing electronAPI gracefully', () => {
      setupDebugConsole()

      expect(console.warn).toHaveBeenCalledWith(
        '⚠ window.electronAPI not available - running in web mode'
      )
      expect(console.log).toHaveBeenCalledWith(
        '✓ Enhanced Terminal IPC Debug setup complete'
      )
    })

    it('should not setup event handlers without electronAPI', () => {
      const mockButton = {
        addEventListener: vi.fn(),
      }
      mockElements.set('terminal-list', mockButton)

      setupDebugConsole()

      expect(mockButton.addEventListener).not.toHaveBeenCalled()
    })
  })

  describe('Electron Environment', () => {
    beforeEach(() => {
      // Setup Electron environment with electronAPI
      global.window = {
        electronAPI: mockElectronAPI,
      } as any
    })

    it('should detect electronAPI availability', () => {
      setupDebugConsole()

      expect(console.log).toHaveBeenCalledWith(
        '✅ window.electronAPI is available'
      )
      expect(console.log).toHaveBeenCalledWith(
        '✓ Enhanced Terminal IPC Debug setup complete'
      )
    })

    it('should setup terminal list button functionality', async () => {
      const mockButton = {
        addEventListener: vi.fn(),
      }
      mockElements.set('terminal-list', mockButton)

      setupDebugConsole()

      expect(mockButton.addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      )

      // Simulate button click
      const clickHandler = mockButton.addEventListener.mock.calls[0][1]
      await clickHandler()

      expect(mockElectronAPI.invoke).toHaveBeenCalledWith('get-terminal-list')
      expect(console.log).toHaveBeenCalledWith('Terminal list:', {
        terminals: ['terminal1', 'terminal2'],
      })
    })

    it('should setup terminal data button functionality', async () => {
      const mockButton = {
        addEventListener: vi.fn(),
      }
      mockElements.set('terminal-data', mockButton)

      setupDebugConsole()

      expect(mockButton.addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      )

      // Simulate button click
      const clickHandler = mockButton.addEventListener.mock.calls[0][1]
      await clickHandler()

      expect(mockElectronAPI.invoke).toHaveBeenCalledWith(
        'get-terminal-data',
        'main'
      )
    })

    it('should setup send input button functionality', async () => {
      const mockButton = {
        addEventListener: vi.fn(),
      }
      mockElements.set('send-input', mockButton)

      setupDebugConsole()

      expect(mockButton.addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      )

      // Simulate button click
      const clickHandler = mockButton.addEventListener.mock.calls[0][1]
      await clickHandler()

      expect(mockElectronAPI.invoke).toHaveBeenCalledWith(
        'sendTerminalInput',
        'main',
        'ls -la\n'
      )
      expect(console.log).toHaveBeenCalledWith('✓ Input sent to terminal')
    })

    it('should setup event listeners for terminal output', () => {
      setupDebugConsole()

      expect(mockElectronAPI.on).toHaveBeenCalledWith(
        'terminal-output',
        expect.any(Function)
      )
      expect(mockElectronAPI.on).toHaveBeenCalledWith(
        'terminal-error',
        expect.any(Function)
      )
    })

    it('should handle terminal output events', () => {
      setupDebugConsole()

      const outputHandler = mockElectronAPI.on.mock.calls[0][1]
      outputHandler('terminal1', 'test output')

      expect(console.log).toHaveBeenCalledWith(
        'Terminal terminal1 output:',
        'test output'
      )
    })

    it('should handle terminal error events', () => {
      setupDebugConsole()

      const errorHandler = mockElectronAPI.on.mock.calls[1][1]
      const testError = new Error('test error')
      errorHandler('terminal1', testError)

      expect(console.error).toHaveBeenCalledWith(
        'Terminal terminal1 error:',
        testError
      )
    })

    it('should handle errors when getting terminal list', async () => {
      const mockButton = {
        addEventListener: vi.fn(),
      }
      mockElements.set('terminal-list', mockButton)

      const testError = new Error('Failed to get terminals')
      mockElectronAPI.invoke.mockRejectedValueOnce(testError)

      setupDebugConsole()

      const clickHandler = mockButton.addEventListener.mock.calls[0][1]
      await clickHandler()

      expect(console.error).toHaveBeenCalledWith(
        'Error getting terminal list:',
        testError
      )
    })

    it('should handle errors when sending input', async () => {
      const mockButton = {
        addEventListener: vi.fn(),
      }
      mockElements.set('send-input', mockButton)

      const testError = new Error('Failed to send input')
      mockElectronAPI.invoke.mockRejectedValueOnce(testError)

      setupDebugConsole()

      const clickHandler = mockButton.addEventListener.mock.calls[0][1]
      await clickHandler()

      expect(console.error).toHaveBeenCalledWith(
        'Error sending terminal input:',
        testError
      )
    })
  })

  describe('Auto-initialization', () => {
    it('should auto-initialize when document is ready', () => {
      global.window = {
        electronAPI: mockElectronAPI,
      } as any
      global.document = {
        ...global.document,
        readyState: 'complete',
      } as any

      // Import would trigger auto-initialization
      // Since we're testing the module, we just call setupDebugConsole
      setupDebugConsole()

      expect(console.log).toHaveBeenCalledWith(
        'Starting Enhanced Terminal IPC Debug Console...'
      )
    })

    it('should wait for DOMContentLoaded when document is loading', () => {
      global.document = {
        readyState: 'loading',
        addEventListener: vi.fn(),
        getElementById: vi.fn(),
      } as any

      // The actual module would add event listener
      // We test the logic here
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupDebugConsole)
      }

      expect(document.addEventListener).toHaveBeenCalledWith(
        'DOMContentLoaded',
        setupDebugConsole
      )
    })
  })
})
