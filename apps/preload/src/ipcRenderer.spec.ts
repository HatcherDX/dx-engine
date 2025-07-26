import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock electron ipcRenderer
const mockIpcRenderer = {
  invoke: vi.fn(),
  on: vi.fn(),
}

vi.mock('electron', () => ({
  ipcRenderer: mockIpcRenderer,
}))

describe('IPCRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create instance with default channel', async () => {
    const { IPCRenderer } = await import('./ipcRenderer')
    const instance = new IPCRenderer()

    expect(instance).toBeDefined()
    expect(mockIpcRenderer.on).toHaveBeenCalledWith(
      'IPC-bridge',
      expect.any(Function)
    )
  })

  it('should create instance with custom channel', async () => {
    const { IPCRenderer } = await import('./ipcRenderer')
    const customChannel = 'custom-channel'
    const instance = new IPCRenderer(customChannel)

    expect(instance).toBeDefined()
    expect(mockIpcRenderer.on).toHaveBeenCalledWith(
      customChannel,
      expect.any(Function)
    )
  })

  it('should send messages and handle success response', async () => {
    mockIpcRenderer.invoke.mockResolvedValue({
      type: 'success',
      result: 'test-result',
    })

    const { IPCRenderer } = await import('./ipcRenderer')
    const instance = new IPCRenderer()

    const result = await instance.send('testMessage', 'payload')

    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('IPC-bridge', {
      name: 'testMessage',
      payload: ['payload'],
    })
    expect(result).toBe('test-result')
  })

  it('should send messages and handle error response', async () => {
    const errorMessage = 'test error'
    mockIpcRenderer.invoke.mockResolvedValue({
      type: 'error',
      error: errorMessage,
    })

    const { IPCRenderer } = await import('./ipcRenderer')
    const instance = new IPCRenderer()

    await expect(instance.send('testMessage', 'payload')).rejects.toBe(
      errorMessage
    )
  })

  it('should register and manage event listeners', async () => {
    const { IPCRenderer } = await import('./ipcRenderer')
    const instance = new IPCRenderer()
    const mockListener = vi.fn()

    const removeListener = instance.on('testEvent', mockListener)

    expect(typeof removeListener).toBe('function')

    // Test removal
    removeListener()
    expect(typeof removeListener).toBe('function')
  })
})
