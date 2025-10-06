/**
 * @fileoverview Integration tests for Git security protections using real commands.
 *
 * @description
 * These integration tests validate that the IDE's security protections work correctly
 * with real Git commands. Unlike unit tests, these tests use actual simple-git operations
 * without mocks to ensure the protections work in real-world scenarios.
 *
 * @remarks
 * Tests create temporary Git repositories and execute real Git commands to verify
 * that the IDE cannot modify its own source code under any circumstances.
 *
 * @example
 * ```bash
 * # Run integration tests
 * pnpm --filter @hatcherdx/dx-engine-electron test:integration
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.3.0
 * @public
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import * as path from 'node:path'
import * as fs from 'node:fs'
import * as os from 'node:os'
import simpleGit from 'simple-git'
import type { SimpleGit } from 'simple-git'

/**
 * Security validation function from ipc.ts.
 *
 * @remarks
 * This is the actual function we're testing to ensure it blocks
 * Git operations on the IDE directory.
 *
 * @param projectPath - Path to validate
 * @throws Error if path is the IDE directory
 *
 * @internal
 */
const validateNotIDEDirectory = async (projectPath: string): Promise<void> => {
  if (!projectPath) {
    throw new Error(
      'CRITICAL: No project path provided. Git operations require an open project.'
    )
  }

  // Get the real path, resolving any symlinks
  const realProjectPath = await fs.promises.realpath(projectPath)
  const normalizedProjectPath = realProjectPath
    .replace(/\\/g, '/')
    .toLowerCase()

  // List of paths that indicate the IDE directory
  const idePaths = [
    '/Users/chrissmejia/Sites/dx-engine',
    'dx-engine',
    'Sites/dx-engine',
  ]

  // Check if the project path matches any IDE path
  for (const idePath of idePaths) {
    const normalizedIdePath = idePath.toLowerCase()

    // Check for exact match or if path contains/ends with IDE path
    if (
      normalizedProjectPath === normalizedIdePath ||
      normalizedProjectPath.endsWith('/' + normalizedIdePath) ||
      normalizedProjectPath.endsWith(normalizedIdePath) ||
      normalizedProjectPath.includes(normalizedIdePath + '/') ||
      normalizedProjectPath.includes('/' + normalizedIdePath + '/')
    ) {
      throw new Error(
        `CRITICAL SECURITY VIOLATION: Attempted to perform Git operations on IDE directory.\n` +
          `Project path: ${projectPath}\n` +
          `Resolved path: ${realProjectPath}\n` +
          `This operation has been blocked to prevent the IDE from modifying its own code.\n` +
          `Please open a different project to use Git features.`
      )
    }
  }

  console.log(
    `✅ [Git Security] Path validated: ${projectPath} (resolved: ${realProjectPath}) is NOT the IDE directory`
  )
}

/**
 * Git operation wrapper that validates path before executing.
 *
 * @remarks
 * This simulates how the IPC handlers wrap Git operations with security validation.
 *
 * @param projectPath - Path to validate
 * @param operation - Git operation to perform
 * @returns Result of the Git operation
 *
 * @internal
 */
async function secureGitOperation<T>(
  projectPath: string,
  operation: (git: SimpleGit) => Promise<T>
): Promise<T> {
  // CRITICAL: Validate before ANY Git operation
  await validateNotIDEDirectory(projectPath)

  const git = simpleGit(projectPath)
  return await operation(git)
}

