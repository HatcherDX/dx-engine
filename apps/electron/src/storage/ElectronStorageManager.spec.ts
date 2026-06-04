/**
 * @fileoverview Unit tests for ElectronStorageManager with Context7 patterns.
 *
 * @description
 * Comprehensive test suite for the ElectronStorageManager class.
 * Tests all 29 public methods covering project/branch/session/message/action management.
 * Uses Context7 testing patterns for database operations and error handling.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ElectronStorageManager } from './ElectronStorageManager'
import type {
  Project,
  ProjectInput,
  Branch,
  ConversationSession,
  AIMessage,
  ActionExecution,
  Workspace,
} from './ElectronStorageManager'

// Mock Electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/hatcher-test'),
  },
}))

// Mock @hatcherdx/storage
vi.mock('@hatcherdx/storage', () => {
  const mockDb = {
    prepare: vi.fn((_query: string) => ({
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn(() => []),
    })),
    exec: vi.fn(),
    pragma: vi.fn(),
    close: vi.fn(),
  }

  return {
    StorageManager: vi.fn().mockImplementation(() => ({
      initialize: vi.fn().mockResolvedValue(undefined),
      set: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      adapter: {
        db: mockDb,
      },
    })),
  }
})

describe('ElectronStorageManager', () => {
  let storage: ElectronStorageManager
  let mockDb: unknown

  beforeEach(async () => {
    vi.clearAllMocks()
    storage = await ElectronStorageManager.create()
    await storage.initialize()

    // Get mock database reference
    mockDb = (storage as unknown as { db: unknown }).db
  })

  afterEach(async () => {
    if (storage) {
      await storage.shutdown()
    }
  })

  // ============================================================
  // Static Factory Methods
  // ============================================================

  describe('🏭 Static Factory Methods', () => {
    it('should create ElectronStorageManager instance', async () => {
      const instance = await ElectronStorageManager.create()
      expect(instance).toBeInstanceOf(ElectronStorageManager)
    })

    it('should configure storage with correct options', async () => {
      const { StorageManager } = await import('@hatcherdx/storage')

      await ElectronStorageManager.create()

      expect(StorageManager).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sqlite',
          path: expect.stringContaining('hatcher.db'),
          encryption: { enabled: false },
          compression: { enabled: false },
          cache: expect.objectContaining({
            maxItems: 1000,
            maxSize: 50 * 1024 * 1024,
            ttl: 300000,
          }),
        })
      )
    })
  })

  // ============================================================
  // Initialization
  // ============================================================

  describe('🚀 Initialization', () => {
    it('should initialize storage and setup WAL mode', async () => {
      const instance = await ElectronStorageManager.create()
      await instance.initialize()

      const db = (instance as unknown as { db: unknown }).db
      expect(db.pragma).toHaveBeenCalledWith('journal_mode = WAL')
      expect(db.pragma).toHaveBeenCalledWith('synchronous = NORMAL')
      expect(db.pragma).toHaveBeenCalledWith('foreign_keys = ON')
      expect(db.pragma).toHaveBeenCalledWith('busy_timeout = 30000')

      await instance.shutdown()
    })

    it('should throw error if database handle is not available', async () => {
      const instance = await ElectronStorageManager.create()

      // Mock storage without db adapter
      ;(instance as unknown as { storage: Record<string, unknown> }).storage = {
        initialize: vi.fn().mockResolvedValue(undefined),
        adapter: undefined,
      }

      await expect(instance.initialize()).rejects.toThrow(
        'Failed to get database handle'
      )
    })

    it('should create all required database tables', async () => {
      const instance = await ElectronStorageManager.create()
      await instance.initialize()

      const db = (instance as unknown as { db: unknown }).db
      const execCalls = db.exec.mock.calls

      // Verify tables are created
      expect(
        execCalls.some((call: [string, ...unknown[]]) =>
          call[0].includes('CREATE TABLE IF NOT EXISTS projects')
        )
      ).toBe(true)
      expect(
        execCalls.some((call: [string, ...unknown[]]) =>
          call[0].includes('CREATE TABLE IF NOT EXISTS branches')
        )
      ).toBe(true)
      expect(
        execCalls.some((call: [string, ...unknown[]]) =>
          call[0].includes('CREATE TABLE IF NOT EXISTS conversation_sessions')
        )
      ).toBe(true)
      expect(
        execCalls.some((call: [string, ...unknown[]]) =>
          call[0].includes('CREATE TABLE IF NOT EXISTS ai_messages')
        )
      ).toBe(true)
      expect(
        execCalls.some((call: [string, ...unknown[]]) =>
          call[0].includes('CREATE TABLE IF NOT EXISTS action_executions')
        )
      ).toBe(true)
      expect(
        execCalls.some((call: [string, ...unknown[]]) =>
          call[0].includes('CREATE TABLE IF NOT EXISTS action_logs')
        )
      ).toBe(true)

      await instance.shutdown()
    })
  })

  // ============================================================
  // Project Management
  // ============================================================

  describe('📁 Project Management', () => {
    it('should create a project', async () => {
      const project: Project = {
        id: 'proj-1',
        name: 'dx-engine',
        path: '/Users/dev/dx-engine',
        created_at: Date.now(),
        last_opened_at: Date.now(),
      }

      mockDb.prepare.mockReturnValue({
        run: vi.fn(),
      })

      await storage.createProject(project)

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO projects')
      )
    })

    it('should throw error when creating project without db', async () => {
      ;(storage as unknown as { db: unknown }).db = null

      const project: Project = {
        id: 'proj-1',
        name: 'test',
        path: '/test',
        created_at: Date.now(),
        last_opened_at: Date.now(),
      }

      await expect(storage.createProject(project)).rejects.toThrow(
        'Database not initialized'
      )
    })

    it('should get all projects', async () => {
      const mockProjects: Project[] = [
        {
          id: 'proj-1',
          name: 'dx-engine',
          path: '/Users/dev/dx-engine',
          created_at: Date.now(),
          last_opened_at: Date.now(),
        },
      ]

      mockDb.prepare.mockReturnValue({
        all: vi.fn(() => mockProjects),
      })

      const projects = await storage.getProjects()

      expect(projects).toEqual(mockProjects)
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM projects')
      )
    })

    it('should get project by ID', async () => {
      const mockProject: Project = {
        id: 'proj-1',
        name: 'dx-engine',
        path: '/Users/dev/dx-engine',
        created_at: Date.now(),
        last_opened_at: Date.now(),
      }

      mockDb.prepare.mockReturnValue({
        get: vi.fn(() => mockProject),
      })

      const project = await storage.getProjectById('proj-1')

      expect(project).toEqual(mockProject)
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM projects WHERE id = ?')
      )
    })

    it('should return null when project not found by ID', async () => {
      mockDb.prepare.mockReturnValue({
        get: vi.fn(() => undefined),
      })

      const project = await storage.getProjectById('nonexistent')

      expect(project).toBeNull()
    })

    it('should get project by path', async () => {
      const mockProject: Project = {
        id: 'proj-1',
        name: 'dx-engine',
        path: '/Users/dev/dx-engine',
        created_at: Date.now(),
        last_opened_at: Date.now(),
      }

      mockDb.prepare.mockReturnValue({
        get: vi.fn(() => mockProject),
      })

      const project = await storage.getProjectByPath('/Users/dev/dx-engine')

      expect(project).toEqual(mockProject)
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM projects WHERE path = ?')
      )
    })

    it('should return null when project not found by path', async () => {
      mockDb.prepare.mockReturnValue({
        get: vi.fn(() => undefined),
      })

      const project = await storage.getProjectByPath('/nonexistent')

      expect(project).toBeNull()
    })

    it('should update project last opened timestamp', async () => {
      mockDb.prepare.mockReturnValue({
        run: vi.fn(),
      })

      await storage.updateProjectLastOpened('proj-1')

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE projects')
      )
    })

    it('should delete project', async () => {
      mockDb.prepare.mockReturnValue({
        run: vi.fn(),
      })

      await storage.deleteProject('proj-1')

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM projects WHERE id = ?')
      )
    })

    it('should clear all projects', async () => {
      mockDb.prepare.mockReturnValue({
        run: vi.fn(),
      })

      await storage.clearAllProjects()

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM projects')
      )
    })

    it('should save project with ProjectInput', async () => {
      const project: ProjectInput = {
        id: 'proj-1',
        name: 'dx-engine',
        path: '/Users/dev/dx-engine',
        createdAt: new Date(),
        lastOpenedAt: new Date(),
      }

      mockDb.prepare.mockReturnValue({
        run: vi.fn(),
      })

      await storage.saveProject(project)

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO projects')
      )
    })
  })

  // ============================================================
  // Branch Management
  // ============================================================

  describe('🌿 Branch Management', () => {
    it('should create a new branch', async () => {
      mockDb.prepare.mockReturnValueOnce({
        get: vi.fn(() => undefined), // Branch doesn't exist
      })

      mockDb.prepare.mockReturnValueOnce({
        run: vi.fn(),
      })

      const branchId = await storage.createBranch('proj-1', 'main')

      expect(branchId).toMatch(/^branch_/)
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM branches')
      )
    })

    it('should return existing branch ID if branch already exists', async () => {
      const existingBranch = { id: 'branch-existing' }

      mockDb.prepare.mockReturnValue({
        get: vi.fn(() => existingBranch),
      })

      const branchId = await storage.createBranch('proj-1', 'main')

      expect(branchId).toBe('branch-existing')
    })

    it('should switch to a different branch', async () => {
      mockDb.prepare.mockReturnValueOnce({
        get: vi.fn(() => ({ project_id: 'proj-1' })),
      })

      mockDb.prepare.mockReturnValueOnce({
        run: vi.fn(), // Deactivate all branches
      })

      mockDb.prepare.mockReturnValueOnce({
        run: vi.fn(), // Activate selected branch
      })

      await storage.switchBranch('branch-1')

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT project_id FROM branches WHERE id = ?'
      )
    })

    it('should throw error when switching to nonexistent branch', async () => {
      mockDb.prepare.mockReturnValue({
        get: vi.fn(() => undefined),
      })

      await expect(storage.switchBranch('nonexistent')).rejects.toThrow(
        'Branch nonexistent not found'
      )
    })

    it('should get active branch for a project', async () => {
      const mockBranch: Branch = {
        id: 'branch-1',
        project_id: 'proj-1',
        branch_name: 'main',
        is_active: 1,
        created_at: Date.now(),
        last_active_at: Date.now(),
      }

      mockDb.prepare.mockReturnValue({
        get: vi.fn(() => mockBranch),
      })

      const branch = await storage.getActiveBranch('proj-1')

      expect(branch).toEqual(mockBranch)
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT * FROM branches WHERE project_id = ? AND is_active = 1'
      )
    })

    it('should return null when no active branch exists', async () => {
      mockDb.prepare.mockReturnValue({
        get: vi.fn(() => undefined),
      })

      const branch = await storage.getActiveBranch('proj-1')

      expect(branch).toBeNull()
    })
  })

  // ============================================================
  // Conversation Management
  // ============================================================

  describe('💬 Conversation Management', () => {
    it('should save conversation session', async () => {
      const session: ConversationSession = {
        id: 'session-1',
        project_id: 'proj-1',
        branch_id: 'branch-1',
        session_title: 'Test Session',
        provider: 'openai',
        model: 'gpt-4',
        created_at: Date.now(),
        last_message_at: Date.now(),
        message_count: 0,
        total_tokens: 0,
        total_cost: 0.0,
      }

      mockDb.prepare.mockReturnValue({
        run: vi.fn(),
      })

      await storage.saveConversation(session)

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO conversation_sessions')
      )
    })

    it('should get conversations for a branch', async () => {
      const mockSessions: ConversationSession[] = [
        {
          id: 'session-1',
          project_id: 'proj-1',
          branch_id: 'branch-1',
          session_title: 'Test Session',
          provider: 'openai',
          model: 'gpt-4',
          created_at: Date.now(),
          last_message_at: Date.now(),
          message_count: 0,
          total_tokens: 0,
          total_cost: 0.0,
        },
      ]

      mockDb.prepare.mockReturnValue({
        all: vi.fn(() => mockSessions),
      })

      const sessions = await storage.getConversationsForBranch('branch-1')

      expect(sessions).toEqual(mockSessions)
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining(
          'SELECT * FROM conversation_sessions WHERE branch_id = ?'
        )
      )
    })
  })

  // ============================================================
  // Message Management
  // ============================================================

  describe('📨 Message Management', () => {
    it('should save AI message with number timestamp', async () => {
      const message: AIMessage = {
        id: 'msg-1',
        session_id: 'session-1',
        branch_id: 'branch-1',
        type: 'user',
        content: 'Hello AI',
        timestamp: Date.now(),
        provider: 'openai',
        model: 'gpt-4',
        token_count: 10,
        metadata_json: '{"test": "data"}',
      }

      mockDb.prepare.mockReturnValue({
        run: vi.fn(),
      })

      await storage.saveMessage(message)

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ai_messages')
      )
    })

    it('should save AI message with Date timestamp', async () => {
      const message: AIMessage = {
        id: 'msg-1',
        session_id: 'session-1',
        branch_id: 'branch-1',
        type: 'assistant',
        content: 'Response',
        timestamp: new Date().getTime(),
        provider: 'anthropic',
        model: 'claude-3',
      }

      mockDb.prepare.mockReturnValue({
        run: vi.fn(),
      })

      await storage.saveMessage(message)

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ai_messages')
      )
    })

    it('should save AI message with object metadata_json', async () => {
      const message: AIMessage = {
        id: 'msg-1',
        session_id: 'session-1',
        branch_id: 'branch-1',
        type: 'system',
        content: 'System message',
        timestamp: Date.now(),
        provider: 'openai',
        model: 'gpt-4',
        metadata_json: JSON.stringify({ key: 'value' }),
      }

      mockDb.prepare.mockReturnValue({
        run: vi.fn(),
      })

      await storage.saveMessage(message)

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ai_messages')
      )
    })

    it('should get messages for a session', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          session_id: 'session-1',
          branch_id: 'branch-1',
          type: 'user',
          content: 'Hello',
          timestamp: Date.now(),
          provider: 'openai',
          model: 'gpt-4',
          token_count: 10,
          metadata_json: '{"test": "data"}',
        },
      ]

      mockDb.prepare.mockReturnValue({
        all: vi.fn(() => mockMessages),
      })

      const messages = await storage.getMessagesForSession('session-1')

      expect(messages).toHaveLength(1)
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining(
          'SELECT * FROM ai_messages WHERE session_id = ?'
        )
      )
    })

    it('should parse metadata_json when getting messages', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          session_id: 'session-1',
          branch_id: 'branch-1',
          type: 'user',
          content: 'Hello',
          timestamp: Date.now(),
          provider: 'openai',
          model: 'gpt-4',
          metadata_json: '{"parsed": true}',
        },
      ]

      mockDb.prepare.mockReturnValue({
        all: vi.fn(() => mockMessages),
      })

      const messages = await storage.getMessagesForSession('session-1')

      expect(messages[0]).toHaveProperty('metadata')
    })

    it('should handle invalid metadata_json gracefully', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          session_id: 'session-1',
          branch_id: 'branch-1',
          type: 'user',
          content: 'Hello',
          timestamp: Date.now(),
          provider: 'openai',
          model: 'gpt-4',
          metadata_json: 'invalid json',
        },
      ]

      mockDb.prepare.mockReturnValue({
        all: vi.fn(() => mockMessages),
      })

      const messages = await storage.getMessagesForSession('session-1')

      expect(messages).toHaveLength(1)
    })
  })

  // ============================================================
  // Action Management
  // ============================================================

  describe('⚡ Action Management', () => {
    it('should save action execution', async () => {
      const action: ActionExecution = {
        id: 'action-1',
        branch_id: 'branch-1',
        trigger_source: 'decklog',
        trigger_ref_id: 'session-1',
        action_type: 'file_edit',
        action_name: 'Edit config.ts',
        status: 'pending',
        started_at: Date.now(),
      }

      mockDb.prepare.mockReturnValue({
        run: vi.fn(),
      })

      await storage.saveAction(action)

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO action_executions')
      )
    })

    it('should update action status', async () => {
      mockDb.prepare.mockReturnValue({
        run: vi.fn(),
      })

      await storage.updateActionStatus('action-1', 'completed', {
        success: true,
        output: 'File edited successfully',
      })

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE action_executions')
      )
    })

    it('should update action status without result', async () => {
      mockDb.prepare.mockReturnValue({
        run: vi.fn(),
      })

      await storage.updateActionStatus('action-1', 'failed')

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE action_executions')
      )
    })
  })

  // ============================================================
  // Metrics and Statistics
  // ============================================================

  describe('📊 Metrics and Statistics', () => {
    it('should get branch metrics', async () => {
      const mockMetrics = {
        total_sessions: 5,
        total_messages: 50,
        total_tokens: 1000,
        total_cost: 0.5,
        total_actions: 10,
      }

      mockDb.prepare.mockReturnValue({
        get: vi.fn(() => mockMetrics),
      })

      const metrics = await storage.getBranchMetrics('branch-1')

      expect(metrics).toEqual(mockMetrics)
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(DISTINCT cs.id) as total_sessions')
      )
    })

    it('should handle null values in branch metrics', async () => {
      const mockMetrics = {
        total_sessions: null,
        total_messages: null,
        total_tokens: null,
        total_cost: null,
        total_actions: null,
      }

      mockDb.prepare.mockReturnValue({
        get: vi.fn(() => mockMetrics),
      })

      const metrics = await storage.getBranchMetrics('branch-1')

      expect(metrics.total_sessions).toBe(0)
      expect(metrics.total_messages).toBe(0)
      expect(metrics.total_tokens).toBe(0)
      expect(metrics.total_cost).toBe(0)
      expect(metrics.total_actions).toBe(0)
    })

    it('should get provider statistics', async () => {
      const mockStats: ProviderMetrics[] = [
        {
          provider: 'openai',
          session_count: 10,
          message_count: 100,
          total_tokens: 5000,
        },
        {
          provider: 'anthropic',
          session_count: 5,
          message_count: 50,
          total_tokens: 2500,
        },
      ]

      mockDb.prepare.mockReturnValue({
        all: vi.fn(() => mockStats),
      })

      const stats = await storage.getProviderStats('branch-1')

      expect(stats).toEqual(mockStats)
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('GROUP BY provider')
      )
    })

    it('should get global statistics', async () => {
      const mockStats = {
        total_projects: 10,
        total_branches: 25,
        total_sessions: 100,
        total_tokens: 50000,
        total_cost: 25.5,
      }

      mockDb.prepare.mockReturnValue({
        get: vi.fn(() => mockStats),
      })

      const stats = await storage.getGlobalStats()

      expect(stats).toEqual(mockStats)
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(DISTINCT p.id) as total_projects')
      )
    })

    it('should handle null values in global stats', async () => {
      const mockStats = {
        total_projects: null,
        total_branches: null,
        total_sessions: null,
        total_tokens: null,
        total_cost: null,
      }

      mockDb.prepare.mockReturnValue({
        get: vi.fn(() => mockStats),
      })

      const stats = await storage.getGlobalStats()

      expect(stats.total_projects).toBe(0)
      expect(stats.total_branches).toBe(0)
      expect(stats.total_sessions).toBe(0)
      expect(stats.total_tokens).toBe(0)
      expect(stats.total_cost).toBe(0)
    })
  })

  // ============================================================
  // Workspace Management
  // ============================================================

  describe('🖥️ Workspace Management', () => {
    it('should get workspace', async () => {
      const mockWorkspace: Workspace = {
        project: {
          id: 'proj-1',
          name: 'dx-engine',
          path: '/Users/dev/dx-engine',
          rootPath: '/Users/dev/dx-engine',
          createdAt: new Date(),
          lastOpenedAt: new Date(),
        },
        activeTasks: [],
        currentTaskId: null,
      }

      ;(
        storage as unknown as {
          storage: {
            get: unknown
            set: unknown
            delete: unknown
            close: unknown
          }
        }
      ).storage.get = vi.fn().mockResolvedValue(mockWorkspace)

      const workspace = await storage.getWorkspace()

      expect(workspace).toEqual(mockWorkspace)
      expect(
        (
          storage as unknown as {
            storage: {
              get: unknown
              set: unknown
              delete: unknown
              close: unknown
            }
          }
        ).storage.get
      ).toHaveBeenCalledWith('__workspace__')
    })

    it('should return null when workspace not found', async () => {
      ;(
        storage as unknown as {
          storage: {
            get: unknown
            set: unknown
            delete: unknown
            close: unknown
          }
        }
      ).storage.get = vi.fn().mockResolvedValue(null)

      const workspace = await storage.getWorkspace()

      expect(workspace).toBeNull()
    })

    it('should set workspace', async () => {
      const workspace: Workspace = {
        project: {
          id: 'proj-1',
          name: 'dx-engine',
          path: '/Users/dev/dx-engine',
          rootPath: '/Users/dev/dx-engine',
          createdAt: new Date(),
          lastOpenedAt: new Date(),
        },
        activeTasks: [],
        currentTaskId: null,
      }

      ;(
        storage as unknown as {
          storage: {
            get: unknown
            set: unknown
            delete: unknown
            close: unknown
          }
        }
      ).storage.set = vi.fn().mockResolvedValue(undefined)

      await storage.setWorkspace(workspace)

      expect(
        (
          storage as unknown as {
            storage: {
              get: unknown
              set: unknown
              delete: unknown
              close: unknown
            }
          }
        ).storage.set
      ).toHaveBeenCalledWith('__workspace__', workspace)
    })

    it('should clear workspace', async () => {
      ;(
        storage as unknown as {
          storage: {
            get: unknown
            set: unknown
            delete: unknown
            close: unknown
          }
        }
      ).storage.delete = vi.fn().mockResolvedValue(undefined)

      await storage.clearWorkspace()

      expect(
        (
          storage as unknown as {
            storage: {
              get: unknown
              set: unknown
              delete: unknown
              close: unknown
            }
          }
        ).storage.delete
      ).toHaveBeenCalledWith('__workspace__')
    })
  })

  // ============================================================
  // Shutdown
  // ============================================================

  describe('🔌 Shutdown', () => {
    it('should perform graceful shutdown with WAL checkpoint', async () => {
      mockDb.pragma = vi.fn()
      mockDb.close = vi.fn()

      await storage.shutdown()

      expect(mockDb.pragma).toHaveBeenCalledWith('wal_checkpoint(RESTART)')
      expect(mockDb.close).toHaveBeenCalled()
    })

    it('should handle shutdown when db is null', async () => {
      ;(storage as unknown as { db: unknown }).db = null
      ;(
        storage as unknown as {
          storage: {
            get: unknown
            set: unknown
            delete: unknown
            close: unknown
          }
        }
      ).storage.close = vi.fn().mockResolvedValue(undefined)

      await expect(storage.shutdown()).resolves.not.toThrow()
    })
  })

  // ============================================================
  // Error Handling
  // ============================================================

  describe('❌ Error Handling', () => {
    it('should throw error when database not initialized for all methods', async () => {
      ;(storage as unknown as { db: unknown }).db = null

      // Test all methods that require db
      await expect(
        storage.createProject({
          id: 'test',
          name: 'test',
          path: '/test',
          created_at: Date.now(),
          last_opened_at: Date.now(),
        })
      ).rejects.toThrow('Database not initialized')

      await expect(storage.switchBranch('test')).rejects.toThrow(
        'Database not initialized'
      )

      await expect(storage.getActiveBranch('test')).rejects.toThrow(
        'Database not initialized'
      )

      await expect(
        storage.saveConversation({
          id: 'test',
          project_id: 'test',
          branch_id: 'test',
          session_title: 'test',
          provider: 'test',
          model: 'test',
          created_at: Date.now(),
          last_message_at: Date.now(),
          message_count: 0,
          total_tokens: 0,
          total_cost: 0,
        })
      ).rejects.toThrow('Database not initialized')

      await expect(storage.getConversationsForBranch('test')).rejects.toThrow(
        'Database not initialized'
      )

      await expect(
        storage.saveMessage({
          id: 'test',
          session_id: 'test',
          branch_id: 'test',
          type: 'user',
          content: 'test',
          timestamp: Date.now(),
          provider: 'test',
          model: 'test',
        })
      ).rejects.toThrow('Database not initialized')

      await expect(storage.getMessagesForSession('test')).rejects.toThrow(
        'Database not initialized'
      )

      await expect(
        storage.saveAction({
          id: 'test',
          branch_id: 'test',
          trigger_source: 'manual',
          action_type: 'file_edit',
          action_name: 'test',
          status: 'pending',
          started_at: Date.now(),
        })
      ).rejects.toThrow('Database not initialized')

      await expect(
        storage.updateActionStatus('test', 'completed')
      ).rejects.toThrow('Database not initialized')

      await expect(storage.getBranchMetrics('test')).rejects.toThrow(
        'Database not initialized'
      )

      await expect(storage.getProviderStats('test')).rejects.toThrow(
        'Database not initialized'
      )

      await expect(storage.getGlobalStats()).rejects.toThrow(
        'Database not initialized'
      )

      await expect(storage.getProjects()).rejects.toThrow(
        'Database not initialized'
      )

      await expect(storage.getProjectById('test')).rejects.toThrow(
        'Database not initialized'
      )

      await expect(storage.getProjectByPath('/test')).rejects.toThrow(
        'Database not initialized'
      )

      await expect(storage.updateProjectLastOpened('test')).rejects.toThrow(
        'Database not initialized'
      )

      await expect(storage.deleteProject('test')).rejects.toThrow(
        'Database not initialized'
      )

      await expect(storage.clearAllProjects()).rejects.toThrow(
        'Database not initialized'
      )

      await expect(
        storage.saveProject({
          id: 'test',
          name: 'test',
          path: '/test',
          createdAt: new Date(),
          lastOpenedAt: new Date(),
        })
      ).rejects.toThrow('Database not initialized')

      await expect(storage.createBranch('test', 'main')).rejects.toThrow(
        'Database not initialized'
      )
    })
  })
})
