/**
 * @fileoverview Electron IPC handlers for AI chat functionality.
 *
 * @description
 * Provides IPC handlers for communicating with AI providers through their CLIs.
 * Handles both synchronous (complete response) and streaming (real-time) modes.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { ipcMain } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import { randomUUID } from 'node:crypto'
import {
  aiProviderRegistry,
  ClaudeCodeProvider,
  CLIRunner,
  type SendMessageParams,
  type AIResponse,
} from '@hatcherdx/ai-cli'

/**
 * Initialize AI provider registry with available providers.
 *
 * @remarks
 * Registers all supported AI providers and auto-detects which ones
 * are available on the system.
 *
 * @internal
 */
function initializeProviders(): void {
  const cliRunner = new CLIRunner()

  // Register Claude Code provider
  const claudeProvider = new ClaudeCodeProvider(cliRunner)
  aiProviderRegistry.register(claudeProvider)

  // Future providers can be added here:
  // const geminiProvider = new GeminiCLIProvider(cliRunner)
  // aiProviderRegistry.register(geminiProvider)
}

/**
 * Warm up Claude CLI by executing a lightweight test message.
 *
 * @remarks
 * Reduces perceived latency on first real user message by pre-loading
 * the CLI process and initializing any necessary resources.
 *
 * @internal
 */
