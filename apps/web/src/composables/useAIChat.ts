/**
 * @fileoverview Vue composable for AI chat functionality.
 *
 * @description
 * Provides reactive interface for communicating with AI providers through Electron IPC.
 * Handles both synchronous (complete response) and streaming (real-time) modes.
 *
 * @example
 * ```typescript
 * const { sendMessage, streamMessage, availableProviders } = useAIChat()
 *
 * // Get available providers
 * await availableProviders.value
 *
 * // Send message and get complete response
 * const response = await sendMessage({ message: 'Hello!' })
 *
 * // Stream message chunks
 * for await (const chunk of streamMessage({ message: 'Hello!' })) {
 *   console.log(chunk.content)
 * }
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { ref, computed, onUnmounted } from 'vue'

/**
 * Parameters for sending a message to AI provider.
 *
 * @public
 */
export interface SendMessageParams {
  /** The message content to send */
  message: string
  /** Optional session ID for conversation continuity */
  sessionId?: string
  /** Optional flag to continue previous session (uses --continue for Claude CLI) */
  continueSession?: boolean
  /** Optional system prompt to set AI behavior */
  systemPrompt?: string
  /** Optional temperature (0.0-1.0) for response randomness */
  temperature?: number
  /** Optional maximum tokens to generate */
  maxTokens?: number
  /** Optional provider name (uses default if not specified) */
  providerName?: string
  /** Optional working directory for AI execution (user's project directory) */
  cwd?: string
}

/**
 * Complete AI response.
 *
 * @public
 */
export interface AIResponse {
  /** The generated response content */
  content: string
  /** Session ID for conversation continuity */
  sessionId: string
  /** Token usage statistics */
  usage: {
    inputTokens: number
    outputTokens: number
    cacheReadTokens?: number
    cacheCreationTokens?: number
    costUSD?: number
  }
  /** Model used for generation */
  model: string
  /** Total duration in milliseconds */
  durationMs: number
  /** API duration in milliseconds */
  durationApiMs?: number
}

/**
 * Streaming chunk from AI provider.
 *
 * @public
 */
