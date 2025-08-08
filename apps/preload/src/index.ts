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
  // Event listener management
  off: (channel: string, listener: (...args: unknown[]) => void) => {
    electronIpcRenderer.off(channel, listener)
  },
} as const

export type ElectronAPI = typeof electronAPI

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
