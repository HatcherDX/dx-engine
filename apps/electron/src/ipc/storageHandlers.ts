/**
 * @fileoverview IPC handlers for secure storage operations
 *
 * @description
 * Provides secure IPC communication between main and renderer processes
 * for storage operations. All requests are validated and sanitized to
 * prevent unauthorized access to sensitive data.
 *
 * @example
 * ```typescript
 * // Called during app initialization
 * registerStorageHandlers(secureStorageService)
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { ipcMain, BrowserWindow, WebContents } from 'electron'
import {
  SecureStorageService,
  type ProjectInfo,
  type IDEConfig,
} from '../security/SecureStorageService'
import * as fs from 'fs/promises'
import * as path from 'path'

/**
 * Storage service instance (singleton)
 * @private
 */
let storageService: SecureStorageService | null = null

/**
 * Set of trusted sender IDs to prevent unauthorized access
 * @private
 */
const trustedSenders = new Set<number>()

/**
 * Register all storage-related IPC handlers
 *
 * @param service - Initialized SecureStorageService instance
 *
 * @example
 * ```typescript
 * const storage = new SecureStorageService()
 * await storage.initialize()
 * registerStorageHandlers(storage)
 * ```
 *
 * @public
 */
export function registerStorageHandlers(service: SecureStorageService): void {
  storageService = service

  console.log('[StorageHandlers] Registering secure storage IPC handlers...')

  // Check if service is properly initialized
  if (!service) {
    console.error('[StorageHandlers] ❌ Service is null or undefined!')
    throw new Error('SecureStorageService is required')
  }

  // Project management handlers
  registerProjectHandlers()
  console.log('[StorageHandlers] ✅ Project handlers registered')

  // Configuration handlers
  registerConfigHandlers()
  console.log('[StorageHandlers] ✅ Configuration handlers registered')

  // Security info handlers
  registerSecurityHandlers()
  console.log('[StorageHandlers] ✅ Security handlers registered')

  // Utility handlers
  registerUtilityHandlers()
  console.log('[StorageHandlers] ✅ Utility handlers registered')

  // Workspace handlers
  registerWorkspaceHandlers()
  console.log('[StorageHandlers] ✅ Workspace handlers registered')

  console.log(
    '[StorageHandlers] ✅ All storage handlers registered successfully'
  )
}

/**
 * Register a trusted sender (BrowserWindow) for IPC communication
 *
 * @param webContents - WebContents instance to trust
 *
 * @public
 */
export function registerTrustedSender(webContents: WebContents): void {
  const id = webContents.id
  trustedSenders.add(id)

  // Remove from trusted list when window is destroyed
  webContents.once('destroyed', () => {
    trustedSenders.delete(id)
    console.log(`[StorageHandlers] Removed trusted sender: ${id}`)
  })

  console.log(`[StorageHandlers] Registered trusted sender: ${id}`)
}

/**
 * Validate that the IPC sender is authorized
 *
 * @param webContents - WebContents instance to validate
 * @returns True if sender is authorized
 *
 * @private
 */
function validateSender(webContents: WebContents): boolean {
  const id = webContents.id

  // Check if sender is in trusted list
  if (!trustedSenders.has(id)) {
    console.warn(`[StorageHandlers] ⚠️ Unauthorized IPC request from: ${id}`)
    return false
  }

  // Verify sender hasn't been destroyed
  if (webContents.isDestroyed()) {
    console.warn(
      `[StorageHandlers] ⚠️ IPC request from destroyed WebContents: ${id}`
    )
    trustedSenders.delete(id)
    return false
  }

  // Verify sender belongs to a valid BrowserWindow
  const window = BrowserWindow.fromWebContents(webContents)
  if (!window || window.isDestroyed()) {
    console.warn(`[StorageHandlers] ⚠️ IPC request from invalid window: ${id}`)
    return false
  }

  return true
}

/**
 * Validate and sanitize project path
 *
 * @param projectPath - Path to validate
 * @returns Promise that resolves to sanitized path
 *
 * @throws {Error} When path is invalid or inaccessible
 *
 * @private
 */
