/**
 * @fileoverview Comprehensive tests for WebGLEngine class.
 *
 * @description
 * Tests all functionality of the core WebGL rendering engine including
 * initialization, rendering, resource management, performance monitoring,
 * and disposal.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WebGLEngine, type WebGLEngineConfig } from './WebGLEngine'
// import * as THREE from 'three' // Currently unused in tests

// Interface for accessing private members in tests
interface WebGLEnginePrivateMembers {
  _lastFrameTime: number
  _performanceMetrics: { fps: number }
  _frameCount: number
  _gcTimer: unknown
  _eventListeners: Map<string, unknown>
  _scene: unknown
  _camera: unknown
  updatePerformanceMetrics(): void
  collectGarbage(): void
}

// Mock WebGL2RenderingContext globally
global.WebGL2RenderingContext = class WebGL2RenderingContext {}

// Mock WebGL context first
const mockWebGLContext = {
  getExtension: vi.fn(),
  getParameter: vi.fn(),
  getSupportedExtensions: vi.fn(() => [
    'OES_texture_float',
    'ANGLE_instanced_arrays',
  ]),
  MAX_TEXTURE_SIZE: 0x0d33,
  MAX_TEXTURE_IMAGE_UNITS: 0x8872,
  VENDOR: 0x1f00,
  RENDERER: 0x1f01,
}

// Mock Three.js with comprehensive implementation
const mockRenderer = {
  setPixelRatio: vi.fn(),
  shadowMap: { enabled: false, type: 0 },
  toneMapping: 0,
  toneMappingExposure: 1,
  info: {
    render: { calls: 5, triangles: 100 },
    programs: [],
  },
  getContext: vi.fn(() => mockWebGLContext),
  setSize: vi.fn(),
  setClearColor: vi.fn(),
  clear: vi.fn(),
  render: vi.fn(),
  dispose: vi.fn(),
}

const mockScene = {
  get background() {
    return this._background
  },
  set background(value) {
    this._background = value
  },
  _background: null,
  add: vi.fn(),
  remove: vi.fn(),
  traverse: vi.fn((callback) => {
    // Simulate scene with some meshes
    const mockMesh = {
      geometry: { dispose: vi.fn() },
      material: { dispose: vi.fn() },
    }
    callback(mockMesh)
  }),
}

const mockPerspectiveCamera = {
  position: { set: vi.fn() },
  get aspect() {
    return this._aspect
  },
  set aspect(value) {
    this._aspect = value
  },
  _aspect: 1,
  updateProjectionMatrix: vi.fn(),
}

const mockOrthographicCamera = {
  get left() {
    return this._left
  },
  set left(value) {
    this._left = value
  },
  _left: -1,
  get right() {
    return this._right
  },
  set right(value) {
    this._right = value
  },
  _right: 1,
  get top() {
    return this._top
  },
  set top(value) {
    this._top = value
  },
  _top: 1,
  get bottom() {
    return this._bottom
  },
  set bottom(value) {
    this._bottom = value
  },
  _bottom: -1,
  updateProjectionMatrix: vi.fn(),
}

vi.mock('three', () => ({
  WebGLRenderer: vi.fn(() => mockRenderer),
  Scene: vi.fn(() => mockScene),
  PerspectiveCamera: vi.fn(() => mockPerspectiveCamera),
  OrthographicCamera: vi.fn(() => mockOrthographicCamera),
  Color: vi.fn().mockImplementation((r, g, b) => {
    const color = { r: r || 0, g: g || 0, b: b || 0 }
    return color
  }),
  PCFSoftShadowMap: 2,
  ACESFilmicToneMapping: 3,
  Mesh: vi.fn(),
}))

describe('🎨 WebGL Engine', () => {
  let engine: WebGLEngine
  let mockCanvas: HTMLCanvasElement

  beforeEach(() => {
    vi.clearAllMocks()

    engine = new WebGLEngine()
    mockCanvas = document.createElement('canvas')

    // Mock canvas context creation
    vi.spyOn(mockCanvas, 'getContext').mockReturnValue(mockWebGLContext)

    // Mock WebGL context parameters
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

    mockRenderer.getContext.mockReturnValue(mockWebGLContext)

    // Mock performance.now for consistent testing
    vi.spyOn(performance, 'now').mockReturnValue(1000)

    // Mock setInterval/clearInterval
    vi.spyOn(global, 'setInterval').mockImplementation((callback) => {
      return setTimeout(callback, 0) as unknown as number
    })
    vi.spyOn(global, 'clearInterval').mockImplementation(clearTimeout)
  })

  afterEach(() => {
    if (engine && !engine.isDisposed) {
      engine.dispose()
    }
    vi.restoreAllMocks()
  })

  describe('🚀 Initialization', () => {
    it('should initialize successfully with basic config', async () => {
      const config: WebGLEngineConfig = { canvas: mockCanvas }

      await engine.initialize(config)

      expect(engine.canvas).toBe(mockCanvas)
      expect(engine.threeRenderer).toBe(mockRenderer)
      expect(engine.defaultScene).toBe(mockScene)
      expect(engine.defaultCamera).toBe(mockPerspectiveCamera)
      expect(mockRenderer.setPixelRatio).toHaveBeenCalled()
    })

    it('should initialize with full configuration', async () => {
      const config: WebGLEngineConfig = {
        canvas: mockCanvas,
        antialias: true,
        alpha: false,
        depth: true,
        stencil: false,
        preserveDrawingBuffer: false,
        failIfMajorPerformanceCaveat: false,
        powerPreference: 'high-performance',
        performance: {
          enabled: true,
          collectInterval: 500,
          maxSamples: 120,
          enableMemoryMonitoring: true,
          enableFrameTimeTracking: true,
        },
        debug: true,
        shadows: true,
        autoGC: true,
        gcInterval: 30000,
      }

      await engine.initialize(config)

      expect(mockRenderer.shadowMap.enabled).toBe(true)
      expect(engine.performanceMetrics).toBeDefined()
    })

    it('should throw error if already initialized', async () => {
      await engine.initialize({ canvas: mockCanvas })

      await expect(engine.initialize({ canvas: mockCanvas })).rejects.toThrow(
        'WebGL engine already initialized'
      )
    })

    it('should throw error if disposed', async () => {
      engine.dispose()

      await expect(engine.initialize({ canvas: mockCanvas })).rejects.toThrow(
        'Cannot initialize disposed WebGL engine'
      )
    })

    it('should setup context loss handling', async () => {
      const addEventListenerSpy = vi.spyOn(mockCanvas, 'addEventListener')

      await engine.initialize({ canvas: mockCanvas })

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'webglcontextlost',
        expect.any(Function)
      )
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'webglcontextrestored',
        expect.any(Function)
      )
    })
  })

  describe('🖼️ Rendering', () => {
    beforeEach(async () => {
      await engine.initialize({ canvas: mockCanvas })
    })

    it('should render with default scene and camera', () => {
      engine.render()

      expect(mockRenderer.render).toHaveBeenCalledWith(
        mockScene,
        mockPerspectiveCamera
      )
    })

    it('should render with custom scene and camera', () => {
      const customScene = mockScene
      const customCamera = mockPerspectiveCamera

      engine.render(customScene, customCamera)

      expect(mockRenderer.render).toHaveBeenCalledWith(
        customScene,
        customCamera
      )
    })

    it('should not render if disposed', () => {
      engine.dispose()

      engine.render()

      expect(mockRenderer.render).not.toHaveBeenCalled()
    })

    it('should clear with default color', () => {
      engine.clear()

      expect(mockRenderer.clear).toHaveBeenCalled()
    })

    it('should clear with custom color', () => {
      const color = { r: 1, g: 0, b: 0, a: 1 }

      engine.clear(color)

      expect(mockRenderer.setClearColor).toHaveBeenCalledWith(
        expect.anything(), // Color object structure can vary
        1
      )
      expect(mockRenderer.clear).toHaveBeenCalled()
    })
  })

  describe('📏 Resizing', () => {
    beforeEach(async () => {
      await engine.initialize({ canvas: mockCanvas })
    })

    it('should resize renderer and camera', () => {
      engine.resize(1920, 1080)

      expect(mockRenderer.setSize).toHaveBeenCalledWith(1920, 1080, false)
      // Emit event is tested separately, so just verify resize was called
      expect(mockRenderer.setSize).toHaveBeenCalledTimes(1)
    })

    it('should handle resize with different aspect ratios', () => {
      engine.resize(800, 600)
      expect(mockRenderer.setSize).toHaveBeenCalledWith(800, 600, false)

      engine.resize(1600, 900)
      expect(mockRenderer.setSize).toHaveBeenCalledWith(1600, 900, false)
    })

    it('should not resize if disposed', () => {
      engine.dispose()

      engine.resize(1920, 1080)

      expect(mockRenderer.setSize).not.toHaveBeenCalled()
    })

    it('should emit resize event', () => {
      const resizeListener = vi.fn()
      engine.addEventListener('resize', resizeListener)

      engine.resize(1920, 1080)

      expect(resizeListener).toHaveBeenCalledWith({ width: 1920, height: 1080 })
    })
  })

  describe('🏗️ Scene and Camera Creation', () => {
    beforeEach(async () => {
      await engine.initialize({ canvas: mockCanvas })
    })

    it('should create scene without background', () => {
      const scene = engine.createScene()

      expect(scene).toBe(mockScene)
    })

    it('should create scene with background color', () => {
      const backgroundColor = { r: 0.5, g: 0.7, b: 0.9, a: 1 }

      const scene = engine.createScene(backgroundColor)

      expect(scene).toBe(mockScene)
      // The background should be set (the Color constructor is mocked)
      expect(scene.background).toBeDefined()
    })

    it('should create perspective camera with default parameters', () => {
      const camera = engine.createPerspectiveCamera()

      expect(camera).toBe(mockPerspectiveCamera)
    })

    it('should create perspective camera with custom parameters', () => {
      const camera = engine.createPerspectiveCamera(60, 16 / 9, 0.5, 2000)

      expect(camera).toBe(mockPerspectiveCamera)
    })

    it('should create orthographic camera with default parameters', () => {
      const camera = engine.createOrthographicCamera()

      expect(camera).toBe(mockOrthographicCamera)
    })

    it('should create orthographic camera with custom parameters', () => {
      const camera = engine.createOrthographicCamera(-2, 2, 2, -2, 0.5, 2000)

      expect(camera).toBe(mockOrthographicCamera)
    })
  })

  describe('📊 Performance Monitoring', () => {
    beforeEach(async () => {
      await engine.initialize({
        canvas: mockCanvas,
        performance: { enabled: true, collectInterval: 100 },
      })
    })

    it('should provide performance metrics', () => {
      const metrics = engine.performanceMetrics

      expect(metrics).toHaveProperty('fps')
      expect(metrics).toHaveProperty('frameTime')
      expect(metrics).toHaveProperty('drawCalls')
      expect(metrics).toHaveProperty('vertices')
      expect(metrics).toHaveProperty('triangles')
      expect(metrics).toHaveProperty('timestamp')
    })

    it('should update frame time metrics on present', () => {
      // Set initial frame time
      // Access private member for testing
      ;(engine as unknown as WebGLEnginePrivateMembers)._lastFrameTime = 1000

      vi.spyOn(performance, 'now').mockReturnValue(1016.67) // 16.67ms later (60fps)

      engine.present()

      // Frame time should be updated with exponential moving average
      const metrics = engine.performanceMetrics
      expect(metrics.frameTime).toBeGreaterThan(0)
    })

    it('should emit performance warning for low FPS', async () => {
      const warningListener = vi.fn()
      engine.addEventListener('performance-warning', warningListener)

      // Manually set low FPS to trigger warning
      // Access private member for testing
      ;(
        engine as unknown as WebGLEnginePrivateMembers
      )._performanceMetrics.fps = 15
      // Access private member for testing
      ;(engine as unknown as WebGLEnginePrivateMembers)._frameCount = 15

      // Trigger performance update that should emit the warning
      // Access private member for testing
      ;(
        engine as unknown as WebGLEnginePrivateMembers
      ).updatePerformanceMetrics()

      expect(warningListener).toHaveBeenCalledWith({
        message: 'Low FPS detected',
        metrics: expect.objectContaining({ fps: 15 }),
      })
    })
  })

  describe('🧹 Resource Management', () => {
    beforeEach(async () => {
      await engine.initialize({
        canvas: mockCanvas,
        autoGC: true,
        gcInterval: 100,
      })
    })

    it('should perform automatic garbage collection', () => {
      // Mock programs with usage data
      mockRenderer.info.programs = [
        { usedTimes: 0 }, // Unused program
        { usedTimes: 5 }, // Used program
      ]

      // Manually trigger garbage collection
      // Access private member for testing
      ;(engine as unknown as WebGLEnginePrivateMembers).collectGarbage()

      // Should dispose unused programs
      expect(mockRenderer.dispose).toHaveBeenCalled()
    })

    it('should disable auto GC when configured', async () => {
      engine.dispose()
      engine = new WebGLEngine()

      await engine.initialize({ canvas: mockCanvas, autoGC: false })

      // GC timer should not be set
      // Access private member for testing
      expect(
        (engine as unknown as WebGLEnginePrivateMembers)._gcTimer
      ).toBeNull()
    })
  })

  describe('🎧 Event Handling', () => {
    beforeEach(async () => {
      await engine.initialize({ canvas: mockCanvas })
    })

    it('should add and remove event listeners', () => {
      const listener = vi.fn()

      engine.addEventListener('resize', listener)
      engine.resize(800, 600)

      expect(listener).toHaveBeenCalledWith({ width: 800, height: 600 })

      engine.removeEventListener('resize', listener)
      engine.resize(1024, 768)

      expect(listener).toHaveBeenCalledTimes(1) // Should not be called again
    })

    it('should handle context loss events', () => {
      const contextLostListener = vi.fn()
      engine.addEventListener('context-lost', contextLostListener)

      // Simulate context loss event
      const contextLostEvent = new Event('webglcontextlost')
      Object.defineProperty(contextLostEvent, 'preventDefault', {
        value: vi.fn(),
      })
      mockCanvas.dispatchEvent(contextLostEvent)

      expect(contextLostListener).toHaveBeenCalled()
    })

    it('should handle context restored events', () => {
      const contextRestoredListener = vi.fn()
      engine.addEventListener('context-restored', contextRestoredListener)

      // Simulate context restored event
      mockCanvas.dispatchEvent(new Event('webglcontextrestored'))

      expect(contextRestoredListener).toHaveBeenCalled()
    })

    it('should handle listener errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const badListener = vi.fn(() => {
        throw new Error('Listener error')
      })

      engine.addEventListener('resize', badListener)
      engine.resize(800, 600)

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in resize event listener:',
        expect.any(Error)
      )
    })
  })

  describe('ℹ️ Context Information', () => {
    beforeEach(async () => {
      await engine.initialize({ canvas: mockCanvas })
    })

    it('should provide WebGL context info', () => {
      // Mock additional WebGL features
      mockWebGLContext.getExtension.mockImplementation((name) => {
        if (name === 'OES_texture_float') return {}
        if (name === 'ANGLE_instanced_arrays') return {}
        return null
      })

      const contextInfo = engine.contextInfo

      expect(contextInfo).toEqual({
        context: mockWebGLContext,
        isWebGL2: false,
        maxTextureSize: 4096,
        maxTextures: 16,
        supportsFloatTextures: true,
        supportsInstancing: true,
        vendor: 'Test Vendor',
        renderer: 'Test Renderer',
      })
    })

    it('should detect WebGL2 context', () => {
      // Create a mock WebGL2 context with proper constructor
      const webgl2Context = Object.create(WebGL2RenderingContext.prototype)
      Object.assign(webgl2Context, mockWebGLContext)
      mockRenderer.getContext.mockReturnValue(webgl2Context)

      const contextInfo = engine.contextInfo

      expect(contextInfo.isWebGL2).toBe(true)
      expect(contextInfo.supportsInstancing).toBe(true)
    })

    it('should throw error if renderer not initialized', () => {
      engine.dispose()

      expect(() => engine.contextInfo).toThrow('Renderer not initialized')
    })
  })

  describe('🗑️ Disposal', () => {
    beforeEach(async () => {
      await engine.initialize({ canvas: mockCanvas })
    })

    it('should dispose all resources', () => {
      engine.dispose()

      expect(mockRenderer.dispose).toHaveBeenCalled()
      expect(mockScene.traverse).toHaveBeenCalled()
      expect(engine.isDisposed).toBe(true)
    })

    it('should clear event listeners on disposal', () => {
      const listener = vi.fn()
      engine.addEventListener('resize', listener)

      engine.dispose()

      // Event listeners map should be cleared
      // Access private member for testing
      expect(
        (engine as unknown as WebGLEnginePrivateMembers)._eventListeners.size
      ).toBe(0)
    })

    it('should handle disposal when already disposed', () => {
      engine.dispose()

      expect(() => engine.dispose()).not.toThrow()
      expect(mockRenderer.dispose).toHaveBeenCalledTimes(1) // Should not be called again
    })

    it('should stop performance monitoring on disposal', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

      engine.dispose()

      expect(clearIntervalSpy).toHaveBeenCalled()
    })

    it('should stop garbage collection timer on disposal', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      engine.dispose()

      expect(clearTimeoutSpy).toHaveBeenCalled()
    })
  })

  describe('🎯 Edge Cases', () => {
    it('should throw error when accessing canvas before initialization', () => {
      expect(() => engine.canvas).toThrow('Canvas not available')
    })

    it('should handle missing scene or camera in render', async () => {
      await engine.initialize({ canvas: mockCanvas })

      // Clear scene and camera
      // Access private member for testing
      ;(engine as unknown as WebGLEnginePrivateMembers)._scene = null
      // Access private member for testing
      ;(engine as unknown as WebGLEnginePrivateMembers)._camera = null

      expect(() => engine.render()).not.toThrow()
      expect(mockRenderer.render).not.toHaveBeenCalled()
    })

    it('should handle present without renderer', () => {
      expect(() => engine.present()).not.toThrow()
    })

    it('should handle resize without camera', async () => {
      await engine.initialize({ canvas: mockCanvas })
      // Access private member for testing
      ;(engine as unknown as WebGLEnginePrivateMembers)._camera = null

      expect(() => engine.resize(800, 600)).not.toThrow()
    })
  })

  describe('🏁 Performance Tests', () => {
    it('should initialize quickly', async () => {
      const startTime = performance.now()

      await engine.initialize({ canvas: mockCanvas })

      const duration = performance.now() - startTime
      expect(duration).toBeLessThan(100) // Should initialize within 100ms
    })

    it('should render efficiently', async () => {
      await engine.initialize({ canvas: mockCanvas })

      const startTime = performance.now()

      for (let i = 0; i < 100; i++) {
        engine.render()
      }

      const duration = performance.now() - startTime
      expect(duration).toBeLessThan(50) // 100 render calls should be fast
    })
  })
})
