/**
 * @fileoverview Commands IPC handlers for Electron.
 *
 * @description
 * Sets up IPC handlers for command execution, listing, and searching.
 * Provides bridge between renderer process command palette and main process
 * command registry.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { ipcMain } from 'electron'
import { CommandRegistry } from '@hatcherdx/ai-cli'
import type { Command, CommandResult } from '@hatcherdx/ai-cli'

// Singleton command registry instance
const commandRegistry = new CommandRegistry()

/**
 * Setup IPC handlers for commands system.
 *
 * @remarks
 * Registers handlers for listing, searching, and executing commands.
 * Must be called during app initialization.
 *
 * @example
 * ```typescript
 * setupCommandsIPC()
 * ```
 *
 * @public
 */
export function setupCommandsIPC(): void {
  /**
   * List all available commands.
   *
   * @returns Array of all registered commands (without execute functions)
   */
  ipcMain.handle('commands:list', async () => {
    const commands = commandRegistry.list()
    // Return only serializable data (exclude execute function)
    return commands.map((cmd) => ({
      name: cmd.name,
      description: cmd.description,
      category: cmd.category,
    }))
  })

  /**
   * Search commands by query string.
   *
   * @param query - Search term
   * @returns Array of matching commands
   */
  ipcMain.handle(
    'commands:search',
    async (_, query: string): Promise<Command[]> => {
      return commandRegistry.search(query)
    }
  )

  /**
   * Execute a command by name.
   *
   * @param commandName - Name of command to execute
   * @param args - Optional command arguments
   * @returns Result of command execution
   */
  ipcMain.handle(
    'commands:execute',
    async (_, commandName: string, args?: string[]): Promise<CommandResult> => {
      return await commandRegistry.execute(commandName, args)
    }
  )

  console.log('[commandsIPC] Commands IPC handlers registered')
}
