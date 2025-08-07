import { app } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import './ipc'
import { initializeTerminalSystem, destroyTerminalSystem } from './terminalIPC'
import { restoreOrCreateWindow } from '/@/mainWindow'
import { setupDevConsoleFilter } from '/@/utils/devConsoleFilter'

// Setup development console filtering early
setupDevConsoleFilter({ enabled: true })

/**
 * Set application icon for dock
 */
if (process.platform === 'darwin') {
  // Try different icon paths for development and production
  const iconPaths = [
    join(__dirname, '../build/icon.png'),
    join(__dirname, '../build/icon.icns'),
    join(__dirname, '../../build/icon.png'),
    join(__dirname, '../../build/icon.icns'),
    join(process.cwd(), 'apps/electron/build/icon.png'),
    join(process.cwd(), 'apps/electron/build/icon.icns'),
  ]

  const iconPath = iconPaths.find((path) => existsSync(path))
  if (iconPath) {
    try {
      app.dock?.setIcon(iconPath)
      console.log('✅ Dock icon set successfully:', iconPath)
    } catch (error) {
      console.log('⚠️ Failed to set dock icon:', error)
    }
  } else {
    console.log('⚠️ Icon file not found in any of the expected locations')
  }
}

/**
 * Prevent multiple instances
 */
const isSingleInstance = app.requestSingleInstanceLock()
if (!isSingleInstance) {
  app.quit()
  process.exit(0)
}
app.on('second-instance', restoreOrCreateWindow)

/**
 * Shut down background process if all windows were closed
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Cleanup terminal system before quitting
    destroyTerminalSystem()
    app.quit()
  }
})

/**
 * Handle Cmd+Q properly on macOS
 */
app.on('before-quit', () => {
  console.log('🔄 Quitting application...')
  // Cleanup terminal system before quitting
  destroyTerminalSystem()
  app.exit(0)
})

/**
 * @see https://www.electronjs.org/docs/v14-x-y/api/app#event-activate-macos Event: 'activate'
 */
app.on('activate', restoreOrCreateWindow)

/**
 * Create app window when background process will be ready
 */
app
  .whenReady()
  .then(() => {
    // Initialize terminal system first
    initializeTerminalSystem()
    // Then create window
    return restoreOrCreateWindow()
  })
  .catch((error) => console.error('Failed to create window:', error))
