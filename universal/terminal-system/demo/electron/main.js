/* eslint-env node */
/* eslint-disable no-undef */
import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
// Import all modules from main export (Electron app can use Node.js APIs)
import {
  EnhancedTerminalFactory,
  BackendDetector,
  IPCBridge,
} from '@hatcherdx/terminal-system'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let mainWindow
let terminalFactory
let backendDetector
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- IPCBridge initialized but not directly referenced after setup
let _ipcBridge

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset',
  })

  // Initialize terminal system components
  backendDetector = new BackendDetector()
  terminalFactory = new EnhancedTerminalFactory()

  // Setup IPC bridge for terminal communication
  _ipcBridge = new IPCBridge(ipcMain, mainWindow.webContents)

  // Detect available terminal capabilities
  const capabilities = await backendDetector.detectCapabilities()
  console.log('Terminal capabilities:', capabilities)

  // Setup IPC handlers for terminal operations
  setupTerminalHandlers()

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    // Clean up terminals
    terminalFactory.dispose()
    mainWindow = null
  })
}

function setupTerminalHandlers() {
  // Handle terminal creation
  ipcMain.handle('terminal:create', async (_event, options) => {
    try {
      const capabilities = await backendDetector.detectCapabilities()
      const terminal = await terminalFactory.createTerminal({
        id: options.id || `terminal-${Date.now()}`,
        shell: options.shell,
        cwd: options.cwd || process.env.HOME,
        env: options.env || process.env,
        cols: options.cols || 80,
        rows: options.rows || 30,
      })

      // Setup event forwarding to renderer
      terminal.on('data', (data) => {
        mainWindow.webContents.send('terminal:data', {
          id: terminal.id,
          data,
        })
      })

      terminal.on('exit', (exitCode) => {
        mainWindow.webContents.send('terminal:exit', {
          id: terminal.id,
          exitCode,
        })
      })

      return {
        id: terminal.id,
        backend: capabilities.backend,
        capabilities,
      }
    } catch (error) {
      console.error('Failed to create terminal:', error)
      throw error
    }
  })

  // Handle terminal input
  ipcMain.handle('terminal:write', (_event, { id, data }) => {
    const terminal = terminalFactory.getTerminal(id)
    if (terminal) {
      terminal.write(data)
    }
  })

  // Handle terminal resize
  ipcMain.handle('terminal:resize', (_event, { id, cols, rows }) => {
    const terminal = terminalFactory.getTerminal(id)
    if (terminal) {
      terminal.resize(cols, rows)
    }
  })

  // Handle terminal disposal
  ipcMain.handle('terminal:kill', (_event, { id }) => {
    terminalFactory.disposeTerminal(id)
  })

  // Get terminal capabilities
  ipcMain.handle('terminal:capabilities', async () => {
    return await backendDetector.detectCapabilities()
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
