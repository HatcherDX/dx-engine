/**
 * @fileoverview Comprehensive tests for shared rendering engine main exports.
 *
 * @description
 * Tests all public exports from the main module including WebGL support checking,
 * engine creation, and module-level functionality.
 */

import { vi } from 'vitest'

// Mock WebGL2RenderingContext globally
global.WebGL2RenderingContext = class WebGL2RenderingContext {}

// Mock WebGL context first
const mockWebGLContext = {
  getExtension: vi.fn(),
  getParameter: vi.fn(),
  getSupportedExtensions: vi.fn(() => [
    'WEBGL_depth_texture',
    'OES_texture_float',
  ]),
  MAX_TEXTURE_SIZE: 0x0d33,
  MAX_TEXTURE_IMAGE_UNITS: 0x8872,
  VENDOR: 0x1f00,
  RENDERER: 0x1f01,
}

// Mock Three.js - must be at the top level for hoisting
vi.mock('three', () => ({
  WebGLRenderer: vi.fn().mockImplementation(() => ({
    setPixelRatio: vi.fn(),
    shadowMap: {
      get enabled() {
        return this._enabled
      },
      set enabled(value) {
        this._enabled = value
      },
      _enabled: false,
      get type() {
        return this._type
      },
      set type(value) {
        this._type = value
      },
      _type: 0,
    },
    get toneMapping() {
      return this._toneMapping
    },
    set toneMapping(value) {
      this._toneMapping = value
    },
    _toneMapping: 0,
    get toneMappingExposure() {
      return this._toneMappingExposure
    },
    set toneMappingExposure(value) {
      this._toneMappingExposure = value
    },
    _toneMappingExposure: 1,
    info: {
      render: { calls: 0, triangles: 0 },
      programs: [],
    },
    getContext: vi.fn(() => mockWebGLContext),
    setSize: vi.fn(),
    setClearColor: vi.fn(),
    clear: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
  })),
  Scene: vi.fn().mockImplementation(() => ({
    background: null,
    traverse: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
  })),
  PerspectiveCamera: vi.fn().mockImplementation(() => ({
    position: { set: vi.fn() },
    get aspect() {
      return this._aspect
    },
    set aspect(value) {
      this._aspect = value
    },
    _aspect: 1,
    updateProjectionMatrix: vi.fn(),
  })),
  OrthographicCamera: vi.fn().mockImplementation(() => ({
    left: -1,
    right: 1,
    top: 1,
    bottom: -1,
    updateProjectionMatrix: vi.fn(),
  })),
  Color: vi.fn().mockImplementation((r, g, b) => ({ r, g, b })),
  PCFSoftShadowMap: 2,
  ACESFilmicToneMapping: 3,
  Mesh: vi.fn(),
  ShadowMapType: {},
  ToneMapping: {},
}))

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  VERSION,
  checkWebGLSupport,
  createWebGLEngine,
  WebGLEngine,
  TerminalRenderer,
  GitRenderer,
  GitRendererMode,
  WebGL,
  Terminal,
  Git,
} from './index'

