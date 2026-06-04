import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',

    // Disable coverage to avoid @istanbuljs/schema issues
    coverage: {
      enabled: false,
    },

    include: ['src/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
})
