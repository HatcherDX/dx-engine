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

    // Mock console.log to catch error display
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await expect(instance.send('testMessage', 'payload')).rejects.toBe(
      errorMessage
    )

    // Verify error was logged to console
    expect(consoleSpy).toHaveBeenCalledWith(errorMessage)

    consoleSpy.mockRestore()
  })

  it('should handle ipcRenderer.invoke rejection', async () => {
    const rejectionError = new Error('invoke failed')
    mockIpcRenderer.invoke.mockRejectedValue(rejectionError)

    const { IPCRenderer } = await import('./ipcRenderer')
    const instance = new IPCRenderer()

    await expect(instance.send('testMessage', 'payload')).rejects.toBe(
      rejectionError
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

  it('should handle background message reception with listeners', async () => {
    const { IPCRenderer } = await import('./ipcRenderer')
    const instance = new IPCRenderer()

    // Mock listener functions
    const listener1 = vi.fn()
    const listener2 = vi.fn()

    // Register listeners for the same message type
    instance.on('background-message', listener1)
    instance.on('background-message', listener2)

    // Get the handler that was registered with ipcRenderer.on
    const onCall = mockIpcRenderer.on.mock.calls.find(
      (call) => call[0] === 'IPC-bridge'
    )
    expect(onCall).toBeDefined()

    const messageHandler = onCall[1]

    // Simulate receiving a background message
    const mockEvent = {}
    const mockPayloadData = {
      name: 'background-message',
      payload: ['arg1', 'arg2'],
    }

    messageHandler(mockEvent, mockPayloadData)

    // Both listeners should have been called
    expect(listener1).toHaveBeenCalledWith('arg1', 'arg2')
    expect(listener2).toHaveBeenCalledWith('arg1', 'arg2')
  })

  it('should handle background message reception without listeners', async () => {
    const { IPCRenderer } = await import('./ipcRenderer')
    new IPCRenderer()

    // Get the handler that was registered with ipcRenderer.on
    const onCall = mockIpcRenderer.on.mock.calls.find(
      (call) => call[0] === 'IPC-bridge'
    )
    expect(onCall).toBeDefined()

    const messageHandler = onCall[1]

    // Simulate receiving a background message with no listeners
    const mockEvent = {}
    const mockPayloadData = {
      name: 'unknown-background-message',
      payload: ['arg1'],
    }

    // Should not throw error when no listeners exist
    expect(() => messageHandler(mockEvent, mockPayloadData)).not.toThrow()
  })

  it('should test listener removal functionality', async () => {
    const { IPCRenderer } = await import('./ipcRenderer')
    const instance = new IPCRenderer()

    const listener = vi.fn()

    // Register and then remove listener
    const unsubscribe = instance.on('test-message', listener)

    // Get the message handler
    const onCall = mockIpcRenderer.on.mock.calls.find(
      (call) => call[0] === 'IPC-bridge'
    )
    const messageHandler = onCall[1]

    // Test that listener is initially registered
    messageHandler({}, { name: 'test-message', payload: [] })
    expect(listener).toHaveBeenCalledTimes(1)

    // Remove listener
    unsubscribe()
    listener.mockClear()

    // Test that listener is no longer called
    messageHandler({}, { name: 'test-message', payload: [] })
    expect(listener).not.toHaveBeenCalled()
  })
})