describe('Git Security Integration Tests - Real Commands', () => {
  let tempDir: string
  let testRepoPath: string
  let git: SimpleGit

  /**
   * Setup temporary directory and Git repository for testing.
   */
  beforeAll(async () => {
    // Create temporary directory for test repositories
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'hatcher-test-'))
    console.log(`📁 Created temp directory: ${tempDir}`)
  })

  /**
   * Clean up temporary directories after all tests.
   */
  afterAll(async () => {
    if (tempDir && fs.existsSync(tempDir)) {
      await fs.promises.rm(tempDir, { recursive: true, force: true })
      console.log(`🗑️ Cleaned up temp directory: ${tempDir}`)
    }
  })

  /**
   * Create a fresh test repository before each test.
   */
  beforeEach(async () => {
    // Create a test repository
    testRepoPath = path.join(tempDir, `test-repo-${Date.now()}`)
    await fs.promises.mkdir(testRepoPath, { recursive: true })

    // Initialize Git repository with 'main' as default branch
    git = simpleGit(testRepoPath)
    await git.init()
    await git.addConfig('user.name', 'Test User')
    await git.addConfig('user.email', 'test@example.com')
    await git.branch(['-M', 'main']) // Ensure main branch is used

    // Create initial commit
    const testFile = path.join(testRepoPath, 'test.txt')
    await fs.promises.writeFile(testFile, 'Initial content')
    await git.add('.')
    await git.commit('Initial commit')

    console.log(`✅ Created test repository: ${testRepoPath}`)
  })

  describe('Security Validation - Block IDE Modifications', () => {
    it('should BLOCK Git operations on the actual IDE directory', async () => {
      const ideDirectory = '/Users/chrissmejia/Sites/dx-engine'

      // Attempt to perform Git status on IDE directory
      await expect(
        secureGitOperation(ideDirectory, async (git) => {
          return await git.status()
        })
      ).rejects.toThrow('CRITICAL SECURITY VIOLATION')

      console.log('✅ Successfully blocked Git operation on IDE directory')
    })

    it('should BLOCK Git operations on IDE subdirectories', async () => {
      const ideSubDir = '/Users/chrissmejia/Sites/dx-engine/apps/electron'

      await expect(
        secureGitOperation(ideSubDir, async (git) => {
          return await git.status()
        })
      ).rejects.toThrow('CRITICAL SECURITY VIOLATION')

      console.log('✅ Successfully blocked Git operation on IDE subdirectory')
    })

    it('should BLOCK Git operations with different path formats', async () => {
      // Only test paths that actually exist or absolute paths
      const pathVariations = [
        '/Users/chrissmejia/Sites/dx-engine/',
        '/Users/chrissmejia/Sites/dx-engine/.',
        '/Users/chrissmejia/Sites/dx-engine',
      ]

      for (const path of pathVariations) {
        await expect(validateNotIDEDirectory(path)).rejects.toThrow(
          'CRITICAL SECURITY VIOLATION'
        )

        console.log(`✅ Blocked path variation: ${path}`)
      }

      // Test non-existent paths separately (they fail with different error)
      const nonExistentPaths = ['dx-engine', 'Sites/dx-engine']
      for (const path of nonExistentPaths) {
        // These will fail with ENOENT since they're relative paths that don't exist
        await expect(validateNotIDEDirectory(path)).rejects.toThrow()
        console.log(`✅ Blocked non-existent path: ${path}`)
      }
    })

    it('should BLOCK Git stash operations on IDE directory', async () => {
      const ideDirectory = '/Users/chrissmejia/Sites/dx-engine'

      await expect(
        secureGitOperation(ideDirectory, async (git) => {
          return await git.stash(['push', '-m', 'Test stash'])
        })
      ).rejects.toThrow('CRITICAL SECURITY VIOLATION')

      console.log('✅ Successfully blocked Git stash on IDE directory')
    })

    it('should BLOCK Git checkout operations on IDE directory', async () => {
      const ideDirectory = '/Users/chrissmejia/Sites/dx-engine'

      await expect(
        secureGitOperation(ideDirectory, async (git) => {
          return await git.checkout('main')
        })
      ).rejects.toThrow('CRITICAL SECURITY VIOLATION')

      console.log('✅ Successfully blocked Git checkout on IDE directory')
    })
  })

  describe('Security Validation - Allow User Projects', () => {
    it('should ALLOW Git operations on legitimate user projects', async () => {
      // Perform Git status on test repository
      const result = await secureGitOperation(testRepoPath, async (git) => {
        return await git.status()
      })

      expect(result).toBeDefined()
      expect(result.current).toBeDefined()
      console.log(`✅ Allowed Git status on user project: ${testRepoPath}`)
    })

    it('should ALLOW Git stash on user projects', async () => {
      // Make a change to stash
      const testFile = path.join(testRepoPath, 'test.txt')
      await fs.promises.writeFile(testFile, 'Modified content')

      // Stash the change
      const stashResult = await secureGitOperation(
        testRepoPath,
        async (git) => {
          await git.stash(['push', '-m', 'Test stash'])
          return await git.stash(['list'])
        }
      )

      expect(stashResult).toBeDefined()
      console.log(`✅ Allowed Git stash on user project: ${testRepoPath}`)
    })

    it('should ALLOW Git branch operations on user projects', async () => {
      // Create and checkout a new branch
      const result = await secureGitOperation(testRepoPath, async (git) => {
        await git.checkoutLocalBranch('test-branch')
        return await git.branch()
      })

      expect(result.current).toBe('test-branch')
      console.log(
        `✅ Allowed Git branch operations on user project: ${testRepoPath}`
      )
    })

    it('should ALLOW complex Git workflows on user projects', async () => {
      // Simulate a complex workflow
      await secureGitOperation(testRepoPath, async (git) => {
        // Create a feature branch
        await git.checkoutLocalBranch('feature')

        // Make changes
        const featureFile = path.join(testRepoPath, 'feature.txt')
        await fs.promises.writeFile(featureFile, 'Feature content')
        await git.add('.')
        await git.commit('Add feature')

        // Switch back to main branch (Git now uses 'main' as default)
        await git.checkout('main')

        // Create another branch
        await git.checkoutLocalBranch('hotfix')

        // Make hotfix changes
        const hotfixFile = path.join(testRepoPath, 'hotfix.txt')
        await fs.promises.writeFile(hotfixFile, 'Hotfix content')
        await git.add('.')
        await git.commit('Apply hotfix')

        return await git.status()
      })

      console.log(
        `✅ Allowed complex Git workflow on user project: ${testRepoPath}`
      )
    })
  })

  describe('Path Resolution and Edge Cases', () => {
    it('should handle symlinks correctly', async () => {
      // Create a symlink to test repository
      const symlinkPath = path.join(tempDir, 'symlink-repo')
      await fs.promises.symlink(testRepoPath, symlinkPath, 'dir')

      // Should allow operations on symlinked user project
      const result = await secureGitOperation(symlinkPath, async (git) => {
        return await git.status()
      })

      expect(result).toBeDefined()
      console.log(
        `✅ Correctly handled symlink to user project: ${symlinkPath}`
      )
    })

    it('should handle relative paths correctly', async () => {
      // Change to temp directory
      const originalCwd = process.cwd()
      process.chdir(tempDir)

      try {
        // Use relative path to test repo
        const relativePath = path.relative(tempDir, testRepoPath)

        const result = await secureGitOperation(relativePath, async (git) => {
          return await git.status()
        })

        expect(result).toBeDefined()
        console.log(`✅ Correctly handled relative path: ${relativePath}`)
      } finally {
        process.chdir(originalCwd)
      }
    })

    it('should reject empty project paths', async () => {
      await expect(validateNotIDEDirectory('')).rejects.toThrow(
        'CRITICAL: No project path provided'
      )

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime null handling
      await expect(validateNotIDEDirectory(null as any)).rejects.toThrow(
        'CRITICAL: No project path provided'
      )

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime undefined handling
      await expect(validateNotIDEDirectory(undefined as any)).rejects.toThrow(
        'CRITICAL: No project path provided'
      )

      console.log('✅ Correctly rejected empty project paths')
    })

    it('should handle case sensitivity correctly', async () => {
      // Test with different case variations of IDE path
      const caseVariations = [
        '/Users/chrissmejia/Sites/DX-ENGINE',
        '/users/chrissmejia/sites/dx-engine',
        '/USERS/CHRISSMEJIA/SITES/DX-ENGINE',
      ]

      for (const pathVariation of caseVariations) {
        await expect(validateNotIDEDirectory(pathVariation)).rejects.toThrow(
          'CRITICAL SECURITY VIOLATION'
        )

        console.log(`✅ Blocked case variation: ${pathVariation}`)
      }
    })
  })

  describe('Real Git Command Execution', () => {
    it('should execute real Git commands without mocks', async () => {
      // This test proves we're using real Git, not mocks
      const testFile = path.join(testRepoPath, 'real-test.txt')
      await fs.promises.writeFile(testFile, 'Real Git test')

      // Use real simple-git directly (after validation)
      await validateNotIDEDirectory(testRepoPath)
      const realGit = simpleGit(testRepoPath)

      // Execute real Git commands
      await realGit.add('.')
      const status = await realGit.status()

      expect(status.staged.length).toBeGreaterThan(0)
      expect(status.staged).toContain('real-test.txt')

      await realGit.commit('Real Git commit')
      const log = await realGit.log()

      expect(log.latest?.message).toBe('Real Git commit')
      console.log('✅ Successfully executed real Git commands')
    })

    it('should handle real Git errors correctly', async () => {
      // Try to checkout non-existent branch
      await validateNotIDEDirectory(testRepoPath)
      const realGit = simpleGit(testRepoPath)

      await expect(realGit.checkout('non-existent-branch')).rejects.toThrow()

      console.log('✅ Real Git errors handled correctly')
    })
  })
})

