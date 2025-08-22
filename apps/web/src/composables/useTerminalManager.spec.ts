import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock electron API with proper vitest mock types
interface MockElectronAPI {
  versions: Record<string, string>
  send: ReturnType<typeof vi.fn>
  on: ReturnType<typeof vi.fn>
  invoke: ReturnType<typeof vi.fn>
  sendTerminalInput: ReturnType<typeof vi.fn>
  sendTerminalResize: ReturnType<typeof vi.fn>
  setTheme: ReturnType<typeof vi.fn>
  openProjectDialog: ReturnType<typeof vi.fn>
  statFile: ReturnType<typeof vi.fn>
  readDirectory: ReturnType<typeof vi.fn>
  pathExists: ReturnType<typeof vi.fn>
  isDirectory: ReturnType<typeof vi.fn>
  readFile: ReturnType<typeof vi.fn>
  scanDirectory: ReturnType<typeof vi.fn>
  getGitStatus: ReturnType<typeof vi.fn>
  getGitDiff: ReturnType<typeof vi.fn>
  getFileContent: ReturnType<typeof vi.fn>
  off: ReturnType<typeof vi.fn>
  systemTerminal: {
    initialize: ReturnType<typeof vi.fn>
    log: ReturnType<typeof vi.fn>
    gitOperation: ReturnType<typeof vi.fn>
    getTerminal: ReturnType<typeof vi.fn>
    listTerminals: ReturnType<typeof vi.fn>
    setActive: ReturnType<typeof vi.fn>
    clear: ReturnType<typeof vi.fn>
    getLines: ReturnType<typeof vi.fn>
    updateConfig: ReturnType<typeof vi.fn>
    onEvent: ReturnType<typeof vi.fn>
    onOutput: ReturnType<typeof vi.fn>
    onActivated: ReturnType<typeof vi.fn>
    onCleared: ReturnType<typeof vi.fn>
  }
}

const mockElectronAPI: MockElectronAPI = {
  versions: { node: '16.0.0', electron: '13.0.0', chrome: '91.0.0' },
  send: vi.fn(),
  on: vi.fn(),
  invoke: vi.fn().mockResolvedValue({}),
  sendTerminalInput: vi.fn(),
  sendTerminalResize: vi.fn(),
  setTheme: vi.fn(),
  openProjectDialog: vi.fn().mockResolvedValue({}),
  statFile: vi.fn().mockResolvedValue({}),
  readDirectory: vi.fn().mockResolvedValue([]),
  pathExists: vi.fn().mockResolvedValue(true),
  isDirectory: vi.fn().mockResolvedValue(true),
  readFile: vi.fn().mockResolvedValue(''),
  scanDirectory: vi.fn().mockResolvedValue([]),
  getGitStatus: vi.fn().mockResolvedValue({}),
  getGitDiff: vi.fn().mockResolvedValue(''),
  getFileContent: vi.fn().mockResolvedValue(''),
  off: vi.fn(),
  systemTerminal: {
    initialize: vi.fn().mockResolvedValue({}),
    log: vi.fn().mockResolvedValue({}),
    gitOperation: vi.fn().mockResolvedValue({}),
    getTerminal: vi.fn().mockResolvedValue({}),
    listTerminals: vi.fn().mockResolvedValue([]),
    setActive: vi.fn().mockResolvedValue({}),
    clear: vi.fn().mockResolvedValue({}),
    getLines: vi.fn().mockResolvedValue([]),
    updateConfig: vi.fn().mockResolvedValue({}),
    onEvent: vi.fn(),
    onOutput: vi.fn(),
    onActivated: vi.fn(),
    onCleared: vi.fn(),
  },
}

// Mock useTerminalModeDetector
interface MockModeDetector {
  currentMode: { value: string }
  isElectronMode: { value: boolean }
  isWebMode: { value: boolean }
  isConnected: { value: boolean }
  sendMessage: ReturnType<typeof vi.fn>
}