export interface AIChunk {
  /** Type of chunk */
  type: 'system' | 'assistant' | 'result' | 'error'
  /** Chunk content (if applicable) */
  content?: string
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Provider capabilities.
 *
 * @public
 */
export interface ProviderCapabilities {
  /** Whether provider supports streaming */
  supportsStreaming: boolean
  /** Whether provider supports tools */
  supportsTools: boolean
  /** Whether provider supports vision */
  supportsVision: boolean
  /** Whether provider supports files */
  supportsFiles: boolean
  /** Maximum context window in tokens */
  maxContextTokens: number
}

/**
 * Vue composable for AI chat functionality.
 *
 * @remarks
 * Provides reactive interface for:
 * - Sending messages to AI providers
 * - Streaming responses in real-time
 * - Managing conversation context
 * - Querying available providers and capabilities
 *
 * @returns Object with AI chat methods and state
 *
 * @public
 */
export function useAIChat() {
  const availableProviders = ref<string[]>([])
  const currentProvider = ref<string | undefined>()
  const capabilities = ref<ProviderCapabilities | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Check if we're in Electron environment
  const isElectron = computed(() => window.electronAPI !== undefined)

  /**
   * Load available AI providers.
   *
   * @returns Promise resolving when providers are loaded
   *
   * @public
   */
  async function loadAvailableProviders(): Promise<void> {
    if (!isElectron.value) {
      error.value = 'AI Chat is only available in Electron environment'
      return
    }

    try {
      isLoading.value = true
      error.value = null

      const providers = await window.electronAPI.aiChat.getAvailableProviders()
      availableProviders.value = providers

      // Set first provider as current if none selected
      if (providers.length > 0 && !currentProvider.value) {
        currentProvider.value = providers[0]
        await loadProviderCapabilities(providers[0])
      }
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to load providers'
      console.error('[useAIChat] Error loading providers:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Load capabilities for a specific provider.
   *
   * @param providerName - Provider name to query
   * @returns Promise resolving when capabilities are loaded
   *
   * @public
   */
  async function loadProviderCapabilities(providerName: string): Promise<void> {
    if (!isElectron.value) return

    try {
      const caps =
        await window.electronAPI.aiChat.getProviderCapabilities(providerName)
      capabilities.value = caps
    } catch (err) {
      console.error('[useAIChat] Error loading capabilities:', err)
    }
  }

  /**
   * Set default AI provider.
   *
   * @param providerName - Provider name to set as default
   * @returns Promise resolving when provider is set
   *
   * @public
   */
  async function setDefaultProvider(providerName: string): Promise<void> {
    if (!isElectron.value) {
      throw new Error('AI Chat is only available in Electron environment')
    }

    try {
      await window.electronAPI.aiChat.setDefaultProvider(providerName)
      currentProvider.value = providerName
      await loadProviderCapabilities(providerName)
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to set default provider'
      throw err
    }
  }

  /**
   * Send message to AI provider and get complete response.
   *
   * @param params - Message parameters
   * @returns Promise resolving to complete AI response
   *
   * @throws Error if not in Electron environment or if provider fails
   *
   * @public
   */
  async function sendMessage(params: SendMessageParams): Promise<AIResponse> {
    if (!isElectron.value) {
      throw new Error('AI Chat is only available in Electron environment')
    }

    try {
      isLoading.value = true
      error.value = null

      const response = await window.electronAPI.aiChat.sendMessage({
        ...params,
        providerName: params.providerName || currentProvider.value,
      })

      return response
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to send message'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Stream message chunks from AI provider in real-time.
   *
   * @param params - Message parameters
   * @returns Async generator yielding message chunks
   *
   * @throws Error if not in Electron environment or if streaming fails
   *
   * @example
   * ```typescript
   * const { streamMessage } = useAIChat()
   *
   * for await (const chunk of streamMessage({ message: 'Hello!' })) {
   *   if (chunk.type === 'assistant' && chunk.content) {
   *     console.log(chunk.content)
   *   }
   * }
   * ```
   *
   * @public
   */
  async function* streamMessage(
    params: SendMessageParams
  ): AsyncGenerator<AIChunk> {
    console.log('[useAIChat] === streamMessage ENTRY ===')
    console.log('[useAIChat] Parameters:', params)

    if (!isElectron.value) {
      console.error('[useAIChat] Not in Electron environment')
      throw new Error('AI Chat is only available in Electron environment')
    }

    console.log('[useAIChat] Electron environment confirmed')

    const chunks: AIChunk[] = []
    let resolveChunk: ((chunk: AIChunk) => void) | null = null
    let rejectStream: ((error: Error) => void) | null = null
    let isComplete = false
    let streamError: string | null = null

    try {
      console.log('[useAIChat] Setting isLoading = true')
      isLoading.value = true
      error.value = null

      console.log(
        '[useAIChat] About to call window.electronAPI.aiChat.streamMessage'
      )
      console.log(
        '[useAIChat] Provider:',
        params.providerName || currentProvider.value
      )

      // Start streaming and get auto-generated request ID from backend
      const requestId = await window.electronAPI.aiChat.streamMessage({
        ...params,
        providerName: params.providerName || currentProvider.value,
      })

      console.log('[useAIChat] ✅ Received requestId from backend:', requestId)

      // Setup event listeners for this specific request
      const onChunk = (id: string, chunk: AIChunk) => {
        if (id !== requestId) return

        console.log(
          '[useAIChat] onChunk received:',
          chunk.type,
          chunk.content?.substring(0, 50)
        )
        chunks.push(chunk)

        // If this is a 'result' chunk, mark stream as complete
        if (chunk.type === 'result') {
          console.log('[useAIChat] Received result chunk, marking as complete')
          isComplete = true
        }

        if (resolveChunk) {
          resolveChunk(chunk)
          resolveChunk = null
        }
      }

      const onComplete = (id: string) => {
        if (id !== requestId) return
        console.log('[useAIChat] onComplete received for requestId:', id)
        isComplete = true
        if (resolveChunk) {
          resolveChunk = null
        }
      }

      const onError = (id: string, err: string) => {
        if (id !== requestId) return
        console.error('[useAIChat] onError received:', err)
        streamError = err
        if (rejectStream) {
          rejectStream(new Error(err))
          rejectStream = null
        }
      }

      console.log(
        '[useAIChat] Setting up event listeners for requestId:',
        requestId
      )
      window.electronAPI.aiChat.onStreamChunk(onChunk)
      window.electronAPI.aiChat.onStreamComplete(onComplete)
      window.electronAPI.aiChat.onStreamError(onError)
      console.log('[useAIChat] Event listeners registered')

      // Yield chunks as they arrive
      console.log('[useAIChat] Starting chunk yield loop')
      let chunkIndex = 0
      while (!isComplete && !streamError) {
        if (chunkIndex < chunks.length) {
          console.log(
            '[useAIChat] Yielding chunk',
            chunkIndex,
            'of',
            chunks.length
          )
          yield chunks[chunkIndex]
          chunkIndex++
        } else {
          // Wait for next chunk
          console.log('[useAIChat] Waiting for next chunk...')
          let timeoutReached = false
          await new Promise<void>((resolve, reject) => {
            resolveChunk = () => resolve()
            rejectStream = reject
            // Add timeout to prevent infinite waiting
            setTimeout(() => {
              if (!timeoutReached) {
                timeoutReached = true
                resolveChunk = null
                resolve()
              }
            }, 100)
          })
        }
      }

      console.log(
        '[useAIChat] Exited yield loop. isComplete:',
        isComplete,
        'streamError:',
        streamError
      )

      // Check for stream error
      if (streamError) {
        console.error('[useAIChat] Throwing stream error:', streamError)
        throw new Error(streamError)
      }

      // Yield any remaining chunks
      if (chunkIndex < chunks.length) {
        console.log(
          '[useAIChat] Yielding remaining chunks:',
          chunks.length - chunkIndex
        )
      }
      while (chunkIndex < chunks.length) {
        yield chunks[chunkIndex]
        chunkIndex++
      }

      console.log('[useAIChat] === streamMessage EXIT (success) ===')
    } catch (err) {
      console.error('[useAIChat] === streamMessage EXIT (error) ===')
      console.error('[useAIChat] Error details:', err)
      throw err
    } finally {
      console.log('[useAIChat] Setting isLoading = false')
      isLoading.value = false
      // Cleanup listeners - removed, will be cleaned up on unmount
    }
  }

  /**
   * Clear conversation context for a session.
   *
   * @param sessionId - Session identifier
   * @param providerName - Optional provider name
   * @returns Promise resolving when context is cleared
   *
   * @public
   */
  async function clearConversation(
    sessionId: string,
    providerName?: string
  ): Promise<void> {
    if (!isElectron.value) {
      throw new Error('AI Chat is only available in Electron environment')
    }

    try {
      await window.electronAPI.aiChat.clearConversation(
        sessionId,
        providerName || currentProvider.value
      )
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to clear conversation'
      throw err
    }
  }

  // Cleanup listeners on unmount
  onUnmounted(() => {
    if (isElectron.value) {
      window.electronAPI.aiChat.removeStreamListeners()
    }
  })

  // Auto-load providers on composable creation
  if (isElectron.value) {
    loadAvailableProviders()
  }

  return {
    // State
    availableProviders,
    currentProvider,
    capabilities,
    isLoading,
    error,
    isElectron,

    // Methods
    loadAvailableProviders,
    loadProviderCapabilities,
    setDefaultProvider,
    sendMessage,
    streamMessage,
    clearConversation,
  }
}
