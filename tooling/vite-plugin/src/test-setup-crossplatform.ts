/**
 * @fileoverview Test setup for Vite plugin cross-platform tests.
 *
 * @description
 * Setup file for tests that validate Vite plugin behavior across
 * different operating systems, particularly temp directory handling
 * and path resolution.
 *
 * CRITICAL: This file is loaded as setupFiles in vitest.crossplatform.config.ts.
 * DO NOT import from 'vitest' here (vi, afterEach, etc.) as it causes
 * "Vitest failed to access its internal state" errors in CI environments.
 *
 * With globals: true enabled in vitest configs, all vitest utilities
 * (vi, describe, it, expect, afterEach, etc.) are available globally.
 * Just use them directly without importing or declaring.
 *
 * @remarks
 * This setup ensures proper temp directory creation and path handling
 * on Windows, macOS, and Linux for the Vite plugin.
 *
 * @example
 * ```typescript
 * // This setup file is automatically loaded by vitest.crossplatform.config.ts
 * // Tests will work with real temp directories and paths
 * ```
 *
 * @see https://vitest.dev/config/#globals
 * @see https://vitest.dev/config/#setupfiles
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

import { existsSync, mkdirSync, rmSync } from 'fs'
import { join, sep, resolve } from 'path'
import { tmpdir, homedir } from 'os'

// vi is available globally via globals: true
// No need to import or declare - just use it directly

// Mark that we're using cross-platform tests
process.env.VITEST_CROSSPLATFORM = 'true'

// Setup test directory
const testPluginDir =
  process.env.TEST_PLUGIN_DIR || join(tmpdir(), 'vite-plugin-tests')

// Ensure test directory exists
if (!existsSync(testPluginDir)) {
  mkdirSync(testPluginDir, { recursive: true })
}

// Log environment for debugging
console.log('🔧 Vite Plugin Cross-Platform Test Setup')
console.log(`📍 Platform: ${process.platform}`)
console.log(`📂 Test Directory: ${testPluginDir}`)
console.log(`🏠 Home Directory: ${homedir()}`)
console.log(`🔀 Path Separator: "${sep}"`)
console.log(`📁 Temp Directory: ${tmpdir()}`)

// Platform detection helpers
export const isWindows = process.platform === 'win32'
export const isMacOS = process.platform === 'darwin'
export const isLinux = process.platform === 'linux'

// Path resolution helper
export function resolvePath(...paths: string[]): string {
  return resolve(join(...paths))
}

// Temp file helper
export function getTempFilePath(filename: string): string {
  return join(testPluginDir, filename)
}

// Platform-specific path tests
export const pathTestCases = {
  absolute: isWindows ? 'C:\\Users\\test\\project' : '/Users/test/project',
  relative: isWindows ? '.\\src\\index.ts' : './src/index.ts',
  home: isWindows ? '%USERPROFILE%\\Documents' : '~/Documents',
  temp: tmpdir(),
}

// Cleanup function
export function cleanupTestDir(): void {
  if (existsSync(testPluginDir)) {
    console.log(`🧹 Cleaning up test directory: ${testPluginDir}`)
    rmSync(testPluginDir, { recursive: true, force: true })
  }
}

// Set timeouts
vi.setConfig({
  testTimeout: 15000,
  hookTimeout: 15000,
})

// Ensure clean process exit
process.on('exit', () => {
  cleanupTestDir()
})

console.log('✅ Vite Plugin Cross-Platform Setup Complete')
