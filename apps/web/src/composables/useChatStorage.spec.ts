/**
 * @fileoverview Comprehensive tests for useChatStorage composable.
 *
 * @description
 * Tests for chat storage management including session creation, message handling,
 * metrics calculation, and storage API integration. Covers all reactive properties,
 * methods, error handling, and edge cases.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useChatStorage } from './useChatStorage'
import type {
  ConversationSession,
  AIMessage,
} from '@hatcherdx/dx-engine-preload/storage'

// Mock window.storageAPI
const mockStorageAPI = {
  getConversationSessions: vi.fn(),
  createConversationSession: vi.fn(),
  updateConversationSession: vi.fn(),
  deleteConversationSession: vi.fn(),
  getMessages: vi.fn(),
  addMessage: vi.fn(),
}

// Mock console methods
const mockConsole = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}

beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks()

  // Setup global mocks
  global.window = {
    storageAPI: mockStorageAPI,
  } as unknown as Window & typeof globalThis

  global.console = {
    ...console,
    log: mockConsole.log,
    error: mockConsole.error,
    warn: mockConsole.warn,
  }
})

describe('useChatStorage', () => {
  describe('Initial State', () => {
    /**
     * Tests initial state of the composable.
     *
     * @returns void
     * Should have proper initial values for all reactive properties
     *
     * @public
     */
    it('should have correct initial state', () => {
      const storage = useChatStorage()

      expect(storage.currentSession.value).toBeNull()
      expect(storage.messages.value).toEqual([])
      expect(storage.isLoading.value).toBe(false)
      expect(storage.error.value).toBeNull()
    })

    /**
     * Tests initial metrics computation.
     *
     * @returns void
     * Should return zero metrics when no session is active
     *
     * @public
     */
    it('should have zero metrics when no session is active', () => {
      const storage = useChatStorage()

      expect(storage.metrics.value).toEqual({
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
        averageLatency: 0,
        messageCount: 0,
        contextUsage: 0,
      })
    })
  })

  describe('loadOrCreateSession', () => {
    /**
     * Tests loading an existing session.
     *
     * @returns Promise<void>
     * Should load existing session and messages
     *
     * @public
     */
    it('should load existing session successfully', async () => {
      const mockSession: ConversationSession = {
        id: 'session-1',
        projectId: '/test/project:main',
        provider: 'anthropic',
        model: 'claude-sonnet-4-5',
        messageCount: 2,
        totalTokens: 100,
        totalCost: 0.001,
        createdAt: new Date(),
        lastMessageAt: new Date(),
      }

      const mockMessages: AIMessage[] = [
        {
          id: 'msg-1',
          sessionId: 'session-1',
          type: 'user',
          content: 'Hello',
          timestamp: new Date(),
          provider: 'anthropic',
          model: 'claude-sonnet-4-5',
          tokenCount: 10,
        },
      ]

      mockStorageAPI.getConversationSessions.mockResolvedValue([mockSession])
      mockStorageAPI.getMessages.mockResolvedValue(mockMessages)

      const storage = useChatStorage()
      await storage.loadOrCreateSession('/test/project', 'main')

      expect(storage.currentSession.value).toEqual(mockSession)
      expect(storage.messages.value).toEqual(mockMessages)
      expect(storage.isLoading.value).toBe(false)
      expect(storage.error.value).toBeNull()
    })

    /**
     * Tests creating a new session when none exists.
     *
     * @returns Promise<void>
     * Should create new session when no existing sessions found
     *
     * @public
     */
    it('should create new session when none exists', async () => {
      const mockSession: ConversationSession = {
        id: 'session-new',
        projectId: '/test/project:feature',
        provider: 'anthropic',
        model: 'claude-sonnet-4-5',
        messageCount: 0,
        totalTokens: 0,
        totalCost: 0,
        createdAt: new Date(),
        lastMessageAt: new Date(),
      }

      mockStorageAPI.getConversationSessions.mockResolvedValue([])
      mockStorageAPI.createConversationSession.mockResolvedValue(mockSession)

      const storage = useChatStorage()
      await storage.loadOrCreateSession('/test/project', 'feature')

      expect(storage.currentSession.value).toEqual(mockSession)
      expect(storage.messages.value).toEqual([])
      expect(mockStorageAPI.createConversationSession).toHaveBeenCalledWith(
        '/test/project:feature',
        'anthropic',
        'claude-sonnet-4-5'
      )
    })

    /**
     * Tests auto-migration of outdated model.
     *
     * @returns Promise<void>
     * Should update session model when base version differs
     *
     * @public
     */
    it('should auto-migrate outdated model base version', async () => {
      const mockSession: ConversationSession = {
        id: 'session-1',
        projectId: '/test/project:main',
        provider: 'anthropic',
        model: 'claude-sonnet-3-5', // Old model
        messageCount: 0,
        totalTokens: 0,
        totalCost: 0,
        createdAt: new Date(),
        lastMessageAt: new Date(),
      }

      mockStorageAPI.getConversationSessions.mockResolvedValue([mockSession])
      mockStorageAPI.getMessages.mockResolvedValue([])

      const storage = useChatStorage()
      await storage.loadOrCreateSession(
        '/test/project',
        'main',
        'claude-sonnet-4-5',
        'anthropic'
      )

      expect(mockStorageAPI.updateConversationSession).toHaveBeenCalledWith(
        'session-1',
        {
          model: 'claude-sonnet-4-5',
          provider: 'anthropic',
        }
      )
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('outdated model base')
      )
    })

    /**
     * Tests updating model build date silently.
     *
     * @returns Promise<void>
     * Should update model build date without warning
     *
     * @public
     */
    it('should update model build date silently', async () => {
      const mockSession: ConversationSession = {
        id: 'session-1',
        projectId: '/test/project:main',
        provider: 'anthropic',
        model: 'claude-sonnet-4-5-20240101', // Old build date
        messageCount: 0,
        totalTokens: 0,
        totalCost: 0,
        createdAt: new Date(),
        lastMessageAt: new Date(),
      }

      mockStorageAPI.getConversationSessions.mockResolvedValue([mockSession])
      mockStorageAPI.getMessages.mockResolvedValue([])

      const storage = useChatStorage()
      await storage.loadOrCreateSession(
        '/test/project',
        'main',
        'claude-sonnet-4-5-20240201', // New build date
        'anthropic'
      )

      expect(mockStorageAPI.updateConversationSession).toHaveBeenCalled()
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Updating model build date')
      )
      expect(mockConsole.warn).not.toHaveBeenCalled()
    })

    /**
     * Tests error handling during session load.
     *
     * @returns Promise<void>
     * Should handle errors and set error state
     *
     * @public
     */
    it('should handle errors during session load', async () => {
      const error = new Error('Database connection failed')
      mockStorageAPI.getConversationSessions.mockRejectedValue(error)

      const storage = useChatStorage()

      await expect(
        storage.loadOrCreateSession('/test/project', 'main')
      ).rejects.toThrow('Database connection failed')

      expect(storage.error.value).toBe('Database connection failed')
      expect(storage.isLoading.value).toBe(false)
    })
  })

  describe('loadSessionsByProject', () => {
    /**
     * Tests loading sessions across all branches.
     *
     * @returns Promise<void>
     * Should load sessions from multiple branches
     *
     * @public
     */
    it('should load sessions across all branches', async () => {
      const mockSessions: ConversationSession[] = [
        {
          id: 'session-main',
          projectId: '/test/project:main',
          provider: 'anthropic',
          model: 'claude-sonnet-4-5',
          messageCount: 1,
          totalTokens: 50,
          totalCost: 0.0005,
          createdAt: new Date(),
          lastMessageAt: new Date(),
        },
        {
          id: 'session-develop',
          projectId: '/test/project:develop',
          provider: 'anthropic',
          model: 'claude-sonnet-4-5',
          messageCount: 2,
          totalTokens: 100,
          totalCost: 0.001,
          createdAt: new Date(),
          lastMessageAt: new Date(),
        },
      ]

      mockStorageAPI.getConversationSessions
        .mockResolvedValueOnce([mockSessions[0]])
        .mockResolvedValueOnce([mockSessions[1]])
        .mockResolvedValue([])

      const storage = useChatStorage()
      const result = await storage.loadSessionsByProject('/test/project')

      expect(result).toHaveLength(2)
      expect(result).toContain(mockSessions[0])
      expect(result).toContain(mockSessions[1])
    })

    /**
     * Tests handling branches without sessions.
     *
     * @returns Promise<void>
     * Should gracefully handle branches with no sessions
     *
     * @public
     */
    it('should handle branches without sessions', async () => {
      mockStorageAPI.getConversationSessions.mockRejectedValue(
        new Error('No sessions found')
      )

      const storage = useChatStorage()
      const result = await storage.loadSessionsByProject('/test/project')

      expect(result).toEqual([])
    })

    /**
     * Tests error handling during project sessions load.
     *
     * @returns Promise<void>
     * Should handle critical errors properly
     *
     * @public
     */
    it('should handle errors during project sessions load', async () => {
      mockStorageAPI.getConversationSessions.mockImplementation(() => {
        throw new Error('Critical database error')
      })

      const storage = useChatStorage()

      // Errors inside the branch loop are caught silently
      // The function returns an empty array instead of throwing
      const result = await storage.loadSessionsByProject('/test/project')

      expect(result).toEqual([])
      expect(storage.error.value).toBeNull()
    })
  })

  describe('addMessage', () => {
    /**
     * Tests adding a message to the current session.
     *
     * @returns Promise<void>
     * Should add message and update session counters
     *
     * @public
     */
    it('should add message to current session', async () => {
      const mockSession: ConversationSession = {
        id: 'session-1',
        projectId: '/test/project:main',
        provider: 'anthropic',
        model: 'claude-sonnet-4-5',
        messageCount: 0,
        totalTokens: 0,
        totalCost: 0,
        createdAt: new Date(),
        lastMessageAt: new Date(),
      }

      const mockMessage: AIMessage = {
        id: 'msg-1',
        sessionId: 'session-1',
        type: 'user',
        content: 'Hello',
        timestamp: new Date(),
        provider: 'anthropic',
        model: 'claude-sonnet-4-5',
        tokenCount: 10,
      }

      mockStorageAPI.getConversationSessions.mockResolvedValue([mockSession])
      mockStorageAPI.getMessages.mockResolvedValue([])
      mockStorageAPI.addMessage.mockResolvedValue(mockMessage)

      const storage = useChatStorage()
      await storage.loadOrCreateSession('/test/project', 'main')

      const result = await storage.addMessage('user', 'Hello', 10)

      expect(result).toEqual(mockMessage)
      expect(storage.messages.value).toContainEqual(mockMessage)
      expect(storage.currentSession.value?.messageCount).toBe(1)
      expect(storage.currentSession.value?.totalTokens).toBe(10)
    })

    /**
     * Tests adding message with metadata.
     *
     * @returns Promise<void>
     * Should include metadata in message
     *
     * @public
     */
    it('should add message with metadata', async () => {
      const mockSession: ConversationSession = {
        id: 'session-1',
        projectId: '/test/project:main',
        provider: 'anthropic',
        model: 'claude-sonnet-4-5',
        messageCount: 0,
        totalTokens: 0,
        totalCost: 0,
        createdAt: new Date(),
        lastMessageAt: new Date(),
      }

      const metadata = {
        inputTokens: 10,
        outputTokens: 50,
        cost: 0.0001,
        latency: 1500,
      }

      const mockMessage: AIMessage = {
        id: 'msg-1',
        sessionId: 'session-1',
        type: 'assistant',
        content: 'Hello back',
        timestamp: new Date(),
        provider: 'anthropic',
        model: 'claude-sonnet-4-5',
        tokenCount: 60,
        metadata,
      }

      mockStorageAPI.getConversationSessions.mockResolvedValue([mockSession])
      mockStorageAPI.getMessages.mockResolvedValue([])
      mockStorageAPI.addMessage.mockResolvedValue(mockMessage)

      const storage = useChatStorage()
      await storage.loadOrCreateSession('/test/project', 'main')

      await storage.addMessage('assistant', 'Hello back', 60, metadata)

      expect(mockStorageAPI.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata,
        })
      )
    })

    /**
     * Tests error when no active session.
     *
     * @returns Promise<void>
     * Should throw error when trying to add message without session
     *
     * @public
     */
    it('should throw error when no active session', async () => {
      const storage = useChatStorage()

      await expect(storage.addMessage('user', 'Hello')).rejects.toThrow(
        'No active session'
      )
    })

    /**
     * Tests error handling during message add.
     *
     * @returns Promise<void>
     * Should handle errors and set error state
     *
     * @public
     */
    it('should handle errors during message add', async () => {
      const mockSession: ConversationSession = {
        id: 'session-1',
        projectId: '/test/project:main',
        provider: 'anthropic',
        model: 'claude-sonnet-4-5',
        messageCount: 0,
        totalTokens: 0,
        totalCost: 0,
        createdAt: new Date(),
        lastMessageAt: new Date(),
      }

      mockStorageAPI.getConversationSessions.mockResolvedValue([mockSession])
      mockStorageAPI.getMessages.mockResolvedValue([])
      mockStorageAPI.addMessage.mockRejectedValue(
        new Error('Failed to save message')
      )

      const storage = useChatStorage()
      await storage.loadOrCreateSession('/test/project', 'main')

      await expect(storage.addMessage('user', 'Hello')).rejects.toThrow(
        'Failed to save message'
      )

      expect(storage.error.value).toBe('Failed to save message')
    })
  })

  describe('clearSession', () => {
    /**
     * Tests clearing the current session.
     *
     * @returns Promise<void>
     * Should clear session and messages
     *
     * @public
     */
    it('should clear current session', async () => {
      const mockSession: ConversationSession = {
        id: 'session-1',
        projectId: '/test/project:main',
        provider: 'anthropic',
        model: 'claude-sonnet-4-5',
        messageCount: 1,
        totalTokens: 10,
        totalCost: 0.0001,
        createdAt: new Date(),
        lastMessageAt: new Date(),
      }

      mockStorageAPI.getConversationSessions.mockResolvedValue([mockSession])
      mockStorageAPI.getMessages.mockResolvedValue([])

      const storage = useChatStorage()
      await storage.loadOrCreateSession('/test/project', 'main')

      expect(storage.currentSession.value).not.toBeNull()

      await storage.clearSession()

      expect(storage.currentSession.value).toBeNull()
      expect(storage.messages.value).toEqual([])
      expect(storage.error.value).toBeNull()
    })
  })

  describe('deleteSession', () => {
    /**
     * Tests deleting the current session.
     *
     * @returns Promise<void>
     * Should delete session and clear state
     *
     * @public
     */
    it('should delete current session', async () => {
      const mockSession: ConversationSession = {
        id: 'session-1',
        projectId: '/test/project:main',
        provider: 'anthropic',
        model: 'claude-sonnet-4-5',
        messageCount: 0,
        totalTokens: 0,
        totalCost: 0,
        createdAt: new Date(),
        lastMessageAt: new Date(),
      }

      mockStorageAPI.getConversationSessions.mockResolvedValue([mockSession])
      mockStorageAPI.getMessages.mockResolvedValue([])
      mockStorageAPI.deleteConversationSession.mockResolvedValue(undefined)

      const storage = useChatStorage()
      await storage.loadOrCreateSession('/test/project', 'main')

      await storage.deleteSession()

      expect(mockStorageAPI.deleteConversationSession).toHaveBeenCalledWith(
        'session-1'
      )
      expect(storage.currentSession.value).toBeNull()
      expect(storage.messages.value).toEqual([])
    })

    /**
     * Tests deleting a specific session by ID.
     *
     * @returns Promise<void>
     * Should delete specific session
     *
     * @public
     */
    it('should delete specific session by ID', async () => {
      mockStorageAPI.deleteConversationSession.mockResolvedValue(undefined)

      const storage = useChatStorage()
      await storage.deleteSession('session-123')

      expect(mockStorageAPI.deleteConversationSession).toHaveBeenCalledWith(
        'session-123'
      )
    })

    /**
     * Tests error when no session to delete.
     *
     * @returns Promise<void>
     * Should throw error when no session available
     *
     * @public
     */
    it('should throw error when no session to delete', async () => {
      const storage = useChatStorage()

      await expect(storage.deleteSession()).rejects.toThrow(
        'No session to delete'
      )
    })

    /**
     * Tests error handling during session delete.
     *
     * @returns Promise<void>
     * Should handle errors and set error state
     *
     * @public
     */
    it('should handle errors during session delete', async () => {
      const mockSession: ConversationSession = {
        id: 'session-1',
        projectId: '/test/project:main',
        provider: 'anthropic',
        model: 'claude-sonnet-4-5',
        messageCount: 0,
        totalTokens: 0,
        totalCost: 0,
        createdAt: new Date(),
        lastMessageAt: new Date(),
      }

      mockStorageAPI.getConversationSessions.mockResolvedValue([mockSession])
      mockStorageAPI.getMessages.mockResolvedValue([])
      mockStorageAPI.deleteConversationSession.mockRejectedValue(
        new Error('Delete failed')
      )

      const storage = useChatStorage()
      await storage.loadOrCreateSession('/test/project', 'main')

      await expect(storage.deleteSession()).rejects.toThrow('Delete failed')

      expect(storage.error.value).toBe('Delete failed')
    })
  })

  describe('exportSession', () => {
    /**
     * Tests exporting session as JSON.
     *
     * @returns Promise<void>
     * Should export session and messages as JSON string
     *
     * @public
     */
    it('should export session as JSON', async () => {
      const mockSession: ConversationSession = {
        id: 'session-1',
        projectId: '/test/project:main',
        provider: 'anthropic',
        model: 'claude-sonnet-4-5',
        messageCount: 1,
        totalTokens: 10,
        totalCost: 0.0001,
        createdAt: new Date('2024-01-01'),
        lastMessageAt: new Date('2024-01-01'),
      }

      const mockMessages: AIMessage[] = [
        {
          id: 'msg-1',
          sessionId: 'session-1',
          type: 'user',
          content: 'Hello',
          timestamp: new Date('2024-01-01'),
          provider: 'anthropic',
          model: 'claude-sonnet-4-5',
        },
      ]

      mockStorageAPI.getConversationSessions.mockResolvedValue([mockSession])
      mockStorageAPI.getMessages.mockResolvedValue(mockMessages)

      const storage = useChatStorage()
      await storage.loadOrCreateSession('/test/project', 'main')

      const json = await storage.exportSession()
      const exported = JSON.parse(json)

      expect(exported.session).toBeDefined()
      expect(exported.messages).toHaveLength(1)
      expect(exported.session.id).toBe('session-1')
    })

    /**
     * Tests exporting empty session.
     *
     * @returns Promise<void>
     * Should return empty export when no session
     *
     * @public
     */
    it('should return empty export when no session', async () => {
      const storage = useChatStorage()

      const json = await storage.exportSession()
      const exported = JSON.parse(json)

      expect(exported.session).toBeNull()
      expect(exported.messages).toEqual([])
    })
  })

  describe('Metrics Computation', () => {
    /**
     * Tests metrics calculation with metadata.
     *
     * @returns Promise<void>
     * Should calculate metrics from message metadata
     *
     * @public
     */
    it('should calculate metrics from message metadata', async () => {
      const mockSession: ConversationSession = {
        id: 'session-1',
        projectId: '/test/project:main',
        provider: 'anthropic',
        model: 'claude-sonnet-4-5',
        messageCount: 2,
        totalTokens: 160,
        totalCost: 0.002,
        createdAt: new Date(),
        lastMessageAt: new Date(),
      }

      const mockMessages: AIMessage[] = [
        {
          id: 'msg-1',
          sessionId: 'session-1',
          type: 'user',
          content: 'Hello',
          timestamp: new Date(),
          provider: 'anthropic',
          model: 'claude-sonnet-4-5',
          tokenCount: 10,
          metadata: {
            inputTokens: 10,
            outputTokens: 0,
            cost: 0.0001,
            latency: 100,
          },
        },
        {
          id: 'msg-2',
          sessionId: 'session-1',
          type: 'assistant',
          content: 'Hi there!',
          timestamp: new Date(),
          provider: 'anthropic',
          model: 'claude-sonnet-4-5',
          tokenCount: 150,
          metadata: {
            inputTokens: 10,
            outputTokens: 140,
            cost: 0.0019,
            latency: 1500,
          },
        },
      ]

      mockStorageAPI.getConversationSessions.mockResolvedValue([mockSession])
      mockStorageAPI.getMessages.mockResolvedValue(mockMessages)

      const storage = useChatStorage()
      await storage.loadOrCreateSession('/test/project', 'main')

      expect(storage.metrics.value.totalInputTokens).toBe(20)
      expect(storage.metrics.value.totalOutputTokens).toBe(140)
      expect(storage.metrics.value.totalCost).toBe(0.002)
      expect(storage.metrics.value.averageLatency).toBe(800) // (100 + 1500) / 2
      expect(storage.metrics.value.messageCount).toBe(2)
    })

    /**
     * Tests metrics fallback to tokenCount.
     *
     * @returns Promise<void>
     * Should use tokenCount when metadata is missing
     *
     * @public
     */
    it('should fallback to tokenCount when metadata missing', async () => {
      const mockSession: ConversationSession = {
        id: 'session-1',
        projectId: '/test/project:main',
        provider: 'anthropic',
        model: 'claude-sonnet-4-5',
        messageCount: 2,
        totalTokens: 100,
        totalCost: 0.001,
        createdAt: new Date(),
        lastMessageAt: new Date(),
      }

      const mockMessages: AIMessage[] = [
        {
          id: 'msg-1',
          sessionId: 'session-1',
          type: 'user',
          content: 'Hello',
          timestamp: new Date(),
          provider: 'anthropic',
          model: 'claude-sonnet-4-5',
          tokenCount: 10,
        },
        {
          id: 'msg-2',
          sessionId: 'session-1',
          type: 'assistant',
          content: 'Hi there!',
          timestamp: new Date(),
          provider: 'anthropic',
          model: 'claude-sonnet-4-5',
          tokenCount: 90,
        },
      ]

      mockStorageAPI.getConversationSessions.mockResolvedValue([mockSession])
      mockStorageAPI.getMessages.mockResolvedValue(mockMessages)

      const storage = useChatStorage()
      await storage.loadOrCreateSession('/test/project', 'main')

      expect(storage.metrics.value.totalInputTokens).toBe(10)
      expect(storage.metrics.value.totalOutputTokens).toBe(90)
      expect(storage.metrics.value.totalCost).toBe(0.001)
    })

    /**
     * Tests context usage calculation.
     *
     * @returns Promise<void>
     * Should calculate context window usage percentage
     *
     * @public
     */
    it('should calculate context usage percentage', async () => {
      const mockSession: ConversationSession = {
        id: 'session-1',
        projectId: '/test/project:main',
        provider: 'anthropic',
        model: 'claude-sonnet-4-5',
        messageCount: 1,
        totalTokens: 100000,
        totalCost: 0.1,
        createdAt: new Date(),
        lastMessageAt: new Date(),
      }

      const mockMessages: AIMessage[] = [
        {
          id: 'msg-1',
          sessionId: 'session-1',
          type: 'assistant',
          content: 'Large response',
          timestamp: new Date(),
          provider: 'anthropic',
          model: 'claude-sonnet-4-5',
          tokenCount: 100000,
          metadata: {
            inputTokens: 50000,
            outputTokens: 50000,
            cost: 0.1,
          },
        },
      ]

      mockStorageAPI.getConversationSessions.mockResolvedValue([mockSession])
      mockStorageAPI.getMessages.mockResolvedValue(mockMessages)

      const storage = useChatStorage()
      await storage.loadOrCreateSession('/test/project', 'main')

      // (50000 + 50000) / 200000 * 100 = 50%
      expect(storage.metrics.value.contextUsage).toBe(50)
    })

    /**
     * Tests max context usage cap.
     *
     * @returns Promise<void>
     * Should cap context usage at 100%
     *
     * @public
     */
    it('should cap context usage at 100%', async () => {
      const mockSession: ConversationSession = {
        id: 'session-1',
        projectId: '/test/project:main',
        provider: 'anthropic',
        model: 'claude-sonnet-4-5',
        messageCount: 1,
        totalTokens: 300000,
        totalCost: 0.3,
        createdAt: new Date(),
        lastMessageAt: new Date(),
      }

      const mockMessages: AIMessage[] = [
        {
          id: 'msg-1',
          sessionId: 'session-1',
          type: 'assistant',
          content: 'Very large response',
          timestamp: new Date(),
          provider: 'anthropic',
          model: 'claude-sonnet-4-5',
          tokenCount: 300000,
          metadata: {
            inputTokens: 150000,
            outputTokens: 150000,
            cost: 0.3,
          },
        },
      ]

      mockStorageAPI.getConversationSessions.mockResolvedValue([mockSession])
      mockStorageAPI.getMessages.mockResolvedValue(mockMessages)

      const storage = useChatStorage()
      await storage.loadOrCreateSession('/test/project', 'main')

      // (150000 + 150000) / 200000 * 100 = 150%, but capped at 100%
      expect(storage.metrics.value.contextUsage).toBe(100)
    })
  })
})
