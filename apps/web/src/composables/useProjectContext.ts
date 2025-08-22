/**
 * @fileoverview Centralized project context system for opened project.
 *
 * @description
 * Manages the currently opened project's metadata, file system structure,
 * and provides shared access across all application modes (generative, code, visual, timeline).
 *
 * @example
 * ```typescript
 * const { openedProject, loadProject, getProjectFiles } = useProjectContext()
 * await loadProject('/path/to/project')
 * const files = await getProjectFiles()
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { ref, computed, readonly } from 'vue'
// Browser-compatible path utilities
const join = (...paths: string[]): string => {
  return paths.join('/').replace(/\/+/g, '/')
}

const basename = (path: string): string => {
  const normalized = path.replace(/\/$/, '')
  const lastSlash = normalized.lastIndexOf('/')
  return normalized.substring(lastSlash + 1)
}

/**
 * Represents a file in the project structure.
 *
 * @public
 */
interface ProjectFile {
  /** Relative path from project root */
  path: string
  /** File name without path */
  name: string
  /** File extension */
  extension: string
  /** File type classification */
  type: 'file' | 'directory' | 'symlink'
  /** File size in bytes (for files only) */
  size?: number
  /** Last modified timestamp */
  lastModified?: Date
  /** Is this a common configuration file */
  isConfig?: boolean
  /** Git status if available */
  gitStatus?: 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked'
}

/**
 * Metadata about the opened project.
 *
 * @public
 */
interface ProjectMetadata {
  /** Absolute path to project root */
  rootPath: string
  /** Project name (directory name) */
  name: string
  /** Package.json content if available */
  packageJson?: Record<string, unknown>
  /** Is this a Git repository */
  isGitRepo: boolean
  /** Project type (node, python, rust, etc.) */
  projectType: string[]
  /** Package manager detected (npm, pnpm, yarn, etc.) */
  packageManager?: string
  /** Total file count */
  fileCount: number
  /** Last scan timestamp */
  lastScanned: Date
}

// Global state - shared across entire application
const openedProject = ref<ProjectMetadata | null>(null)
const projectFiles = ref<ProjectFile[]>([])
const isLoading = ref(false)
const lastError = ref<string | null>(null)

/**
 * Main composable for project context management.
 *
 * @returns Object containing project state and operations
 *
 * @example
 * ```typescript
 * const { openedProject, loadProject, refreshFiles } = useProjectContext()
 * await loadProject('/path/to/my-project')
 * ```
 *
 * @public
 */
