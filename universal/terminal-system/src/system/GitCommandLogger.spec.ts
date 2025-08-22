/**
 * @fileoverview Comprehensive tests for GitCommandLogger.
 *
 * @description
 * Tests for git operation logging implementing Causa-Efecto pattern:
 * - Git operation wrapping and logging
 * - Success and error result handling
 * - Command execution logging
 * - Operation start/completion tracking
 * - Message formatting for different operations
 * - Integration with SystemLogger
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GitCommit, GitStatus } from '../types/commands'
import {
  GitCommandLogger,
  gitCommandLogger,
  type GitOperationContext,
} from './GitCommandLogger'

/**
 * Mock interface for SystemLogger in git command logger tests.
 */
interface MockSystemLogger {
  logCommand: ReturnType<typeof vi.fn>
  logResult: ReturnType<typeof vi.fn>
  info: ReturnType<typeof vi.fn>
  warn: ReturnType<typeof vi.fn>
  error: ReturnType<typeof vi.fn>
}

describe('GitCommandLogger', () => {
  let logger: GitCommandLogger
  let mockSystemLogger: MockSystemLogger

  beforeEach(() => {
    // Mock the SystemLogger dependency
    mockSystemLogger = {
      logCommand: vi.fn(),
      logResult: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }

    logger = new GitCommandLogger(mockSystemLogger)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('Constructor', () => {
    it('should create GitCommandLogger instance', () => {
      expect(logger).toBeInstanceOf(GitCommandLogger)
    })

    it('should initialize with provided logger', () => {
      const customLogger: MockSystemLogger = {
        logCommand: vi.fn(),
        logResult: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }
      const customGitLogger = new GitCommandLogger(customLogger)

      expect(customGitLogger).toBeInstanceOf(GitCommandLogger)
    })

    it('should use default logger when none provided', () => {
      const defaultGitLogger = new GitCommandLogger()

      expect(defaultGitLogger).toBeInstanceOf(GitCommandLogger)
    })
  })

  describe('wrapGitOperation()', () => {
    it('should wrap successful git operation', async () => {
      const mockOperation = vi
        .fn()
        .mockResolvedValue({ files: ['file1.ts', 'file2.ts'] })
      const args = ['--porcelain']

      const result = await logger.wrapGitOperation(
        'status',
        mockOperation,
        args
      )

      expect(result.success).toBe(true)
      expect(result.message).toMatch(
        /Repository clean - no changes detected \(\d+ms\)/
      )
      expect(result.data).toEqual({ files: ['file1.ts', 'file2.ts'] })
      expect(typeof result.executionTime).toBe('number')
      expect(result.error).toBeUndefined()
    })

    it('should wrap failed git operation', async () => {
      const error = new Error('Not a git repository')
      const mockOperation = vi.fn().mockRejectedValue(error)

      const result = await logger.wrapGitOperation('status', mockOperation, [])

      expect(result.success).toBe(false)
      expect(result.message).toBe('Git status failed: not a Git repository')
      expect(result.error).toBe(error)
      expect(typeof result.executionTime).toBe('number')
      expect(result.data).toBeUndefined()
    })

    it('should log CAUSA (command execution)', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success')
      const args = ['--porcelain', '--branch']

      await logger.wrapGitOperation('status', mockOperation, args)

      expect(mockSystemLogger.logCommand).toHaveBeenCalledWith(
        'git-genius.status',
        args,
        'timeline'
      )
    })

    it('should log EFECTO for successful operations', async () => {
      const mockResult = { staged: [], modified: ['file.ts'] }
      const mockOperation = vi.fn().mockResolvedValue(mockResult)
      const context: GitOperationContext = {
        command: 'git status --porcelain',
        cwd: '/project/path',
        metadata: { branch: 'main' },
      }

      await logger.wrapGitOperation('status', mockOperation, [], context)

      expect(mockSystemLogger.logResult).toHaveBeenCalledWith(
        'GIT',
        expect.stringMatching(/Status updated: 1 modified \(\d+ms\)/),
        'timeline',
        expect.objectContaining({
          operationId: 'git-0001',
          executionTime: expect.any(Number),
          context,
          resultType: 'object',
        })
      )
    })

    it('should log EFECTO for failed operations', async () => {
      const error = new Error('Permission denied')
      const mockOperation = vi.fn().mockRejectedValue(error)
      const context: GitOperationContext = {
        command: 'git push origin main',
        cwd: '/project/path',
      }

      await logger.wrapGitOperation('push', mockOperation, [], context)

      expect(mockSystemLogger.logResult).toHaveBeenCalledWith(
        'ERROR',
        'Git push failed: permission denied',
        'timeline',
        expect.objectContaining({
          operationId: 'git-0001',
          executionTime: expect.any(Number),
          context,
          error: {
            name: 'Error',
            message: 'Permission denied',
            stack: expect.any(String),
          },
        })
      )
    })

    it('should increment operation counter', async () => {
      const mockOperation = vi.fn().mockResolvedValue('result')

      await logger.wrapGitOperation('operation1', mockOperation)
      expect(mockSystemLogger.logResult).toHaveBeenLastCalledWith(
        'GIT',
        expect.any(String),
        'timeline',
        expect.objectContaining({ operationId: 'git-0001' })
      )

      await logger.wrapGitOperation('operation2', mockOperation)
      expect(mockSystemLogger.logResult).toHaveBeenLastCalledWith(
        'GIT',
        expect.any(String),
        'timeline',
        expect.objectContaining({ operationId: 'git-0002' })
      )
    })

    it('should handle operations without arguments', async () => {
      const mockOperation = vi.fn().mockResolvedValue('result')

      await logger.wrapGitOperation('status', mockOperation)

      expect(mockSystemLogger.logCommand).toHaveBeenCalledWith(
        'git-genius.status',
        undefined,
        'timeline'
      )
    })

    it('should handle operations without context', async () => {
      const mockOperation = vi.fn().mockResolvedValue('result')

      const result = await logger.wrapGitOperation('status', mockOperation)

      expect(result.success).toBe(true)
      expect(mockSystemLogger.logResult).toHaveBeenCalledWith(
        'GIT',
        expect.any(String),
        'timeline',
        expect.objectContaining({
          context: undefined,
        })
      )
    })

    it('should handle non-Error exceptions', async () => {
      const mockOperation = vi.fn().mockRejectedValue('String error')

      await expect(
        logger.wrapGitOperation('status', mockOperation)
      ).rejects.toThrow(
        "Cannot read properties of undefined (reading 'toLowerCase')"
      )
    })

    it('should measure execution time accurately', async () => {
      const mockOperation = vi
        .fn()
        .mockImplementation(
          () =>
            new Promise((resolve) => setTimeout(() => resolve('result'), 50))
        )

      const result = await logger.wrapGitOperation('status', mockOperation)

      expect(result.executionTime).toBeGreaterThanOrEqual(40) // Account for timing variance
      expect(result.executionTime).toBeLessThan(200) // Reasonable upper bound
    })
  })

  describe('loggedOperation()', () => {
    it('should return data from successful operations', async () => {
      const expectedResult = { files: ['file1.ts', 'file2.ts'] }
      const mockOperation = vi.fn().mockResolvedValue(expectedResult)

      const result = await logger.loggedOperation('status', mockOperation, [
        '--porcelain',
      ])

      expect(result).toEqual(expectedResult)
      expect(mockSystemLogger.logCommand).toHaveBeenCalledWith(
        'git-genius.status',
        ['--porcelain'],
        'timeline'
      )
    })

    it('should throw error from failed operations', async () => {
      const error = new Error('Git operation failed')
      const mockOperation = vi.fn().mockRejectedValue(error)

      await expect(
        logger.loggedOperation('status', mockOperation)
      ).rejects.toThrow('Git operation failed')

      expect(mockSystemLogger.logResult).toHaveBeenCalledWith(
        'ERROR',
        expect.stringContaining('Git status failed'),
        'timeline',
        expect.any(Object)
      )
    })

    it('should throw generic error when no specific error provided', async () => {
      const mockOperation = vi.fn().mockRejectedValue(undefined)

      await expect(
        logger.loggedOperation('status', mockOperation)
      ).rejects.toThrow(
        "Cannot read properties of undefined (reading 'message')"
      )
    })

    it('should handle operations with complex return types', async () => {
      const complexResult = {
        commits: [
          { hash: 'abc123', message: 'feat: add feature' },
          { hash: 'def456', message: 'fix: bug fix' },
        ],
        count: 2,
        branch: 'main',
      }
      const mockOperation = vi.fn().mockResolvedValue(complexResult)

      const result = await logger.loggedOperation('log', mockOperation)

      expect(result).toEqual(complexResult)
    })

    it('should apply custom success message formatter', async () => {
      // Use fake timers to control timing for consistent test results
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2024, 0, 1, 12, 0, 0, 0))

      const result = { modified: ['file1.ts'], staged: [] }
      const mockOperation = vi.fn().mockResolvedValue(result)
      const formatter = vi.fn().mockReturnValue('Custom status message')

      await logger.loggedOperation('status', mockOperation, [], formatter)

      expect(formatter).toHaveBeenCalledWith(result)
      expect(mockSystemLogger.logResult).toHaveBeenCalledWith(
        'GIT',
        'Custom status message',
        'timeline',
        {
          customFormatted: true,
          originalMessage: 'Status updated: 1 modified (0ms)',
        }
      )
    })

    it('should not apply formatter when result is undefined', async () => {
      const mockOperation = vi.fn().mockResolvedValue(undefined)
      const formatter = vi.fn()

      await logger.loggedOperation('status', mockOperation, [], formatter)

      expect(formatter).not.toHaveBeenCalled()
    })
  })

  describe('logGitCommand()', () => {
    it('should log git command execution', async () => {
      const command = 'git status --porcelain --branch'
      const args = ['--porcelain', '--branch']

      await logger.logGitCommand('status', command, args)

      expect(mockSystemLogger.logCommand).toHaveBeenCalledWith(
        'git.status',
        args,
        'timeline'
      )

      expect(mockSystemLogger.logResult).toHaveBeenCalledWith(
        'GIT',
        'Executing: git status --porcelain --branch',
        'timeline',
        {
          command,
          args,
          type: 'command-execution',
        }
      )
    })

    it('should log command without arguments', async () => {
      const command = 'git status'

      await logger.logGitCommand('status', command)

      expect(mockSystemLogger.logCommand).toHaveBeenCalledWith(
        'git.status',
        undefined,
        'timeline'
      )

      expect(mockSystemLogger.logResult).toHaveBeenCalledWith(
        'GIT',
        'Executing: git status',
        'timeline',
        {
          command,
          args: undefined,
          type: 'command-execution',
        }
      )
    })

    it('should log complex git commands', async () => {
      const command =
        'git commit -m "feat: add new feature" --author="John Doe <john@example.com>"'
      const args = [
        '-m',
        'feat: add new feature',
        '--author=John Doe <john@example.com>',
      ]

      await logger.logGitCommand('commit', command, args)

      expect(mockSystemLogger.logCommand).toHaveBeenCalledWith(
        'git.commit',
        args,
        'timeline'
      )
    })
  })

  describe('startGitOperation()', () => {
    it('should provide success and error completion functions', () => {
      const completion = logger.startGitOperation('status', ['--porcelain'])

      expect(completion).toHaveProperty('success')
      expect(completion).toHaveProperty('error')
      expect(typeof completion.success).toBe('function')
      expect(typeof completion.error).toBe('function')
    })

    it('should log operation start', () => {
      const args = ['--porcelain', '--branch']

      logger.startGitOperation('status', args)

      expect(mockSystemLogger.logCommand).toHaveBeenCalledWith(
        'git-genius.status',
        args,
        'timeline'
      )
    })

    it('should log successful completion with execution time', () => {
      const completion = logger.startGitOperation('status')
      const context = { branch: 'main', files: 5 }

      completion.success('Repository status retrieved successfully', context)

      expect(mockSystemLogger.logResult).toHaveBeenCalledWith(
        'GIT',
        'Repository status retrieved successfully',
        'timeline',
        expect.objectContaining({
          ...context,
          executionTime: expect.any(Number),
          operationName: 'status',
        })
      )
    })

    it('should log error completion with execution time', () => {
      const completion = logger.startGitOperation('push')
      const error = new Error('Authentication failed')

      completion.error('Failed to push to remote repository', error)

      expect(mockSystemLogger.logResult).toHaveBeenCalledWith(
        'ERROR',
        'Failed to push to remote repository',
        'timeline',
        expect.objectContaining({
          operationName: 'push',
          executionTime: expect.any(Number),
          error: {
            name: 'Error',
            message: 'Authentication failed',
            stack: expect.any(String),
          },
        })
      )
    })

    it('should handle success completion without context', () => {
      const completion = logger.startGitOperation('status')

      completion.success('Operation completed')

      expect(mockSystemLogger.logResult).toHaveBeenCalledWith(
        'GIT',
        'Operation completed',
        'timeline',
        expect.objectContaining({
          executionTime: expect.any(Number),
          operationName: 'status',
        })
      )
    })

    it('should handle error completion without Error object', () => {
      const completion = logger.startGitOperation('status')

      completion.error('Operation failed')

      expect(mockSystemLogger.logResult).toHaveBeenCalledWith(
        'ERROR',
        'Operation failed',
        'timeline',
        expect.objectContaining({
          operationName: 'status',
          executionTime: expect.any(Number),
          error: undefined,
        })
      )
    })

    it('should measure execution time for completion logging', async () => {
      const completion = logger.startGitOperation('status')

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          completion.success('Operation completed after delay')

          expect(mockSystemLogger.logResult).toHaveBeenCalledWith(
            'GIT',
            'Operation completed after delay',
            'timeline',
            expect.objectContaining({
              executionTime: expect.any(Number),
            })
          )

          const logCall = mockSystemLogger.logResult.mock.calls[0]
          const executionTime = logCall[3].executionTime
          expect(executionTime).toBeGreaterThanOrEqual(40) // Account for timing variance

          resolve()
        }, 50)
      })
    })
  })

  describe('Message Formatting', () => {
    describe('Success Messages', () => {
      it('should format status operation success message', async () => {
        const mockOperation = vi.fn().mockResolvedValue({ status: 'clean' })

        const result = await logger.wrapGitOperation('status', mockOperation)

        expect(result.message).toMatch(
          /^Repository clean - no changes detected \(\d+ms\)$/
        )
      })

      it('should format status with file counts', async () => {
        const statusResult: GitStatus = {
          branch: 'main',
          ahead: 0,
          behind: 0,
          modified: ['file1.ts', 'file2.ts'],
          staged: ['file3.ts'],
          untracked: ['file4.ts'],
          conflicted: [],
        }
        const mockOperation = vi.fn().mockResolvedValue(statusResult)

        const result = await logger.wrapGitOperation('status', mockOperation)

        expect(result.message).toMatch(
          /^Status updated: 2 modified, 1 staged, 1 untracked \(\d+ms\)$/
        )
      })

      it('should format clean repository status', async () => {
        const statusResult: GitStatus = {
          branch: 'main',
          ahead: 0,
          behind: 0,
          modified: [],
          staged: [],
          untracked: [],
          conflicted: [],
        }
        const mockOperation = vi.fn().mockResolvedValue(statusResult)

        const result = await logger.wrapGitOperation('status', mockOperation)

        expect(result.message).toMatch(
          /Repository clean - no changes detected \(\d+ms\)/
        )
      })

      it('should format commit operation success message', async () => {
        // Context7 Pattern: Use fake timers for deterministic timing control
        vi.useFakeTimers()
        vi.setSystemTime(new Date(2024, 0, 1, 12, 0, 0, 0))

        const commitResult: GitCommit = {
          hash: 'abc123456',
          author: 'John Doe',
          date: '2023-01-01',
          message: 'feat: add feature',
          files: ['file1.ts'],
        }
        const mockOperation = vi.fn().mockResolvedValue(commitResult)

        const result = await logger.wrapGitOperation('commit', mockOperation)

        expect(result.message).toMatch(/Commit created: abc1234 \(\d+ms\)/)

        vi.useRealTimers()
      })

      it('should format commit without hash', async () => {
        const commitResult = { message: 'feat: add feature' }
        const mockOperation = vi.fn().mockResolvedValue(commitResult)

        const result = await logger.wrapGitOperation('commit', mockOperation)

        expect(result.message).toMatch(/Commit created: unknown \(\d+ms\)/)
      })

      it('should format push operation success message', async () => {
        const mockOperation = vi.fn().mockResolvedValue({ pushed: true })

        const result = await logger.wrapGitOperation('push', mockOperation)

        expect(result.message).toBe('Changes pushed to remote repository (0ms)')
      })

      it('should format pull operation success message', async () => {
        const mockOperation = vi.fn().mockResolvedValue({ pulled: true })

        const result = await logger.wrapGitOperation('pull', mockOperation)

        expect(result.message).toBe(
          'Changes pulled from remote repository (0ms)'
        )
      })

      it('should format checkout operation success message', async () => {
        const mockOperation = vi.fn().mockResolvedValue('feature/new-branch')

        const result = await logger.wrapGitOperation('checkout', mockOperation)

        expect(result.message).toMatch(
          /Switched to branch 'feature\/new-branch' \(\d+ms\)/
        )
      })

      it('should format switch operation success message', async () => {
        const mockOperation = vi.fn().mockResolvedValue('main')

        const result = await logger.wrapGitOperation('switch', mockOperation)

        expect(result.message).toMatch(/Switched to branch 'main' \(\dms\)/)
      })

      it('should format checkout/switch without branch name', async () => {
        const mockOperation = vi.fn().mockResolvedValue({ branch: 'main' })

        const result = await logger.wrapGitOperation('checkout', mockOperation)

        expect(result.message).toBe('Branch switch completed (0ms)')
      })

      it('should format clone operation success message', async () => {
        const mockOperation = vi.fn().mockResolvedValue({ cloned: true })

        const result = await logger.wrapGitOperation('clone', mockOperation)

        expect(result.message).toMatch(
          /^Repository cloned successfully \(\d+ms\)$/
        )
      })

      it('should format add operation with file count', async () => {
        const mockOperation = vi
          .fn()
          .mockResolvedValue(['file1.ts', 'file2.ts', 'file3.ts'])

        const result = await logger.wrapGitOperation('add', mockOperation)

        expect(result.message).toMatch(/3 files staged for commit \(\d+ms\)/)
      })

      it('should format add operation without file count', async () => {
        const mockOperation = vi.fn().mockResolvedValue({ added: true })

        const result = await logger.wrapGitOperation('add', mockOperation)

        expect(result.message).toBe('Files staged for commit (0ms)')
      })

      it('should format branch operation with branch count', async () => {
        const mockOperation = vi
          .fn()
          .mockResolvedValue(['main', 'develop', 'feature/test'])

        const result = await logger.wrapGitOperation('branch', mockOperation)

        expect(result.message).toBe('Found 3 branches (0ms)')
      })

      it('should format branch operation without branch count', async () => {
        const mockOperation = vi
          .fn()
          .mockResolvedValue({ created: 'new-branch' })

        const result = await logger.wrapGitOperation('branch', mockOperation)

        expect(result.message).toBe('Branch operation completed (0ms)')
      })

      it('should format log operation with commit count', async () => {
        const mockOperation = vi.fn().mockResolvedValue([
          { hash: 'abc123', message: 'commit 1' },
          { hash: 'def456', message: 'commit 2' },
        ])

        const result = await logger.wrapGitOperation('log', mockOperation)

        expect(result.message).toMatch(
          /Retrieved 2 commits from history \(\d+ms\)/
        )
      })

      it('should format log operation without commit count', async () => {
        const mockOperation = vi.fn().mockResolvedValue({ commits: 'data' })

        const result = await logger.wrapGitOperation('log', mockOperation)

        expect(result.message).toBe('Commit history retrieved (0ms)')
      })

      it('should format unknown operation success message', async () => {
        const mockOperation = vi.fn().mockResolvedValue({ result: 'success' })

        const result = await logger.wrapGitOperation(
          'customOperation',
          mockOperation
        )

        expect(result.message).toBe(
          'Git customOperation completed successfully (0ms)'
        )
      })

      it('should format execution time in seconds for slow operations', async () => {
        const mockOperation = vi
          .fn()
          .mockImplementation(
            () =>
              new Promise((resolve) =>
                setTimeout(() => resolve('result'), 1200)
              )
          )

        const result = await logger.wrapGitOperation('clone', mockOperation)

        expect(result.message).toMatch(
          /Repository cloned successfully \(1\.\ds\)/
        )
      })
    })

    describe('Error Messages', () => {
      it('should format "not a git repository" error', async () => {
        const error = new Error(
          'fatal: not a git repository (or any parent up to mount point /)'
        )
        const mockOperation = vi.fn().mockRejectedValue(error)

        const result = await logger.wrapGitOperation('status', mockOperation)

        expect(result.message).toBe('Git status failed: not a Git repository')
      })

      it('should format "nothing to commit" error', async () => {
        const error = new Error('nothing to commit, working tree clean')
        const mockOperation = vi.fn().mockRejectedValue(error)

        const result = await logger.wrapGitOperation('commit', mockOperation)

        expect(result.message).toBe(
          'Git commit failed: nothing to commit, working tree clean'
        )
      })

      it('should format "permission denied" error', async () => {
        const error = new Error('Permission denied (publickey)')
        const mockOperation = vi.fn().mockRejectedValue(error)

        const result = await logger.wrapGitOperation('push', mockOperation)

        expect(result.message).toBe('Git push failed: permission denied')
      })

      it('should format network connection error', async () => {
        const error = new Error(
          'Could not resolve hostname github.com: network is unreachable'
        )
        const mockOperation = vi.fn().mockRejectedValue(error)

        const result = await logger.wrapGitOperation('pull', mockOperation)

        expect(result.message).toBe('Git pull failed: network connection error')
      })

      it('should format connection error', async () => {
        const error = new Error(
          'ssh: connect to host github.com port 22: Connection refused'
        )
        const mockOperation = vi.fn().mockRejectedValue(error)

        const result = await logger.wrapGitOperation('push', mockOperation)

        expect(result.message).toBe('Git push failed: network connection error')
      })

      it('should format authentication error', async () => {
        const error = new Error(
          'remote: Invalid username or password. fatal: authentication failed'
        )
        const mockOperation = vi.fn().mockRejectedValue(error)

        const result = await logger.wrapGitOperation('clone', mockOperation)

        expect(result.message).toBe('Git clone failed: authentication required')
      })

      it('should format generic error with first line', async () => {
        const error = new Error(
          'Some complex error message\nwith multiple lines\nof details'
        )
        const mockOperation = vi.fn().mockRejectedValue(error)

        const result = await logger.wrapGitOperation('status', mockOperation)

        expect(result.message).toBe(
          'Git status failed: Some complex error message'
        )
      })

      it('should handle empty error message', async () => {
        const error = new Error('')
        const mockOperation = vi.fn().mockRejectedValue(error)

        const result = await logger.wrapGitOperation('status', mockOperation)

        expect(result.message).toBe('Git status failed: ')
      })
    })
  })

  describe('Integration and Edge Cases', () => {
    it('should handle operations with mixed case names', async () => {
      // Use Context7 deterministic timing patterns
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2023-01-01T12:00:00.000Z'))

      const mockOperation = vi.fn().mockResolvedValue('result')

      const result = await logger.wrapGitOperation('STATUS', mockOperation)

      // With fake timers, execution time should be deterministic (0ms)
      expect(result.message).toBe('Repository status updated (0ms)')

      vi.useRealTimers()
    })

    it('should handle operations that return null', async () => {
      const mockOperation = vi.fn().mockResolvedValue(null)

      const result = await logger.wrapGitOperation('status', mockOperation)

      expect(result.success).toBe(true)
      expect(result.data).toBeNull()
      expect(mockSystemLogger.logResult).toHaveBeenCalledWith(
        'GIT',
        expect.any(String),
        'timeline',
        expect.objectContaining({
          resultType: 'object',
        })
      )
    })

    it('should handle operations that return undefined', async () => {
      const mockOperation = vi.fn().mockResolvedValue(undefined)

      const result = await logger.wrapGitOperation('status', mockOperation)

      expect(result.success).toBe(true)
      expect(result.data).toBeUndefined()
      expect(mockSystemLogger.logResult).toHaveBeenCalledWith(
        'GIT',
        expect.any(String),
        'timeline',
        expect.objectContaining({
          resultType: 'undefined',
        })
      )
    })

    it('should handle operations that return primitive values', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success string')

      const result = await logger.wrapGitOperation('status', mockOperation)

      expect(result.success).toBe(true)
      expect(result.data).toBe('success string')
      expect(mockSystemLogger.logResult).toHaveBeenCalledWith(
        'GIT',
        expect.any(String),
        'timeline',
        expect.objectContaining({
          resultType: 'string',
        })
      )
    })

    it('should handle operations with very large results', async () => {
      const largeResult = {
        commits: Array.from({ length: 1000 }, (_, i) => ({
          hash: `commit${i}`,
          message: `Message ${i}`,
        })),
      }
      const mockOperation = vi.fn().mockResolvedValue(largeResult)

      const result = await logger.wrapGitOperation('log', mockOperation)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(largeResult)
    })

    it('should handle operations with circular reference data', async () => {
      const circular: { name: string; self?: unknown } = { name: 'test' }
      circular.self = circular
      const mockOperation = vi.fn().mockResolvedValue(circular)

      const result = await logger.wrapGitOperation('status', mockOperation)

      expect(result.success).toBe(true)
      expect(result.data).toBe(circular)
    })

    it('should handle rapid consecutive operations', async () => {
      const mockOperation = vi.fn().mockResolvedValue('result')

      const promises = []
      for (let i = 0; i < 5; i++) {
        promises.push(logger.wrapGitOperation(`operation${i}`, mockOperation))
      }

      const results = await Promise.all(promises)

      expect(results).toHaveLength(5)
      results.forEach((result) => {
        expect(result.success).toBe(true)
      })

      // Should have logged 5 commands and 5 results
      expect(mockSystemLogger.logCommand).toHaveBeenCalledTimes(5)
      expect(mockSystemLogger.logResult).toHaveBeenCalledTimes(5)

      // Each should have unique operation ID
      const logCalls = mockSystemLogger.logResult.mock.calls
      const operationIds = logCalls.map((call) => call[3].operationId)
      const uniqueIds = new Set(operationIds)
      expect(uniqueIds.size).toBe(5)
    })
  })

  describe('Performance and Memory', () => {
    it('should not leak memory with many operations', async () => {
      const mockOperation = vi.fn().mockResolvedValue('result')

      // Simulate many operations
      const promises = []
      for (let i = 0; i < 100; i++) {
        promises.push(logger.wrapGitOperation('status', mockOperation))
      }

      const results = await Promise.all(promises)

      expect(results).toHaveLength(100)
      results.forEach((result) => {
        expect(result.success).toBe(true)
      })
    })

    it('should handle operations with minimal memory footprint', async () => {
      const mockOperation = vi.fn().mockResolvedValue({})

      const result = await logger.wrapGitOperation('status', mockOperation, [])

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('message')
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('executionTime')
      expect(Object.keys(result)).toHaveLength(4)
    })
  })

  describe('Integration with Default Instance', () => {
    it('should provide gitCommandLogger default instance', () => {
      expect(gitCommandLogger).toBeInstanceOf(GitCommandLogger)
    })

    it('should be separate from manually created instances', async () => {
      const manualGitLogger = new GitCommandLogger(mockSystemLogger)
      const mockOperation = vi.fn().mockResolvedValue('result')

      // Use both instances
      await gitCommandLogger.wrapGitOperation('status', mockOperation)
      await manualGitLogger.wrapGitOperation('status', mockOperation)

      // Manual logger should have been called (with our mock)
      expect(mockSystemLogger.logCommand).toHaveBeenCalledTimes(1)
      expect(mockSystemLogger.logResult).toHaveBeenCalledTimes(1)
    })
  })

  describe('Type Safety and Generics', () => {
    it('should preserve return type for successful operations', async () => {
      interface StatusResult {
        staged: string[]
        modified: string[]
        untracked: string[]
      }

      const expectedResult: StatusResult = {
        staged: ['file1.ts'],
        modified: ['file2.ts'],
        untracked: ['file3.ts'],
      }

      const mockOperation = (): Promise<StatusResult> =>
        Promise.resolve(expectedResult)

      const result = await logger.wrapGitOperation('status', mockOperation)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(expectedResult)

      // TypeScript should infer the correct type
      if (result.success && result.data) {
        expect(result.data.staged).toEqual(['file1.ts'])
        expect(result.data.modified).toEqual(['file2.ts'])
        expect(result.data.untracked).toEqual(['file3.ts'])
      }
    })

    it('should handle generic operations with different return types', async () => {
      const stringOperation = (): Promise<string> => Promise.resolve('success')
      const numberOperation = (): Promise<number> => Promise.resolve(42)
      const arrayOperation = (): Promise<string[]> =>
        Promise.resolve(['a', 'b', 'c'])

      const stringResult = await logger.wrapGitOperation(
        'string-op',
        stringOperation
      )
      const numberResult = await logger.wrapGitOperation(
        'number-op',
        numberOperation
      )
      const arrayResult = await logger.wrapGitOperation(
        'array-op',
        arrayOperation
      )

      expect(stringResult.data).toBe('success')
      expect(numberResult.data).toBe(42)
      expect(arrayResult.data).toEqual(['a', 'b', 'c'])
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle null arguments in wrapGitOperation', async () => {
      const mockOperation = vi.fn().mockResolvedValue('result')

      const result = await logger.wrapGitOperation(
        'test-function',
        mockOperation,
        undefined
      )

      expect(result.success).toBe(true)
      expect(mockSystemLogger.logCommand).toHaveBeenCalledWith(
        'git-genius.test-function',
        undefined,
        'timeline'
      )
    })

    it('should handle undefined operation name', async () => {
      const mockOperation = vi.fn().mockResolvedValue('result')

      const result = await logger.wrapGitOperation(
        undefined as unknown as string,
        mockOperation
      )

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle very long operation names', async () => {
      const longName = 'A'.repeat(1000)
      const mockOperation = vi.fn().mockResolvedValue('result')

      const result = await logger.wrapGitOperation(longName, mockOperation)

      expect(result.success).toBe(true)
      expect(result.message).toContain(`Git ${longName} completed successfully`)
    })

    it('should handle operations that throw non-Error objects', async () => {
      const mockOperation = vi.fn().mockRejectedValue({ errorCode: 500 })

      await expect(
        logger.wrapGitOperation('status', mockOperation)
      ).rejects.toThrow(
        "Cannot read properties of undefined (reading 'toLowerCase')"
      )
    })
  })
})
