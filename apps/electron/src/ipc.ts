import {
  BrowserWindow,
  dialog,
  ipcMain as electronIpcMain,
  app,
} from 'electron'
import { join, resolve, normalize } from 'node:path'
import { readFile, stat, readdir, access, realpath } from 'node:fs/promises'
import { constants } from 'node:fs'
// import * as gracefulFs from 'graceful-fs' // TODO: Use for more robust file operations
import type { MainMessage, RenderMessage } from '@hatcherdx/dx-engine-preload'
import { IPCMain } from '@hatcherdx/dx-engine-preload/main'
import { simpleGit, SimpleGit, StatusResult } from 'simple-git'
import chokidar from 'chokidar'
import { terminalKeyboardHandler } from './terminalKeyboardHandler'

/**
 * File watcher with cleanup function for proper resource management.
 *
 * @remarks
 * Wraps chokidar.FSWatcher with additional cleanup logic for coalescence timers
 * and pending signal flushes.
 *
 * @public
 * @since 2.0.0
 */
interface FileWatcherWithCleanup {
  watcher: chokidar.FSWatcher
  cleanup: () => void
}

/**
 * CRITICAL: Validates that the provided path is NOT the IDE's own directory.
 * This prevents the IDE from modifying its own source code.
 *
 * @param projectPath - The path to validate
 * @throws Error if the path is the IDE directory or if no path provided
 * @since 2.0.0
 * @critical Security validation - MUST be called before ANY Git operation
 */
const validateNotIDEDirectory = async (projectPath: string): Promise<void> => {
  if (!projectPath) {
    throw new Error(
      'CRITICAL: No project path provided. Git operations require an open project.'
    )
  }

  // Allow IDE directory operations in development mode for testing
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    console.log(
      `⚠️ [Git Safety Check] Development mode: Allowing operations on IDE directory for testing`
    )
    return
  }

  // Get the real paths to handle symlinks correctly
  const normalizedProjectPath = normalize(resolve(projectPath))
  const ideDirectory = normalize(resolve(app.getAppPath()))
  const currentWorkingDir = normalize(resolve(process.cwd()))

  // Also check common IDE paths
  const idePaths = [
    ideDirectory,
    currentWorkingDir,
    normalize(resolve(__dirname)),
    normalize(resolve(__dirname, '../..')),
    normalize(resolve(__dirname, '../../..')),
    '/Users/chrissmejia/Sites/dx-engine', // Hardcoded protection
  ]

  // Resolve the real path in case of symlinks
  let realProjectPath: string
  try {
    realProjectPath = await realpath(normalizedProjectPath)
  } catch {
    realProjectPath = normalizedProjectPath
  }

  // Check if the project path matches any IDE path
  for (const idePath of idePaths) {
    let realIdePath: string
    try {
      realIdePath = await realpath(idePath)
    } catch {
      realIdePath = idePath
    }

    if (
      realProjectPath === realIdePath ||
      realProjectPath.startsWith(realIdePath + '/')
    ) {
      throw new Error(
        `CRITICAL SECURITY VIOLATION: Attempted to perform Git operations on IDE directory.\n` +
          `Project path: ${projectPath}\n` +
          `Resolved to: ${realProjectPath}\n` +
          `IDE path detected: ${realIdePath}\n` +
          `This operation has been blocked to prevent the IDE from modifying its own code.`
      )
    }
  }

  console.log(
    `✅ [Git Safety Check] Path validated: ${projectPath} is NOT the IDE directory`
  )
}

/**
 * Git file status structure returned to the renderer process.
 * Maps Git porcelain status codes to UI-friendly format.
 *
 * @interface GitFileStatus
 * @since 1.0.0
 * @public
 */
interface GitFileStatus {
  path: string
  indexStatus: string
  worktreeStatus: string
  isStaged: boolean
  simplifiedStatus: 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked'
}

/**
 * Result of Git status operation with all changed files.
 *
 * @interface GitStatusResult
 * @since 1.0.0
 * @public
 */
interface GitStatusResult {
  files: GitFileStatus[]
  totalFiles: number
  isRepository: boolean
  currentBranch?: string
}

/**
 * Parsed Git error information for enhanced user experience.
 *
 * @interface GitSwitchError
 * @since 1.0.0
 * @public
 */
interface GitSwitchError {
  type: 'uncommitted_changes' | 'untracked_files' | 'both' | 'other'
  userMessage: string
  affectedFiles: string[]
  suggestions: string[]
  canForce: boolean
}

/**
 * Converts simple-git status to our internal format.
 * Handles all Git status codes including untracked files.
 *
 * @param status - StatusResult from simple-git
 * @returns GitStatusResult with standardized file information
 * @private
 */
const convertGitStatus = (status: StatusResult): GitStatusResult => {
  const files: GitFileStatus[] = []

  // Handle all file categories from simple-git
  const allFiles = [
    // Files ready to be committed (staged)
    ...status.staged.map((f) => ({
      path: f,
      index: 'A',
      workingDir: ' ',
      type: 'staged',
    })),
    // New files in working directory (untracked)
    ...status.not_added.map((f) => ({
      path: f,
      index: ' ',
      workingDir: '?',
      type: 'untracked',
    })),
    // Modified files in working directory
    ...status.modified.map((f) => ({
      path: f,
      index: ' ',
      workingDir: 'M',
      type: 'modified',
    })),
    // Files created and staged
    ...status.created.map((f) => ({
      path: f,
      index: 'A',
      workingDir: ' ',
      type: 'created',
    })),
    // Deleted files
    ...status.deleted.map((f) => ({
      path: f,
      index: ' ',
      workingDir: 'D',
      type: 'deleted',
    })),
    // Conflicted files
    ...status.conflicted.map((f) => ({
      path: f,
      index: 'U',
      workingDir: 'U',
      type: 'conflicted',
    })),
  ]

  for (const file of allFiles) {
    const simplifiedStatus = getSimplifiedStatus(
      file.index,
      file.workingDir,
      file.type
    )
    const isStaged = ['A', 'M', 'D', 'R', 'C'].includes(file.index)

    files.push({
      path: file.path,
      indexStatus: file.index,
      worktreeStatus: file.workingDir,
      isStaged,
      simplifiedStatus,
    })
  }

  return {
    files,
    totalFiles: files.length,
    isRepository: true,
    currentBranch: status.current || undefined,
  }
}

/**
 * Maps Git status codes to simplified UI status.
 *
 * @param indexStatus - Git index status code
 * @param worktreeStatus - Git working tree status code
 * @param type - File change type from simple-git
 * @returns Simplified status for UI display
 * @private
 */
const getSimplifiedStatus = (
  indexStatus: string,
  worktreeStatus: string,
  type: string
): 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked' => {
  // Handle untracked files first
  if (type === 'untracked' || worktreeStatus === '?') {
    return 'untracked'
  }

  // Handle created/added files
  if (type === 'created' || type === 'staged' || indexStatus === 'A') {
    return 'added'
  }

  // Handle deleted files
  if (type === 'deleted' || indexStatus === 'D' || worktreeStatus === 'D') {
    return 'deleted'
  }

  // Handle renamed files
  if (indexStatus === 'R' || worktreeStatus === 'R') {
    return 'renamed'
  }

  // Everything else is modified
  return 'modified'
}

/**
 * Parses Git error messages to provide enhanced user experience information.
 * Detects common Git errors and extracts actionable information for the UI.
 *
 * @param errorMessage - Raw Git error message
 * @returns Structured error information with user-friendly messages and suggestions
 * @since 1.0.0
 * @private
 */
