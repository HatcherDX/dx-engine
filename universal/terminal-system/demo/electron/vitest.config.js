import { defineConfig } from 'vitest/config'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      // Point package import to source files so demo can run without build
      '@hatcherdx/terminal-system': resolve(__dirname, '../../src/index.ts'),
    },
  },
  optimizeDeps: {
    // Ensure the alias is processed during optimization
    include: ['@hatcherdx/terminal-system'],
  },
  test: {
    globals: true,
    environment: 'node',
    // Don't inherit setupFiles from root - this demo has its own setup requirements
    setupFiles: [],
    // Prevent vitest internal state errors
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
