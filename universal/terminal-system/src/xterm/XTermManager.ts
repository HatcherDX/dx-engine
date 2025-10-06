/**
 * @fileoverview XTerm.js Terminal Manager - Core terminal instance management.
 *
 * @description
 * Manages XTerm.js terminal instances with professional configuration,
 * theme management, and lifecycle control. Provides a centralized interface
 * for creating, configuring, and disposing of terminals.
 *
 * @example
 * ```typescript
 * const manager = new XTermManager({
 *   fontSize: 14,
 *   theme: 'dark'
 * })
 * const terminal = await manager.initialize(container)
 * manager.write('Hello, World!')
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { Terminal, type ITerminalOptions, type ITheme } from 'xterm'

/**
 * Configuration options for XTermManager.
 *
 * @public
 * @since 1.0.0
 */
export interface XTermOptions {
  /** Font size in pixels */
  fontSize?: number
  /** Font family for terminal text */
  fontFamily?: string
  /** Theme variant */
  theme?: 'light' | 'dark'
  /** Enable cursor blinking */
  cursorBlink?: boolean
  /** Cursor style */
  cursorStyle?: 'block' | 'underline' | 'bar'
  /** Scrollback buffer size */
  scrollback?: number
  /** Terminal columns */
  cols?: number
  /** Terminal rows */
  rows?: number
  /** Convert EOL characters */
  convertEol?: boolean
  /** Tab stop width */
  tabStopWidth?: number
  /** Allow proposed API features */
  allowProposedApi?: boolean
  /** Fast scroll modifier key */
  fastScrollModifier?: 'alt' | 'ctrl' | 'shift'
  /** Fast scroll sensitivity */
  fastScrollSensitivity?: number
  /** Scroll on user input */
  scrollOnUserInput?: boolean
  /** Alt key moves cursor */
  altClickMovesCursor?: boolean
  /** Mac option is meta key */
  macOptionIsMeta?: boolean
  /** Right click selects word */
  rightClickSelectsWord?: boolean
  /** Minimum contrast ratio */
  minimumContrastRatio?: number
}

/**
 * XTerm.js light theme configuration.
 *
 * @internal
 */
const LIGHT_THEME: ITheme = {
  background: '#f8fafc',
  foreground: '#1e293b',
  cursor: '#dfa927',
  cursorAccent: '#1e293b',
  selectionBackground: 'rgba(223, 169, 39, 0.3)',
  selectionInactiveBackground: 'rgba(223, 169, 39, 0.15)',
  // ANSI colors
  black: '#1e293b',
  red: '#dc2626',
  green: '#16a34a',
  yellow: '#ca8a04',
  blue: '#2563eb',
  magenta: '#9333ea',
  cyan: '#06b6d4',
  white: '#e2e8f0',
  brightBlack: '#64748b',
  brightRed: '#ef4444',
  brightGreen: '#22c55e',
  brightYellow: '#eab308',
  brightBlue: '#3b82f6',
  brightMagenta: '#a855f7',
  brightCyan: '#22d3ee',
  brightWhite: '#f1f5f9',
}

/**
 * XTerm.js dark theme configuration.
 *
 * @internal
 */
const DARK_THEME: ITheme = {
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  cursor: '#dfa927',
  cursorAccent: '#000000',
  selectionBackground: 'rgba(223, 169, 39, 0.3)',
  selectionInactiveBackground: 'rgba(223, 169, 39, 0.15)',
  // ANSI colors - VS Code Dark+ inspired
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
  brightWhite: '#e5e5e5',
}

/**
 * Manages XTerm.js terminal instances.
 *
 * @remarks
 * This class provides a high-level interface for managing XTerm.js terminals.
 * It handles terminal creation, configuration, theme management, and disposal.
 *
 * Key features:
 * - Professional default configuration
 * - Light/dark theme support
 * - Lifecycle management
 * - Configuration updates
 * - Data writing and clearing
 *
 * @public
 * @since 1.0.0
 */
export class XTermManager {
  private terminal: Terminal | null = null
  private options: XTermOptions

