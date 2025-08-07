/**
 * Real Terminal IPC Handlers - VSCode Style Architecture
 * Replaces mock system with real node-pty implementation
 */

import { BrowserWindow, ipcMain } from 'electron'
import { PtyManager } from './ptyManager'

interface CreateTerminalOptions {
  name?: string
  shell?: string
  cwd?: string
  env?: Record<string, string>
  cols?: number
  rows?: number
}

interface TerminalResizeData {
  id: string
  cols: number
  rows: number
}

interface TerminalInputData {
  id: string
  data: string
}

// Global PTY Manager instance
let ptyManager: PtyManager | null = null

export function initializeTerminalSystem(): void {
  console.log('[Terminal IPC] Initializing real terminal system...')

  try {
    // Create PTY Manager
    ptyManager = new PtyManager()

    // Setup PTY Manager event handlers
    setupPtyManagerHandlers()

    // Setup IPC handlers
    setupTerminalIPCHandlers()

    console.log('[Terminal IPC] Real terminal system initialized successfully')
  } catch (error) {
    console.error('[Terminal IPC] Failed to initialize terminal system:', error)
    throw error
  }
}

function setupPtyManagerHandlers(): void {
  if (!ptyManager) return

  ptyManager.on('ready', () => {})

  ptyManager.on('error', (error: Error) => {
    console.error('[Terminal IPC] PTY Manager error:', error)
    // Broadcast error to all renderer processes
    broadcastToRenderers('terminal-error', { error: error.message })
  })

  ptyManager.on('terminal-data', (terminalId: string, data: string) => {
    // Broadcast terminal data to all renderer processes
    broadcastToRenderers('terminal-data', { id: terminalId, data })
  })

  ptyManager.on(
    'terminal-exit',
    (terminalId: string, exitCode: number, signal?: number) => {
      broadcastToRenderers('terminal-exit', {
        id: terminalId,
        exitCode,
        signal,
      })
    }
  )

  ptyManager.on('terminal-killed', (terminalId: string) => {
    broadcastToRenderers('terminal-killed', { id: terminalId })
  })
}

function broadcastToRenderers(channel: string, data: unknown): void {
  const windows = BrowserWindow.getAllWindows()
  windows.forEach((window) => {
    if (window.webContents && !window.webContents.isDestroyed()) {
      window.webContents.send(channel, data)
    }
  })
}

