/**
 * @fileoverview IPC handlers for enterprise storage operations with security validation
 *
 * @description
 * Provides IPC communication between main and renderer processes using
 * @hatcherdx/storage with multi-project/branch isolation and sender validation.
 *
 * Security Model:
 * - Only WebContents registered via registerTrustedSender() can access storage IPC
 * - All IPC handlers validate sender against trusted WebContents registry
 * - Destroyed WebContents are automatically removed from trusted registry
 *
 * Replaces legacy SecureStorageService with enterprise-grade storage system.
 *
 * @author Hatcher DX Team
 * @since 2.0.0
 * @public
 */

import { ipcMain, WebContents } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import { ElectronStorageManager } from '../storage/ElectronStorageManager'
import type {
  Project,
  ProjectInput,
  Workspace,
  Task,
  IDEConfig,
  ConversationSession,
  AIMessage,
  AIMessageInput,
  ActionExecution,
  ActionLog,
  BranchMetrics,
  ProviderMetrics,
  GlobalStats,
} from '../storage/ElectronStorageManager'

/**
 * Registry of trusted WebContents IDs for IPC validation
 *
 * @remarks
 * Set structure provides O(1) lookup performance for sender validation.
 * WebContents are automatically removed when destroyed.
 *
 * @private
 */
const trustedSenders = new Set<number>()

/**
 * Storage manager instance (singleton)
 *
 * @private
 */
let storage: ElectronStorageManager | null = null

/**
 * Initialize storage system
 *
 * @returns Promise that resolves when storage is initialized
 *
 * @example
 * ```typescript
 * await initStorage()
 * ```
 *
 * @public
 */
export async function initStorage(): Promise<void> {
  if (storage) {
    console.warn('[StorageHandlers] Storage already initialized')
    return
  }

  console.log('[StorageHandlers] Initializing ElectronStorageManager...')

  storage = await ElectronStorageManager.create()
  await storage.initialize()

  console.log('[StorageHandlers] ✅ Storage initialized successfully')
}

/**
 * Shutdown storage system with graceful cleanup
 *
 * @returns Promise that resolves when storage is shut down
 *
 * @public
 */
export async function shutdownStorage(): Promise<void> {
  if (!storage) {
    console.warn('[StorageHandlers] Storage not initialized')
    return
  }

  console.log('[StorageHandlers] Shutting down storage...')

  await storage.shutdown()
  storage = null

  console.log('[StorageHandlers] ✅ Storage shutdown complete')
}

/**
 * Registers a WebContents as trusted for storage IPC operations.
 *
 * @remarks
 * Must be called for each BrowserWindow that needs storage access.
 * Automatically cleans up when WebContents is destroyed.
 *
 * Security: This function should only be called with WebContents you control
 * (your own BrowserWindows), never with WebContents from untrusted sources.
 *
 * @param webContents - The WebContents instance to register as trusted
 *
 * @example
 * ```typescript
 * // In mainWindow.ts
 * const browserWindow = new BrowserWindow({ ... })
 *
 * // Register IMMEDIATELY after window creation, before loading content
 * registerTrustedSender(browserWindow.webContents)
 *
 * // Then load content
 * await browserWindow.loadURL(url)
 * ```
 *
 * @see https://www.electronjs.org/docs/latest/tutorial/security#17-validate-the-sender-of-all-ipc-messages
 *
 * @public
 * @since 2.0.0
 */
export function registerTrustedSender(webContents: WebContents): void {
  const id = webContents.id
  trustedSenders.add(id)

  console.log(
    `[StorageHandlers] Registered trusted sender: WebContents ID ${id}`
  )

  // Auto-cleanup when WebContents is destroyed
  webContents.once('destroyed', () => {
    trustedSenders.delete(id)
    console.log(
      `[StorageHandlers] Removed trusted sender: WebContents ID ${id}`
    )
  })
}

