/**
 * @fileoverview Vite plugins for Hatcher DX Engine
 *
 * @description
 * Collection of custom Vite plugins specifically designed for the DX Engine
 * development workflow. Provides optimizations, transformations, and utilities
 * for building high-performance desktop applications with Electron.
 *
 * @example
 * ```typescript
 * import { dxEnginePlugin, electronOptimizer } from '@hatcherdx/dx-engine-vite-plugin'
 * import { defineConfig } from 'vite'
 *
 * export default defineConfig({
 *   plugins: [
 *     dxEnginePlugin({
 *       target: 'electron-renderer',
 *       enableHMR: true
 *     }),
 *     electronOptimizer({
 *       minifyRendererCode: true,
 *       optimizeNodeModules: true
 *     })
 *   ]
 * })
 * ```
 *
 * @author Hatcher DX Team
 * @since 0.3.0
 * @public
 */

import { minify } from 'terser'

/**
 * Bundle item types for analysis
 */
interface BundleChunk {
  type: 'chunk'
  code: string
}

interface BundleAsset {
  type: 'asset'
  source: string | Uint8Array
}

type BundleItem = BundleChunk | BundleAsset

/**
import type { Plugin, ResolvedConfig, UserConfig } from 'vite'

/**
 * Configuration options for the DX Engine Vite plugin.
 *
 * @public
 */
export interface DXEnginePluginOptions {
  /** Build target environment */
  target?: 'electron-main' | 'electron-renderer' | 'electron-preload' | 'web'
  /** Enable Hot Module Replacement for development */
  enableHMR?: boolean
  /** Enable source map generation */
  sourceMaps?: boolean
  /** Custom environment variables to inject */
  env?: Record<string, string>
  /** Enable development mode optimizations */
  devOptimizations?: boolean
}

/**
 * Configuration options for Electron optimizer plugin.
 *
 * @public
 */
export interface ElectronOptimizerOptions {
  /** Minify renderer process code */
  minifyRendererCode?: boolean
  /** Optimize node_modules for Electron */
  optimizeNodeModules?: boolean
  /** Enable tree shaking for unused exports */
  enableTreeShaking?: boolean
  /** Bundle size analysis */
  analyzeBundles?: boolean
}

/**
 * Main DX Engine Vite plugin for development and build optimizations.
 *
 * @param options - Plugin configuration options
 * @returns Vite plugin instance
 *
 * @example
 * ```typescript
 * import { dxEnginePlugin } from '@hatcherdx/dx-engine-vite-plugin'
 *
 * export default defineConfig({
 *   plugins: [
 *     dxEnginePlugin({
 *       target: 'electron-renderer',
 *       enableHMR: true,
 *       devOptimizations: true
 *     })
 *   ]
 * })
 * ```
 *
 * @public
 */
