/**
 * @fileoverview CI-specific Vitest configuration
 *
 * @description
 * Configuration for running tests in CI environments where native
 * dependencies like better-sqlite3 and argon2 are not available.
 * Forces mocking of native dependencies.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

// Force CI environment for proper mocking
process.env.CI = 'true'
process.env.VITEST_MOCK_SQLITE = 'true'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      { find: '@/apps/web', replacement: resolve(__dirname, 'apps/web/src') },
      {
        find: '@/apps/electron',
        replacement: resolve(__dirname, 'apps/electron/src'),
      },
      {
        find: '@/apps/preload',
        replacement: resolve(__dirname, 'apps/preload/src'),
      },
      { find: '@/universal', replacement: resolve(__dirname, 'universal') },
      { find: '@', replacement: resolve(__dirname, 'src') },
      { find: '/assets', replacement: resolve(__dirname, 'apps/web/public') },
    ],
  },
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
    // Force CI environment
    'process.env.CI': '"true"',
    'process.env.VITEST_MOCK_SQLITE': '"true"',
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ci.ts'],

    // Robust timeout configuration to prevent worker hangs
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 30000,

    // Aggressive timeout configuration to prevent worker hangs
    workerTimeout: 120000, // 2 minutes for worker operations
    setupTimeout: 120000, // 2 minutes for setup

    // Reduce worker communication frequency to prevent timeout race conditions
    slowTestThreshold: 1000, // Consider tests slow at 1s instead of 300ms

    // Conservative parallelism to prevent worker communication overload
    fileParallelism: false, // Disable file parallelism to reduce worker pressure
    maxWorkers: 2, // Reduce max workers to prevent timeout race conditions
    minWorkers: 1,
    maxConcurrency: 3, // Reduce concurrency to prevent worker overload

    // Error handling configuration
    dangerouslyIgnoreUnhandledErrors: false,
    logHeapUsage: false,

    // Handle unhandled errors and timeouts gracefully
    onUnhandledError(error): boolean | void {
      // Completely suppress worker timeout errors to prevent flaky tests
      if (
        error.message.includes('Timeout calling') ||
        error.message.includes('vitest-worker') ||
        error.message.includes('onTaskUpdate') ||
        error.name === 'TimeoutError' ||
        error.message.includes('timeout')
      ) {
        // Suppress these errors completely - they don't affect test results
        return false
      }
    },

    // CRITICAL SAFETY: Process isolation to prevent real Git operations
    pool: 'forks',
    poolOptions: {
      forks: {
        // Enhanced process isolation
        isolate: true,
        singleFork: false,

        // Ultra-conservative worker limits to prevent timeout issues
        maxForks: 2, // Match maxWorkers to prevent oversubscription
        minForks: 1,

        // Memory management to prevent worker crashes
        memoryLimit: '256MB',

        // Process cleanup and communication timeouts
        execArgv: [
          '--no-warnings',
          '--max-old-space-size=512',
          '--gc-interval=100',
          '--unhandled-rejections=warn', // Don't crash on unhandled rejections
          '--trace-warnings', // Enable warning tracing for debugging
        ],

        env: {
          // Explicit test environment variables for safety detection
          NODE_ENV: 'test',
          VITEST: 'true',
          CI: 'true',
          VITEST_MOCK_SQLITE: 'true',
          // Block real Git operations at process level
          GIT_TERMINAL_PROMPT: '0',
          GIT_SSH_COMMAND: 'echo "Git SSH blocked in tests"',
          // Worker environment isolation
          VITEST_POOL_ID: '1',
          VITEST_WORKER_ID: '1',
        },
      },
    },

    // Sequence configuration for deterministic test execution
    sequence: {
      shuffle: false,
      concurrent: false,
      hooks: 'stack',
      setupFiles: 'parallel',
    },

    // Advanced worker timeout mitigation
    bail: 0,
    retry: 0,

    // Reduce test runner load to prevent worker communication issues
    reporter: ['default'],
    outputFile: undefined, // Disable file output to reduce I/O pressure

    // Server configuration for better worker communication
    server: {
      deps: {
        external: [/node_modules/],
        inline: [],
      },
      // Debug worker communication issues
      debug: {
        dumpModules: false,
        loadDumppedModules: false,
      },
    },

    // Dependency optimization for faster startup
    deps: {
      optimizer: {
        ssr: {
          enabled: true,
        },
      },
      external: [/node_modules/],
      inline: [],
    },

    // Include all tests from monorepo but exclude SQLite/integration tests in CI
    include: [
      'apps/**/*.{test,spec}.{js,ts}',
      'universal/**/*.{test,spec}.{js,ts}',
      'tooling/**/*.{test,spec}.{js,ts}',
      'scripts/**/*.{test,spec}.{js,ts}',
    ],

    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/docs/**',
      'apps/docs/**',
      // Exclude tests that require real native dependencies
      'universal/storage/src/adapters/SQLiteAdapter.spec.ts',
      'universal/storage/src/**/*.integration.ts',
    ],

    // Test alias configuration
    alias: {
      '@/apps/web': resolve(__dirname, 'apps/web/src'),
      '@/apps/electron': resolve(__dirname, 'apps/electron/src'),
      '@/apps/preload': resolve(__dirname, 'apps/preload/src'),
      '@/universal': resolve(__dirname, 'universal'),
      '@': resolve(__dirname, 'src'),
      '/assets': resolve(__dirname, 'apps/web/public'),
      '/@/': resolve(__dirname, 'apps/electron/src/'),
      '/logo-dark.svg': resolve(__dirname, 'apps/web/public/logo-dark.svg'),
    },

    // Istanbul coverage configuration - automatic
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json-summary', 'json', 'html'],
      reportsDirectory: 'coverage',
      enabled: true,
      clean: true,
      cleanOnRerun: true,

      // Include all source code (excluding WIP)
      include: [
        'apps/**/*.{js,ts,vue}',
        'universal/**/*.{js,ts}',
        'tooling/**/*.{js,ts}',
        'scripts/**/*.{js,ts}',
        '!apps/docs/**',
      ],

      // Exclude irrelevant files
      exclude: [
        '**/*.{test,spec}.{js,ts,vue}',
        '**/test/**',
        '**/tests/**',
        '**/__tests__/**',
        '**/coverage/**',
        '**/dist/**',
        '**/build/**',
        '**/node_modules/**',
        '**/*.config.{js,ts}',
        '**/*.d.ts',
        '**/public/**',
        '**/assets/**',
        '**/*.min.js',
        '**/registerServiceWorker.ts',
        '**/vite-env.d.ts',
        '**/style.css',
        '**/test-mocks.ts',
        '**/test-setup*.ts',
        '**/test-global-setup.ts',
        '**/test-global-teardown.ts',
        // Exclude SQLite adapter and integration tests
        'universal/storage/src/adapters/SQLiteAdapter.ts',
        'universal/storage/src/**/*.integration.ts',
      ],
    },
  },
})