  /**
   * Creates a new XTermManager instance.
   *
   * @param options - Configuration options for the terminal
   *
   * @example
   * ```typescript
   * const manager = new XTermManager({
   *   fontSize: 14,
   *   fontFamily: 'Monaco, monospace',
   *   theme: 'dark'
   * })
   * ```
   */
  constructor(options: XTermOptions = {}) {
    this.options = {
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: 'dark',
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 10000,
      cols: 80,
      rows: 24,
      convertEol: true,
      tabStopWidth: 4,
      allowProposedApi: true,
      fastScrollModifier: 'alt',
      fastScrollSensitivity: 5,
      scrollOnUserInput: false,
      altClickMovesCursor: true,
      macOptionIsMeta: true,
      rightClickSelectsWord: false,
      minimumContrastRatio: 1,
      ...options,
    }
  }

  /**
   * Initializes terminal in the specified container.
   *
   * @param container - HTML element to attach terminal to
   * @returns Initialized terminal instance
   *
   * @throws {@link Error}
   * Thrown when container is not provided or invalid
   *
   * @example
   * ```typescript
   * const container = document.getElementById('terminal')
   * const terminal = await manager.initialize(container)
   * ```
   */
  async initialize(container: HTMLElement): Promise<Terminal> {
    if (!container) {
      throw new Error('Container element is required')
    }

    // Clean up existing terminal if present
    if (this.terminal) {
      this.dispose()
    }

    // Create terminal with configuration
    const terminalOptions: ITerminalOptions = {
      fontSize: this.options.fontSize,
      fontFamily: this.options.fontFamily,
      theme: this.getTheme(this.options.theme || 'dark'),
      cursorBlink: this.options.cursorBlink,
      cursorStyle: this.options.cursorStyle,
      scrollback: this.options.scrollback,
      convertEol: this.options.convertEol,
      tabStopWidth: this.options.tabStopWidth,
      allowProposedApi: this.options.allowProposedApi,
      fastScrollModifier: this.options.fastScrollModifier,
      fastScrollSensitivity: this.options.fastScrollSensitivity,
      scrollOnUserInput: this.options.scrollOnUserInput,
      altClickMovesCursor: this.options.altClickMovesCursor,
      macOptionIsMeta: this.options.macOptionIsMeta,
      rightClickSelectsWord: this.options.rightClickSelectsWord,
      minimumContrastRatio: this.options.minimumContrastRatio,
    }

    this.terminal = new Terminal(terminalOptions)

    // Clear container and attach terminal
    container.innerHTML = ''
    this.terminal.open(container)

    // Set initial size if specified
    if (this.options.cols && this.options.rows) {
      this.terminal.resize(this.options.cols, this.options.rows)
    }

    return this.terminal
  }

  /**
   * Gets terminal instance.
   *
   * @returns Current terminal instance or null if not initialized
   */
  getTerminal(): Terminal | null {
    return this.terminal
  }

  /**
   * Gets theme configuration.
   *
   * @param variant - Theme variant ('light' or 'dark')
   * @returns Theme configuration object
   *
   * @example
   * ```typescript
   * const theme = manager.getTheme('dark')
   * terminal.options.theme = theme
   * ```
   */
  getTheme(variant: 'light' | 'dark'): ITheme {
    return variant === 'light' ? LIGHT_THEME : DARK_THEME
  }

  /**
   * Updates terminal options.
   *
   * @param options - Partial options to update
   *
   * @example
   * ```typescript
   * manager.updateOptions({
   *   fontSize: 16,
   *   theme: 'light'
   * })
   * ```
   */
  updateOptions(options: Partial<XTermOptions>): void {
    this.options = { ...this.options, ...options }

    if (this.terminal) {
      // Update terminal options
      if (options.fontSize !== undefined) {
        this.terminal.options.fontSize = options.fontSize
      }
      if (options.fontFamily !== undefined) {
        this.terminal.options.fontFamily = options.fontFamily
      }
      if (options.theme !== undefined) {
        this.terminal.options.theme = this.getTheme(options.theme)
      }
      if (options.cursorBlink !== undefined) {
        this.terminal.options.cursorBlink = options.cursorBlink
      }
      if (options.cursorStyle !== undefined) {
        this.terminal.options.cursorStyle = options.cursorStyle
      }
      if (options.scrollback !== undefined) {
        this.terminal.options.scrollback = options.scrollback
      }
      if (options.tabStopWidth !== undefined) {
        this.terminal.options.tabStopWidth = options.tabStopWidth
      }
      if (options.scrollOnUserInput !== undefined) {
        this.terminal.options.scrollOnUserInput = options.scrollOnUserInput
      }
    }
  }

