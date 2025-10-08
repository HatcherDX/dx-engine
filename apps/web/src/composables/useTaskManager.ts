/**
 * @fileoverview Task and workspace lifecycle management composable
 *
 * @description
 * Manages task sessions, workspace state persistence, and branch switching
 * with proper Git integration. Handles task opening/closing, uncommitted
 * changes detection, and state restoration.
 *
 * @example
 * ```typescript
 * const taskManager = useTaskManager()
 *
 * // Open a project with a task
 * await taskManager.openProject(projectInfo, taskConfig)
 *
 * // Check for uncommitted changes before switching
 * const canSwitch = await taskManager.canSwitchTask()
 *
 * // Close current task
 * await taskManager.closeCurrentTask()
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { ref, computed } from 'vue'
import { useGitIntegration } from './useGitIntegration'
import { useOnboarding } from './useOnboarding'

/**
 * Task session type matching storage interface
 *
 * @public
 */
export interface TaskSession {
  id: string
  branchName: string
  taskType: 'feature' | 'bug' | 'docs' | 'maintenance' | 'refactor'
  status: 'active' | 'pending-changes' | 'ready-to-close'
  openedAt: Date
  lastActiveAt: Date
  workState: {
    hasUncommittedChanges?: boolean
    hasUnpushedCommits?: boolean
    lastCommitMessage?: string
    modifiedFiles?: string[]
  }
  sessionData?: {
    openEditors?: string[]
    selectedFile?: string
    scrollPositions?: Record<string, number>
  }
}

/**
 * Workspace state matching storage interface
 *
 * @public
 */
export interface WorkspaceState {
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
  activeTasks: TaskSession[]
  taskHistory: Array<{
    id: string
    branchName: string
    taskType: TaskSession['taskType']
    openedAt: Date
    closedAt: Date
    completionStatus: 'completed' | 'abandoned' | 'merged' | 'closed'
  }>
  currentTaskId: string | null
}

/**
 * Task configuration for opening a new task
 *
 * @public
 */
export interface TaskConfig {
  branchName: string
  taskType: TaskSession['taskType']
  taskDescription?: string
}

// Global task manager state
const workspace = ref<WorkspaceState | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

// Flag to track if we've loaded from storage
let hasLoadedFromStorage = false

/**
 * Reset shared state for testing
 *
 * @remarks
 * This function is exported for testing purposes only.
 * It resets the module-level state to allow proper test isolation.
 *
 * @internal
 */
export function resetTaskManagerState(): void {
  hasLoadedFromStorage = false
  workspace.value = null
  isLoading.value = false
  error.value = null
}

/**
 * Load workspace from storage on initialization
 *
 * @internal
 */
export async function loadWorkspace(): Promise<void> {
  if (hasLoadedFromStorage) {
    return // Already loaded
  }

  try {
    if (!window.storageAPI) {
      console.warn('[TaskManager] Storage API not available')
      return
    }

    isLoading.value = true
    const storedWorkspace = await window.storageAPI.getWorkspace()

    if (storedWorkspace) {
      workspace.value = storedWorkspace
      console.log(
        '[TaskManager] Loaded workspace:',
        storedWorkspace.project.name
      )
    }

    hasLoadedFromStorage = true
  } catch (err) {
    console.error('[TaskManager] Failed to load workspace:', err)
    error.value = 'Failed to load workspace state'
  } finally {
    isLoading.value = false
  }
}

// Load workspace on module initialization
loadWorkspace()

/**
 * Task manager composable
 *
 * @returns Task management functions and state
 *
 * @public
 */
