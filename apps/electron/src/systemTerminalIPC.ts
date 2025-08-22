/**
 * @fileoverview System Terminal IPC Handlers for Electron Main Process.
 *
 * @description
 * Electron Main Process handlers for System and Timeline terminals using
 * the proper Electron architecture with IPC communication. Integrates
 * with SystemLogger and GitCommandLogger to provide read-only terminal
 * functionality with professional logging.
 *
 * @example
 * ```typescript
 * import { initializeSystemTerminalIPC } from './systemTerminalIPC'
 *
 * // Initialize system terminal IPC handlers
 * initializeSystemTerminalIPC()
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { BrowserWindow, ipcMain } from 'electron'
import {
  systemLogger,
  readOnlyTerminalManager,
  type SystemEvent,
  type SystemTerminalType,
  type ReadOnlyTerminalState,
  type ReadOnlyTerminalLine,
  type TerminalOutputEvent,
} from '@hatcherdx/terminal-system'

/**
 * System terminal initialization options.
 *
 * @public
 */
interface SystemTerminalInitOptions {
  /** Project metadata for context initialization */
  projectType?: string
  projectName?: string
  projectPath?: string
  packageManager?: string
}

/**
 * System log request interface.
 *
 * @public
 */
interface SystemLogRequest {
  /** Log level */
  level: 'info' | 'warn' | 'error'
  /** Log message */
  message: string
  /** Terminal to log to (system | timeline) */
  terminal?: SystemTerminalType
  /** Additional context */
  context?: Record<string, unknown>
}

/**
 * Git operation request interface.
 *
 * @public
 */
interface GitOperationRequest {
  /** Operation name (e.g., 'status', 'commit') */
  operation: string
  /** Operation arguments */
  args?: unknown[]
  /** Additional context */
  context?: Record<string, unknown>
}

// Main process system terminal state
let isSystemTerminalsInitialized = false

/**
 * Initialize System Terminal IPC handlers.
 *
 * @remarks
 * Sets up IPC handlers for system terminal operations including:
 * - System terminal initialization
 * - System logging (INFO, WARN, ERROR)
 * - Git operation logging with Causa-Efecto pattern
 * - Terminal state management
 * - Event broadcasting to renderer processes
 *
 * @public
 */
export function initializeSystemTerminalIPC(): void {
  console.log('[System Terminal IPC] Initializing system terminal handlers...')

  try {
    // Setup system event listeners
    setupSystemEventListeners()

    // Setup IPC handlers
    setupSystemTerminalHandlers()

    console.log(
      '[System Terminal IPC] System terminal IPC initialized successfully'
    )
  } catch (error) {
    console.error(
      '[System Terminal IPC] Failed to initialize system terminal IPC:',
      error
    )
    throw error
  }
}

/**
 * Setup system event listeners for broadcasting to renderer processes.
 *
 * @private
 */
function setupSystemEventListeners(): void {
  // Listen for system events from SystemLogger
  systemLogger.on('systemEvent', (event: SystemEvent) => {
    // Broadcast system event to all renderer processes
    broadcastToRenderers('system-terminal-event', {
      event,
      terminal: event.terminal,
    })
  })

  // Listen for terminal output events from ReadOnlyTerminalManager
  readOnlyTerminalManager.on('terminalOutput', (event: TerminalOutputEvent) => {
    // Broadcast terminal output to all renderer processes
    broadcastToRenderers('system-terminal-output', event)
  })

  // Listen for terminal activation events
  readOnlyTerminalManager.on(
    'terminalActivated',
    (terminal: ReadOnlyTerminalState) => {
      // Broadcast terminal activation to all renderer processes
      broadcastToRenderers('system-terminal-activated', {
        terminalId: terminal.id,
        terminalType: terminal.type,
      })
    }
  )

  // Listen for terminal cleared events
  readOnlyTerminalManager.on(
    'terminalCleared',
    (terminal: ReadOnlyTerminalState) => {
      // Broadcast terminal cleared to all renderer processes
      broadcastToRenderers('system-terminal-cleared', {
        terminalId: terminal.id,
        terminalType: terminal.type,
      })
    }
  )
}

/**
 * Setup IPC handlers for system terminal operations.
 *
 * @private
 */
