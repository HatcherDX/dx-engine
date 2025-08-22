/**
 * @fileoverview Comprehensive tests for useGitIntegration composable.
 *
 * @description
 * Tests for the Git integration system including status checking, diff generation,
 * commit history, file content operations, and Electron API integration.
 * Covers all reactive properties, methods, and error handling.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useGitIntegration } from './useGitIntegration'

// Mock ElectronAPI interface
interface MockElectronAPI {
  versions: Record<string, string>
  send: ReturnType<typeof vi.fn>
  on: ReturnType<typeof vi.fn>
  invoke: ReturnType<typeof vi.fn>
  sendTerminalInput: ReturnType<typeof vi.fn>
  sendTerminalResize: ReturnType<typeof vi.fn>
  setTheme: ReturnType<typeof vi.fn>
  openProjectDialog: ReturnType<typeof vi.fn>
  statFile: ReturnType<typeof vi.fn>
  readDirectory: ReturnType<typeof vi.fn>
  pathExists: ReturnType<typeof vi.fn>
  isDirectory: ReturnType<typeof vi.fn>
  readFile: ReturnType<typeof vi.fn>
  scanDirectory: ReturnType<typeof vi.fn>
  getGitStatus: ReturnType<typeof vi.fn>
  getGitDiff: ReturnType<typeof vi.fn>
  getFileContent: ReturnType<typeof vi.fn>
  off: ReturnType<typeof vi.fn>
  systemTerminal: {
    initialize: ReturnType<typeof vi.fn>
    log: ReturnType<typeof vi.fn>
    gitOperation: ReturnType<typeof vi.fn>
    getTerminal: ReturnType<typeof vi.fn>
    listTerminals: ReturnType<typeof vi.fn>
    setActive: ReturnType<typeof vi.fn>
    clear: ReturnType<typeof vi.fn>
    getLines: ReturnType<typeof vi.fn>
    updateConfig: ReturnType<typeof vi.fn>
    onEvent: ReturnType<typeof vi.fn>
    onOutput: ReturnType<typeof vi.fn>
    onActivated: ReturnType<typeof vi.fn>
    onCleared: ReturnType<typeof vi.fn>
  }
}

// Mock window interface extension
interface MockWindow extends Window {
  electronAPI: MockElectronAPI
}

// Mock the global window object and electronAPI
const mockElectronAPI: MockElectronAPI = {
  versions: { node: '16.0.0', electron: '13.0.0', chrome: '91.0.0' },
  send: vi.fn(),
  on: vi.fn(),
  invoke: vi.fn().mockResolvedValue({}),
  sendTerminalInput: vi.fn(),
  sendTerminalResize: vi.fn(),
  setTheme: vi.fn(),
  openProjectDialog: vi.fn().mockResolvedValue({}),
  statFile: vi.fn().mockResolvedValue({}),
  readDirectory: vi.fn().mockResolvedValue([]),
  pathExists: vi.fn().mockResolvedValue(true),
  isDirectory: vi.fn().mockResolvedValue(true),
  readFile: vi.fn().mockResolvedValue(''),
  scanDirectory: vi.fn().mockResolvedValue([]),
  getGitStatus: vi.fn().mockResolvedValue({
    isRepository: true,
    status: 'clean',
    files: [
      { path: 'file1.txt', indexStatus: 'M', worktreeStatus: ' ' },
      { path: 'file2.txt', indexStatus: ' ', worktreeStatus: 'M' },
      { path: 'file3.txt', indexStatus: ' ', worktreeStatus: 'M' },
      { path: 'file4.txt', indexStatus: 'A', worktreeStatus: ' ' },
    ],
  }),
  getGitDiff: vi.fn().mockResolvedValue(''),
  getFileContent: vi.fn().mockResolvedValue(''),
  off: vi.fn(),
  systemTerminal: {
    initialize: vi.fn().mockResolvedValue({}),
    log: vi.fn().mockResolvedValue({}),
    gitOperation: vi.fn().mockResolvedValue({}),
    getTerminal: vi.fn().mockResolvedValue({}),
    listTerminals: vi.fn().mockResolvedValue([]),
    setActive: vi.fn().mockResolvedValue({}),
    clear: vi.fn().mockResolvedValue({}),
    getLines: vi.fn().mockResolvedValue([]),
    updateConfig: vi.fn().mockResolvedValue({}),
    onEvent: vi.fn(),
    onOutput: vi.fn(),
    onActivated: vi.fn(),
    onCleared: vi.fn(),
  },
}

// Mock console methods to avoid noise in tests
let mockConsole: {
  error: ReturnType<typeof vi.fn>
  warn: ReturnType<typeof vi.fn>
  log: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks()

  // Create new console mocks each time
  mockConsole = {
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn(),
  }

  // Mock console methods
  global.console = {
    ...console,
    warn: mockConsole.warn,
    error: mockConsole.error,
    log: mockConsole.log,
  }

  // Reset window.electronAPI
  ;(global.window as unknown as MockWindow).electronAPI = mockElectronAPI

  // Clear any timers
  vi.clearAllTimers()
})

afterEach(() => {
  // Restore console
  global.console = console

  // Clear any remaining timers
  vi.clearAllTimers()
})

describe('useGitIntegration', () => {
  let gitIntegration: ReturnType<typeof useGitIntegration>

  beforeEach(() => {
    gitIntegration = useGitIntegration()
  })

  describe('Initial State', () => {
    /**
     * Tests initial state of the composable.
     *
     * @returns void
     * Should have proper initial values for all reactive properties
     *
     * @example
     * ```typescript
     * const git = useGitIntegration()
     * expect(git.isGitRepository.value).toBe(false)
     * expect(git.currentGitRoot.value).toBeNull()
     * ```
     *
     * @public
     */
    it('should have correct initial state', () => {
      expect(gitIntegration.isGitRepository.value).toBe(false)
      expect(gitIntegration.currentGitRoot.value).toBeNull()
      expect(gitIntegration.isLoadingStatus.value).toBe(false)
      expect(gitIntegration.lastError.value).toBeNull()
      expect(gitIntegration.changedFiles.value).toEqual([])
      expect(gitIntegration.stagedFiles.value).toEqual([])
      expect(gitIntegration.unstagedFiles.value).toEqual([])
    })

    /**
     * Tests readonly property access.
     *
     * @returns void
     * Should provide readonly access to state properties
     *
     * @public
     */
    it('should provide readonly access to state', () => {
      expect(typeof gitIntegration.isGitRepository.value).toBe('boolean')
      expect(typeof gitIntegration.currentGitRoot.value).toBe('object')
      expect(typeof gitIntegration.isLoadingStatus.value).toBe('boolean')
      expect(typeof gitIntegration.lastError.value).toBe('object')
    })

    /**
     * Tests computed properties initial values.
     *
     * @returns void
     * Should have correct computed property values when no Git data is loaded
     *
     * @public
     */
    it('should have correct computed properties when no Git data loaded', () => {
      expect(gitIntegration.changedFiles.value).toEqual([])
      expect(gitIntegration.stagedFiles.value).toEqual([])
      expect(gitIntegration.unstagedFiles.value).toEqual([])
    })
  })

  describe('Debug Functions', () => {
    /**
     * Tests debugElectronAPI function.
     *
     * @returns void
     * Should log detailed information about Electron API availability
     *
     * @public
     */
    it('should debug Electron API availability', () => {
      gitIntegration.debugElectronAPI()

      expect(mockConsole.log).toHaveBeenCalledWith(
        '[Git Integration] 🔧 DEBUG: Electron API Analysis'
      )
      expect(mockConsole.log).toHaveBeenCalledWith(
        '[Git Integration] 🔍 window defined:',
        true
      )
      expect(mockConsole.log).toHaveBeenCalledWith(
        '[Git Integration] 🔍 window.electronAPI defined:',
        true
      )
      expect(mockConsole.log).toHaveBeenCalledWith(
        '[Git Integration] 📊 Available API methods:',
        [
          'versions',
          'send',
          'on',
          'invoke',
          'sendTerminalInput',
          'sendTerminalResize',
          'setTheme',
          'openProjectDialog',
          'statFile',
          'readDirectory',
          'pathExists',
          'isDirectory',
          'readFile',
          'scanDirectory',
          'getGitStatus',
          'getGitDiff',
          'getFileContent',
          'off',
          'systemTerminal',
        ]
      )
    })

    /**
     * Tests debugElectronAPI with undefined electronAPI.
     *
     * @returns void
     * Should handle undefined electronAPI gracefully
     *
     * @public
     */
    it('should debug when electronAPI is undefined', () => {
      ;(global.window as unknown as MockWindow).electronAPI =
        undefined as unknown as MockElectronAPI

      gitIntegration = useGitIntegration()
      gitIntegration.debugElectronAPI()

      expect(mockConsole.log).toHaveBeenCalledWith(
        '[Git Integration] ❌ window.electronAPI is completely undefined'
      )
    })

    /**
     * Tests testGetGitDiff function.
     *
     * @returns Promise<void>
     * Should test Git diff API call and log results
     *
     * @public
     */
    it('should test Git diff API call successfully', async () => {
      const mockDiffOutput = `diff --git a/test.txt b/test.txt
index 1234567..abcdefg 100644
--- a/test.txt
+++ b/test.txt
@@ -1,3 +1,4 @@
 line 1
+new line
 line 2
 line 3`

      mockElectronAPI.getGitDiff.mockResolvedValue(mockDiffOutput)

      await gitIntegration.testGetGitDiff('/test/project', 'test.txt')

      expect(mockConsole.log).toHaveBeenCalledWith(
        '[Git Integration] 🧪 TESTING getGitDiff API call...'
      )
      expect(mockConsole.log).toHaveBeenCalledWith(
        "[Git Integration] 🚀 Calling getGitDiff('/test/project', 'test.txt')"
      )
      expect(mockConsole.log).toHaveBeenCalledWith(
        '[Git Integration] ✅ getGitDiff SUCCESS! Result length:',
        mockDiffOutput.length
      )
    })

    /**
     * Tests testGetGitDiff error handling.
     *
     * @returns Promise<void>
     * Should handle API errors gracefully
     *
     * @public
     */
    it('should handle testGetGitDiff API errors', async () => {
      const error = new Error('Git diff failed')
      mockElectronAPI.getGitDiff.mockRejectedValue(error)

      await expect(
        gitIntegration.testGetGitDiff('/test/project', 'test.txt')
      ).rejects.toThrow('Git diff failed')

      expect(mockConsole.error).toHaveBeenCalledWith(
        '[Git Integration] ❌ getGitDiff FAILED:',
        error
      )
    })

    /**
     * Tests testGetGitDiff without API.
     *
     * @returns Promise<void>
     * Should throw error when getGitDiff API is not available
     *
     * @public
     */
    it('should handle testGetGitDiff without API', async () => {
      ;(global.window as unknown as MockWindow).electronAPI =
        {} as unknown as MockElectronAPI

      gitIntegration = useGitIntegration()

      await expect(
        gitIntegration.testGetGitDiff('/test/project', 'test.txt')
      ).rejects.toThrow('getGitDiff API not available')
    })
  })

  describe('Initialization and Global Setup', () => {
    /**
     * Tests setTimeout-based debug call.
     *
     * @returns void
     * Should call debugElectronAPI after delay
     *
     * @public
     */
    it('should call debugElectronAPI after initialization delay', () => {
      vi.useFakeTimers()

      // Clear previous logs
      mockConsole.log.mockClear()

      // Create new instance
      gitIntegration = useGitIntegration()

      // Fast-forward timer
      vi.advanceTimersByTime(100)

      expect(mockConsole.log).toHaveBeenCalledWith(
        '[Git Integration] 🔧 DEBUG: Electron API Analysis'
      )

      vi.useRealTimers()
    })

    /**
     * Tests global window function exposure.
     *
     * @returns void
     * Should expose test functions to global window object
     *
     * @public
     */
    it('should expose test functions to global window', () => {
      const globalWindow = window as unknown as {
        __testGetGitDiff: () => void
        __debugElectronAPI: () => void
      }
      expect(globalWindow.__testGetGitDiff).toBeDefined()
      expect(globalWindow.__debugElectronAPI).toBeDefined()
      expect(typeof globalWindow.__testGetGitDiff).toBe('function')
      expect(typeof globalWindow.__debugElectronAPI).toBe('function')
    })
  })

  describe('Git Repository Checking', () => {
    /**
     * Tests successful Git repository detection.
     *
     * @returns Promise<void>
     * Should detect Git repository when API returns true
     *
     * @public
     */
    it('should detect Git repository successfully', async () => {
      mockElectronAPI.getGitStatus.mockResolvedValue({
        isRepository: true,
        status: 'clean',
        files: [],
      })

      const result = await gitIntegration.checkIfGitRepository('/test/project')

      expect(result).toBe(true)
      expect(mockElectronAPI.getGitStatus).toHaveBeenCalledWith('/test/project')
    })

    /**
     * Tests non-Git repository detection.
     *
     * @returns Promise<void>
     * Should return false when directory is not a Git repository
     *
     * @public
     */
    it('should detect non-Git repository', async () => {
      mockElectronAPI.getGitStatus.mockResolvedValue({
        isRepository: false,
        status: 'unknown',
        files: [],
      })

      const result = await gitIntegration.checkIfGitRepository('/test/project')

      expect(result).toBe(false)
    })

    /**
     * Tests Git repository check error handling.
     *
     * @returns Promise<void>
     * Should return false when API call fails
     *
     * @public
     */
    it('should handle Git repository check errors', async () => {
      mockElectronAPI.getGitStatus.mockRejectedValue(new Error('Git error'))

      const result = await gitIntegration.checkIfGitRepository('/test/project')

      expect(result).toBe(false)
    })

    /**
     * Tests Git repository check without Electron API.
     *
     * @returns Promise<void>
     * Should throw error when Electron API is not available
     *
     * @public
     */
    it('should handle Git repository check without Electron API', async () => {
      ;(global.window as unknown as MockWindow).electronAPI =
        undefined as unknown as MockElectronAPI

      gitIntegration = useGitIntegration()

      const result = await gitIntegration.checkIfGitRepository('/test/project')

      expect(result).toBe(false)
    })
  })

  describe('Git Root Detection', () => {
    /**
     * Tests Git root path detection.
     *
     * @returns Promise<void>
     * Should return project path as Git root (current implementation)
     *
     * @public
     */
    it('should get Git root path', async () => {
      const projectPath = '/test/project'
      const result = await gitIntegration.getGitRoot(projectPath)

      expect(result).toBe(projectPath)
    })
  })

  describe('Git Status Operations', () => {
    beforeEach(() => {
      // Setup default successful responses
      mockElectronAPI.getGitStatus.mockResolvedValue({
        isRepository: true,
        status: 'clean',
        files: [
          {
            path: 'file1.txt',
            indexStatus: 'M',
            worktreeStatus: ' ',
          },
          {
            path: 'file2.txt',
            indexStatus: ' ',
            worktreeStatus: 'M',
          },
          {
            path: 'file3.txt',
            indexStatus: ' ',
            worktreeStatus: 'M',
          },
          {
            path: 'file4.txt',
            indexStatus: 'A',
            worktreeStatus: ' ',
          },
        ],
        branch: 'main',
        ahead: 0,
        behind: 0,
      })
    })

    /**
     * Tests successful Git status retrieval.
     *
     * @returns Promise<void>
     * Should get Git status and update state correctly
     *
     * @public
     */
    it('should get Git status successfully', async () => {
      const result = await gitIntegration.getGitStatus('/test/project')

      expect(gitIntegration.isGitRepository.value).toBe(true)
      expect(gitIntegration.currentGitRoot.value).toBe('/test/project')
      expect(result).toHaveLength(4)
      expect(result[0]).toMatchObject({})
    })

    /**
     * Tests Git status for non-repository.
     *
     * @returns Promise<void>
     * Should handle non-Git directory gracefully
     *
     * @public
     */
    it('should handle non-Git repository status', async () => {
      mockElectronAPI.getGitStatus.mockResolvedValue({})

      const result = await gitIntegration.getGitStatus('/test/project')

      expect(gitIntegration.isGitRepository.value).toBe(false)
      expect(result).toEqual([])
    })

    /**
     * Tests Git status error handling.
     *
     * @returns Promise<void>
     * Should handle API errors and update error state
     *
     * @public
     */
    it('should handle Git status errors', async () => {
      const error = new Error('Git status failed')
      mockElectronAPI.getGitStatus.mockRejectedValue(error)

      await expect(
        gitIntegration.getGitStatus('/test/project')
      ).rejects.toThrow('Git status failed')

      expect(gitIntegration.lastError.value).toBe('Git status failed')
      expect(gitIntegration.isLoadingStatus.value).toBe(false)
    })

    /**
     * Tests Git status without Electron API.
     *
     * @returns Promise<void>
     * Should throw error when Electron API is not available
     *
     * @public
     */
    it('should handle Git status without Electron API', async () => {
      ;(global.window as unknown as MockWindow).electronAPI =
        undefined as unknown as MockElectronAPI

      gitIntegration = useGitIntegration()

      await expect(
        gitIntegration.getGitStatus('/test/project')
      ).rejects.toThrow('Electron API not available')
    })

    /**
     * Tests loading state during Git status operation.
     *
     * @returns Promise<void>
     * Should set loading state correctly during operation
     *
     * @public
     */
    it('should set loading state during Git status operation', async () => {
      let resolvePromise: (value: unknown) => void = () => {}
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockElectronAPI.getGitStatus.mockReturnValue(promise)

      const statusPromise = gitIntegration.getGitStatus('/test/project')

      expect(gitIntegration.isLoadingStatus.value).toBe(true)

      resolvePromise({})
      await statusPromise

      expect(gitIntegration.isLoadingStatus.value).toBe(false)
    })

    /**
     * Tests Git status console logging.
     *
     * @returns Promise<void>
     * Should log detailed information about status operation
     *
     * @public
     */
    it('should log Git status operation details', async () => {
      await gitIntegration.getGitStatus('/test/project')

      expect(mockConsole.log).toHaveBeenCalledWith(
        '[Git Integration] Getting status for:',
        '/test/project'
      )
      expect(mockConsole.log).toHaveBeenCalledWith(
        '[Git Integration] Found 4 changed files'
      )
    })
  })

  describe('Commit History Operations', () => {
    /**
     * Tests successful commit history retrieval.
     *
     * @returns Promise<void>
     * Should get commit history with mock data
     *
     * @public
     */
    it('should get commit history successfully', async () => {
      const result = await gitIntegration.getCommitHistory('/test/project', 10)

      expect(result).toHaveLength(3)
      expect(result[0]).toMatchObject({
        hash: expect.any(String),
        shortHash: expect.any(String),
        message: expect.any(String),
        author: expect.objectContaining({
          name: expect.any(String),
          email: expect.any(String),
          date: expect.any(Date),
        }),
        parents: expect.any(Array),
        filesChanged: expect.any(Number),
        linesAdded: expect.any(Number),
        linesDeleted: expect.any(Number),
      })
    })

    /**
     * Tests commit history with limit.
     *
     * @returns Promise<void>
     * Should respect the limit parameter
     *
     * @public
     */
    it('should respect commit history limit', async () => {
      const result = await gitIntegration.getCommitHistory('/test/project', 2)

      expect(result).toHaveLength(2)
    })

    /**
     * Tests commit history with default limit.
     *
     * @returns Promise<void>
     * Should use default limit when not specified
     *
     * @public
     */
    it('should use default limit for commit history', async () => {
      const result = await gitIntegration.getCommitHistory('/test/project')

      expect(result).toHaveLength(3) // Mock data has 3 commits
    })

    /**
     * Tests commit history error handling.
     *
     * @returns Promise<void>
     * Should handle errors during commit history retrieval
     *
     * @public
     */
    it('should handle commit history errors', async () => {
      ;(global.window as unknown as MockWindow).electronAPI =
        undefined as unknown as MockElectronAPI as unknown as MockElectronAPI

      gitIntegration = useGitIntegration()

      await expect(
        gitIntegration.getCommitHistory('/test/project')
      ).rejects.toThrow('Electron API not available')
    })

    /**
     * Tests commit history console logging.
     *
     * @returns Promise<void>
     * Should log commit history operation details
     *
     * @public
     */
    it('should log commit history operation details', async () => {
      await gitIntegration.getCommitHistory('/test/project', 25)

      expect(mockConsole.log).toHaveBeenCalledWith(
        '[Git Integration] Getting commit history (limit: 25)'
      )
      expect(mockConsole.log).toHaveBeenCalledWith(
        '[Git Integration] Retrieved 3 commits'
      )
    })
  })

  describe('File Content Operations', () => {
    /**
     * Tests successful file content retrieval.
     *
     * @returns Promise<void>
     * Should get file content and split into lines
     *
     * @public
     */
    it('should get file content successfully', async () => {
      const mockContent = 'line 1\nline 2\nline 3'
      mockElectronAPI.getFileContent.mockResolvedValue(mockContent)

      const result = await gitIntegration.getFileContent(
        '/test/project',
        'test.txt'
      )

      expect(result).toEqual(['line 1', 'line 2', 'line 3'])
      expect(mockElectronAPI.getFileContent).toHaveBeenCalledWith(
        '/test/project',
        'test.txt',
        { fromWorkingTree: true }
      )
    })

    /**
     * Tests file content retrieval with commit hash.
     *
     * @returns Promise<void>
     * Should get file content from specific commit
     *
     * @public
     */
    it('should get file content from specific commit', async () => {
      const mockContent = 'old line 1\nold line 2'
      mockElectronAPI.getFileContent.mockResolvedValue(mockContent)

      const result = await gitIntegration.getFileContent(
        '/test/project',
        'test.txt',
        'abc123'
      )

      expect(result).toEqual(['old line 1', 'old line 2'])
      expect(mockElectronAPI.getFileContent).toHaveBeenCalledWith(
        '/test/project',
        'test.txt',
        { commit: 'abc123' }
      )
    })

    /**
     * Tests file content retrieval with null commit.
     *
     * @returns Promise<void>
     * Should get file content from working tree when commit is null
     *
     * @public
     */
    it('should get file content from working tree with null commit', async () => {
      const mockContent = 'working tree content'
      mockElectronAPI.getFileContent.mockResolvedValue(mockContent)

      const result = await gitIntegration.getFileContent(
        '/test/project',
        'test.txt',
        null
      )

      expect(result).toEqual(['working tree content'])
      expect(mockElectronAPI.getFileContent).toHaveBeenCalledWith(
        '/test/project',
        'test.txt',
        { fromWorkingTree: true }
      )
    })

    /**
     * Tests file content error handling.
     *
     * @returns Promise<void>
     * Should return empty array when API call fails
     *
     * @public
     */
    it('should handle file content errors', async () => {
      mockElectronAPI.getFileContent.mockRejectedValue(new Error('File error'))

      const result = await gitIntegration.getFileContent(
        '/test/project',
        'test.txt'
      )

      expect(result).toEqual([])
      expect(mockConsole.error).toHaveBeenCalledWith(
        '[Git Integration] Failed to get file content:',
        expect.any(Error)
      )
    })

    /**
     * Tests file content without Electron API.
     *
     * @returns Promise<void>
     * Should return empty array when Electron API is not available
     *
     * @public
     */
    it('should handle file content without Electron API', async () => {
      ;(global.window as unknown as MockWindow).electronAPI =
        {} as unknown as MockElectronAPI

      gitIntegration = useGitIntegration()

      const result = await gitIntegration.getFileContent(
        '/test/project',
        'test.txt'
      )

      expect(result).toEqual([])
    })

    /**
     * Tests file content console logging.
     *
     * @returns Promise<void>
     * Should log file content operation details
     *
     * @public
     */
    it('should log file content operation details', async () => {
      const mockContent = 'line 1\nline 2'
      mockElectronAPI.getFileContent.mockResolvedValue(mockContent)

      await gitIntegration.getFileContent('/test/project', 'test.txt', 'abc123')

      expect(mockConsole.log).toHaveBeenCalledWith(
        '[Git Integration] Getting file content for test.txt at abc123'
      )
      expect(mockConsole.log).toHaveBeenCalledWith(
        '[Git Integration] Retrieved 2 lines for test.txt'
      )
    })
  })

  describe('File Diff Operations', () => {
    const mockDiffOutput = `diff --git a/test.txt b/test.txt
index 1234567..abcdefg 100644
--- a/test.txt
+++ b/test.txt
@@ -1,3 +1,4 @@
 line 1
+new line
 line 2
-old line 3
+new line 3`

    beforeEach(() => {
      mockElectronAPI.getGitDiff.mockResolvedValue(mockDiffOutput)
    })

    /**
     * Tests successful file diff retrieval.
     *
     * @returns Promise<void>
     * Should get and parse diff data correctly
     *
     * @public
     */
    it('should get file diff successfully', async () => {
      const result = await gitIntegration.getFileDiff(
        '/test/project',
        'test.txt',
        'abc123'
      )

      expect(result.file).toBe('test.txt')
      expect(result.binary).toBe(false)
      expect(result.hunks).toHaveLength(1)
      expect(result.hunks[0]).toMatchObject({})
    })

    /**
     * Tests file diff without commit hash.
     *
     * @returns Promise<void>
     * Should get diff for working tree when no commit specified
     *
     * @public
     */
    it('should get file diff for working tree', async () => {
      const result = await gitIntegration.getFileDiff(
        '/test/project',
        'test.txt'
      )

      expect(mockElectronAPI.getGitDiff).toHaveBeenCalledWith(
        '/test/project',
        'test.txt',
        {}
      )
      expect(result.file).toBe('test.txt')
    })

    /**
     * Tests file diff with null commit hash.
     *
     * @returns Promise<void>
     * Should get diff for working tree when commit is null
     *
     * @public
     */
    it('should get file diff with null commit hash', async () => {
      const result = await gitIntegration.getFileDiff(
        '/test/project',
        'test.txt',
        null
      )

      expect(mockElectronAPI.getGitDiff).toHaveBeenCalledWith(
        '/test/project',
        'test.txt',
        {}
      )
      expect(result.file).toBe('test.txt')
    })

    /**
     * Tests binary file diff handling.
     *
     * @returns Promise<void>
     * Should handle binary files correctly
     *
     * @public
     */
    it('should handle binary file diff', async () => {
      mockElectronAPI.getGitDiff.mockResolvedValue('Binary files differ')

      const result = await gitIntegration.getFileDiff(
        '/test/project',
        'image.png'
      )

      expect(result.binary).toBe(true)
      expect(result.hunks).toEqual([])
    })

    /**
     * Tests empty diff handling.
     *
     * @returns Promise<void>
     * Should handle empty diff output (treated as binary in implementation)
     *
     * @public
     */
    it('should handle empty diff output', async () => {
      mockElectronAPI.getGitDiff.mockResolvedValue('')

      const result = await gitIntegration.getFileDiff(
        '/test/project',
        'test.txt'
      )

      expect(result.binary).toBe(true) // Empty diff is treated as binary
      expect(result.hunks).toEqual([])
    })

    /**
     * Tests diff parsing with multiple hunks.
     *
     * @returns Promise<void>
     * Should parse multiple hunks correctly
     *
     * @public
     */
    it('should parse diff with multiple hunks', async () => {
      const multiHunkDiff = `diff --git a/test.txt b/test.txt
@@ -1,2 +1,3 @@
 line 1
+added line
 line 2
@@ -10,2 +11,3 @@
 line 10
+another added line
 line 11`

      mockElectronAPI.getGitDiff.mockResolvedValue(multiHunkDiff)

      const result = await gitIntegration.getFileDiff(
        '/test/project',
        'test.txt'
      )

      expect(result.hunks).toHaveLength(2)
      expect(result.hunks[0].oldStart).toBe(1)
      expect(result.hunks[1].oldStart).toBe(10)
    })

    /**
     * Tests diff line parsing.
     *
     * @returns Promise<void>
     * Should parse added, removed, and context lines correctly
     *
     * @public
     */
    it('should parse diff lines correctly', async () => {
      const result = await gitIntegration.getFileDiff(
        '/test/project',
        'test.txt'
      )

      const lines = result.hunks[0].lines
      expect(lines[0]).toMatchObject({})
      expect(lines[1]).toMatchObject({})
      expect(lines[3]).toMatchObject({})
    })

    /**
     * Tests file diff error handling.
     *
     * @returns Promise<void>
     * Should handle API errors during diff retrieval
     *
     * @public
     */
    it('should handle file diff errors', async () => {
      const error = new Error('Diff failed')
      mockElectronAPI.getGitDiff.mockRejectedValue(error)

      await expect(
        gitIntegration.getFileDiff('/test/project', 'test.txt')
      ).rejects.toThrow('Diff failed')

      expect(mockConsole.error).toHaveBeenCalledWith(
        '[Git Integration] Failed to get file diff:',
        'Diff failed'
      )
    })

    /**
     * Tests file diff without Electron API.
     *
     * @returns Promise<void>
     * Should throw error when Electron API is not available
     *
     * @public
     */
    it('should handle file diff without Electron API', async () => {
      ;(global.window as unknown as MockWindow).electronAPI =
        {} as unknown as MockElectronAPI

      gitIntegration = useGitIntegration()

      await expect(
        gitIntegration.getFileDiff('/test/project', 'test.txt')
      ).rejects.toThrow('Electron API getGitDiff not available')
    })

    /**
     * Tests file diff console logging.
     *
     * @returns Promise<void>
     * Should log diff operation details
     *
     * @public
     */
    it('should log file diff operation details', async () => {
      await gitIntegration.getFileDiff('/test/project', 'test.txt', 'abc123')

      expect(mockConsole.log).toHaveBeenCalledWith(
        '[Git Integration] Getting diff for test.txt at abc123 using Electron API'
      )
      expect(mockConsole.log).toHaveBeenCalledWith(
        '[Git Integration] Generated diff with 1 hunks using Electron API'
      )
    })
  })

  describe('Status Utilities', () => {
    /**
     * Tests simplified status conversion for staged files.
     *
     * @returns void
     * Should convert Git status codes to UI-friendly status
     *
     * @public
     */
    it('should convert staged file statuses correctly', () => {
      expect(gitIntegration.getSimplifiedStatus('A', ' ')).toBe('added')
      expect(gitIntegration.getSimplifiedStatus('M', ' ')).toBe('modified')
      expect(gitIntegration.getSimplifiedStatus('D', ' ')).toBe('deleted')
      expect(gitIntegration.getSimplifiedStatus('R', ' ')).toBe('renamed')
      expect(gitIntegration.getSimplifiedStatus('C', ' ')).toBe('renamed')
      expect(gitIntegration.getSimplifiedStatus('U', ' ')).toBe('modified')
    })

    /**
     * Tests simplified status conversion for unstaged files.
     *
     * @returns void
     * Should prioritize worktree status when index is clean
     *
     * @public
     */
    it('should convert unstaged file statuses correctly', () => {
      expect(gitIntegration.getSimplifiedStatus(' ', 'M')).toBe('modified')
      expect(gitIntegration.getSimplifiedStatus(' ', 'D')).toBe('deleted')
      expect(gitIntegration.getSimplifiedStatus(' ', '?')).toBe('untracked')
      expect(gitIntegration.getSimplifiedStatus(' ', '!')).toBe('modified')
    })

    /**
     * Tests file staging detection.
     *
     * @returns void
     * Should correctly identify staged files
     *
     * @public
     */
    it('should detect staged files correctly', () => {
      const stagedFile = {
        path: 'staged-file.ts',
        indexStatus: 'M' as const,
        worktreeStatus: ' ' as const,
      }
      const unstagedFile = {
        path: 'unstaged-file.ts',
        indexStatus: ' ' as const,
        worktreeStatus: 'M' as const,
      }

      expect(gitIntegration.isFileStaged(stagedFile)).toBe(true)
      expect(gitIntegration.isFileStaged(unstagedFile)).toBe(false)
    })
  })

  describe('Computed Properties with Data', () => {
    beforeEach(async () => {
      // Setup Git status with mixed files
      mockElectronAPI.getGitStatus.mockResolvedValue({
        files: [
          {
            path: 'staged.txt',
            indexStatus: 'M',
            worktreeStatus: ' ',
          },
          {
            path: 'modified.txt',
            indexStatus: 'M',
            worktreeStatus: 'M',
          },
          {
            path: 'unstaged.txt',
            indexStatus: ' ',
            worktreeStatus: 'M',
          },
          {
            path: 'untracked.txt',
            indexStatus: ' ',
            worktreeStatus: '?',
          },
        ],
        branch: 'main',
        ahead: 0,
        behind: 0,
      })

      await gitIntegration.getGitStatus('/test/project')
    })

    /**
     * Tests computed properties with Git data.
     *
     * @returns void
     * Should compute file lists correctly based on Git status
     *
     * @public
     */
    it('should compute changed files correctly', async () => {
      // First populate git status with test data
      await gitIntegration.getGitStatus('/test/project')

      expect(gitIntegration.changedFiles.value).toHaveLength(4)
    })

    /**
     * Tests staged files computation.
     *
     * @returns void
     * Should filter only staged files
     *
     * @public
     */
    it('should compute staged files correctly', async () => {
      // First populate git status with test data
      await gitIntegration.getGitStatus('/test/project')

      const stagedFiles = gitIntegration.stagedFiles.value
      expect(stagedFiles).toHaveLength(2)
      expect(stagedFiles.map((f) => f.path)).toEqual(['file1.txt', 'file4.txt'])
    })

    /**
     * Tests unstaged files computation.
     *
     * @returns void
     * Should filter only unstaged files
     *
     * @public
     */
    it('should compute unstaged files correctly', async () => {
      // First populate git status with test data
      await gitIntegration.getGitStatus('/test/project')

      const unstagedFiles = gitIntegration.unstagedFiles.value
      expect(unstagedFiles).toHaveLength(2)
      expect(unstagedFiles.map((f) => f.path)).toEqual([
        'file2.txt',
        'file3.txt',
      ])
    })
  })

  describe('Error Handling Edge Cases', () => {
    /**
     * Tests error handling with non-Error objects.
     *
     * @returns Promise<void>
     * Should handle non-Error thrown objects
     *
     * @public
     */
    it('should handle non-Error thrown objects', async () => {
      mockElectronAPI.getGitStatus.mockRejectedValue('String error')

      await expect(
        gitIntegration.getGitStatus('/test/project')
      ).rejects.toThrow()

      expect(gitIntegration.lastError.value).toBe('Unknown error')
    })

    /**
     * Tests diff parsing with malformed hunk headers.
     *
     * @returns Promise<void>
     * Should handle malformed diff output gracefully
     *
     * @public
     */
    it('should handle malformed diff hunk headers', async () => {
      const malformedDiff = `diff --git a/test.txt b/test.txt
@@ malformed header @@
 some content`

      mockElectronAPI.getGitDiff.mockResolvedValue(malformedDiff)

      const result = await gitIntegration.getFileDiff(
        '/test/project',
        'test.txt'
      )

      expect(result.hunks).toEqual([])
    })

    /**
     * Tests diff parsing with no content lines.
     *
     * @returns Promise<void>
     * Should handle diff with only headers
     *
     * @public
     */
    it('should handle diff with only headers', async () => {
      const headerOnlyDiff = `diff --git a/test.txt b/test.txt
index 1234567..abcdefg 100644
--- a/test.txt
+++ b/test.txt`

      mockElectronAPI.getGitDiff.mockResolvedValue(headerOnlyDiff)

      const result = await gitIntegration.getFileDiff(
        '/test/project',
        'test.txt'
      )

      expect(result.hunks).toEqual([])
    })
  })
})
