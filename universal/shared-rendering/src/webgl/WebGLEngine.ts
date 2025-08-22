/**
 * @fileoverview Core WebGL rendering engine for shared use across terminal and Git UI.
 *
 * @description
 * Provides a high-performance WebGL rendering engine that can be shared between
 * the terminal system and Git UI components. Built on Three.js for robust WebGL
 * abstraction while maintaining direct access for performance-critical operations.
 *
 * @example
 * ```typescript
 * const engine = new WebGLEngine()
 * await engine.initialize({
 *   canvas: document.getElementById('canvas') as HTMLCanvasElement,
 *   antialias: true,
 *   alpha: false
 * })
 *
 * // Use for terminal rendering
 * const terminalRenderer = engine.createTerminalRenderer()
 *
 * // Use for Git graph rendering
 * const gitRenderer = engine.createGitRenderer()
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import * as THREE from 'three'
import type {
  BaseRenderer,
  WebGLContextInfo,
  WebGLRendererConfig,
  PerformanceConfig,
  PerformanceMetrics,
  RendererEvents,
  RendererEventListener,
  Color,
} from '../types'

/**
 * WebGL engine configuration with Three.js integration.
 *
 * @public
 */
export interface WebGLEngineConfig extends WebGLRendererConfig {
  /** Performance monitoring configuration */
  performance?: PerformanceConfig
  /** Enable debug mode */
  debug?: boolean
  /** Enable shadows */
  shadows?: boolean
  /** Shadow map type */
  shadowMapType?: THREE.ShadowMapType
  /** Tone mapping */
  toneMapping?: THREE.ToneMapping
  /** Enable automatic garbage collection */
  autoGC?: boolean
  /** GC interval in milliseconds */
  gcInterval?: number
}

/**
 * Core WebGL rendering engine built on Three.js.
 *
 * @remarks
 * This engine provides a shared foundation for both terminal and Git UI rendering,
 * leveraging Three.js for robust WebGL abstraction while maintaining performance
 * optimization capabilities. It includes automatic resource management,
 * performance monitoring, and context loss recovery.
 *
 * @public
 */
export class WebGLEngine implements BaseRenderer {
  private _renderer: THREE.WebGLRenderer | null = null
  private _scene: THREE.Scene | null = null
  private _camera: THREE.Camera | null = null
  private _canvas: HTMLCanvasElement | null = null
  private _isDisposed = false
  private _isInitialized = false

  // Performance monitoring
  private _performanceConfig: PerformanceConfig = {
    enabled: true,
    collectInterval: 1000,
    maxSamples: 60,
    enableMemoryMonitoring: true,
    enableFrameTimeTracking: true,
  }
  private _performanceMetrics: PerformanceMetrics = {
    fps: 0,
    frameTime: 0,
    drawCalls: 0,
    vertices: 0,
    triangles: 0,
    timestamp: Date.now(),
  }
  private _frameCount = 0
  private _lastFrameTime = performance.now()
  private _performanceInterval: NodeJS.Timeout | null = null

  // Event handling
  private _eventListeners = new Map<
    keyof RendererEvents,
    Set<RendererEventListener>
  >()

  // Resource management
  private _autoGC = true
  private _gcInterval = 30000 // 30 seconds
  private _gcTimer: NodeJS.Timeout | null = null

