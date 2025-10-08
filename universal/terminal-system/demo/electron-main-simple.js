/* eslint-env node */
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS required for Electron main process */
/* eslint-disable no-undef -- Node.js globals available in Electron main process */

const { app, BrowserWindow, ipcMain, Menu } = require('electron')
const path = require('path')
const os = require('os')

// Try to use node-pty if available, fallback to child_process
try {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _pty = require('node-pty')
  console.log('[Terminal] Using node-pty for terminal emulation')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
} catch (_e) {
  console.log('[Terminal] node-pty not available, using subprocess fallback')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { spawn: _spawn } = require('child_process')
}

let mainWindow
const terminals = new Map()

function createMenu() {
  // Create application menu with proper Cmd+Q support
  const template = [
    {
      label: 'Terminal Demo',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services', submenu: [] },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        {
          label: 'Quit Terminal Demo',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            // Clean up all terminals before quitting
            terminals.forEach((terminal) => {
              try {
                if (terminal.currentProcess) {
                  terminal.currentProcess.kill('SIGTERM')
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
              } catch (_e) {
                // Ignore errors
              }
            })
            terminals.clear()
            app.quit()
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'close' }],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function createWindow() {
  // Create application menu
  createMenu()

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
      backend: 'subprocess',
      supportsResize: false,
      supportsAnsi: true,
      supportsColor: true,
      supportsPty: false,
    }
  })

  ipcMain.handle('terminal:create', async (_event, options) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, cols: _cols, rows: _rows } = options

    try {
      // Import spawn here if not already imported
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { spawn: _spawnLocal } = require('child_process')

      // Since we don't have PTY, we'll use a simple subprocess approach
      // We'll manage command buffer manually for non-PTY terminal
      const terminalState = {
        id,
        cwd: process.env.HOME || os.homedir(),
        commandBuffer: '',
        currentProcess: null,
      }

      terminals.set(id, terminalState)

      // Use the new WelcomeMessageProvider for consistent welcome messages
      // Import it inline since this is a simple demo
      const createWelcomeMessage = () => {
        const user = process.env.USER || 'user'
        const hostname = os.hostname().split('.')[0]
        const cwd = terminalState.cwd
        const homeDir = os.homedir()

        // Simplify path display
        let displayPath = cwd
        if (cwd.startsWith(homeDir)) {
          displayPath = '~' + cwd.slice(homeDir.length)
        }

        const welcomeMsg = `\x1b[36m🚀 Hatcher Terminal\x1b[0m\r\n`
        const versionMsg = `\x1b[33mProduction Ready - v1.0.0\x1b[0m\r\n`
        const infoMsg = `\r\n\x1b[32mSystem Information:\x1b[0m\r\n`
        const userInfo = `  User: ${user}\r\n`
        const hostInfo = `  Host: ${hostname}\r\n`
        const platformInfo = `  Platform: ${os.platform()} ${os.arch()}\r\n`
        const nodeInfo = `  Node: ${process.version}\r\n\r\n`
        const promptStr = `\x1b[32m${user}@${hostname}\x1b[0m \x1b[36m${displayPath}\x1b[0m $ `

        return (
          welcomeMsg +
          versionMsg +
          infoMsg +
          userInfo +
          hostInfo +
          platformInfo +
          nodeInfo +
          promptStr
        )
      }

      // Send initial welcome message with proper delay for xterm.js
      setTimeout(() => {
        const welcomeMessage = createWelcomeMessage()
        console.log(`[Terminal ${id}] Sending enhanced welcome message`)
        mainWindow.webContents.send('terminal:data', {
          id,
          data: welcomeMessage,
        })
      }, 100)

      console.log(`[Terminal ${id}] ✅ Created successfully (subprocess mode)`)
      return { id, success: true }
    } catch (error) {
      console.error('Failed to create terminal:', error)
      return { id, success: false, error: error.message }
    }
  })

  ipcMain.handle('terminal:write', (event, id, data) => {
    const terminal = terminals.get(id)
    if (!terminal) {
      console.warn(`[Terminal ${id}] Cannot write - terminal not found`)
      return
    }

    const { spawn } = require('child_process')
    const charCode = data.charCodeAt(0)
    console.log(
      `[Terminal ${id}] Writing data:`,
      data.slice(0, 50).replace(/\n/g, '\\n').replace(/\r/g, '\\r'),
      `(code: ${charCode})`
    )

    try {
      // Handle Ctrl+C (SIGINT)
      if (charCode === 3) {
        console.log(`[Terminal ${id}] Ctrl+C detected`)
        if (terminal.currentProcess) {
          terminal.currentProcess.kill('SIGINT')
          terminal.currentProcess = null
        }
        // Show ^C in terminal
        mainWindow.webContents.send('terminal:data', { id, data: '^C\r\n' })
        // Clear command buffer
        terminal.commandBuffer = ''
        // Send new prompt
        const promptStr = `${process.env.USER || 'user'}@${os.hostname()} ${terminal.cwd} $ `
        mainWindow.webContents.send('terminal:data', { id, data: promptStr })
        return
      }

      // Handle Enter key - execute command
      if (data === '\r' || data === '\n') {
        // Send newline to display
        mainWindow.webContents.send('terminal:data', { id, data: '\r\n' })

        // Execute the buffered command if any
        const command = terminal.commandBuffer.trim()
        terminal.commandBuffer = ''

        if (command) {
          console.log(`[Terminal ${id}] Executing command: "${command}"`)

          // Handle cd command specially
          if (command.startsWith('cd ')) {
            const newDir = command.slice(3).trim()
            try {
              const targetDir = newDir.startsWith('/')
                ? newDir
                : newDir === '~'
                  ? os.homedir()
                  : newDir.startsWith('~/')
                    ? path.join(os.homedir(), newDir.slice(2))
                    : path.join(terminal.cwd, newDir)

              // Check if directory exists
              const fs = require('fs')
              if (
                fs.existsSync(targetDir) &&
                fs.statSync(targetDir).isDirectory()
              ) {
                terminal.cwd = path.resolve(targetDir)
                console.log(
                  `[Terminal ${id}] Changed directory to: ${terminal.cwd}`
                )
              } else {
                mainWindow.webContents.send('terminal:data', {
                  id,
                  data: `cd: no such file or directory: ${newDir}\r\n`,
                })
              }
            } catch (error) {
              mainWindow.webContents.send('terminal:data', {
                id,
                data: `cd: ${error.message}\r\n`,
              })
            }
            // Send new prompt
            const promptStr = `${process.env.USER || 'user'}@${os.hostname()} ${terminal.cwd} $ `
            mainWindow.webContents.send('terminal:data', {
              id,
              data: promptStr,
            })
            return
          }

          // Handle clear command
          if (command === 'clear') {
            // Send clear screen sequence
            mainWindow.webContents.send('terminal:data', {
              id,
              data: '\x1b[2J\x1b[H',
            })
            // Add a small delay before sending the new prompt to ensure clear completes
            setTimeout(() => {
              const promptStr = `${process.env.USER || 'user'}@${os.hostname()} ${terminal.cwd} $ `
              mainWindow.webContents.send('terminal:data', {
                id,
                data: promptStr,
              })
            }, 10)
            return
          }

          // Execute command using spawn with shell
          const proc = spawn(command, [], {
            shell: true,
            cwd: terminal.cwd,
            env: { ...process.env, PWD: terminal.cwd },
          })

          terminal.currentProcess = proc

          // Handle stdout
          proc.stdout.on('data', (chunk) => {
            const output = chunk.toString()
            console.log(`[Terminal ${id}] stdout:`, output.slice(0, 100))
            mainWindow.webContents.send('terminal:data', { id, data: output })
          })

          // Handle stderr
          proc.stderr.on('data', (chunk) => {
            const output = chunk.toString()
            console.log(`[Terminal ${id}] stderr:`, output.slice(0, 100))
            mainWindow.webContents.send('terminal:data', { id, data: output })
          })

          // Handle process exit
          proc.on('exit', (code, signal) => {
            console.log(
              `[Terminal ${id}] Command exited with code ${code}, signal ${signal}`
            )
            terminal.currentProcess = null
            // Send new prompt
            const promptStr = `${process.env.USER || 'user'}@${os.hostname()} ${terminal.cwd} $ `
            mainWindow.webContents.send('terminal:data', {
              id,
              data: promptStr,
            })
          })

          // Handle process error
          proc.on('error', (error) => {
            console.error(`[Terminal ${id}] Command error:`, error)
            mainWindow.webContents.send('terminal:data', {
              id,
              data: `Error: ${error.message}\r\n`,
            })
            terminal.currentProcess = null
            // Send new prompt
            const promptStr = `${process.env.USER || 'user'}@${os.hostname()} ${terminal.cwd} $ `
            mainWindow.webContents.send('terminal:data', {
              id,
              data: promptStr,
            })
          })
        } else {
          // Empty command, just send new prompt
          const promptStr = `${process.env.USER || 'user'}@${os.hostname()} ${terminal.cwd} $ `
          mainWindow.webContents.send('terminal:data', { id, data: promptStr })
        }
      } else if (charCode === 127) {
        // Backspace
        if (terminal.commandBuffer.length > 0) {
          terminal.commandBuffer = terminal.commandBuffer.slice(0, -1)
          // Send visual backspace
          mainWindow.webContents.send('terminal:data', { id, data: '\b \b' })
        }
      } else {
        // Regular character - add to buffer and echo
        terminal.commandBuffer += data
        mainWindow.webContents.send('terminal:data', { id, data })
      }
    } catch (error) {
      console.error(`[Terminal ${id}] Failed to write:`, error)
    }
  })

  ipcMain.handle(
    'terminal:resize',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_event, id, _cols, _rows) => {
      // Subprocess doesn't support resize
      console.log(`Resize not supported for subprocess terminal ${id}`)
    }
  )

  ipcMain.handle('terminal:kill', async (_event, id) => {
    const terminal = terminals.get(id)
    if (terminal) {
      // Kill any running process
      if (terminal.currentProcess) {
        terminal.currentProcess.kill('SIGTERM')
        terminal.currentProcess = null
      }
      terminals.delete(id)
    }
  })

  // Always load from dist (Vite builds first)
  const indexPath = path.join(__dirname, 'dist/index.html')
  console.log(`[Electron] Loading app from: ${indexPath}`)

  mainWindow.loadFile(indexPath)

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    // Clean up all terminals
    terminals.forEach((terminal) => {
      if (terminal.currentProcess) {
        terminal.currentProcess.kill('SIGTERM')
      }
    })
    terminals.clear()
    mainWindow = null
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  // Clean up all terminals
  terminals.forEach((terminal) => {
    try {
      if (terminal.currentProcess) {
        terminal.currentProcess.kill('SIGTERM')
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      // Ignore errors
    }
  })
  terminals.clear()

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on(
  'before-quit',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (_event) => {
    // Clean up all terminals before quitting
    terminals.forEach((terminal) => {
      try {
        if (terminal.currentProcess) {
          terminal.currentProcess.kill('SIGTERM')
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_e) {
        // Ignore errors
      }
    })
    terminals.clear()
  }
)

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
