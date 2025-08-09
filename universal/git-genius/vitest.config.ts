import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist', 'coverage'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{js,ts}'],
      exclude: [
        'src/**/*.{test,spec}.{js,ts}',
        'src/**/*.d.ts',
        'src/**/index.ts',
        'node_modules',
        'dist',
      ],
      all: true,
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
    setupFiles: [],
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    isolate: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/types': resolve(__dirname, './src/types'),
      '@/core': resolve(__dirname, './src/core'),
      '@/cache': resolve(__dirname, './src/cache'),
      '@/timeline': resolve(__dirname, './src/timeline'),
      '@/utils': resolve(__dirname, './src/utils'),
    },
  },
  esbuild: {
    target: 'node16',
  },
})
