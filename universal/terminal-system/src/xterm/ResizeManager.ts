/**
 * @fileoverview Terminal Resize Manager - Intelligent resize handling with debouncing.
 *
 * @description
 * Manages terminal resizing operations with automatic fitting, debouncing,
 * and dimension calculation. Provides optimal terminal sizing based on container
 * dimensions and font metrics.
 *
 * @example
 * ```typescript
 * const resizeManager = new TerminalResizeManager()
 * resizeManager.initialize(terminal, container)
 * resizeManager.fit() // Auto-fit to container
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import type { Terminal } from 'xterm'
import type { FitAddon } from '@xterm/addon-fit'

/**
 * Extended Terminal interface with internal properties for dimension access.
 *
 * @internal
 * @since 1.0.0
 */
interface TerminalWithCore extends Terminal {
  _core?: {
    _renderService?: {
      _renderer?: {
        dimensions?: {
          actualCellWidth?: number
          actualCellHeight?: number
        }
      }
    }
  }
}

/**
 * Extended FitAddon interface with internal methods.
 *
 * @internal
 * @since 1.0.0
 */
interface FitAddonWithPropose extends FitAddon {
  proposeDimensions():
    | {
        cols: number
        rows: number
        charWidth?: number
        charHeight?: number
      }
    | undefined
}

/**
 * Configuration options for resize manager.
 *
 * @public
 * @since 1.0.0
 */
export interface ResizeManagerOptions {
  /** Debounce delay for resize events in milliseconds */
  debounceDelay?: number
  /** Enable automatic resizing on container changes */
  autoResize?: boolean
  /** Minimum columns */
  minCols?: number
  /** Maximum columns */
  maxCols?: number
  /** Minimum rows */
  minRows?: number
  /** Maximum rows */
  maxRows?: number
  /** Padding in pixels */
  padding?: number
  /** Enable debug logging */
  debug?: boolean
}

/**
 * Terminal dimension information.
 *
 * @public
 * @since 1.0.0
 */
export interface TerminalDimensions {
  /** Number of columns */
  cols: number
  /** Number of rows */
  rows: number
  /** Width in pixels */
  width: number
  /** Height in pixels */
  height: number
  /** Character width in pixels */
  charWidth: number
  /** Character height in pixels */
  charHeight: number
}

/**
 * Manages terminal resize operations with intelligent fitting.
 *
 * @remarks
 * This class provides comprehensive resize management for XTerm.js terminals,
 * including automatic fitting, dimension calculation, and debounced resize handling.
 *
 * Key features:
 * - Automatic container size detection
 * - Debounced resize events
 * - Min/max dimension constraints
 * - Character-based dimension calculation
 * - ResizeObserver integration
 *
 * @public
 * @since 1.0.0
 */
export class TerminalResizeManager {
  private terminal: Terminal | null = null
  private container: HTMLElement | null = null
  private fitAddon: FitAddon | null = null
  private resizeObserver: ResizeObserver | null = null
  private debounceTimer: NodeJS.Timeout | null = null
  private readonly options: Required<ResizeManagerOptions>
  private lastDimensions: TerminalDimensions | null = null
  private resizeHandlers: Set<(dimensions: TerminalDimensions) => void> =
    new Set()

  /**
   * Creates a new TerminalResizeManager instance.
   *
   * @param options - Configuration options for resize management
   *
   * @example
   * ```typescript
   * const manager = new TerminalResizeManager({
   *   debounceDelay: 100,
   *   autoResize: true,
   *   minCols: 20,
   *   maxCols: 200
   * })
   * ```
   */
  constructor(options: ResizeManagerOptions = {}) {
    this.options = {
      debounceDelay: 100,
      autoResize: true,
      minCols: 10,
      maxCols: 500,
      minRows: 5,
      maxRows: 200,
      padding: 0,
      debug: false,
      ...options,
    }
  }

