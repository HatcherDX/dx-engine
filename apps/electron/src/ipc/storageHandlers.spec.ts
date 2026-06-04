/**
 * @fileoverview Comprehensive test suite for storageHandlers IPC module
 *
 * @description
 * Complete test coverage for Electron IPC storage handlers using ElectronStorageManager.
 * Tests registration, security validation, error handling, and all handler operations.
 *
 * @author Hatcher DX Team
 * @since 2.0.0
 * @public
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ipcMain, type WebContents } from 'electron'
import {
  initStorage,
  shutdownStorage,
  registerStorageHandlers,
  registerTrustedSender,
} from './storageHandlers'

// Mock the entire electron module
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
}))

// Mock ElectronStorageManager
vi.mock('../storage/ElectronStorageManager', () => {
  const mockMethods = {
    initialize: vi.fn().mockResolvedValue(undefined),
    shutdown: vi.fn().mockResolvedValue(undefined),
    createProject: vi.fn().mockResolvedValue('proj_123'),
    getProjects: vi.fn().mockResolvedValue([]),
    getProjectByPath: vi.fn().mockResolvedValue(null),
    saveProject: vi.fn().mockResolvedValue(undefined),
    updateProjectLastOpened: vi.fn().mockResolvedValue(undefined),
    deleteProject: vi.fn().mockResolvedValue(undefined),
    clearAllProjects: vi.fn().mockResolvedValue(undefined),
    getWorkspace: vi.fn().mockResolvedValue(null),
    setWorkspace: vi.fn().mockResolvedValue(undefined),
    clearWorkspace: vi.fn().mockResolvedValue(undefined),
    createBranch: vi.fn().mockResolvedValue('branch_123'),
    switchBranch: vi.fn().mockResolvedValue(undefined),
    getActiveBranch: vi.fn().mockResolvedValue(null),
    saveConversation: vi.fn().mockResolvedValue(undefined),
    getConversationsForBranch: vi.fn().mockResolvedValue([]),
    saveMessage: vi.fn().mockResolvedValue(undefined),
    getMessagesForSession: vi.fn().mockResolvedValue([]),
    saveAction: vi.fn().mockResolvedValue(undefined),
    updateActionStatus: vi.fn().mockResolvedValue(undefined),
    getBranchMetrics: vi.fn().mockResolvedValue({
      totalMessages: 0,
      totalTokens: 0,
      totalCost: 0,
      sessionCount: 0,
    }),
    getProviderStats: vi.fn().mockResolvedValue([]),
    getGlobalStats: vi.fn().mockResolvedValue({
      totalProjects: 0,
      totalBranches: 0,
      totalSessions: 0,
      totalMessages: 0,
    }),
    db: null,
  }

  const mockInstance = {
    ...mockMethods,
  }

  return {
    ElectronStorageManager: {
      create: vi.fn().mockResolvedValue(mockInstance),
    },
  }
})

describe('StorageHandlers - ElectronStorageManager Integration', () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  let ipcHandlers: Map<string, Function>
  let mockWebContents: WebContents
  let originalConsoleLog: typeof console.log
  let originalConsoleWarn: typeof console.warn
  let originalConsoleError: typeof console.error

  /**
   * Create a mock WebContents
   */
  function createMockWebContents(id: number = 1): WebContents {
    return {
      id,
      isDestroyed: vi.fn(() => false),
      once: vi.fn((_event, _handler) => {
        // Store the handler so tests can trigger it if needed
        return undefined
      }),
    } as unknown as WebContents
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Silence console output during tests
    originalConsoleLog = console.log
    originalConsoleWarn = console.warn
    originalConsoleError = console.error
    console.log = vi.fn()
    console.warn = vi.fn()
    console.error = vi.fn()

    // Track IPC handlers
    ipcHandlers = new Map()
    vi.mocked(ipcMain.handle).mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      (channel: string, handler: Function) => {
        ipcHandlers.set(channel, handler)
      }
    )

    mockWebContents = createMockWebContents(1)
  })

  afterEach(async () => {
    // Restore console
    console.log = originalConsoleLog
    console.warn = originalConsoleWarn
    console.error = originalConsoleError

    // Cleanup storage
    await shutdownStorage()
  })

  describe('Storage Initialization', () => {
    it('should initialize storage successfully', async () => {
      await initStorage()

      expect(console.log).toHaveBeenCalledWith(
        '[StorageHandlers] Initializing ElectronStorageManager...'
      )
      expect(console.log).toHaveBeenCalledWith(
        '[StorageHandlers] ✅ Storage initialized successfully'
      )
    })

    it('should warn if storage already initialized', async () => {
      await initStorage()
      await initStorage()

      expect(console.warn).toHaveBeenCalledWith(
        '[StorageHandlers] Storage already initialized'
      )
    })

    it('should shutdown storage gracefully', async () => {
      await initStorage()
      await shutdownStorage()

      expect(console.log).toHaveBeenCalledWith(
        '[StorageHandlers] Shutting down storage...'
      )
      expect(console.log).toHaveBeenCalledWith(
        '[StorageHandlers] ✅ Storage shutdown complete'
      )
    })

    it('should warn when shutting down uninitialized storage', async () => {
      await shutdownStorage()

      expect(console.warn).toHaveBeenCalledWith(
        '[StorageHandlers] Storage not initialized'
      )
    })
  })

  describe('Trusted Sender Registration', () => {
    it('should register WebContents as trusted', () => {
      registerTrustedSender(mockWebContents)

      expect(console.log).toHaveBeenCalledWith(
        '[StorageHandlers] Registered trusted sender: WebContents ID 1'
      )
      expect(mockWebContents.once).toHaveBeenCalledWith(
        'destroyed',
        expect.any(Function)
      )
    })

    it('should setup auto-cleanup on WebContents destroyed', () => {
      let destroyedHandler: (() => void) | null = null

      // Mock the once method to capture the handler
      vi.mocked(mockWebContents.once).mockImplementation((event, handler) => {
        if (event === 'destroyed') {
          destroyedHandler = handler as () => void
        }
        return mockWebContents
      })

      registerTrustedSender(mockWebContents)

      // Simulate WebContents destruction
      if (destroyedHandler) {
        destroyedHandler()
      }

      expect(console.log).toHaveBeenCalledWith(
        '[StorageHandlers] Removed trusted sender: WebContents ID 1'
      )
    })
  })

  describe('Handler Registration', () => {
    it('should register all storage handlers without errors', async () => {
      await initStorage()
      registerStorageHandlers()

      expect(console.log).toHaveBeenCalledWith(
        '[StorageHandlers] Registering IPC handlers...'
      )
      expect(console.log).toHaveBeenCalledWith(
        '[StorageHandlers] ✅ All handlers registered successfully'
      )
    })

    it('should register project management handlers', async () => {
      await initStorage()
      registerStorageHandlers()

      const projectHandlers = [
        'storage:create-project',
        'storage:get-active-project',
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
      ]

      projectHandlers.forEach((channel) => {
        expect(ipcHandlers.has(channel)).toBe(true)
      })
    })

    it('should register workspace management handlers', async () => {
      await initStorage()
      registerStorageHandlers()

      const workspaceHandlers = [
        'storage:get-workspace',
        'storage:set-workspace',
        'storage:clear-workspace',
        'storage:add-task',
        'storage:remove-task',
        'storage:set-current-task',
        'storage:update-task-state',
      ]

      workspaceHandlers.forEach((channel) => {
        expect(ipcHandlers.has(channel)).toBe(true)
      })
    })

    it('should register branch management handlers', async () => {
      await initStorage()
      registerStorageHandlers()

      const branchHandlers = [
        'storage:create-branch',
        'storage:switch-branch',
        'storage:get-active-branch',
      ]

      branchHandlers.forEach((channel) => {
        expect(ipcHandlers.has(channel)).toBe(true)
      })
    })

    it('should register conversation (DeckLog) handlers', async () => {
      await initStorage()
      registerStorageHandlers()

      const conversationHandlers = [
        'storage:create-conversation-session',
        'storage:update-conversation-session',
        'storage:get-conversation-sessions',
        'storage:add-message',
        'storage:get-messages',
        'storage:delete-conversation-session',
      ]

      conversationHandlers.forEach((channel) => {
        expect(ipcHandlers.has(channel)).toBe(true)
      })
    })

    it('should register action tracking handlers', async () => {
      await initStorage()
      registerStorageHandlers()

      const actionHandlers = [
        'storage:create-action-execution',
        'storage:update-action-status',
        'storage:get-action-executions',
        'storage:append-action-log',
      ]

      actionHandlers.forEach((channel) => {
        expect(ipcHandlers.has(channel)).toBe(true)
      })
    })

    it('should register metrics handlers', async () => {
      await initStorage()
      registerStorageHandlers()

      const metricsHandlers = [
        'storage:get-branch-metrics',
        'storage:get-provider-stats',
        'storage:get-global-stats',
      ]

      metricsHandlers.forEach((channel) => {
        expect(ipcHandlers.has(channel)).toBe(true)
      })
    })
  })

  describe('Security Validation', () => {
    it('should reject unauthorized senders', async () => {
      await initStorage()
      registerStorageHandlers()

      const handler = ipcHandlers.get('storage:get-recent-projects')!
      const unauthorizedEvent = { sender: { id: 999 } }

      await expect(handler(unauthorizedEvent)).rejects.toThrow(
        'Unauthorized request: sender not registered as trusted'
      )
    })

    it('should allow trusted senders', async () => {
      await initStorage()
      registerStorageHandlers()
      registerTrustedSender(mockWebContents)

      const handler = ipcHandlers.get('storage:get-recent-projects')!
      const trustedEvent = { sender: mockWebContents }

      await expect(handler(trustedEvent)).resolves.toBeDefined()
    })
  })

  describe('Project Handlers', () => {
    beforeEach(async () => {
      await initStorage()
      registerStorageHandlers()
      registerTrustedSender(mockWebContents)
    })

    it('should return IDE config with proper defaults', async () => {
      const handler = ipcHandlers.get('storage:get-ide-config')!
      const event = { sender: mockWebContents }

      const config = await handler(event)

      expect(config).toEqual({
        version: '1.0.0',
        ui: {
          theme: 'auto',
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
      })
    })

    it('should return security info with enhanced fields', async () => {
      const handler = ipcHandlers.get('storage:get-security-info')!
      const event = { sender: mockWebContents }

      const info = await handler(event)

      expect(info).toEqual({
        platform: process.platform,
        encryptionAvailable: true,
        backend: 'electron-store',
        keyringService: 'system',
      })
    })

    it('should validate project path', async () => {
      const handler = ipcHandlers.get('storage:validate-project-path')!
      const event = { sender: mockWebContents }

      const result = await handler(event, '/path/to/project')

      expect(result).toEqual({
        valid: true,
        name: 'project',
      })
    })

    it('should check path status', async () => {
      const handler = ipcHandlers.get('storage:check-path')!
      const event = { sender: mockWebContents }

      const result = await handler(event, '/some/path')

      expect(result).toEqual({
        exists: true,
        isDirectory: true,
      })
    })
  })

  describe('Workspace Handlers', () => {
    beforeEach(async () => {
      await initStorage()
      registerStorageHandlers()
      registerTrustedSender(mockWebContents)
    })

    it('should get workspace successfully', async () => {
      const handler = ipcHandlers.get('storage:get-workspace')!
      const event = { sender: mockWebContents }

      const workspace = await handler(event)

      expect(workspace).toBeNull()
    })

    it('should set workspace with validation', async () => {
      const handler = ipcHandlers.get('storage:set-workspace')!
      const event = { sender: mockWebContents }

      const workspace = {
        project: {
          id: 'proj_1',
          name: 'Test Project',
          path: '/test/path',
        },
        activeTasks: [],
        currentTaskId: null,
      }

      const result = await handler(event, workspace)

      expect(result).toEqual({ success: true })
    })

    it('should reject invalid workspace data', async () => {
      const handler = ipcHandlers.get('storage:set-workspace')!
      const event = { sender: mockWebContents }

      await expect(handler(event, null)).rejects.toThrow(
        'Invalid workspace data'
      )
    })

    it('should reject workspace without project path', async () => {
      const handler = ipcHandlers.get('storage:set-workspace')!
      const event = { sender: mockWebContents }

      const invalidWorkspace = {
        project: { id: 'proj_1', name: 'Test' },
        activeTasks: [],
      }

      await expect(handler(event, invalidWorkspace)).rejects.toThrow(
        'Workspace must have a project with a path'
      )
    })

    it('should clear workspace successfully', async () => {
      const handler = ipcHandlers.get('storage:clear-workspace')!
      const event = { sender: mockWebContents }

      const result = await handler(event)

      expect(result).toEqual({ success: true })
    })
  })

  describe('Error Handling', () => {
    it('should throw error when handlers called without storage initialization', async () => {
      registerStorageHandlers()
      registerTrustedSender(mockWebContents)

      const handler = ipcHandlers.get('storage:get-recent-projects')!
      const event = { sender: mockWebContents }

      await expect(handler(event)).rejects.toThrow('Storage not initialized')
    })

    it('should handle storage errors gracefully', async () => {
      const { ElectronStorageManager } = await import(
        '../storage/ElectronStorageManager'
      )
      const mockInstance = await ElectronStorageManager.create()

      // Mock a storage error
      vi.mocked(mockInstance.getProjects).mockRejectedValue(
        new Error('Database error')
      )

      await initStorage()
      registerStorageHandlers()
      registerTrustedSender(mockWebContents)

      const handler = ipcHandlers.get('storage:get-recent-projects')!
      const event = { sender: mockWebContents }

      // Should return empty array instead of throwing
      const result = await handler(event)
      expect(result).toEqual([])
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('Integration Tests', () => {
    beforeEach(async () => {
      await initStorage()
      registerStorageHandlers()
      registerTrustedSender(mockWebContents)
    })

    it('should handle complete project workflow', async () => {
      const event = { sender: mockWebContents }

      // Add project
      const addHandler = ipcHandlers.get('storage:add-recent-project')!
      const addResult = await addHandler(event, {
        path: '/test/project',
        name: 'Test Project',
      })

      expect(addResult.success).toBe(true)

      // Get projects
      const getHandler = ipcHandlers.get('storage:get-recent-projects')!
      const projects = await getHandler(event)

      expect(Array.isArray(projects)).toBe(true)
    })

    it('should handle branch creation and switching', async () => {
      const event = { sender: mockWebContents }

      // Create branch
      const createHandler = ipcHandlers.get('storage:create-branch')!
      const createResult = await createHandler(
        event,
        'proj_1',
        'feature-branch'
      )

      expect(createResult.success).toBe(true)
      expect(createResult.branchId).toBeDefined()

      // Switch branch
      const switchHandler = ipcHandlers.get('storage:switch-branch')!
      const switchResult = await switchHandler(event, createResult.branchId)

      expect(switchResult.success).toBe(true)
    })

    it('should handle metrics retrieval workflow', async () => {
      const event = { sender: mockWebContents }

      // Get branch metrics
      const branchHandler = ipcHandlers.get('storage:get-branch-metrics')!
      const branchMetrics = await branchHandler(event, 'branch_123')

      expect(branchMetrics).toHaveProperty('totalMessages')
      expect(branchMetrics).toHaveProperty('totalTokens')

      // Get global stats
      const globalHandler = ipcHandlers.get('storage:get-global-stats')!
      const globalStats = await globalHandler(event)

      expect(globalStats).toHaveProperty('totalProjects')
      expect(globalStats).toHaveProperty('totalMessages')
    })
  })

  describe('Conversation Handlers - Edge Cases', () => {
    beforeEach(async () => {
      await initStorage()
      registerStorageHandlers()
      registerTrustedSender(mockWebContents)
    })

    it('should create conversation with empty project path (workspace fallback)', async () => {
      const handler = ipcHandlers.get('storage:create-conversation-session')!
      const event = { sender: mockWebContents }

      const session = await handler(event, ':main', 'anthropic', 'claude-3.5')

      expect(session).toBeDefined()
      expect(session.provider).toBe('anthropic')
      expect(session.model).toBe('claude-3.5')
    })

    it('should create conversation with workspace fallback when project creation fails', async () => {
      const { ElectronStorageManager } = await import(
        '../storage/ElectronStorageManager'
      )
      const mockInstance = await ElectronStorageManager.create()

      // Mock project creation failure
      vi.mocked(mockInstance.getProjects).mockResolvedValue([])
      vi.mocked(mockInstance.saveProject).mockRejectedValue(
        new Error('Database error')
      )

      const handler = ipcHandlers.get('storage:create-conversation-session')!
      const event = { sender: mockWebContents }

      const session = await handler(event, '', 'anthropic', 'claude-3.5')

      expect(session).toBeDefined()
    })

    it('should create conversation with auto-registration for new project', async () => {
      const { ElectronStorageManager } = await import(
        '../storage/ElectronStorageManager'
      )
      const mockInstance = await ElectronStorageManager.create()

      // Mock no existing project
      vi.mocked(mockInstance.getProjects).mockResolvedValue([])
      vi.mocked(mockInstance.createBranch).mockResolvedValue('branch_new')

      const handler = ipcHandlers.get('storage:create-conversation-session')!
      const event = { sender: mockWebContents }

      const session = await handler(
        event,
        '/new/project:main',
        'anthropic',
        'claude-3.5'
      )

      expect(session).toBeDefined()
      expect(mockInstance.saveProject).toHaveBeenCalled()
    })

    it('should handle existing project in conversation creation', async () => {
      const { ElectronStorageManager } = await import(
        '../storage/ElectronStorageManager'
      )
      const mockInstance = await ElectronStorageManager.create()

      vi.mocked(mockInstance.getProjects).mockResolvedValue([
        {
          id: 'proj_123',
          name: 'Existing',
          path: '/existing/project',
          created_at: new Date(),
          last_opened_at: new Date(),
        },
      ])
      vi.mocked(mockInstance.createBranch).mockResolvedValue('branch_123')

      const handler = ipcHandlers.get('storage:create-conversation-session')!
      const event = { sender: mockWebContents }

      const session = await handler(
        event,
        '/existing/project:main',
        'anthropic',
        'claude-3.5'
      )

      expect(session).toBeDefined()
      expect(session.project_id).toBe('proj_123')
    })

    it('should handle branch creation error in conversation', async () => {
      const { ElectronStorageManager } = await import(
        '../storage/ElectronStorageManager'
      )
      const mockInstance = await ElectronStorageManager.create()

      vi.mocked(mockInstance.getProjects).mockResolvedValue([
        {
          id: 'proj_123',
          name: 'Test',
          path: '/test',
          created_at: new Date(),
          last_opened_at: new Date(),
        },
      ])
      vi.mocked(mockInstance.createBranch).mockRejectedValue(
        new Error('Branch error')
      )

      const handler = ipcHandlers.get('storage:create-conversation-session')!
      const event = { sender: mockWebContents }

      const session = await handler(
        event,
        '/test:feature',
        'anthropic',
        'claude-3.5'
      )

      expect(session).toBeDefined()
      expect(session.branch_id).toBeDefined()
    })

    it('should handle conversation save error gracefully', async () => {
      const { ElectronStorageManager } = await import(
        '../storage/ElectronStorageManager'
      )
      const mockInstance = await ElectronStorageManager.create()

      vi.mocked(mockInstance.getProjects).mockResolvedValue([])
      vi.mocked(mockInstance.createBranch).mockResolvedValue('branch_123')
      vi.mocked(mockInstance.saveConversation).mockRejectedValue(
        new Error('Save error')
      )

      const handler = ipcHandlers.get('storage:create-conversation-session')!
      const event = { sender: mockWebContents }

      const session = await handler(
        event,
        '/test:main',
        'anthropic',
        'claude-3.5'
      )

      expect(session).toBeDefined()
      expect(session.metadata).toHaveProperty('saveError', true)
    })

    it('should update conversation session', async () => {
      const handler = ipcHandlers.get('storage:update-conversation-session')!
      const event = { sender: mockWebContents }

      const result = await handler(event, 'session_123', {
        session_title: 'Updated Title',
      })

      expect(result.success).toBe(true)
    })

    it('should get conversation sessions with empty project path', async () => {
      const handler = ipcHandlers.get('storage:get-conversation-sessions')!
      const event = { sender: mockWebContents }

      const sessions = await handler(event, ':main')

      expect(Array.isArray(sessions)).toBe(true)
      expect(sessions).toEqual([])
    })

    it('should get conversation sessions with auto-registration', async () => {
      const { ElectronStorageManager } = await import(
        '../storage/ElectronStorageManager'
      )
      const mockInstance = await ElectronStorageManager.create()

      // Mock no existing project, then successful creation
      vi.mocked(mockInstance.getProjects)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'proj_new',
            name: 'New Project',
            path: '/new/path',
            created_at: new Date(),
            last_opened_at: new Date(),
          },
        ])
      vi.mocked(mockInstance.createProject).mockResolvedValue('proj_new')

      // Mock database query
      mockInstance.db = {
        prepare: vi.fn().mockReturnValue({
          get: vi.fn().mockReturnValue({ id: 'branch_123' }),
        }),
      } as never

      const handler = ipcHandlers.get('storage:get-conversation-sessions')!
      const event = { sender: mockWebContents }

      const sessions = await handler(event, '/new/path:main')

      expect(Array.isArray(sessions)).toBe(true)
    })

    it('should return empty sessions when auto-registration fails', async () => {
      const { ElectronStorageManager } = await import(
        '../storage/ElectronStorageManager'
      )
      const mockInstance = await ElectronStorageManager.create()

      vi.mocked(mockInstance.getProjects).mockResolvedValue([])
      vi.mocked(mockInstance.createProject).mockRejectedValue(
        new Error('Creation failed')
      )

      const handler = ipcHandlers.get('storage:get-conversation-sessions')!
      const event = { sender: mockWebContents }

      const sessions = await handler(event, '/failed/path:main')

      expect(sessions).toEqual([])
    })

    it('should return empty when project lookup fails after auto-registration', async () => {
      const { ElectronStorageManager } = await import(
        '../storage/ElectronStorageManager'
      )
      const mockInstance = await ElectronStorageManager.create()

      vi.mocked(mockInstance.getProjects)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
      vi.mocked(mockInstance.createProject).mockResolvedValue('proj_fail')

      const handler = ipcHandlers.get('storage:get-conversation-sessions')!
      const event = { sender: mockWebContents }

      const sessions = await handler(event, '/fail/path:main')

      expect(sessions).toEqual([])
    })

    it('should return empty sessions when branch not found', async () => {
      const { ElectronStorageManager } = await import(
        '../storage/ElectronStorageManager'
      )
      const mockInstance = await ElectronStorageManager.create()

      vi.mocked(mockInstance.getProjects).mockResolvedValue([
        {
          id: 'proj_123',
          name: 'Test',
          path: '/test',
          created_at: new Date(),
          last_opened_at: new Date(),
        },
      ])

      // Mock branch not found
      mockInstance.db = {
        prepare: vi.fn().mockReturnValue({
          get: vi.fn().mockReturnValue(null),
        }),
      } as never

      const handler = ipcHandlers.get('storage:get-conversation-sessions')!
      const event = { sender: mockWebContents }

      const sessions = await handler(event, '/test:nonexistent')

      expect(sessions).toEqual([])
    })

    it('should apply limit to conversation sessions', async () => {
      const { ElectronStorageManager } = await import(
        '../storage/ElectronStorageManager'
      )
      const mockInstance = await ElectronStorageManager.create()

      vi.mocked(mockInstance.getProjects).mockResolvedValue([
        {
          id: 'proj_123',
          name: 'Test',
          path: '/test',
          created_at: new Date(),
          last_opened_at: new Date(),
        },
      ])

      mockInstance.db = {
        prepare: vi.fn().mockReturnValue({
          get: vi.fn().mockReturnValue({ id: 'branch_123' }),
        }),
      } as never

      vi.mocked(mockInstance.getConversationsForBranch).mockResolvedValue([
        { id: 'session_1' },
        { id: 'session_2' },
        { id: 'session_3' },
      ] as never)

      const handler = ipcHandlers.get('storage:get-conversation-sessions')!
      const event = { sender: mockWebContents }

      const sessions = await handler(event, '/test:main', 2)

      expect(sessions.length).toBe(2)
    })

    it('should handle errors in get conversation sessions', async () => {
      const { ElectronStorageManager } = await import(
        '../storage/ElectronStorageManager'
      )
      const mockInstance = await ElectronStorageManager.create()

      vi.mocked(mockInstance.getProjects).mockRejectedValue(
        new Error('Database error')
      )

      const handler = ipcHandlers.get('storage:get-conversation-sessions')!
      const event = { sender: mockWebContents }

      const sessions = await handler(event, '/test:main')

      expect(sessions).toEqual([])
    })

    it('should delete conversation session', async () => {
      const handler = ipcHandlers.get('storage:delete-conversation-session')!
      const event = { sender: mockWebContents }

      const result = await handler(event, 'session_123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Not implemented')
    })
  })

  describe('Message Handlers - Complete Coverage', () => {
    let savedMessages: Map<string, unknown[]>

    beforeEach(async () => {
      savedMessages = new Map()

      // Setup global mock to track saved messages
      const { ElectronStorageManager } = await import(
        '../storage/ElectronStorageManager'
      )
      const mockInstance = await ElectronStorageManager.create()

      // Mock saveMessage to store messages
      vi.mocked(mockInstance.saveMessage).mockImplementation(
        async (message: unknown) => {
          const msg = message as { session_id: string; id: string }
          if (!savedMessages.has(msg.session_id)) {
            savedMessages.set(msg.session_id, [])
          }
          savedMessages.get(msg.session_id)!.push(message)
        }
      )

      // Mock getMessagesForSession to retrieve stored messages
      vi.mocked(mockInstance.getMessagesForSession).mockImplementation(
        async (sessionId: string) => {
          return (savedMessages.get(sessionId) || []) as never
        }
      )

      await initStorage()
      registerStorageHandlers()
      registerTrustedSender(mockWebContents)
    })

    it('should add message with camelCase input', async () => {
      const handler = ipcHandlers.get('storage:add-message')!
      const event = { sender: mockWebContents }

      const result = await handler(event, {
        sessionId: 'session_123',
        branchId: 'branch_123',
        type: 'user',
        content: 'Hello',
        provider: 'anthropic',
        model: 'claude-3.5',
        tokenCount: 10,
      })

      expect(result).toBeDefined()
      expect(result.session_id).toBe('session_123')
      expect(result.branch_id).toBe('branch_123')
      expect(result.provider).toBe('anthropic')
    })

    it('should add message with snake_case input', async () => {
      const handler = ipcHandlers.get('storage:add-message')!
      const event = { sender: mockWebContents }

      const result = await handler(event, {
        session_id: 'session_456',
        branch_id: 'branch_456',
        type: 'assistant',
        content: 'Hi there',
        provider: 'openai',
        model: 'gpt-4',
        token_count: 20,
      })

      expect(result).toBeDefined()
      expect(result.session_id).toBe('session_456')
      expect(result.provider).toBe('openai')
    })

    it('should add message with timestamp as Date object', async () => {
      const handler = ipcHandlers.get('storage:add-message')!
      const event = { sender: mockWebContents }

      const now = new Date()
      const result = await handler(event, {
        sessionId: 'session_789',
        branchId: 'branch_789',
        type: 'user',
        content: 'Test',
        timestamp: now,
        provider: 'anthropic',
        model: 'claude-3.5',
      })

      expect(result.timestamp).toBe(now.getTime())
    })

    it('should add message with metadata object', async () => {
      const handler = ipcHandlers.get('storage:add-message')!
      const event = { sender: mockWebContents }

      const result = await handler(event, {
        sessionId: 'session_meta',
        branchId: 'branch_meta',
        type: 'user',
        content: 'Test metadata',
        provider: 'anthropic',
        model: 'claude-3.5',
        metadata: { key: 'value' },
      })

      expect(result.metadata_json).toBe('{"key":"value"}')
    })

    it('should add message with metadata_json string', async () => {
      const handler = ipcHandlers.get('storage:add-message')!
      const event = { sender: mockWebContents }

      const result = await handler(event, {
        sessionId: 'session_json',
        branchId: 'branch_json',
        type: 'user',
        content: 'Test',
        provider: 'anthropic',
        model: 'claude-3.5',
        metadata_json: '{"test":true}',
      })

      expect(result.metadata_json).toBe('{"test":true}')
    })

    it('should reject message without session_id', async () => {
      const handler = ipcHandlers.get('storage:add-message')!
      const event = { sender: mockWebContents }

      await expect(
        handler(event, {
          branchId: 'branch_123',
          type: 'user',
          content: 'Test',
          provider: 'anthropic',
          model: 'claude-3.5',
        })
      ).rejects.toThrow('Message must have a session_id')
    })

    it('should reject message without branch_id', async () => {
      const handler = ipcHandlers.get('storage:add-message')!
      const event = { sender: mockWebContents }

      await expect(
        handler(event, {
          sessionId: 'session_123',
          type: 'user',
          content: 'Test',
          provider: 'anthropic',
          model: 'claude-3.5',
        })
      ).rejects.toThrow('Message must have a branch_id')
    })

    it('should reject message without provider', async () => {
      const handler = ipcHandlers.get('storage:add-message')!
      const event = { sender: mockWebContents }

      await expect(
        handler(event, {
          sessionId: 'session_123',
          branchId: 'branch_123',
          type: 'user',
          content: 'Test',
          model: 'claude-3.5',
        })
      ).rejects.toThrow('Message must have a provider')
    })

    it('should reject message without model', async () => {
      const handler = ipcHandlers.get('storage:add-message')!
      const event = { sender: mockWebContents }

      await expect(
        handler(event, {
          sessionId: 'session_123',
          branchId: 'branch_123',
          type: 'user',
          content: 'Test',
          provider: 'anthropic',
        })
      ).rejects.toThrow('Message must have a model')
    })

    it('should throw if saved message not retrieved', async () => {
      const { ElectronStorageManager } = await import(
        '../storage/ElectronStorageManager'
      )
      const mockInstance = await ElectronStorageManager.create()

      vi.mocked(mockInstance.getMessagesForSession).mockResolvedValue([])

      const handler = ipcHandlers.get('storage:add-message')!
      const event = { sender: mockWebContents }

      await expect(
        handler(event, {
          sessionId: 'session_fail',
          branchId: 'branch_fail',
          type: 'user',
          content: 'Test',
          provider: 'anthropic',
          model: 'claude-3.5',
        })
      ).rejects.toThrow('Failed to retrieve saved message')
    })

    it('should get messages for session', async () => {
      const handler = ipcHandlers.get('storage:get-messages')!
      const event = { sender: mockWebContents }

      const messages = await handler(event, 'session_123')

      expect(Array.isArray(messages)).toBe(true)
    })

    it('should get messages with pagination', async () => {
      const { ElectronStorageManager } = await import(
        '../storage/ElectronStorageManager'
      )
      const mockInstance = await ElectronStorageManager.create()

      vi.mocked(mockInstance.getMessagesForSession).mockResolvedValue([
        { id: 'msg_1' },
        { id: 'msg_2' },
        { id: 'msg_3' },
        { id: 'msg_4' },
      ] as never)

      const handler = ipcHandlers.get('storage:get-messages')!
      const event = { sender: mockWebContents }

      const messages = await handler(event, 'session_123', 2, 1)

      expect(messages.length).toBe(2)
      expect(messages[0].id).toBe('msg_2')
    })
  })

  describe('Action Handlers - Complete Coverage', () => {
    beforeEach(async () => {
      await initStorage()
      registerStorageHandlers()
      registerTrustedSender(mockWebContents)
    })

    it('should create action execution', async () => {
      const handler = ipcHandlers.get('storage:create-action-execution')!
      const event = { sender: mockWebContents }

      const action = await handler(event, {
        branch_id: 'branch_123',
        action_type: 'git_commit',
        status: 'pending',
        started_at: Date.now(),
      })

      expect(action).toBeDefined()
      expect(action.id).toBeDefined()
      expect(action.logs).toEqual([])
    })

    it('should update action status', async () => {
      const handler = ipcHandlers.get('storage:update-action-status')!
      const event = { sender: mockWebContents }

      const result = await handler(event, 'action_123', 'completed', {
        success: true,
        output: 'Success!',
      })

      expect(result.success).toBe(true)
    })

    it('should get action executions for branch', async () => {
      const handler = ipcHandlers.get('storage:get-action-executions')!
      const event = { sender: mockWebContents }

      const actions = await handler(event, 'branch_123')

      expect(Array.isArray(actions)).toBe(true)
      expect(actions).toEqual([])
    })

    it('should append action log', async () => {
      const handler = ipcHandlers.get('storage:append-action-log')!
      const event = { sender: mockWebContents }

      const result = await handler(event, {
        action_id: 'action_123',
        log_level: 'info',
        message: 'Test log',
        timestamp: Date.now(),
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Not implemented')
    })
  })

  /**
   * Context7 Pattern: Workspace Edge Cases - Null/Empty Workspace Scenarios
   *
   * Tests cover uncovered lines 507, 669-670, 681-683, 691-693
   * Testing null workspace returns and task management edge cases
   */
  describe('Workspace Handlers - Edge Cases', () => {
    beforeEach(async () => {
      await initStorage()
      registerStorageHandlers()
      registerTrustedSender(mockWebContents)
    })

    it('should return null when workspace does not exist (line 507)', async () => {
      const { ElectronStorageManager } = await import(
        '../storage/ElectronStorageManager'
      )
      const mockInstance = await ElectronStorageManager.create()

      // Mock getWorkspace to return null (workspace not found)
      vi.mocked(mockInstance.getWorkspace).mockResolvedValue(null)

      const handler = ipcHandlers.get('storage:get-workspace')!
      const event = { sender: mockWebContents }

      const result = await handler(event)

      expect(result).toBeNull()
      expect(mockInstance.getWorkspace).toHaveBeenCalled()
    })

    it('should return error when workspace is null in update-task-state (lines 681-683)', async () => {
      const { ElectronStorageManager } = await import(
        '../storage/ElectronStorageManager'
      )
      const mockInstance = await ElectronStorageManager.create()

      // Mock getWorkspace to return null
      vi.mocked(mockInstance.getWorkspace).mockResolvedValue(null)

      const handler = ipcHandlers.get('storage:update-task-state')!
      const event = { sender: mockWebContents }

      const result = await handler(event, 'task_123', { status: 'in_progress' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('No workspace found')
    })

    it('should return error when workspace has no activeTasks (lines 681-683)', async () => {
      const { ElectronStorageManager } = await import(
        '../storage/ElectronStorageManager'
      )
      const mockInstance = await ElectronStorageManager.create()

      // Mock getWorkspace to return workspace without activeTasks
      vi.mocked(mockInstance.getWorkspace).mockResolvedValue({
        project: {
          id: 'proj_123',
          name: 'Test Project',
          path: '/test/project',
          created_at: new Date(),
          last_opened_at: new Date(),
        },
        activeTasks: undefined,
        currentTaskId: null,
      } as never)

      const handler = ipcHandlers.get('storage:update-task-state')!
      const event = { sender: mockWebContents }

      const result = await handler(event, 'task_123', { status: 'in_progress' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('No workspace found')
    })

    it('should return error when task not found in activeTasks (lines 691-693)', async () => {
      const { ElectronStorageManager } = await import(
        '../storage/ElectronStorageManager'
      )
      const mockInstance = await ElectronStorageManager.create()

      // Mock getWorkspace to return workspace with tasks that don't include target task
      vi.mocked(mockInstance.getWorkspace).mockResolvedValue({
        project: {
          id: 'proj_123',
          name: 'Test Project',
          path: '/test/project',
          created_at: new Date(),
          last_opened_at: new Date(),
        },
        activeTasks: [
          {
            id: 'task_456',
            title: 'Other Task',
            status: 'pending',
            createdAt: Date.now(),
            lastUpdated: Date.now(),
          },
        ],
        currentTaskId: null,
      } as never)

      const handler = ipcHandlers.get('storage:update-task-state')!
      const event = { sender: mockWebContents }

      const result = await handler(event, 'task_123', {
        status: 'completed',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Task not found')
    })

    it('should successfully update task state when task is found', async () => {
      const { ElectronStorageManager } = await import(
        '../storage/ElectronStorageManager'
      )
      const mockInstance = await ElectronStorageManager.create()

      const taskId = 'task_123'
      const workspace = {
        project: {
          id: 'proj_123',
          name: 'Test Project',
          path: '/test/project',
          created_at: new Date(),
          last_opened_at: new Date(),
        },
        activeTasks: [
          {
            id: taskId,
            title: 'Test Task',
            status: 'pending',
            createdAt: Date.now(),
            lastUpdated: Date.now(),
            workState: {},
          },
        ],
        currentTaskId: null,
      }

      vi.mocked(mockInstance.getWorkspace).mockResolvedValue(workspace as never)

      const handler = ipcHandlers.get('storage:update-task-state')!
      const event = { sender: mockWebContents }

      const result = await handler(event, taskId, {
        status: 'in_progress',
        progress: 50,
      })

      expect(result.success).toBe(true)
      expect(mockInstance.setWorkspace).toHaveBeenCalledWith(
        expect.objectContaining({
          activeTasks: expect.arrayContaining([
            expect.objectContaining({
              id: taskId,
              workState: {
                status: 'in_progress',
                progress: 50,
              },
            }),
          ]),
        })
      )
    })
  })

  /**
   * Context7 Pattern: Project Handler Validation - Invalid Project Data
   *
   * Tests cover uncovered line 317 (project validation)
   * Testing project path validation and error handling
   */
  describe('Project Handlers - Validation Edge Cases', () => {
    beforeEach(async () => {
      await initStorage()
      registerStorageHandlers()
      registerTrustedSender(mockWebContents)
    })

    it('should throw error when project has no path (line 317)', async () => {
      const handler = ipcHandlers.get('storage:add-recent-project')!
      const event = { sender: mockWebContents }

      // Test with completely missing path
      await expect(
        handler(event, { name: 'Project without path' } as never)
      ).rejects.toThrow('Project must have a path')
    })

    it('should throw error when project is null (line 316)', async () => {
      const handler = ipcHandlers.get('storage:add-recent-project')!
      const event = { sender: mockWebContents }

      await expect(handler(event, null as never)).rejects.toThrow(
        'Project must have a path'
      )
    })

    it('should throw error when project path is empty string (line 316-317)', async () => {
      const handler = ipcHandlers.get('storage:add-recent-project')!
      const event = { sender: mockWebContents }

      await expect(
        handler(event, { name: 'Test', path: '' } as never)
      ).rejects.toThrow('Project must have a path')
    })

    it('should successfully add project with valid path', async () => {
      const { ElectronStorageManager } = await import(
        '../storage/ElectronStorageManager'
      )
      const mockInstance = await ElectronStorageManager.create()

      // Mock to return null (no existing project)
      vi.mocked(mockInstance.getProjectByPath).mockResolvedValue(null)
      // Mock saveProject to succeed (override any previous mocks that reject)
      vi.mocked(mockInstance.saveProject).mockResolvedValue(undefined)

      const handler = ipcHandlers.get('storage:add-recent-project')!
      const event = { sender: mockWebContents }

      const result = await handler(event, {
        name: 'Valid Project',
        path: '/valid/path',
      } as never)

      expect(result.success).toBe(true)
      expect(result.projectId).toBeDefined()
      expect(mockInstance.saveProject).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/valid/path',
        })
      )
    })
  })

  /**
   * Context7 Pattern: IDE Config Handler - TODO Implementation Coverage
   *
   * Tests cover uncovered lines 442-449 (update-ide-config handler)
   * Testing the TODO stub implementation
   */
  describe('IDE Config Handlers - TODO Implementation', () => {
    beforeEach(async () => {
      await initStorage()
      registerStorageHandlers()
      registerTrustedSender(mockWebContents)
    })

    it('should handle update-ide-config with partial config (line 444-448)', async () => {
      const handler = ipcHandlers.get('storage:update-ide-config')!
      const event = { sender: mockWebContents }

      const config = {
        theme: 'dark',
        fontSize: 14,
        tabSize: 2,
      }

      const result = await handler(event, config)

      expect(result.success).toBe(true)
    })

    it('should handle update-ide-config with empty config', async () => {
      const handler = ipcHandlers.get('storage:update-ide-config')!
      const event = { sender: mockWebContents }

      const result = await handler(event, {})

      expect(result.success).toBe(true)
    })

    it('should handle update-ide-config with complete config', async () => {
      const handler = ipcHandlers.get('storage:update-ide-config')!
      const event = { sender: mockWebContents }

      const config = {
        theme: 'dark',
        fontSize: 14,
        tabSize: 2,
        autoSave: true,
        editorSettings: {
          lineNumbers: true,
          minimap: false,
          wordWrap: true,
        },
        projectHistoryLimit: 20,
      }

      const result = await handler(event, config)

      expect(result.success).toBe(true)
    })
  })

  /**
   * Context7 Pattern: Error Handler Coverage - Testing Catch Blocks
   *
   * Tests cover all uncovered catch blocks and error scenarios
   * Ensuring robust error handling throughout the handlers
   */
  describe('Error Handlers - Complete Coverage', () => {
    beforeEach(async () => {
      await initStorage()
      registerStorageHandlers()
      registerTrustedSender(mockWebContents)
    })

    it('should handle error in storage:get-active-project', async () => {
      const { ElectronStorageManager } = await import(
        '../storage/ElectronStorageManager'
      )
      const mockInstance = await ElectronStorageManager.create()

      // Force getWorkspace to throw error
      vi.mocked(mockInstance.getWorkspace).mockRejectedValue(
        new Error('Database connection failed')
      )

      const handler = ipcHandlers.get('storage:get-active-project')!
      const event = { sender: mockWebContents }

      const result = await handler(event)

      // Error handler should return null
      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalledWith(
        '[StorageHandlers] ❌ Failed to get active project:',
        expect.any(Error)
      )
    })

    it('should handle error in storage:get-workspace', async () => {
      const { ElectronStorageManager } = await import(
        '../storage/ElectronStorageManager'
      )
      const mockInstance = await ElectronStorageManager.create()

      // Force getWorkspace to throw error
      vi.mocked(mockInstance.getWorkspace).mockRejectedValue(
        new Error('Workspace read failed')
      )

      const handler = ipcHandlers.get('storage:get-workspace')!
      const event = { sender: mockWebContents }

      const result = await handler(event)

      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalledWith(
        '[StorageHandlers] ❌ Failed to get workspace:',
        expect.any(Error)
      )
    })
  })
})
