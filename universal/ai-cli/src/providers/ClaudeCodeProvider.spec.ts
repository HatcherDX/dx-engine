/**
 * @fileoverview Tests for ClaudeCodeProvider.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ClaudeCodeProvider } from './ClaudeCodeProvider'
import { CLIRunner } from '../cli/CLIRunner'
import type { SendMessageParams } from '../core/types'

describe('ClaudeCodeProvider', () => {
  let mockCliRunner: CLIRunner
  let provider: ClaudeCodeProvider

  beforeEach(() => {
    mockCliRunner = {
      execute: vi.fn(),
      streamExecute: vi.fn(),
    } as unknown as CLIRunner

    provider = new ClaudeCodeProvider(mockCliRunner)
  })

  describe('Constructor', () => {
    it('should create instance with default name', () => {
      expect(provider.name).toBe('claude-code')
    })

    it('should create instance with custom cliPath option', () => {
      const customProvider = new ClaudeCodeProvider(mockCliRunner, {
        cliPath: '/custom/path/to/claude',
      })
      expect(customProvider.name).toBe('claude-code')
    })
  })

  describe('isAvailable', () => {
    it('should return true when Claude CLI is available', async () => {
      vi.mocked(mockCliRunner.execute).mockResolvedValue({
        stdout: '/usr/local/bin/claude\n',
        stderr: '',
        exitCode: 0,
      })

      const result = await provider.isAvailable()

      expect(result).toBe(true)
      expect(mockCliRunner.execute).toHaveBeenCalledWith('which', ['claude'])
    })

    it('should return false when Claude CLI is not found (exitCode !== 0)', async () => {
      vi.mocked(mockCliRunner.execute).mockResolvedValue({
        stdout: '',
        stderr: 'which: no claude in (/usr/bin:/bin)',
        exitCode: 1,
      })

      const result = await provider.isAvailable()

      expect(result).toBe(false)
    })

    it('should return false when stdout is empty', async () => {
      vi.mocked(mockCliRunner.execute).mockResolvedValue({
        stdout: '   \n',
        stderr: '',
        exitCode: 0,
      })

      const result = await provider.isAvailable()

      expect(result).toBe(false)
    })

    it('should return false when execute throws an error', async () => {
      vi.mocked(mockCliRunner.execute).mockRejectedValue(
        new Error('Command not found')
      )

      const result = await provider.isAvailable()

      expect(result).toBe(false)
    })
  })

  describe('sendMessage', () => {
    const mockClaudeResponse = {
      type: 'result' as const,
      subtype: 'success' as const,
      result: 'Hello from Claude!',
      session_id: 'session-123',
      duration_ms: 1500,
      duration_api_ms: 1200,
      usage: {
        input_tokens: 10,
        output_tokens: 20,
        cache_read_input_tokens: 5,
        cache_creation_input_tokens: 3,
      },
      total_cost_usd: 0.001,
      modelUsage: {
        'claude-sonnet-4': {
          inputTokens: 10,
          outputTokens: 20,
          cacheReadInputTokens: 5,
          cacheCreationInputTokens: 3,
          costUSD: 0.001,
        },
      },
    }

    it('should send message successfully', async () => {
      const params: SendMessageParams = {
        message: 'Hello, Claude!',
      }

      vi.mocked(mockCliRunner.execute).mockResolvedValue({
        stdout: JSON.stringify(mockClaudeResponse),
        stderr: '',
        exitCode: 0,
      })

      const response = await provider.sendMessage(params)

      expect(response).toEqual({
        content: 'Hello from Claude!',
        sessionId: 'session-123',
        usage: {
          inputTokens: 10,
          outputTokens: 20,
          cacheReadTokens: 5,
          cacheCreationTokens: 3,
          costUSD: 0.001,
        },
        model: 'claude-sonnet-4',
        durationMs: 1500,
        durationApiMs: 1200,
      })

      expect(mockCliRunner.execute).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['-p', '--output-format', 'json']),
        expect.objectContaining({
          input: 'Hello, Claude!',
          timeout: 300000,
        })
      )
    })

    it('should use custom cliPath when provided', async () => {
      const customProvider = new ClaudeCodeProvider(mockCliRunner, {
        cliPath: '/custom/claude',
      })

      const params: SendMessageParams = {
        message: 'Test message',
      }

      vi.mocked(mockCliRunner.execute).mockResolvedValue({
        stdout: JSON.stringify(mockClaudeResponse),
        stderr: '',
        exitCode: 0,
      })

      await customProvider.sendMessage(params)

      expect(mockCliRunner.execute).toHaveBeenCalledWith(
        '/custom/claude',
        expect.any(Array),
        expect.any(Object)
      )
    })

    it('should include cwd in execution options when provided', async () => {
      const params: SendMessageParams = {
        message: 'Hello!',
        cwd: '/test/project',
      }

      vi.mocked(mockCliRunner.execute).mockResolvedValue({
        stdout: JSON.stringify(mockClaudeResponse),
        stderr: '',
        exitCode: 0,
      })

      await provider.sendMessage(params)

      expect(mockCliRunner.execute).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--continue']), // cwd should trigger --continue
        expect.objectContaining({
          cwd: '/test/project',
        })
      )
    })

    it('should include system prompt in args when provided', async () => {
      const params: SendMessageParams = {
        message: 'Test',
        systemPrompt: 'You are a helpful assistant',
      }

      vi.mocked(mockCliRunner.execute).mockResolvedValue({
        stdout: JSON.stringify(mockClaudeResponse),
        stderr: '',
        exitCode: 0,
      })

      await provider.sendMessage(params)

      expect(mockCliRunner.execute).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining([
          '--append-system-prompt',
          'You are a helpful assistant',
        ]),
        expect.any(Object)
      )
    })

    it('should include temperature in args when provided', async () => {
      const params: SendMessageParams = {
        message: 'Test',
        temperature: 0.7,
      }

      vi.mocked(mockCliRunner.execute).mockResolvedValue({
        stdout: JSON.stringify(mockClaudeResponse),
        stderr: '',
        exitCode: 0,
      })

      await provider.sendMessage(params)

      expect(mockCliRunner.execute).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--temperature', '0.7']),
        expect.any(Object)
      )
    })

    it('should use --continue when continueSession is true', async () => {
      const params: SendMessageParams = {
        message: 'Test',
        continueSession: true,
      }

      vi.mocked(mockCliRunner.execute).mockResolvedValue({
        stdout: JSON.stringify(mockClaudeResponse),
        stderr: '',
        exitCode: 0,
      })

      await provider.sendMessage(params)

      expect(mockCliRunner.execute).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--continue']),
        expect.any(Object)
      )
    })

    it('should use --session-id when continueSession is false and no cwd', async () => {
      const params: SendMessageParams = {
        message: 'Test',
        sessionId: 'custom-session-id',
        continueSession: false,
      }

      vi.mocked(mockCliRunner.execute).mockResolvedValue({
        stdout: JSON.stringify(mockClaudeResponse),
        stderr: '',
        exitCode: 0,
      })

      await provider.sendMessage(params)

      expect(mockCliRunner.execute).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--session-id', 'custom-session-id']),
        expect.any(Object)
      )
    })

    it('should throw error when CLI exits with non-zero code', async () => {
      const params: SendMessageParams = {
        message: 'Test',
      }

      vi.mocked(mockCliRunner.execute).mockResolvedValue({
        stdout: '',
        stderr: 'Command failed',
        exitCode: 1,
      })

      await expect(provider.sendMessage(params)).rejects.toThrow(
        'Claude CLI failed: Command failed'
      )
    })

    it('should throw error when CLI exits with non-zero code and stderr is empty', async () => {
      const params: SendMessageParams = {
        message: 'Test',
      }

      vi.mocked(mockCliRunner.execute).mockResolvedValue({
        stdout: 'Error output',
        stderr: '',
        exitCode: 1,
      })

      await expect(provider.sendMessage(params)).rejects.toThrow(
        'Claude CLI failed: Error output'
      )
    })

    it('should throw error when Claude returns error subtype', async () => {
      const params: SendMessageParams = {
        message: 'Test',
      }

      const errorResponse = {
        ...mockClaudeResponse,
        subtype: 'error' as const,
        result: 'Something went wrong',
      }

      vi.mocked(mockCliRunner.execute).mockResolvedValue({
        stdout: JSON.stringify(errorResponse),
        stderr: '',
        exitCode: 0,
      })

      await expect(provider.sendMessage(params)).rejects.toThrow(
        'Claude returned error: Something went wrong'
      )
    })
  })

  describe('streamMessage', () => {
    it('should stream assistant chunks correctly', async () => {
      const params: SendMessageParams = {
        message: 'Hello!',
      }

      const chunks = [
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [{ type: 'text', text: 'Hello' }],
          },
        }),
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [{ type: 'text', text: ' there!' }],
          },
        }),
      ]

      async function* mockStreamGenerator() {
        for (const chunk of chunks) {
          yield chunk
        }
      }

      vi.mocked(mockCliRunner.streamExecute).mockReturnValue(
        mockStreamGenerator()
      )

      const results = []
      for await (const chunk of provider.streamMessage(params)) {
        results.push(chunk)
      }

      expect(results).toEqual([
        {
          type: 'assistant',
          content: 'Hello',
          metadata: expect.objectContaining({ type: 'assistant' }),
        },
        {
          type: 'assistant',
          content: ' there!',
          metadata: expect.objectContaining({ type: 'assistant' }),
        },
      ])

      expect(mockCliRunner.streamExecute).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining([
          '-p',
          '--output-format',
          'stream-json',
          '--verbose',
        ]),
        expect.objectContaining({
          input: 'Hello!',
        })
      )
    })

    it('should stream result chunks correctly', async () => {
      const params: SendMessageParams = {
        message: 'Test',
      }

      const chunks = [
        JSON.stringify({
          type: 'result',
          result: 'Final response',
          session_id: 'session-123',
        }),
      ]

      async function* mockStreamGenerator() {
        for (const chunk of chunks) {
          yield chunk
        }
      }

      vi.mocked(mockCliRunner.streamExecute).mockReturnValue(
        mockStreamGenerator()
      )

      const results = []
      for await (const chunk of provider.streamMessage(params)) {
        results.push(chunk)
      }

      expect(results).toEqual([
        {
          type: 'result',
          content: 'Final response',
          metadata: expect.objectContaining({
            type: 'result',
            result: 'Final response',
            session_id: 'session-123',
          }),
        },
      ])
    })

    it('should handle system chunks without content', async () => {
      const params: SendMessageParams = {
        message: 'Test',
      }

      const chunks = [
        JSON.stringify({
          type: 'system',
          subtype: 'info',
        }),
      ]

      async function* mockStreamGenerator() {
        for (const chunk of chunks) {
          yield chunk
        }
      }

      vi.mocked(mockCliRunner.streamExecute).mockReturnValue(
        mockStreamGenerator()
      )

      const results = []
      for await (const chunk of provider.streamMessage(params)) {
        results.push(chunk)
      }

      expect(results).toEqual([
        {
          type: 'system',
          content: undefined,
          metadata: expect.objectContaining({ type: 'system' }),
        },
      ])
    })

    it('should skip invalid JSON lines', async () => {
      const params: SendMessageParams = {
        message: 'Test',
      }

      const chunks = [
        'Invalid JSON line',
        JSON.stringify({
          type: 'result',
          result: 'Valid response',
        }),
      ]

      async function* mockStreamGenerator() {
        for (const chunk of chunks) {
          yield chunk
        }
      }

      vi.mocked(mockCliRunner.streamExecute).mockReturnValue(
        mockStreamGenerator()
      )

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation()

      const results = []
      for await (const chunk of provider.streamMessage(params)) {
        results.push(chunk)
      }

      expect(results).toHaveLength(1)
      expect(results[0].type).toBe('result')
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[ClaudeCodeProvider] Skipping invalid JSON:',
        'Invalid JSON line'
      )

      consoleWarnSpy.mockRestore()
    })

    it('should use custom cliPath for streaming when provided', async () => {
      const customProvider = new ClaudeCodeProvider(mockCliRunner, {
        cliPath: '/custom/claude',
      })

      const params: SendMessageParams = {
        message: 'Test',
      }

      async function* mockStreamGenerator() {
        yield JSON.stringify({ type: 'result', result: 'test' })
      }

      vi.mocked(mockCliRunner.streamExecute).mockReturnValue(
        mockStreamGenerator()
      )

      for await (const _ of customProvider.streamMessage(params)) {
        // consume generator
      }

      expect(mockCliRunner.streamExecute).toHaveBeenCalledWith(
        '/custom/claude',
        expect.any(Array),
        expect.any(Object)
      )
    })

    it('should include cwd in streaming execution options', async () => {
      const params: SendMessageParams = {
        message: 'Test',
        cwd: '/test/dir',
      }

      async function* mockStreamGenerator() {
        yield JSON.stringify({ type: 'result', result: 'test' })
      }

      vi.mocked(mockCliRunner.streamExecute).mockReturnValue(
        mockStreamGenerator()
      )

      for await (const _ of provider.streamMessage(params)) {
        // consume generator
      }

      expect(mockCliRunner.streamExecute).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--continue']),
        expect.objectContaining({
          cwd: '/test/dir',
        })
      )
    })
  })

  describe('getConversation', () => {
    it('should throw error as feature is not supported', async () => {
      await expect(provider.getConversation()).rejects.toThrow(
        'Conversation history not supported by Claude CLI'
      )
    })
  })

  describe('clearConversation', () => {
    it('should be a no-op and not throw', async () => {
      await expect(provider.clearConversation()).resolves.toBeUndefined()
    })
  })

  describe('getCapabilities', () => {
    it('should return Claude Code provider capabilities', () => {
      const capabilities = provider.getCapabilities()

      expect(capabilities).toEqual({
        supportsStreaming: true,
        supportsTools: true,
        supportsVision: true,
        supportsFiles: true,
        maxContextTokens: 200_000,
      })
    })
  })
})
