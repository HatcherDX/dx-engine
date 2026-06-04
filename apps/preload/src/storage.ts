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
 * Raw project data from IPC (with serialized dates as strings)
 *
 * @internal
 */
interface RawProjectData {
  id: string
  name: string
  path: string
  lastOpened: string | Date
  metadata?: {
    gitRemote?: string
    framework?: string
    packageManager?: string
    icon?: string
  }
}

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
 * AI conversation session interface
 *
 * @remarks
 * Represents a conversation session with an AI provider.
 * Tracks both provider ("claude-code") and model ("claude-sonnet-4-5-20250929").
 *
 * @public
 * @since 1.0.0
 */
export interface ConversationSession {
  /** Unique session identifier */
  id: string
  /** Project identifier this session belongs to */
  projectId: string
  /** Branch identifier this session belongs to (for 3-level isolation) */
  branchId: string
  /** User-defined session title */
  sessionTitle: string
  /** When session was created */
  createdAt: Date
  /** Last message timestamp */
  lastMessageAt: Date
  /** Total message count in session */
  messageCount: number
  /** AI provider identifier (e.g., 'claude-code', 'copilot') */
  provider: string
  /** AI model identifier (e.g., 'claude-sonnet-4-5-20250929') */
  model: string
  /** Total tokens used in session */
  totalTokens: number
  /** Estimated total cost in USD */
  totalCost: number
}

/**
 * AI message interface with encryption support
 *
 * @remarks
 * Message content is encrypted at rest using OS-native encryption.
 * Both provider and model are tracked at message level for granular analytics.
 *
 * @public
 * @since 1.0.0
 */
export interface AIMessage {
  /** Unique message identifier */
  id: string
  /** Session this message belongs to */
  sessionId: string
  /** Branch this message belongs to (for 3-level isolation) */
  branchId: string
  /** Message type */
  type: 'user' | 'assistant' | 'system'
  /** Message content (encrypted in storage) */
  content: string
  /** Message timestamp */
  timestamp: Date
  /** Provider used for this specific message */
  provider: string
  /** Model used for this specific message */
  model: string
  /** Optional token count for this message */
  tokenCount?: number
  /** Optional metadata for special message types */
  metadata?: {
    terminalWidget?: { command: string; output?: string }
    components?: unknown[]
    [key: string]: unknown
  }
}

/**
 * Action execution tracking interface
 *
 * @remarks
 * Tracks AI-triggered actions (file edits, bash commands, git operations).
 * Used for Decklog display and debugging.
 *
 * @public
 * @since 1.0.0
 */
export interface ActionExecution {
  /** Unique action identifier */
  id: string
  /** Session where action was triggered */
  sessionId: string
  /** Message that triggered this action */
  messageId: string
  /** Type of action executed */
  actionType: 'file_edit' | 'bash_command' | 'git_operation' | 'terminal_create'
  /** Human-readable action name */
  actionName: string
  /** Current execution status */
  status: 'pending' | 'running' | 'completed' | 'failed'
  /** When action started */
  startedAt: Date
  /** When action completed (if completed) */
  completedAt?: Date
  /** Action execution logs */
  logs: ActionLog[]
  /** Action result (if completed) */
  result?: {
    success: boolean
    output?: string
    error?: string
  }
}

/**
 * Action execution log entry
 *
 * @public
 * @since 1.0.0
 */
export interface ActionLog {
  /** Log entry timestamp */
  timestamp: Date
  /** Log severity level */
  level: 'info' | 'warn' | 'error' | 'debug'
  /** Log message */
  message: string
  /** Optional structured log data */
  data?: Record<string, unknown>
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
    metadata?: ProjectInfo['metadata']
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

  // Conversation management
  createConversationSession(
    projectId: string,
    provider: string,
    model: string
  ): Promise<ConversationSession>
  getConversationSessions(
    projectId: string,
    limit?: number
  ): Promise<ConversationSession[]>
  updateConversationSession(
    sessionId: string,
    updates: Partial<ConversationSession>
  ): Promise<void>
  deleteConversationSession(sessionId: string): Promise<void>

  // Message management
  addMessage(message: Omit<AIMessage, 'id'>): Promise<AIMessage>
  getMessages(
    sessionId: string,
    limit?: number,
    offset?: number
  ): Promise<AIMessage[]>
  updateMessage(messageId: string, updates: Partial<AIMessage>): Promise<void>
  deleteMessage(messageId: string): Promise<void>

