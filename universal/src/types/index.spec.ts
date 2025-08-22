/**
 * @fileoverview Comprehensive tests for shared rendering engine types.
 *
 * @description
 * Tests type definitions, interfaces, and type checking for the shared
 * rendering engine types. Validates that interfaces are correctly structured
 * and type guards work as expected.
 */

import { describe, it, expect, vi } from 'vitest'
import type {
  WebGLContextInfo,
  WebGLRendererConfig,
  PerformanceConfig,
  PerformanceMetrics,
  RenderTargetConfig,
  CameraConfig,
  Vector3,
  Vector2,
  Color,
  MaterialConfig,
  GeometryData,
  UniformData,
  RenderCommand,
  RendererEventListener,
  RendererEvents,
  Disposable,
  BaseRenderer,
} from './index'

describe('🎯 Shared Rendering Engine Types', () => {
  describe('📊 WebGL Context Types', () => {
    it('should define WebGLContextInfo interface correctly', () => {
      const mockWebGLContext = {} as WebGLRenderingContext

      const contextInfo: WebGLContextInfo = {
        context: mockWebGLContext,
        isWebGL2: false,
        maxTextureSize: 4096,
        maxTextures: 16,
        supportsFloatTextures: true,
        supportsInstancing: false,
        vendor: 'Test Vendor',
        renderer: 'Test Renderer',
      }

      expect(contextInfo.context).toBe(mockWebGLContext)
      expect(contextInfo.isWebGL2).toBe(false)
      expect(contextInfo.maxTextureSize).toBe(4096)
      expect(contextInfo.maxTextures).toBe(16)
      expect(contextInfo.supportsFloatTextures).toBe(true)
      expect(contextInfo.supportsInstancing).toBe(false)
      expect(contextInfo.vendor).toBe('Test Vendor')
      expect(contextInfo.renderer).toBe('Test Renderer')
    })

    it('should support WebGL2 context in WebGLContextInfo', () => {
      const mockWebGL2Context = {} as WebGL2RenderingContext

      const contextInfo: WebGLContextInfo = {
        context: mockWebGL2Context,
        isWebGL2: true,
        maxTextureSize: 8192,
        maxTextures: 32,
        supportsFloatTextures: true,
        supportsInstancing: true,
        vendor: 'Advanced GPU',
        renderer: 'WebGL2 Renderer',
      }

      expect(contextInfo.isWebGL2).toBe(true)
      expect(contextInfo.supportsInstancing).toBe(true)
    })
  })

  describe('⚙️ Configuration Types', () => {
    it('should define WebGLRendererConfig interface correctly', () => {
      const mockCanvas = document.createElement('canvas')

      const config: WebGLRendererConfig = {
        canvas: mockCanvas,
        antialias: true,
        alpha: false,
        depth: true,
        stencil: false,
        preserveDrawingBuffer: false,
        failIfMajorPerformanceCaveat: false,
        powerPreference: 'high-performance',
      }

      expect(config.canvas).toBe(mockCanvas)
      expect(config.antialias).toBe(true)
      expect(config.alpha).toBe(false)
      expect(config.powerPreference).toBe('high-performance')
    })

    it('should support minimal WebGLRendererConfig', () => {
      const mockCanvas = document.createElement('canvas')

      const config: WebGLRendererConfig = {
        canvas: mockCanvas,
      }

      expect(config.canvas).toBe(mockCanvas)
      expect(config.antialias).toBeUndefined()
      expect(config.alpha).toBeUndefined()
    })

    it('should define PerformanceConfig interface correctly', () => {
      const config: PerformanceConfig = {
        enabled: true,
        collectInterval: 1000,
        maxSamples: 60,
        enableMemoryMonitoring: true,
        enableFrameTimeTracking: true,
      }

      expect(config.enabled).toBe(true)
      expect(config.collectInterval).toBe(1000)
      expect(config.maxSamples).toBe(60)
      expect(config.enableMemoryMonitoring).toBe(true)
      expect(config.enableFrameTimeTracking).toBe(true)
    })

    it('should define RenderTargetConfig interface correctly', () => {
      const config: RenderTargetConfig = {
        width: 1920,
        height: 1080,
        multisampling: true,
        samples: 4,
        floatingPoint: false,
        depth: true,
        stencil: false,
      }

      expect(config.width).toBe(1920)
      expect(config.height).toBe(1080)
      expect(config.multisampling).toBe(true)
      expect(config.samples).toBe(4)
    })

    it('should define CameraConfig for perspective camera', () => {
      const config: CameraConfig = {
        type: 'perspective',
        fov: 75,
        aspect: 16 / 9,
        near: 0.1,
        far: 1000,
      }

      expect(config.type).toBe('perspective')
      expect(config.fov).toBe(75)
      expect(config.aspect).toBe(16 / 9)
      expect(config.near).toBe(0.1)
      expect(config.far).toBe(1000)
    })

    it('should define CameraConfig for orthographic camera', () => {
      const config: CameraConfig = {
        type: 'orthographic',
        aspect: 1,
        near: 0.1,
        far: 1000,
        left: -10,
        right: 10,
        top: 10,
        bottom: -10,
      }

      expect(config.type).toBe('orthographic')
      expect(config.left).toBe(-10)
      expect(config.right).toBe(10)
      expect(config.top).toBe(10)
      expect(config.bottom).toBe(-10)
    })
  })

  describe('📈 Performance Types', () => {
    it('should define PerformanceMetrics interface correctly', () => {
      const metrics: PerformanceMetrics = {
        fps: 60,
        frameTime: 16.67,
        gpuMemoryUsage: 128 * 1024 * 1024, // 128MB
        drawCalls: 25,
        vertices: 10000,
        triangles: 5000,
        timestamp: Date.now(),
      }

      expect(metrics.fps).toBe(60)
      expect(metrics.frameTime).toBe(16.67)
      expect(metrics.gpuMemoryUsage).toBe(128 * 1024 * 1024)
      expect(metrics.drawCalls).toBe(25)
      expect(metrics.vertices).toBe(10000)
      expect(metrics.triangles).toBe(5000)
      expect(typeof metrics.timestamp).toBe('number')
    })

    it('should support PerformanceMetrics without optional properties', () => {
      const metrics: PerformanceMetrics = {
        fps: 30,
        frameTime: 33.33,
        drawCalls: 10,
        vertices: 5000,
        triangles: 2500,
        timestamp: Date.now(),
      }

      expect(metrics.gpuMemoryUsage).toBeUndefined()
      expect(metrics.fps).toBe(30)
      expect(metrics.frameTime).toBe(33.33)
    })
  })

  describe('🎨 Rendering Types', () => {
    it('should define Vector3 interface correctly', () => {
      const vector: Vector3 = { x: 1.5, y: -2.0, z: 3.7 }

      expect(vector.x).toBe(1.5)
      expect(vector.y).toBe(-2.0)
      expect(vector.z).toBe(3.7)
    })

    it('should define Vector2 interface correctly', () => {
      const vector: Vector2 = { x: 100, y: 200 }

      expect(vector.x).toBe(100)
      expect(vector.y).toBe(200)
    })

    it('should define Color interface correctly', () => {
      const color: Color = { r: 0.8, g: 0.2, b: 0.4, a: 1.0 }

      expect(color.r).toBe(0.8)
      expect(color.g).toBe(0.2)
      expect(color.b).toBe(0.4)
      expect(color.a).toBe(1.0)
    })

    it('should define MaterialConfig interface correctly', () => {
      const mockTexture = {} as WebGLTexture
      const mockShader = {} as WebGLProgram

      const material: MaterialConfig = {
        color: { r: 1, g: 0, b: 0, a: 1 },
        texture: mockTexture,
        shader: mockShader,
        transparent: true,
        opacity: 0.8,
        blending: 'additive',
      }

      expect(material.color).toEqual({ r: 1, g: 0, b: 0, a: 1 })
      expect(material.texture).toBe(mockTexture)
      expect(material.shader).toBe(mockShader)
      expect(material.transparent).toBe(true)
      expect(material.opacity).toBe(0.8)
      expect(material.blending).toBe('additive')
    })

    it('should define GeometryData interface correctly', () => {
      const geometry: GeometryData = {
        positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
        uvs: new Float32Array([0, 0, 1, 0, 0, 1]),
        colors: new Float32Array([1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1]),
        indices: new Uint16Array([0, 1, 2]),
      }

      expect(geometry.positions).toBeInstanceOf(Float32Array)
      expect(geometry.positions.length).toBe(9)
      expect(geometry.normals).toBeInstanceOf(Float32Array)
      expect(geometry.uvs).toBeInstanceOf(Float32Array)
      expect(geometry.colors).toBeInstanceOf(Float32Array)
      expect(geometry.indices).toBeInstanceOf(Uint16Array)
    })

    it('should support GeometryData with minimal properties', () => {
      const geometry: GeometryData = {
        positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      }

      expect(geometry.positions).toBeInstanceOf(Float32Array)
      expect(geometry.normals).toBeUndefined()
      expect(geometry.uvs).toBeUndefined()
      expect(geometry.colors).toBeUndefined()
      expect(geometry.indices).toBeUndefined()
    })

    it('should support Uint32Array indices in GeometryData', () => {
      const geometry: GeometryData = {
        positions: new Float32Array([0, 0, 0]),
        indices: new Uint32Array([0, 1, 2]),
      }

      expect(geometry.indices).toBeInstanceOf(Uint32Array)
    })

    it('should define UniformData interface correctly', () => {
      const floatUniform: UniformData = {
        name: 'uOpacity',
        type: 'float',
        value: 0.5,
      }

      const vec3Uniform: UniformData = {
        name: 'uColor',
        type: 'vec3',
        value: [1, 0, 0],
      }

      const textureUniform: UniformData = {
        name: 'uTexture',
        type: 'sampler2D',
        value: {} as WebGLTexture,
      }

      expect(floatUniform.name).toBe('uOpacity')
      expect(floatUniform.type).toBe('float')
      expect(floatUniform.value).toBe(0.5)

      expect(vec3Uniform.name).toBe('uColor')
      expect(vec3Uniform.type).toBe('vec3')
      expect(vec3Uniform.value).toEqual([1, 0, 0])

      expect(textureUniform.name).toBe('uTexture')
      expect(textureUniform.type).toBe('sampler2D')
      expect(textureUniform.value).toBeInstanceOf(Object)
    })

    it('should define RenderCommand interface correctly', () => {
      const command: RenderCommand = {
        geometry: {
          positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        },
        material: {
          color: { r: 1, g: 1, b: 1, a: 1 },
        },
        modelMatrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        priority: 100,
      }

      expect(command.geometry.positions).toBeInstanceOf(Float32Array)
      expect(command.material.color).toEqual({ r: 1, g: 1, b: 1, a: 1 })
      expect(command.modelMatrix).toHaveLength(16)
      expect(command.priority).toBe(100)
    })
  })

  describe('🎧 Event Types', () => {
    it('should define RendererEventListener type correctly', () => {
      const listener: RendererEventListener<{ width: number; height: number }> =
        vi.fn()

      listener({ width: 800, height: 600 })

      expect(listener).toHaveBeenCalledWith({ width: 800, height: 600 })
    })

    it('should define RendererEvents interface correctly', () => {
      const contextLostListener: RendererEventListener<void> = vi.fn()
      const resizeListener: RendererEventListener<{
        width: number
        height: number
      }> = vi.fn()
      const errorListener: RendererEventListener<Error> = vi.fn()

      const events = {
        'context-lost': contextLostListener,
        'context-restored': contextLostListener,
        resize: resizeListener,
        'performance-warning': vi.fn(),
        error: errorListener,
      }

      expect(typeof events['context-lost']).toBe('function')
      expect(typeof events['resize']).toBe('function')
      expect(typeof events['error']).toBe('function')
    })

    it('should handle performance warning event type', () => {
      const performanceListener: RendererEventListener<{
        message: string
        metrics: PerformanceMetrics
      }> = vi.fn()

      const warningData = {
        message: 'Low FPS detected',
        metrics: {
          fps: 15,
          frameTime: 66.67,
          drawCalls: 100,
          vertices: 50000,
          triangles: 25000,
          timestamp: Date.now(),
        },
      }

      performanceListener(warningData)

      expect(performanceListener).toHaveBeenCalledWith(warningData)
    })
  })

  describe('🗑️ Disposal Types', () => {
    it('should define Disposable interface correctly', () => {
      const disposable: Disposable = {
        dispose: vi.fn(),
        isDisposed: false,
      }

      expect(typeof disposable.dispose).toBe('function')
      expect(disposable.isDisposed).toBe(false)
    })

    it('should handle disposed state', () => {
      const disposable: Disposable = {
        dispose: vi.fn(),
        isDisposed: true,
      }

      expect(disposable.isDisposed).toBe(true)
    })
  })

  describe('🎭 Base Renderer Interface', () => {
    it('should define BaseRenderer interface correctly', () => {
      const mockCanvas = document.createElement('canvas')
      const mockContextInfo: WebGLContextInfo = {
        context: {} as WebGLRenderingContext,
        isWebGL2: false,
        maxTextureSize: 4096,
        maxTextures: 16,
        supportsFloatTextures: true,
        supportsInstancing: false,
        vendor: 'Test',
        renderer: 'Test',
      }
      const mockMetrics: PerformanceMetrics = {
        fps: 60,
        frameTime: 16.67,
        drawCalls: 10,
        vertices: 1000,
        triangles: 500,
        timestamp: Date.now(),
      }

      const renderer: BaseRenderer = {
        contextInfo: mockContextInfo,
        performanceMetrics: mockMetrics,
        canvas: mockCanvas,
        isDisposed: false,
        initialize: vi.fn(),
        resize: vi.fn(),
        clear: vi.fn(),
        present: vi.fn(),
        dispose: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }

      expect(renderer.contextInfo).toBe(mockContextInfo)
      expect(renderer.performanceMetrics).toBe(mockMetrics)
      expect(renderer.canvas).toBe(mockCanvas)
      expect(typeof renderer.initialize).toBe('function')
      expect(typeof renderer.resize).toBe('function')
      expect(typeof renderer.clear).toBe('function')
      expect(typeof renderer.present).toBe('function')
      expect(typeof renderer.dispose).toBe('function')
      expect(typeof renderer.addEventListener).toBe('function')
      expect(typeof renderer.removeEventListener).toBe('function')
    })
  })

  describe('🎯 Type Validation', () => {
    it('should validate blending mode types', () => {
      const blendingModes: MaterialConfig['blending'][] = [
        'normal',
        'additive',
        'subtractive',
        'multiply',
      ]

      blendingModes.forEach((mode) => {
        const material: MaterialConfig = { blending: mode }
        expect(material.blending).toBe(mode)
      })
    })

    it('should validate power preference types', () => {
      const powerPreferences: WebGLRendererConfig['powerPreference'][] = [
        'default',
        'high-performance',
        'low-power',
      ]

      powerPreferences.forEach((preference) => {
        const config: WebGLRendererConfig = {
          canvas: document.createElement('canvas'),
          powerPreference: preference,
        }
        expect(config.powerPreference).toBe(preference)
      })
    })

    it('should validate uniform types', () => {
      const uniformTypes: UniformData['type'][] = [
        'float',
        'vec2',
        'vec3',
        'vec4',
        'mat3',
        'mat4',
        'sampler2D',
      ]

      uniformTypes.forEach((type) => {
        const uniform: UniformData = {
          name: `test_${type}`,
          type,
          value: type === 'sampler2D' ? ({} as WebGLTexture) : 1.0,
        }
        expect(uniform.type).toBe(type)
      })
    })

    it('should validate camera types', () => {
      const cameraTypes: CameraConfig['type'][] = [
        'perspective',
        'orthographic',
      ]

      cameraTypes.forEach((type) => {
        const config: CameraConfig = {
          type,
          aspect: 1,
          near: 0.1,
          far: 1000,
        }
        expect(config.type).toBe(type)
      })
    })
  })

  describe('🔄 Complex Type Interactions', () => {
    it('should work with nested type structures', () => {
      const complexRenderCommand: RenderCommand = {
        geometry: {
          positions: new Float32Array([
            -1,
            -1,
            0, // Bottom left
            1,
            -1,
            0, // Bottom right
            0,
            1,
            0, // Top center
          ]),
          normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
          uvs: new Float32Array([0, 0, 1, 0, 0.5, 1]),
          colors: new Float32Array([
            1,
            0,
            0,
            1, // Red
            0,
            1,
            0,
            1, // Green
            0,
            0,
            1,
            1, // Blue
          ]),
          indices: new Uint16Array([0, 1, 2]),
        },
        material: {
          color: { r: 1, g: 1, b: 1, a: 1 },
          transparent: false,
          opacity: 1.0,
          blending: 'normal',
        },
        modelMatrix: [
          1,
          0,
          0,
          0,
          0,
          1,
          0,
          0,
          0,
          0,
          1,
          0,
          5,
          10,
          -3,
          1, // Translation
        ],
        priority: 50,
      }

      expect(complexRenderCommand.geometry.positions.length).toBe(9)
      expect(complexRenderCommand.geometry.indices?.length).toBe(3)
      expect(complexRenderCommand.material.color?.r).toBe(1)
      expect(complexRenderCommand.modelMatrix[12]).toBe(5) // X translation
      expect(complexRenderCommand.priority).toBe(50)
    })

    it('should support event listener with specific event types', () => {
      const eventMap = new Map<keyof RendererEvents, RendererEventListener>()

      eventMap.set('context-lost', () => {
        console.log('WebGL context lost')
      })

      eventMap.set('resize', (data: { width: number; height: number }) => {
        console.log(`Resized to ${data.width}x${data.height}`)
      })

      eventMap.set(
        'performance-warning',
        (data: { message: string; metrics: PerformanceMetrics }) => {
          console.log(`Performance warning: ${data.message}`)
        }
      )

      eventMap.set('error', (error: Error) => {
        console.error('Renderer error:', error)
      })

      expect(eventMap.size).toBe(4)
      expect(eventMap.has('context-lost')).toBe(true)
      expect(eventMap.has('resize')).toBe(true)
    })
  })
})