/**
 * Validates that an IPC event comes from a trusted sender.
 *
 * @remarks
 * Implements Electron security best practice for IPC sender validation.
 * This prevents unauthorized renderer processes (including iframes) from
 * accessing privileged storage operations.
 *
 * @param event - IPC event containing sender information
 * @throws Error if sender is not in trusted registry
 *
 * @example
 * ```typescript
 * ipcMain.handle('storage:get-data', async (event) => {
 *   validateTrustedSender(event)
 *   return getData()
 * })
 * ```
 *
 * @see https://www.electronjs.org/docs/latest/tutorial/security#17-validate-the-sender-of-all-ipc-messages
 *
 * @private
 */
function validateTrustedSender(event: IpcMainInvokeEvent): void {
  const senderId = event.sender.id

  if (!trustedSenders.has(senderId)) {
    console.warn(
      `[StorageHandlers] ⚠️  Unauthorized IPC request from WebContents ID ${senderId}`
    )
    throw new Error('Unauthorized request: sender not registered as trusted')
  }
}

/**
 * Register all storage-related IPC handlers
 *
 * @remarks
 * Should be called after initStorage() during app initialization.
 *
 * @example
 * ```typescript
 * await initStorage()
 * registerStorageHandlers()
 * ```
 *
 * @public
 */
export function registerStorageHandlers(): void {
  console.log('[StorageHandlers] Registering IPC handlers...')

  // Project management
  registerProjectHandlers()

  // Branch management
  registerBranchHandlers()

  // Workspace management
  registerWorkspaceHandlers()

  // Conversation management (DeckLog)
  registerConversationHandlers()

  // Action tracking (DeckLog + Timegraph)
  registerActionHandlers()

  // Metrics and analytics
  registerMetricsHandlers()

  console.log('[StorageHandlers] ✅ All handlers registered successfully')
}

/**
 * Ensure storage is initialized before operations
 *
 * @private
 */
function ensureStorage(): ElectronStorageManager {
  if (!storage) {
    throw new Error('Storage not initialized')
  }
  return storage
}

/**
 * Register project management handlers
 *
 * @private
 */
