/**
 * @fileoverview Base interface for AI CLI providers.
 *
 * @description
 * Defines the contract that all AI providers must implement. This allows
 * the system to work with different AI CLIs (Claude, Gemini, GPT) through
 * a unified interface.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import type {
  SendMessageParams,
  AIResponse,
  AIChunk,
  AIMessage,
  ProviderCapabilities,
} from './types'

/**
 * Base interface for all AI providers.
 *
 * @remarks
 * This interface defines the contract for interacting with AI CLIs.
 * Implementations should handle CLI execution, response parsing, and
 * streaming support based on the specific provider's capabilities.
 *
 * @example
 * ```typescript
 * class MyAIProvider implements AIProvider {
 *   readonly name = 'my-ai'
 *
 *   async isAvailable(): Promise<boolean> {
 *     // Check if CLI is installed
 *     return true
 *   }
 *
 *   async sendMessage(params: SendMessageParams): Promise<AIResponse> {
 *     // Execute CLI and parse response
 *     return { ... }
 *   }
 *
 *   // ... implement other methods
 * }
 * ```
 *
 * @public
 */
export interface AIProvider {
  /**
   * Unique provider name (e.g., "claude-code", "gemini-cli").
   *
   * @public
   */
  readonly name: string

  /**
   * Check if provider CLI is installed and configured.
   *
   * @returns Promise resolving to true if provider is available
   *
   * @remarks
   * This method should check if the CLI executable exists in PATH
   * and is properly configured (e.g., authenticated).
   *
   * @public
   */
  isAvailable(): Promise<boolean>

  /**
   * Send a message and get a complete response.
   *
   * @param params - Message parameters
   * @returns Promise resolving to the AI response
   *
   * @remarks
   * This is the synchronous version that waits for the complete
   * response before returning. Use `streamMessage` for real-time
   * streaming.
   *
   * @public
   */
  sendMessage(params: SendMessageParams): Promise<AIResponse>

  /**
   * Stream message chunks in real-time.
   *
   * @param params - Message parameters
   * @returns Async generator yielding message chunks
   *
   * @remarks
   * This method provides real-time streaming of the AI response.
   * Chunks are yielded as they arrive from the CLI.
   *
   * @example
   * ```typescript
   * for await (const chunk of provider.streamMessage({ message: 'Hello' })) {
   *   if (chunk.type === 'assistant' && chunk.content) {
   *     process.stdout.write(chunk.content)
   *   }
   * }
   * ```
   *
   * @public
   */
  streamMessage(params: SendMessageParams): AsyncGenerator<AIChunk>

  /**
   * Get conversation history for a session.
   *
   * @param sessionId - Session identifier
   * @returns Promise resolving to array of messages
   *
   * @remarks
   * This method retrieves the full conversation history for a given
   * session. Not all providers may support this feature.
   *
   * @public
   */
  getConversation(sessionId: string): Promise<AIMessage[]>

  /**
   * Clear conversation context for a session.
   *
   * @param sessionId - Session identifier
   * @returns Promise resolving when context is cleared
   *
   * @remarks
   * This resets the conversation state for the given session.
   * Subsequent messages will start with a fresh context.
   *
   * @public
   */
  clearConversation(sessionId: string): Promise<void>

  /**
   * Get provider capabilities and feature support.
   *
   * @returns Provider capabilities object
   *
   * @remarks
   * Use this to check what features the provider supports before
   * attempting to use them.
   *
   * @public
   */
  getCapabilities(): ProviderCapabilities
}
