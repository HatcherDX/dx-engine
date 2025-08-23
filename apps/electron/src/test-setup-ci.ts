/**
 * @fileoverview Test setup for CI environment with mocked Electron.
 *
 * @description
 * Setup file that ensures all Electron APIs are mocked before any tests run.
 * This allows tests to execute in CI environments without requiring
 * Electron installation or display server.
 *
 * @remarks
 * This setup forces mocking of all Electron APIs to ensure tests can run
 * in any CI environment regardless of Electron availability.
 *
 * @example
 * ```typescript
 * // Automatically loaded by vitest.ci.config.ts
 * // All Electron imports will return mocked implementations
 * import { app, BrowserWindow } from 'electron' // Returns mocks
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

import { vi } from 'vitest'

// Force CI environment
process.env.CI = 'true'
process.env.VITEST_MOCK_ELECTRON = 'true'

console.log('🛡️ Electron CI Setup: Forcing mock environment for Electron APIs')

// Mock Electron before any imports
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => `/mock/path/${name}`),
    getAppPath: vi.fn(() => '/mock/app/path'),
    setPath: vi.fn(),
    quit: vi.fn(),
    whenReady: vi.fn(() => Promise.resolve()),
    on: vi.fn(),
    getName: vi.fn(() => 'MockApp'),
    getVersion: vi.fn(() => '1.0.0'),
  },
  BrowserWindow: vi.fn().mockImplementation(() => ({
    loadURL: vi.fn(),
    loadFile: vi.fn(),
    on: vi.fn(),
    webContents: {
      send: vi.fn(),
      openDevTools: vi.fn(),
      on: vi.fn(),
    },
    show: vi.fn(),
    close: vi.fn(),
    minimize: vi.fn(),
    maximize: vi.fn(),
  })),
  Menu: {
    buildFromTemplate: vi.fn(),
    setApplicationMenu: vi.fn(),
  },
  dialog: {
    showOpenDialog: vi.fn(() =>
      Promise.resolve({ canceled: false, filePaths: ['/mock/file.txt'] })
    ),
    showSaveDialog: vi.fn(() =>
      Promise.resolve({ canceled: false, filePath: '/mock/save.txt' })
    ),
    showMessageBox: vi.fn(() => Promise.resolve({ response: 0 })),
  },
  shell: {
    openExternal: vi.fn(),
    openPath: vi.fn(),
  },
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
    removeHandler: vi.fn(),
  },
  ipcRenderer: {
    invoke: vi.fn(),
    send: vi.fn(),
    on: vi.fn(),
  },
}))

console.log('✅ Electron CI Setup: Mocks applied successfully')
