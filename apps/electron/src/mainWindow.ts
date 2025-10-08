import { BrowserWindow, session, screen } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { isDev, isPackaged } from './utils'
import { setupApplicationMenu } from './menu'
import { registerTrustedSender } from './ipc/storageHandlers'
import { terminalKeyboardHandler } from './terminalKeyboardHandler'

// Store reference to main window for menu access
let mainWindowRef: BrowserWindow | null = null

export function getMainWindow(): BrowserWindow | null {
  return mainWindowRef
}

/**
 * Configure Content Security Policy headers
 */
function setupCSP() {
  // Configure CSP headers for security
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const cspValue = isDev
      ? "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' ws: wss: http://localhost:* http://127.0.0.1:*; img-src 'self' data:;"
      : "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; img-src 'self' data:;"

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [cspValue],
      },
    })
  })
}

/**
 * Creates a new browser window with proper configuration
 */
async function createWindow() {
  // Setup CSP before creating window
  setupCSP()
  // Find the correct icon path
  const iconPaths = [
    join(__dirname, '../build/icon.png'),
    join(__dirname, '../build/icon.icns'),
    join(__dirname, '../../build/icon.png'),
    join(__dirname, '../../build/icon.icns'),
    join(process.cwd(), 'apps/electron/build/icon.png'),
    join(process.cwd(), 'apps/electron/build/icon.icns'),
  ]

  const iconPath = iconPaths.find((path) => existsSync(path))

  // Get screen dimensions for optimal sizing
  const { width: screenWidth, height: screenHeight } =
    screen.getPrimaryDisplay().workAreaSize

  // Set window size: 1440x900 or 85% of screen size, whichever is smaller
  const targetWidth = Math.min(1440, Math.floor(screenWidth * 0.85))
  const targetHeight = Math.min(900, Math.floor(screenHeight * 0.85))

  const browserWindow = new BrowserWindow({
    // Optimal window size based on screen dimensions
    width: targetWidth,
    height: targetHeight,
    // Use 'ready-to-show' event to show window
    show: false,
    // Set the application icon if found
    ...(iconPath && { icon: iconPath }),
    // Custom title bar configuration
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#00000000', // Transparent
      symbolColor: '#ffffff', // White symbols for dark themes
      height: 40,
    },
    // Remove frame on Windows/Linux, keep native on macOS for traffic lights
    frame: process.platform === 'darwin',
    // Platform-specific configurations
    ...(process.platform === 'darwin' && {
      trafficLightPosition: { x: 16, y: 12 }, // Standard traffic lights position
    }),
    webPreferences: {
      // https://www.electronjs.org/docs/latest/api/webview-tag#warning
      webviewTag: false,
      // Only enable DevTools in development
      devTools: isDev,
      preload: isPackaged
        ? join(__dirname, './preload/index.cjs')
        : join(__dirname, '../../preload/dist/index.cjs'),
    },
  })

  // Store reference to main window
  mainWindowRef = browserWindow

  // Register this window as a trusted sender for storage IPC IMMEDIATELY
  // This must happen before the page loads to avoid authorization errors
  registerTrustedSender(browserWindow.webContents)
  console.log(
    '[MAIN] ✅ Window pre-registered as trusted sender for storage IPC'
  )

  /**
   * @see https://github.com/electron/electron/issues/25012
   */
  browserWindow.on('ready-to-show', () => {
    browserWindow?.show()

    // Setup application menu with window reference
    setupApplicationMenu(browserWindow)

    // Initialize terminal keyboard handler
    terminalKeyboardHandler.initialize(browserWindow)

    // Only auto-open DevTools in development mode
    if (isDev) {
      browserWindow?.webContents.openDevTools({ mode: 'detach' })

      // Debug: Log when preload has finished loading
      browserWindow?.webContents.on('did-finish-load', () => {
        console.log('[Main Window] Renderer finished loading')
      })

      // Debug: Listen for console messages from renderer
      browserWindow?.webContents.on(
        'console-message',
        (event, level, message) => {
          if (message.includes('Preload') || message.includes('terminal')) {
            console.log(`[Renderer Console] ${message}`)
          }
        }
      )
    }
  })

  // For production, use loadFile which handles paths correctly on all platforms
  if (isDev && import.meta.env.VITE_DEV_SERVER_URL !== undefined) {
    await browserWindow.loadURL(import.meta.env.VITE_DEV_SERVER_URL)
  } else {
    // Use loadFile for local files - it handles Windows paths correctly
    await browserWindow.loadFile(join(__dirname, './web/index.html'))
  }

  return browserWindow
}

/**
 * Restore existing browser window or create a new one
 */
export async function restoreOrCreateWindow() {
  let window = BrowserWindow.getAllWindows().find(
    (browserWindow) => !browserWindow.isDestroyed()
  )

  if (window === undefined) {
    window = await createWindow()
  } else {
    // Update the main window reference
    mainWindowRef = window
    // Re-initialize terminal keyboard handler for existing window
    // This ensures it's properly set up even when restoring
    terminalKeyboardHandler.initialize(window)
  }

  if (window.isMinimized()) {
    window.restore()
  }

  window.focus()
}
