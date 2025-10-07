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
  server: {
    deps: {
      // Inline @hatcherdx/terminal-system so Vite resolves it correctly
      // Context7 pattern: server.deps.inline for external package mocking
      inline: ['@hatcherdx/terminal-system'],
    },
  },
  test: {
    globals: true,
    environment: 'node',
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
