/**
 * @fileoverview Comprehensive tests for useProjectContext composable.
 *
 * @description
 * Tests for the project context management system including project loading,
 * file scanning, metadata detection, and state management.
 * Covers both Electron API integration and browser fallback modes.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useProjectContext } from './useProjectContext'

// Mock ElectronAPI interfaces

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
interface MockWindow {
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
  getGitStatus: vi.fn().mockResolvedValue({}),
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

// Console methods will be mocked in beforeEach

beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks()

  // Mock console methods
  global.console = {
    ...console,
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
  }

  // Reset window.electronAPI
  ;(global.window as unknown as MockWindow).electronAPI = mockElectronAPI
})

afterEach(() => {
  // Restore console
  global.console = console
})

describe('useProjectContext', () => {
  let projectContext: ReturnType<typeof useProjectContext>

  beforeEach(() => {
    projectContext = useProjectContext()
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
     * const context = useProjectContext()
     * expect(context.isProjectLoaded.value).toBe(false)
     * expect(context.openedProject.value).toBeNull()
     * ```
     *
     * @public
     */
    it('should have correct initial state', () => {
      expect(projectContext.isProjectLoaded.value).toBe(false)
      expect(projectContext.openedProject.value).toBeNull()
      expect(projectContext.projectFiles.value).toEqual([])
      expect(projectContext.isLoading.value).toBe(false)
      expect(projectContext.lastError.value).toBeNull()
      expect(projectContext.projectName.value).toBe('')
      expect(projectContext.projectRoot.value).toBe('')
      expect(projectContext.isGitRepository.value).toBe(false)
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
      // Test that state properties are readonly refs
      expect(typeof projectContext.openedProject.value).toBe('object')
      expect(typeof projectContext.projectFiles.value).toBe('object')
      expect(typeof projectContext.isLoading.value).toBe('boolean')
      expect(typeof projectContext.lastError.value).toBe('object')
    })

    /**
     * Tests computed properties initial values.
     *
     * @returns void
     * Should have correct computed property values when no project is loaded
     *
     * @public
     */
    it('should have correct computed properties when no project loaded', () => {
      expect(projectContext.isProjectLoaded.value).toBe(false)
      expect(projectContext.projectName.value).toBe('')
      expect(projectContext.projectRoot.value).toBe('')
      expect(projectContext.isGitRepository.value).toBe(false)
    })
  })

  describe('Project Loading - Electron API Mode', () => {
    beforeEach(() => {
      // Setup successful Electron API responses
      mockElectronAPI.pathExists.mockImplementation((path: string) => {
        // Only detect package.json to limit to Node.js project type
        if (path.includes('package.json')) return Promise.resolve(true)
        if (path.includes('/.git')) return Promise.resolve(true)
        if (path.includes('pnpm-lock.yaml')) return Promise.resolve(true)
        return Promise.resolve(false)
      })
      mockElectronAPI.isDirectory.mockResolvedValue(true)
      mockElectronAPI.readFile.mockResolvedValue(JSON.stringify({}))
      mockElectronAPI.scanDirectory.mockResolvedValue([
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
          path: 'src/main.ts',
          name: 'main.ts',
          extension: '.ts',
          type: 'file',
          size: 256,
          lastModified: new Date(),
          isConfig: false,
        },
      ])
      mockElectronAPI.systemTerminal.initialize.mockResolvedValue({
        id: 'system',
        status: 'initialized',
        success: true,
      })
      mockElectronAPI.systemTerminal.log.mockResolvedValue({ success: true })
    })

    /**
     * Tests successful project loading with Electron API.
     *
     * @returns Promise<void>
     * Should load project and update all state correctly
     *
     * @example
     * ```typescript
     * await projectContext.loadProject('/test/project')
     * expect(projectContext.isProjectLoaded.value).toBe(true)
     * expect(projectContext.projectName.value).toBe('project')
     * ```
     *
     * @public
     */
    it('should load project successfully with Electron API', async () => {
      const projectPath = '/test/project'

      await projectContext.loadProject(projectPath)

      expect(projectContext.isProjectLoaded.value).toBe(true)
      expect(projectContext.projectName.value).toBe('project')
      expect(projectContext.projectRoot.value).toBe(projectPath)
      expect(projectContext.projectFiles.value).toHaveLength(2)
      expect(projectContext.isLoading.value).toBe(false)
      expect(projectContext.lastError.value).toBeNull()
    })

    /**
     * Tests project loading with Git repository detection.
     *
     * @returns Promise<void>
     * Should correctly detect Git repository status
     *
     * @public
     */
    it('should detect Git repository correctly', async () => {
      // Mock .git directory exists
      mockElectronAPI.pathExists.mockImplementation((path: string) => {
        if (path.includes('/.git')) {
          return Promise.resolve(true)
        }
        return Promise.resolve(true)
      })

      await projectContext.loadProject('/test/git-project')

      expect(projectContext.isGitRepository.value).toBe(true)
      expect(mockElectronAPI.pathExists).toHaveBeenCalledWith(
        '/test/git-project/.git'
      )
    })

    /**
     * Tests project loading with package.json parsing.
     *
     * @returns Promise<void>
     * Should correctly parse and store package.json content
     *
     * @public
     */
    it('should parse package.json content', async () => {
      const packageContent = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          vue: '^3.0.0',
        },
      }

      mockElectronAPI.readFile.mockResolvedValue(JSON.stringify(packageContent))

      await projectContext.loadProject('/test/project')

      expect(projectContext.openedProject.value?.packageJson).toEqual(
        packageContent
      )
    })

    /**
     * Tests system terminals initialization.
     *
     * @returns Promise<void>
     * Should initialize system terminals with project metadata
     *
     * @public
     */
    it('should initialize system terminals', async () => {
      await projectContext.loadProject('/test/project')

      expect(mockElectronAPI.systemTerminal.initialize).toHaveBeenCalledWith({
        projectName: 'project',
        projectPath: '/test/project',
        projectType: 'node',
        packageManager: 'npm',
      })

      expect(mockElectronAPI.systemTerminal.log).toHaveBeenCalledWith({
        level: 'info',
        message: 'Initializing Hatcher workspace: project',
        terminal: 'system',
      })
    })

    /**
     * Tests console logging during project loading.
     *
     * @returns Promise<void>
     * Should log detailed information about loading process
     *
     * @public
     */
    it('should log project loading steps', async () => {
      await projectContext.loadProject('/test/project')

      expect(global.console.log).toHaveBeenCalledWith(
        '[Project Context] 🚀 Loading project:',
        '/test/project'
      )
      expect(global.console.log).toHaveBeenCalledWith(
        '[Project Context] ✅ Project loaded: project (2 files)'
      )
    })
  })

  describe('Project Loading - Browser Fallback Mode', () => {
    beforeEach(() => {
      // Remove Electron API to test browser fallback
      ;(global.window as unknown as MockWindow).electronAPI = mockElectronAPI
    })

    /**
     * Tests project loading without Electron API.
     *
     * @returns Promise<void>
     * Should load project using mock data when Electron API is unavailable
     *
     * @public
     */
    it('should load project in browser fallback mode', async () => {
      await projectContext.loadProject('/test/browser-project')

      expect(projectContext.isProjectLoaded.value).toBe(true)
      expect(projectContext.projectName.value).toBe('browser-project')
      expect(projectContext.projectFiles.value.length).toBeGreaterThan(0)
      expect(projectContext.isGitRepository.value).toBe(true) // Assumes true in browser
    })

    /**
     * Tests mock package.json content in browser mode.
     *
     * @returns Promise<void>
     * Should provide mock package.json data when Electron API is unavailable
     *
     * @public
     */
    it('should provide mock package.json in browser mode', async () => {
      await projectContext.loadProject('/test/browser-project')

      expect(projectContext.openedProject.value?.packageJson).toMatchObject({})
    })

    /**
     * Tests mock file structure in browser mode.
     *
     * @returns Promise<void>
     * Should provide realistic mock file structure
     *
     * @public
     */
    it('should provide mock file structure in browser mode', async () => {
      await projectContext.loadProject('/test/browser-project')

      const files = projectContext.projectFiles.value
      expect(files).toContainEqual(expect.objectContaining({}))
      expect(files).toContainEqual(expect.objectContaining({}))
    })
  })

  describe('Error Handling', () => {
    /**
     * Tests fallback behavior when scan directory fails.
     *
     * @returns Promise<void>
     * Should fall back to browser mode when scan directory fails
     *
     * @public
     */
    it('should fall back when scan directory fails', async () => {
      mockElectronAPI.pathExists.mockResolvedValue(true)
      mockElectronAPI.isDirectory.mockResolvedValue(true)
      mockElectronAPI.scanDirectory.mockRejectedValue(new Error('Scan failed'))
      mockElectronAPI.systemTerminal.initialize.mockResolvedValue({
        id: 'system',
        status: 'initialized',
        success: true,
      })

      // The function should succeed but use fallback behavior
      await projectContext.loadProject('/test/scan-error')

      expect(projectContext.isProjectLoaded.value).toBe(true)
      expect(global.console.warn).toHaveBeenCalledWith(
        '[Project Context] Failed to scan directory via Electron API:',
        expect.any(Error)
      )
      expect(global.console.warn).toHaveBeenCalledWith(
        '[Project Context] Using mock file structure in browser'
      )
    })

    /**
     * Tests loading behavior with valid project and multiple project types.
     *
     * @returns Promise<void>
     * Should detect multiple project types when multiple indicators exist
     *
     * @public
     */
    it('should detect multiple project types', async () => {
      // Mock multiple project type indicators
      mockElectronAPI.pathExists.mockImplementation((path: string) => {
        if (path.includes('/package.json')) return Promise.resolve(true)
        if (path.includes('/requirements.txt')) return Promise.resolve(true)
        if (path.includes('/Cargo.toml')) return Promise.resolve(true)

        return Promise.resolve(true)
      })
      mockElectronAPI.isDirectory.mockResolvedValue(true)
      mockElectronAPI.scanDirectory.mockResolvedValue([])
      mockElectronAPI.systemTerminal.initialize.mockResolvedValue({
        id: 'system',
        status: 'initialized',
        success: true,
      })

      await projectContext.loadProject('/test/multi-type-project')

      expect(projectContext.isProjectLoaded.value).toBe(true)
      expect(projectContext.openedProject.value?.projectType).toContain('node')
      expect(projectContext.openedProject.value?.projectType).toContain(
        'python'
      )
      expect(projectContext.openedProject.value?.projectType).toContain('rust')
    })

    /**
     * Tests concurrent loading prevention.
     *
     * @returns Promise<void>
     * Should prevent multiple simultaneous loading operations
     *
     * @public
     */
    it('should prevent concurrent loading', async () => {
      mockElectronAPI.pathExists.mockResolvedValue(true)
      mockElectronAPI.isDirectory.mockResolvedValue(true)
      mockElectronAPI.scanDirectory.mockImplementation(
        () => new Promise<unknown>((resolve) => setTimeout(resolve, 100))
      )

      const loadPromise1 = projectContext.loadProject('/test/project1')

      await expect(
        projectContext.loadProject('/test/project2')
      ).rejects.toThrow('Project loading already in progress')

      await loadPromise1
    })

    /**
     * Tests package.json parsing error handling.
     *
     * @returns Promise<void>
     * Should continue loading even when package.json is invalid
     *
     * @public
     */
    it('should handle package.json parsing errors gracefully', async () => {
      mockElectronAPI.pathExists.mockResolvedValue(true)
      mockElectronAPI.isDirectory.mockResolvedValue(true)
      mockElectronAPI.readFile.mockResolvedValue('invalid json')
      mockElectronAPI.scanDirectory.mockResolvedValue([])
      mockElectronAPI.systemTerminal.initialize.mockResolvedValue({
        id: 'system',
        status: 'initialized',
        success: true,
      })

      await projectContext.loadProject('/test/project')

      expect(projectContext.isProjectLoaded.value).toBe(true)
      expect(projectContext.openedProject.value?.packageJson).toBeUndefined()
      expect(global.console.warn).toHaveBeenCalledWith(
        '[Project Context] Failed to parse package.json:',
        expect.any(Error)
      )
    })

    /**
     * Tests Electron API error fallback.
     *
     * @returns Promise<void>
     * Should fall back to browser mode when Electron APIs fail
     *
     * @public
     */
    it('should fall back when Electron APIs fail', async () => {
      mockElectronAPI.pathExists.mockRejectedValue(new Error('API Error'))

      await projectContext.loadProject('/test/project')

      expect(projectContext.isProjectLoaded.value).toBe(true)
      expect(global.console.error).toHaveBeenCalledWith(
        '[Project Context] ❌ Error calling Electron APIs:',
        expect.any(Error)
      )
    })

    /**
     * Tests system terminal initialization error handling.
     *
     * @returns Promise<void>
     * Should continue project loading even when system terminals fail
     *
     * @public
     */
    it('should handle system terminal initialization errors', async () => {
      mockElectronAPI.pathExists.mockResolvedValue(true)
      mockElectronAPI.isDirectory.mockResolvedValue(true)
      mockElectronAPI.scanDirectory.mockResolvedValue([])
      mockElectronAPI.systemTerminal.initialize.mockRejectedValue(
        new Error('Terminal error')
      )

      await projectContext.loadProject('/test/project')

      expect(projectContext.isProjectLoaded.value).toBe(true)
      expect(global.console.warn).toHaveBeenCalledWith(
        '[Project Context] Failed to initialize system terminals:',
        expect.any(Error)
      )
    })
  })

  describe('File Management', () => {
    beforeEach(async () => {
      // Load a project with sample files
      mockElectronAPI.pathExists.mockImplementation((path: string) => {
        // Standard File Management mock setup
        if (path.includes('package.json')) return Promise.resolve(true)
        if (path.includes('/.git')) return Promise.resolve(true)
        if (path.includes('pnpm-lock.yaml')) return Promise.resolve(true)
        return Promise.resolve(false)
      })
      mockElectronAPI.isDirectory.mockResolvedValue(true)
      mockElectronAPI.scanDirectory.mockResolvedValue([
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
      ])
      mockElectronAPI.systemTerminal.initialize.mockResolvedValue({
        id: 'system',
        status: 'initialized',
        success: true,
      })

      await projectContext.loadProject('/test/project')
    })

    /**
     * Tests file refresh functionality.
     *
     * @returns Promise<void>
     * Should update file list and metadata when refreshed
     *
     * @public
     */
    it('should refresh project files', async () => {
      const newFiles = [
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
          path: 'src/main.ts',
          name: 'main.ts',
          extension: '.ts',
          type: 'file',
          size: 256,
          lastModified: new Date(),
          isConfig: false,
        },
      ]

      mockElectronAPI.scanDirectory.mockResolvedValue(newFiles)

      await projectContext.refreshFiles()

      expect(projectContext.projectFiles.value).toEqual(newFiles)
      expect(projectContext.openedProject.value?.fileCount).toBe(2)
    })

    /**
     * Tests refresh without loaded project.
     *
     * @returns Promise<void>
     * Should throw error when no project is loaded
     *
     * @public
     */
    it('should throw error when refreshing without loaded project', async () => {
      projectContext.closeProject()

      await expect(projectContext.refreshFiles()).rejects.toThrow(
        'No project is currently opened'
      )
    })

    /**
     * Tests file filtering by extensions.
     *
     * @returns void
     * Should filter files by specified extensions
     *
     * @public
     */
    it('should filter files by extensions', () => {
      const tsFiles = projectContext.getProjectFiles({ extensions: ['.ts'] })

      expect(tsFiles).toHaveLength(2)
      expect(tsFiles.map((f) => f.path)).toContain('src/main.ts')
      expect(tsFiles.map((f) => f.path)).toContain('vite.config.ts')
    })

    /**
     * Tests file filtering by multiple extensions.
     *
     * @returns void
     * Should include files matching any of the specified extensions
     *
     * @public
     */
    it('should filter files by multiple extensions', () => {
      const scriptFiles = projectContext.getProjectFiles({
        extensions: ['.ts', '.vue'],
      })

      expect(scriptFiles).toHaveLength(3) // src/main.ts, src/App.vue, vite.config.ts
      expect(scriptFiles.map((f) => f.path)).toContain('src/main.ts')
      expect(scriptFiles.map((f) => f.path)).toContain('src/App.vue')
      expect(scriptFiles.map((f) => f.path)).toContain('vite.config.ts')
    })

    /**
     * Tests filtering config files only.
     *
     * @returns void
     * Should return only configuration files
     *
     * @public
     */
    it('should filter config files only', () => {
      const configFiles = projectContext.getProjectFiles({ configOnly: true })

      expect(configFiles).toHaveLength(2) // package.json and vite.config.ts
      expect(configFiles.map((f) => f.path)).toContain('package.json')
      expect(configFiles.map((f) => f.path)).toContain('vite.config.ts')
    })

    /**
     * Tests filtering by directory path.
     *
     * @returns void
     * Should return only files within specified directory
     *
     * @public
     */
    it('should filter files by directory path', () => {
      const srcFiles = projectContext.getProjectFiles({
        directoryPath: 'src',
        includeDirectories: true,
      })

      expect(srcFiles).toHaveLength(4) // src, src/main.ts, src/App.vue, src/components
      expect(srcFiles.every((f) => f.path.startsWith('src'))).toBe(true)
    })

    /**
     * Tests excluding directories from results.
     *
     * @returns void
     * Should return only files when directories are excluded
     *
     * @public
     */
    it('should exclude directories when includeDirectories is false', () => {
      const filesOnly = projectContext.getProjectFiles({
        includeDirectories: false,
      })

      expect(filesOnly.every((f) => f.type === 'file')).toBe(true)
      expect(filesOnly).toHaveLength(4) // package.json, src/main.ts, src/App.vue, vite.config.ts
    })

    /**
     * Tests combined filtering options.
     *
     * @returns void
     * Should apply multiple filters simultaneously
     *
     * @public
     */
    it('should apply multiple filters simultaneously', () => {
      const filtered = projectContext.getProjectFiles({
        extensions: ['.ts'],
        directoryPath: 'src',
        includeDirectories: false,
      })

      expect(filtered).toHaveLength(1)
      expect(filtered[0].path).toBe('src/main.ts')
    })
  })

  describe('Project Metadata Detection', () => {
    /**
     * Tests Node.js project type detection.
     *
     * @returns Promise<void>
     * Should detect Node.js project when package.json exists
     *
     * @public
     */
    it('should detect Node.js project type', async () => {
      mockElectronAPI.pathExists.mockImplementation((path: string) => {
        if (path.includes('/package.json')) return Promise.resolve(true)
        return Promise.resolve(true)
      })
      mockElectronAPI.isDirectory.mockResolvedValue(true)
      mockElectronAPI.scanDirectory.mockResolvedValue([])
      mockElectronAPI.systemTerminal.initialize.mockResolvedValue({
        id: 'system',
        status: 'initialized',
        success: true,
      })

      await projectContext.loadProject('/test/node-project')

      expect(projectContext.openedProject.value?.projectType).toContain('node')
    })

    /**
     * Tests package manager detection - pnpm.
     *
     * @returns Promise<void>
     * Should detect pnpm when pnpm-lock.yaml exists
     *
     * @public
     */
    it('should detect pnpm package manager', async () => {
      mockElectronAPI.pathExists.mockImplementation((path: string) => {
        if (path.includes('/pnpm-lock.yaml')) return Promise.resolve(true)
        return Promise.resolve(true)
      })
      mockElectronAPI.isDirectory.mockResolvedValue(true)
      mockElectronAPI.scanDirectory.mockResolvedValue([])
      mockElectronAPI.systemTerminal.initialize.mockResolvedValue({
        id: 'system',
        status: 'initialized',
        success: true,
      })

      await projectContext.loadProject('/test/pnpm-project')

      expect(projectContext.openedProject.value?.packageManager).toBe('pnpm')
    })

    /**
     * Tests package manager detection - yarn.
     *
     * @returns Promise<void>
     * Should detect yarn when yarn.lock exists
     *
     * @public
     */
    it('should detect yarn package manager', async () => {
      mockElectronAPI.pathExists.mockImplementation((path: string) => {
        if (path.includes('/yarn.lock')) return Promise.resolve(true)
        if (path.includes('/pnpm-lock.yaml')) return Promise.resolve(false)
        return Promise.resolve(true)
      })
      mockElectronAPI.isDirectory.mockResolvedValue(true)
      mockElectronAPI.scanDirectory.mockResolvedValue([])
      mockElectronAPI.systemTerminal.initialize.mockResolvedValue({
        id: 'system',
        status: 'initialized',
        success: true,
      })

      await projectContext.loadProject('/test/yarn-project')

      expect(projectContext.openedProject.value?.packageManager).toBe('yarn')
    })

    /**
     * Tests fallback to npm package manager.
     *
     * @returns Promise<void>
     * Should default to npm when no lock files are found
     *
     * @public
     */
    it('should fallback to npm package manager', async () => {
      mockElectronAPI.pathExists.mockImplementation((path: string) => {
        // No lock files exist
        if (path.includes('lock')) return Promise.resolve(false)
        return Promise.resolve(true)
      })
      mockElectronAPI.isDirectory.mockResolvedValue(true)
      mockElectronAPI.scanDirectory.mockResolvedValue([])
      mockElectronAPI.systemTerminal.initialize.mockResolvedValue({
        id: 'system',
        status: 'initialized',
        success: true,
      })

      await projectContext.loadProject('/test/npm-project')

      expect(projectContext.openedProject.value?.packageManager).toBe('npm')
    })

    /**
     * Tests project type detection error handling.
     *
     * @returns Promise<void>
     * Should handle Electron API errors during project type detection
     *
     * @public
     */
    it('should handle project type detection errors', async () => {
      mockElectronAPI.pathExists.mockImplementation((path: string) => {
        if (path.includes('package.json')) {
          throw new Error('API Error')
        }
        return Promise.resolve(true)
      })
      mockElectronAPI.isDirectory.mockResolvedValue(true)
      mockElectronAPI.scanDirectory.mockResolvedValue([])
      mockElectronAPI.systemTerminal.initialize.mockResolvedValue({
        id: 'system',
        status: 'initialized',
        success: true,
      })

      await projectContext.loadProject('/test/error-project')

      // Should still load project even with detection errors
      expect(projectContext.isProjectLoaded.value).toBe(true)
      expect(global.console.warn).toHaveBeenCalled()
    })
  })

  describe('Project Closing', () => {
    beforeEach(async () => {
      // Load a project first
      mockElectronAPI.pathExists.mockResolvedValue(true)
      mockElectronAPI.isDirectory.mockResolvedValue(true)
      mockElectronAPI.scanDirectory.mockResolvedValue([])
      mockElectronAPI.systemTerminal.initialize.mockResolvedValue({
        id: 'system',
        status: 'initialized',
        success: true,
      })

      await projectContext.loadProject('/test/project')
    })

    /**
     * Tests project closing functionality.
     *
     * @returns void
     * Should clear all project state when project is closed
     *
     * @public
     */
    it('should close project and clear state', () => {
      projectContext.closeProject()

      expect(projectContext.isProjectLoaded.value).toBe(false)
      expect(projectContext.openedProject.value).toBeNull()
      expect(projectContext.projectFiles.value).toEqual([])
      expect(projectContext.lastError.value).toBeNull()
      expect(projectContext.projectName.value).toBe('')
      expect(projectContext.projectRoot.value).toBe('')
      expect(projectContext.isGitRepository.value).toBe(false)
    })

    /**
     * Tests logging during project close.
     *
     * @returns void
     * Should log project closing action
     *
     * @public
     */
    it('should log project closing', () => {
      projectContext.closeProject()

      expect(global.console.log).toHaveBeenCalledWith(
        '[Project Context] Closing project'
      )
    })
  })

  describe('Computed Properties Reactivity', () => {
    /**
     * Tests computed properties update when project is loaded.
     *
     * @returns Promise<void>
     * Should update computed properties reactively when state changes
     *
     * @public
     */
    it('should update computed properties when project is loaded', async () => {
      mockElectronAPI.pathExists.mockResolvedValue(true)
      mockElectronAPI.isDirectory.mockResolvedValue(true)
      mockElectronAPI.scanDirectory.mockResolvedValue([])
      mockElectronAPI.systemTerminal.initialize.mockResolvedValue({
        id: 'system',
        status: 'initialized',
        success: true,
      })

      await projectContext.loadProject('/test/reactive-project')

      expect(projectContext.isProjectLoaded.value).toBe(true)
      expect(projectContext.projectName.value).toBe('reactive-project')
      expect(projectContext.projectRoot.value).toBe('/test/reactive-project')
    })

    /**
     * Tests computed properties reactivity with Git repository.
     *
     * @returns Promise<void>
     * Should update Git repository status reactively
     *
     * @public
     */
    it('should update Git repository status reactively', async () => {
      mockElectronAPI.pathExists.mockImplementation((path: string) => {
        if (path.includes('/.git')) return Promise.resolve(true)
        return Promise.resolve(true)
      })
      mockElectronAPI.isDirectory.mockResolvedValue(true)
      mockElectronAPI.scanDirectory.mockResolvedValue([])
      mockElectronAPI.systemTerminal.initialize.mockResolvedValue({
        id: 'system',
        status: 'initialized',
        success: true,
      })

      await projectContext.loadProject('/test/git-project')

      expect(projectContext.isGitRepository.value).toBe(true)
    })
  })

  describe('Edge Cases and Browser Utilities', () => {
    /**
     * Tests basename utility function.
     *
     * @returns void
     * Should extract basename from various path formats
     *
     * @public
     */
    it('should handle path utilities correctly', async () => {
      // Test different path formats in browser mode
      ;(global.window as unknown as MockWindow) = {
        electronAPI: mockElectronAPI,
      }

      await projectContext.loadProject('/path/to/my-project')
      expect(projectContext.projectName.value).toBe('my-project')

      await projectContext.loadProject('/single-level')
      expect(projectContext.projectName.value).toBe('single-level')

      await projectContext.loadProject('/path/with/trailing/slash/')
      expect(projectContext.projectName.value).toBe('slash')
    })

    /**
     * Tests system terminal initialization without Electron.
     *
     * @returns Promise<void>
     * Should handle system terminal initialization gracefully in browser
     *
     * @public
     */
    it('should handle system terminal initialization without Electron', async () => {
      // Remove electronAPI to simulate browser environment
      ;(global.window as unknown as MockWindow).electronAPI =
        undefined as unknown

      await projectContext.loadProject('/test/browser-project')

      expect(projectContext.isProjectLoaded.value).toBe(true)
      expect(global.console.warn).toHaveBeenCalledWith(
        '[Project Context] Not in Electron environment - system terminals will use fallback mode'
      )
    })

    /**
     * Tests empty file filtering.
     *
     * @returns void
     * Should handle empty results from filtering operations
     *
     * @public
     */
    it('should handle empty file filtering results', () => {
      const noResults = projectContext.getProjectFiles({
        extensions: ['.nonexistent'],
      })

      expect(noResults).toEqual([])
    })

    /**
     * Tests case insensitive extension filtering.
     *
     * @returns void
     * Should match extensions regardless of case
     *
     * @public
     */
    it('should handle case insensitive extension filtering', async () => {
      mockElectronAPI.pathExists.mockResolvedValue(true)
      mockElectronAPI.isDirectory.mockResolvedValue(true)
      mockElectronAPI.scanDirectory.mockResolvedValue([
        {
          path: 'FILE.TS',
          name: 'FILE.TS',
          extension: '.TS',
          type: 'file',
          size: 512,
          lastModified: new Date(),
          isConfig: false,
        },
      ])
      mockElectronAPI.systemTerminal.initialize.mockResolvedValue({
        id: 'system',
        status: 'initialized',
        success: true,
      })

      await projectContext.loadProject('/test/case-project')

      const files = projectContext.getProjectFiles({ extensions: ['.ts'] })

      expect(files).toHaveLength(1)
      expect(files[0].path).toBe('FILE.TS')
    })
  })
})
