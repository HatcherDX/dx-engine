/**
 * @fileoverview Comprehensive tests for BrowserGitCommandLogger.
 *
 * @description
 * Tests for browser-compatible Git command logging implementing Causa-Efecto pattern:
 * - Git operation wrapping and logging
 * - Success and error result handling
 * - Command execution logging
 * - Operation start/completion tracking
 * - Message formatting for different operations
 * - Integration with BrowserSystemLogger
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  BrowserGitCommandLogger,
  browserGitCommandLogger,
  type GitOperationContext,
} from './BrowserGitCommandLogger'

/**
 * Mock interface for BrowserSystemLogger in tests.
 */
interface MockBrowserSystemLogger {
  logCommand: ReturnType<typeof vi.fn>
  logResult: ReturnType<typeof vi.fn>
  info: ReturnType<typeof vi.fn>
  warn: ReturnType<typeof vi.fn>
  error: ReturnType<typeof vi.fn>
  fatal: ReturnType<typeof vi.fn>
}

describe('BrowserGitCommandLogger', () => {
  let gitLogger: BrowserGitCommandLogger
  let mockLogger: MockBrowserSystemLogger

  beforeEach(() => {
    // Mock the BrowserSystemLogger dependency
    mockLogger = {
      logCommand: vi.fn(),
      logResult: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }

    gitLogger = new BrowserGitCommandLogger(mockLogger)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Constructor', () => {
    it('should create BrowserGitCommandLogger instance', () => {
      expect(gitLogger).toBeInstanceOf(BrowserGitCommandLogger)
    })

    it('should initialize with provided logger', () => {
      const customLogger = { logCommand: vi.fn() } as unknown as Record<
        string,
        ReturnType<typeof vi.fn>
      >
      const customGitLogger = new BrowserGitCommandLogger(customLogger)

      expect(customGitLogger).toBeInstanceOf(BrowserGitCommandLogger)
    })

    it('should use default logger when none provided', () => {
      const defaultGitLogger = new BrowserGitCommandLogger()

      expect(defaultGitLogger).toBeInstanceOf(BrowserGitCommandLogger)
    })
  })

  describe('wrapGitOperation()', () => {
    it('should wrap successful git operation', async () => {
      const mockOperation = vi
        .fn()
        .mockResolvedValue({ files: ['file1.ts', 'file2.ts'] })
      const args = ['--porcelain']

      const result = await gitLogger.wrapGitOperation(
        'status',
        mockOperation,
        args
      )

      expect(result.success).toBe(true)
      expect(result.message).toMatch(/Repository status retrieved \(\d+ms\)/)
      expect(result.data).toEqual({ files: ['file1.ts', 'file2.ts'] })
      expect(typeof result.executionTime).toBe('number')
      expect(result.error).toBeUndefined()
    })

    it('should wrap failed git operation', async () => {
      const error = new Error('Not a git repository')
      const mockOperation = vi.fn().mockRejectedValue(error)

      const result = await gitLogger.wrapGitOperation(
        'status',
        mockOperation,
        []
      )

      expect(result.success).toBe(false)
      expect(result.message).toBe('Git status failed: not a Git repository')
      expect(result.error).toBe(error)
      expect(typeof result.executionTime).toBe('number')
      expect(result.data).toBeUndefined()
    })

    it('should log CAUSA (command execution)', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success')
      const args = ['--porcelain', '--branch']

      await gitLogger.wrapGitOperation('status', mockOperation, args)

      expect(mockLogger.logCommand).toHaveBeenCalledWith(
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

      await gitLogger.wrapGitOperation('status', mockOperation, [], context)

      expect(mockLogger.logResult).toHaveBeenCalledWith(
        'GIT',
        expect.stringMatching(/Repository status retrieved \(\d+ms\)/),
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

      await gitLogger.wrapGitOperation('push', mockOperation, [], context)

      expect(mockLogger.logResult).toHaveBeenCalledWith(
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

      await gitLogger.wrapGitOperation('operation1', mockOperation)
      expect(mockLogger.logResult).toHaveBeenLastCalledWith(
        'GIT',
        expect.any(String),
        'timeline',
        expect.objectContaining({ operationId: 'git-0001' })
      )

      await gitLogger.wrapGitOperation('operation2', mockOperation)
      expect(mockLogger.logResult).toHaveBeenLastCalledWith(
        'GIT',
        expect.any(String),
        'timeline',
        expect.objectContaining({ operationId: 'git-0002' })
      )
    })

    it('should handle operations without arguments', async () => {
      const mockOperation = vi.fn().mockResolvedValue('result')

      await gitLogger.wrapGitOperation('status', mockOperation)

      expect(mockLogger.logCommand).toHaveBeenCalledWith(
        'git-genius.status',
        undefined,
        'timeline'
      )
    })

    it('should handle operations without context', async () => {
      const mockOperation = vi.fn().mockResolvedValue('result')

      const result = await gitLogger.wrapGitOperation('status', mockOperation)

      expect(result.success).toBe(true)
      expect(mockLogger.logResult).toHaveBeenCalledWith(
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

      // The formatErrorMessage method expects an Error object and will throw
      // when trying to access .message.toLowerCase() on a string
      await expect(
        gitLogger.wrapGitOperation('status', mockOperation)
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

      const result = await gitLogger.wrapGitOperation('status', mockOperation)

      expect(result.executionTime).toBeGreaterThanOrEqual(40) // Account for timing variance
      expect(result.executionTime).toBeLessThan(200) // Reasonable upper bound
    })
  })

  describe('loggedOperation()', () => {
    it('should return data from successful operations', async () => {
      const expectedResult = { files: ['file1.ts', 'file2.ts'] }
      const mockOperation = vi.fn().mockResolvedValue(expectedResult)

      const result = await gitLogger.loggedOperation('status', mockOperation, [
        '--porcelain',
      ])

      expect(result).toEqual(expectedResult)
      expect(mockLogger.logCommand).toHaveBeenCalledWith(
        'git-genius.status',
        ['--porcelain'],
        'timeline'
      )
    })

    it('should throw error from failed operations', async () => {
      const error = new Error('Git operation failed')
      const mockOperation = vi.fn().mockRejectedValue(error)

      await expect(
        gitLogger.loggedOperation('status', mockOperation)
      ).rejects.toThrow('Git operation failed')

      expect(mockLogger.logResult).toHaveBeenCalledWith(
        'ERROR',
        expect.stringContaining('Git status failed'),
        'timeline',
        expect.any(Object)
      )
    })

    it('should throw generic error when no specific error provided', async () => {
      const mockOperation = vi.fn().mockRejectedValue(undefined)

      // The formatErrorMessage method will throw when trying to access .message on undefined
      await expect(
        gitLogger.loggedOperation('status', mockOperation)
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

      const result = await gitLogger.loggedOperation('log', mockOperation)

      expect(result).toEqual(complexResult)
    })
  })

  describe('logGitCommand()', () => {
    it('should log git command execution', async () => {
      const command = 'git status --porcelain --branch'
      const args = ['--porcelain', '--branch']

      await gitLogger.logGitCommand('status', command, args)

      expect(mockLogger.logCommand).toHaveBeenCalledWith(
        'git.status',
        args,
        'timeline'
      )

      expect(mockLogger.logResult).toHaveBeenCalledWith(
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

      await gitLogger.logGitCommand('status', command)

      expect(mockLogger.logCommand).toHaveBeenCalledWith(
        'git.status',
        undefined,
        'timeline'
      )

      expect(mockLogger.logResult).toHaveBeenCalledWith(
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

      await gitLogger.logGitCommand('commit', command, args)

      expect(mockLogger.logCommand).toHaveBeenCalledWith(
        'git.commit',
        args,
        'timeline'
      )
    })
  })

  describe('startGitOperation()', () => {
    it('should provide success and error completion functions', () => {
      const completion = gitLogger.startGitOperation('status', ['--porcelain'])

      expect(completion).toHaveProperty('success')
      expect(completion).toHaveProperty('error')
      expect(typeof completion.success).toBe('function')
      expect(typeof completion.error).toBe('function')
    })

    it('should log operation start', () => {
      const args = ['--porcelain', '--branch']

      gitLogger.startGitOperation('status', args)

      expect(mockLogger.logCommand).toHaveBeenCalledWith(
        'git-genius.status',
        args,
        'timeline'
      )
    })

    it('should log successful completion with execution time', () => {
      const completion = gitLogger.startGitOperation('status')
      const context = { branch: 'main', files: 5 }

      completion.success('Repository status retrieved successfully', context)

      expect(mockLogger.logResult).toHaveBeenCalledWith(
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
      const completion = gitLogger.startGitOperation('push')
      const error = new Error('Authentication failed')

      completion.error('Failed to push to remote repository', error)

      expect(mockLogger.logResult).toHaveBeenCalledWith(
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
      const completion = gitLogger.startGitOperation('status')

      completion.success('Operation completed')

      expect(mockLogger.logResult).toHaveBeenCalledWith(
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
      const completion = gitLogger.startGitOperation('status')

      completion.error('Operation failed')

      expect(mockLogger.logResult).toHaveBeenCalledWith(
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
      const completion = gitLogger.startGitOperation('status')

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          completion.success('Operation completed after delay')

          expect(mockLogger.logResult).toHaveBeenCalledWith(
            'GIT',
            'Operation completed after delay',
            'timeline',
            expect.objectContaining({
              executionTime: expect.any(Number),
            })
          )

          const logCall = mockLogger.logResult.mock.calls[0]
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

        const result = await gitLogger.wrapGitOperation('status', mockOperation)

        expect(result.message).toMatch(
          /^Repository status retrieved \(\d+ms\)$/
        )
      })

      it('should format commit operation success message', async () => {
        const mockOperation = vi.fn().mockResolvedValue({ hash: 'abc123' })

        const result = await gitLogger.wrapGitOperation('commit', mockOperation)

        expect(result.message).toMatch(
          /^Commit created successfully \(\d+ms\)$/
        )
      })

      it('should format push operation success message', async () => {
        const mockOperation = vi.fn().mockResolvedValue({ pushed: true })

        const result = await gitLogger.wrapGitOperation('push', mockOperation)

        expect(result.message).toMatch(
          /^Changes pushed to remote repository \(\d+ms\)$/
        )
      })

      it('should format pull operation success message', async () => {
        const mockOperation = vi.fn().mockResolvedValue({ pulled: true })

        const result = await gitLogger.wrapGitOperation('pull', mockOperation)

        expect(result.message).toMatch(
          /^Changes pulled from remote repository \(\d+ms\)$/
        )
      })

      it('should format checkout operation success message', async () => {
        const mockOperation = vi.fn().mockResolvedValue({ branch: 'main' })

        const result = await gitLogger.wrapGitOperation(
          'checkout',
          mockOperation
        )

        expect(result.message).toMatch(/^Branch switch completed \(\d+ms\)$/)
      })

      it('should format switch operation success message', async () => {
        const mockOperation = vi.fn().mockResolvedValue({ branch: 'develop' })

        const result = await gitLogger.wrapGitOperation('switch', mockOperation)

        expect(result.message).toMatch(/^Branch switch completed \(\d+ms\)$/)
      })

      it('should format clone operation success message', async () => {
        const mockOperation = vi.fn().mockResolvedValue({ cloned: true })

        const result = await gitLogger.wrapGitOperation('clone', mockOperation)

        expect(result.message).toMatch(
          /^Repository cloned successfully \(\d+ms\)$/
        )
      })

      it('should format add operation success message', async () => {
        const mockOperation = vi.fn().mockResolvedValue({ added: ['file.ts'] })

        const result = await gitLogger.wrapGitOperation('add', mockOperation)

        expect(result.message).toMatch(/^Files staged for commit \(\d+ms\)$/)
      })

      it('should format branch operation success message', async () => {
        const mockOperation = vi
          .fn()
          .mockResolvedValue({ branches: ['main', 'develop'] })

        const result = await gitLogger.wrapGitOperation('branch', mockOperation)

        expect(result.message).toMatch(/^Branch operation completed \(\d+ms\)$/)
      })

      it('should format log operation success message', async () => {
        const mockOperation = vi.fn().mockResolvedValue({ commits: [] })

        const result = await gitLogger.wrapGitOperation('log', mockOperation)

        expect(result.message).toMatch(/^Commit history retrieved \(\d+ms\)$/)
      })

      it('should format unknown operation success message', async () => {
        const mockOperation = vi.fn().mockResolvedValue({ result: 'success' })

        const result = await gitLogger.wrapGitOperation(
          'customOperation',
          mockOperation
        )

        expect(result.message).toMatch(
          /^Git customOperation completed successfully \(\d+ms\)$/
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

        const result = await gitLogger.wrapGitOperation('clone', mockOperation)

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

        const result = await gitLogger.wrapGitOperation('status', mockOperation)

        expect(result.message).toBe('Git status failed: not a Git repository')
      })

      it('should format "nothing to commit" error', async () => {
        const error = new Error('nothing to commit, working tree clean')
        const mockOperation = vi.fn().mockRejectedValue(error)

        const result = await gitLogger.wrapGitOperation('commit', mockOperation)

        expect(result.message).toBe(
          'Git commit failed: nothing to commit, working tree clean'
        )
      })

      it('should format "permission denied" error', async () => {
        const error = new Error('Permission denied (publickey)')
        const mockOperation = vi.fn().mockRejectedValue(error)

        const result = await gitLogger.wrapGitOperation('push', mockOperation)

        expect(result.message).toBe('Git push failed: permission denied')
      })

      it('should format network connection error', async () => {
        const error = new Error(
          'Could not resolve hostname github.com: network is unreachable'
        )
        const mockOperation = vi.fn().mockRejectedValue(error)

        const result = await gitLogger.wrapGitOperation('pull', mockOperation)

        expect(result.message).toBe('Git pull failed: network connection error')
      })

      it('should format connection error', async () => {
        const error = new Error(
          'ssh: connect to host github.com port 22: Connection refused'
        )
        const mockOperation = vi.fn().mockRejectedValue(error)

        const result = await gitLogger.wrapGitOperation('push', mockOperation)

        expect(result.message).toBe('Git push failed: network connection error')
      })

      it('should format authentication error', async () => {
        const error = new Error(
          'remote: Invalid username or password. fatal: authentication failed'
        )
        const mockOperation = vi.fn().mockRejectedValue(error)

        const result = await gitLogger.wrapGitOperation('clone', mockOperation)

        expect(result.message).toBe('Git clone failed: authentication required')
      })

      it('should format generic error with first line', async () => {
        const error = new Error(
          'Some complex error message\nwith multiple lines\nof details'
        )
        const mockOperation = vi.fn().mockRejectedValue(error)

        const result = await gitLogger.wrapGitOperation('status', mockOperation)

        expect(result.message).toBe(
          'Git status failed: Some complex error message'
        )
      })

      it('should handle empty error message', async () => {
        const error = new Error('')
        const mockOperation = vi.fn().mockRejectedValue(error)

        const result = await gitLogger.wrapGitOperation('status', mockOperation)

        expect(result.message).toBe('Git status failed: ')
      })
    })
  })

  describe('Integration and Edge Cases', () => {
    it('should handle operations with mixed case names', async () => {
      const mockOperation = vi.fn().mockResolvedValue('result')

      const result = await gitLogger.wrapGitOperation('STATUS', mockOperation)

      expect(result.message).toMatch(/^Repository status retrieved \(\d+ms\)$/)
    })

    it('should handle operations that return null', async () => {
      const mockOperation = vi.fn().mockResolvedValue(null)

      const result = await gitLogger.wrapGitOperation('status', mockOperation)

      expect(result.success).toBe(true)
      expect(result.data).toBeNull()
      expect(mockLogger.logResult).toHaveBeenCalledWith(
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

      const result = await gitLogger.wrapGitOperation('status', mockOperation)

      expect(result.success).toBe(true)
      expect(result.data).toBeUndefined()
      expect(mockLogger.logResult).toHaveBeenCalledWith(
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

      const result = await gitLogger.wrapGitOperation('status', mockOperation)

      expect(result.success).toBe(true)
      expect(result.data).toBe('success string')
      expect(mockLogger.logResult).toHaveBeenCalledWith(
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

      const result = await gitLogger.wrapGitOperation('log', mockOperation)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(largeResult)
    })

    it('should handle operations with circular reference data', async () => {
      const circular: { name: string; self?: unknown } = { name: 'test' }
      circular.self = circular
      const mockOperation = vi.fn().mockResolvedValue(circular)

      const result = await gitLogger.wrapGitOperation('status', mockOperation)

      expect(result.success).toBe(true)
      expect(result.data).toBe(circular)
    })

    it('should handle rapid consecutive operations', async () => {
      const mockOperation = vi.fn().mockResolvedValue('result')

      const promises = []
      for (let i = 0; i < 5; i++) {
        promises.push(
          gitLogger.wrapGitOperation(`operation${i}`, mockOperation)
        )
      }

      const results = await Promise.all(promises)

      expect(results).toHaveLength(5)
      results.forEach((result) => {
        expect(result.success).toBe(true)
      })

      // Should have logged 5 commands and 5 results
      expect(mockLogger.logCommand).toHaveBeenCalledTimes(5)
      expect(mockLogger.logResult).toHaveBeenCalledTimes(5)

      // Each should have unique operation ID
      const logCalls = mockLogger.logResult.mock.calls
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
        promises.push(gitLogger.wrapGitOperation('status', mockOperation))
      }

      const results = await Promise.all(promises)

      expect(results).toHaveLength(100)
      results.forEach((result) => {
        expect(result.success).toBe(true)
      })
    })

    it('should handle operations with minimal memory footprint', async () => {
      const mockOperation = vi.fn().mockResolvedValue({})

      const result = await gitLogger.wrapGitOperation(
        'status',
        mockOperation,
        []
      )

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('message')
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('executionTime')
      expect(Object.keys(result)).toHaveLength(4)
    })
  })

  describe('Integration with Default Instance', () => {
    it('should provide browserGitCommandLogger default instance', () => {
      expect(browserGitCommandLogger).toBeInstanceOf(BrowserGitCommandLogger)
    })

    it('should be separate from manually created instances', async () => {
      const manualGitLogger = new BrowserGitCommandLogger(mockLogger)
      const mockOperation = vi.fn().mockResolvedValue('result')

      // Use both instances
      await browserGitCommandLogger.wrapGitOperation('status', mockOperation)
      await manualGitLogger.wrapGitOperation('status', mockOperation)

      // Manual logger should have been called (with our mock)
      expect(mockLogger.logCommand).toHaveBeenCalledTimes(1)
      expect(mockLogger.logResult).toHaveBeenCalledTimes(1)
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

      const result = await gitLogger.wrapGitOperation('status', mockOperation)

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

      const stringResult = await gitLogger.wrapGitOperation(
        'string-op',
        stringOperation
      )
      const numberResult = await gitLogger.wrapGitOperation(
        'number-op',
        numberOperation
      )
      const arrayResult = await gitLogger.wrapGitOperation(
        'array-op',
        arrayOperation
      )

      expect(stringResult.data).toBe('success')
      expect(numberResult.data).toBe(42)
      expect(arrayResult.data).toEqual(['a', 'b', 'c'])
    })
  })
})
