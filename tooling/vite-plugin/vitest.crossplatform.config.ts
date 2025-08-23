/**
 * @fileoverview Vitest configuration for Vite plugin cross-platform tests.
 *
 * @description
 * Configuration for testing the Vite plugin with real file system operations
 * and path handling across different operating systems. Validates temp directory
 * usage and path resolution on Windows, macOS, and Linux.
 *
 * @remarks
 * This configuration tests actual file system behavior for the Vite plugin,
 * ensuring temp directories and path operations work correctly on all platforms.
 *
 * @example
 * ```bash
 * # Run cross-platform tests locally
 * pnpm --filter vite-plugin test:crossplatform
 *
 * # Run in CI with OS matrix
 * pnpm --filter vite-plugin test:crossplatform:ci
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { defineConfig } from 'vitest/config'
import { tmpdir } from 'os'
import { join } from 'path'

export default defineConfig({
  test: {
    name: 'vite-plugin-crossplatform',
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test-setup-crossplatform.ts'],
    include: ['**/index.spec.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/crossplatform',
      include: ['src/index.ts'],
    },
    testTimeout: 15000,
    hookTimeout: 15000,
  },
  define: {
    'process.env.VITEST_CROSSPLATFORM': '"true"',
    'process.env.TEST_PLUGIN_DIR': JSON.stringify(
      join(tmpdir(), 'vite-plugin-tests')
    ),
  },
})
