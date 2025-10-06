/**
 * @fileoverview Tests for XTermManager.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { XTermManager } from './XTermManager'

// Mock xterm module
vi.mock('xterm', () => ({
  Terminal: vi.fn(() => ({
    open: vi.fn(),
    dispose: vi.fn(),
    write: vi.fn((data: string, callback?: () => void) => {
      if (callback) callback()
    }),
    clear: vi.fn(),
    reset: vi.fn(),
    focus: vi.fn(),
    blur: vi.fn(),
    scrollToBottom: vi.fn(),
    scrollToTop: vi.fn(),
    scrollLines: vi.fn(),
    resize: vi.fn(),
    hasSelection: vi.fn(() => false),
    getSelection: vi.fn(() => ''),
    clearSelection: vi.fn(),
    selectAll: vi.fn(),
    options: {
      fontSize: 13,
      fontFamily: 'monospace',
      theme: {},
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 10000,
      tabStopWidth: 4,
      scrollOnUserInput: false,
    },
    cols: 80,
    rows: 24,
  })),
}))

describe('XTermManager', () => {
  let manager: XTermManager
  let mockContainer: HTMLElement

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock container
    mockContainer = document.createElement('div')
    mockContainer.id = 'test-terminal'
    document.body.appendChild(mockContainer)

    manager = new XTermManager()
  })

  afterEach(() => {
    manager.dispose()
    if (mockContainer.parentNode) {
      mockContainer.parentNode.removeChild(mockContainer)
    }
  })

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const manager = new XTermManager()
      const options = manager.getOptions()

      expect(options.fontSize).toBe(13)
      expect(options.fontFamily).toContain('Monaco')
      expect(options.theme).toBe('dark')
      expect(options.cursorBlink).toBe(true)
      expect(options.scrollback).toBe(10000)
    })

    it('should accept custom options', () => {
      const customManager = new XTermManager({
        fontSize: 16,
        theme: 'light',
        cursorBlink: false,
        cols: 120,
        rows: 40,
      })

      const options = customManager.getOptions()
      expect(options.fontSize).toBe(16)
      expect(options.theme).toBe('light')
      expect(options.cursorBlink).toBe(false)
      expect(options.cols).toBe(120)
      expect(options.rows).toBe(40)
    })
  })

  describe('initialize', () => {
    it('should create and attach terminal to container', async () => {
      const terminal = await manager.initialize(mockContainer)

      expect(terminal).toBeDefined()
      expect(terminal.open).toHaveBeenCalledWith(mockContainer)
      expect(manager.isInitialized()).toBe(true)
    })

    it('should resize terminal if cols and rows are specified in options', async () => {
      const customManager = new XTermManager({
        cols: 100,
        rows: 30,
      })
      const terminal = await customManager.initialize(mockContainer)

      expect(terminal.resize).toHaveBeenCalledWith(100, 30)
      customManager.dispose()
    })

    it('should resize terminal with default cols and rows', async () => {
      const customManager = new XTermManager({})
      const terminal = await customManager.initialize(mockContainer)

      // Default values are cols: 80, rows: 24
      expect(terminal.resize).toHaveBeenCalledWith(80, 24)
      customManager.dispose()
    })

    it('should throw error if container is not provided', async () => {
      await expect(
        manager.initialize(null as unknown as HTMLElement)
      ).rejects.toThrow('Container element is required')
    })

    it('should dispose existing terminal before creating new one', async () => {
      const first = await manager.initialize(mockContainer)
      const firstDispose = vi.spyOn(first, 'dispose')

      const second = await manager.initialize(mockContainer)

      expect(firstDispose).toHaveBeenCalled()
      expect(second).toBeDefined()
    })

    it('should clear container before attaching terminal', async () => {
      mockContainer.innerHTML = '<div>Existing content</div>'

      await manager.initialize(mockContainer)

      expect(mockContainer.innerHTML).toBe('')
    })
  })

  describe('terminal operations', () => {
    beforeEach(async () => {
      await manager.initialize(mockContainer)
    })

    it('should write data to terminal', () => {
      const terminal = manager.getTerminal()
      const callback = vi.fn()

      manager.write('Hello, World!', callback)

      expect(terminal?.write).toHaveBeenCalledWith('Hello, World!', callback)
      expect(callback).toHaveBeenCalled()
    })

    it('should handle write without callback', () => {
      const terminal = manager.getTerminal()

      manager.write('Hello, World!')

      expect(terminal?.write).toHaveBeenCalledWith('Hello, World!', undefined)
    })

    it('should call callback even when terminal is not initialized', () => {
      const uninitializedManager = new XTermManager()
      const callback = vi.fn()

      uninitializedManager.write('Test', callback)

      expect(callback).toHaveBeenCalled()
    })

    it('should write line with CRLF', () => {
      const terminal = manager.getTerminal()

      manager.writeln('Test line')

      expect(terminal?.write).toHaveBeenCalledWith('Test line\r\n', undefined)
    })

    it('should clear terminal', () => {
      const terminal = manager.getTerminal()

      manager.clear()

      expect(terminal?.clear).toHaveBeenCalled()
    })

    it('should reset terminal', () => {
      const terminal = manager.getTerminal()

      manager.reset()

      expect(terminal?.reset).toHaveBeenCalled()
    })

    it('should focus terminal', () => {
      const terminal = manager.getTerminal()

      manager.focus()

      expect(terminal?.focus).toHaveBeenCalled()
    })

    it('should blur terminal', () => {
      const terminal = manager.getTerminal()

      manager.blur()

      expect(terminal?.blur).toHaveBeenCalled()
    })

    it('should handle operations when terminal is not initialized', () => {
      const uninitializedManager = new XTermManager()

      // These should not throw
      expect(() => {
        uninitializedManager.write('Test')
        uninitializedManager.writeln('Test')
        uninitializedManager.clear()
        uninitializedManager.reset()
        uninitializedManager.focus()
        uninitializedManager.blur()
        uninitializedManager.scrollToBottom()
        uninitializedManager.scrollToTop()
        uninitializedManager.scrollLines(5)
        uninitializedManager.resize(80, 24)
        uninitializedManager.clearSelection()
        uninitializedManager.selectAll()
      }).not.toThrow()
    })
  })

  describe('scrolling', () => {
    beforeEach(async () => {
      await manager.initialize(mockContainer)
    })

    it('should scroll to bottom', () => {
      const terminal = manager.getTerminal()

      manager.scrollToBottom()

      expect(terminal?.scrollToBottom).toHaveBeenCalled()
    })

    it('should scroll to top', () => {
      const terminal = manager.getTerminal()

      manager.scrollToTop()

      expect(terminal?.scrollToTop).toHaveBeenCalled()
    })

    it('should scroll by lines', () => {
      const terminal = manager.getTerminal()

      manager.scrollLines(5)
      expect(terminal?.scrollLines).toHaveBeenCalledWith(5)

      manager.scrollLines(-3)
      expect(terminal?.scrollLines).toHaveBeenCalledWith(-3)
    })
  })

  describe('dimensions', () => {
    beforeEach(async () => {
      await manager.initialize(mockContainer)
    })

    it('should resize terminal', () => {
      const terminal = manager.getTerminal()

      manager.resize(120, 40)

      expect(terminal?.resize).toHaveBeenCalledWith(120, 40)
    })

    it('should get terminal dimensions', () => {
      const dimensions = manager.getDimensions()

      expect(dimensions).toEqual({
        cols: 80,
        rows: 24,
      })
    })

    it('should return null dimensions when not initialized', () => {
      const uninitializedManager = new XTermManager()

      expect(uninitializedManager.getDimensions()).toBeNull()
    })
  })

  describe('selection', () => {
    beforeEach(async () => {
      await manager.initialize(mockContainer)
    })

    it('should check if has selection', () => {
      const result = manager.hasSelection()

      expect(result).toBe(false)
    })

    it('should get selection text', () => {
      const result = manager.getSelection()

      expect(result).toBe('')
    })

    it('should clear selection', () => {
      const terminal = manager.getTerminal()

      manager.clearSelection()

      expect(terminal?.clearSelection).toHaveBeenCalled()
    })

    it('should select all text', () => {
      const terminal = manager.getTerminal()

      manager.selectAll()

      expect(terminal?.selectAll).toHaveBeenCalled()
    })
  })

  describe('theme management', () => {
    it('should get dark theme', () => {
      const theme = manager.getTheme('dark')

      expect(theme.background).toBe('#1e1e1e')
      expect(theme.foreground).toBe('#d4d4d4')
      expect(theme.cursor).toBe('#dfa927')
    })

    it('should get light theme', () => {
      const theme = manager.getTheme('light')

      expect(theme.background).toBe('#f8fafc')
      expect(theme.foreground).toBe('#1e293b')
      expect(theme.cursor).toBe('#dfa927')
    })
  })

  describe('updateOptions', () => {
    beforeEach(async () => {
      await manager.initialize(mockContainer)
    })

    it('should update terminal options', () => {
      const terminal = manager.getTerminal()

      manager.updateOptions({
        fontSize: 16,
        fontFamily: 'Consolas, monospace',
        theme: 'light',
        cursorBlink: false,
        cursorStyle: 'underline',
        scrollback: 5000,
        tabStopWidth: 2,
        scrollOnUserInput: true,
      })

      expect(terminal?.options.fontSize).toBe(16)
      expect(terminal?.options.fontFamily).toBe('Consolas, monospace')
      expect(terminal?.options.theme).toBeDefined()
      expect(terminal?.options.cursorBlink).toBe(false)
      expect(terminal?.options.cursorStyle).toBe('underline')
      expect(terminal?.options.scrollback).toBe(5000)
      expect(terminal?.options.tabStopWidth).toBe(2)
      expect(terminal?.options.scrollOnUserInput).toBe(true)
    })

    it('should merge options', () => {
      manager.updateOptions({ fontSize: 16 })
      let options = manager.getOptions()
      expect(options.fontSize).toBe(16)
      expect(options.theme).toBe('dark') // Original value

      manager.updateOptions({ theme: 'light' })
      options = manager.getOptions()
      expect(options.fontSize).toBe(16) // Previous update retained
      expect(options.theme).toBe('light')
    })

    it('should update options before initialization', () => {
      const uninitializedManager = new XTermManager()

      uninitializedManager.updateOptions({
        fontSize: 18,
        cols: 100,
      })

      const options = uninitializedManager.getOptions()
      expect(options.fontSize).toBe(18)
      expect(options.cols).toBe(100)
    })

    it('should handle all option types when terminal is initialized', () => {
      const terminal = manager.getTerminal()

      // Update each option type individually to ensure all branches are covered
      manager.updateOptions({ fontSize: undefined })
      expect(terminal?.options.fontSize).toBe(13) // Should not change

      manager.updateOptions({ fontFamily: undefined })
      expect(terminal?.options.fontFamily).toBe('monospace') // Should not change

      manager.updateOptions({ theme: undefined })
      expect(terminal?.options.theme).toBeDefined() // Should not change

      manager.updateOptions({ cursorBlink: undefined })
      expect(terminal?.options.cursorBlink).toBe(true) // Should not change

      manager.updateOptions({ cursorStyle: undefined })
      expect(terminal?.options.cursorStyle).toBe('block') // Should not change

      manager.updateOptions({ scrollback: undefined })
      expect(terminal?.options.scrollback).toBe(10000) // Should not change

      manager.updateOptions({ tabStopWidth: undefined })
      expect(terminal?.options.tabStopWidth).toBe(4) // Should not change

      manager.updateOptions({ scrollOnUserInput: undefined })
      expect(terminal?.options.scrollOnUserInput).toBe(false) // Should not change
    })
  })

  describe('dispose', () => {
    it('should dispose terminal and clear references', async () => {
      await manager.initialize(mockContainer)
      const terminal = manager.getTerminal()

      manager.dispose()

      expect(terminal?.dispose).toHaveBeenCalled()
      expect(manager.getTerminal()).toBeNull()
      expect(manager.isInitialized()).toBe(false)
    })

    it('should handle dispose when not initialized', () => {
      expect(() => manager.dispose()).not.toThrow()
    })

    it('should allow re-initialization after dispose', async () => {
      await manager.initialize(mockContainer)
      manager.dispose()

      const terminal = await manager.initialize(mockContainer)

      expect(terminal).toBeDefined()
      expect(manager.isInitialized()).toBe(true)
    })
  })

  describe('getTerminal', () => {
    it('should return terminal instance when initialized', async () => {
      await manager.initialize(mockContainer)
      const terminal = manager.getTerminal()

      expect(terminal).toBeDefined()
      expect(terminal).toHaveProperty('write')
    })

    it('should return null when not initialized', () => {
      expect(manager.getTerminal()).toBeNull()
    })
  })
})
