/**
 * @fileoverview Command registry for managing and executing commands.
 *
 * @description
 * Central registry for all available commands. Handles registration,
 * lookup, search, and execution of commands like model switching,
 * cost viewing, context management, etc.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import type { Command, CommandResult } from './types'

/**
 * Registry for managing available commands.
 *
 * @remarks
 * Provides command registration, search, and execution capabilities.
 * Built-in commands are registered during instantiation.
 *
 * @example
 * ```typescript
 * const registry = new CommandRegistry()
 * const result = await registry.execute('model')
 * ```
 *
 * @public
 */
export class CommandRegistry {
  private commands = new Map<string, Command>()

  constructor() {
    this.registerBuiltInCommands()
  }

  /**
   * Register a command in the registry.
   *
   * @param command - Command to register
   *
   * @public
   */
  register(command: Command): void {
    this.commands.set(command.name, command)
  }

  /**
   * Execute a command by name.
   *
   * @param commandName - Name of the command to execute
   * @param args - Optional arguments to pass to the command
   * @returns Result of command execution
   *
   * @throws Error if command execution fails
   *
   * @public
   */
  async execute(commandName: string, args?: string[]): Promise<CommandResult> {
    const command = this.commands.get(commandName)

    if (!command) {
      return {
        success: false,
        message: `Command '${commandName}' not found`,
      }
    }

    try {
      return await command.execute(args)
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Get list of all registered commands.
   *
   * @returns Array of all commands
   *
   * @public
   */
  list(): Command[] {
    return Array.from(this.commands.values())
  }

  /**
   * Search commands by query string.
   *
   * @param query - Search query (matches name or description)
   * @returns Array of matching commands
   *
   * @public
   */
  search(query: string): Command[] {
    const lowerQuery = query.toLowerCase()

    return this.list().filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(lowerQuery) ||
        cmd.description.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * Register built-in commands.
   *
   * @private
   */
  private registerBuiltInCommands(): void {
    // AI Commands
    this.register({
      name: 'model',
      description: 'Switch AI model',
      category: 'ai',
      execute: async () => ({
        success: true,
        data: { action: 'show-model-selector' },
      }),
    })

    // Metrics Commands
    this.register({
      name: 'cost',
      description: 'View API costs and usage',
      category: 'metrics',
      execute: async () => ({
        success: true,
        data: { action: 'show-cost-panel' },
      }),
    })

    this.register({
      name: 'context',
      description: 'View context usage',
      category: 'metrics',
      execute: async () => ({
        success: true,
        data: { action: 'show-context-panel' },
      }),
    })

    // Session Commands
    this.register({
      name: 'clear',
      description: 'Clear conversation',
      category: 'session',
      execute: async () => ({
        success: true,
        data: { action: 'clear-conversation' },
      }),
    })

    this.register({
      name: 'rewind',
      description: 'Undo last message(s)',
      category: 'session',
      execute: async (args) => {
        const steps = args?.[0] ? parseInt(args[0], 10) : 1

        if (isNaN(steps) || steps < 1) {
          return {
            success: false,
            message: 'Invalid number of steps',
          }
        }

        return {
          success: true,
          data: { action: 'rewind-conversation', steps },
        }
      },
    })

    // Additional Metrics Commands
    this.register({
      name: 'usage',
      description: 'View plan limits and quotas',
      category: 'metrics',
      execute: async () => ({
        success: true,
        data: { action: 'show-usage-panel' },
      }),
    })

    // Context Management Commands
    this.register({
      name: 'add-dir',
      description: 'Add directory to context',
      category: 'context',
      execute: async (args) => {
        const directory = args?.[0]

        if (!directory) {
          return {
            success: false,
            message: 'Directory path required',
          }
        }

        return {
          success: true,
          data: { action: 'add-directory-to-context', directory },
        }
      },
    })

    this.register({
      name: 'memory',
      description: 'Manage AI memory settings',
      category: 'context',
      execute: async () => ({
        success: true,
        data: { action: 'show-memory-settings' },
      }),
    })

    // System Commands
    this.register({
      name: 'compact',
      description: 'Compact conversation to save context',
      category: 'system',
      execute: async (args) => {
        const instructions = args?.join(' ')

        return {
          success: true,
          data: {
            action: 'compact-conversation',
            instructions: instructions || undefined,
          },
        }
      },
    })

    this.register({
      name: 'config',
      description: 'Open configuration settings',
      category: 'system',
      execute: async () => ({
        success: true,
        data: { action: 'show-config-settings' },
      }),
    })

    this.register({
      name: 'doctor',
      description: 'Check system health and diagnostics',
      category: 'system',
      execute: async () => ({
        success: true,
        data: { action: 'show-system-diagnostics' },
      }),
    })

    this.register({
      name: 'status',
      description: 'View system status and metrics',
      category: 'system',
      execute: async () => ({
        success: true,
        data: { action: 'show-system-status' },
      }),
    })

    this.register({
      name: 'permissions',
      description: 'View and update tool permissions',
      category: 'system',
      execute: async () => ({
        success: true,
        data: { action: 'show-permissions-manager' },
      }),
    })

    this.register({
      name: 'mcp',
      description: 'Manage MCP server connections',
      category: 'system',
      execute: async (args) => {
        const action = args?.[0] // e.g., 'list', 'add', 'remove'
        return {
          success: true,
          data: { action: 'show-mcp-manager', mcpAction: action },
        }
      },
    })

    this.register({
      name: 'agents',
      description: 'Manage custom AI subagents',
      category: 'ai',
      execute: async (args) => {
        const action = args?.[0] // e.g., 'list', 'create', 'edit'
        return {
          success: true,
          data: { action: 'show-agents-manager', agentAction: action },
        }
      },
    })

    this.register({
      name: 'review',
      description: 'Request code review',
      category: 'ai',
      execute: async (args) => {
        const scope = args?.[0] // e.g., 'current', 'all', specific file
        return {
          success: true,
          data: { action: 'show-code-review', scope },
        }
      },
    })

    this.register({
      name: 'pr_comments',
      description: 'View pull request comments',
      category: 'git',
      execute: async (args) => {
        const prNumber = args?.[0] // PR number
        return {
          success: true,
          data: { action: 'show-pr-comments', prNumber },
        }
      },
    })

    this.register({
      name: 'init',
      description: 'Initialize project with CLAUDE.md',
      category: 'project',
      execute: async () => ({
        success: true,
        data: { action: 'show-project-init' },
      }),
    })

    // Authentication Commands
    this.register({
      name: 'login',
      description: 'Login to your account',
      category: 'auth',
      execute: async () => ({
        success: true,
        data: { action: 'show-login' },
      }),
    })

    this.register({
      name: 'logout',
      description: 'Logout from your account',
      category: 'auth',
      execute: async () => ({
        success: true,
        data: { action: 'show-logout' },
      }),
    })

    // Support Commands
    this.register({
      name: 'bug',
      description: 'Report a bug',
      category: 'system',
      execute: async () => ({
        success: true,
        data: { action: 'show-bug-report' },
      }),
    })

    this.register({
      name: 'terminal-setup',
      description: 'Configure terminal settings',
      category: 'system',
      execute: async () => ({
        success: true,
        data: { action: 'show-terminal-setup' },
      }),
    })

    this.register({
      name: 'help',
      description: 'Show help and documentation',
      category: 'system',
      execute: async (args) => {
        const topic = args?.[0] // Optional help topic
        return {
          success: true,
          data: { action: 'show-help', topic },
        }
      },
    })
  }
}
