import { Menu, MenuItemConstructorOptions } from 'electron'
import { isDev } from './utils'
import { ipcMain } from './ipc'

/**
 * Setup application menu with custom Development menu in dev mode
 */
export function setupApplicationMenu() {
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
                enabled: false,
                accelerator: 'Cmd+,',
                click: () => {
                  // TODO: Open settings dialog
                },
              },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideothers' as const },
              { role: 'unhide' as const },
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
                label: 'Settings...',
                enabled: false,
                click: () => {
                  // TODO: Open settings dialog
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
