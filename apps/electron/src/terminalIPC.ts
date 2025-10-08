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
  console.log('[Terminal IPC] 🚀 INITIALIZING real terminal system...')

  try {
    // Create PTY Manager
    console.log('[Terminal IPC] Step 1: Creating PTY Manager instance...')
    ptyManager = new PtyManager()
    console.log('[Terminal IPC] ✅ PTY Manager created successfully')

    // Setup PTY Manager event handlers
    console.log(
      '[Terminal IPC] Step 2: Setting up PTY Manager event handlers...'
    )
    setupPtyManagerHandlers()
    console.log('[Terminal IPC] ✅ PTY Manager handlers configured')

    // Setup IPC handlers
    console.log('[Terminal IPC] Step 3: Setting up Terminal IPC handlers...')
    setupTerminalIPCHandlers()
    console.log('[Terminal IPC] ✅ Terminal IPC handlers configured')

    // ENHANCED: Verify system is ready
    console.log('[Terminal IPC] Step 4: Verifying terminal system readiness...')
    if (ptyManager) {
      console.log('[Terminal IPC] ✅ PTY Manager instance is ready')
      console.log('[Terminal IPC] ✅ Event handlers are configured')
      console.log('[Terminal IPC] ✅ IPC handlers are registered')
    }

    console.log(
      '[Terminal IPC] 🎉 Real terminal system initialized successfully!'
    )
    console.log(
      '[Terminal IPC] System is ready to handle terminal creation and data flow'
    )
  } catch (error) {
    console.error(
      '[Terminal IPC] ❌ FAILED to initialize terminal system:',
      error
    )
    console.error('[Terminal IPC] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
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
    console.log('[Terminal IPC] 🔥 TERMINAL DATA RECEIVED from PTY Manager:', {
      terminalId,
      dataLength: data?.length,
      first50: data
        ?.substring(0, 50)
        .replace(/\r/g, '\\r')
        .replace(/\n/g, '\\n'),
      hasData: !!data,
      timestamp: new Date().toISOString(),
    })

    // ENHANCED: Validate data before processing
    if (!data || data.length === 0) {
      console.warn(
        '[Terminal IPC] ⚠️ Empty or null data received, skipping broadcast'
      )
      return
    }

    if (!terminalId) {
      console.error('[Terminal IPC] ❌ Invalid terminal ID, skipping broadcast')
      return
    }

    // Prepare payload for broadcast
    const payload = { id: terminalId, data }

    console.log('[Terminal IPC] 📦 PAYLOAD PREPARED:', {
      id: payload.id,
      dataLength: payload.data.length,
      payloadSizeBytes: JSON.stringify(payload).length,
      dataPreview: payload.data
        .substring(0, 100)
        .replace(/\r/g, '\\r')
        .replace(/\n/g, '\\n'),
    })

    // ENHANCED: Debug window states before broadcasting
    const windows = BrowserWindow.getAllWindows()
    console.log(
      `[Terminal IPC] 🪟 WINDOW ANALYSIS - Found ${windows.length} windows:`
    )
    windows.forEach((window, index) => {
      const webContentsReady =
        window.webContents && !window.webContents.isDestroyed()
      console.log(`[Terminal IPC] Window ${index}:`, {
        id: window.id,
        visible: window.isVisible(),
        focused: window.isFocused(),
        webContentsReady,
        destroyed: window.webContents?.isDestroyed(),
        loading: window.webContents?.isLoading(),
        crashed: window.webContents?.isCrashed(),
        readyToShow: webContentsReady && window.isVisible(),
      })
    })

    // ENHANCED: Broadcast with comprehensive error handling and retry logic
    console.log('[Terminal IPC] 🚀 BROADCASTING terminal-data to renderers...')
    broadcastToRenderers('terminal-data', payload)

    console.log('[Terminal IPC] ✅ BROADCAST COMPLETE for terminal data:', {
      terminalId,
      dataLength: data.length,
      windowCount: windows.length,
      timestamp: new Date().toISOString(),
    })
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
  console.log(
    `[Terminal IPC] 📡 BROADCASTING ${channel} to ${windows.length} windows`
  )

  // Enhanced data preview for debugging
  const dataPreview =
    typeof data === 'object' && data !== null
      ? JSON.stringify(data)
          .substring(0, 200)
          .replace(/\r/g, '\\r')
          .replace(/\n/g, '\\n')
      : String(data).substring(0, 200)
  console.log('[Terminal IPC] 📦 Data preview:', dataPreview)

  let successCount = 0
  let failureCount = 0

  windows.forEach((window, index) => {
    const windowId = window.id
    const webContents = window.webContents

    // Enhanced validation
    if (!webContents) {
      console.log(
        `[Terminal IPC] ⚠️ Window ${windowId} has no webContents, skipping`
      )
      failureCount++
      return
    }

    if (webContents.isDestroyed()) {
      console.log(
        `[Terminal IPC] ⚠️ Window ${windowId} webContents destroyed, skipping`
      )
      failureCount++
      return
    }

    console.log(`[Terminal IPC] 🎯 SENDING ${channel} to window ${windowId}:`, {
      windowIndex: index,
      windowVisible: window.isVisible(),
      webContentsState: {
        exists: !!webContents,
        destroyed: webContents.isDestroyed(),
        loading: webContents.isLoading(),
        crashed: webContents.isCrashed(),
      },
    })

    try {
      // CRITICAL: Use webContents.send with enhanced error handling
      webContents.send(channel, data)
      console.log(
        `[Terminal IPC] ✅ SUCCESS: ${channel} sent to window ${windowId}`
      )
      successCount++

      // ENHANCED: Verify the send operation completed
      setTimeout(() => {
        if (!webContents.isDestroyed()) {
          console.log(
            `[Terminal IPC] 🔍 POST-SEND VERIFICATION: Window ${windowId} still active`
          )
        }
      }, 10) // Quick verification
    } catch (error) {
      console.error(
        `[Terminal IPC] ❌ FAILED to send ${channel} to window ${windowId}:`,
        {
          error: error instanceof Error ? error.message : String(error),
          errorType: error instanceof Error ? error.name : typeof error,
          windowState: {
            id: windowId,
            visible: window.isVisible(),
            focused: window.isFocused(),
            webContentsDestroyed: webContents.isDestroyed(),
          },
        }
      )
      failureCount++

      // ENHANCED: Try to recover from certain errors
      if (
        error instanceof Error &&
        error.message.includes('Object has been destroyed')
      ) {
        console.log(
          `[Terminal IPC] 🔄 Window ${windowId} destroyed during send, this is expected behavior`
        )
      } else {
        console.error(
          `[Terminal IPC] 🚨 Unexpected error sending to window ${windowId}, may need investigation`
        )
      }
    }
  })

  // ENHANCED: Summary logging
  console.log(`[Terminal IPC] 📊 BROADCAST SUMMARY for ${channel}:`, {
    totalWindows: windows.length,
    successCount,
    failureCount,
    successRate:
      windows.length > 0
        ? `${Math.round((successCount / windows.length) * 100)}%`
        : '0%',
    timestamp: new Date().toISOString(),
  })

  // ENHANCED: Alert if no successful sends
  if (successCount === 0 && windows.length > 0) {
    console.error(
      `[Terminal IPC] 🚨 CRITICAL: No windows received ${channel} successfully!`
    )
    console.error(
      '[Terminal IPC] This indicates a serious data flow issue that needs immediate attention'
    )
  }
}

function setupTerminalIPCHandlers(): void {
  // Create terminal
  ipcMain.handle(
    'terminal-create',
    async (event, options: CreateTerminalOptions) => {
      console.log('[Terminal IPC] Terminal creation requested:', options)
      try {
        if (!ptyManager) {
          throw new Error('PTY Manager not initialized')
        }

        console.log('[Terminal IPC] Calling PTY Manager createTerminal...')
        const terminal = await ptyManager.createTerminal({
          shell: options.shell,
          cwd: options.cwd,
          env: options.env,
          cols: options.cols || 45, // Further reduced to 45 to eliminate prompt spacing
          rows: options.rows || 24,
        })

        console.log('[Terminal IPC] Terminal created successfully:', terminal)
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
    console.log('[Terminal IPC] 📝 TERMINAL INPUT RECEIVED:', {
      terminalId: data.id,
      data: data.data,
      dataLength: data.data?.length,
      charCode: data.data?.charCodeAt(0),
      timestamp: new Date().toISOString(),
    })

    try {
      if (!ptyManager) {
        console.error('[Terminal IPC] PTY Manager not initialized for input')
        return
      }

      console.log('[Terminal IPC] 📤 Sending input to PTY Manager...')
      ptyManager.writeToTerminal(data.id, data.data)
      console.log('[Terminal IPC] ✅ Input sent to PTY Manager successfully')
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