  /**
   * Initialize the WebGL engine.
   *
   * @param config - Engine configuration
   * @returns Promise that resolves when initialization is complete
   *
   * @throws Will throw if WebGL context creation fails
   *
   * @example
   * ```typescript
   * await engine.initialize({
   *   canvas: canvasElement,
   *   antialias: true,
   *   performance: { enabled: true }
   * })
   * ```
   *
   * @public
   */
  async initialize(config: WebGLEngineConfig): Promise<void> {
    if (this._isDisposed) {
      throw new Error('Cannot initialize disposed WebGL engine')
    }

    if (this._isInitialized) {
      throw new Error('WebGL engine already initialized')
    }

    this._canvas = config.canvas

    // Merge performance configuration
    if (config.performance) {
      this._performanceConfig = {
        ...this._performanceConfig,
        ...config.performance,
      }
    }

    // Initialize Three.js renderer
    this._renderer = new THREE.WebGLRenderer({
      canvas: config.canvas,
      antialias: config.antialias ?? true,
      alpha: config.alpha ?? false,
      depth: config.depth ?? true,
      stencil: config.stencil ?? false,
      preserveDrawingBuffer: config.preserveDrawingBuffer ?? false,
      failIfMajorPerformanceCaveat:
        config.failIfMajorPerformanceCaveat ?? false,
      powerPreference: config.powerPreference ?? 'high-performance',
    })

    // Configure renderer
    this._renderer.setPixelRatio(window.devicePixelRatio || 1)
    this._renderer.shadowMap.enabled = config.shadows ?? false
    this._renderer.shadowMap.type =
      config.shadowMapType ?? THREE.PCFSoftShadowMap
    this._renderer.toneMapping =
      config.toneMapping ?? THREE.ACESFilmicToneMapping
    this._renderer.toneMappingExposure = 1.0

    // Create default scene
    this._scene = new THREE.Scene()
    this._scene.background = new THREE.Color(0x000000)

    // Create default camera
    this._camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
    this._camera.position.set(0, 0, 5)

    // Setup context loss handling
    this.setupContextLossHandling()

    // Start performance monitoring
    if (this._performanceConfig.enabled) {
      this.startPerformanceMonitoring()
    }

    // Setup automatic garbage collection
    this._autoGC = config.autoGC ?? true
    if (this._autoGC) {
      const gcInterval = config.gcInterval ?? this._gcInterval
      this._gcTimer = setInterval(() => this.collectGarbage(), gcInterval)
    }

    this._isInitialized = true
  }

  /**
   * Resize the rendering context.
   *
   * @param width - New width in pixels
   * @param height - New height in pixels
   *
   * @example
   * ```typescript
   * window.addEventListener('resize', () => {
   *   engine.resize(window.innerWidth, window.innerHeight)
   * })
   * ```
   *
   * @public
   */
  resize(width: number, height: number): void {
    if (!this._renderer || !this._camera || this._isDisposed) return

    this._renderer.setSize(width, height, false)

    if (this._camera instanceof THREE.PerspectiveCamera) {
      this._camera.aspect = width / height
      this._camera.updateProjectionMatrix()
    } else if (this._camera instanceof THREE.OrthographicCamera) {
      const aspect = width / height
      this._camera.left = -aspect
      this._camera.right = aspect
      this._camera.updateProjectionMatrix()
    }

    this.emit('resize', { width, height })
  }

  /**
   * Clear the render target.
   *
   * @param color - Optional clear color (defaults to black)
   *
   * @public
   */
  clear(color?: Color): void {
    if (!this._renderer || this._isDisposed) return

    if (color) {
      this._renderer.setClearColor(
        new THREE.Color(color.r, color.g, color.b),
        color.a
      )
    }

    this._renderer.clear()
  }

  /**
   * Present the rendered frame.
   *
   * @remarks
   * This method should be called at the end of each frame to present the
   * rendered content. It also updates performance metrics if monitoring is enabled.
   *
   * @public
   */
  present(): void {
    if (!this._renderer || this._isDisposed) return

    // Update performance metrics
    if (this._performanceConfig.enableFrameTimeTracking) {
      this.updateFrameTimeMetrics()
    }

    // Note: Three.js WebGLRenderer automatically presents the frame
    // when render() is called, so no explicit present call is needed
  }

  /**
   * Render the scene with the given camera.
   *
   * @param scene - Scene to render (uses default if not provided)
   * @param camera - Camera to render with (uses default if not provided)
   *
   * @example
   * ```typescript
   * // Render with default scene and camera
   * engine.render()
   *
   * // Render with custom scene and camera
   * engine.render(customScene, customCamera)
   * ```
   *
   * @public
   */
  render(scene?: THREE.Scene, camera?: THREE.Camera): void {
    if (!this._renderer || this._isDisposed) return

    const renderScene = scene || this._scene
    const renderCamera = camera || this._camera

    if (!renderScene || !renderCamera) return

    this._renderer.render(renderScene, renderCamera)
    this.present()
  }

