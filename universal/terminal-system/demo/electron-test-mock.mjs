/**
 * @fileoverview Mock electron module for testing electron-preload.js with coverage.
 *
 * @description
 * This ESM module provides mocked electron APIs that can be used in tests.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { vi } from 'vitest'

// Create mock implementations using vitest
export const mockContextBridge = {
  exposeInMainWorld: vi.fn(),
}

export const mockIpcRenderer = {
  invoke: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
}

export const contextBridge = mockContextBridge
export const ipcRenderer = mockIpcRenderer
