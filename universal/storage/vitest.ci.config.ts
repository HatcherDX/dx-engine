/**
 * @fileoverview CI-specific Vitest configuration
 *
 * @description
 * Configuration for running tests in CI environments where native
 * dependencies like better-sqlite3 and argon2 are not available.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test-setup-ci.ts'],
    coverage: {
      enabled: true,
      provider: 'istanbul',
      reporter: ['text', 'json-summary', 'json'],
      include: ['src/**/*.ts'],
      exclude: [
        '**/*.spec.ts',
        '**/*.integration.ts',
        '**/test-*.ts',
        '**/types/**',
        'src/index.ts',
      ],
    },
    include: [
      'src/**/*.spec.ts',
      // Exclude SQLite-specific tests in CI
      '!src/adapters/SQLiteAdapter.spec.ts',
      // Exclude integration tests that need real dependencies
      '!src/**/*.integration.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**'],
  },
  resolve: {
    alias: {
      '@/storage': resolve(__dirname, './src'),
    },
  },
  define: {
    // Force CI environment
    'process.env.CI': '"true"',
    'process.env.VITEST_MOCK_SQLITE': '"true"',
  },
})
