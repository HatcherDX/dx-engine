import { BrowserWindow, dialog, ipcMain as electronIpcMain } from 'electron'
import { join } from 'node:path'
import { readFile, stat, readdir, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import type { MainMessage, RenderMessage } from '@hatcherdx/dx-engine-preload'
import { IPCMain } from '@hatcherdx/dx-engine-preload/main'
import { simpleGit, SimpleGit, StatusResult } from 'simple-git'

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
      // Validate project path exists
      if (!projectPath) {
        console.error(`[Git IPC] ❌ No project path provided`)
        throw new Error('No project path provided')
      }

      console.log(
        `[Git IPC] 📁 Project path exists, initializing simple-git...`
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
      // Validate parameters
      if (!projectPath) {
        console.error(`[Git Diff IPC] ❌ No project path provided`)
        throw new Error('No project path provided')
      }

      if (!filePath) {
        console.error(`[Git Diff IPC] ❌ No file path provided`)
        throw new Error('No file path provided')
      }

      console.log(`[Git Diff IPC] 📁 Initializing simple-git for diff...`)

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
      // Validate parameters
      if (!projectPath) {
        console.error(`[File Content IPC] ❌ No project path provided`)
        throw new Error('No project path provided')
      }

      if (!filePath) {
        console.error(`[File Content IPC] ❌ No file path provided`)
        throw new Error('No file path provided')
      }

      console.log(
        `[File Content IPC] 📁 Initializing simple-git for file content...`
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

setTimeout(() => {
  ipcMain.send('newUserJoin', 1)
}, 5000)
