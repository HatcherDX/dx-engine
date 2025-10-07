import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [],
    isolate: true,
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      all: true,
      include: ['preload.js', 'main.js'],
      exclude: ['node_modules/**', 'dist/**', '**/*.spec.js', '**/*.test.js'],
    },
  },
})