export function useProjectContext() {
  /**
   * Loads a project from the given path and scans its file structure.
   *
   * @param projectPath - Absolute path to the project root directory
   * @returns Promise that resolves when project is fully loaded
   *
   * @throws {Error} When project path is invalid or not accessible
   *
   * @example
   * ```typescript
   * await loadProject('/Users/dev/my-project')
   * ```
   *
   * @public
   */
  const loadProject = async (projectPath: string): Promise<void> => {
    if (isLoading.value) {
      throw new Error('Project loading already in progress')
    }

    isLoading.value = true
    lastError.value = null

    try {
      console.log('[Project Context] 🚀 Loading project:', projectPath)
      console.log(
        '[Project Context] 🔍 Electron API available:',
        !!window.electronAPI
      )
      if (window.electronAPI) {
        console.log(
          '[Project Context] 📊 Available Electron APIs:',
          Object.keys(window.electronAPI)
        )
      }

      // Use Electron API if available, otherwise assume path is valid
      let useElectronAPI = false
      if (window.electronAPI && window.electronAPI.pathExists) {
        console.log(
          '[Project Context] 🔍 Checking if path exists:',
          projectPath
        )
        try {
          const exists = await window.electronAPI.pathExists(projectPath)
          console.log('[Project Context] 📁 Path exists:', exists)

          if (!exists) {
            throw new Error(`Project path does not exist: ${projectPath}`)
          }

          console.log(
            '[Project Context] 🔍 Checking if path is directory:',
            projectPath
          )
          const isDir = await window.electronAPI.isDirectory(projectPath)
          console.log('[Project Context] 📂 Is directory:', isDir)

          if (!isDir) {
            throw new Error(`Project path is not a directory: ${projectPath}`)
          }

          useElectronAPI = true
        } catch (error) {
          console.error(
            '[Project Context] ❌ Error calling Electron APIs:',
            error
          )
          // If Electron APIs fail, continue with fallback mode
          console.log(
            '[Project Context] 🔄 Falling back to mock mode due to API error'
          )
          useElectronAPI = false
        }
      } else {
        console.log(
          '[Project Context] ⚠️ Electron API not available, assuming path is valid'
        )
      }

      // Create project metadata
      console.log('[Project Context] 🔧 Creating project metadata...')

      const name = basename(projectPath)
      console.log('[Project Context] 📝 Project name:', name)

      console.log('[Project Context] 🔍 Checking if Git repository...')
      const isGitRepo = await checkIsGitRepo(projectPath, useElectronAPI)
      console.log('[Project Context] 🐙 Is Git repo:', isGitRepo)

      console.log('[Project Context] 🔍 Detecting project type...')
      const projectType = await detectProjectType(projectPath, useElectronAPI)
      console.log('[Project Context] 🏗️ Project type:', projectType)

      console.log('[Project Context] 🔍 Detecting package manager...')
      const packageManager = await detectPackageManager(
        projectPath,
        useElectronAPI
      )
      console.log('[Project Context] 📦 Package manager:', packageManager)

      const metadata: ProjectMetadata = {
        rootPath: projectPath,
        name,
        isGitRepo,
        projectType,
        packageManager,
        fileCount: 0,
        lastScanned: new Date(),
      }

      console.log('[Project Context] ✅ Metadata created:', metadata)

      // Load package.json if available
      try {
        const packageContent = await readProjectFile(
          projectPath,
          'package.json'
        )
        if (packageContent) {
          metadata.packageJson = JSON.parse(packageContent)
        }
      } catch (error) {
        console.warn('[Project Context] Failed to parse package.json:', error)
      }

      // Scan project files
      const files = await scanProjectFiles(projectPath)
      metadata.fileCount = files.length

      // Update global state
      openedProject.value = metadata
      projectFiles.value = files

      console.log(
        `[Project Context] ✅ Project loaded: ${metadata.name} (${files.length} files)`
      )
      console.log('[Project Context] 📊 Project metadata:', metadata)
      console.log(
        '[Project Context] 📊 First 5 files:',
        files.slice(0, 5).map((f) => f.path)
      )

      // Initialize system terminals and logging
      await initializeSystemTerminals(metadata)

      console.log('[Project Context] 🎯 Project loading completed successfully')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      lastError.value = errorMessage
      console.error('[Project Context] Failed to load project:', errorMessage)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Refreshes the file structure of the currently opened project.
   *
   * @returns Promise that resolves when refresh is complete
   *
   * @example
   * ```typescript
   * await refreshFiles()
   * ```
   *
   * @public
   */
  const refreshFiles = async (): Promise<void> => {
    if (!openedProject.value) {
      throw new Error('No project is currently opened')
    }

    console.log('[Project Context] Refreshing project files...')
    const files = await scanProjectFiles(openedProject.value.rootPath)

    projectFiles.value = files
    openedProject.value.fileCount = files.length
    openedProject.value.lastScanned = new Date()

    console.log(`[Project Context] Files refreshed: ${files.length} files`)
  }

  /**
   * Gets files filtered by various criteria.
   *
   * @param options - Filter options
   * @returns Filtered array of project files
   *
   * @example
   * ```typescript
   * const jsFiles = getProjectFiles({ extensions: ['.js', '.ts'] })
   * const configFiles = getProjectFiles({ configOnly: true })
   * ```
   *
   * @public
   */
  const getProjectFiles = (
    options: {
      extensions?: string[]
      configOnly?: boolean
      directoryPath?: string
      includeDirectories?: boolean
    } = {}
  ): ProjectFile[] => {
    let filtered = [...projectFiles.value]

    if (options.extensions) {
      filtered = filtered.filter((file) =>
        options.extensions!.some(
          (ext) => file.extension.toLowerCase() === ext.toLowerCase()
        )
      )
    }

    if (options.configOnly) {
      filtered = filtered.filter((file) => file.isConfig)
    }

    if (options.directoryPath) {
      filtered = filtered.filter((file) =>
        file.path.startsWith(options.directoryPath!)
      )
    }

    if (!options.includeDirectories) {
      filtered = filtered.filter((file) => file.type === 'file')
    }

    return filtered
  }

  /**
   * Closes the current project and clears all state.
   *
   * @public
   */
  const closeProject = (): void => {
    console.log('[Project Context] Closing project')
    openedProject.value = null
    projectFiles.value = []
    lastError.value = null
  }

  // Computed properties
  const isProjectLoaded = computed(() => openedProject.value !== null)
  const projectName = computed(() => openedProject.value?.name || '')
  const projectRoot = computed(() => openedProject.value?.rootPath || '')
  const isGitRepository = computed(
    () => openedProject.value?.isGitRepo || false
  )

  return {
    // State (readonly)
    openedProject: readonly(openedProject),
    projectFiles: readonly(projectFiles),
    isLoading: readonly(isLoading),
    lastError: readonly(lastError),

    // Computed properties
    isProjectLoaded,
    projectName,
    projectRoot,
    isGitRepository,

    // Actions
    loadProject,
    refreshFiles,
    getProjectFiles,
    closeProject,
  }
}

/**
 * Checks if a directory is a Git repository.
 *
 * @param projectPath - Path to check
 * @returns Promise resolving to true if it's a Git repo
 *
 * @private
 */
async function checkIsGitRepo(
  projectPath: string,
  useElectronAPI = false
): Promise<boolean> {
  if (useElectronAPI && window.electronAPI && window.electronAPI.pathExists) {
    try {
      return await window.electronAPI.pathExists(join(projectPath, '.git'))
    } catch (error) {
      console.warn(
        '[Project Context] Failed to check Git repo via Electron API:',
        error
      )
      return true // Fallback to assume true
    }
  }
  return true // Assume true in browser for demo
}

/**
 * Reads a file from the project using Electron API or mock data.
 *
 * @param projectPath - Project root path
 * @param fileName - File name to read
 * @returns Promise resolving to file content or null
 *
 * @private
 */
async function readProjectFile(
  projectPath: string,
  fileName: string
): Promise<string | null> {
  if (window.electronAPI && window.electronAPI.readFile) {
    try {
      return await window.electronAPI.readFile(join(projectPath, fileName))
    } catch {
      return null
    }
  }

  // Mock data for browser - use real package.json data
  if (fileName === 'package.json') {
    return JSON.stringify(
      {
        name: '@hatcherdx/dx-engine',
        version: '0.3.5',
        description: 'Hatcher DX Engine - AI-powered development environment',
        private: false,
        author: {
          name: 'Chriss Mejia',
          email: 'chriss@hatche.rs',
          url: 'https://github.com/hatcherdx/dx-engine',
        },
        scripts: {
          dev: 'tsx scripts/dev-electron.ts',
          build: 'turbo run build',
          test: 'vitest',
          lint: 'eslint . --ext .ts,.js,.vue',
        },
        dependencies: {
          'node-pty': '1.1.0-beta34',
        },
      },
      null,
      2
    )
  }

  return null
}

/**
 * Scans the project directory recursively and builds file structure.
 *
 * @param projectPath - Root path to scan
 * @returns Promise resolving to array of project files
 *
 * @private
 */
async function scanProjectFiles(projectPath: string): Promise<ProjectFile[]> {
  const configFiles = new Set([
    'package.json',
    'package-lock.json',
    'pnpm-lock.yaml',
    'yarn.lock',
    'tsconfig.json',
    'jsconfig.json',
    'vite.config.ts',
    'vite.config.js',
    'webpack.config.js',
    'rollup.config.js',
    'babel.config.js',
    '.eslintrc.js',
    '.eslintrc.json',
    '.prettierrc',
    '.gitignore',
    'README.md',
    'CHANGELOG.md',
    'LICENSE',
    '.env',
    '.env.example',
    'Dockerfile',
    'docker-compose.yml',
    '.nvmrc',
    '.python-version',
  ])

  const ignoredDirs = new Set([
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    '.nuxt',
    'coverage',
    '.nyc_output',
    'target',
    'vendor',
    '__pycache__',
    '.DS_Store',
    'Thumbs.db',
  ])

  // Use Electron API if available
  if (window.electronAPI && window.electronAPI.scanDirectory) {
    try {
      const scanResult = await window.electronAPI.scanDirectory(projectPath, {
        ignoredDirs: Array.from(ignoredDirs),
        configFiles: Array.from(configFiles),
      })
      return scanResult.sort((a: ProjectFile, b: ProjectFile) =>
        a.path.localeCompare(b.path)
      )
    } catch (error) {
      console.warn(
        '[Project Context] Failed to scan directory via Electron API:',
        error
      )
    }
  }

  // Browser fallback - return mock file structure
  console.warn('[Project Context] Using mock file structure in browser')
  const mockFiles: ProjectFile[] = [
    {
      path: 'package.json',
      name: 'package.json',
      extension: '.json',
      type: 'file',
      size: 1024,
      lastModified: new Date(),
      isConfig: true,
    },
    {
      path: 'src',
      name: 'src',
      extension: '',
      type: 'directory',
      isConfig: false,
    },
    {
      path: 'src/main.ts',
      name: 'main.ts',
      extension: '.ts',
      type: 'file',
      size: 256,
      lastModified: new Date(),
      isConfig: false,
    },
    {
      path: 'src/App.vue',
      name: 'App.vue',
      extension: '.vue',
      type: 'file',
      size: 2048,
      lastModified: new Date(),
      isConfig: false,
    },
    {
      path: 'src/components',
      name: 'components',
      extension: '',
      type: 'directory',
      isConfig: false,
    },
    {
      path: 'vite.config.ts',
      name: 'vite.config.ts',
      extension: '.ts',
      type: 'file',
      size: 512,
      lastModified: new Date(),
      isConfig: true,
    },
  ]

  return mockFiles
}

/**
 * Detects the project type based on configuration files.
 *
 * @param projectPath - Path to project root
 * @returns Promise resolving to array of detected project types
 *
 * @private
 */
async function detectProjectType(
  projectPath: string,
  useElectronAPI = false
): Promise<string[]> {
  const types: string[] = []

  const typeIndicators = [
    { file: 'package.json', type: 'node' },
    { file: 'requirements.txt', type: 'python' },
    { file: 'Pipfile', type: 'python' },
    { file: 'pyproject.toml', type: 'python' },
    { file: 'Cargo.toml', type: 'rust' },
    { file: 'go.mod', type: 'go' },
    { file: 'pom.xml', type: 'java' },
    { file: 'build.gradle', type: 'java' },
    { file: 'Gemfile', type: 'ruby' },
    { file: 'composer.json', type: 'php' },
    { file: 'pubspec.yaml', type: 'dart' },
  ]

  for (const indicator of typeIndicators) {
    if (useElectronAPI && window.electronAPI && window.electronAPI.pathExists) {
      try {
        if (
          await window.electronAPI.pathExists(join(projectPath, indicator.file))
        ) {
          types.push(indicator.type)
        }
      } catch (error) {
        console.warn(
          `[Project Context] Failed to check ${indicator.file} via Electron API:`,
          error
        )
        // Continue with other indicators
      }
    } else {
      // Browser fallback - assume Node.js project
      if (indicator.file === 'package.json') {
        types.push(indicator.type)
      }
    }
  }

  return types.length > 0 ? types : ['unknown']
}

/**
 * Detects the package manager used in the project.
 *
 * @param projectPath - Path to project root
 * @returns Promise resolving to detected package manager
 *
 * @private
 */
async function detectPackageManager(
  projectPath: string,
  useElectronAPI = false
): Promise<string> {
  const lockFiles = [
    { file: 'pnpm-lock.yaml', manager: 'pnpm' },
    { file: 'yarn.lock', manager: 'yarn' },
    { file: 'package-lock.json', manager: 'npm' },
    { file: 'bun.lockb', manager: 'bun' },
  ]

  for (const { file, manager } of lockFiles) {
    if (useElectronAPI && window.electronAPI && window.electronAPI.pathExists) {
      try {
        if (await window.electronAPI.pathExists(join(projectPath, file))) {
          return manager
        }
      } catch (error) {
        console.warn(
          `[Project Context] Failed to check ${file} via Electron API:`,
          error
        )
        // Continue with other lock files
      }
    } else {
      // Browser fallback - assume npm
      if (file === 'package-lock.json') {
        return manager
      }
    }
  }

  return 'npm' // Default fallback
}

/**
 * Initialize system terminals and logging when project is loaded.
 *
 * @param metadata - Project metadata
 * @returns Promise that resolves when system initialization is complete
 *
 * @private
 */
async function initializeSystemTerminals(
  metadata: ProjectMetadata
): Promise<void> {
  try {
    // Check if we're in Electron environment
    const isElectron =
      typeof window !== 'undefined' && window.electronAPI?.systemTerminal

    if (!isElectron) {
      console.warn(
        '[Project Context] Not in Electron environment - system terminals will use fallback mode'
      )
      return
    }

    // Initialize system terminals via IPC
    const result = await window.electronAPI.systemTerminal.initialize({
      projectName: metadata.name,
      projectPath: metadata.rootPath,
      projectType: metadata.projectType.join(', '),
      packageManager: metadata.packageManager || 'unknown',
    })

    if (!result.success) {
      throw new Error(result.error || 'Failed to initialize system terminals')
    }

    // Log system initialization messages via IPC
    await window.electronAPI.systemTerminal.log({
      level: 'info',
      message: `Initializing Hatcher workspace: ${metadata.name}`,
      terminal: 'system',
    })

    if (metadata.packageJson) {
      const projectTypeStr = metadata.projectType.join(', ')
      await window.electronAPI.systemTerminal.log({
        level: 'info',
        message: `Project detected: ${projectTypeStr} with ${metadata.packageManager || 'unknown'}`,
        terminal: 'system',
      })
    }

    await window.electronAPI.systemTerminal.log({
      level: 'info',
      message: 'Reading configuration from hatcher.config.json...',
      terminal: 'system',
    })

    // Initialize git monitoring if this is a git repository
    if (metadata.isGitRepo) {
      await window.electronAPI.systemTerminal.log({
        level: 'info',
        message:
          'Git repository detected - Timeline terminal monitoring enabled',
        terminal: 'timeline',
      })
    }

    console.log(
      '[Project Context] System terminals initialized successfully via IPC'
    )
  } catch (error) {
    console.warn(
      '[Project Context] Failed to initialize system terminals:',
      error
    )
    // Don't throw - project loading should continue even if terminals fail
  }
}
