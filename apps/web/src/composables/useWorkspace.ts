/**
 * @fileoverview Workspace composable for project and branch state management.
 *
 * @description
 * Direct storage API integration for workspace state without Pinia.
 * Manages current project path, Git branch, and provides reactive state.
 *
 * @example
 * ```typescript
 * const {
 *   currentProjectPath,
 *   currentBranch,
 *   setProject,
 *   setBranch
 * } = useWorkspace()
 *
 * await setProject('/home/user/project')
 * await setBranch('feature/new-ui')
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import type {
  WorkspaceState,
  TaskSession,
} from '@hatcherdx/dx-engine-preload/storage'

/**
 * Workspace composable for direct storage API access.
 *
 * @remarks
 * Provides reactive state management for workspace without Pinia.
 * Automatically persists project and branch changes to SecureStorageService.
 * Used as context for chat persistence and other features.
 *
 * @returns Workspace utilities and reactive state
 *
 * @example
 * ```typescript
 * const {
 *   workspace,
 *   currentProjectPath,
 *   currentBranch,
 *   currentTask,
 *   isLoading,
 *   error,
 *   loadWorkspace,
 *   setProject,
 *   setBranch,
 *   addTask,
 *   removeTask,
 *   setCurrentTask,
 *   clear
 * } = useWorkspace()
 * ```
 *
 * @public
 * @since 1.0.0
 */