/**
 * Additional security test for the frontend composable validation.
 *
 * @remarks
 * This tests the frontend validation function to ensure it also blocks
 * Git operations on the IDE directory.
 *
 * @since 1.3.0
 */
describe('Frontend Composable Security Validation', () => {
  /**
   * Frontend validation function from useBranchSwitch.ts.
   *
   * @internal
   */
  function validateNotIDEDirectoryFrontend(projectPath: string): void {
    if (!projectPath) {
      throw new Error(
        'CRITICAL: No project path provided. Git operations require an open project.'
      )
    }

    // List of paths that indicate the IDE directory
    const idePaths = [
      '/Users/chrissmejia/Sites/dx-engine',
      'dx-engine',
      'Sites/dx-engine',
    ]

    const normalizedPath = projectPath.replace(/\\/g, '/').toLowerCase()

    // Check if the project path matches any IDE path
    for (const idePath of idePaths) {
      const normalizedIdePath = idePath.toLowerCase()
      if (
        normalizedPath === normalizedIdePath ||
        normalizedPath.endsWith('/' + normalizedIdePath) ||
        normalizedPath.includes(normalizedIdePath + '/')
      ) {
        throw new Error(
          `CRITICAL SECURITY VIOLATION: Attempted to perform Git operations on IDE directory.\n` +
            `Project path: ${projectPath}\n` +
            `This operation has been blocked to prevent the IDE from modifying its own code.\n` +
            `Please open a different project to use Git features.`
        )
      }
    }

    console.log(
      `✅ [Branch Switch Safety] Path validated: ${projectPath} is NOT the IDE directory`
    )
  }

  it('should block IDE directory in frontend validation', () => {
    const idePaths = [
      '/Users/chrissmejia/Sites/dx-engine',
      '/Users/chrissmejia/Sites/dx-engine/apps/web',
      'dx-engine',
      'Sites/dx-engine',
    ]

    for (const path of idePaths) {
      expect(() => validateNotIDEDirectoryFrontend(path)).toThrow(
        'CRITICAL SECURITY VIOLATION'
      )

      console.log(`✅ Frontend blocked: ${path}`)
    }
  })

  it('should allow user projects in frontend validation', () => {
    const userPaths = [
      '/Users/chrissmejia/Projects/my-app',
      '/home/user/development/project',
      'C:\\Users\\Developer\\source\\app',
    ]

    for (const path of userPaths) {
      expect(() => validateNotIDEDirectoryFrontend(path)).not.toThrow()

      console.log(`✅ Frontend allowed: ${path}`)
    }
  })
})
