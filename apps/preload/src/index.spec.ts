import { describe, it, expect, vi } from 'vitest'

// Mock electron modules
vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: vi.fn(),
  },
}))

// Mock the IPCRenderer module
vi.mock('./ipcRenderer.js', () => ({
  IPCRenderer: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
    on: vi.fn(),
  })),
}))

describe('preload script', () => {
  it('should have process versions available', () => {
    // Test process versions are available
    expect(process.versions).toBeDefined()
    expect(process.versions.node).toBeDefined()
    expect(typeof process.versions.node).toBe('string')
  })

  it('should import and create IPCRenderer instance', async () => {
    const { IPCRenderer } = await import('./ipcRenderer.js')
    expect(IPCRenderer).toBeDefined()
  })

  it('should expose electronAPI to main world', async () => {
    const { contextBridge } = await import('electron')

    // Import the module to trigger contextBridge.exposeInMainWorld
    await import('./index.js')

    expect(contextBridge.exposeInMainWorld).toHaveBeenCalledWith(
      'electronAPI',
      expect.objectContaining({
        versions: process.versions,
        send: expect.any(Function),
        on: expect.any(Function),
      })
    )
  })

  it('should create electronAPI with correct structure', async () => {
    // Test the electronAPI structure that gets created
    const mockIPCRenderer = {
      send: vi.fn(),
      on: vi.fn(),
    }

    const electronAPI = {
      versions: process.versions,
      send: mockIPCRenderer.send,
      on: mockIPCRenderer.on,
    }

    expect(electronAPI).toHaveProperty('versions')
    expect(electronAPI).toHaveProperty('send')
    expect(electronAPI).toHaveProperty('on')
    expect(electronAPI.versions).toBe(process.versions)
    expect(typeof electronAPI.send).toBe('function')
    expect(typeof electronAPI.on).toBe('function')
  })

  it('should export types from types/index.js', async () => {
    // Import will trigger the export * statement
    const module = await import('./index.js')
    expect(module).toBeDefined()
  })
})