export function dxEnginePlugin(options: DXEnginePluginOptions = {}): Plugin {
  const {
    target = 'electron-renderer',
    enableHMR = true,
    sourceMaps = true,
    env = {},
    devOptimizations = true,
  } = options

  let config: ResolvedConfig
  let isDev = false

  return {
    name: 'dx-engine',
    configResolved(resolvedConfig) {
      config = resolvedConfig
      isDev = config.command === 'serve'
    },

    config() {
      // Base configuration for all targets
      const baseConfig = {
        build: {
          sourcemap: sourceMaps,
          rollupOptions: {
            external: target.startsWith('electron') ? ['electron'] : [],
          },
        },
        define: {
          __DX_ENGINE_TARGET__: JSON.stringify(target),
          __DX_ENGINE_VERSION__: JSON.stringify('0.3.0'),
          ...Object.fromEntries(
            Object.entries(env).map(([key, value]) => [
              `__DX_ENGINE_ENV_${key.toUpperCase()}__`,
              JSON.stringify(value),
            ])
          ),
        },
      }

      // Target-specific configurations
      if (target === 'electron-main') {
        Object.assign(baseConfig, {
          build: {
            ...baseConfig.build,
            lib: {
              entry: 'src/main.ts',
              formats: ['cjs'],
              fileName: 'main',
            },
            rollupOptions: {
              ...baseConfig.build?.rollupOptions,
              external: ['electron', 'node:*', ...builtinModules()],
            },
          },
        })
      } else if (target === 'electron-preload') {
        Object.assign(baseConfig, {
          build: {
            ...baseConfig.build,
            lib: {
              entry: 'src/preload.ts',
              formats: ['cjs'],
              fileName: 'preload',
            },
            rollupOptions: {
              ...baseConfig.build?.rollupOptions,
              external: ['electron'],
            },
          },
        })
      } else if (target === 'electron-renderer') {
        // HMR configuration for renderer
        if (isDev && enableHMR) {
          baseConfig.server = {
            port: 3000,
            strictPort: true,
          }
        }
      }

      return baseConfig
    },

    transformIndexHtml: {
      enforce: 'pre',
      transform(html) {
        if (target === 'electron-renderer') {
          // Inject Electron-specific scripts and CSP
          return html.replace(
            '<head>',
            `<head>
              <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval';">
              <script>
                // Electron environment detection
                window.__DX_ENGINE_ELECTRON__ = true;
                window.__DX_ENGINE_TARGET__ = '${target}';
              </script>`
          )
        }
        return html
      },
    },

    load(id) {
      // Handle virtual modules
      if (id === 'virtual:dx-engine/env') {
        return `export const DX_ENGINE_TARGET = '${target}';
export const DX_ENGINE_VERSION = '0.3.0';
export const IS_ELECTRON = ${target.startsWith('electron')};
export const IS_DEV = ${isDev};
export const ENV = ${JSON.stringify(env)};`
      }
    },

    generateBundle() {
      if (target === 'electron-main' && devOptimizations && isDev) {
        // Development optimizations for main process
        this.info('Applied development optimizations for Electron main process')
      }
    },
  }
}

/**
 * Electron-specific optimizer plugin for production builds.
 *
 * @param options - Optimizer configuration options
 * @returns Vite plugin instance
 *
 * @example
 * ```typescript
 * import { electronOptimizer } from '@hatcherdx/dx-engine-vite-plugin'
 *
 * export default defineConfig({
 *   plugins: [
 *     electronOptimizer({
 *       minifyRendererCode: true,
 *       optimizeNodeModules: true,
 *       enableTreeShaking: true
 *     })
 *   ]
 * })
 * ```
 *
 * @public
 */
export function electronOptimizer(
  options: ElectronOptimizerOptions = {}
): Plugin {
  const {
    minifyRendererCode = true,
    enableTreeShaking = true,
    analyzeBundles = false,
  } = options

  return {
    name: 'electron-optimizer',
    apply: 'build',

    config(config) {
      if (enableTreeShaking) {
        config.build = config.build || {}
        config.build.rollupOptions = config.build.rollupOptions || {}
        config.build.rollupOptions.treeshake = {
          moduleSideEffects: false,
          propertyReadSideEffects: false,
          unknownGlobalSideEffects: false,
        }
      }
    },

    async generateBundle(options, bundle) {
      if (minifyRendererCode) {
        for (const [fileName, chunk] of Object.entries(bundle)) {
          if (chunk && chunk.type === 'chunk' && chunk.isEntry) {
            try {
              const originalCode = chunk.code
              const minified = await minify(originalCode, {
                compress: {
                  drop_console: false,
                  drop_debugger: true,
                  pure_funcs: ['console.log', 'console.debug'],
                },
                mangle: {
                  keep_fnames: true, // Keep function names for debugging
                },
                format: {
                  comments: false,
                },
              })

              if (minified.code) {
                chunk.code = minified.code
                this.info(
                  `Minified ${fileName}: saved ${calculateSavings(originalCode, minified.code)}`
                )
              }
            } catch (error) {
              this.warn(`Failed to minify ${fileName}: ${error}`)
            }
          }
        }
      }

      if (analyzeBundles) {
        const analysis = analyzeBundle(bundle)
        this.info('Bundle analysis:', analysis)
      }
    },
  }
}

