/**
 * @fileoverview Coverage tests for EnhancedGitRunner to achieve 100% coverage
 *
 * @description
 * Comprehensive test suite targeting uncovered lines and branches in EnhancedGitRunner.ts
 * to reach 100% test coverage. Targets specific edge cases, error paths, and branch conditions
 * that aren't covered by the main test suite.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EnhancedGitRunner } from './EnhancedGitRunner'
import { RepositoryManager } from './RepositoryManager'
import type { GitStatus, GitCommit } from '../types/git'

// Mock RepositoryManager
vi.mock('./RepositoryManager', () => ({
  RepositoryManager: vi.fn().mockImplementation(() => ({
    getActiveRepository: vi.fn(),
    openRepository: vi.fn(),
    closeRepository: vi.fn(),
    getAllRepositories: vi.fn(() => []),
  })),
}))

describe('🎯 EnhancedGitRunner Coverage Tests', () => {
  let gitRunner: EnhancedGitRunner
  let mockRepositoryManager: Record<string, ReturnType<typeof vi.fn>>
  let mockRepository: Record<string, ReturnType<typeof vi.fn>>
  let mockEngine: Record<string, ReturnType<typeof vi.fn>>

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock engine
    mockEngine = {
      getStatus: vi.fn(),
      getCommits: vi.fn(),
      getBranches: vi.fn(),
      isRepository: vi.fn(),
    }

    // Create mock repository instance
    mockRepository = {
      engine: mockEngine,
      metadata: {
        config: {
          path: '/test/repo',
          name: 'Test Repository',
        },
      },
    }

    // Create mock repository manager
    mockRepositoryManager = {
      getActiveRepository: vi.fn(),
      openRepository: vi.fn(),
      closeRepository: vi.fn(),
      getAllRepositories: vi.fn(() => []),
    }

    // Mock RepositoryManager constructor
    vi.mocked(RepositoryManager).mockImplementation(() => mockRepositoryManager)

    // Create EnhancedGitRunner instance
    gitRunner = new EnhancedGitRunner(mockRepositoryManager, true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('🎯 Line 388-389: getDiffViewData getCommits failure', () => {
    it('should handle getDiffViewData when getCommits fails', async () => {
      mockRepositoryManager.getActiveRepository.mockReturnValue(mockRepository)
      mockRepositoryManager.openRepository.mockResolvedValueOnce({
        success: true,
        data: mockRepository,
      })
      mockEngine.getCommits.mockResolvedValueOnce({
        success: false,
        error: { code: 'GIT_ERROR', message: 'Failed to get commits' },
      })

      await expect(
        gitRunner.getDiffViewData('source123', 'target456')
      ).rejects.toThrow('Commits not found for diff view')
    })

    it('should handle getDiffViewData when getCommits returns null data', async () => {
      mockRepositoryManager.getActiveRepository.mockReturnValue(mockRepository)
      mockRepositoryManager.openRepository.mockResolvedValueOnce({
        success: true,
        data: mockRepository,
      })
      mockEngine.getCommits.mockResolvedValueOnce({
        success: true,
        data: null,
      })

      await expect(
        gitRunner.getDiffViewData('source123', 'target456')
      ).rejects.toThrow('Commits not found for diff view')
    })
  })

  describe('🎯 Lines 437-445: getTimelineSidebarData Promise.all failures', () => {
    it('should handle getTimelineSidebarData when status call fails', async () => {
      mockRepositoryManager.getActiveRepository.mockReturnValue(mockRepository)
      mockRepositoryManager.openRepository.mockResolvedValueOnce({
        success: true,
        data: mockRepository,
      })

      mockEngine.getStatus.mockResolvedValueOnce({
        success: false,
        error: { code: 'GIT_ERROR', message: 'Status failed' },
      })
      mockEngine.getCommits.mockResolvedValueOnce({
        success: true,
        data: [],
      })
      mockEngine.getBranches.mockResolvedValueOnce({
        success: true,
        data: [],
      })

      const result = await gitRunner.getTimelineSidebarData()

      expect(result.currentStatus.branch).toBe('')
      expect(result.recentCommits.commits).toEqual([])
      expect(result.branches.current).toBe('main') // Defaults to 'main' when status is null
    })

    it('should handle getTimelineSidebarData when commits call fails', async () => {
      mockRepositoryManager.getActiveRepository.mockReturnValue(mockRepository)
      mockRepositoryManager.openRepository.mockResolvedValueOnce({
        success: true,
        data: mockRepository,
      })

      const mockStatus: GitStatus = {
        currentBranch: 'main',
        ahead: 0,
        behind: 0,
        modified: [],
        staged: [],
        untracked: [],
        conflicted: [],
        isClean: true,
      }

      mockEngine.getStatus.mockResolvedValueOnce({
        success: true,
        data: mockStatus,
      })
      mockEngine.getCommits.mockResolvedValueOnce({
        success: false,
        error: { code: 'GIT_ERROR', message: 'Commits failed' },
      })
      mockEngine.getBranches.mockResolvedValueOnce({
        success: true,
        data: [],
      })

      const result = await gitRunner.getTimelineSidebarData()

      expect(result.currentStatus.branch).toBe('main')
      expect(result.recentCommits.commits).toEqual([])
      expect(result.recentCommits.hasMore).toBe(false)
    })

    it('should handle getTimelineSidebarData when branches call fails', async () => {
      mockRepositoryManager.getActiveRepository.mockReturnValue(mockRepository)
      mockRepositoryManager.openRepository.mockResolvedValueOnce({
        success: true,
        data: mockRepository,
      })

      const mockStatus: GitStatus = {
        currentBranch: 'main',
        ahead: 0,
        behind: 0,
        modified: [],
        staged: [],
        untracked: [],
        conflicted: [],
        isClean: true,
      }

      mockEngine.getStatus.mockResolvedValueOnce({
        success: true,
        data: mockStatus,
      })
      mockEngine.getCommits.mockResolvedValueOnce({
        success: true,
        data: [],
      })
      mockEngine.getBranches.mockResolvedValueOnce({
        success: false,
        error: { code: 'GIT_ERROR', message: 'Branches failed' },
      })

      const result = await gitRunner.getTimelineSidebarData()

      expect(result.currentStatus.branch).toBe('main')
      expect(result.branches.recent).toEqual([])
      expect(result.branches.remote).toEqual([])
    })

    it('should handle getTimelineSidebarData when commits returns null data', async () => {
      mockRepositoryManager.getActiveRepository.mockReturnValue(mockRepository)
      mockRepositoryManager.openRepository.mockResolvedValueOnce({
        success: true,
        data: mockRepository,
      })

      mockEngine.getStatus.mockResolvedValueOnce({
        success: true,
        data: {
          currentBranch: 'main',
          ahead: 0,
          behind: 0,
          modified: [],
          staged: [],
          untracked: [],
          conflicted: [],
          isClean: true,
        },
      })
      mockEngine.getCommits.mockResolvedValueOnce({
        success: true,
        data: null,
      })
      mockEngine.getBranches.mockResolvedValueOnce({
        success: true,
        data: [],
      })

      const result = await gitRunner.getTimelineSidebarData()

      expect(result.recentCommits.commits).toEqual([])
      expect(result.recentCommits.hasMore).toBe(false)
    })

    it('should handle getTimelineSidebarData when branches returns null data', async () => {
      mockRepositoryManager.getActiveRepository.mockReturnValue(mockRepository)
      mockRepositoryManager.openRepository.mockResolvedValueOnce({
        success: true,
        data: mockRepository,
      })

      mockEngine.getStatus.mockResolvedValueOnce({
        success: true,
        data: {
          currentBranch: 'main',
          ahead: 0,
          behind: 0,
          modified: [],
          staged: [],
          untracked: [],
          conflicted: [],
          isClean: true,
        },
      })
      mockEngine.getCommits.mockResolvedValueOnce({
        success: true,
        data: [],
      })
      mockEngine.getBranches.mockResolvedValueOnce({
        success: true,
        data: null,
      })

      const result = await gitRunner.getTimelineSidebarData()

      expect(result.branches.recent).toEqual([])
      expect(result.branches.remote).toEqual([])
    })
  })

  describe('🎯 Lines 516-517: ensureRepository path matching logic', () => {
    it('should open new repository when path does not match current', async () => {
      const existingRepo = {
        engine: mockEngine,
        metadata: {
          config: {
            path: '/different/path',
            name: 'Different Repository',
          },
        },
      }

      mockRepositoryManager.getActiveRepository.mockReturnValue(existingRepo)
      mockRepositoryManager.openRepository.mockResolvedValueOnce({
        success: true,
        data: mockRepository,
      })
      mockEngine.getStatus.mockResolvedValueOnce({
        success: true,
        data: {
          currentBranch: 'main',
          ahead: 0,
          behind: 0,
          modified: [],
          staged: [],
          untracked: [],
          conflicted: [],
          isClean: true,
        },
      })

      const result = await gitRunner.status({ cwd: '/test/repo' })

      expect(result.branch).toBe('main')
      expect(mockRepositoryManager.openRepository).toHaveBeenCalledWith(
        '/test/repo'
      )
    })

    it('should use process.cwd() when no path provided', async () => {
      const _originalCwd = process.cwd()
      const spy = vi
        .spyOn(process, 'cwd')
        .mockReturnValue('/current/working/dir')

      mockRepositoryManager.getActiveRepository.mockReturnValue(null)
      mockRepositoryManager.openRepository.mockResolvedValueOnce({
        success: true,
        data: mockRepository,
      })
      mockEngine.getStatus.mockResolvedValueOnce({
        success: true,
        data: {
          currentBranch: 'main',
          ahead: 0,
          behind: 0,
          modified: [],
          staged: [],
          untracked: [],
          conflicted: [],
          isClean: true,
        },
      })

      const result = await gitRunner.status()

      expect(result.branch).toBe('main')
      expect(mockRepositoryManager.openRepository).toHaveBeenCalledWith(
        '/current/working/dir'
      )

      spy.mockRestore()
    })

    it('should set currentDirectory when repository is found', async () => {
      mockRepositoryManager.getActiveRepository.mockReturnValue(null)
      mockRepositoryManager.openRepository.mockResolvedValueOnce({
        success: true,
        data: mockRepository,
      })
      mockEngine.getStatus.mockResolvedValueOnce({
        success: true,
        data: {
          currentBranch: 'main',
          ahead: 0,
          behind: 0,
          modified: [],
          staged: [],
          untracked: [],
          conflicted: [],
          isClean: true,
        },
      })

      await gitRunner.status({ cwd: '/test/repo' })

      // Verify currentDirectory was set by calling another method that uses it
      mockRepositoryManager.getActiveRepository.mockReturnValue(mockRepository)
      mockEngine.getStatus.mockClear()
      mockEngine.getStatus.mockResolvedValueOnce({
        success: true,
        data: {
          currentBranch: 'main',
          ahead: 0,
          behind: 0,
          modified: [],
          staged: [],
          untracked: [],
          conflicted: [],
          isClean: true,
        },
      })

      await gitRunner.status() // Should use cached currentDirectory
      expect(mockRepositoryManager.openRepository).toHaveBeenCalledTimes(1) // Only called once
    })

    it('should handle repository opening error gracefully', async () => {
      mockRepositoryManager.getActiveRepository.mockReturnValue(null)
      mockRepositoryManager.openRepository.mockRejectedValueOnce(
        new Error('Repository access denied')
      )

      const result = await gitRunner.status({ cwd: '/invalid/path' })

      expect(result.branch).toBe('')
      expect(result.modified).toEqual([])
    })
  })

  describe('🎯 Lines 594-606: determineCommitSignificance branch coverage', () => {
    beforeEach(() => {
      mockRepositoryManager.getActiveRepository.mockReturnValue(mockRepository)
      mockRepositoryManager.openRepository.mockResolvedValue({
        success: true,
        data: mockRepository,
      })
    })

    it('should determine feature significance', async () => {
      const mockCommits: GitCommit[] = [
        {
          hash: 'feature123',
          shortHash: 'feature1',
          author: {
            name: 'Dev',
            email: 'dev@example.com',
            timestamp: '2023-01-01T00:00:00.000Z',
          },
          committer: {
            name: 'Dev',
            email: 'dev@example.com',
            timestamp: '2023-01-01T00:00:00.000Z',
          },
          message: 'feat: add new user dashboard',
          fullMessage: 'feat: add new user dashboard',
          timestamp: '2023-01-01T00:00:00.000Z',
          parents: [],
          files: [],
          stats: { filesChanged: 0, insertions: 0, deletions: 0 },
          isMerge: false,
          tags: [],
        },
      ]

      mockEngine.getCommits.mockResolvedValueOnce({
        success: true,
        data: mockCommits,
      })

      const result = await gitRunner.getTimelineData({
        commitLimit: 1,
        showMergeCommits: false,
        timeRange: 1,
        includeStats: false,
      })

      expect(result[0].metadata.significance).toBe('feature')
    })

    it('should determine hotfix significance', async () => {
      const mockCommits: GitCommit[] = [
        {
          hash: 'hotfix123',
          shortHash: 'hotfix12',
          author: {
            name: 'Dev',
            email: 'dev@example.com',
            timestamp: '2023-01-01T00:00:00.000Z',
          },
          committer: {
            name: 'Dev',
            email: 'dev@example.com',
            timestamp: '2023-01-01T00:00:00.000Z',
          },
          message: 'hotfix: critical security vulnerability',
          fullMessage: 'hotfix: critical security vulnerability',
          timestamp: '2023-01-01T00:00:00.000Z',
          parents: [],
          files: [],
          stats: { filesChanged: 0, insertions: 0, deletions: 0 },
          isMerge: false,
          tags: [],
        },
      ]

      mockEngine.getCommits.mockResolvedValueOnce({
        success: true,
        data: mockCommits,
      })

      const result = await gitRunner.getTimelineData({
        commitLimit: 1,
        showMergeCommits: false,
        timeRange: 1,
        includeStats: false,
      })

      expect(result[0].metadata.significance).toBe('hotfix')
    })

    it('should determine patch significance', async () => {
      const mockCommits: GitCommit[] = [
        {
          hash: 'patch123',
          shortHash: 'patch123',
          author: {
            name: 'Dev',
            email: 'dev@example.com',
            timestamp: '2023-01-01T00:00:00.000Z',
          },
          committer: {
            name: 'Dev',
            email: 'dev@example.com',
            timestamp: '2023-01-01T00:00:00.000Z',
          },
          message: 'patch: update documentation',
          fullMessage: 'patch: update documentation',
          timestamp: '2023-01-01T00:00:00.000Z',
          parents: [],
          files: [],
          stats: { filesChanged: 0, insertions: 0, deletions: 0 },
          isMerge: false,
          tags: [],
        },
      ]

      mockEngine.getCommits.mockResolvedValueOnce({
        success: true,
        data: mockCommits,
      })

      const result = await gitRunner.getTimelineData({
        commitLimit: 1,
        showMergeCommits: false,
        timeRange: 1,
        includeStats: false,
      })

      expect(result[0].metadata.significance).toBe('patch')
    })

    it('should determine minor significance for unrecognized patterns', async () => {
      const mockCommits: GitCommit[] = [
        {
          hash: 'minor123',
          shortHash: 'minor123',
          author: {
            name: 'Dev',
            email: 'dev@example.com',
            timestamp: '2023-01-01T00:00:00.000Z',
          },
          committer: {
            name: 'Dev',
            email: 'dev@example.com',
            timestamp: '2023-01-01T00:00:00.000Z',
          },
          message: 'chore: update dependencies',
          fullMessage: 'chore: update dependencies',
          timestamp: '2023-01-01T00:00:00.000Z',
          parents: [],
          files: [],
          stats: { filesChanged: 0, insertions: 0, deletions: 0 },
          isMerge: false,
          tags: [],
        },
      ]

      mockEngine.getCommits.mockResolvedValueOnce({
        success: true,
        data: mockCommits,
      })

      const result = await gitRunner.getTimelineData({
        commitLimit: 1,
        showMergeCommits: false,
        timeRange: 1,
        includeStats: false,
      })

      expect(result[0].metadata.significance).toBe('minor')
    })

    it('should handle breaking change pattern', async () => {
      const mockCommits: GitCommit[] = [
        {
          hash: 'breaking123',
          shortHash: 'breaking1',
          author: {
            name: 'Dev',
            email: 'dev@example.com',
            timestamp: '2023-01-01T00:00:00.000Z',
          },
          committer: {
            name: 'Dev',
            email: 'dev@example.com',
            timestamp: '2023-01-01T00:00:00.000Z',
          },
          message: 'refactor: breaking changes to API structure',
          fullMessage: 'refactor: breaking changes to API structure',
          timestamp: '2023-01-01T00:00:00.000Z',
          parents: [],
          files: [],
          stats: { filesChanged: 0, insertions: 0, deletions: 0 },
          isMerge: false,
          tags: [],
        },
      ]

      mockEngine.getCommits.mockResolvedValueOnce({
        success: true,
        data: mockCommits,
      })

      const result = await gitRunner.getTimelineData({
        commitLimit: 1,
        showMergeCommits: false,
        timeRange: 1,
        includeStats: false,
      })

      expect(result[0].metadata.significance).toBe('major')
    })

    it('should handle fix pattern', async () => {
      const mockCommits: GitCommit[] = [
        {
          hash: 'fix123',
          shortHash: 'fix123',
          author: {
            name: 'Dev',
            email: 'dev@example.com',
            timestamp: '2023-01-01T00:00:00.000Z',
          },
          committer: {
            name: 'Dev',
            email: 'dev@example.com',
            timestamp: '2023-01-01T00:00:00.000Z',
          },
          message: 'fix: resolve null pointer exception',
          fullMessage: 'fix: resolve null pointer exception',
          timestamp: '2023-01-01T00:00:00.000Z',
          parents: [],
          files: [],
          stats: { filesChanged: 0, insertions: 0, deletions: 0 },
          isMerge: false,
          tags: [],
        },
      ]

      mockEngine.getCommits.mockResolvedValueOnce({
        success: true,
        data: mockCommits,
      })

      const result = await gitRunner.getTimelineData({
        commitLimit: 1,
        showMergeCommits: false,
        timeRange: 1,
        includeStats: false,
      })

      expect(result[0].metadata.significance).toBe('hotfix')
    })
  })

  describe('🎯 Lines 574-575: Timeline entry merge commit color', () => {
    beforeEach(() => {
      mockRepositoryManager.getActiveRepository.mockReturnValue(mockRepository)
      mockRepositoryManager.openRepository.mockResolvedValue({
        success: true,
        data: mockRepository,
      })
    })

    it('should use merge commit color for merge commits', async () => {
      const mockCommits: GitCommit[] = [
        {
          hash: 'merge123',
          shortHash: 'merge123',
          author: {
            name: 'Dev',
            email: 'dev@example.com',
            timestamp: '2023-01-01T00:00:00.000Z',
          },
          committer: {
            name: 'Dev',
            email: 'dev@example.com',
            timestamp: '2023-01-01T00:00:00.000Z',
          },
          message: 'Merge branch feature into main',
          fullMessage: 'Merge branch feature into main',
          timestamp: '2023-01-01T00:00:00.000Z',
          parents: ['parent1', 'parent2'],
          files: [],
          stats: { filesChanged: 0, insertions: 0, deletions: 0 },
          isMerge: true,
          tags: [],
        },
      ]

      mockEngine.getCommits.mockResolvedValueOnce({
        success: true,
        data: mockCommits,
      })

      const result = await gitRunner.getTimelineData({
        commitLimit: 1,
        showMergeCommits: true,
        timeRange: 1,
        includeStats: false,
      })

      expect(result[0].position.color).toBe('#ff6b6b')
      expect(result[0].metadata.isMerge).toBe(true)
    })
  })

  describe('🎯 Lines 452-453: hasMore logic in recentCommits', () => {
    beforeEach(() => {
      mockRepositoryManager.getActiveRepository.mockReturnValue(mockRepository)
      mockRepositoryManager.openRepository.mockResolvedValue({
        success: true,
        data: mockRepository,
      })
    })

    it('should set hasMore to true when exactly 10 commits returned', async () => {
      const mockCommits: GitCommit[] = Array.from({ length: 10 }, (_, i) => ({
        hash: `commit${i}`,
        shortHash: `commit${i}`,
        author: {
          name: 'Dev',
          email: 'dev@example.com',
          timestamp: '2023-01-01T00:00:00.000Z',
        },
        committer: {
          name: 'Dev',
          email: 'dev@example.com',
          timestamp: '2023-01-01T00:00:00.000Z',
        },
        message: `Commit ${i}`,
        fullMessage: `Commit ${i}`,
        timestamp: '2023-01-01T00:00:00.000Z',
        parents: [],
        files: [],
        stats: { filesChanged: 0, insertions: 0, deletions: 0 },
        isMerge: false,
        tags: [],
      }))

      mockEngine.getStatus.mockResolvedValueOnce({
        success: true,
        data: {
          currentBranch: 'main',
          ahead: 0,
          behind: 0,
          modified: [],
          staged: [],
          untracked: [],
          conflicted: [],
          isClean: true,
        },
      })
      mockEngine.getCommits.mockResolvedValueOnce({
        success: true,
        data: mockCommits,
      })
      mockEngine.getBranches.mockResolvedValueOnce({
        success: true,
        data: [],
      })

      const result = await gitRunner.getTimelineSidebarData()

      expect(result.recentCommits.hasMore).toBe(true)
      expect(result.recentCommits.commits).toHaveLength(10)
    })
  })

  describe('🎯 Line 681-684: fallbackBranch output parsing', () => {
    it('should test fallbackBranch output parsing with asterisk', async () => {
      // Create a runner with fallback disabled to force hitting the fallback
      const fallbackRunner = new EnhancedGitRunner(mockRepositoryManager, true)

      // Mock the private execute method to return formatted git branch output
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private members for testing
      const executeSpy = vi.spyOn(fallbackRunner as any, 'execute')
      executeSpy.mockResolvedValueOnce({
        success: true,
        stdout: '* main\n  develop\n  feature/test\n  \n',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: 'git branch',
      })

      mockRepositoryManager.getActiveRepository.mockReturnValue(null)

      const result = await fallbackRunner.branch()

      expect(result).toEqual(['main', 'develop', 'feature/test'])
      expect(executeSpy).toHaveBeenCalledWith('git branch')

      executeSpy.mockRestore()
    })
  })

  describe('🎯 Lines 692-696: fallbackQuickCommit add failure', () => {
    it('should return add result when add fails in fallbackQuickCommit', async () => {
      const fallbackRunner = new EnhancedGitRunner(mockRepositoryManager, true)

      // Mock the private execute method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private members for testing
      const executeSpy = vi.spyOn(fallbackRunner as any, 'execute')
      executeSpy.mockResolvedValueOnce({
        success: false,
        stdout: '',
        stderr: 'fatal: not a git repository',
        exitCode: 128,
        duration: 50,
        command: 'git add .',
      })

      const result = await fallbackRunner.quickCommit('Test commit')

      expect(result.success).toBe(false)
      expect(result.stderr).toBe('fatal: not a git repository')
      expect(result.exitCode).toBe(128)
      expect(executeSpy).toHaveBeenCalledWith('git add .')
      expect(executeSpy).toHaveBeenCalledTimes(1) // Should not call commit after add fails

      executeSpy.mockRestore()
    })
  })

  describe('🎯 Lines 700-704: fallbackSync pull failure', () => {
    it('should return pull result when pull fails in fallbackSync', async () => {
      const fallbackRunner = new EnhancedGitRunner(mockRepositoryManager, true)

      // Mock the private execute method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private members for testing
      const executeSpy = vi.spyOn(fallbackRunner as any, 'execute')
      executeSpy.mockResolvedValueOnce({
        success: false,
        stdout: '',
        stderr: 'fatal: unable to connect to remote',
        exitCode: 1,
        duration: 5000,
        command: 'git pull',
      })

      const result = await fallbackRunner.sync()

      expect(result.success).toBe(false)
      expect(result.stderr).toBe('fatal: unable to connect to remote')
      expect(result.exitCode).toBe(1)
      expect(executeSpy).toHaveBeenCalledWith('git pull')
      expect(executeSpy).toHaveBeenCalledTimes(1) // Should not call push after pull fails

      executeSpy.mockRestore()
    })
  })

  describe('🎯 Lines 710-716: fallbackGetWorkingTreeStatus parsing', () => {
    it('should return clean when git status result is not successful', async () => {
      const fallbackRunner = new EnhancedGitRunner(mockRepositoryManager, true)

      // Mock the private execute method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private members for testing
      const executeSpy = vi.spyOn(fallbackRunner as any, 'execute')
      executeSpy.mockResolvedValueOnce({
        success: false,
        stdout: '',
        stderr: 'fatal: not a git repository',
        exitCode: 128,
        duration: 50,
        command: 'git status --porcelain',
      })

      mockRepositoryManager.getActiveRepository.mockReturnValue(null)

      const result = await fallbackRunner.getWorkingTreeStatus()

      expect(result).toBe('clean')
      expect(executeSpy).toHaveBeenCalledWith('git status --porcelain')

      executeSpy.mockRestore()
    })

    it('should return clean when stdout is empty', async () => {
      const fallbackRunner = new EnhancedGitRunner(mockRepositoryManager, true)

      // Mock the private execute method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private members for testing
      const executeSpy = vi.spyOn(fallbackRunner as any, 'execute')
      executeSpy.mockResolvedValueOnce({
        success: true,
        stdout: '   \n  \t  \n   ', // Only whitespace
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'git status --porcelain',
      })

      mockRepositoryManager.getActiveRepository.mockReturnValue(null)

      const result = await fallbackRunner.getWorkingTreeStatus()

      expect(result).toBe('clean')

      executeSpy.mockRestore()
    })

    it('should return dirty when stdout has content', async () => {
      const fallbackRunner = new EnhancedGitRunner(mockRepositoryManager, true)

      // Mock the private execute method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private members for testing
      const executeSpy = vi.spyOn(fallbackRunner as any, 'execute')
      executeSpy.mockResolvedValueOnce({
        success: true,
        stdout: ' M file.txt\n?? newfile.txt\n',
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'git status --porcelain',
      })

      mockRepositoryManager.getActiveRepository.mockReturnValue(null)

      const result = await fallbackRunner.getWorkingTreeStatus()

      expect(result).toBe('dirty')

      executeSpy.mockRestore()
    })
  })

  describe('🎯 Lines 719-721: fallbackIsRepository stdout check', () => {
    it('should return false when git rev-parse stdout is not "true"', async () => {
      const fallbackRunner = new EnhancedGitRunner(mockRepositoryManager, true)

      // Mock the private execute method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private members for testing
      const executeSpy = vi.spyOn(fallbackRunner as any, 'execute')
      executeSpy.mockResolvedValueOnce({
        success: true,
        stdout: 'false\n',
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'git rev-parse --is-inside-work-tree',
      })

      mockRepositoryManager.getActiveRepository.mockReturnValue(null)

      const result = await fallbackRunner.isRepository('/not/a/repo')

      expect(result).toBe(false)
      expect(executeSpy).toHaveBeenCalledWith(
        'git rev-parse --is-inside-work-tree'
      )

      executeSpy.mockRestore()
    })

    it('should return true when git rev-parse stdout is "true"', async () => {
      const fallbackRunner = new EnhancedGitRunner(mockRepositoryManager, true)

      // Mock the private execute method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private members for testing
      const executeSpy = vi.spyOn(fallbackRunner as any, 'execute')
      executeSpy.mockResolvedValueOnce({
        success: true,
        stdout: 'true\n',
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'git rev-parse --is-inside-work-tree',
      })

      mockRepositoryManager.getActiveRepository.mockReturnValue(null)

      const result = await fallbackRunner.isRepository('/valid/repo')

      expect(result).toBe(true)

      executeSpy.mockRestore()
    })
  })

  describe('🎯 Line 659-661: fallbackAdd files handling', () => {
    it('should handle empty files array in fallbackAdd', async () => {
      const fallbackRunner = new EnhancedGitRunner(mockRepositoryManager, true)

      // Mock the private execute method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private members for testing
      const executeSpy = vi.spyOn(fallbackRunner as any, 'execute')
      executeSpy.mockResolvedValueOnce({
        success: true,
        stdout: 'Files added successfully',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: 'git add .',
      })

      const result = await fallbackRunner.add([])

      expect(result.success).toBe(true)
      expect(executeSpy).toHaveBeenCalledWith('git add .')

      executeSpy.mockRestore()
    })

    it('should handle multiple files in fallbackAdd', async () => {
      const fallbackRunner = new EnhancedGitRunner(mockRepositoryManager, true)

      // Mock the private execute method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private members for testing
      const executeSpy = vi.spyOn(fallbackRunner as any, 'execute')
      executeSpy.mockResolvedValueOnce({
        success: true,
        stdout: 'Files added successfully',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: 'git add "file1.txt" "file2.txt"',
      })

      const result = await fallbackRunner.add(['file1.txt', 'file2.txt'])

      expect(result.success).toBe(true)
      expect(executeSpy).toHaveBeenCalledWith('git add "file1.txt" "file2.txt"')

      executeSpy.mockRestore()
    })
  })

  describe('🎯 Line 665-666: fallbackCommit message escaping', () => {
    it('should escape quotes in commit message', async () => {
      const fallbackRunner = new EnhancedGitRunner(mockRepositoryManager, true)

      // Mock the private execute method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private members for testing
      const executeSpy = vi.spyOn(fallbackRunner as any, 'execute')
      executeSpy.mockResolvedValueOnce({
        success: true,
        stdout: 'Commit created successfully',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: 'git commit -m "Message with \\"quotes\\""',
      })

      const result = await fallbackRunner.commit('Message with "quotes"')

      expect(result.success).toBe(true)
      expect(executeSpy).toHaveBeenCalledWith(
        'git commit -m "Message with \\"quotes\\""'
      )

      executeSpy.mockRestore()
    })
  })
})
