/**
 * @fileoverview Test setup for build scripts integration tests.
 *
 * @description
 * Setup file for tests that validate build script operations across
 * different operating systems. Ensures proper command execution,
 * path handling, and file operations on all platforms.
 *
 * @remarks
 * This setup configures the environment for testing real build script
 * operations including shell commands, file manipulations, and path handling.
 *
 * @example
 * ```typescript
 * // This setup file is automatically loaded by vitest.integration.config.ts
 * // Tests will work with real file system and shell operations
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

import { vi } from 'vitest'
import { existsSync, mkdirSync, rmSync } from 'fs'
import { join, sep } from 'path'
import { tmpdir } from 'os'

// Mark that we're using integration tests
process.env.VITEST_SCRIPTS_INTEGRATION = 'true'

// Setup test directory
const testScriptsDir =
  process.env.TEST_SCRIPTS_DIR || join(tmpdir(), 'scripts-tests')

// Ensure test directory exists
if (!existsSync(testScriptsDir)) {
  mkdirSync(testScriptsDir, { recursive: true })
}

// Log environment for debugging
console.log('🔧 Scripts Integration Test Setup')
console.log(`📍 Platform: ${process.platform}`)
console.log(`📂 Test Directory: ${testScriptsDir}`)
console.log(`🔀 Path Separator: "${sep}"`)
console.log(`🐚 Shell: ${process.env.SHELL || 'cmd.exe'}`)

// Platform detection helpers
export const isWindows = process.platform === 'win32'
export const isMacOS = process.platform === 'darwin'
export const isLinux = process.platform === 'linux'

// Shell command helper
export function getShellCommand(cmd: string): string {
  if (isWindows) {
    return cmd.replace(/\//g, '\\')
  }
  return cmd
}

// Path helper for cross-platform
export function getPlatformPath(path: string): string {
  return path.replace(/[/\\]+/g, sep)
}

// Test file paths
export const testPaths = {
  icon: join(testScriptsDir, 'test-icon.png'),
  env: join(testScriptsDir, '.env.test'),
  package: join(testScriptsDir, 'package.json'),
  docs: join(testScriptsDir, 'docs'),
}

// Cleanup function
export function cleanupTestDir(): void {
  if (existsSync(testScriptsDir)) {
    console.log(`🧹 Cleaning up test directory: ${testScriptsDir}`)
    rmSync(testScriptsDir, { recursive: true, force: true })
  }
}

// Set longer timeouts for script operations
vi.setConfig({
  testTimeout: 30000,
  hookTimeout: 30000,
})

// Ensure clean process exit
process.on('exit', () => {
  cleanupTestDir()
})

console.log('✅ Scripts Integration Setup Complete')
