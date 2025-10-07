import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Skip all tests when running from root workspace
    // Demo tests require built package which isn't available in CI
    include: [],
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
