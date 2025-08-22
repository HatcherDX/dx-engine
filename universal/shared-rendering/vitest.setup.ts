/**
 * @fileoverview Vitest setup file for shared-rendering tests
 *
 * @description
 * Global test setup for WebGL and Three.js components testing.
 * Provides mocks for WebGL context, DOM elements, and browser APIs.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

import { vi } from 'vitest'

// Mock WebGL2RenderingContext for WebGL2 support detection
global.WebGL2RenderingContext = class WebGL2RenderingContext {}

// Mock WebGL context for Three.js
const mockWebGLContext = {
  canvas: {},
  drawingBufferWidth: 1024,
  drawingBufferHeight: 768,
  getExtension: vi.fn(() => ({})),
  getParameter: vi.fn(() => 'WebGL Mock'),
  getSupportedExtensions: vi.fn(() => [
    'OES_texture_float',
    'ANGLE_instanced_arrays',
  ]),
  getShaderParameter: vi.fn(() => true),
  getProgramParameter: vi.fn(() => true),
  createShader: vi.fn(() => ({})),
  createProgram: vi.fn(() => ({})),
  shaderSource: vi.fn(),
  compileShader: vi.fn(),
  attachShader: vi.fn(),
  linkProgram: vi.fn(),
  useProgram: vi.fn(),
  createBuffer: vi.fn(() => ({})),
  bindBuffer: vi.fn(),
  bufferData: vi.fn(),
  enableVertexAttribArray: vi.fn(),
  vertexAttribPointer: vi.fn(),
  uniform1f: vi.fn(),
  uniform2f: vi.fn(),
  uniform3f: vi.fn(),
  uniform4f: vi.fn(),
  uniformMatrix4fv: vi.fn(),
  drawArrays: vi.fn(),
  drawElements: vi.fn(),
  clear: vi.fn(),
  clearColor: vi.fn(),
  clearDepth: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
  viewport: vi.fn(),
  bindTexture: vi.fn(),
  createTexture: vi.fn(() => ({})),
  texImage2D: vi.fn(),
  texParameteri: vi.fn(),
  generateMipmap: vi.fn(),
  activeTexture: vi.fn(),
  getUniformLocation: vi.fn(() => ({})),
  getAttribLocation: vi.fn(() => 0),
  // WebGL constants
  VERTEX_SHADER: 35633,
  FRAGMENT_SHADER: 35632,
  COMPILE_STATUS: 35713,
  LINK_STATUS: 35714,
  ARRAY_BUFFER: 34962,
  ELEMENT_ARRAY_BUFFER: 34963,
  STATIC_DRAW: 35044,
  DYNAMIC_DRAW: 35048,
  TRIANGLES: 4,
  TRIANGLE_STRIP: 5,
  LINES: 1,
  LINE_STRIP: 3,
  POINTS: 0,
  COLOR_BUFFER_BIT: 16384,
  DEPTH_BUFFER_BIT: 256,
  DEPTH_TEST: 2929,
  BLEND: 3042,
  CULL_FACE: 2884,
  TEXTURE_2D: 3553,
  TEXTURE0: 33984,
  RGBA: 6408,
  UNSIGNED_BYTE: 5121,
  TEXTURE_MAG_FILTER: 10240,
  TEXTURE_MIN_FILTER: 10241,
  TEXTURE_WRAP_S: 10242,
  TEXTURE_WRAP_T: 10243,
  LINEAR: 9729,
  NEAREST: 9728,
  CLAMP_TO_EDGE: 33071,
  REPEAT: 10497,
  MAX_TEXTURE_SIZE: 0x0d33,
  MAX_TEXTURE_IMAGE_UNITS: 0x8872,
  VENDOR: 0x1f00,
  RENDERER: 0x1f01,
}

// Mock HTMLCanvasElement.getContext
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn((contextType: string) => {
    if (
      contextType === 'webgl' ||
      contextType === 'webgl2' ||
      contextType === 'experimental-webgl'
    ) {
      return mockWebGLContext
    }
    if (contextType === '2d') {
      return {
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        getImageData: vi.fn(),
        putImageData: vi.fn(),
        createImageData: vi.fn(),
        setTransform: vi.fn(),
        drawImage: vi.fn(),
        save: vi.fn(),
        fillText: vi.fn(),
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
      }
    }
    return null
  }),
})

// Mock performance API
Object.defineProperty(global, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(() => []),
    getEntriesByType: vi.fn(() => []),
  },
})

// Mock requestAnimationFrame
Object.defineProperty(global, 'requestAnimationFrame', {
  value: vi.fn((callback: FrameRequestCallback) => {
    return setTimeout(() => callback(Date.now()), 16)
  }),
})

// Mock cancelAnimationFrame
Object.defineProperty(global, 'cancelAnimationFrame', {
  value: vi.fn((id: number) => {
    clearTimeout(id)
  }),
})

// Mock Image constructor
Object.defineProperty(global, 'Image', {
  value: class MockImage {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    src = ''
    width = 0
    height = 0

    constructor() {
      // Simulate immediate load for tests
      setTimeout(() => {
        if (this.onload) {
          this.width = 256
          this.height = 256
          this.onload()
        }
      }, 0)
    }
  },
})

// Mock ResizeObserver
Object.defineProperty(global, 'ResizeObserver', {
  value: class MockResizeObserver {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()

    constructor(callback: ResizeObserverCallback) {
      // Store callback for potential test use
      this.observe = vi.fn(() => {
        // Simulate resize event
        setTimeout(() => {
          callback(
            [
              {
                target: document.createElement('div'),
                contentRect: {
                  width: 1024,
                  height: 768,
                  top: 0,
                  left: 0,
                  bottom: 768,
                  right: 1024,
                },
                borderBoxSize: [{ blockSize: 768, inlineSize: 1024 }],
                contentBoxSize: [{ blockSize: 768, inlineSize: 1024 }],
                devicePixelContentBoxSize: [
                  { blockSize: 768, inlineSize: 1024 },
                ],
              },
            ],
            this
          )
        }, 0)
      })
    }
  },
})

// Three.js mocks are handled per-test-file to avoid conflicts

// Mock console methods for cleaner test output (will be handled by test files)
// Note: Individual test files should handle console mocking as needed
