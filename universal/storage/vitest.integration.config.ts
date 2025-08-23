/**
 * @fileoverview Vitest configuration for integration tests with real dependencies
 *
 * @description
 * Configuration for integration tests that use real native dependencies
 * (better-sqlite3, argon2, etc.) to test actual functionality across
 * different operating systems and Node.js versions.
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

    // NO mocks - use real dependencies
    setupFiles: ['./src/test-setup-real.ts'],

    // Only run .integration.ts files
    include: ['src/**/*.integration.ts'],
    exclude: [
      'src/**/*.spec.ts',
      'src/**/*.e2e.ts',
      '**/node_modules/**',
      '**/dist/**',
    ],

    // Longer timeout for real I/O operations
    testTimeout: 30000,

    // Slower concurrency for resource-heavy integration tests
    maxConcurrency: 3,

    // Coverage configuration for integration tests
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: 'coverage/integration',
      enabled: true,
      clean: true,

      include: ['src/**/*.{js,ts}'],

      exclude: [
        '**/*.{test,spec,integration,e2e}.{js,ts}',
        '**/test-setup.ts',
        '**/test-setup-real.ts',
        '**/test-mocks.ts',
        '**/dist/**',
        '**/node_modules/**',
        '**/*.d.ts',
      ],

      // Integration test coverage thresholds (lower since we test real scenarios)
      thresholds: {
        statements: 25,
        branches: 15,
        functions: 30,
        lines: 25,
      },
    },
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/types': resolve(__dirname, 'src/types'),
      '@/core': resolve(__dirname, 'src/core'),
      '@/adapters': resolve(__dirname, 'src/adapters'),
      '@/security': resolve(__dirname, 'src/security'),
      '@/performance': resolve(__dirname, 'src/performance'),
      '@/query': resolve(__dirname, 'src/query'),
      '@/migration': resolve(__dirname, 'src/migration'),
      '@/utils': resolve(__dirname, 'src/utils'),
    },
  },
})
