/**
 * @fileoverview Vite plugin to copy package.json to build output directory
 *
 * @description
 * This plugin ensures package.json is available in the dist-vite/ directory
 * for Electron runtime. Required because compiled code needs access to
 * package metadata (version, name, etc.) but Vite doesn't copy it by default.
 *
 * @author Hatcher DX Team
 * @since 2.0.0
 * @public
 */

import type { Plugin } from 'vite'
import { copyFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Creates a Vite plugin that copies package.json to the output directory
 *
 * @remarks
 * Executes during the closeBundle hook, which runs after all files are written.
 * This ensures package.json is available for Electron's main process at runtime.
 *
 * @returns Vite plugin configuration object
 *
 * @example
 * ```typescript
 * // vite.config.ts
 * import { copyPackageJson } from './vite-plugin-copy-package'
 *
 * export default defineConfig({
 *   plugins: [copyPackageJson()],
 * })
 * ```
 *
 * @public
 */
export function copyPackageJson(): Plugin {
  return {
    name: 'copy-package-json',
    closeBundle() {
      const packagePath = join(process.cwd(), 'package.json')
      const outDir = join(process.cwd(), 'dist-vite')
      const destPath = join(outDir, 'package.json')

      try {
        copyFileSync(packagePath, destPath)
        console.log('[vite-plugin] ✓ Copied package.json to dist-vite/')
      } catch (error) {
        console.error(
          '[vite-plugin] ✗ Failed to copy package.json:',
          error instanceof Error ? error.message : 'Unknown error'
        )
        // Don't throw - allow build to complete even if copy fails
        // This prevents blocking the entire build for a non-critical file
      }
    },
  }
}
