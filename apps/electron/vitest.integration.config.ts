/**
 * @fileoverview Vitest configuration for Electron integration tests.
 *
 * @description
 * Configuration for running Electron app tests with real platform-specific features.
 * These tests validate actual OS behavior for menus, windows, dialogs, and paths
 * across Windows, macOS, and Linux.
 *
 * @remarks
 * This configuration is used for integration testing with real Electron APIs.
 * Tests using this config will interact with actual OS features like native menus,
 * window controls, and file system paths.
 *
 * @example
 * ```bash
 * # Run Electron integration tests locally
 * pnpm --filter electron test:integration
 *
 * # Run in CI with OS matrix
 * xvfb-run -a pnpm --filter electron test:integration # Linux
 * pnpm --filter electron test:integration # Windows/macOS
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    name: 'electron-integration',
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test-setup-integration.ts'],
    include: [
      // Platform-specific tests
      '**/menu.spec.ts',
      '**/mainWindow.spec.ts',
      '**/mainWindow.*.spec.ts',
      '**/ipc.spec.ts',
      '**/ptyManager.spec.ts',
      '**/terminalStrategy.spec.ts',
    ],
    exclude: [
      'node_modules',
      'dist',
      '**/*.simple.spec.ts',
      '**/*.coverage.spec.ts',
    ],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/integration',
      include: [
        'src/menu.ts',
        'src/mainWindow.ts',
        'src/ipc.ts',
        'src/ptyManager.ts',
        'src/terminalStrategy.ts',
      ],
    },
    testTimeout: 30000, // Electron operations may take longer
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      electron: resolve(__dirname, './src/test-mocks/electron.ts'),
    },
  },
  define: {
    'process.env.VITEST_ELECTRON_INTEGRATION': '"true"',
    'process.env.TEST_PLATFORM': JSON.stringify(process.platform),
  },
})
