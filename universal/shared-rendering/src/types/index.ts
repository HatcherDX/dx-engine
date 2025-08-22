/**
 * @fileoverview Core types for shared rendering engine.
 *
 * @description
 * Defines the fundamental types and interfaces used across the shared rendering
 * system. This includes WebGL context management, renderer configurations,
 * performance monitoring, and common rendering primitives.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

/**
 * WebGL context information and capabilities.
 *
 * @public
 */
export interface WebGLContextInfo {
  /** The WebGL rendering context */
  context: WebGLRenderingContext | WebGL2RenderingContext
  /** Whether WebGL2 is available and being used */
  isWebGL2: boolean
  /** Maximum texture size supported */
  maxTextureSize: number
  /** Maximum number of textures that can be used simultaneously */
  maxTextures: number
  /** Whether floating point textures are supported */
  supportsFloatTextures: boolean
  /** Whether instanced rendering is supported */
  supportsInstancing: boolean
  /** Renderer vendor information */
  vendor: string
  /** Renderer information */
  renderer: string
}

/**
 * Configuration for WebGL renderer initialization.
 *
 * @public
 */
export interface WebGLRendererConfig {
  /** Target canvas element */
  canvas: HTMLCanvasElement
  /** Enable antialiasing */
  antialias?: boolean
  /** Enable alpha blending */
  alpha?: boolean
  /** Enable depth testing */
  depth?: boolean
  /** Enable stencil buffer */
  stencil?: boolean
  /** Preserve drawing buffer */
  preserveDrawingBuffer?: boolean
  /** Fail if WebGL context creation fails */
  failIfMajorPerformanceCaveat?: boolean
  /** Power preference for GPU selection */
  powerPreference?: 'default' | 'high-performance' | 'low-power'
}

/**
 * Performance monitoring configuration.
 *
 * @public
 */
export interface PerformanceConfig {
  /** Enable performance monitoring */
  enabled: boolean
  /** Interval for collecting metrics (ms) */
  collectInterval: number
  /** Maximum number of samples to keep */
  maxSamples: number
  /** Enable memory monitoring */
  enableMemoryMonitoring: boolean
  /** Enable frame time tracking */
  enableFrameTimeTracking: boolean
}

/**
 * Performance metrics data.
 *
 * @public
 */
export interface PerformanceMetrics {
  /** Current frames per second */
  fps: number
  /** Average frame time in milliseconds */
  frameTime: number
  /** GPU memory usage (if available) */
  gpuMemoryUsage?: number
  /** Number of draw calls in last frame */
  drawCalls: number
  /** Number of vertices rendered in last frame */
  vertices: number
  /** Number of triangles rendered in last frame */
  triangles: number
  /** Timestamp of metrics collection */
  timestamp: number
}

/**
 * Render target configuration.
 *
 * @public
 */
export interface RenderTargetConfig {
  /** Width in pixels */
  width: number
  /** Height in pixels */
  height: number
  /** Enable multisampling */
  multisampling?: boolean
  /** Number of samples for multisampling */
  samples?: number
  /** Enable floating point precision */
  floatingPoint?: boolean
  /** Enable depth attachment */
  depth?: boolean
  /** Enable stencil attachment */
  stencil?: boolean
}

/**
 * Camera configuration for 3D rendering.
 *
 * @public
 */
export interface CameraConfig {
  /** Camera type */
  type: 'perspective' | 'orthographic'
  /** Field of view for perspective camera (degrees) */
  fov?: number
  /** Aspect ratio */
  aspect: number
  /** Near clipping plane */
  near: number
  /** Far clipping plane */
  far: number
  /** Left boundary for orthographic camera */
  left?: number
  /** Right boundary for orthographic camera */
  right?: number
  /** Top boundary for orthographic camera */
  top?: number
  /** Bottom boundary for orthographic camera */
  bottom?: number
}

/**
 * 3D Vector representation.
 *
 * @public
 */
export interface Vector3 {
  x: number
  y: number
  z: number
}

/**
 * 2D Vector representation.
 *
 * @public
 */
export interface Vector2 {
  x: number
  y: number
}

/**
 * Color representation with RGBA values.
 *
 * @public
 */
export interface Color {
  r: number
  g: number
  b: number
  a: number
}

/**
 * Material configuration for rendering.
 *
 * @public
 */
export interface MaterialConfig {
  /** Diffuse color */
  color?: Color
  /** Texture map */
  texture?: WebGLTexture
  /** Shader program */
  shader?: WebGLProgram
  /** Enable transparency */
  transparent?: boolean
  /** Alpha value for transparency */
  opacity?: number
  /** Blending mode */
  blending?: 'normal' | 'additive' | 'subtractive' | 'multiply'
}

/**
 * Geometry data for rendering.
 *
 * @public
 */
export interface GeometryData {
  /** Vertex positions */
  positions: Float32Array
  /** Vertex normals (optional) */
  normals?: Float32Array
  /** Texture coordinates (optional) */
  uvs?: Float32Array
  /** Vertex colors (optional) */
  colors?: Float32Array
  /** Index buffer (optional) */
  indices?: Uint16Array | Uint32Array
}

/**
 * Shader uniform data.
 *
 * @public
 */
export interface UniformData {
  /** Uniform name */
  name: string
  /** Uniform type */
  type: 'float' | 'vec2' | 'vec3' | 'vec4' | 'mat3' | 'mat4' | 'sampler2D'
  /** Uniform value */
  value: number | number[] | WebGLTexture
}

/**
 * Render command for batched rendering.
 *
 * @public
 */
export interface RenderCommand {
  /** Geometry to render */
  geometry: GeometryData
  /** Material configuration */
  material: MaterialConfig
  /** Model matrix for transformation */
  modelMatrix: number[]
  /** Render priority (lower numbers render first) */
  priority?: number
}

/**
 * Event listener type for renderer events.
 *
 * @public
 */
export type RendererEventListener<T = unknown> = (data: T) => void

/**
 * Renderer event types.
 *
 * @public
 */
export interface RendererEvents {
  /** Context lost event */
  'context-lost': void
  /** Context restored event */
  'context-restored': void
  /** Resize event */
  resize: { width: number; height: number }
  /** Performance warning */
  'performance-warning': { message: string; metrics: PerformanceMetrics }
  /** Error event */
  error: Error
}

/**
 * Disposal interface for cleanup.
 *
 * @public
 */
export interface Disposable {
  /** Clean up resources */
  dispose(): void
  /** Whether the object has been disposed */
  readonly isDisposed: boolean
}

/**
 * Base renderer interface.
 *
 * @public
 */
export interface BaseRenderer extends Disposable {
  /** WebGL context information */
  readonly contextInfo: WebGLContextInfo
  /** Current performance metrics */
  readonly performanceMetrics: PerformanceMetrics
  /** Canvas element being rendered to */
  readonly canvas: HTMLCanvasElement

  /** Initialize the renderer */
  initialize(config: WebGLRendererConfig): Promise<void>
  /** Resize the renderer */
  resize(width: number, height: number): void
  /** Clear the render target */
  clear(color?: Color): void
  /** Present the rendered frame */
  present(): void

  /** Add event listener */
  addEventListener<K extends keyof RendererEvents>(
    type: K,
    listener: RendererEventListener<RendererEvents[K]>
  ): void
  /** Remove event listener */
  removeEventListener<K extends keyof RendererEvents>(
    type: K,
    listener: RendererEventListener<RendererEvents[K]>
  ): void
}