const parseGitSwitchError = (errorMessage: string): GitSwitchError => {
  const hasUncommittedChanges =
    errorMessage.includes('Your local changes') ||
    errorMessage.includes('would be overwritten by checkout')
  const hasUntrackedFiles = errorMessage.includes(
    'untracked working tree files'
  )

  // Extract affected files from Git error message
  const affectedFiles: string[] = []
  const lines = errorMessage.split('\n')
  let inFilesList = false

  for (const line of lines) {
    // Detect start of files list
    if (
      line.includes('Your local changes to the following files') ||
      line.includes('untracked working tree files would be overwritten')
    ) {
      inFilesList = true
      continue
    }

    // Stop at certain keywords
    if (
      line.includes('Please commit') ||
      line.includes('Please move or remove') ||
      line.includes('Aborting')
    ) {
      inFilesList = false
      continue
    }

    // Extract file paths (they're usually indented with tabs)
    if (inFilesList && line.startsWith('\t')) {
      const filePath = line.trim()
      if (filePath && !affectedFiles.includes(filePath)) {
        affectedFiles.push(filePath)
      }
    }
  }

  // Determine error type and create user-friendly response
  let type: GitSwitchError['type']
  let userMessage: string
  let suggestions: string[]
  let canForce = false

  if (hasUncommittedChanges && hasUntrackedFiles) {
    type = 'both'
    userMessage =
      'No se puede cambiar de branch porque tienes cambios sin guardar y archivos sin seguimiento'
    suggestions = [
      'Haz commit de los cambios modificados con "git add . && git commit -m \'mensaje\'"',
      'Elimina o haz commit de los archivos sin seguimiento',
      'O haz stash de tus cambios con "git stash push -m \'descripción\'"',
    ]
  } else if (hasUncommittedChanges) {
    type = 'uncommitted_changes'
    userMessage =
      'No se puede cambiar de branch porque tienes cambios sin guardar'
    suggestions = [
      'Haz commit de tus cambios con "git add . && git commit -m \'mensaje\'"',
      'O guarda temporalmente con "git stash push -m \'descripción\'"',
    ]
    canForce = true
  } else if (hasUntrackedFiles) {
    type = 'untracked_files'
    userMessage =
      'No se puede cambiar de branch porque hay archivos sin seguimiento que serían sobrescritos'
    suggestions = [
      'Haz commit de los archivos con "git add . && git commit -m \'mensaje\'"',
      'O elimina los archivos si no los necesitas',
    ]
  } else {
    type = 'other'
    userMessage = 'Error inesperado al cambiar de branch'
    suggestions = [
      'Revisa el estado del repositorio con "git status"',
      'Contacta al equipo de desarrollo si el problema persiste',
    ]
  }

  return {
    type,
    userMessage,
    affectedFiles,
    suggestions,
    canForce,
  }
}

export const ipcMain = new IPCMain<RenderMessage, MainMessage>()

ipcMain.on('getUsernameById', (userID) => {
  console.log('getUsernameById', `User ID: ${userID}`)
  return 'User Name'
})

// Window control handlers
ipcMain.on('minimizeWindow', () => {
  const window = BrowserWindow.getFocusedWindow()
  if (window) {
    window.minimize()
  }
})

ipcMain.on('maximizeWindow', () => {
  const window = BrowserWindow.getFocusedWindow()
  if (window) {
    if (window.isMaximized()) {
      window.restore()
    } else {
      window.maximize()
    }
  }
})

ipcMain.on('closeWindow', () => {
  const window = BrowserWindow.getFocusedWindow()
  if (window) {
    window.close()
  }
})

ipcMain.on('isWindowMaximized', () => {
  const window = BrowserWindow.getFocusedWindow()
  return window ? window.isMaximized() : false
})

// Project selection handlers
electronIpcMain.handle('openProjectDialog', async () => {
  const window = BrowserWindow.getFocusedWindow()
  if (!window) {
    throw new Error('No focused window available')
  }

  const result = await dialog.showOpenDialog(window, {
    title: 'Select package.json file',
    filters: [
      { name: 'JSON Files (*.json)', extensions: ['json'] },
      { name: 'All Files (*.*)', extensions: ['*'] },
    ],
    properties: ['openFile'],
    buttonLabel: 'Select Project',
    defaultPath: process.cwd(),
  })

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  const selectedPath = result.filePaths[0]

  // Validate that it's a package.json file
  if (!selectedPath.endsWith('package.json')) {
    throw new Error('Please select a package.json file')
  }

  try {
    // Read and validate package.json content
    const content = await readFile(selectedPath, 'utf8')
    const packageData = JSON.parse(content)

    if (!packageData.name) {
      throw new Error('Invalid package.json: missing name field')
    }

    const projectPath = join(selectedPath, '..')

    return {
      path: projectPath,
      packageJson: selectedPath,
      name: packageData.name,
      version: packageData.version || '0.0.0',
      description: packageData.description || '',
      scripts: packageData.scripts || {},
      dependencies: packageData.dependencies || {},
      devDependencies: packageData.devDependencies || {},
    }
  } catch (error) {
    throw new Error(
      `Failed to read package.json: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
})

// File system stat handler for directory filtering
electronIpcMain.handle('statFile', async (_, filePath: string) => {
  try {
    const stats = await stat(filePath)
    return {
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      size: stats.size,
      modified: stats.mtime,
    }
  } catch (error) {
    throw new Error(
      `Failed to stat file: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
})

// Directory reading handler for expanding directories
electronIpcMain.handle('readDirectory', async (_, dirPath: string) => {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true })
    const files: string[] = []

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name)
      if (entry.isFile()) {
        files.push(fullPath)
      }
    }

    return files
  } catch (error) {
    throw new Error(
      `Failed to read directory: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
})

// Path existence checker
electronIpcMain.handle('pathExists', async (_, path: string) => {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
})

// Get current working directory
electronIpcMain.handle('getCurrentWorkingDirectory', async () => {
  // Return the directory where the app was launched from
  return process.cwd()
})

// Directory checker
electronIpcMain.handle('isDirectory', async (_, path: string) => {
  try {
    const stats = await stat(path)
    return stats.isDirectory()
  } catch {
    return false
  }
})

// File reader
electronIpcMain.handle('readFile', async (_, filePath: string) => {
  try {
    const content = await readFile(filePath, 'utf8')
    return content
  } catch (error) {
    throw new Error(
      `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
})

