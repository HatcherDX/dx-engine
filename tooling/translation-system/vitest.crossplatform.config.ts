/**
 * @fileoverview Vitest configuration for cross-platform path handling tests.
 *
 * @description
 * Configuration for testing translation-system with real file system operations
 * across different operating systems. Validates path handling, file operations,
 * and Unicode filename support.
 *
 * @remarks
 * This configuration tests actual file system behavior on Windows, macOS, and Linux.
 * It ensures path separators, file operations, and Unicode handling work correctly
 * on all target platforms.
 *
 * @example
 * ```bash
 * # Run cross-platform tests locally
 * pnpm --filter translation-system test:crossplatform
 *
 * # Run in CI with OS matrix
 * pnpm --filter translation-system test:crossplatform:ci
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
    name: 'translation-crossplatform',
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test-setup-crossplatform.ts'],
    include: [
      '**/FileByFileStrategy.spec.ts',
      '**/ConfigurationService.spec.ts',
      '**/FileProcessingService.spec.ts',
      '**/index.spec.ts',
    ],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/crossplatform',
      include: [
        'src/strategies/FileByFileStrategy.ts',
        'src/config/ConfigurationService.ts',
        'src/services/FileProcessingService.ts',
      ],
    },
    testTimeout: 20000, // File operations may take longer
    hookTimeout: 20000,
  },
  define: {
    'process.env.VITEST_CROSSPLATFORM': '"true"',
    'process.env.TEST_TEMP_DIR': JSON.stringify(
      join(tmpdir(), 'translation-tests')
    ),
  },
})