function setupSystemTerminalHandlers(): void {
  // Initialize system terminals
  ipcMain.handle(
    'system-terminal-initialize',
    async (event, options: SystemTerminalInitOptions = {}) => {
      try {
        if (isSystemTerminalsInitialized) {
          return {
            success: true,
            message: 'System terminals already initialized',
            data: {
              systemTerminal: readOnlyTerminalManager.getTerminal('system'),
              timelineTerminal: readOnlyTerminalManager.getTerminal('timeline'),
            },
          }
        }

        // Initialize system terminals
        await readOnlyTerminalManager.initializeSystemTerminals()

        // Log initialization with project context
        if (options.projectName) {
          systemLogger.info(
            `Initializing Hatcher workspace: ${options.projectName}`
          )
        } else {
          systemLogger.info('Initializing Hatcher workspace...')
        }

        if (options.projectType && options.packageManager) {
          systemLogger.info(
            `Project detected: ${options.projectType} with ${options.packageManager}`
          )
        }

        isSystemTerminalsInitialized = true

        // Get terminal states
        const systemTerminal = readOnlyTerminalManager.getTerminal('system')
        const timelineTerminal = readOnlyTerminalManager.getTerminal('timeline')

        return {
          success: true,
          message: 'System terminals initialized successfully',
          data: {
            systemTerminal,
            timelineTerminal,
          },
        }
      } catch (error) {
        console.error(
          '[System Terminal IPC] Failed to initialize system terminals:',
          error
        )
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to initialize system terminals',
        }
      }
    }
  )

  // System logging
  ipcMain.handle(
    'system-terminal-log',
    async (event, request: SystemLogRequest) => {
      try {
        const { level, message, terminal = 'system', context } = request

        switch (level) {
          case 'info':
            systemLogger.info(message, terminal, context)
            break
          case 'warn':
            systemLogger.warn(message, terminal, context)
            break
          case 'error':
            systemLogger.error(message, terminal, context)
            break
          default:
            systemLogger.info(message, terminal, context)
        }

        return { success: true }
      } catch (error) {
        console.error(
          '[System Terminal IPC] Failed to log system message:',
          error
        )
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to log system message',
        }
      }
    }
  )

  // Git operation logging with Causa-Efecto
  ipcMain.handle(
    'system-terminal-git-operation',
    async (event, request: GitOperationRequest) => {
      try {
        const { operation, args, context } = request

        // Log the git operation using GitCommandLogger
        // Since this is IPC, we simulate the operation completion
        const startTime = Date.now()

        // Log CAUSA (command execution)
        systemLogger.logCommand(`git-genius.${operation}`, args, 'timeline')

        // Simulate operation completion time
        const executionTime = Date.now() - startTime

        // Log EFECTO (result) - in real implementation, this would be the actual result
        const message = formatGitOperationMessage(operation, executionTime)
        systemLogger.logResult('GIT', message, 'timeline', {
          operation,
          args,
          executionTime,
          context,
        })

        return {
          success: true,
          message,
          executionTime,
        }
      } catch (error) {
        console.error(
          '[System Terminal IPC] Failed to log git operation:',
          error
        )
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to log git operation',
        }
      }
    }
  )

  // Get terminal state
  ipcMain.handle(
    'system-terminal-get',
    async (event, terminalType: SystemTerminalType) => {
      try {
        const terminal = readOnlyTerminalManager.getTerminal(terminalType)

        if (!terminal) {
          return {
            success: false,
            error: `Terminal '${terminalType}' not found`,
          }
        }

        return {
          success: true,
          data: terminal,
        }
      } catch (error) {
        console.error(
          `[System Terminal IPC] Failed to get terminal '${terminalType}':`,
          error
        )
        return {
          success: false,
          error:
            error instanceof Error ? error.message : 'Failed to get terminal',
        }
      }
    }
  )

  // Get all system terminals
  ipcMain.handle('system-terminal-list', async () => {
    try {
      const terminals = readOnlyTerminalManager.getAllTerminals()

      return {
        success: true,
        data: terminals,
      }
    } catch (error) {
      console.error(
        '[System Terminal IPC] Failed to list system terminals:',
        error
      )
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to list system terminals',
      }
    }
  })

  // Set active terminal
  ipcMain.handle(
    'system-terminal-set-active',
    async (event, terminalType: SystemTerminalType) => {
      try {
        const success = readOnlyTerminalManager.setActiveTerminal(terminalType)

        if (!success) {
          return {
            success: false,
            error: `Failed to activate terminal '${terminalType}'`,
          }
        }

        return { success: true }
      } catch (error) {
        console.error(
          `[System Terminal IPC] Failed to set active terminal '${terminalType}':`,
          error
        )
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to set active terminal',
        }
      }
    }
  )

  // Clear terminal
  ipcMain.handle(
    'system-terminal-clear',
    async (event, terminalType: SystemTerminalType) => {
      try {
        const success = readOnlyTerminalManager.clearTerminal(terminalType)

        if (!success) {
          return {
            success: false,
            error: `Failed to clear terminal '${terminalType}'`,
          }
        }

        return { success: true }
      } catch (error) {
        console.error(
          `[System Terminal IPC] Failed to clear terminal '${terminalType}':`,
          error
        )
        return {
          success: false,
          error:
            error instanceof Error ? error.message : 'Failed to clear terminal',
        }
      }
    }
  )

  // Get terminal lines with filtering
  ipcMain.handle(
    'system-terminal-get-lines',
    async (
      event,
      terminalType: SystemTerminalType,
      options: {
        limit?: number
        type?: ReadOnlyTerminalLine['type']
        since?: string // ISO string
      } = {}
    ) => {
      try {
        const filterOptions = {
          ...options,
          since: options.since ? new Date(options.since) : undefined,
        }

        const lines = readOnlyTerminalManager.getTerminalLines(
          terminalType,
          filterOptions
        )

        return {
          success: true,
          data: lines,
        }
      } catch (error) {
        console.error(
          `[System Terminal IPC] Failed to get lines for terminal '${terminalType}':`,
          error
        )
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to get terminal lines',
        }
      }
    }
  )

  // Update terminal configuration
  ipcMain.handle(
    'system-terminal-update-config',
    async (
      event,
      terminalType: SystemTerminalType,
      config: {
        autoScroll?: boolean
        maxLines?: number
      }
    ) => {
      try {
        const success = readOnlyTerminalManager.updateTerminalConfig(
          terminalType,
          config
        )

        if (!success) {
          return {
            success: false,
            error: `Failed to update terminal '${terminalType}' configuration`,
          }
        }

        return { success: true }
      } catch (error) {
        console.error(
          `[System Terminal IPC] Failed to update terminal '${terminalType}' config:`,
          error
        )
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to update terminal configuration',
        }
      }
    }
  )
}

