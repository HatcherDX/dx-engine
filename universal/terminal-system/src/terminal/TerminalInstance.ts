import { v4 as uuidv4 } from 'uuid'
import { EventEmitter } from '../core/EventEmitter'
import { Logger } from '../utils/logger'
import type { TerminalConfig } from '../types/terminal'

/**
 * Xterm.js Terminal interface - compatible with actual Terminal class
 */
interface Terminal {
  onData(listener: (data: string) => void): { dispose(): void }
  onResize(listener: (event: { cols: number; rows: number }) => void): {
    dispose(): void
  }
  onTitleChange(listener: (title: string) => void): { dispose(): void }
  open(parent: HTMLElement): void
  write(data: string): void
  resize(cols: number, rows: number): void
  focus(): void
  blur(): void
  clear(): void
  getSelection(): string
  selectAll(): void
  dispose(): void
  options: {
    theme?: unknown // Allow xterm.js ITheme or any theme object
    fontSize?: number
    fontFamily?: string
    lineHeight?: number
    rows?: number
    cols?: number
  }
  loadAddon?(addon: unknown): void
}

/**
 * Electron API interface for terminal IPC
 */
interface ElectronTerminalAPI {
  send(
    channel: string,
    data: { id: string; data?: string; cols?: number; rows?: number }
  ): void
}

/**
 * Extended window interface
 */
declare global {
  interface Window {
    electronAPI?: ElectronTerminalAPI
  }
}

/**
 * Terminal instance events following VSCode pattern
 */
interface TerminalInstanceEvents extends Record<string, unknown[]> {
  data: [string] // Terminal output data
  resize: [number, number] // cols, rows
  exit: [number] // exitCode
  error: [Error] // Terminal error
  'title-changed': [string] // Terminal title
  focus: [] // Terminal focused
  blur: [] // Terminal lost focus
}

/**
 * TerminalInstance - Individual terminal with xterm.js integration
 * Following VSCode's TerminalInstance pattern for robustness
 */
export class TerminalInstance extends EventEmitter<TerminalInstanceEvents> {
  private logger = new Logger('TerminalInstance')
  private _isDisposed = false
  private _title: string
  private _startTime: Date
  private _lastActivity: Date
  private _xtermTerminal: Terminal | null = null // xterm.js Terminal instance
  private _xtermElement: HTMLElement | null = null // Container element reference (used for cleanup)
  private _isReady = false

  readonly id: string
  readonly config: TerminalConfig
  readonly pid?: number

  constructor(config: TerminalConfig, pid?: number) {
    super()

    this.id = config.id || uuidv4()
    this.config = { ...config, id: this.id }
    this.pid = pid
    this._title = config.name || `Terminal ${this.id.slice(0, 8)}`
    this._startTime = new Date()
    this._lastActivity = new Date()

    this.logger.info(`Creating terminal instance: ${this.id}`)
  }

  /**
   * Initialize xterm.js terminal (web only)
   * This will be called from Vue components
   */
  async initializeXterm(container: HTMLElement): Promise<void> {
    if (this._isDisposed) {
      throw new Error('Terminal instance is disposed')
    }

    if (typeof window === 'undefined') {
      // Server-side, skip xterm initialization
      return
    }

    try {
      // Dynamic import for xterm.js to avoid SSR issues
      const { Terminal } = await import('xterm')

      this._xtermTerminal = new Terminal({
        cols: this.config.cols || 80,
        rows: this.config.rows || 24,
        theme: {
          background: 'transparent',
          foreground: '#ffffff',
          cursor: '#ffffff',
          selectionBackground: '#ffffff40',
        },
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        fontSize: 13,
        lineHeight: 1.2,
        cursorBlink: true,
        cursorStyle: 'bar',
        scrollback: 1000,
        convertEol: true,
      })

      // Setup event handlers (we know _xtermTerminal is not null here)
      this._xtermTerminal!.onData((data: string) => {
        this._lastActivity = new Date()
        // Send input to backend via IPC
        if (window.electronAPI) {
          window.electronAPI.send('terminal-input', {
            id: this.id,
            data,
          })
        }
      })

      this._xtermTerminal!.onResize(
        ({ cols, rows }: { cols: number; rows: number }) => {
          this.emit('resize', cols, rows)
          // Notify backend of resize
          if (window.electronAPI) {
            window.electronAPI.send('terminal-resize', {
              id: this.id,
              cols,
              rows,
            })
          }
        }
      )

      this._xtermTerminal!.onTitleChange((title: string) => {
        this._title = title
        this.emit('title-changed', title)
      })

      // Open terminal in container
      this._xtermTerminal!.open(container)
      this._xtermElement = container
      this._isReady = true

      // Load fit addon if available
      try {
        const { FitAddon } = await import('xterm-addon-fit')
        const fitAddon = new FitAddon()
        this._xtermTerminal!.loadAddon?.(fitAddon)
        fitAddon.fit()

        // Auto-fit on container resize
        const resizeObserver = new ResizeObserver(() => {
          if (this._xtermTerminal && !this._isDisposed) {
            fitAddon.fit()
          }
        })
        resizeObserver.observe(container)
      } catch (error) {
        this.logger.warn('FitAddon not available:', error)
      }

      this.logger.info(`Terminal ${this.id} initialized with xterm.js`)
    } catch (error) {
      this.logger.error(
        'Failed to initialize xterm.js:',
        error instanceof Error ? error : new Error(String(error))
      )
      throw error
    }
  }

