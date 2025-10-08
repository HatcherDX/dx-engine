/**
 * @fileoverview Terminal Focus Manager - Focus state and keyboard event management.
 *
 * @description
 * Manages terminal focus state, keyboard shortcuts, and input handling.
 * Provides a centralized system for focus-related operations and keyboard
 * event processing with customizable keybindings.
 *
 * @example
 * ```typescript
 * const focusManager = new TerminalFocusManager()
 * focusManager.initialize(terminal)
 * focusManager.registerShortcut('Ctrl+C', () => copySelection())
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import type { Terminal } from 'xterm'

/**
 * Keyboard shortcut definition.
 *
 * @public
 * @since 1.0.0
 */
export interface KeyboardShortcut {
  /** Key combination (e.g., 'Ctrl+C', 'Cmd+V') */
  key: string
  /** Handler function for the shortcut */
  handler: (event: KeyboardEvent) => void | boolean
  /** Optional description for documentation */
  description?: string
  /** Whether to prevent default behavior */
  preventDefault?: boolean
  /** Whether to stop event propagation */
  stopPropagation?: boolean
}

/**
 * Focus manager configuration options.
 *
 * @public
 * @since 1.0.0
 */
export interface FocusManagerOptions {
  /** Enable automatic focus on click */
  focusOnClick?: boolean
  /** Enable automatic focus on hover */
  focusOnHover?: boolean
  /** Blur on escape key */
  blurOnEscape?: boolean
  /** Restore focus after context menu */
  restoreFocusAfterContextMenu?: boolean
  /** Custom keyboard shortcuts */
  shortcuts?: KeyboardShortcut[]
  /** Enable debug logging */
  debug?: boolean
}

/**
 * Focus event data.
 *
 * @public
 * @since 1.0.0
 */
export interface FocusEvent {
  /** Type of focus event */
  type: 'focus' | 'blur'
  /** Timestamp of the event */
  timestamp: number
  /** Source of the event */
  source: 'user' | 'programmatic' | 'system'
}

/**
 * Manages terminal focus state and keyboard events.
 *
 * @remarks
 * This class provides comprehensive focus management for XTerm.js terminals,
 * including focus state tracking, keyboard shortcut handling, and event management.
 *
 * Key features:
 * - Focus/blur state tracking
 * - Keyboard shortcut registration
 * - Automatic focus handling
 * - Event delegation
 * - Focus history tracking
 *
 * @public
 * @since 1.0.0
 */
export class TerminalFocusManager {
  private terminal: Terminal | null = null
  private hasFocus = false
  private shortcuts: Map<string, KeyboardShortcut> = new Map()
  private focusHandlers: Set<(event: FocusEvent) => void> = new Set()
  private blurHandlers: Set<(event: FocusEvent) => void> = new Set()
  private keyHandlers: Set<(event: KeyboardEvent) => void> = new Set()
  private focusHistory: FocusEvent[] = []
  private readonly options: Required<FocusManagerOptions>
  private disposables: Array<{ dispose(): void }> = []

  /**
   * Creates a new TerminalFocusManager instance.
   *
   * @param options - Configuration options for focus management
   *
   * @example
   * ```typescript
   * const manager = new TerminalFocusManager({
   *   focusOnClick: true,
   *   blurOnEscape: true,
   *   shortcuts: [
   *     {
   *       key: 'Ctrl+C',
   *       handler: () => copySelection(),
   *       description: 'Copy selection'
   *     }
   *   ]
   * })
   * ```
   */
  constructor(options: FocusManagerOptions = {}) {
    this.options = {
      focusOnClick: true,
      focusOnHover: false,
      blurOnEscape: true,
      restoreFocusAfterContextMenu: true,
      shortcuts: [],
      debug: false,
      ...options,
    }

    // Register default shortcuts
    if (options.shortcuts) {
      options.shortcuts.forEach((shortcut) => {
        this.registerShortcut(shortcut)
      })
    }
  }

  /**
   * Initializes focus manager for a terminal.
   *
   * @param terminal - XTerm.js terminal instance
   *
   * @throws {@link Error}
   * Thrown when terminal is invalid
   *
   * @example
   * ```typescript
   * const terminal = new Terminal()
   * manager.initialize(terminal)
   * ```
   */
  initialize(terminal: Terminal): void {
    if (!terminal) {
      throw new Error('Terminal instance is required')
    }

    this.terminal = terminal

    // Setup terminal focus events if available
    if ('onFocus' in terminal && typeof terminal.onFocus === 'function') {
      const focusDisposable = terminal.onFocus(() => {
        this.handleFocus('system')
      })
      this.disposables.push(focusDisposable)
    }

    if ('onBlur' in terminal && typeof terminal.onBlur === 'function') {
      const blurDisposable = terminal.onBlur(() => {
        this.handleBlur('system')
      })
      this.disposables.push(blurDisposable)
    }

    // Setup keyboard event handling
    if (terminal.element) {
      this.setupKeyboardHandling(terminal.element)
    }

    // Setup click handling if enabled
    if (this.options.focusOnClick && terminal.element) {
      terminal.element.addEventListener('click', this.handleClick)
    }

    // Setup hover handling if enabled
    if (this.options.focusOnHover && terminal.element) {
      terminal.element.addEventListener('mouseenter', this.handleMouseEnter)
    }

    if (this.options.debug) {
      console.log('[FocusManager] Initialized')
    }
  }

