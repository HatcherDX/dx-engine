/**
 * @fileoverview Secure storage API bridge for renderer process
 *
 * @description
 * Provides secure access to storage operations from the renderer process.
 * All operations go through validated IPC channels with proper error handling.
 *
 * @example
 * ```typescript
 * // In renderer process
 * const projects = await window.storageAPI.getRecentProjects()
 * await window.storageAPI.addRecentProject({ path: '/path', name: 'Project' })
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { ipcRenderer } from 'electron'

/**
 * Project information interface for renderer
 *
 * @public
 */
export interface ProjectInfo {
  /** Unique project identifier */
  id: string
  /** Project display name */
  name: string
  /** Project path (decrypted in main process) */
  path: string
  /** Last opened timestamp */
  lastOpened: Date
  /** Optional project metadata */
  metadata?: {
    gitRemote?: string
    framework?: string
    packageManager?: string
    icon?: string
  }
}

/**
 * IDE configuration interface for renderer
 *
 * @public
 */
export interface IDEConfig {
  /** Configuration version for migrations */
  version: string
  /** UI preferences */
  ui: {
    theme: 'light' | 'dark' | 'auto'
    sidebarWidth: number
    terminalHeight: number
  }
  /** Editor settings */
  editor: {
    fontSize: number
    fontFamily: string
    tabSize: number
    wordWrap: boolean
  }
  /** Project history limit */
  projectHistoryLimit: number
}

/**
 * Security information interface
 *
 * @public
 */
export interface SecurityInfo {
  platform: string
  encryptionAvailable: boolean
  backend?: string
  keyringService?: string
}

/**
 * Workspace state interface for persistent project/task management
 *
 * @public
 * @since 1.0.0
 */
export interface WorkspaceState {
  /** Currently open project */
  project: {
    path: string
    name: string
    lastOpened: Date
    metadata?: {
      framework?: string
      packageManager?: string
      gitRemote?: string
    }
  }
  /** Active task sessions */
  activeTasks: TaskSession[]
  /** Historical task records */
  taskHistory: TaskHistoryEntry[]
  /** Currently selected task ID */
  currentTaskId: string | null
}

/**
 * Task session interface representing an open task/branch
 *
 * @public
 * @since 1.0.0
 */
export interface TaskSession {
  /** Unique task identifier */
  id: string
  /** Git branch name */
  branchName: string
  /** Type of task */
  taskType: 'feature' | 'bug' | 'docs' | 'maintenance' | 'refactor'
  /** Current task status */
  status: 'active' | 'pending-changes' | 'ready-to-close'
  /** When the task was opened */
  openedAt: Date
  /** Last time the task was active */
  lastActiveAt: Date
  /** Git work state tracking */
  workState: {
    hasUncommittedChanges?: boolean
    hasUnpushedCommits?: boolean
    lastCommitMessage?: string
    modifiedFiles?: string[]
  }
  /** Optional session data for restoration */
  sessionData?: {
    openEditors?: string[]
    selectedFile?: string
    scrollPositions?: Record<string, number>
  }
}

/**
 * Historical task record
 *
 * @public
 * @since 1.0.0
 */
export interface TaskHistoryEntry {
  id: string
  branchName: string
  taskType: TaskSession['taskType']
  openedAt: Date
  closedAt: Date
  completionStatus: 'completed' | 'abandoned' | 'merged' | 'closed'
}

/**
 * Project path validation result
 *
 * @public
 */
export interface PathValidationResult {
  valid: boolean
  error?: string
  name?: string
}

/**
 * Path existence check result
 *
 * @public
 */
export interface PathCheckResult {
  exists: boolean
  isDirectory: boolean
  error?: string
}

/**
 * Storage API interface exposed to renderer
 *
 * @public
 */
export interface StorageAPI {
  // Project management
  getRecentProjects(): Promise<ProjectInfo[]>
  addRecentProject(project: {
    path: string
    name: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Project metadata requires flexible typing for extensible user-defined properties
    metadata?: any
  }): Promise<void>
  updateProjectLastOpened(projectId: string): Promise<void>
  removeRecentProject(projectId: string): Promise<void>
  clearRecentProjects(): Promise<void>

  // Workspace management
  getWorkspace(): Promise<WorkspaceState | null>
  setWorkspace(workspace: WorkspaceState): Promise<void>
  clearWorkspace(): Promise<void>

