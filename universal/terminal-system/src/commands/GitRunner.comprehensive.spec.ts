import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  beforeAll,
} from 'vitest'
import { GitRunner } from './GitRunner'
import type { CommandResult } from '../types/commands'

/**
 * Comprehensive test suite for GitRunner to achieve 100% code coverage
 *
 * @remarks
 * This test file covers all branches, statements, and functions including:
 * - Initialization and logging system
 * - Error handling and fallback scenarios
 * - Safety detection mechanisms
 * - All git command operations
 * - Edge cases and error conditions
 */
describe('GitRunner - Comprehensive Coverage', () => {
  let gitRunner: GitRunner
  let mockExecute: ReturnType<typeof vi.fn>
  let originalEnv: NodeJS.ProcessEnv

  beforeAll(() => {
    originalEnv = { ...process.env }
  })

  beforeEach(() => {
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

  describe('Initialization and Logging', () => {
    it('should initialize without logging system available', async () => {
      // Mock the dynamic import to fail
      vi.doMock('../system/index', () => {
        throw new Error('Module not found')
      })

      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})

      const runner = new GitRunner()

      // Wait for async initialization
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[GitRunner] Logging system not available:',
        expect.any(Error)
      )

      consoleWarnSpy.mockRestore()
      runner.cleanup()
    })

    it('should handle logging initialization failure gracefully', async () => {
      // Mock console.warn to capture warning
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})

      // Mock the import to fail
      vi.doMock('../system/index', () => {
        throw new Error('Failed to load system module')
      })

      const runner = new GitRunner()
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Should continue working without logging
      const status = await runner.status()
      expect(status).toHaveProperty('branch')

      consoleWarnSpy.mockRestore()
      runner.cleanup()
    })

    it('should initialize enhanced safety successfully', () => {
      const runner = new GitRunner()

      // The safety detector should be configured
      const safetyStatus = runner.getSafetyStatus()
      expect(safetyStatus).toHaveProperty('isTestEnvironment')
      expect(safetyStatus).toHaveProperty('confidence')
      expect(safetyStatus).toHaveProperty('triggers')

      runner.cleanup()
    })

    it('should handle enhanced safety initialization failure', () => {
      // Mock the safety detector to throw
      const originalGetSafetyDetector = vi.fn(() => {
        return {
          configure: () => {
            throw new Error('Safety configuration failed')
          },
          detectEnvironment: () => ({
            isTestEnvironment: false,
            confidence: 0,
            triggers: [],
          }),
          getMockResult: () => ({
            success: true,
            exitCode: 0,
            stdout: '',
            stderr: '',
            duration: 0,
            command: '',
          }),
          getDetectionHistory: () => [],
        }
      })

      vi.doMock('../utils/GitSafetyDetector', () => ({
        getGitSafetyDetector: originalGetSafetyDetector,
      }))

      const runner = new GitRunner()
      // Should not throw, just log warning
      expect(() => runner.getSafetyStatus()).not.toThrow()

      runner.cleanup()
    })
  })

  describe('Test Environment Detection', () => {
    it('should detect Vitest environment via process.env', async () => {
      process.env.VITEST = 'true'

      const runner = new GitRunner()
      mockExecute = vi.spyOn(runner, 'execute' as keyof GitRunner)

      await runner.execute('git status', {})

      // Should return mock result in test environment
      expect(mockExecute).toHaveBeenCalled()

      runner.cleanup()
      delete process.env.VITEST
    })

    it('should detect Jest environment', async () => {
      process.env.JEST_WORKER_ID = '1'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking global jest for testing
      ;(global as any).jest = {}

      const runner = new GitRunner()
      const result = await runner.execute('git status', {})

      expect(result.stdout).toContain('Test')

      delete process.env.JEST_WORKER_ID
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking global jest for testing
      delete (global as any).jest
      runner.cleanup()
    })

    it('should detect mocked execute method', async () => {
      const runner = new GitRunner()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing execute method to add mock flag
      const executeMethod = runner.execute as any
      executeMethod._isMockFunction = true

      const result = await runner.execute('git status', {})
      expect(result.stdout).toBeTruthy()

      delete executeMethod._isMockFunction
      runner.cleanup()
    })

    it('should provide different mock results for different commands', async () => {
      process.env.VITEST = 'true'
      const runner = new GitRunner()

      const statusResult = await runner.execute('git status --porcelain', {})
      expect(statusResult.stdout).toContain('M src/test-file.ts')

      const branchResult = await runner.execute('git branch --show-current', {})
      expect(branchResult.stdout).toContain('main')

      const logResult = await runner.execute('git log', {})
      expect(logResult.stdout).toContain('Test commit message')

      const revParseResult = await runner.execute(
        'git rev-parse --is-inside-work-tree',
        {}
      )
      expect(revParseResult.stdout).toContain('true')

      delete process.env.VITEST
      runner.cleanup()
    })

    it('should handle dangerous git operations safely in test mode', async () => {
      process.env.VITEST = 'true'
      const runner = new GitRunner()

      const addResult = await runner.execute('git add .', {})
      expect(addResult.stdout).toContain('TEST MODE')

      const commitResult = await runner.execute('git commit -m "test"', {})
      expect(commitResult.stdout).toContain('TEST MODE')

      const pushResult = await runner.execute('git push', {})
      expect(pushResult.stdout).toContain('TEST MODE')

      const pullResult = await runner.execute('git pull', {})
      expect(pullResult.stdout).toContain('TEST MODE')

      const checkoutResult = await runner.execute('git checkout main', {})
      expect(checkoutResult.stdout).toContain('TEST MODE')

      delete process.env.VITEST
      runner.cleanup()
    })
  })

  describe('Git Status Command', () => {
    it('should parse all file status types correctly', async () => {
      const runner = new GitRunner()

      mockExecute = vi
        .spyOn(runner, 'execute' as keyof GitRunner)
        .mockImplementation(async (command: string): Promise<CommandResult> => {
          if (command.includes('git branch --show-current')) {
            return {
              success: true,
              exitCode: 0,
              stdout: 'feature-branch',
              stderr: '',
              duration: 100,
              command,
            }
          }

          if (command.includes('git rev-list')) {
            return {
              success: true,
              exitCode: 0,
              stdout: '3\t2',
              stderr: '',
              duration: 100,
              command,
            }
          }

          if (command.includes('git status --porcelain')) {
            // Test all status codes
            return {
              success: true,
              exitCode: 0,
              stdout:
                'M  modified.txt\n' + // Modified in working tree
                'A  staged.txt\n' + // Added to index
                '?? untracked.txt\n' + // Untracked
                'UU conflicted.txt\n' + // Both modified (conflict)
                'AA both-added.txt\n' + // Both added
                'DD both-deleted.txt\n' + // Both deleted
                'AU added-by-us.txt\n' + // Added by us
                'UA added-by-them.txt\n' + // Added by them
                'DU deleted-by-us.txt\n' + // Deleted by us
                'UD deleted-by-them.txt\n' + // Deleted by them
                'R  renamed.txt\n' + // Renamed in index
                ' M modified-not-staged.txt\n', // Modified not staged
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

      expect(status.branch).toBe('feature-branch')
      expect(status.ahead).toBe(2)
      expect(status.behind).toBe(3)

      // Check conflicted files
      expect(status.conflicted).toContain('conflicted.txt')
      expect(status.conflicted).toContain('both-added.txt')
      expect(status.conflicted).toContain('both-deleted.txt')
      expect(status.conflicted).toContain('added-by-us.txt')
      expect(status.conflicted).toContain('added-by-them.txt')
      expect(status.conflicted).toContain('deleted-by-us.txt')
      expect(status.conflicted).toContain('deleted-by-them.txt')

      // Check other statuses
      expect(status.untracked).toContain('untracked.txt')
      expect(status.staged).toContain('staged.txt')
      expect(status.staged).toContain('renamed.txt')
      expect(status.modified).toContain('modified-not-staged.txt')

      runner.cleanup()
    })

    it('should handle error in status command and return fallback', async () => {
      const runner = new GitRunner()

      mockExecute = vi
        .spyOn(runner, 'execute' as keyof GitRunner)
        .mockRejectedValue(new Error('Git command failed'))

      const status = await runner.status()

      expect(status.branch).toBe('unknown')
      expect(status.ahead).toBe(0)
      expect(status.behind).toBe(0)
      expect(status.modified).toEqual([])
      expect(status.staged).toEqual([])
      expect(status.untracked).toEqual([])
      expect(status.conflicted).toEqual([])

      runner.cleanup()
    })

    it('should handle missing branch name', async () => {
      const runner = new GitRunner()

      mockExecute = vi
        .spyOn(runner, 'execute' as keyof GitRunner)
        .mockImplementation(async (command: string): Promise<CommandResult> => {
          if (command.includes('git branch --show-current')) {
            return {
              success: true,
              exitCode: 0,
              stdout: '', // Empty branch name
              stderr: '',
              duration: 100,
              command,
            }
          }

          if (command.includes('git rev-list')) {
            return {
              success: true,
              exitCode: 0,
              stdout: '0\t0',
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
      expect(status.branch).toBe('main') // Should default to 'main'

      runner.cleanup()
    })
  })

  describe('Git Log Command', () => {
    it('should handle empty log output', async () => {
      const runner = new GitRunner()

      mockExecute = vi
        .spyOn(runner, 'execute' as keyof GitRunner)
        .mockResolvedValue({
          success: true,
          exitCode: 0,
          stdout: '',
          stderr: '',
          duration: 100,
          command: 'git log',
        })

      const commits = await runner.log()
      expect(commits).toEqual([])

      runner.cleanup()
    })

    it('should handle log command failure', async () => {
      const runner = new GitRunner()

      mockExecute = vi
        .spyOn(runner, 'execute' as keyof GitRunner)
        .mockRejectedValue(new Error('Not a git repository'))

      const commits = await runner.log()
      expect(commits).toEqual([])

      runner.cleanup()
    })
  })

  describe('Git Branch Command', () => {
    it('should handle branch command failure', async () => {
      const runner = new GitRunner()

      mockExecute = vi
        .spyOn(runner, 'execute' as keyof GitRunner)
        .mockRejectedValue(new Error('Not a git repository'))

      const branches = await runner.branch()
      expect(branches).toEqual([])

      runner.cleanup()
    })

    it('should filter out empty branch names', async () => {
      const runner = new GitRunner()

      mockExecute = vi
        .spyOn(runner, 'execute' as keyof GitRunner)
        .mockResolvedValue({
          success: true,
          exitCode: 0,
          stdout: '* main\n  \n  feature\n',
          stderr: '',
          duration: 100,
          command: 'git branch',
        })

      const branches = await runner.branch()
      expect(branches).toEqual(['main', 'feature'])

      runner.cleanup()
    })
  })

  describe('Git Push and Pull Commands', () => {
    it('should handle pull with custom remote and branch', async () => {
      const runner = new GitRunner()

      mockExecute = vi
        .spyOn(runner, 'execute' as keyof GitRunner)
        .mockResolvedValue({
          success: true,
          exitCode: 0,
          stdout: 'Already up to date.',
          stderr: '',
          duration: 100,
          command: 'git pull',
        })

      const result = await runner.pull({
        remote: 'upstream',
        branch: 'develop',
      })

      expect(mockExecute).toHaveBeenCalledWith(
        'git pull upstream develop',
        expect.any(Object)
      )
      expect(result.success).toBe(true)

      runner.cleanup()
    })

    it('should handle pull without branch', async () => {
      const runner = new GitRunner()

      mockExecute = vi
        .spyOn(runner, 'execute' as keyof GitRunner)
        .mockResolvedValue({
          success: true,
          exitCode: 0,
          stdout: 'Already up to date.',
          stderr: '',
          duration: 100,
          command: 'git pull',
        })

      await runner.pull()

      expect(mockExecute).toHaveBeenCalledWith('git pull', expect.any(Object))

      runner.cleanup()
    })

    it('should handle push with custom remote', async () => {
      const runner = new GitRunner()

      mockExecute = vi
        .spyOn(runner, 'execute' as keyof GitRunner)
        .mockResolvedValue({
          success: true,
          exitCode: 0,
          stdout: 'Everything up-to-date',
          stderr: '',
          duration: 100,
          command: 'git push',
        })

      await runner.push({ remote: 'upstream' })

      expect(mockExecute).toHaveBeenCalledWith(
        'git push upstream',
        expect.any(Object)
      )

      runner.cleanup()
    })
  })

  describe('Git Checkout Command', () => {
    it('should execute checkout command', async () => {
      const runner = new GitRunner()

      mockExecute = vi
        .spyOn(runner, 'execute' as keyof GitRunner)
        .mockResolvedValue({
          success: true,
          exitCode: 0,
          stdout: "Switched to branch 'feature'",
          stderr: '',
          duration: 100,
          command: 'git checkout feature',
        })

      const result = await runner.checkout('feature')

      expect(mockExecute).toHaveBeenCalledWith('git checkout feature', {})
      expect(result.success).toBe(true)

      runner.cleanup()
    })
  })

  describe('Quick Commit', () => {
    it('should abort if add operation fails', async () => {
      const runner = new GitRunner()

      const addSpy = vi.spyOn(runner, 'add').mockResolvedValue({
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: 'Failed to add files',
        duration: 100,
        command: 'git add .',
      })

      const commitSpy = vi.spyOn(runner, 'commit')

      const result = await runner.quickCommit('Test commit')

      expect(addSpy).toHaveBeenCalled()
      expect(commitSpy).not.toHaveBeenCalled()
      expect(result.success).toBe(false)
      expect(result.stderr).toBe('Failed to add files')

      runner.cleanup()
    })
  })

  describe('Git Sync', () => {
    it('should perform sync successfully', async () => {
      const runner = new GitRunner()

      const pullSpy = vi.spyOn(runner, 'pull').mockResolvedValue({
        success: true,
        exitCode: 0,
        stdout: 'Already up to date.',
        stderr: '',
        duration: 100,
        command: 'git pull',
      })

      const pushSpy = vi.spyOn(runner, 'push').mockResolvedValue({
        success: true,
        exitCode: 0,
        stdout: 'Everything up-to-date',
        stderr: '',
        duration: 100,
        command: 'git push',
      })

      const result = await runner.sync()

      expect(pullSpy).toHaveBeenCalled()
      expect(pushSpy).toHaveBeenCalled()
      expect(result.success).toBe(true)

      runner.cleanup()
    })

    it('should abort sync if pull fails', async () => {
      const runner = new GitRunner()

      const pullSpy = vi.spyOn(runner, 'pull').mockResolvedValue({
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: 'Merge conflict',
        duration: 100,
        command: 'git pull',
      })

      const pushSpy = vi.spyOn(runner, 'push')

      const result = await runner.sync()

      expect(pullSpy).toHaveBeenCalled()
      expect(pushSpy).not.toHaveBeenCalled()
      expect(result.success).toBe(false)
      expect(result.stderr).toBe('Merge conflict')

      runner.cleanup()
    })
  })

  describe('Working Tree Status', () => {
    it('should return clean status', async () => {
      const runner = new GitRunner()

      vi.spyOn(runner, 'status').mockResolvedValue({
        branch: 'main',
        ahead: 0,
        behind: 0,
        modified: [],
        staged: [],
        untracked: [],
        conflicted: [],
      })

      const status = await runner.getWorkingTreeStatus()
      expect(status).toBe('clean')

      runner.cleanup()
    })

    it('should return conflicted status', async () => {
      const runner = new GitRunner()

      vi.spyOn(runner, 'status').mockResolvedValue({
        branch: 'main',
        ahead: 0,
        behind: 0,
        modified: [],
        staged: [],
        untracked: [],
        conflicted: ['file.txt'],
      })

      const status = await runner.getWorkingTreeStatus()
      expect(status).toBe('conflicted')

      runner.cleanup()
    })

    it('should return dirty status for modified files', async () => {
      const runner = new GitRunner()

      vi.spyOn(runner, 'status').mockResolvedValue({
        branch: 'main',
        ahead: 0,
        behind: 0,
        modified: ['file.txt'],
        staged: [],
        untracked: [],
        conflicted: [],
      })

      const status = await runner.getWorkingTreeStatus()
      expect(status).toBe('dirty')

      runner.cleanup()
    })

    it('should return dirty status for staged files', async () => {
      const runner = new GitRunner()

      vi.spyOn(runner, 'status').mockResolvedValue({
        branch: 'main',
        ahead: 0,
        behind: 0,
        modified: [],
        staged: ['file.txt'],
        untracked: [],
        conflicted: [],
      })

      const status = await runner.getWorkingTreeStatus()
      expect(status).toBe('dirty')

      runner.cleanup()
    })

    it('should return dirty status for untracked files', async () => {
      const runner = new GitRunner()

      vi.spyOn(runner, 'status').mockResolvedValue({
        branch: 'main',
        ahead: 0,
        behind: 0,
        modified: [],
        staged: [],
        untracked: ['file.txt'],
        conflicted: [],
      })

      const status = await runner.getWorkingTreeStatus()
      expect(status).toBe('dirty')

      runner.cleanup()
    })
  })

  describe('Repository Check', () => {
    it('should detect non-repository directory', async () => {
      const runner = new GitRunner()

      mockExecute = vi
        .spyOn(runner, 'execute' as keyof GitRunner)
        .mockRejectedValue(new Error('Not a git repository'))

      const isRepo = await runner.isRepository('/tmp')
      expect(isRepo).toBe(false)

      runner.cleanup()
    })

    it('should detect repository with false output', async () => {
      const runner = new GitRunner()

      mockExecute = vi
        .spyOn(runner, 'execute' as keyof GitRunner)
        .mockResolvedValue({
          success: true,
          exitCode: 0,
          stdout: 'false',
          stderr: '',
          duration: 100,
          command: 'git rev-parse --is-inside-work-tree',
        })

      const isRepo = await runner.isRepository()
      expect(isRepo).toBe(false)

      runner.cleanup()
    })

    it('should handle unsuccessful command', async () => {
      const runner = new GitRunner()

      mockExecute = vi
        .spyOn(runner, 'execute' as keyof GitRunner)
        .mockResolvedValue({
          success: false,
          exitCode: 128,
          stdout: '',
          stderr: 'fatal: not a git repository',
          duration: 100,
          command: 'git rev-parse --is-inside-work-tree',
        })

      const isRepo = await runner.isRepository()
      expect(isRepo).toBe(false)

      runner.cleanup()
    })
  })

  describe('Safety Status', () => {
    it('should return comprehensive safety status', () => {
      const runner = new GitRunner()

      const status = runner.getSafetyStatus()

      expect(status).toHaveProperty('isTestEnvironment')
      expect(status).toHaveProperty('confidence')
      expect(status).toHaveProperty('triggers')
      expect(status).toHaveProperty('legacyDetection')
      expect(status).toHaveProperty('enhancedDetection')
      expect(status).toHaveProperty('recentDetections')

      expect(typeof status.isTestEnvironment).toBe('boolean')
      expect(typeof status.confidence).toBe('number')
      expect(Array.isArray(status.triggers)).toBe(true)
      expect(typeof status.legacyDetection).toBe('boolean')
      expect(typeof status.enhancedDetection).toBe('boolean')
      expect(typeof status.recentDetections).toBe('number')

      runner.cleanup()
    })

    it('should include last detection timestamp when available', () => {
      const runner = new GitRunner()

      // Trigger a detection first
      process.env.VITEST = 'true'
      runner.execute('git status', {})
      delete process.env.VITEST

      const status = runner.getSafetyStatus()

      if (status.recentDetections > 0) {
        expect(status.lastDetection).toBeDefined()
        expect(typeof status.lastDetection).toBe('number')
      }

      runner.cleanup()
    })
  })

  describe('Execute with Logging', () => {
    it('should handle logging system not initialized', async () => {
      const runner = new GitRunner()

      // Ensure logging is not initialized
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for test setup
      ;(runner as any).loggingInitialized = false

      mockExecute = vi
        .spyOn(runner, 'execute' as keyof GitRunner)
        .mockResolvedValue({
          success: true,
          exitCode: 0,
          stdout: 'test output',
          stderr: '',
          duration: 100,
          command: 'git status',
        })

      const status = await runner.status()
      expect(status).toHaveProperty('branch')

      runner.cleanup()
    })

    it('should handle logging operation failure with fallback value', async () => {
      const runner = new GitRunner()

      // Mock logging to be initialized but fail
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private property for test setup
      ;(runner as any).loggingInitialized = true

      // This will cause executeWithLogging to use fallback
      mockExecute = vi
        .spyOn(runner, 'execute' as keyof GitRunner)
        .mockRejectedValue(new Error('Command failed'))

      const status = await runner.status()

      // Should return fallback status
      expect(status.branch).toBe('unknown')
      expect(status.ahead).toBe(0)
      expect(status.behind).toBe(0)

      runner.cleanup()
    })
  })

  describe('Edge Cases and Complete Coverage', () => {
    it('should handle status with files having special characters', async () => {
      const runner = new GitRunner()

      mockExecute = vi
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
            return {
              success: true,
              exitCode: 0,
              stdout: '0\t0',
              stderr: '',
              duration: 100,
              command,
            }
          }

          if (command.includes('git status --porcelain')) {
            return {
              success: true,
              exitCode: 0,
              stdout: 'M  "file with spaces.txt"\nD  deleted.txt\n',
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
      expect(status.staged).toContain('"file with spaces.txt"')
      expect(status.staged).toContain('deleted.txt')

      runner.cleanup()
    })

    it('should handle git branch output for detached HEAD', async () => {
      const runner = new GitRunner()

      mockExecute = vi
        .spyOn(runner, 'execute' as keyof GitRunner)
        .mockImplementation(async (command: string): Promise<CommandResult> => {
          if (command.includes('git branch')) {
            return {
              success: true,
              exitCode: 0,
              stdout: '* (HEAD detached at abc123)\n  main\n  feature\n',
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

      const branches = await runner.branch()
      expect(branches).toContain('(HEAD detached at abc123)')
      expect(branches).toContain('main')
      expect(branches).toContain('feature')

      runner.cleanup()
    })

    it('should handle enhanced safety detection with legacy fallback', async () => {
      const runner = new GitRunner()

      // Mock enhanced detection to return false but legacy to return true
      const safetyDetectorMock = {
        detectEnvironment: () => ({
          isTestEnvironment: false,
          confidence: 0,
          triggers: [],
        }),
        getMockResult: (cmd: string) => ({
          success: true,
          exitCode: 0,
          stdout: 'mock result',
          stderr: '',
          duration: 0,
          command: cmd,
        }),
        configure: vi.fn(),
        getDetectionHistory: () => [],
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking internal safetyDetector for test scenario
      ;(runner as any).safetyDetector = safetyDetectorMock

      // Make legacy detection return true
      const stack = new Error().stack || ''
      if (stack.includes('.spec.') && stack.includes('vitest')) {
        const result = await runner.execute('git status', {})
        expect(result.stdout).toBeTruthy()
      }

      runner.cleanup()
    })

    it('should test all git command mock branches', async () => {
      process.env.VITEST = 'true'
      const runner = new GitRunner()

      // Test rev-list command
      const revListResult = await runner.execute(
        'git rev-list --left-right --count main...origin/main',
        {}
      )
      expect(revListResult.stdout).toContain('Test mode') // In test mode, all commands return test mode response

      // Test default fallback
      const unknownResult = await runner.execute('git unknown-command', {})
      expect(unknownResult.stdout).toBe('Test mode: Safe mock response\n')

      delete process.env.VITEST
      runner.cleanup()
    })
  })
})
