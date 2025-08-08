import { BrowserWindow, dialog, ipcMain as electronIpcMain } from 'electron'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
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

// Project selection handlers
electronIpcMain.handle('openProjectDialog', async () => {
  const window = BrowserWindow.getFocusedWindow()
  if (!window) {
    throw new Error('No focused window available')
  }

  const result = await dialog.showOpenDialog(window, {
    title: 'Select package.json file',
    filters: [
      { name: 'package.json', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  })

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  const selectedPath = result.filePaths[0]

  // Validate that it's a package.json file
  if (!selectedPath.endsWith('package.json')) {
    throw new Error('Please select a package.json file')
  }

  try {
    // Read and validate package.json content
    const content = await readFile(selectedPath, 'utf8')
    const packageData = JSON.parse(content)

    if (!packageData.name) {
      throw new Error('Invalid package.json: missing name field')
    }

    const projectPath = join(selectedPath, '..')

    return {
      path: projectPath,
      packageJson: selectedPath,
      name: packageData.name,
      version: packageData.version || '0.0.0',
      description: packageData.description || '',
      scripts: packageData.scripts || {},
      dependencies: packageData.dependencies || {},
      devDependencies: packageData.devDependencies || {},
    }
  } catch (error) {
    throw new Error(
      `Failed to read package.json: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
})

setTimeout(() => {
  ipcMain.send('newUserJoin', 1)
}, 5000)
