/**
 * @fileoverview Test setup for Electron integration tests.
 *
 * @description
 * Setup file for tests that use real Electron APIs and interact with
 * actual OS features. This setup ensures proper environment configuration
 * for cross-platform Electron testing.
 *
 * CRITICAL: This file is loaded as setupFiles in vitest.integration.config.ts.
 * DO NOT import from 'vitest' here (vi, afterEach, etc.) as it causes
 * "Vitest failed to access its internal state" errors in CI environments.
 *
 * With globals: true enabled in vitest configs, all vitest utilities
 * (vi, describe, it, expect, afterEach, etc.) are available globally.
 *
 * @remarks
 * This setup is used when running integration tests with real Electron features.
 * It configures the environment to test actual platform-specific behavior
 * like native menus, window controls, and file paths.
 *
 * @example
 * ```typescript
 * // This setup file is automatically loaded by vitest.integration.config.ts
 * // Tests will have access to real or mocked Electron APIs based on environment
 * ```
 *
 * @see https://vitest.dev/config/#globals
 * @see https://vitest.dev/config/#setupfiles
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

// Access vi and it from global context (available via globals: true)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const vi = (globalThis as any).vi
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const it = (globalThis as any).it

// Mark that we're using integration tests
process.env.VITEST_ELECTRON_INTEGRATION = 'true'

// Log environment for debugging
console.log('🔧 Electron Integration Test Setup')
console.log(`📍 Platform: ${process.platform}`)
console.log(`🏗️ Architecture: ${process.arch}`)
console.log(`📂 CWD: ${process.cwd()}`)

// Set longer timeouts for Electron operations in CI
// Note: Individual tests may override these with even longer timeouts
vi.setConfig({
  testTimeout: process.env.CI ? 60000 : 30000,
  hookTimeout: process.env.CI ? 60000 : 30000,
})

// Platform-specific test helpers
export const isWindows = process.platform === 'win32'
export const isMacOS = process.platform === 'darwin'
export const isLinux = process.platform === 'linux'

// Helper to skip tests on specific platforms
export const skipOnWindows = isWindows ? it.skip : it
export const skipOnMacOS = isMacOS ? it.skip : it
export const skipOnLinux = isLinux ? it.skip : it

// Helper to run tests only on specific platforms
export const runOnWindows = isWindows ? it : it.skip
export const runOnMacOS = isMacOS ? it : it.skip
export const runOnLinux = isLinux ? it : it.skip

console.log('✅ Electron Integration Setup Complete')