  /**
   * Writes data to terminal.
   *
   * @param data - Data to write
   * @param callback - Optional callback when write completes
   *
   * @example
   * ```typescript
   * manager.write('Hello, World!\r\n')
   * manager.write('$ ', () => console.log('Prompt written'))
   * ```
   */
  write(data: string, callback?: () => void): void {
    if (this.terminal) {
      this.terminal.write(data, callback)
    } else if (callback) {
      callback()
    }
  }

  /**
   * Writes a line to terminal (appends \r\n).
   *
   * @param line - Line to write
   *
   * @example
   * ```typescript
   * manager.writeln('Welcome to Hatcher Terminal')
   * manager.writeln('Type "help" for available commands')
   * ```
   */
  writeln(line: string): void {
    this.write(line + '\r\n')
  }

  /**
   * Clears terminal screen.
   *
   * @example
   * ```typescript
   * manager.clear()
   * ```
   */
  clear(): void {
    if (this.terminal) {
      this.terminal.clear()
    }
  }

  /**
   * Resets terminal state.
   *
   * @example
   * ```typescript
   * manager.reset()
   * ```
   */
  reset(): void {
    if (this.terminal) {
      this.terminal.reset()
    }
  }

  /**
   * Focuses terminal.
   *
   * @example
   * ```typescript
   * manager.focus()
   * ```
   */
  focus(): void {
    if (this.terminal) {
      this.terminal.focus()
    }
  }

  /**
   * Blurs terminal.
   *
   * @example
   * ```typescript
   * manager.blur()
   * ```
   */
  blur(): void {
    if (this.terminal) {
      this.terminal.blur()
    }
  }

  /**
   * Scrolls terminal to bottom.
   *
   * @example
   * ```typescript
   * manager.scrollToBottom()
   * ```
   */
  scrollToBottom(): void {
    if (this.terminal) {
      this.terminal.scrollToBottom()
    }
  }

  /**
   * Scrolls terminal to top.
   *
   * @example
   * ```typescript
   * manager.scrollToTop()
   * ```
   */
  scrollToTop(): void {
    if (this.terminal) {
      this.terminal.scrollToTop()
    }
  }

  /**
   * Scrolls terminal by specified lines.
   *
   * @param lines - Number of lines to scroll (positive = down, negative = up)
   *
   * @example
   * ```typescript
   * manager.scrollLines(5)  // Scroll down 5 lines
   * manager.scrollLines(-5) // Scroll up 5 lines
   * ```
   */
  scrollLines(lines: number): void {
    if (this.terminal) {
      this.terminal.scrollLines(lines)
    }
  }

  /**
   * Resizes terminal.
   *
   * @param cols - Number of columns
   * @param rows - Number of rows
   *
   * @example
   * ```typescript
   * manager.resize(120, 40)
   * ```
   */
  resize(cols: number, rows: number): void {
    if (this.terminal) {
      this.terminal.resize(cols, rows)
    }
  }

  /**
   * Gets terminal dimensions.
   *
   * @returns Terminal dimensions or null if not initialized
   *
   * @example
   * ```typescript
   * const dimensions = manager.getDimensions()
   * console.log(`Terminal size: ${dimensions.cols}x${dimensions.rows}`)
   * ```
   */
  getDimensions(): { cols: number; rows: number } | null {
    if (this.terminal) {
      return {
        cols: this.terminal.cols,
        rows: this.terminal.rows,
      }
    }
    return null
  }

  /**
   * Checks if terminal has selection.
   *
   * @returns True if text is selected
   */
  hasSelection(): boolean {
    return this.terminal?.hasSelection() || false
  }

  /**
   * Gets selected text.
   *
   * @returns Selected text or empty string
   */
  getSelection(): string {
    return this.terminal?.getSelection() || ''
  }

  /**
   * Clears selection.
   */
  clearSelection(): void {
    if (this.terminal) {
      this.terminal.clearSelection()
    }
  }

  /**
   * Selects all text.
   */
  selectAll(): void {
    if (this.terminal) {
      this.terminal.selectAll()
    }
  }

  /**
   * Disposes terminal and cleans up resources.
   *
   * @example
   * ```typescript
   * manager.dispose()
   * ```
   */
  dispose(): void {
    if (this.terminal) {
      this.terminal.dispose()
      this.terminal = null
    }
  }

  /**
   * Checks if terminal is initialized.
   *
   * @returns True if terminal is initialized
   */
  isInitialized(): boolean {
    return this.terminal !== null
  }

  /**
   * Gets current options.
   *
   * @returns Current terminal options
   */
  getOptions(): XTermOptions {
    return { ...this.options }
  }
}