async function validateProjectPath(projectPath: string): Promise<string> {
  if (!projectPath || typeof projectPath !== 'string') {
    throw new Error('Invalid project path: must be a non-empty string')
  }

  // Sanitize path
  const sanitized = path.resolve(projectPath)

  // Prevent path traversal attacks
  if (sanitized.includes('..') || sanitized !== path.normalize(sanitized)) {
    throw new Error('Invalid project path: contains unsafe characters')
  }

  try {
    // Verify path exists and is a directory
    const stats = await fs.stat(sanitized)
    if (!stats.isDirectory()) {
      throw new Error('Project path must be a directory')
    }

    // Verify read access
    await fs.access(sanitized, fs.constants.R_OK)

    return sanitized
  } catch (error) {
    throw new Error(`Project path not accessible: ${error}`)
  }
}

/**
 * Register project-related IPC handlers
 *
 * @private
 */
function registerProjectHandlers(): void {
  console.log(
    '[StorageHandlers] 📋 Registering storage:get-recent-projects handler...'
  )

  /**
   * Get recent projects with decrypted paths
   */
  ipcMain.handle(
    'storage:get-recent-projects',
    async (event): Promise<ProjectInfo[]> => {
      console.log('[StorageHandlers] 📞 storage:get-recent-projects called')
      try {
        if (!validateSender(event.sender)) {
          throw new Error('Unauthorized request')
        }

        if (!storageService) {
          throw new Error('Storage service not initialized')
        }

        const projects = await storageService.getRecentProjects()
        console.log(
          `[StorageHandlers] ✅ Retrieved ${projects.length} recent projects`
        )

        return projects
      } catch (error) {
        console.error(
          '[StorageHandlers] ❌ Failed to get recent projects:',
          error
        )
        throw error
      }
    }
  )

  /**
   * Add project to recent projects
   */
  ipcMain.handle(
    'storage:add-recent-project',
    async (
      event,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Project metadata requires flexible typing for extensible user-defined properties
      projectData: { path: string; name: string; metadata?: any }
    ): Promise<void> => {
      console.log(
        '[StorageHandlers] 📞 storage:add-recent-project called with:',
        {
          path: projectData?.path,
          name: projectData?.name,
          metadata: projectData?.metadata,
        }
      )

      try {
        if (!validateSender(event.sender)) {
          console.error(
            '[StorageHandlers] ❌ Unauthorized request from sender:',
            event.sender.id
          )
          throw new Error('Unauthorized request')
        }

        if (!storageService) {
          console.error('[StorageHandlers] ❌ Storage service not initialized')
          throw new Error('Storage service not initialized')
        }

        console.log(
          '[StorageHandlers] 🔍 Validating project path:',
          projectData.path
        )
        // Validate and sanitize project data
        const sanitizedPath = await validateProjectPath(projectData.path)
        console.log('[StorageHandlers] ✅ Path validated:', sanitizedPath)

        const sanitizedName = projectData.name?.toString().trim()
        if (!sanitizedName || sanitizedName.length === 0) {
          throw new Error('Project name cannot be empty')
        }

        if (sanitizedName.length > 255) {
          throw new Error('Project name too long (max 255 characters)')
        }

        // Sanitize metadata if provided
        let sanitizedMetadata = undefined
        if (projectData.metadata && typeof projectData.metadata === 'object') {
          sanitizedMetadata = {
            gitRemote: projectData.metadata.gitRemote
              ?.toString()
              .substring(0, 500),
            framework: projectData.metadata.framework
              ?.toString()
              .substring(0, 100),
            packageManager: projectData.metadata.packageManager
              ?.toString()
              .substring(0, 50),
            icon: projectData.metadata.icon?.toString().substring(0, 100),
          }
        }

        console.log(
          '[StorageHandlers] 💾 Calling storageService.addRecentProject with:',
          {
            path: sanitizedPath,
            name: sanitizedName,
            metadata: sanitizedMetadata,
          }
        )

        await storageService.addRecentProject({
          path: sanitizedPath,
          name: sanitizedName,
          metadata: sanitizedMetadata,
        })

        console.log(
          `[StorageHandlers] ✅ Added recent project: ${sanitizedName}`
        )
      } catch (error) {
        console.error(
          '[StorageHandlers] ❌ Failed to add recent project:',
          error
        )
        throw error
      }
    }
  )

  /**
   * Update project last opened timestamp
   */
  ipcMain.handle(
    'storage:update-project-last-opened',
    async (event, projectId: string): Promise<void> => {
      try {
        if (!validateSender(event.sender)) {
          throw new Error('Unauthorized request')
        }

        if (!storageService) {
          throw new Error('Storage service not initialized')
        }

        if (!projectId || typeof projectId !== 'string') {
          throw new Error('Invalid project ID')
        }

        // Validate UUID format
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(projectId)) {
          throw new Error('Invalid project ID format')
        }

        await storageService.updateProjectLastOpened(projectId)
        console.log(
          `[StorageHandlers] ✅ Updated project last opened: ${projectId}`
        )
      } catch (error) {
        console.error('[StorageHandlers] ❌ Failed to update project:', error)
        throw error
      }
    }
  )

  /**
   * Remove project from recent projects
   */
  ipcMain.handle(
    'storage:remove-recent-project',
    async (event, projectId: string): Promise<void> => {
      try {
        if (!validateSender(event.sender)) {
          throw new Error('Unauthorized request')
        }

        if (!storageService) {
          throw new Error('Storage service not initialized')
        }

        if (!projectId || typeof projectId !== 'string') {
          throw new Error('Invalid project ID')
        }

        await storageService.removeRecentProject(projectId)
        console.log(`[StorageHandlers] ✅ Removed recent project: ${projectId}`)
      } catch (error) {
        console.error('[StorageHandlers] ❌ Failed to remove project:', error)
        throw error
      }
    }
  )

  /**
   * Clear all recent projects
   */
  ipcMain.handle(
    'storage:clear-recent-projects',
    async (event): Promise<void> => {
      try {
        if (!validateSender(event.sender)) {
          throw new Error('Unauthorized request')
        }

        if (!storageService) {
          throw new Error('Storage service not initialized')
        }

        await storageService.clearRecentProjects()
        console.log('[StorageHandlers] ✅ Cleared all recent projects')
      } catch (error) {
        console.error('[StorageHandlers] ❌ Failed to clear projects:', error)
        throw error
      }
    }
  )
}