  /**
   * Create a new scene for rendering.
   *
   * @param backgroundColor - Optional background color
   * @returns New Three.js scene
   *
   * @public
   */
  createScene(backgroundColor?: Color): THREE.Scene {
    const scene = new THREE.Scene()

    if (backgroundColor) {
      scene.background = new THREE.Color(
        backgroundColor.r,
        backgroundColor.g,
        backgroundColor.b
      )
    }

    return scene
  }

  /**
   * Create a perspective camera.
   *
   * @param fov - Field of view in degrees
   * @param aspect - Aspect ratio
   * @param near - Near clipping plane
   * @param far - Far clipping plane
   * @returns New perspective camera
   *
   * @public
   */
  createPerspectiveCamera(
    fov = 75,
    aspect = 1,
    near = 0.1,
    far = 1000
  ): THREE.PerspectiveCamera {
    return new THREE.PerspectiveCamera(fov, aspect, near, far)
  }

  /**
   * Create an orthographic camera.
   *
   * @param left - Left boundary
   * @param right - Right boundary
   * @param top - Top boundary
   * @param bottom - Bottom boundary
   * @param near - Near clipping plane
   * @param far - Far clipping plane
   * @returns New orthographic camera
   *
   * @public
   */
  createOrthographicCamera(
    left = -1,
    right = 1,
    top = 1,
    bottom = -1,
    near = 0.1,
    far = 1000
  ): THREE.OrthographicCamera {
    return new THREE.OrthographicCamera(left, right, top, bottom, near, far)
  }

  /**
   * Get WebGL context information.
   *
   * @public
   */
  get contextInfo(): WebGLContextInfo {
    if (!this._renderer) {
      throw new Error('Renderer not initialized')
    }

    const gl = this._renderer.getContext()

    return {
      context: gl,
      isWebGL2: gl instanceof WebGL2RenderingContext,
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxTextures: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
      supportsFloatTextures: !!gl.getExtension('OES_texture_float'),
      supportsInstancing:
        gl instanceof WebGL2RenderingContext ||
        !!gl.getExtension('ANGLE_instanced_arrays'),
      vendor: gl.getParameter(gl.VENDOR) || 'Unknown',
      renderer: gl.getParameter(gl.RENDERER) || 'Unknown',
    }
  }

  /**
   * Get current performance metrics.
   *
   * @public
   */
  get performanceMetrics(): PerformanceMetrics {
    return { ...this._performanceMetrics }
  }

  /**
   * Get the canvas element.
   *
   * @public
   */
  get canvas(): HTMLCanvasElement {
    if (!this._canvas) {
      throw new Error('Canvas not available')
    }
    return this._canvas
  }

  /**
   * Get the Three.js renderer instance.
   *
   * @remarks
   * Provides direct access to the underlying Three.js renderer for advanced use cases.
   * Use with caution as direct manipulation can interfere with engine operation.
   *
   * @public
   */
  get threeRenderer(): THREE.WebGLRenderer | null {
    return this._renderer
  }

  /**
   * Get the default scene.
   *
   * @public
   */
  get defaultScene(): THREE.Scene | null {
    return this._scene
  }

  /**
   * Get the default camera.
   *
   * @public
   */
  get defaultCamera(): THREE.Camera | null {
    return this._camera
  }

  /**
   * Add event listener.
   *
   * @param type - Event type
   * @param listener - Event listener function
   *
   * @public
   */
  addEventListener<K extends keyof RendererEvents>(
    type: K,
    listener: RendererEventListener<RendererEvents[K]>
  ): void {
    if (!this._eventListeners.has(type)) {
      this._eventListeners.set(type, new Set())
    }
    this._eventListeners.get(type)!.add(listener as RendererEventListener)
  }

