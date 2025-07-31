import { BrowserWindow } from 'electron'
import type { MainMessage, RenderMessage } from '@hatcherdx/dx-engine-preload'
import { IPCMain } from '@hatcherdx/dx-engine-preload/main'

export const ipcMain = new IPCMain<RenderMessage, MainMessage>()

ipcMain.on('getUsernameById', (userID) => {
  console.log('getUsernameById', `User ID: ${userID}`)
  return 'User Name'
})

// Window control handlers
ipcMain.on('minimizeWindow', () => {
  const window = BrowserWindow.getFocusedWindow()
  if (window) {
    window.minimize()
  }
})

ipcMain.on('maximizeWindow', () => {
  const window = BrowserWindow.getFocusedWindow()
  if (window) {
    if (window.isMaximized()) {
      window.restore()
    } else {
      window.maximize()
    }
  }
})

ipcMain.on('closeWindow', () => {
  const window = BrowserWindow.getFocusedWindow()
  if (window) {
    window.close()
  }
})

ipcMain.on('isWindowMaximized', () => {
  const window = BrowserWindow.getFocusedWindow()
  return window ? window.isMaximized() : false
})

setTimeout(() => {
  ipcMain.send('newUserJoin', 1)
}, 5000)
