/**
 * @fileoverview Integration test for TaskManager with storage persistence
 *
 * @description
 * Verifies that the TaskManager composable properly integrates with
 * the storage API for workspace persistence.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock the storage API BEFORE any imports
const mockStorageAPI = {
  getWorkspace: vi.fn(),
  setWorkspace: vi.fn(),
  clearWorkspace: vi.fn(),
  addTask: vi.fn(),
  updateTaskState: vi.fn(),
  removeTask: vi.fn(),
  setCurrentTask: vi.fn(),
}

// Setup window.storageAPI before importing
global.window = {
  ...global.window,
  storageAPI: mockStorageAPI,
}

// Mock the git integration
vi.mock('./useGitIntegration', () => ({
  useGitIntegration: () => ({
    getGitStatus: vi.fn().mockResolvedValue([]),
    switchBranch: vi.fn().mockResolvedValue(undefined),
  }),
}))

// Mock the onboarding composable
vi.mock('./useOnboarding', () => ({
  useOnboarding: () => ({
    triggerOnboarding: vi.fn(),
  }),
}))

describe('TaskManager Storage Integration', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock requires flexible typing for dynamic module import
  let useTaskManager: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock requires flexible typing for state reset function
  let resetTaskManagerState: any

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks()

    // Reset modules to clear singleton state
    vi.resetModules()

    // Re-setup window.storageAPI after module reset
    global.window = {
      ...global.window,
      storageAPI: mockStorageAPI,
    }

    // Re-import the module after resetting
    const module = await import('./useTaskManager')
    useTaskManager = module.useTaskManager
    resetTaskManagerState = module.resetTaskManagerState

    // Reset the task manager state for test isolation
    if (resetTaskManagerState) {
      resetTaskManagerState()
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should load workspace from storage on initialization', async () => {
    const testWorkspace = {
      project: {
        path: '/test/project',
        name: 'Test Project',
        lastOpened: new Date(),
      },
      activeTasks: [],
      taskHistory: [],
      currentTaskId: null,
    }

    // Setup the mock to return the workspace
    mockStorageAPI.getWorkspace.mockResolvedValue(testWorkspace)

    // Reset modules and re-import to trigger fresh initialization
    vi.resetModules()

    // Re-setup window.storageAPI after module reset
    global.window = {
      ...global.window,
      storageAPI: mockStorageAPI,
    }

    // Re-import the module to trigger initialization with the mock
    const module = await import('./useTaskManager')
    const taskManager = module.useTaskManager()

    // Wait for async initialization to complete
    await vi.waitFor(() => {
      expect(mockStorageAPI.getWorkspace).toHaveBeenCalled()
    })

    // Wait a bit more for the async state update to propagate
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Now check the result
    expect(taskManager.currentProject.value?.name).toBe('Test Project')
  })

  it('should save workspace when opening a project', async () => {
    const taskManager = useTaskManager()

    const projectInfo = {
      path: '/new/project',
      name: 'New Project',
      metadata: {
        framework: 'Vue',
        packageManager: 'pnpm',
      },
    }

    await taskManager.openProject(projectInfo)

    expect(mockStorageAPI.setWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        project: expect.objectContaining({
          path: '/new/project',
          name: 'New Project',
        }),
      })
    )
  })

  it('should persist task when adding a new task', async () => {
    const taskManager = useTaskManager()

    // First open a project
    await taskManager.openProject({
      path: '/test/project',
      name: 'Test Project',
    })

    const taskConfig = {
      branchName: 'feature/test',
      taskType: 'feature' as const,
    }

    const task = await taskManager.addTask(taskConfig)

    expect(mockStorageAPI.addTask).toHaveBeenCalledWith(
      expect.objectContaining({
        branchName: 'feature/test',
        taskType: 'feature',
      })
    )
    expect(task.branchName).toBe('feature/test')
  })

  it('should update storage when switching tasks', async () => {
    // Setup workspace with tasks
    const workspace = {
      project: {
        path: '/test/project',
        name: 'Test Project',
        lastOpened: new Date(),
      },
      activeTasks: [
        {
          id: 'task-1',
          branchName: 'feature/one',
          taskType: 'feature',
          status: 'active',
          openedAt: new Date(),
          lastActiveAt: new Date(),
          workState: {},
        },
        {
          id: 'task-2',
          branchName: 'feature/two',
          taskType: 'feature',
          status: 'active',
          openedAt: new Date(),
          lastActiveAt: new Date(),
          workState: {},
        },
      ],
      taskHistory: [],
      currentTaskId: 'task-1',
    }

    // Setup the mock to return the workspace
    mockStorageAPI.getWorkspace.mockResolvedValue(workspace)

    // Reset modules and re-import to trigger fresh initialization
    vi.resetModules()

    // Re-setup window.storageAPI after module reset
    global.window = {
      ...global.window,
      storageAPI: mockStorageAPI,
    }

    // Re-import the module to trigger initialization with the mock
    const module = await import('./useTaskManager')
    const taskManager = module.useTaskManager()

    // Wait for workspace to load
    await vi.waitFor(() => {
      expect(mockStorageAPI.getWorkspace).toHaveBeenCalled()
    })

    // Wait a bit more for the async state update to propagate
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Now switch task
    await taskManager.switchTask('task-2')

    expect(mockStorageAPI.setCurrentTask).toHaveBeenCalledWith('task-2')
  })

  it('should clear storage when closing workspace', async () => {
    const taskManager = useTaskManager()

    await taskManager.openProject({
      path: '/test/project',
      name: 'Test Project',
    })

    await taskManager.closeWorkspace()

    expect(mockStorageAPI.clearWorkspace).toHaveBeenCalled()
    expect(taskManager.currentProject.value).toBeNull()
  })

  it('should handle storage API not being available', async () => {
    // Remove storage API
    delete global.window.storageAPI

    const taskManager = useTaskManager()

    // Should not throw when opening project without storage
    await taskManager.openProject({
      path: '/test/project',
      name: 'Test Project',
    })

    // Local state should still work
    expect(taskManager.currentProject.value?.name).toBe('Test Project')
  })
})
