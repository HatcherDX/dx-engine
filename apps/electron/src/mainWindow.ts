import { BrowserWindow } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { isDev, isPackaged } from '/@/utils/'

/**
 * Creates a new browser window with proper configuration
 */
async function createWindow() {
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
    // Use 'ready-to-show' event to show window
    show: false,
    // Set the application icon if found
    ...(iconPath && { icon: iconPath }),
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