  /**
   * Remove event listener.
   *
   * @param type - Event type
   * @param listener - Event listener function
   *
   * @public
   */
  removeEventListener<K extends keyof RendererEvents>(
    type: K,
    listener: RendererEventListener<RendererEvents[K]>
  ): void {
    const listeners = this._eventListeners.get(type)
    if (listeners) {
      listeners.delete(listener as RendererEventListener)
    }
  }

  /**
   * Setup WebGL context loss handling.
   *
   * @private
   */
  private setupContextLossHandling(): void {
    if (!this._canvas) return

    this._canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault()
      this.emit('context-lost')
    })

    this._canvas.addEventListener('webglcontextrestored', () => {
      this.emit('context-restored')
    })
  }

  /**
   * Start performance monitoring.
   *
   * @private
   */
  private startPerformanceMonitoring(): void {
    if (this._performanceInterval) return

    this._performanceInterval = setInterval(() => {
      this.updatePerformanceMetrics()
    }, this._performanceConfig.collectInterval)
  }

  /**
   * Update frame time metrics.
   *
   * @private
   */
  private updateFrameTimeMetrics(): void {
    const now = performance.now()
    const frameTime = now - this._lastFrameTime
    this._lastFrameTime = now
    this._frameCount++

    // Update frame time with exponential moving average
    this._performanceMetrics.frameTime =
      this._performanceMetrics.frameTime * 0.9 + frameTime * 0.1
  }

  /**
   * Update performance metrics.
   *
   * @private
   */
  private updatePerformanceMetrics(): void {
    if (!this._renderer) return

    const info = this._renderer.info

    this._performanceMetrics.fps = this._frameCount
    this._performanceMetrics.drawCalls = info.render.calls
    this._performanceMetrics.vertices = info.render.triangles * 3
    this._performanceMetrics.triangles = info.render.triangles
    this._performanceMetrics.timestamp = Date.now()

    // Check for performance issues
    if (this._performanceMetrics.fps < 30) {
      this.emit('performance-warning', {
        message: 'Low FPS detected',
        metrics: this._performanceMetrics,
      })
    }

    // Reset frame count
    this._frameCount = 0
  }

  /**
   * Collect garbage to free unused resources.
   *
   * @private
   */
  private collectGarbage(): void {
    if (!this._renderer) return

    // Force Three.js to cleanup unused resources
    this._renderer.info.programs?.forEach((program) => {
      if (program.usedTimes === 0) {
        this._renderer?.dispose()
      }
    })
  }

  /**
   * Emit an event to all listeners.
   *
   * @param type - Event type
   * @param data - Event data
   *
   * @private
   */
  private emit<K extends keyof RendererEvents>(
    type: K,
    data?: RendererEvents[K]
  ): void {
    const listeners = this._eventListeners.get(type)
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(data as RendererEvents[K])
        } catch (error) {
          console.error(`Error in ${type} event listener:`, error)
        }
      })
    }
  }

  /**
   * Whether the engine has been disposed.
   *
   * @public
   */
  get isDisposed(): boolean {
    return this._isDisposed
  }

  /**
   * Dispose the engine and free all resources.
   *
   * @public
   */
  dispose(): void {
    if (this._isDisposed) return

    // Stop performance monitoring
    if (this._performanceInterval) {
      clearInterval(this._performanceInterval)
      this._performanceInterval = null
    }

    // Stop garbage collection
    if (this._gcTimer) {
      clearTimeout(this._gcTimer)
      this._gcTimer = null
    }

    // Dispose Three.js resources
    if (this._renderer) {
      this._renderer.dispose()
      this._renderer = null
    }

    if (this._scene) {
      // Dispose scene resources recursively
      this._scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose())
          } else {
            object.material.dispose()
          }
        }
      })
      this._scene = null
    }

    this._camera = null
    this._canvas = null

    // Clear event listeners
    this._eventListeners.clear()

    this._isDisposed = true
  }
}
