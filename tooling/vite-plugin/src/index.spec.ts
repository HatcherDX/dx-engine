/**
 * @fileoverview Comprehensive tests for DX Engine Vite plugins.
 *
 * @description
 * Tests all three main plugins (dxEnginePlugin, electronOptimizer, devUtilities)
 * including configuration handling, transformations, optimizations, and edge cases.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ResolvedConfig } from 'vite'
import {
  dxEnginePlugin,
  electronOptimizer,
  devUtilities,
  type DXEnginePluginOptions,
  type ElectronOptimizerOptions,
} from './index'

// Mock terser for minification tests
vi.mock('terser', () => ({
  minify: vi.fn(),
}))

describe('🔌 DX Engine Vite Plugins', () => {
  let mockResolvedConfig: ResolvedConfig
  let mockServer: {
    middlewares: {
      use: ReturnType<typeof vi.fn>
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockResolvedConfig = {
      command: 'serve',
      mode: 'development',
      root: '/test',
      build: {},
      server: {},
      define: {},
      plugins: [],
    } as ResolvedConfig

    mockServer = {
      middlewares: {
        use: vi.fn(),
      },
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('🚀 DX Engine Plugin', () => {
    it('should create plugin with default options', () => {
      const plugin = dxEnginePlugin()

      expect(plugin).toBeDefined()
      expect(plugin.name).toBe('dx-engine')
      expect(plugin.configResolved).toBeDefined()
      expect(plugin.config).toBeDefined()
      expect(plugin.transformIndexHtml).toBeDefined()
      expect(plugin.load).toBeDefined()
      expect(plugin.generateBundle).toBeDefined()
    })

    it('should create plugin with custom options', () => {
      const options: DXEnginePluginOptions = {
        target: 'electron-main',
        enableHMR: false,
        sourceMaps: false,
        env: { TEST_VAR: 'test' },
        devOptimizations: false,
      }

      const plugin = dxEnginePlugin(options)

      expect(plugin).toBeDefined()
      expect(plugin.name).toBe('dx-engine')
    })

    it('should handle configResolved hook', () => {
      const plugin = dxEnginePlugin()

      if (plugin.configResolved) {
        plugin.configResolved(mockResolvedConfig)
      }

      expect(plugin.configResolved).toBeDefined()
    })

    describe('📝 Config Generation', () => {
      it('should generate base configuration', () => {
        const plugin = dxEnginePlugin({
          sourceMaps: true,
          env: { API_URL: 'http://localhost:3000' },
        })

        const config = plugin.config?.(
          { build: {}, define: {} },
          { command: 'build', mode: 'production' }
        )

        expect(config).toBeDefined()
        expect(config?.build?.sourcemap).toBe(true)
        expect(config?.define).toMatchObject({
          __DX_ENGINE_TARGET__: '"electron-renderer"',
          __DX_ENGINE_VERSION__: '"0.3.0"',
          __DX_ENGINE_ENV_API_URL__: '"http://localhost:3000"',
        })
      })

      it('should generate electron-main configuration', () => {
        const plugin = dxEnginePlugin({ target: 'electron-main' })

        const config = plugin.config?.(
          { build: {} },
          { command: 'build', mode: 'production' }
        )

        expect(config?.build?.lib?.entry).toBe('src/main.ts')
        expect(config?.build?.lib?.formats).toEqual(['cjs'])
        expect(config?.build?.lib?.fileName).toBe('main')
        expect(config?.build?.rollupOptions?.external).toContain('electron')
      })

      it('should generate electron-preload configuration', () => {
        const plugin = dxEnginePlugin({ target: 'electron-preload' })

        const config = plugin.config?.(
          { build: {} },
          { command: 'build', mode: 'production' }
        )

        expect(config?.build?.lib?.entry).toBe('src/preload.ts')
        expect(config?.build?.lib?.formats).toEqual(['cjs'])
        expect(config?.build?.lib?.fileName).toBe('preload')
        expect(config?.build?.rollupOptions?.external).toContain('electron')
      })

      it('should generate electron-renderer configuration with HMR', () => {
        mockResolvedConfig.command = 'serve'

        const plugin = dxEnginePlugin({
          target: 'electron-renderer',
          enableHMR: true,
        })

        // Simulate configResolved to set isDev
        if (plugin.configResolved) {
          plugin.configResolved(mockResolvedConfig)
        }

        const config = plugin.config?.(
          { build: {} },
          { command: 'serve', mode: 'development' }
        )

        expect(config?.server?.port).toBe(3000)
        expect(config?.server?.strictPort).toBe(true)
      })

      it('should generate web configuration', () => {
        const plugin = dxEnginePlugin({ target: 'web' })

        const config = plugin.config?.(
          { build: {} },
          { command: 'build', mode: 'production' }
        )

        expect(config?.build?.rollupOptions?.external).toEqual([])
      })
    })

    describe('🔄 HTML Transform', () => {
      it('should transform HTML for electron-renderer', () => {
        const plugin = dxEnginePlugin({ target: 'electron-renderer' })
        const originalHtml = '<html><head></head><body></body></html>'

        const transform = plugin.transformIndexHtml
        if (transform && typeof transform === 'object' && transform.transform) {
          const result = transform.transform(originalHtml, {
            path: '/index.html',
            filename: '/index.html',
            server: mockServer,
            bundle: {},
            chunk: {} as Record<string, unknown>,
          })

          expect(result).toContain('Content-Security-Policy')
          expect(result).toContain('window.__DX_ENGINE_ELECTRON__ = true')
          expect(result).toContain(
            "window.__DX_ENGINE_TARGET__ = 'electron-renderer'"
          )
        }
      })

      it('should not transform HTML for non-electron targets', () => {
        const plugin = dxEnginePlugin({ target: 'web' })
        const originalHtml = '<html><head></head><body></body></html>'

        const transform = plugin.transformIndexHtml
        if (transform && typeof transform === 'object' && transform.transform) {
          const result = transform.transform(originalHtml, {
            path: '/index.html',
            filename: '/index.html',
            server: mockServer,
            bundle: {},
            chunk: {} as Record<string, unknown>,
          })

          expect(result).toBe(originalHtml)
        }
      })
    })

    describe('📦 Virtual Module Loading', () => {
      it('should load virtual dx-engine/env module', () => {
        const plugin = dxEnginePlugin({
          target: 'electron-main',
          env: { TEST: 'value' },
        })

        const result = plugin.load?.('virtual:dx-engine/env')

        expect(result).toContain(
          "export const DX_ENGINE_TARGET = 'electron-main'"
        )
        expect(result).toContain("export const DX_ENGINE_VERSION = '0.3.0'")
        expect(result).toContain('export const IS_ELECTRON = true')
        expect(result).toContain('export const ENV = {"TEST":"value"}')
      })

      it('should not load non-virtual modules', () => {
        const plugin = dxEnginePlugin()

        const result = plugin.load?.('/src/main.ts')

        expect(result).toBeUndefined()
      })
    })

    describe('🎯 Bundle Generation', () => {
      it('should apply dev optimizations for electron-main in development', () => {
        mockResolvedConfig.command = 'serve'

        const plugin = dxEnginePlugin({
          target: 'electron-main',
          devOptimizations: true,
        })

        if (plugin.configResolved) {
          plugin.configResolved(mockResolvedConfig)
        }

        const mockThis = {
          info: vi.fn(),
        }

        plugin.generateBundle?.call(mockThis, {}, {})

        expect(mockThis.info).toHaveBeenCalledWith(
          'Applied development optimizations for Electron main process'
        )
      })

      it('should not apply optimizations for non-electron-main targets', () => {
        const plugin = dxEnginePlugin({ target: 'electron-renderer' })

        const mockThis = {
          info: vi.fn(),
        }

        plugin.generateBundle?.call(mockThis, {}, {})

        expect(mockThis.info).not.toHaveBeenCalled()
      })

      it('should not apply optimizations in production', () => {
        mockResolvedConfig.command = 'build'

        const plugin = dxEnginePlugin({ target: 'electron-main' })

        if (plugin.configResolved) {
          plugin.configResolved(mockResolvedConfig)
        }

        const mockThis = {
          info: vi.fn(),
        }

        plugin.generateBundle?.call(mockThis, {}, {})

        expect(mockThis.info).not.toHaveBeenCalled()
      })
    })

    describe('🧪 Edge Cases', () => {
      it('should handle empty environment variables', () => {
        const plugin = dxEnginePlugin({ env: {} })

        const result = plugin.load?.('virtual:dx-engine/env')

        expect(result).toContain('export const ENV = {}')
      })

      it('should handle undefined config sections', () => {
        const plugin = dxEnginePlugin()

        expect(() => {
          plugin.config?.({}, { command: 'build', mode: 'production' })
        }).not.toThrow()
      })
    })
  })

  describe('⚡ Electron Optimizer Plugin', () => {
    let mockMinify: ReturnType<typeof vi.fn>

    beforeEach(async () => {
      const { minify } = await import('terser')
      mockMinify = minify as unknown as ReturnType<typeof vi.fn>
    })

    it('should create optimizer with default options', () => {
      const plugin = electronOptimizer()

      expect(plugin).toBeDefined()
      expect(plugin.name).toBe('electron-optimizer')
      expect(plugin.apply).toBe('build')
      expect(plugin.config).toBeDefined()
      expect(plugin.generateBundle).toBeDefined()
    })

    it('should create optimizer with custom options', () => {
      const options: ElectronOptimizerOptions = {
        minifyRendererCode: false,
        optimizeNodeModules: false,
        enableTreeShaking: false,
        analyzeBundles: true,
      }

      const plugin = electronOptimizer(options)

      expect(plugin).toBeDefined()
      expect(plugin.name).toBe('electron-optimizer')
    })

    describe('🌳 Tree Shaking Configuration', () => {
      it('should enable tree shaking by default', () => {
        const plugin = electronOptimizer()
        const config = { build: {} }

        plugin.config?.(config)

        expect(config.build.rollupOptions?.treeshake).toEqual({
          moduleSideEffects: false,
          propertyReadSideEffects: false,
          unknownGlobalSideEffects: false,
        })
      })

      it('should not configure tree shaking when disabled', () => {
        const plugin = electronOptimizer({ enableTreeShaking: false })
        const config = { build: {} }

        plugin.config?.(config)

        expect(config.build.rollupOptions?.treeshake).toBeUndefined()
      })

      it('should handle existing build config', () => {
        const plugin = electronOptimizer()
        const config = {
          build: {
            rollupOptions: { external: ['electron'] },
          },
        }

        plugin.config?.(config)

        expect(config.build.rollupOptions.external).toEqual(['electron'])
        expect(config.build.rollupOptions.treeshake).toBeDefined()
      })

      it('should handle undefined build config', () => {
        const plugin = electronOptimizer()
        const config = {}

        plugin.config?.(config)

        expect(config.build).toBeDefined()
        expect(config.build.rollupOptions).toBeDefined()
      })
    })

    describe('🗜️ Code Minification', () => {
      it('should minify entry chunks successfully', async () => {
        mockMinify.mockResolvedValue({ code: 'minified code' })

        const plugin = electronOptimizer({ minifyRendererCode: true })

        const mockBundle = {
          'main.js': {
            type: 'chunk',
            isEntry: true,
            code: 'original code that is much longer',
          },
        }

        const mockThis = {
          info: vi.fn(),
          warn: vi.fn(),
        }

        await plugin.generateBundle?.call(mockThis, {}, mockBundle)

        expect(mockMinify).toHaveBeenCalledWith(
          'original code that is much longer',
          {
            compress: {
              drop_console: false,
              drop_debugger: true,
              pure_funcs: ['console.log', 'console.debug'],
            },
            mangle: {
              keep_fnames: true,
            },
            format: {
              comments: false,
            },
          }
        )

        expect(mockBundle['main.js'].code).toBe('minified code')
        expect(mockThis.info).toHaveBeenCalledWith(
          expect.stringContaining('Minified main.js')
        )
      })

      it('should handle minification errors gracefully', async () => {
        mockMinify.mockRejectedValue(new Error('Minification failed'))

        const plugin = electronOptimizer({ minifyRendererCode: true })

        const mockBundle = {
          'main.js': {
            type: 'chunk',
            isEntry: true,
            code: 'original code',
          },
        }

        const mockThis = {
          info: vi.fn(),
          warn: vi.fn(),
        }

        await plugin.generateBundle?.call(mockThis, {}, mockBundle)

        expect(mockThis.warn).toHaveBeenCalledWith(
          'Failed to minify main.js: Error: Minification failed'
        )
        expect(mockBundle['main.js'].code).toBe('original code')
      })

      it('should skip minification when disabled', async () => {
        const plugin = electronOptimizer({ minifyRendererCode: false })

        const mockBundle = {
          'main.js': {
            type: 'chunk',
            isEntry: true,
            code: 'original code',
          },
        }

        const mockThis = {
          info: vi.fn(),
          warn: vi.fn(),
        }

        await plugin.generateBundle?.call(mockThis, {}, mockBundle)

        expect(mockMinify).not.toHaveBeenCalled()
        expect(mockBundle['main.js'].code).toBe('original code')
      })

      it('should skip non-entry chunks', async () => {
        const plugin = electronOptimizer({ minifyRendererCode: true })

        const mockBundle = {
          'vendor.js': {
            type: 'chunk',
            isEntry: false,
            code: 'vendor code',
          },
        }

        const mockThis = {
          info: vi.fn(),
          warn: vi.fn(),
        }

        await plugin.generateBundle?.call(mockThis, {}, mockBundle)

        expect(mockMinify).not.toHaveBeenCalled()
      })

      it('should skip asset files', async () => {
        const plugin = electronOptimizer({ minifyRendererCode: true })

        const mockBundle = {
          'style.css': {
            type: 'asset',
            source: 'css content',
          },
        }

        const mockThis = {
          info: vi.fn(),
          warn: vi.fn(),
        }

        await plugin.generateBundle?.call(mockThis, {}, mockBundle)

        expect(mockMinify).not.toHaveBeenCalled()
      })

      it('should handle empty minified result', async () => {
        mockMinify.mockResolvedValue({ code: '' })

        const plugin = electronOptimizer({ minifyRendererCode: true })

        const mockBundle = {
          'main.js': {
            type: 'chunk',
            isEntry: true,
            code: 'original code',
          },
        }

        const mockThis = {
          info: vi.fn(),
          warn: vi.fn(),
        }

        await plugin.generateBundle?.call(mockThis, {}, mockBundle)

        expect(mockBundle['main.js'].code).toBe('original code')
      })
    })

    describe('📊 Bundle Analysis', () => {
      it('should analyze bundles when enabled', async () => {
        const plugin = electronOptimizer({ analyzeBundles: true })

        const mockBundle = {
          'main.js': {
            type: 'chunk',
            code: 'code content',
          },
          'style.css': {
            type: 'asset',
            source: 'css content',
          },
        }

        const mockThis = {
          info: vi.fn(),
          warn: vi.fn(),
        }

        await plugin.generateBundle?.call(mockThis, {}, mockBundle)

        expect(mockThis.info).toHaveBeenCalledWith(
          'Bundle analysis:',
          expect.objectContaining({
            totalSize: expect.any(Number),
            chunkCount: 1,
            assetCount: 1,
            largestChunk: 'main.js',
          })
        )
      })

      it('should not analyze bundles when disabled', async () => {
        const plugin = electronOptimizer({ analyzeBundles: false })

        const mockBundle = {
          'main.js': {
            type: 'chunk',
            code: 'code content',
          },
        }

        const mockThis = {
          info: vi.fn(),
          warn: vi.fn(),
        }

        await plugin.generateBundle?.call(mockThis, {}, mockBundle)

        expect(mockThis.info).not.toHaveBeenCalledWith(
          expect.stringContaining('Bundle analysis')
        )
      })
    })

    describe('🧪 Edge Cases', () => {
      it('should handle empty bundle', async () => {
        const plugin = electronOptimizer()
        const mockBundle = {}

        const mockThis = {
          info: vi.fn(),
          warn: vi.fn(),
        }

        await expect(
          plugin.generateBundle?.call(mockThis, {}, mockBundle)
        ).resolves.not.toThrow()
      })

      it('should handle bundle with null values', async () => {
        const plugin = electronOptimizer()
        const mockBundle = {
          'null-chunk': null,
        }

        const mockThis = {
          info: vi.fn(),
          warn: vi.fn(),
        }

        await expect(
          plugin.generateBundle?.call(mockThis, {}, mockBundle)
        ).resolves.not.toThrow()
      })
    })
  })

  describe('🛠️ Development Utilities Plugin', () => {
    it('should create dev utilities plugin', () => {
      const plugin = devUtilities()

      expect(plugin).toBeDefined()
      expect(plugin.name).toBe('dx-engine-dev-utilities')
      expect(plugin.apply).toBe('serve')
      expect(plugin.configureServer).toBeDefined()
      expect(plugin.transform).toBeDefined()
    })

    describe('🌐 Server Configuration', () => {
      it('should configure server with middleware', () => {
        const plugin = devUtilities()

        plugin.configureServer?.(mockServer)

        expect(mockServer.middlewares.use).toHaveBeenCalledWith(
          '/api/dx-engine-info',
          expect.any(Function)
        )
      })

      it('should handle GET requests to dx-engine-info', () => {
        const plugin = devUtilities()

        let middleware: unknown
        mockServer.middlewares.use.mockImplementation(
          (path: string, handler: unknown) => {
            if (path === '/api/dx-engine-info') {
              middleware = handler
            }
          }
        )

        plugin.configureServer?.(mockServer)

        const mockReq = { method: 'GET' }
        const mockRes = {
          setHeader: vi.fn(),
          end: vi.fn(),
        }
        const mockNext = vi.fn()

        // Mock process.uptime for consistent testing
        const originalUptime = process.uptime
        process.uptime = vi.fn(() => 123.45)

        middleware(mockReq, mockRes, mockNext)

        expect(mockRes.setHeader).toHaveBeenCalledWith(
          'Content-Type',
          'application/json'
        )
        expect(mockRes.end).toHaveBeenCalledWith(
          expect.stringContaining('"version":"0.3.0"')
        )
        expect(mockRes.end).toHaveBeenCalledWith(
          expect.stringContaining('"uptime":123.45')
        )

        // Restore original function
        process.uptime = originalUptime
      })

      it('should handle non-GET requests to dx-engine-info', () => {
        const plugin = devUtilities()

        let middleware: unknown
        mockServer.middlewares.use.mockImplementation(
          (path: string, handler: unknown) => {
            if (path === '/api/dx-engine-info') {
              middleware = handler
            }
          }
        )

        plugin.configureServer?.(mockServer)

        const mockReq = { method: 'POST' }
        const mockRes = {
          setHeader: vi.fn(),
          end: vi.fn(),
        }
        const mockNext = vi.fn()

        middleware(mockReq, mockRes, mockNext)

        expect(mockNext).toHaveBeenCalled()
        expect(mockRes.end).not.toHaveBeenCalled()
      })

      it('should include environment target in response', () => {
        const originalTarget = process.env.DX_ENGINE_TARGET
        process.env.DX_ENGINE_TARGET = 'electron-main'

        const plugin = devUtilities()

        let middleware: unknown
        mockServer.middlewares.use.mockImplementation(
          (path: string, handler: unknown) => {
            if (path === '/api/dx-engine-info') {
              middleware = handler
            }
          }
        )

        plugin.configureServer?.(mockServer)

        const mockReq = { method: 'GET' }
        const mockRes = {
          setHeader: vi.fn(),
          end: vi.fn(),
        }
        const mockNext = vi.fn()

        middleware(mockReq, mockRes, mockNext)

        expect(mockRes.end).toHaveBeenCalledWith(
          expect.stringContaining('"target":"electron-main"')
        )

        // Restore original environment
        if (originalTarget !== undefined) {
          process.env.DX_ENGINE_TARGET = originalTarget
        } else {
          delete process.env.DX_ENGINE_TARGET
        }
      })
    })

    describe('🔄 Code Transformation', () => {
      it('should transform TypeScript files', () => {
        const plugin = devUtilities()
        const code = 'export const test = "hello"'
        const id = '/src/test.ts'

        const result = plugin.transform?.(code, id)

        expect(result).toEqual({
          code: `/* DX Engine - File: ${id} */\n${code}`,
          map: null,
        })
      })

      it('should transform JavaScript files', () => {
        const plugin = devUtilities()
        const code = 'const test = "hello"'
        const id = '/src/test.js'

        const result = plugin.transform?.(code, id)

        expect(result).toEqual({
          code: `/* DX Engine - File: ${id} */\n${code}`,
          map: null,
        })
      })

      it('should not transform other file types', () => {
        const plugin = devUtilities()
        const code = 'body { color: red; }'
        const id = '/src/style.css'

        const result = plugin.transform?.(code, id)

        expect(result).toBeUndefined()
      })

      it('should handle empty code', () => {
        const plugin = devUtilities()
        const code = ''
        const id = '/src/empty.js'

        const result = plugin.transform?.(code, id)

        expect(result).toEqual({
          code: `/* DX Engine - File: ${id} */\n`,
          map: null,
        })
      })

      it('should handle files without extension', () => {
        const plugin = devUtilities()
        const code = 'console.log("test")'
        const id = '/src/script'

        const result = plugin.transform?.(code, id)

        expect(result).toBeUndefined()
      })
    })

    describe('🧪 Edge Cases', () => {
      it('should handle server configuration without middlewares', () => {
        const plugin = devUtilities()
        const serverWithoutMiddlewares = {}

        expect(() => {
          // Test plugin configuration with mock server
          plugin.configureServer?.(
            serverWithoutMiddlewares as unknown as Parameters<
              NonNullable<typeof plugin.configureServer>
            >[0]
          )
        }).toThrow()
      })

      it('should handle transformation of very long file paths', () => {
        const plugin = devUtilities()
        const code = 'test'
        const longPath = '/very/long/path/'.repeat(100) + 'file.ts'

        const result = plugin.transform?.(code, longPath)

        expect(result?.code).toContain(longPath)
      })
    })
  })

  describe('🔧 Utility Functions', () => {
    let mockMinify: ReturnType<typeof vi.fn>

    beforeEach(async () => {
      const { minify } = await import('terser')
      mockMinify = minify as unknown as ReturnType<typeof vi.fn>
    })

    it('should test builtin modules function indirectly', () => {
      // Test through electron-main configuration
      const plugin = dxEnginePlugin({ target: 'electron-main' })

      const config = plugin.config?.(
        { build: {} },
        { command: 'build', mode: 'production' }
      )

      expect(config?.build?.rollupOptions?.external).toContain('fs')
      expect(config?.build?.rollupOptions?.external).toContain('path')
      expect(config?.build?.rollupOptions?.external).toContain('crypto')
    })

    it('should test size calculation functions indirectly', async () => {
      mockMinify.mockResolvedValue({ code: 'y'.repeat(5000) }) // Large minified result too

      const plugin = electronOptimizer({ minifyRendererCode: true })

      const mockBundle = {
        'main.js': {
          type: 'chunk',
          isEntry: true,
          code: 'x'.repeat(10000), // Large code to trigger KB formatting
        },
      }

      const mockThis = {
        info: vi.fn(),
        warn: vi.fn(),
      }

      await plugin.generateBundle?.call(mockThis, {}, mockBundle)

      // Should show size savings in the info call with KB units
      expect(mockThis.info).toHaveBeenCalledWith(
        expect.stringContaining('saved')
      )
      expect(mockThis.info).toHaveBeenCalledWith(expect.stringContaining('KB'))
    })

    it('should test bundle analysis functions indirectly', async () => {
      const plugin = electronOptimizer({ analyzeBundles: true })

      const mockBundle = {
        'main.js': {
          type: 'chunk',
          code: 'x'.repeat(1000),
        },
        'vendor.js': {
          type: 'chunk',
          code: 'y'.repeat(2000),
        },
        'style.css': {
          type: 'asset',
          source: 'z'.repeat(500),
        },
      }

      const mockThis = {
        info: vi.fn(),
        warn: vi.fn(),
      }

      await plugin.generateBundle?.call(mockThis, {}, mockBundle)

      expect(mockThis.info).toHaveBeenCalledWith(
        'Bundle analysis:',
        expect.objectContaining({
          totalSize: 3500,
          chunkCount: 2,
          assetCount: 1,
          largestChunk: 'vendor.js',
        })
      )
    })
  })
})
