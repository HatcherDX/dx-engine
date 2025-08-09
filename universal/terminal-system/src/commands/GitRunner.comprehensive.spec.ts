/**
 * @fileoverview Critical safety test suite for GitRunner to prevent real Git operations during testing.
 *
 * @description
 * This test suite specifically validates that GitRunner NEVER executes real Git commands
 * during test execution. It includes tests that deliberately attempt dangerous operations
 * without mocks to ensure the built-in safety system prevents them.
 *
 * WARNING: This file tests safety mechanisms and should NEVER create real commits or
 * perform actual Git operations. If real Git operations occur, the safety system has failed.
 *
 * @example
 * ```typescript
 * // This test verifies that even without mocks, dangerous operations are prevented
 * const result = await gitRunner.commit('DANGEROUS TEST COMMIT - SHOULD BE BLOCKED')
 * expect(result.stdout).toContain('TEST MODE: Git operation simulated safely')
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GitRunner } from './GitRunner'

describe('GitRunner Safety System', () => {
  let gitRunner: GitRunner
  let originalNodeEnv: string | undefined
  let originalVitest: string | undefined

  beforeEach(() => {
    // Store original environment
    originalNodeEnv = process.env.NODE_ENV
    originalVitest = process.env.VITEST

    // Ensure we're in test environment for safety
    process.env.NODE_ENV = 'test'
    process.env.VITEST = 'true'

    gitRunner = new GitRunner()
  })

  afterEach(() => {
    // Restore original environment
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv
    } else {
      delete process.env.NODE_ENV
    }

    if (originalVitest !== undefined) {
      process.env.VITEST = originalVitest
    } else {
      delete process.env.VITEST
    }
  })

  describe('Test Environment Detection', () => {
    /**
     * Tests that GitRunner correctly identifies test environments.
     *
     * @returns void
     * Should detect test environment and use safe mock results
     *
     * @example
     * ```typescript
     * // Even without explicit mocks, should return safe results
     * const result = await gitRunner.status()
     * expect(result.branch).toBe('main')
     * expect(result.modified).toContain('src/test-file.ts')
     * ```
     *
     * @public
     */
    it('should detect test environment and prevent real Git operations', async () => {
      // Test a safe read operation first
      const statusResult = await gitRunner.status()

      expect(statusResult.branch).toBe('main')
      expect(statusResult.modified).toContain('src/test-file.ts')
      expect(statusResult.untracked).toContain('src/new-file.ts')
    })

    /**
     * Tests detection through NODE_ENV variable.
     *
     * @returns void
     * Should detect test environment via NODE_ENV
     *
     * @public
     */
    it('should detect test environment via NODE_ENV', async () => {
      process.env.NODE_ENV = 'test'
      delete process.env.VITEST

      const result = await gitRunner.branch()
      expect(result).toEqual(['main', 'feature-branch', 'develop'])
    })

    /**
     * Tests detection through VITEST environment variable.
     *
     * @returns void
     * Should detect test environment via VITEST variable
     *
     * @public
     */
    it('should detect test environment via VITEST variable', async () => {
      delete process.env.NODE_ENV
      process.env.VITEST = 'true'

      const result = await gitRunner.log(5)
      expect(result).toHaveLength(2)
      expect(result[0].message).toBe('Test commit message')
    })

    /**
     * Tests detection through global vitest objects.
     *
     * @returns void
     * Should detect test environment via global vi object
     *
     * @public
     */
    it('should detect test environment via global vi object', async () => {
      delete process.env.NODE_ENV
      delete process.env.VITEST

      // vi is already available in Vitest environment
      expect(typeof vi).toBe('object')

      const result = await gitRunner.isRepository()
      expect(result).toBe(true)
    })
  })

  describe('Dangerous Operation Prevention', () => {
    /**
     * CRITICAL TEST: Verifies that commit operations are blocked in tests.
     *
     * @returns Promise<void>
     * Should prevent real commit and return safe mock result
     *
     * @throws Should NOT throw but should prevent real Git commit
     *
     * @example
     * ```typescript
     * // This MUST NOT create a real Git commit
     * const result = await gitRunner.commit('DANGEROUS TEST COMMIT')
     * expect(result.stdout).toContain('TEST MODE: Git operation simulated safely')
     * ```
     *
     * @public
     */
    it('🛡️ CRITICAL: should prevent real Git commit operations', async () => {
      // This would be extremely dangerous if it executed for real
      const result = await gitRunner.commit(
        'DANGEROUS TEST COMMIT - SHOULD BE BLOCKED'
      )

      expect(result.success).toBe(true)
      expect(result.stdout).toContain(
        'TEST MODE: Git operation simulated safely'
      )
      expect(result.exitCode).toBe(0)

      // Verify it's a mock result, not a real commit
      expect(result.duration).toBe(50) // Mock duration
    })

    /**
     * CRITICAL TEST: Verifies that quickCommit operations are blocked in tests.
     *
     * @returns Promise<void>
     * Should prevent real quickCommit and return safe mock result
     *
     * @public
     */
    it('🛡️ CRITICAL: should prevent real Git quickCommit operations', async () => {
      // This would be extremely dangerous - it adds ALL files and commits them
      const result = await gitRunner.quickCommit(
        'DANGEROUS QUICK COMMIT - SHOULD BE BLOCKED'
      )

      expect(result.success).toBe(true)
      expect(result.stdout).toContain(
        'TEST MODE: Git operation simulated safely'
      )
    })

    /**
     * CRITICAL TEST: Verifies that push operations are blocked in tests.
     *
     * @returns Promise<void>
     * Should prevent real push and return safe mock result
     *
     * @public
     */
    it('🛡️ CRITICAL: should prevent real Git push operations', async () => {
      const result = await gitRunner.push()

      expect(result.success).toBe(true)
      expect(result.stdout).toContain(
        'TEST MODE: Git operation simulated safely'
      )
    })

    /**
     * CRITICAL TEST: Verifies that pull operations are blocked in tests.
     *
     * @returns Promise<void>
     * Should prevent real pull and return safe mock result
     *
     * @public
     */
    it('🛡️ CRITICAL: should prevent real Git pull operations', async () => {
      const result = await gitRunner.pull()

      expect(result.success).toBe(true)
      expect(result.stdout).toContain(
        'TEST MODE: Git operation simulated safely'
      )
    })

    /**
     * CRITICAL TEST: Verifies that add operations are blocked in tests.
     *
     * @returns Promise<void>
     * Should prevent real add and return safe mock result
     *
     * @public
     */
    it('🛡️ CRITICAL: should prevent real Git add operations', async () => {
      // This could stage unwanted files if it executed for real
      const result = await gitRunner.add(['.'])

      expect(result.success).toBe(true)
      expect(result.stdout).toContain(
        'TEST MODE: Git operation simulated safely'
      )
    })

    /**
     * CRITICAL TEST: Verifies that checkout operations are blocked in tests.
     *
     * @returns Promise<void>
     * Should prevent real checkout and return safe mock result
     *
     * @public
     */
    it('🛡️ CRITICAL: should prevent real Git checkout operations', async () => {
      const result = await gitRunner.checkout('main')

      expect(result.success).toBe(true)
      expect(result.stdout).toContain(
        'TEST MODE: Git operation simulated safely'
      )
    })

    /**
     * CRITICAL TEST: Verifies that sync operations are blocked in tests.
     *
     * @returns Promise<void>
     * Should prevent real sync (pull + push) and return safe mock result
     *
     * @public
     */
    it('🛡️ CRITICAL: should prevent real Git sync operations', async () => {
      // Sync does pull + push, both dangerous
      const result = await gitRunner.sync()

      expect(result.success).toBe(true)
      expect(result.stdout).toContain(
        'TEST MODE: Git operation simulated safely'
      )
    })
  })

  describe('Safe Read Operations', () => {
    /**
     * Tests that safe read operations return appropriate mock data.
     *
     * @returns Promise<void>
     * Should return consistent mock data for status operations
     *
     * @public
     */
    it('should provide realistic mock data for status operations', async () => {
      const status = await gitRunner.status()

      expect(status.branch).toBe('main')
      expect(status.ahead).toBe(0)
      expect(status.behind).toBe(0)
      expect(status.modified).toContain('src/test-file.ts')
      expect(status.untracked).toContain('src/new-file.ts')
      expect(status.staged).toEqual([])
      expect(status.conflicted).toEqual([])
    })

    /**
     * Tests that branch listing returns appropriate mock data.
     *
     * @returns Promise<void>
     * Should return consistent mock data for branch operations
     *
     * @public
     */
    it('should provide realistic mock data for branch operations', async () => {
      const branches = await gitRunner.branch()

      expect(branches).toEqual(['main', 'feature-branch', 'develop'])
    })

    /**
     * Tests that log operations return appropriate mock data.
     *
     * @returns Promise<void>
     * Should return consistent mock data for log operations
     *
     * @public
     */
    it('should provide realistic mock data for log operations', async () => {
      const commits = await gitRunner.log(3)

      expect(commits).toHaveLength(2)
      expect(commits[0]).toEqual({
        hash: 'abc123',
        author: 'Test Author',
        date: '2024-01-01 12:00:00',
        message: 'Test commit message',
        files: [],
      })
    })

    /**
     * Tests working tree status detection with mock data.
     *
     * @returns Promise<void>
     * Should return 'dirty' status based on mock data
     *
     * @public
     */
    it('should provide consistent working tree status', async () => {
      const status = await gitRunner.getWorkingTreeStatus()

      // Based on mock data (has modified files), should be 'dirty'
      expect(status).toBe('dirty')
    })

    /**
     * Tests repository detection with mock data.
     *
     * @returns Promise<void>
     * Should return true for repository detection
     *
     * @public
     */
    it('should provide consistent repository detection', async () => {
      const isRepo = await gitRunner.isRepository()

      expect(isRepo).toBe(true)
    })
  })

  describe('Error Scenarios', () => {
    /**
     * Tests that the safety system handles edge cases gracefully.
     *
     * @returns Promise<void>
     * Should handle unknown commands safely
     *
     * @public
     */
    it('should handle unknown Git commands safely', async () => {
      // Test direct execute call with unknown command
      const result = await gitRunner.execute('git unknown-command --test')

      expect(result.success).toBe(true)
      expect(result.stdout).toContain('Test mode: Safe mock response')
    })

    /**
     * Tests safety system with mixed command scenarios.
     *
     * @returns Promise<void>
     * Should handle complex command scenarios safely
     *
     * @public
     */
    it('should handle complex command scenarios safely', async () => {
      // Test with options
      const result = await gitRunner.execute('git commit -m "test"', {
        cwd: '/tmp',
      })

      expect(result.success).toBe(true)
      expect(result.stdout).toContain(
        'TEST MODE: Git operation simulated safely'
      )
    })
  })

  describe('Production Environment Simulation', () => {
    /**
     * Tests that production environment detection works correctly.
     *
     * @returns Promise<void>
     * Should detect when NOT in test environment (but this test itself is still in test env)
     *
     * @public
     */
    it('should still use safety in test environment even when env vars are cleared', async () => {
      // Clear test environment indicators
      delete process.env.NODE_ENV
      delete process.env.VITEST

      // But vi global should still be available (we're in Vitest)
      const result = await gitRunner.commit('Should still be blocked')

      expect(result.success).toBe(true)
      expect(result.stdout).toContain(
        'TEST MODE: Git operation simulated safely'
      )
    })
  })
})
