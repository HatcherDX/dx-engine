import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock electron modules
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
  },
}))

describe('IPCMain', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create IPCMain instance with default channel', async () => {
    const { IPCMain } = await import('./ipcMain.js')

    // Mock the ipcMain.handle to avoid the actual electron binding
    const { ipcMain } = await import('electron')

    const instance = new IPCMain()

    expect(instance).toBeDefined()
    expect(ipcMain.handle).toHaveBeenCalledWith(
      'IPC-bridge',
      expect.any(Function)
    )
  })

  it('should create IPCMain instance with custom channel', async () => {
    const { IPCMain } = await import('./ipcMain.js')
    const { ipcMain } = await import('electron')

    const customChannel = 'custom-channel'
    const instance = new IPCMain(customChannel)

    expect(instance).toBeDefined()
    expect(ipcMain.handle).toHaveBeenCalledWith(
      customChannel,
      expect.any(Function)
    )
  })

  it('should register message handlers with on method', async () => {
    const { IPCMain } = await import('./ipcMain.js')

    const instance = new IPCMain()
    const mockHandler = vi.fn()

    // Test the on method
    instance.on('test-message', mockHandler)

    // Verify no error is thrown for valid registration
    expect(() => instance.on('another-message', mockHandler)).not.toThrow()
  })

  it('should throw error when registering duplicate handlers', async () => {
    const { IPCMain } = await import('./ipcMain.js')

    const instance = new IPCMain()
    const mockHandler = vi.fn()

    instance.on('test-message', mockHandler)

    // Should throw error for duplicate registration
    expect(() => instance.on('test-message', mockHandler)).toThrow(
      'Message handler test-message already exists'
    )
  })

  it('should remove message handlers with off method', async () => {
    const { IPCMain } = await import('./ipcMain.js')

    const instance = new IPCMain()
    const mockHandler = vi.fn()

    instance.on('test-message', mockHandler)
    instance.off('test-message')

    // Should be able to register again after removal
    expect(() => instance.on('test-message', mockHandler)).not.toThrow()
  })

  it('should send messages to renderer processes', async () => {
    const { IPCMain } = await import('./ipcMain.js')
    const { BrowserWindow } = await import('electron')

    const mockWindow = {
      webContents: {
        send: vi.fn(),
      },
    }

    vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([
      mockWindow as unknown as BrowserWindow,
    ])

    const instance = new IPCMain()
    instance.send('test-message', { data: 'test' })

    expect(mockWindow.webContents.send).toHaveBeenCalledWith('IPC-bridge', {
      name: 'test-message',
      payload: [{ data: 'test' }],
    })
  })

  it('should handle console logging in on method', async () => {
    const { IPCMain } = await import('./ipcMain.js')

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const instance = new IPCMain()
    instance.on('test-message', vi.fn())

    expect(consoleSpy).toHaveBeenCalledWith('on', 'test-message')

    consoleSpy.mockRestore()
  })

  it('should work with typed message interfaces', async () => {
    const { IPCMain } = await import('./ipcMain.js')

    // Define message types for testing
    interface TestMessages {
      'get-data': () => string
      'set-data': (data: string) => void
    }

    interface TestBackgroundMessages {
      'bg-update': (info: string) => void
    }

    const instance = new IPCMain<TestMessages, TestBackgroundMessages>()

    const getData = vi.fn(() => 'test-data')
    const setData = vi.fn()

    instance.on('get-data', getData)
    instance.on('set-data', setData)

    expect(() => instance.on('get-data', getData)).toThrow()
  })

  it('should handle empty channel parameter', async () => {
    const { IPCMain } = await import('./ipcMain.js')
    const { ipcMain } = await import('electron')

    new IPCMain('')

    expect(ipcMain.handle).toHaveBeenCalledWith('', expect.any(Function))
  })

  it('should initialize with empty listeners object', async () => {
    const { IPCMain } = await import('./ipcMain.js')

    const instance = new IPCMain()

    // The listeners should start empty - we can test this by ensuring
    // we can register a handler without conflicts
    expect(() => instance.on('any-message', vi.fn())).not.toThrow()
    expect(instance).toBeDefined()
  })

  it('should handle message processing with handleReceivingMessage', async () => {
    const { IPCMain } = await import('./ipcMain.js')
    const { ipcMain } = await import('electron')

    const instance = new IPCMain()
    const testHandler = vi.fn(() => 'test-result')

    // Register a handler
    instance.on('test-command', testHandler)

    // Get the handler that was registered with ipcMain.handle
    const handleCall = vi
      .mocked(ipcMain.handle)
      .mock.calls.find((call) => call[0] === 'IPC-bridge')
    expect(handleCall).toBeDefined()

    const messageHandler = handleCall[1]

    // Test successful message handling
    const mockEvent = {}
    const mockPayload = {
      name: 'test-command',
      payload: ['arg1', 'arg2'],
    }

    const result = await messageHandler(mockEvent, mockPayload)

    expect(testHandler).toHaveBeenCalledWith('arg1', 'arg2')
    expect(result).toEqual({
      type: 'success',
      result: 'test-result',
    })
  })

  it('should handle unknown message errors in handleReceivingMessage', async () => {
    const { IPCMain } = await import('./ipcMain.js')
    const { ipcMain } = await import('electron')

    new IPCMain()

    // Get the handler that was registered with ipcMain.handle
    const handleCall = vi
      .mocked(ipcMain.handle)
      .mock.calls.find((call) => call[0] === 'IPC-bridge')
    expect(handleCall).toBeDefined()

    const messageHandler = handleCall[1]

    // Test unknown message handling
    const mockEvent = {}
    const mockPayload = {
      name: 'unknown-command',
      payload: [],
    }

    const result = await messageHandler(mockEvent, mockPayload)

    expect(result).toEqual({
      type: 'error',
      error: 'Unknown IPC message unknown-command',
    })
  })

  it('should handle handler execution errors in handleReceivingMessage', async () => {
    const { IPCMain } = await import('./ipcMain.js')
    const { ipcMain } = await import('electron')

    const instance = new IPCMain()
    const errorHandler = vi.fn(() => {
      throw new Error('Handler execution failed')
    })

    // Register a handler that throws an error
    instance.on('error-command', errorHandler)

    // Get the handler that was registered with ipcMain.handle
    const handleCall = vi
      .mocked(ipcMain.handle)
      .mock.calls.find((call) => call[0] === 'IPC-bridge')
    expect(handleCall).toBeDefined()

    const messageHandler = handleCall[1]

    // Test error handling
    const mockEvent = {}
    const mockPayload = {
      name: 'error-command',
      payload: [],
    }

    const result = await messageHandler(mockEvent, mockPayload)

    expect(result).toEqual({
      type: 'error',
      error: 'Handler execution failed',
    })
  })

  it('should handle non-Error exceptions in handleReceivingMessage', async () => {
    const { IPCMain } = await import('./ipcMain.js')
    const { ipcMain } = await import('electron')

    const instance = new IPCMain()
    const stringErrorHandler = vi.fn(() => {
      throw 'String error'
    })

    // Register a handler that throws a non-Error
    instance.on('string-error-command', stringErrorHandler)

    // Get the handler that was registered with ipcMain.handle
    const handleCall = vi
      .mocked(ipcMain.handle)
      .mock.calls.find((call) => call[0] === 'IPC-bridge')
    expect(handleCall).toBeDefined()

    const messageHandler = handleCall[1]

    // Test non-Error exception handling
    const mockEvent = {}
    const mockPayload = {
      name: 'string-error-command',
      payload: [],
    }

    const result = await messageHandler(mockEvent, mockPayload)

    expect(result).toEqual({
      type: 'error',
      error: 'String error',
    })
  })
})
