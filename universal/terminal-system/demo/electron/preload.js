import { contextBridge, ipcRenderer } from 'electron'

// Expose terminal API to renderer process
contextBridge.exposeInMainWorld('terminalAPI', {
  // Terminal lifecycle
  create: (options) => ipcRenderer.invoke('terminal:create', options),
  write: (id, data) => ipcRenderer.invoke('terminal:write', { id, data }),
  resize: (id, cols, rows) =>
    ipcRenderer.invoke('terminal:resize', { id, cols, rows }),
  kill: (id) => ipcRenderer.invoke('terminal:kill', { id }),
  getCapabilities: () => ipcRenderer.invoke('terminal:capabilities'),

  // Event listeners
  onData: (callback) => {
    const listener = (event, data) => callback(data)
    ipcRenderer.on('terminal:data', listener)
    return () => ipcRenderer.removeListener('terminal:data', listener)
  },

  onExit: (callback) => {
    const listener = (event, data) => callback(data)
    ipcRenderer.on('terminal:exit', listener)
    return () => ipcRenderer.removeListener('terminal:exit', listener)
  },
})