/**
 * Broadcast message to all renderer processes.
 *
 * @param channel - IPC channel name
 * @param data - Data to broadcast
 *
 * @private
 */
function broadcastToRenderers(channel: string, data: unknown): void {
  const windows = BrowserWindow.getAllWindows()
  windows.forEach((window) => {
    if (window.webContents && !window.webContents.isDestroyed()) {
      window.webContents.send(channel, data)
    }
  })
}

/**
 * Format git operation success message.
 *
 * @param operation - Git operation name
 * @param executionTime - Execution time in milliseconds
 * @returns Formatted message
 *
 * @private
 */
function formatGitOperationMessage(
  operation: string,
  executionTime: number
): string {
  const timeStr =
    executionTime > 1000
      ? `${(executionTime / 1000).toFixed(1)}s`
      : `${executionTime}ms`

  switch (operation.toLowerCase()) {
    case 'status':
      return `Repository status retrieved (${timeStr})`
    case 'commit':
      return `Commit created successfully (${timeStr})`
    case 'push':
      return `Changes pushed to remote repository (${timeStr})`
    case 'pull':
      return `Changes pulled from remote repository (${timeStr})`
    case 'checkout':
    case 'switch':
      return `Branch switch completed (${timeStr})`
    case 'clone':
      return `Repository cloned successfully (${timeStr})`
    case 'add':
      return `Files staged for commit (${timeStr})`
    case 'branch':
      return `Branch operation completed (${timeStr})`
    case 'log':
      return `Commit history retrieved (${timeStr})`
    default:
      return `Git ${operation} completed successfully (${timeStr})`
  }
}

/**
 * Cleanup system terminal IPC handlers.
 *
 * @public
 */
export function destroySystemTerminalIPC(): void {
  console.log('[System Terminal IPC] Destroying system terminal handlers...')

  // Remove all IPC handlers
  ipcMain.removeHandler('system-terminal-initialize')
  ipcMain.removeHandler('system-terminal-log')
  ipcMain.removeHandler('system-terminal-git-operation')
  ipcMain.removeHandler('system-terminal-get')
  ipcMain.removeHandler('system-terminal-list')
  ipcMain.removeHandler('system-terminal-set-active')
  ipcMain.removeHandler('system-terminal-clear')
  ipcMain.removeHandler('system-terminal-get-lines')
  ipcMain.removeHandler('system-terminal-update-config')

  // Reset initialization state
  isSystemTerminalsInitialized = false

  console.log('[System Terminal IPC] System terminal IPC destroyed')
}
