/**
 * @fileoverview CRITICAL SAFETY TESTS for GitRunner to prevent real Git operations in tests.
 *
 * 🚨 THESE TESTS ARE ESSENTIAL FOR PREVENTING DANGEROUS GIT OPERATIONS IN TEST ENVIRONMENTS
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GitRunner } from './GitRunner'

describe('🚨 GitRunner Safety System', () => {
  let gitRunner: GitRunner

  beforeEach(() => {
    gitRunner = new GitRunner()

    // Ensure we're in test environment
    process.env.NODE_ENV = 'test'
    process.env.VITEST = 'true'
  })

  afterEach(() => {
    gitRunner.cleanup()
  })

  describe('🛡️ Safety Guards - Without Mocking', () => {
    it('should PREVENT real add operation in test environment', async () => {
      // DON'T mock the execute method - this should be blocked by safety guards
      const result = await gitRunner.add(['test.txt'])

      expect(result.success).toBe(true)
      expect(result.stdout).toContain(
        'TEST MODE: Git operation simulated safely'
      )
      expect(result.exitCode).toBe(0)
      expect(result.duration).toBe(50) // Mock duration
    })

    it('should PREVENT real commit operation in test environment', async () => {
      // DON'T mock the execute method - this should be blocked by safety guards
      const result = await gitRunner.commit('Dangerous commit')

      expect(result.success).toBe(true)
      expect(result.stdout).toContain(
        'TEST MODE: Git operation simulated safely'
      )
      expect(result.exitCode).toBe(0)
      expect(result.duration).toBe(50) // Mock duration
    })

    it('should PREVENT real push operation in test environment', async () => {
      // DON'T mock the execute method - this should be blocked by safety guards
      const result = await gitRunner.push()

      expect(result.success).toBe(true)
      expect(result.stdout).toContain(
        'TEST MODE: Git operation simulated safely'
      )
      expect(result.exitCode).toBe(0)
      expect(result.duration).toBe(50) // Mock duration
    })

    it('should PREVENT real pull operation in test environment', async () => {
      // DON'T mock the execute method - this should be blocked by safety guards
      const result = await gitRunner.pull()

      expect(result.success).toBe(true)
      expect(result.stdout).toContain(
        'TEST MODE: Git operation simulated safely'
      )
      expect(result.exitCode).toBe(0)
      expect(result.duration).toBe(50) // Mock duration
    })

    it('should PREVENT real checkout operation in test environment', async () => {
      // DON'T mock the execute method - this should be blocked by safety guards
      const result = await gitRunner.checkout('main')

      expect(result.success).toBe(true)
      expect(result.stdout).toContain(
        'TEST MODE: Git operation simulated safely'
      )
      expect(result.exitCode).toBe(0)
      expect(result.duration).toBe(50) // Mock duration
    })
  })

  describe('🧪 Test Environment Detection', () => {
    it('should detect Vitest environment', () => {
      process.env.VITEST = 'true'
      // Access private method for testing using type assertion
      const isTest = (
        gitRunner as unknown as { isTestEnvironment(): boolean }
      ).isTestEnvironment()
      expect(isTest).toBe(true)
    })

    it('should detect NODE_ENV=test', () => {
      process.env.NODE_ENV = 'test'
      const isTest = (
        gitRunner as unknown as { isTestEnvironment(): boolean }
      ).isTestEnvironment()
      expect(isTest).toBe(true)
    })

    it('should detect CI environment', () => {
      process.env.CI = 'true'
      const isTest = (
        gitRunner as unknown as { isTestEnvironment(): boolean }
      ).isTestEnvironment()
      expect(isTest).toBe(true)
    })

    it('should detect mocked execute method', () => {
      vi.spyOn(gitRunner, 'execute' as keyof GitRunner).mockResolvedValue({
        success: true,
        exitCode: 0,
        stdout: '',
        stderr: '',
        duration: 0,
        command: 'test',
      })

      const isTest = (
        gitRunner as unknown as { isTestEnvironment(): boolean }
      ).isTestEnvironment()
      expect(isTest).toBe(true)
    })
  })

  describe('✅ Safe Operations (Read-only)', () => {
    beforeEach(() => {
      // Mock execute for safe operations
      vi.spyOn(gitRunner, 'execute' as keyof GitRunner).mockImplementation(
        async (...args: unknown[]) => {
          const command = args[0] as string
          if (command.includes('git status --porcelain')) {
            return {
              success: true,
              exitCode: 0,
              stdout: 'M  test.txt',
              stderr: '',
              duration: 100,
              command,
            }
          }
          if (command.includes('git branch --show-current')) {
            return {
              success: true,
              exitCode: 0,
              stdout: 'main',
              stderr: '',
              duration: 100,
              command,
            }
          }
          if (command.includes('git branch')) {
            return {
              success: true,
              exitCode: 0,
              stdout: '* main\n  feature\n',
              stderr: '',
              duration: 100,
              command,
            }
          }
          return {
            success: true,
            exitCode: 0,
            stdout: '',
            stderr: '',
            duration: 100,
            command,
          }
        }
      )
    })

    it('should allow safe status operation when mocked', async () => {
      const status = await gitRunner.status()
      expect(status).toHaveProperty('branch')
      expect(status.branch).toBe('main')
    })

    it('should allow safe log operation when mocked', async () => {
      const commits = await gitRunner.log(5)
      expect(Array.isArray(commits)).toBe(true)
    })

    it('should allow safe branch operation when mocked', async () => {
      const branches = await gitRunner.branch()
      expect(Array.isArray(branches)).toBe(true)
      expect(branches).toContain('main')
      expect(branches).toContain('feature')
    })

    it('should allow safe repository check when mocked', async () => {
      const isRepo = await gitRunner.isRepository()
      expect(typeof isRepo).toBe('boolean')
    })
  })

  describe('⚠️ Mock Verification', () => {
    it('should allow operations when execute is properly mocked', async () => {
      const mockExecute = vi
        .spyOn(gitRunner, 'execute' as keyof GitRunner)
        .mockResolvedValue({
          success: true,
          exitCode: 0,
          stdout: '',
          stderr: '',
          duration: 100,
          command: 'git add .',
        })

      // This should work because execute is mocked
      const result = await gitRunner.add([])
      expect(result.success).toBe(true)
      expect(mockExecute).toHaveBeenCalledWith('git add .', {})
    })
  })
})
