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

vi.mock('xterm-addon-fit', () => ({
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
})