/**
 * Register configuration-related IPC handlers
 *
 * @private
 */
function registerConfigHandlers(): void {
  /**
   * Get IDE configuration
   */
  ipcMain.handle(
    'storage:get-ide-config',
    async (event): Promise<IDEConfig> => {
      try {
        if (!validateSender(event.sender)) {
          throw new Error('Unauthorized request')
        }

        if (!storageService) {
          throw new Error('Storage service not initialized')
        }

        const config = await storageService.getIDEConfig()
        console.log('[StorageHandlers] ✅ Retrieved IDE configuration')

        return config
      } catch (error) {
        console.error('[StorageHandlers] ❌ Failed to get IDE config:', error)
        throw error
      }
    }
  )

  /**
   * Update IDE configuration
   */
  ipcMain.handle(
    'storage:update-ide-config',
    async (event, configUpdate: Partial<IDEConfig>): Promise<void> => {
      try {
        if (!validateSender(event.sender)) {
          throw new Error('Unauthorized request')
        }

        if (!storageService) {
          throw new Error('Storage service not initialized')
        }

        if (!configUpdate || typeof configUpdate !== 'object') {
          throw new Error('Invalid configuration update')
        }

        // Validate and sanitize configuration update
        const sanitizedUpdate: Partial<IDEConfig> = {}

        if (configUpdate.ui) {
          sanitizedUpdate.ui = {
            theme: ['light', 'dark', 'auto'].includes(configUpdate.ui.theme)
              ? configUpdate.ui.theme
              : 'auto',
            sidebarWidth: Math.max(
              200,
              Math.min(800, configUpdate.ui.sidebarWidth || 400)
            ),
            terminalHeight: Math.max(
              100,
              Math.min(500, configUpdate.ui.terminalHeight || 250)
            ),
          }
        }

        if (configUpdate.editor) {
          sanitizedUpdate.editor = {
            fontSize: Math.max(
              8,
              Math.min(72, configUpdate.editor.fontSize || 14)
            ),
            fontFamily:
              configUpdate.editor.fontFamily?.toString().substring(0, 200) ||
              'Monaco, Menlo, "Ubuntu Mono", monospace',
            tabSize: Math.max(1, Math.min(8, configUpdate.editor.tabSize || 2)),
            wordWrap: Boolean(configUpdate.editor.wordWrap),
          }
        }

        if (typeof configUpdate.projectHistoryLimit === 'number') {
          sanitizedUpdate.projectHistoryLimit = Math.max(
            1,
            Math.min(50, configUpdate.projectHistoryLimit)
          )
        }

        await storageService.updateIDEConfig(sanitizedUpdate)
        console.log('[StorageHandlers] ✅ Updated IDE configuration')
      } catch (error) {
        console.error(
          '[StorageHandlers] ❌ Failed to update IDE config:',
          error
        )
        throw error
      }
    }
  )
}

