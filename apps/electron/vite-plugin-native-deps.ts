/**
 * Native Dependencies Handler Plugin for Vite + Electron
 *
 * @remarks
 * This plugin provides enterprise-grade handling of native Node.js modules
 * in Electron applications built with Vite. It implements best practices
 * from electron-vite for externalizing native dependencies.
 *
 * @example
 * ```typescript
 * import { nativeDepsPlugin } from './vite-plugin-native-deps'
 *
 * export default defineConfig({
 *   plugins: [nativeDepsPlugin()]
 * })
 * ```
 *
 * @public
 * @since 1.0.0
 */

import type { Plugin } from 'vite'
import { builtinModules } from 'module'

/**
 * Configuration options for the native dependencies plugin.
 *
 * @public
 * @since 1.0.0
 */
interface NativeDepsOptions {
  /**
   * Additional modules to externalize.
   * @defaultValue []
   */
  external?: string[]

  /**
   * Modules to exclude from externalization.
   * @defaultValue []
   */
  exclude?: string[]
}

/**
 * Creates a Vite plugin for handling native Node.js dependencies in Electron.
 *
 * @remarks
 * This plugin automatically externalizes all Node.js built-in modules and
 * native dependencies that require compilation. It prevents bundling errors
 * and ensures native modules are properly loaded at runtime.
 *
 * Based on electron-vite's externalizeDepsPlugin implementation.
 *
 * @param options - Configuration options for the plugin
 * @returns Vite plugin for native dependency handling
 *
 * @example
 * ```typescript
 * export default defineConfig({
 *   plugins: [
 *     nativeDepsPlugin({
 *       external: ['sqlite3'],
 *       exclude: ['some-esm-only-module']
 *     })
 *   ]
 * })
 * ```
 *
 * @public
 * @since 1.0.0
 */
export function nativeDepsPlugin(options: NativeDepsOptions = {}): Plugin {
  const { external = [], exclude = [] } = options

  return {
    name: 'native-deps',
    enforce: 'pre',

    config(config, { command }) {
      // Only apply in build mode
      if (command !== 'build') return

      // Get all built-in Node.js modules with and without 'node:' prefix
      const builtins = builtinModules.filter((m) => !m.startsWith('_'))
      const nodeBuiltins = [...builtins, ...builtins.map((m) => `node:${m}`)]

      // List of known native modules and their dependencies
      // Based on electron-vite best practices from Context7
      const nativeModules = [
        'node-pty',
        'better-sqlite3',
        '@mapbox/node-pre-gyp',
        'node-pre-gyp',
        'napi-build-utils',
        'node-abi',
        'detect-libc',
        'tar',
        'make-fetch-happen',
        'argon2', // Native module for password hashing
        'sqlite3',
        'bindings',
        'node-addon-api',
        'node-gyp-build',
        'prebuild-install',
      ]

      // Create the external function
      const externalFunction = (id: string): boolean => {
        // Don't externalize if in exclude list
        if (exclude.some((ex) => id.includes(ex))) {
          return false
        }

        // Don't externalize relative paths (./xxx or ../xxx) - let Vite bundle them
        if (id.startsWith('.') || id.startsWith('/')) {
          return false
        }

        // Externalize Node.js built-ins
        if (nodeBuiltins.includes(id)) {
          return true
        }

        // Externalize native modules
        if (
          nativeModules.some((mod) => id === mod || id.startsWith(`${mod}/`))
        ) {
          return true
        }

        // Externalize additional specified modules
        if (external.some((ext) => id === ext || id.startsWith(`${ext}/`))) {
          return true
        }

        // Externalize .node files
        if (id.endsWith('.node')) {
          return true
        }

        // Externalize all non-relative imports (npm packages)
        // This prevents bundling of node_modules
        if (!id.startsWith('.') && !id.startsWith('/')) {
          return true
        }

        return false
      }

      // Apply configuration
      if (!config.build) config.build = {}

      // Use SSR configuration for proper Node.js module handling
      config.build.ssr = true
      config.build.rollupOptions = config.build.rollupOptions || {}
      config.build.rollupOptions.external = externalFunction

      // Ensure output format is CommonJS for Electron main process
      if (!config.build.rollupOptions.output) {
        config.build.rollupOptions.output = {}
      }

      const output = config.build.rollupOptions.output
      if (!Array.isArray(output)) {
        output.format = 'cjs'
      }

      // Configure SSR options
      if (!config.ssr) config.ssr = {}
      config.ssr.noExternal = true
      config.ssr.external = nodeBuiltins

      return config
    },
  }
}
