/**
 * @fileoverview Main exports for shared rendering engine.
 *
 * @description
 * The shared rendering engine provides high-performance WebGL rendering
 * capabilities that can be used across both terminal and Git UI components.
 * Built on Three.js for robust WebGL abstraction while maintaining direct
 * access for performance-critical operations.
 *
 * @example
 * ```typescript
 * import { WebGLEngine, TerminalRenderer, GitRenderer } from '@hatcherdx/shared-rendering'
 *
 * // Create shared WebGL engine
 * const engine = new WebGLEngine()
 * await engine.initialize({
 *   canvas: document.getElementById('canvas') as HTMLCanvasElement,
 *   antialias: true
 * })
 *
 * // Use for terminal rendering
 * const terminalRenderer = new TerminalRenderer(engine)
 * await terminalRenderer.initialize({
 *   rows: 25,
 *   cols: 80,
 *   fontSize: 14
 * })
 *
 * // Use for Git visualization
 * const gitRenderer = new GitRenderer(engine)
 * await gitRenderer.initialize({
 *   maxCommits: 1000,
 *   enableInteraction: true
 * })
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

// Core WebGL engine
export { WebGLEngine, type WebGLEngineConfig } from './webgl/WebGLEngine'

// Terminal renderer
export { TerminalRenderer } from './terminal/TerminalRenderer'
export type {
  TerminalRendererConfig,
  TerminalCell,
  TerminalCursor,
  TextSelection,
} from './terminal/TerminalRenderer'

// Git renderer
export { GitRenderer, GitRendererMode } from './git/GitRenderer'
export type {
  GitRendererConfig,
  GitCommitData,
  GitBranchData,
  GitDiffData,
  GitDiffHunk,
  GitDiffLine,
  TimelineState,
} from './git/GitRenderer'

// Core types
export type * from './types'

// Module exports for granular imports
export * as WebGL from './webgl'
export * as Terminal from './terminal'
export * as Git from './git'

/**
 * Shared rendering engine version.
 *
 * @public
 */
export const VERSION = '0.1.0'

/**
 * Check if WebGL is supported in the current environment.
 *
 * @returns WebGL support information
 *
 * @example
 * ```typescript
 * const support = checkWebGLSupport()
 * if (!support.webgl1) {
 *   console.warn('WebGL not supported')
 * }
 * if (support.webgl2) {
 *   console.log('WebGL2 available for advanced features')
 * }
 * ```
 *
 * @public
 */
export function checkWebGLSupport(): {
  webgl1: boolean
  webgl2: boolean
  extensions: string[]
  maxTextureSize: number
  maxTextures: number
  vendor: string
  renderer: string
} {
  const canvas = document.createElement('canvas')

  // Check WebGL 1.0
  const gl1 =
    canvas.getContext('webgl') ||
    (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)
  const webgl1 = !!gl1

  // Check WebGL 2.0
  const gl2 = canvas.getContext('webgl2') as WebGL2RenderingContext | null
  const webgl2 = !!gl2

  // Use best available context for feature detection
  const gl = gl2 || gl1

  if (!gl) {
    return {
      webgl1: false,
      webgl2: false,
      extensions: [],
      maxTextureSize: 0,
      maxTextures: 0,
      vendor: 'Unknown',
      renderer: 'Unknown',
    }
  }

  return {
    webgl1,
    webgl2,
    extensions: gl.getSupportedExtensions() || [],
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    maxTextures: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
    vendor: gl.getParameter(gl.VENDOR) || 'Unknown',
    renderer: gl.getParameter(gl.RENDERER) || 'Unknown',
  }
}

/**
 * Create a shared WebGL engine with sensible defaults.
 *
 * @param canvas - Target canvas element
 * @param options - Optional configuration overrides
 * @returns Configured WebGL engine instance
 *
 * @example
 * ```typescript
 * const canvas = document.getElementById('canvas') as HTMLCanvasElement
 * const engine = createWebGLEngine(canvas, {
 *   antialias: true,
 *   performance: { enabled: true }
 * })
 * await engine.initialize()
 * ```
 *
 * @public
 */
export async function createWebGLEngine(
  canvas: HTMLCanvasElement,
  options: Partial<import('./webgl/WebGLEngine').WebGLEngineConfig> = {}
): Promise<import('./webgl/WebGLEngine').WebGLEngine> {
  const { WebGLEngine } = await import('./webgl/WebGLEngine')
  const engine = new WebGLEngine()

  await engine.initialize({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    ...options,
  })

  return engine
}
