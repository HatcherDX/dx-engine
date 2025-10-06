/**
 * @module preload
 */

import { contextBridge, ipcRenderer as electronIpcRenderer } from 'electron'
import { IPCRenderer } from './ipcRenderer.js'
import type { MainMessage, RenderMessage } from './types/index.js'
import { storageAPI } from './storage.js'

export * from './types/index.js'
export type { StorageAPI } from './storage.js'

const ipcRenderer = new IPCRenderer<RenderMessage, MainMessage>()

// CRITICAL: Buffer to store terminal data that arrives before Vue component is ready
const terminalDataBuffer: Array<{
  id: string
  data: string
  timestamp: number
}> = []
let terminalDataCallback:
  | ((data: { id: string; data: string }) => void)
  | null = null
const MAX_BUFFER_SIZE = 100 // Prevent memory leak
const BUFFER_TIMEOUT_MS = 5000 // Clear old buffered data after 5 seconds

const electronAPI = {
  versions: process.versions,
  send: ipcRenderer.send,
  // Hybrid IPC listener that handles both native Electron IPC and custom IPC system
  on: (channel: string, listener: (...args: unknown[]) => void) => {
    console.log('[Preload] Registering listener for channel:', channel)

    // For custom IPC system messages (like simulate-platform)
    if (channel === 'simulate-platform') {
      ipcRenderer.on(
        channel as keyof MainMessage,
        listener as (
          ...args: Parameters<MainMessage[keyof MainMessage]>
        ) => void
      )
    } else {
      // For native Electron IPC (like terminal events, close-task)
      // CRITICAL FIX: Use proper event listener that doesn't get stripped in production
      const wrappedListener = (
        event: Electron.IpcRendererEvent,
        ...args: unknown[]
      ) => {
        console.log(
          '[Preload] Event received on channel:',
          channel,
          'with data:',
          args
        )
        listener(...args)
      }

      electronIpcRenderer.on(channel, wrappedListener)

      // Return cleanup function for proper removal
      return () => {
        electronIpcRenderer.removeListener(channel, wrappedListener)
      }
    }
  },
  invoke: electronIpcRenderer.invoke.bind(electronIpcRenderer),

  // Direct IPC methods for terminal operations
  sendTerminalInput: (data: { id: string; data: string }) =>
    electronIpcRenderer.send('terminal-input', data),
  sendTerminalResize: (data: { id: string; cols: number; rows: number }) =>
    electronIpcRenderer.send('terminal-resize', data),
  // Theme management
  setTheme: (theme: string) => electronIpcRenderer.send('set-theme', theme),
  // Project management
  openProjectDialog: () => electronIpcRenderer.invoke('openProjectDialog'),
  // File system operations
  statFile: (filePath: string) =>
    electronIpcRenderer.invoke('statFile', filePath),
  readDirectory: (dirPath: string) =>
    electronIpcRenderer.invoke('readDirectory', dirPath),
  pathExists: (path: string) => electronIpcRenderer.invoke('pathExists', path),
  isDirectory: (path: string) =>
    electronIpcRenderer.invoke('isDirectory', path),
  readFile: (filePath: string) =>
    electronIpcRenderer.invoke('readFile', filePath),
  scanDirectory: (
    dirPath: string,
    options?: { ignoredDirs?: string[]; configFiles?: string[] }
  ) => electronIpcRenderer.invoke('scanDirectory', dirPath, options),
  // Git operations using pure Node.js simple-git
  getGitStatus: (projectPath: string) =>
    electronIpcRenderer.invoke('getGitStatus', projectPath),
  getGitBranches: (projectPath: string) =>
    electronIpcRenderer.invoke('getGitBranches', projectPath),
  switchGitBranch: (projectPath: string, branchName: string) =>
    electronIpcRenderer.invoke('switchGitBranch', projectPath, branchName),
  getGitDiff: (
    projectPath: string,
    filePath: string,
    options?: { staged?: boolean; commit?: string }
  ) => electronIpcRenderer.invoke('getGitDiff', projectPath, filePath, options),
  getFileContent: (
    projectPath: string,
    filePath: string,
    options?: { commit?: string; fromWorkingTree?: boolean }
  ) =>
    electronIpcRenderer.invoke(
      'getFileContent',
      projectPath,
      filePath,
      options
    ),
  // Git stash operations
  gitStash: (projectPath: string, message: string) =>
    electronIpcRenderer.invoke('gitStash', projectPath, message),
  gitStashPop: (projectPath: string, stashRef: string) =>
    electronIpcRenderer.invoke('gitStashPop', projectPath, stashRef),
  gitStashDrop: (projectPath: string, stashRef: string) =>
    electronIpcRenderer.invoke('gitStashDrop', projectPath, stashRef),
  gitStashList: (projectPath: string) =>
    electronIpcRenderer.invoke('gitStashList', projectPath),
  gitStashShow: (projectPath: string, stashRef: string) =>
    electronIpcRenderer.invoke('gitStashShow', projectPath, stashRef),
  gitCheckoutBranch: (projectPath: string, branchName: string) =>
    electronIpcRenderer.invoke('gitCheckoutBranch', projectPath, branchName),
  gitCreateBranch: (
    projectPath: string,
    branchName: string,
    baseBranch?: string
  ) =>
    electronIpcRenderer.invoke(
      'gitCreateBranch',
      projectPath,
      branchName,
      baseBranch
    ),
  // Event listener management
  off: (channel: string, listener: (...args: unknown[]) => void) => {
    electronIpcRenderer.off(channel, listener)
  },
  // Terminal-specific event listeners for better reliability
  onTerminalData: (callback: (data: { id: string; data: string }) => void) => {
    const registrationTime = new Date().toISOString()
    console.log(
      '[Preload] 🚀 SETTING UP terminal-data listener via onTerminalData at',
      registrationTime
    )

    // ENHANCED: Validate callback function
    if (typeof callback !== 'function') {
      console.error(
        '[Preload] ❌ Invalid callback provided to onTerminalData:',
        typeof callback
      )
      throw new Error('Callback must be a function')
    }

    // Store the callback globally so the unified listener can use it
    terminalDataCallback = callback
    console.log(
      '[Preload] ✅ Callback stored globally for unified listener at',
      registrationTime
    )
    console.log('[Preload] 📊 STATE CHECK:', {
      callbackSet: !!terminalDataCallback,
      callbackType: typeof terminalDataCallback,
      bufferLength: terminalDataBuffer.length,
      timestamp: registrationTime,
    })

    // CRITICAL: Process any buffered data that arrived before Vue was ready
    const now = Date.now()
    const validBufferedData = terminalDataBuffer.filter(
      (item) => now - item.timestamp < BUFFER_TIMEOUT_MS
    )

    if (validBufferedData.length > 0) {
      console.log(
        `[Preload] 📦 REPLAYING ${validBufferedData.length} BUFFERED terminal-data events to Vue component`
      )
      validBufferedData.forEach((item, index) => {
        try {
          console.log(
            `[Preload] 📦 Replaying buffered event ${index + 1}/${validBufferedData.length}:`,
            {
              id: item.id.substring(0, 8) + '...',
              dataLength: item.data.length,
              age: now - item.timestamp + 'ms',
            }
          )
          callback({ id: item.id, data: item.data })
        } catch (error) {
          console.error(
            `[Preload] ❌ Error replaying buffered data ${index + 1}:`,
            error
          )
        }
      })

      // Clear the buffer after replay
      terminalDataBuffer.length = 0
      console.log('[Preload] ✅ Buffer cleared after replay')
    } else {
      console.log('[Preload] 📦 No buffered data to replay')
    }

    // Return cleanup function
    return () => {
      terminalDataCallback = null
      console.log('[Preload] 🧹 terminal-data callback cleared')
    }
  },
  onTerminalExit: (
    callback: (data: { id: string; exitCode: number; signal?: number }) => void
  ) => {
    electronIpcRenderer.on('terminal-exit', (event, data) => callback(data))
  },
  onTerminalError: (callback: (data: { error: string }) => void) => {
    electronIpcRenderer.on('terminal-error', (event, data) => callback(data))
  },
  // File watching operations
  startFileWatching: (projectPath: string) =>
    electronIpcRenderer.invoke('startFileWatching', projectPath),
  stopFileWatching: (watcherId: string) =>
    electronIpcRenderer.invoke('stopFileWatching', watcherId),
  getFileWatchingStatus: () =>
    electronIpcRenderer.invoke('getFileWatchingStatus'),
  // File change event listener
  onFileChangeEvent: (
    callback: (event: {
      type: 'git' | 'config' | 'source' | 'build' | 'dependency' | 'other'
      path: string
      changeType: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'
      timestamp: number
    }) => void
  ) => {
    electronIpcRenderer.on('file-change-event', (event, data) => callback(data))
  },
  // System Terminal IPC methods
  systemTerminal: {
    // Initialize system terminals
    initialize: (options?: {
      projectType?: string
      projectName?: string
      projectPath?: string
      packageManager?: string
    }) => electronIpcRenderer.invoke('system-terminal-initialize', options),

    // System logging
    log: (request: {
      level: 'info' | 'warn' | 'error'
      message: string
      terminal?: 'system' | 'timeline'
      context?: Record<string, unknown>
    }) => electronIpcRenderer.invoke('system-terminal-log', request),

    // Git operation logging
    gitOperation: (request: {
      operation: string
      args?: unknown[]
      context?: Record<string, unknown>
    }) => electronIpcRenderer.invoke('system-terminal-git-operation', request),

    // Terminal management
    getTerminal: (terminalType: 'system' | 'timeline') =>
      electronIpcRenderer.invoke('system-terminal-get', terminalType),

    listTerminals: () => electronIpcRenderer.invoke('system-terminal-list'),

    setActive: (terminalType: 'system' | 'timeline') =>
      electronIpcRenderer.invoke('system-terminal-set-active', terminalType),

    clear: (terminalType: 'system' | 'timeline') =>
      electronIpcRenderer.invoke('system-terminal-clear', terminalType),

    getLines: (
      terminalType: 'system' | 'timeline',
      options?: {
        limit?: number
        type?: 'CMD' | 'GIT' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL'
        since?: string
      }
    ) =>
      electronIpcRenderer.invoke(
        'system-terminal-get-lines',
        terminalType,
        options
      ),

    updateConfig: (
      terminalType: 'system' | 'timeline',
      config: {
        autoScroll?: boolean
        maxLines?: number
      }
    ) =>
      electronIpcRenderer.invoke(
        'system-terminal-update-config',
        terminalType,
        config
      ),

    // Event listeners for system terminal events
    onEvent: (
      callback: (data: {
        event: unknown
        terminal: 'system' | 'timeline'
      }) => void
    ) => {
      electronIpcRenderer.on('system-terminal-event', (event, data) =>
        callback(data)
      )
    },

    onOutput: (callback: (event: unknown) => void) => {
      electronIpcRenderer.on('system-terminal-output', (event, data) =>
        callback(data)
      )
    },

    onActivated: (
      callback: (data: {
        terminalId: string
        terminalType: 'system' | 'timeline'
      }) => void
    ) => {
      electronIpcRenderer.on('system-terminal-activated', (event, data) =>
        callback(data)
      )
    },

    onCleared: (
      callback: (data: {
        terminalId: string
        terminalType: 'system' | 'timeline'
      }) => void
    ) => {
      electronIpcRenderer.on('system-terminal-cleared', (event, data) =>
        callback(data)
      )
    },
  },

  // Terminal Easter Egg IPC
  terminalEasterEgg: {
    // Notify main process of step changes
    stepChange: (step: string) => {
      electronIpcRenderer.send('terminal-step-change', step)
    },

    // Notify main process of visibility changes
    visibilityChange: (isVisible: boolean) => {
      electronIpcRenderer.send('terminal-visibility-change', isVisible)
    },

    // Notify main process of actual UI visibility changes
    updateUIVisibility: (isActuallyVisible: boolean) => {
      electronIpcRenderer.send(
        'terminal-easter-egg-visibility',
        isActuallyVisible
      )
    },

    // Event listeners for terminal commands from main process
    onActivate: (
      callback: (data: { step: string; hasBeenActivated: boolean }) => void
    ) => {
      electronIpcRenderer.on('terminal-activate', (event, data) =>
        callback(data)
      )
    },

    onShow: (
      callback: (data: { step: string; hasBeenActivated: boolean }) => void
    ) => {
      electronIpcRenderer.on('terminal-show', (event, data) => callback(data))
    },

    onHide: (callback: () => void) => {
      electronIpcRenderer.on('terminal-hide', () => callback())
    },

    onCommand: (
      callback: (data: { command: string; step: string }) => void
    ) => {
      electronIpcRenderer.on('terminal-command', (event, data) =>
        callback(data)
      )
    },

    onInput: (callback: (data: { char: string; step: string }) => void) => {
      electronIpcRenderer.on('terminal-input', (event, data) => callback(data))
    },

    onStepChange: (callback: (data: { step: string }) => void) => {
      electronIpcRenderer.on('terminal-step-change', (event, data) =>
        callback(data)
      )
    },

    // Clean up listeners
    removeAllListeners: () => {
      electronIpcRenderer.removeAllListeners('terminal-activate')
      electronIpcRenderer.removeAllListeners('terminal-show')
      electronIpcRenderer.removeAllListeners('terminal-hide')
      electronIpcRenderer.removeAllListeners('terminal-command')
      electronIpcRenderer.removeAllListeners('terminal-input')
      electronIpcRenderer.removeAllListeners('terminal-step-change')
    },
  },
} as const

