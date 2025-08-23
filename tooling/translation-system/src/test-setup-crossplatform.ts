/**
 * @fileoverview Test setup for cross-platform file system tests.
 *
 * @description
 * Setup file for tests that validate file system operations across
 * different operating systems. Ensures proper path handling and
 * Unicode support on Windows, macOS, and Linux.
 *
 * @remarks
 * This setup configures the environment for testing real file system
 * operations with platform-specific path handling.
 *
 * @example
 * ```typescript
 * // This setup file is automatically loaded by vitest.crossplatform.config.ts
 * // Tests will work with real file system operations
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

// Mark that we're using cross-platform tests
process.env.VITEST_CROSSPLATFORM = 'true'

// Setup test directory
const testTempDir =
  process.env.TEST_TEMP_DIR || join(tmpdir(), 'translation-tests')

// Ensure test directory exists
if (!existsSync(testTempDir)) {
  mkdirSync(testTempDir, { recursive: true })
}

// Log environment for debugging
console.log('🔧 Translation Cross-Platform Test Setup')
console.log(`📍 Platform: ${process.platform}`)
console.log(`📂 Test Directory: ${testTempDir}`)
console.log(`🔀 Path Separator: "${sep}"`)

// Platform detection helpers
export const isWindows = process.platform === 'win32'
export const isMacOS = process.platform === 'darwin'
export const isLinux = process.platform === 'linux'

// Path normalization helper
export function normalizePath(path: string): string {
  return path.replace(/[/\\]+/g, sep)
}

// Unicode test filenames for different platforms
export const unicodeTestFiles = {
  latin: 'tëst-fîlé.txt',
  chinese: '测试文件.txt',
  arabic: 'ملف_اختبار.txt',
  emoji: 'test-file-😀.txt',
  special: isWindows ? 'test~file.txt' : 'test:file.txt', // Windows doesn't allow colons
}

// Cleanup function
export function cleanupTestDir(): void {
  if (existsSync(testTempDir)) {
    console.log(`🧹 Cleaning up test directory: ${testTempDir}`)
    rmSync(testTempDir, { recursive: true, force: true })
  }
}

// Set longer timeouts for file operations
vi.setConfig({
  testTimeout: 20000,
  hookTimeout: 20000,
})

// Ensure clean process exit
process.on('exit', () => {
  cleanupTestDir()
})

console.log('✅ Translation Cross-Platform Setup Complete')
