import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GitRunner } from './GitRunner'
import type { CommandResult } from '../types/commands'

/**
 * Final test cases for GitRunner to achieve 100% code coverage
 *
 * @remarks
 * This test file covers the remaining edge cases and branches
 * to achieve complete 100% code coverage for GitRunner.ts
 */
describe('GitRunner - Final Coverage Tests', () => {
  let gitRunner: GitRunner
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    gitRunner = new GitRunner()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    if (gitRunner) {
      gitRunner.cleanup()
    }
  })

  describe('Module Loading Edge Cases', () => {
    it('should handle successful logging module import', async () => {
      // Mock successful import with gitCommandLogger
      const mockGitCommandLogger = {
        wrapGitOperation: vi
          .fn()
          .mockImplementation(async (name, operation) => {
            const result = await operation()
            return { success: true, data: result }
          }),
      }

      vi.doMock('../system/index', () => ({
        gitCommandLogger: mockGitCommandLogger,
      }))

      const runner = new GitRunner()

      // Wait for async initialization
      await new Promise((resolve) => setTimeout(resolve, 20))

      // Force the logging to be initialized
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private loggingInitialized for testing
      ;(runner as any).loggingInitialized = true
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private gitCommandLogger for testing
      ;(runner as any).gitCommandLogger = mockGitCommandLogger

      // Test that logging wrapper is used
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Spy creation is needed for test setup, variable intentionally unused
      const _mockExecute = vi
        .spyOn(runner, 'execute' as keyof GitRunner)
        .mockResolvedValue({
          success: true,
          exitCode: 0,
          stdout: 'test',
          stderr: '',
          duration: 100,
          command: 'git status',
        })

      await runner.status()

      // The wrapGitOperation should have been called
      expect(mockGitCommandLogger.wrapGitOperation).toHaveBeenCalled()

      runner.cleanup()
    })

    it('should handle logging operation failure without fallback', async () => {
      const mockGitCommandLogger = {
        wrapGitOperation: vi.fn().mockImplementation(async () => {
          return {
            success: false,
            error: new Error('Logging failed'),
            message: 'Error message',
          }
        }),
      }

      const runner = new GitRunner()

      // Force the logging to be initialized with our mock
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private loggingInitialized for testing
      ;(runner as any).loggingInitialized = true
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private gitCommandLogger for testing
      ;(runner as any).gitCommandLogger = mockGitCommandLogger

      // Test with no fallback value - should throw
      await expect(runner.commit('test message')).rejects.toThrow()

      runner.cleanup()
    })

    it('should handle logging operation with error but no error object', async () => {
      const mockGitCommandLogger = {
        wrapGitOperation: vi.fn().mockImplementation(async () => {
          return {
            success: false,
            message: 'Error message without error object',
          }
        }),
      }

      const runner = new GitRunner()

      // Force the logging to be initialized with our mock
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private loggingInitialized for testing
      ;(runner as any).loggingInitialized = true
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private gitCommandLogger for testing
      ;(runner as any).gitCommandLogger = mockGitCommandLogger

      // Test push with logging error
      await expect(runner.push()).rejects.toThrow(
        'Error message without error object'
      )

      runner.cleanup()
    })
  })

  describe('Enhanced Safety Detection Edge Cases', () => {
    it('should log info when enhanced safety detection is in test environment', async () => {
      const loggerInfoSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {})

      // Mock the safety detector to return test environment with high confidence
      const mockSafetyDetector = {
        configure: vi.fn(),
        detectEnvironment: () => ({
          isTestEnvironment: true,
          confidence: 95,
          triggers: ['VITEST', 'test-file'],
        }),
        getMockResult: (cmd: string) => ({
          success: true,
          exitCode: 0,
          stdout: 'enhanced mock result',
          stderr: '',
          duration: 0,
          command: cmd,
        }),
        getDetectionHistory: () => [],
      }

      const runner = new GitRunner()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private safetyDetector for testing
      ;(runner as any).safetyDetector = mockSafetyDetector

      // Trigger the enhanced safety initialization logging
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private initializeEnhancedSafety for testing
      ;(runner as any).initializeEnhancedSafety()

      loggerInfoSpy.mockRestore()
      runner.cleanup()
    })

    it('should handle global vi object check in isTestEnvironment', () => {
      // Set up global vi object
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking global vi for testing
      ;(globalThis as any).vi = {}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking global __vitest_worker__ for testing
      ;(globalThis as any).__vitest_worker__ = {}

      const runner = new GitRunner()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private isTestEnvironment for testing
      const isTest = (runner as any).isTestEnvironment()

      expect(isTest).toBe(true)

      // Clean up
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking global vi for testing
      delete (globalThis as any).vi
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking global __vitest_worker__ for testing
      delete (globalThis as any).__vitest_worker__
      runner.cleanup()
    })

    it('should handle execute method with mock property', () => {
      const runner = new GitRunner()

      // Add mock property to execute method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing execute method to add mock property
      const executeMethod = runner.execute as any
      executeMethod.mock = { calls: [] }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private isTestEnvironment for testing
      const isTest = (runner as any).isTestEnvironment()
      expect(isTest).toBe(true)

      delete executeMethod.mock
      runner.cleanup()
    })

    it('should handle stack trace with test file patterns', () => {
      const runner = new GitRunner()

      // Mock Error.stack to include test patterns
      const originalStack = Error.prototype.stack
      Object.defineProperty(Error.prototype, 'stack', {
        get: function () {
          return 'at Object.<anonymous> (/path/to/file.spec.ts:10:5)\nat vitest.run'
        },
        configurable: true,
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private isTestEnvironment for testing
      const isTest = (runner as any).isTestEnvironment()
      expect(isTest).toBe(true)

      // Restore original stack
      Object.defineProperty(Error.prototype, 'stack', {
        get: function () {
          return originalStack
        },
        configurable: true,
      })

      runner.cleanup()
    })
  })

  describe('Git Status Edge Cases', () => {
    it('should handle status with different file status combinations', async () => {
      const runner = new GitRunner()

      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Spy creation is needed for test setup, variable intentionally unused
      const _mockExecute = vi
        .spyOn(runner, 'execute' as keyof GitRunner)
        .mockImplementation(async (command: string): Promise<CommandResult> => {
          if (command.includes('git branch --show-current')) {
            return {
              success: true,
              exitCode: 0,
              stdout: 'develop',
              stderr: '',
              duration: 100,
              command,
            }
          }

          if (command.includes('git rev-list')) {
            // Return non-zero ahead/behind values
            return {
              success: true,
              exitCode: 0,
              stdout: '5\t3',
              stderr: '',
              duration: 100,
              command,
            }
          }

          if (command.includes('git status --porcelain')) {
            // Test edge case status codes
            return {
              success: true,
              exitCode: 0,
              stdout:
                'MM modified-in-both.txt\n' + // Modified in index and working tree
                'AD added-then-deleted.txt\n' + // Added in index, deleted in working tree
                'AM added-then-modified.txt\n' + // Added in index, modified in working tree
                '!! ignored.txt\n' + // Ignored (should not appear in results)
                '',
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
        })

      const status = await runner.status()

      expect(status.branch).toBe('develop')
      expect(status.ahead).toBe(3)
      expect(status.behind).toBe(5)

      // Check staged files (first character not space)
      expect(status.staged).toContain('modified-in-both.txt')
      expect(status.staged).toContain('added-then-deleted.txt')
      expect(status.staged).toContain('added-then-modified.txt')

      // Check modified files (second character M)
      expect(status.modified).toContain('added-then-modified.txt')

      runner.cleanup()
    })

    it('should handle malformed ahead/behind output', async () => {
      const runner = new GitRunner()

      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Spy creation is needed for test setup, variable intentionally unused
      const _mockExecute = vi
        .spyOn(runner, 'execute' as keyof GitRunner)
        .mockImplementation(async (command: string): Promise<CommandResult> => {
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

          if (command.includes('git rev-list')) {
            // Return malformed output
            return {
              success: true,
              exitCode: 0,
              stdout: 'not-a-number\tnot-a-number',
              stderr: '',
              duration: 100,
              command,
            }
          }

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

          return {
            success: true,
            exitCode: 0,
            stdout: '',
            stderr: '',
            duration: 100,
            command,
          }
        })

      const status = await runner.status()

      // Should handle NaN gracefully
      expect(status.ahead).toBe(0)
      expect(status.behind).toBe(0)

      runner.cleanup()
    })
  })

  describe('Mock Result Branches', () => {
    it('should return mock result for git branch command in test environment', async () => {
      process.env.VITEST = 'true'
      const runner = new GitRunner()

      const result = await runner.execute('git branch', {})
      expect(result.stdout).toContain('main')
      expect(result.stdout).toContain('feature-branch')

      delete process.env.VITEST
      runner.cleanup()
    })
  })

  describe('Logging Edge Cases', () => {
    it('should handle exception that is not an Error instance', async () => {
      const runner = new GitRunner()

      // Mock execute to throw a non-Error object
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Spy creation is needed for test setup, variable intentionally unused
      const _mockExecute = vi
        .spyOn(runner, 'execute' as keyof GitRunner)
        .mockRejectedValue('String error')

      const result = await runner.log()
      expect(result).toEqual([])

      runner.cleanup()
    })

    it('should handle branch error that is not an Error instance', async () => {
      const runner = new GitRunner()

      // Mock execute to throw a non-Error object
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Spy creation is needed for test setup, variable intentionally unused
      const _mockExecute = vi
        .spyOn(runner, 'execute' as keyof GitRunner)
        .mockRejectedValue('String error')

      const branches = await runner.branch()
      expect(branches).toEqual([])

      runner.cleanup()
    })
  })

  describe('Enhanced Safety Detector Integration', () => {
    it('should use enhanced mock results when available', async () => {
      const runner = new GitRunner()

      // Mock enhanced detection to return true
      const mockSafetyDetector = {
        configure: vi.fn(),
        detectEnvironment: () => ({
          isTestEnvironment: true,
          confidence: 100,
          triggers: ['VITEST'],
        }),
        getMockResult: (cmd: string) => ({
          success: true,
          exitCode: 0,
          stdout: 'Enhanced mock result for: ' + cmd,
          stderr: '',
          duration: 0,
          command: cmd,
        }),
        getDetectionHistory: () => [
          { timestamp: Date.now() - 1000, confidence: 95, triggers: ['test'] },
          { timestamp: Date.now(), confidence: 100, triggers: ['VITEST'] },
        ],
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private safetyDetector for testing
      ;(runner as any).safetyDetector = mockSafetyDetector

      const result = await runner.execute('git status', {})
      expect(result.stdout).toContain('Enhanced mock result')

      runner.cleanup()
    })

    it('should log warning with legacy detection fallback', async () => {
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})

      const runner = new GitRunner()

      // Mock enhanced detection to return false
      const mockSafetyDetector = {
        configure: vi.fn(),
        detectEnvironment: () => ({
          isTestEnvironment: false,
          confidence: 0,
          triggers: [],
        }),
        getMockResult: vi.fn(),
        getDetectionHistory: () => [],
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private safetyDetector for testing
      ;(runner as any).safetyDetector = mockSafetyDetector

      // Make legacy detection return true by setting test environment
      process.env.VITEST = 'true'

      await runner.execute('git status', {})

      // Should have logged warning about fallback
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('FALLBACK SAFETY'),
        expect.anything()
      )

      consoleWarnSpy.mockRestore()
      delete process.env.VITEST
      runner.cleanup()
    })
  })

  describe('Initialization Async Handling', () => {
    it('should handle failed logging initialization in initializeLoggingAsync', async () => {
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})

      // Mock the import to fail
      vi.doMock('../system/index', () => {
        throw new Error('Module load error')
      })

      const runner = new GitRunner()

      // Call the private method directly
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private initializeLoggingAsync for testing
      await (runner as any).initializeLoggingAsync()

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[GitRunner] Failed to initialize logging:',
        expect.any(Error)
      )

      consoleWarnSpy.mockRestore()
      runner.cleanup()
    })
  })

  describe('getSafetyStatus with Empty History', () => {
    it('should handle empty detection history', () => {
      const runner = new GitRunner()

      // Mock safety detector with empty history
      const mockSafetyDetector = {
        configure: vi.fn(),
        detectEnvironment: () => ({
          isTestEnvironment: false,
          confidence: 0,
          triggers: [],
        }),
        getMockResult: vi.fn(),
        getDetectionHistory: () => [], // Empty history
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private safetyDetector for testing
      ;(runner as any).safetyDetector = mockSafetyDetector

      const status = runner.getSafetyStatus()

      expect(status.recentDetections).toBe(0)
      expect(status.lastDetection).toBeUndefined()

      runner.cleanup()
    })
  })

  describe('Dangerous Git Operations in Test Mode', () => {
    it('should log warning for git add in test mode', async () => {
      const runner = new GitRunner()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private logger for testing
      const warnSpy = vi.spyOn((runner as any).logger, 'warn')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private getSafeTestResult for testing
      const result = await (runner as any).getSafeTestResult('git add .')

      expect(warnSpy).toHaveBeenCalledWith(
        '🛡️  SAFETY: Prevented real Git operation in test: git add .'
      )
      expect(result.stdout).toBe('TEST MODE: Git operation simulated safely\n')

      runner.cleanup()
    })

    it('should log warning for git commit in test mode', async () => {
      const runner = new GitRunner()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private logger for testing
      const warnSpy = vi.spyOn((runner as any).logger, 'warn')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private getSafeTestResult for testing
      const result = await (runner as any).getSafeTestResult(
        'git commit -m "test"'
      )

      expect(warnSpy).toHaveBeenCalledWith(
        '🛡️  SAFETY: Prevented real Git operation in test: git commit -m "test"'
      )
      expect(result.stdout).toBe('TEST MODE: Git operation simulated safely\n')

      runner.cleanup()
    })

    it('should log warning for git push in test mode', async () => {
      const runner = new GitRunner()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private logger for testing
      const warnSpy = vi.spyOn((runner as any).logger, 'warn')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private getSafeTestResult for testing
      const result = await (runner as any).getSafeTestResult(
        'git push origin main'
      )

      expect(warnSpy).toHaveBeenCalledWith(
        '🛡️  SAFETY: Prevented real Git operation in test: git push origin main'
      )
      expect(result.stdout).toBe('TEST MODE: Git operation simulated safely\n')

      runner.cleanup()
    })

    it('should log warning for git pull in test mode', async () => {
      const runner = new GitRunner()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private logger for testing
      const warnSpy = vi.spyOn((runner as any).logger, 'warn')

      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any -- Result intentionally unused, accessing private getSafeTestResult for testing
      const _result = await (runner as any).getSafeTestResult(
        'git pull origin main'
      )

      expect(warnSpy).toHaveBeenCalledWith(
        '🛡️  SAFETY: Prevented real Git operation in test: git pull origin main'
      )

      runner.cleanup()
    })

    it('should log warning for git checkout in test mode', async () => {
      const runner = new GitRunner()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private logger for testing
      const warnSpy = vi.spyOn((runner as any).logger, 'warn')

      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any -- Result intentionally unused, accessing private getSafeTestResult for testing
      const _result = await (runner as any).getSafeTestResult(
        'git checkout develop'
      )

      expect(warnSpy).toHaveBeenCalledWith(
        '🛡️  SAFETY: Prevented real Git operation in test: git checkout develop'
      )

      runner.cleanup()
    })
  })

  describe('Production Execution Path', () => {
    it('should execute real git command in production mode', async () => {
      const runner = new GitRunner()

      // Mock safety detector to return production (non-test) environment
      const mockSafetyDetector = {
        configure: vi.fn(),
        detectEnvironment: () => ({
          isTestEnvironment: false,
          confidence: 0,
          triggers: [],
        }),
        getMockResult: vi.fn(),
        getDetectionHistory: () => [],
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private safetyDetector for testing
      ;(runner as any).safetyDetector = mockSafetyDetector

      // Mock isTestEnvironment to return false
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking isTestEnvironment for testing
      vi.spyOn(runner as any, 'isTestEnvironment').mockReturnValue(false)

      // Mock super.execute to simulate production execution
      const mockSuperExecute = vi.fn().mockResolvedValue({
        success: true,
        exitCode: 0,
        stdout: 'Production execution result',
        stderr: '',
        duration: 100,
        command: 'git status',
      })

      // Replace parent execute method
      const originalProto = Object.getPrototypeOf(Object.getPrototypeOf(runner))
      const originalExecute = originalProto.execute
      originalProto.execute = mockSuperExecute

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private logger for testing
      const debugSpy = vi.spyOn((runner as any).logger, 'debug')

      const result = await runner.execute('git status', {})

      expect(debugSpy).toHaveBeenCalledWith(
        'Executing Git command in production: git status'
      )
      expect(mockSuperExecute).toHaveBeenCalledWith('git status', {})
      expect(result.stdout).toBe('Production execution result')

      // Restore original prototype method
      originalProto.execute = originalExecute

      runner.cleanup()
    })
  })

  describe('getSafeTestResult Branch Coverage', () => {
    it('should return git branch result when command includes git branch but not --show-current', async () => {
      const runner = new GitRunner()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private getSafeTestResult for testing
      const result = await (runner as any).getSafeTestResult('git branch')

      expect(result.stdout).toBe('* main\n  feature-branch\n  develop\n')
      expect(result.success).toBe(true)
      expect(result.exitCode).toBe(0)

      runner.cleanup()
    })

    it('should return git log result when command includes git log', async () => {
      const runner = new GitRunner()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private getSafeTestResult for testing
      const result = await (runner as any).getSafeTestResult(
        'git log --oneline'
      )

      expect(result.stdout).toContain(
        'abc123|Test Author|2024-01-01 12:00:00|Test commit message'
      )
      expect(result.stdout).toContain(
        'def456|Test Author|2024-01-01 11:00:00|Previous commit'
      )
      expect(result.success).toBe(true)

      runner.cleanup()
    })

    it('should return git rev-list result when command includes git rev-list', async () => {
      const runner = new GitRunner()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private getSafeTestResult for testing
      const result = await (runner as any).getSafeTestResult(
        'git rev-list --left-right --count origin/main...HEAD'
      )

      expect(result.stdout).toBe('0\t0\n')
      expect(result.success).toBe(true)

      runner.cleanup()
    })

    it('should handle git branch --show-current command', async () => {
      const runner = new GitRunner()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private getSafeTestResult for testing
      const result = await (runner as any).getSafeTestResult(
        'git branch --show-current'
      )

      expect(result.stdout).toBe('main\n')
      expect(result.success).toBe(true)

      runner.cleanup()
    })

    it('should handle git status command', async () => {
      const runner = new GitRunner()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private getSafeTestResult for testing
      const result = await (runner as any).getSafeTestResult(
        'git status --porcelain'
      )

      expect(result.stdout).toContain('M  file1.txt')
      expect(result.success).toBe(true)

      runner.cleanup()
    })

    it('should return default safe response for unknown git commands', async () => {
      const runner = new GitRunner()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private getSafeTestResult for testing
      const result = await (runner as any).getSafeTestResult(
        'git unknown-command'
      )

      expect(result.stdout).toBe('Test mode: Safe mock response\n')
      expect(result.success).toBe(true)

      runner.cleanup()
    })

    it('should handle git rev-parse --is-inside-work-tree command', async () => {
      const runner = new GitRunner()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private getSafeTestResult for testing
      const result = await (runner as any).getSafeTestResult(
        'git rev-parse --is-inside-work-tree'
      )

      expect(result.stdout).toBe('true\n')
      expect(result.success).toBe(true)

      runner.cleanup()
    })
  })
})
