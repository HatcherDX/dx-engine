import { Menu, MenuItemConstructorOptions, BrowserWindow } from 'electron'
import { isDev } from './utils'
import { ipcMain } from './ipc'

// Store reference to main window
let mainWindow: BrowserWindow | null = null

/**
 * Open Settings view in the renderer
 */
function openSettings() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    console.log('[Menu] Sending open-settings event to renderer')
    mainWindow.webContents.send('open-settings')
  } else {
    console.warn('[Menu] Cannot open settings: Main window not available')
  }
}

/**
 * Setup application menu with custom Development menu in dev mode
 */
export function setupApplicationMenu(window?: BrowserWindow) {
  // Store the window reference if provided
  if (window) {
    mainWindow = window
    console.log('[Menu] Main window reference stored for menu commands')
  }
  const isMac = process.platform === 'darwin'

  const template: MenuItemConstructorOptions[] = [
    // App Menu (macOS) / File Menu (Windows/Linux)
    ...(isMac
      ? [
          {
            label: 'Hatcher',
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              {
                label: 'Settings...',
                enabled: true,
                accelerator: 'Cmd+,',
                click: () => {
                  openSettings()
                },
              },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideothers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              {
                label: 'Close Task',
                accelerator: 'Cmd+W',
                click: () => {
                  closeTask()
                },
              },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : [
          {
            label: 'File',
            submenu: [
              {
                label: 'Close Task',
                accelerator: 'CmdOrCtrl+W',
                click: () => {
                  closeTask()
                },
              },
              { type: 'separator' as const },
              {
                label: 'Settings...',
                enabled: true,
                accelerator: 'CmdOrCtrl+,',
                click: () => {
                  openSettings()
                },
              },
              { type: 'separator' as const },
              {
                label: 'About Hatcher',
                click: () => {
                  // Could show about dialog
                },
              },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]),

    // Edit Menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' as const },
              { role: 'delete' as const },
              { role: 'selectAll' as const },
              { type: 'separator' as const },
              {
                label: 'Speech',
                submenu: [
                  { role: 'startSpeaking' as const },
                  { role: 'stopSpeaking' as const },
                ],
              },
            ]
          : [
              { role: 'delete' as const },
              { type: 'separator' as const },
              { role: 'selectAll' as const },
            ]),
      ],
    },

    // View Menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
      ],
    },

    // Tools Menu
    {
      label: 'Tools',
      submenu: [
        {
          label: 'Playbooks...',
          enabled: false,
          click: () => {
            // TODO: Open playbooks dialog
          },
        },
      ],
    },

    // Development Menu (only in development mode)
    ...(isDev
      ? [
          {
            label: 'Development',
            submenu: [
              {
                label: 'Simulate Platform',
                submenu: [
                  {
                    label: 'macOS',
                    type: 'radio' as const,
                    checked: process.platform === 'darwin',
                    click: () => {
                      simulatePlatform('macos')
                    },
                  },
                  {
                    label: 'Windows',
                    type: 'radio' as const,
                    checked: process.platform === 'win32',
                    click: () => {
                      simulatePlatform('windows')
                    },
                  },
                  {
                    label: 'Linux',
                    type: 'radio' as const,
                    checked: process.platform === 'linux',
                    click: () => {
                      simulatePlatform('linux')
                    },
                  },
                ],
              },
              { type: 'separator' as const },
              {
                label: 'Reset to Native Platform',
                click: () => {
                  resetToNativePlatform()
                },
              },
            ],
          },
        ]
      : []),

    // Window Menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'close' as const },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const },
            ]
          : [{ role: 'close' as const }]),
      ],
    },

    // Help Menu
    {
      role: 'help' as const,
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            const { shell } = require('electron')
            await shell.openExternal('https://hatcher.dev')
          },
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

/**
 * Simulate a different platform in the renderer process
 */
function simulatePlatform(platform: 'macos' | 'windows' | 'linux') {
  // Use the custom IPC system
  ipcMain.send('simulate-platform', platform)
}

/**
 * Close current task and return to onboarding
 */
function closeTask() {
  console.log('[Menu] Close Task menu item clicked')

  // Try to use the stored main window first, then fall back to focused window
  const targetWindow = mainWindow || BrowserWindow.getFocusedWindow()

  if (targetWindow && !targetWindow.isDestroyed()) {
    console.log('[Menu] Sending close-task message to renderer')
    targetWindow.webContents.send('close-task')
  } else {
    console.warn('[Menu] No valid window found to send close-task message')
  }
}

/**
 * Reset to the native platform
 */
function resetToNativePlatform() {
  let nativePlatform: 'macos' | 'windows' | 'linux'
  if (process.platform === 'darwin') {
    nativePlatform = 'macos'
  } else if (process.platform === 'win32') {
    nativePlatform = 'windows'
  } else {
    nativePlatform = 'linux'
  }

  // Use the custom IPC system
  ipcMain.send('simulate-platform', nativePlatform)
}
