/**
 * @fileoverview Vitest configuration for CI environment with mocked Electron.
 *
 * @description
 * Configuration for running Electron tests in CI with mocked Electron APIs.
 * This allows tests to run without requiring Electron installation, ensuring
 * fast and reliable CI builds while still validating business logic.
 *
 * @remarks
 * This configuration forces all Electron APIs to be mocked, allowing tests
 * to run in environments where Electron cannot be installed. Real Electron
 * testing is handled separately in the OS matrix jobs.
 *
 * @example
 * ```bash
 * # Run in CI with mocks
 * VITEST_MOCK_ELECTRON=true pnpm --filter electron test:ci
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
    name: 'electron-ci-mocked',
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test-setup-ci.ts'],
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
        'src/test-*.ts',
      ],
    },
  },
  define: {
    'process.env.CI': '"true"',
    'process.env.VITEST_MOCK_ELECTRON': '"true"',
  },
})
