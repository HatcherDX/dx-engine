/**
 * @fileoverview Vitest configuration for SQLiteAdapter integration tests
 *
 * @description
 * Special configuration for tests that need real native dependencies
 * instead of mocked versions.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    name: 'storage-sqlite',
    environment: 'node',
    globals: true,
    root: path.resolve(__dirname),
    include: ['src/adapters/SQLiteAdapter.spec.ts'],
    setupFiles: ['./src/test-setup-real.ts'],

    // Coverage configuration for SQLite tests
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: 'coverage/sqlite',
      enabled: true,
      clean: true,

      include: ['src/adapters/SQLiteAdapter.ts'],

      exclude: [
        '**/*.spec.ts',
        '**/test-setup*.ts',
        '**/test-mocks.ts',
        '**/dist/**',
        '**/node_modules/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
