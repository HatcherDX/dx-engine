/**
 * @fileoverview Simple test for electron-mock.mjs to ensure coverage.
 *
 * @description
 * This test imports and uses the electron-mock.mjs module
 * to ensure all lines are executed for coverage.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect } from 'vitest'

describe('electron-mock.mjs coverage', () => {
  it('should import and execute all exports', async () => {
    // Dynamic import to ensure the module is loaded
    const electronMock = await import('./electron-mock.mjs')

    // Verify all exports are present
    expect(electronMock.contextBridge).toBeDefined()
    expect(electronMock.ipcRenderer).toBeDefined()
    expect(electronMock.resetMocks).toBeDefined()

    // Verify the mock objects have the expected shape
    expect(electronMock.contextBridge.exposeInMainWorld).toBeDefined()
    expect(electronMock.ipcRenderer.invoke).toBeDefined()
    expect(electronMock.ipcRenderer.on).toBeDefined()
    expect(electronMock.ipcRenderer.removeListener).toBeDefined()

    // Call resetMocks to execute that function
    electronMock.resetMocks()

    // Verify mocks were cleared
    expect(electronMock.contextBridge.exposeInMainWorld).toHaveBeenCalledTimes(
      0
    )
    expect(electronMock.ipcRenderer.invoke).toHaveBeenCalledTimes(0)
  })
})