function setupTerminalIPCHandlers(): void {
  // Create terminal
  ipcMain.handle(
    'terminal-create',
    async (event, options: CreateTerminalOptions) => {
      try {
        if (!ptyManager) {
          throw new Error('PTY Manager not initialized')
        }

        const terminal = await ptyManager.createTerminal({
          shell: options.shell,
          cwd: options.cwd,
          env: options.env,
          cols: options.cols || 80,
          rows: options.rows || 24,
        })

        return {
          success: true,
          data: {
            id: terminal.id,
            name: options.name || `Terminal`,
            pid: terminal.pid,
            shell: terminal.shell,
            cwd: terminal.cwd,
          },
        }
      } catch (error) {
        console.error('[Terminal IPC] Failed to create terminal:', error)
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to create terminal',
        }
      }
    }
  )

  // Write data to terminal
  ipcMain.on('terminal-input', (event, data: TerminalInputData) => {
    try {
      if (!ptyManager) {
        console.error('[Terminal IPC] PTY Manager not initialized for input')
        return
      }

      ptyManager.writeToTerminal(data.id, data.data)
    } catch (error) {
      console.error(
        `[Terminal IPC] Failed to write to terminal ${data.id}:`,
        error
      )
    }
  })

  // Resize terminal
  ipcMain.on('terminal-resize', (event, data: TerminalResizeData) => {
    try {
      if (!ptyManager) {
        console.error('[Terminal IPC] PTY Manager not initialized for resize')
        return
      }

      ptyManager.resizeTerminal(data.id, data.cols, data.rows)
    } catch (error) {
      console.error(
        `[Terminal IPC] Failed to resize terminal ${data.id}:`,
        error
      )
    }
  })

  // Close terminal
  ipcMain.handle('terminal-close', async (event, terminalId: string) => {
    try {
      if (!ptyManager) {
        throw new Error('PTY Manager not initialized')
      }

      ptyManager.killTerminal(terminalId)

      return { success: true }
    } catch (error) {
      console.error(
        `[Terminal IPC] Failed to close terminal ${terminalId}:`,
        error
      )
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to close terminal',
      }
    }
  })

  // List all terminals
  ipcMain.handle('terminal-list', async () => {
    try {
      if (!ptyManager) {
        throw new Error('PTY Manager not initialized')
      }

      const terminals = await ptyManager.listTerminals()
      return { success: true, data: terminals }
    } catch (error) {
      console.error('[Terminal IPC] Failed to list terminals:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to list terminals',
      }
    }
  })

  // Get terminal by ID
  ipcMain.handle('terminal-get', async (event, terminalId: string) => {
    try {
      if (!ptyManager) {
        throw new Error('PTY Manager not initialized')
      }

      const terminals = await ptyManager.listTerminals()
      const terminal = terminals.find((t) => t.id === terminalId)

      if (!terminal) {
        return { success: false, error: 'Terminal not found' }
      }

      return { success: true, data: terminal }
    } catch (error) {
      console.error(
        `[Terminal IPC] Failed to get terminal ${terminalId}:`,
        error
      )
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to get terminal',
      }
    }
  })

  // Get performance metrics
  ipcMain.handle('terminal-performance-metrics', async () => {
    try {
      if (!ptyManager) {
        throw new Error('PTY Manager not initialized')
      }

      const metrics = ptyManager.getPerformanceMetrics()
      return { success: true, data: metrics }
    } catch (error) {
      console.error('[Terminal IPC] Failed to get performance metrics:', error)
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get performance metrics',
      }
    }
  })

  // Get terminal-specific performance metrics
  ipcMain.handle(
    'terminal-performance-metrics-terminal',
    async (event, terminalId: string, limit?: number) => {
      try {
        if (!ptyManager) {
          throw new Error('PTY Manager not initialized')
        }

        const metrics = ptyManager.getTerminalPerformanceMetrics(
          terminalId,
          limit
        )
        return { success: true, data: metrics }
      } catch (error) {
        console.error(
          `[Terminal IPC] Failed to get performance metrics for terminal ${terminalId}:`,
          error
        )
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to get terminal performance metrics',
        }
      }
    }
  )

  // Get terminal alerts
  ipcMain.handle(
    'terminal-performance-alerts',
    async (event, terminalId: string, limit?: number) => {
      try {
        if (!ptyManager) {
          throw new Error('PTY Manager not initialized')
        }

        const alerts = ptyManager.getTerminalAlerts(terminalId, limit)
        return { success: true, data: alerts }
      } catch (error) {
        console.error(
          `[Terminal IPC] Failed to get alerts for terminal ${terminalId}:`,
          error
        )
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to get terminal alerts',
        }
      }
    }
  )

  // Export performance data
  ipcMain.handle('terminal-performance-export', async () => {
    try {
      if (!ptyManager) {
        throw new Error('PTY Manager not initialized')
      }

      const data = ptyManager.exportPerformanceData()
      return { success: true, data }
    } catch (error) {
      console.error('[Terminal IPC] Failed to export performance data:', error)
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to export performance data',
      }
    }
  })
}

export function destroyTerminalSystem(): void {
  console.log('[Terminal IPC] Destroying terminal system...')

  if (ptyManager) {
    ptyManager.destroy()
    ptyManager = null
  }

  // Remove all IPC handlers
  ipcMain.removeHandler('terminal-create')
  ipcMain.removeHandler('terminal-close')
  ipcMain.removeHandler('terminal-list')
  ipcMain.removeHandler('terminal-get')
  ipcMain.removeAllListeners('terminal-input')
  ipcMain.removeAllListeners('terminal-resize')

  console.log('[Terminal IPC] Terminal system destroyed')
}
