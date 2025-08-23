/**
 * @fileoverview Test setup for real PTY integration tests.
 *
 * @description
 * Setup file for tests that use real node-pty bindings and interact with
 * actual terminal processes. This setup ensures proper environment configuration
 * for cross-platform PTY testing.
 *
 * @remarks
 * This setup is used when running integration tests with real terminal backends.
 * It configures the environment to use actual node-pty instead of mocks,
 * allowing tests to validate real terminal behavior across different platforms.
 *
 * @example
 * ```typescript
 * // This setup file is automatically loaded by vitest.pty.config.ts
 * // Tests will have access to real PTY functionality
 * import { spawn } from 'node-pty'
 * const pty = spawn('bash', [], { name: 'xterm' })
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

import { vi } from 'vitest'

// Mark that we're using real PTY for tests
process.env.VITEST_USE_REAL_PTY = 'true'

// Log environment for debugging
console.log('🔧 PTY Test Setup: Using real node-pty bindings')
console.log(`📍 Platform: ${process.platform}`)
console.log(`🏗️ Architecture: ${process.arch}`)
console.log(`📂 CWD: ${process.cwd()}`)

// Set longer timeouts for PTY operations
vi.setConfig({
  testTimeout: 30000,
  hookTimeout: 30000,
})

// Ensure clean process exit
process.on('exit', () => {
  // Clean up any lingering PTY processes
  console.log('🧹 Cleaning up PTY test environment')
})
