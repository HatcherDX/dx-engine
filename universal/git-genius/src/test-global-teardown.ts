/**
 * @fileoverview Global teardown for Git integration tests.
 *
 * @description
 * Cleans up the test environment after all Git integration tests complete.
 * Removes test directories and restores Git configuration.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

import { rmSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

export default async function globalTeardown() {
  const testReposDir =
    process.env.GIT_TEST_REPOS_DIR || join(tmpdir(), 'git-genius-tests')

  console.log('🧹 Git Integration Tests: Global Teardown')

  if (existsSync(testReposDir)) {
    console.log(`🗑️ Removing test directory: ${testReposDir}`)
    rmSync(testReposDir, { recursive: true, force: true })
  }

  console.log('✅ Git Integration Tests: Cleanup Complete')
}
