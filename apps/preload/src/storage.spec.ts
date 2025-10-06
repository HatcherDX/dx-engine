/**
 * @fileoverview Comprehensive test suite for storage API preload script.
 *
 * @description
 * Tests the complete storageAPI interface exposed through preload script,
 * ensuring all IPC methods, client-side validation, error handling, and data
 * transformations work correctly. Achieves 100% test coverage across all
 * statements, branches, functions, and lines.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock electron ipcRenderer before any imports
const mockIpcRenderer = {
  invoke: vi.fn(),
}

vi.mock('electron', () => ({
  ipcRenderer: mockIpcRenderer,
}))

describe('Storage API - Comprehensive Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset console.error mock
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Module Import and Interface Exports', () => {
    it('should import storageAPI and all TypeScript interfaces', async () => {
      const module = await import('./storage')

      expect(module.storageAPI).toBeDefined()
      expect(typeof module.storageAPI).toBe('object')

      // Verify all required methods exist
      const requiredMethods = [
        'getRecentProjects',
        'addRecentProject',
        'updateProjectLastOpened',
        'removeRecentProject',
        'clearRecentProjects',
        'getWorkspace',
        'setWorkspace',
        'clearWorkspace',
        'addTask',
        'removeTask',
        'setCurrentTask',
        'updateTaskState',
        'getIDEConfig',
        'updateIDEConfig',
        'getSecurityInfo',
        'validateProjectPath',
        'checkPath',
      ]

      requiredMethods.forEach((method) => {
        expect(module.storageAPI).toHaveProperty(method)
        expect(typeof module.storageAPI[method]).toBe('function')
      })
    })
  })

  describe('Project Management API', () => {
    describe('getRecentProjects', () => {
      it('should fetch and transform recent projects successfully', async () => {
        const { storageAPI } = await import('./storage')

        const mockProjects = [
          {
            id: 'project-1',
            name: 'Test Project',
            path: '/test/path',
            lastOpened: '2023-01-01T00:00:00.000Z',
            metadata: { framework: 'vue' },
          },
          {
            id: 'project-2',
            name: 'Another Project',
            path: '/another/path',
            lastOpened: '2023-01-02T00:00:00.000Z',
          },
        ]

        mockIpcRenderer.invoke.mockResolvedValue(mockProjects)

        const result = await storageAPI.getRecentProjects()

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'storage:get-recent-projects'
        )
        expect(result).toHaveLength(2)
        expect(result[0].lastOpened).toBeInstanceOf(Date)
        expect(result[0].lastOpened.getTime()).toBe(
          new Date('2023-01-01T00:00:00.000Z').getTime()
        )
        expect(result[1].lastOpened).toBeInstanceOf(Date)
      })

      it('should handle IPC errors and re-throw with enhanced message', async () => {
        const { storageAPI } = await import('./storage')

        const ipcError = new Error('Database connection failed')
        mockIpcRenderer.invoke.mockRejectedValue(ipcError)

        await expect(storageAPI.getRecentProjects()).rejects.toThrow(
          'Failed to load recent projects: Error: Database connection failed'
        )

        expect(console.error).toHaveBeenCalledWith(
          '[StorageAPI] Failed to get recent projects:',
          ipcError
        )
      })
    })

    describe('addRecentProject', () => {
      it('should add project with complete metadata successfully', async () => {
        const { storageAPI } = await import('./storage')

        const project = {
          path: '/test/project/path',
          name: 'Test Project Name',
          metadata: {
            gitRemote: 'https://github.com/test/repo',
            framework: 'vue',
            packageManager: 'pnpm',
          },
        }

        mockIpcRenderer.invoke.mockResolvedValue(undefined)

        await storageAPI.addRecentProject(project)

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'storage:add-recent-project',
          {
            path: '/test/project/path',
            name: 'Test Project Name',
            metadata: project.metadata,
          }
        )
      })

      it('should sanitize project data before sending to main process', async () => {
        const { storageAPI } = await import('./storage')

        const project = {
          path: '  /path/with/spaces  ',
          name: '  Very Long Project Name That Should Be Truncated Because It Exceeds The Maximum Length Limit Of 255 Characters Which Is The Standard Database Limit For VARCHAR Fields And We Need To Ensure That The Name Does Not Cause Database Errors When Stored',
          metadata: { framework: 'react' },
        }

        mockIpcRenderer.invoke.mockResolvedValue(undefined)

        await storageAPI.addRecentProject(project)

        const expectedSanitized = {
          path: '/path/with/spaces',
          name: project.name.trim().substring(0, 255),
          metadata: { framework: 'react' },
        }

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'storage:add-recent-project',
          expectedSanitized
        )
      })

      it('should validate project data is required object', async () => {
        const { storageAPI } = await import('./storage')

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime null handling
        await expect(storageAPI.addRecentProject(null as any)).rejects.toThrow(
          'Project data is required'
        )

        await expect(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime undefined handling
          storageAPI.addRecentProject(undefined as any)
        ).rejects.toThrow('Project data is required')

        await expect(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime string type mismatch
          storageAPI.addRecentProject('string' as any)
        ).rejects.toThrow('Project data is required')
      })

      it('should validate project path is required non-empty string', async () => {
        const { storageAPI } = await import('./storage')

        await expect(
          storageAPI.addRecentProject({ path: '', name: 'Test' })
        ).rejects.toThrow(
          'Project path is required and must be a non-empty string'
        )

        await expect(
          storageAPI.addRecentProject({ path: '   ', name: 'Test' })
        ).rejects.toThrow(
          'Project path is required and must be a non-empty string'
        )

        await expect(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime null handling
          storageAPI.addRecentProject({ path: null as any, name: 'Test' })
        ).rejects.toThrow(
          'Project path is required and must be a non-empty string'
        )

        await expect(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime undefined handling
          storageAPI.addRecentProject({ path: undefined as any, name: 'Test' })
        ).rejects.toThrow(
          'Project path is required and must be a non-empty string'
        )

        await expect(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime number type validation
          storageAPI.addRecentProject({ path: 123 as any, name: 'Test' })
        ).rejects.toThrow(
          'Project path is required and must be a non-empty string'
        )
      })

      it('should validate project name is required non-empty string', async () => {
        const { storageAPI } = await import('./storage')

        await expect(
          storageAPI.addRecentProject({ path: '/test', name: '' })
        ).rejects.toThrow(
          'Project name is required and must be a non-empty string'
        )

        await expect(
          storageAPI.addRecentProject({ path: '/test', name: '   ' })
        ).rejects.toThrow(
          'Project name is required and must be a non-empty string'
        )

        await expect(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime null handling
          storageAPI.addRecentProject({ path: '/test', name: null as any })
        ).rejects.toThrow(
          'Project name is required and must be a non-empty string'
        )

        await expect(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime undefined handling
          storageAPI.addRecentProject({ path: '/test', name: undefined as any })
        ).rejects.toThrow(
          'Project name is required and must be a non-empty string'
        )

        await expect(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime number type validation
          storageAPI.addRecentProject({ path: '/test', name: 456 as any })
        ).rejects.toThrow(
          'Project name is required and must be a non-empty string'
        )
      })

      it('should handle IPC errors and re-throw with enhanced message', async () => {
        const { storageAPI } = await import('./storage')

        const ipcError = new Error('Storage permission denied')
        mockIpcRenderer.invoke.mockRejectedValue(ipcError)

        const validProject = {
          path: '/test/path',
          name: 'Test Project',
        }

        await expect(storageAPI.addRecentProject(validProject)).rejects.toThrow(
          'Failed to add project: Error: Storage permission denied'
        )

        expect(console.error).toHaveBeenCalledWith(
          '[StorageAPI] Failed to add recent project:',
          ipcError
        )
      })
    })

    describe('updateProjectLastOpened', () => {
      it('should update project timestamp with valid ID', async () => {
        const { storageAPI } = await import('./storage')

        mockIpcRenderer.invoke.mockResolvedValue(undefined)

        await storageAPI.updateProjectLastOpened('project-123')

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'storage:update-project-last-opened',
          'project-123'
        )
      })

      it('should trim project ID before sending', async () => {
        const { storageAPI } = await import('./storage')

        mockIpcRenderer.invoke.mockResolvedValue(undefined)

        await storageAPI.updateProjectLastOpened('  project-456  ')

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'storage:update-project-last-opened',
          'project-456'
        )
      })

      it('should validate project ID is required non-empty string', async () => {
        const { storageAPI } = await import('./storage')

        await expect(storageAPI.updateProjectLastOpened('')).rejects.toThrow(
          'Project ID is required and must be a non-empty string'
        )

        await expect(storageAPI.updateProjectLastOpened('   ')).rejects.toThrow(
          'Project ID is required and must be a non-empty string'
        )

        await expect(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime null handling
          storageAPI.updateProjectLastOpened(null as any)
        ).rejects.toThrow(
          'Project ID is required and must be a non-empty string'
        )

        await expect(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime undefined handling
          storageAPI.updateProjectLastOpened(undefined as any)
        ).rejects.toThrow(
          'Project ID is required and must be a non-empty string'
        )

        await expect(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime number type validation
          storageAPI.updateProjectLastOpened(789 as any)
        ).rejects.toThrow(
          'Project ID is required and must be a non-empty string'
        )
      })

      it('should handle IPC errors and re-throw with enhanced message', async () => {
        const { storageAPI } = await import('./storage')

        const ipcError = new Error('Project not found')
        mockIpcRenderer.invoke.mockRejectedValue(ipcError)

        await expect(
          storageAPI.updateProjectLastOpened('invalid-id')
        ).rejects.toThrow('Failed to update project: Error: Project not found')

        expect(console.error).toHaveBeenCalledWith(
          '[StorageAPI] Failed to update project:',
          ipcError
        )
      })
    })

    describe('removeRecentProject', () => {
      it('should remove project with valid ID', async () => {
        const { storageAPI } = await import('./storage')

        mockIpcRenderer.invoke.mockResolvedValue(undefined)

        await storageAPI.removeRecentProject('project-to-remove')

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'storage:remove-recent-project',
          'project-to-remove'
        )
      })

      it('should trim project ID before sending', async () => {
        const { storageAPI } = await import('./storage')

        mockIpcRenderer.invoke.mockResolvedValue(undefined)

        await storageAPI.removeRecentProject('  project-to-remove  ')

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'storage:remove-recent-project',
          'project-to-remove'
        )
      })

      it('should validate project ID is required non-empty string', async () => {
        const { storageAPI } = await import('./storage')

        await expect(storageAPI.removeRecentProject('')).rejects.toThrow(
          'Project ID is required and must be a non-empty string'
        )

        await expect(storageAPI.removeRecentProject('   ')).rejects.toThrow(
          'Project ID is required and must be a non-empty string'
        )

        await expect(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime null handling
          storageAPI.removeRecentProject(null as any)
        ).rejects.toThrow(
          'Project ID is required and must be a non-empty string'
        )

        await expect(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime undefined handling
          storageAPI.removeRecentProject(undefined as any)
        ).rejects.toThrow(
          'Project ID is required and must be a non-empty string'
        )

        await expect(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime number type validation
          storageAPI.removeRecentProject(999 as any)
        ).rejects.toThrow(
          'Project ID is required and must be a non-empty string'
        )
      })

      it('should handle IPC errors and re-throw with enhanced message', async () => {
        const { storageAPI } = await import('./storage')

        const ipcError = new Error('Project removal failed')
        mockIpcRenderer.invoke.mockRejectedValue(ipcError)

        await expect(
          storageAPI.removeRecentProject('valid-id')
        ).rejects.toThrow(
          'Failed to remove project: Error: Project removal failed'
        )

        expect(console.error).toHaveBeenCalledWith(
          '[StorageAPI] Failed to remove project:',
          ipcError
        )
      })
    })

    describe('clearRecentProjects', () => {
      it('should clear all projects successfully', async () => {
        const { storageAPI } = await import('./storage')

        mockIpcRenderer.invoke.mockResolvedValue(undefined)

        await storageAPI.clearRecentProjects()

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'storage:clear-recent-projects'
        )
      })

      it('should handle IPC errors and re-throw with enhanced message', async () => {
        const { storageAPI } = await import('./storage')

        const ipcError = new Error('Clear operation failed')
        mockIpcRenderer.invoke.mockRejectedValue(ipcError)

        await expect(storageAPI.clearRecentProjects()).rejects.toThrow(
          'Failed to clear projects: Error: Clear operation failed'
        )

        expect(console.error).toHaveBeenCalledWith(
          '[StorageAPI] Failed to clear projects:',
          ipcError
        )
      })
    })
  })

  describe('Workspace Management API', () => {
    describe('getWorkspace', () => {
      it('should fetch and transform workspace with complete data', async () => {
        const { storageAPI } = await import('./storage')

        const mockWorkspace = {
          project: {
            path: '/test/project',
            name: 'Test Project',
            lastOpened: '2023-01-01T00:00:00.000Z',
            metadata: { framework: 'vue' },
          },
          activeTasks: [
            {
              id: 'task-1',
              branchName: 'feature/test',
              taskType: 'feature',
              status: 'active',
              openedAt: '2023-01-01T00:00:00.000Z',
              lastActiveAt: '2023-01-01T01:00:00.000Z',
              workState: { hasUncommittedChanges: true },
            },
          ],
          taskHistory: [
            {
              id: 'task-old',
              branchName: 'feature/old',
              taskType: 'bug',
              openedAt: '2022-12-01T00:00:00.000Z',
              closedAt: '2022-12-02T00:00:00.000Z',
              completionStatus: 'completed',
            },
          ],
          currentTaskId: 'task-1',
        }

        mockIpcRenderer.invoke.mockResolvedValue(mockWorkspace)

        const result = await storageAPI.getWorkspace()

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'storage:get-workspace'
        )
        expect(result).toBeDefined()
        expect(result!.project.lastOpened).toBeInstanceOf(Date)
        expect(result!.activeTasks[0].openedAt).toBeInstanceOf(Date)
        expect(result!.activeTasks[0].lastActiveAt).toBeInstanceOf(Date)
        expect(result!.taskHistory[0].openedAt).toBeInstanceOf(Date)
        expect(result!.taskHistory[0].closedAt).toBeInstanceOf(Date)
      })

      it('should return null when no workspace exists', async () => {
        const { storageAPI } = await import('./storage')

        mockIpcRenderer.invoke.mockResolvedValue(null)

        const result = await storageAPI.getWorkspace()

        expect(result).toBeNull()
      })

      it('should handle IPC errors and re-throw with enhanced message', async () => {
        const { storageAPI } = await import('./storage')

        const ipcError = new Error('Workspace fetch failed')
        mockIpcRenderer.invoke.mockRejectedValue(ipcError)

        await expect(storageAPI.getWorkspace()).rejects.toThrow(
          'Failed to get workspace: Error: Workspace fetch failed'
        )

        expect(console.error).toHaveBeenCalledWith(
          '[StorageAPI] Failed to get workspace:',
          ipcError
        )
      })
    })

    describe('setWorkspace', () => {
      it('should set workspace with complete data successfully', async () => {
        const { storageAPI } = await import('./storage')

        const workspace = {
          project: {
            path: '/test/project',
            name: 'Test Project',
            lastOpened: new Date(),
            metadata: { framework: 'vue' },
          },
          activeTasks: [],
          taskHistory: [],
          currentTaskId: null,
        }

        mockIpcRenderer.invoke.mockResolvedValue(undefined)

        await storageAPI.setWorkspace(workspace)

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'storage:set-workspace',
          workspace
        )
      })

      it('should validate workspace data is required object', async () => {
        const { storageAPI } = await import('./storage')

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime null handling
        await expect(storageAPI.setWorkspace(null as any)).rejects.toThrow(
          'Workspace data is required'
        )

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime undefined handling
        await expect(storageAPI.setWorkspace(undefined as any)).rejects.toThrow(
          'Workspace data is required'
        )

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime string type mismatch
        await expect(storageAPI.setWorkspace('string' as any)).rejects.toThrow(
          'Workspace data is required'
        )
      })

      it('should validate workspace has project with path', async () => {
        const { storageAPI } = await import('./storage')

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test incomplete object validation
        await expect(storageAPI.setWorkspace({} as any)).rejects.toThrow(
          'Workspace must have a project with a path'
        )

        await expect(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
          storageAPI.setWorkspace({ project: null } as any)
        ).rejects.toThrow('Workspace must have a project with a path')

        await expect(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
          storageAPI.setWorkspace({ project: {} } as any)
        ).rejects.toThrow('Workspace must have a project with a path')

        await expect(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
          storageAPI.setWorkspace({ project: { path: '' } } as any)
        ).rejects.toThrow('Workspace must have a project with a path')
      })

      it('should handle IPC errors and re-throw with enhanced message', async () => {
        const { storageAPI } = await import('./storage')

        const ipcError = new Error('Workspace save failed')
        mockIpcRenderer.invoke.mockRejectedValue(ipcError)

        const validWorkspace = {
          project: {
            path: '/valid/path',
            name: 'Valid Project',
            lastOpened: new Date(),
          },
          activeTasks: [],
          taskHistory: [],
          currentTaskId: null,
        }

        await expect(storageAPI.setWorkspace(validWorkspace)).rejects.toThrow(
          'Failed to set workspace: Error: Workspace save failed'
        )

        expect(console.error).toHaveBeenCalledWith(
          '[StorageAPI] Failed to set workspace:',
          ipcError
        )
      })
    })

    describe('clearWorkspace', () => {
      it('should clear workspace successfully', async () => {
        const { storageAPI } = await import('./storage')

        mockIpcRenderer.invoke.mockResolvedValue(undefined)

        await storageAPI.clearWorkspace()

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'storage:clear-workspace'
        )
      })

      it('should handle IPC errors and re-throw with enhanced message', async () => {
        const { storageAPI } = await import('./storage')

        const ipcError = new Error('Workspace clear failed')
        mockIpcRenderer.invoke.mockRejectedValue(ipcError)

        await expect(storageAPI.clearWorkspace()).rejects.toThrow(
          'Failed to clear workspace: Error: Workspace clear failed'
        )

        expect(console.error).toHaveBeenCalledWith(
          '[StorageAPI] Failed to clear workspace:',
          ipcError
        )
      })
    })
  })

  describe('Task Management API', () => {
    describe('addTask', () => {
      it('should add task with complete data successfully', async () => {
        const { storageAPI } = await import('./storage')

        const task = {
          id: 'task-123',
          branchName: 'feature/new-feature',
          taskType: 'feature' as const,
          status: 'active' as const,
          openedAt: new Date(),
          lastActiveAt: new Date(),
          workState: {
            hasUncommittedChanges: false,
            hasUnpushedCommits: true,
          },
        }

        mockIpcRenderer.invoke.mockResolvedValue(undefined)

        await storageAPI.addTask(task)

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'storage:add-task',
          task
        )
      })

      it('should validate task data is required object', async () => {
        const { storageAPI } = await import('./storage')

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime null handling
        await expect(storageAPI.addTask(null as any)).rejects.toThrow(
          'Task data is required'
        )

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime undefined handling
        await expect(storageAPI.addTask(undefined as any)).rejects.toThrow(
          'Task data is required'
        )

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime string type mismatch
        await expect(storageAPI.addTask('string' as any)).rejects.toThrow(
          'Task data is required'
        )
      })

      it('should validate task has required fields', async () => {
        const { storageAPI } = await import('./storage')

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test incomplete object validation
        await expect(storageAPI.addTask({} as any)).rejects.toThrow(
          'Task must have id, branchName, and taskType'
        )

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
        await expect(storageAPI.addTask({ id: 'test' } as any)).rejects.toThrow(
          'Task must have id, branchName, and taskType'
        )

        await expect(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
          storageAPI.addTask({ id: 'test', branchName: 'branch' } as any)
        ).rejects.toThrow('Task must have id, branchName, and taskType')

        await expect(
          storageAPI.addTask({
            id: '',
            branchName: 'branch',
            taskType: 'feature',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
          } as any)
        ).rejects.toThrow('Task must have id, branchName, and taskType')

        await expect(
          storageAPI.addTask({
            id: 'test',
            branchName: '',
            taskType: 'feature',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
          } as any)
        ).rejects.toThrow('Task must have id, branchName, and taskType')

        await expect(
          storageAPI.addTask({
            id: 'test',
            branchName: 'branch',
            taskType: '',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
          } as any)
        ).rejects.toThrow('Task must have id, branchName, and taskType')
      })

      it('should handle IPC errors and re-throw with enhanced message', async () => {
        const { storageAPI } = await import('./storage')

        const ipcError = new Error('Task add failed')
        mockIpcRenderer.invoke.mockRejectedValue(ipcError)

        const validTask = {
          id: 'task-123',
          branchName: 'feature/test',
          taskType: 'feature' as const,
          status: 'active' as const,
          openedAt: new Date(),
          lastActiveAt: new Date(),
          workState: {},
        }

        await expect(storageAPI.addTask(validTask)).rejects.toThrow(
          'Failed to add task: Error: Task add failed'
        )

        expect(console.error).toHaveBeenCalledWith(
          '[StorageAPI] Failed to add task:',
          ipcError
        )
      })
    })

    describe('removeTask', () => {
      it('should remove task with valid ID', async () => {
        const { storageAPI } = await import('./storage')

        mockIpcRenderer.invoke.mockResolvedValue(undefined)

        await storageAPI.removeTask('task-to-remove')

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'storage:remove-task',
          'task-to-remove'
        )
      })

      it('should trim task ID before sending', async () => {
        const { storageAPI } = await import('./storage')

        mockIpcRenderer.invoke.mockResolvedValue(undefined)

        await storageAPI.removeTask('  task-id  ')

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'storage:remove-task',
          'task-id'
        )
      })

      it('should validate task ID is required non-empty string', async () => {
        const { storageAPI } = await import('./storage')

        await expect(storageAPI.removeTask('')).rejects.toThrow(
          'Task ID is required and must be a non-empty string'
        )

        await expect(storageAPI.removeTask('   ')).rejects.toThrow(
          'Task ID is required and must be a non-empty string'
        )

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime null handling
        await expect(storageAPI.removeTask(null as any)).rejects.toThrow(
          'Task ID is required and must be a non-empty string'
        )

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime undefined handling
        await expect(storageAPI.removeTask(undefined as any)).rejects.toThrow(
          'Task ID is required and must be a non-empty string'
        )

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime number type validation
        await expect(storageAPI.removeTask(123 as any)).rejects.toThrow(
          'Task ID is required and must be a non-empty string'
        )
      })

      it('should handle IPC errors and re-throw with enhanced message', async () => {
        const { storageAPI } = await import('./storage')

        const ipcError = new Error('Task remove failed')
        mockIpcRenderer.invoke.mockRejectedValue(ipcError)

        await expect(storageAPI.removeTask('valid-id')).rejects.toThrow(
          'Failed to remove task: Error: Task remove failed'
        )

        expect(console.error).toHaveBeenCalledWith(
          '[StorageAPI] Failed to remove task:',
          ipcError
        )
      })
    })

    describe('setCurrentTask', () => {
      it('should set current task with valid ID', async () => {
        const { storageAPI } = await import('./storage')

        mockIpcRenderer.invoke.mockResolvedValue(undefined)

        await storageAPI.setCurrentTask('task-123')

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'storage:set-current-task',
          'task-123'
        )
      })

      it('should set current task to null', async () => {
        const { storageAPI } = await import('./storage')

        mockIpcRenderer.invoke.mockResolvedValue(undefined)

        await storageAPI.setCurrentTask(null)

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'storage:set-current-task',
          null
        )
      })

      it('should handle IPC errors and re-throw with enhanced message', async () => {
        const { storageAPI } = await import('./storage')

        const ipcError = new Error('Set current task failed')
        mockIpcRenderer.invoke.mockRejectedValue(ipcError)

        await expect(storageAPI.setCurrentTask('task-id')).rejects.toThrow(
          'Failed to set current task: Error: Set current task failed'
        )

        expect(console.error).toHaveBeenCalledWith(
          '[StorageAPI] Failed to set current task:',
          ipcError
        )
      })
    })

    describe('updateTaskState', () => {
      it('should update task state with complete work state', async () => {
        const { storageAPI } = await import('./storage')

        const workState = {
          hasUncommittedChanges: true,
          hasUnpushedCommits: false,
          lastCommitMessage: 'WIP: feature implementation',
          modifiedFiles: ['src/component.vue', 'src/utils.ts'],
        }

        mockIpcRenderer.invoke.mockResolvedValue(undefined)

        await storageAPI.updateTaskState('task-123', workState)

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'storage:update-task-state',
          'task-123',
          workState
        )
      })

      it('should trim task ID before sending', async () => {
        const { storageAPI } = await import('./storage')

        const workState = { hasUncommittedChanges: true }

        mockIpcRenderer.invoke.mockResolvedValue(undefined)

        await storageAPI.updateTaskState('  task-456  ', workState)

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'storage:update-task-state',
          'task-456',
          workState
        )
      })

      it('should validate task ID is required non-empty string', async () => {
        const { storageAPI } = await import('./storage')

        const workState = { hasUncommittedChanges: true }

        await expect(storageAPI.updateTaskState('', workState)).rejects.toThrow(
          'Task ID is required and must be a non-empty string'
        )

        await expect(
          storageAPI.updateTaskState('   ', workState)
        ).rejects.toThrow('Task ID is required and must be a non-empty string')

        await expect(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime null handling
          storageAPI.updateTaskState(null as any, workState)
        ).rejects.toThrow('Task ID is required and must be a non-empty string')

        await expect(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime undefined handling
          storageAPI.updateTaskState(undefined as any, workState)
        ).rejects.toThrow('Task ID is required and must be a non-empty string')

        await expect(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime number type validation
          storageAPI.updateTaskState(789 as any, workState)
        ).rejects.toThrow('Task ID is required and must be a non-empty string')
      })

      it('should validate work state is required object', async () => {
        const { storageAPI } = await import('./storage')

        await expect(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime null handling
          storageAPI.updateTaskState('task-id', null as any)
        ).rejects.toThrow('Work state is required and must be an object')

        await expect(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime undefined handling
          storageAPI.updateTaskState('task-id', undefined as any)
        ).rejects.toThrow('Work state is required and must be an object')

        await expect(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime string type mismatch
          storageAPI.updateTaskState('task-id', 'string' as any)
        ).rejects.toThrow('Work state is required and must be an object')

        await expect(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime number type validation
          storageAPI.updateTaskState('task-id', 123 as any)
        ).rejects.toThrow('Work state is required and must be an object')
      })

      it('should handle IPC errors and re-throw with enhanced message', async () => {
        const { storageAPI } = await import('./storage')

        const ipcError = new Error('Task state update failed')
        mockIpcRenderer.invoke.mockRejectedValue(ipcError)

        await expect(
          storageAPI.updateTaskState('task-id', { hasUncommittedChanges: true })
        ).rejects.toThrow(
          'Failed to update task state: Error: Task state update failed'
        )

        expect(console.error).toHaveBeenCalledWith(
          '[StorageAPI] Failed to update task state:',
          ipcError
        )
      })
    })
  })

  describe('Configuration Management API', () => {
    describe('getIDEConfig', () => {
      it('should fetch IDE configuration successfully', async () => {
        const { storageAPI } = await import('./storage')

        const mockConfig = {
          version: '1.2.0',
          ui: {
            theme: 'dark' as const,
            sidebarWidth: 280,
            terminalHeight: 350,
          },
          editor: {
            fontSize: 16,
            fontFamily: 'Fira Code',
            tabSize: 4,
            wordWrap: true,
          },
          projectHistoryLimit: 15,
        }

        mockIpcRenderer.invoke.mockResolvedValue(mockConfig)

        const result = await storageAPI.getIDEConfig()

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'storage:get-ide-config'
        )
        expect(result).toEqual(mockConfig)
      })

      it('should handle IPC errors and re-throw with enhanced message', async () => {
        const { storageAPI } = await import('./storage')

        const ipcError = new Error('Config fetch failed')
        mockIpcRenderer.invoke.mockRejectedValue(ipcError)

        await expect(storageAPI.getIDEConfig()).rejects.toThrow(
          'Failed to load IDE configuration: Error: Config fetch failed'
        )

        expect(console.error).toHaveBeenCalledWith(
          '[StorageAPI] Failed to get IDE config:',
          ipcError
        )
      })
    })

    describe('updateIDEConfig', () => {
      it('should update IDE configuration with partial data', async () => {
        const { storageAPI } = await import('./storage')

        const configUpdate = {
          ui: {
            theme: 'light' as const,
            sidebarWidth: 300,
          },
          editor: {
            fontSize: 18,
          },
        }

        mockIpcRenderer.invoke.mockResolvedValue(undefined)

        await storageAPI.updateIDEConfig(configUpdate)

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'storage:update-ide-config',
          configUpdate
        )
      })

      it('should validate configuration update is required object', async () => {
        const { storageAPI } = await import('./storage')

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime null handling
        await expect(storageAPI.updateIDEConfig(null as any)).rejects.toThrow(
          'Configuration update is required'
        )

        await expect(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime undefined handling
          storageAPI.updateIDEConfig(undefined as any)
        ).rejects.toThrow('Configuration update is required')

        await expect(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime string type mismatch
          storageAPI.updateIDEConfig('string' as any)
        ).rejects.toThrow('Configuration update is required')

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test validation requires bypassing type system to test runtime number type validation
        await expect(storageAPI.updateIDEConfig(123 as any)).rejects.toThrow(
          'Configuration update is required'
        )
      })

      it('should handle IPC errors and re-throw with enhanced message', async () => {
        const { storageAPI } = await import('./storage')

        const ipcError = new Error('Config update failed')
        mockIpcRenderer.invoke.mockRejectedValue(ipcError)

        await expect(
          storageAPI.updateIDEConfig({ version: '1.0.0' })
        ).rejects.toThrow(
          'Failed to update IDE configuration: Error: Config update failed'
        )

        expect(console.error).toHaveBeenCalledWith(
          '[StorageAPI] Failed to update IDE config:',
          ipcError
        )
      })
    })
  })

  describe('Security Information API', () => {
    describe('getSecurityInfo', () => {
      it('should fetch security information successfully', async () => {
        const { storageAPI } = await import('./storage')

        const mockSecurityInfo = {
          platform: 'darwin',
          encryptionAvailable: true,
          backend: 'keychain',
          keyringService: 'macos-keychain',
        }

        mockIpcRenderer.invoke.mockResolvedValue(mockSecurityInfo)

        const result = await storageAPI.getSecurityInfo()

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'storage:get-security-info'
        )
        expect(result).toEqual(mockSecurityInfo)
      })

      it('should handle IPC errors and re-throw with enhanced message', async () => {
        const { storageAPI } = await import('./storage')

        const ipcError = new Error('Security info fetch failed')
        mockIpcRenderer.invoke.mockRejectedValue(ipcError)

        await expect(storageAPI.getSecurityInfo()).rejects.toThrow(
          'Failed to get security information: Error: Security info fetch failed'
        )

        expect(console.error).toHaveBeenCalledWith(
          '[StorageAPI] Failed to get security info:',
          ipcError
        )
      })
    })
  })

  describe('Utility APIs', () => {
    describe('validateProjectPath', () => {
      it('should validate project path successfully', async () => {
        const { storageAPI } = await import('./storage')

        const mockResult = {
          valid: true,
          name: 'my-project',
        }

        mockIpcRenderer.invoke.mockResolvedValue(mockResult)

        const result = await storageAPI.validateProjectPath('/path/to/project')

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'storage:validate-project-path',
          '/path/to/project'
        )
        expect(result).toEqual(mockResult)
      })

      it('should trim path before sending', async () => {
        const { storageAPI } = await import('./storage')

        const mockResult = { valid: true }
        mockIpcRenderer.invoke.mockResolvedValue(mockResult)

        await storageAPI.validateProjectPath('  /trimmed/path  ')

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'storage:validate-project-path',
          '/trimmed/path'
        )
      })

      it('should return error result for invalid path parameters', async () => {
        const { storageAPI } = await import('./storage')

        const invalidPaths = ['', '   ', null, undefined, 123]

        for (const invalidPath of invalidPaths) {
          const result = await storageAPI.validateProjectPath(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
            invalidPath as any
          )

          expect(result).toEqual({
            valid: false,
            error: 'Path is required and must be a non-empty string',
          })
        }

        // Should not call IPC for invalid parameters
        expect(mockIpcRenderer.invoke).not.toHaveBeenCalled()
      })

      it('should handle IPC errors gracefully and return error result', async () => {
        const { storageAPI } = await import('./storage')

        const ipcError = new Error('Path validation failed')
        mockIpcRenderer.invoke.mockRejectedValue(ipcError)

        const result = await storageAPI.validateProjectPath('/valid/path')

        expect(result).toEqual({
          valid: false,
          error: 'Failed to validate path: Error: Path validation failed',
        })

        expect(console.error).toHaveBeenCalledWith(
          '[StorageAPI] Failed to validate path:',
          ipcError
        )
      })
    })

    describe('checkPath', () => {
      it('should check path existence successfully', async () => {
        const { storageAPI } = await import('./storage')

        const mockResult = {
          exists: true,
          isDirectory: true,
        }

        mockIpcRenderer.invoke.mockResolvedValue(mockResult)

        const result = await storageAPI.checkPath('/path/to/check')

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'storage:check-path',
          '/path/to/check'
        )
        expect(result).toEqual(mockResult)
      })

      it('should trim path before sending', async () => {
        const { storageAPI } = await import('./storage')

        const mockResult = { exists: false, isDirectory: false }
        mockIpcRenderer.invoke.mockResolvedValue(mockResult)

        await storageAPI.checkPath('  /trimmed/check/path  ')

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'storage:check-path',
          '/trimmed/check/path'
        )
      })

      it('should return error result for invalid path parameters', async () => {
        const { storageAPI } = await import('./storage')

        const invalidPaths = ['', '   ', null, undefined, 456]

        for (const invalidPath of invalidPaths) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test requires flexible typing for validation testing
          const result = await storageAPI.checkPath(invalidPath as any)

          expect(result).toEqual({
            exists: false,
            isDirectory: false,
            error: 'Path is required and must be a non-empty string',
          })
        }

        // Should not call IPC for invalid parameters
        expect(mockIpcRenderer.invoke).not.toHaveBeenCalled()
      })

      it('should handle IPC errors gracefully and return error result', async () => {
        const { storageAPI } = await import('./storage')

        const ipcError = new Error('Path check failed')
        mockIpcRenderer.invoke.mockRejectedValue(ipcError)

        const result = await storageAPI.checkPath('/valid/path')

        expect(result).toEqual({
          exists: false,
          isDirectory: false,
          error: 'Failed to check path: Error: Path check failed',
        })

        expect(console.error).toHaveBeenCalledWith(
          '[StorageAPI] Failed to check path:',
          ipcError
        )
      })
    })
  })
})