async function warmUpClaude(): Promise<void> {
  console.log('[aiChatIPC] 🔥 Starting Claude CLI warm-up...')

  try {
    const provider = aiProviderRegistry.getProvider()
    if (!provider) {
      console.log('[aiChatIPC] ⚠️ No provider available for warm-up')
      return
    }

    const isAvailable = await provider.isAvailable()
    if (!isAvailable) {
      console.log('[aiChatIPC] ⚠️ Provider not available for warm-up')
      return
    }

    // Send lightweight warm-up message
    const warmupMessage = 'Hi'

    console.log('[aiChatIPC] 🔥 Executing warm-up message...')
    await provider.sendMessage({
      message: warmupMessage,
      sessionId: randomUUID(), // Use valid UUID for warm-up
      // Note: maxTokens not supported by Claude CLI
    })

    console.log('[aiChatIPC] ✅ Claude CLI warm-up completed successfully')
  } catch (error) {
    // Warm-up is best-effort, don't fail app startup if it fails
    console.warn(
      '[aiChatIPC] ⚠️ Claude CLI warm-up failed (non-critical):',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

/**
 * Setup all AI chat IPC handlers.
 *
 * @remarks
 * Registers IPC handlers for:
 * - ai-chat:send-message - Send message and get complete response
 * - ai-chat:stream-message - Stream message chunks in real-time
 * - ai-chat:get-available-providers - List available AI providers
 * - ai-chat:set-default-provider - Set default provider
 * - ai-chat:clear-conversation - Clear conversation context
 *
 * @public
 */
export function setupAIChatIPC(): void {
  console.log('🔧 [aiChatIPC] === FUNCTION ENTRY === setupAIChatIPC() called')

  try {
    console.log('[aiChatIPC] Setting up AI Chat IPC handlers...')
    initializeProviders()
    console.log('[aiChatIPC] Providers initialized')
  } catch (error) {
    console.error('❌ [aiChatIPC] Error during provider initialization:', error)
    console.error(
      '[aiChatIPC] Error stack:',
      error instanceof Error ? error.stack : 'No stack'
    )
    throw error
  }

  /**
   * Send message to AI provider and get complete response.
   *
   * @param event - IPC event
   * @param params - Message parameters
   * @returns Promise resolving to AI response
   *
   * @throws Error if provider is not available or execution fails
   */
  ipcMain.handle(
    'ai-chat:send-message',
    async (
      _event: IpcMainInvokeEvent,
      params: SendMessageParams & { providerName?: string }
    ): Promise<AIResponse> => {
      const provider = aiProviderRegistry.getProvider(params.providerName)

      if (!provider) {
        throw new Error('No AI provider available')
      }

      const isAvailable = await provider.isAvailable()
      if (!isAvailable) {
        throw new Error(
          `Provider ${provider.name} is not available. Please install and configure it.`
        )
      }

      return await provider.sendMessage(params)
    }
  )

  /**
   * Stream message chunks from AI provider in real-time.
   *
   * @param event - IPC event (with sender for streaming back)
   * @param params - Message parameters
   * @returns Request ID for tracking this stream
   *
   * @remarks
   * Auto-generates request ID and session ID if not provided.
   * Returns the request ID immediately so frontend can track chunks.
   */
  ipcMain.handle(
    'ai-chat:stream-message',
    async (
      event: IpcMainInvokeEvent,
      params: SendMessageParams & { providerName?: string }
    ): Promise<string> => {
      console.log('[aiChatIPC] === stream-message HANDLER ENTRY ===')
      console.log('[aiChatIPC] Received params:', params)

      // Auto-generate request ID and session ID
      const requestId = randomUUID()
      const sessionId = params.sessionId || randomUUID()

      console.log('[aiChatIPC] Generated requestId:', requestId)
      console.log('[aiChatIPC] Using sessionId:', sessionId)

      const provider = aiProviderRegistry.getProvider(params.providerName)
      console.log(
        '[aiChatIPC] Provider lookup result:',
        provider ? provider.name : 'null'
      )

      if (!provider) {
        console.error('[aiChatIPC] ❌ No provider found')
        event.sender.send(
          'ai-chat:stream-error',
          requestId,
          'No AI provider available'
        )
        console.log('[aiChatIPC] Returning requestId (no provider):', requestId)
        return requestId
      }

      console.log('[aiChatIPC] Checking if provider is available...')
      const isAvailable = await provider.isAvailable()
      console.log('[aiChatIPC] Provider availability:', isAvailable)

      if (!isAvailable) {
        console.error('[aiChatIPC] ❌ Provider not available')
        event.sender.send(
          'ai-chat:stream-error',
          requestId,
          `Provider ${provider.name} is not available. Please install and configure it.`
        )
        console.log('[aiChatIPC] Returning requestId (unavailable):', requestId)
        return requestId
      }

      console.log(
        '[aiChatIPC] ✅ Provider is available, starting background stream'
      )

      // Start streaming in background (don't await)
      ;(async () => {
        try {
          console.log('[aiChatIPC] Starting stream with sessionId:', sessionId)
          // Stream chunks as they arrive
          for await (const chunk of provider.streamMessage({
            ...params,
            sessionId,
          })) {
            console.log('[aiChatIPC] Received chunk:', chunk.type)
            event.sender.send('ai-chat:stream-chunk', requestId, chunk)
          }

          // Signal completion
          console.log('[aiChatIPC] Stream completed')
          event.sender.send('ai-chat:stream-complete', requestId)
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
          console.error('[aiChatIPC] Stream error:', errorMessage)
          event.sender.send('ai-chat:stream-error', requestId, errorMessage)
        }
      })()

      // Return request ID immediately for tracking
      console.log('[aiChatIPC] === stream-message HANDLER EXIT ===')
      console.log('[aiChatIPC] Returning requestId:', requestId)
      return requestId
    }
  )

  /**
   * Get list of available AI providers.
   *
   * @returns Promise resolving to array of available provider names
   *
   * @remarks
   * Only returns providers that are installed and configured on the system.
   */
  ipcMain.handle(
    'ai-chat:get-available-providers',
    async (): Promise<string[]> => {
      const providers = await aiProviderRegistry.getAvailableProviders()
      return providers.map((p) => p.name)
    }
  )

  /**
   * Get capabilities of a specific provider.
   *
   * @param event - IPC event
   * @param providerName - Name of provider to query
   * @returns Provider capabilities or null if not found
   */
  ipcMain.handle(
    'ai-chat:get-provider-capabilities',
    async (_event: IpcMainInvokeEvent, providerName?: string) => {
      const provider = aiProviderRegistry.getProvider(providerName)
      return provider ? provider.getCapabilities() : null
    }
  )

  /**
   * Set default AI provider.
   *
   * @param event - IPC event
   * @param providerName - Name of provider to set as default
   *
   * @throws Error if provider is not registered
   */
  ipcMain.handle(
    'ai-chat:set-default-provider',
    async (_event: IpcMainInvokeEvent, providerName: string): Promise<void> => {
      aiProviderRegistry.setDefault(providerName)
    }
  )

  /**
   * Clear conversation context for a session.
   *
   * @param event - IPC event
   * @param sessionId - Session identifier
   * @param providerName - Optional provider name (uses default if not specified)
   */
  ipcMain.handle(
    'ai-chat:clear-conversation',
    async (
      _event: IpcMainInvokeEvent,
      sessionId: string,
      providerName?: string
    ): Promise<void> => {
      const provider = aiProviderRegistry.getProvider(providerName)

      if (!provider) {
        throw new Error('No AI provider available')
      }

      await provider.clearConversation(sessionId)
    }
  )

  console.log(
    '✅ [aiChatIPC] === FUNCTION EXIT === All IPC handlers registered successfully'
  )

  // Start warm-up in background (non-blocking)
  warmUpClaude().catch((error) => {
    console.warn('[aiChatIPC] Background warm-up error:', error)
  })
}
