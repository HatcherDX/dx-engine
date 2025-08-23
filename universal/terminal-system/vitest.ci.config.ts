/**
 * @fileoverview Vitest configuration for CI environment with mocked PTY.
 *
 * @description
 * Configuration for running terminal-system tests in CI with mocked node-pty.
 * This allows tests to run without native dependencies, ensuring fast and
 * reliable CI builds while still validating business logic.
 *
 * @remarks
 * This configuration forces all native dependencies to be mocked,
 * allowing tests to run in environments where node-pty cannot be installed.
 * Real PTY testing is handled separately in the OS matrix jobs.
 *
 * @example
 * ```bash
 * # Run in CI with mocks
 * VITEST_MOCK_PTY=true pnpm --filter @hatcherdx/terminal-system test:ci
 *
 * # Automatically used in GitHub Actions
 * pnpm test:coverage:ci
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'terminal-ci-mocked',
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup-ci.ts'],
    exclude: [
      'node_modules',
      'dist',
      // Exclude real PTY tests that require native bindings
      '**/test-node-pty.spec.ts',
      '**/scripts/**',
    ],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/ci',
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/test-*.ts',
      ],
    },
  },
  define: {
    'process.env.CI': '"true"',
    'process.env.VITEST_MOCK_PTY': '"true"',
  },
})
