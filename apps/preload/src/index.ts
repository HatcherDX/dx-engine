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
  getCurrentWorkingDirectory: () =>
    electronIpcRenderer.invoke('getCurrentWorkingDirectory'),
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

    // CRITICAL: Process any buffered data that arrived before Vue was ready
    const now = Date.now()
    const validBufferedData = terminalDataBuffer.filter(
      (item) => now - item.timestamp < BUFFER_TIMEOUT_MS
    )

    if (validBufferedData.length > 0) {
      validBufferedData.forEach((item) => {
        try {
          callback({ id: item.id, data: item.data })
        } catch (error) {
          console.error('[Preload] ❌ Error replaying buffered data:', error)
        }
      })

      // Clear the buffer after replay
      terminalDataBuffer.length = 0
    }

    // Return cleanup function
    return () => {
      terminalDataCallback = null
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

  // AI Chat IPC methods
  aiChat: {
    // Send message and get complete response
    sendMessage: (params: {
      message: string
      sessionId?: string
      systemPrompt?: string
      temperature?: number
      maxTokens?: number
      providerName?: string
    }) => electronIpcRenderer.invoke('ai-chat:send-message', params),

    // Stream message chunks in real-time (returns auto-generated request ID)
    streamMessage: async (params: {
      message: string
      sessionId?: string
      systemPrompt?: string
      temperature?: number
      maxTokens?: number
      providerName?: string
    }): Promise<string> => {
      const requestId = await electronIpcRenderer.invoke(
        'ai-chat:stream-message',
        params
      )
      return requestId
    },

    // Get available AI providers
    getAvailableProviders: () =>
      electronIpcRenderer.invoke('ai-chat:get-available-providers'),

    // Get provider capabilities
    getProviderCapabilities: (providerName?: string) =>
      electronIpcRenderer.invoke(
        'ai-chat:get-provider-capabilities',
        providerName
      ),

    // Set default provider
    setDefaultProvider: (providerName: string) =>
      electronIpcRenderer.invoke('ai-chat:set-default-provider', providerName),

    // Clear conversation context
    clearConversation: (sessionId: string, providerName?: string) =>
      electronIpcRenderer.invoke(
        'ai-chat:clear-conversation',
        sessionId,
        providerName
      ),

    // Event listeners for streaming
    onStreamChunk: (
      callback: (
        requestId: string,
        chunk: {
          type: 'system' | 'assistant' | 'result' | 'error'
          content?: string
          metadata?: Record<string, unknown>
        }
      ) => void
    ) => {
      electronIpcRenderer.on(
        'ai-chat:stream-chunk',
        (event, requestId, chunk) => callback(requestId, chunk)
      )
    },

    onStreamComplete: (callback: (requestId: string) => void) => {
      electronIpcRenderer.on('ai-chat:stream-complete', (event, requestId) =>
        callback(requestId)
      )
    },

    onStreamError: (callback: (requestId: string, error: string) => void) => {
      electronIpcRenderer.on(
        'ai-chat:stream-error',
        (event, requestId, error) => callback(requestId, error)
      )
    },

    // Remove listeners
    removeStreamListeners: () => {
      electronIpcRenderer.removeAllListeners('ai-chat:stream-chunk')
      electronIpcRenderer.removeAllListeners('ai-chat:stream-complete')
      electronIpcRenderer.removeAllListeners('ai-chat:stream-error')
    },
  },

  // Commands IPC methods
  commands: {
    // List all available commands
    list: () => electronIpcRenderer.invoke('commands:list'),

    // Search commands by query
    search: (query: string) =>
      electronIpcRenderer.invoke('commands:search', query),

    // Execute a command
    execute: (commandName: string, args?: string[]) =>
      electronIpcRenderer.invoke('commands:execute', commandName, args),
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

// Chat Storage API for persisting conversations
const chatStorageAPI = {
  // Save a chat session
  saveSession: (session: unknown) =>
    electronIpcRenderer.invoke('chat-storage:save-session', session),

  // Get all chat sessions
  getAllSessions: () =>
    electronIpcRenderer.invoke('chat-storage:get-all-sessions'),

  // Get a specific session by ID
  getSession: (sessionId: string) =>
    electronIpcRenderer.invoke('chat-storage:get-session', sessionId),

  // Get session by project and branch
  getSessionByProjectBranch: (projectPath: string, branch: string) =>
    electronIpcRenderer.invoke(
      'chat-storage:get-session-by-project-branch',
      projectPath,
      branch
    ),

  // Delete a session
  deleteSession: (sessionId: string) =>
    electronIpcRenderer.invoke('chat-storage:delete-session', sessionId),

  // Clear all sessions
  clearAll: () => electronIpcRenderer.invoke('chat-storage:clear-all'),

  // Export sessions as JSON
  exportSessions: (sessionIds?: string[]) =>
    electronIpcRenderer.invoke('chat-storage:export', sessionIds),

  // Import sessions from JSON
  importSessions: (jsonData: string) =>
    electronIpcRenderer.invoke('chat-storage:import', jsonData),

  // Get usage statistics
  getStatistics: () =>
    electronIpcRenderer.invoke('chat-storage:get-statistics'),

  // Add message to existing session
  addMessage: (sessionId: string, message: unknown, metrics?: unknown) =>
    electronIpcRenderer.invoke(
      'chat-storage:add-message',
      sessionId,
      message,
      metrics
    ),

  // Create a new session
  createSession: (metadata: {
    projectPath?: string
    branch?: string
    model: string
    provider: string
    contextWindow: number
    title?: string
  }) => electronIpcRenderer.invoke('chat-storage:create-session', metadata),
}

// Expose all APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI)
contextBridge.exposeInMainWorld('storageAPI', storageAPI)
contextBridge.exposeInMainWorld('chatStorageAPI', chatStorageAPI)

// CRITICAL: Unified terminal-data listener that handles both buffering and callback invocation
electronIpcRenderer.on('terminal-data', (event, data) => {
  const timestamp = Date.now()

  // Validate data
  if (!data || !data.id || typeof data.data !== 'string') {
    console.error('[Preload] ❌ Invalid terminal-data received')
    return
  }

  // CRITICAL: Check if we have EXACTLY the right data structure
  const terminalData = { id: data.id, data: data.data }

  // If Vue component has registered a callback, invoke it
  if (terminalDataCallback && typeof terminalDataCallback === 'function') {
    try {
      // CRITICAL: Direct callback invocation with exact data structure
      terminalDataCallback(terminalData)
    } catch (error) {
      console.error('[Preload] ❌ Error invoking Vue callback:', error)
    }
  } else {
    // No callback registered yet, buffer the data for later replay
    // Add to buffer with timestamp
    terminalDataBuffer.push({
      id: terminalData.id,
      data: terminalData.data,
      timestamp,
    })

    // Prevent buffer overflow
    if (terminalDataBuffer.length > MAX_BUFFER_SIZE) {
      terminalDataBuffer.shift()
    }
  }
})
