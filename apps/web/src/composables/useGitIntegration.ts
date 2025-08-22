/**
 * @fileoverview Git integration system for real repository operations.
 *
 * @description
 * Provides Git operations integration for the Timeline mode, including
 * status checking, diff generation, and commit history. Uses Node.js
 * child process to execute git commands safely.
 *
 * @example
 * ```typescript
 * const { getGitStatus, getCommitHistory } = useGitIntegration()
 * await getGitStatus('/path/to/project')
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { ref, computed } from 'vue'

/**
 * Git status for a single file.
 *
 * @public
 */
interface GitFileStatus {
  /** File path relative to git root */
  path: string
  /** Index status (staged changes) */
  indexStatus: GitStatusCode
  /** Worktree status (unstaged changes) */
  worktreeStatus: GitStatusCode
  /** Original path for renames */
  originalPath?: string
}

/**
 * Git status codes as defined by git status --porcelain.
 *
 * @public
 */
type GitStatusCode =
  | ' ' // unmodified
  | 'M' // modified
  | 'A' // added
  | 'D' // deleted
  | 'R' // renamed
  | 'C' // copied
  | 'U' // updated but unmerged
  | '?' // untracked
  | '!' // ignored

/**
 * Simplified file change status for UI.
 *
 * @public
 */
type FileChangeStatus =
  | 'added'
  | 'modified'
  | 'deleted'
  | 'renamed'
  | 'untracked'

/**
 * Git commit information.
 *
 * @public
 */
interface GitCommitInfo {
  /** Full commit hash */
  hash: string
  /** Short commit hash (7 chars) */
  shortHash: string
  /** Commit message */
  message: string
  /** Author information */
  author: {
    name: string
    email: string
    date: Date
  }
  /** Parent commit hashes */
  parents: string[]
  /** Files changed in this commit */
  filesChanged: number
  /** Lines added */
  linesAdded: number
  /** Lines deleted */
  linesDeleted: number
}

/**
 * Git diff hunk information.
 *
 * @public
 */
interface GitDiffHunk {
  /** Hunk header line */
  header: string
  /** Starting line number in old file */
  oldStart: number
  /** Number of lines in old file */
  oldCount: number
  /** Starting line number in new file */
  newStart: number
  /** Number of lines in new file */
  newCount: number
  /** Diff lines */
  lines: GitDiffLine[]
}

/**
 * Single line in a git diff.
 *
 * @public
 */
interface GitDiffLine {
  /** Line content */
  content: string
  /** Line type */
  type: 'context' | 'added' | 'removed'
  /** Line number in old file */
  oldLineNumber?: number
  /** Line number in new file */
  newLineNumber?: number
}

/**
 * Git diff data for a file.
 *
 * @public
 */
interface GitDiffData {
  /** File path */
  file: string
  /** Diff hunks */
  hunks: GitDiffHunk[]
  /** File language for syntax highlighting */
  language?: string
  /** Is this a binary file */
  binary: boolean
}

// Global state
const isGitRepository = ref(false)
const currentGitRoot = ref<string | null>(null)
const gitStatus = ref<GitFileStatus[]>([])
const isLoadingStatus = ref(false)
const lastError = ref<string | null>(null)

/**
 * Main composable for Git integration.
 *
 * @returns Object containing Git operations and state
 *
 * @example
 * ```typescript
 * const { getGitStatus, isGitRepo } = useGitIntegration()
 * const status = await getGitStatus('/path/to/project')
 * ```
 *
 * @public
 */