export function useWorkspace() {
  // Reactive state
  const workspace: Ref<WorkspaceState | null> = ref(null)
  const isLoading = ref(false)
  const error: Ref<string | null> = ref(null)

  // Computed properties for easy access
  const currentProjectPath: ComputedRef<string | null> = computed(() => {
    return workspace.value?.project?.path || null
  })

  const currentProjectName: ComputedRef<string | null> = computed(() => {
    return workspace.value?.project?.name || null
  })

  const currentBranch: ComputedRef<string | null> = computed(() => {
    // Get branch from current task if available
    const currentTaskId = workspace.value?.currentTaskId
    if (currentTaskId && workspace.value?.activeTasks) {
      const task = workspace.value.activeTasks.find(
        (t) => t.id === currentTaskId
      )
      if (task) {
        return task.branchName
      }
    }
    // Fallback to main if no task
    return 'main'
  })

  const currentTask: ComputedRef<TaskSession | null> = computed(() => {
    if (!workspace.value || !workspace.value.currentTaskId) {
      return null
    }
    return (
      workspace.value.activeTasks.find(
        (t) => t.id === workspace.value!.currentTaskId
      ) || null
    )
  })

  const activeTasks: ComputedRef<TaskSession[]> = computed(() => {
    return workspace.value?.activeTasks || []
  })

  /**
   * Load workspace from storage.
   *
   * @returns Promise resolving when workspace is loaded
   *
   * @example
   * ```typescript
   * await loadWorkspace()
   * if (currentProjectPath.value) {
   *   console.log('Loaded project:', currentProjectPath.value)
   * }
   * ```
   *
   * @public
   */
  async function loadWorkspace(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const loadedWorkspace = await window.storageAPI.getWorkspace()
      workspace.value = loadedWorkspace
    } catch (err) {
      console.error('[useWorkspace] Failed to load workspace:', err)
      error.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Set the current project.
   *
   * @param path - Project path
   * @param name - Project name (optional, defaults to basename)
   * @param metadata - Optional project metadata
   * @returns Promise resolving when project is set
   *
   * @example
   * ```typescript
   * await setProject('/home/user/my-project', 'My Project', {
   *   framework: 'vue',
   *   packageManager: 'pnpm'
   * })
   * ```
   *
   * @public
   */
  async function setProject(
    path: string,
    name?: string,
    metadata?: {
      framework?: string
      packageManager?: string
      gitRemote?: string
    }
  ): Promise<void> {
    if (!path) {
      throw new Error('Project path is required')
    }

    isLoading.value = true
    error.value = null

    try {
      // Create or update workspace
      const newWorkspace: WorkspaceState = {
        project: {
          path,
          name: name || path.split('/').pop() || 'Unknown Project',
          lastOpened: new Date(),
          metadata,
        },
        activeTasks: workspace.value?.activeTasks || [],
        taskHistory: workspace.value?.taskHistory || [],
        currentTaskId: workspace.value?.currentTaskId || null,
      }

      await window.storageAPI.setWorkspace(newWorkspace)
      workspace.value = newWorkspace

      // Also add to recent projects
      await window.storageAPI.addRecentProject({
        path,
        name: newWorkspace.project.name,
        metadata,
      })
    } catch (err) {
      console.error('[useWorkspace] Failed to set project:', err)
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Add or switch to a task (branch).
   *
   * @param branchName - Git branch name
   * @param taskType - Type of task
   * @returns Promise resolving when task is added
   *
   * @example
   * ```typescript
   * await addTask('feature/new-ui', 'feature')
   * ```
   *
   * @public
   */
  async function addTask(
    branchName: string,
    taskType: TaskSession['taskType'] = 'feature'
  ): Promise<void> {
    if (!workspace.value) {
      throw new Error('No workspace open. Set a project first.')
    }

    isLoading.value = true
    error.value = null

    try {
      // Check if task already exists
      const existingTask = workspace.value.activeTasks.find(
        (t) => t.branchName === branchName
      )

      if (existingTask) {
        // Just switch to existing task
        await setCurrentTask(existingTask.id)
      } else {
        // Create new task
        const newTask: TaskSession = {
          id: crypto.randomUUID(),
          branchName,
          taskType,
          status: 'active',
          openedAt: new Date(),
          lastActiveAt: new Date(),
          workState: {
            hasUncommittedChanges: false,
          },
        }

        await window.storageAPI.addTask(newTask)

        // Update local state
        workspace.value.activeTasks.push(newTask)
        workspace.value.currentTaskId = newTask.id
      }
    } catch (err) {
      console.error('[useWorkspace] Failed to add task:', err)
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Remove a task.
   *
   * @param taskId - Task ID to remove (defaults to current)
   * @returns Promise resolving when task is removed
   *
   * @example
   * ```typescript
   * await removeTask('task-123')
   * ```
   *
   * @public
   */
  async function removeTask(taskId?: string): Promise<void> {
    if (!workspace.value) {
      throw new Error('No workspace open')
    }

    const idToRemove = taskId || workspace.value.currentTaskId
    if (!idToRemove) {
      throw new Error('No task to remove')
    }

    isLoading.value = true
    error.value = null

    try {
      await window.storageAPI.removeTask(idToRemove)

      // Update local state
      workspace.value.activeTasks = workspace.value.activeTasks.filter(
        (t) => t.id !== idToRemove
      )

      // Update current task if it was removed
      if (workspace.value.currentTaskId === idToRemove) {
        workspace.value.currentTaskId =
          workspace.value.activeTasks.length > 0
            ? workspace.value.activeTasks[0].id
            : null
      }
    } catch (err) {
      console.error('[useWorkspace] Failed to remove task:', err)
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Set the current active task.
   *
   * @param taskId - Task ID to make current
   * @returns Promise resolving when task is set
   *
   * @example
   * ```typescript
   * await setCurrentTask('task-123')
   * ```
   *
   * @public
   */
  async function setCurrentTask(taskId: string | null): Promise<void> {
    if (!workspace.value) {
      throw new Error('No workspace open')
    }

    isLoading.value = true
    error.value = null

    try {
      await window.storageAPI.setCurrentTask(taskId)
      workspace.value.currentTaskId = taskId
    } catch (err) {
      console.error('[useWorkspace] Failed to set current task:', err)
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Update task work state.
   *
   * @param taskId - Task ID to update
   * @param workState - Updated work state
   * @returns Promise resolving when task is updated
   *
   * @example
   * ```typescript
   * await updateTaskState('task-123', {
   *   hasUncommittedChanges: true,
   *   modifiedFiles: ['src/App.vue']
   * })
   * ```
   *
   * @public
   */
  async function updateTaskState(
    taskId: string,
    workState: Partial<TaskSession['workState']>
  ): Promise<void> {
    if (!workspace.value) {
      throw new Error('No workspace open')
    }

    isLoading.value = true
    error.value = null

    try {
      await window.storageAPI.updateTaskState(taskId, workState)

      // Update local state
      const task = workspace.value.activeTasks.find((t) => t.id === taskId)
      if (task) {
        task.workState = { ...task.workState, ...workState }
      }
    } catch (err) {
      console.error('[useWorkspace] Failed to update task state:', err)
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Clear workspace (close project).
   *
   * @returns Promise resolving when workspace is cleared
   *
   * @example
   * ```typescript
   * await clear()
   * console.log('Workspace cleared')
   * ```
   *
   * @public
   */
  async function clear(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      await window.storageAPI.clearWorkspace()
      workspace.value = null
    } catch (err) {
      console.error('[useWorkspace] Failed to clear workspace:', err)
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Auto-save workspace changes
  watch(
    workspace,
    async (newWorkspace) => {
      if (newWorkspace && !isLoading.value) {
        try {
          await window.storageAPI.setWorkspace(newWorkspace)
        } catch (err) {
          console.error('[useWorkspace] Failed to auto-save workspace:', err)
        }
      }
    },
    { deep: true }
  )

  return {
    // State
    workspace,
    currentProjectPath,
    currentProjectName,
    currentBranch,
    currentTask,
    activeTasks,
    isLoading,
    error,

    // Actions
    loadWorkspace,
    setProject,
    addTask,
    removeTask,
    setCurrentTask,
    updateTaskState,
    clear,
  }
}
