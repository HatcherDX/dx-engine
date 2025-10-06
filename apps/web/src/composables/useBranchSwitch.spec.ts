/**
 * @fileoverview Test suite for useBranchSwitch composable.
 *
 * @description
 * Comprehensive tests for the branch switching composable ensuring 100% code coverage.
 * Tests Git operations, stashing, error handling, and security validation.
 *
 * @vitest-environment jsdom
 *
 * @author Hatcher DX Team
 * @since 1.2.0
 * @internal
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useBranchSwitch } from './useBranchSwitch'
import type { BranchSwitchData, StashEntry } from './useBranchSwitch'

// Mock the Electron API
const mockGitStash = vi.fn()
const mockGitCheckoutBranch = vi.fn()
const mockGitStashPop = vi.fn()
const mockGitStashList = vi.fn()
const mockGitStashDrop = vi.fn()
const mockGitStashShow = vi.fn()

// Mock window.electronAPI
global.window = {
  electronAPI: {
    gitStash: mockGitStash,
    gitCheckoutBranch: mockGitCheckoutBranch,
    gitStashPop: mockGitStashPop,
    gitStashList: mockGitStashList,
    gitStashDrop: mockGitStashDrop,
    gitStashShow: mockGitStashShow,
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test environment requires global window mock with Electron API
} as any

describe('useBranchSwitch', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test spy tracks console.log calls with flexible parameters
  let consoleLogSpy: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test spy tracks console.error calls with flexible parameters
  let consoleErrorSpy: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test spy tracks console.warn calls with flexible parameters
  let consoleWarnSpy: any

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Setup default mock implementations
    mockGitStash.mockResolvedValue({ success: true, stashRef: 'stash@{0}' })
    mockGitCheckoutBranch.mockResolvedValue({ success: true })
    mockGitStashPop.mockResolvedValue({ success: true })
    mockGitStashList.mockResolvedValue([])
    mockGitStashDrop.mockResolvedValue({ success: true })
    mockGitStashShow.mockResolvedValue({ diff: 'diff content' })

    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.clearAllMocks()
    consoleLogSpy?.mockRestore()
    consoleErrorSpy?.mockRestore()
    consoleWarnSpy?.mockRestore()
  })

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const {
        isModalVisible,
        currentSwitchData,
        currentBranchStashes,
        isOperationInProgress,
      } = useBranchSwitch()

      expect(isModalVisible.value).toBe(false)
      expect(currentSwitchData.value).toBe(null)
      expect(currentBranchStashes.value).toEqual([])
      expect(isOperationInProgress.value).toBe(false)
    })
  })

  describe('showBranchSwitchOptions', () => {
    it('should show modal with valid project path', () => {
      const { showBranchSwitchOptions, isModalVisible, currentSwitchData } =
        useBranchSwitch()

      const switchData: BranchSwitchData = {
        currentBranch: 'main',
        targetBranch: 'feature',
        changedFiles: ['file1.ts', 'file2.ts'],
        projectPath: '/home/user/my-project',
      }

      showBranchSwitchOptions(switchData)

      expect(isModalVisible.value).toBe(true)
      expect(currentSwitchData.value).toEqual(switchData)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ [Branch Switch Safety] Path validated')
      )
    })

    it('should throw error for IDE directory path', () => {
      const { showBranchSwitchOptions } = useBranchSwitch()

      const switchData: BranchSwitchData = {
        currentBranch: 'main',
        targetBranch: 'feature',
        changedFiles: ['file1.ts'],
        projectPath: '/Users/chrissmejia/Sites/dx-engine',
      }

      expect(() => showBranchSwitchOptions(switchData)).toThrow(
        'CRITICAL SECURITY VIOLATION'
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Branch Switch] Security validation failed:',
        expect.any(Error)
      )
    })

    it('should throw error for relative IDE path', () => {
      const { showBranchSwitchOptions } = useBranchSwitch()

      const switchData: BranchSwitchData = {
        currentBranch: 'main',
        targetBranch: 'feature',
        changedFiles: ['file1.ts'],
        projectPath: 'dx-engine',
      }

      expect(() => showBranchSwitchOptions(switchData)).toThrow(
        'CRITICAL SECURITY VIOLATION'
      )
    })

    it('should throw error for path containing IDE directory', () => {
      const { showBranchSwitchOptions } = useBranchSwitch()

      const switchData: BranchSwitchData = {
        currentBranch: 'main',
        targetBranch: 'feature',
        changedFiles: ['file1.ts'],
        projectPath: '/some/path/Sites/dx-engine/subdir',
      }

      expect(() => showBranchSwitchOptions(switchData)).toThrow(
        'CRITICAL SECURITY VIOLATION'
      )
    })

    it('should throw error for empty project path', () => {
      const { showBranchSwitchOptions } = useBranchSwitch()

      const switchData: BranchSwitchData = {
        currentBranch: 'main',
        targetBranch: 'feature',
        changedFiles: ['file1.ts'],
        projectPath: '',
      }

      expect(() => showBranchSwitchOptions(switchData)).toThrow(
        'CRITICAL: No project path provided'
      )
    })

    it('should load branch stashes when showing modal', async () => {
      const { showBranchSwitchOptions } = useBranchSwitch()

      const stashes: StashEntry[] = [
        {
          ref: 'stash@{0}',
          message: 'Test stash',
          branch: 'main',
          timestamp: new Date(),
          files: ['file1.ts'],
        },
      ]
      mockGitStashList.mockResolvedValue(stashes)

      const switchData: BranchSwitchData = {
        currentBranch: 'main',
        targetBranch: 'feature',
        changedFiles: ['file1.ts'],
        projectPath: '/home/user/project',
      }

      showBranchSwitchOptions(switchData)

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockGitStashList).toHaveBeenCalledWith('/home/user/project')
    })

    it('should handle stash loading errors', async () => {
      const { showBranchSwitchOptions, currentBranchStashes } =
        useBranchSwitch()

      mockGitStashList.mockRejectedValue(new Error('Failed to load'))

      const switchData: BranchSwitchData = {
        currentBranch: 'main',
        targetBranch: 'feature',
        changedFiles: ['file1.ts'],
        projectPath: '/home/user/project',
      }

      showBranchSwitchOptions(switchData)

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to load stashes:',
        expect.any(Error)
      )
      expect(currentBranchStashes.value).toEqual([])
    })
  })

  describe('closeBranchSwitchModal', () => {
    it('should reset all state', () => {
      const {
        showBranchSwitchOptions,
        closeBranchSwitchModal,
        isModalVisible,
        currentSwitchData,
        currentBranchStashes,
        isOperationInProgress,
      } = useBranchSwitch()

      // Setup initial state
      const switchData: BranchSwitchData = {
        currentBranch: 'main',
        targetBranch: 'feature',
        changedFiles: ['file1.ts'],
        projectPath: '/home/user/project',
      }
      showBranchSwitchOptions(switchData)

      // Close modal
      closeBranchSwitchModal()

      expect(isModalVisible.value).toBe(false)
      expect(currentSwitchData.value).toBe(null)
      expect(currentBranchStashes.value).toEqual([])
      expect(isOperationInProgress.value).toBe(false)
    })
  })

  describe('executeBranchSwitch - stash option', () => {
    it('should successfully stash and switch branches', async () => {
      const { showBranchSwitchOptions, executeBranchSwitch } = useBranchSwitch()

      const switchData: BranchSwitchData = {
        currentBranch: 'main',
        targetBranch: 'feature',
        changedFiles: ['file1.ts'],
        projectPath: '/home/user/project',
      }
      showBranchSwitchOptions(switchData)

      const result = await executeBranchSwitch('stash')

      expect(result.success).toBe(true)
      expect(result.currentBranch).toBe('feature')
      expect(result.stashCreated).toBe(true)
      expect(result.stashRef).toBe('stash@{0}')
      expect(result.message).toContain('Switched to feature')

      expect(mockGitStash).toHaveBeenCalledWith(
        '/home/user/project',
        'Branch switch: from main to feature'
      )
      expect(mockGitCheckoutBranch).toHaveBeenCalledWith(
        '/home/user/project',
        'feature'
      )
    })

    it('should handle stash failure', async () => {
      const { showBranchSwitchOptions, executeBranchSwitch } = useBranchSwitch()

      mockGitStash.mockResolvedValue({
        success: false,
        message: 'Stash failed',
      })

      const switchData: BranchSwitchData = {
        currentBranch: 'main',
        targetBranch: 'feature',
        changedFiles: ['file1.ts'],
        projectPath: '/home/user/project',
      }
      showBranchSwitchOptions(switchData)

      const result = await executeBranchSwitch('stash')

      expect(result.success).toBe(false)
      expect(result.currentBranch).toBe('main')
      expect(result.message).toContain('Failed to stash changes')
    })

    it('should restore stash if branch switch fails', async () => {
      const { showBranchSwitchOptions, executeBranchSwitch } = useBranchSwitch()

      mockGitCheckoutBranch.mockResolvedValue({
        success: false,
        message: 'Branch not found',
      })

      const switchData: BranchSwitchData = {
        currentBranch: 'main',
        targetBranch: 'feature',
        changedFiles: ['file1.ts'],
        projectPath: '/home/user/project',
      }
      showBranchSwitchOptions(switchData)

      const result = await executeBranchSwitch('stash')

      expect(result.success).toBe(false)
      expect(result.currentBranch).toBe('main')
      expect(result.message).toContain('Failed to switch branch')
      expect(mockGitStashPop).toHaveBeenCalledWith(
        '/home/user/project',
        'stash@{0}'
      )
    })

    it('should throw error when no switch data', async () => {
      const { executeBranchSwitch } = useBranchSwitch()

      await expect(executeBranchSwitch('stash')).rejects.toThrow(
        'No switch data available'
      )
    })
  })

  describe('executeBranchSwitch - bring option', () => {
    it('should successfully bring changes to new branch', async () => {
      const { showBranchSwitchOptions, executeBranchSwitch } = useBranchSwitch()

      const switchData: BranchSwitchData = {
        currentBranch: 'main',
        targetBranch: 'feature',
        changedFiles: ['file1.ts'],
        projectPath: '/home/user/project',
      }
      showBranchSwitchOptions(switchData)

      const result = await executeBranchSwitch('bring')

      expect(result.success).toBe(true)
      expect(result.currentBranch).toBe('feature')
      expect(result.message).toContain(
        'Switched to feature with changes applied'
      )

      // Should stash, switch, then apply
      expect(mockGitStash).toHaveBeenCalledWith(
        '/home/user/project',
        'Temporary: bringing changes from main to feature'
      )
      expect(mockGitCheckoutBranch).toHaveBeenCalledWith(
        '/home/user/project',
        'feature'
      )
      expect(mockGitStashPop).toHaveBeenCalledWith(
        '/home/user/project',
        'stash@{0}'
      )
    })

    it('should handle conflicts when applying stash', async () => {
      const { showBranchSwitchOptions, executeBranchSwitch } = useBranchSwitch()

      // Stash pop fails (conflicts)
      mockGitStashPop.mockResolvedValue({
        success: false,
        message: 'Merge conflicts',
      })

      const switchData: BranchSwitchData = {
        currentBranch: 'main',
        targetBranch: 'feature',
        changedFiles: ['file1.ts'],
        projectPath: '/home/user/project',
      }
      showBranchSwitchOptions(switchData)

      const result = await executeBranchSwitch('bring')

      expect(result.success).toBe(false)
      expect(result.currentBranch).toBe('feature')
      expect(result.message).toContain('Switched to feature')
      expect(result.message).toContain(
        "couldn't apply changes due to conflicts"
      )
      expect(result.message).toContain('stash@{0}')
    })

    it('should restore stash on original branch if switch fails', async () => {
      const { showBranchSwitchOptions, executeBranchSwitch } = useBranchSwitch()

      mockGitCheckoutBranch.mockResolvedValue({
        success: false,
        message: 'Branch not found',
      })

      const switchData: BranchSwitchData = {
        currentBranch: 'main',
        targetBranch: 'feature',
        changedFiles: ['file1.ts'],
        projectPath: '/home/user/project',
      }
      showBranchSwitchOptions(switchData)

      const result = await executeBranchSwitch('bring')

      expect(result.success).toBe(false)
      expect(result.currentBranch).toBe('main')
      expect(result.message).toContain('Failed to switch branch')

      // Should restore stash on original branch
      expect(mockGitStashPop).toHaveBeenCalledWith(
        '/home/user/project',
        'stash@{0}'
      )
    })

    it('should handle stash failure when bringing changes', async () => {
      const { showBranchSwitchOptions, executeBranchSwitch } = useBranchSwitch()

      mockGitStash.mockResolvedValue({
        success: false,
        message: 'Cannot stash',
      })

      const switchData: BranchSwitchData = {
        currentBranch: 'main',
        targetBranch: 'feature',
        changedFiles: ['file1.ts'],
        projectPath: '/home/user/project',
      }
      showBranchSwitchOptions(switchData)

      const result = await executeBranchSwitch('bring')

      expect(result.success).toBe(false)
      expect(result.currentBranch).toBe('main')
      expect(result.message).toContain('Failed to stash changes')
    })
  })

  describe('executeBranchSwitch - error handling', () => {
    it('should handle errors gracefully', async () => {
      const { showBranchSwitchOptions, executeBranchSwitch } = useBranchSwitch()

      mockGitStash.mockRejectedValue(new Error('Unexpected error'))

      const switchData: BranchSwitchData = {
        currentBranch: 'main',
        targetBranch: 'feature',
        changedFiles: ['file1.ts'],
        projectPath: '/home/user/project',
      }
      showBranchSwitchOptions(switchData)

      const result = await executeBranchSwitch('stash')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Unexpected error')
    })

    it('should handle non-Error exceptions', async () => {
      const { showBranchSwitchOptions, executeBranchSwitch } = useBranchSwitch()

      mockGitStash.mockRejectedValue('String error')

      const switchData: BranchSwitchData = {
        currentBranch: 'main',
        targetBranch: 'feature',
        changedFiles: ['file1.ts'],
        projectPath: '/home/user/project',
      }
      showBranchSwitchOptions(switchData)

      const result = await executeBranchSwitch('stash')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Unknown error occurred')
    })

    it('should close modal on success', async () => {
      const { showBranchSwitchOptions, executeBranchSwitch, isModalVisible } =
        useBranchSwitch()

      const switchData: BranchSwitchData = {
        currentBranch: 'main',
        targetBranch: 'feature',
        changedFiles: ['file1.ts'],
        projectPath: '/home/user/project',
      }
      showBranchSwitchOptions(switchData)
      expect(isModalVisible.value).toBe(true)

      await executeBranchSwitch('stash')

      expect(isModalVisible.value).toBe(false)
    })

    it('should reset operation in progress flag', async () => {
      const {
        showBranchSwitchOptions,
        executeBranchSwitch,
        isOperationInProgress,
      } = useBranchSwitch()

      mockGitStash.mockImplementation(
        () =>
          new Promise((resolve) => {
            // Check flag is set during operation
            expect(isOperationInProgress.value).toBe(true)
            resolve({ success: true, stashRef: 'stash@{0}' })
          })
      )

      const switchData: BranchSwitchData = {
        currentBranch: 'main',
        targetBranch: 'feature',
        changedFiles: ['file1.ts'],
        projectPath: '/home/user/project',
      }
      showBranchSwitchOptions(switchData)

      await executeBranchSwitch('stash')

      expect(isOperationInProgress.value).toBe(false)
    })
  })

  describe('loadBranchStashes', () => {
    it('should handle empty stash list', async () => {
      const { loadBranchStashes, currentBranchStashes } = useBranchSwitch()

      mockGitStashList.mockResolvedValue([])

      await loadBranchStashes('main', '/home/user/project')

      expect(currentBranchStashes.value).toEqual([])
    })

    it('should filter stashes by branch', async () => {
      const { loadBranchStashes, currentBranchStashes } = useBranchSwitch()

      const allStashes: StashEntry[] = [
        {
          ref: 'stash@{0}',
          message: 'Main stash',
          branch: 'main',
          timestamp: new Date(),
          files: ['file1.ts'],
        },
        {
          ref: 'stash@{1}',
          message: 'Feature stash',
          branch: 'feature',
          timestamp: new Date(),
          files: ['file2.ts'],
        },
        {
          ref: 'stash@{2}',
          message: 'Another main stash',
          branch: 'main',
          timestamp: new Date(),
          files: ['file3.ts'],
        },
      ]
      mockGitStashList.mockResolvedValue(allStashes)

      await loadBranchStashes('main', '/home/user/project')

      expect(currentBranchStashes.value).toHaveLength(2)
      expect(currentBranchStashes.value[0].branch).toBe('main')
      expect(currentBranchStashes.value[1].branch).toBe('main')
    })

    it('should validate project path', async () => {
      const { loadBranchStashes, currentBranchStashes } = useBranchSwitch()
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Load stashes for IDE directory path - should fail validation
      await loadBranchStashes('main', '/Users/chrissmejia/Sites/dx-engine')

      // Should log warning and return empty array
      expect(warnSpy).toHaveBeenCalledWith(
        'Failed to load stashes:',
        expect.any(Error)
      )
      expect(currentBranchStashes.value).toEqual([])

      warnSpy.mockRestore()
    })
  })

  describe('restoreStash', () => {
    it('should not reload stashes when no switch data', async () => {
      const { restoreStash } = useBranchSwitch()

      mockGitStashPop.mockResolvedValue({ success: true })

      await restoreStash('stash@{0}', '/home/user/project')

      expect(mockGitStashList).not.toHaveBeenCalled()
    })

    it('should not reload stashes on failure', async () => {
      const { showBranchSwitchOptions, restoreStash } = useBranchSwitch()

      const switchData: BranchSwitchData = {
        currentBranch: 'main',
        targetBranch: 'feature',
        changedFiles: ['file1.ts'],
        projectPath: '/home/user/project',
      }
      showBranchSwitchOptions(switchData)

      mockGitStashPop.mockResolvedValue({ success: false })

      await restoreStash('stash@{0}', '/home/user/project')

      // Only called once during showBranchSwitchOptions
      expect(mockGitStashList).toHaveBeenCalledTimes(1)
    })

    it('should restore stash successfully', async () => {
      const { restoreStash } = useBranchSwitch()

      const result = await restoreStash('stash@{0}', '/home/user/project')

      expect(result).toBe(true)
      expect(mockGitStashPop).toHaveBeenCalledWith(
        '/home/user/project',
        'stash@{0}'
      )
    })

    it('should reload stashes after restore', async () => {
      const { showBranchSwitchOptions, restoreStash } = useBranchSwitch()

      const switchData: BranchSwitchData = {
        currentBranch: 'main',
        targetBranch: 'feature',
        changedFiles: ['file1.ts'],
        projectPath: '/home/user/project',
      }
      showBranchSwitchOptions(switchData)

      await restoreStash('stash@{0}', '/home/user/project')

      // Should reload stashes
      expect(mockGitStashList).toHaveBeenCalled()
    })

    it('should handle restore failure', async () => {
      const { restoreStash } = useBranchSwitch()

      mockGitStashPop.mockResolvedValue({ success: false })

      const result = await restoreStash('stash@{0}', '/home/user/project')

      expect(result).toBe(false)
    })

    it('should handle restore errors', async () => {
      const { restoreStash } = useBranchSwitch()

      mockGitStashPop.mockRejectedValue(new Error('Pop failed'))

      const result = await restoreStash('stash@{0}', '/home/user/project')

      expect(result).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to restore stash:',
        expect.any(Error)
      )
    })
  })

  describe('discardStash', () => {
    it('should not reload stashes when no switch data', async () => {
      const { discardStash } = useBranchSwitch()

      await discardStash('stash@{1}', '/home/user/project')

      expect(mockGitStashList).not.toHaveBeenCalled()
    })

    it('should discard stash successfully', async () => {
      const { discardStash } = useBranchSwitch()

      const result = await discardStash('stash@{1}', '/home/user/project')

      expect(result).toBe(true)
      expect(mockGitStashDrop).toHaveBeenCalledWith(
        '/home/user/project',
        'stash@{1}'
      )
    })

    it('should reload stashes after discard', async () => {
      const { showBranchSwitchOptions, discardStash } = useBranchSwitch()

      const switchData: BranchSwitchData = {
        currentBranch: 'main',
        targetBranch: 'feature',
        changedFiles: ['file1.ts'],
        projectPath: '/home/user/project',
      }
      showBranchSwitchOptions(switchData)

      await discardStash('stash@{1}', '/home/user/project')

      // Should reload stashes
      expect(mockGitStashList).toHaveBeenCalled()
    })

    it('should handle discard failure', async () => {
      const { discardStash } = useBranchSwitch()

      mockGitStashDrop.mockResolvedValue({ success: false })

      const result = await discardStash('stash@{1}', '/home/user/project')

      expect(result).toBe(false)
    })

    it('should not reload stashes on failure', async () => {
      const { showBranchSwitchOptions, discardStash } = useBranchSwitch()

      const switchData: BranchSwitchData = {
        currentBranch: 'main',
        targetBranch: 'feature',
        changedFiles: ['file1.ts'],
        projectPath: '/home/user/project',
      }
      showBranchSwitchOptions(switchData)

      mockGitStashDrop.mockResolvedValue({ success: false })

      await discardStash('stash@{1}', '/home/user/project')

      // Only called once during showBranchSwitchOptions
      expect(mockGitStashList).toHaveBeenCalledTimes(1)
    })

    it('should handle discard errors', async () => {
      const { discardStash } = useBranchSwitch()

      mockGitStashDrop.mockRejectedValue(new Error('Drop failed'))

      const result = await discardStash('stash@{1}', '/home/user/project')

      expect(result).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to discard stash:',
        expect.any(Error)
      )
    })
  })

  describe('getStashPreview', () => {
    it('should get stash preview successfully', async () => {
      const { getStashPreview } = useBranchSwitch()

      const preview = await getStashPreview('stash@{0}', '/home/user/project')

      expect(preview).toBe('diff content')
      expect(mockGitStashShow).toHaveBeenCalledWith(
        '/home/user/project',
        'stash@{0}'
      )
    })

    it('should handle missing diff content', async () => {
      const { getStashPreview } = useBranchSwitch()

      mockGitStashShow.mockResolvedValue({})

      const preview = await getStashPreview('stash@{0}', '/home/user/project')

      expect(preview).toBe('')
    })

    it('should handle preview errors', async () => {
      const { getStashPreview } = useBranchSwitch()

      mockGitStashShow.mockRejectedValue(new Error('Show failed'))

      const preview = await getStashPreview('stash@{0}', '/home/user/project')

      expect(preview).toBe('')
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to get stash preview:',
        expect.any(Error)
      )
    })
  })

  describe('security validation', () => {
    it('should validate all IDE path variations', () => {
      const { showBranchSwitchOptions } = useBranchSwitch()

      const invalidPaths = [
        '/Users/chrissmejia/Sites/dx-engine',
        'dx-engine',
        'Sites/dx-engine',
        'C:\\Users\\chris\\Sites\\dx-engine', // Windows path
        '/home/user/Sites/dx-engine/',
        'my-projects/Sites/dx-engine/subdir',
      ]

      invalidPaths.forEach((path) => {
        const switchData: BranchSwitchData = {
          currentBranch: 'main',
          targetBranch: 'feature',
          changedFiles: ['file1.ts'],
          projectPath: path,
        }

        expect(() => showBranchSwitchOptions(switchData)).toThrow(
          'CRITICAL SECURITY VIOLATION'
        )
      })
    })

    it('should validate IDE path in stashAndSwitch', async () => {
      const { showBranchSwitchOptions, executeBranchSwitch } = useBranchSwitch()

      const switchData: BranchSwitchData = {
        currentBranch: 'main',
        targetBranch: 'feature',
        changedFiles: ['file1.ts'],
        projectPath: '/home/user/project',
      }
      showBranchSwitchOptions(switchData)

      // Modify the data to have IDE path
      switchData.projectPath = '/Users/chrissmejia/Sites/dx-engine'

      const result = await executeBranchSwitch('stash')

      expect(result.success).toBe(false)
      expect(result.message).toContain('CRITICAL SECURITY VIOLATION')
    })

    it('should validate IDE path in bringChangesAndSwitch', async () => {
      const { showBranchSwitchOptions, executeBranchSwitch } = useBranchSwitch()

      const switchData: BranchSwitchData = {
        currentBranch: 'main',
        targetBranch: 'feature',
        changedFiles: ['file1.ts'],
        projectPath: '/home/user/project',
      }
      showBranchSwitchOptions(switchData)

      // Modify the data to have IDE path
      switchData.projectPath = 'Sites/dx-engine'

      const result = await executeBranchSwitch('bring')

      expect(result.success).toBe(false)
      expect(result.message).toContain('CRITICAL SECURITY VIOLATION')
    })

    it('should allow valid project paths', () => {
      const { showBranchSwitchOptions, isModalVisible } = useBranchSwitch()

      const validPaths = [
        '/home/user/my-project',
        '/Users/john/projects/app',
        'C:\\Projects\\MyApp',
        '/var/www/html/site',
        'dx-engine-clone', // Similar but not exact
        '/home/Sites/other-project',
      ]

      validPaths.forEach((path) => {
        const switchData: BranchSwitchData = {
          currentBranch: 'main',
          targetBranch: 'feature',
          changedFiles: ['file1.ts'],
          projectPath: path,
        }

        showBranchSwitchOptions(switchData)
        expect(isModalVisible.value).toBe(true)
      })
    })

    it('should handle case-insensitive path matching', () => {
      const { showBranchSwitchOptions } = useBranchSwitch()

      const switchData: BranchSwitchData = {
        currentBranch: 'main',
        targetBranch: 'feature',
        changedFiles: ['file1.ts'],
        projectPath: '/Users/ChrisSmejia/Sites/DX-ENGINE',
      }

      expect(() => showBranchSwitchOptions(switchData)).toThrow(
        'CRITICAL SECURITY VIOLATION'
      )
    })
  })

  describe('return type', () => {
    it('should return all expected properties and functions', () => {
      const branchSwitch = useBranchSwitch()

      // Check all properties exist
      expect(branchSwitch.isModalVisible).toBeDefined()
      expect(branchSwitch.currentSwitchData).toBeDefined()
      expect(branchSwitch.currentBranchStashes).toBeDefined()
      expect(branchSwitch.isOperationInProgress).toBeDefined()

      // Check all functions exist
      expect(branchSwitch.showBranchSwitchOptions).toBeInstanceOf(Function)
      expect(branchSwitch.closeBranchSwitchModal).toBeInstanceOf(Function)
      expect(branchSwitch.executeBranchSwitch).toBeInstanceOf(Function)
      expect(branchSwitch.restoreStash).toBeInstanceOf(Function)
      expect(branchSwitch.discardStash).toBeInstanceOf(Function)
      expect(branchSwitch.getStashPreview).toBeInstanceOf(Function)
      expect(branchSwitch.loadBranchStashes).toBeInstanceOf(Function)
    })
  })

  describe('edge cases', () => {
    it('should handle special characters in branch names', async () => {
      const { showBranchSwitchOptions, executeBranchSwitch } = useBranchSwitch()

      const switchData: BranchSwitchData = {
        currentBranch: 'feature/test-123',
        targetBranch: 'bugfix/issue#456',
        changedFiles: ['file.ts'],
        projectPath: '/home/user/project',
      }

      showBranchSwitchOptions(switchData)
      const result = await executeBranchSwitch('stash')

      expect(result.success).toBe(true)
      expect(mockGitStash).toHaveBeenCalledWith(
        '/home/user/project',
        expect.stringContaining('feature/test-123')
      )
    })

    it('should handle paths with spaces', () => {
      const { showBranchSwitchOptions, isModalVisible } = useBranchSwitch()

      const switchData: BranchSwitchData = {
        currentBranch: 'main',
        targetBranch: 'feature',
        changedFiles: ['file with spaces.ts'],
        projectPath: '/Users/user/My Projects/app',
      }

      showBranchSwitchOptions(switchData)
      expect(isModalVisible.value).toBe(true)
    })

    it('should handle empty changed files list', () => {
      const { showBranchSwitchOptions, currentSwitchData } = useBranchSwitch()

      const switchData: BranchSwitchData = {
        currentBranch: 'main',
        targetBranch: 'feature',
        changedFiles: [],
        projectPath: '/home/user/project',
      }

      showBranchSwitchOptions(switchData)
      expect(currentSwitchData.value?.changedFiles).toEqual([])
    })

    it('should not close modal on failure', async () => {
      const { showBranchSwitchOptions, executeBranchSwitch, isModalVisible } =
        useBranchSwitch()

      mockGitStash.mockResolvedValue({ success: false, message: 'Failed' })

      const switchData: BranchSwitchData = {
        currentBranch: 'main',
        targetBranch: 'feature',
        changedFiles: ['file.ts'],
        projectPath: '/home/user/project',
      }

      showBranchSwitchOptions(switchData)
      await executeBranchSwitch('stash')

      expect(isModalVisible.value).toBe(true)
    })

    it('should reset operation progress even on failure', async () => {
      const {
        showBranchSwitchOptions,
        executeBranchSwitch,
        isOperationInProgress,
      } = useBranchSwitch()

      mockGitStash.mockRejectedValue(new Error('Failed'))

      const switchData: BranchSwitchData = {
        currentBranch: 'main',
        targetBranch: 'feature',
        changedFiles: ['file.ts'],
        projectPath: '/home/user/project',
      }

      showBranchSwitchOptions(switchData)
      await executeBranchSwitch('bring')

      expect(isOperationInProgress.value).toBe(false)
    })
  })
})
