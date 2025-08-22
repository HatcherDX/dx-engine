/**
 * @fileoverview WebGL adapter for terminal rendering integration.
 *
 * @description
 * Provides an adapter layer between the terminal system and the shared WebGL
 * rendering engine. This allows gradual migration from xterm.js to WebGL
 * rendering while maintaining API compatibility.
 *
 * @example
 * ```typescript
 * const adapter = new WebGLTerminalAdapter()
 * await adapter.initialize({
 *   canvas: terminalCanvas,
 *   terminalConfig: config
 * })
 * adapter.render(terminalData)
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import type { WebGLEngine, TerminalRenderer } from '@hatcherdx/shared-rendering'
import type { TerminalConfig } from '../types/terminal'

/**
 * Simple terminal theme interface.
 *
 * @public
 */
export interface TerminalTheme {
  /** Background color */
  background?: string
  /** Foreground color */
  foreground?: string
  /** Cursor color */
  cursor?: string
  /** Selection background color */
  selectionBackground?: string
}

/**
 * Configuration for WebGL terminal adapter.
 *
 * @public
 */
export interface WebGLTerminalConfig {
  /** Canvas element for WebGL rendering */
  canvas: HTMLCanvasElement
  /** Terminal configuration */
  terminalConfig: TerminalConfig
  /** Initial theme */
  theme?: TerminalTheme
}

/**
 * Terminal data for WebGL rendering.
 *
 * @public
 */
export interface TerminalRenderData {
  /** Terminal text content */
  content: string[]
  /** Cursor position */
  cursor: { row: number; col: number }
  /** Selection ranges */
  selection?: {
    start: { row: number; col: number }
    end: { row: number; col: number }
  }[]
}

/**
 * WebGL adapter for terminal rendering.
 *
 * @remarks
 * This adapter provides compatibility between the existing terminal system
 * and the new shared WebGL rendering engine. It allows gradual migration
 * while maintaining performance and feature compatibility.
 *
 * @public
 */
export class WebGLTerminalAdapter {
  private _engine: WebGLEngine | null = null
  private _renderer: TerminalRenderer | null = null
  private _isInitialized = false

  /**
   * Whether the adapter has been initialized.
   *
   * @public
   */
  get isInitialized(): boolean {
    return this._isInitialized
  }

  /**
   * Current WebGL engine instance.
   *
   * @public
   */
  get engine(): WebGLEngine | null {
    return this._engine
  }

  /**
   * Initialize the WebGL terminal adapter.
   *
   * @param config - Adapter configuration
   *
   * @throws {Error} When WebGL initialization fails
   *
   * @example
   * ```typescript
   * const adapter = new WebGLTerminalAdapter()
   * await adapter.initialize({
   *   canvas: document.getElementById('terminal-canvas'),
   *   terminalConfig: { rows: 24, cols: 80 }
   * })
   * ```
   *
   * @public
   */
  async initialize(config: WebGLTerminalConfig): Promise<void> {
    if (this._isInitialized) {
      throw new Error('WebGL terminal adapter already initialized')
    }

    try {
      // Dynamic import to avoid bundling issues
      const { WebGLEngine, TerminalRenderer } = await import(
        '@hatcherdx/shared-rendering'
      )

      // Initialize WebGL engine
      this._engine = new WebGLEngine()
      await this._engine.initialize({
        canvas: config.canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      })

      // Initialize terminal renderer
      this._renderer = new TerminalRenderer(this._engine)
      await this._renderer.initialize({
        rows: config.terminalConfig.rows || 24,
        cols: config.terminalConfig.cols || 80,
        fontSize: 12,
        fontFamily: 'SF Mono, Monaco, Inconsolata, Roboto Mono, monospace',
        backgroundColor: config.theme?.background
          ? { r: 0, g: 0, b: 0, a: 1 }
          : undefined,
        textColor: config.theme?.foreground
          ? { r: 1, g: 1, b: 1, a: 1 }
          : undefined,
        cursorColor: config.theme?.cursor
          ? { r: 1, g: 1, b: 1, a: 1 }
          : undefined,
      })

      this._isInitialized = true
    } catch (error) {
      throw new Error(`Failed to initialize WebGL terminal adapter: ${error}`)
    }
  }

  /**
   * Render terminal data using WebGL.
   *
   * @param data - Terminal render data
   *
   * @example
   * ```typescript
   * adapter.render({
   *   content: ['$ ls', 'file1.txt file2.txt'],
   *   cursor: { row: 1, col: 17 }
   * })
   * ```
   *
   * @public
   */
  render(data: TerminalRenderData): void {
    if (!this._isInitialized || !this._renderer) {
      throw new Error('WebGL terminal adapter not initialized')
    }

    // Render cursor position
    this._renderer.renderCursor({
      row: data.cursor.row,
      col: data.cursor.col,
      visible: true,
      blinking: true,
    })

    // Render selection if provided
    if (data.selection && data.selection.length > 0) {
      const selection = data.selection[0] // Use first selection for now
      this._renderer.renderSelection({
        startRow: selection.start.row,
        startCol: selection.start.col,
        endRow: selection.end.row,
        endCol: selection.end.col,
      })
    } else {
      this._renderer.renderSelection(null)
    }

    // TODO: Update individual cells from content lines
    // This would require parsing the content strings into TerminalCell objects
  }

  /**
   * Update terminal theme.
   *
   * @param theme - New theme configuration
   *
   * @public
   */
  updateTheme(theme: TerminalTheme): void {
    if (!this._isInitialized || !this._renderer) return

    // TODO: Implement theme updates
    // The current TerminalRenderer doesn't have updateTheme method
    // This would require re-initializing with new theme colors
    console.log('Theme update requested:', theme)
  }

  /**
   * Resize the terminal renderer.
   *
   * @param width - New width in pixels
   * @param height - New height in pixels
   *
   * @public
   */
  resize(width: number, height: number): void {
    if (!this._isInitialized || !this._engine) return

    this._engine.resize(width, height)
  }

  /**
   * Clean up WebGL resources.
   *
   * @public
   */
  dispose(): void {
    this._renderer?.dispose()
    this._engine?.dispose()
    this._renderer = null
    this._engine = null
    this._isInitialized = false
  }
}
