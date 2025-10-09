/**
 * @fileoverview Test setup for CI environment with mocked Electron.
 *
 * @description
 * Setup file that ensures all Electron APIs are mocked before any tests run.
 * This allows tests to execute in CI environments without requiring
 * Electron installation or display server.
 *
 * CRITICAL: This file is loaded as setupFiles in vitest.ci.config.ts.
 * DO NOT import from 'vitest' here (vi, afterEach, etc.) as it causes
 * "Vitest failed to access its internal state" errors in CI environments.
 *
 * With globals: true enabled in vitest.ci.config.ts, all vitest utilities
 * (vi, describe, it, expect, afterEach, etc.) are available globally.
 * Just use them directly without importing or declaring.
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
 * @see https://vitest.dev/config/#globals
 * @see https://vitest.dev/config/#setupfiles
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @internal
 */

// vi is available globally via globals: true
// No need to import or declare - just use it directly

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
