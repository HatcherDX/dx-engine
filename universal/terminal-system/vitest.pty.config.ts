/**
 * @fileoverview Vitest configuration for real PTY integration tests.
 *
 * @description
 * Configuration for running terminal-system tests with real node-pty bindings.
 * These tests validate actual PTY behavior across different operating systems
 * and should be run in CI environments with proper native dependencies.
 *
 * @remarks
 * This configuration is used for integration testing with real terminal backends.
 * It requires node-pty to be properly installed with native bindings.
 * Tests using this config will actually spawn processes and interact with the OS.
 *
 * @example
 * ```bash
 * # Run PTY integration tests locally
 * pnpm --filter @hatcherdx/terminal-system test:pty
 *
 * # Run in CI with OS matrix
 * pnpm --filter @hatcherdx/terminal-system test:pty:ci
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'terminal-pty-integration',
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test-setup-pty.ts'],
    include: [
      // Include only tests that need real PTY functionality
      '**/NodePtyBackend.spec.ts',
      '**/SubprocessBackend.spec.ts',
      '**/BackendDetector.spec.ts',
      '**/platform.spec.ts',
      '**/test-node-pty.spec.ts',
    ],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/pty',
      include: [
        'src/core/NodePtyBackend.ts',
        'src/core/SubprocessBackend.ts',
        'src/core/BackendDetector.ts',
        'src/utils/platform.ts',
      ],
    },
    testTimeout: 30000, // PTY operations may take longer
    hookTimeout: 30000,
  },
  define: {
    'process.env.VITEST_USE_REAL_PTY': '"true"',
  },
})
