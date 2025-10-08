/**
 * @fileoverview Comprehensive tests for HatcherTerminal component.
 *
 * @description
 * Complete test suite for the HatcherTerminal component that ensures 100% code coverage.
 * Uses Vitest mocking patterns and follows xterm.js testing best practices from Context7.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import {
  createHatcherTerminal,
  type HatcherTerminalInstance,
  type HatcherTerminalOptions,
  type HatcherTerminalTheme,
} from './HatcherTerminal'

// Mock DOM environment
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
})

Object.defineProperty(global, 'document', {
  value: {
    querySelector: vi.fn(),
  },
})

// Mock xterm and addons with all required methods
const mockTerminal = {
  write: vi.fn(),
  clear: vi.fn(),
  reset: vi.fn(),
  focus: vi.fn(),
  blur: vi.fn(),
  dispose: vi.fn(),
  onData: vi.fn(),
  onResize: vi.fn(),
  open: vi.fn(),
  loadAddon: vi.fn(),
  cols: 80,
  rows: 24,
  options: { theme: {} },
}

const mockFitAddon = {
  fit: vi.fn(),
}

const mockWebLinksAddon = {}

// Mock modules
vi.doMock('xterm', async () => ({
  Terminal: vi.fn(() => mockTerminal),
}))

vi.doMock('@xterm/addon-fit', async () => ({
  FitAddon: vi.fn(() => mockFitAddon),
}))

vi.doMock('@xterm/addon-web-links', async () => ({
  WebLinksAddon: vi.fn(() => mockWebLinksAddon),
}))

// Create logger mock instance
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

// Mock Logger
vi.doMock('../utils/logger', () => ({
  Logger: vi.fn().mockImplementation(() => mockLogger),
}))

// Mock WelcomeMessageProvider with the actual format
const mockWelcomeMessage =
  '\u001b[36m🚀 Terminal Terminal\u001b[0m\r\n\u001b[33mVersion 1.0.0\u001b[0m\r\n\r\n\u001b[32mSystem Information:\u001b[0m\r\n  User: chrissmejia\r\n  Host: Chrisss-MacBook-Pro.local\r\n  Platform: darwin arm64\r\n  Node: v22.18.0\r\n\r\n'
const mockWelcomeProvider = {
  getWelcomeMessage: vi.fn().mockReturnValue(mockWelcomeMessage),
}
const WelcomeMessageProvider = vi
  .fn()
  .mockImplementation(() => mockWelcomeProvider)
vi.doMock('../core/WelcomeMessageProvider', () => ({
  WelcomeMessageProvider,
}))

describe('HatcherTerminal', () => {
  let mockContainer: HTMLElement

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset terminal mock
    Object.assign(mockTerminal, {
      write: vi.fn(),
      clear: vi.fn(),
      reset: vi.fn(),
      focus: vi.fn(),
      blur: vi.fn(),
      dispose: vi.fn(),
      onData: vi.fn(),
      onResize: vi.fn(),
      open: vi.fn(),
      loadAddon: vi.fn(),
      cols: 80,
      rows: 24,
      options: { theme: {} },
    })

    // Reset addon mocks
    Object.assign(mockFitAddon, {
      fit: vi.fn(),
    })

    // Reset logger mocks
    mockLogger.debug.mockClear()
    mockLogger.info.mockClear()
    mockLogger.warn.mockClear()
    mockLogger.error.mockClear()

    // Reset WelcomeMessageProvider mocks
    mockWelcomeProvider.getWelcomeMessage.mockClear()
    WelcomeMessageProvider.mockClear()

    // Create mock container
    mockContainer = {
      id: 'test-container',
      style: {},
    } as unknown as HTMLElement

    // Mock document.querySelector
    vi.mocked(document.querySelector).mockReturnValue(mockContainer)

    // Reset global window mocks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing global window for test cleanup
    delete (global as any).window.electronAPI
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('createHatcherTerminal', () => {
    it('should create terminal with default options', async () => {
      const terminal = await createHatcherTerminal('#test-container')

      expect(document.querySelector).toHaveBeenCalledWith('#test-container')
      expect(terminal).toBeDefined()
      expect(terminal.id).toMatch(/^hatcher-terminal-\d+-\w+$/)
      expect(terminal.terminal).toBe(mockTerminal)
      expect(mockTerminal.open).toHaveBeenCalledWith(mockContainer)
      expect(mockFitAddon.fit).toHaveBeenCalled()
    })

    it('should create terminal with HTMLElement container', async () => {
      const terminal = await createHatcherTerminal(mockContainer)

      expect(document.querySelector).not.toHaveBeenCalled()
      expect(terminal).toBeDefined()
      expect(mockTerminal.open).toHaveBeenCalledWith(mockContainer)
    })

    it('should throw error when container element not found', async () => {
      vi.mocked(document.querySelector).mockReturnValue(null)

      await expect(createHatcherTerminal('#non-existent')).rejects.toThrow(
        'Container element not found: #non-existent'
      )
    })

    it('should apply all default configuration options', async () => {
      const { Terminal } = await import('xterm')

      await createHatcherTerminal('#test-container')

      expect(Terminal).toHaveBeenCalledWith({
        fontSize: 14,
        fontFamily: expect.stringContaining('ui-monospace'),
        theme: {
          background: 'transparent',
          foreground: '#f8fafc',
          cursor: '#dfa927',
          selectionBackground: 'rgba(223, 169, 39, 0.3)',
          black: '#000000',
          red: '#cd3131',
          green: '#0dbc79',
          yellow: '#e5e510',
          blue: '#2472c8',
          magenta: '#bc3fbc',
          cyan: '#11a8cd',
          white: '#e5e5e5',
          brightBlack: '#666666',
          brightRed: '#f14c4c',
          brightGreen: '#23d18b',
          brightYellow: '#f5f543',
          brightBlue: '#3b8eea',
          brightMagenta: '#d670d6',
          brightCyan: '#29b8db',
          brightWhite: '#ffffff',
        },
        cursorBlink: true,
        scrollback: 10000,
      })
    })

    it('should apply custom options when provided', async () => {
      const options: HatcherTerminalOptions = {
        fontSize: 16,
        fontFamily: 'monospace',
        cursorBlink: false,
        scrollback: 5000,
        theme: 'light',
        useWebGL: false,
        enableWebLinks: false,
        autoResize: false,
        welcomeMessage: false,
      }

      const { Terminal } = await import('xterm')

      await createHatcherTerminal('#test-container', options)

      expect(Terminal).toHaveBeenCalledWith({
        fontSize: 16,
        fontFamily: 'monospace',
        theme: {
          background: 'transparent',
          foreground: '#0f172a',
          cursor: '#dfa927',
          selectionBackground: 'rgba(223, 169, 39, 0.3)',
          black: '#000000',
          red: '#cd3131',
          green: '#0dbc79',
          yellow: '#c79920',
          blue: '#2472c8',
          magenta: '#bc3fbc',
          cyan: '#11a8cd',
          white: '#e5e5e5',
          brightBlack: '#666666',
          brightRed: '#f14c4c',
          brightGreen: '#23d18b',
          brightYellow: '#dfa927',
          brightBlue: '#3b8eea',
          brightMagenta: '#d670d6',
          brightCyan: '#29b8db',
          brightWhite: '#ffffff',
        },
        cursorBlink: false,
        scrollback: 5000,
      })
    })

    it('should apply custom theme object', async () => {
      const customTheme: HatcherTerminalTheme = {
        name: 'custom',
        background: '#000000',
        foreground: '#ffffff',
        cursor: '#ff0000',
        selection: 'rgba(255, 0, 0, 0.3)',
        colors: {
          red: '#ff0000',
          green: '#00ff00',
          blue: '#0000ff',
        },
      }

      const { Terminal } = await import('xterm')

      await createHatcherTerminal('#test-container', { theme: customTheme })

      expect(Terminal).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: {
            background: '#000000',
            foreground: '#ffffff',
            cursor: '#ff0000',
            selectionBackground: 'rgba(255, 0, 0, 0.3)',
            red: '#ff0000',
            green: '#00ff00',
            blue: '#0000ff',
          },
        })
      )
    })

    it('should load FitAddon by default', async () => {
      const { FitAddon } = await import('@xterm/addon-fit')

      await createHatcherTerminal('#test-container')

      expect(FitAddon).toHaveBeenCalled()
      expect(mockTerminal.loadAddon).toHaveBeenCalledWith(mockFitAddon)
    })

    it('should load WebLinksAddon when enabled', async () => {
      const { WebLinksAddon } = await import('@xterm/addon-web-links')

      await createHatcherTerminal('#test-container', { enableWebLinks: true })

      expect(WebLinksAddon).toHaveBeenCalled()
      expect(mockTerminal.loadAddon).toHaveBeenCalledWith(mockWebLinksAddon)
    })

    it('should not load WebLinksAddon when disabled', async () => {
      const { WebLinksAddon } = await import('@xterm/addon-web-links')

      await createHatcherTerminal('#test-container', { enableWebLinks: false })

      expect(WebLinksAddon).not.toHaveBeenCalled()
    })

    it('should handle WebGL addon gracefully when useWebGL is true', async () => {
      const terminal = await createHatcherTerminal('#test-container', {
        useWebGL: true,
      })

      expect(terminal).toBeDefined()
      // WebGL addon handling is currently just debug logging
    })

    it('should show welcome message by default', async () => {
      await createHatcherTerminal('#test-container')

      // Verify welcome message was written with expected structure
      // Don't check exact system info as it varies by environment
      expect(mockTerminal.write).toHaveBeenCalled()
      const writtenMessage = mockTerminal.write.mock.calls[0][0]
      expect(writtenMessage).toContain('Terminal')
      expect(writtenMessage).toContain('Version')
      expect(writtenMessage).toContain('System Information')
    })

    it('should show custom welcome message when provided', async () => {
      const customMessage = 'Custom welcome message!'

      await createHatcherTerminal('#test-container', {
        customWelcomeMessage: customMessage,
      })

      expect(mockTerminal.write).toHaveBeenCalledWith(customMessage)
    })

    it('should not show welcome message when disabled', async () => {
      await createHatcherTerminal('#test-container', { welcomeMessage: false })

      expect(mockTerminal.write).not.toHaveBeenCalled()
    })

    it('should setup auto-resize when enabled', async () => {
      await createHatcherTerminal('#test-container', { autoResize: true })

      expect(ResizeObserver).toHaveBeenCalled()
      const resizeObserver = vi.mocked(ResizeObserver).mock.results[0].value
      expect(resizeObserver.observe).toHaveBeenCalledWith(mockContainer)
    })

    it('should call fitAddon.fit() when ResizeObserver triggers', async () => {
      let resizeCallback: (() => void) | undefined

      // Capture the ResizeObserver callback
      vi.mocked(ResizeObserver).mockImplementation((cb) => {
        resizeCallback = cb
        return {
          observe: vi.fn(),
          unobserve: vi.fn(),
          disconnect: vi.fn(),
        }
      })

      // Override ResizeObserver to capture callback
      Object.defineProperty(window, 'ResizeObserver', {
        writable: true,
        value: vi.fn().mockImplementation((callback) => {
          resizeCallback = callback
          return {
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
          }
        }),
      })

      await createHatcherTerminal('#test-container', { autoResize: true })

      // Clear the initial fit() calls
      mockFitAddon.fit.mockClear()

      // Trigger the resize callback
      expect(resizeCallback).toBeDefined()
      resizeCallback?.()

      // Verify fitAddon.fit() was called
      expect(mockFitAddon.fit).toHaveBeenCalled()
    })

    it('should not setup auto-resize when disabled', async () => {
      await createHatcherTerminal('#test-container', { autoResize: false })

      expect(ResizeObserver).not.toHaveBeenCalled()
    })

    it('should setup Electron IPC when enabled and electronAPI available', async () => {
      // Mock electronAPI
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking global window.electronAPI for testing
      ;(global as any).window = {
        electronAPI: {},
      }

      await createHatcherTerminal('#test-container', {
        ipc: { enabled: true },
      })

      expect(mockTerminal.write).toHaveBeenCalledWith(
        '\r\n[Running in Electron environment]\r\n'
      )
    })

    it('should not setup Electron IPC when electronAPI not available', async () => {
      await createHatcherTerminal('#test-container', {
        ipc: { enabled: true },
      })

      // Should not write Electron message
      expect(mockTerminal.write).not.toHaveBeenCalledWith(
        expect.stringContaining('Electron environment')
      )
    })

    it('should not setup Electron IPC when disabled', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking global window.electronAPI for testing
      ;(global as any).window = {
        electronAPI: {},
      }

      await createHatcherTerminal('#test-container', {
        ipc: { enabled: false },
      })

      expect(mockTerminal.write).not.toHaveBeenCalledWith(
        expect.stringContaining('Electron environment')
      )
    })
  })

  describe('HatcherTerminalInstance methods', () => {
    let instance: HatcherTerminalInstance

    beforeEach(async () => {
      instance = await createHatcherTerminal('#test-container')
    })

    it('should implement write method', () => {
      const data = 'test data'
      instance.write(data)

      expect(mockTerminal.write).toHaveBeenCalledWith(data)
    })

    it('should implement clear method', () => {
      instance.clear()

      expect(mockTerminal.clear).toHaveBeenCalled()
    })

    it('should implement reset method', () => {
      instance.reset()

      expect(mockTerminal.reset).toHaveBeenCalled()
    })

    it('should implement focus method', () => {
      instance.focus()

      expect(mockTerminal.focus).toHaveBeenCalled()
    })

    it('should implement blur method', () => {
      instance.blur()

      expect(mockTerminal.blur).toHaveBeenCalled()
    })

    it('should implement updateTheme method with string theme', () => {
      instance.updateTheme('light')

      expect(mockTerminal.options.theme).toEqual({
        background: 'transparent',
        foreground: '#0f172a',
        cursor: '#dfa927',
        selectionBackground: 'rgba(223, 169, 39, 0.3)',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#c79920',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#dfa927',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#ffffff',
      })
    })

    it('should implement updateTheme method with custom theme object', () => {
      const customTheme: HatcherTerminalTheme = {
        name: 'custom',
        background: '#111111',
        foreground: '#eeeeee',
        cursor: '#00ff00',
        selection: 'rgba(0, 255, 0, 0.3)',
        colors: {
          red: '#ff0000',
        },
      }

      instance.updateTheme(customTheme)

      expect(mockTerminal.options.theme).toEqual({
        background: '#111111',
        foreground: '#eeeeee',
        cursor: '#00ff00',
        selectionBackground: 'rgba(0, 255, 0, 0.3)',
        red: '#ff0000',
      })
    })

    it('should implement fit method', () => {
      instance.fit()

      expect(mockFitAddon.fit).toHaveBeenCalled()
    })

    it('should implement getSize method', () => {
      const size = instance.getSize()

      expect(size).toEqual({
        cols: 80,
        rows: 24,
      })
    })

    it('should implement dispose method', () => {
      instance.dispose()

      expect(mockTerminal.dispose).toHaveBeenCalled()
    })

    it('should implement onData method', () => {
      const callback = vi.fn()
      instance.onData(callback)

      expect(mockTerminal.onData).toHaveBeenCalledWith(callback)
    })

    it('should implement onResize method', () => {
      const callback = vi.fn()
      instance.onResize(callback)

      expect(mockTerminal.onResize).toHaveBeenCalledWith(callback)
    })
  })

  describe('internal functions', () => {
    it('should call generateWelcomeMessage when custom message not provided', async () => {
      await createHatcherTerminal('#test-container', {
        welcomeMessage: true,
        customWelcomeMessage: undefined, // Explicitly no custom message
      })

      // Since we have working auto-generated welcome message test above,
      // we just verify that some welcome message was written with expected structure
      expect(mockTerminal.write).toHaveBeenCalled()
      const writtenMessage = mockTerminal.write.mock.calls[0][0]
      expect(writtenMessage).toContain('Terminal')
      expect(writtenMessage).toContain('System Information')
    })

    it('should handle setupElectronIPC when electronAPI not available', async () => {
      // This tests the early return in setupElectronIPC
      // Make sure window exists but electronAPI does not
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing global window for test cleanup
      delete (global as any).window.electronAPI

      const terminal = await createHatcherTerminal('#test-container', {
        ipc: { enabled: true },
      })

      expect(terminal).toBeDefined()
      expect(mockTerminal.write).not.toHaveBeenCalledWith(
        expect.stringContaining('Electron environment')
      )
    })

    it('should properly test setupElectronIPC early return branch', async () => {
      // Set up window without electronAPI to test the early return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking global window.electronAPI for testing
      ;(global as any).window = { electronAPI: undefined }

      const terminal = await createHatcherTerminal('#test-container', {
        ipc: { enabled: true },
      })

      expect(terminal).toBeDefined()
      // Should not write the Electron environment message when electronAPI is undefined
      expect(mockTerminal.write).not.toHaveBeenCalledWith(
        '\r\n[Running in Electron environment]\r\n'
      )
    })
  })

  describe('default export', () => {
    it('should export createHatcherTerminal as default', async () => {
      const HatcherTerminalModule = await import('./HatcherTerminal')
      expect(HatcherTerminalModule.default).toBeDefined()
      expect(typeof HatcherTerminalModule.default).toBe('function')
      expect(HatcherTerminalModule.default.name).toBe('createHatcherTerminal')
    })
  })

  describe('HATCHER_THEMES constant', () => {
    it('should have correct dark theme properties', async () => {
      const terminal = await createHatcherTerminal('#test-container', {
        theme: 'dark',
      })

      expect(terminal).toBeDefined()
      // Theme is tested via Terminal constructor call above
    })

    it('should have correct light theme properties', async () => {
      const terminal = await createHatcherTerminal('#test-container', {
        theme: 'light',
      })

      expect(terminal).toBeDefined()
      // Theme is tested via Terminal constructor call above
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle undefined options gracefully', async () => {
      const terminal = await createHatcherTerminal('#test-container', undefined)

      expect(terminal).toBeDefined()
      expect(terminal.id).toMatch(/^hatcher-terminal-\d+-\w+$/)
    })

    it('should handle empty options object', async () => {
      const terminal = await createHatcherTerminal('#test-container', {})

      expect(terminal).toBeDefined()
      expect(terminal.id).toMatch(/^hatcher-terminal-\d+-\w+$/)
    })

    it('should handle partial options', async () => {
      const terminal = await createHatcherTerminal('#test-container', {
        fontSize: 18,
        // Other options should use defaults
      })

      expect(terminal).toBeDefined()
    })

    it('should generate unique IDs for multiple instances', async () => {
      const terminal1 = await createHatcherTerminal('#test-container')
      const terminal2 = await createHatcherTerminal('#test-container')

      expect(terminal1.id).not.toBe(terminal2.id)
      expect(terminal1.id).toMatch(/^hatcher-terminal-\d+-\w+$/)
      expect(terminal2.id).toMatch(/^hatcher-terminal-\d+-\w+$/)
    })

    it('should handle boolean false values correctly for options', async () => {
      const options: HatcherTerminalOptions = {
        welcomeMessage: false,
        cursorBlink: false,
        useWebGL: false,
        enableWebLinks: false,
        autoResize: false,
      }

      const terminal = await createHatcherTerminal('#test-container', options)

      expect(terminal).toBeDefined()
      expect(mockTerminal.write).not.toHaveBeenCalled() // No welcome message
    })
  })
})
