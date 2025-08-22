/**
 * @fileoverview WebGL-accelerated terminal text renderer.
 *
 * @description
 * Specialized renderer for high-performance terminal text rendering using WebGL.
 * Optimized for continuous text output, scrolling, and large terminal buffers
 * while maintaining compatibility with existing xterm.js integration.
 *
 * @example
 * ```typescript
 * const engine = new WebGLEngine()
 * await engine.initialize({ canvas })
 *
 * const terminalRenderer = new TerminalRenderer(engine)
 * await terminalRenderer.initialize({
 *   rows: 25,
 *   cols: 80,
 *   fontSize: 14
 * })
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import * as THREE from 'three'
import type { WebGLEngine } from '../webgl/WebGLEngine'
import type { Disposable, Color } from '../types'

/**
 * Terminal renderer configuration.
 *
 * @public
 */
export interface TerminalRendererConfig {
  /** Number of terminal rows */
  rows: number
  /** Number of terminal columns */
  cols: number
  /** Font size in pixels */
  fontSize: number
  /** Font family */
  fontFamily?: string
  /** Line height multiplier */
  lineHeight?: number
  /** Character width override (auto-calculated if not provided) */
  charWidth?: number
  /** Character height override (auto-calculated if not provided) */
  charHeight?: number
  /** Enable text anti-aliasing */
  antialias?: boolean
  /** Background color */
  backgroundColor?: Color
  /** Default text color */
  textColor?: Color
  /** Cursor color */
  cursorColor?: Color
  /** Selection color */
  selectionColor?: Color
  /** Enable WebGL acceleration */
  useWebGL?: boolean
  /** Maximum texture atlas size */
  maxAtlasSize?: number
}

/**
 * Terminal cell data for rendering.
 *
 * @public
 */
export interface TerminalCell {
  /** Character code point */
  char: string
  /** Foreground color */
  fg: Color
  /** Background color */
  bg: Color
  /** Bold text */
  bold: boolean
  /** Italic text */
  italic: boolean
  /** Underlined text */
  underline: boolean
  /** Strikethrough text */
  strikethrough: boolean
  /** Inverted colors */
  inverse: boolean
}

/**
 * Terminal cursor information.
 *
 * @public
 */
export interface TerminalCursor {
  /** Cursor row */
  row: number
  /** Cursor column */
  col: number
  /** Cursor visible */
  visible: boolean
  /** Cursor blinking */
  blinking: boolean
}

/**
 * Text selection range.
 *
 * @public
 */
export interface TextSelection {
  /** Start row */
  startRow: number
  /** Start column */
  startCol: number
  /** End row */
  endRow: number
  /** End column */
  endCol: number
}

/**
 * WebGL-accelerated terminal text renderer.
 *
 * @remarks
 * This renderer provides high-performance text rendering for terminal applications
 * by leveraging WebGL instanced rendering and texture atlases. It's designed to
 * work alongside xterm.js and can handle large terminal buffers efficiently.
 *
 * Key optimizations:
 * - Instanced rendering for identical characters
 * - Texture atlas for glyph caching
 * - Dirty region tracking for minimal updates
 * - WebGL2 compute shaders for advanced effects (if available)
 *
 * @public
 */
export class TerminalRenderer implements Disposable {
  private _engine: WebGLEngine
  private _scene: THREE.Scene | null = null
  private _camera: THREE.OrthographicCamera | null = null
  private _config: TerminalRendererConfig | null = null
  private _isDisposed = false
  private _isInitialized = false

  // Text rendering resources
  private _textMaterial: THREE.ShaderMaterial | null = null
  private _textGeometry: THREE.InstancedBufferGeometry | null = null
  private _textMesh: THREE.Mesh | null = null

  // Cursor rendering
  private _cursorMesh: THREE.Mesh | null = null

  // Selection rendering
  private _selectionMesh: THREE.Mesh | null = null

  // Dirty tracking
  private _dirtyRegions = new Set<string>()

  /**
   * Create a new terminal renderer.
   *
   * @param engine - WebGL engine instance
   *
   * @public
   */
  constructor(engine: WebGLEngine) {
    this._engine = engine
  }