  // Task management
  addTask(task: TaskSession): Promise<void>
  removeTask(taskId: string): Promise<void>
  setCurrentTask(taskId: string | null): Promise<void>
  updateTaskState(
    taskId: string,
    workState: Partial<TaskSession['workState']>
  ): Promise<void>

  // Configuration management
  getIDEConfig(): Promise<IDEConfig>
  updateIDEConfig(config: Partial<IDEConfig>): Promise<void>

  // Security information
  getSecurityInfo(): Promise<SecurityInfo>

  // Utilities
  validateProjectPath(path: string): Promise<PathValidationResult>
  checkPath(path: string): Promise<PathCheckResult>
}

/**
 * Secure storage API implementation
 *
 * @remarks
 * All methods include proper error handling and type validation.
 * Errors from the main process are preserved and re-thrown.
 *
 * @private
 */
const storageAPI: StorageAPI = {
  /**
   * Get recent projects with decrypted paths
   *
   * @returns Promise resolving to array of recent projects
   *
   * @throws {Error} When main process operation fails
   */
  async getRecentProjects(): Promise<ProjectInfo[]> {
    try {
      const projects = await ipcRenderer.invoke('storage:get-recent-projects')

      // Ensure dates are properly converted
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Runtime dynamic typing required for flexible data handling
      return projects.map((project: any) => ({
        ...project,
        lastOpened: new Date(project.lastOpened),
      }))
    } catch (error) {
      console.error('[StorageAPI] Failed to get recent projects:', error)
      throw new Error(`Failed to load recent projects: ${error}`)
    }
  },

  /**
   * Add project to recent projects list
   *
   * @param project - Project information to add
   * @returns Promise that resolves when project is added
   *
   * @throws {Error} When project data is invalid or operation fails
   */
  async addRecentProject(project: {
    path: string
    name: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Project metadata requires flexible typing for extensible user-defined properties
    metadata?: any
  }): Promise<void> {
    // Client-side validation
    if (!project || typeof project !== 'object') {
      throw new Error('Project data is required')
    }

    if (
      !project.path ||
      typeof project.path !== 'string' ||
      project.path.trim().length === 0
    ) {
      throw new Error('Project path is required and must be a non-empty string')
    }

    if (
      !project.name ||
      typeof project.name !== 'string' ||
      project.name.trim().length === 0
    ) {
      throw new Error('Project name is required and must be a non-empty string')
    }

    // Sanitize data before sending to main process
    const sanitizedProject = {
      path: project.path.trim(),
      name: project.name.trim().substring(0, 255),
      metadata: project.metadata,
    }

    try {
      await ipcRenderer.invoke('storage:add-recent-project', sanitizedProject)
    } catch (error) {
      console.error('[StorageAPI] Failed to add recent project:', error)
      throw new Error(`Failed to add project: ${error}`)
    }
  },

  /**
   * Update project last opened timestamp
   *
   * @param projectId - Project ID to update
   * @returns Promise that resolves when update completes
   *
   * @throws {Error} When project ID is invalid or operation fails
   */
  async updateProjectLastOpened(projectId: string): Promise<void> {
    if (
      !projectId ||
      typeof projectId !== 'string' ||
      projectId.trim().length === 0
    ) {
      throw new Error('Project ID is required and must be a non-empty string')
    }

    try {
      await ipcRenderer.invoke(
        'storage:update-project-last-opened',
        projectId.trim()
      )
    } catch (error) {
      console.error('[StorageAPI] Failed to update project:', error)
      throw new Error(`Failed to update project: ${error}`)
    }
  },

  /**
   * Remove project from recent projects
   *
   * @param projectId - Project ID to remove
   * @returns Promise that resolves when removal completes
   *
   * @throws {Error} When project ID is invalid or operation fails
   */
  async removeRecentProject(projectId: string): Promise<void> {
    if (
      !projectId ||
      typeof projectId !== 'string' ||
      projectId.trim().length === 0
    ) {
      throw new Error('Project ID is required and must be a non-empty string')
    }

    try {
      await ipcRenderer.invoke(
        'storage:remove-recent-project',
        projectId.trim()
      )
    } catch (error) {
      console.error('[StorageAPI] Failed to remove project:', error)
      throw new Error(`Failed to remove project: ${error}`)
    }
  },

  /**
   * Clear all recent projects
   *
   * @returns Promise that resolves when clear completes
   *
   * @throws {Error} When operation fails
   */
  async clearRecentProjects(): Promise<void> {
    try {
      await ipcRenderer.invoke('storage:clear-recent-projects')
    } catch (error) {
      console.error('[StorageAPI] Failed to clear projects:', error)
      throw new Error(`Failed to clear projects: ${error}`)
    }
  },

  /**
   * Get IDE configuration
   *
   * @returns Promise resolving to IDE configuration
   *
   * @throws {Error} When operation fails
   */
  async getIDEConfig(): Promise<IDEConfig> {
    try {
      return await ipcRenderer.invoke('storage:get-ide-config')
    } catch (error) {
      console.error('[StorageAPI] Failed to get IDE config:', error)
      throw new Error(`Failed to load IDE configuration: ${error}`)
    }
  },

  /**
   * Update IDE configuration
   *
   * @param config - Partial configuration update
   * @returns Promise that resolves when update completes
   *
   * @throws {Error} When configuration is invalid or operation fails
   */
  async updateIDEConfig(config: Partial<IDEConfig>): Promise<void> {
    if (!config || typeof config !== 'object') {
      throw new Error('Configuration update is required')
    }

    try {
      await ipcRenderer.invoke('storage:update-ide-config', config)
    } catch (error) {
      console.error('[StorageAPI] Failed to update IDE config:', error)
      throw new Error(`Failed to update IDE configuration: ${error}`)
    }
  },

  /**
   * Get platform security information
   *
   * @returns Promise resolving to security information
   *
   * @throws {Error} When operation fails
   */
  async getSecurityInfo(): Promise<SecurityInfo> {
    try {
      return await ipcRenderer.invoke('storage:get-security-info')
    } catch (error) {
      console.error('[StorageAPI] Failed to get security info:', error)
      throw new Error(`Failed to get security information: ${error}`)
    }
  },

  /**
   * Validate project path
   *
   * @param path - Path to validate
   * @returns Promise resolving to validation result
   *
   * @throws {Error} When path parameter is invalid
   */
  async validateProjectPath(path: string): Promise<PathValidationResult> {
    if (!path || typeof path !== 'string' || path.trim().length === 0) {
      return {
        valid: false,
        error: 'Path is required and must be a non-empty string',
      }
    }

    try {
      return await ipcRenderer.invoke(
        'storage:validate-project-path',
        path.trim()
      )
    } catch (error) {
      console.error('[StorageAPI] Failed to validate path:', error)
      return {
        valid: false,
        error: `Failed to validate path: ${error}`,
      }
    }
  },

  /**
   * Check if path exists and get its properties
   *
   * @param path - Path to check
   * @returns Promise resolving to path check result
   *
   * @throws {Error} When path parameter is invalid
   */
  async checkPath(path: string): Promise<PathCheckResult> {
    if (!path || typeof path !== 'string' || path.trim().length === 0) {
      return {
        exists: false,
        isDirectory: false,
        error: 'Path is required and must be a non-empty string',
      }
    }

    try {
      return await ipcRenderer.invoke('storage:check-path', path.trim())
    } catch (error) {
      console.error('[StorageAPI] Failed to check path:', error)
      return {
        exists: false,
        isDirectory: false,
        error: `Failed to check path: ${error}`,
      }
    }
  },

  /**
   * Get current workspace state
   *
   * @returns Promise resolving to workspace state or null
   *
   * @throws {Error} When operation fails
   */
  async getWorkspace(): Promise<WorkspaceState | null> {
    try {
      const workspace = await ipcRenderer.invoke('storage:get-workspace')

      // Convert dates from strings
      if (workspace) {
        workspace.project.lastOpened = new Date(workspace.project.lastOpened)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Runtime dynamic typing required for flexible data handling
        workspace.activeTasks = workspace.activeTasks.map((task: any) => ({
          ...task,
          openedAt: new Date(task.openedAt),
          lastActiveAt: new Date(task.lastActiveAt),
        }))

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Runtime dynamic typing required for flexible data handling
        workspace.taskHistory = workspace.taskHistory.map((entry: any) => ({
          ...entry,
          openedAt: new Date(entry.openedAt),
          closedAt: new Date(entry.closedAt),
        }))
      }

      return workspace
    } catch (error) {
      console.error('[StorageAPI] Failed to get workspace:', error)
      throw new Error(`Failed to get workspace: ${error}`)
    }
  },

  /**
   * Set workspace state (open project)
   *
   * @param workspace - Workspace state to save
   * @returns Promise that resolves when workspace is saved
   *
   * @throws {Error} When workspace data is invalid or operation fails
   */
  async setWorkspace(workspace: WorkspaceState): Promise<void> {
    if (!workspace || typeof workspace !== 'object') {
      throw new Error('Workspace data is required')
    }

    if (!workspace.project || !workspace.project.path) {
      throw new Error('Workspace must have a project with a path')
    }

    try {
      await ipcRenderer.invoke('storage:set-workspace', workspace)
    } catch (error) {
      console.error('[StorageAPI] Failed to set workspace:', error)
      throw new Error(`Failed to set workspace: ${error}`)
    }
  },

  /**
   * Clear workspace (close project)
   *
   * @returns Promise that resolves when workspace is cleared
   *
   * @throws {Error} When operation fails
   */
  async clearWorkspace(): Promise<void> {
    try {
      await ipcRenderer.invoke('storage:clear-workspace')
    } catch (error) {
      console.error('[StorageAPI] Failed to clear workspace:', error)
      throw new Error(`Failed to clear workspace: ${error}`)
    }
  },

  /**
   * Add task to current workspace
   *
   * @param task - Task session to add
   * @returns Promise that resolves when task is added
   *
   * @throws {Error} When task data is invalid or operation fails
   */
  async addTask(task: TaskSession): Promise<void> {
    if (!task || typeof task !== 'object') {
      throw new Error('Task data is required')
    }

    if (!task.id || !task.branchName || !task.taskType) {
      throw new Error('Task must have id, branchName, and taskType')
    }

    try {
      await ipcRenderer.invoke('storage:add-task', task)
    } catch (error) {
      console.error('[StorageAPI] Failed to add task:', error)
      throw new Error(`Failed to add task: ${error}`)
    }
  },

  /**
   * Remove task from workspace
   *
   * @param taskId - ID of task to remove
   * @returns Promise that resolves when task is removed
   *
   * @throws {Error} When task ID is invalid or operation fails
   */
  async removeTask(taskId: string): Promise<void> {
    if (!taskId || typeof taskId !== 'string' || taskId.trim().length === 0) {
      throw new Error('Task ID is required and must be a non-empty string')
    }

    try {
      await ipcRenderer.invoke('storage:remove-task', taskId.trim())
    } catch (error) {
      console.error('[StorageAPI] Failed to remove task:', error)
      throw new Error(`Failed to remove task: ${error}`)
    }
  },

  /**
   * Set current active task
   *
   * @param taskId - ID of task to make current (null to clear)
   * @returns Promise that resolves when current task is set
   *
   * @throws {Error} When operation fails
   */
  async setCurrentTask(taskId: string | null): Promise<void> {
    try {
      await ipcRenderer.invoke('storage:set-current-task', taskId)
    } catch (error) {
      console.error('[StorageAPI] Failed to set current task:', error)
      throw new Error(`Failed to set current task: ${error}`)
    }
  },

  /**
   * Update task work state
   *
   * @param taskId - ID of task to update
   * @param workState - Updated work state
   * @returns Promise that resolves when task is updated
   *
   * @throws {Error} When parameters are invalid or operation fails
   */
  async updateTaskState(
    taskId: string,
    workState: Partial<TaskSession['workState']>
  ): Promise<void> {
    if (!taskId || typeof taskId !== 'string' || taskId.trim().length === 0) {
      throw new Error('Task ID is required and must be a non-empty string')
    }

    if (!workState || typeof workState !== 'object') {
      throw new Error('Work state is required and must be an object')
    }

    try {
      await ipcRenderer.invoke(
        'storage:update-task-state',
        taskId.trim(),
        workState
      )
    } catch (error) {
      console.error('[StorageAPI] Failed to update task state:', error)
      throw new Error(`Failed to update task state: ${error}`)
    }
  },
}

/**
 * Export the storage API for use in index.ts
 *
 * @remarks
 * The API is exported so it can be exposed through the main preload file
 */
export { storageAPI }

/**
 * Type declaration for the exposed API
 * This allows TypeScript to recognize the global storageAPI
 */
declare global {
  interface Window {
    storageAPI: StorageAPI
  }
}