/**
 * Register security information handlers
 *
 * @private
 */
function registerSecurityHandlers(): void {
  /**
   * Get platform security information
   */
  ipcMain.handle('storage:get-security-info', async (event) => {
    try {
      if (!validateSender(event.sender)) {
        throw new Error('Unauthorized request')
      }

      if (!storageService) {
        throw new Error('Storage service not initialized')
      }

      const securityInfo = storageService.getSecurityInfo()
      console.log('[StorageHandlers] ✅ Retrieved security info')

      return securityInfo
    } catch (error) {
      console.error('[StorageHandlers] ❌ Failed to get security info:', error)
      throw error
    }
  })
}

/**
 * Register utility handlers
 *
 * @private
 */
function registerUtilityHandlers(): void {
  /**
   * Validate project path (utility function for renderer)
   */
  ipcMain.handle(
    'storage:validate-project-path',
    async (
      event,
      projectPath: string
    ): Promise<{ valid: boolean; error?: string; name?: string }> => {
      try {
        if (!validateSender(event.sender)) {
          throw new Error('Unauthorized request')
        }

        const sanitizedPath = await validateProjectPath(projectPath)
        const projectName = path.basename(sanitizedPath)

        return {
          valid: true,
          name: projectName,
        }
      } catch (error) {
        return {
          valid: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }
  )

  /**
   * Check if path exists and is directory
   */
  ipcMain.handle(
    'storage:check-path',
    async (
      event,
      checkPath: string
    ): Promise<{ exists: boolean; isDirectory: boolean; error?: string }> => {
      try {
        if (!validateSender(event.sender)) {
          throw new Error('Unauthorized request')
        }

        if (!checkPath || typeof checkPath !== 'string') {
          return { exists: false, isDirectory: false, error: 'Invalid path' }
        }

        const sanitized = path.resolve(checkPath)
        const stats = await fs.stat(sanitized)

        return {
          exists: true,
          isDirectory: stats.isDirectory(),
        }
      } catch (error) {
        return {
          exists: false,
          isDirectory: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }
  )
}

/**
 * Register workspace-related IPC handlers
 *
 * @private
 */
function registerWorkspaceHandlers(): void {
  /**
   * Get current workspace state
   */
  ipcMain.handle('storage:get-workspace', async (event) => {
    try {
      if (!validateSender(event.sender)) {
        throw new Error('Unauthorized request')
      }

      if (!storageService) {
        throw new Error('Storage service not initialized')
      }

      const workspace = await storageService.getWorkspace()
      console.log('[StorageHandlers] ✅ Retrieved workspace state')
      return workspace
    } catch (error) {
      console.error('[StorageHandlers] ❌ Failed to get workspace:', error)
      throw error
    }
  })

  /**
   * Set workspace (open project with task)
   */
  ipcMain.handle(
    'storage:set-workspace',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Runtime dynamic typing required for flexible data handling
    async (event, workspace: any): Promise<void> => {
      try {
        if (!validateSender(event.sender)) {
          throw new Error('Unauthorized request')
        }

        if (!storageService) {
          throw new Error('Storage service not initialized')
        }

        // Validate workspace structure
        if (!workspace || typeof workspace !== 'object') {
          throw new Error('Invalid workspace data')
        }

        if (!workspace.project || !workspace.project.path) {
          throw new Error('Workspace must have a project with a path')
        }

        await storageService.setWorkspace(workspace)
        console.log('[StorageHandlers] ✅ Set workspace')
      } catch (error) {
        console.error('[StorageHandlers] ❌ Failed to set workspace:', error)
        throw error
      }
    }
  )

  /**
   * Add task to workspace
   */
  ipcMain.handle(
    'storage:add-task',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Runtime dynamic typing required for flexible data handling
    async (event, task: any): Promise<void> => {
      try {
        if (!validateSender(event.sender)) {
          throw new Error('Unauthorized request')
        }

        if (!storageService) {
          throw new Error('Storage service not initialized')
        }

        // Validate task structure
        if (!task || typeof task !== 'object') {
          throw new Error('Invalid task data')
        }

        if (!task.id || !task.branchName || !task.taskType) {
          throw new Error('Task must have id, branchName, and taskType')
        }

        await storageService.addTask(task)
        console.log('[StorageHandlers] ✅ Added task to workspace')
      } catch (error) {
        console.error('[StorageHandlers] ❌ Failed to add task:', error)
        throw error
      }
    }
  )

  /**
   * Remove task from workspace
   */
  ipcMain.handle(
    'storage:remove-task',
    async (event, taskId: string): Promise<void> => {
      try {
        if (!validateSender(event.sender)) {
          throw new Error('Unauthorized request')
        }

        if (!storageService) {
          throw new Error('Storage service not initialized')
        }

        if (!taskId || typeof taskId !== 'string') {
          throw new Error('Invalid task ID')
        }

        await storageService.removeTask(taskId)
        console.log('[StorageHandlers] ✅ Removed task from workspace')
      } catch (error) {
        console.error('[StorageHandlers] ❌ Failed to remove task:', error)
        throw error
      }
    }
  )

  /**
   * Set current active task
   */
  ipcMain.handle(
    'storage:set-current-task',
    async (event, taskId: string | null): Promise<void> => {
      try {
        if (!validateSender(event.sender)) {
          throw new Error('Unauthorized request')
        }

        if (!storageService) {
          throw new Error('Storage service not initialized')
        }

        await storageService.setCurrentTask(taskId)
        console.log('[StorageHandlers] ✅ Set current task')
      } catch (error) {
        console.error('[StorageHandlers] ❌ Failed to set current task:', error)
        throw error
      }
    }
  )

  /**
   * Update task work state
   */
  ipcMain.handle(
    'storage:update-task-state',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Runtime dynamic typing required for flexible data handling
    async (event, taskId: string, workState: any): Promise<void> => {
      try {
        if (!validateSender(event.sender)) {
          throw new Error('Unauthorized request')
        }

        if (!storageService) {
          throw new Error('Storage service not initialized')
        }

        if (!taskId || typeof taskId !== 'string') {
          throw new Error('Invalid task ID')
        }

        if (!workState || typeof workState !== 'object') {
          throw new Error('Invalid work state')
        }

        await storageService.updateTaskWorkState(taskId, workState)
        console.log('[StorageHandlers] ✅ Updated task work state')
      } catch (error) {
        console.error(
          '[StorageHandlers] ❌ Failed to update task state:',
          error
        )
        throw error
      }
    }
  )

  /**
   * Clear workspace (close project)
   */
  ipcMain.handle('storage:clear-workspace', async (event): Promise<void> => {
    try {
      if (!validateSender(event.sender)) {
        throw new Error('Unauthorized request')
      }

      if (!storageService) {
        throw new Error('Storage service not initialized')
      }

      await storageService.clearWorkspace()
      console.log('[StorageHandlers] ✅ Cleared workspace')
    } catch (error) {
      console.error('[StorageHandlers] ❌ Failed to clear workspace:', error)
      throw error
    }
  })
}

/**
 * Cleanup all storage handlers (called on app shutdown)
 *
 * @public
 */
export function cleanupStorageHandlers(): void {
  // Remove all storage-related IPC handlers
  const handlers = [
    'storage:get-recent-projects',
    'storage:add-recent-project',
    'storage:update-project-last-opened',
    'storage:remove-recent-project',
    'storage:clear-recent-projects',
    'storage:get-ide-config',
    'storage:update-ide-config',
    'storage:get-security-info',
    'storage:validate-project-path',
    'storage:check-path',
    // Workspace handlers
    'storage:get-workspace',
    'storage:set-workspace',
    'storage:add-task',
    'storage:remove-task',
    'storage:set-current-task',
    'storage:update-task-state',
    'storage:clear-workspace',
  ]

  handlers.forEach((handler) => {
    ipcMain.removeAllListeners(handler)
  })

  // Clear trusted senders
  trustedSenders.clear()

  // Clear service reference
  storageService = null

  console.log('[StorageHandlers] ✅ Cleanup completed')
}
