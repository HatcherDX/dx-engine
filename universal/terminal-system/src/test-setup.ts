/**
 * @fileoverview Test setup configuration for terminal-system tests.
 *
 * @description
 * Global test setup for DOM environment and common mocks.
 * Provides necessary mocks for browser APIs and DOM elements.
 *
 * CRITICAL: This file is loaded as setupFiles in vitest.config.ts.
 * DO NOT import from 'vitest' here (vi, afterEach, etc.) as it causes
 * "Vitest failed to access its internal state" errors in CI environments.
 *
 * With globals: true enabled in vitest.config.ts, all vitest utilities
 * (vi, describe, it, expect, afterEach, etc.) are available globally.
 * Just use them directly without importing or declaring.
 *
 * @see https://vitest.dev/config/#globals
 * @see https://vitest.dev/config/#setupfiles
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

// vi is available globally via globals: true
// No need to import or declare - just use it directly

// Mock console methods for test coverage
// Logger tests will restore these in their beforeEach
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}

// Mock HTMLCanvasElement if needed
if (typeof HTMLCanvasElement !== 'undefined') {
  // Mock createLinearGradient for canvas gradient support
  const mockGradient = {
    addColorStop: vi.fn(),
  }

  HTMLCanvasElement.prototype.getContext = vi.fn((contextType: string) => {
    const baseContextMock = {
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(),
      putImageData: vi.fn(),
      createImageData: vi.fn(),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      translate: vi.fn(),
      createLinearGradient: vi.fn(() => mockGradient),
      createRadialGradient: vi.fn(() => mockGradient),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '10px sans-serif',
      canvas: {
        width: 800,
        height: 600,
      },
    }

    if (contextType === '2d') {
      return baseContextMock as unknown as CanvasRenderingContext2D
    } else if (contextType === 'webgl' || contextType === 'webgl2') {
      // Return mock WebGL context with similar base methods
      return {
        ...baseContextMock,
        // Add WebGL-specific methods
        canvas: baseContextMock.canvas,
        drawingBufferWidth: 800,
        drawingBufferHeight: 600,
        VERTEX_SHADER: 35633,
        FRAGMENT_SHADER: 35632,
        COMPILE_STATUS: 35713,
        LINK_STATUS: 35714,
        getShaderInfoLog: vi.fn(),
        getProgramInfoLog: vi.fn(),
        createShader: vi.fn(() => ({})),
        createProgram: vi.fn(() => ({})),
        attachShader: vi.fn(),
        linkProgram: vi.fn(),
        useProgram: vi.fn(),
        getAttribLocation: vi.fn(() => 0),
        getUniformLocation: vi.fn(() => ({})),
        enableVertexAttribArray: vi.fn(),
        vertexAttribPointer: vi.fn(),
        uniform1f: vi.fn(),
        uniform2f: vi.fn(),
        uniform3f: vi.fn(),
        uniform4f: vi.fn(),
        uniformMatrix4fv: vi.fn(),
        getParameter: vi.fn((pname: number) => {
          // Mock common WebGL parameters
          if (pname === 7936) return 'Mock WebGL Vendor' // VENDOR
          if (pname === 7937) return 'Mock WebGL Renderer' // RENDERER
          if (pname === 7938) return 'WebGL 1.0' // VERSION
          return null
        }),
        getExtension: vi.fn((name: string) => {
          if (name === 'WEBGL_debug_renderer_info') {
            return {
              UNMASKED_VENDOR_WEBGL: 37445,
              UNMASKED_RENDERER_WEBGL: 37446,
            }
          }
          return null
        }),
      } as unknown as WebGLRenderingContext
    }
    return null
  }) as unknown as typeof HTMLCanvasElement.prototype.getContext

  // Mock toDataURL for screenshot functionality
  HTMLCanvasElement.prototype.toDataURL = vi.fn(
    () => 'data:image/png;base64,mock'
  )
}

// Mock performance API if not available
if (typeof global.performance === 'undefined') {
  global.performance = {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(() => []),
    getEntriesByType: vi.fn(() => []),
  } as unknown as Performance
}

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
  const id = setTimeout(() => callback(Date.now()), 16) as unknown as number
  return id
})

global.cancelAnimationFrame = vi.fn((id: number) => {
  clearTimeout(id)
})

// Mock matchMedia for responsive terminal DPI monitoring
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