export function useGitIntegration() {
  /**
   * Test function to debug electronAPI availability.
   *
   * @public
   */
  const debugElectronAPI = (): void => {
    console.log('[Git Integration] 🔧 DEBUG: Electron API Analysis')
    console.log(
      '[Git Integration] 🔍 window defined:',
      typeof window !== 'undefined'
    )
    console.log(
      '[Git Integration] 🔍 window.electronAPI defined:',
      !!window.electronAPI
    )

    if (window.electronAPI) {
      console.log(
        '[Git Integration] 📊 Available API methods:',
        Object.keys(window.electronAPI)
      )
      console.log(
        '[Git Integration] 🎯 getGitDiff type:',
        typeof window.electronAPI.getGitDiff
      )
      console.log(
        '[Git Integration] 🎯 getGitStatus type:',
        typeof window.electronAPI.getGitStatus
      )

      // Test a simple call that should work
      if (typeof window.electronAPI?.getGitStatus === 'function') {
        console.log('[Git Integration] ✅ getGitStatus is available')
      } else {
        console.log('[Git Integration] ❌ getGitStatus is NOT available')
      }

      if (typeof window.electronAPI?.getGitDiff === 'function') {
        console.log('[Git Integration] ✅ getGitDiff is available')
      } else {
        console.log('[Git Integration] ❌ getGitDiff is NOT available')
      }
    } else {
      console.log(
        '[Git Integration] ❌ window.electronAPI is completely undefined'
      )
    }
  }

  /**
   * Test function to manually test getGitDiff API call.
   *
   * @public
   */
  const testGetGitDiff = async (
    projectPath: string,
    filePath: string
  ): Promise<void> => {
    console.log('[Git Integration] 🧪 TESTING getGitDiff API call...')
    try {
      if (!window.electronAPI?.getGitDiff) {
        throw new Error('getGitDiff API not available')
      }

      console.log(
        `[Git Integration] 🚀 Calling getGitDiff('${projectPath}', '${filePath}')`
      )
      const result = await window.electronAPI.getGitDiff(projectPath, filePath)
      console.log(
        '[Git Integration] ✅ getGitDiff SUCCESS! Result length:',
        result.length
      )
      console.log(
        '[Git Integration] 📄 Result preview:',
        result.substring(0, 200) + '...'
      )
      return result
    } catch (error) {
      console.error('[Git Integration] ❌ getGitDiff FAILED:', error)
      throw error
    }
  }

  // Run debug with a small delay to ensure APIs are loaded (only in browser environment)
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      debugElectronAPI()
    }, 100)
  }

  // Expose test function globally for manual testing
  if (typeof window !== 'undefined') {
    // Extend window interface for test functions
    interface TestWindow extends Window {
      __testGetGitDiff?: typeof testGetGitDiff
      __debugElectronAPI?: typeof debugElectronAPI
    }
    const testWindow = window as TestWindow
    testWindow.__testGetGitDiff = testGetGitDiff
    testWindow.__debugElectronAPI = debugElectronAPI
  }

  /**
   * Checks if a directory is a git repository using Electron API.
   *
   * @param projectPath - Path to check
   * @returns Promise resolving to true if it's a git repo
   *
   * @public
   */
  const checkIfGitRepository = async (
    projectPath: string
  ): Promise<boolean> => {
    try {
      if (!window.electronAPI || !window.electronAPI.getGitStatus) {
        throw new Error(
          'Electron API not available - this is a desktop-only application'
        )
      }

      const result = await window.electronAPI.getGitStatus(projectPath)
      return result.isRepository
    } catch {
      return false
    }
  }

  /**
   * Gets the git root directory for a project.
   * For now, assumes the project path is the git root.
   *
   * @param projectPath - Path within the git repository
   * @returns Promise resolving to git root path
   *
   * @public
   */
  const getGitRoot = async (projectPath: string): Promise<string> => {
    // For now, assume the project path is the git root
    // TODO: Add getGitRoot to Electron IPC if needed
    return projectPath
  }

  /**
   * Gets git status for all files in the repository.
   *
   * @param projectPath - Path to the project
   * @returns Promise resolving to array of file statuses
   *
   * @example
   * ```typescript
   * const status = await getGitStatus('/path/to/project')
   * console.log('Changed files:', status.length)
   * ```
   *
   * @public
   */
  const getGitStatus = async (
    projectPath: string
  ): Promise<GitFileStatus[]> => {
    isLoadingStatus.value = true
    lastError.value = null

    try {
      console.log('[Git Integration] Getting status for:', projectPath)

      if (!window.electronAPI || !window.electronAPI.getGitStatus) {
        throw new Error(
          'Electron API not available - this is a desktop-only application'
        )
      }

      // Use Electron API to get Git status
      const result = await window.electronAPI.getGitStatus(projectPath)

      if (!result.isRepository) {
        isGitRepository.value = false
        return []
      }

      isGitRepository.value = true
      currentGitRoot.value = projectPath

      // Convert Electron API result to internal format
      const fileStatuses: GitFileStatus[] = result.files.map(
        (file: {
          path: string
          indexStatus: string
          worktreeStatus: string
        }) => ({
          path: file.path,
          indexStatus: file.indexStatus as GitStatusCode,
          worktreeStatus: file.worktreeStatus as GitStatusCode,
          originalPath: undefined, // TODO: Handle renames if needed
        })
      )

      gitStatus.value = fileStatuses
      console.log(
        `[Git Integration] Found ${fileStatuses.length} changed files`
      )
      console.log(
        '[Git Integration] All parsed files:',
        fileStatuses.map(
          (f) => `${f.path} [${f.indexStatus}${f.worktreeStatus}]`
        )
      )
      return fileStatuses
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      lastError.value = errorMessage
      console.error('[Git Integration] Failed to get git status:', errorMessage)
      throw error
    } finally {
      isLoadingStatus.value = false
    }
  }

  /**
   * Gets commit history for the repository.
   *
   * @param projectPath - Path to the project
   * @param limit - Maximum number of commits to fetch
   * @returns Promise resolving to array of commit info
   *
   * @example
   * ```typescript
   * const commits = await getCommitHistory('/path/to/project', 10)
   * ```
   *
   * @public
   */
  const getCommitHistory = async (
    _projectPath: string,
    limit = 50
  ): Promise<GitCommitInfo[]> => {
    try {
      console.log(`[Git Integration] Getting commit history (limit: ${limit})`)

      if (!window.electronAPI) {
        throw new Error(
          'Electron API not available - this is a desktop-only application'
        )
      }

      // For now, return mock data since we need to implement git log in Electron IPC
      // TODO: Add getGitLog to Electron IPC
      const mockCommits: GitCommitInfo[] = [
        {
          hash: 'abc123456789abcdef123456789abcdef12345678',
          shortHash: 'abc1234',
          message: 'feat: implement Git diff functionality',
          author: {
            name: 'Developer',
            email: 'dev@example.com',
            date: new Date('2024-01-15T10:30:00Z'),
          },
          parents: ['def456789abcdef123456789abcdef123456789'],
          filesChanged: 5,
          linesAdded: 120,
          linesDeleted: 45,
        },
        {
          hash: 'def456789abcdef123456789abcdef123456789',
          shortHash: 'def4567',
          message: 'fix: update project context integration',
          author: {
            name: 'Developer',
            email: 'dev@example.com',
            date: new Date('2024-01-14T15:20:00Z'),
          },
          parents: ['ghi789abcdef123456789abcdef123456789'],
          filesChanged: 3,
          linesAdded: 67,
          linesDeleted: 23,
        },
        {
          hash: 'ghi789abcdef123456789abcdef123456789',
          shortHash: 'ghi7890',
          message: 'initial commit',
          author: {
            name: 'Developer',
            email: 'dev@example.com',
            date: new Date('2024-01-13T09:00:00Z'),
          },
          parents: [],
          filesChanged: 1,
          linesAdded: 10,
          linesDeleted: 0,
        },
      ]

      console.log(`[Git Integration] Retrieved ${mockCommits.length} commits`)
      return mockCommits.slice(0, limit)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      console.error(
        '[Git Integration] Failed to get commit history:',
        errorMessage
      )
      throw error
    }
  }

  /**
   * Gets raw file content from git repository.
   *
   * @param projectPath - Path to the git project
   * @param filePath - Relative path to the file from project root
   * @param commitHash - Optional commit hash (null for working tree)
   * @returns Promise resolving to file content lines
   *
   * @example
   * ```typescript
   * const content = await getFileContent('/path/to/project', 'src/file.ts', 'abc123')
   * ```
   *
   * @public
   */
  const getFileContent = async (
    projectPath: string,
    filePath: string,
    commitHash?: string | null
  ): Promise<string[]> => {
    try {
      console.log(
        `[Git Integration] Getting file content for ${filePath}${commitHash ? ` at ${commitHash}` : ''}`
      )

      if (!window.electronAPI || !window.electronAPI.getFileContent) {
        throw new Error(
          'Electron API getFileContent not available - this is a desktop-only application'
        )
      }

      const options = commitHash
        ? { commit: commitHash }
        : { fromWorkingTree: true }

      const fileContent = await window.electronAPI.getFileContent(
        projectPath,
        filePath,
        options
      )

      // Split content into lines for processing
      const lines = fileContent.split('\n')
      console.log(
        `[Git Integration] Retrieved ${lines.length} lines for ${filePath}`
      )

      return lines
    } catch (error) {
      console.error('[Git Integration] Failed to get file content:', error)
      return []
    }
  }

  /**
   * Gets diff data for a specific file using Electron API.
   * This is a desktop Electron app - uses only Electron Git APIs.
   *
   * @param projectPath - Path to the project
   * @param filePath - Path to the file
   * @param commitHash - Commit hash (optional, defaults to HEAD vs working tree)
   * @returns Promise resolving to diff data
   *
   * @example
   * ```typescript
   * const diff = await getFileDiff('/path/to/project', 'src/file.ts', 'abc123')
   * ```
   *
   * @public
   */
  const getFileDiff = async (
    projectPath: string,
    filePath: string,
    commitHash?: string | null
  ): Promise<GitDiffData> => {
    try {
      console.log(
        `[Git Integration] Getting diff for ${filePath}${commitHash ? ` at ${commitHash}` : ''} using Electron API`
      )

      // Debug: Log available electronAPI methods
      console.log(
        '[Git Integration] 🔍 window.electronAPI available:',
        !!window.electronAPI
      )
      if (window.electronAPI) {
        console.log(
          '[Git Integration] 🔍 Available electronAPI methods:',
          Object.keys(window.electronAPI)
        )
        console.log(
          '[Git Integration] 🔍 getGitDiff method available:',
          !!window.electronAPI.getGitDiff
        )
        console.log(
          '[Git Integration] 🔍 getGitStatus method available:',
          !!window.electronAPI.getGitStatus
        )
      }

      if (!window.electronAPI || !window.electronAPI.getGitDiff) {
        throw new Error(
          'Electron API getGitDiff not available - this is a desktop-only application'
        )
      }

      const options = commitHash ? { commit: commitHash } : {}
      const diffOutput = await window.electronAPI.getGitDiff(
        projectPath,
        filePath,
        options
      )

      // Parse the diff output from simple-git
      const diffData: GitDiffData = {
        file: filePath,
        hunks: [],
        binary: false,
      }

      if (!diffOutput || diffOutput.includes('Binary files')) {
        diffData.binary = true
        return diffData
      }

      // Parse unified diff format
      const lines = diffOutput.split('\n')
      let currentHunk: GitDiffHunk | null = null
      let oldLineNum = 0
      let newLineNum = 0

      for (const line of lines) {
        // Skip diff headers
        if (
          line.startsWith('diff --git') ||
          line.startsWith('index ') ||
          line.startsWith('---') ||
          line.startsWith('+++')
        ) {
          continue
        }

        // Hunk header
        if (line.startsWith('@@')) {
          if (currentHunk) {
            diffData.hunks.push(currentHunk)
          }

          const hunkMatch = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/)
          if (hunkMatch) {
            const oldStart = parseInt(hunkMatch[1])
            const oldCount = parseInt(hunkMatch[2]) || 1
            const newStart = parseInt(hunkMatch[3])
            const newCount = parseInt(hunkMatch[4]) || 1

            currentHunk = {
              header: line,
              oldStart,
              oldCount,
              newStart,
              newCount,
              lines: [],
            }

            oldLineNum = oldStart
            newLineNum = newStart
          }
          continue
        }

        // Diff content lines
        if (currentHunk) {
          const content = line.substring(1) // Remove +/- prefix

          if (line.startsWith('-')) {
            // Removed line
            currentHunk.lines.push({
              content,
              type: 'removed',
              oldLineNumber: oldLineNum++,
            })
          } else if (line.startsWith('+')) {
            // Added line
            currentHunk.lines.push({
              content,
              type: 'added',
              newLineNumber: newLineNum++,
            })
          } else if (line.startsWith(' ')) {
            // Context line
            currentHunk.lines.push({
              content,
              type: 'context',
              oldLineNumber: oldLineNum++,
              newLineNumber: newLineNum++,
            })
          }
        }
      }

      // Add the last hunk
      if (currentHunk) {
        diffData.hunks.push(currentHunk)
      }

      console.log(
        `[Git Integration] Generated diff with ${diffData.hunks.length} hunks using Electron API`
      )
      return diffData
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      console.error('[Git Integration] Failed to get file diff:', errorMessage)
      throw error
    }
  }

  /**
   * Converts git status codes to simplified UI status.
   *
   * @param indexStatus - Git index status code
   * @param worktreeStatus - Git worktree status code
   * @returns Simplified status for UI
   *
   * @public
   */
  const getSimplifiedStatus = (
    indexStatus: GitStatusCode,
    worktreeStatus: GitStatusCode
  ): FileChangeStatus => {
    // Prioritize index status (staged changes)
    if (indexStatus !== ' ') {
      switch (indexStatus) {
        case 'A':
          return 'added'
        case 'M':
          return 'modified'
        case 'D':
          return 'deleted'
        case 'R':
          return 'renamed'
        case 'C':
          return 'renamed' // Treat copy as rename for simplicity
        default:
          return 'modified'
      }
    }

    // Fall back to worktree status
    switch (worktreeStatus) {
      case 'M':
        return 'modified'
      case 'D':
        return 'deleted'
      case '?':
        return 'untracked'
      default:
        return 'modified'
    }
  }

  /**
   * Checks if a file is staged for commit.
   *
   * @param fileStatus - Git file status
   * @returns True if file is staged
   *
   * @public
   */
  const isFileStaged = (fileStatus: GitFileStatus): boolean => {
    return fileStatus.indexStatus !== ' '
  }

  // Computed properties
  const changedFiles = computed(() => gitStatus.value)
  const stagedFiles = computed(() => gitStatus.value.filter(isFileStaged))
  const unstagedFiles = computed(() =>
    gitStatus.value.filter((file) => file.worktreeStatus !== ' ')
  )

  return {
    // State (readonly)
    isGitRepository: computed(() => isGitRepository.value),
    currentGitRoot: computed(() => currentGitRoot.value),
    isLoadingStatus: computed(() => isLoadingStatus.value),
    lastError: computed(() => lastError.value),

    // Computed file lists
    changedFiles,
    stagedFiles,
    unstagedFiles,

    // Actions
    checkIfGitRepository,
    getGitRoot,
    getGitStatus,
    getCommitHistory,
    getFileContent,
    getFileDiff,
    getSimplifiedStatus,
    isFileStaged,

    // Debug utilities
    debugElectronAPI,
    testGetGitDiff,
  }
}

/**
 * Gets the appropriate file extension for syntax highlighting.
 *
 * @param filePath - Path to the file
 * @returns Language identifier for syntax highlighting
 *
 * @private
 */