  /**
   * Focuses the terminal.
   *
   * @param source - Source of the focus event
   *
   * @example
   * ```typescript
   * manager.focus()
   * ```
   */
  focus(source: 'user' | 'programmatic' = 'programmatic'): void {
    if (!this.terminal) return

    this.terminal.focus()
    this.handleFocus(source)
  }

  /**
   * Blurs the terminal.
   *
   * @param source - Source of the blur event
   *
   * @example
   * ```typescript
   * manager.blur()
   * ```
   */
  blur(source: 'user' | 'programmatic' = 'programmatic'): void {
    if (!this.terminal) return

    this.terminal.blur()
    this.handleBlur(source)
  }

  /**
   * Handles focus events.
   *
   * @internal
   */
  private handleFocus(source: FocusEvent['source']): void {
    if (this.hasFocus) return

    this.hasFocus = true

    const event: FocusEvent = {
      type: 'focus',
      timestamp: Date.now(),
      source,
    }

    this.focusHistory.push(event)
    if (this.focusHistory.length > 10) {
      this.focusHistory.shift()
    }

    this.focusHandlers.forEach((handler) => {
      try {
        handler(event)
      } catch (error) {
        if (this.options.debug) {
          console.error('[FocusManager] Focus handler error:', error)
        }
      }
    })

    if (this.options.debug) {
      console.log('[FocusManager] Focused', event)
    }
  }

  /**
   * Handles blur events.
   *
   * @internal
   */
  private handleBlur(source: FocusEvent['source']): void {
    if (!this.hasFocus) return

    this.hasFocus = false

    const event: FocusEvent = {
      type: 'blur',
      timestamp: Date.now(),
      source,
    }

    this.focusHistory.push(event)
    if (this.focusHistory.length > 10) {
      this.focusHistory.shift()
    }

    this.blurHandlers.forEach((handler) => {
      try {
        handler(event)
      } catch (error) {
        if (this.options.debug) {
          console.error('[FocusManager] Blur handler error:', error)
        }
      }
    })

    if (this.options.debug) {
      console.log('[FocusManager] Blurred', event)
    }
  }

  /**
   * Sets up keyboard event handling.
   *
   * @internal
   */
  private setupKeyboardHandling(element: HTMLElement): void {
    const handleKeyDown = (event: KeyboardEvent): void => {
      // Check for registered shortcuts
      const key = this.getKeyString(event)

      if (this.shortcuts.has(key)) {
        const shortcut = this.shortcuts.get(key)!
        const result = shortcut.handler(event)

        if (result !== false) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault()
          }
          if (shortcut.stopPropagation) {
            event.stopPropagation()
          }
        }
      }

      // Handle blur on escape if enabled
      if (this.options.blurOnEscape && event.key === 'Escape') {
        this.blur('user')
      }

