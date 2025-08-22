import { BrowserWindow, session } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { isDev, isPackaged } from './utils'
import { setupApplicationMenu } from './menu'

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

  const browserWindow = new BrowserWindow({
    // Default window size
    width: 1024,
    height: 768,
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

  /**
   * @see https://github.com/electron/electron/issues/25012
   */
  browserWindow.on('ready-to-show', () => {
    browserWindow?.show()

    // Setup application menu
    setupApplicationMenu()

    // Only auto-open DevTools in development mode
    if (isDev) {
      browserWindow?.webContents.openDevTools({ mode: 'detach' })
    }
  })

  const pageUrl =
    isDev && import.meta.env.VITE_DEV_SERVER_URL !== undefined
      ? import.meta.env.VITE_DEV_SERVER_URL
      : `file://${join(__dirname, './web/index.html')}`

  await browserWindow.loadURL(pageUrl)

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
  }

  if (window.isMinimized()) {
    window.restore()
  }

  window.focus()
}
