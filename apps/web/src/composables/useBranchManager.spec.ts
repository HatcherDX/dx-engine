/**
 * @fileoverview Test suite for useBranchManager composable.
 *
 * @description
 * Comprehensive tests for the branch manager composable ensuring 100% code coverage.
 * Tests branch loading, filtering, searching, switching, and date formatting.
 *
 * @vitest-environment jsdom
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useBranchManager } from './useBranchManager'

// Mock composables
const mockGetGitBranches = vi.fn()
const mockSwitchBranch = vi.fn()
const mockShowBranchSwitchOptions = vi.fn()
const mockShowError = vi.fn()

vi.mock('./useGitIntegration', () => ({
  useGitIntegration: vi.fn(() => ({
    getGitBranches: mockGetGitBranches,
    switchBranch: mockSwitchBranch,
  })),
}))

vi.mock('./useBranchSwitch', () => ({
  useBranchSwitch: vi.fn(() => ({
    showBranchSwitchOptions: mockShowBranchSwitchOptions,
  })),
}))

vi.mock('./useGitErrorModal', () => ({
  useGitErrorModal: vi.fn(() => ({
    showError: mockShowError,
  })),
}))

// Mock Electron API
const mockElectronGetGitBranches = vi.fn()
const mockElectronGetGitStatus = vi.fn()

describe('useBranchManager', () => {
  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks()
    vi.clearAllTimers()
    vi.useFakeTimers()

    // Setup window mock
    global.window = {
      electronAPI: {
        getGitBranches: mockElectronGetGitBranches,
        getGitStatus: mockElectronGetGitStatus,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test environment requires global window mock with Electron API
    } as any

    // Setup default mock implementations
    mockGetGitBranches.mockResolvedValue({
      all: ['main', 'develop', 'feature/test'],
      current: 'main',
    })

    mockElectronGetGitBranches.mockResolvedValue({
      current: 'main',
    })

    mockElectronGetGitStatus.mockResolvedValue({
      isRepository: true,
      totalFiles: 0,
      files: [],
    })

    mockSwitchBranch.mockResolvedValue({
      success: true,
      message: 'Switched successfully',
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const {
        branches,
        selectedBranch,
        isLoading,
        isSwitching,
        searchQuery,
        debouncedSearchQuery,
        filteredBranches,
      } = useBranchManager()

      expect(branches.value).toEqual([])
      expect(selectedBranch.value).toBeNull()
      expect(isLoading.value).toBe(false)
      expect(isSwitching.value).toBe(false)
      expect(searchQuery.value).toBe('')
      expect(debouncedSearchQuery.value).toBe('')
      expect(filteredBranches.value).toEqual([])
    })
  })

  describe('loadBranches', () => {
    it('should load branches successfully', async () => {
      const { loadBranches, branches, isLoading } = useBranchManager()

      const loadingPromise = loadBranches('/project/path')

      expect(isLoading.value).toBe(true)

      await loadingPromise

      expect(isLoading.value).toBe(false)
      expect(branches.value).toHaveLength(3)
      expect(branches.value[0].name).toBe('main')
      expect(branches.value[0].lastCommit).toBe('Current working branch')
      expect(branches.value[1].name).toBe('develop')
      expect(branches.value[2].name).toBe('feature/test')
    })

    it('should handle undefined project path', async () => {
      const { loadBranches, branches, isLoading } = useBranchManager()

      await loadBranches(undefined)

      expect(branches.value).toEqual([])
      expect(isLoading.value).toBe(false)
      expect(mockGetGitBranches).not.toHaveBeenCalled()
    })

    it('should handle error when loading branches', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      mockGetGitBranches.mockRejectedValue(new Error('Git error'))

      const { loadBranches, branches, isLoading } = useBranchManager()

      await loadBranches('/project/path')

      expect(branches.value).toEqual([])
      expect(isLoading.value).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[BranchManager] Failed to load Git branches:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    it('should sort branches with current branch first', async () => {
      mockGetGitBranches.mockResolvedValue({
        all: ['zebra', 'alpha', 'main', 'beta'],
        current: 'beta',
      })

      const { loadBranches, branches } = useBranchManager()

      await loadBranches('/project/path')

      expect(branches.value[0].name).toBe('beta')
      expect(branches.value[0].lastCommit).toBe('Current working branch')
      expect(branches.value[1].name).toBe('alpha')
      expect(branches.value[2].name).toBe('main')
      expect(branches.value[3].name).toBe('zebra')
    })
  })

  describe('filteredBranches', () => {
    it('should return all branches when no search query', async () => {
      const { loadBranches, filteredBranches } = useBranchManager()

      await loadBranches('/project/path')

      expect(filteredBranches.value).toHaveLength(3)
    })

    it('should filter branches by name', async () => {
      const { loadBranches, searchQuery, filteredBranches } = useBranchManager()

      await loadBranches('/project/path')
      searchQuery.value = 'feature'

      expect(filteredBranches.value).toHaveLength(1)
      expect(filteredBranches.value[0].name).toBe('feature/test')
    })

    it('should filter branches by commit message', async () => {
      const { loadBranches, searchQuery, filteredBranches } = useBranchManager()

      await loadBranches('/project/path')
      searchQuery.value = 'current'

      expect(filteredBranches.value).toHaveLength(1)
      expect(filteredBranches.value[0].name).toBe('main')
    })

    it('should sort filtered results by relevance', async () => {
      mockGetGitBranches.mockResolvedValue({
        all: ['feature/main-test', 'main-feature', 'main', 'domain'],
        current: 'develop',
      })

      const { loadBranches, searchQuery, filteredBranches } = useBranchManager()

      await loadBranches('/project/path')
      searchQuery.value = 'main'

      const results = filteredBranches.value
      expect(results[0].name).toBe('main') // Exact match first
      expect(results[1].name).toBe('main-feature') // Prefix match second
      expect(results[2].name).toBe('domain') // Contains match (alphabetically first)
      expect(results[3].name).toBe('feature/main-test') // Contains match (alphabetically second)
    })

    it('should handle case-insensitive search', async () => {
      const { loadBranches, searchQuery, filteredBranches } = useBranchManager()

      await loadBranches('/project/path')
      searchQuery.value = 'MAIN'

      expect(filteredBranches.value).toHaveLength(1)
      expect(filteredBranches.value[0].name).toBe('main')
    })
  })

  describe('selectBranch', () => {
    it('should switch branch successfully without uncommitted changes', async () => {
      const { selectBranch, selectedBranch, isSwitching, loadBranches } =
        useBranchManager()

      await loadBranches('/project/path')
      const branch = {
        name: 'develop',
        lastCommit: 'Test',
        lastUpdate: new Date(),
      }

      await selectBranch(branch, '/project/path')

      expect(selectedBranch.value).toStrictEqual(branch)
      expect(isSwitching.value).toBe(false)
      expect(mockSwitchBranch).toHaveBeenCalledWith('/project/path', 'develop')
      expect(mockShowBranchSwitchOptions).not.toHaveBeenCalled()
    })

    it('should skip switch when already on target branch', async () => {
      const { selectBranch, selectedBranch } = useBranchManager()

      const branch = {
        name: 'main',
        lastCommit: 'Test',
        lastUpdate: new Date(),
      }

      await selectBranch(branch, '/project/path')

      expect(selectedBranch.value).toStrictEqual(branch)
      expect(mockSwitchBranch).not.toHaveBeenCalled()
    })

    it('should show modal when uncommitted changes exist', async () => {
      mockElectronGetGitStatus.mockResolvedValue({
        isRepository: true,
        totalFiles: 2,
        files: [{ path: 'file1.ts' }, { path: 'file2.ts' }],
      })

      const { selectBranch } = useBranchManager()

      const branch = {
        name: 'develop',
        lastCommit: 'Test',
        lastUpdate: new Date(),
      }

      await selectBranch(branch, '/project/path')

      expect(mockShowBranchSwitchOptions).toHaveBeenCalledWith({
        currentBranch: 'main',
        targetBranch: 'develop',
        changedFiles: ['file1.ts', 'file2.ts'],
        projectPath: '/project/path',
      })
      expect(mockSwitchBranch).not.toHaveBeenCalled()
    })

    it('should handle error when no project path provided', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const { selectBranch, selectedBranch } = useBranchManager()

      const branch = {
        name: 'develop',
        lastCommit: 'Test',
        lastUpdate: new Date(),
      }

      await selectBranch(branch, '')

      expect(selectedBranch.value).toBeNull()
      expect(mockShowError).toHaveBeenCalledWith({
        success: false,
        currentBranch: '',
        message: 'No project path provided',
        errorType: 'other',
      })

      consoleErrorSpy.mockRestore()
    })

    it('should handle not a repository error', async () => {
      mockElectronGetGitStatus.mockResolvedValue({
        isRepository: false,
        totalFiles: 0,
        files: [],
      })

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const { selectBranch, selectedBranch } = useBranchManager()

      const branch = {
        name: 'develop',
        lastCommit: 'Test',
        lastUpdate: new Date(),
      }

      await selectBranch(branch, '/project/path')

      expect(selectedBranch.value).toBeNull()
      expect(mockShowError).toHaveBeenCalledWith({
        success: false,
        currentBranch: '',
        message: 'Not a Git repository',
        errorType: 'other',
      })

      consoleErrorSpy.mockRestore()
    })

    it('should handle switch failure', async () => {
      mockSwitchBranch.mockResolvedValue({
        success: false,
        message: 'Branch not found',
      })

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const { selectBranch, selectedBranch } = useBranchManager()

      const branch = {
        name: 'develop',
        lastCommit: 'Test',
        lastUpdate: new Date(),
      }

      await selectBranch(branch, '/project/path')

      expect(selectedBranch.value).toBeNull()
      expect(mockShowError).toHaveBeenCalledWith({
        success: false,
        currentBranch: 'main',
        message: 'Branch not found',
        errorType: 'other',
      })

      consoleErrorSpy.mockRestore()
    })

    it('should handle switch failure without message', async () => {
      mockSwitchBranch.mockResolvedValue({
        success: false,
      })

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const { selectBranch, selectedBranch } = useBranchManager()

      const branch = {
        name: 'develop',
        lastCommit: 'Test',
        lastUpdate: new Date(),
      }

      await selectBranch(branch, '/project/path')

      expect(selectedBranch.value).toBeNull()
      expect(mockShowError).toHaveBeenCalledWith({
        success: false,
        currentBranch: 'main',
        message: 'Failed to switch branch',
        errorType: 'other',
      })

      consoleErrorSpy.mockRestore()
    })

    it('should handle unexpected error during switch', async () => {
      mockElectronGetGitBranches.mockRejectedValue(new Error('Network error'))

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const { selectBranch, selectedBranch } = useBranchManager()

      const branch = {
        name: 'develop',
        lastCommit: 'Test',
        lastUpdate: new Date(),
      }

      await selectBranch(branch, '/project/path')

      expect(selectedBranch.value).toBeNull()
      expect(mockShowError).toHaveBeenCalledWith({
        success: false,
        currentBranch: '',
        message: 'Network error',
        errorType: 'other',
      })

      consoleErrorSpy.mockRestore()
    })

    it('should handle non-Error exception', async () => {
      mockElectronGetGitBranches.mockRejectedValue('String error')

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const { selectBranch, selectedBranch } = useBranchManager()

      const branch = {
        name: 'develop',
        lastCommit: 'Test',
        lastUpdate: new Date(),
      }

      await selectBranch(branch, '/project/path')

      expect(selectedBranch.value).toBeNull()
      expect(mockShowError).toHaveBeenCalledWith({
        success: false,
        currentBranch: '',
        message: 'Unknown error',
        errorType: 'other',
      })

      consoleErrorSpy.mockRestore()
    })

    it('should reset isSwitching flag after error', async () => {
      mockElectronGetGitBranches.mockRejectedValue(new Error('Error'))

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const { selectBranch, isSwitching } = useBranchManager()

      const branch = {
        name: 'develop',
        lastCommit: 'Test',
        lastUpdate: new Date(),
      }

      expect(isSwitching.value).toBe(false)
      const promise = selectBranch(branch, '/project/path')
      expect(isSwitching.value).toBe(true)
      await promise
      expect(isSwitching.value).toBe(false)

      consoleErrorSpy.mockRestore()
    })
  })

  describe('filterBranches', () => {
    it('should update search query immediately', () => {
      const { filterBranches, searchQuery } = useBranchManager()

      filterBranches('test query')

      expect(searchQuery.value).toBe('test query')
    })

    it('should debounce search query updates', () => {
      const { filterBranches, debouncedSearchQuery } = useBranchManager()

      filterBranches('test')

      expect(debouncedSearchQuery.value).toBe('')

      vi.advanceTimersByTime(150)

      expect(debouncedSearchQuery.value).toBe('test')
    })

    it('should cancel previous debounce timer', () => {
      const { filterBranches, debouncedSearchQuery } = useBranchManager()

      filterBranches('first')
      vi.advanceTimersByTime(100)
      filterBranches('second')
      vi.advanceTimersByTime(100)

      expect(debouncedSearchQuery.value).toBe('')

      vi.advanceTimersByTime(50)

      expect(debouncedSearchQuery.value).toBe('second')
    })

    it('should log search query updates', () => {
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {})
      const { filterBranches } = useBranchManager()

      filterBranches('search term')
      vi.advanceTimersByTime(150)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[BranchManager] Search query updated:',
        'search term'
      )

      consoleLogSpy.mockRestore()
    })
  })

  describe('clearSearch', () => {
    it('should clear all search state', () => {
      const {
        filterBranches,
        clearSearch,
        searchQuery,
        debouncedSearchQuery,
        selectedBranch,
      } = useBranchManager()

      // Set up some state
      filterBranches('test')
      selectedBranch.value = {
        name: 'test',
        lastCommit: 'commit',
        lastUpdate: new Date(),
      }

      clearSearch()

      expect(searchQuery.value).toBe('')
      expect(debouncedSearchQuery.value).toBe('')
      expect(selectedBranch.value).toBeNull()
    })

    it('should cancel pending debounce timer', () => {
      const { filterBranches, clearSearch, debouncedSearchQuery } =
        useBranchManager()

      filterBranches('test')
      clearSearch()
      vi.advanceTimersByTime(200)

      expect(debouncedSearchQuery.value).toBe('')
    })
  })

  describe('formatDate', () => {
    it('should format date as "Just now" for recent dates', () => {
      const { formatDate } = useBranchManager()
      const now = new Date()

      expect(formatDate(now)).toBe('Just now')
    })

    it('should format date as hours ago for same day', () => {
      const { formatDate } = useBranchManager()
      const date = new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago

      expect(formatDate(date)).toBe('3h ago')
    })

    it('should format date as "Yesterday" for previous day', () => {
      const { formatDate } = useBranchManager()
      const date = new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago

      expect(formatDate(date)).toBe('Yesterday')
    })

    it('should format date as days ago for recent dates', () => {
      const { formatDate } = useBranchManager()
      const date = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago

      expect(formatDate(date)).toBe('3d ago')
    })

    it('should format date as locale string for old dates', () => {
      const { formatDate } = useBranchManager()
      const date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
      const expected = date.toLocaleDateString()

      expect(formatDate(date)).toBe(expected)
    })

    it('should handle edge cases for hour boundaries', () => {
      const { formatDate } = useBranchManager()
      const date = new Date(Date.now() - 23 * 60 * 60 * 1000) // 23 hours ago

      expect(formatDate(date)).toBe('23h ago')
    })

    it('should handle edge cases for day boundaries', () => {
      const { formatDate } = useBranchManager()
      const date = new Date(Date.now() - 47 * 60 * 60 * 1000) // 47 hours ago

      expect(formatDate(date)).toBe('Yesterday')
    })

    it('should handle exactly 48 hours ago', () => {
      const { formatDate } = useBranchManager()
      const date = new Date(Date.now() - 48 * 60 * 60 * 1000) // 48 hours ago

      expect(formatDate(date)).toBe('2d ago')
    })

    it('should handle exactly 7 days ago', () => {
      const { formatDate } = useBranchManager()
      const date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago

      expect(formatDate(date)).toEqual(date.toLocaleDateString())
    })
  })

  describe('edge cases', () => {
    it('should handle empty branch list', async () => {
      mockGetGitBranches.mockResolvedValue({
        all: [],
        current: null,
      })

      const { loadBranches, branches, filteredBranches } = useBranchManager()

      await loadBranches('/project/path')

      expect(branches.value).toEqual([])
      expect(filteredBranches.value).toEqual([])
    })

    it('should handle branch with no current branch', async () => {
      mockGetGitBranches.mockResolvedValue({
        all: ['main', 'develop'],
        current: null,
      })

      const { loadBranches, branches } = useBranchManager()

      await loadBranches('/project/path')

      expect(branches.value).toHaveLength(2)
      expect(branches.value[0].lastCommit).toBe('Remote or local branch')
      expect(branches.value[1].lastCommit).toBe('Remote or local branch')
    })

    it('should handle Electron API branch result with null current', async () => {
      mockElectronGetGitBranches.mockResolvedValue({
        current: null,
      })

      mockElectronGetGitStatus.mockResolvedValue({
        isRepository: true,
        totalFiles: 1,
        files: [{ path: 'file.ts' }],
      })

      const { selectBranch } = useBranchManager()
      const branch = {
        name: 'develop',
        lastCommit: 'Test',
        lastUpdate: new Date(),
      }

      await selectBranch(branch, '/project/path')

      expect(mockShowBranchSwitchOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          currentBranch: 'main', // Falls back to 'main'
        })
      )
    })

    it('should generate different random dates for branches', async () => {
      // Mock Math.random to return different values
      const randomValues = [0.1, 0.5, 0.9]
      let randomIndex = 0
      const originalRandom = Math.random
      Math.random = () => randomValues[randomIndex++ % randomValues.length]

      const { loadBranches, branches } = useBranchManager()

      await loadBranches('/project/path')

      const dates = branches.value.map((b) => b.lastUpdate.getTime())
      const uniqueDates = new Set(dates)

      // Dates should be different (or at least some should be)
      expect(uniqueDates.size).toBeGreaterThan(1)

      // Restore original Math.random
      Math.random = originalRandom
    })
  })
})
