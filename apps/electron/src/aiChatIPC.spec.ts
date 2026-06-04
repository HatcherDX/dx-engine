/**
 * @fileoverview Comprehensive tests for AI Chat IPC handlers.
 *
 * @description
 * Tests for the AI Chat IPC system that bridges AI provider
 * functionality between renderer and main processes.
 * - Provider initialization and warm-up
 * - Message sending (synchronous)
 * - Message streaming (real-time)
 * - Provider management and capabilities
 * - Conversation clearing
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { IpcMainInvokeEvent } from 'electron'

// Mock crypto randomUUID
const { mockRandomUUID } = vi.hoisted(() => ({
  mockRandomUUID: vi.fn(() => 'mock-uuid-1234'),
}))

vi.mock('node:crypto', () => ({
  randomUUID: mockRandomUUID,
  default: {
    randomUUID: mockRandomUUID,
  },
}))

// Mock AI provider and registry
const {
  mockAIProviderRegistry,
  mockClaudeCodeProvider,
  mockCLIRunner,
  mockProvider,
} = vi.hoisted(() => ({
  mockProvider: {
    name: 'claude-code',
    isAvailable: vi.fn(),
    sendMessage: vi.fn(),
    streamMessage: vi.fn(),
    getCapabilities: vi.fn(),
    clearConversation: vi.fn(),
  },
  mockAIProviderRegistry: {
    register: vi.fn(),
    getProvider: vi.fn(),
    getAvailableProviders: vi.fn(),
    setDefault: vi.fn(),
  },
  mockClaudeCodeProvider: vi.fn(),
  mockCLIRunner: vi.fn(),
}))

vi.mock('@hatcherdx/ai-cli', () => ({
  aiProviderRegistry: mockAIProviderRegistry,
  ClaudeCodeProvider: mockClaudeCodeProvider,
  CLIRunner: mockCLIRunner,
}))

// Mock Electron ipcMain
const { mockIpcMain } = vi.hoisted(() => ({
  mockIpcMain: {
    handle: vi.fn(),
  },
}))

vi.mock('electron', () => ({
  ipcMain: mockIpcMain,
}))

describe('AI Chat IPC Handlers', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()

    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Reset provider mock
    mockProvider.isAvailable.mockResolvedValue(true)
    mockProvider.sendMessage.mockResolvedValue({
      content: 'AI response',
      metadata: {},
    })
    mockProvider.streamMessage.mockReturnValue(
      (async function* () {
        yield { type: 'content', content: 'chunk1' }
        yield { type: 'content', content: 'chunk2' }
      })()
    )
    mockProvider.getCapabilities.mockReturnValue({
      streaming: true,
      contextWindow: 200000,
    })
    mockProvider.clearConversation.mockResolvedValue(undefined)

    mockAIProviderRegistry.getProvider.mockReturnValue(mockProvider)
    mockAIProviderRegistry.getAvailableProviders.mockResolvedValue([
      mockProvider,
    ])
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('setupAIChatIPC', () => {
    it('should initialize providers and register all IPC handlers', async () => {
      const { setupAIChatIPC } = await import('./aiChatIPC')

      await setupAIChatIPC()

      // Verify provider initialization
      expect(mockCLIRunner).toHaveBeenCalled()
      expect(mockClaudeCodeProvider).toHaveBeenCalled()
      expect(mockAIProviderRegistry.register).toHaveBeenCalled()

      // Verify all handlers registered
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'ai-chat:send-message',
        expect.any(Function)
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'ai-chat:stream-message',
        expect.any(Function)
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'ai-chat:get-available-providers',
        expect.any(Function)
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'ai-chat:get-provider-capabilities',
        expect.any(Function)
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'ai-chat:set-default-provider',
        expect.any(Function)
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'ai-chat:clear-conversation',
        expect.any(Function)
      )

      expect(mockIpcMain.handle).toHaveBeenCalledTimes(6)
    })

    it('should log setup progress', async () => {
      const { setupAIChatIPC } = await import('./aiChatIPC')

      await setupAIChatIPC()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('setupAIChatIPC()')
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Providers initialized')
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('All IPC handlers registered successfully')
      )
    })

    it('should handle provider initialization errors', async () => {
      mockCLIRunner.mockImplementationOnce(() => {
        throw new Error('CLI Runner initialization failed')
      })

      const { setupAIChatIPC } = await import('./aiChatIPC')

      expect(() => setupAIChatIPC()).toThrow('CLI Runner initialization failed')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error during provider initialization'),
        expect.any(Error)
      )
    })

    it('should handle background warm-up errors gracefully', async () => {
      // Make warmUpClaude fail
      mockProvider.isAvailable.mockResolvedValue(true)
      mockProvider.sendMessage.mockRejectedValue(
        new Error('Warm-up failed unexpectedly')
      )

      const { setupAIChatIPC } = await import('./aiChatIPC')

      // This should not throw, as warm-up runs in background
      setupAIChatIPC()

      // Wait for background promise to complete
      await new Promise((resolve) => setTimeout(resolve, 150))

      // Should have logged the warm-up error (from warmUpClaude's internal catch)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Claude CLI warm-up failed (non-critical)'),
        'Warm-up failed unexpectedly'
      )
    })

    it('should handle synchronous errors in background warm-up', async () => {
      // We need to make warmUpClaude throw synchronously (before the try block)
      // The first console.log in warmUpClaude (line 55) is before the try block
      let callCount = 0
      consoleLogSpy.mockImplementation((message: string) => {
        callCount++
        // Make the warm-up's console.log throw (it's called after setupAIChatIPC logs)
        if (callCount >= 3 && message.includes('Starting Claude CLI warm-up')) {
          throw new Error('Warm-up logging failed')
        }
      })

      const { setupAIChatIPC } = await import('./aiChatIPC')

      // This should not throw, as warm-up runs in background with .catch()
      setupAIChatIPC()

      // Wait for background promise rejection to be caught
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Should have logged the background error from line 321
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Background warm-up error'),
        expect.any(Error)
      )
    })
  })

  describe('warmUpClaude', () => {
    it('should successfully warm up Claude provider', async () => {
      mockProvider.isAvailable.mockResolvedValue(true)
      mockProvider.sendMessage.mockResolvedValue({
        content: 'Warmup response',
        metadata: {},
      })

      const { setupAIChatIPC } = await import('./aiChatIPC')
      await setupAIChatIPC()

      // Wait for warm-up to complete
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Starting Claude CLI warm-up')
      )
      expect(mockProvider.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Hi',
          sessionId: expect.any(String),
        })
      )
    })

    it('should handle warm-up when provider is not available', async () => {
      mockAIProviderRegistry.getProvider.mockReturnValue(null)

      const { setupAIChatIPC } = await import('./aiChatIPC')
      await setupAIChatIPC()

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No provider available for warm-up')
      )
    })

    it('should handle warm-up when provider is unavailable', async () => {
      mockProvider.isAvailable.mockResolvedValue(false)

      const { setupAIChatIPC } = await import('./aiChatIPC')
      await setupAIChatIPC()

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Provider not available for warm-up')
      )
    })

    it('should handle warm-up errors gracefully', async () => {
      mockProvider.sendMessage.mockRejectedValue(new Error('Warm-up failed'))

      const { setupAIChatIPC } = await import('./aiChatIPC')
      await setupAIChatIPC()

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Claude CLI warm-up failed'),
        expect.any(String)
      )
    })
  })

  describe('ai-chat:send-message handler', () => {
    it('should send message and return response', async () => {
      const mockResponse = {
        content: 'AI response',
        metadata: { tokens: 100 },
      }
      mockProvider.sendMessage.mockResolvedValue(mockResponse)

      const { setupAIChatIPC } = await import('./aiChatIPC')
      await setupAIChatIPC()

      const handler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'ai-chat:send-message'
      )?.[1]

      const result = await handler(null, {
        message: 'Test message',
        sessionId: 'session-123',
      })

      expect(result).toEqual(mockResponse)
      expect(mockProvider.sendMessage).toHaveBeenCalledWith({
        message: 'Test message',
        sessionId: 'session-123',
      })
    })

    it('should throw error when no provider available', async () => {
      mockAIProviderRegistry.getProvider.mockReturnValue(null)

      const { setupAIChatIPC } = await import('./aiChatIPC')
      await setupAIChatIPC()

      const handler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'ai-chat:send-message'
      )?.[1]

      await expect(
        handler(null, { message: 'Test', sessionId: 'session-123' })
      ).rejects.toThrow('No AI provider available')
    })

    it('should throw error when provider is not available', async () => {
      mockProvider.isAvailable.mockResolvedValue(false)

      const { setupAIChatIPC } = await import('./aiChatIPC')
      await setupAIChatIPC()

      const handler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'ai-chat:send-message'
      )?.[1]

      await expect(
        handler(null, { message: 'Test', sessionId: 'session-123' })
      ).rejects.toThrow('is not available')
    })
  })

  describe('ai-chat:stream-message handler', () => {
    it('should stream message chunks and return request ID', async () => {
      const mockEvent = {
        sender: {
          send: vi.fn(),
        },
      } as unknown as IpcMainInvokeEvent

      const { setupAIChatIPC } = await import('./aiChatIPC')
      await setupAIChatIPC()

      const handler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'ai-chat:stream-message'
      )?.[1]

      const requestId = await handler(mockEvent, {
        message: 'Test streaming message',
      })

      expect(requestId).toBe('mock-uuid-1234')

      // Wait for stream to complete
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(mockEvent.sender.send).toHaveBeenCalledWith(
        'ai-chat:stream-chunk',
        requestId,
        expect.objectContaining({ type: 'content' })
      )
      expect(mockEvent.sender.send).toHaveBeenCalledWith(
        'ai-chat:stream-complete',
        requestId
      )
    })

    it('should handle stream with no provider', async () => {
      mockAIProviderRegistry.getProvider.mockReturnValue(null)

      const mockEvent = {
        sender: {
          send: vi.fn(),
        },
      } as unknown as IpcMainInvokeEvent

      const { setupAIChatIPC } = await import('./aiChatIPC')
      await setupAIChatIPC()

      const handler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'ai-chat:stream-message'
      )?.[1]

      const requestId = await handler(mockEvent, {
        message: 'Test',
      })

      expect(mockEvent.sender.send).toHaveBeenCalledWith(
        'ai-chat:stream-error',
        requestId,
        'No AI provider available'
      )
    })

    it('should handle stream when provider is not available', async () => {
      mockProvider.isAvailable.mockResolvedValue(false)

      const mockEvent = {
        sender: {
          send: vi.fn(),
        },
      } as unknown as IpcMainInvokeEvent

      const { setupAIChatIPC } = await import('./aiChatIPC')
      await setupAIChatIPC()

      const handler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'ai-chat:stream-message'
      )?.[1]

      const requestId = await handler(mockEvent, {
        message: 'Test',
      })

      expect(mockEvent.sender.send).toHaveBeenCalledWith(
        'ai-chat:stream-error',
        requestId,
        expect.stringContaining('is not available')
      )
    })

    it('should handle stream errors', async () => {
      mockProvider.streamMessage.mockReturnValue(
        // eslint-disable-next-line require-yield
        (async function* () {
          throw new Error('Stream error')
        })()
      )

      const mockEvent = {
        sender: {
          send: vi.fn(),
        },
      } as unknown as IpcMainInvokeEvent

      const { setupAIChatIPC } = await import('./aiChatIPC')
      await setupAIChatIPC()

      const handler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'ai-chat:stream-message'
      )?.[1]

      const requestId = await handler(mockEvent, {
        message: 'Test',
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(mockEvent.sender.send).toHaveBeenCalledWith(
        'ai-chat:stream-error',
        requestId,
        'Stream error'
      )
    })

    it('should auto-generate session ID if not provided', async () => {
      const mockEvent = {
        sender: {
          send: vi.fn(),
        },
      } as unknown as IpcMainInvokeEvent

      const { setupAIChatIPC } = await import('./aiChatIPC')
      await setupAIChatIPC()

      const handler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'ai-chat:stream-message'
      )?.[1]

      await handler(mockEvent, {
        message: 'Test without session',
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(mockProvider.streamMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test without session',
          sessionId: 'mock-uuid-1234',
        })
      )
    })
  })

  describe('ai-chat:get-available-providers handler', () => {
    it('should return list of available provider names', async () => {
      const { setupAIChatIPC } = await import('./aiChatIPC')
      await setupAIChatIPC()

      const handler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'ai-chat:get-available-providers'
      )?.[1]

      const result = await handler()

      expect(result).toEqual(['claude-code'])
      expect(mockAIProviderRegistry.getAvailableProviders).toHaveBeenCalled()
    })
  })

  describe('ai-chat:get-provider-capabilities handler', () => {
    it('should return provider capabilities', async () => {
      const { setupAIChatIPC } = await import('./aiChatIPC')
      await setupAIChatIPC()

      const handler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'ai-chat:get-provider-capabilities'
      )?.[1]

      const result = await handler(null, 'claude-code')

      expect(result).toEqual({
        streaming: true,
        contextWindow: 200000,
      })
    })

    it('should return null for non-existent provider', async () => {
      mockAIProviderRegistry.getProvider.mockReturnValue(null)

      const { setupAIChatIPC } = await import('./aiChatIPC')
      await setupAIChatIPC()

      const handler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'ai-chat:get-provider-capabilities'
      )?.[1]

      const result = await handler(null, 'non-existent')

      expect(result).toBeNull()
    })
  })

  describe('ai-chat:set-default-provider handler', () => {
    it('should set default provider', async () => {
      const { setupAIChatIPC } = await import('./aiChatIPC')
      await setupAIChatIPC()

      const handler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'ai-chat:set-default-provider'
      )?.[1]

      await handler(null, 'claude-code')

      expect(mockAIProviderRegistry.setDefault).toHaveBeenCalledWith(
        'claude-code'
      )
    })
  })

  describe('ai-chat:clear-conversation handler', () => {
    it('should clear conversation for session', async () => {
      const { setupAIChatIPC } = await import('./aiChatIPC')
      await setupAIChatIPC()

      const handler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'ai-chat:clear-conversation'
      )?.[1]

      await handler(null, 'session-123')

      expect(mockProvider.clearConversation).toHaveBeenCalledWith('session-123')
    })

    it('should throw error when no provider available', async () => {
      mockAIProviderRegistry.getProvider.mockReturnValue(null)

      const { setupAIChatIPC } = await import('./aiChatIPC')
      await setupAIChatIPC()

      const handler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'ai-chat:clear-conversation'
      )?.[1]

      await expect(handler(null, 'session-123')).rejects.toThrow(
        'No AI provider available'
      )
    })
  })
})