/**
 * Development utilities plugin for DX Engine.
 *
 * @returns Vite plugin instance
 *
 * @example
 * ```typescript
 * import { devUtilities } from '@hatcherdx/dx-engine-vite-plugin'
 *
 * export default defineConfig({
 *   plugins: [
 *     devUtilities()
 *   ]
 * })
 * ```
 *
 * @public
 */
export function devUtilities(): Plugin {
  return {
    name: 'dx-engine-dev-utilities',
    apply: 'serve',

    configureServer(server) {
      // Add middleware for development utilities
      server.middlewares.use('/api/dx-engine-info', (req, res, next) => {
        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              version: '0.3.0',
              target: process.env.DX_ENGINE_TARGET || 'unknown',
              timestamp: new Date().toISOString(),
              uptime: process.uptime(),
            })
          )
        } else {
          next()
        }
      })
    },

    transform(code, id) {
      // Add source location comments in development
      if (id.endsWith('.ts') || id.endsWith('.js')) {
        return {
          code: `/* DX Engine - File: ${id} */\n${code}`,
          map: null,
        }
      }
    },
  }
}

/**
 * Get list of Node.js builtin modules.
 *
 * @returns Array of builtin module names
 *
 * @private
 */
function builtinModules(): string[] {
  return [
    'assert',
    'async_hooks',
    'buffer',
    'child_process',
    'cluster',
    'console',
    'constants',
    'crypto',
    'dgram',
    'dns',
    'domain',
    'events',
    'fs',
    'http',
    'http2',
    'https',
    'inspector',
    'module',
    'net',
    'os',
    'path',
    'perf_hooks',
    'process',
    'punycode',
    'querystring',
    'readline',
    'repl',
    'stream',
    'string_decoder',
    'timers',
    'tls',
    'trace_events',
    'tty',
    'url',
    'util',
    'v8',
    'vm',
    'wasi',
    'worker_threads',
    'zlib',
  ]
}

/**
 * Calculate size savings from minification.
 *
 * @param original - Original code
 * @param minified - Minified code
 * @returns Human-readable size savings
 *
 * @private
 */
function calculateSavings(original: string, minified: string): string {
  const originalSize = original.length
  const minifiedSize = minified.length
  const savings = originalSize - minifiedSize
  const percentage = Math.round((savings / originalSize) * 100)

  return `${formatBytes(savings)} (${percentage}%)`
}

/**
 * Format bytes as human-readable string.
 *
 * @param bytes - Number of bytes
 * @returns Formatted string
 *
 * @private
 */
function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(1)}${units[unitIndex]}`
}

/**
 * Analyze bundle composition and sizes.
 *
 * @param bundle - Rollup bundle
 * @returns Bundle analysis
 *
 * @private
 */
function analyzeBundle(bundle: Record<string, BundleItem | null>): {
  totalSize: number
  chunkCount: number
  assetCount: number
  largestChunk: string
} {
  let totalSize = 0
  let chunkCount = 0
  let assetCount = 0
  let largestChunk = ''
  let largestSize = 0

  for (const [fileName, item] of Object.entries(bundle)) {
    if (!item) continue // Skip null/undefined items

    if (item.type === 'chunk') {
      chunkCount++
      const size = item.code.length
      totalSize += size

      if (size > largestSize) {
        largestSize = size
        largestChunk = fileName
      }
    } else {
      assetCount++
      totalSize += item.source.length
    }
  }

  return {
    totalSize,
    chunkCount,
    assetCount,
    largestChunk,
  }
}
