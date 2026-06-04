/**
 * @fileoverview Command system types.
 *
 * @description
 * Type definitions for the command registry system that allows
 * executing commands like model switching, cost viewing, etc.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

/**
 * Command category for grouping related commands.
 *
 * @public
 */
export type CommandCategory =
  | 'ai'
  | 'session'
  | 'metrics'
  | 'system'
  | 'context'
  | 'git'
  | 'project'
  | 'auth'

/**
 * Result of executing a command.
 *
 * @public
 */
export interface CommandResult {
  /** Whether the command executed successfully */
  success: boolean

  /** Optional message (error or success) */
  message?: string

  /** Optional data returned by the command */
  data?: Record<string, unknown>
}

/**
 * Command definition interface.
 *
 * @public
 */
export interface Command {
  /** Unique command name (e.g., "model", "cost") */
  name: string

  /** Human-readable description */
  description: string

  /** Command category for grouping */
  category: CommandCategory

  /** Command execution function */
  execute: (args?: string[]) => Promise<CommandResult>
}
