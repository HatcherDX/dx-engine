/**
 * @fileoverview Vitest configuration for CI environment with mocked Git.
 *
 * @description
 * Configuration for running git-genius tests in CI with mocked simple-git.
 * This allows tests to run without actual Git operations, ensuring fast and
 * reliable CI builds while still validating business logic.
 *
 * @remarks
 * This configuration forces simple-git to be mocked, allowing tests to run
 * in environments where Git operations cannot be performed. Real Git testing
 * is handled separately in the OS matrix jobs.
 *
 * @example
 * ```bash
 * # Run in CI with mocks
 * VITEST_MOCK_GIT=true pnpm --filter @hatcherdx/git-genius test:ci
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
    name: 'git-ci-mocked',
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
        '**/test-*.ts',
      ],
    },
  },
  define: {
    'process.env.CI': '"true"',
    'process.env.VITEST_MOCK_GIT': '"true"',
  },
})
