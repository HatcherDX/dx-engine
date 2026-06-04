/**
 * @fileoverview Claude Code CLI provider implementation.
 *
 * @description
 * Implements AIProvider interface for Claude Code CLI. Handles execution of
 * the `claude` command with JSON output parsing and streaming support.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import type { AIProvider } from '../core/AIProvider'
import type {
  SendMessageParams,
  AIResponse,
  AIChunk,
  AIMessage,
  ProviderCapabilities,
} from '../core/types'
import { CLIRunner } from '../cli/CLIRunner'
import { randomUUID } from 'node:crypto'

/**
 * Claude Code JSON response structure.
 *
 * @internal
 */
interface ClaudeCodeResponse {
  type: 'result'
  subtype: 'success' | 'error'
  result: string
  session_id: string
  duration_ms: number
  duration_api_ms: number
  usage: {
    input_tokens: number
    output_tokens: number
    cache_read_input_tokens?: number
    cache_creation_input_tokens?: number
  }
  total_cost_usd?: number
  modelUsage: Record<
    string,
    {
      inputTokens: number
      outputTokens: number
      cacheReadInputTokens?: number
      cacheCreationInputTokens?: number
      costUSD?: number
    }
  >
}

/**
 * Claude Code streaming chunk structure.
 *
 * @internal
 */
interface ClaudeStreamChunk {
  type: 'system' | 'assistant' | 'result' | 'error'
  subtype?: string
  message?: {
    content?: Array<{ type: string; text?: string }>
  }
  result?: string
  session_id?: string
}

/**
 * Claude Code CLI provider.
 *
 * @public
 */
export class ClaudeCodeProvider implements AIProvider {
  readonly name = 'claude-code'

  constructor(
    private cliRunner: CLIRunner,
    private options: { cliPath?: string } = {}
  ) {}

  /**
   * Check if Claude CLI is available.
   *
   * @public
   */
  async isAvailable(): Promise<boolean> {
    try {
      const result = await this.cliRunner.execute('which', ['claude'])
      return result.exitCode === 0 && result.stdout.trim().length > 0
    } catch {
      return false
    }
  }

  /**
   * Send message to Claude and get complete response.
   *
   * @public
   */
  async sendMessage(params: SendMessageParams): Promise<AIResponse> {
    const args = this.buildClaudeArgs(params, false)

    console.log('[ClaudeCodeProvider] Executing:', 'claude', args.join(' '))
    console.log(
      '[ClaudeCodeProvider] Working directory:',
      params.cwd || process.cwd()
    )

    const result = await this.cliRunner.execute(
      this.options.cliPath || 'claude',
      args,
      {
        input: params.message,
        cwd: params.cwd,
        timeout: 300000, // 5 minutes
      }
    )

    if (result.exitCode !== 0) {
      throw new Error(`Claude CLI failed: ${result.stderr || result.stdout}`)
    }

    const response = JSON.parse(result.stdout) as ClaudeCodeResponse

    if (response.subtype === 'error') {
      throw new Error(`Claude returned error: ${response.result}`)
    }

    // Get first model usage entry
    const modelName = Object.keys(response.modelUsage)[0]

    return {
      content: response.result,
      sessionId: response.session_id,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cacheReadTokens: response.usage.cache_read_input_tokens,
        cacheCreationTokens: response.usage.cache_creation_input_tokens,
        costUSD: response.total_cost_usd,
      },
      model: modelName,
      durationMs: response.duration_ms,
      durationApiMs: response.duration_api_ms,
    }
  }

  /**
   * Stream message chunks from Claude in real-time.
   *
   * @public
   */
  async *streamMessage(params: SendMessageParams): AsyncGenerator<AIChunk> {
    const args = this.buildClaudeArgs(params, true)

    console.log('[ClaudeCodeProvider] === STREAM MESSAGE DEBUG ===')
    console.log('[ClaudeCodeProvider] Params.cwd:', params.cwd)
    console.log(
      '[ClaudeCodeProvider] Params.continueSession:',
      params.continueSession
    )
    console.log('[ClaudeCodeProvider] Built args:', args)
    console.log('[ClaudeCodeProvider] Full command:', 'claude', args.join(' '))
    console.log('[ClaudeCodeProvider] Input:', params.message)
    console.log(
      '[ClaudeCodeProvider] Working directory:',
      params.cwd || process.cwd()
    )
    console.log('[ClaudeCodeProvider] === END DEBUG ===')

    for await (const line of this.cliRunner.streamExecute(
      this.options.cliPath || 'claude',
      args,
      {
        input: params.message,
        cwd: params.cwd,
      }
    )) {
      try {
        const chunk = JSON.parse(line) as ClaudeStreamChunk

        // Extract content from different chunk types
        let content: string | undefined

        if (chunk.type === 'assistant' && chunk.message?.content?.[0]?.text) {
          content = chunk.message.content[0].text
        } else if (chunk.type === 'result' && chunk.result) {
          content = chunk.result
        }

        yield {
          type: chunk.type as AIChunk['type'],
          content,
          metadata: chunk as unknown as Record<string, unknown>,
        }
      } catch {
        // Skip invalid JSON lines
        console.warn('[ClaudeCodeProvider] Skipping invalid JSON:', line)
      }
    }
  }

  /**
   * Get conversation history (not supported by Claude CLI).
   *
   * @public
   */
  async getConversation(): Promise<AIMessage[]> {
    // Claude CLI doesn't provide conversation history retrieval
    throw new Error('Conversation history not supported by Claude CLI')
  }

  /**
   * Clear conversation (creates new session).
   *
   * @public
   */
  async clearConversation(): Promise<void> {
    // Conversation is cleared by not passing session ID to next request
    // This is a no-op since session management is handled externally
  }

  /**
   * Get Claude Code provider capabilities.
   *
   * @public
   */
  getCapabilities(): ProviderCapabilities {
    return {
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: true,
      supportsFiles: true,
      maxContextTokens: 200_000,
    }
  }

  /**
   * Build Claude CLI arguments.
   *
   * @param params - Message parameters
   * @param streaming - Whether to use streaming output
   * @returns Array of CLI arguments
   *
   * @private
   */
  private buildClaudeArgs(
    params: SendMessageParams,
    streaming: boolean
  ): string[] {
    const args: string[] = [
      '-p', // Print mode (non-interactive)
      '--output-format',
      streaming ? 'stream-json' : 'json',
    ]

    // Add verbose for streaming (required by Claude CLI)
    if (streaming) {
      args.push('--verbose')
    }

    // Use --continue to resume previous session, or --session-id for new/explicit session
    // When cwd is set, use --continue to automatically resume the most recent session in that directory
    // This handles persistence elegantly: first message creates session, subsequent messages continue it
    if (params.continueSession || params.cwd) {
      // Continue most recent conversation from current working directory
      args.push('--continue')
    } else {
      // Use explicit session ID if provided, otherwise generate new one
      args.push('--session-id', params.sessionId || randomUUID())
    }

    // Add system prompt if provided
    if (params.systemPrompt) {
      args.push('--append-system-prompt', params.systemPrompt)
    }

    // Add temperature if provided
    if (params.temperature !== undefined) {
      args.push('--temperature', params.temperature.toString())
    }

    // Note: --max-tokens is not supported by Claude CLI
    // The CLI will use its default token limits
    // if (params.maxTokens !== undefined) {
    //   args.push('--max-tokens', params.maxTokens.toString())
    // }

    return args
  }
}
