/**
 * @fileoverview Vitest configuration for Git integration tests.
 *
 * @description
 * Configuration for running git-genius tests with real Git operations.
 * These tests validate actual Git behavior across different operating systems
 * and should be run in CI environments with proper Git configuration.
 *
 * @remarks
 * This configuration is used for integration testing with real Git repositories.
 * It requires Git to be properly installed and configured on the system.
 * Tests using this config will actually perform Git operations like clone, commit, push.
 *
 * @example
 * ```bash
 * # Run Git integration tests locally
 * pnpm --filter @hatcherdx/git-genius test:integration
 *
 * # Run in CI with OS matrix
 * pnpm --filter @hatcherdx/git-genius test:integration:ci
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
    name: 'git-integration',
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test-setup-integration.ts'],
    include: [
      // Include tests that need real Git operations
      '**/EnhancedCloneService.spec.ts',
      '**/EnhancedGitRunner.spec.ts',
      '**/RepositoryManager.spec.ts',
      '**/GitEngine.spec.ts',
      '**/GitUtils.spec.ts',
    ],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/integration',
      include: [
        'src/services/EnhancedCloneService.ts',
        'src/core/EnhancedGitRunner.ts',
        'src/core/RepositoryManager.ts',
        'src/core/GitEngine.ts',
        'src/utils/GitUtils.ts',
      ],
    },
    testTimeout: 60000, // Git operations may take longer
    hookTimeout: 60000,
    // Use temporary directory for test repos
    globalSetup: './src/test-global-setup.ts',
    globalTeardown: './src/test-global-teardown.ts',
  },
  define: {
    'process.env.VITEST_USE_REAL_GIT': '"true"',
    'process.env.GIT_TEST_REPOS_DIR': JSON.stringify(
      join(tmpdir(), 'git-genius-tests')
    ),
  },
})
