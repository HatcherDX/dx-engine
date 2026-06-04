/**
 * @fileoverview Tests for useWorkspace composable.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useWorkspace } from './useWorkspace'
import type {
  WorkspaceState,
  TaskSession,
} from '@hatcherdx/dx-engine-preload/storage'

/**
 * Mock storage API for testing workspace operations.
 */
interface MockStorageAPI {
  getWorkspace: ReturnType<typeof vi.fn>
  setWorkspace: ReturnType<typeof vi.fn>
  addRecentProject: ReturnType<typeof vi.fn>
  addTask: ReturnType<typeof vi.fn>
  removeTask: ReturnType<typeof vi.fn>
  setCurrentTask: ReturnType<typeof vi.fn>
  updateTaskState: ReturnType<typeof vi.fn>
  clearWorkspace: ReturnType<typeof vi.fn>
}

describe('useWorkspace', () => {
  let mockStorageAPI: MockStorageAPI

  beforeEach(() => {
    // Mock window.storageAPI
    mockStorageAPI = {
      getWorkspace: vi.fn(),
      setWorkspace: vi.fn(),
      addRecentProject: vi.fn(),
      addTask: vi.fn(),
      removeTask: vi.fn(),
      setCurrentTask: vi.fn(),
      updateTaskState: vi.fn(),
      clearWorkspace: vi.fn(),
    }
    ;(global as { window: { storageAPI: MockStorageAPI } }).window = {
      storageAPI: mockStorageAPI,
    } as { storageAPI: MockStorageAPI }

    // Mock crypto.randomUUID for predictable IDs
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-uuid-123')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State', () => {
    it('should initialize with null workspace', () => {
      const { workspace, isLoading, error } = useWorkspace()

      expect(workspace.value).toBeNull()
      expect(isLoading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('should have null computed properties when workspace is null', () => {
      const { currentProjectPath, currentProjectName, currentBranch } =
        useWorkspace()

      expect(currentProjectPath.value).toBeNull()
      expect(currentProjectName.value).toBeNull()
      expect(currentBranch.value).toBe('main') // Falls back to 'main'
    })

    it('should have empty activeTasks when workspace is null', () => {
      const { activeTasks } = useWorkspace()

      expect(activeTasks.value).toEqual([])
    })

    it('should have null currentTask when workspace is null', () => {
      const { currentTask } = useWorkspace()

      expect(currentTask.value).toBeNull()
    })
  })

  describe('loadWorkspace', () => {
    it('should load workspace successfully', async () => {
      const mockWorkspace: WorkspaceState = {
        project: {
          path: '/test/path',
          name: 'Test Project',
          lastOpened: new Date(),
        },
        activeTasks: [],
        taskHistory: [],
        currentTaskId: null,
      }

      mockStorageAPI.getWorkspace.mockResolvedValue(mockWorkspace)

      const { workspace, loadWorkspace, isLoading, error } = useWorkspace()

      const promise = loadWorkspace()

      // isLoading should be true during loading
      expect(isLoading.value).toBe(true)

      await promise

      expect(workspace.value).toEqual(mockWorkspace)
      expect(isLoading.value).toBe(false)
      expect(error.value).toBeNull()
      expect(mockStorageAPI.getWorkspace).toHaveBeenCalledTimes(1)
    })

    it('should handle Error instance on load failure', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const testError = new Error('Load failed')
      mockStorageAPI.getWorkspace.mockRejectedValue(testError)

      const { workspace, loadWorkspace, isLoading, error } = useWorkspace()

      await loadWorkspace()

      expect(workspace.value).toBeNull()
      expect(isLoading.value).toBe(false)
      expect(error.value).toBe('Load failed')
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[useWorkspace] Failed to load workspace:',
        testError
      )

      consoleErrorSpy.mockRestore()
    })

    it('should handle non-Error instance on load failure', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      mockStorageAPI.getWorkspace.mockRejectedValue('String error')

      const { loadWorkspace, error } = useWorkspace()

      await loadWorkspace()

      expect(error.value).toBe('Unknown error')

      consoleErrorSpy.mockRestore()
    })
  })

  describe('setProject', () => {
    it('should set project with all parameters', async () => {
      mockStorageAPI.setWorkspace.mockResolvedValue(undefined)
      mockStorageAPI.addRecentProject.mockResolvedValue(undefined)

      const { workspace, setProject, currentProjectPath, currentProjectName } =
        useWorkspace()

      const metadata = {
        framework: 'vue',
        packageManager: 'pnpm',
      }

      await setProject('/home/user/project', 'My Project', metadata)

      expect(workspace.value).not.toBeNull()
      expect(workspace.value?.project.path).toBe('/home/user/project')
      expect(workspace.value?.project.name).toBe('My Project')
      expect(workspace.value?.project.metadata).toEqual(metadata)
      expect(currentProjectPath.value).toBe('/home/user/project')
      expect(currentProjectName.value).toBe('My Project')

      expect(mockStorageAPI.setWorkspace).toHaveBeenCalled()
      expect(mockStorageAPI.addRecentProject).toHaveBeenCalledWith({
        path: '/home/user/project',
        name: 'My Project',
        metadata,
      })
    })

    it('should set project with auto-generated name from path', async () => {
      mockStorageAPI.setWorkspace.mockResolvedValue(undefined)
      mockStorageAPI.addRecentProject.mockResolvedValue(undefined)

      const { workspace, setProject } = useWorkspace()

      await setProject('/home/user/my-app')

      expect(workspace.value?.project.name).toBe('my-app')
    })

    it('should use "Unknown Project" when path has no basename', async () => {
      mockStorageAPI.setWorkspace.mockResolvedValue(undefined)
      mockStorageAPI.addRecentProject.mockResolvedValue(undefined)

      const { workspace, setProject } = useWorkspace()

      await setProject('/')

      expect(workspace.value?.project.name).toBe('Unknown Project')
    })

    it('should preserve existing tasks when setting project', async () => {
      mockStorageAPI.setWorkspace.mockResolvedValue(undefined)
      mockStorageAPI.addRecentProject.mockResolvedValue(undefined)

      const { workspace, setProject } = useWorkspace()

      // Pre-populate workspace with tasks
      workspace.value = {
        project: {
          path: '/old/path',
          name: 'Old Project',
          lastOpened: new Date(),
        },
        activeTasks: [
          {
            id: 'task-1',
            branchName: 'feature/test',
            taskType: 'feature',
            status: 'active',
            openedAt: new Date(),
            lastActiveAt: new Date(),
            workState: { hasUncommittedChanges: false },
          },
        ],
        taskHistory: [],
        currentTaskId: 'task-1',
      }

      await setProject('/new/path', 'New Project')

      expect(workspace.value?.activeTasks).toHaveLength(1)
      expect(workspace.value?.currentTaskId).toBe('task-1')
    })

    it('should throw error when path is empty', async () => {
      const { setProject } = useWorkspace()

      await expect(setProject('')).rejects.toThrow('Project path is required')
    })

    it('should handle Error instance on setProject failure', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const testError = new Error('Set project failed')
      mockStorageAPI.setWorkspace.mockRejectedValue(testError)

      const { setProject, error } = useWorkspace()

      await expect(setProject('/test/path')).rejects.toThrow(
        'Set project failed'
      )
      expect(error.value).toBe('Set project failed')

      consoleErrorSpy.mockRestore()
    })

    it('should handle non-Error instance on setProject failure', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      mockStorageAPI.setWorkspace.mockRejectedValue('String error')

      const { setProject, error } = useWorkspace()

      await expect(setProject('/test/path')).rejects.toThrow('String error')
      expect(error.value).toBe('Unknown error')

      consoleErrorSpy.mockRestore()
    })
  })

  describe('addTask', () => {
    it('should add new task when workspace is open', async () => {
      mockStorageAPI.addTask.mockResolvedValue(undefined)

      const { workspace, addTask, currentBranch } = useWorkspace()

      // Set up workspace
      workspace.value = {
        project: {
          path: '/test/path',
          name: 'Test Project',
          lastOpened: new Date(),
        },
        activeTasks: [],
        taskHistory: [],
        currentTaskId: null,
      }

      await addTask('feature/new-ui', 'feature')

      expect(workspace.value.activeTasks).toHaveLength(1)
      expect(workspace.value.activeTasks[0].branchName).toBe('feature/new-ui')
      expect(workspace.value.activeTasks[0].taskType).toBe('feature')
      expect(workspace.value.activeTasks[0].id).toBe('test-uuid-123')
      expect(workspace.value.currentTaskId).toBe('test-uuid-123')
      expect(currentBranch.value).toBe('feature/new-ui')

      expect(mockStorageAPI.addTask).toHaveBeenCalledWith(
        expect.objectContaining({
          branchName: 'feature/new-ui',
          taskType: 'feature',
        })
      )
    })

    it('should default taskType to "feature"', async () => {
      mockStorageAPI.addTask.mockResolvedValue(undefined)

      const { workspace, addTask } = useWorkspace()

      workspace.value = {
        project: { path: '/test', name: 'Test', lastOpened: new Date() },
        activeTasks: [],
        taskHistory: [],
        currentTaskId: null,
      }

      await addTask('bugfix/fix-error')

      expect(workspace.value.activeTasks[0].taskType).toBe('feature')
    })

    it('should switch to existing task when task already exists', async () => {
      mockStorageAPI.setCurrentTask.mockResolvedValue(undefined)

      const { workspace, addTask } = useWorkspace()

      workspace.value = {
        project: { path: '/test', name: 'Test', lastOpened: new Date() },
        activeTasks: [
          {
            id: 'existing-task',
            branchName: 'feature/existing',
            taskType: 'feature',
            status: 'active',
            openedAt: new Date(),
            lastActiveAt: new Date(),
            workState: { hasUncommittedChanges: false },
          },
        ],
        taskHistory: [],
        currentTaskId: null,
      }

      await addTask('feature/existing')

      // Should not add new task, just switch to existing
      expect(workspace.value.activeTasks).toHaveLength(1)
      expect(workspace.value.currentTaskId).toBe('existing-task')
      expect(mockStorageAPI.setCurrentTask).toHaveBeenCalledWith(
        'existing-task'
      )
      expect(mockStorageAPI.addTask).not.toHaveBeenCalled()
    })

    it('should throw error when no workspace is open', async () => {
      const { addTask } = useWorkspace()

      await expect(addTask('feature/test')).rejects.toThrow(
        'No workspace open. Set a project first.'
      )
    })

    it('should handle Error instance on addTask failure', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const testError = new Error('Add task failed')
      mockStorageAPI.addTask.mockRejectedValue(testError)

      const { workspace, addTask, error } = useWorkspace()

      workspace.value = {
        project: { path: '/test', name: 'Test', lastOpened: new Date() },
        activeTasks: [],
        taskHistory: [],
        currentTaskId: null,
      }

      await expect(addTask('feature/test')).rejects.toThrow('Add task failed')
      expect(error.value).toBe('Add task failed')

      consoleErrorSpy.mockRestore()
    })

    it('should handle non-Error instance on addTask failure', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      mockStorageAPI.addTask.mockRejectedValue('String error')

      const { workspace, addTask, error } = useWorkspace()

      workspace.value = {
        project: { path: '/test', name: 'Test', lastOpened: new Date() },
        activeTasks: [],
        taskHistory: [],
        currentTaskId: null,
      }

      await expect(addTask('feature/test')).rejects.toThrow('String error')
      expect(error.value).toBe('Unknown error')

      consoleErrorSpy.mockRestore()
    })
  })

  describe('removeTask', () => {
    it('should remove task by ID', async () => {
      mockStorageAPI.removeTask.mockResolvedValue(undefined)

      const { workspace, removeTask } = useWorkspace()

      workspace.value = {
        project: { path: '/test', name: 'Test', lastOpened: new Date() },
        activeTasks: [
          {
            id: 'task-1',
            branchName: 'feature/1',
            taskType: 'feature',
            status: 'active',
            openedAt: new Date(),
            lastActiveAt: new Date(),
            workState: { hasUncommittedChanges: false },
          },
          {
            id: 'task-2',
            branchName: 'feature/2',
            taskType: 'feature',
            status: 'active',
            openedAt: new Date(),
            lastActiveAt: new Date(),
            workState: { hasUncommittedChanges: false },
          },
        ],
        taskHistory: [],
        currentTaskId: 'task-1',
      }

      await removeTask('task-2')

      expect(workspace.value.activeTasks).toHaveLength(1)
      expect(workspace.value.activeTasks[0].id).toBe('task-1')
      expect(workspace.value.currentTaskId).toBe('task-1')
      expect(mockStorageAPI.removeTask).toHaveBeenCalledWith('task-2')
    })

    it('should remove current task when no ID provided', async () => {
      mockStorageAPI.removeTask.mockResolvedValue(undefined)

      const { workspace, removeTask } = useWorkspace()

      workspace.value = {
        project: { path: '/test', name: 'Test', lastOpened: new Date() },
        activeTasks: [
          {
            id: 'task-1',
            branchName: 'feature/1',
            taskType: 'feature',
            status: 'active',
            openedAt: new Date(),
            lastActiveAt: new Date(),
            workState: { hasUncommittedChanges: false },
          },
        ],
        taskHistory: [],
        currentTaskId: 'task-1',
      }

      await removeTask()

      expect(workspace.value.activeTasks).toHaveLength(0)
      expect(workspace.value.currentTaskId).toBeNull()
    })

    it('should set new currentTaskId when removing current task with remaining tasks', async () => {
      mockStorageAPI.removeTask.mockResolvedValue(undefined)

      const { workspace, removeTask } = useWorkspace()

      workspace.value = {
        project: { path: '/test', name: 'Test', lastOpened: new Date() },
        activeTasks: [
          {
            id: 'task-1',
            branchName: 'feature/1',
            taskType: 'feature',
            status: 'active',
            openedAt: new Date(),
            lastActiveAt: new Date(),
            workState: { hasUncommittedChanges: false },
          },
          {
            id: 'task-2',
            branchName: 'feature/2',
            taskType: 'feature',
            status: 'active',
            openedAt: new Date(),
            lastActiveAt: new Date(),
            workState: { hasUncommittedChanges: false },
          },
        ],
        taskHistory: [],
        currentTaskId: 'task-1',
      }

      await removeTask('task-1')

      expect(workspace.value.activeTasks).toHaveLength(1)
      expect(workspace.value.currentTaskId).toBe('task-2')
    })

    it('should throw error when no workspace is open', async () => {
      const { removeTask } = useWorkspace()

      await expect(removeTask('task-1')).rejects.toThrow('No workspace open')
    })

    it('should throw error when no task to remove', async () => {
      const { workspace, removeTask } = useWorkspace()

      workspace.value = {
        project: { path: '/test', name: 'Test', lastOpened: new Date() },
        activeTasks: [],
        taskHistory: [],
        currentTaskId: null,
      }

      await expect(removeTask()).rejects.toThrow('No task to remove')
    })

    it('should handle Error instance on removeTask failure', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const testError = new Error('Remove task failed')
      mockStorageAPI.removeTask.mockRejectedValue(testError)

      const { workspace, removeTask, error } = useWorkspace()

      workspace.value = {
        project: { path: '/test', name: 'Test', lastOpened: new Date() },
        activeTasks: [
          {
            id: 'task-1',
            branchName: 'feature/1',
            taskType: 'feature',
            status: 'active',
            openedAt: new Date(),
            lastActiveAt: new Date(),
            workState: { hasUncommittedChanges: false },
          },
        ],
        taskHistory: [],
        currentTaskId: 'task-1',
      }

      await expect(removeTask('task-1')).rejects.toThrow('Remove task failed')
      expect(error.value).toBe('Remove task failed')

      consoleErrorSpy.mockRestore()
    })

    it('should handle non-Error instance on removeTask failure', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      mockStorageAPI.removeTask.mockRejectedValue('String error')

      const { workspace, removeTask, error } = useWorkspace()

      workspace.value = {
        project: { path: '/test', name: 'Test', lastOpened: new Date() },
        activeTasks: [
          {
            id: 'task-1',
            branchName: 'feature/1',
            taskType: 'feature',
            status: 'active',
            openedAt: new Date(),
            lastActiveAt: new Date(),
            workState: { hasUncommittedChanges: false },
          },
        ],
        taskHistory: [],
        currentTaskId: 'task-1',
      }

      await expect(removeTask('task-1')).rejects.toThrow('String error')
      expect(error.value).toBe('Unknown error')

      consoleErrorSpy.mockRestore()
    })
  })

  describe('setCurrentTask', () => {
    it('should set current task', async () => {
      mockStorageAPI.setCurrentTask.mockResolvedValue(undefined)

      const { workspace, setCurrentTask, currentBranch } = useWorkspace()

      workspace.value = {
        project: { path: '/test', name: 'Test', lastOpened: new Date() },
        activeTasks: [
          {
            id: 'task-1',
            branchName: 'feature/ui',
            taskType: 'feature',
            status: 'active',
            openedAt: new Date(),
            lastActiveAt: new Date(),
            workState: { hasUncommittedChanges: false },
          },
        ],
        taskHistory: [],
        currentTaskId: null,
      }

      await setCurrentTask('task-1')

      expect(workspace.value.currentTaskId).toBe('task-1')
      expect(currentBranch.value).toBe('feature/ui')
      expect(mockStorageAPI.setCurrentTask).toHaveBeenCalledWith('task-1')
    })

    it('should allow setting task to null', async () => {
      mockStorageAPI.setCurrentTask.mockResolvedValue(undefined)

      const { workspace, setCurrentTask } = useWorkspace()

      workspace.value = {
        project: { path: '/test', name: 'Test', lastOpened: new Date() },
        activeTasks: [],
        taskHistory: [],
        currentTaskId: 'task-1',
      }

      await setCurrentTask(null)

      expect(workspace.value.currentTaskId).toBeNull()
    })

    it('should throw error when no workspace is open', async () => {
      const { setCurrentTask } = useWorkspace()

      await expect(setCurrentTask('task-1')).rejects.toThrow(
        'No workspace open'
      )
    })

    it('should handle Error instance on setCurrentTask failure', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const testError = new Error('Set current task failed')
      mockStorageAPI.setCurrentTask.mockRejectedValue(testError)

      const { workspace, setCurrentTask, error } = useWorkspace()

      workspace.value = {
        project: { path: '/test', name: 'Test', lastOpened: new Date() },
        activeTasks: [],
        taskHistory: [],
        currentTaskId: null,
      }

      await expect(setCurrentTask('task-1')).rejects.toThrow(
        'Set current task failed'
      )
      expect(error.value).toBe('Set current task failed')

      consoleErrorSpy.mockRestore()
    })

    it('should handle non-Error instance on setCurrentTask failure', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      mockStorageAPI.setCurrentTask.mockRejectedValue('String error')

      const { workspace, setCurrentTask, error } = useWorkspace()

      workspace.value = {
        project: { path: '/test', name: 'Test', lastOpened: new Date() },
        activeTasks: [],
        taskHistory: [],
        currentTaskId: null,
      }

      await expect(setCurrentTask('task-1')).rejects.toThrow('String error')
      expect(error.value).toBe('Unknown error')

      consoleErrorSpy.mockRestore()
    })
  })

  describe('updateTaskState', () => {
    it('should update task work state', async () => {
      mockStorageAPI.updateTaskState.mockResolvedValue(undefined)

      const { workspace, updateTaskState } = useWorkspace()

      workspace.value = {
        project: { path: '/test', name: 'Test', lastOpened: new Date() },
        activeTasks: [
          {
            id: 'task-1',
            branchName: 'feature/test',
            taskType: 'feature',
            status: 'active',
            openedAt: new Date(),
            lastActiveAt: new Date(),
            workState: { hasUncommittedChanges: false },
          },
        ],
        taskHistory: [],
        currentTaskId: 'task-1',
      }

      await updateTaskState('task-1', {
        hasUncommittedChanges: true,
        modifiedFiles: ['src/App.vue'],
      })

      expect(workspace.value.activeTasks[0].workState).toEqual({
        hasUncommittedChanges: true,
        modifiedFiles: ['src/App.vue'],
      })
      expect(mockStorageAPI.updateTaskState).toHaveBeenCalledWith('task-1', {
        hasUncommittedChanges: true,
        modifiedFiles: ['src/App.vue'],
      })
    })

    it('should handle updating non-existent task gracefully', async () => {
      mockStorageAPI.updateTaskState.mockResolvedValue(undefined)

      const { workspace, updateTaskState } = useWorkspace()

      workspace.value = {
        project: { path: '/test', name: 'Test', lastOpened: new Date() },
        activeTasks: [],
        taskHistory: [],
        currentTaskId: null,
      }

      // Should not throw, just not update anything
      await updateTaskState('non-existent', { hasUncommittedChanges: true })

      expect(mockStorageAPI.updateTaskState).toHaveBeenCalled()
    })

    it('should throw error when no workspace is open', async () => {
      const { updateTaskState } = useWorkspace()

      await expect(
        updateTaskState('task-1', { hasUncommittedChanges: true })
      ).rejects.toThrow('No workspace open')
    })

    it('should handle Error instance on updateTaskState failure', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const testError = new Error('Update task state failed')
      mockStorageAPI.updateTaskState.mockRejectedValue(testError)

      const { workspace, updateTaskState, error } = useWorkspace()

      workspace.value = {
        project: { path: '/test', name: 'Test', lastOpened: new Date() },
        activeTasks: [
          {
            id: 'task-1',
            branchName: 'feature/test',
            taskType: 'feature',
            status: 'active',
            openedAt: new Date(),
            lastActiveAt: new Date(),
            workState: { hasUncommittedChanges: false },
          },
        ],
        taskHistory: [],
        currentTaskId: null,
      }

      await expect(
        updateTaskState('task-1', { hasUncommittedChanges: true })
      ).rejects.toThrow('Update task state failed')
      expect(error.value).toBe('Update task state failed')

      consoleErrorSpy.mockRestore()
    })

    it('should handle non-Error instance on updateTaskState failure', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      mockStorageAPI.updateTaskState.mockRejectedValue('String error')

      const { workspace, updateTaskState, error } = useWorkspace()

      workspace.value = {
        project: { path: '/test', name: 'Test', lastOpened: new Date() },
        activeTasks: [
          {
            id: 'task-1',
            branchName: 'feature/test',
            taskType: 'feature',
            status: 'active',
            openedAt: new Date(),
            lastActiveAt: new Date(),
            workState: { hasUncommittedChanges: false },
          },
        ],
        taskHistory: [],
        currentTaskId: null,
      }

      await expect(
        updateTaskState('task-1', { hasUncommittedChanges: true })
      ).rejects.toThrow('String error')
      expect(error.value).toBe('Unknown error')

      consoleErrorSpy.mockRestore()
    })
  })

  describe('clear', () => {
    it('should clear workspace', async () => {
      mockStorageAPI.clearWorkspace.mockResolvedValue(undefined)

      const { workspace, clear } = useWorkspace()

      workspace.value = {
        project: { path: '/test', name: 'Test', lastOpened: new Date() },
        activeTasks: [],
        taskHistory: [],
        currentTaskId: null,
      }

      await clear()

      expect(workspace.value).toBeNull()
      expect(mockStorageAPI.clearWorkspace).toHaveBeenCalled()
    })

    it('should handle Error instance on clear failure', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const testError = new Error('Clear workspace failed')
      mockStorageAPI.clearWorkspace.mockRejectedValue(testError)

      const { workspace, clear, error } = useWorkspace()

      workspace.value = {
        project: { path: '/test', name: 'Test', lastOpened: new Date() },
        activeTasks: [],
        taskHistory: [],
        currentTaskId: null,
      }

      await expect(clear()).rejects.toThrow('Clear workspace failed')
      expect(error.value).toBe('Clear workspace failed')

      consoleErrorSpy.mockRestore()
    })

    it('should handle non-Error instance on clear failure', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      mockStorageAPI.clearWorkspace.mockRejectedValue('String error')

      const { workspace, clear, error } = useWorkspace()

      workspace.value = {
        project: { path: '/test', name: 'Test', lastOpened: new Date() },
        activeTasks: [],
        taskHistory: [],
        currentTaskId: null,
      }

      await expect(clear()).rejects.toThrow('String error')
      expect(error.value).toBe('Unknown error')

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Computed Properties', () => {
    it('should return current branch from active task', () => {
      const { workspace, currentBranch } = useWorkspace()

      workspace.value = {
        project: { path: '/test', name: 'Test', lastOpened: new Date() },
        activeTasks: [
          {
            id: 'task-1',
            branchName: 'feature/custom',
            taskType: 'feature',
            status: 'active',
            openedAt: new Date(),
            lastActiveAt: new Date(),
            workState: { hasUncommittedChanges: false },
          },
        ],
        taskHistory: [],
        currentTaskId: 'task-1',
      }

      expect(currentBranch.value).toBe('feature/custom')
    })

    it('should return "main" when no current task', () => {
      const { workspace, currentBranch } = useWorkspace()

      workspace.value = {
        project: { path: '/test', name: 'Test', lastOpened: new Date() },
        activeTasks: [],
        taskHistory: [],
        currentTaskId: null,
      }

      expect(currentBranch.value).toBe('main')
    })

    it('should return currentTask when task exists', () => {
      const { workspace, currentTask } = useWorkspace()

      const task: TaskSession = {
        id: 'task-1',
        branchName: 'feature/test',
        taskType: 'feature',
        status: 'active',
        openedAt: new Date(),
        lastActiveAt: new Date(),
        workState: { hasUncommittedChanges: false },
      }

      workspace.value = {
        project: { path: '/test', name: 'Test', lastOpened: new Date() },
        activeTasks: [task],
        taskHistory: [],
        currentTaskId: 'task-1',
      }

      expect(currentTask.value).toEqual(task)
    })

    it('should return null currentTask when currentTaskId does not match', () => {
      const { workspace, currentTask } = useWorkspace()

      workspace.value = {
        project: { path: '/test', name: 'Test', lastOpened: new Date() },
        activeTasks: [
          {
            id: 'task-1',
            branchName: 'feature/test',
            taskType: 'feature',
            status: 'active',
            openedAt: new Date(),
            lastActiveAt: new Date(),
            workState: { hasUncommittedChanges: false },
          },
        ],
        taskHistory: [],
        currentTaskId: 'non-existent',
      }

      expect(currentTask.value).toBeNull()
    })
  })

  describe('Auto-save watcher', () => {
    it('should auto-save workspace changes when not loading', async () => {
      mockStorageAPI.setWorkspace.mockResolvedValue(undefined)

      // Create test component to activate watch
      const TestComponent = defineComponent({
        setup() {
          return useWorkspace()
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      const composable = wrapper.vm as ReturnType<typeof useWorkspace>

      // Set workspace to trigger watch
      composable.workspace = {
        project: { path: '/test', name: 'Test', lastOpened: new Date() },
        activeTasks: [],
        taskHistory: [],
        currentTaskId: null,
      }

      await nextTick()

      // Wait for async watch to execute
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockStorageAPI.setWorkspace).toHaveBeenCalled()

      wrapper.unmount()
    })

    it('should not auto-save when workspace is null', async () => {
      mockStorageAPI.setWorkspace.mockResolvedValue(undefined)

      const TestComponent = defineComponent({
        setup() {
          return useWorkspace()
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      const composable = wrapper.vm as ReturnType<typeof useWorkspace>

      composable.workspace = null

      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockStorageAPI.setWorkspace).not.toHaveBeenCalled()

      wrapper.unmount()
    })

    it('should not auto-save when isLoading is true', async () => {
      mockStorageAPI.setWorkspace.mockResolvedValue(undefined)

      const TestComponent = defineComponent({
        setup() {
          return useWorkspace()
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      const composable = wrapper.vm as ReturnType<typeof useWorkspace>

      composable.isLoading = true
      composable.workspace = {
        project: { path: '/test', name: 'Test', lastOpened: new Date() },
        activeTasks: [],
        taskHistory: [],
        currentTaskId: null,
      }

      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockStorageAPI.setWorkspace).not.toHaveBeenCalled()

      wrapper.unmount()
    })

    it('should handle auto-save errors gracefully', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      mockStorageAPI.setWorkspace.mockRejectedValue(
        new Error('Auto-save failed')
      )

      const TestComponent = defineComponent({
        setup() {
          return useWorkspace()
        },
        template: '<div></div>',
      })

      const wrapper = mount(TestComponent)
      const composable = wrapper.vm as ReturnType<typeof useWorkspace>

      composable.workspace = {
        project: { path: '/test', name: 'Test', lastOpened: new Date() },
        activeTasks: [],
        taskHistory: [],
        currentTaskId: null,
      }

      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[useWorkspace] Failed to auto-save workspace:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
      wrapper.unmount()
    })
  })
})
