/**
 * @fileoverview Vitest configuration for @hatcherdx/dx-engine-vite-plugin
 *
 * @description
 * Test configuration for the DX Engine Vite plugin package.
 * Includes coverage reporting and Node.js environment setup.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Test environment - Node.js for Vite plugin testing
    environment: 'node',

    // Global test setup
    globals: true,

    // Test file patterns
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}'],
    exclude: ['node_modules/**', 'dist/**', 'coverage/**', '**/*.d.ts'],

    // Coverage configuration
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',

      // Include all source files
      include: ['src/**/*.{js,ts}'],

      // Exclude test files and type definitions
      exclude: [
        'src/**/*.{test,spec}.{js,ts}',
        'src/**/*.d.ts',
        'node_modules/**',
        'dist/**',
        'coverage/**',
      ],

      // Coverage thresholds - aiming for 100%
      thresholds: {
        global: {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
      },
    },

    // Test timeout
    testTimeout: 5000,
  },

  // Resolve configuration for TypeScript and modules
  resolve: {
    extensions: ['.ts', '.js', '.json'],
  },
})
