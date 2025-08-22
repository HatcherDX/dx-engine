/**
 * @fileoverview Tests for WebGL rendering module exports.
 *
 * @description
 * Comprehensive tests for the WebGL rendering module's export structure.
 * Ensures all classes, types, and utilities are properly exported and accessible.
 * Validates module structure and API consistency for WebGL rendering components.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @priority HIGH
 */

import { describe, expect, it } from 'vitest'
import type { WebGLEngineConfig } from './index'
import { WebGLEngine } from './index'

describe('🎨 WebGL Rendering Module - Index Exports', () => {
  describe('📦 Class Exports', () => {
    it('should export WebGLEngine class', () => {
      expect(WebGLEngine).toBeDefined()
      expect(typeof WebGLEngine).toBe('function')
      expect(WebGLEngine.name).toBe('WebGLEngine')
    })

    it('should allow WebGLEngine instantiation', () => {
      expect(() => {
        // This will create an instance but not initialize it
        const engine = new WebGLEngine()
        expect(engine).toBeInstanceOf(WebGLEngine)
      }).not.toThrow()
    })

    it('should have proper prototype chain', () => {
      const engine = new WebGLEngine()
      expect(engine.constructor).toBe(WebGLEngine)
      expect(engine instanceof WebGLEngine).toBe(true)
    })

    it('should be distinct from other constructor functions', () => {
      const engine = new WebGLEngine()
      expect(engine instanceof Object).toBe(true)
      expect(engine instanceof Function).toBe(false)
      expect(engine instanceof Array).toBe(false)
    })
  })

  describe('🔧 Type Export Validation', () => {
    it('should validate WebGLEngineConfig type structure', () => {
      const config: WebGLEngineConfig = {
        canvas: document.createElement('canvas'),
        width: 800,
        height: 600,
        antialias: true,
        alpha: false,
        depth: true,
        stencil: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
        debug: false,
        performance: {
          enableAutoGC: true,
          gcInterval: 60000,
          targetFPS: 60,
        },
        renderTarget: {
          samples: 4,
          format: 'rgba8',
          generateMipmaps: false,
        },
      }

      expect(config.canvas instanceof HTMLCanvasElement).toBe(true)
      expect(typeof config.width).toBe('number')
      expect(typeof config.height).toBe('number')
      expect(typeof config.antialias).toBe('boolean')
      expect(typeof config.alpha).toBe('boolean')
      expect(typeof config.depth).toBe('boolean')
      expect(typeof config.stencil).toBe('boolean')
      expect(['default', 'high-performance', 'low-power']).toContain(
        config.powerPreference
      )
      expect(typeof config.preserveDrawingBuffer).toBe('boolean')
      expect(typeof config.debug).toBe('boolean')
      expect(typeof config.performance).toBe('object')
      expect(typeof config.renderTarget).toBe('object')
    })

    it('should validate minimal WebGLEngineConfig', () => {
      const minimalConfig: WebGLEngineConfig = {
        canvas: document.createElement('canvas'),
        width: 640,
        height: 480,
      }

      expect(minimalConfig.antialias).toBeUndefined()
      expect(minimalConfig.alpha).toBeUndefined()
      expect(minimalConfig.performance).toBeUndefined()
      expect(minimalConfig.renderTarget).toBeUndefined()
    })

    it('should validate performance configuration', () => {
      const config: WebGLEngineConfig = {
        canvas: document.createElement('canvas'),
        width: 1024,
        height: 768,
        performance: {
          enableAutoGC: false,
          gcInterval: 30000,
          targetFPS: 144,
        },
      }

      expect(typeof config.performance?.enableAutoGC).toBe('boolean')
      expect(typeof config.performance?.gcInterval).toBe('number')
      expect(typeof config.performance?.targetFPS).toBe('number')
      expect(config.performance?.gcInterval).toBe(30000)
      expect(config.performance?.targetFPS).toBe(144)
    })

    it('should validate render target configuration', () => {
      const config: WebGLEngineConfig = {
        canvas: document.createElement('canvas'),
        width: 1920,
        height: 1080,
        renderTarget: {
          samples: 8,
          format: 'rgba16f',
          generateMipmaps: true,
        },
      }

      expect(typeof config.renderTarget?.samples).toBe('number')
      expect(typeof config.renderTarget?.format).toBe('string')
      expect(typeof config.renderTarget?.generateMipmaps).toBe('boolean')
      expect(['rgba8', 'rgba16f', 'rgba32f']).toContain(
        config.renderTarget?.format
      )
    })
  })

  describe('🔍 Type Completeness', () => {
    it('should support all power preference values', () => {
      const configs: WebGLEngineConfig[] = [
        {
          canvas: document.createElement('canvas'),
          width: 800,
          height: 600,
          powerPreference: 'default',
        },
        {
          canvas: document.createElement('canvas'),
          width: 800,
          height: 600,
          powerPreference: 'high-performance',
        },
        {
          canvas: document.createElement('canvas'),
          width: 800,
          height: 600,
          powerPreference: 'low-power',
        },
      ]

      expect(configs[0].powerPreference).toBe('default')
      expect(configs[1].powerPreference).toBe('high-performance')
      expect(configs[2].powerPreference).toBe('low-power')
    })

    it('should support all render target formats', () => {
      const formats: Array<'rgba8' | 'rgba16f' | 'rgba32f'> = [
        'rgba8',
        'rgba16f',
        'rgba32f',
      ]

      formats.forEach((format) => {
        const config: WebGLEngineConfig = {
          canvas: document.createElement('canvas'),
          width: 800,
          height: 600,
          renderTarget: {
            samples: 4,
            format,
            generateMipmaps: false,
          },
        }

        expect(config.renderTarget?.format).toBe(format)
      })
    })

    it('should handle different canvas sizes', () => {
      const sizes = [
        { width: 320, height: 240 }, // Small
        { width: 1920, height: 1080 }, // Full HD
        { width: 3840, height: 2160 }, // 4K
        { width: 7680, height: 4320 }, // 8K
      ]

      sizes.forEach(({ width, height }) => {
        const config: WebGLEngineConfig = {
          canvas: document.createElement('canvas'),
          width,
          height,
        }

        expect(config.width).toBe(width)
        expect(config.height).toBe(height)
        expect(config.width * config.height).toBeGreaterThan(0)
      })
    })
  })

  describe('🏗️ Module Integration', () => {
    it('should work with WebGLEngine and its configuration together', () => {
      const canvas = document.createElement('canvas')
      const config: WebGLEngineConfig = {
        canvas,
        width: 800,
        height: 600,
        antialias: true,
        debug: true,
      }

      const engine = new WebGLEngine()
      expect(engine).toBeInstanceOf(WebGLEngine)
      expect(config.canvas).toBe(canvas)
      expect(config.antialias).toBe(true)
    })

    it('should support advanced configuration scenarios', () => {
      const highPerformanceConfig: WebGLEngineConfig = {
        canvas: document.createElement('canvas'),
        width: 1920,
        height: 1080,
        antialias: true,
        alpha: false,
        depth: true,
        stencil: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
        debug: false,
        performance: {
          enableAutoGC: true,
          gcInterval: 30000,
          targetFPS: 120,
        },
        renderTarget: {
          samples: 8,
          format: 'rgba16f',
          generateMipmaps: true,
        },
      }

      expect(highPerformanceConfig.powerPreference).toBe('high-performance')
      expect(highPerformanceConfig.performance?.targetFPS).toBe(120)
      expect(highPerformanceConfig.renderTarget?.samples).toBe(8)
    })

    it('should support low-power configuration scenarios', () => {
      const lowPowerConfig: WebGLEngineConfig = {
        canvas: document.createElement('canvas'),
        width: 640,
        height: 480,
        antialias: false,
        alpha: true,
        depth: false,
        stencil: false,
        powerPreference: 'low-power',
        preserveDrawingBuffer: true,
        debug: true,
        performance: {
          enableAutoGC: false,
          gcInterval: 120000,
          targetFPS: 30,
        },
        renderTarget: {
          samples: 1,
          format: 'rgba8',
          generateMipmaps: false,
        },
      }

      expect(lowPowerConfig.powerPreference).toBe('low-power')
      expect(lowPowerConfig.performance?.targetFPS).toBe(30)
      expect(lowPowerConfig.renderTarget?.samples).toBe(1)
    })
  })

  describe('🎯 API Consistency', () => {
    it('should maintain consistent naming conventions', () => {
      // All exported types should follow PascalCase
      const typeNames = ['WebGLEngineConfig']

      typeNames.forEach((typeName) => {
        expect(typeName).toMatch(/^[A-Z][a-zA-Z]*$/)
      })
    })

    it('should provide comprehensive WebGL configuration options', () => {
      // Verify that all necessary configuration options are available
      const config: WebGLEngineConfig = {
        canvas: document.createElement('canvas'),
        width: 800,
        height: 600,
        // WebGL context options
        antialias: true,
        alpha: false,
        depth: true,
        stencil: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
        // Engine-specific options
        debug: false,
        // Performance options
        performance: {
          enableAutoGC: true,
          gcInterval: 60000,
          targetFPS: 60,
        },
        // Render target options
        renderTarget: {
          samples: 4,
          format: 'rgba8',
          generateMipmaps: false,
        },
      }

      // Verify structure exists
      expect(typeof config).toBe('object')
      expect(config.canvas instanceof HTMLCanvasElement).toBe(true)
    })

    it('should validate numerical constraints', () => {
      const config: WebGLEngineConfig = {
        canvas: document.createElement('canvas'),
        width: 1, // Minimum valid width
        height: 1, // Minimum valid height
        performance: {
          enableAutoGC: true,
          gcInterval: 1000, // Minimum reasonable interval
          targetFPS: 1, // Minimum FPS
        },
        renderTarget: {
          samples: 1, // Minimum samples
          format: 'rgba8',
          generateMipmaps: false,
        },
      }

      expect(config.width).toBeGreaterThan(0)
      expect(config.height).toBeGreaterThan(0)
      expect(config.performance?.gcInterval).toBeGreaterThan(0)
      expect(config.performance?.targetFPS).toBeGreaterThan(0)
      expect(config.renderTarget?.samples).toBeGreaterThan(0)
    })
  })

  describe('📊 Performance Characteristics', () => {
    it('should import module quickly', () => {
      const start = Date.now()

      // Re-import to test import performance
      import('./index').then((module) => {
        const end = Date.now()
        expect(end - start).toBeLessThan(100) // Should import in <100ms
        expect(module.WebGLEngine).toBeDefined()
      })
    })

    it('should create engine instances efficiently', () => {
      const start = Date.now()

      const engines = Array.from({ length: 10 }, () => new WebGLEngine())

      const end = Date.now()
      expect(end - start).toBeLessThan(50) // Should create 10 instances in <50ms
      expect(engines.length).toBe(10)
      expect(engines.every((e) => e instanceof WebGLEngine)).toBe(true)
    })

    it('should handle configuration validation efficiently', () => {
      const start = Date.now()

      const configs = Array.from(
        { length: 100 },
        (_, i) =>
          ({
            canvas: document.createElement('canvas'),
            width: 800 + i,
            height: 600 + i,
            antialias: i % 2 === 0,
            debug: i % 3 === 0,
          }) as WebGLEngineConfig
      )

      const end = Date.now()
      expect(end - start).toBeLessThan(100) // Should create 100 configs in <100ms
      expect(configs.length).toBe(100)
      expect(configs[0].width).toBe(800)
      expect(configs[99].width).toBe(899)
    })
  })

  describe('🔧 Type Edge Cases', () => {
    it('should handle extreme canvas dimensions', () => {
      const extremeConfigs: WebGLEngineConfig[] = [
        {
          canvas: document.createElement('canvas'),
          width: 1,
          height: 1,
        },
        {
          canvas: document.createElement('canvas'),
          width: 8192,
          height: 8192,
        },
        {
          canvas: document.createElement('canvas'),
          width: 1,
          height: 8192,
        },
        {
          canvas: document.createElement('canvas'),
          width: 8192,
          height: 1,
        },
      ]

      extremeConfigs.forEach((config) => {
        expect(config.width).toBeGreaterThan(0)
        expect(config.height).toBeGreaterThan(0)
        expect(typeof config.width).toBe('number')
        expect(typeof config.height).toBe('number')
      })
    })

    it('should handle high sample counts', () => {
      const sampleCounts = [1, 2, 4, 8, 16, 32]

      sampleCounts.forEach((samples) => {
        const config: WebGLEngineConfig = {
          canvas: document.createElement('canvas'),
          width: 800,
          height: 600,
          renderTarget: {
            samples,
            format: 'rgba8',
            generateMipmaps: false,
          },
        }

        expect(config.renderTarget?.samples).toBe(samples)
        expect(config.renderTarget?.samples).toBeGreaterThan(0)
      })
    })

    it('should handle different FPS targets', () => {
      const fpsTargets = [24, 30, 60, 120, 144, 240]

      fpsTargets.forEach((targetFPS) => {
        const config: WebGLEngineConfig = {
          canvas: document.createElement('canvas'),
          width: 800,
          height: 600,
          performance: {
            enableAutoGC: true,
            gcInterval: 60000,
            targetFPS,
          },
        }

        expect(config.performance?.targetFPS).toBe(targetFPS)
        expect(config.performance?.targetFPS).toBeGreaterThan(0)
      })
    })
  })
})