describe('🎨 Shared Rendering Engine - Main Exports', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset WebGL context mocks
    mockWebGLContext.getParameter.mockImplementation((param) => {
      switch (param) {
        case mockWebGLContext.MAX_TEXTURE_SIZE:
          return 4096
        case mockWebGLContext.MAX_TEXTURE_IMAGE_UNITS:
          return 16
        case mockWebGLContext.VENDOR:
          return 'Test Vendor'
        case mockWebGLContext.RENDERER:
          return 'Test Renderer'
        default:
          return 'unknown'
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('📦 Module Exports', () => {
    it('should export VERSION constant', () => {
      expect(VERSION).toBe('0.1.0')
      expect(typeof VERSION).toBe('string')
    })

    it('should export main classes', () => {
      expect(WebGLEngine).toBeDefined()
      expect(TerminalRenderer).toBeDefined()
      expect(GitRenderer).toBeDefined()
      expect(GitRendererMode).toBeDefined()
    })

    it('should export namespace modules', () => {
      expect(WebGL).toBeDefined()
      expect(Terminal).toBeDefined()
      expect(Git).toBeDefined()
      expect(typeof WebGL).toBe('object')
      expect(typeof Terminal).toBe('object')
      expect(typeof Git).toBe('object')
    })

    it('should export utility functions', () => {
      expect(checkWebGLSupport).toBeDefined()
      expect(createWebGLEngine).toBeDefined()
      expect(typeof checkWebGLSupport).toBe('function')
      expect(typeof createWebGLEngine).toBe('function')
    })
  })

  describe('🔍 WebGL Support Detection', () => {
    it('should detect WebGL support when available', () => {
      // Mock canvas and contexts
      const mockCanvas = {
        getContext: vi.fn(),
      }
      vi.spyOn(document, 'createElement').mockReturnValue(
        mockCanvas as unknown as HTMLCanvasElement
      )

      // Mock successful WebGL context
      mockCanvas.getContext.mockImplementation((type) => {
        if (type === 'webgl' || type === 'experimental-webgl') {
          return mockWebGLContext
        }
        if (type === 'webgl2') {
          return {
            ...mockWebGLContext,
            constructor: { name: 'WebGL2RenderingContext' },
          }
        }
        return null
      })

      const support = checkWebGLSupport()

      expect(support).toEqual({
        webgl1: true,
        webgl2: true,
        extensions: ['WEBGL_depth_texture', 'OES_texture_float'],
        maxTextureSize: 4096,
        maxTextures: 16,
        vendor: 'Test Vendor',
        renderer: 'Test Renderer',
      })
    })

    it('should handle WebGL not supported', () => {
      const mockCanvas = {
        getContext: vi.fn(() => null),
      }
      vi.spyOn(document, 'createElement').mockReturnValue(
        mockCanvas as unknown as HTMLCanvasElement
      )

      const support = checkWebGLSupport()

      expect(support).toEqual({
        webgl1: false,
        webgl2: false,
        extensions: [],
        maxTextureSize: 0,
        maxTextures: 0,
        vendor: 'Unknown',
        renderer: 'Unknown',
      })
    })

    it('should handle WebGL1 only support', () => {
      const mockCanvas = {
        getContext: vi.fn(),
      }
      vi.spyOn(document, 'createElement').mockReturnValue(
        mockCanvas as unknown as HTMLCanvasElement
      )

      mockCanvas.getContext.mockImplementation((type) => {
        if (type === 'webgl' || type === 'experimental-webgl') {
          return mockWebGLContext
        }
        return null // No WebGL2
      })

      const support = checkWebGLSupport()

      expect(support.webgl1).toBe(true)
      expect(support.webgl2).toBe(false)
      expect(support.extensions).toEqual([
        'WEBGL_depth_texture',
        'OES_texture_float',
      ])
    })

    it('should handle missing extension support', () => {
      const mockCanvas = {
        getContext: vi.fn(),
      }
      vi.spyOn(document, 'createElement').mockReturnValue(
        mockCanvas as unknown as HTMLCanvasElement
      )

      const mockContext = {
        ...mockWebGLContext,
        getSupportedExtensions: vi.fn(() => null),
      }
      mockCanvas.getContext.mockReturnValue(mockContext)

      const support = checkWebGLSupport()

      expect(support.extensions).toEqual([])
    })

    it('should handle missing vendor/renderer info', () => {
      const mockCanvas = {
        getContext: vi.fn(),
      }
      vi.spyOn(document, 'createElement').mockReturnValue(
        mockCanvas as unknown as HTMLCanvasElement
      )

      const mockContext = {
        ...mockWebGLContext,
        getParameter: vi.fn((param) => {
          if (
            param === mockWebGLContext.VENDOR ||
            param === mockWebGLContext.RENDERER
          ) {
            return null
          }
          return mockWebGLContext.getParameter(param)
        }),
      }
      mockCanvas.getContext.mockReturnValue(mockContext)

      const support = checkWebGLSupport()

      expect(support.vendor).toBe('Unknown')
      expect(support.renderer).toBe('Unknown')
    })
  })

  describe('🏗️ Engine Creation', () => {
    let mockCanvas: HTMLCanvasElement

    beforeEach(() => {
      mockCanvas = document.createElement('canvas') as HTMLCanvasElement
      // Mock the canvas getContext method
      vi.spyOn(mockCanvas, 'getContext').mockImplementation((type) => {
        if (
          type === 'webgl' ||
          type === 'webgl2' ||
          type === 'experimental-webgl'
        ) {
          return mockWebGLContext
        }
        return null
      })

      // Reset module registry before each test
      vi.resetModules()
    })

    afterEach(() => {
      vi.resetModules()
      vi.restoreAllMocks()
    })

    it('should create WebGL engine with default options', async () => {
      // Mock the dynamic import to return the mocked WebGLEngine
      vi.doMock('./webgl/WebGLEngine', () => ({
        WebGLEngine: vi.fn().mockImplementation(() => {
          const mockEngine = {
            initialize: vi.fn().mockResolvedValue(undefined),
            canvas: mockCanvas,
            performanceMetrics: { fps: 60, frameTime: 16.67 },
            contextInfo: { vendor: 'Test Vendor', renderer: 'Test Renderer' },
          }
          return mockEngine
        }),
      }))

      const engine = await createWebGLEngine(mockCanvas)

      expect(engine).toBeDefined()
      expect(engine.initialize).toHaveBeenCalledWith({
        canvas: mockCanvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      })
    })

    it('should create WebGL engine with custom options', async () => {
      const options = {
        antialias: false,
        alpha: true,
        performance: {
          enabled: false,
          collectInterval: 2000,
        },
      }

      // Mock the dynamic import
      vi.doMock('./webgl/WebGLEngine', () => ({
        WebGLEngine: vi.fn().mockImplementation(() => {
          const mockEngine = {
            initialize: vi.fn().mockResolvedValue(undefined),
            canvas: mockCanvas,
            performanceMetrics: { fps: 60, frameTime: 16.67 },
          }
          return mockEngine
        }),
      }))

      const engine = await createWebGLEngine(mockCanvas, options)

      expect(engine).toBeDefined()
      expect(engine.initialize).toHaveBeenCalledWith({
        canvas: mockCanvas,
        antialias: false,
        alpha: true,
        powerPreference: 'high-performance',
        performance: {
          enabled: false,
          collectInterval: 2000,
        },
      })
    })

    it('should handle engine initialization failure', async () => {
      // Mock WebGLEngine to throw during initialization
      vi.doMock('./webgl/WebGLEngine', () => ({
        WebGLEngine: vi.fn().mockImplementation(() => ({
          initialize: vi
            .fn()
            .mockRejectedValue(new Error('WebGL initialization failed')),
        })),
      }))

      await expect(createWebGLEngine(mockCanvas)).rejects.toThrow(
        'WebGL initialization failed'
      )
    })

    it('should apply performance configuration', async () => {
      const performanceOptions = {
        performance: {
          enabled: true,
          collectInterval: 500,
          maxSamples: 120,
          enableMemoryMonitoring: false,
          enableFrameTimeTracking: true,
        },
      }

      // Mock the dynamic import
      vi.doMock('./webgl/WebGLEngine', () => ({
        WebGLEngine: vi.fn().mockImplementation(() => {
          const mockEngine = {
            initialize: vi.fn().mockResolvedValue(undefined),
            canvas: mockCanvas,
            performanceMetrics: { fps: 60, frameTime: 16.67 },
          }
          return mockEngine
        }),
      }))

      const engine = await createWebGLEngine(mockCanvas, performanceOptions)

      expect(engine).toBeDefined()
      expect(engine.initialize).toHaveBeenCalledWith({
        canvas: mockCanvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        performance: {
          enabled: true,
          collectInterval: 500,
          maxSamples: 120,
          enableMemoryMonitoring: false,
          enableFrameTimeTracking: true,
        },
      })
    })

    it('should apply debug configuration', async () => {
      const debugOptions = {
        debug: true,
        shadows: true,
        autoGC: false,
        gcInterval: 60000,
      }

      // Mock the dynamic import
      vi.doMock('./webgl/WebGLEngine', () => ({
        WebGLEngine: vi.fn().mockImplementation(() => {
          const mockEngine = {
            initialize: vi.fn().mockResolvedValue(undefined),
            canvas: mockCanvas,
          }
          return mockEngine
        }),
      }))

      const engine = await createWebGLEngine(mockCanvas, debugOptions)

      expect(engine).toBeDefined()
      expect(engine.initialize).toHaveBeenCalledWith({
        canvas: mockCanvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        debug: true,
        shadows: true,
        autoGC: false,
        gcInterval: 60000,
      })
    })

    it('should pass through empty options correctly', async () => {
      // Mock the dynamic import
      vi.doMock('./webgl/WebGLEngine', () => ({
        WebGLEngine: vi.fn().mockImplementation(() => {
          const mockEngine = {
            initialize: vi.fn().mockResolvedValue(undefined),
            canvas: mockCanvas,
          }
          return mockEngine
        }),
      }))

      const engine = await createWebGLEngine(mockCanvas, {})

      expect(engine).toBeDefined()
      expect(engine.initialize).toHaveBeenCalledWith({
        canvas: mockCanvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      })
    })

    it('should handle partial options correctly', async () => {
      const partialOptions = {
        antialias: false,
      }

      // Mock the dynamic import
      vi.doMock('./webgl/WebGLEngine', () => ({
        WebGLEngine: vi.fn().mockImplementation(() => {
          const mockEngine = {
            initialize: vi.fn().mockResolvedValue(undefined),
            canvas: mockCanvas,
          }
          return mockEngine
        }),
      }))

      const engine = await createWebGLEngine(mockCanvas, partialOptions)

      expect(engine).toBeDefined()
      expect(engine.initialize).toHaveBeenCalledWith({
        canvas: mockCanvas,
        antialias: false,
        alpha: false,
        powerPreference: 'high-performance',
      })
    })
  })

  describe('🧩 Integration Tests', () => {
    it('should work with full WebGL pipeline', async () => {
      const mockCanvas = document.createElement('canvas') as HTMLCanvasElement
      vi.spyOn(mockCanvas, 'getContext').mockReturnValue(mockWebGLContext)

      // Mock document.createElement to return our mock canvas
      vi.spyOn(document, 'createElement').mockReturnValue(
        mockCanvas as unknown as HTMLCanvasElement
      )

      // Check WebGL support
      const support = checkWebGLSupport()
      expect(support.webgl1).toBe(true)

      // Mock the dynamic import for integration test
      vi.doMock('./webgl/WebGLEngine', () => ({
        WebGLEngine: vi.fn().mockImplementation(() => {
          const mockEngine = {
            initialize: vi.fn().mockResolvedValue(undefined),
            canvas: mockCanvas,
            contextInfo: { vendor: 'Test Vendor', renderer: 'Test Renderer' },
            performanceMetrics: { fps: 60, frameTime: 16.67 },
          }
          return mockEngine
        }),
      }))

      // Create engine
      const engine = await createWebGLEngine(mockCanvas, {
        antialias: true,
        performance: { enabled: true },
      })

      expect(engine).toBeDefined()
      expect(engine.contextInfo).toBeDefined()
    })

    it('should handle missing WebGL gracefully', () => {
      const mockCanvas = {
        getContext: vi.fn(() => null),
      }
      vi.spyOn(document, 'createElement').mockReturnValue(
        mockCanvas as unknown as HTMLCanvasElement
      )

      const support = checkWebGLSupport()

      expect(support.webgl1).toBe(false)
      expect(support.webgl2).toBe(false)
      expect(support.extensions).toEqual([])
      expect(support.maxTextureSize).toBe(0)
      expect(support.maxTextures).toBe(0)
    })
  })

  describe('🎯 Edge Cases', () => {
    it('should handle document.createElement returning null', () => {
      vi.spyOn(document, 'createElement').mockReturnValue(
        null as unknown as HTMLCanvasElement
      )

      expect(() => checkWebGLSupport()).toThrow()
    })

    it('should handle WebGL context with incomplete API', () => {
      const mockCanvas = {
        getContext: vi.fn(),
      }
      vi.spyOn(document, 'createElement').mockReturnValue(
        mockCanvas as unknown as HTMLCanvasElement
      )

      // Mock context with missing methods
      const incompleteContext = {
        getExtension: vi.fn(),
        getParameter: vi.fn((param) => {
          if (param === 0x0d33) return 2048 // MAX_TEXTURE_SIZE
          if (param === 0x8872) return 8 // MAX_TEXTURE_IMAGE_UNITS
          return 'unknown'
        }),
        getSupportedExtensions: vi.fn(() => null), // Returns null to test graceful handling
        MAX_TEXTURE_SIZE: 0x0d33,
        MAX_TEXTURE_IMAGE_UNITS: 0x8872,
        VENDOR: 0x1f00,
        RENDERER: 0x1f01,
      }
      mockCanvas.getContext.mockReturnValue(incompleteContext)

      const support = checkWebGLSupport()

      expect(support.webgl1).toBe(true)
      expect(support.extensions).toEqual([]) // Should handle gracefully
    })

    it('should handle canvas creation with invalid parameters', async () => {
      const mockCanvas = null as unknown as HTMLCanvasElement

      // Create a custom createWebGLEngine that actually throws on null canvas
      const failingCreateWebGLEngine = async (canvas: HTMLCanvasElement) => {
        const engine = new WebGLEngine()
        await engine.initialize({ canvas })
        return engine
      }

      await expect(failingCreateWebGLEngine(mockCanvas)).rejects.toThrow()
    })
  })

  describe('📊 Performance Tests', () => {
    it('should complete WebGL support check quickly', () => {
      const startTime = performance.now()

      const mockCanvas = {
        getContext: vi.fn().mockReturnValue(mockWebGLContext),
      }
      vi.spyOn(document, 'createElement').mockReturnValue(
        mockCanvas as unknown as HTMLCanvasElement
      )

      checkWebGLSupport()

      const duration = performance.now() - startTime
      expect(duration).toBeLessThan(50) // Should complete within 50ms
    })

    it('should create engine efficiently', async () => {
      const mockCanvas = document.createElement('canvas') as HTMLCanvasElement
      vi.spyOn(mockCanvas, 'getContext').mockReturnValue(mockWebGLContext)

      // Mock the dynamic import for this test
      vi.doMock('./webgl/WebGLEngine', () => ({
        WebGLEngine: vi.fn().mockImplementation(() => ({
          initialize: vi.fn().mockResolvedValue(undefined),
          canvas: mockCanvas,
        })),
      }))

      const startTime = performance.now()

      const engine = await createWebGLEngine(mockCanvas)

      const duration = performance.now() - startTime
      expect(duration).toBeLessThan(100) // Should create within 100ms
      expect(engine).toBeDefined()
    })
  })
})
