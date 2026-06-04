/**
 * @fileoverview Unit tests for useAIChat composable.
 *
 * @description
 * Tests the AI chat functionality including provider management,
 * message sending, streaming, and Electron IPC integration.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import type { AIResponse, AIChunk, ProviderCapabilities } from './useAIChat'

describe('useAIChat', () => {
  let mockElectronAPI: {
    aiChat: {
      getAvailableProviders: ReturnType<typeof vi.fn>
      getProviderCapabilities: ReturnType<typeof vi.fn>
      setDefaultProvider: ReturnType<typeof vi.fn>
      sendMessage: ReturnType<typeof vi.fn>
      streamMessage: ReturnType<typeof vi.fn>
      clearConversation: ReturnType<typeof vi.fn>
      onStreamChunk: ReturnType<typeof vi.fn>
      onStreamComplete: ReturnType<typeof vi.fn>
      onStreamError: ReturnType<typeof vi.fn>
      removeStreamListeners: ReturnType<typeof vi.fn>
    }
  }
  let consoleErrorSpy: ReturnType<typeof vi.fn>
  let _consoleLogSpy: ReturnType<typeof vi.fn>

  const mockProviders = ['claude', 'gpt-4', 'gemini']
  const mockCapabilities: ProviderCapabilities = {
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
    supportsFiles: true,
    maxContextTokens: 200000,
  }
  const mockAIResponse: AIResponse = {
    content: 'Hello! How can I help you?',
    sessionId: 'session-123',
    usage: {
      inputTokens: 10,
      outputTokens: 20,
      cacheReadTokens: 5,
      cacheCreationTokens: 0,
      costUSD: 0.001,
    },
    model: 'claude-sonnet-4',
    durationMs: 1500,
    durationApiMs: 1200,
  }

  beforeEach(async () => {
    // Mock console methods
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    _consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    // Mock Electron API
    mockElectronAPI = {
      aiChat: {
        getAvailableProviders: vi.fn().mockResolvedValue(mockProviders),
        getProviderCapabilities: vi.fn().mockResolvedValue(mockCapabilities),
        setDefaultProvider: vi.fn().mockResolvedValue(undefined),
        sendMessage: vi.fn().mockResolvedValue(mockAIResponse),
        streamMessage: vi.fn().mockResolvedValue('request-id-123'),
        clearConversation: vi.fn().mockResolvedValue(undefined),
        onStreamChunk: vi.fn(),
        onStreamComplete: vi.fn(),
        onStreamError: vi.fn(),
        removeStreamListeners: vi.fn(),
      },
    }

    // Setup window.electronAPI
    Object.defineProperty(global.window, 'electronAPI', {
      value: mockElectronAPI,
      writable: true,
      configurable: true,
    })

    // Reset modules to get fresh state
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    delete (global.window as { electronAPI?: unknown }).electronAPI
  })

  describe('initialization', () => {
    it('should initialize and auto-load providers', async () => {
      const { useAIChat } = await import('./useAIChat')
      const {
        availableProviders,
        currentProvider,
        capabilities,
        isLoading,
        error,
      } = useAIChat()

      // Wait for auto-load
      await new Promise((resolve) => setTimeout(resolve, 50))
      await nextTick()

      // Auto-load should have populated providers
      expect(availableProviders.value).toEqual(mockProviders)
      expect(currentProvider.value).toBe('claude')
      expect(capabilities.value).toEqual(mockCapabilities)
      expect(isLoading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('should detect Electron environment', async () => {
      const { useAIChat } = await import('./useAIChat')
      const { isElectron } = useAIChat()

      expect(isElectron.value).toBe(true)
    })

    it('should detect non-Electron environment', async () => {
      delete (global.window as { electronAPI?: unknown }).electronAPI

      const { useAIChat } = await import('./useAIChat')
      const { isElectron } = useAIChat()

      expect(isElectron.value).toBe(false)
    })

    it('should auto-load providers in Electron environment', async () => {
      const { useAIChat } = await import('./useAIChat')
      const { availableProviders, currentProvider } = useAIChat()

      // Wait for auto-load to complete
      await new Promise((resolve) => setTimeout(resolve, 50))
      await nextTick()

      expect(mockElectronAPI.aiChat.getAvailableProviders).toHaveBeenCalled()
      expect(availableProviders.value).toEqual(mockProviders)
      expect(currentProvider.value).toBe('claude')
    })

    it('should not auto-load providers in non-Electron environment', async () => {
      delete (global.window as { electronAPI?: unknown }).electronAPI

      const { useAIChat } = await import('./useAIChat')
      useAIChat()

      await new Promise((resolve) => setTimeout(resolve, 50))
      await nextTick()

      // Should not call since electronAPI is not available
      expect(
        mockElectronAPI.aiChat.getAvailableProviders
      ).not.toHaveBeenCalled()
    })
  })

  describe('loadAvailableProviders', () => {
    it('should load providers successfully', async () => {
      const { useAIChat } = await import('./useAIChat')
      const { loadAvailableProviders, availableProviders, isLoading, error } =
        useAIChat()

      // Clear auto-load calls
      mockElectronAPI.aiChat.getAvailableProviders.mockClear()

      await loadAvailableProviders()

      expect(isLoading.value).toBe(false)
      expect(error.value).toBeNull()
      expect(mockElectronAPI.aiChat.getAvailableProviders).toHaveBeenCalled()
      expect(availableProviders.value).toEqual(mockProviders)
    })

    it('should set first provider as current when none selected', async () => {
      const { useAIChat } = await import('./useAIChat')
      const { loadAvailableProviders, currentProvider } = useAIChat()

      // Clear auto-load
      mockElectronAPI.aiChat.getAvailableProviders.mockClear()
      mockElectronAPI.aiChat.getProviderCapabilities.mockClear()

      await loadAvailableProviders()

      expect(currentProvider.value).toBe('claude')
      expect(
        mockElectronAPI.aiChat.getProviderCapabilities
      ).toHaveBeenCalledWith('claude')
    })

    it('should not change current provider if already set', async () => {
      const { useAIChat } = await import('./useAIChat')
      const { loadAvailableProviders, currentProvider } = useAIChat()

      // Wait for auto-load
      await new Promise((resolve) => setTimeout(resolve, 50))
      await nextTick()

      // Current provider should be set by auto-load
      expect(currentProvider.value).toBe('claude')

      // Clear mocks
      mockElectronAPI.aiChat.getProviderCapabilities.mockClear()

      // Load again
      await loadAvailableProviders()

      // Should not call getProviderCapabilities again
      expect(
        mockElectronAPI.aiChat.getProviderCapabilities
      ).not.toHaveBeenCalled()
    })

    it('should handle error when not in Electron environment', async () => {
      delete (global.window as { electronAPI?: unknown }).electronAPI

      const { useAIChat } = await import('./useAIChat')
      const { loadAvailableProviders, error } = useAIChat()

      await loadAvailableProviders()

      expect(error.value).toBe(
        'AI Chat is only available in Electron environment'
      )
    })

    it('should handle provider loading error', async () => {
      const testError = new Error('Network error')
      mockElectronAPI.aiChat.getAvailableProviders.mockRejectedValue(testError)

      const { useAIChat } = await import('./useAIChat')
      const { loadAvailableProviders, error, isLoading } = useAIChat()

      await loadAvailableProviders()

      expect(isLoading.value).toBe(false)
      expect(error.value).toBe('Network error')
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[useAIChat] Error loading providers:',
        testError
      )
    })

    it('should handle non-Error thrown object', async () => {
      mockElectronAPI.aiChat.getAvailableProviders.mockRejectedValue(
        'String error'
      )

      const { useAIChat } = await import('./useAIChat')
      const { loadAvailableProviders, error } = useAIChat()

      await loadAvailableProviders()

      expect(error.value).toBe('Failed to load providers')
    })
  })

  describe('loadProviderCapabilities', () => {
    it('should load capabilities successfully', async () => {
      const { useAIChat } = await import('./useAIChat')
      const { loadProviderCapabilities, capabilities } = useAIChat()

      // Clear auto-load calls
      mockElectronAPI.aiChat.getProviderCapabilities.mockClear()

      await loadProviderCapabilities('claude')

      expect(
        mockElectronAPI.aiChat.getProviderCapabilities
      ).toHaveBeenCalledWith('claude')
      expect(capabilities.value).toEqual(mockCapabilities)
    })

    it('should not load capabilities in non-Electron environment', async () => {
      delete (global.window as { electronAPI?: unknown }).electronAPI

      const { useAIChat } = await import('./useAIChat')
      const { loadProviderCapabilities } = useAIChat()

      await loadProviderCapabilities('claude')

      expect(
        mockElectronAPI.aiChat.getProviderCapabilities
      ).not.toHaveBeenCalled()
    })

    it('should handle capabilities loading error', async () => {
      const testError = new Error('Provider not found')
      mockElectronAPI.aiChat.getProviderCapabilities.mockRejectedValue(
        testError
      )

      const { useAIChat } = await import('./useAIChat')
      const { loadProviderCapabilities } = useAIChat()

      await loadProviderCapabilities('invalid-provider')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[useAIChat] Error loading capabilities:',
        testError
      )
    })
  })

  describe('setDefaultProvider', () => {
    it('should set default provider successfully', async () => {
      const { useAIChat } = await import('./useAIChat')
      const { setDefaultProvider, currentProvider } = useAIChat()

      // Clear auto-load calls
      mockElectronAPI.aiChat.setDefaultProvider.mockClear()
      mockElectronAPI.aiChat.getProviderCapabilities.mockClear()

      await setDefaultProvider('gpt-4')

      expect(mockElectronAPI.aiChat.setDefaultProvider).toHaveBeenCalledWith(
        'gpt-4'
      )
      expect(currentProvider.value).toBe('gpt-4')
      expect(
        mockElectronAPI.aiChat.getProviderCapabilities
      ).toHaveBeenCalledWith('gpt-4')
    })

    it('should throw error when not in Electron environment', async () => {
      delete (global.window as { electronAPI?: unknown }).electronAPI

      const { useAIChat } = await import('./useAIChat')
      const { setDefaultProvider } = useAIChat()

      await expect(setDefaultProvider('gpt-4')).rejects.toThrow(
        'AI Chat is only available in Electron environment'
      )
    })

    it('should handle setDefaultProvider error and set error state', async () => {
      const testError = new Error('Permission denied')
      mockElectronAPI.aiChat.setDefaultProvider.mockRejectedValue(testError)

      const { useAIChat } = await import('./useAIChat')
      const { setDefaultProvider, error } = useAIChat()

      await expect(setDefaultProvider('gpt-4')).rejects.toThrow(
        'Permission denied'
      )
      expect(error.value).toBe('Permission denied')
    })

    it('should handle non-Error thrown object in setDefaultProvider', async () => {
      mockElectronAPI.aiChat.setDefaultProvider.mockRejectedValue(
        'String error'
      )

      const { useAIChat } = await import('./useAIChat')
      const { setDefaultProvider, error } = useAIChat()

      await expect(setDefaultProvider('gpt-4')).rejects.toThrow()
      expect(error.value).toBe('Failed to set default provider')
    })
  })

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      const { useAIChat } = await import('./useAIChat')
      const { sendMessage } = useAIChat()

      const result = await sendMessage({ message: 'Hello!' })

      expect(mockElectronAPI.aiChat.sendMessage).toHaveBeenCalledWith({
        message: 'Hello!',
        providerName: undefined,
      })
      expect(result).toEqual(mockAIResponse)
    })

    it('should send message with custom provider', async () => {
      const { useAIChat } = await import('./useAIChat')
      const { sendMessage } = useAIChat()

      await sendMessage({ message: 'Hello!', providerName: 'gpt-4' })

      expect(mockElectronAPI.aiChat.sendMessage).toHaveBeenCalledWith({
        message: 'Hello!',
        providerName: 'gpt-4',
      })
    })

    it('should use current provider when not specified', async () => {
      const { useAIChat } = await import('./useAIChat')
      const { sendMessage } = useAIChat()

      // Wait for auto-load to set current provider
      await new Promise((resolve) => setTimeout(resolve, 50))
      await nextTick()

      await sendMessage({ message: 'Hello!' })

      expect(mockElectronAPI.aiChat.sendMessage).toHaveBeenCalledWith({
        message: 'Hello!',
        providerName: 'claude',
      })
    })

    it('should handle all message parameters', async () => {
      const { useAIChat } = await import('./useAIChat')
      const { sendMessage } = useAIChat()

      await sendMessage({
        message: 'Hello!',
        sessionId: 'session-123',
        continueSession: true,
        systemPrompt: 'You are helpful',
        temperature: 0.7,
        maxTokens: 1000,
        providerName: 'claude',
        cwd: '/home/user/project',
      })

      expect(mockElectronAPI.aiChat.sendMessage).toHaveBeenCalledWith({
        message: 'Hello!',
        sessionId: 'session-123',
        continueSession: true,
        systemPrompt: 'You are helpful',
        temperature: 0.7,
        maxTokens: 1000,
        providerName: 'claude',
        cwd: '/home/user/project',
      })
    })

    it('should throw error when not in Electron environment', async () => {
      delete (global.window as { electronAPI?: unknown }).electronAPI

      const { useAIChat } = await import('./useAIChat')
      const { sendMessage } = useAIChat()

      await expect(sendMessage({ message: 'Hello!' })).rejects.toThrow(
        'AI Chat is only available in Electron environment'
      )
    })

    it('should handle sendMessage error', async () => {
      const testError = new Error('API error')
      mockElectronAPI.aiChat.sendMessage.mockRejectedValue(testError)

      const { useAIChat } = await import('./useAIChat')
      const { sendMessage, error, isLoading } = useAIChat()

      await expect(sendMessage({ message: 'Hello!' })).rejects.toThrow(
        'API error'
      )
      expect(error.value).toBe('API error')
      expect(isLoading.value).toBe(false)
    })

    it('should handle non-Error thrown object in sendMessage', async () => {
      mockElectronAPI.aiChat.sendMessage.mockRejectedValue('String error')

      const { useAIChat } = await import('./useAIChat')
      const { sendMessage, error } = useAIChat()

      await expect(sendMessage({ message: 'Hello!' })).rejects.toThrow()
      expect(error.value).toBe('Failed to send message')
    })

    it('should set isLoading to false after sendMessage completes', async () => {
      const { useAIChat } = await import('./useAIChat')
      const { sendMessage, isLoading } = useAIChat()

      // Wait for auto-load to complete
      await new Promise((resolve) => setTimeout(resolve, 50))
      await nextTick()

      expect(isLoading.value).toBe(false)

      const sendPromise = sendMessage({ message: 'Hello!' })
      await sendPromise

      expect(isLoading.value).toBe(false)
    })
  })

  describe('streamMessage', () => {
    it('should stream message chunks successfully', async () => {
      const { useAIChat } = await import('./useAIChat')
      const { streamMessage } = useAIChat()

      const mockChunks: AIChunk[] = [
        { type: 'system', content: 'Starting...' },
        { type: 'assistant', content: 'Hello' },
        { type: 'assistant', content: ' there!' },
        { type: 'result' },
      ]

      // Setup mock to trigger chunk events
      mockElectronAPI.aiChat.streamMessage.mockImplementation(async () => {
        const requestId = 'request-id-123'

        // Simulate chunk events after a short delay
        setTimeout(() => {
          const onChunkCallback =
            mockElectronAPI.aiChat.onStreamChunk.mock.calls[0][0]
          mockChunks.forEach((chunk) => {
            onChunkCallback(requestId, chunk)
          })
        }, 10)

        return requestId
      })

      const chunks: AIChunk[] = []
      for await (const chunk of streamMessage({ message: 'Hello!' })) {
        chunks.push(chunk)
      }

      expect(chunks).toHaveLength(4)
      expect(chunks[0].type).toBe('system')
      expect(chunks[1].content).toBe('Hello')
      expect(chunks[2].content).toBe(' there!')
      expect(chunks[3].type).toBe('result')
    })

    it('should throw error when not in Electron environment', async () => {
      delete (global.window as { electronAPI?: unknown }).electronAPI

      const { useAIChat } = await import('./useAIChat')
      const { streamMessage } = useAIChat()

      const generator = streamMessage({ message: 'Hello!' })

      await expect(generator.next()).rejects.toThrow(
        'AI Chat is only available in Electron environment'
      )
    })

    it('should handle stream error event', async () => {
      const { useAIChat } = await import('./useAIChat')
      const { streamMessage } = useAIChat()

      const testError = 'Stream error occurred'

      mockElectronAPI.aiChat.streamMessage.mockImplementation(async () => {
        const requestId = 'request-id-123'

        setTimeout(() => {
          const onErrorCallback =
            mockElectronAPI.aiChat.onStreamError.mock.calls[0][0]
          onErrorCallback(requestId, testError)
        }, 10)

        return requestId
      })

      const generator = streamMessage({ message: 'Hello!' })

      await expect(
        (async () => {
          for await (const _chunk of generator) {
            // Consume chunks
          }
        })()
      ).rejects.toThrow(testError)
    })

    it('should handle onComplete event', async () => {
      const { useAIChat } = await import('./useAIChat')
      const { streamMessage } = useAIChat()

      mockElectronAPI.aiChat.streamMessage.mockImplementation(async () => {
        const requestId = 'request-id-123'

        setTimeout(() => {
          const onCompleteCallback =
            mockElectronAPI.aiChat.onStreamComplete.mock.calls[0][0]
          onCompleteCallback(requestId)
        }, 10)

        return requestId
      })

      const chunks: AIChunk[] = []
      for await (const chunk of streamMessage({ message: 'Hello!' })) {
        chunks.push(chunk)
      }

      expect(chunks).toHaveLength(0)
    })

    it('should ignore events for different request IDs', async () => {
      const { useAIChat } = await import('./useAIChat')
      const { streamMessage } = useAIChat()

      const correctRequestId = 'request-id-123'
      const wrongRequestId = 'wrong-request-id'

      mockElectronAPI.aiChat.streamMessage.mockImplementation(async () => {
        setTimeout(() => {
          const onChunkCallback =
            mockElectronAPI.aiChat.onStreamChunk.mock.calls[0][0]
          const onCompleteCallback =
            mockElectronAPI.aiChat.onStreamComplete.mock.calls[0][0]

          // Send chunk with wrong ID (should be ignored)
          onChunkCallback(wrongRequestId, {
            type: 'assistant',
            content: 'Wrong ID',
          })

          // Send chunk with correct ID
          onChunkCallback(correctRequestId, {
            type: 'assistant',
            content: 'Correct',
          })

          // Send complete with correct ID
          onCompleteCallback(correctRequestId)
        }, 10)

        return correctRequestId
      })

      const chunks: AIChunk[] = []
      for await (const chunk of streamMessage({ message: 'Hello!' })) {
        chunks.push(chunk)
      }

      expect(chunks).toHaveLength(1)
      expect(chunks[0].content).toBe('Correct')
    })

    it('should use custom provider when specified', async () => {
      const { useAIChat } = await import('./useAIChat')
      const { streamMessage } = useAIChat()

      // Setup basic mock
      mockElectronAPI.aiChat.streamMessage.mockImplementation(async () => {
        const requestId = 'request-id-123'
        setTimeout(() => {
          const onCompleteCallback =
            mockElectronAPI.aiChat.onStreamComplete.mock.calls[0][0]
          onCompleteCallback(requestId)
        }, 10)
        return requestId
      })

      const generator = streamMessage({
        message: 'Hello!',
        providerName: 'gpt-4',
      })

      // Consume generator
      for await (const _chunk of generator) {
        // Just consume
      }

      expect(mockElectronAPI.aiChat.streamMessage).toHaveBeenCalledWith({
        message: 'Hello!',
        providerName: 'gpt-4',
      })
    })

    it('should handle chunks arriving after timeout', async () => {
      const { useAIChat } = await import('./useAIChat')
      const { streamMessage } = useAIChat()

      mockElectronAPI.aiChat.streamMessage.mockImplementation(async () => {
        const requestId = 'request-id-123'

        // Send chunks with delays to trigger timeout logic
        setTimeout(() => {
          const onChunkCallback =
            mockElectronAPI.aiChat.onStreamChunk.mock.calls[0][0]
          onChunkCallback(requestId, { type: 'assistant', content: 'First' })
        }, 10)

        setTimeout(() => {
          const onChunkCallback =
            mockElectronAPI.aiChat.onStreamChunk.mock.calls[0][0]
          onChunkCallback(requestId, { type: 'result' })
        }, 150) // After first timeout (100ms)

        return requestId
      })

      const chunks: AIChunk[] = []
      for await (const chunk of streamMessage({ message: 'Hello!' })) {
        chunks.push(chunk)
      }

      expect(chunks).toHaveLength(2)
    })

    it('should yield remaining chunks after completion', async () => {
      const { useAIChat } = await import('./useAIChat')
      const { streamMessage } = useAIChat()

      mockElectronAPI.aiChat.streamMessage.mockImplementation(async () => {
        const requestId = 'request-id-123'

        // Send all chunks immediately before generator starts consuming
        setTimeout(() => {
          const onChunkCallback =
            mockElectronAPI.aiChat.onStreamChunk.mock.calls[0][0]
          onChunkCallback(requestId, {
            type: 'assistant',
            content: 'Chunk 1',
          })
          onChunkCallback(requestId, {
            type: 'assistant',
            content: 'Chunk 2',
          })
          onChunkCallback(requestId, { type: 'result' })
        }, 5)

        return requestId
      })

      // Add small delay before consuming to let chunks arrive
      await new Promise((resolve) => setTimeout(resolve, 50))

      const chunks: AIChunk[] = []
      for await (const chunk of streamMessage({ message: 'Hello!' })) {
        chunks.push(chunk)
      }

      expect(chunks.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('clearConversation', () => {
    it('should clear conversation successfully', async () => {
      const { useAIChat } = await import('./useAIChat')
      const { clearConversation } = useAIChat()

      await clearConversation('session-123')

      expect(mockElectronAPI.aiChat.clearConversation).toHaveBeenCalledWith(
        'session-123',
        undefined
      )
    })

    it('should clear conversation with custom provider', async () => {
      const { useAIChat } = await import('./useAIChat')
      const { clearConversation } = useAIChat()

      await clearConversation('session-123', 'gpt-4')

      expect(mockElectronAPI.aiChat.clearConversation).toHaveBeenCalledWith(
        'session-123',
        'gpt-4'
      )
    })

    it('should use current provider when not specified', async () => {
      const { useAIChat } = await import('./useAIChat')
      const { clearConversation } = useAIChat()

      // Wait for auto-load to set current provider
      await new Promise((resolve) => setTimeout(resolve, 50))
      await nextTick()

      await clearConversation('session-123')

      expect(mockElectronAPI.aiChat.clearConversation).toHaveBeenCalledWith(
        'session-123',
        'claude'
      )
    })

    it('should throw error when not in Electron environment', async () => {
      delete (global.window as { electronAPI?: unknown }).electronAPI

      const { useAIChat } = await import('./useAIChat')
      const { clearConversation } = useAIChat()

      await expect(clearConversation('session-123')).rejects.toThrow(
        'AI Chat is only available in Electron environment'
      )
    })

    it('should handle clearConversation error', async () => {
      const testError = new Error('Session not found')
      mockElectronAPI.aiChat.clearConversation.mockRejectedValue(testError)

      const { useAIChat } = await import('./useAIChat')
      const { clearConversation, error } = useAIChat()

      await expect(clearConversation('invalid-session')).rejects.toThrow(
        'Session not found'
      )
      expect(error.value).toBe('Session not found')
    })

    it('should handle non-Error thrown object in clearConversation', async () => {
      mockElectronAPI.aiChat.clearConversation.mockRejectedValue('String error')

      const { useAIChat } = await import('./useAIChat')
      const { clearConversation, error } = useAIChat()

      await expect(clearConversation('session-123')).rejects.toThrow()
      expect(error.value).toBe('Failed to clear conversation')
    })
  })

  describe('cleanup', () => {
    it('should call removeStreamListeners on unmount in Electron environment', async () => {
      // Mock onUnmounted to capture the cleanup callback
      const vue = await import('vue')
      const onUnmountedSpy = vi.spyOn(vue, 'onUnmounted')

      const { useAIChat } = await import('./useAIChat')
      useAIChat()

      // Get the cleanup callback that was registered
      expect(onUnmountedSpy).toHaveBeenCalled()
      const cleanupCallback = onUnmountedSpy.mock.calls[0][0]

      // Simulate unmount by calling the cleanup callback
      cleanupCallback()

      expect(mockElectronAPI.aiChat.removeStreamListeners).toHaveBeenCalled()
    })

    it('should not call removeStreamListeners in non-Electron environment', async () => {
      delete (global.window as { electronAPI?: unknown }).electronAPI

      // Mock onUnmounted to capture the cleanup callback
      const vue = await import('vue')
      const onUnmountedSpy = vi.spyOn(vue, 'onUnmounted')

      const { useAIChat } = await import('./useAIChat')
      useAIChat()

      // Get the cleanup callback
      expect(onUnmountedSpy).toHaveBeenCalled()
      const cleanupCallback = onUnmountedSpy.mock.calls[0][0]

      // Simulate unmount
      cleanupCallback()

      // Should not be called since electronAPI doesn't exist
      expect(
        mockElectronAPI.aiChat.removeStreamListeners
      ).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should handle empty providers array', async () => {
      mockElectronAPI.aiChat.getAvailableProviders.mockResolvedValue([])

      const { useAIChat } = await import('./useAIChat')
      const { loadAvailableProviders, availableProviders, currentProvider } =
        useAIChat()

      await loadAvailableProviders()

      expect(availableProviders.value).toEqual([])
      expect(currentProvider.value).toBeUndefined()
    })

    it('should handle streamMessage with no chunks', async () => {
      const { useAIChat } = await import('./useAIChat')
      const { streamMessage } = useAIChat()

      mockElectronAPI.aiChat.streamMessage.mockImplementation(async () => {
        const requestId = 'request-id-123'

        setTimeout(() => {
          const onCompleteCallback =
            mockElectronAPI.aiChat.onStreamComplete.mock.calls[0][0]
          onCompleteCallback(requestId)
        }, 10)

        return requestId
      })

      const chunks: AIChunk[] = []
      for await (const chunk of streamMessage({ message: 'Hello!' })) {
        chunks.push(chunk)
      }

      expect(chunks).toHaveLength(0)
    })

    it('should handle streamMessage initialization error', async () => {
      const testError = new Error('Initialization failed')
      mockElectronAPI.aiChat.streamMessage.mockRejectedValue(testError)

      const { useAIChat } = await import('./useAIChat')
      const { streamMessage } = useAIChat()

      const generator = streamMessage({ message: 'Hello!' })

      await expect(generator.next()).rejects.toThrow('Initialization failed')
    })
  })
})