  // Action execution tracking
  createActionExecution(
    action: Omit<ActionExecution, 'id' | 'logs'>
  ): Promise<ActionExecution>
  appendActionLog(actionId: string, log: ActionLog): Promise<void>
  updateActionStatus(
    actionId: string,
    status: ActionExecution['status'],
    result?: ActionExecution['result']
  ): Promise<void>
  getActionExecutions(sessionId: string): Promise<ActionExecution[]>
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
      return projects.map((project: RawProjectData) => ({
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
    metadata?: ProjectInfo['metadata']
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

        workspace.activeTasks = workspace.activeTasks.map(
          (task: Record<string, unknown>) => ({
            ...task,
            openedAt: new Date(task.openedAt as string | Date),
            lastActiveAt: new Date(task.lastActiveAt as string | Date),
          })
        )

        workspace.taskHistory = workspace.taskHistory.map(
          (entry: Record<string, unknown>) => ({
            ...entry,
            openedAt: new Date(entry.openedAt as string | Date),
            closedAt: new Date(entry.closedAt as string | Date),
          })
        )
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

  /**
   * Create a new conversation session
   *
   * @param projectId - Project identifier
   * @param provider - AI provider identifier
   * @param model - AI model identifier
   * @returns Promise resolving to created session
   *
   * @throws {Error} When parameters are invalid or operation fails
   */
  async createConversationSession(
    projectId: string,
    provider: string,
    model: string
  ): Promise<ConversationSession> {
    if (
      !projectId ||
      typeof projectId !== 'string' ||
      projectId.trim().length === 0
    ) {
      throw new Error('Project ID is required and must be a non-empty string')
    }

    if (
      !provider ||
      typeof provider !== 'string' ||
      provider.trim().length === 0
    ) {
      throw new Error('Provider is required and must be a non-empty string')
    }

    if (!model || typeof model !== 'string' || model.trim().length === 0) {
      throw new Error('Model is required and must be a non-empty string')
    }

    try {
      const session = await ipcRenderer.invoke(
        'storage:create-conversation-session',
        projectId.trim(),
        provider.trim(),
        model.trim()
      )

      // Transform snake_case fields from backend to camelCase for frontend
      return {
        id: session.id,
        projectId: session.project_id || session.projectId,
        branchId: session.branch_id || session.branchId,
        sessionTitle: session.session_title || session.sessionTitle,
        provider: session.provider,
        model: session.model,
        messageCount: session.message_count ?? session.messageCount ?? 0,
        totalTokens: session.total_tokens ?? session.totalTokens ?? 0,
        totalCost: session.total_cost ?? session.totalCost ?? 0,
        createdAt: new Date(session.created_at || session.createdAt),
        lastMessageAt: new Date(
          session.last_message_at || session.lastMessageAt
        ),
      } as ConversationSession
    } catch (error) {
      console.error(
        '[StorageAPI] Failed to create conversation session:',
        error
      )
      throw new Error(`Failed to create conversation session: ${error}`)
    }
  },

  /**
   * Get conversation sessions for a project
   *
   * @param projectId - Project identifier
   * @param limit - Optional limit on number of sessions
   * @returns Promise resolving to array of sessions
   *
   * @throws {Error} When operation fails
   */
  async getConversationSessions(
    projectId: string,
    limit?: number
  ): Promise<ConversationSession[]> {
    if (
      !projectId ||
      typeof projectId !== 'string' ||
      projectId.trim().length === 0
    ) {
      throw new Error('Project ID is required and must be a non-empty string')
    }

    try {
      const sessions = await ipcRenderer.invoke(
        'storage:get-conversation-sessions',
        projectId.trim(),
        limit
      )

      console.log('[StorageAPI] Raw sessions from backend:', sessions)

      // Transform snake_case fields from backend to camelCase for frontend
      return sessions.map((session: Record<string, unknown>) => {
        console.log('[StorageAPI] Transforming session:', session)
        const transformed = {
          id: session.id,
          projectId: session.project_id || session.projectId,
          branchId: session.branch_id || session.branchId,
          sessionTitle: session.session_title || session.sessionTitle,
          provider: session.provider,
          model: session.model,
          messageCount: session.message_count ?? session.messageCount ?? 0,
          totalTokens: session.total_tokens ?? session.totalTokens ?? 0,
          totalCost: session.total_cost ?? session.totalCost ?? 0,
          createdAt: new Date(
            (session.created_at || session.createdAt) as string | Date
          ),
          lastMessageAt: new Date(
            (session.last_message_at || session.lastMessageAt) as string | Date
          ),
        } as ConversationSession
        console.log('[StorageAPI] Transformed session:', transformed)
        return transformed
      })
    } catch (error) {
      console.error('[StorageAPI] Failed to get conversation sessions:', error)
      throw new Error(`Failed to get conversation sessions: ${error}`)
    }
  },

  /**
   * Update conversation session
   *
   * @param sessionId - Session identifier
   * @param updates - Partial session updates
   * @returns Promise that resolves when update completes
   *
   * @throws {Error} When parameters are invalid or operation fails
   */
  async updateConversationSession(
    sessionId: string,
    updates: Partial<ConversationSession>
  ): Promise<void> {
    if (
      !sessionId ||
      typeof sessionId !== 'string' ||
      sessionId.trim().length === 0
    ) {
      throw new Error('Session ID is required and must be a non-empty string')
    }

    if (!updates || typeof updates !== 'object') {
      throw new Error('Updates are required and must be an object')
    }

    try {
      await ipcRenderer.invoke(
        'storage:update-conversation-session',
        sessionId.trim(),
        updates
      )
    } catch (error) {
      console.error(
        '[StorageAPI] Failed to update conversation session:',
        error
      )
      throw new Error(`Failed to update conversation session: ${error}`)
    }
  },

  /**
   * Delete conversation session and its messages
   *
   * @param sessionId - Session identifier
   * @returns Promise that resolves when deletion completes
   *
   * @throws {Error} When session ID is invalid or operation fails
   */
  async deleteConversationSession(sessionId: string): Promise<void> {
    if (
      !sessionId ||
      typeof sessionId !== 'string' ||
      sessionId.trim().length === 0
    ) {
      throw new Error('Session ID is required and must be a non-empty string')
    }

    try {
      await ipcRenderer.invoke(
        'storage:delete-conversation-session',
        sessionId.trim()
      )
    } catch (error) {
      console.error(
        '[StorageAPI] Failed to delete conversation session:',
        error
      )
      throw new Error(`Failed to delete conversation session: ${error}`)
    }
  },

  /**
   * Add message to conversation session
   *
   * @param message - Message data (without id)
   * @returns Promise resolving to created message with id
   *
   * @throws {Error} When message data is invalid or operation fails
   */
  async addMessage(message: Omit<AIMessage, 'id'>): Promise<AIMessage> {
    if (!message || typeof message !== 'object') {
      throw new Error('Message data is required')
    }

    if (!message.sessionId || !message.type || !message.content) {
      throw new Error('Message must have sessionId, type, and content')
    }

    if (!message.provider || !message.model) {
      throw new Error('Message must have provider and model')
    }

    try {
      const savedMessage = await ipcRenderer.invoke(
        'storage:add-message',
        message
      )

      // Convert dates from strings
      return {
        ...savedMessage,
        timestamp: new Date(savedMessage.timestamp),
      }
    } catch (error) {
      console.error('[StorageAPI] Failed to add message:', error)
      throw new Error(`Failed to add message: ${error}`)
    }
  },

  /**
   * Get messages from conversation session
   *
   * @param sessionId - Session identifier
   * @param limit - Optional limit on number of messages
   * @param offset - Optional offset for pagination
   * @returns Promise resolving to array of messages
   *
   * @throws {Error} When operation fails
   */
  async getMessages(
    sessionId: string,
    limit?: number,
    offset?: number
  ): Promise<AIMessage[]> {
    if (
      !sessionId ||
      typeof sessionId !== 'string' ||
      sessionId.trim().length === 0
    ) {
      throw new Error('Session ID is required and must be a non-empty string')
    }

    try {
      const messages = await ipcRenderer.invoke(
        'storage:get-messages',
        sessionId.trim(),
        limit,
        offset
      )

      // Convert dates from strings
      return messages.map((message: Record<string, unknown>) => ({
        ...message,
        timestamp: new Date(message.timestamp as string | Date),
      }))
    } catch (error) {
      console.error('[StorageAPI] Failed to get messages:', error)
      throw new Error(`Failed to get messages: ${error}`)
    }
  },

  /**
   * Update an existing message
   *
   * @param messageId - Message identifier
   * @param updates - Partial message updates
   * @returns Promise that resolves when update completes
   *
   * @throws {Error} When parameters are invalid or operation fails
   */
  async updateMessage(
    messageId: string,
    updates: Partial<AIMessage>
  ): Promise<void> {
    if (
      !messageId ||
      typeof messageId !== 'string' ||
      messageId.trim().length === 0
    ) {
      throw new Error('Message ID is required and must be a non-empty string')
    }

    if (!updates || typeof updates !== 'object') {
      throw new Error('Updates are required and must be an object')
    }

    try {
      await ipcRenderer.invoke(
        'storage:update-message',
        messageId.trim(),
        updates
      )
    } catch (error) {
      console.error('[StorageAPI] Failed to update message:', error)
      throw new Error(`Failed to update message: ${error}`)
    }
  },

  /**
   * Delete a message from conversation
   *
   * @param messageId - Message identifier
   * @returns Promise that resolves when deletion completes
   *
   * @throws {Error} When message ID is invalid or operation fails
   */
  async deleteMessage(messageId: string): Promise<void> {
    if (
      !messageId ||
      typeof messageId !== 'string' ||
      messageId.trim().length === 0
    ) {
      throw new Error('Message ID is required and must be a non-empty string')
    }

    try {
      await ipcRenderer.invoke('storage:delete-message', messageId.trim())
    } catch (error) {
      console.error('[StorageAPI] Failed to delete message:', error)
      throw new Error(`Failed to delete message: ${error}`)
    }
  },

  /**
   * Create action execution record
   *
   * @param action - Action data (without id and logs)
   * @returns Promise resolving to created action with id
   *
   * @throws {Error} When action data is invalid or operation fails
   */
  async createActionExecution(
    action: Omit<ActionExecution, 'id' | 'logs'>
  ): Promise<ActionExecution> {
    if (!action || typeof action !== 'object') {
      throw new Error('Action data is required')
    }

    if (
      !action.sessionId ||
      !action.messageId ||
      !action.actionType ||
      !action.actionName
    ) {
      throw new Error(
        'Action must have sessionId, messageId, actionType, and actionName'
      )
    }

    try {
      const execution = await ipcRenderer.invoke(
        'storage:create-action-execution',
        action
      )

      // Convert dates from strings
      return {
        ...execution,
        startedAt: new Date(execution.startedAt),
        completedAt: execution.completedAt
          ? new Date(execution.completedAt)
          : undefined,
        logs: execution.logs.map((log: Record<string, unknown>) => ({
          ...log,
          timestamp: new Date(log.timestamp as string | Date),
        })),
      }
    } catch (error) {
      console.error('[StorageAPI] Failed to create action execution:', error)
      throw new Error(`Failed to create action execution: ${error}`)
    }
  },

  /**
   * Append log entry to action execution
   *
   * @param actionId - Action identifier
   * @param log - Log entry to append
   * @returns Promise that resolves when log is appended
   *
   * @throws {Error} When parameters are invalid or operation fails
   */
  async appendActionLog(actionId: string, log: ActionLog): Promise<void> {
    if (
      !actionId ||
      typeof actionId !== 'string' ||
      actionId.trim().length === 0
    ) {
      throw new Error('Action ID is required and must be a non-empty string')
    }

    if (!log || typeof log !== 'object' || !log.level || !log.message) {
      throw new Error('Log must have level and message')
    }

    try {
      await ipcRenderer.invoke(
        'storage:append-action-log',
        actionId.trim(),
        log
      )
    } catch (error) {
      console.error('[StorageAPI] Failed to append action log:', error)
      throw new Error(`Failed to append action log: ${error}`)
    }
  },

  /**
   * Update action execution status
   *
   * @param actionId - Action identifier
   * @param status - New status
   * @param result - Optional execution result
   * @returns Promise that resolves when status is updated
   *
   * @throws {Error} When parameters are invalid or operation fails
   */
  async updateActionStatus(
    actionId: string,
    status: ActionExecution['status'],
    result?: ActionExecution['result']
  ): Promise<void> {
    if (
      !actionId ||
      typeof actionId !== 'string' ||
      actionId.trim().length === 0
    ) {
      throw new Error('Action ID is required and must be a non-empty string')
    }

    if (!status || typeof status !== 'string') {
      throw new Error('Status is required and must be a string')
    }

    try {
      await ipcRenderer.invoke(
        'storage:update-action-status',
        actionId.trim(),
        status,
        result
      )
    } catch (error) {
      console.error('[StorageAPI] Failed to update action status:', error)
      throw new Error(`Failed to update action status: ${error}`)
    }
  },

  /**
   * Get action executions for a session
   *
   * @param sessionId - Session identifier
   * @returns Promise resolving to array of action executions
   *
   * @throws {Error} When operation fails
   */
  async getActionExecutions(sessionId: string): Promise<ActionExecution[]> {
    if (
      !sessionId ||
      typeof sessionId !== 'string' ||
      sessionId.trim().length === 0
    ) {
      throw new Error('Session ID is required and must be a non-empty string')
    }

    try {
      const actions = await ipcRenderer.invoke(
        'storage:get-action-executions',
        sessionId.trim()
      )

      // Convert dates from strings
      return actions.map((action: Record<string, unknown>) => ({
        ...action,
        startedAt: new Date(action.startedAt as string | Date),
        completedAt: action.completedAt
          ? new Date(action.completedAt as string | Date)
          : undefined,
        logs: (action.logs as Array<Record<string, unknown>>).map(
          (log: Record<string, unknown>) => ({
            ...log,
            timestamp: new Date(log.timestamp as string | Date),
          })
        ),
      }))
    } catch (error) {
      console.error('[StorageAPI] Failed to get action executions:', error)
      throw new Error(`Failed to get action executions: ${error}`)
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
