/**
 * @fileoverview Core type definitions for AI CLI providers.
 *
 * @description
 * Shared type definitions used across all AI providers. Provides a consistent
 * interface for interacting with different AI CLIs (Claude, Gemini, GPT, etc.).
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

/**
 * Parameters for sending a message to an AI provider.
 *
 * @public
 */
export interface SendMessageParams {
  /** The message content to send to the AI */
  message: string
  /** Optional session ID to maintain conversation context */
  sessionId?: string
  /** Optional flag to continue previous session (uses --continue for Claude CLI) */
  continueSession?: boolean
  /** Optional system prompt to set AI behavior/role */
  systemPrompt?: string
  /** Optional temperature (0.0-1.0) for response randomness */
  temperature?: number
  /** Optional maximum tokens to generate in response */
  maxTokens?: number
  /** Optional working directory for CLI execution */
  cwd?: string
}

/**
 * Response from an AI provider for a complete message.
 *
 * @public
 */
export interface AIResponse {
  /** The generated response content */
  content: string
  /** Session ID for conversation continuity */
  sessionId: string
  /** Token usage statistics */
  usage: TokenUsage
  /** Model used for generation */
  model: string
  /** Total duration in milliseconds */
  durationMs: number
  /** API duration in milliseconds (excluding overhead) */
  durationApiMs?: number
}

/**
 * Streaming chunk from an AI provider.
 *
 * @public
 */
export interface AIChunk {
  /** Type of chunk */
  type: 'system' | 'assistant' | 'result' | 'error'
  /** Chunk content (if applicable) */
  content?: string
  /** Additional metadata from the provider */
  metadata?: Record<string, unknown>
}

/**
 * Token usage statistics.
 *
 * @public
 */
export interface TokenUsage {
  /** Input tokens consumed */
  inputTokens: number
  /** Output tokens generated */
  outputTokens: number
  /** Cache read tokens (if supported) */
  cacheReadTokens?: number
  /** Cache creation tokens (if supported) */
  cacheCreationTokens?: number
  /** Total cost in USD (if available) */
  costUSD?: number
}

/**
 * AI message in a conversation.
 *
 * @public
 */
export interface AIMessage {
  /** Message role */
  role: 'user' | 'assistant' | 'system'
  /** Message content */
  content: string
  /** Message timestamp */
  timestamp: Date
  /** Whether message is currently streaming */
  isStreaming?: boolean
  /** Session ID this message belongs to */
  sessionId?: string
}

/**
 * Provider capabilities and feature support.
 *
 * @public
 */
export interface ProviderCapabilities {
  /** Whether provider supports streaming responses */
  supportsStreaming: boolean
  /** Whether provider supports tool/function calling */
  supportsTools: boolean
  /** Whether provider supports vision/image input */
  supportsVision: boolean
  /** Whether provider supports file attachments */
  supportsFiles: boolean
  /** Maximum context window in tokens */
  maxContextTokens: number
}

/**
 * CLI execution options.
 *
 * @public
 */
export interface CLIOptions {
  /** Working directory for command execution */
  cwd?: string
  /** Environment variables */
  env?: Record<string, string>
  /** Input to pipe to stdin */
  input?: string
  /** Timeout in milliseconds */
  timeout?: number
}

/**
 * Result from CLI execution.
 *
 * @public
 */
export interface CLIResult {
  /** Standard output */
  stdout: string
  /** Standard error */
  stderr: string
  /** Exit code */
  exitCode: number
}