  /**
   * Initializes resize manager for a terminal.
   *
   * @param terminal - XTerm.js terminal instance
   * @param container - Container HTML element
   * @param fitAddon - Optional FitAddon instance
   *
   * @throws {@link Error}
   * Thrown when terminal or container is invalid
   *
   * @example
   * ```typescript
   * const fitAddon = new FitAddon()
   * terminal.loadAddon(fitAddon)
   * manager.initialize(terminal, container, fitAddon)
   * ```
   */
  async initialize(
    terminal: Terminal,
    container: HTMLElement,
    fitAddon?: FitAddon
  ): Promise<void> {
    if (!terminal) {
      throw new Error('Terminal instance is required')
    }
    if (!container) {
      throw new Error('Container element is required')
    }

    this.terminal = terminal
    this.container = container

    // Use provided FitAddon or create new one
    if (fitAddon) {
      this.fitAddon = fitAddon
    } else {
      try {
        const { FitAddon } = await import('@xterm/addon-fit')
        this.fitAddon = new FitAddon()
        terminal.loadAddon(this.fitAddon)
      } catch (error) {
        if (this.options.debug) {
          console.warn('[ResizeManager] FitAddon not available:', error)
        }
      }
    }

    // Setup auto-resize if enabled
    if (this.options.autoResize) {
      this.startObserving()
    }

    // Initial fit
    this.fit()

    if (this.options.debug) {
      console.log('[ResizeManager] Initialized', this.lastDimensions)
    }
  }

  /**
   * Fits terminal to container dimensions.
   *
   * @returns Calculated dimensions or undefined if fitting fails
   *
   * @example
   * ```typescript
   * const dimensions = manager.fit()
   * console.log(`Resized to ${dimensions.cols}x${dimensions.rows}`)
   * ```
   */
  fit(): TerminalDimensions | undefined {
    if (!this.terminal || !this.container) {
      return undefined
    }

    try {
      if (this.fitAddon) {
        // Use FitAddon for automatic fitting
        this.fitAddon.fit()
      } else {
        // Manual fitting calculation
        const dimensions = this.calculateDimensions()
        if (dimensions) {
          this.terminal.resize(dimensions.cols, dimensions.rows)
        }
      }

      // Get actual dimensions after resize
      const dimensions = this.getCurrentDimensions()
      if (dimensions) {
        this.lastDimensions = dimensions
        this.notifyResize(dimensions)
        return dimensions
      }

      return undefined
    } catch (error) {
      if (this.options.debug) {
        console.error('[ResizeManager] Fit failed:', error)
      }
      return undefined
    }
  }

  /**
   * Proposes dimensions based on container size.
   *
   * @returns Proposed dimensions or undefined if unavailable
   *
   * @example
   * ```typescript
   * const proposed = manager.proposeDimensions()
   * if (proposed) {
   *   console.log(`Proposed size: ${proposed.cols}x${proposed.rows}`)
   * }
   * ```
   */
  proposeDimensions(): TerminalDimensions | undefined {
    if (this.fitAddon && 'proposeDimensions' in this.fitAddon) {
      const proposed = (
        this.fitAddon as FitAddonWithPropose
      ).proposeDimensions()
      if (proposed && this.terminal) {
        return {
          cols: this.constrainCols(proposed.cols),
          rows: this.constrainRows(proposed.rows),
          width: this.container?.clientWidth ?? 0,
          height: this.container?.clientHeight ?? 0,
          charWidth: proposed.charWidth ?? 0,
          charHeight: proposed.charHeight ?? 0,
        }
      }
    }

    return this.calculateDimensions()
  }

  /**
   * Calculates optimal dimensions based on container size.
   *
   * @internal
   */
  private calculateDimensions(): TerminalDimensions | undefined {
    if (!this.terminal || !this.container) {
      return undefined
    }

    const containerWidth = this.container.clientWidth - this.options.padding * 2
    const containerHeight =
      this.container.clientHeight - this.options.padding * 2

    // Get character dimensions (approximation if not available)
    const charWidth = this.getCharWidth()
    const charHeight = this.getCharHeight()

    if (charWidth === 0 || charHeight === 0) {
      return undefined
    }

    const cols = Math.floor(containerWidth / charWidth)
    const rows = Math.floor(containerHeight / charHeight)

    return {
      cols: this.constrainCols(cols),
      rows: this.constrainRows(rows),
      width: containerWidth,
      height: containerHeight,
      charWidth,
      charHeight,
    }
  }

  /**
   * Gets current terminal dimensions.
   *
   * @returns Current dimensions or null
   *
   * @example
   * ```typescript
   * const current = manager.getCurrentDimensions()
   * console.log(`Current size: ${current?.cols}x${current?.rows}`)
   * ```
   */
  getCurrentDimensions(): TerminalDimensions | null {
    if (!this.terminal || !this.container) {
      return null
    }

    return {
      cols: this.terminal.cols,
      rows: this.terminal.rows,
      width: this.container.clientWidth,
      height: this.container.clientHeight,
      charWidth: this.getCharWidth(),
      charHeight: this.getCharHeight(),
    }
  }