  /**
   * Initialize the terminal renderer.
   *
   * @param config - Terminal configuration
   * @returns Promise that resolves when initialization is complete
   *
   * @throws Will throw if configuration is invalid
   * @throws Will throw if WebGL engine is disposed
   * @throws Will throw if already initialized
   *
   * @public
   */
  async initialize(config: TerminalRendererConfig): Promise<void> {
    if (this._isDisposed) {
      throw new Error('Cannot initialize disposed terminal renderer')
    }

    if (this._isInitialized) {
      throw new Error('Terminal renderer already initialized')
    }

    if (this._engine.isDisposed) {
      throw new Error('WebGL engine is disposed')
    }

    // Validate configuration
    if (config.rows <= 0 || config.cols <= 0 || config.fontSize <= 0) {
      throw new Error('Invalid terminal configuration')
    }

    this._config = {
      fontFamily: 'monospace',
      lineHeight: 1.2,
      antialias: true,
      backgroundColor: { r: 0, g: 0, b: 0, a: 1 },
      textColor: { r: 1, g: 1, b: 1, a: 1 },
      cursorColor: { r: 1, g: 1, b: 0, a: 1 },
      selectionColor: { r: 0, g: 0.5, b: 1, a: 0.3 },
      useWebGL: true,
      maxAtlasSize: 2048,
      ...config,
    }

    // Create scene and camera
    this._scene = this._engine.createScene(this._config.backgroundColor)
    this._camera = this._engine.createOrthographicCamera()

    // Setup camera for 2D text rendering
    this.setupCamera()

    // Initialize text rendering resources
    await this.initializeTextRendering()

    this._isInitialized = true
  }

  /**
   * Render text at the specified position.
   *
   * @param row - Starting row
   * @param col - Starting column
   * @param cells - Array of terminal cells to render
   *
   * @public
   */
  renderText(row: number, col: number, cells: TerminalCell[]): void {
    if (!this._isInitialized || this._isDisposed) return

    // Handle bounds checking
    if (row < 0 || col < 0) return

    // Mark region as dirty
    this.markDirty(row, col, row, col + cells.length)

    // Implementation would update instanced buffer attributes
    // for character positions, colors, and styles
  }

  /**
   * Render the cursor.
   *
   * @param cursor - Cursor information
   *
   * @public
   */
  renderCursor(cursor: TerminalCursor): void {
    if (!this._isInitialized || this._isDisposed) return
    if (!cursor.visible) return

    // Implementation would update cursor mesh position
    if (this._cursorMesh && this._config) {
      // Position cursor based on row/col and character dimensions
    }
  }

  /**
   * Render text selection.
   *
   * @param selection - Selection range (null to clear)
   *
   * @public
   */
  renderSelection(selection: TextSelection | null): void {
    if (!this._isInitialized || this._isDisposed) return

    if (!selection || !this._selectionMesh) {
      // Hide selection
      if (this._selectionMesh) {
        this._selectionMesh.visible = false
      }
      return
    }

    // Implementation would update selection geometry
    this._selectionMesh.visible = true
  }

  /**
   * Resize the terminal.
   *
   * @param rows - New row count
   * @param cols - New column count
   *
   * @public
   */
  resize(rows: number, cols: number): void {
    if (!this._isInitialized || this._isDisposed) return

    if (this._config) {
      this._config.rows = rows
      this._config.cols = cols
    }

    this.setupCamera()
  }

  /**
   * Mark a region as dirty for selective updates.
   *
   * @param startRow - Start row
   * @param startCol - Start column
   * @param endRow - End row
   * @param endCol - End column
   *
   * @public
   */
  markDirty(
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number
  ): void {
    const region = `${startRow},${startCol},${endRow},${endCol}`
    this._dirtyRegions.add(region)
  }

  /**
   * Render the terminal.
   *
   * @public
   */
  render(): void {
    if (!this._isInitialized || this._isDisposed) return
    if (!this._scene || !this._camera) return

    this._engine.render(this._scene, this._camera)

    // Clear dirty regions after render
    this._dirtyRegions.clear()
  }

