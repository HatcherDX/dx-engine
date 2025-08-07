import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GitRunner } from './GitRunner'
import type { CommandResult } from '../types/commands'

describe('GitRunner', () => {
  let gitRunner: GitRunner
  let mockExecute: ReturnType<typeof vi.fn>

  beforeEach(() => {
    gitRunner = new GitRunner()

    // Mock the execute method to prevent actual git commands
    mockExecute = vi
      .spyOn(gitRunner, 'execute' as keyof GitRunner)
      .mockImplementation(async (command: string): Promise<CommandResult> => {
        // Mock different git commands
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

        if (command.includes('git rev-list --left-right --count')) {
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
          // Simple mock that definitely works
          const output = 'M  staged-file.txt'
          return {
            success: true,
            exitCode: 0,
            stdout: output,
            stderr: '',
            duration: 100,
            command,
          }
        }

        if (command.includes('git log')) {
          return {
            success: true,
            exitCode: 0,
            stdout:
              'abc123|John Doe|2023-01-01 12:00:00 +0000|Initial commit\ndef456|Jane Smith|2023-01-02 12:00:00 +0000|Add feature',
            stderr: '',
            duration: 100,
            command,
          }
        }

        if (command.includes('git branch')) {
          return {
            success: true,
            exitCode: 0,
            stdout: '* main\n  feature-branch\n  develop\n',
            stderr: '',
            duration: 100,
            command,
          }
        }

        if (command.includes('git rev-parse --is-inside-work-tree')) {
          return {
            success: true,
            exitCode: 0,
            stdout: 'true',
            stderr: '',
            duration: 100,
            command,
          }
        }

        // Default success response for other git commands
        return {
          success: true,
          exitCode: 0,
          stdout: '',
          stderr: '',
          duration: 100,
          command,
        }
      })
  })

  afterEach(() => {
    mockExecute.mockRestore()
    gitRunner.cleanup()
  })

  describe('status', () => {
    it('should return git status structure', async () => {
      const status = await gitRunner.status()

      expect(status).toHaveProperty('branch')
      expect(status).toHaveProperty('ahead')
      expect(status).toHaveProperty('behind')
      expect(status).toHaveProperty('modified')
      expect(status).toHaveProperty('staged')
      expect(status).toHaveProperty('untracked')
      expect(status).toHaveProperty('conflicted')

      expect(Array.isArray(status.modified)).toBe(true)
      expect(Array.isArray(status.staged)).toBe(true)
      expect(Array.isArray(status.untracked)).toBe(true)
      expect(Array.isArray(status.conflicted)).toBe(true)

      // Check mocked values
      expect(status.branch).toBe('main')
      expect(status.ahead).toBe(0)
      expect(status.behind).toBe(0)
      // Check basic structure is returned correctly
      expect(status).toHaveProperty('modified')
      expect(status).toHaveProperty('staged')
      expect(status).toHaveProperty('untracked')
      expect(status).toHaveProperty('conflicted')
      expect(Array.isArray(status.modified)).toBe(true)
      expect(Array.isArray(status.staged)).toBe(true)
    })

    it('should handle non-git directories gracefully', async () => {
      // Mock error for non-git directory
      mockExecute.mockImplementationOnce(async () => {
        throw new Error('Not a git repository')
      })

      const status = await gitRunner.status({ cwd: '/tmp' })

      expect(typeof status.branch).toBe('string')
      expect(status.branch).toBe('unknown')
      expect(status.ahead).toBe(0)
      expect(status.behind).toBe(0)
    })
  })

  describe('log', () => {
    it('should return array of commits', async () => {
      const commits = await gitRunner.log(5)

      expect(Array.isArray(commits)).toBe(true)
      expect(commits.length).toBe(2) // Based on mocked data

      const commit = commits[0]
      expect(commit).toHaveProperty('hash')
      expect(commit).toHaveProperty('author')
      expect(commit).toHaveProperty('date')
      expect(commit).toHaveProperty('message')
      expect(commit).toHaveProperty('files')

      // Check mocked values
      expect(commit.hash).toBe('abc123')
      expect(commit.author).toBe('John Doe')
      expect(commit.message).toBe('Initial commit')
    })

    it('should respect count parameter', async () => {
      const commits = await gitRunner.log(2)

      // Should return the mocked commits
      expect(commits.length).toBe(2)
      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('git log'),
        expect.any(Object)
      )
    })
  })

  describe('add', () => {
    it('should add files to staging', async () => {
      const result = await gitRunner.add([])

      // In a git repo, this should succeed (git add .)
      // In non-git repo, it will fail but should return CommandResult structure
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('exitCode')
      expect(result).toHaveProperty('stdout')
      expect(result).toHaveProperty('stderr')
    })

    it('should add specific files', async () => {
      const result = await gitRunner.add(['package.json', 'README.md'])

      expect(result).toHaveProperty('success')
      expect(result.command).toContain('git add')
      expect(result.command).toContain('package.json')
      expect(result.command).toContain('README.md')
    })
  })

  describe('commit', () => {
    it('should create commit with message', async () => {
      const result = await gitRunner.commit('Test commit message')

      expect(result).toHaveProperty('success')
      expect(result.command).toContain('git commit')
      expect(result.command).toContain('Test commit message')
    })

    it('should escape quotes in commit message', async () => {
      const result = await gitRunner.commit('Message with "quotes"')

      expect(result.command).toContain('\\"quotes\\"')
    })
  })

  describe('branch', () => {
    it('should return array of branch names', async () => {
      const branches = await gitRunner.branch()

      expect(Array.isArray(branches)).toBe(true)
      expect(branches.length).toBe(3) // Based on mocked data

      // Check mocked values
      expect(branches).toContain('main')
      expect(branches).toContain('feature-branch')
      expect(branches).toContain('develop')

      branches.forEach((branch) => {
        expect(typeof branch).toBe('string')
        expect(branch.length).toBeGreaterThan(0)
      })
    })
  })

  describe('push and pull', () => {
    it('should construct correct push command', async () => {
      const result = await gitRunner.push()

      expect(result.command).toContain('git push origin')
    })

    it('should construct push command with branch', async () => {
      const result = await gitRunner.push({ branch: 'feature-branch' })

      expect(result.command).toContain('git push origin feature-branch')
    })

    it('should construct correct pull command', async () => {
      const result = await gitRunner.pull()

      expect(result.command).toContain('git pull')
    })
  })

  describe('convenience methods', () => {
    it('should perform quickCommit (add + commit)', async () => {
      // Mock the individual methods to track calls
      const addSpy = vi.spyOn(gitRunner, 'add').mockResolvedValue({
        success: true,
        exitCode: 0,
        stdout: '',
        stderr: '',
        duration: 100,
        command: 'git add .',
      })

      const commitSpy = vi.spyOn(gitRunner, 'commit').mockResolvedValue({
        success: true,
        exitCode: 0,
        stdout: '',
        stderr: '',
        duration: 100,
        command: 'git commit -m "test"',
      })

      const result = await gitRunner.quickCommit('Quick commit test')

      expect(addSpy).toHaveBeenCalledWith([], {})
      expect(commitSpy).toHaveBeenCalledWith('Quick commit test', {})
      expect(result.success).toBe(true)

      addSpy.mockRestore()
      commitSpy.mockRestore()
    })

    it('should get working tree status', async () => {
      const status = await gitRunner.getWorkingTreeStatus()

      expect(['clean', 'dirty', 'conflicted']).toContain(status)
      // Based on mocked data (has staged file 'A  staged.txt'), should be 'dirty'
      expect(status).toBe('dirty')
    })

    it('should check if directory is git repository', async () => {
      const isRepo = await gitRunner.isRepository()

      expect(typeof isRepo).toBe('boolean')
      // Based on mocked data, should return true
      expect(isRepo).toBe(true)
    })
  })
})