// Directory scanner for project files
electronIpcMain.handle(
  'scanDirectory',
  async (
    _,
    dirPath: string,
    options?: { ignoredDirs?: string[]; configFiles?: string[] }
  ) => {
    try {
      const ignoredDirs = new Set(options?.ignoredDirs || [])
      const configFiles = new Set(options?.configFiles || [])
      const files: Array<{
        path: string
        name: string
        extension: string
        type: 'file' | 'directory'
        size?: number
        lastModified?: Date
        isConfig?: boolean
      }> = []

      const scanRecursive = async (
        currentPath: string,
        relativePath: string = ''
      ) => {
        const entries = await readdir(currentPath, { withFileTypes: true })

        for (const entry of entries) {
          const fullPath = join(currentPath, entry.name)
          const relativeEntryPath = relativePath
            ? join(relativePath, entry.name)
            : entry.name

          if (entry.isDirectory() && !ignoredDirs.has(entry.name)) {
            files.push({
              path: relativeEntryPath,
              name: entry.name,
              extension: '',
              type: 'directory',
              isConfig: false,
            })

            // Recursively scan subdirectory
            await scanRecursive(fullPath, relativeEntryPath)
          } else if (entry.isFile()) {
            const stats = await stat(fullPath)
            const extension = entry.name.includes('.')
              ? entry.name.substring(entry.name.lastIndexOf('.'))
              : ''

            files.push({
              path: relativeEntryPath,
              name: entry.name,
              extension,
              type: 'file',
              size: stats.size,
              lastModified: stats.mtime,
              isConfig: configFiles.has(entry.name),
            })
          }
        }
      }

      await scanRecursive(dirPath)
      return files
    } catch (error) {
      throw new Error(
        `Failed to scan directory: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
)

/**
 * Git status handler using pure Node.js simple-git.
 * Provides maximum performance by running Git operations in the main process.
 *
 * @param projectPath - Absolute path to the Git repository
 * @returns GitStatusResult with all changed files
 * @since 1.0.0
 * @public
 */
electronIpcMain.handle(
  'getGitStatus',
  async (_, projectPath: string): Promise<GitStatusResult> => {
    console.log(`[Git IPC] 🚀 Starting Git status request for: ${projectPath}`)

    try {
      // CRITICAL: Validate this is NOT the IDE directory
      await validateNotIDEDirectory(projectPath)

      console.log(
        `[Git IPC] 📁 Project path validated, initializing simple-git...`
      )

      // Initialize simple-git instance for the project directory
      const git: SimpleGit = simpleGit({
        baseDir: projectPath,
        binary: 'git',
        maxConcurrentProcesses: 6,
        trimmed: false,
      })

      console.log(`[Git IPC] 🔍 Checking if it's a Git repository...`)

      // Check if it's a valid Git repository
      const isRepo = await git.checkIsRepo()
      if (!isRepo) {
        console.log(`[Git IPC] ⚠️  Not a Git repository: ${projectPath}`)
        return {
          files: [],
          totalFiles: 0,
          isRepository: false,
        }
      }

      console.log(`[Git IPC] ✅ Valid Git repository, getting status...`)

      // Get Git status using simple-git
      const status: StatusResult = await git.status()
      console.log(`[Git IPC] 📊 Raw Git status:`, {
        created: status.created?.length || 0,
        deleted: status.deleted?.length || 0,
        modified: status.modified?.length || 0,
        not_added: status.not_added?.length || 0,
        conflicted: status.conflicted?.length || 0,
        staged: status.staged?.length || 0,
        total:
          (status.created?.length || 0) +
          (status.deleted?.length || 0) +
          (status.modified?.length || 0) +
          (status.not_added?.length || 0) +
          (status.conflicted?.length || 0) +
          (status.staged?.length || 0),
      })

      // Convert to our standardized format
      console.log(`[Git IPC] 🔄 Converting Git status to internal format...`)
      const result = convertGitStatus(status)
      console.log(
        `[Git IPC] 🎯 Converted ${result.totalFiles} files:`,
        result.files.map((f) => `${f.path} [${f.simplifiedStatus}]`)
      )

      console.log(`[Git IPC] ✅ Successfully processed Git status`)
      return result
    } catch (error) {
      console.error(`[Git IPC] ❌ Failed to get Git status:`, error)
      console.error(`[Git IPC] ❌ Error details:`, {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        projectPath,
      })
      throw new Error(
        `Failed to get Git status: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
)

/**
 * Git diff handler using pure Node.js simple-git.
 * Shows the diff content for a specific file to display in the diff viewer.
 *
 * @param projectPath - Absolute path to the Git repository
 * @param filePath - Relative path to the file within the repository
 * @param options - Optional diff options (staged, HEAD comparison, etc.)
 * @returns Raw diff content as string
 * @since 1.0.0
 * @public
 */
console.log('[IPC Main] 🔧 Registering getGitDiff handler...')
electronIpcMain.handle(
  'getGitDiff',
  async (
    _,
    projectPath: string,
    filePath: string,
    options?: { staged?: boolean; commit?: string }
  ): Promise<string> => {
    console.log(
      `[Git Diff IPC] 🚀 Starting Git diff request for: ${filePath} in ${projectPath}`
    )

    try {
      // CRITICAL: Validate this is NOT the IDE directory
      await validateNotIDEDirectory(projectPath)

      if (!filePath) {
        console.error(`[Git Diff IPC] ❌ No file path provided`)
        throw new Error('No file path provided')
      }

      console.log(
        `[Git Diff IPC] 📁 Path validated, initializing simple-git for diff...`
      )

      // Initialize simple-git instance for the project directory
      const git: SimpleGit = simpleGit({
        baseDir: projectPath,
        binary: 'git',
        maxConcurrentProcesses: 6,
        trimmed: false,
      })

      console.log(`[Git Diff IPC] 🔍 Checking if it's a Git repository...`)

      // Check if it's a valid Git repository
      const isRepo = await git.checkIsRepo()
      if (!isRepo) {
        console.log(`[Git Diff IPC] ⚠️  Not a Git repository: ${projectPath}`)
        throw new Error('Not a Git repository')
      }

      console.log(
        `[Git Diff IPC] ✅ Valid Git repository, getting diff for: ${filePath}`
      )

      // Check if the file is untracked first
      const status = await git.status()
      const isUntracked = status.not_added.includes(filePath)

      let diffContent = ''

      if (isUntracked) {
        console.log(
          `[Git Diff IPC] 📄 File is untracked, creating synthetic diff`
        )
        // For untracked files, read the file content and create a synthetic diff
        try {
          // Use git.show to read file content from working tree
          const { readFile } = await import('node:fs/promises')
          const { join } = await import('node:path')
          const fullPath = join(projectPath, filePath)
          const fileContent = await readFile(fullPath, 'utf8')

          // Create synthetic diff for untracked file
          const lines = fileContent.split('\n')
          diffContent = `diff --git a/${filePath} b/${filePath}\n`
          diffContent += `new file mode 100644\n`
          diffContent += `index 0000000..${Date.now().toString(16).substr(0, 7)}\n`
          diffContent += `--- /dev/null\n`
          diffContent += `+++ b/${filePath}\n`
          diffContent += `@@ -0,0 +1,${lines.length} @@\n`
          diffContent += lines.map((line) => `+${line}`).join('\n')

          console.log(
            `[Git Diff IPC] ✅ Created synthetic diff for untracked file: ${filePath}`
          )
        } catch (error) {
          console.error(
            `[Git Diff IPC] ❌ Failed to read untracked file: ${filePath}`,
            error
          )
          diffContent = `File: ${filePath}\nError reading untracked file: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      } else {
        // For tracked files, use git.diff()
        const diffArgs: string[] = []

        if (options?.staged) {
          console.log(`[Git Diff IPC] 📋 Getting staged diff`)
          diffArgs.push('--cached', filePath)
        } else if (options?.commit) {
          console.log(
            `[Git Diff IPC] 📜 Getting diff against commit: ${options.commit}`
          )
          diffArgs.push(`${options.commit}..HEAD`, filePath)
        } else {
          console.log(`[Git Diff IPC] 📝 Getting working directory diff`)
          // For working directory changes, don't specify a revision
          // This will show unstaged changes (working tree vs index)
          diffArgs.push(filePath)
        }

        console.log(`[Git Diff IPC] 🔍 Running git diff with args:`, diffArgs)
        diffContent = await git.diff(diffArgs)

        if (!diffContent || diffContent.trim().length === 0) {
          console.log(
            `[Git Diff IPC] ⚠️  No diff content found for tracked file: ${filePath}`
          )
          // For tracked files with no diff, try to show the current content
          try {
            const fileContent = await git.show([`HEAD:${filePath}`])
            if (fileContent) {
              // File exists in HEAD but no changes - show empty diff
              diffContent = `File: ${filePath}\nNo changes detected (file matches HEAD)`
            } else {
              diffContent = `File: ${filePath}\nNo content available`
            }
          } catch {
            console.log(
              `[Git Diff IPC] ℹ️  Could not show file content from HEAD`
            )
            diffContent = `File: ${filePath}\nNo diff content available - file might be binary or deleted`
          }
        }
      }

      console.log(
        `[Git Diff IPC] 📊 Final diff content length: ${diffContent.length} characters`
      )

      console.log(
        `[Git Diff IPC] ✅ Successfully retrieved diff for: ${filePath}`
      )
      return diffContent
    } catch (error) {
      console.error(`[Git Diff IPC] ❌ Failed to get Git diff:`, error)
      console.error(`[Git Diff IPC] ❌ Error details:`, {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        projectPath,
        filePath,
        options,
      })
      throw new Error(
        `Failed to get Git diff: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
)

/**
 * Gets the complete file content for context expansion in diff viewer.
 * Supports both working tree and specific commit versions.
 *
 * @param projectPath - Absolute path to the Git repository
 * @param filePath - Relative path to the file within the repository
 * @param options - Optional parameters for commit or working tree
 * @returns Complete file content as string
 * @since 1.0.0
 * @public
 */
/**
 * Git branches handler using pure Node.js simple-git.
 * Returns all local and remote branches in the repository.
 *
 * @param projectPath - Absolute path to the Git repository
 * @returns Array of branch names with current branch marked
 * @since 1.0.0
 * @public
 */
electronIpcMain.handle(
  'getGitBranches',
  async (
    _,
    projectPath: string
  ): Promise<{
    current: string
    all: string[]
    local: string[]
    remote: string[]
  }> => {
    console.log(
      `[Git Branches IPC] 🚀 Starting Git branches request for: ${projectPath}`
    )

    try {
      // CRITICAL: Validate this is NOT the IDE directory
      await validateNotIDEDirectory(projectPath)

      console.log(
        `[Git Branches IPC] 📁 Path validated, initializing simple-git for branches...`
      )

      // Initialize simple-git instance for the project directory
      const git: SimpleGit = simpleGit({
        baseDir: projectPath,
        binary: 'git',
        maxConcurrentProcesses: 6,
        trimmed: false,
      })

      console.log(`[Git Branches IPC] 🔍 Checking if it's a Git repository...`)

      // Check if it's a valid Git repository
      const isRepo = await git.checkIsRepo()
      if (!isRepo) {
        console.log(
          `[Git Branches IPC] ⚠️  Not a Git repository: ${projectPath}`
        )
        throw new Error('Not a Git repository')
      }

      console.log(
        `[Git Branches IPC] ✅ Valid Git repository, getting branches...`
      )

      // Get all branches
      const branchSummary = await git.branchLocal()
      const remoteBranches = await git.branch(['-r'])

      const localBranches = Object.keys(branchSummary.branches)
      const remoteBranchNames = Object.keys(remoteBranches.branches)
        .filter((branch) => !branch.includes('HEAD'))
        .map((branch) => branch.replace('origin/', ''))

      // Get all unique branch names
      const allBranches = Array.from(
        new Set([...localBranches, ...remoteBranchNames])
      )

      const result = {
        current: branchSummary.current,
        all: allBranches,
        local: localBranches,
        remote: remoteBranchNames,
      }

      console.log(`[Git Branches IPC] 📊 Found branches:`, {
        current: result.current,
        local: result.local.length,
        remote: result.remote.length,
        total: result.all.length,
      })

      console.log(`[Git Branches IPC] ✅ Successfully retrieved branches`)
      return result
    } catch (error) {
      console.error(`[Git Branches IPC] ❌ Failed to get Git branches:`, error)
      console.error(`[Git Branches IPC] ❌ Error details:`, {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        projectPath,
      })
      throw new Error(
        `Failed to get Git branches: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
)

// Git branch switching handler
electronIpcMain.handle(
  'switchGitBranch',
  async (
    _,
    projectPath: string,
    branchName: string
  ): Promise<{ success: boolean; currentBranch: string; message: string }> => {
    console.log(
      `[Git Switch IPC] 🚀 Starting Git branch switch to: ${branchName} in ${projectPath}`
    )

    let currentBranch = ''

    try {
      // CRITICAL: Validate this is NOT the IDE directory
      await validateNotIDEDirectory(projectPath)

      if (!branchName) {
        console.error(`[Git Switch IPC] ❌ No branch name provided`)
        throw new Error('No branch name provided')
      }

      console.log(
        `[Git Switch IPC] 📁 Path validated, initializing simple-git for switch...`
      )

      // Initialize simple-git instance for the project directory
      const git: SimpleGit = simpleGit({
        baseDir: projectPath,
        binary: 'git',
        maxConcurrentProcesses: 6,
        trimmed: false,
      })

      console.log(`[Git Switch IPC] 🔍 Checking if it's a Git repository...`)

      // Check if it's a valid Git repository
      const isRepo = await git.checkIsRepo()
      if (!isRepo) {
        console.log(`[Git Switch IPC] ⚠️  Not a Git repository: ${projectPath}`)
        throw new Error('Not a Git repository')
      }

      console.log(
        `[Git Switch IPC] ✅ Valid Git repository, checking branches...`
      )

      // Get current branch info
      const branchSummary = await git.branchLocal()
      currentBranch = branchSummary.current

      // Check if we're already on the target branch
      if (currentBranch === branchName) {
        console.log(
          `[Git Switch IPC] ✅ Already on branch: ${branchName}, no switch needed`
        )
        return {
          success: true,
          currentBranch: branchName,
          message: `Already on branch '${branchName}'`,
        }
      }

      // Check if branch exists locally
      const localBranches = Object.keys(branchSummary.branches)
      const branchExistsLocally = localBranches.includes(branchName)

      console.log(
        `[Git Switch IPC] 🔄 Switching from '${currentBranch}' to '${branchName}'...`
      )

      // Check for uncommitted changes
      const status = await git.status()
      const hasChanges = status.files.length > 0

      if (hasChanges) {
        console.warn(
          `[Git Switch IPC] ⚠️  Uncommitted changes detected, attempting checkout anyway`
        )
        // Let Git handle the checkout - it will fail safely if there are conflicts
      }

      if (!branchExistsLocally) {
        console.log(
          `[Git Switch IPC] 📡 Branch '${branchName}' not found locally, checking remote branches...`
        )

        // Check remote branches
        const remoteBranches = await git.branch(['-r'])
        const remoteBranchName = `origin/${branchName}`
        const branchExistsRemotely = Object.keys(
          remoteBranches.branches
        ).includes(remoteBranchName)

        if (branchExistsRemotely) {
          console.log(
            `[Git Switch IPC] 🌐 Found remote branch: ${remoteBranchName}`
          )
          console.log(
            `[Git Switch IPC] 📥 Fetching remote branch and creating local tracking branch...`
          )

          // Fetch the specific remote branch
          await git.fetch(['origin', branchName])

          // Create and checkout new local branch tracking the remote
          console.log(
            `[Git Switch IPC] 🔗 Creating local tracking branch '${branchName}' from '${remoteBranchName}'`
          )
          await git.checkoutBranch(branchName, remoteBranchName)
        } else {
          console.error(
            `[Git Switch IPC] ❌ Branch '${branchName}' does not exist locally or remotely`
          )
          throw new Error(
            `Branch '${branchName}' does not exist locally or remotely`
          )
        }
      } else {
        console.log(
          `[Git Switch IPC] 📁 Branch exists locally, performing standard checkout...`
        )
        // Perform standard checkout for existing local branch
        await git.checkout(branchName)
      }

      // Verify the checkout was successful
      const newBranchSummary = await git.branchLocal()
      const newCurrentBranch = newBranchSummary.current

      if (newCurrentBranch !== branchName) {
        throw new Error(
          `Branch switch failed: expected '${branchName}', but current branch is '${newCurrentBranch}'`
        )
      }

      console.log(
        `[Git Switch IPC] ✅ Successfully switched to branch: ${branchName}`
      )

      return {
        success: true,
        currentBranch: branchName,
        message: `Successfully switched to branch '${branchName}'`,
      }
    } catch (error) {
      console.error(`[Git Switch IPC] ❌ Failed to switch Git branch:`, error)
      console.error(`[Git Switch IPC] ❌ Error details:`, {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        projectPath,
        branchName,
      })

      // Parse Git error for enhanced user experience
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      const gitError = parseGitSwitchError(errorMessage)

      return {
        success: false,
        currentBranch: currentBranch,
        message: gitError.userMessage,
        errorType: gitError.type,
        affectedFiles: gitError.affectedFiles,
        suggestions: gitError.suggestions,
        canForce: gitError.canForce,
        rawError: errorMessage,
      }
    }
  }
)

/**
 * Creates a new Git branch and checks it out.
 *
 * @remarks
 * Creates a new branch from the specified base branch and checks it out immediately.
 * Validates branch names before creation and handles common Git errors.
 *
 * @param projectPath - The path to the Git repository
 * @param branchName - The name for the new branch
 * @param baseBranch - The branch to create from (defaults to current branch)
 * @returns Result of the branch creation operation
 *
 * @public
 * @since 1.0.0
 */
electronIpcMain.handle(
  'git-create-branch',
  async (
    _,
    projectPath: string,
    branchName: string,
    baseBranch?: string
  ): Promise<{
    success: boolean
    currentBranch: string
    message: string
    errorType?: string
  }> => {
    console.log(
      `[Git Create Branch IPC] 🚀 Starting branch creation: ${branchName} from ${baseBranch || 'current'} in ${projectPath}`
    )

    try {
      // Validate project path
      if (!projectPath || typeof projectPath !== 'string') {
        throw new Error('Invalid project path: must be a non-empty string')
      }

      // Sanitize and validate path
      const validatedPath = resolve(projectPath)

      // Verify path exists and is a directory
      try {
        const stats = await stat(validatedPath)
        if (!stats.isDirectory()) {
          throw new Error('Project path must be a directory')
        }
      } catch (error) {
        throw new Error(`Project path not accessible: ${error}`)
      }

      console.log(
        `[Git Create Branch IPC] 📁 Path validated, initializing simple-git...`
      )

      // Initialize git
      const git = simpleGit(validatedPath)

      // Check if it's a git repository
      console.log(
        `[Git Create Branch IPC] 🔍 Checking if it's a Git repository...`
      )
      const isRepo = await git.checkIsRepo()
      if (!isRepo) {
        throw new Error('Not a Git repository')
      }

      console.log(
        `[Git Create Branch IPC] ✅ Valid Git repository, checking branches...`
      )

      // Get current branch info
      const branchSummary = await git.branchLocal()
      const currentBranch = branchSummary.current
      const localBranches = Object.keys(branchSummary.branches)

      // Check if branch already exists
      if (localBranches.includes(branchName)) {
        console.log(
          `[Git Create Branch IPC] ⚠️ Branch already exists: ${branchName}`
        )
        return {
          success: false,
          currentBranch: currentBranch,
          message: `Branch '${branchName}' already exists`,
          errorType: 'BRANCH_EXISTS',
        }
      }

      // Determine base branch
      const actualBaseBranch = baseBranch || currentBranch

      // Check if base branch exists
      if (!localBranches.includes(actualBaseBranch)) {
        // Try to fetch the branch from remote
        console.log(
          `[Git Create Branch IPC] 📥 Base branch '${actualBaseBranch}' not found locally, checking remote...`
        )

        try {
          // Check remote branches
          const remoteBranches = await git.branch(['-r'])
          const remoteBranchNames = Object.keys(remoteBranches.branches)
            .filter((branch) => !branch.includes('HEAD'))
            .map((branch) => branch.replace('origin/', ''))

          if (!remoteBranchNames.includes(actualBaseBranch)) {
            throw new Error(`Base branch '${actualBaseBranch}' does not exist`)
          }

          // Fetch and checkout the remote branch first
          await git.fetch('origin', actualBaseBranch)
          await git.checkout([
            '-b',
            actualBaseBranch,
            `origin/${actualBaseBranch}`,
          ])
        } catch (fetchError) {
          console.error(
            `[Git Create Branch IPC] ❌ Failed to fetch base branch:`,
            fetchError
          )
          return {
            success: false,
            currentBranch: currentBranch,
            message: `Base branch '${actualBaseBranch}' does not exist`,
            errorType: 'BASE_BRANCH_NOT_FOUND',
          }
        }
      }

      // Create and checkout the new branch
      console.log(
        `[Git Create Branch IPC] 🔄 Creating branch '${branchName}' from '${actualBaseBranch}'...`
      )

      // First, ensure we're on the base branch
      if (currentBranch !== actualBaseBranch) {
        await git.checkout(actualBaseBranch)
      }

      // Create and checkout the new branch
      await git.checkoutLocalBranch(branchName)

      // Verify the branch was created and checked out
      const newBranchSummary = await git.branchLocal()
      const newCurrentBranch = newBranchSummary.current

      if (newCurrentBranch !== branchName) {
        throw new Error(
          `Branch creation may have failed: expected '${branchName}', but current branch is '${newCurrentBranch}'`
        )
      }

      console.log(
        `[Git Create Branch IPC] ✅ Successfully created and checked out branch: ${branchName}`
      )

      return {
        success: true,
        currentBranch: branchName,
        message: `Successfully created branch '${branchName}' from '${actualBaseBranch}'`,
      }
    } catch (error) {
      console.error(
        `[Git Create Branch IPC] ❌ Failed to create branch:`,
        error
      )

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'

      return {
        success: false,
        currentBranch: '',
        message: errorMessage,
        errorType: 'GIT_ERROR',
      }
    }
  }
)

electronIpcMain.handle(
  'getFileContent',
  async (
    _,
    projectPath: string,
    filePath: string,
    options?: { commit?: string; fromWorkingTree?: boolean }
  ): Promise<string> => {
    console.log(
      `[File Content IPC] 🚀 Starting file content request for: ${filePath} in ${projectPath}`
    )

    try {
      // CRITICAL: Validate this is NOT the IDE directory
      await validateNotIDEDirectory(projectPath)

      if (!filePath) {
        console.error(`[File Content IPC] ❌ No file path provided`)
        throw new Error('No file path provided')
      }

      console.log(
        `[File Content IPC] 📁 Path validated, initializing simple-git for file content...`
      )

      // Initialize simple-git instance for the project directory
      const git: SimpleGit = simpleGit({
        baseDir: projectPath,
        binary: 'git',
        maxConcurrentProcesses: 6,
        trimmed: false,
      })

      console.log(`[File Content IPC] 🔍 Checking if it's a Git repository...`)

      // Check if it's a valid Git repository
      const isRepo = await git.checkIsRepo()
      if (!isRepo) {
        console.log(
          `[File Content IPC] ⚠️  Not a Git repository: ${projectPath}`
        )
        throw new Error('Not a Git repository')
      }

      let fileContent = ''

      if (options?.fromWorkingTree) {
        console.log(
          `[File Content IPC] 📄 Reading from working tree: ${filePath}`
        )
        // Read from working tree (current file system)
        try {
          const { readFile } = await import('node:fs/promises')
          const { join } = await import('node:path')
          const fullPath = join(projectPath, filePath)
          fileContent = await readFile(fullPath, 'utf8')
          console.log(
            `[File Content IPC] ✅ Successfully read from working tree`
          )
        } catch (error) {
          console.error(
            `[File Content IPC] ❌ Failed to read from working tree:`,
            error
          )
          throw new Error(
            `Failed to read file from working tree: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }
      } else {
        // Read from git (HEAD or specific commit)
        const commitRef = options?.commit || 'HEAD'
        console.log(
          `[File Content IPC] 📜 Reading from git commit ${commitRef}: ${filePath}`
        )

        try {
          fileContent = await git.show([`${commitRef}:${filePath}`])
          console.log(
            `[File Content IPC] ✅ Successfully read from git commit ${commitRef}`
          )
        } catch (error) {
          console.error(`[File Content IPC] ❌ Failed to read from git:`, error)
          // If file doesn't exist in the commit, return empty content
          if (
            error instanceof Error &&
            error.message.includes('does not exist')
          ) {
            console.log(
              `[File Content IPC] ℹ️  File doesn't exist in commit ${commitRef}, returning empty content`
            )
            fileContent = ''
          } else {
            throw new Error(
              `Failed to read file from git: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
          }
        }
      }

      console.log(
        `[File Content IPC] 📊 File content length: ${fileContent.length} characters`
      )
      console.log(
        `[File Content IPC] ✅ Successfully retrieved content for: ${filePath}`
      )

      return fileContent
    } catch (error) {
      console.error(`[File Content IPC] ❌ Failed to get file content:`, error)
      console.error(`[File Content IPC] ❌ Error details:`, {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        projectPath,
        filePath,
        options,
      })
      throw new Error(
        `Failed to get file content: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
)

/**
 * Git status handler for branch switching.
 * Gets current branch and file status for branch switch modal.
 *
 * @param projectPath - Absolute path to the Git repository
 * @returns Git status with current branch and file lists
 * @since 1.2.0
 * @public
 */
electronIpcMain.handle('gitStatus', async (_, projectPath: string) => {
  console.log(`[Git Status IPC] 🚀 Getting Git status for: ${projectPath}`)

  try {
    // CRITICAL: Validate this is NOT the IDE directory
    await validateNotIDEDirectory(projectPath)

    const git: SimpleGit = simpleGit({
      baseDir: projectPath,
      binary: 'git',
      maxConcurrentProcesses: 6,
      trimmed: false,
    })

    const isRepo = await git.checkIsRepo()
    if (!isRepo) {
      return {
        success: false,
        message: 'Not a Git repository',
      }
    }

    const status = await git.status()
    const currentBranch = status.current

    // Separate modified and untracked files
    const modifiedFiles = [
      ...status.modified,
      ...status.staged,
      ...status.deleted,
    ]
    const untrackedFiles = status.not_added

    console.log(`[Git Status IPC] ✅ Status retrieved:`, {
      currentBranch,
      modifiedFiles: modifiedFiles.length,
      untrackedFiles: untrackedFiles.length,
    })

    return {
      success: true,
      currentBranch,
      modifiedFiles,
      untrackedFiles,
    }
  } catch (error) {
    console.error(`[Git Status IPC] ❌ Failed to get Git status:`, error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
})

/**
 * Git checkout branch handler.
 * Switches to the specified branch.
 *
 * @param projectPath - Absolute path to the Git repository
 * @param branchName - Name of the target branch
 * @returns Success status and current branch
 * @since 1.2.0
 * @public
 */
electronIpcMain.handle(
  'gitCheckoutBranch',
  async (_, projectPath: string, branchName: string) => {
    console.log(`[Git Checkout IPC] 🚀 Switching to branch: ${branchName}`)

    try {
      // CRITICAL: Validate this is NOT the IDE directory
      await validateNotIDEDirectory(projectPath)

      if (!branchName) {
        throw new Error('Branch name is required')
      }

      const git: SimpleGit = simpleGit({
        baseDir: projectPath,
        binary: 'git',
        maxConcurrentProcesses: 6,
        trimmed: false,
      })

      await git.checkout(branchName)
      const status = await git.status()

      console.log(`[Git Checkout IPC] ✅ Switched to branch: ${status.current}`)

      return {
        success: true,
        currentBranch: status.current,
      }
    } catch (error) {
      console.error(`[Git Checkout IPC] ❌ Failed to checkout branch:`, error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
)

/**
 * Git stash handler.
 * Creates a new stash with the specified message.
 *
 * @param projectPath - Absolute path to the Git repository
 * @param message - Stash message
 * @returns Success status and stash reference
 * @since 1.2.0
 * @public
 */
electronIpcMain.handle(
  'gitStash',
  async (_, projectPath: string, message: string) => {
    console.log(`[Git Stash IPC] 🚀 Creating stash: ${message}`)

    try {
      // CRITICAL: Validate this is NOT the IDE directory
      await validateNotIDEDirectory(projectPath)

      if (!message) {
        throw new Error('Message is required')
      }

      const git: SimpleGit = simpleGit({
        baseDir: projectPath,
        binary: 'git',
        maxConcurrentProcesses: 6,
        trimmed: false,
      })

      // Create stash with message (including untracked files)
      await git.stash(['push', '-u', '-m', message])

      // Get the stash reference (most recent)
      const stashList = await git.stashList()
      console.log(`[Git Stash IPC] 📊 Stash list after creation:`, stashList)

      // The stash we just created should always be at index 0
      // simple-git's stashList doesn't always have reliable index property
      const stashRef = 'stash@{0}'

      console.log(`[Git Stash IPC] ✅ Stash created: ${stashRef}`)

      return {
        success: true,
        stashRef,
        message: `Stash created: ${message}`,
      }
    } catch (error) {
      console.error(`[Git Stash IPC] ❌ Failed to create stash:`, error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
)

/**
 * Git stash pop handler.
 * Applies and removes the specified stash.
 *
 * @param projectPath - Absolute path to the Git repository
 * @param stashRef - Stash reference (e.g., 'stash@{0}')
 * @returns Success status and message
 * @since 1.2.0
 * @public
 */
electronIpcMain.handle(
  'gitStashPop',
  async (_, projectPath: string, stashRef: string) => {
    console.log(`[Git Stash Pop IPC] 🚀 Popping stash: ${stashRef}`)

    try {
      // CRITICAL: Validate this is NOT the IDE directory
      await validateNotIDEDirectory(projectPath)

      if (!stashRef) {
        throw new Error('Stash reference is required')
      }

      const git: SimpleGit = simpleGit({
        baseDir: projectPath,
        binary: 'git',
        maxConcurrentProcesses: 6,
        trimmed: false,
      })

      // Pop the specific stash
      await git.stash(['pop', stashRef])

      console.log(`[Git Stash Pop IPC] ✅ Stash popped: ${stashRef}`)

      return {
        success: true,
        message: `Stash applied and removed: ${stashRef}`,
      }
    } catch (error) {
      console.error(`[Git Stash Pop IPC] ❌ Failed to pop stash:`, error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
)

/**
 * Git stash list handler.
 * Returns all available stashes in the repository.
 *
 * @param projectPath - Absolute path to the Git repository
 * @returns Array of stash entries
 * @since 1.2.0
 * @public
 */
electronIpcMain.handle('gitStashList', async (_, projectPath: string) => {
  console.log(`[Git Stash List IPC] 🚀 Listing stashes for: ${projectPath}`)

  try {
    // CRITICAL: Validate this is NOT the IDE directory
    await validateNotIDEDirectory(projectPath)

    const git: SimpleGit = simpleGit({
      baseDir: projectPath,
      binary: 'git',
      maxConcurrentProcesses: 6,
      trimmed: false,
    })

    const stashList = await git.stashList()

    const stashes = stashList.all.map((stash) => ({
      ref: `stash@{${stash.index}}`,
      message: stash.message,
      branch: stash.refs || 'unknown',
      timestamp: new Date(stash.date),
      files: [], // We'll populate this if needed
    }))

    console.log(`[Git Stash List IPC] ✅ Found ${stashes.length} stashes`)

    return stashes
  } catch (error) {
    console.error(`[Git Stash List IPC] ❌ Failed to list stashes:`, error)
    throw new Error(
      `Failed to list stashes: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
})

/**
 * Git stash drop handler.
 * Permanently removes the specified stash.
 *
 * @param projectPath - Absolute path to the Git repository
 * @param stashRef - Stash reference to drop
 * @returns Success status and message
 * @since 1.2.0
 * @public
 */
electronIpcMain.handle(
  'gitStashDrop',
  async (_, projectPath: string, stashRef: string) => {
    console.log(`[Git Stash Drop IPC] 🚀 Dropping stash: ${stashRef}`)

    try {
      // CRITICAL: Validate this is NOT the IDE directory
      await validateNotIDEDirectory(projectPath)

      if (!stashRef) {
        throw new Error('Stash reference is required')
      }

      const git: SimpleGit = simpleGit({
        baseDir: projectPath,
        binary: 'git',
        maxConcurrentProcesses: 6,
        trimmed: false,
      })

      // Drop the specific stash
      await git.stash(['drop', stashRef])

      console.log(`[Git Stash Drop IPC] ✅ Stash dropped: ${stashRef}`)

      return {
        success: true,
        message: `Stash removed: ${stashRef}`,
      }
    } catch (error) {
      console.error(`[Git Stash Drop IPC] ❌ Failed to drop stash:`, error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
)

/**
 * Git create branch handler.
 * Creates a new branch from a specified base branch.
 *
 * @param projectPath - Absolute path to the Git repository
 * @param branchName - Name of the new branch to create
 * @param baseBranch - Base branch to create from (optional, defaults to current branch)
 * @returns Success status and message
 * @since 1.2.0
 * @public
 */
electronIpcMain.handle(
  'gitCreateBranch',
  async (_, projectPath: string, branchName: string, baseBranch?: string) => {
    console.log(
      `[Git Create Branch IPC] 🚀 Creating branch: ${branchName} from ${baseBranch || 'current'}`
    )

    try {
      // CRITICAL: Validate this is NOT the IDE directory
      await validateNotIDEDirectory(projectPath)

      if (!branchName) {
        throw new Error('Branch name is required')
      }

      const git: SimpleGit = simpleGit({
        baseDir: projectPath,
        binary: 'git',
        maxConcurrentProcesses: 6,
        trimmed: false,
      })

      // If baseBranch is specified, checkout from it first
      if (baseBranch) {
        try {
          // Check if the base branch exists
          const branches = await git.branch()
          if (!branches.all.includes(baseBranch)) {
            throw new Error(`Base branch '${baseBranch}' does not exist`)
          }

          // Checkout the base branch first
          await git.checkout(baseBranch)
          console.log(
            `[Git Create Branch IPC] ✅ Checked out base branch: ${baseBranch}`
          )
        } catch (error) {
          console.error(
            `[Git Create Branch IPC] ❌ Failed to checkout base branch:`,
            error
          )
          throw new Error(
            `Failed to checkout base branch: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }
      }

      // Create and checkout the new branch
      await git.checkoutLocalBranch(branchName)

      console.log(
        `[Git Create Branch IPC] ✅ Branch created and checked out: ${branchName}`
      )

      return {
        success: true,
        message: `Successfully created and switched to branch: ${branchName}`,
        branch: branchName,
      }
    } catch (error) {
      console.error(
        `[Git Create Branch IPC] ❌ Failed to create branch:`,
        error
      )
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'

      // Provide more specific error messages
      if (errorMessage.includes('already exists')) {
        return {
          success: false,
          error: `Branch '${branchName}' already exists. Please choose a different name.`,
          message: `Branch '${branchName}' already exists`,
        }
      }

      return {
        success: false,
        error: errorMessage,
        message: `Failed to create branch: ${errorMessage}`,
      }
    }
  }
)

/**
 * Git stash show handler.
 * Shows the diff for a specific stash.
 *
 * @param projectPath - Absolute path to the Git repository
 * @param stashRef - Stash reference to show
 * @returns Stash diff content
 * @since 1.2.0
 * @public
 */
electronIpcMain.handle(
  'gitStashShow',
  async (_, projectPath: string, stashRef: string) => {
    console.log(`[Git Stash Show IPC] 🚀 Showing stash: ${stashRef}`)

    try {
      // CRITICAL: Validate this is NOT the IDE directory
      await validateNotIDEDirectory(projectPath)

      if (!stashRef) {
        throw new Error('Stash reference is required')
      }

      const git: SimpleGit = simpleGit({
        baseDir: projectPath,
        binary: 'git',
        maxConcurrentProcesses: 6,
        trimmed: false,
      })

      // Show the stash diff
      const diff = await git.stash(['show', '-p', stashRef])

      console.log(
        `[Git Stash Show IPC] ✅ Stash diff retrieved for: ${stashRef}`
      )

      return {
        success: true,
        diff,
      }
    } catch (error) {
      console.error(`[Git Stash Show IPC] ❌ Failed to show stash:`, error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        diff: '',
      }
    }
  }
)

// File watching management
const activeWatchers = new Map<string, FileWatcherWithCleanup>()

/**
 * File watching types for categorizing different kinds of file changes.
 */
type FileChangeEventType =
  | 'git' // Git-related files (.git/, .gitignore, etc.)
  | 'config' // Configuration files (package.json, tsconfig.json, etc.)
  | 'source' // Source code files (.ts, .vue, .js, etc.)
  | 'build' // Build output and temporary files
  | 'dependency' // node_modules, lockfiles
  | 'other' // All other files

/**
 * File change event data passed to renderer process.
 */
interface FileChangeEvent {
  type: FileChangeEventType
  path: string
  changeType: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'
  timestamp: number
}

/**
 * Categorizes a file path into a specific change event type.
 * @param filePath - The file path to categorize
 * @returns The appropriate file change event type
 */
const categorizeFileChange = (filePath: string): FileChangeEventType => {
  const normalizedPath = filePath.toLowerCase()

  // Git-related files
  if (
    normalizedPath.includes('/.git/') ||
    normalizedPath.endsWith('.gitignore') ||
    normalizedPath.endsWith('.gitattributes') ||
    normalizedPath.endsWith('.gitmodules')
  ) {
    return 'git'
  }

  // Configuration files
  if (
    normalizedPath.endsWith('package.json') ||
    normalizedPath.endsWith('tsconfig.json') ||
    normalizedPath.endsWith('vite.config.ts') ||
    normalizedPath.endsWith('vitest.config.ts') ||
    normalizedPath.endsWith('.eslintrc.json') ||
    normalizedPath.endsWith('tailwind.config.js') ||
    normalizedPath.includes('/config/')
  ) {
    return 'config'
  }

  // Source code files
  if (normalizedPath.match(/\.(ts|js|vue|tsx|jsx|css|scss|sass|less)$/)) {
    return 'source'
  }

  // Build and temporary files
  if (
    normalizedPath.includes('/dist/') ||
    normalizedPath.includes('/build/') ||
    normalizedPath.includes('/.nuxt/') ||
    normalizedPath.includes('/.vite/') ||
    normalizedPath.includes('/coverage/') ||
    normalizedPath.endsWith('.log') ||
    normalizedPath.endsWith('.tmp')
  ) {
    return 'build'
  }

  // Dependencies
  if (
    normalizedPath.includes('/node_modules/') ||
    normalizedPath.endsWith('package-lock.json') ||
    normalizedPath.endsWith('pnpm-lock.yaml') ||
    normalizedPath.endsWith('yarn.lock')
  ) {
    return 'dependency'
  }

  return 'other'
}

/**
 * Starts file watching for a project directory.
 * Returns a unique watcher ID for managing the watcher.
 */
electronIpcMain.handle(
  'startFileWatching',
  async (
    event,
    projectPath: string
  ): Promise<{ success: boolean; watcherId: string; message: string }> => {
    console.log(`[File Watch IPC] 🚀 Starting file watcher for: ${projectPath}`)

    try {
      // CRITICAL: Validate this is NOT the IDE directory
      await validateNotIDEDirectory(projectPath)

      // Generate unique watcher ID
      const watcherId = `watcher_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Stop existing watcher if any for this path
      for (const [id, existingWatcher] of activeWatchers.entries()) {
        if (id.includes(projectPath)) {
          console.log(
            `[File Watch IPC] 🔄 Stopping existing watcher for: ${projectPath}`
          )
          existingWatcher.cleanup()
          existingWatcher.watcher.close()
          activeWatchers.delete(id)
        }
      }

      // Create new watcher with optimized configuration to prevent EMFILE errors
      const watcher = chokidar.watch(projectPath, {
        // CRITICAL: Use function-based ignore for Chokidar v4 compatibility
        // This prevents watching build artifacts that cause cyclic events
        ignored: (path: string) => {
          // Normalize path for consistent checking
          const normalizedPath = path.replace(/\\/g, '/')

          // CRITICAL: Ignore build directories that cause infinite loops
          if (normalizedPath.includes('/dist-final/')) return true
          if (normalizedPath.includes('/dist-vite/')) return true
          if (normalizedPath.includes('/dist/')) return true
          if (normalizedPath.includes('/build/')) return true

          // CRITICAL: Ignore ASAR archives (Electron packaged apps)
          if (normalizedPath.endsWith('.asar')) return true
          if (normalizedPath.includes('.asar/')) return true

          // Ignore dependencies
          if (normalizedPath.includes('/node_modules/')) return true

          // Ignore git internal files
          if (normalizedPath.includes('/.git/objects/')) return true
          if (normalizedPath.includes('/.git/refs/')) return true
          if (normalizedPath.includes('/.git/logs/')) return true

          // Ignore build and cache directories
          if (normalizedPath.includes('/coverage/')) return true
          if (normalizedPath.includes('/.vite/')) return true
          if (normalizedPath.includes('/.nuxt/')) return true

          // Ignore lock files and temporary files
          if (normalizedPath.endsWith('/pnpm-lock.yaml')) return true
          if (normalizedPath.endsWith('/package-lock.json')) return true
          if (normalizedPath.endsWith('/yarn.lock')) return true
          if (normalizedPath.endsWith('.log')) return true
          if (normalizedPath.endsWith('.tmp')) return true
          if (normalizedPath.endsWith('.swp')) return true
          if (normalizedPath.endsWith('.swo')) return true
          if (normalizedPath.endsWith('/.DS_Store')) return true
          if (normalizedPath.endsWith('/Thumbs.db')) return true

          return false
        },

        // CRITICAL: Use polling to prevent EMFILE (too many open files) errors
        usePolling: true,
        interval: 1000, // Poll every 1000ms to balance responsiveness vs performance
        binaryInterval: 2000, // Poll binary files less frequently

        // Chokidar options optimized for stability
        persistent: true,
        ignoreInitial: true, // Don't emit events for files that already exist
        followSymlinks: false, // Don't follow symlinks to avoid infinite loops
        depth: 10, // Limit depth to prevent excessive file descriptor usage

        // Performance optimizations
        atomic: true, // Wait for write operations to complete
        alwaysStat: false, // Don't stat files unnecessarily to reduce I/O
        awaitWriteFinish: {
          stabilityThreshold: 300, // Wait longer for file stability
          pollInterval: 100,
        },

        // Additional options to prevent EMFILE
        disableGlobbing: false, // Keep globbing for ignore patterns
        ignorePermissionErrors: true, // Ignore permission errors that could cause crashes
      })

      // Signal coalescence system to group rapid changes
      const pendingSignals = new Map<string, FileChangeEvent>()
      let coalesceTimer: NodeJS.Timeout | null = null
      const COALESCENCE_DELAY = 500 // Group signals within 500ms

      const flushPendingSignals = () => {
        if (pendingSignals.size === 0) return

        const signals = Array.from(pendingSignals.values())
        console.log(
          `[File Watch IPC] 📦 Flushing ${signals.length} coalesced signals`
        )

        // Send batch of signals to renderer
        event.sender.send('file-change-batch', {
          watcherId,
          signals,
          timestamp: Date.now(),
        })

        pendingSignals.clear()
        coalesceTimer = null
      }

      // Set up event handlers with signal coalescence
      const sendFileChangeEvent = (
        changeType: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir',
        filePath: string
      ) => {
        const eventType = categorizeFileChange(filePath)
        const changeEvent: FileChangeEvent = {
          type: eventType,
          path: filePath,
          changeType,
          timestamp: Date.now(),
        }

        // Add to pending signals (overwrites previous signal for same file path)
        // This naturally deduplicates rapid changes to the same file
        pendingSignals.set(filePath, changeEvent)

        console.log(
          `[File Watch IPC] 📄 File change queued: ${changeEvent.type} - ${filePath} (${changeType})`
        )

        // Reset coalescence timer
        if (coalesceTimer) {
          clearTimeout(coalesceTimer)
        }

        // Set new timer to flush signals
        coalesceTimer = setTimeout(flushPendingSignals, COALESCENCE_DELAY)

        // For critical changes, flush immediately
        if (eventType === 'config' || eventType === 'git') {
          console.log(
            `[File Watch IPC] ⚡ Critical change detected, flushing immediately`
          )
          if (coalesceTimer) {
            clearTimeout(coalesceTimer)
          }
          flushPendingSignals()
        }
      }

      watcher
        .on('add', (path) => sendFileChangeEvent('add', path))
        .on('change', (path) => sendFileChangeEvent('change', path))
        .on('unlink', (path) => sendFileChangeEvent('unlink', path))
        .on('addDir', (path) => sendFileChangeEvent('addDir', path))
        .on('unlinkDir', (path) => sendFileChangeEvent('unlinkDir', path))
        .on('error', (error) => {
          console.error(`[File Watch IPC] ❌ Watcher error:`, error)
          event.sender.send('file-watcher-error', {
            watcherId,
            error: error.message,
          })
        })
        .on('ready', () => {
          console.log(
            `[File Watch IPC] ✅ File watcher ready for: ${projectPath}`
          )
        })

      // Store the watcher with cleanup function
      const watcherWithCleanup = {
        watcher,
        cleanup: () => {
          if (coalesceTimer) {
            clearTimeout(coalesceTimer)
            coalesceTimer = null
          }
          // Flush any pending signals before cleanup
          flushPendingSignals()
        },
      }

      activeWatchers.set(watcherId, watcherWithCleanup)

      console.log(
        `[File Watch IPC] ✅ File watcher started with ID: ${watcherId}`
      )

      return {
        success: true,
        watcherId,
        message: `File watching started for: ${projectPath}`,
      }
    } catch (error) {
      console.error(`[File Watch IPC] ❌ Failed to start file watcher:`, error)
      return {
        success: false,
        watcherId: '',
        message: `Failed to start file watching: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }
)

/**
 * Stops file watching for a specific watcher ID.
 */
electronIpcMain.handle(
  'stopFileWatching',
  async (
    _,
    watcherId: string
  ): Promise<{ success: boolean; message: string }> => {
    console.log(`[File Watch IPC] 🛑 Stopping file watcher: ${watcherId}`)

    try {
      const watcherData = activeWatchers.get(watcherId)

      if (!watcherData) {
        console.warn(`[File Watch IPC] ⚠️  Watcher not found: ${watcherId}`)
        return {
          success: false,
          message: `Watcher not found: ${watcherId}`,
        }
      }

      // Call cleanup function and close watcher
      watcherData.cleanup()
      watcherData.watcher.close()
      activeWatchers.delete(watcherId)

      console.log(`[File Watch IPC] ✅ File watcher stopped: ${watcherId}`)

      return {
        success: true,
        message: `File watcher stopped: ${watcherId}`,
      }
    } catch (error) {
      console.error(`[File Watch IPC] ❌ Failed to stop file watcher:`, error)
      return {
        success: false,
        message: `Failed to stop file watcher: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }
)

/**
 * Gets the status of all active file watchers.
 */
electronIpcMain.handle(
  'getFileWatchingStatus',
  async (): Promise<{
    activeWatchers: Array<{ id: string; ready: boolean }>
    totalWatchers: number
  }> => {
    console.log(`[File Watch IPC] 📊 Getting file watcher status`)

    const watcherStatus = Array.from(activeWatchers.entries()).map(
      ([id, watcherData]) => ({
        id,
        ready: watcherData.watcher.getWatched() !== null,
      })
    )

    console.log(`[File Watch IPC] ✅ Active watchers: ${activeWatchers.size}`)

    return {
      activeWatchers: watcherStatus,
      totalWatchers: activeWatchers.size,
    }
  }
)

// Cleanup watchers when the application is closing
app.on('before-quit', () => {
  console.log(
    `[File Watch IPC] 🧹 Cleaning up ${activeWatchers.size} file watchers`
  )
  for (const [id, watcherData] of activeWatchers.entries()) {
    try {
      // Call cleanup function and close watcher
      watcherData.cleanup()
      watcherData.watcher.close()
      console.log(`[File Watch IPC] ✅ Cleaned up watcher: ${id}`)
    } catch (error) {
      console.error(
        `[File Watch IPC] ❌ Error cleaning up watcher ${id}:`,
        error
      )
    }
  }
  activeWatchers.clear()
})

setTimeout(() => {
  ipcMain.send('newUserJoin', 1)
}, 5000)

// Terminal keyboard handler IPC communication
electronIpcMain.on('terminal-step-change', (event, step: string) => {
  console.log(`[Terminal IPC] Received step change from renderer: ${step}`)
  console.log('[Terminal IPC] Calling terminalKeyboardHandler.updateStep...')
  terminalKeyboardHandler.updateStep(
    step as
      | 'welcome'
      | 'project-selection'
      | 'task-selector'
      | 'task-selection'
      | 'branch-creation'
      | 'task-detail'
      | 'transition'
      | 'completed'
  )
})

electronIpcMain.on(
  'terminal-visibility-change',
  (event, isVisible: boolean) => {
    console.log(`[Terminal IPC] Visibility change: ${isVisible}`)
    terminalKeyboardHandler.updateVisibility(isVisible)
  }
)

electronIpcMain.on(
  'terminal-easter-egg-visibility',
  (event, isActuallyVisible: boolean) => {
    console.log(
      `[Terminal IPC] Easter Egg UI visibility change: ${isActuallyVisible}`
    )
    terminalKeyboardHandler.updateEasterEggVisibility(isActuallyVisible)
  }
)