  /**
   * Write data to terminal (from backend)
   */
  writeData(data: string): void {
    if (this._isDisposed) return

    this._lastActivity = new Date()

    if (this._xtermTerminal && this._isReady) {
      this._xtermTerminal.write(data)
    }

    this.emit('data', data)
  }

  /**
   * Resize terminal
   */
  resize(cols: number, rows: number): void {
    if (this._isDisposed) return

    if (this._xtermTerminal && this._isReady) {
      this._xtermTerminal.resize(cols, rows)
    }

    // Update config
    this.config.cols = cols
    this.config.rows = rows
  }

  /**
   * Focus terminal
   */
  focus(): void {
    if (this._isDisposed) return

    if (this._xtermTerminal && this._isReady) {
      this._xtermTerminal.focus()
    }

    this.emit('focus')
  }

  /**
   * Blur terminal
   */
  blur(): void {
    if (this._isDisposed) return

    if (this._xtermTerminal && this._isReady) {
      this._xtermTerminal.blur()
    }

    this.emit('blur')
  }

  /**
   * Clear terminal
   */
  clear(): void {
    if (this._isDisposed) return

    if (this._xtermTerminal && this._isReady) {
      this._xtermTerminal.clear()
    }
  }

  /**
   * Get terminal selection
   */
  getSelection(): string {
    if (this._isDisposed || !this._xtermTerminal || !this._isReady) {
      return ''
    }

    return this._xtermTerminal.getSelection()
  }

  /**
   * Select all terminal content
   */
  selectAll(): void {
    if (this._isDisposed || !this._xtermTerminal || !this._isReady) {
      return
    }

    this._xtermTerminal.selectAll()
  }

  /**
   * Copy selection to clipboard
   */
  async copySelection(): Promise<void> {
    const selection = this.getSelection()
    if (selection && navigator.clipboard) {
      await navigator.clipboard.writeText(selection)
    }
  }

  /**
   * Paste from clipboard
   */
  async paste(): Promise<void> {
    if (this._isDisposed) return

    try {
      if (navigator.clipboard) {
        const text = await navigator.clipboard.readText()
        if (text && window.electronAPI) {
          window.electronAPI.send('terminal-input', {
            id: this.id,
            data: text,
          })
        }
      }
    } catch (error) {
      this.logger.warn('Failed to paste:', error)
    }
  }

  /**
   * Handle terminal exit
   */
  handleExit(exitCode: number): void {
    if (this._isDisposed) return

    this.logger.info(`Terminal ${this.id} exited with code ${exitCode}`)
    this.emit('exit', exitCode)
  }

  /**
   * Handle terminal error
   */
  handleError(error: Error): void {
    if (this._isDisposed) return

    this.logger.error(`Terminal ${this.id} error:`, error)
    this.emit('error', error)
  }

  /**
   * Dispose terminal instance
   */
  dispose(): void {
    if (this._isDisposed) return

    this.logger.info(`Disposing terminal instance: ${this.id}`)

    if (this._xtermTerminal) {
      this._xtermTerminal.dispose()
      this._xtermTerminal = null
    }

    if (this._xtermElement) {
      // Clean up container if needed
      this._xtermElement = null
    }
    this._isReady = false
    this._isDisposed = true

    // Remove all listeners
    this.removeAllListeners()
  }

  // Getters
  get title(): string {
    return this._title
  }

  get startTime(): Date {
    return this._startTime
  }

  get lastActivity(): Date {
    return this._lastActivity
  }

  get isDisposed(): boolean {
    return this._isDisposed
  }

  get isReady(): boolean {
    return this._isReady
  }

  get xtermTerminal(): Terminal | null {
    return this._xtermTerminal
  }

  /**
   * Get terminal stats for debugging
   */
  getStats(): {
    id: string
    title: string
    pid?: number
    startTime: Date
    lastActivity: Date
    isReady: boolean
    isDisposed: boolean
    cols: number
    rows: number
  } {
    return {
      id: this.id,
      title: this._title,
      pid: this.pid,
      startTime: this._startTime,
      lastActivity: this._lastActivity,
      isReady: this._isReady,
      isDisposed: this._isDisposed,
      cols: this.config.cols || 80,
      rows: this.config.rows || 24,
    }
  }
}
