import { app } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import './ipc'
import { initializeTerminalSystem, destroyTerminalSystem } from './terminalIPC'
import {
  initializeSystemTerminalIPC,
  destroySystemTerminalIPC,
} from './systemTerminalIPC'
import { setupAIChatIPC } from './aiChatIPC'
import { setupCommandsIPC } from './commandsIPC'
import { setupActionsIPC, destroyActionsIPC } from './actionsIPC'
import { restoreOrCreateWindow } from './mainWindow'
import { setupDevConsoleFilter } from './utils/devConsoleFilter'
import {
  initStorage,
  registerStorageHandlers,
  shutdownStorage,
} from './ipc/storageHandlers'

console.log('🔄 [MAIN] Electron main process started')

// Handle uncaught EPIPE errors gracefully
process.on('uncaughtException', (error: Error) => {
  if (error.code === 'EPIPE') {
    console.log('[MAIN] EPIPE error caught and handled gracefully')
    return
  }
  console.error('[MAIN] Uncaught Exception:', error)
  throw error
})

// Setup development console filtering early
setupDevConsoleFilter({ enabled: true })

console.log('🔄 [MAIN] Console filter setup complete')

console.log('🔄 [MAIN] Storage service initialization prepared')

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
console.log('🔍 [MAIN] Single instance lock requested:', isSingleInstance)
if (!isSingleInstance) {
  console.log('⚠️ [MAIN] Another instance is already running, quitting...')
  app.quit()
  process.exit(0)
}
console.log('✅ [MAIN] Single instance lock acquired')
app.on('second-instance', restoreOrCreateWindow)

/**
 * Shut down background process if all windows were closed
 */
app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    // Cleanup all systems before quitting
    destroyActionsIPC()
    destroySystemTerminalIPC()
    destroyTerminalSystem()
    await shutdownStorage()
    app.quit()
  }
})

/**
 * Handle Cmd+Q properly on macOS
 */
app.on('before-quit', async () => {
  console.log('🔄 Quitting application...')
  // Cleanup all systems before quitting
  destroyActionsIPC()
  destroySystemTerminalIPC()
  destroyTerminalSystem()
  await shutdownStorage()
  app.exit(0)
})

/**
 * @see https://www.electronjs.org/docs/v14-x-y/api/app#event-activate-macos Event: 'activate'
 */
app.on('activate', restoreOrCreateWindow)

/**
 * Initialize enterprise storage service
 */
async function initializeStorageService(): Promise<void> {
  try {
    console.log('🔐 [MAIN] Step 1a: Initializing ElectronStorageManager...')
    await initStorage()

    console.log('🔐 [MAIN] Step 1b: Registering storage handlers...')
    registerStorageHandlers()

    console.log('✅ [MAIN] Enterprise storage service initialized successfully')
  } catch (error) {
    console.error('❌ [MAIN] CRITICAL: Failed to initialize storage service')
    console.error('❌ [MAIN] Error:', error)
    console.error(
      '❌ [MAIN] Error stack:',
      error instanceof Error ? error.stack : 'No stack'
    )
    console.error(
      '❌ [MAIN] App will continue but storage features will not work'
    )
    // DO NOT register handlers if storage failed to initialize
    // This will cause proper error messages instead of silent failures
    throw error // Re-throw to prevent app from appearing to work when it's broken
  }
}

/**
 * Create app window when background process will be ready
 */
try {
  console.log('🔄 [MAIN] Starting app.whenReady() process...')
  console.log('🔍 [MAIN] App ready status:', app.isReady())

  // Simple approach: if app is already ready, proceed immediately
  if (app.isReady()) {
    console.log('🎯 [MAIN] App is already ready, proceeding immediately!')
    initializeAppSystems().catch((error) => {
      console.error('❌ [MAIN] Failed to initialize app systems:', error)
      console.error(
        '❌ [MAIN] Error stack:',
        error instanceof Error ? error.stack : 'No stack'
      )
    })
  } else {
    console.log('📋 [MAIN] App not ready, waiting for ready event...')
    app
      .whenReady()
      .then(async () => {
        console.log('🎯 [MAIN] app.whenReady() executed!')
        await initializeAppSystems()
      })
      .catch((error) => {
        console.error('❌ [MAIN] Failed to initialize application:', error)
        console.error(
          '❌ [MAIN] Error stack:',
          error instanceof Error ? error.stack : 'No stack'
        )
      })
  }
} catch (error) {
  console.error('❌ [MAIN] Fatal error in initialization setup:', error)
  console.error(
    '❌ [MAIN] Error stack:',
    error instanceof Error ? error.stack : 'No stack'
  )
}

async function initializeAppSystems() {
  try {
    console.log('🚀 [MAIN] App ready, initializing systems in correct order...')

    // 1. Initialize storage service FIRST (before anything else)
    console.log('📦 [MAIN] Step 1: Initializing storage service...')
    await initializeStorageService()
    console.log('✅ [MAIN] Step 1: Storage service ready')

    // 2. Initialize terminal systems
    console.log('📦 [MAIN] Step 2: Initializing terminal systems...')
    initializeTerminalSystem()
    initializeSystemTerminalIPC()
    console.log('✅ [MAIN] Step 2: Terminal systems ready')

    // 3. Initialize AI Chat IPC
    console.log('📦 [MAIN] Step 3: Initializing AI Chat IPC...')
    setupAIChatIPC()
    console.log('✅ [MAIN] Step 3: AI Chat IPC ready')

    // 4. Initialize Commands IPC
    console.log('📦 [MAIN] Step 4: Initializing Commands IPC...')
    setupCommandsIPC()
    console.log('✅ [MAIN] Step 4: Commands IPC ready')

    // 5. Initialize Actions IPC
    console.log('📦 [MAIN] Step 5: Initializing Actions IPC...')
    setupActionsIPC()
    console.log('✅ [MAIN] Step 5: Actions IPC ready')

    // 6. THEN create window (all handlers are now ready)
    console.log('📦 [MAIN] Step 6: Creating main window...')
    const window = await restoreOrCreateWindow()
    console.log('✅ [MAIN] Step 5: Main window ready')

    console.log('🎉 [MAIN] All systems initialized successfully!')
    return window
  } catch (error) {
    console.error('❌ [MAIN] Failed to initialize systems:', error)
    console.error(
      '❌ [MAIN] Error stack:',
      error instanceof Error ? error.stack : 'No stack'
    )
  }
}
