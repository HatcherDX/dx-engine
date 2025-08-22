/**
 * @module preload
 */

import { contextBridge, ipcRenderer as electronIpcRenderer } from 'electron'
import { IPCRenderer } from './ipcRenderer.js'
import type { MainMessage, RenderMessage } from './types/index.js'

export * from './types/index.js'

const ipcRenderer = new IPCRenderer<RenderMessage, MainMessage>()

const electronAPI = {
  versions: process.versions,
  send: ipcRenderer.send,
  // Use ONLY native Electron IPC for terminal events since main process uses webContents.send()
  on: (channel: string, listener: (...args: unknown[]) => void) => {
    electronIpcRenderer.on(channel, (event, ...args) => {
      listener(...args)
    })
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
  // Event listener management
  off: (channel: string, listener: (...args: unknown[]) => void) => {
    electronIpcRenderer.off(channel, listener)
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
} as const

export type ElectronAPI = typeof electronAPI

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
