import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/**/*.ts',
        'scripts/**/*.ts',
        'scripts/**/*.js',
        'scripts/**/*.mjs',
      ],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**',
        '**/*.spec.ts',
        '**/*.test.ts',
      ],
    },
  },
})