const mockModeDetector: MockModeDetector = {
  currentMode: { value: 'electron' },
  isElectronMode: { value: true },
  isWebMode: { value: false },
  isConnected: { value: true },
  sendMessage: vi.fn(),
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
    ;(
      global as unknown as { window: { electronAPI: MockElectronAPI } }
    ).window = {
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
        cwd: process.cwd(),
        isRunning: true,
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
        id: 'terminal-2',
        name: 'Custom Terminal',
        pid: 2345,
        shell: '/bin/bash',
        cwd: process.cwd(),
        isRunning: true,
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
          cwd: process.cwd(),
          isRunning: true,
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          id: 'terminal-2',
          name: 'Terminal 2',
          pid: 2345,
          shell: '/bin/bash',
          cwd: process.cwd(),
          isRunning: true,
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
          cwd: process.cwd(),
          isRunning: true,
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
        cwd: process.cwd(),
        isRunning: true,
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
          cwd: process.cwd(),
          isRunning: true,
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          id: 'terminal-2',
          name: 'Terminal 2',
          pid: 2345,
          shell: '/bin/bash',
          cwd: process.cwd(),
          isRunning: true,
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
      success: true,
      data: {
        id: 'terminal-ws-1',
        name: 'Terminal 1',
        pid: 3456,
        shell: '/bin/bash',
        cwd: process.cwd(),
        isRunning: true,
      },
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
          cwd: process.cwd(),
          isRunning: true,
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          id: 'terminal-2',
          name: 'Terminal 2',
          pid: 2345,
          shell: '/bin/bash',
          cwd: process.cwd(),
          isRunning: true,
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

  describe('🔬 Advanced Coverage Tests', () => {
    it('should handle mock response correctly', async () => {
      // Set up web mode
      mockModeDetector.currentMode.value = 'web'
      mockModeDetector.isElectronMode.value = false
      mockModeDetector.isWebMode.value = true
      mockModeDetector.isConnected.value = true

      mockModeDetector.sendMessage.mockResolvedValue({
        success: true,
        data: {
          id: 'mock-terminal-1',
          name: 'Mock Terminal',
          pid: 4567,
          shell: '/bin/bash',
          cwd: process.cwd(),
          isRunning: true,
        },
      })

      const { createTerminal, terminals } = await createFreshManager()

      const terminal = await createTerminal({ name: 'Mock Terminal' })

      expect(terminal.name).toBe('Mock Terminal')
      expect(terminal.id).toMatch(/^mock-terminal-/)
      expect(terminals.value).toHaveLength(1)
    })

    it('should handle web mode terminal creation', async () => {
      mockModeDetector.currentMode.value = 'web'
      mockModeDetector.isElectronMode.value = false
      mockModeDetector.isWebMode.value = true

      mockModeDetector.sendMessage.mockResolvedValue({
        success: true,
        data: {
          id: 'ws-terminal-1',
          name: 'Terminal 1',
          pid: 5678,
          shell: '/bin/zsh',
          cwd: '/app',
          isRunning: true,
        },
      })

      const { createTerminal, terminals } = await createFreshManager()

      const terminal = await createTerminal({
        name: 'Terminal 1',
        shell: '/bin/zsh',
        cwd: '/app',
      })

      expect(terminal.id).toBe('ws-terminal-1')
      expect(terminal.shell).toBe('/bin/zsh')
      expect(terminal.cwd).toBe('/app')
      expect(terminals.value).toHaveLength(1)
    })

    it('should set active terminal correctly', async () => {
      mockElectronAPI.invoke.mockResolvedValue({
        success: true,
        data: {
          id: 'terminal-1',
          name: 'Terminal 1',
          pid: 1234,
          shell: '/bin/bash',
          cwd: process.cwd(),
          isRunning: true,
        },
      })

      const { createTerminal, setActiveTerminal, activeTerminal } =
        await createFreshManager()

      const terminal = await createTerminal()
      setActiveTerminal(terminal.id)

      expect(activeTerminal.value?.id).toBe(terminal.id)
    })

    it('should handle non-existent terminal activation', async () => {
      const { setActiveTerminal, activeTerminal } = await createFreshManager()

      setActiveTerminal('non-existent-id')

      expect(activeTerminal.value).toBeUndefined()
    })

    it('should close terminal correctly', async () => {
      mockElectronAPI.invoke
        .mockResolvedValueOnce({
          success: true,
          data: {
            id: 'terminal-1',
            name: 'Terminal 1',
            pid: 1234,
            shell: '/bin/bash',
            cwd: process.cwd(),
            isRunning: true,
          },
        })
        .mockResolvedValueOnce({ success: true }) // Mock close response

      const { createTerminal, closeTerminal, terminals } =
        await createFreshManager()

      const terminal = await createTerminal()
      expect(terminals.value).toHaveLength(1)

      await closeTerminal(terminal.id)
      expect(terminals.value).toHaveLength(0)
    })

    it('should handle terminal creation with custom options', async () => {
      mockElectronAPI.invoke.mockResolvedValue({
        success: true,
        data: {
          id: 'terminal-1',
          name: 'Custom Terminal',
          pid: 1234,
          shell: '/bin/fish',
          cwd: '/custom/path',
          isRunning: true,
        },
      })

      const { createTerminal } = await createFreshManager()

      const terminal = await createTerminal({
        name: 'Custom Terminal',
        shell: '/bin/fish',
        cwd: '/custom/path',
      })

      expect(terminal.name).toBe('Custom Terminal')
      expect(terminal.shell).toBe('/bin/fish')
      expect(terminal.cwd).toBe('/custom/path')
    })

    it('should handle failed terminal creation with error message', async () => {
      mockElectronAPI.invoke.mockResolvedValue({
        success: false,
        error: 'Permission denied',
      })

      const { createTerminal, terminals } = await createFreshManager()

      await expect(createTerminal()).rejects.toThrow('Permission denied')

      // Should still create a failed terminal for UI feedback
      expect(terminals.value).toHaveLength(1)
      expect(terminals.value[0].name).toContain('(Failed)')
      expect(terminals.value[0].isRunning).toBe(false)
    })

    it('should handle terminal creation without data', async () => {
      mockElectronAPI.invoke.mockResolvedValue({
        success: false,
      })

      const { createTerminal } = await createFreshManager()

      await expect(createTerminal()).rejects.toThrow(
        'Failed to create terminal'
      )
    })

    it('should provide all exposed properties and methods', async () => {
      const manager = await createFreshManager()

      expect(manager).toHaveProperty('terminals')
      expect(manager).toHaveProperty('activeTerminal')
      expect(manager).toHaveProperty('runningCount')
      expect(manager).toHaveProperty('createTerminal')
      expect(manager).toHaveProperty('closeTerminal')
      expect(manager).toHaveProperty('setActiveTerminal')
      expect(manager).toHaveProperty('clearAllTerminals')
    })

    it('should handle terminal creation error with mock fallback', async () => {
      mockModeDetector.sendMessage.mockRejectedValue(new Error('Network error'))

      const { createTerminal } = await createFreshManager()

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(createTerminal()).rejects.toThrow()

      consoleSpy.mockRestore()
    })

    it('should maintain terminal state consistency', async () => {
      mockElectronAPI.invoke
        .mockResolvedValueOnce({
          success: true,
          data: {
            id: 'terminal-1',
            name: 'Terminal 1',
            pid: 1234,
            shell: '/bin/bash',
            cwd: process.cwd(),
            isRunning: true,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            id: 'terminal-2',
            name: 'Terminal 2',
            pid: 2345,
            shell: '/bin/bash',
            cwd: process.cwd(),
            isRunning: true,
          },
        })

      const {
        createTerminal,
        closeTerminal,
        terminals,
        activeTerminal,
        setActiveTerminal,
      } = await createFreshManager()

      const terminal1 = await createTerminal()
      const terminal2 = await createTerminal()

      expect(terminals.value).toHaveLength(2)

      // Set first terminal as active
      setActiveTerminal(terminal1.id)
      expect(activeTerminal.value?.id).toBe(terminal1.id)

      // Close the active terminal (mock the close response)
      mockElectronAPI.invoke.mockResolvedValueOnce({ success: true })
      await closeTerminal(terminal1.id)

      expect(terminals.value).toHaveLength(1)
      expect(terminals.value[0].id).toBe(terminal2.id)

      // Active terminal should be reset when closed
      expect(activeTerminal.value?.id).not.toBe(terminal1.id)
    })

    it('should create terminal with process.cwd() as default', async () => {
      const originalCwd = process.cwd
      process.cwd = vi.fn(() => '/test/default/path')

      // Set up web mode
      mockModeDetector.currentMode.value = 'web'
      mockModeDetector.isElectronMode.value = false
      mockModeDetector.isWebMode.value = true
      mockModeDetector.isConnected.value = true

      mockModeDetector.sendMessage.mockResolvedValue({
        success: true,
        data: {
          id: 'terminal-1',
          name: 'Terminal 1',
          pid: 7890,
          shell: '/bin/bash',
          cwd: '/test/default/path',
          isRunning: true,
        },
      })

      const { createTerminal } = await createFreshManager()

      const terminal = await createTerminal()

      expect(terminal.cwd).toBe('/test/default/path')

      process.cwd = originalCwd
    })

    it('should handle terminal-exit event correctly', async () => {
      mockElectronAPI.invoke.mockResolvedValue({
        success: true,
        data: {
          id: 'terminal-1',
          name: 'Terminal 1',
          pid: 1234,
          shell: '/bin/bash',
          cwd: process.cwd(),
          isRunning: true,
        },
      })

      const { createTerminal, terminals } = await createFreshManager()

      // Create a terminal first
      await createTerminal()
      expect(terminals.value[0].isRunning).toBe(true)

      // Capture the event handler that was registered
      const exitEventHandler = mockElectronAPI.on.mock.calls.find(
        (call) => call[0] === 'terminal-exit'
      )?.[1]

      expect(exitEventHandler).toBeDefined()

      // Simulate terminal exit event
      exitEventHandler({ id: 'terminal-1', exitCode: 0 })

      // Verify terminal state was updated
      expect(terminals.value[0].isRunning).toBe(false)
      expect(terminals.value[0].exitCode).toBe(0)
    })

    it('should handle terminal-killed event correctly', async () => {
      mockElectronAPI.invoke.mockResolvedValue({
        success: true,
        data: {
          id: 'terminal-1',
          name: 'Terminal 1',
          pid: 1234,
          shell: '/bin/bash',
          cwd: process.cwd(),
          isRunning: true,
        },
      })

      const { createTerminal, terminals } = await createFreshManager()

      // Create a terminal first
      await createTerminal()
      expect(terminals.value[0].isRunning).toBe(true)

      // Capture the event handler that was registered
      const killedEventHandler = mockElectronAPI.on.mock.calls.find(
        (call) => call[0] === 'terminal-killed'
      )?.[1]

      expect(killedEventHandler).toBeDefined()

      // Simulate terminal killed event
      killedEventHandler({ id: 'terminal-1' })

      // Verify terminal state was updated
      expect(terminals.value[0].isRunning).toBe(false)
      expect(terminals.value[0].exitCode).toBe(-1)
    })

    it('should handle listTerminals without Electron API', async () => {
      // Remove Electron API
      ;(global as unknown as { window: unknown }).window = {}

      const { listTerminals } = await createFreshManager()

      const terminals = await listTerminals()

      expect(terminals).toEqual([])
    })

    it('should handle closeTerminal without Electron API', async () => {
      // Remove Electron API
      ;(global as unknown as { window: unknown }).window = {}

      const { closeTerminal } = await createFreshManager()

      await expect(closeTerminal('terminal-1')).rejects.toThrow(
        'Electron API not available'
      )
    })

    it('should handle closeTerminal failure', async () => {
      mockElectronAPI.invoke
        .mockResolvedValueOnce({
          success: true,
          data: {
            id: 'terminal-1',
            name: 'Terminal 1',
            pid: 1234,
            shell: '/bin/bash',
            cwd: process.cwd(),
            isRunning: true,
          },
        })
        .mockResolvedValueOnce({
          success: false,
          error: 'Failed to close terminal',
        })

      const { createTerminal, closeTerminal } = await createFreshManager()

      await createTerminal()

      await expect(closeTerminal('terminal-1')).rejects.toThrow(
        'Failed to close terminal'
      )
    })

    it('should handle getTerminal with existing and non-existing IDs', async () => {
      mockElectronAPI.invoke.mockResolvedValue({
        success: true,
        data: {
          id: 'terminal-1',
          name: 'Terminal 1',
          pid: 1234,
          shell: '/bin/bash',
          cwd: process.cwd(),
          isRunning: true,
        },
      })

      const { createTerminal, getTerminal } = await createFreshManager()

      const terminal = await createTerminal()

      // Test existing terminal
      const foundTerminal = getTerminal(terminal.id)
      expect(foundTerminal).toBeDefined()
      expect(foundTerminal?.id).toBe(terminal.id)

      // Test non-existing terminal
      const notFoundTerminal = getTerminal('non-existent-id')
      expect(notFoundTerminal).toBeUndefined()
    })

    it('should activate another terminal when active terminal is closed', async () => {
      mockElectronAPI.invoke
        .mockResolvedValueOnce({
          success: true,
          data: {
            id: 'terminal-1',
            name: 'Terminal 1',
            pid: 1234,
            shell: '/bin/bash',
            cwd: process.cwd(),
            isRunning: true,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            id: 'terminal-2',
            name: 'Terminal 2',
            pid: 2345,
            shell: '/bin/bash',
            cwd: process.cwd(),
            isRunning: true,
          },
        })
        .mockResolvedValueOnce({ success: true }) // Close response

      const { createTerminal, closeTerminal, activeTerminalId } =
        await createFreshManager()

      const terminal1 = await createTerminal()
      const terminal2 = await createTerminal()

      // First terminal should be active by default
      expect(activeTerminalId.value).toBe(terminal1.id)

      // Close the active terminal
      await closeTerminal(terminal1.id)

      // Second terminal should now be active
      expect(activeTerminalId.value).toBe(terminal2.id)
    })

    it('should handle listTerminals with backend synchronization', async () => {
      mockElectronAPI.invoke
        .mockResolvedValueOnce({
          success: true,
          data: {
            id: 'terminal-1',
            name: 'Terminal 1',
            pid: 1234,
            shell: '/bin/bash',
            cwd: process.cwd(),
            isRunning: true,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: [
            {
              id: 'terminal-1',
              name: 'Terminal 1',
              pid: 5678,
              shell: '/bin/zsh',
              cwd: '/updated/path',
              isRunning: true,
            },
          ],
        })

      const { createTerminal, listTerminals, terminals } =
        await createFreshManager()

      // Create a terminal locally
      await createTerminal()
      expect(terminals.value[0].pid).toBe(1234)
      expect(terminals.value[0].shell).toBe('/bin/bash')

      // List terminals to trigger backend synchronization
      await listTerminals()

      // Verify local state was updated with backend data
      expect(terminals.value[0].pid).toBe(5678)
      expect(terminals.value[0].shell).toBe('/bin/zsh')
      expect(terminals.value[0].cwd).toBe('/updated/path')
      expect(terminals.value[0].isRunning).toBe(true)
    })

    it('should handle listTerminals backend error gracefully', async () => {
      mockElectronAPI.invoke.mockRejectedValue(
        new Error('Backend connection failed')
      )

      const { listTerminals } = await createFreshManager()

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const terminals = await listTerminals()

      expect(terminals).toEqual([])
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Terminal Manager] Failed to list terminals:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })

    it('should handle setActiveTerminal with null ID', async () => {
      mockElectronAPI.invoke.mockResolvedValue({
        success: true,
        data: {
          id: 'terminal-1',
          name: 'Terminal 1',
          pid: 1234,
          shell: '/bin/bash',
          cwd: process.cwd(),
          isRunning: true,
        },
      })

      const { createTerminal, setActiveTerminal, activeTerminalId } =
        await createFreshManager()

      await createTerminal()
      expect(activeTerminalId.value).toBe('terminal-1')

      // Set active terminal to null
      setActiveTerminal(null)
      expect(activeTerminalId.value).toBeUndefined()
    })
  })
})
