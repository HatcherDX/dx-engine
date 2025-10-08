/**
 * @fileoverview Mock electron module for testing electron-preload-transformed.mjs.
 *
 * @description
 * This module provides mocked electron APIs for testing purposes.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { vi } from 'vitest'

// Create mocks that will be exported
export const contextBridge = {
  exposeInMainWorld: vi.fn(),
}

export const ipcRenderer = {
  invoke: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
}

/**
 * Reset mocks to clean state.
 * @public
 */
export function resetMocks() {
  contextBridge.exposeInMainWorld.mockClear()
  ipcRenderer.invoke.mockClear()
  ipcRenderer.on.mockClear()
  ipcRenderer.removeListener.mockClear()
}
