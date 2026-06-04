/**
 * @fileoverview Test suite for TerminalInstance functionality.
 *
 * @description
 * Comprehensive tests for the TerminalInstance class that manages individual
 * terminal instances with xterm.js integration following VSCode patterns.
 *
 * @example
 * ```typescript
 * // Testing terminal instance creation
 * const config = { id: 'test-1', name: 'Test Terminal', cols: 80, rows: 24 }
 * const instance = new TerminalInstance(config)
 * expect(instance.id).toBe('test-1')
 * expect(instance.title).toBe('Test Terminal')
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { TerminalInstance } from './TerminalInstance'
import type { TerminalConfig } from '../types/terminal'

// Mock dependencies with vi.hoisted
const mocks = vi.hoisted(() => {
  return {
    uuidV4: vi.fn(() => 'test-uuid-123'),
    xtermTerminal: {
      onData: vi.fn(),
      onResize: vi.fn(),
      onTitleChange: vi.fn(),
      open: vi.fn(),
      write: vi.fn(),
      resize: vi.fn(),
      focus: vi.fn(),
      blur: vi.fn(),
      clear: vi.fn(),
      getSelection: vi.fn(() => 'selected text'),
      selectAll: vi.fn(),
      dispose: vi.fn(),
      loadAddon: vi.fn(),
    },
    fitAddon: {
      fit: vi.fn(),
    },
    resizeObserver: {
      observe: vi.fn(),
      disconnect: vi.fn(),
    },
    electronAPI: {
      send: vi.fn(),
    },
    clipboard: {
      writeText: vi.fn(),
      readText: vi.fn(),
    },
  }
})

vi.mock('uuid', () => ({
  v4: mocks.uuidV4,
}))

// Mock xterm.js and addons
vi.mock('xterm', () => ({
  Terminal: vi.fn(() => mocks.xtermTerminal),
}))

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: vi.fn(() => mocks.fitAddon),
}))

// Mock global objects
const mockWindow = {
  electronAPI: mocks.electronAPI,
  ResizeObserver: vi.fn(() => mocks.resizeObserver),
}

const mockNavigator = {
  clipboard: mocks.clipboard,
}

const mockDocument = {
  createElement: vi.fn(() => ({
    appendChild: vi.fn(),
    removeChild: vi.fn(),
    style: {},
  })),
}

/**
 * Mock TerminalInstance configuration for testing.
 *
 * @remarks
 * Provides standardized configuration for testing terminal instances
 * with various scenarios and edge cases.
 *
 * @public
 * @since 1.0.0
 */
interface MockTerminalConfig extends TerminalConfig {
  id: string
  name: string
  shell: string
  cwd: string
  env: Record<string, string>
  cols: number
  rows: number
}

