import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/demo/**', // Exclude demo directory - it has its own test suite with Vue support
    ],
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
        'demo/', // Exclude demo from coverage
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**',
        '**/*.spec.ts',
        '**/*.test.ts',
        'src/test-*.ts',
      ],
    },
  },
})
