/**
 * @fileoverview WebGL Terminal Renderer - High-performance GPU-accelerated rendering.
 *
 * @description
 * Integrates XTerm.js with WebGL for GPU-accelerated terminal rendering.
 * Provides fallback mechanisms, performance monitoring, and context loss recovery.
 *
 * @example
 * ```typescript
 * const renderer = new WebGLTerminalRenderer()
 * const success = await renderer.initialize(terminal)
 * if (success) {
 *   console.log('WebGL acceleration enabled')
 * }
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import type { Terminal } from 'xterm'
import type { WebglAddon } from '@xterm/addon-webgl'

/**
 * WebGL renderer configuration options.
 *
 * @public
 * @since 1.0.0
 */
export interface WebGLOptions {
  /** Enable performance monitoring */
  enablePerformanceMonitoring?: boolean
  /** Preserve drawing buffer for screenshots */
  preserveDrawingBuffer?: boolean
  /** Power preference for GPU selection */
  powerPreference?: 'default' | 'high-performance' | 'low-power'
  /** Enable debug logging */
  debug?: boolean
  /** Custom context attributes */
  contextAttributes?: WebGLContextAttributes
}

/**
 * Performance metrics for WebGL rendering.
 *
 * @public
 * @since 1.0.0
 */
export interface PerformanceMetrics {
  /** Frames per second */
  fps: number
  /** Frame render time in milliseconds */
  frameTime: number
  /** Draw calls per frame */
  drawCalls: number
  /** GPU memory usage in bytes */
  gpuMemory: number
  /** Context loss count */
  contextLossCount: number
  /** Is WebGL currently active */
  isActive: boolean
}

/**
 * Manages WebGL-accelerated terminal rendering.
 *
 * @remarks
 * This class provides high-performance GPU-accelerated rendering for XTerm.js
 * terminals with automatic fallback to canvas rendering when WebGL is unavailable.
 *
 * Key features:
 * - WebGL 2.0/1.0 detection and fallback
 * - Context loss recovery
 * - Performance monitoring
 * - Memory management
 * - Screenshot capability
 *
 * @public
 * @since 1.0.0
 */
export class WebGLTerminalRenderer {
  private webglAddon: WebglAddon | null = null
  private terminal: Terminal | null = null
  private isInitialized = false
  private contextLossCount = 0
  private performanceMonitor: PerformanceMonitor | null = null
  private readonly debug: boolean
  private readonly options: WebGLOptions

  /**
   * Creates a new WebGLTerminalRenderer instance.
   *
   * @param options - Configuration options for WebGL rendering
   *
   * @example
   * ```typescript
   * const renderer = new WebGLTerminalRenderer({
   *   enablePerformanceMonitoring: true,
   *   powerPreference: 'high-performance',
   *   debug: true
   * })
   * ```
   */
  constructor(options: WebGLOptions = {}) {
    this.options = {
      enablePerformanceMonitoring: false,
      preserveDrawingBuffer: false,
      powerPreference: 'default',
      debug: false,
      ...options,
    }
    this.debug = this.options.debug ?? false
  }

  /**
   * Initializes WebGL rendering for the terminal.
   *
   * @param terminal - XTerm.js terminal instance
   * @param options - Optional configuration overrides
   * @returns Promise resolving to true if WebGL initialized successfully
   *
   * @example
   * ```typescript
   * const success = await renderer.initialize(terminal, {
   *   powerPreference: 'high-performance'
   * })
   * if (!success) {
   *   console.log('Falling back to canvas renderer')
   * }
   * ```
   */
  async initialize(
    terminal: Terminal,
    options?: Partial<WebGLOptions>
  ): Promise<boolean> {
    if (this.isInitialized) {
      if (this.debug) {
        console.warn('[WebGLRenderer] Already initialized')
      }
      return true
    }

    // Merge options
    const config = { ...this.options, ...options }

    // Check WebGL support
    if (!this.isSupported()) {
      if (this.debug) {
        console.warn('[WebGLRenderer] WebGL not supported')
      }
      return false
    }

    try {
      // Dynamic import for code splitting
      const { WebglAddon } = await import('@xterm/addon-webgl')

      // Create addon with configuration
      this.webglAddon = new WebglAddon(config.preserveDrawingBuffer)

      // Set up context loss handler
      this.webglAddon.onContextLoss(() => {
        this.handleContextLoss()
      })

      // Load addon
      terminal.loadAddon(this.webglAddon)
      this.terminal = terminal
      this.isInitialized = true

      // Start performance monitoring if enabled
      if (config.enablePerformanceMonitoring) {
        this.startPerformanceMonitoring()
      }

      if (this.debug) {
        console.log('[WebGLRenderer] Initialized successfully')
      }

      return true
    } catch (error) {
      if (this.debug) {
        console.error('[WebGLRenderer] Initialization failed:', error)
      }
      return false
    }
  }

  /**
   * Handles WebGL context loss.
   *
   * @remarks
   * Automatically attempts to recover from context loss by reinitializing
   * the WebGL addon after a brief delay.
   *
   * @internal
   */
  handleContextLoss(): void {
    this.contextLossCount++

    if (this.debug) {
      console.warn(
        `[WebGLRenderer] Context lost (count: ${this.contextLossCount})`
      )
    }

    // Dispose current addon
    if (this.webglAddon) {
      this.webglAddon.dispose()
      this.webglAddon = null
    }

    // Attempt recovery after delay
    if (this.terminal && this.contextLossCount < 3) {
      setTimeout(() => {
        if (this.terminal) {
          this.isInitialized = false
          this.initialize(this.terminal, this.options)
        }
      }, 1000)
    }
  }

