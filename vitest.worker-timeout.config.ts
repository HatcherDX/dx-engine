/**
 * Alternative Vitest configuration specifically designed to handle worker timeout issues.
 *
 * This configuration implements the most robust pool settings based on Vitest documentation
 * for resolving "[vitest-worker]: Timeout calling 'onTaskUpdate'" errors.
 *
 * Use with: `pnpm test --config=vitest.worker-timeout.config.ts`
 *
 * @fileoverview Robust worker timeout mitigation configuration
 * @since 1.0.0
 * @public
 */

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

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
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],

    // Extended timeouts for problematic worker scenarios
    testTimeout: 60000,
    hookTimeout: 60000,
    teardownTimeout: 60000,

    // Disable parallelism to isolate worker timeout issues
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
    maxConcurrency: 1,

    // Enhanced error handling
    dangerouslyIgnoreUnhandledErrors: false,
    logHeapUsage: true,

    // Use vmForks pool - most isolated and robust for timeout issues
    pool: 'vmForks',
    poolOptions: {
      vmForks: {
        // Maximum isolation to prevent cross-test contamination
        isolate: true,
        singleFork: true,

        // Single worker to eliminate worker communication issues
        maxForks: 1,
        minForks: 1,

        // Generous memory limits
        memoryLimit: '512MB',

        // Node.js arguments optimized for stability over performance
        execArgv: [
          '--no-warnings',
          '--max-old-space-size=1024',
          '--gc-interval=100',
          '--expose-gc',
          '--optimize-for-size',
        ],

        env: {
          NODE_ENV: 'test',
          VITEST: 'true',
          CI: process.env.CI || 'false',
          // Disable all real Git operations
          GIT_TERMINAL_PROMPT: '0',
          GIT_SSH_COMMAND: 'echo "Git SSH blocked in tests"',
          // Force single worker environment
          VITEST_POOL_ID: '1',
          VITEST_WORKER_ID: '1',
          // Memory pressure settings
          NODE_OPTIONS: '--max-old-space-size=1024',
        },
      },
    },

    // Sequential execution to eliminate race conditions
    sequence: {
      shuffle: false,
      concurrent: false,
      hooks: 'stack',
      setupFiles: 'list', // Sequential setup files
    },

    // Conservative thresholds
    slowTestThreshold: 1000,
    bail: 1, // Stop on first failure to prevent cascade issues
    retry: 0,

    // Optimize dependencies for stability
    deps: {
      optimizer: {
        ssr: {
          enabled: true,
        },
      },
      external: [/node_modules/],
      inline: [],
      fallbackCJS: true,
    },

    // Same includes as main config but with conservative settings
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

    // Disable coverage for timeout debugging
    coverage: {
      enabled: false,
    },
  },
})