export function useTaskManager() {
  const gitIntegration = useGitIntegration()
  const { triggerOnboarding } = useOnboarding()

  // Computed properties
  const currentProject = computed(() => workspace.value?.project || null)
  const currentTask = computed(() => {
    if (!workspace.value || !workspace.value.currentTaskId) return null
    return (
      workspace.value.activeTasks.find(
        (t) => t.id === workspace.value!.currentTaskId
      ) || null
    )
  })
  const activeTasks = computed(() => workspace.value?.activeTasks || [])
  const hasUncommittedChanges = computed(
    () => currentTask.value?.workState.hasUncommittedChanges || false
  )

  /**
   * Open a project with an initial task
   *
   * @param projectInfo - Project information
   * @param taskConfig - Initial task configuration
   * @returns Promise that resolves when project is opened
   *
   * @public
   */
  async function openProject(
    projectInfo: {
      path: string
      name: string
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Project metadata allows flexible structure for different frameworks
      metadata?: any
    },
    taskConfig?: TaskConfig
  ): Promise<void> {
    try {
      isLoading.value = true
      error.value = null

      // Create initial task if provided
      const initialTask: TaskSession | undefined = taskConfig
        ? {
            id: crypto.randomUUID(),
            branchName: taskConfig.branchName,
            taskType: taskConfig.taskType,
            status: 'active',
            openedAt: new Date(),
            lastActiveAt: new Date(),
            workState: {
              hasUncommittedChanges: false,
            },
          }
        : undefined

      // Create workspace state
      const newWorkspace: WorkspaceState = {
        project: {
          path: projectInfo.path,
          name: projectInfo.name,
          lastOpened: new Date(),
          metadata: projectInfo.metadata,
        },
        activeTasks: initialTask ? [initialTask] : [],
        taskHistory: [],
        currentTaskId: initialTask?.id || null,
      }

      // Save to storage
      if (window.storageAPI) {
        await window.storageAPI.setWorkspace(newWorkspace)
      }

      // Update local state
      workspace.value = newWorkspace

      // If task provided, switch to its branch
      if (taskConfig) {
        await gitIntegration.switchBranch(
          projectInfo.path,
          taskConfig.branchName
        )
      }

      console.log('[TaskManager] Opened project:', projectInfo.name)
    } catch (err) {
      console.error('[TaskManager] Failed to open project:', err)
      error.value = `Failed to open project: ${err}`
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Add a new task to the current workspace
   *
   * @param taskConfig - Task configuration
   * @returns Promise that resolves to the created task
   *
   * @public
   */
  async function addTask(taskConfig: TaskConfig): Promise<TaskSession> {
    if (!workspace.value) {
      throw new Error('No workspace open')
    }

    try {
      isLoading.value = true
      error.value = null

      const newTask: TaskSession = {
        id: crypto.randomUUID(),
        branchName: taskConfig.branchName,
        taskType: taskConfig.taskType,
        status: 'active',
        openedAt: new Date(),
        lastActiveAt: new Date(),
        workState: {
          hasUncommittedChanges: false,
        },
      }

      // Add to storage
      if (window.storageAPI) {
        await window.storageAPI.addTask(newTask)
      }

      // Update local state
      workspace.value.activeTasks.push(newTask)

      console.log('[TaskManager] Added task:', newTask.branchName)
      return newTask
    } catch (err) {
      console.error('[TaskManager] Failed to add task:', err)
      error.value = `Failed to add task: ${err}`
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Switch to a different task
   *
   * @param taskId - ID of task to switch to
   * @param force - Force switch even with uncommitted changes
   * @returns Promise that resolves when switch completes
   *
   * @public
   */
  async function switchTask(taskId: string, force = false): Promise<void> {
    if (!workspace.value) {
      throw new Error('No workspace open')
    }

    const targetTask = workspace.value.activeTasks.find((t) => t.id === taskId)
    if (!targetTask) {
      throw new Error(`Task not found: ${taskId}`)
    }

    try {
      isLoading.value = true
      error.value = null

      // Check for uncommitted changes
      if (!force && currentTask.value) {
        const status = await gitIntegration.getGitStatus(
          workspace.value.project.path
        )
        if (status.length > 0) {
          throw new Error('Uncommitted changes in current branch')
        }
      }

      // Switch Git branch
      await gitIntegration.switchBranch(
        targetTask.branchName,
        workspace.value.project.path
      )

      // Update storage
      if (window.storageAPI) {
        await window.storageAPI.setCurrentTask(taskId)
      }

      // Update local state
      workspace.value.currentTaskId = taskId
      targetTask.lastActiveAt = new Date()

      console.log('[TaskManager] Switched to task:', targetTask.branchName)
    } catch (err) {
      console.error('[TaskManager] Failed to switch task:', err)
      error.value = `Failed to switch task: ${err}`
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Check if we can switch tasks (no uncommitted changes)
   *
   * @returns Promise that resolves to whether switching is safe
   *
   * @public
   */
  async function canSwitchTask(): Promise<boolean> {
    if (!currentTask.value || !workspace.value) {
      return true // No active task, can switch
    }

    try {
      const status = await gitIntegration.getGitStatus(
        workspace.value.project.path
      )
      return status.length === 0
    } catch (err) {
      console.error('[TaskManager] Failed to check Git status:', err)
      return false // Assume unsafe if we can't check
    }
  }

  /**
   * Update current task's work state
   *
   * @param workState - Updated work state
   * @returns Promise that resolves when update completes
   *
   * @public
   */
  async function updateTaskWorkState(
    workState: Partial<TaskSession['workState']>
  ): Promise<void> {
    if (!currentTask.value || !workspace.value) {
      throw new Error('No active task')
    }

    try {
      isLoading.value = true
      error.value = null

      // Update storage
      if (window.storageAPI) {
        await window.storageAPI.updateTaskState(currentTask.value.id, workState)
      }

      // Update local state
      currentTask.value.workState = {
        ...currentTask.value.workState,
        ...workState,
      }
      currentTask.value.lastActiveAt = new Date()

      console.log('[TaskManager] Updated task work state')
    } catch (err) {
      console.error('[TaskManager] Failed to update task state:', err)
      error.value = `Failed to update task state: ${err}`
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Close the current task
   *
   * @param completionStatus - How the task was completed
   * @returns Promise that resolves when task is closed
   *
   * @public
   */
  async function closeCurrentTask(
    completionStatus: 'completed' | 'abandoned' | 'merged' | 'closed' = 'closed'
  ): Promise<void> {
    if (!currentTask.value || !workspace.value) {
      throw new Error('No active task to close')
    }

    try {
      isLoading.value = true
      error.value = null

      const taskId = currentTask.value.id
      const taskBranchName = currentTask.value.branchName // Store branch name before modifying state

      // Remove from storage
      if (window.storageAPI) {
        await window.storageAPI.removeTask(taskId)
      }

      // Update local state - move to history
      const taskIndex = workspace.value.activeTasks.findIndex(
        (t) => t.id === taskId
      )
      if (taskIndex !== -1) {
        const closedTask = workspace.value.activeTasks[taskIndex]

        workspace.value.taskHistory.push({
          id: closedTask.id,
          branchName: closedTask.branchName,
          taskType: closedTask.taskType,
          openedAt: closedTask.openedAt,
          closedAt: new Date(),
          completionStatus,
        })

        workspace.value.activeTasks.splice(taskIndex, 1)

        // Switch to another task if available
        if (workspace.value.activeTasks.length > 0) {
          workspace.value.currentTaskId = workspace.value.activeTasks[0].id
        } else {
          workspace.value.currentTaskId = null
        }
      }

      console.log('[TaskManager] Closed task:', taskBranchName)
    } catch (err) {
      console.error('[TaskManager] Failed to close task:', err)
      error.value = `Failed to close task: ${err}`
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Close the entire workspace (project) and return to onboarding
   *
   * @returns Promise that resolves when workspace is closed
   *
   * @public
   */
  async function closeWorkspace(): Promise<void> {
    try {
      isLoading.value = true
      error.value = null

      // Clear from storage
      if (window.storageAPI) {
        await window.storageAPI.clearWorkspace()
      }

      // Clear local state
      workspace.value = null

      console.log('[TaskManager] Closed workspace')

      // Trigger onboarding after closing workspace
      console.log('[TaskManager] Triggering onboarding after workspace close')
      setTimeout(() => {
        triggerOnboarding()
      }, 100)
    } catch (err) {
      console.error('[TaskManager] Failed to close workspace:', err)
      error.value = `Failed to close workspace: ${err}`
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Check for uncommitted changes and update task state
   *
   * @returns Promise that resolves when check completes
   *
   * @public
   */
  async function checkForChanges(): Promise<void> {
    if (!currentTask.value || !workspace.value) {
      return
    }

    try {
      const status = await gitIntegration.getGitStatus(
        workspace.value.project.path
      )
      const hasChanges = status.length > 0

      if (hasChanges !== currentTask.value.workState.hasUncommittedChanges) {
        await updateTaskWorkState({
          hasUncommittedChanges: hasChanges,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Git status file objects require flexible typing from git integration
          modifiedFiles: status.map((f: any) => f.path),
        })
      }
    } catch (err) {
      console.error('[TaskManager] Failed to check for changes:', err)
    }
  }

  // Periodically check for changes
  setInterval(checkForChanges, 10000) // Every 10 seconds

  return {
    // State
    workspace: computed(() => workspace.value),
    currentProject,
    currentTask,
    activeTasks,
    hasUncommittedChanges,
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),

    // Methods
    openProject,
    addTask,
    switchTask,
    canSwitchTask,
    updateTaskWorkState,
    closeCurrentTask,
    closeWorkspace,
    checkForChanges,
  }
}