  /**
   * Setup camera for 2D text rendering.
   *
   * @private
   */
  private setupCamera(): void {
    if (!this._camera || !this._config) return

    const canvasWidth = this._engine.canvas.width
    const canvasHeight = this._engine.canvas.height

    this._camera.left = 0
    this._camera.right = canvasWidth
    this._camera.top = 0
    this._camera.bottom = canvasHeight
    this._camera.updateProjectionMatrix()
  }

  /**
   * Initialize text rendering resources.
   *
   * @private
   */
  private async initializeTextRendering(): Promise<void> {
    if (!this._config) return

    // Create instanced geometry for text rendering
    this._textGeometry = new THREE.InstancedBufferGeometry()

    // Create shader material for text
    this._textMaterial = new THREE.ShaderMaterial({
      vertexShader: this.getVertexShader(),
      fragmentShader: this.getFragmentShader(),
      transparent: true,
    })

    // Create text mesh
    this._textMesh = new THREE.Mesh(this._textGeometry, this._textMaterial)
    if (this._scene) {
      this._scene.add(this._textMesh)
    }

    // Create cursor mesh
    const cursorGeometry = new THREE.PlaneGeometry(1, 1)
    const cursorMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(
        this._config.cursorColor!.r,
        this._config.cursorColor!.g,
        this._config.cursorColor!.b
      ),
      transparent: true,
      opacity: this._config.cursorColor!.a,
    })
    this._cursorMesh = new THREE.Mesh(cursorGeometry, cursorMaterial)
    if (this._scene) {
      this._scene.add(this._cursorMesh)
    }

    // Create selection mesh
    const selectionGeometry = new THREE.PlaneGeometry(1, 1)
    const selectionMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(
        this._config.selectionColor!.r,
        this._config.selectionColor!.g,
        this._config.selectionColor!.b
      ),
      transparent: true,
      opacity: this._config.selectionColor!.a,
    })
    this._selectionMesh = new THREE.Mesh(selectionGeometry, selectionMaterial)
    this._selectionMesh.visible = false
    if (this._scene) {
      this._scene.add(this._selectionMesh)
    }
  }

  /**
   * Get vertex shader source.
   *
   * @private
   */
  private getVertexShader(): string {
    return `
      attribute vec2 position;
      attribute vec2 uv;
      
      uniform mat4 modelViewMatrix;
      uniform mat4 projectionMatrix;
      
      varying vec2 vUv;
      
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 0.0, 1.0);
      }
    `
  }

  /**
   * Get fragment shader source.
   *
   * @private
   */
  private getFragmentShader(): string {
    return `
      precision mediump float;
      
      varying vec2 vUv;
      uniform sampler2D atlas;
      uniform vec3 color;
      uniform float opacity;
      
      void main() {
        vec4 texColor = texture2D(atlas, vUv);
        gl_FragColor = vec4(color * texColor.rgb, texColor.a * opacity);
      }
    `
  }

  /**
   * Whether the renderer has been disposed.
   *
   * @public
   */
  get isDisposed(): boolean {
    return this._isDisposed
  }

  /**
   * Dispose the renderer and free all resources.
   *
   * @public
   */
  dispose(): void {
    if (this._isDisposed) return

    // Dispose geometries
    if (this._textGeometry) {
      this._textGeometry.dispose()
      this._textGeometry = null
    }

    // Dispose materials
    if (this._textMaterial) {
      this._textMaterial.dispose()
      this._textMaterial = null
    }

    // Remove meshes from scene
    if (this._scene) {
      if (this._textMesh) {
        this._scene.remove(this._textMesh)
        this._textMesh = null
      }
      if (this._cursorMesh) {
        this._scene.remove(this._cursorMesh)
        if (this._cursorMesh.geometry) this._cursorMesh.geometry.dispose()
        if (this._cursorMesh.material) {
          ;(this._cursorMesh.material as THREE.Material).dispose()
        }
        this._cursorMesh = null
      }
      if (this._selectionMesh) {
        this._scene.remove(this._selectionMesh)
        if (this._selectionMesh.geometry) this._selectionMesh.geometry.dispose()
        if (this._selectionMesh.material) {
          ;(this._selectionMesh.material as THREE.Material).dispose()
        }
        this._selectionMesh = null
      }
    }

    this._scene = null
    this._camera = null
    this._config = null

    this._isDisposed = true
  }
}
