import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock electron API
const mockElectronAPI = {
  invoke: vi.fn(),
  send: vi.fn(),
  on: vi.fn(),
}

// Mock useTerminalModeDetector
const mockModeDetector = {
  currentMode: { value: 'electron' },
  isElectronMode: { value: true },
  isWebMode: { value: false },
  isConnected: { value: true },
  sendMessage: vi.fn(),
  onMessage: vi.fn(),
}

// Mock the mode detector module
vi.mock('./useTerminalModeDetector', () => ({
  useTerminalModeDetector: () => mockModeDetector,
}))

// Create a fresh module for each test to avoid shared state
async function createFreshManager() {
  // Clear the module cache for the composable
  vi.resetModules()
  const { useTerminalManager } = await import('./useTerminalManager')
  return useTerminalManager()
}

describe('useTerminalManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset global electron API
    ;(global as unknown as { window: unknown }).window = {
      electronAPI: mockElectronAPI,
    }

    // Reset mode detector mocks
    mockModeDetector.currentMode.value = 'electron'
    mockModeDetector.isElectronMode.value = true
    mockModeDetector.isWebMode.value = false
    mockModeDetector.isConnected.value = true
  })

  it('creates a terminal with default name', async () => {
    mockElectronAPI.invoke.mockResolvedValue({
      success: true,
      data: {
        id: 'terminal-1',
        name: 'Terminal 1',
        pid: 1234,
        shell: '/bin/bash',
        cwd: '/home/user',
      },
    })

    const { createTerminal, terminals } = await createFreshManager()

    const terminal = await createTerminal()

    expect(terminal.name).toBe('Terminal 1')
    expect(terminal.isActive).toBe(true)
    expect(terminal.isRunning).toBe(true)
    expect(terminals.value).toHaveLength(1)
  })

  it('creates a terminal with custom name', async () => {
    mockElectronAPI.invoke.mockResolvedValue({
      success: true,
      data: {
        id: 'terminal-1',
        name: 'Custom Terminal',
        pid: 1234,
        shell: '/bin/bash',
        cwd: '/home/user',
      },
    })

    const { createTerminal } = await createFreshManager()

    const terminal = await createTerminal({ name: 'Custom Terminal' })

    expect(terminal.name).toBe('Custom Terminal')
  })

  it('sets active terminal correctly', async () => {
    mockElectronAPI.invoke
      .mockResolvedValueOnce({
        success: true,
        data: {
          id: 'terminal-1',
          name: 'Terminal 1',
          pid: 1234,
          shell: '/bin/bash',
          cwd: '/home/user',
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          id: 'terminal-2',
          name: 'Terminal 2',
          pid: 1235,
          shell: '/bin/bash',
          cwd: '/home/user',
        },
      })

    const { createTerminal, setActiveTerminal, activeTerminalId } =
      await createFreshManager()

    const terminal1 = await createTerminal()
    const terminal2 = await createTerminal()

    expect(activeTerminalId.value).toBe(terminal1.id) // First terminal should be active

    setActiveTerminal(terminal2.id)
    expect(activeTerminalId.value).toBe(terminal2.id)
  })

  it('closes terminal correctly', async () => {
    mockElectronAPI.invoke
      .mockResolvedValueOnce({
        success: true,
        data: {
          id: 'terminal-1',
          name: 'Terminal 1',
          pid: 1234,
          shell: '/bin/bash',
          cwd: '/home/user',
        },
      })
      .mockResolvedValueOnce({
        success: true,
      })

    const { createTerminal, closeTerminal, terminals } =
      await createFreshManager()

    await createTerminal()
    expect(terminals.value).toHaveLength(1)

    await closeTerminal('terminal-1')
    expect(terminals.value).toHaveLength(0)
  })

  it('creates terminal successfully', async () => {
    mockElectronAPI.invoke.mockResolvedValue({
      success: true,
      data: {
        id: 'terminal-1',
        name: 'Terminal 1',
        pid: 1234,
        shell: '/bin/bash',
        cwd: '/home/user',
      },
    })

    const { createTerminal, terminals } = await createFreshManager()

    const terminal = await createTerminal()

    expect(terminal.id).toBe('terminal-1')
    expect(terminal.name).toBe('Terminal 1')
    expect(terminals.value).toHaveLength(1)
  })

  it('handles terminal creation failure', async () => {
    mockElectronAPI.invoke.mockResolvedValue({
      success: false,
      error: 'Failed to create terminal',
    })

    const { createTerminal, terminals } = await createFreshManager()

    await expect(createTerminal()).rejects.toThrow('Failed to create terminal')
    expect(terminals.value).toHaveLength(1) // Failed terminal is still added for UI feedback
    expect(terminals.value[0].name).toContain('(Failed)')
  })

  it('tracks running count correctly', async () => {
    mockElectronAPI.invoke
      .mockResolvedValueOnce({
        success: true,
        data: {
          id: 'terminal-1',
          name: 'Terminal 1',
          pid: 1234,
          shell: '/bin/bash',
          cwd: '/home/user',
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          id: 'terminal-2',
          name: 'Terminal 2',
          pid: 1235,
          shell: '/bin/bash',
          cwd: '/home/user',
        },
      })

    const { createTerminal, runningCount, terminals } =
      await createFreshManager()

    expect(runningCount.value).toBe(0)

    await createTerminal()
    expect(runningCount.value).toBe(1)

    await createTerminal()
    expect(runningCount.value).toBe(2)

    // Simulate terminal stop
    terminals.value[0].isRunning = false
    expect(runningCount.value).toBe(1)
  })

  it('works in web mode with WebSocket', async () => {
    // Setup web mode
    mockModeDetector.currentMode.value = 'web'
    mockModeDetector.isElectronMode.value = false
    mockModeDetector.isWebMode.value = true
    mockModeDetector.isConnected.value = true
    mockModeDetector.sendMessage.mockResolvedValue({
      terminalId: 'terminal-ws-1',
      pid: 1234,
      shell: '/bin/bash',
      cwd: '/home/user',
    })
    ;(global as unknown as { window: unknown }).window = {}

    const { createTerminal, terminals } = await createFreshManager()

    const terminal = await createTerminal()

    expect(terminal.id).toBe('terminal-ws-1')
    expect(terminal.name).toBe('Terminal 1')
    expect(terminals.value).toHaveLength(1)
    expect(mockModeDetector.sendMessage).toHaveBeenCalledWith(
      'create',
      expect.any(Object)
    )
  })

  it('handles web mode when disconnected', async () => {
    // Setup web mode but disconnected
    mockModeDetector.currentMode.value = 'web'
    mockModeDetector.isElectronMode.value = false
    mockModeDetector.isWebMode.value = true
    mockModeDetector.isConnected.value = false
    ;(global as unknown as { window: unknown }).window = {}

    const { createTerminal } = await createFreshManager()

    await expect(createTerminal()).rejects.toThrow(
      'Terminal server not available. Please run in Electron mode or ensure WebSocket terminal server is running on port 3001.'
    )
  })

  it('clears all terminals', async () => {
    mockElectronAPI.invoke
      .mockResolvedValueOnce({
        success: true,
        data: {
          id: 'terminal-1',
          name: 'Terminal 1',
          pid: 1234,
          shell: '/bin/bash',
          cwd: '/home/user',
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          id: 'terminal-2',
          name: 'Terminal 2',
          pid: 1235,
          shell: '/bin/bash',
          cwd: '/home/user',
        },
      })

    const { createTerminal, clearAllTerminals, terminals } =
      await createFreshManager()

    await createTerminal()
    await createTerminal()
    expect(terminals.value).toHaveLength(2)

    clearAllTerminals()
    expect(terminals.value).toHaveLength(0)
  })
})
