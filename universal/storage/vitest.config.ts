import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test-mocks.ts', './src/test-setup.ts'],

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

    exclude: ['**/node_modules/**', '**/dist/**'],
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
