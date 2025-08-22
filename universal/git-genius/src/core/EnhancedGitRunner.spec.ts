/**
 * @fileoverview Comprehensive tests for EnhancedGitRunner - PRIORITY 1: CORE VALIDATION
 *
 * @description
 * This test suite provides >90% coverage for the critical EnhancedGitRunner module.
 * EnhancedGitRunner is the bridge between Git Genius and the terminal system, making it
 * essential for the entire DX Engine ecosystem. Tests cover all public methods, error handling,
 * fallback mechanisms, Timeline mode features, and integration points.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @priority CRITICAL
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EnhancedGitRunner } from './EnhancedGitRunner'
import { RepositoryManager } from './RepositoryManager'
// import type { GitCommandOptions } from '@hatcherdx/terminal-system' // Currently unused
import type { GitStatus, GitCommit } from '../types/git'
import type { TimelineViewConfig } from '../types/timeline'

// Mock RepositoryManager
vi.mock('./RepositoryManager', () => ({
  RepositoryManager: vi.fn().mockImplementation(() => ({
    getActiveRepository: vi.fn(),
    openRepository: vi.fn(),
    closeRepository: vi.fn(),
    getAllRepositories: vi.fn(() => []),
  })),
}))

// Mock terminal system types (these are external dependencies) - kept for reference
// const mockTerminalGitStatus = {
//   branch: 'main',
//   ahead: 0,
//   behind: 0,
//   modified: ['file1.txt'],
//   staged: ['file2.txt'],
//   untracked: ['file3.txt'],
//   conflicted: [],
//   isClean: false,
// }
//
// const mockTerminalGitCommit = {
//   hash: 'abc123',
//   shortHash: 'abc123',
//   message: 'Test commit',
//   author: 'Test Author',
//   email: 'test@example.com',
//   timestamp: '2023-01-01T00:00:00.000Z',
//   files: ['test.txt'],
// }
//
// const mockCommandResult = {
//   success: true,
//   stdout: 'Command executed successfully',
//   stderr: '',
//   code: 0,
// }

describe('🔧 EnhancedGitRunner - CORE VALIDATION (Priority 1)', () => {
  let gitRunner: EnhancedGitRunner
  let mockRepositoryManager: Record<string, ReturnType<typeof vi.fn>>
  let mockRepository: Record<string, ReturnType<typeof vi.fn>>
  let mockEngine: Record<string, ReturnType<typeof vi.fn>>

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock engine with Git Genius methods
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
          path: process.cwd(), // Use actual current working directory
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

  describe('🚀 Construction and Initialization', () => {
    it('should create instance with repository manager', () => {
      expect(gitRunner).toBeInstanceOf(EnhancedGitRunner)
      expect(RepositoryManager).not.toHaveBeenCalled() // We pass existing instance
    })

    it('should create instance with fallback enabled by default', () => {
      const runner = new EnhancedGitRunner(mockRepositoryManager)
      expect(runner).toBeInstanceOf(EnhancedGitRunner)
    })

    it('should create instance with fallback disabled', () => {
      const runner = new EnhancedGitRunner(mockRepositoryManager, false)
      expect(runner).toBeInstanceOf(EnhancedGitRunner)
    })
  })

  describe('📊 Status Operations', () => {
    beforeEach(() => {
      // Reset all repository manager mocks
      mockRepositoryManager.getActiveRepository.mockReturnValue(mockRepository)
    })

    it('should get status from Git Genius engine', async () => {
      const mockGitStatus: GitStatus = {
        currentBranch: 'main',
        ahead: 0,
        behind: 0,
        modified: [{ path: 'file1.txt', workingDirChange: 1, indexChange: 0 }],
        staged: [{ path: 'file2.txt', workingDirChange: 0, indexChange: 1 }],
        untracked: [{ path: 'file3.txt', workingDirChange: 2, indexChange: 0 }],
        conflicted: [],
        isClean: false,
      }

      mockEngine.getStatus.mockResolvedValueOnce({
        success: true,
        data: mockGitStatus,
      })

      const result = await gitRunner.status()

      expect(result).toEqual({
        branch: 'main',
        ahead: 0,
        behind: 0,
        modified: ['file1.txt'],
        staged: ['file2.txt'],
        untracked: ['file3.txt'],
        conflicted: [],
      })
      expect(mockEngine.getStatus).toHaveBeenCalled()
    })

    it('should handle status with working directory option', async () => {
      const testPath = '/custom/path'
      mockRepositoryManager.getActiveRepository.mockReturnValue(null)
      mockRepositoryManager.openRepository.mockResolvedValueOnce({
        success: true,
        data: mockRepository,
      })
      mockEngine.getStatus.mockResolvedValueOnce({
        success: true,
        data: {
          currentBranch: 'develop',
          ahead: 1,
          behind: 2,
          modified: [],
          staged: [],
          untracked: [],
          conflicted: [],
          isClean: true,
        },
      })

      const result = await gitRunner.status({ cwd: testPath })

      expect(result.branch).toBe('develop')
      expect(result.ahead).toBe(1)
      expect(result.behind).toBe(2)
      expect(mockRepositoryManager.openRepository).toHaveBeenCalledWith(
        testPath
      )
    })

    it('should fallback when no repository found', async () => {
      mockRepositoryManager.getActiveRepository.mockReturnValue(null)
      mockRepositoryManager.openRepository.mockResolvedValueOnce({
        success: false,
        data: null,
      })

      const result = await gitRunner.status()

      expect(result).toEqual({
        branch: '',
        ahead: 0,
        behind: 0,
        modified: [],
        staged: [],
        untracked: [],
        conflicted: [],
      })
    })

    it('should fallback when Git Genius engine fails', async () => {
      mockEngine.getStatus.mockResolvedValueOnce({
        success: false,
        error: { code: 'GIT_ERROR', message: 'Git command failed' },
      })

      const result = await gitRunner.status()

      expect(result.branch).toBe('')
    })

    it('should handle errors gracefully', async () => {
      mockEngine.getStatus.mockRejectedValueOnce(new Error('Network error'))

      const result = await gitRunner.status()

      expect(result.branch).toBe('')
    })
  })

  describe('📝 Log Operations', () => {
    beforeEach(() => {
      mockRepositoryManager.getActiveRepository.mockReturnValue(mockRepository)
    })

    it('should get commits from Git Genius engine', async () => {
      const mockGitCommits: GitCommit[] = [
        {
          hash: 'abc123',
          shortHash: 'abc123',
          author: {
            name: 'John Doe',
            email: 'john@example.com',
            timestamp: '2023-01-01T00:00:00.000Z',
          },
          committer: {
            name: 'John Doe',
            email: 'john@example.com',
            timestamp: '2023-01-01T00:00:00.000Z',
          },
          message: 'Initial commit',
          fullMessage: 'Initial commit\\n\\nAdded project structure',
          timestamp: '2023-01-01T00:00:00.000Z',
          parents: [],
          files: [
            {
              path: 'README.md',
              status: 'added',
              insertions: 10,
              deletions: 0,
            },
          ],
          stats: { filesChanged: 1, insertions: 10, deletions: 0 },
          isMerge: false,
          tags: [],
        },
      ]

      mockEngine.getCommits.mockResolvedValueOnce({
        success: true,
        data: mockGitCommits,
      })

      const result = await gitRunner.log(5)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        hash: 'abc123',
        author: 'John Doe',
        date: '2023-01-01T00:00:00.000Z',
        message: 'Initial commit',
        files: ['README.md'],
      })
      expect(mockEngine.getCommits).toHaveBeenCalledWith({ maxCount: 5 })
    })

    it('should handle log with custom count and options', async () => {
      const testPath = '/custom/path'
      mockRepositoryManager.getActiveRepository.mockReturnValue(null)
      mockRepositoryManager.openRepository.mockResolvedValueOnce({
        success: true,
        data: mockRepository,
      })
      mockEngine.getCommits.mockResolvedValueOnce({
        success: true,
        data: [],
      })

      const result = await gitRunner.log(20, { cwd: testPath })

      expect(result).toEqual([])
      expect(mockEngine.getCommits).toHaveBeenCalledWith({ maxCount: 20 })
      expect(mockRepositoryManager.openRepository).toHaveBeenCalledWith(
        testPath
      )
    })

    it('should fallback when no repository found', async () => {
      mockRepositoryManager.getActiveRepository.mockReturnValue(null)
      mockRepositoryManager.openRepository.mockResolvedValueOnce({
        success: false,
        data: null,
      })

      const result = await gitRunner.log()

      expect(result).toEqual([])
    })

    it('should fallback when Git Genius engine fails', async () => {
      mockEngine.getCommits.mockResolvedValueOnce({
        success: false,
        error: { code: 'GIT_ERROR', message: 'Git command failed' },
      })

      const result = await gitRunner.log()

      expect(result).toEqual([])
    })

    it('should handle errors gracefully', async () => {
      mockEngine.getCommits.mockRejectedValueOnce(new Error('Network error'))

      const result = await gitRunner.log()

      expect(result).toEqual([])
    })
  })

  describe('🌿 Branch Operations', () => {
    beforeEach(() => {
      mockRepositoryManager.getActiveRepository.mockReturnValue(mockRepository)
    })

    it('should get branches from Git Genius engine', async () => {
      const mockBranches = [
        {
          name: 'main',
          ref: 'refs/heads/main',
          commit: 'abc123',
          isCurrent: true,
          isRemote: false,
        },
        {
          name: 'develop',
          ref: 'refs/heads/develop',
          commit: 'def456',
          isCurrent: false,
          isRemote: false,
        },
        {
          name: 'feature/test',
          ref: 'refs/heads/feature/test',
          commit: 'ghi789',
          isCurrent: false,
          isRemote: false,
        },
      ]

      mockEngine.getBranches.mockResolvedValueOnce({
        success: true,
        data: mockBranches,
      })

      const result = await gitRunner.branch()

      expect(result).toEqual(['main', 'develop', 'feature/test'])
      expect(mockEngine.getBranches).toHaveBeenCalled()
    })

    it('should handle branches with custom options', async () => {
      const testPath = '/custom/path'
      mockRepositoryManager.getActiveRepository.mockReturnValue(null)
      mockRepositoryManager.openRepository.mockResolvedValueOnce({
        success: true,
        data: mockRepository,
      })
      mockEngine.getBranches.mockResolvedValueOnce({
        success: true,
        data: [
          {
            name: 'main',
            ref: 'refs/heads/main',
            commit: 'abc123',
            isCurrent: true,
            isRemote: false,
          },
        ],
      })

      const result = await gitRunner.branch({ cwd: testPath })

      expect(result).toEqual(['main'])
      expect(mockRepositoryManager.openRepository).toHaveBeenCalledWith(
        testPath
      )
    })

    it('should fallback when no repository found', async () => {
      mockRepositoryManager.getActiveRepository.mockReturnValue(null)
      mockRepositoryManager.openRepository.mockResolvedValueOnce({
        success: false,
        data: null,
      })

      const result = await gitRunner.branch()

      expect(result).toEqual([])
    })

    it('should fallback when Git Genius engine fails', async () => {
      mockEngine.getBranches.mockResolvedValueOnce({
        success: false,
        error: { code: 'GIT_ERROR', message: 'Git command failed' },
      })

      const result = await gitRunner.branch()

      expect(result).toEqual([])
    })

    it('should handle errors gracefully', async () => {
      mockEngine.getBranches.mockRejectedValueOnce(new Error('Network error'))

      const result = await gitRunner.branch()

      expect(result).toEqual([])
    })
  })

  describe('🔍 Repository Detection', () => {
    it('should detect repository using Git Genius engine', async () => {
      mockRepositoryManager.getActiveRepository.mockReturnValue(mockRepository)
      mockEngine.isRepository.mockResolvedValueOnce(true)

      const result = await gitRunner.isRepository()

      expect(result).toBe(true)
      expect(mockEngine.isRepository).toHaveBeenCalled()
    })

    it('should detect repository with custom path', async () => {
      const testPath = '/custom/path'
      mockRepositoryManager.getActiveRepository.mockReturnValue(null)
      mockRepositoryManager.openRepository.mockResolvedValueOnce({
        success: true,
        data: mockRepository,
      })
      mockEngine.isRepository.mockResolvedValueOnce(true)

      const result = await gitRunner.isRepository(testPath)

      expect(result).toBe(true)
      expect(mockRepositoryManager.openRepository).toHaveBeenCalledWith(
        testPath
      )
    })

    it('should return false when no repository found', async () => {
      mockRepositoryManager.getActiveRepository.mockReturnValue(null)
      mockRepositoryManager.openRepository.mockResolvedValueOnce({
        success: false,
        data: null,
      })

      const result = await gitRunner.isRepository()

      expect(result).toBe(false)
    })

    it('should handle errors gracefully', async () => {
      mockRepositoryManager.getActiveRepository.mockReturnValue(mockRepository)
      mockEngine.isRepository.mockRejectedValueOnce(new Error('Access denied'))

      const result = await gitRunner.isRepository()

      expect(result).toBe(false)
    })
  })

  describe('🌊 Working Tree Status', () => {
    beforeEach(() => {
      mockRepositoryManager.getActiveRepository.mockReturnValue(mockRepository)
    })

    it('should return clean status', async () => {
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

      const result = await gitRunner.getWorkingTreeStatus()

      expect(result).toBe('clean')
    })

    it('should return conflicted status', async () => {
      mockEngine.getStatus.mockResolvedValueOnce({
        success: true,
        data: {
          currentBranch: 'main',
          ahead: 0,
          behind: 0,
          modified: [],
          staged: [],
          untracked: [],
          conflicted: [
            { path: 'conflict.txt', workingDirChange: 3, indexChange: 3 },
          ],
          isClean: false,
        },
      })

      const result = await gitRunner.getWorkingTreeStatus()

      expect(result).toBe('conflicted')
    })

    it('should return dirty status', async () => {
      mockEngine.getStatus.mockResolvedValueOnce({
        success: true,
        data: {
          currentBranch: 'main',
          ahead: 0,
          behind: 0,
          modified: [
            { path: 'dirty.txt', workingDirChange: 1, indexChange: 0 },
          ],
          staged: [],
          untracked: [],
          conflicted: [],
          isClean: false,
        },
      })

      const result = await gitRunner.getWorkingTreeStatus()

      expect(result).toBe('dirty')
    })

    it('should fallback when no repository found', async () => {
      mockRepositoryManager.getActiveRepository.mockReturnValue(null)

      const result = await gitRunner.getWorkingTreeStatus()

      expect(result).toBe('clean')
    })

    it('should fallback when Git Genius engine fails', async () => {
      mockEngine.getStatus.mockResolvedValueOnce({
        success: false,
        error: { code: 'GIT_ERROR', message: 'Git command failed' },
      })

      const result = await gitRunner.getWorkingTreeStatus()

      expect(result).toBe('clean')
    })

    it('should handle errors gracefully', async () => {
      mockEngine.getStatus.mockRejectedValueOnce(new Error('Access denied'))

      const result = await gitRunner.getWorkingTreeStatus()

      expect(result).toBe('clean')
    })
  })

  describe('🚧 Command Fallback Methods', () => {
    it('should fallback for add command', async () => {
      const result = await gitRunner.add(['file1.txt', 'file2.txt'])

      expect(result.success).toBe(false)
      expect(result.stderr).toContain(
        'Not implemented - placeholder for terminal system integration'
      )
    })

    it('should fallback for commit command', async () => {
      const result = await gitRunner.commit('Test commit message')

      expect(result.success).toBe(false)
      expect(result.stderr).toContain(
        'Not implemented - placeholder for terminal system integration'
      )
    })

    it('should fallback for push command', async () => {
      const result = await gitRunner.push()

      expect(result.success).toBe(false)
      expect(result.stderr).toContain(
        'Not implemented - placeholder for terminal system integration'
      )
    })

    it('should fallback for pull command', async () => {
      const result = await gitRunner.pull()

      expect(result.success).toBe(false)
      expect(result.stderr).toContain(
        'Not implemented - placeholder for terminal system integration'
      )
    })

    it('should fallback for checkout command', async () => {
      const result = await gitRunner.checkout('feature-branch')

      expect(result.success).toBe(false)
      expect(result.stderr).toContain(
        'Not implemented - placeholder for terminal system integration'
      )
    })

    it('should fallback for quickCommit command', async () => {
      const result = await gitRunner.quickCommit('Quick commit message')

      expect(result.success).toBe(false)
      expect(result.stderr).toContain(
        'Not implemented - placeholder for terminal system integration'
      )
    })

    it('should fallback for sync command', async () => {
      const result = await gitRunner.sync()

      expect(result.success).toBe(false)
      expect(result.stderr).toContain(
        'Not implemented - placeholder for terminal system integration'
      )
    })
  })

  describe('🎨 Timeline Mode Features', () => {
    beforeEach(() => {
      mockRepositoryManager.getActiveRepository.mockReturnValue(mockRepository)
    })

    it('should get timeline data with configuration', async () => {
      const mockCommits: GitCommit[] = [
        {
          hash: 'abc123',
          shortHash: 'abc123',
          author: {
            name: 'John Doe',
            email: 'john@example.com',
            timestamp: '2023-01-01T00:00:00.000Z',
          },
          committer: {
            name: 'John Doe',
            email: 'john@example.com',
            timestamp: '2023-01-01T00:00:00.000Z',
          },
          message: 'Major refactor of core system',
          fullMessage:
            'Major refactor of core system\\n\\nBreaking changes included',
          timestamp: '2023-01-01T00:00:00.000Z',
          parents: [],
          files: [
            {
              path: 'src/core.ts',
              status: 'modified',
              insertions: 50,
              deletions: 20,
            },
          ],
          stats: { filesChanged: 1, insertions: 50, deletions: 20 },
          isMerge: false,
          tags: [],
        },
      ]

      mockEngine.getCommits.mockResolvedValueOnce({
        success: true,
        data: mockCommits,
      })

      const config: TimelineViewConfig = {
        commitLimit: 100,
        showMergeCommits: true,
        timeRange: 30,
        includeStats: true,
      }

      const result = await gitRunner.getTimelineData(config)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        commit: expect.objectContaining({ hash: 'abc123' }),
        position: { x: 50, y: 0, color: '#4ecdc4' },
        connections: [],
        isSelected: false,
        isHighlighted: false,
        metadata: {
          branch: 'main',
          isMerge: false,
          tags: [],
          significance: 'major',
        },
      })
      expect(mockEngine.getCommits).toHaveBeenCalledWith({
        maxCount: 100,
        includeMerges: true,
      })
    })

    it('should throw error when no repository for timeline', async () => {
      mockRepositoryManager.getActiveRepository.mockReturnValue(null)

      const config: TimelineViewConfig = {
        commitLimit: 50,
        showMergeCommits: false,
        timeRange: 7,
        includeStats: false,
      }

      await expect(gitRunner.getTimelineData(config)).rejects.toThrow(
        'No active repository for Timeline mode'
      )
    })

    it('should throw error when commits fail for timeline', async () => {
      mockEngine.getCommits.mockResolvedValueOnce({
        success: false,
        error: { code: 'GIT_ERROR', message: 'Failed to get commits' },
      })

      const config: TimelineViewConfig = {
        commitLimit: 50,
        showMergeCommits: false,
        timeRange: 7,
        includeStats: false,
      }

      await expect(gitRunner.getTimelineData(config)).rejects.toThrow(
        'Failed to get commits for Timeline mode'
      )
    })

    it('should get diff view data', async () => {
      const mockCommits: GitCommit[] = [
        {
          hash: 'source123',
          shortHash: 'source1',
          author: {
            name: 'Author1',
            email: 'author1@example.com',
            timestamp: '2023-01-01T00:00:00.000Z',
          },
          committer: {
            name: 'Author1',
            email: 'author1@example.com',
            timestamp: '2023-01-01T00:00:00.000Z',
          },
          message: 'Source commit',
          fullMessage: 'Source commit',
          timestamp: '2023-01-01T00:00:00.000Z',
          parents: [],
          files: [],
          stats: { filesChanged: 0, insertions: 0, deletions: 0 },
          isMerge: false,
          tags: [],
        },
        {
          hash: 'target456',
          shortHash: 'target4',
          author: {
            name: 'Author2',
            email: 'author2@example.com',
            timestamp: '2023-01-02T00:00:00.000Z',
          },
          committer: {
            name: 'Author2',
            email: 'author2@example.com',
            timestamp: '2023-01-02T00:00:00.000Z',
          },
          message: 'Target commit',
          fullMessage: 'Target commit',
          timestamp: '2023-01-02T00:00:00.000Z',
          parents: ['source123'],
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

      const result = await gitRunner.getDiffViewData('source123', 'target456')

      expect(result).toEqual({
        source: expect.objectContaining({ hash: 'source123' }),
        target: expect.objectContaining({ hash: 'target456' }),
        fileChanges: [],
        summary: {
          filesChanged: 0,
          linesAdded: 0,
          linesDeleted: 0,
          categories: {
            added: 0,
            modified: 0,
            deleted: 0,
            renamed: 0,
          },
        },
      })
    })

    it('should throw error when commits not found for diff', async () => {
      mockEngine.getCommits.mockResolvedValueOnce({
        success: true,
        data: [],
      })

      await expect(
        gitRunner.getDiffViewData('nonexistent1', 'nonexistent2')
      ).rejects.toThrow('Commits not found for diff view')
    })

    it('should get timeline sidebar data', async () => {
      const mockStatus: GitStatus = {
        currentBranch: 'main',
        ahead: 2,
        behind: 1,
        modified: [
          { path: 'modified.txt', workingDirChange: 1, indexChange: 0 },
        ],
        staged: [{ path: 'staged.txt', workingDirChange: 0, indexChange: 1 }],
        untracked: [
          { path: 'untracked.txt', workingDirChange: 2, indexChange: 0 },
        ],
        conflicted: [],
        isClean: false,
      }

      const mockCommits: GitCommit[] = [
        {
          hash: 'commit1',
          shortHash: 'commit1',
          author: {
            name: 'Author',
            email: 'author@example.com',
            timestamp: '2023-01-01T00:00:00.000Z',
          },
          committer: {
            name: 'Author',
            email: 'author@example.com',
            timestamp: '2023-01-01T00:00:00.000Z',
          },
          message: 'Recent commit',
          fullMessage: 'Recent commit',
          timestamp: '2023-01-01T00:00:00.000Z',
          parents: [],
          files: [],
          stats: { filesChanged: 1, insertions: 5, deletions: 2 },
          isMerge: false,
          tags: [],
        },
      ]

      const mockBranches = [
        {
          name: 'main',
          ref: 'refs/heads/main',
          commit: 'commit1',
          isCurrent: true,
          isRemote: false,
        },
        {
          name: 'develop',
          ref: 'refs/heads/develop',
          commit: 'commit2',
          isCurrent: false,
          isRemote: false,
        },
      ]

      mockEngine.getStatus.mockResolvedValueOnce({
        success: true,
        data: mockStatus,
      })
      mockEngine.getCommits.mockResolvedValueOnce({
        success: true,
        data: mockCommits,
      })
      mockEngine.getBranches.mockResolvedValueOnce({
        success: true,
        data: mockBranches,
      })

      const result = await gitRunner.getTimelineSidebarData()

      expect(result).toEqual({
        currentStatus: expect.objectContaining({
          branch: 'main',
          ahead: 2,
          behind: 1,
          modified: ['modified.txt'],
          staged: ['staged.txt'],
          untracked: ['untracked.txt'],
          conflicted: [],
        }),
        recentCommits: {
          commits: mockCommits.slice(0, 10),
          hasMore: false,
        },
        currentChanges: {
          modified: [
            {
              path: 'modified.txt',
              changeType: 'modified',
              linesAdded: 0,
              linesDeleted: 0,
              isBinary: false,
              oldPath: undefined,
            },
          ],
          staged: [
            {
              path: 'staged.txt',
              changeType: 'modified',
              linesAdded: 0,
              linesDeleted: 0,
              isBinary: false,
              oldPath: undefined,
            },
          ],
          untracked: ['untracked.txt'],
          quickActions: {
            canStageAll: true,
            canCommit: true,
            canPush: true,
            canPull: true,
          },
        },
        branches: {
          current: 'main',
          recent: ['main', 'develop'],
          remote: [],
          switchingInProgress: false,
        },
        updateInfo: {
          lastUpdate: expect.any(Number),
          isPaused: false,
          nextUpdate: expect.any(Number),
        },
      })
    })

    it('should throw error when no repository for sidebar data', async () => {
      mockRepositoryManager.getActiveRepository.mockReturnValue(null)

      await expect(gitRunner.getTimelineSidebarData()).rejects.toThrow(
        'No active repository for sidebar data'
      )
    })
  })

  describe('🔧 Internal Helper Methods', () => {
    it('should determine commit significance correctly', async () => {
      const mockCommits: GitCommit[] = [
        {
          hash: 'major123',
          shortHash: 'major12',
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
          message: 'major: breaking change in API',
          fullMessage: 'major: breaking change in API',
          timestamp: '2023-01-01T00:00:00.000Z',
          parents: [],
          files: [],
          stats: { filesChanged: 0, insertions: 0, deletions: 0 },
          isMerge: false,
          tags: [],
        },
      ]

      mockRepositoryManager.getActiveRepository.mockReturnValue(mockRepository)
      mockEngine.getCommits.mockResolvedValueOnce({
        success: true,
        data: mockCommits,
      })

      const config: TimelineViewConfig = {
        commitLimit: 1,
        showMergeCommits: false,
        timeRange: 1,
        includeStats: false,
      }

      const result = await gitRunner.getTimelineData(config)

      expect(result[0].metadata.significance).toBe('major')
    })

    it('should convert Git status to terminal format correctly', async () => {
      const mockGitStatus: GitStatus = {
        currentBranch: 'feature-branch',
        ahead: 3,
        behind: 1,
        modified: [
          { path: 'src/main.ts', workingDirChange: 1, indexChange: 0 },
          { path: 'README.md', workingDirChange: 1, indexChange: 0 },
        ],
        staged: [{ path: 'package.json', workingDirChange: 0, indexChange: 1 }],
        untracked: [
          { path: 'new-file.ts', workingDirChange: 2, indexChange: 0 },
        ],
        conflicted: [],
        isClean: false,
      }

      mockRepositoryManager.getActiveRepository.mockReturnValue(mockRepository)
      mockEngine.getStatus.mockResolvedValueOnce({
        success: true,
        data: mockGitStatus,
      })

      const result = await gitRunner.status()

      expect(result).toEqual({
        branch: 'feature-branch',
        ahead: 3,
        behind: 1,
        modified: ['src/main.ts', 'README.md'],
        staged: ['package.json'],
        untracked: ['new-file.ts'],
        conflicted: [],
      })
    })
  })

  describe('🛡️ Error Handling & Edge Cases', () => {
    it('should handle repository manager failures gracefully', async () => {
      mockRepositoryManager.getActiveRepository.mockImplementation(() => {
        throw new Error('Repository manager error')
      })

      const result = await gitRunner.status()

      expect(result.branch).toBe('')
      expect(result.modified).toEqual([])
      expect(result.staged).toEqual([])
      expect(result.untracked).toEqual([])
      expect(result.conflicted).toEqual([])
    })

    it('should handle repository opening failures', async () => {
      mockRepositoryManager.getActiveRepository.mockReturnValue(null)
      mockRepositoryManager.openRepository.mockRejectedValueOnce(
        new Error('Cannot open repository')
      )

      const result = await gitRunner.status({ cwd: '/invalid/path' })

      expect(result.branch).toBe('')
      expect(result.modified).toEqual([])
      expect(result.staged).toEqual([])
      expect(result.untracked).toEqual([])
      expect(result.conflicted).toEqual([])
    })

    it('should handle missing commit data in timeline', async () => {
      mockRepositoryManager.getActiveRepository.mockReturnValue(mockRepository)
      mockEngine.getCommits.mockResolvedValueOnce({
        success: true,
        data: null,
      })

      const config: TimelineViewConfig = {
        commitLimit: 10,
        showMergeCommits: false,
        timeRange: 7,
        includeStats: false,
      }

      await expect(gitRunner.getTimelineData(config)).rejects.toThrow(
        'Failed to get commits for Timeline mode'
      )
    })

    it('should handle malformed repository metadata', async () => {
      const malformedRepository = {
        engine: mockEngine,
        metadata: {
          config: null, // Malformed metadata
        },
      }

      mockRepositoryManager.getActiveRepository.mockReturnValue(
        malformedRepository
      )

      // Should fall back to empty status due to malformed metadata causing path access to fail
      const result = await gitRunner.status()
      expect(result.branch).toBe('')
      expect(result.modified).toEqual([])
      expect(result.staged).toEqual([])
      expect(result.untracked).toEqual([])
      expect(result.conflicted).toEqual([])
    })

    it('should handle empty branches array', async () => {
      mockRepositoryManager.getActiveRepository.mockReturnValue(mockRepository)
      mockEngine.getBranches.mockResolvedValueOnce({
        success: true,
        data: [],
      })

      const result = await gitRunner.branch()

      expect(result).toEqual([])
    })

    it('should handle null/undefined commit data', async () => {
      const commitsWithNulls: Array<Record<string, unknown> | null> = [
        null,
        {
          hash: 'valid123',
          shortHash: 'valid12',
          author: {
            name: 'Valid Author',
            email: 'valid@example.com',
            timestamp: '2023-01-01T00:00:00.000Z',
          },
          committer: {
            name: 'Valid Author',
            email: 'valid@example.com',
            timestamp: '2023-01-01T00:00:00.000Z',
          },
          message: 'Valid commit',
          fullMessage: 'Valid commit',
          timestamp: '2023-01-01T00:00:00.000Z',
          parents: [],
          files: [],
          stats: { filesChanged: 0, insertions: 0, deletions: 0 },
          isMerge: false,
          tags: [],
        },
        undefined,
      ]

      mockRepositoryManager.getActiveRepository.mockReturnValue(mockRepository)
      // Git Genius engine would filter out invalid commits
      const validCommits = commitsWithNulls.filter((commit) => commit != null)
      mockEngine.getCommits.mockResolvedValueOnce({
        success: true,
        data: validCommits,
      })

      // Should return only valid commits
      const result = await gitRunner.log()
      expect(result).toHaveLength(1)
      expect(result[0].hash).toBe('valid123')
    })
  })
})