describe('TerminalInstance', () => {
  let instance: TerminalInstance
  let mockConfig: MockTerminalConfig
  let originalWindow: typeof globalThis.window
  let originalNavigator: typeof navigator

  beforeEach(() => {
    // Store original globals
    originalWindow = globalThis.window
    originalNavigator = globalThis.navigator

    // Mock globals
    Object.defineProperty(globalThis, 'window', {
      value: mockWindow,
      writable: true,
    })
    Object.defineProperty(globalThis, 'navigator', {
      value: mockNavigator,
      writable: true,
    })
    Object.defineProperty(globalThis, 'document', {
      value: mockDocument,
      writable: true,
    })

    // Reset UUID mock
    mocks.uuidV4.mockReturnValue('test-uuid-123')

    // Create mock config
    mockConfig = {
      id: 'terminal-1',
      name: 'Test Terminal',
      shell: '/bin/bash',
      cwd: '/home/user',
      env: { PATH: '/usr/bin' },
      cols: 80,
      rows: 24,
    }

    // Reset all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (instance && !instance.isDisposed) {
      instance.dispose()
    }

    // Restore original globals
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      writable: true,
    })
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
    })
    if (typeof document !== 'undefined') {
      // Only restore if document was originally defined
    }
  })

  describe('Constructor', () => {
    /**
     * Tests terminal instance creation with full configuration.
     *
     * @returns void
     * Should create terminal instance with provided configuration
     *
     * @example
     * ```typescript
     * const config = { id: 'term-1', name: 'My Terminal', cols: 120, rows: 40 }
     * const instance = new TerminalInstance(config, 1234)
     * expect(instance.id).toBe('term-1')
     * expect(instance.config.name).toBe('My Terminal')
     * expect(instance.pid).toBe(1234)
     * ```
     *
     * @public
     */
    it('should create terminal instance with provided config', () => {
      instance = new TerminalInstance(mockConfig, 1234)

      expect(instance.id).toBe('terminal-1')
      expect(instance.config).toEqual(mockConfig)
      expect(instance.pid).toBe(1234)
      expect(instance.title).toBe('Test Terminal')
      expect(instance.isDisposed).toBe(false)
      expect(instance.isReady).toBe(false)
    })

    /**
     * Tests terminal instance creation with auto-generated ID.
     *
     * @returns void
     * Should generate UUID when no ID is provided in config
     *
     * @example
     * ```typescript
     * const config = { name: 'Auto ID Terminal' }
     * const instance = new TerminalInstance(config)
     * expect(instance.id).toBe('test-uuid-123')
     * expect(instance.config.id).toBe('test-uuid-123')
     * ```
     *
     * @public
     */
    it('should generate UUID when no ID provided', () => {
      const configWithoutId = { ...mockConfig }
      delete configWithoutId.id

      instance = new TerminalInstance(configWithoutId)

      expect(instance.id).toBe('test-uuid-123')
      expect(instance.config.id).toBe('test-uuid-123')
      expect(mocks.uuidV4).toHaveBeenCalled()
    })

    /**
     * Tests terminal instance creation with default title.
     *
     * @returns void
     * Should generate default title when name is not provided
     *
     * @example
     * ```typescript
     * const config = { id: 'test-uuid-123' }
     * const instance = new TerminalInstance(config)
     * expect(instance.title).toBe('Terminal test-uui')
     * ```
     *
     * @public
     */
    it('should use default title when name not provided', () => {
      const configWithoutName = { ...mockConfig }
      delete configWithoutName.name

      instance = new TerminalInstance(configWithoutName)

      expect(instance.title).toBe('Terminal terminal')
    })

    /**
     * Tests terminal instance creation without PID.
     *
     * @returns void
     * Should handle undefined PID gracefully
     *
     * @example
     * ```typescript
     * const instance = new TerminalInstance(config)
     * expect(instance.pid).toBeUndefined()
     * ```
     *
     * @public
     */
    it('should handle undefined PID', () => {
      instance = new TerminalInstance(mockConfig)

      expect(instance.pid).toBeUndefined()
    })
  })

  describe('XTerm initialization', () => {
    beforeEach(() => {
      instance = new TerminalInstance(mockConfig)
    })

    /**
     * Tests successful xterm.js initialization.
     *
     * @returns Promise<void>
     * Should initialize xterm terminal with proper configuration
     *
     * @example
     * ```typescript
     * const container = document.createElement('div')
     * await instance.initializeXterm(container)
     * expect(instance.isReady).toBe(true)
     * ```
     *
     * @public
     */
    it('should initialize xterm terminal successfully', async () => {
      const mockContainer = document.createElement('div')

      await instance.initializeXterm(mockContainer)

      expect(instance.isReady).toBe(true)
      expect(mocks.xtermTerminal.onData).toHaveBeenCalled()
      expect(mocks.xtermTerminal.onResize).toHaveBeenCalled()
      expect(mocks.xtermTerminal.onTitleChange).toHaveBeenCalled()
      expect(mocks.xtermTerminal.open).toHaveBeenCalledWith(mockContainer)
    })

    /**
     * Tests xterm initialization in server-side environment.
     *
     * @returns Promise<void>
     * Should skip initialization when window is undefined
     *
     * @example
     * ```typescript
     * // Mock server-side environment
     * Object.defineProperty(globalThis, 'window', { value: undefined })
     * await instance.initializeXterm(container)
     * expect(instance.isReady).toBe(false)
     * ```
     *
     * @public
     */
    it('should skip initialization in server-side environment', async () => {
      // Mock server-side environment
      Object.defineProperty(globalThis, 'window', {
        value: undefined,
        writable: true,
      })

      const mockContainer = document.createElement('div')
      await instance.initializeXterm(mockContainer)

      expect(instance.isReady).toBe(false)
      expect(mocks.xtermTerminal.open).not.toHaveBeenCalled()
    })

    /**
     * Tests error handling when xterm initialization fails.
     *
     * @throws {@link Error}
     * Should throw error when xterm initialization fails
     *
     * @example
     * ```typescript
     * mocks.xtermTerminal.open.mockImplementation(() => { throw new Error('Init failed') })
     * await expect(instance.initializeXterm(container)).rejects.toThrow('Init failed')
     * ```
     *
     * @public
     */
    it('should handle xterm initialization errors', async () => {
      mocks.xtermTerminal.open.mockImplementation(() => {
        throw new Error('XTerm initialization failed')
      })

      const mockContainer = document.createElement('div')

      await expect(instance.initializeXterm(mockContainer)).rejects.toThrow(
        'XTerm initialization failed'
      )
    })

    /**
     * Tests error when initializing disposed terminal.
     *
     * @throws {@link Error}
     * Should throw error when attempting to initialize disposed terminal
     *
     * @example
     * ```typescript
     * instance.dispose()
     * await expect(instance.initializeXterm(container)).rejects.toThrow('Terminal instance is disposed')
     * ```
     *
     * @public
     */
    it('should throw error when initializing disposed terminal', async () => {
      instance.dispose()
      const mockContainer = document.createElement('div')

      await expect(instance.initializeXterm(mockContainer)).rejects.toThrow(
        'Terminal instance is disposed'
      )
    })
  })

  describe('Data handling', () => {
    beforeEach(async () => {
      instance = new TerminalInstance(mockConfig)
      const mockContainer = document.createElement('div')
      // Don't throw errors in data handling setup
      mocks.xtermTerminal.open.mockImplementation(() => {})
      await instance.initializeXterm(mockContainer)
    })

    /**
     * Tests terminal data writing functionality.
     *
     * @returns void
     * Should write data to xterm terminal and emit data event
     *
     * @example
     * ```typescript
     * const dataSpy = vi.fn()
     * instance.on('data', dataSpy)
     * instance.writeData('Hello World')
     * expect(mocks.xtermTerminal.write).toHaveBeenCalledWith('Hello World')
     * expect(dataSpy).toHaveBeenCalledWith('Hello World')
     * ```
     *
     * @public
     */
    it('should write data to terminal', () => {
      const dataSpy = vi.fn()
      instance.on('data', dataSpy)

      instance.writeData('Hello World')

      expect(mocks.xtermTerminal.write).toHaveBeenCalledWith('Hello World')
      expect(dataSpy).toHaveBeenCalledWith('Hello World')
    })

    /**
     * Tests data writing to disposed terminal.
     *
     * @returns void
     * Should not write data when terminal is disposed
     *
     * @example
     * ```typescript
     * instance.dispose()
     * instance.writeData('test data')
     * expect(mocks.xtermTerminal.write).not.toHaveBeenCalled()
     * ```
     *
     * @public
     */
    it('should not write data when disposed', () => {
      instance.dispose()

      instance.writeData('test data')

      expect(mocks.xtermTerminal.write).not.toHaveBeenCalled()
    })

    /**
     * Tests data writing when xterm is not ready.
     *
     * @returns void
     * Should emit data event even when xterm is not ready
     *
     * @example
     * ```typescript
     * const instance = new TerminalInstance(config) // Not initialized
     * const dataSpy = vi.fn()
     * instance.on('data', dataSpy)
     * instance.writeData('test')
     * expect(dataSpy).toHaveBeenCalledWith('test')
     * ```
     *
     * @public
     */
    it('should emit data event even when xterm not ready', () => {
      const uninitializedInstance = new TerminalInstance(mockConfig)
      const dataSpy = vi.fn()
      uninitializedInstance.on('data', dataSpy)

      uninitializedInstance.writeData('test data')

      expect(dataSpy).toHaveBeenCalledWith('test data')
      expect(mocks.xtermTerminal.write).not.toHaveBeenCalled()

      uninitializedInstance.dispose()
    })
  })

  describe('Terminal operations', () => {
    beforeEach(async () => {
      instance = new TerminalInstance(mockConfig)
      const mockContainer = document.createElement('div')
      // Don't throw errors in terminal operations setup
      mocks.xtermTerminal.open.mockImplementation(() => {})
      await instance.initializeXterm(mockContainer)
    })

    /**
     * Tests terminal resizing functionality.
     *
     * @returns void
     * Should resize xterm terminal and update configuration
     *
     * @example
     * ```typescript
     * instance.resize(120, 40)
     * expect(mocks.xtermTerminal.resize).toHaveBeenCalledWith(120, 40)
     * expect(instance.config.cols).toBe(120)
     * expect(instance.config.rows).toBe(40)
     * ```
     *
     * @public
     */
    it('should resize terminal', () => {
      instance.resize(120, 40)

      expect(mocks.xtermTerminal.resize).toHaveBeenCalledWith(120, 40)
      expect(instance.config.cols).toBe(120)
      expect(instance.config.rows).toBe(40)
    })

    /**
     * Tests terminal focus functionality.
     *
     * @returns void
     * Should focus xterm terminal and emit focus event
     *
     * @example
     * ```typescript
     * const focusSpy = vi.fn()
     * instance.on('focus', focusSpy)
     * instance.focus()
     * expect(mocks.xtermTerminal.focus).toHaveBeenCalled()
     * expect(focusSpy).toHaveBeenCalled()
     * ```
     *
     * @public
     */
    it('should focus terminal', () => {
      const focusSpy = vi.fn()
      instance.on('focus', focusSpy)

      instance.focus()

      expect(mocks.xtermTerminal.focus).toHaveBeenCalled()
      expect(focusSpy).toHaveBeenCalled()
    })

    /**
     * Tests terminal blur functionality.
     *
     * @returns void
     * Should blur xterm terminal and emit blur event
     *
     * @example
     * ```typescript
     * const blurSpy = vi.fn()
     * instance.on('blur', blurSpy)
     * instance.blur()
     * expect(mocks.xtermTerminal.blur).toHaveBeenCalled()
     * expect(blurSpy).toHaveBeenCalled()
     * ```
     *
     * @public
     */
    it('should blur terminal', () => {
      const blurSpy = vi.fn()
      instance.on('blur', blurSpy)

      instance.blur()

      expect(mocks.xtermTerminal.blur).toHaveBeenCalled()
      expect(blurSpy).toHaveBeenCalled()
    })

    /**
     * Tests terminal clear functionality.
     *
     * @returns void
     * Should clear xterm terminal content
     *
     * @example
     * ```typescript
     * instance.clear()
     * expect(mocks.xtermTerminal.clear).toHaveBeenCalled()
     * ```
     *
     * @public
     */
    it('should clear terminal', () => {
      instance.clear()

      expect(mocks.xtermTerminal.clear).toHaveBeenCalled()
    })

    /**
     * Tests operations on disposed terminal.
     *
     * @returns void
     * Should not perform operations when terminal is disposed
     *
     * @example
     * ```typescript
     * instance.dispose()
     * instance.resize(100, 30)
     * instance.focus()
     * instance.blur()
     * instance.clear()
     * expect(mocks.xtermTerminal.resize).not.toHaveBeenCalled()
     * ```
     *
     * @public
     */
    it('should not perform operations when disposed', () => {
      instance.dispose()

      instance.resize(100, 30)
      instance.focus()
      instance.blur()
      instance.clear()

      expect(mocks.xtermTerminal.resize).not.toHaveBeenCalled()
      expect(mocks.xtermTerminal.focus).not.toHaveBeenCalled()
      expect(mocks.xtermTerminal.blur).not.toHaveBeenCalled()
      expect(mocks.xtermTerminal.clear).not.toHaveBeenCalled()
    })

    /**
     * Tests operations when terminal exists but is not ready.
     *
     * @returns void
     * Should handle operations gracefully when terminal is not ready
     *
     * @public
     */
    it('should handle operations when terminal exists but is not ready', () => {
      // Manually set _xtermTerminal without setting _isReady
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private _xtermTerminal property for testing
      ;(instance as any)._xtermTerminal = mocks.xtermTerminal
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private _isReady property for testing
      ;(instance as any)._isReady = false

      const focusSpy = vi.fn()
      const blurSpy = vi.fn()
      instance.on('focus', focusSpy)
      instance.on('blur', blurSpy)

      // Operations should not call xterm methods when not ready
      instance.resize(100, 50)
      instance.focus()
      instance.blur()
      instance.clear()
      instance.writeData('test')

      expect(mocks.xtermTerminal.resize).not.toHaveBeenCalled()
      expect(mocks.xtermTerminal.focus).not.toHaveBeenCalled()
      expect(mocks.xtermTerminal.blur).not.toHaveBeenCalled()
      expect(mocks.xtermTerminal.clear).not.toHaveBeenCalled()
      expect(mocks.xtermTerminal.write).not.toHaveBeenCalled()

      // Config should still be updated for resize
      expect(instance.config.cols).toBe(100)
      expect(instance.config.rows).toBe(50)

      // Events should still be emitted for focus/blur
      expect(focusSpy).toHaveBeenCalled()
      expect(blurSpy).toHaveBeenCalled()
    })
  })

  describe('Selection and clipboard', () => {
    beforeEach(async () => {
      instance = new TerminalInstance(mockConfig)
      const mockContainer = document.createElement('div')
      // Don't throw errors in selection/clipboard setup
      mocks.xtermTerminal.open.mockImplementation(() => {})
      await instance.initializeXterm(mockContainer)
    })

    /**
     * Tests getting terminal selection.
     *
     * @returns void
     * Should return selected text from xterm terminal
     *
     * @example
     * ```typescript
     * const selection = instance.getSelection()
     * expect(selection).toBe('selected text')
     * expect(mocks.xtermTerminal.getSelection).toHaveBeenCalled()
     * ```
     *
     * @public
     */
    it('should get terminal selection', () => {
      const selection = instance.getSelection()

      expect(selection).toBe('selected text')
      expect(mocks.xtermTerminal.getSelection).toHaveBeenCalled()
    })

    /**
     * Tests getting selection from disposed terminal.
     *
     * @returns void
     * Should return empty string when terminal is disposed
     *
     * @example
     * ```typescript
     * instance.dispose()
     * const selection = instance.getSelection()
     * expect(selection).toBe('')
     * ```
     *
     * @public
     */
    it('should return empty selection when disposed', () => {
      instance.dispose()

      const selection = instance.getSelection()

      expect(selection).toBe('')
      expect(mocks.xtermTerminal.getSelection).not.toHaveBeenCalled()
    })

    /**
     * Tests selecting all terminal content.
     *
     * @returns void
     * Should select all content in xterm terminal
     *
     * @example
     * ```typescript
     * instance.selectAll()
     * expect(mocks.xtermTerminal.selectAll).toHaveBeenCalled()
     * ```
     *
     * @public
     */
    it('should select all content', () => {
      instance.selectAll()

      expect(mocks.xtermTerminal.selectAll).toHaveBeenCalled()
    })

    /**
     * Tests copying selection to clipboard.
     *
     * @returns Promise<void>
     * Should copy selected text to clipboard using Clipboard API
     *
     * @example
     * ```typescript
     * await instance.copySelection()
     * expect(mocks.clipboard.writeText).toHaveBeenCalledWith('selected text')
     * ```
     *
     * @public
     */
    it('should copy selection to clipboard', async () => {
      await instance.copySelection()

      expect(mocks.clipboard.writeText).toHaveBeenCalledWith('selected text')
    })

    /**
     * Tests copying when clipboard API is not available.
     *
     * @returns Promise<void>
     * Should handle missing clipboard API gracefully
     *
     * @example
     * ```typescript
     * Object.defineProperty(globalThis, 'navigator', { value: {} })
     * await instance.copySelection()
     * // Should not throw error
     * ```
     *
     * @public
     */
    it('should handle missing clipboard API for copy', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
      })

      await expect(instance.copySelection()).resolves.not.toThrow()
    })

    /**
     * Tests pasting from clipboard.
     *
     * @returns Promise<void>
     * Should read from clipboard and send to terminal
     *
     * @example
     * ```typescript
     * mocks.clipboard.readText.mockResolvedValue('pasted text')
     * await instance.paste()
     * expect(mocks.electronAPI.send).toHaveBeenCalledWith('terminal-input', {
     *   id: 'terminal-1',
     *   data: 'pasted text'
     * })
     * ```
     *
     * @public
     */
    it('should paste from clipboard', async () => {
      mocks.clipboard.readText.mockResolvedValue('pasted text')

      await instance.paste()

      expect(mocks.clipboard.readText).toHaveBeenCalled()
      expect(mocks.electronAPI.send).toHaveBeenCalledWith('terminal-input', {
        id: 'terminal-1',
        data: 'pasted text',
      })
    })

    /**
     * Tests paste when navigator.clipboard is not available.
     *
     * @returns Promise<void>
     * Should handle missing clipboard API gracefully
     *
     * @public
     */
    it('should handle paste when navigator.clipboard is not available', async () => {
      // Save original navigator
      const originalNavigator = global.navigator

      // Set navigator without clipboard
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      })

      await instance.paste()

      // Should not throw and should not call any mocks
      expect(mocks.clipboard.readText).not.toHaveBeenCalled()
      expect(mocks.electronAPI.send).not.toHaveBeenCalled()

      // Restore navigator
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true,
        configurable: true,
      })
    })

    /**
     * Tests paste when clipboard text is empty.
     *
     * @returns Promise<void>
     * Should not send empty text to terminal
     *
     * @public
     */
    it('should not paste empty text from clipboard', async () => {
      mocks.clipboard.readText.mockResolvedValue('')

      await instance.paste()

      expect(mocks.clipboard.readText).toHaveBeenCalled()
      // Should not send empty text
      expect(mocks.electronAPI.send).not.toHaveBeenCalled()
    })

    /**
     * Tests paste when window.electronAPI is not available.
     *
     * @returns Promise<void>
     * Should handle missing electronAPI gracefully
     *
     * @public
     */
    it('should handle paste when window.electronAPI is not available', async () => {
      // Save and remove electronAPI
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing global window for test setup
      const originalElectronAPI = (global as any).window.electronAPI
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing global window for test cleanup
      delete (global as any).window.electronAPI

      mocks.clipboard.readText.mockResolvedValue('pasted text')

      await instance.paste()

      expect(mocks.clipboard.readText).toHaveBeenCalled()
      // Should not throw even without electronAPI

      // Restore electronAPI
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing global window for test cleanup
      ;(global as any).window.electronAPI = originalElectronAPI
    })

    /**
     * Tests paste error handling.
     *
     * @returns Promise<void>
     * Should handle clipboard read errors gracefully
     *
     * @example
     * ```typescript
     * mocks.clipboard.readText.mockRejectedValue(new Error('Permission denied'))
     * await instance.paste()
     * // Should not throw error
     * ```
     *
     * @public
     */
    it('should handle paste errors gracefully', async () => {
      mocks.clipboard.readText.mockRejectedValue(new Error('Permission denied'))

      await expect(instance.paste()).resolves.not.toThrow()
    })

    /**
     * Tests paste when disposed.
     *
     * @returns Promise<void>
     * Should not attempt to paste when terminal is disposed
     *
     * @example
     * ```typescript
     * instance.dispose()
     * await instance.paste()
     * expect(mocks.clipboard.readText).not.toHaveBeenCalled()
     * ```
     *
     * @public
     */
    it('should not paste when disposed', async () => {
      instance.dispose()

      await instance.paste()

      expect(mocks.clipboard.readText).not.toHaveBeenCalled()
    })
  })

  describe('Event handling', () => {
    beforeEach(() => {
      instance = new TerminalInstance(mockConfig)
    })

    /**
     * Tests terminal exit event handling.
     *
     * @returns void
     * Should emit exit event with correct exit code
     *
     * @example
     * ```typescript
     * const exitSpy = vi.fn()
     * instance.on('exit', exitSpy)
     * instance.handleExit(0)
     * expect(exitSpy).toHaveBeenCalledWith(0)
     * ```
     *
     * @public
     */
    it('should handle terminal exit', () => {
      const exitSpy = vi.fn()
      instance.on('exit', exitSpy)

      instance.handleExit(0)

      expect(exitSpy).toHaveBeenCalledWith(0)
    })

    /**
     * Tests terminal error event handling.
     *
     * @returns void
     * Should emit error event with Error object
     *
     * @example
     * ```typescript
     * const errorSpy = vi.fn()
     * instance.on('error', errorSpy)
     * const error = new Error('Terminal error')
     * instance.handleError(error)
     * expect(errorSpy).toHaveBeenCalledWith(error)
     * ```
     *
     * @public
     */
    it('should handle terminal error', () => {
      const errorSpy = vi.fn()
      instance.on('error', errorSpy)

      const error = new Error('Terminal connection failed')
      instance.handleError(error)

      expect(errorSpy).toHaveBeenCalledWith(error)
    })

    /**
     * Tests event handling when disposed.
     *
     * @returns void
     * Should not emit events when terminal is disposed
     *
     * @example
     * ```typescript
     * const exitSpy = vi.fn()
     * instance.on('exit', exitSpy)
     * instance.dispose()
     * instance.handleExit(1)
     * expect(exitSpy).not.toHaveBeenCalled()
     * ```
     *
     * @public
     */
    it('should not handle events when disposed', () => {
      const exitSpy = vi.fn()
      const errorSpy = vi.fn()
      instance.on('exit', exitSpy)
      instance.on('error', errorSpy)

      instance.dispose()

      instance.handleExit(1)
      instance.handleError(new Error('Test error'))

      expect(exitSpy).not.toHaveBeenCalled()
      expect(errorSpy).not.toHaveBeenCalled()
    })
  })

  describe('Disposal', () => {
    beforeEach(async () => {
      instance = new TerminalInstance(mockConfig)
      const mockContainer = document.createElement('div')
      // Don't throw errors in disposal setup
      mocks.xtermTerminal.open.mockImplementation(() => {})
      await instance.initializeXterm(mockContainer)
    })

    /**
     * Tests proper terminal disposal.
     *
     * @returns void
     * Should dispose xterm terminal and clean up resources
     *
     * @example
     * ```typescript
     * instance.dispose()
     * expect(instance.isDisposed).toBe(true)
     * expect(instance.isReady).toBe(false)
     * expect(mocks.xtermTerminal.dispose).toHaveBeenCalled()
     * ```
     *
     * @public
     */
    it('should dispose terminal properly', () => {
      expect(instance.isDisposed).toBe(false)

      instance.dispose()

      expect(instance.isDisposed).toBe(true)
      expect(instance.isReady).toBe(false)
      expect(mocks.xtermTerminal.dispose).toHaveBeenCalled()
    })

    /**
     * Tests idempotent disposal.
     *
     * @returns void
     * Should handle multiple disposal calls gracefully
     *
     * @example
     * ```typescript
     * instance.dispose()
     * instance.dispose() // Should not cause errors
     * expect(mocks.xtermTerminal.dispose).toHaveBeenCalledTimes(1)
     * ```
     *
     * @public
     */
    it('should handle multiple disposal calls', () => {
      instance.dispose()
      instance.dispose()

      expect(instance.isDisposed).toBe(true)
      expect(mocks.xtermTerminal.dispose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Getters and stats', () => {
    beforeEach(() => {
      instance = new TerminalInstance(mockConfig, 1234)
    })

    /**
     * Tests terminal property getters.
     *
     * @returns void
     * Should return correct property values
     *
     * @example
     * ```typescript
     * expect(instance.title).toBe('Test Terminal')
     * expect(instance.isDisposed).toBe(false)
     * expect(instance.isReady).toBe(false)
     * expect(instance.pid).toBe(1234)
     * ```
     *
     * @public
     */
    it('should return correct property values', () => {
      expect(instance.title).toBe('Test Terminal')
      expect(instance.isDisposed).toBe(false)
      expect(instance.isReady).toBe(false)
      expect(instance.pid).toBe(1234)
      expect(instance.startTime).toBeInstanceOf(Date)
      expect(instance.lastActivity).toBeInstanceOf(Date)
    })

    /**
     * Tests terminal statistics.
     *
     * @returns void
     * Should return comprehensive terminal statistics
     *
     * @example
     * ```typescript
     * const stats = instance.getStats()
     * expect(stats.id).toBe('terminal-1')
     * expect(stats.title).toBe('Test Terminal')
     * expect(stats.pid).toBe(1234)
     * expect(stats.cols).toBe(80)
     * expect(stats.rows).toBe(24)
     * ```
     *
     * @public
     */
    it('should return terminal stats', () => {
      const stats = instance.getStats()

      expect(stats).toEqual({
        id: 'terminal-1',
        title: 'Test Terminal',
        pid: 1234,
        startTime: expect.any(Date),
        lastActivity: expect.any(Date),
        isReady: false,
        isDisposed: false,
        cols: 80,
        rows: 24,
      })
    })

    /**
     * Tests terminal statistics with undefined cols/rows.
     *
     * @returns void
     * Should return default values when cols/rows are undefined
     *
     * @example
     * ```typescript
     * const configWithoutSize = { id: 'terminal-2', name: 'No Size Terminal' }
     * const instance = new TerminalInstance(configWithoutSize)
     * const stats = instance.getStats()
     * expect(stats.cols).toBe(80) // default value
     * expect(stats.rows).toBe(24) // default value
     * ```
     *
     * @public
     */
    it('should return default cols/rows in stats when config values are undefined', () => {
      // Create instance with config that has no cols/rows
      const configWithoutSize: TerminalConfig = {
        id: 'terminal-2',
        name: 'No Size Terminal',
        // cols and rows are intentionally undefined
      }
      const instanceNoSize = new TerminalInstance(configWithoutSize, 5678)

      const stats = instanceNoSize.getStats()

      expect(stats).toMatchObject({
        id: 'terminal-2',
        title: 'No Size Terminal',
        pid: 5678,
        cols: 80, // Should use default value
        rows: 24, // Should use default value
      })
    })

    /**
     * Tests xterm terminal getter.
     *
     * @returns void
     * Should return xterm terminal instance after initialization
     *
     * @example
     * ```typescript
     * expect(instance.xtermTerminal).toBeNull()
     * await instance.initializeXterm(container)
     * expect(instance.xtermTerminal).toBe(mocks.xtermTerminal)
     * ```
     *
     * @public
     */
    it('should return xterm terminal instance', async () => {
      expect(instance.xtermTerminal).toBeNull()

      const mockContainer = document.createElement('div')
      // Don't throw errors in getter test
      mocks.xtermTerminal.open.mockImplementation(() => {})
      await instance.initializeXterm(mockContainer)

      expect(instance.xtermTerminal).toBe(mocks.xtermTerminal)
    })
  })

  describe('Activity tracking', () => {
    beforeEach(async () => {
      instance = new TerminalInstance(mockConfig)
      const mockContainer = document.createElement('div')
      // Don't throw errors in activity tracking setup
      mocks.xtermTerminal.open.mockImplementation(() => {})
      await instance.initializeXterm(mockContainer)
    })

    /**
     * Tests activity tracking during data writing.
     *
     * @returns void
     * Should update lastActivity when writing data
     *
     * @example
     * ```typescript
     * const initialActivity = instance.lastActivity
     * await new Promise(resolve => setTimeout(resolve, 10))
     * instance.writeData('test')
     * expect(instance.lastActivity.getTime()).toBeGreaterThan(initialActivity.getTime())
     * ```
     *
     * @public
     */
    it('should track activity when writing data', async () => {
      const initialActivity = instance.lastActivity.getTime()

      // Wait a small amount to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 10))

      instance.writeData('test data')

      expect(instance.lastActivity.getTime()).toBeGreaterThan(initialActivity)
    })
  })

  describe('100% Coverage - Additional edge cases', () => {
    beforeEach(async () => {
      instance = new TerminalInstance(mockConfig)
    })

    /**
     * Tests onTitleChange callback to cover line 162.
     *
     * @returns void
     * Should emit title-changed event when terminal title changes
     *
     * @example
     * ```typescript
     * const titleChangeCallback = mocks.xtermTerminal.onTitleChange.mock.calls[0][0]
     * titleChangeCallback('New Title')
     * expect(instance.title).toBe('New Title')
     * ```
     *
     * @public
     */
    it('should handle title change from terminal', async () => {
      const mockContainer = document.createElement('div')
      mocks.xtermTerminal.open.mockImplementation(() => {})

      // Create a spy to track emit calls
      const emitSpy = vi.spyOn(instance, 'emit')

      await instance.initializeXterm(mockContainer)

      // Get the onTitleChange callback
      expect(mocks.xtermTerminal.onTitleChange).toHaveBeenCalled()
      const titleChangeCallback =
        mocks.xtermTerminal.onTitleChange.mock.calls[0][0]

      // Trigger the title change
      titleChangeCallback('New Terminal Title')

      // Verify the title was updated and event was emitted
      expect(instance.title).toBe('New Terminal Title')
      expect(emitSpy).toHaveBeenCalledWith(
        'title-changed',
        'New Terminal Title'
      )
    })

    /**
     * Tests ResizeObserver callback to cover lines 179-183.
     *
     * @returns void
     * Should call fitAddon.fit() when container resizes
     *
     * @example
     * ```typescript
     * const resizeCallback = ResizeObserver.mock.calls[0][0]
     * resizeCallback()
     * expect(mocks.fitAddon.fit).toHaveBeenCalled()
     * ```
     *
     * @public
     */
    it('should handle resize observer callback', async () => {
      const mockContainer = document.createElement('div')
      mocks.xtermTerminal.open.mockImplementation(() => {})

      // Set up ResizeObserver mock properly
      let resizeCallback: ResizeObserverCallback | null = null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing global ResizeObserver for testing
      ;(global as any).ResizeObserver = vi
        .fn()
        .mockImplementation((callback) => {
          resizeCallback = callback
          return mocks.resizeObserver
        })

      await instance.initializeXterm(mockContainer)

      // Verify ResizeObserver was created and callback was set
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking global ResizeObserver for testing
      expect((global as any).ResizeObserver).toHaveBeenCalled()
      expect(resizeCallback).toBeTruthy()

      // Clear previous fit calls
      mocks.fitAddon.fit.mockClear()

      // Trigger the resize callback
      resizeCallback!([])

      // Verify fit was called
      expect(mocks.fitAddon.fit).toHaveBeenCalledTimes(1)
    })

    /**
     * Tests ResizeObserver callback when terminal is disposed to cover branch.
     *
     * @returns void
     * Should not call fit when terminal is disposed
     *
     * @example
     * ```typescript
     * instance.dispose()
     * resizeCallback()
     * expect(mocks.fitAddon.fit).not.toHaveBeenCalled()
     * ```
     *
     * @public
     */
    it('should not fit on resize when disposed', async () => {
      const mockContainer = document.createElement('div')
      mocks.xtermTerminal.open.mockImplementation(() => {})

      let resizeCallback: ResizeObserverCallback | null = null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking global ResizeObserver for testing
      ;(global as any).ResizeObserver = vi
        .fn()
        .mockImplementation((callback) => {
          resizeCallback = callback
          return mocks.resizeObserver
        })

      await instance.initializeXterm(mockContainer)

      // Dispose the terminal
      instance.dispose()

      // Clear fit calls after initialization
      mocks.fitAddon.fit.mockClear()

      // Trigger resize after disposal
      resizeCallback!([])

      // Should not call fit when disposed
      expect(mocks.fitAddon.fit).not.toHaveBeenCalled()
    })

    /**
     * Tests ResizeObserver callback when xterm terminal is null.
     *
     * @returns void
     * Should not call fit when xterm terminal is null
     *
     * @public
     */
    it('should not fit on resize when xterm terminal is null', async () => {
      const mockContainer = document.createElement('div')
      mocks.xtermTerminal.open.mockImplementation(() => {})

      let resizeCallback: ResizeObserverCallback | null = null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking global ResizeObserver for testing
      ;(global as any).ResizeObserver = vi
        .fn()
        .mockImplementation((callback) => {
          resizeCallback = callback
          return mocks.resizeObserver
        })

      await instance.initializeXterm(mockContainer)

      // Set xterm terminal to null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private _xtermTerminal property for testing
      ;(instance as any)._xtermTerminal = null

      // Clear fit calls
      mocks.fitAddon.fit.mockClear()

      // Trigger resize
      resizeCallback!([])

      // Should not call fit when xterm is null
      expect(mocks.fitAddon.fit).not.toHaveBeenCalled()
    })

    /**
     * Tests selectAll early return when disposed to cover line 281.
     *
     * @returns void
     * Should return early when terminal is disposed
     *
     * @example
     * ```typescript
     * instance.dispose()
     * instance.selectAll()
     * expect(mocks.xtermTerminal.selectAll).not.toHaveBeenCalled()
     * ```
     *
     * @public
     */
    it('should return early from selectAll when disposed', async () => {
      const mockContainer = document.createElement('div')
      mocks.xtermTerminal.open.mockImplementation(() => {})
      await instance.initializeXterm(mockContainer)

      // Clear previous calls
      mocks.xtermTerminal.selectAll.mockClear()

      // Dispose the terminal
      instance.dispose()

      // Try to select all when disposed
      instance.selectAll()

      // Should not call xterm selectAll
      expect(mocks.xtermTerminal.selectAll).not.toHaveBeenCalled()
    })

    /**
     * Tests selectAll early return when not ready.
     *
     * @returns void
     * Should return early when terminal is not ready
     *
     * @public
     */
    it('should return early from selectAll when not ready', () => {
      // Clear previous calls
      mocks.xtermTerminal.selectAll.mockClear()

      // Try to select all before initialization
      instance.selectAll()

      // Should not call xterm selectAll
      expect(mocks.xtermTerminal.selectAll).not.toHaveBeenCalled()
    })

    /**
     * Tests selectAll early return when xterm terminal is null.
     *
     * @returns void
     * Should return early when xterm terminal is null
     *
     * @public
     */
    it('should return early from selectAll when xterm is null', async () => {
      const mockContainer = document.createElement('div')
      mocks.xtermTerminal.open.mockImplementation(() => {})
      await instance.initializeXterm(mockContainer)

      // Set xterm terminal to null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private _xtermTerminal property for testing
      ;(instance as any)._xtermTerminal = null

      // Clear previous calls
      mocks.xtermTerminal.selectAll.mockClear()

      // Try to select all with null xterm
      instance.selectAll()

      // Should not call xterm selectAll
      expect(mocks.xtermTerminal.selectAll).not.toHaveBeenCalled()
    })

    /**
     * Tests onData callback with electronAPI to cover lines 136-142.
     *
     * @returns void
     * Should send input to backend via IPC when data is received
     *
     * @public
     */
    it('should send data to backend via electronAPI in onData callback', async () => {
      const mockContainer = document.createElement('div')
      mocks.xtermTerminal.open.mockImplementation(() => {})

      // Set up window.electronAPI
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking global window for testing
      ;(global as any).window = { electronAPI: mocks.electronAPI }

      await instance.initializeXterm(mockContainer)

      // Get the onData callback
      expect(mocks.xtermTerminal.onData).toHaveBeenCalled()
      const onDataCallback = mocks.xtermTerminal.onData.mock.calls[0][0]

      // Clear send calls
      mocks.electronAPI.send.mockClear()

      // Trigger the data callback
      onDataCallback('test input')

      // Verify electronAPI was called
      expect(mocks.electronAPI.send).toHaveBeenCalledWith('terminal-input', {
        id: instance.id,
        data: 'test input',
      })

      // Verify lastActivity was updated
      expect(instance.lastActivity.getTime()).toBeGreaterThan(0)
    })

    /**
     * Tests onResize callback with electronAPI to cover lines 148-155.
     *
     * @returns void
     * Should notify backend of resize via IPC
     *
     * @public
     */
    it('should notify backend of resize via electronAPI in onResize callback', async () => {
      const mockContainer = document.createElement('div')
      mocks.xtermTerminal.open.mockImplementation(() => {})

      // Set up window.electronAPI
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking global window for testing
      ;(global as any).window = { electronAPI: mocks.electronAPI }

      // Create a spy to track emit calls
      const emitSpy = vi.spyOn(instance, 'emit')

      await instance.initializeXterm(mockContainer)

      // Get the onResize callback
      expect(mocks.xtermTerminal.onResize).toHaveBeenCalled()
      const onResizeCallback = mocks.xtermTerminal.onResize.mock.calls[0][0]

      // Clear send calls
      mocks.electronAPI.send.mockClear()

      // Trigger the resize callback
      onResizeCallback({ cols: 100, rows: 40 })

      // Verify event was emitted
      expect(emitSpy).toHaveBeenCalledWith('resize', 100, 40)

      // Verify electronAPI was called
      expect(mocks.electronAPI.send).toHaveBeenCalledWith('terminal-resize', {
        id: instance.id,
        cols: 100,
        rows: 40,
      })
    })

    /**
     * Tests onData callback without electronAPI.
     *
     * @returns void
     * Should still update lastActivity even without electronAPI
     *
     * @public
     */
    it('should handle onData without electronAPI', async () => {
      const mockContainer = document.createElement('div')
      mocks.xtermTerminal.open.mockImplementation(() => {})

      // Remove window.electronAPI
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking global window for testing
      ;(global as any).window = {}

      await instance.initializeXterm(mockContainer)

      // Get the onData callback
      const onDataCallback = mocks.xtermTerminal.onData.mock.calls[0][0]

      const initialActivity = instance.lastActivity.getTime()

      // Wait to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Trigger the data callback
      onDataCallback('test input')

      // Verify lastActivity was still updated
      expect(instance.lastActivity.getTime()).toBeGreaterThan(initialActivity)
    })

    /**
     * Tests onResize callback without electronAPI.
     *
     * @returns void
     * Should still emit resize event without electronAPI
     *
     * @public
     */
    it('should handle onResize without electronAPI', async () => {
      const mockContainer = document.createElement('div')
      mocks.xtermTerminal.open.mockImplementation(() => {})

      // Remove window.electronAPI
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking global window for testing
      ;(global as any).window = {}

      const emitSpy = vi.spyOn(instance, 'emit')

      await instance.initializeXterm(mockContainer)

      // Get the onResize callback
      const onResizeCallback = mocks.xtermTerminal.onResize.mock.calls[0][0]

      // Trigger the resize callback
      onResizeCallback({ cols: 80, rows: 24 })

      // Verify event was still emitted
      expect(emitSpy).toHaveBeenCalledWith('resize', 80, 24)
    })
  })
})
