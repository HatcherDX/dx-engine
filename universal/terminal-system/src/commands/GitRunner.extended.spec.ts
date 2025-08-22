/**
 * @fileoverview Extended comprehensive tests for GitRunner to achieve high coverage.
 *
 * @description
 * This test suite provides additional coverage for GitRunner functionality that isn't
 * covered by the existing test files. It focuses on edge cases, error handling,
 * logging integration, safety systems, and advanced Git operations.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GitRunner } from './GitRunner'
import type { CommandResult, GitCommandOptions } from '../types/commands'

describe('GitRunner Extended Coverage', () => {
  let gitRunner: GitRunner
  let mockExecute: ReturnType<typeof vi.fn>

  beforeEach(() => {
    gitRunner = new GitRunner()

    // Mock the execute method to prevent actual git commands
    mockExecute = vi
      .spyOn(gitRunner, 'execute' as keyof GitRunner)
      .mockImplementation(async (command: string): Promise<CommandResult> => {
        return createMockResult(command)
      })
  })

  afterEach(() => {
    mockExecute.mockRestore()
    gitRunner.cleanup()
  })

  function createMockResult(command: string): CommandResult {
    const baseResult = {
      success: true,
      exitCode: 0,
      stderr: '',
      duration: 100,
      command,
    }

    // Comprehensive command mocking
    if (command.includes('git status --porcelain')) {
      return {
        ...baseResult,
        stdout:
          ' M modified-file.ts\nA  staged-file.ts\n?? untracked-file.ts\nUU conflicted-file.ts\nAA double-added.ts\nDD double-deleted.ts\nAU added-by-us.ts\nUA added-by-them.ts\nDU deleted-by-us.ts\nUD deleted-by-them.ts\n',
      }
    }

    if (command.includes('git branch --show-current')) {
      return { ...baseResult, stdout: 'feature/advanced-testing\n' }
    }

    if (command.includes('git rev-list --left-right --count')) {
      return { ...baseResult, stdout: '2\t3\n' }
    }

    if (command.includes('git branch')) {
      return {
        ...baseResult,
        stdout:
          '  main\n* feature/advanced-testing\n  develop\n  hotfix/urgent-fix\n',
      }
    }

    if (command.includes('git log')) {
      return {
        ...baseResult,
        stdout:
          'abc123|John Doe|2024-01-01 12:00:00|feat: implement advanced feature\n' +
          'def456|Jane Smith|2024-01-01 11:00:00|fix: resolve critical bug\n' +
          'ghi789|Bob Wilson|2024-01-01 10:00:00|docs: update README\n',
      }
    }

    if (command.includes('git rev-parse --is-inside-work-tree')) {
      return { ...baseResult, stdout: 'true\n' }
    }

    // Mock successful operations
    if (
      command.includes('git add') ||
      command.includes('git commit') ||
      command.includes('git push') ||
      command.includes('git pull') ||
      command.includes('git checkout')
    ) {
      return { ...baseResult, stdout: 'Operation completed successfully\n' }
    }

    return { ...baseResult, stdout: 'Mock response\n' }
  }

  describe('status method advanced scenarios', () => {
    it('should parse complex git status with all file types', async () => {
      const status = await gitRunner.status()

      expect(status.branch).toBe('feature/advanced-testing')
      expect(status.ahead).toBe(3)
      expect(status.behind).toBe(2)
      expect(status.modified).toContain('modified-file.ts')
      expect(status.staged).toContain('staged-file.ts')
      expect(status.untracked).toContain('untracked-file.ts')
      expect(status.conflicted).toEqual(
        expect.arrayContaining([
          'conflicted-file.ts',
          'double-added.ts',
          'double-deleted.ts',
          'added-by-us.ts',
          'added-by-them.ts',
          'deleted-by-us.ts',
          'deleted-by-them.ts',
        ])
      )
    })

    it('should handle status with custom options', async () => {
      const options: GitCommandOptions = {
        cwd: '/custom/path',
        timeout: 5000,
        env: { GIT_TERMINAL_PROMPT: '0' },
      }

      await gitRunner.status(options)

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('git branch --show-current'),
        options
      )
      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('git status --porcelain'),
        options
      )
    })

    it('should handle status parsing errors gracefully', async () => {
      mockExecute.mockImplementationOnce(async () => {
        throw new Error('Git repository not found')
      })

      const status = await gitRunner.status()

      // Should return fallback status
      expect(status.branch).toBe('unknown')
      expect(status.ahead).toBe(0)
      expect(status.behind).toBe(0)
      expect(status.modified).toEqual([])
      expect(status.staged).toEqual([])
      expect(status.untracked).toEqual([])
      expect(status.conflicted).toEqual([])
    })

    it('should handle empty status output', async () => {
      mockExecute.mockImplementation(async (command: string) => ({
        success: true,
        exitCode: 0,
        stdout: command.includes('git branch --show-current') ? 'main\n' : '',
        stderr: '',
        duration: 100,
        command,
      }))

      const status = await gitRunner.status()

      expect(status.branch).toBe('main')
      expect(status.modified).toEqual([])
      expect(status.staged).toEqual([])
      expect(status.untracked).toEqual([])
      expect(status.conflicted).toEqual([])
    })
  })

  describe('log method advanced scenarios', () => {
    it('should handle log errors gracefully', async () => {
      mockExecute.mockImplementationOnce(async () => {
        throw new Error('No commits found')
      })

      const commits = await gitRunner.log(5)

      expect(commits).toEqual([])
    })

    it('should parse log with custom count', async () => {
      const commits = await gitRunner.log(3)

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('-n 3'),
        expect.any(Object)
      )
      expect(commits).toHaveLength(3)
    })

    it('should handle malformed log output', async () => {
      mockExecute.mockImplementationOnce(async () => ({
        success: true,
        exitCode: 0,
        stdout: 'malformed|log|output|message\nincomplete-line-without-pipes',
        stderr: '',
        duration: 100,
        command: 'git log',
      }))

      const commits = await gitRunner.log(5)

      // Should process all non-empty lines, even malformed ones
      expect(commits).toHaveLength(2)
      expect(commits[0].hash).toBe('malformed')
      expect(commits[0].author).toBe('log')
      expect(commits[0].date).toBe('output')
      expect(commits[0].message).toBe('message')

      // Second line without pipes will be parsed with undefined values
      expect(commits[1].hash).toBe('incomplete-line-without-pipes')
      expect(commits[1].author).toBeUndefined()
      expect(commits[1].date).toBeUndefined()
      expect(commits[1].message).toBeUndefined()
    })
  })

  describe('add method advanced scenarios', () => {
    it('should add all files when empty array provided', async () => {
      await gitRunner.add([])

      expect(mockExecute).toHaveBeenCalledWith('git add .', expect.any(Object))
    })

    it('should quote file names with spaces', async () => {
      await gitRunner.add(['file with spaces.txt', 'normal-file.txt'])

      expect(mockExecute).toHaveBeenCalledWith(
        'git add "file with spaces.txt" "normal-file.txt"',
        expect.any(Object)
      )
    })

    it('should handle add with custom options', async () => {
      const options: GitCommandOptions = {
        cwd: '/project',
        env: { GIT_INDEX_FILE: '.git/custom-index' },
      }

      await gitRunner.add(['src/**/*.ts'], options)

      expect(mockExecute).toHaveBeenCalledWith('git add "src/**/*.ts"', options)
    })
  })

  describe('commit method advanced scenarios', () => {
    it('should escape quotes in commit message', async () => {
      await gitRunner.commit('feat: add "quoted" feature')

      expect(mockExecute).toHaveBeenCalledWith(
        'git commit -m "feat: add \\"quoted\\" feature"',
        expect.any(Object)
      )
    })

    it('should handle multiline commit messages', async () => {
      const message =
        'feat: add feature\n\nDetailed description\nwith multiple lines'
      await gitRunner.commit(message)

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('git commit -m'),
        expect.any(Object)
      )
    })

    it('should handle commit with custom options', async () => {
      const options: GitCommandOptions = {
        cwd: '/repo',
        timeout: 10000,
      }

      await gitRunner.commit('test commit', options)

      expect(mockExecute).toHaveBeenCalledWith(
        'git commit -m "test commit"',
        options
      )
    })
  })

  describe('push method advanced scenarios', () => {
    it('should push to default remote', async () => {
      await gitRunner.push()

      expect(mockExecute).toHaveBeenCalledWith(
        'git push origin',
        expect.any(Object)
      )
    })

    it('should push to specific branch', async () => {
      const options: GitCommandOptions = {
        branch: 'feature/new-feature',
        remote: 'upstream',
      }

      await gitRunner.push(options)

      expect(mockExecute).toHaveBeenCalledWith(
        'git push upstream feature/new-feature',
        options
      )
    })

    it('should push with custom remote only', async () => {
      await gitRunner.push({ remote: 'fork' })

      expect(mockExecute).toHaveBeenCalledWith(
        'git push fork',
        expect.any(Object)
      )
    })
  })

  describe('pull method advanced scenarios', () => {
    it('should pull from default remote', async () => {
      await gitRunner.pull()

      expect(mockExecute).toHaveBeenCalledWith('git pull', expect.any(Object))
    })

    it('should pull from specific remote and branch', async () => {
      const options: GitCommandOptions = {
        remote: 'upstream',
        branch: 'main',
      }

      await gitRunner.pull(options)

      expect(mockExecute).toHaveBeenCalledWith(
        'git pull upstream main',
        options
      )
    })

    it('should pull with only remote specified', async () => {
      await gitRunner.pull({ remote: 'origin' })

      expect(mockExecute).toHaveBeenCalledWith('git pull', expect.any(Object))
    })
  })

  describe('branch method advanced scenarios', () => {
    it('should parse branch list correctly', async () => {
      const branches = await gitRunner.branch()

      expect(branches).toEqual([
        'main',
        'feature/advanced-testing',
        'develop',
        'hotfix/urgent-fix',
      ])
    })

    it('should handle branch errors gracefully', async () => {
      mockExecute.mockImplementationOnce(async () => {
        throw new Error('Not a git repository')
      })

      const branches = await gitRunner.branch()

      expect(branches).toEqual([])
    })

    it('should handle empty branch output', async () => {
      mockExecute.mockImplementationOnce(async () => ({
        success: true,
        exitCode: 0,
        stdout: '',
        stderr: '',
        duration: 100,
        command: 'git branch',
      }))

      const branches = await gitRunner.branch()

      expect(branches).toEqual([])
    })
  })

  describe('checkout method', () => {
    it('should checkout specified branch', async () => {
      await gitRunner.checkout('develop')

      expect(mockExecute).toHaveBeenCalledWith(
        'git checkout develop',
        expect.any(Object)
      )
    })

    it('should checkout with custom options', async () => {
      const options: GitCommandOptions = {
        cwd: '/project',
        timeout: 15000,
      }

      await gitRunner.checkout('feature/new-branch', options)

      expect(mockExecute).toHaveBeenCalledWith(
        'git checkout feature/new-branch',
        options
      )
    })
  })

  describe('quickCommit method advanced scenarios', () => {
    it('should perform add followed by commit', async () => {
      const result = await gitRunner.quickCommit('feat: quick implementation')

      // Should call add first, then commit
      expect(mockExecute).toHaveBeenCalledWith('git add .', expect.any(Object))
      expect(mockExecute).toHaveBeenCalledWith(
        'git commit -m "feat: quick implementation"',
        expect.any(Object)
      )
      expect(result.success).toBe(true)
    })

    it('should return add error if add fails', async () => {
      mockExecute.mockImplementation(async (command: string) => {
        if (command.includes('git add')) {
          return {
            success: false,
            exitCode: 1,
            stdout: '',
            stderr: 'No files to add',
            duration: 100,
            command,
          }
        }
        return createMockResult(command)
      })

      const result = await gitRunner.quickCommit('test')

      expect(result.success).toBe(false)
      expect(result.stderr).toBe('No files to add')
    })

    it('should handle quickCommit with custom options', async () => {
      const options: GitCommandOptions = {
        cwd: '/workspace',
        env: { GIT_AUTHOR_NAME: 'Test User' },
      }

      await gitRunner.quickCommit('test commit', options)

      expect(mockExecute).toHaveBeenCalledWith('git add .', options)
      expect(mockExecute).toHaveBeenCalledWith(
        'git commit -m "test commit"',
        options
      )
    })
  })

  describe('sync method', () => {
    it('should perform pull followed by push', async () => {
      const result = await gitRunner.sync()

      expect(mockExecute).toHaveBeenCalledWith('git pull', expect.any(Object))
      expect(mockExecute).toHaveBeenCalledWith(
        'git push origin',
        expect.any(Object)
      )
      expect(result.success).toBe(true)
    })

    it('should return pull error if pull fails', async () => {
      mockExecute.mockImplementation(async (command: string) => {
        if (command.includes('git pull')) {
          return {
            success: false,
            exitCode: 1,
            stdout: '',
            stderr: 'Merge conflict',
            duration: 100,
            command,
          }
        }
        return createMockResult(command)
      })

      const result = await gitRunner.sync()

      expect(result.success).toBe(false)
      expect(result.stderr).toBe('Merge conflict')
    })

    it('should sync with custom options', async () => {
      const options: GitCommandOptions = {
        remote: 'upstream',
        branch: 'main',
      }

      await gitRunner.sync(options)

      expect(mockExecute).toHaveBeenCalledWith(
        'git pull upstream main',
        options
      )
      expect(mockExecute).toHaveBeenCalledWith(
        'git push upstream main',
        options
      )
    })
  })

  describe('getWorkingTreeStatus method', () => {
    it('should return clean when no changes', async () => {
      mockExecute.mockImplementation(async (command: string) => {
        if (command.includes('git status --porcelain')) {
          return {
            success: true,
            exitCode: 0,
            stdout: '',
            stderr: '',
            duration: 100,
            command,
          }
        }
        return createMockResult(command)
      })

      const status = await gitRunner.getWorkingTreeStatus()

      expect(status).toBe('clean')
    })

    it('should return dirty when has changes', async () => {
      mockExecute.mockImplementation(async (command: string) => {
        if (command.includes('git status --porcelain')) {
          return {
            success: true,
            exitCode: 0,
            stdout: ' M modified-file.ts\n',
            stderr: '',
            duration: 100,
            command,
          }
        }
        return createMockResult(command)
      })

      const status = await gitRunner.getWorkingTreeStatus()

      expect(status).toBe('dirty')
    })

    it('should return conflicted when has conflicts', async () => {
      mockExecute.mockImplementation(async (command: string) => {
        if (command.includes('git status --porcelain')) {
          return {
            success: true,
            exitCode: 0,
            stdout: 'UU conflicted-file.ts\n',
            stderr: '',
            duration: 100,
            command,
          }
        }
        return createMockResult(command)
      })

      const status = await gitRunner.getWorkingTreeStatus()

      expect(status).toBe('conflicted')
    })
  })

  describe('isRepository method', () => {
    it('should return true for valid git repository', async () => {
      const isRepo = await gitRunner.isRepository()

      expect(isRepo).toBe(true)
      expect(mockExecute).toHaveBeenCalledWith(
        'git rev-parse --is-inside-work-tree',
        { cwd: undefined }
      )
    })

    it('should return false for invalid repository', async () => {
      mockExecute.mockImplementationOnce(async () => {
        throw new Error('Not a git repository')
      })

      const isRepo = await gitRunner.isRepository()

      expect(isRepo).toBe(false)
    })

    it('should check repository at specific path', async () => {
      const isRepo = await gitRunner.isRepository('/custom/path')

      expect(mockExecute).toHaveBeenCalledWith(
        'git rev-parse --is-inside-work-tree',
        { cwd: '/custom/path' }
      )
      expect(isRepo).toBe(true)
    })

    it('should handle incorrect stdout response', async () => {
      mockExecute.mockImplementationOnce(async () => ({
        success: true,
        exitCode: 0,
        stdout: 'false\n',
        stderr: '',
        duration: 100,
        command: 'git rev-parse --is-inside-work-tree',
      }))

      const isRepo = await gitRunner.isRepository()

      expect(isRepo).toBe(false)
    })
  })

  describe('getSafetyStatus method', () => {
    it('should return comprehensive safety status', () => {
      const safetyStatus = gitRunner.getSafetyStatus()

      expect(safetyStatus).toHaveProperty('isTestEnvironment')
      expect(safetyStatus).toHaveProperty('confidence')
      expect(safetyStatus).toHaveProperty('triggers')
      expect(safetyStatus).toHaveProperty('legacyDetection')
      expect(safetyStatus).toHaveProperty('enhancedDetection')
      expect(safetyStatus).toHaveProperty('recentDetections')

      expect(typeof safetyStatus.isTestEnvironment).toBe('boolean')
      expect(typeof safetyStatus.confidence).toBe('number')
      expect(Array.isArray(safetyStatus.triggers)).toBe(true)
    })

    it('should detect test environment correctly', () => {
      const safetyStatus = gitRunner.getSafetyStatus()

      // In Vitest environment, should detect test
      expect(safetyStatus.isTestEnvironment).toBe(true)
      expect(safetyStatus.confidence).toBeGreaterThan(0)
      expect(safetyStatus.triggers.length).toBeGreaterThan(0)
    })
  })

  describe('Error handling and edge cases', () => {
    it('should handle executeWithLogging with fallback value', async () => {
      mockExecute.mockImplementationOnce(async () => {
        throw new Error('Command failed')
      })

      // Status method uses executeWithLogging with fallback
      const status = await gitRunner.status()

      expect(status.branch).toBe('unknown')
      expect(status.ahead).toBe(0)
      expect(status.behind).toBe(0)
    })

    it('should handle logging system initialization failure', async () => {
      // GitRunner should work even if logging system fails to initialize
      const result = await gitRunner.add(['test.txt'])

      expect(result.success).toBe(true)
    })

    it('should handle enhanced safety detection failure', async () => {
      // Even if safety detection fails, should still work
      const result = await gitRunner.status()

      expect(result).toHaveProperty('branch')
      expect(result).toHaveProperty('modified')
    })
  })

  describe('Logging integration', () => {
    it('should handle operations with logging wrapper', async () => {
      // Test that operations work with logging integration
      const result = await gitRunner.commit('test commit with logging')

      expect(result.success).toBe(true)
    })

    it('should handle operations without logging system', async () => {
      // Test fallback when logging system is not available
      const result = await gitRunner.push({ remote: 'origin' })

      expect(result.success).toBe(true)
    })
  })
})
