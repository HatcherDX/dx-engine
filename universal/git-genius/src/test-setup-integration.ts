/**
 * @fileoverview Test setup for real Git integration tests.
 *
 * @description
 * Setup file for tests that use real Git operations and interact with
 * actual repositories. This setup ensures proper environment configuration
 * for cross-platform Git testing.
 *
 * @remarks
 * This setup is used when running integration tests with real Git operations.
 * It configures the environment to use actual simple-git instead of mocks,
 * allowing tests to validate real Git behavior across different platforms.
 *
 * @example
 * ```typescript
 * // This setup file is automatically loaded by vitest.integration.config.ts
 * // Tests will have access to real Git functionality
 * import simpleGit from 'simple-git'
 * const git = simpleGit()
 * await git.clone('https://github.com/example/repo.git')
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

import { vi } from 'vitest'
import { existsSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'

// Mark that we're using real Git for tests
process.env.VITEST_USE_REAL_GIT = 'true'

// Setup test repository directory
const testReposDir =
  process.env.GIT_TEST_REPOS_DIR || join(process.cwd(), 'test-repos')

// Ensure test directory exists
if (!existsSync(testReposDir)) {
  mkdirSync(testReposDir, { recursive: true })
}

// Log environment for debugging
console.log('🔧 Git Integration Test Setup: Using real Git')
console.log(`📍 Platform: ${process.platform}`)
console.log(`📂 Test Repos Directory: ${testReposDir}`)
console.log(`🔤 Git Version: ${await getGitVersion()}`)

// Set longer timeouts for Git operations
vi.setConfig({
  testTimeout: 60000,
  hookTimeout: 60000,
})

// Helper to get Git version
async function getGitVersion(): Promise<string> {
  try {
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)
    const { stdout } = await execAsync('git --version')
    return stdout.trim()
  } catch {
    return 'Git not found'
  }
}

// Cleanup function for test repos
export function cleanupTestRepos(): void {
  if (existsSync(testReposDir)) {
    console.log(`🧹 Cleaning up test repos in ${testReposDir}`)
    rmSync(testReposDir, { recursive: true, force: true })
  }
}

// Ensure clean process exit
process.on('exit', () => {
  cleanupTestRepos()
})
