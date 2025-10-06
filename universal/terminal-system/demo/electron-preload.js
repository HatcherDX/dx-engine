/* eslint-env node */
// eslint-disable-next-line @typescript-eslint/no-require-imports, no-undef -- CommonJS required for Electron preload scripts
const { contextBridge, ipcRenderer } = require('electron')

// Expose terminal API to renderer
contextBridge.exposeInMainWorld('terminalAPI', {
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
      // eslint-disable-next-line no-undef -- console is available in Electron preload scripts
      console.log('[Preload] Received terminal:data from main:', {
        hasData: !!data,
        type: typeof data,
        preview: data ? JSON.stringify(data).slice(0, 200) : 'no data',
      })
      // Make sure we pass the data object correctly
      if (data && typeof data === 'object' && data.data) {
        // eslint-disable-next-line no-undef -- console is available in Electron preload scripts
        console.log(
          '[Preload] Forwarding data to renderer:',
          data.data.slice(0, 50)
        )
        callback(data)
      } else {
        // eslint-disable-next-line no-undef -- console is available in Electron preload scripts
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
})
