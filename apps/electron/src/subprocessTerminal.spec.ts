/**
 * @fileoverview SubprocessTerminal tests focused on delegation to SubprocessBackend
 *
 * @description
 * Tests the SubprocessTerminal class which now delegates to SubprocessBackend
 * from @hatcherdx/terminal-system. These tests focus on proper delegation
 * rather than internal implementation details.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the terminal-system module
const mockSpawn = vi.fn()
const mockWelcomeMessageProvider = {
  getWelcomeMessage: vi.fn().mockReturnValue('Welcome to Terminal!'),
  getPrompt: vi.fn().mockReturnValue('$ '),
  getSimpleMessage: vi.fn().mockReturnValue('Simple message'),
  updateOptions: vi.fn(),
  getOptions: vi.fn().mockReturnValue({
    appName: 'Terminal',
    version: '1.0.0',
    showSystemInfo: true,
    customTemplate: '',
    shell: 'bash',
    cwd: '/test',
    useEmoji: true,
    colors: {
      primary: '\x1b[36m',
      secondary: '\x1b[33m',
      accent: '\x1b[32m',
    },
  }),
}

const mockBackendProcess = {
  on: vi.fn(),
  write: vi.fn(),
  resize: vi.fn(),
  kill: vi.fn(),
  pid: 12345,
}

const mockBufferManagerInstance = {
  on: vi.fn(),
  write: vi.fn(),
  destroy: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getMetrics: vi.fn().mockReturnValue({ bufferSize: 1024 }),
  getHealthStatus: vi.fn().mockReturnValue({ health: 'good' }),
}

// Mock the terminal-system imports
vi.mock('@hatcherdx/terminal-system', () => ({
  WelcomeMessageProvider: vi
    .fn()
    .mockImplementation(() => mockWelcomeMessageProvider),
  SubprocessBackend: vi.fn().mockImplementation(() => ({
    spawn: mockSpawn,
  })),
}))

// Mock TerminalBufferManager
vi.mock('./terminalBufferManager', () => ({
  TerminalBufferManager: vi
    .fn()
    .mockImplementation(() => mockBufferManagerInstance),
}))

// Mock console methods to reduce noise
vi.spyOn(console, 'log').mockImplementation(() => {})
vi.spyOn(console, 'error').mockImplementation(() => {})

describe('SubprocessTerminal', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock return value for spawn
    mockSpawn.mockResolvedValue(mockBackendProcess)
  })

  describe('Initialization', () => {
    it('should create instance with default options', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      expect(terminal).toBeDefined()
      expect(terminal.pid).toBeUndefined()
      expect(terminal.isRunning).toBe(false)
    })

    it('should create instance with custom options', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('custom-terminal', {
        shell: '/bin/bash',
        cwd: '/custom/dir',
        env: { CUSTOM: 'value' },
        cols: 120,
        rows: 30,
      })

      expect(terminal).toBeDefined()
    })
  })

  describe('Delegation to SubprocessBackend', () => {
    it('should delegate spawn to SubprocessBackend', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      await terminal.spawn()

      expect(mockSpawn).toHaveBeenCalledWith({
        shell: expect.any(String),
        cwd: expect.any(String),
        cols: 80,
        rows: 24,
        welcomeMessage: 'Welcome to Terminal!',
        env: {
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
          COLUMNS: '80',
          LINES: '24',
        },
      })
    })

    it('should delegate write to backend process', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      await terminal.spawn()
      terminal.write('hello')

      expect(mockBackendProcess.write).toHaveBeenCalledWith('hello')
    })

    it('should delegate resize to backend process', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      await terminal.spawn()
      terminal.resize(100, 50)

      expect(mockBackendProcess.resize).toHaveBeenCalledWith(100, 50)
    })

    it('should delegate kill to backend process', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      await terminal.spawn()
      terminal.kill()

      expect(mockBackendProcess.kill).toHaveBeenCalledWith('SIGTERM')
    })
  })

  describe('Event Handling', () => {
    it('should setup backend process event handlers', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      await terminal.spawn()

      expect(mockBackendProcess.on).toHaveBeenCalledWith(
        'data',
        expect.any(Function)
      )
      expect(mockBackendProcess.on).toHaveBeenCalledWith(
        'error',
        expect.any(Function)
      )
      expect(mockBackendProcess.on).toHaveBeenCalledWith(
        'exit',
        expect.any(Function)
      )
    })

    it('should handle backend data through buffer manager', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      await terminal.spawn()

      // Get the data handler and simulate data
      const dataHandler = mockBackendProcess.on.mock.calls.find(
        (call) => call[0] === 'data'
      )?.[1]

      expect(dataHandler).toBeDefined()
      dataHandler('test data')

      expect(mockBufferManagerInstance.write).toHaveBeenCalledWith('test data')
    })

    it('should emit terminal events from buffer manager', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      const dataSpy = vi.fn()
      terminal.on('data', dataSpy)

      // Buffer manager should be setup with dataReady handler
      expect(mockBufferManagerInstance.on).toHaveBeenCalledWith(
        'dataReady',
        expect.any(Function)
      )

      // Get the dataReady handler and simulate data
      const dataReadyHandler = mockBufferManagerInstance.on.mock.calls.find(
        (call) => call[0] === 'dataReady'
      )?.[1]

      expect(dataReadyHandler).toBeDefined()
      dataReadyHandler('processed data')

      expect(dataSpy).toHaveBeenCalledWith('processed data')
    })
  })

  describe('Properties and Status', () => {
    it('should return correct PID after spawn', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      await terminal.spawn()

      expect(terminal.pid).toBe(12345)
    })

    it('should return correct running status', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      expect(terminal.isRunning).toBe(false)

      await terminal.spawn()

      expect(terminal.isRunning).toBe(true)
    })
  })

  describe('Buffer Management Integration', () => {
    it('should provide buffer metrics', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      const metrics = terminal.getBufferMetrics()
      expect(metrics).toEqual({ bufferSize: 1024 })
    })

    it('should provide buffer health status', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      const health = terminal.getBufferHealth()
      expect(health).toEqual({ health: 'good' })
    })

    it('should control buffer processing', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      terminal.pauseBuffer()
      expect(mockBufferManagerInstance.pause).toHaveBeenCalled()

      terminal.resumeBuffer()
      expect(mockBufferManagerInstance.resume).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle write when no process available', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      // Don't spawn - no process available
      terminal.write('test')

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Cannot write - no process available')
      )
    })

    it('should handle spawn errors gracefully', async () => {
      const { SubprocessTerminal } = await import('./subprocessTerminal')
      const terminal = new SubprocessTerminal('test-terminal')

      const spawnError = new Error('Spawn failed')
      mockSpawn.mockRejectedValueOnce(spawnError)

      const errorSpy = vi.fn()
      terminal.on('error', errorSpy)

      await terminal.spawn()

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to spawn terminal'),
        spawnError
      )
      expect(errorSpy).toHaveBeenCalledWith(spawnError)
    })
  })
})