export type ElectronAPI = typeof electronAPI

// Expose both APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI)
contextBridge.exposeInMainWorld('storageAPI', storageAPI)

console.log('[Preload] ✅ APIs exposed to renderer process')

// CRITICAL: Unified terminal-data listener that handles both buffering and callback invocation
console.log('[Preload] 🚀 Registering UNIFIED terminal-data listener...')
electronIpcRenderer.on('terminal-data', (event, data) => {
  const timestamp = Date.now()

  // CRITICAL DEBUG: Add immediately accessible debug log
  console.log('[Preload] 🎯 GLOBAL DEBUG - terminal-data received:', data)

  console.log(
    '[Preload] 🎯 UNIFIED LISTENER - terminal-data received from main process:',
    {
      eventExists: !!event,
      dataExists: !!data,
      id: data?.id?.substring(0, 12) + '...' || 'MISSING',
      dataLength: data?.data?.length || 0,
      first50:
        typeof data?.data === 'string'
          ? data.data
              .substring(0, 50)
              .replace(/\r/g, '\\r')
              .replace(/\n/g, '\\n')
          : String(data?.data || 'NO DATA'),
      hasCallback: !!terminalDataCallback,
      callbackType: typeof terminalDataCallback,
      callbackString: terminalDataCallback
        ? terminalDataCallback.toString().substring(0, 100)
        : 'null',
      bufferSize: terminalDataBuffer.length,
      timestamp: new Date(timestamp).toISOString(),
    }
  )

  // Validate data
  if (!data || !data.id || typeof data.data !== 'string') {
    console.error('[Preload] ❌ Invalid terminal-data received:', {
      hasData: !!data,
      hasId: !!data?.id,
      hasDataField: !!data?.data,
      dataType: typeof data?.data,
    })
    return
  }

  // CRITICAL: Check if we have EXACTLY the right data structure
  const terminalData = { id: data.id, data: data.data }
  console.log('[Preload] 📊 Terminal data prepared for callback:', {
    id: String(terminalData.id).substring(0, 12) + '...',
    dataLength:
      typeof terminalData.data === 'string'
        ? terminalData.data.length
        : String(terminalData.data).length,
    dataPreview:
      typeof terminalData.data === 'string'
        ? terminalData.data
            .substring(0, 30)
            .replace(/\r/g, '\\r')
            .replace(/\n/g, '\\n')
        : String(terminalData.data).substring(0, 30),
  })

  // If Vue component has registered a callback, invoke it
  if (terminalDataCallback && typeof terminalDataCallback === 'function') {
    try {
      console.log('[Preload] 🚀 INVOKING Vue callback with terminal data...', {
        callbackType: typeof terminalDataCallback,
        dataId: terminalData.id.substring(0, 12) + '...',
        dataLength: terminalData.data.length,
        timestamp: new Date().toISOString(),
      })

      // CRITICAL: Direct callback invocation with exact data structure
      const result = terminalDataCallback(terminalData)

      console.log(
        '[Preload] ✅ Vue callback invoked successfully at',
        new Date().toISOString(),
        {
          returnValue: result,
          callbackStillExists: !!terminalDataCallback,
        }
      )
    } catch (error) {
      console.error('[Preload] ❌ Error invoking Vue callback:', error)
      console.error('[Preload] Callback error details:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        dataId: terminalData.id,
        dataLength: terminalData.data?.length,
        callbackType: typeof terminalDataCallback,
      })
    }
  } else {
    // No callback registered yet, buffer the data for later replay
    console.log(
      '[Preload] 📦 No Vue callback registered yet, BUFFERING data for later replay',
      {
        hasCallback: !!terminalDataCallback,
        callbackType: typeof terminalDataCallback,
      }
    )

    // Add to buffer with timestamp
    terminalDataBuffer.push({
      id: terminalData.id,
      data: terminalData.data,
      timestamp,
    })

    // Prevent buffer overflow
    if (terminalDataBuffer.length > MAX_BUFFER_SIZE) {
      const removed = terminalDataBuffer.shift()
      console.log('[Preload] ⚠️ Buffer overflow, removing oldest entry:', {
        removedId: removed?.id?.substring(0, 8) + '...',
        currentSize: terminalDataBuffer.length,
      })
    }

    console.log(
      '[Preload] 📦 Data buffered. Current buffer size:',
      terminalDataBuffer.length
    )
  }
})
console.log(
  '[Preload] ✅ Unified terminal-data listener registered successfully'
)
