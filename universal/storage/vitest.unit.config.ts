/**
 * @fileoverview Vitest configuration for unit tests with mocks
 *
 * @description
 * Configuration for fast unit tests that use mocks for native dependencies.
 * These tests focus on business logic, validations, and edge cases.
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

    // Force mocks for unit tests
    setupFiles: ['./src/test-mocks.ts', './src/test-setup.ts'],

    // Only run .spec.ts files (unit tests)
    include: ['src/**/*.spec.ts'],
    exclude: [
      'src/adapters/SQLiteAdapter.spec.ts', // SQLiteAdapter needs real SQLite
      'src/**/*.integration.ts',
      'src/**/*.e2e.ts',
      '**/node_modules/**',
      '**/dist/**',
    ],

    // Fast timeout for unit tests
    testTimeout: 5000,

    // Coverage configuration for unit tests
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: 'coverage/unit',
      enabled: true,
      clean: true,

      include: ['src/**/*.{js,ts}'],

      exclude: [
        '**/*.{test,spec,integration,e2e}.{js,ts}',
        '**/test-setup.ts',
        '**/test-mocks.ts',
        '**/dist/**',
        '**/node_modules/**',
        '**/*.d.ts',
      ],

      // Unit test coverage thresholds
      thresholds: {
        statements: 40,
        branches: 30,
        functions: 45,
        lines: 40,
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