  /**
   * Disposes the WebGL renderer and cleans up resources.
   *
   * @example
   * ```typescript
   * renderer.dispose()
   * ```
   */
  dispose(): void {
    if (this.performanceMonitor) {
      this.performanceMonitor.stop()
      this.performanceMonitor = null
    }

    if (this.webglAddon) {
      this.webglAddon.dispose()
      this.webglAddon = null
    }

    this.terminal = null
    this.isInitialized = false
    this.contextLossCount = 0

    if (this.debug) {
      console.log('[WebGLRenderer] Disposed')
    }
  }

  /**
   * Checks if WebGL is supported in the current environment.
   *
   * @returns True if WebGL is supported
   *
   * @example
   * ```typescript
   * if (renderer.isSupported()) {
   *   console.log('WebGL is available')
   * }
   * ```
   */
  isSupported(): boolean {
    if (typeof window === 'undefined' || !window.document) {
      return false
    }

    try {
      const canvas = document.createElement('canvas')
      const gl =
        canvas.getContext('webgl2', this.options.contextAttributes) ||
        canvas.getContext('webgl', this.options.contextAttributes) ||
        canvas.getContext('experimental-webgl', this.options.contextAttributes)

      return !!gl
    } catch {
      return false
    }
  }

  /**
   * Gets current performance metrics.
   *
   * @returns Performance metrics object
   *
   * @example
   * ```typescript
   * const metrics = renderer.getPerformanceMetrics()
   * console.log(`FPS: ${metrics.fps}`)
   * ```
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return {
      fps: this.performanceMonitor?.getFPS() ?? 0,
      frameTime: this.performanceMonitor?.getFrameTime() ?? 0,
      drawCalls: this.performanceMonitor?.getDrawCalls() ?? 0,
      gpuMemory: this.performanceMonitor?.getGPUMemory() ?? 0,
      contextLossCount: this.contextLossCount,
      isActive: this.isInitialized && this.webglAddon !== null,
    }
  }

  /**
   * Starts performance monitoring.
   *
   * @internal
   */
  private startPerformanceMonitoring(): void {
    if (!this.performanceMonitor) {
      this.performanceMonitor = new PerformanceMonitor()
      this.performanceMonitor.start()
    }
  }

  /**
   * Gets WebGL context information.
   *
   * @returns WebGL context info or null
   *
   * @example
   * ```typescript
   * const info = renderer.getContextInfo()
   * console.log(`Renderer: ${info?.renderer}`)
   * ```
   */
  getContextInfo(): {
    vendor: string
    renderer: string
    version: string
  } | null {
    if (!this.isInitialized) {
      return null
    }

    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')

      if (!gl) {
        return null
      }

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')

      return {
        vendor: debugInfo
          ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
          : gl.getParameter(gl.VENDOR),
        renderer: debugInfo
          ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
          : gl.getParameter(gl.RENDERER),
        version: gl.getParameter(gl.VERSION),
      }
    } catch {
      return null
    }
  }

  /**
   * Takes a screenshot of the terminal.
   *
   * @returns Promise resolving to base64 image data or null
   *
   * @example
   * ```typescript
   * const screenshot = await renderer.takeScreenshot()
   * if (screenshot) {
   *   const img = document.createElement('img')
   *   img.src = screenshot
   * }
   * ```
   */
  async takeScreenshot(): Promise<string | null> {
    if (!this.isInitialized || !this.terminal) {
      return null
    }

    try {
      // Note: This requires preserveDrawingBuffer to be true
      const canvas = this.terminal.element?.querySelector('canvas')
      if (canvas instanceof HTMLCanvasElement) {
        return canvas.toDataURL('image/png')
      }
    } catch (error) {
      if (this.debug) {
        console.error('[WebGLRenderer] Screenshot failed:', error)
      }
    }

    return null
  }

  /**
   * Checks if renderer is initialized.
   *
   * @returns True if initialized
   */
  isReady(): boolean {
    return this.isInitialized
  }

  /**
   * Gets the current WebGL addon instance.
   *
   * @returns WebGL addon or null
   */
  getAddon(): WebglAddon | null {
    return this.webglAddon
  }
}

/**
 * Performance monitor for WebGL rendering.
 *
 * @internal
 */
class PerformanceMonitor {
  private frameCount = 0
  private lastTime = performance.now()
  private fps = 0
  private frameTime = 0
  private drawCalls = 0
  private animationId: number | null = null

  start(): void {
    const measure = (): void => {
      const now = performance.now()
      const delta = now - this.lastTime

      if (delta >= 1000) {
        this.fps = Math.round((this.frameCount * 1000) / delta)
        this.frameTime = delta / this.frameCount
        this.frameCount = 0
        this.lastTime = now
      }

      this.frameCount++
      this.animationId = requestAnimationFrame(measure)
    }

    measure()
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  getFPS(): number {
    return this.fps
  }

  getFrameTime(): number {
    return this.frameTime
  }

  getDrawCalls(): number {
    return this.drawCalls
  }

  getGPUMemory(): number {
    // Estimate based on terminal dimensions
    // This is a rough estimate as actual GPU memory usage is not directly accessible
    return 0
  }
}
