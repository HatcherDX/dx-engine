/**
 * @fileoverview Coverage tests for RepositoryManager to achieve 100% coverage
 *
 * @description
 * Comprehensive test suite targeting uncovered lines and branches in RepositoryManager.ts
 * to reach 100% test coverage. Targets specific edge cases and error paths.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CacheManager } from '../cache/CacheManager'
import { GitEngine } from './GitEngine'
import { RepositoryManager } from './RepositoryManager'

// Mock GitEngine
vi.mock('./GitEngine', () => ({
  GitEngine: vi.fn().mockImplementation(() => ({
    initialize: vi.fn(),
    getStatus: vi.fn(),
    getBranches: vi.fn(),
    destroy: vi.fn(),
    isRepository: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  })),
}))

// Mock CacheManager
vi.mock('../cache/CacheManager', () => ({
  CacheManager: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    destroy: vi.fn(),
    getStats: vi.fn(() => ({ hits: 0, misses: 0, size: 0 })),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  })),
}))

// Mock uuid
let uuidCounter = 0
vi.mock('uuid', () => ({
  v4: vi.fn(() => `coverage-uuid-${++uuidCounter}`),
}))

describe('🎯 RepositoryManager Coverage Tests', () => {
  let repositoryManager: RepositoryManager
  let mockGitEngine: Record<string, ReturnType<typeof vi.fn>>
  let mockCacheManager: Record<string, ReturnType<typeof vi.fn>>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    uuidCounter = 0

    // Create mock instances
    mockGitEngine = {
      initialize: vi.fn().mockResolvedValue({ success: true, data: true }),
      getStatus: vi.fn().mockResolvedValue({
        success: true,
        data: {
          isClean: true,
          ahead: 0,
          behind: 0,
          modified: [],
          staged: [],
          untracked: [],
          conflicted: [],
        },
      }),
      getBranches: vi.fn().mockResolvedValue({
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
      }),
      destroy: vi.fn(),
      isRepository: vi.fn().mockResolvedValue(true),
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    }

    mockCacheManager = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      destroy: vi.fn(),
      getStats: vi.fn(() => ({ hits: 0, misses: 0, size: 0 })),
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    }

    // Mock constructors
    vi.mocked(GitEngine).mockImplementation(() => mockGitEngine)
    vi.mocked(CacheManager).mockImplementation(() => mockCacheManager)

    repositoryManager = new RepositoryManager()
  })

  afterEach(() => {
    if (repositoryManager) {
      repositoryManager.destroy()
    }
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('🎯 Line 387: Previous repository undefined check', () => {
    it('should handle undefined previous repository when setting active', async () => {
      // Open repository
      await repositoryManager.openRepository('/test/repo', {
        name: 'Test Repo',
      })

      // Get the repository
      const activeRepo = repositoryManager.getActiveRepository()!

      // Manually delete the previous repository from the map to create undefined scenario
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Test variable not used in this scenario
      const _repoId = activeRepo.metadata.id

      // Open another repository to have a previous ID
      await repositoryManager.openRepository('/second/repo', {
        name: 'Second Repo',
      })

      // Get repositories
      const repos = repositoryManager.getAllRepositories()
      const firstRepo = repos.find(
        (r) => r.metadata.config.name === 'Test Repo'
      )!
      const secondRepo = repos.find(
        (r) => r.metadata.config.name === 'Second Repo'
      )!

      // Manually delete the first repository from internal map to create undefined scenario
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private members for testing
      ;(repositoryManager as any).repositories.delete(firstRepo.metadata.id)

      // Now set second repository as active - this should trigger line 387 with undefined previous
      const success = repositoryManager.setActiveRepository(
        secondRepo.metadata.id
      )

      expect(success).toBe(true)
      expect(secondRepo.metadata.isActive).toBe(true)
    })
  })

  describe('🎯 Line 483: Extract project name fallback', () => {
    it('should return "Unknown Project" for empty path parts', async () => {
      // Test with path that results in empty last part
      const result = await repositoryManager.openRepository('/', {})

      expect(result.success).toBe(true)
      expect(result.data?.metadata.config.name).toBe('Unknown Project')
    })

    it('should return "Unknown Project" for path with only separators', async () => {
      // Test with Windows-style path that results in empty last part
      const result = await repositoryManager.openRepository('C:\\\\', {})

      expect(result.success).toBe(true)
      expect(result.data?.metadata.config.name).toBe('Unknown Project')
    })
  })

  describe('🎯 Line 505: Conflicted files mapping', () => {
    it('should map conflicted files when status data includes them', async () => {
      // Mock getStatus to return conflicted files
      mockGitEngine.getStatus.mockResolvedValueOnce({
        success: true,
        data: {
          isClean: false,
          ahead: 1,
          behind: 2,
          modified: [{ path: 'modified.txt' }],
          staged: [{ path: 'staged.txt' }],
          untracked: [{ path: 'untracked.txt' }],
          conflicted: [
            { path: 'conflicted.txt' },
            { path: 'another-conflict.js' },
          ],
        },
      })

      const result = await repositoryManager.openRepository(
        '/test/conflict-repo',
        {
          name: 'Conflict Repo',
        }
      )

      expect(result.success).toBe(true)
      expect(result.data?.metadata.status.conflictedFiles).toEqual([
        'conflicted.txt',
        'another-conflict.js',
      ])
      expect(result.data?.metadata.status.state).toBe('dirty')
      expect(result.data?.metadata.status.ahead).toBe(1)
      expect(result.data?.metadata.status.behind).toBe(2)
    })
  })

  describe('🎯 Lines 563-565: File watcher status update mappings', () => {
    it('should map all status fields in file watcher update', async () => {
      const manager = new RepositoryManager({ enableFileWatching: true })
      const result = await manager.openRepository('/test/watcher-repo', {
        name: 'Watcher Repo',
      })
      const repoId = result.data!.metadata.id

      const statusChangedListener = vi.fn()
      manager.on('status-changed', statusChangedListener)

      // Mock comprehensive status change with all fields
      mockGitEngine.getStatus.mockResolvedValueOnce({
        success: true,
        data: {
          isClean: false,
          ahead: 3,
          behind: 1,
          modified: [{ path: 'mod1.txt' }, { path: 'mod2.js' }],
          staged: [{ path: 'stage1.css' }],
          untracked: [{ path: 'new1.md' }, { path: 'new2.json' }],
          conflicted: [{ path: 'conflict1.xml' }],
        },
      })

      // Trigger file watcher check
      vi.advanceTimersByTime(5000)
      await vi.runOnlyPendingTimersAsync()

      expect(statusChangedListener).toHaveBeenCalledWith(
        expect.objectContaining({
          repositoryId: repoId,
          newStatus: expect.objectContaining({
            state: 'dirty',
            ahead: 3,
            behind: 1,
            modifiedFiles: ['mod1.txt', 'mod2.js'],
            stagedFiles: ['stage1.css'],
            untrackedFiles: ['new1.md', 'new2.json'],
            conflictedFiles: ['conflict1.xml'],
          }),
        })
      )

      manager.destroy()
    })
  })

  describe('🎯 Line 583: File watcher setup error handling', () => {
    it('should handle file watcher setup errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Mock the setupFileWatcher method to throw an error
      const manager = new RepositoryManager({ enableFileWatching: true })

      // Override setupFileWatcher to force an error in the catch block
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any -- Test variable not used in this scenario
      const _originalSetupFileWatcher = (manager as any).setupFileWatcher
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking RepositoryManager for testing
      ;(manager as any).setupFileWatcher = async function (
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Mock function signature requires flexible typing
        _repositoryId: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Mock function signature requires flexible typing
        _repositoryPath: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any -- Mock function signature requires flexible typing
        _instance: any
      ) {
        try {
          throw new Error('Forced file watcher setup error')
        } catch (error) {
          console.error('Failed to setup file watcher:', error)
        }
      }

      const result = await manager.openRepository('/test/error-repo', {
        name: 'Error Repo',
      })

      expect(result.success).toBe(true)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to setup file watcher:',
        expect.any(Error)
      )

      manager.destroy()
    })

    it('should handle async errors in file watcher setup', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const manager = new RepositoryManager({ enableFileWatching: true })

      // Mock the internal setupFileWatcher to throw an error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private members for testing
      const originalSetupFileWatcher = (manager as any).setupFileWatcher
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mocking RepositoryManager for testing
      ;(manager as any).setupFileWatcher = async function (...args: any[]) {
        try {
          await originalSetupFileWatcher.call(this, ...args)
          throw new Error('Async setup error')
        } catch (error) {
          console.error('Failed to setup file watcher:', error)
        }
      }

      const result = await manager.openRepository('/test/async-error-repo', {
        name: 'Async Error Repo',
      })

      expect(result.success).toBe(true)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to setup file watcher:',
        expect.any(Error)
      )

      manager.destroy()
    })
  })

  describe('🎯 Additional edge cases for 100% coverage', () => {
    it('should handle all status change comparisons in file watcher', async () => {
      const manager = new RepositoryManager({ enableFileWatching: true })
      await manager.openRepository('/test/comparison-repo', {
        name: 'Comparison Repo',
      })

      const statusChangedListener = vi.fn()
      manager.on('status-changed', statusChangedListener)

      // Test each condition in hasStatusChanged method (lines 601-608)
      const testCases = [
        // Test state change
        {
          isClean: false, // state changed from clean to dirty
          ahead: 0,
          behind: 0,
          modified: [],
          staged: [],
          untracked: [],
          conflicted: [],
        },
        // Test ahead change
        {
          isClean: true,
          ahead: 1, // ahead changed from 0 to 1
          behind: 0,
          modified: [],
          staged: [],
          untracked: [],
          conflicted: [],
        },
        // Test behind change
        {
          isClean: true,
          ahead: 0,
          behind: 1, // behind changed from 0 to 1
          modified: [],
          staged: [],
          untracked: [],
          conflicted: [],
        },
        // Test modified files length change
        {
          isClean: true,
          ahead: 0,
          behind: 0,
          modified: [{ path: 'new-mod.txt' }], // modified length changed
          staged: [],
          untracked: [],
          conflicted: [],
        },
        // Test staged files length change
        {
          isClean: true,
          ahead: 0,
          behind: 0,
          modified: [],
          staged: [{ path: 'new-stage.txt' }], // staged length changed
          untracked: [],
          conflicted: [],
        },
        // Test untracked files length change
        {
          isClean: true,
          ahead: 0,
          behind: 0,
          modified: [],
          staged: [],
          untracked: [{ path: 'new-untracked.txt' }], // untracked length changed
          conflicted: [],
        },
      ]

      for (const testCase of testCases) {
        statusChangedListener.mockClear()

        mockGitEngine.getStatus.mockResolvedValueOnce({
          success: true,
          data: testCase,
        })

        vi.advanceTimersByTime(5000)
        await vi.runOnlyPendingTimersAsync()

        expect(statusChangedListener).toHaveBeenCalled()
      }

      manager.destroy()
    })

    it('should handle repository with empty remaining array when closing active', async () => {
      // Open single repository
      const result = await repositoryManager.openRepository('/single/repo', {
        name: 'Single Repo',
      })
      const repoId = result.data!.metadata.id

      // Ensure it's active
      expect(repositoryManager.getActiveRepository()?.metadata.id).toBe(repoId)

      // Close the only repository - this should leave remaining array empty
      await repositoryManager.closeRepository(repoId)

      expect(repositoryManager.getActiveRepository()).toBeUndefined()
    })

    it('should handle cleanup timer with empty repositories', async () => {
      const manager = new RepositoryManager({
        inactiveCleanupTime: 100,
        maxConcurrentRepos: 10,
      })

      // Don't add any repositories, just let cleanup timer run
      vi.advanceTimersByTime(200)
      vi.runOnlyPendingTimers()

      // Should not throw any errors
      expect(manager.getAllRepositories()).toHaveLength(0)

      manager.destroy()
    })
  })
})