function registerProjectHandlers(): void {
  // Create project
  ipcMain.handle('storage:create-project', async (event, project: Project) => {
    validateTrustedSender(event)
    const store = ensureStorage()
    await store.createProject(project)
    return { success: true }
  })

  // Get active project (uses workspace state)
  ipcMain.handle('storage:get-active-project', async (event) => {
    validateTrustedSender(event)
    const store = ensureStorage()

    try {
      const workspace = await store.getWorkspace()

      if (!workspace || !workspace.project) {
        console.log('[StorageHandlers] No active project in workspace')
        return null
      }

      console.log(
        '[StorageHandlers] ✅ Active project:',
        workspace.project.name
      )
      return workspace.project
    } catch (error) {
      console.error('[StorageHandlers] ❌ Failed to get active project:', error)
      return null
    }
  })

  // Get recent projects
  ipcMain.handle('storage:get-recent-projects', async (event) => {
    validateTrustedSender(event)
    const store = ensureStorage()

    try {
      // getProjects() already returns sorted by last_opened_at DESC
      const projects = await store.getProjects()

      // Map snake_case to camelCase for frontend
      const mappedProjects = projects.map((p: Project) => ({
        id: p.id,
        name: p.name,
        path: p.path,
        rootPath: p.path,
        createdAt: new Date(p.created_at),
        lastOpenedAt: new Date(p.last_opened_at),
      }))

      console.log(
        '[StorageHandlers] ✅ Retrieved',
        mappedProjects.length,
        'recent projects'
      )
      return mappedProjects
    } catch (error) {
      console.error(
        '[StorageHandlers] ❌ Failed to get recent projects:',
        error
      )
      return []
    }
  })

  // Add recent project
  ipcMain.handle(
    'storage:add-recent-project',
    async (event, project: Partial<ProjectInput> & { path: string }) => {
      validateTrustedSender(event)
      const store = ensureStorage()

      try {
        // Validate project data
        if (!project || !project.path) {
          throw new Error('Project must have a path')
        }

        // Check if project already exists by path
        const existing = await store.getProjectByPath(project.path)

        if (existing) {
          // Update last opened timestamp
          await store.updateProjectLastOpened(existing.id)
          console.log(
            '[StorageHandlers] ✅ Updated existing project:',
            existing.name
          )
          return { success: true, projectId: existing.id }
        }

        // Create new project
        const projectData: ProjectInput = {
          id:
            project.id ||
            `proj_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          name: project.name || project.path.split('/').pop() || 'Untitled',
          path: project.path,
          createdAt:
            project.createdAt instanceof Date ? project.createdAt : new Date(),
          lastOpenedAt:
            project.lastOpenedAt instanceof Date
              ? project.lastOpenedAt
              : new Date(),
        }

        await store.saveProject(projectData)
        console.log('[StorageHandlers] ✅ Added new project:', projectData.name)
        return { success: true, projectId: projectData.id }
      } catch (error) {
        console.error(
          '[StorageHandlers] ❌ Failed to add recent project:',
          error
        )
        throw error
      }
    }
  )

  // Update project last opened
  ipcMain.handle(
    'storage:update-project-last-opened',
    async (event, projectId: string) => {
      validateTrustedSender(event)
      const store = ensureStorage()

      try {
        await store.updateProjectLastOpened(projectId)
        console.log(
          '[StorageHandlers] ✅ Updated project last opened:',
          projectId
        )
        return { success: true }
      } catch (error) {
        console.error(
          '[StorageHandlers] ❌ Failed to update project last opened:',
          error
        )
        throw error
      }
    }
  )

  // Remove recent project
  ipcMain.handle(
    'storage:remove-recent-project',
    async (event, projectId: string) => {
      validateTrustedSender(event)
      const store = ensureStorage()

      try {
        await store.deleteProject(projectId)
        console.log('[StorageHandlers] ✅ Removed project:', projectId)
        return { success: true }
      } catch (error) {
        console.error('[StorageHandlers] ❌ Failed to remove project:', error)
        throw error
      }
    }
  )

  // Clear recent projects
  ipcMain.handle('storage:clear-recent-projects', async (event) => {
    validateTrustedSender(event)
    const store = ensureStorage()

    try {
      await store.clearAllProjects()
      console.log('[StorageHandlers] ✅ Cleared all recent projects')
      return { success: true }
    } catch (error) {
      console.error(
        '[StorageHandlers] ❌ Failed to clear recent projects:',
        error
      )
      throw error
    }
  })

  // Get IDE config
  ipcMain.handle('storage:get-ide-config', async (event) => {
    validateTrustedSender(event)
    // Return default IDE config
    return {
      version: '1.0.0',
      ui: {
        theme: 'auto' as const,
        sidebarWidth: 250,
        terminalHeight: 300,
      },
      editor: {
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        tabSize: 2,
        wordWrap: true,
      },
      projectHistoryLimit: 10,
    }
  })

  // Update IDE config
  ipcMain.handle(
    'storage:update-ide-config',
    async (event, config: Partial<IDEConfig>) => {
      validateTrustedSender(event)
      // TODO: Implement IDE config update
      console.log('[StorageHandlers] Update IDE config:', config)
      return { success: true }
    }
  )

  // Get security info
  ipcMain.handle('storage:get-security-info', async (event) => {
    validateTrustedSender(event)
    return {
      platform: process.platform,
      encryptionAvailable: true,
      backend: 'electron-store',
      keyringService: 'system',
    }
  })

  // Validate project path
  ipcMain.handle(
    'storage:validate-project-path',
    async (event, path: string) => {
      validateTrustedSender(event)
      // TODO: Implement path validation
      return {
        valid: true,
        name: path.split('/').pop() || 'Project',
      }
    }
  )

  // Check path
  ipcMain.handle('storage:check-path', async (event, _path: string) => {
    validateTrustedSender(event)
    // TODO: Implement path checking
    return {
      exists: true,
      isDirectory: true,
    }
  })
}

/**
 * Register workspace management handlers
 *
 * @remarks
 * Workspace persistence is critical for maintaining project state between sessions.
 * Uses ElectronStorageManager's workspace methods which delegate to the underlying
 * StorageManager to persist workspace as JSON in a dedicated key.
 *
 * @private
 */
function registerWorkspaceHandlers(): void {
  // Get workspace
  ipcMain.handle('storage:get-workspace', async (event) => {
    validateTrustedSender(event)
    const store = ensureStorage()

    try {
      // Get workspace from storage using ElectronStorageManager method
      const workspace = await store.getWorkspace()

      if (!workspace) {
        console.log('[StorageHandlers] No workspace found in storage')
        return null
      }

      console.log(
        '[StorageHandlers] ✅ Loaded workspace from storage:',
        workspace.project?.name || '(no project)'
      )
      return workspace
    } catch (error) {
      console.error('[StorageHandlers] ❌ Failed to get workspace:', error)
      return null
    }
  })

  // Set workspace
  ipcMain.handle(
    'storage:set-workspace',
    async (event, workspace: Workspace) => {
      validateTrustedSender(event)
      const store = ensureStorage()

      try {
        // Validate workspace data
        if (!workspace || typeof workspace !== 'object') {
          throw new Error('Invalid workspace data')
        }

        if (!workspace.project || !workspace.project.path) {
          throw new Error('Workspace must have a project with a path')
        }

        // Save workspace to storage using ElectronStorageManager method
        await store.setWorkspace(workspace)

        console.log(
          '[StorageHandlers] ✅ Saved workspace to storage:',
          workspace.project.name
        )
        return { success: true }
      } catch (error) {
        console.error('[StorageHandlers] ❌ Failed to set workspace:', error)
        throw error
      }
    }
  )

  // Clear workspace
  ipcMain.handle('storage:clear-workspace', async (event) => {
    validateTrustedSender(event)
    const store = ensureStorage()

    try {
      // Delete workspace from storage using ElectronStorageManager method
      await store.clearWorkspace()

      console.log('[StorageHandlers] ✅ Cleared workspace from storage')
      return { success: true }
    } catch (error) {
      console.error('[StorageHandlers] ❌ Failed to clear workspace:', error)
      throw error
    }
  })

  // Add task
  ipcMain.handle('storage:add-task', async (event, task: Task) => {
    validateTrustedSender(event)
    const store = ensureStorage()

    try {
      // Get current workspace
      const workspace = (await store.getWorkspace()) || {
        project: null,
        activeTasks: [],
        currentTaskId: null,
      }

      // Ensure activeTasks array exists
      if (!workspace.activeTasks) {
        workspace.activeTasks = []
      }

      // Add task to workspace
      workspace.activeTasks.push(task)

      // Save updated workspace
      await store.setWorkspace(workspace)

      console.log('[StorageHandlers] ✅ Added task:', task.id || task.name)
      return { success: true }
    } catch (error) {
      console.error('[StorageHandlers] ❌ Failed to add task:', error)
      throw error
    }
  })

  // Remove task
  ipcMain.handle('storage:remove-task', async (event, taskId: string) => {
    validateTrustedSender(event)
    const store = ensureStorage()

    try {
      // Get current workspace
      const workspace = await store.getWorkspace()

      if (!workspace || !workspace.activeTasks) {
        console.log('[StorageHandlers] No workspace or tasks to remove from')
        return { success: true }
      }

      // Remove task from activeTasks
      workspace.activeTasks = workspace.activeTasks.filter(
        (t: Task) => t.id !== taskId
      )

      // Clear currentTaskId if it was the removed task
      if (workspace.currentTaskId === taskId) {
        workspace.currentTaskId = null
      }

      // Save updated workspace
      await store.setWorkspace(workspace)

      console.log('[StorageHandlers] ✅ Removed task:', taskId)
      return { success: true }
    } catch (error) {
      console.error('[StorageHandlers] ❌ Failed to remove task:', error)
      throw error
    }
  })

  // Set current task
  ipcMain.handle(
    'storage:set-current-task',
    async (event, taskId: string | null) => {
      validateTrustedSender(event)
      const store = ensureStorage()

      try {
        // Get current workspace
        const workspace = await store.getWorkspace()

        if (!workspace) {
          console.log('[StorageHandlers] No workspace to set current task')
          return { success: false, error: 'No workspace found' }
        }

        // Set current task ID
        workspace.currentTaskId = taskId

        // Save updated workspace
        await store.setWorkspace(workspace)

        console.log('[StorageHandlers] ✅ Set current task:', taskId || 'null')
        return { success: true }
      } catch (error) {
        console.error('[StorageHandlers] ❌ Failed to set current task:', error)
        throw error
      }
    }
  )

  // Update task state
  ipcMain.handle(
    'storage:update-task-state',
    async (event, taskId: string, workState: Record<string, unknown>) => {
      validateTrustedSender(event)
      const store = ensureStorage()

      try {
        // Get current workspace
        const workspace = await store.getWorkspace()

        if (!workspace || !workspace.activeTasks) {
          console.log('[StorageHandlers] No workspace or tasks to update')
          return { success: false, error: 'No workspace found' }
        }

        // Find and update task state
        const taskIndex = workspace.activeTasks.findIndex(
          (t: Task) => t.id === taskId
        )

        if (taskIndex === -1) {
          console.log('[StorageHandlers] Task not found:', taskId)
          return { success: false, error: 'Task not found' }
        }

        // Update task with new work state
        workspace.activeTasks[taskIndex] = {
          ...workspace.activeTasks[taskIndex],
          workState,
          lastUpdated: Date.now(),
        }

        // Save updated workspace
        await store.setWorkspace(workspace)

        console.log('[StorageHandlers] ✅ Updated task state:', taskId)
        return { success: true }
      } catch (error) {
        console.error(
          '[StorageHandlers] ❌ Failed to update task state:',
          error
        )
        throw error
      }
    }
  )
}

/**
 * Register branch management handlers
 *
 * @private
 */
function registerBranchHandlers(): void {
  // Create branch
  ipcMain.handle(
    'storage:create-branch',
    async (event, projectId: string, branchName: string) => {
      validateTrustedSender(event)
      const store = ensureStorage()
      const branchId = await store.createBranch(projectId, branchName)
      return { success: true, branchId }
    }
  )

  // Switch branch
  ipcMain.handle('storage:switch-branch', async (event, branchId: string) => {
    validateTrustedSender(event)
    const store = ensureStorage()
    await store.switchBranch(branchId)
    return { success: true }
  })

  // Get active branch
  ipcMain.handle(
    'storage:get-active-branch',
    async (event, projectId: string) => {
      validateTrustedSender(event)
      const store = ensureStorage()
      const branch = await store.getActiveBranch(projectId)
      return branch
    }
  )
}

/**
 * Register conversation (DeckLog) handlers
 *
 * @private
 */
function registerConversationHandlers(): void {
  // Create conversation session
  ipcMain.handle(
    'storage:create-conversation-session',
    async (
      event,
      compositeProjectId: string,
      provider: string,
      model: string
    ) => {
      validateTrustedSender(event)
      const store = ensureStorage()

      // Parse the composite key (projectPath:branch)
      const parts = compositeProjectId.split(':')
      const projectPath = parts.slice(0, -1).join(':') || '' // Handle paths with colons
      const branch = parts[parts.length - 1] || 'main'

      // Handle empty project path (no project selected yet)
      if (!projectPath || projectPath.trim() === '') {
        console.log(
          '[StorageHandlers] No project path provided, using default workspace session'
        )

        // Use a default workspace project
        const defaultProjectPath = 'workspace'
        const defaultProjectName = 'Default Workspace'

        try {
          // Try to get or create default workspace project
          const projects = await store.getProjects()
          let workspaceProject = projects.find(
            (p) => p.path === defaultProjectPath
          )

          if (!workspaceProject) {
            // Create default workspace project
            const projectId = `proj_workspace_${Date.now()}`
            workspaceProject = {
              id: projectId,
              name: defaultProjectName,
              path: defaultProjectPath,
              createdAt: new Date(),
              lastOpenedAt: new Date(),
            }
            await store.saveProject(workspaceProject)
            console.log(
              '[StorageHandlers] Created default workspace project:',
              projectId
            )
          }

          // Create or get workspace branch
          const branchId = await store.createBranch(
            workspaceProject.id,
            branch || 'main'
          )

          // Create session in workspace
          const session: ConversationSession = {
            id: `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            project_id: workspaceProject.id,
            branch_id: branchId,
            session_title: `${provider}/${model} - ${new Date().toLocaleString()}`,
            provider,
            model,
            created_at: Date.now(),
            last_message_at: Date.now(),
            message_count: 0,
            total_tokens: 0,
            total_cost: 0,
          }

          await store.saveConversation(session)
          return session
        } catch (error) {
          console.warn(
            '[StorageHandlers] Failed to create workspace session, using in-memory:',
            error
          )
          // Fallback to in-memory session
          return {
            id: `temp_session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            project_id: 'temp',
            provider,
            model,
            messageCount: 0,
            totalTokens: 0,
            totalCost: 0,
            createdAt: new Date(),
            lastMessageAt: new Date(),
            metadata: {
              branch: branch || 'main',
              compositeId: compositeProjectId || ':main',
              temporary: true,
              error: String(error),
            },
          }
        }
      }

      // Ensure project exists or create it
      let projectId: string
      try {
        // Try to get existing project
        const projects = await store.getProjects()
        const existingProject = projects.find((p) => p.path === projectPath)

        if (existingProject) {
          projectId = existingProject.id
        } else {
          // Create new project
          const projectName = projectPath.split('/').pop() || 'Untitled'
          projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(7)}`
          await store.saveProject({
            id: projectId,
            name: projectName,
            path: projectPath,
            createdAt: new Date(),
            lastOpenedAt: new Date(),
          })
          console.log(
            '[StorageHandlers] Created new project:',
            projectId,
            projectPath
          )
        }
      } catch (error) {
        console.error('[StorageHandlers] Error managing project:', error)
        // Use project path as ID fallback
        projectId = projectPath
      }

      // Create or get branch
      let branchId: string
      try {
        branchId = await store.createBranch(projectId, branch)
      } catch (error) {
        console.warn(
          '[StorageHandlers] Error creating branch, using default:',
          error
        )
        branchId = `${projectId}_${branch}`
      }

      // Create a proper conversation session object
      const session: ConversationSession = {
        id: `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        project_id: projectId,
        branch_id: branchId,
        session_title: `${provider}/${model} - ${new Date().toLocaleString()}`,
        provider,
        model,
        created_at: Date.now(),
        last_message_at: Date.now(),
        message_count: 0,
        total_tokens: 0,
        total_cost: 0,
      }

      try {
        await store.saveConversation(session)
      } catch (error) {
        console.error(
          '[StorageHandlers] Error saving conversation, returning temporary session:',
          error
        )
        // Return session anyway for UI to work
        session.metadata = { ...session.metadata, saveError: true }
      }

      return session
    }
  )

  // Update conversation session
  ipcMain.handle(
    'storage:update-conversation-session',
    async (event, sessionId: string, updates: Partial<ConversationSession>) => {
      validateTrustedSender(event)
      const _store = ensureStorage()
      // TODO: Implement proper update method
      console.log('[StorageHandlers] Update session:', sessionId, updates)
      return { success: true }
    }
  )

  // Get conversation sessions for branch
  ipcMain.handle(
    'storage:get-conversation-sessions',
    async (event, compositeProjectId: string, limit?: number) => {
      validateTrustedSender(event)
      const store = ensureStorage()

      // Parse the composite key (projectPath:branch)
      const parts = compositeProjectId.split(':')
      const projectPath = parts.slice(0, -1).join(':') || ''
      const branch = parts[parts.length - 1] || 'main'

      // Handle empty project path
      if (!projectPath) {
        console.log(
          '[StorageHandlers] No project path, returning empty sessions'
        )
        return []
      }

      try {
        // Get or create project by path
        const projects = await store.getProjects()
        console.log(
          '[StorageHandlers] Looking for project with path:',
          projectPath
        )
        console.log(
          '[StorageHandlers] Available projects:',
          projects.map((p) => ({ id: p.id, path: p.path }))
        )
        let project = projects.find((p) => p.path === projectPath)

        if (!project) {
          console.log(
            '[StorageHandlers] ❌ Project not found, auto-registering:',
            projectPath
          )
          // Auto-register project if it doesn't exist
          try {
            const projectName =
              projectPath.split('/').pop() || 'Unknown Project'
            const projectId = await store.createProject({
              path: projectPath,
              name: projectName,
              lastOpened: new Date(),
            })
            // Fetch the project we just created
            const updatedProjects = await store.getProjects()
            project = updatedProjects.find((p) => p.id === projectId)
            console.log('[StorageHandlers] ✅ Auto-registered project:', {
              id: projectId,
              path: projectPath,
            })
          } catch (error) {
            console.error(
              '[StorageHandlers] Failed to auto-register project:',
              error
            )
            return []
          }
        }

        if (!project) {
          console.log('[StorageHandlers] ❌ Failed to get or create project')
          return []
        }

        console.log('[StorageHandlers] ✅ Using project:', {
          id: project.id,
          path: project.path,
        })

        // Look up the branch record to get its ID
        const _branches = await store.getProjects() // This isn't quite right, need a getBranches method
        // For now, query the branch directly from the database
        const branchRecord = store.db
          ?.prepare(
            'SELECT * FROM branches WHERE project_id = ? AND branch_name = ?'
          )
          .get(project.id, branch)
        console.log('[StorageHandlers] Branch lookup:', {
          project_id: project.id,
          branch_name: branch,
          result: branchRecord,
        })

        if (!branchRecord) {
          console.log('[StorageHandlers] ❌ Branch not found')
          return []
        }

        // Get sessions for this branch using the actual branch ID
        const sessions = await store.getConversationsForBranch(branchRecord.id)
        console.log(
          '[StorageHandlers] Found',
          sessions.length,
          'sessions for branch:',
          branchRecord.id
        )

        // Apply limit if specified
        if (limit && sessions.length > limit) {
          return sessions.slice(0, limit)
        }

        return sessions
      } catch (error) {
        console.error('[StorageHandlers] Error getting sessions:', error)
        return []
      }
    }
  )

  // Add message to session
  ipcMain.handle(
    'storage:add-message',
    async (event, message: AIMessageInput) => {
      validateTrustedSender(event)
      const store = ensureStorage()

      // Map camelCase from renderer to snake_case for storage
      const fullMessage: AIMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        session_id: message.sessionId || message.session_id || '',
        branch_id: message.branchId || message.branch_id || '',
        type: message.type,
        content: message.content,
        timestamp:
          typeof message.timestamp === 'number'
            ? message.timestamp
            : message.timestamp instanceof Date
              ? message.timestamp.getTime()
              : Date.now(),
        provider: message.provider,
        model: message.model,
        token_count: message.tokenCount || message.token_count,
        metadata_json:
          typeof message.metadata === 'string'
            ? message.metadata
            : typeof message.metadata_json === 'string'
              ? message.metadata_json
              : message.metadata
                ? JSON.stringify(message.metadata)
                : message.metadata_json
                  ? JSON.stringify(message.metadata_json)
                  : undefined,
      }

      // Validate required fields
      if (!fullMessage.session_id) {
        throw new Error('Message must have a session_id')
      }
      if (!fullMessage.branch_id) {
        throw new Error('Message must have a branch_id')
      }
      if (!fullMessage.provider) {
        throw new Error('Message must have a provider')
      }
      if (!fullMessage.model) {
        throw new Error('Message must have a model')
      }

      await store.saveMessage(fullMessage)

      // Fetch the message back to get parsed metadata
      const messages = await store.getMessagesForSession(fullMessage.session_id)
      const savedMessage = messages.find((m) => m.id === fullMessage.id)

      if (!savedMessage) {
        throw new Error(`Failed to retrieve saved message ${fullMessage.id}`)
      }

      return savedMessage
    }
  )

  // Get messages for session
  ipcMain.handle(
    'storage:get-messages',
    async (event, sessionId: string, limit?: number, offset?: number) => {
      validateTrustedSender(event)
      const store = ensureStorage()
      const messages = await store.getMessagesForSession(sessionId)
      // Apply pagination if requested
      if (limit !== undefined) {
        const start = offset || 0
        return messages.slice(start, start + limit)
      }
      return messages
    }
  )

  // Delete conversation session
  ipcMain.handle(
    'storage:delete-conversation-session',
    async (event, sessionId: string) => {
      validateTrustedSender(event)
      // TODO: Implement delete with CASCADE cleanup
      console.warn('Delete session not yet implemented:', sessionId)
      return { success: false, error: 'Not implemented' }
    }
  )
}

/**
 * Register action tracking handlers (DeckLog + Timegraph)
 *
 * @private
 */
function registerActionHandlers(): void {
  // Create action execution
  ipcMain.handle(
    'storage:create-action-execution',
    async (event, action: Omit<ActionExecution, 'id' | 'logs'>) => {
      validateTrustedSender(event)
      const store = ensureStorage()

      // Generate an ID and initialize logs array
      const fullAction: ActionExecution = {
        ...action,
        id: `action_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        logs: [],
      }

      await store.saveAction(fullAction)
      return fullAction
    }
  )

  // Update action status
  ipcMain.handle(
    'storage:update-action-status',
    async (
      event,
      actionId: string,
      status: ActionExecution['status'],
      result?: { success: boolean; output?: string; error?: string }
    ) => {
      validateTrustedSender(event)
      const store = ensureStorage()
      await store.updateActionStatus(actionId, status, result)
      return { success: true }
    }
  )

  // Get action executions for branch
  ipcMain.handle(
    'storage:get-action-executions',
    async (event, branchId: string) => {
      validateTrustedSender(event)
      // TODO: Implement get actions for branch
      console.warn('Get actions not yet implemented for branch:', branchId)
      return []
    }
  )

  // Append action log
  ipcMain.handle('storage:append-action-log', async (event, log: ActionLog) => {
    validateTrustedSender(event)
    // TODO: Implement action log insertion
    console.warn('Action log not yet implemented:', log)
    return { success: false, error: 'Not implemented' }
  })
}

/**
 * Register metrics and analytics handlers
 *
 * @private
 */
function registerMetricsHandlers(): void {
  // Get branch metrics
  ipcMain.handle(
    'storage:get-branch-metrics',
    async (event, branchId: string): Promise<BranchMetrics> => {
      validateTrustedSender(event)
      const store = ensureStorage()
      const metrics = await store.getBranchMetrics(branchId)
      return metrics
    }
  )

  // Get provider statistics
  ipcMain.handle(
    'storage:get-provider-stats',
    async (event, branchId: string): Promise<ProviderMetrics[]> => {
      validateTrustedSender(event)
      const store = ensureStorage()
      const stats = await store.getProviderStats(branchId)
      return stats
    }
  )

  // Get global statistics
  ipcMain.handle(
    'storage:get-global-stats',
    async (event): Promise<GlobalStats> => {
      validateTrustedSender(event)
      const store = ensureStorage()
      const stats = await store.getGlobalStats()
      return stats
    }
  )
}