  /**
   * Starts observing container size changes.
   *
   * @internal
   */
  private startObserving(): void {
    if (!this.container) return

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === this.container) {
          this.handleResize()
        }
      }
    })

    this.resizeObserver.observe(this.container)
  }

  /**
   * Handles resize events with debouncing.
   *
   * @internal
   */
  private handleResize(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    this.debounceTimer = setTimeout(() => {
      this.fit()
      this.debounceTimer = null
    }, this.options.debounceDelay)
  }

  /**
   * Constrains columns to min/max bounds.
   *
   * @internal
   */
  private constrainCols(cols: number): number {
    return Math.max(
      this.options.minCols,
      Math.min(this.options.maxCols, Math.floor(cols))
    )
  }

  /**
   * Constrains rows to min/max bounds.
   *
   * @internal
   */
  private constrainRows(rows: number): number {
    return Math.max(
      this.options.minRows,
      Math.min(this.options.maxRows, Math.floor(rows))
    )
  }

  /**
   * Gets character width in pixels.
   *
   * @internal
   */
  private getCharWidth(): number {
    if (!this.terminal) return 0

    // Try to get from terminal internals
    if ('_core' in this.terminal) {
      const core = (this.terminal as TerminalWithCore)._core
      if (core?._renderService?._renderer?.dimensions?.actualCellWidth) {
        return core._renderService._renderer.dimensions.actualCellWidth
      }
    }

    // Fallback calculation
    if (this.container && this.terminal.cols > 0) {
      return this.container.clientWidth / this.terminal.cols
    }

    return 9 // Default fallback
  }

  /**
   * Gets character height in pixels.
   *
   * @internal
   */
  private getCharHeight(): number {
    if (!this.terminal) return 0

    // Try to get from terminal internals
    if ('_core' in this.terminal) {
      const core = (this.terminal as TerminalWithCore)._core
      if (core?._renderService?._renderer?.dimensions?.actualCellHeight) {
        return core._renderService._renderer.dimensions.actualCellHeight
      }
    }

    // Fallback calculation
    if (this.container && this.terminal.rows > 0) {
      return this.container.clientHeight / this.terminal.rows
    }

    return 17 // Default fallback
  }

  /**
   * Registers a resize event handler.
   *
   * @param handler - Function to call on resize
   * @returns Function to unregister the handler
   *
   * @example
   * ```typescript
   * const unsubscribe = manager.onResize((dimensions) => {
   *   console.log(`Resized to ${dimensions.cols}x${dimensions.rows}`)
   * })
   * ```
   */
  onResize(handler: (dimensions: TerminalDimensions) => void): () => void {
    this.resizeHandlers.add(handler)
    return () => {
      this.resizeHandlers.delete(handler)
    }
  }

  /**
   * Notifies all resize handlers.
   *
   * @internal
   */
  private notifyResize(dimensions: TerminalDimensions): void {
    this.resizeHandlers.forEach((handler) => {
      try {
        handler(dimensions)
      } catch (error) {
        if (this.options.debug) {
          console.error('[ResizeManager] Handler error:', error)
        }
      }
    })
  }

  /**
   * Manually triggers a resize.
   *
   * @param cols - Number of columns
   * @param rows - Number of rows
   *
   * @example
   * ```typescript
   * manager.resize(80, 24)
   * ```
   */
  resize(cols: number, rows: number): void {
    if (!this.terminal) return

    const constrainedCols = this.constrainCols(cols)
    const constrainedRows = this.constrainRows(rows)

    this.terminal.resize(constrainedCols, constrainedRows)

    const dimensions = this.getCurrentDimensions()
    if (dimensions) {
      this.lastDimensions = dimensions
      this.notifyResize(dimensions)
    }
  }

  /**
   * Disposes the resize manager and cleans up resources.
   *
   * @example
   * ```typescript
   * manager.dispose()
   * ```
   */
  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }

    this.resizeHandlers.clear()
    this.terminal = null
    this.container = null
    this.fitAddon = null
    this.lastDimensions = null

    if (this.options.debug) {
      console.log('[ResizeManager] Disposed')
    }
  }

  /**
   * Gets the last recorded dimensions.
   *
   * @returns Last dimensions or null
   */
  getLastDimensions(): TerminalDimensions | null {
    return this.lastDimensions
  }

  /**
   * Updates resize options.
   *
   * @param options - Partial options to update
   *
   * @example
   * ```typescript
   * manager.updateOptions({
   *   debounceDelay: 200,
   *   maxCols: 150
   * })
   * ```
   */
  updateOptions(options: Partial<ResizeManagerOptions>): void {
    Object.assign(this.options, options)
  }
}
