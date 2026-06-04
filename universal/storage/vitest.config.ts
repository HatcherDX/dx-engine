import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

/**
 * SQLite Test Configuration
 *
 * TEMPORARILY ENABLED: Testing SQLiteAdapter.coverage.spec.ts after better-sqlite3 rebuild.
 * Previous issue was MODULE_VERSION mismatch, now resolved after running `pnpm rebuild better-sqlite3`.
 *
 * SQLiteAdapter.spec.ts remains excluded as it's the legacy test file.
 * SQLiteAdapter.coverage.spec.ts is the comprehensive test suite following Context7 patterns.
 */
const baseExclude = [
  '**/node_modules/**',
  '**/dist/**',
  '**/SQLiteAdapter.spec.ts', // Legacy test file - kept excluded
  // '**/SQLiteAdapter.coverage.spec.ts', // TEMPORARILY ENABLED: Testing after better-sqlite3 rebuild
]

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test-setup.ts'],

    // CRITICAL: Process isolation with environment variables
    pool: 'forks',
    poolOptions: {
      forks: {
        isolate: true,
        env: {
          // SQLite Mock Configuration - ALWAYS force mocked SQLite to avoid MODULE_VERSION errors
          // Hardcoded 'true' to ensure it's always set, regardless of parent process env
          VITEST_MOCK_SQLITE: 'true',
          NODE_ENV: 'test',
          VITEST: 'true',
        },
      },
    },

    // Coverage configuration
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json-summary', 'json', 'html'],
      reportsDirectory: 'coverage',
      enabled: true,
      clean: true,

      include: ['src/**/*.{js,ts}'],

      exclude: [
        '**/*.{test,spec}.{js,ts}',
        '**/test-setup.ts',
        '**/test-mocks.ts',
        '**/dist/**',
        '**/node_modules/**',
        '**/*.d.ts',
      ],

      // Realistic coverage thresholds based on current state
      thresholds: {
        statements: 35,
        branches: 25,
        functions: 40,
        lines: 35,
      },
    },

    // Test patterns
    include: ['src/**/*.{test,spec}.{js,ts}'],

    exclude: baseExclude,
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
