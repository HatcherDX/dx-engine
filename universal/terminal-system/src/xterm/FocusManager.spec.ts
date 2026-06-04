/**
 * @fileoverview Comprehensive tests for FocusManager.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type SpyInstance,
} from 'vitest'
import type { Terminal } from 'xterm'
import {
  TerminalFocusManager,
  type FocusManagerOptions,
  type KeyboardShortcut,
} from './FocusManager'

// Mock Terminal
class MockTerminal {
  public element = document.createElement('div')
  public focused = false
  public blurred = false
  public onFocusHandler: (() => void) | null = null
  public onBlurHandler: (() => void) | null = null

  focus(): void {
    this.focused = true
    if (this.onFocusHandler) {
      this.onFocusHandler()
    }
  }

  blur(): void {
    this.blurred = true
    if (this.onBlurHandler) {
      this.onBlurHandler()
    }
  }

  onFocus(handler: () => void): { dispose(): void } {
    this.onFocusHandler = handler
    return {
      dispose: () => {
        this.onFocusHandler = null
      },
    }
  }

  onBlur(handler: () => void): { dispose(): void } {
    this.onBlurHandler = handler
    return {
      dispose: () => {
        this.onBlurHandler = null
      },
    }
  }
}

describe('TerminalFocusManager', () => {
  let manager: TerminalFocusManager
  let mockTerminal: MockTerminal
  let consoleLogSpy: SpyInstance
  let consoleErrorSpy: SpyInstance

  beforeEach(() => {
    vi.clearAllMocks()
    mockTerminal = new MockTerminal()

    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    manager = new TerminalFocusManager()
  })

  afterEach(() => {
    manager.dispose()
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const manager = new TerminalFocusManager()
      expect(manager).toBeDefined()
      expect(manager.isFocused()).toBe(false)
    })

    it('should accept custom options', () => {
      const options: FocusManagerOptions = {
        focusOnClick: false,
        focusOnHover: true,
        blurOnEscape: false,
        restoreFocusAfterContextMenu: false,
        shortcuts: [],
        debug: true,
      }
      const manager = new TerminalFocusManager(options)
      expect(manager).toBeDefined()
      manager.dispose()
    })

    it('should register initial shortcuts', () => {
      const shortcut: KeyboardShortcut = {
        key: 'Ctrl+C',
        handler: vi.fn(),
        description: 'Copy',
      }
      const manager = new TerminalFocusManager({ shortcuts: [shortcut] })
      expect(manager.getShortcuts().has('Ctrl+C')).toBe(true)
      manager.dispose()
    })
  })

  describe('initialize', () => {
    it('should initialize with terminal', () => {
      manager.initialize(mockTerminal as unknown as Terminal)
      expect(mockTerminal.onFocusHandler).toBeDefined()
      expect(mockTerminal.onBlurHandler).toBeDefined()
    })

    it('should throw error if terminal is not provided', () => {
      expect(() => manager.initialize(null as unknown as Terminal)).toThrow(
        'Terminal instance is required'
      )
    })

    it('should setup click handling if enabled', () => {
      const clickManager = new TerminalFocusManager({ focusOnClick: true })
      const addEventListenerSpy = vi.spyOn(
        mockTerminal.element,
        'addEventListener'
      )

      clickManager.initialize(mockTerminal as unknown as Terminal)

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      )
      clickManager.dispose()
    })

    it('should setup hover handling if enabled', () => {
      const hoverManager = new TerminalFocusManager({ focusOnHover: true })
      const addEventListenerSpy = vi.spyOn(
        mockTerminal.element,
        'addEventListener'
      )

      hoverManager.initialize(mockTerminal as unknown as Terminal)

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'mouseenter',
        expect.any(Function)
      )
      hoverManager.dispose()
    })

    it('should log initialization with debug mode', () => {
      const debugManager = new TerminalFocusManager({ debug: true })
      debugManager.initialize(mockTerminal as unknown as Terminal)
      expect(consoleLogSpy).toHaveBeenCalledWith('[FocusManager] Initialized')
      debugManager.dispose()
    })

    it('should handle terminal without focus events', () => {
      const minimalTerminal = { element: document.createElement('div') }
      expect(() =>
        manager.initialize(minimalTerminal as unknown as Terminal)
      ).not.toThrow()
    })

    it('should handle terminal without element', () => {
      const noElementTerminal = {
        onFocus: mockTerminal.onFocus.bind(mockTerminal),
        onBlur: mockTerminal.onBlur.bind(mockTerminal),
      }
      expect(() =>
        manager.initialize(noElementTerminal as unknown as Terminal)
      ).not.toThrow()
    })
  })

  describe('focus', () => {
    beforeEach(() => {
      manager.initialize(mockTerminal as unknown as Terminal)
    })

    it('should focus terminal programmatically', () => {
      manager.focus()
      expect(mockTerminal.focused).toBe(true)
      expect(manager.isFocused()).toBe(true)
    })

    it('should focus terminal with user source', () => {
      manager.focus('user')
      expect(mockTerminal.focused).toBe(true)
      expect(manager.isFocused()).toBe(true)
    })

    it('should not focus if terminal not initialized', () => {
      const newManager = new TerminalFocusManager()
      newManager.focus()
      expect(newManager.isFocused()).toBe(false)
    })

    it('should add focus event to history', () => {
      manager.focus()
      const history = manager.getFocusHistory()
      expect(history[history.length - 1].type).toBe('focus')
    })

    it('should not duplicate focus events', () => {
      manager.focus()
      const historyBefore = manager.getFocusHistory().length
      manager.focus() // Second focus should be ignored
      const historyAfter = manager.getFocusHistory().length
      expect(historyAfter).toBe(historyBefore)
    })

    it('should log focus with debug mode', () => {
      const debugManager = new TerminalFocusManager({ debug: true })
      debugManager.initialize(mockTerminal as unknown as Terminal)
      debugManager.focus()
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[FocusManager] Focused',
        expect.any(Object)
      )
      debugManager.dispose()
    })
  })

  describe('blur', () => {
    beforeEach(() => {
      manager.initialize(mockTerminal as unknown as Terminal)
      manager.focus() // Start focused
    })

    it('should blur terminal programmatically', () => {
      manager.blur()
      expect(mockTerminal.blurred).toBe(true)
      expect(manager.isFocused()).toBe(false)
    })

    it('should blur terminal with user source', () => {
      manager.blur('user')
      expect(mockTerminal.blurred).toBe(true)
      expect(manager.isFocused()).toBe(false)
    })

    it('should not blur if terminal not initialized', () => {
      const newManager = new TerminalFocusManager()
      newManager.blur()
      expect(newManager.isFocused()).toBe(false)
    })

    it('should add blur event to history', () => {
      manager.blur()
      const history = manager.getFocusHistory()
      expect(history[history.length - 1].type).toBe('blur')
    })

    it('should not duplicate blur events', () => {
      manager.blur()
      const historyBefore = manager.getFocusHistory().length
      manager.blur() // Second blur should be ignored
      const historyAfter = manager.getFocusHistory().length
      expect(historyAfter).toBe(historyBefore)
    })

    it('should log blur with debug mode', () => {
      const debugManager = new TerminalFocusManager({ debug: true })
      debugManager.initialize(mockTerminal as unknown as Terminal)
      debugManager.focus()
      debugManager.blur()
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[FocusManager] Blurred',
        expect.any(Object)
      )
      debugManager.dispose()
    })
  })

  describe('keyboard shortcuts', () => {
    beforeEach(() => {
      manager.initialize(mockTerminal as unknown as Terminal)
    })

    it('should register keyboard shortcut', () => {
      const handler = vi.fn()
      const shortcut: KeyboardShortcut = {
        key: 'Ctrl+C',
        handler,
        description: 'Copy',
      }

      manager.registerShortcut(shortcut)

      expect(manager.getShortcuts().has('Ctrl+C')).toBe(true)
    })

    it('should unregister keyboard shortcut', () => {
      const shortcut: KeyboardShortcut = {
        key: 'Ctrl+C',
        handler: vi.fn(),
      }

      manager.registerShortcut(shortcut)
      manager.unregisterShortcut('Ctrl+C')

      expect(manager.getShortcuts().has('Ctrl+C')).toBe(false)
    })

    it('should handle keyboard shortcut', () => {
      const handler = vi.fn(() => true)
      const shortcut: KeyboardShortcut = {
        key: 'Ctrl+C',
        handler,
        preventDefault: true,
        stopPropagation: true,
      }

      manager.registerShortcut(shortcut)

      const event = new KeyboardEvent('keydown', {
        key: 'c',
        ctrlKey: true,
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
      const stopPropagationSpy = vi.spyOn(event, 'stopPropagation')

      mockTerminal.element.dispatchEvent(event)

      expect(handler).toHaveBeenCalledWith(event)
      expect(preventDefaultSpy).toHaveBeenCalled()
      expect(stopPropagationSpy).toHaveBeenCalled()
    })

    it('should handle shortcut returning false', () => {
      const handler = vi.fn(() => false)
      const shortcut: KeyboardShortcut = {
        key: 'Ctrl+C',
        handler,
      }

      manager.registerShortcut(shortcut)

      const event = new KeyboardEvent('keydown', {
        key: 'c',
        ctrlKey: true,
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      mockTerminal.element.dispatchEvent(event)

      expect(handler).toHaveBeenCalledWith(event)
      expect(preventDefaultSpy).not.toHaveBeenCalled()
    })

    it('should handle complex key combinations', () => {
      const handler = vi.fn()
      const shortcut: KeyboardShortcut = {
        key: 'Ctrl+Alt+Shift+Cmd+A',
        handler,
      }

      manager.registerShortcut(shortcut)

      const event = new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true,
        altKey: true,
        shiftKey: true,
        metaKey: true,
      })

      mockTerminal.element.dispatchEvent(event)

      expect(handler).toHaveBeenCalledWith(event)
    })

    it('should handle special keys', () => {
      const handler = vi.fn()
      const shortcut: KeyboardShortcut = {
        key: 'Enter',
        handler,
      }

      manager.registerShortcut(shortcut)

      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
      })

      mockTerminal.element.dispatchEvent(event)

      expect(handler).toHaveBeenCalled()
    })

    it('should blur on Escape if enabled', () => {
      const escapeManager = new TerminalFocusManager({ blurOnEscape: true })
      escapeManager.initialize(mockTerminal as unknown as Terminal)
      escapeManager.focus()

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
      })

      mockTerminal.element.dispatchEvent(event)

      expect(escapeManager.isFocused()).toBe(false)
      escapeManager.dispose()
    })

    it('should not blur on Escape if disabled', () => {
      // Create a fresh mock terminal for this test to avoid interference
      const testTerminal = new MockTerminal()
      const escapeManager = new TerminalFocusManager({ blurOnEscape: false })

      escapeManager.initialize(testTerminal as unknown as Terminal)
      escapeManager.focus()

      // Verify it's focused before the event
      expect(escapeManager.isFocused()).toBe(true)

      // Spy on blur to ensure it's not called
      const blurSpy = vi.spyOn(escapeManager, 'blur')
      const terminalBlurSpy = vi.spyOn(testTerminal, 'blur')

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
      })

      testTerminal.element.dispatchEvent(event)

      // Should not have called blur when blurOnEscape is false
      expect(blurSpy).not.toHaveBeenCalled()
      expect(terminalBlurSpy).not.toHaveBeenCalled()
      expect(escapeManager.isFocused()).toBe(true)

      escapeManager.dispose()
    })

    it('should log shortcut registration with debug mode', () => {
      const debugManager = new TerminalFocusManager({ debug: true })
      debugManager.initialize(mockTerminal as unknown as Terminal)

      debugManager.registerShortcut({
        key: 'Ctrl+C',
        handler: vi.fn(),
      })

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[FocusManager] Registered shortcut: Ctrl+C'
      )
      debugManager.dispose()
    })
  })

  describe('event handlers', () => {
    beforeEach(() => {
      manager.initialize(mockTerminal as unknown as Terminal)
    })

    it('should register and call focus handler', () => {
      const handler = vi.fn()
      const unsubscribe = manager.onFocus(handler)

      manager.focus()

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'focus',
        })
      )

      unsubscribe()
      handler.mockClear()

      manager.blur()
      manager.focus()

      expect(handler).not.toHaveBeenCalled()
    })

    it('should register and call blur handler', () => {
      const handler = vi.fn()
      const unsubscribe = manager.onBlur(handler)

      manager.focus()
      manager.blur()

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'blur',
        })
      )

      unsubscribe()
      handler.mockClear()

      manager.focus()
      manager.blur()

      expect(handler).not.toHaveBeenCalled()
    })

    it('should register and call key handler', () => {
      const handler = vi.fn()
      const unsubscribe = manager.onKey(handler)

      const event = new KeyboardEvent('keydown', { key: 'a' })
      mockTerminal.element.dispatchEvent(event)

      expect(handler).toHaveBeenCalledWith(event)

      unsubscribe()
      handler.mockClear()

      mockTerminal.element.dispatchEvent(event)

      expect(handler).not.toHaveBeenCalled()
    })

    it('should handle focus handler errors', () => {
      const debugManager = new TerminalFocusManager({ debug: true })
      debugManager.initialize(mockTerminal as unknown as Terminal)

      const errorHandler = vi.fn(() => {
        throw new Error('Focus handler error')
      })
      debugManager.onFocus(errorHandler)

      debugManager.focus()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[FocusManager] Focus handler error:',
        expect.any(Error)
      )

      debugManager.dispose()
    })

    it('should handle blur handler errors', () => {
      const debugManager = new TerminalFocusManager({ debug: true })
      debugManager.initialize(mockTerminal as unknown as Terminal)

      const errorHandler = vi.fn(() => {
        throw new Error('Blur handler error')
      })
      debugManager.onBlur(errorHandler)

      debugManager.focus()
      debugManager.blur()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[FocusManager] Blur handler error:',
        expect.any(Error)
      )

      debugManager.dispose()
    })

    it('should handle key handler errors', () => {
      const debugManager = new TerminalFocusManager({ debug: true })
      debugManager.initialize(mockTerminal as unknown as Terminal)

      const errorHandler = vi.fn(() => {
        throw new Error('Key handler error')
      })
      debugManager.onKey(errorHandler)

      const event = new KeyboardEvent('keydown', { key: 'a' })
      mockTerminal.element.dispatchEvent(event)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[FocusManager] Key handler error:',
        expect.any(Error)
      )

      debugManager.dispose()
    })
  })

  describe('focus on click', () => {
    it('should focus on click when enabled', () => {
      const clickManager = new TerminalFocusManager({ focusOnClick: true })
      clickManager.initialize(mockTerminal as unknown as Terminal)

      const clickEvent = new MouseEvent('click')
      mockTerminal.element.dispatchEvent(clickEvent)

      expect(clickManager.isFocused()).toBe(true)
      clickManager.dispose()
    })

    it('should not re-focus if already focused', () => {
      const clickManager = new TerminalFocusManager({ focusOnClick: true })
      clickManager.initialize(mockTerminal as unknown as Terminal)
      clickManager.focus()

      const historyBefore = clickManager.getFocusHistory().length

      const clickEvent = new MouseEvent('click')
      mockTerminal.element.dispatchEvent(clickEvent)

      const historyAfter = clickManager.getFocusHistory().length
      expect(historyAfter).toBe(historyBefore)

      clickManager.dispose()
    })
  })

  describe('focus on hover', () => {
    it('should focus on hover when enabled', () => {
      const hoverManager = new TerminalFocusManager({ focusOnHover: true })
      hoverManager.initialize(mockTerminal as unknown as Terminal)

      const mouseEnterEvent = new MouseEvent('mouseenter')
      mockTerminal.element.dispatchEvent(mouseEnterEvent)

      expect(hoverManager.isFocused()).toBe(true)
      hoverManager.dispose()
    })

    it('should not re-focus if already focused', () => {
      const hoverManager = new TerminalFocusManager({ focusOnHover: true })
      hoverManager.initialize(mockTerminal as unknown as Terminal)
      hoverManager.focus()

      const historyBefore = hoverManager.getFocusHistory().length

      const mouseEnterEvent = new MouseEvent('mouseenter')
      mockTerminal.element.dispatchEvent(mouseEnterEvent)

      const historyAfter = hoverManager.getFocusHistory().length
      expect(historyAfter).toBe(historyBefore)

      hoverManager.dispose()
    })
  })

  describe('system focus events', () => {
    beforeEach(() => {
      manager.initialize(mockTerminal as unknown as Terminal)
    })

    it('should handle system focus event', () => {
      mockTerminal.onFocusHandler?.()
      expect(manager.isFocused()).toBe(true)
    })

    it('should handle system blur event', () => {
      manager.focus()
      mockTerminal.onBlurHandler?.()
      expect(manager.isFocused()).toBe(false)
    })
  })

  describe('focus history', () => {
    beforeEach(() => {
      manager.initialize(mockTerminal as unknown as Terminal)
    })

    it('should maintain focus history', () => {
      manager.focus()
      manager.blur()
      manager.focus()

      const history = manager.getFocusHistory()
      expect(history).toHaveLength(3)
      expect(history[0].type).toBe('focus')
      expect(history[1].type).toBe('blur')
      expect(history[2].type).toBe('focus')
    })

    it('should limit history to 10 events', () => {
      for (let i = 0; i < 15; i++) {
        if (i % 2 === 0) {
          manager.focus()
        } else {
          manager.blur()
        }
      }

      const history = manager.getFocusHistory()
      expect(history).toHaveLength(10)
    })

    it('should return copy of history', () => {
      manager.focus()
      const history1 = manager.getFocusHistory()
      const history2 = manager.getFocusHistory()
      expect(history1).not.toBe(history2)
      expect(history1).toEqual(history2)
    })
  })

  describe('getShortcuts', () => {
    it('should return copy of shortcuts map', () => {
      const shortcut: KeyboardShortcut = {
        key: 'Ctrl+C',
        handler: vi.fn(),
      }
      manager.registerShortcut(shortcut)

      const shortcuts1 = manager.getShortcuts()
      const shortcuts2 = manager.getShortcuts()

      expect(shortcuts1).not.toBe(shortcuts2)
      expect(shortcuts1.get('Ctrl+C')).toEqual(shortcuts2.get('Ctrl+C'))
    })
  })

  describe('updateOptions', () => {
    it('should update options dynamically', () => {
      manager.updateOptions({ debug: true })
      manager.updateOptions({ blurOnEscape: false })

      // Options should be updated (we can't directly check private options)
      expect(manager).toBeDefined()
    })
  })

  describe('dispose', () => {
    it('should clean up resources', () => {
      const debugManager = new TerminalFocusManager({
        debug: true,
        focusOnClick: true,
        focusOnHover: true,
      })
      debugManager.initialize(mockTerminal as unknown as Terminal)

      const focusHandler = vi.fn()
      const blurHandler = vi.fn()
      const keyHandler = vi.fn()

      debugManager.onFocus(focusHandler)
      debugManager.onBlur(blurHandler)
      debugManager.onKey(keyHandler)

      debugManager.registerShortcut({
        key: 'Ctrl+C',
        handler: vi.fn(),
      })

      debugManager.dispose()

      expect(consoleLogSpy).toHaveBeenCalledWith('[FocusManager] Disposed')
      expect(debugManager.isFocused()).toBe(false)
      expect(debugManager.getFocusHistory()).toEqual([])
      expect(debugManager.getShortcuts().size).toBe(0)

      // Should not call handlers after dispose
      mockTerminal.onFocusHandler?.()
      expect(focusHandler).not.toHaveBeenCalled()
    })

    it('should handle multiple dispose calls', () => {
      manager.initialize(mockTerminal as unknown as Terminal)
      expect(() => {
        manager.dispose()
        manager.dispose()
      }).not.toThrow()
    })

    it('should remove event listeners', () => {
      const clickManager = new TerminalFocusManager({
        focusOnClick: true,
        focusOnHover: true,
      })
      clickManager.initialize(mockTerminal as unknown as Terminal)

      const removeEventListenerSpy = vi.spyOn(
        mockTerminal.element,
        'removeEventListener'
      )

      clickManager.dispose()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      )
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'mouseenter',
        expect.any(Function)
      )
    })
  })
})
