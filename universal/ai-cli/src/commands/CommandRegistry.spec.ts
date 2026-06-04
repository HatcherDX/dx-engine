/**
 * @fileoverview Tests for CommandRegistry.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CommandRegistry } from './CommandRegistry'
import type { Command } from './types'

describe('CommandRegistry', () => {
  let registry: CommandRegistry

  beforeEach(() => {
    registry = new CommandRegistry()
  })

  describe('Constructor', () => {
    it('should initialize with built-in commands', () => {
      const commands = registry.list()
      expect(commands.length).toBeGreaterThan(0)
    })

    it('should register all expected built-in commands', () => {
      const commands = registry.list()
      const commandNames = commands.map((cmd) => cmd.name)

      // Verify key commands are registered
      expect(commandNames).toContain('model')
      expect(commandNames).toContain('cost')
      expect(commandNames).toContain('context')
      expect(commandNames).toContain('clear')
      expect(commandNames).toContain('rewind')
      expect(commandNames).toContain('usage')
      expect(commandNames).toContain('add-dir')
      expect(commandNames).toContain('memory')
      expect(commandNames).toContain('compact')
      expect(commandNames).toContain('config')
      expect(commandNames).toContain('doctor')
      expect(commandNames).toContain('status')
      expect(commandNames).toContain('permissions')
      expect(commandNames).toContain('mcp')
      expect(commandNames).toContain('agents')
      expect(commandNames).toContain('review')
      expect(commandNames).toContain('pr_comments')
      expect(commandNames).toContain('init')
      expect(commandNames).toContain('login')
      expect(commandNames).toContain('logout')
      expect(commandNames).toContain('bug')
      expect(commandNames).toContain('terminal-setup')
      expect(commandNames).toContain('help')
    })
  })

  describe('register', () => {
    it('should register a custom command', () => {
      const customCommand: Command = {
        name: 'custom',
        description: 'Custom test command',
        category: 'system',
        execute: vi.fn().mockResolvedValue({ success: true }),
      }

      registry.register(customCommand)

      const commands = registry.list()
      expect(commands).toContainEqual(customCommand)
    })

    it('should allow overriding built-in commands', async () => {
      const customExecute = vi.fn().mockResolvedValue({
        success: true,
        message: 'Custom model command',
      })

      const overrideCommand: Command = {
        name: 'model',
        description: 'Custom model command',
        category: 'ai',
        execute: customExecute,
      }

      registry.register(overrideCommand)

      await registry.execute('model')
      expect(customExecute).toHaveBeenCalled()
    })
  })

  describe('execute', () => {
    it('should return error for non-existent command', async () => {
      const result = await registry.execute('non-existent')

      expect(result.success).toBe(false)
      expect(result.message).toBe("Command 'non-existent' not found")
    })

    it('should execute a command successfully', async () => {
      const result = await registry.execute('model')

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ action: 'show-model-selector' })
    })

    it('should handle command execution errors with Error instance', async () => {
      const errorCommand: Command = {
        name: 'error-cmd',
        description: 'Command that throws error',
        category: 'system',
        execute: vi.fn().mockRejectedValue(new Error('Test error')),
      }

      registry.register(errorCommand)

      const result = await registry.execute('error-cmd')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Test error')
    })

    it('should handle command execution errors with non-Error instance', async () => {
      const errorCommand: Command = {
        name: 'non-error-cmd',
        description: 'Command that throws non-error',
        category: 'system',
        execute: vi.fn().mockRejectedValue('String error'),
      }

      registry.register(errorCommand)

      const result = await registry.execute('non-error-cmd')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Unknown error occurred')
    })

    it('should pass arguments to command', async () => {
      const mockExecute = vi.fn().mockResolvedValue({ success: true })
      const argCommand: Command = {
        name: 'arg-cmd',
        description: 'Command with args',
        category: 'system',
        execute: mockExecute,
      }

      registry.register(argCommand)

      await registry.execute('arg-cmd', ['arg1', 'arg2'])

      expect(mockExecute).toHaveBeenCalledWith(['arg1', 'arg2'])
    })
  })

  describe('list', () => {
    it('should return all registered commands', () => {
      const commands = registry.list()

      expect(Array.isArray(commands)).toBe(true)
      expect(commands.length).toBeGreaterThan(0)
    })

    it('should return commands with all required properties', () => {
      const commands = registry.list()

      commands.forEach((cmd) => {
        expect(cmd).toHaveProperty('name')
        expect(cmd).toHaveProperty('description')
        expect(cmd).toHaveProperty('category')
        expect(cmd).toHaveProperty('execute')
        expect(typeof cmd.name).toBe('string')
        expect(typeof cmd.description).toBe('string')
        expect(typeof cmd.execute).toBe('function')
      })
    })

    it('should return array copy, not internal map reference', () => {
      const list1 = registry.list()
      const list2 = registry.list()

      expect(list1).not.toBe(list2)
      expect(list1).toEqual(list2)
    })
  })

  describe('search', () => {
    it('should find commands by name', () => {
      const results = registry.search('model')

      expect(results.length).toBeGreaterThan(0)
      expect(results.some((cmd) => cmd.name === 'model')).toBe(true)
    })

    it('should find commands by description', () => {
      const results = registry.search('costs')

      expect(results.length).toBeGreaterThan(0)
      expect(results.some((cmd) => cmd.name === 'cost')).toBe(true)
    })

    it('should be case-insensitive', () => {
      const lowerResults = registry.search('model')
      const upperResults = registry.search('MODEL')
      const mixedResults = registry.search('MoDel')

      expect(lowerResults).toEqual(upperResults)
      expect(lowerResults).toEqual(mixedResults)
    })

    it('should return empty array for no matches', () => {
      const results = registry.search('nonexistent-xyz-123')

      expect(results).toEqual([])
    })

    it('should match partial strings', () => {
      const results = registry.search('per')

      expect(results.length).toBeGreaterThan(0)
      expect(results.some((cmd) => cmd.name === 'permissions')).toBe(true)
    })
  })

  describe('Built-in commands', () => {
    describe('AI Commands', () => {
      it('should execute model command', async () => {
        const result = await registry.execute('model')

        expect(result.success).toBe(true)
        expect(result.data).toEqual({ action: 'show-model-selector' })
      })

      it('should execute agents command without args', async () => {
        const result = await registry.execute('agents')

        expect(result.success).toBe(true)
        expect(result.data).toEqual({
          action: 'show-agents-manager',
          agentAction: undefined,
        })
      })

      it('should execute agents command with action', async () => {
        const result = await registry.execute('agents', ['list'])

        expect(result.success).toBe(true)
        expect(result.data).toEqual({
          action: 'show-agents-manager',
          agentAction: 'list',
        })
      })

      it('should execute review command with scope', async () => {
        const result = await registry.execute('review', ['current'])

        expect(result.success).toBe(true)
        expect(result.data).toEqual({
          action: 'show-code-review',
          scope: 'current',
        })
      })
    })

    describe('Metrics Commands', () => {
      it('should execute cost command', async () => {
        const result = await registry.execute('cost')

        expect(result.success).toBe(true)
        expect(result.data).toEqual({ action: 'show-cost-panel' })
      })

      it('should execute context command', async () => {
        const result = await registry.execute('context')

        expect(result.success).toBe(true)
        expect(result.data).toEqual({ action: 'show-context-panel' })
      })

      it('should execute usage command', async () => {
        const result = await registry.execute('usage')

        expect(result.success).toBe(true)
        expect(result.data).toEqual({ action: 'show-usage-panel' })
      })
    })

    describe('Session Commands', () => {
      it('should execute clear command', async () => {
        const result = await registry.execute('clear')

        expect(result.success).toBe(true)
        expect(result.data).toEqual({ action: 'clear-conversation' })
      })

      it('should execute rewind command with default steps', async () => {
        const result = await registry.execute('rewind')

        expect(result.success).toBe(true)
        expect(result.data).toEqual({
          action: 'rewind-conversation',
          steps: 1,
        })
      })

      it('should execute rewind command with specified steps', async () => {
        const result = await registry.execute('rewind', ['3'])

        expect(result.success).toBe(true)
        expect(result.data).toEqual({
          action: 'rewind-conversation',
          steps: 3,
        })
      })

      it('should return error for invalid rewind steps (NaN)', async () => {
        const result = await registry.execute('rewind', ['abc'])

        expect(result.success).toBe(false)
        expect(result.message).toBe('Invalid number of steps')
      })

      it('should return error for invalid rewind steps (< 1)', async () => {
        const result = await registry.execute('rewind', ['0'])

        expect(result.success).toBe(false)
        expect(result.message).toBe('Invalid number of steps')
      })

      it('should return error for negative rewind steps', async () => {
        const result = await registry.execute('rewind', ['-5'])

        expect(result.success).toBe(false)
        expect(result.message).toBe('Invalid number of steps')
      })
    })

    describe('Context Commands', () => {
      it('should execute add-dir command with directory', async () => {
        const result = await registry.execute('add-dir', ['/path/to/dir'])

        expect(result.success).toBe(true)
        expect(result.data).toEqual({
          action: 'add-directory-to-context',
          directory: '/path/to/dir',
        })
      })

      it('should return error for add-dir without directory', async () => {
        const result = await registry.execute('add-dir')

        expect(result.success).toBe(false)
        expect(result.message).toBe('Directory path required')
      })

      it('should return error for add-dir with empty array', async () => {
        const result = await registry.execute('add-dir', [])

        expect(result.success).toBe(false)
        expect(result.message).toBe('Directory path required')
      })

      it('should execute memory command', async () => {
        const result = await registry.execute('memory')

        expect(result.success).toBe(true)
        expect(result.data).toEqual({ action: 'show-memory-settings' })
      })
    })

    describe('System Commands', () => {
      it('should execute compact command without instructions', async () => {
        const result = await registry.execute('compact')

        expect(result.success).toBe(true)
        expect(result.data).toEqual({
          action: 'compact-conversation',
          instructions: undefined,
        })
      })

      it('should execute compact command with empty args', async () => {
        const result = await registry.execute('compact', [])

        expect(result.success).toBe(true)
        expect(result.data).toEqual({
          action: 'compact-conversation',
          instructions: undefined,
        })
      })

      it('should execute compact command with instructions', async () => {
        const result = await registry.execute('compact', [
          'Keep',
          'only',
          'important',
        ])

        expect(result.success).toBe(true)
        expect(result.data).toEqual({
          action: 'compact-conversation',
          instructions: 'Keep only important',
        })
      })

      it('should execute config command', async () => {
        const result = await registry.execute('config')

        expect(result.success).toBe(true)
        expect(result.data).toEqual({ action: 'show-config-settings' })
      })

      it('should execute doctor command', async () => {
        const result = await registry.execute('doctor')

        expect(result.success).toBe(true)
        expect(result.data).toEqual({ action: 'show-system-diagnostics' })
      })

      it('should execute status command', async () => {
        const result = await registry.execute('status')

        expect(result.success).toBe(true)
        expect(result.data).toEqual({ action: 'show-system-status' })
      })

      it('should execute permissions command', async () => {
        const result = await registry.execute('permissions')

        expect(result.success).toBe(true)
        expect(result.data).toEqual({ action: 'show-permissions-manager' })
      })

      it('should execute mcp command without action', async () => {
        const result = await registry.execute('mcp')

        expect(result.success).toBe(true)
        expect(result.data).toEqual({
          action: 'show-mcp-manager',
          mcpAction: undefined,
        })
      })

      it('should execute mcp command with action', async () => {
        const result = await registry.execute('mcp', ['list'])

        expect(result.success).toBe(true)
        expect(result.data).toEqual({
          action: 'show-mcp-manager',
          mcpAction: 'list',
        })
      })

      it('should execute bug command', async () => {
        const result = await registry.execute('bug')

        expect(result.success).toBe(true)
        expect(result.data).toEqual({ action: 'show-bug-report' })
      })

      it('should execute terminal-setup command', async () => {
        const result = await registry.execute('terminal-setup')

        expect(result.success).toBe(true)
        expect(result.data).toEqual({ action: 'show-terminal-setup' })
      })

      it('should execute help command without topic', async () => {
        const result = await registry.execute('help')

        expect(result.success).toBe(true)
        expect(result.data).toEqual({
          action: 'show-help',
          topic: undefined,
        })
      })

      it('should execute help command with topic', async () => {
        const result = await registry.execute('help', ['commands'])

        expect(result.success).toBe(true)
        expect(result.data).toEqual({
          action: 'show-help',
          topic: 'commands',
        })
      })
    })

    describe('Git Commands', () => {
      it('should execute pr_comments command without PR number', async () => {
        const result = await registry.execute('pr_comments')

        expect(result.success).toBe(true)
        expect(result.data).toEqual({
          action: 'show-pr-comments',
          prNumber: undefined,
        })
      })

      it('should execute pr_comments command with PR number', async () => {
        const result = await registry.execute('pr_comments', ['123'])

        expect(result.success).toBe(true)
        expect(result.data).toEqual({
          action: 'show-pr-comments',
          prNumber: '123',
        })
      })
    })

    describe('Project Commands', () => {
      it('should execute init command', async () => {
        const result = await registry.execute('init')

        expect(result.success).toBe(true)
        expect(result.data).toEqual({ action: 'show-project-init' })
      })
    })

    describe('Auth Commands', () => {
      it('should execute login command', async () => {
        const result = await registry.execute('login')

        expect(result.success).toBe(true)
        expect(result.data).toEqual({ action: 'show-login' })
      })

      it('should execute logout command', async () => {
        const result = await registry.execute('logout')

        expect(result.success).toBe(true)
        expect(result.data).toEqual({ action: 'show-logout' })
      })
    })
  })
})
