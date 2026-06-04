/* eslint-env node */
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS required for Electron main process */
/* eslint-disable no-undef -- Node.js globals available in Electron main process */

const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const pty = require('node-pty')
const os = require('os')

let mainWindow
const terminals = new Map()

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron-preload.js'),
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1e1e1e',
  })

  // Handle IPC from renderer
  ipcMain.handle('terminal:getCapabilities', () => {
    return {
      backend: 'node-pty',
      supportsResize: true,
      supportsAnsi: true,
      supportsColor: true,
      supportsPty: true,
    }
  })

  ipcMain.handle('terminal:create', async (event, options) => {
    const { id, cols, rows } = options

    try {
      // Determine shell
      const shell =
        process.platform === 'win32'
          ? 'powershell.exe'
          : process.env.SHELL || '/bin/zsh'

      // Create PTY process
      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: cols || 80,
        rows: rows || 30,
        cwd: process.env.HOME || os.homedir(),
        env: process.env,
      })

      terminals.set(id, ptyProcess)

      // Setup data forwarding
      ptyProcess.onData((data) => {
        mainWindow.webContents.send('terminal:data', { id, data })
      })

      ptyProcess.onExit(({ exitCode }) => {
        mainWindow.webContents.send('terminal:exit', { id, exitCode })
        terminals.delete(id)
      })

      console.log(`Created terminal ${id} with shell: ${shell}`)
      return { id, success: true }
    } catch (error) {
      console.error('Failed to create terminal:', error)
      return { id, success: false, error: error.message }
    }
  })

  ipcMain.handle('terminal:write', (event, id, data) => {
    const terminal = terminals.get(id)
    if (terminal) {
      terminal.write(data)
    }
  })

  ipcMain.handle('terminal:resize', (event, id, cols, rows) => {
    const terminal = terminals.get(id)
    if (terminal) {
      terminal.resize(cols, rows)
    }
  })

  ipcMain.handle('terminal:kill', async (event, id) => {
    const terminal = terminals.get(id)
    if (terminal) {
      terminal.kill()
      terminals.delete(id)
    }
  })

  // In development, use Vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5175')
    mainWindow.webContents.openDevTools()
  } else {
    // In production, load the built Vue app
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'))
  }

  mainWindow.on('closed', () => {
    // Clean up all terminals
    terminals.forEach((terminal) => {
      terminal.kill()
    })
    mainWindow = null
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