      // Notify key handlers
      this.keyHandlers.forEach((handler) => {
        try {
          handler(event)
        } catch (error) {
          if (this.options.debug) {
            console.error('[FocusManager] Key handler error:', error)
          }
        }
      })
    }

    element.addEventListener('keydown', handleKeyDown)
  }

  /**
   * Gets standardized key string from keyboard event.
   *
   * @internal
   */
  private getKeyString(event: KeyboardEvent): string {
    const parts: string[] = []

    if (event.ctrlKey) parts.push('Ctrl')
    if (event.altKey) parts.push('Alt')
    if (event.shiftKey) parts.push('Shift')
    if (event.metaKey) parts.push('Cmd')

    // Add the main key
    const key = event.key.length === 1 ? event.key.toUpperCase() : event.key
    parts.push(key)

    return parts.join('+')
  }

  /**
   * Registers a keyboard shortcut.
   *
   * @param shortcut - Shortcut definition
   *
   * @example
   * ```typescript
   * manager.registerShortcut({
   *   key: 'Ctrl+Shift+C',
   *   handler: () => {
   *     console.log('Copy triggered')
   *   },
   *   description: 'Copy selection'
   * })
   * ```
   */
  registerShortcut(shortcut: KeyboardShortcut): void {
    this.shortcuts.set(shortcut.key, shortcut)

    if (this.options.debug) {
      console.log(`[FocusManager] Registered shortcut: ${shortcut.key}`)
    }
  }

  /**
   * Unregisters a keyboard shortcut.
   *
   * @param key - Key combination to unregister
   *
   * @example
   * ```typescript
   * manager.unregisterShortcut('Ctrl+C')
   * ```
   */
  unregisterShortcut(key: string): void {
    this.shortcuts.delete(key)
  }

  /**
   * Registers a focus event handler.
   *
   * @param handler - Function to call on focus
   * @returns Function to unregister the handler
   *
   * @example
   * ```typescript
   * const unsubscribe = manager.onFocus((event) => {
   *   console.log('Terminal focused', event)
   * })
   * ```
   */
  onFocus(handler: (event: FocusEvent) => void): () => void {
    this.focusHandlers.add(handler)
    return () => {
      this.focusHandlers.delete(handler)
    }
  }

  /**
   * Registers a blur event handler.
   *
   * @param handler - Function to call on blur
   * @returns Function to unregister the handler
   *
   * @example
   * ```typescript
   * const unsubscribe = manager.onBlur((event) => {
   *   console.log('Terminal blurred', event)
   * })
   * ```
   */
  onBlur(handler: (event: FocusEvent) => void): () => void {
    this.blurHandlers.add(handler)
    return () => {
      this.blurHandlers.delete(handler)
    }
  }

  /**
   * Registers a keyboard event handler.
   *
   * @param handler - Function to call on keyboard event
   * @returns Function to unregister the handler
   *
   * @example
   * ```typescript
   * const unsubscribe = manager.onKey((event) => {
   *   console.log('Key pressed:', event.key)
   * })
   * ```
   */
  onKey(handler: (event: KeyboardEvent) => void): () => void {
    this.keyHandlers.add(handler)
    return () => {
      this.keyHandlers.delete(handler)
    }
  }

  /**
   * Handles click events.
   *
   * @internal
   */
  private handleClick = (): void => {
    if (!this.hasFocus) {
      this.focus('user')
    }
  }

  /**
   * Handles mouse enter events.
   *
   * @internal
   */
  private handleMouseEnter = (): void => {
    if (!this.hasFocus) {
      this.focus('user')
    }
  }

  /**
   * Checks if terminal has focus.
   *
   * @returns True if terminal has focus
   *
   * @example
   * ```typescript
   * if (manager.isFocused()) {
   *   console.log('Terminal is focused')
   * }
   * ```
   */
  isFocused(): boolean {
    return this.hasFocus
  }

  /**
   * Gets focus history.
   *
   * @returns Array of recent focus events
   *
   * @example
   * ```typescript
   * const history = manager.getFocusHistory()
   * console.log('Last focus event:', history[history.length - 1])
   * ```
   */
  getFocusHistory(): FocusEvent[] {
    return [...this.focusHistory]
  }

  /**
   * Gets all registered shortcuts.
   *
   * @returns Map of registered shortcuts
   *
   * @example
   * ```typescript
   * const shortcuts = manager.getShortcuts()
   * shortcuts.forEach((shortcut, key) => {
   *   console.log(`${key}: ${shortcut.description}`)
   * })
   * ```
   */
  getShortcuts(): Map<string, KeyboardShortcut> {
    return new Map(this.shortcuts)
  }

  /**
   * Disposes the focus manager and cleans up resources.
   *
   * @example
   * ```typescript
   * manager.dispose()
   * ```
   */
  dispose(): void {
    // Dispose terminal event listeners
    this.disposables.forEach((d) => d.dispose())
    this.disposables = []

    // Remove DOM event listeners
    if (this.terminal?.element) {
      this.terminal.element.removeEventListener('click', this.handleClick)
      this.terminal.element.removeEventListener(
        'mouseenter',
        this.handleMouseEnter
      )
    }

    // Clear handlers
    this.focusHandlers.clear()
    this.blurHandlers.clear()
    this.keyHandlers.clear()
    this.shortcuts.clear()

    // Clear state
    this.terminal = null
    this.hasFocus = false
    this.focusHistory = []

    if (this.options.debug) {
      console.log('[FocusManager] Disposed')
    }
  }

  /**
   * Updates focus manager options.
   *
   * @param options - Partial options to update
   *
   * @example
   * ```typescript
   * manager.updateOptions({
   *   blurOnEscape: false,
   *   focusOnHover: true
   * })
   * ```
   */
  updateOptions(options: Partial<FocusManagerOptions>): void {
    Object.assign(this.options, options)
  }
}
