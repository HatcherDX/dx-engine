/**
 * @fileoverview Global setup for Git integration tests.
 *
 * @description
 * Prepares the test environment before running any Git integration tests.
 * Creates necessary directories and configures Git for testing.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

import { mkdirSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

export default async function globalSetup() {
  const testReposDir =
    process.env.GIT_TEST_REPOS_DIR || join(tmpdir(), 'git-genius-tests')

  console.log('🚀 Git Integration Tests: Global Setup')
  console.log(`📂 Creating test directory: ${testReposDir}`)

  if (!existsSync(testReposDir)) {
    mkdirSync(testReposDir, { recursive: true })
  }

  // Configure Git for tests
  const { exec } = await import('child_process')
  const { promisify } = await import('util')
  const execAsync = promisify(exec)

  try {
    // Set a test user for commits
    await execAsync('git config --global user.email "test@example.com"')
    await execAsync('git config --global user.name "Test User"')
    console.log('✅ Git configured for testing')
  } catch (error) {
    console.warn('⚠️ Could not configure Git:', error)
  }

  return () => {
    console.log('🏁 Git Integration Tests: Setup Complete')
  }
}
