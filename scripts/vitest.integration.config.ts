/**
 * @fileoverview Vitest configuration for build scripts integration tests.
 *
 * @description
 * Configuration for testing build scripts with real file system operations
 * across different operating systems. Validates path handling, shell commands,
 * and file manipulations on Windows, macOS, and Linux.
 *
 * @remarks
 * This configuration tests actual build script behavior including icon generation,
 * environment setup, version bumping, and documentation translation across platforms.
 *
 * @example
 * ```bash
 * # Run build scripts integration tests locally
 * pnpm test:scripts:integration
 *
 * # Run in CI with OS matrix
 * pnpm test:scripts:ci
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
    name: 'scripts-integration',
    globals: true,
    environment: 'node',
    root: '.',
    setupFiles: ['./scripts/test-setup-integration.ts'],
    include: ['scripts/**/*.spec.ts'],
    exclude: ['node_modules', 'dist', '**/*.simple.spec.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/scripts',
      include: [
        'scripts/generate-icons.ts',
        'scripts/setup-env.ts',
        'scripts/version-bump.ts',
        'scripts/translate-docs.ts',
        'scripts/coverage-check.ts',
      ],
    },
    testTimeout: 30000, // Script operations may take longer
    hookTimeout: 30000,
  },
  define: {
    'process.env.VITEST_SCRIPTS_INTEGRATION': '"true"',
    'process.env.TEST_SCRIPTS_DIR': JSON.stringify(
      join(tmpdir(), 'scripts-tests')
    ),
  },
})
