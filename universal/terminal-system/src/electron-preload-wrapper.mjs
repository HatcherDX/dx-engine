/* eslint-env node */
/* global console */

/**
 * @fileoverview ESM wrapper for electron-preload.js to enable testing.
 *
 * @description
 * This file exports the logic of electron-preload.js as an ESM module
 * so it can be tested with Vitest while the actual preload script
 * remains CommonJS for Electron compatibility.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

export function createTerminalAPI(contextBridge, ipcRenderer) {
  const api = {
    // Get backend capabilities
    getCapabilities: () => ipcRenderer.invoke('terminal:getCapabilities'),

    // Create a new terminal
    create: (options) => ipcRenderer.invoke('terminal:create', options),

    // Write data to terminal
    write: (id, data) => ipcRenderer.invoke('terminal:write', id, data),

    // Resize terminal
    resize: (id, cols, rows) =>
      ipcRenderer.invoke('terminal:resize', id, cols, rows),

    // Kill terminal
    kill: (id) => ipcRenderer.invoke('terminal:kill', id),

    // Listen for terminal data
    onData: (callback) => {
      const listener = (event, data) => {
        console.log('[Preload] Received terminal:data from main:', {
          hasData: !!data,
          type: typeof data,
          preview: data ? JSON.stringify(data).slice(0, 200) : 'no data',
        })
        // Make sure we pass the data object correctly
        if (data && typeof data === 'object' && data.data) {
          console.log(
            '[Preload] Forwarding data to renderer:',
            data.data.slice(0, 50)
          )
          callback(data)
        } else {
          console.error('[Preload] Invalid data format received:', data)
        }
      }
      ipcRenderer.on('terminal:data', listener)
      // Return cleanup function
      return () => ipcRenderer.removeListener('terminal:data', listener)
    },

    // Listen for terminal exit
    onExit: (callback) => {
      const listener = (event, data) => callback(data)
      ipcRenderer.on('terminal:exit', listener)
      // Return cleanup function
      return () => ipcRenderer.removeListener('terminal:exit', listener)
    },
  }

  contextBridge.exposeInMainWorld('terminalAPI', api)
  return api
}
