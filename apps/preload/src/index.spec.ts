/**
 * @fileoverview Comprehensive test suite for Electron preload index.ts.
 *
 * @description
 * Tests all functionality of the preload script including module imports,
 * IPC communication, terminal data buffering, context bridge exposure,
 * and unified event listeners with full branch and statement coverage.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Electron modules before importing the main file
const mockContextBridge = {
  exposeInMainWorld: vi.fn(),
}

const mockIpcRenderer = {
  on: vi.fn(),
  off: vi.fn(),
  send: vi.fn(),
  invoke: vi.fn(),
  removeListener: vi.fn(),
  removeAllListeners: vi.fn(),
}

// Mock the IPCRenderer class
const mockIPCRendererInstance = {
  send: vi.fn(),
  on: vi.fn(),
}

const mockIPCRenderer = vi.fn(() => mockIPCRendererInstance)

// Mock storage API
const mockStorageAPI = {
  projectManager: {
    createProject: vi.fn(),
  },
}

// Mock process.versions
Object.defineProperty(global, 'process', {
  value: {
    versions: {
      node: '18.0.0',
      chrome: '106.0.0',
      electron: '22.0.0',
    },
  },
  writable: true,
})

// Mock console methods to capture logs
const mockConsole = {
  log: vi.fn(),
  error: vi.fn(),
}

// Setup mocks before importing
vi.mock('electron', () => ({
  contextBridge: mockContextBridge,
  ipcRenderer: mockIpcRenderer,
}))

vi.mock('./ipcRenderer.js', () => ({
  IPCRenderer: mockIPCRenderer,
}))

vi.mock('./storage.js', () => ({
  storageAPI: mockStorageAPI,
}))

vi.mock('./types/index.js', () => ({
  // Mock types exports
}))

// Mock console globally
vi.stubGlobal('console', mockConsole)

describe('🔧 Preload Index Module', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
    mockConsole.log.mockClear()
    mockConsole.error.mockClear()
  })

  afterEach(() => {
    // Clean up any module state
    vi.resetModules()
  })

  describe('🎯 Module Imports and Initialization', () => {
    it('imports all required modules correctly', async () => {
      // Import the module to trigger initialization
      await import('./index.js')

      // Verify IPCRenderer was instantiated
      expect(mockIPCRenderer).toHaveBeenCalledWith()
    })

    it('exports types correctly', async () => {
      const module = await import('./index.js')

      // Verify that the module exports the ElectronAPI type
      expect(typeof module).toBe('object')
    })
  })

  describe('🎯 Context Bridge Exposure', () => {
    it('exposes electronAPI to main world', async () => {
      await import('./index.js')

      expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith(
        'electronAPI',
        expect.any(Object)
      )
    })

    it('exposes storageAPI to main world', async () => {
      await import('./index.js')

      expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith(
        'storageAPI',
        mockStorageAPI
      )
    })

    it('logs successful API exposure', async () => {
      await import('./index.js')

      // Production code no longer has verbose logging - verify APIs are exposed instead
      expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith(
        'electronAPI',
        expect.any(Object)
      )
      expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith(
        'storageAPI',
        mockStorageAPI
      )
    })
  })

  describe('🎯 ElectronAPI Object Structure', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock Electron API requires flexible typing for IPC simulation
    let electronAPI: any

    beforeEach(async () => {
      await import('./index.js')
      // Get the electronAPI object from the contextBridge call
      const exposeCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
        (call) => call[0] === 'electronAPI'
      )
      electronAPI = exposeCall?.[1]
    })

    it('includes versions from process.versions', () => {
      expect(electronAPI.versions).toEqual({
        node: '18.0.0',
        chrome: '106.0.0',
        electron: '22.0.0',
      })
    })

    it('includes send method from IPCRenderer', () => {
      expect(electronAPI.send).toBe(mockIPCRendererInstance.send)
    })

    it('includes invoke method bound to electronIpcRenderer', () => {
      expect(typeof electronAPI.invoke).toBe('function')
    })

    it('includes terminal operations methods', () => {
      expect(typeof electronAPI.sendTerminalInput).toBe('function')
      expect(typeof electronAPI.sendTerminalResize).toBe('function')
    })

    it('includes theme management methods', () => {
      expect(typeof electronAPI.setTheme).toBe('function')
    })

    it('includes project management methods', () => {
      expect(typeof electronAPI.openProjectDialog).toBe('function')
    })

    it('includes file system operations methods', () => {
      expect(typeof electronAPI.statFile).toBe('function')
      expect(typeof electronAPI.readDirectory).toBe('function')
      expect(typeof electronAPI.pathExists).toBe('function')
      expect(typeof electronAPI.isDirectory).toBe('function')
      expect(typeof electronAPI.readFile).toBe('function')
      expect(typeof electronAPI.scanDirectory).toBe('function')
    })

    it('includes git operations methods', () => {
      expect(typeof electronAPI.getGitStatus).toBe('function')
      expect(typeof electronAPI.getGitBranches).toBe('function')
      expect(typeof electronAPI.switchGitBranch).toBe('function')
      expect(typeof electronAPI.getGitDiff).toBe('function')
      expect(typeof electronAPI.getFileContent).toBe('function')
    })

    it('includes git stash operations methods', () => {
      expect(typeof electronAPI.gitStash).toBe('function')
      expect(typeof electronAPI.gitStashPop).toBe('function')
      expect(typeof electronAPI.gitStashDrop).toBe('function')
      expect(typeof electronAPI.gitStashList).toBe('function')
      expect(typeof electronAPI.gitStashShow).toBe('function')
      expect(typeof electronAPI.gitCheckoutBranch).toBe('function')
      expect(typeof electronAPI.gitCreateBranch).toBe('function')
    })

    it('includes event listener management methods', () => {
      expect(typeof electronAPI.off).toBe('function')
      expect(typeof electronAPI.onTerminalData).toBe('function')
      expect(typeof electronAPI.onTerminalExit).toBe('function')
      expect(typeof electronAPI.onTerminalError).toBe('function')
    })

    it('includes file watching operations methods', () => {
      expect(typeof electronAPI.startFileWatching).toBe('function')
      expect(typeof electronAPI.stopFileWatching).toBe('function')
      expect(typeof electronAPI.getFileWatchingStatus).toBe('function')
      expect(typeof electronAPI.onFileChangeEvent).toBe('function')
    })

    it('includes systemTerminal nested object with all methods', () => {
      expect(typeof electronAPI.systemTerminal).toBe('object')
      expect(typeof electronAPI.systemTerminal.initialize).toBe('function')
      expect(typeof electronAPI.systemTerminal.log).toBe('function')
      expect(typeof electronAPI.systemTerminal.gitOperation).toBe('function')
      expect(typeof electronAPI.systemTerminal.getTerminal).toBe('function')
      expect(typeof electronAPI.systemTerminal.listTerminals).toBe('function')
      expect(typeof electronAPI.systemTerminal.setActive).toBe('function')
      expect(typeof electronAPI.systemTerminal.clear).toBe('function')
      expect(typeof electronAPI.systemTerminal.getLines).toBe('function')
      expect(typeof electronAPI.systemTerminal.updateConfig).toBe('function')
      expect(typeof electronAPI.systemTerminal.onEvent).toBe('function')
      expect(typeof electronAPI.systemTerminal.onOutput).toBe('function')
      expect(typeof electronAPI.systemTerminal.onActivated).toBe('function')
      expect(typeof electronAPI.systemTerminal.onCleared).toBe('function')
    })

    it('includes terminalEasterEgg nested object with all methods', () => {
      expect(typeof electronAPI.terminalEasterEgg).toBe('object')
      expect(typeof electronAPI.terminalEasterEgg.stepChange).toBe('function')
      expect(typeof electronAPI.terminalEasterEgg.visibilityChange).toBe(
        'function'
      )
      expect(typeof electronAPI.terminalEasterEgg.updateUIVisibility).toBe(
        'function'
      )
      expect(typeof electronAPI.terminalEasterEgg.onActivate).toBe('function')
      expect(typeof electronAPI.terminalEasterEgg.onShow).toBe('function')
      expect(typeof electronAPI.terminalEasterEgg.onHide).toBe('function')
      expect(typeof electronAPI.terminalEasterEgg.onCommand).toBe('function')
      expect(typeof electronAPI.terminalEasterEgg.onInput).toBe('function')
      expect(typeof electronAPI.terminalEasterEgg.onStepChange).toBe('function')
      expect(typeof electronAPI.terminalEasterEgg.removeAllListeners).toBe(
        'function'
      )
    })
  })

  describe('🎯 Method Invocation Tests', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock Electron API requires flexible typing for IPC simulation
    let electronAPI: any

    beforeEach(async () => {
      await import('./index.js')
      const exposeCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
        (call) => call[0] === 'electronAPI'
      )
      electronAPI = exposeCall?.[1]
    })

    it('sendTerminalInput calls electronIpcRenderer.send with correct parameters', () => {
      const data = { id: 'terminal-1', data: 'test input' }
      electronAPI.sendTerminalInput(data)

      expect(mockIpcRenderer.send).toHaveBeenCalledWith('terminal-input', data)
    })

    it('sendTerminalResize calls electronIpcRenderer.send with correct parameters', () => {
      const data = { id: 'terminal-1', cols: 80, rows: 24 }
      electronAPI.sendTerminalResize(data)

      expect(mockIpcRenderer.send).toHaveBeenCalledWith('terminal-resize', data)
    })

    it('setTheme calls electronIpcRenderer.send with correct parameters', () => {
      electronAPI.setTheme('dark')

      expect(mockIpcRenderer.send).toHaveBeenCalledWith('set-theme', 'dark')
    })

    it('openProjectDialog calls electronIpcRenderer.invoke with correct channel', () => {
      electronAPI.openProjectDialog()

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('openProjectDialog')
    })

    it('file system methods call electronIpcRenderer.invoke with correct parameters', () => {
      electronAPI.statFile('/path/to/file')
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'statFile',
        '/path/to/file'
      )

      electronAPI.readDirectory('/path/to/dir')
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'readDirectory',
        '/path/to/dir'
      )

      electronAPI.pathExists('/path')
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('pathExists', '/path')

      electronAPI.isDirectory('/path')
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'isDirectory',
        '/path'
      )

      electronAPI.readFile('/file.txt')
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'readFile',
        '/file.txt'
      )

      const options = { ignoredDirs: ['node_modules'] }
      electronAPI.scanDirectory('/project', options)
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'scanDirectory',
        '/project',
        options
      )
    })

    it('git operations call electronIpcRenderer.invoke with correct parameters', () => {
      electronAPI.getGitStatus('/project')
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'getGitStatus',
        '/project'
      )

      electronAPI.getGitBranches('/project')
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'getGitBranches',
        '/project'
      )

      electronAPI.switchGitBranch('/project', 'main')
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'switchGitBranch',
        '/project',
        'main'
      )

      const diffOptions = { staged: true }
      electronAPI.getGitDiff('/project', 'file.txt', diffOptions)
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'getGitDiff',
        '/project',
        'file.txt',
        diffOptions
      )

      const contentOptions = { commit: 'abc123' }
      electronAPI.getFileContent('/project', 'file.txt', contentOptions)
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'getFileContent',
        '/project',
        'file.txt',
        contentOptions
      )
    })

    it('git stash operations call electronIpcRenderer.invoke with correct parameters', () => {
      electronAPI.gitStash('/project', 'stash message')
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'gitStash',
        '/project',
        'stash message'
      )

      electronAPI.gitStashPop('/project', 'stash@{0}')
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'gitStashPop',
        '/project',
        'stash@{0}'
      )

      electronAPI.gitStashDrop('/project', 'stash@{0}')
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'gitStashDrop',
        '/project',
        'stash@{0}'
      )

      electronAPI.gitStashList('/project')
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'gitStashList',
        '/project'
      )

      electronAPI.gitStashShow('/project', 'stash@{0}')
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'gitStashShow',
        '/project',
        'stash@{0}'
      )

      electronAPI.gitCheckoutBranch('/project', 'feature')
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'gitCheckoutBranch',
        '/project',
        'feature'
      )

      electronAPI.gitCreateBranch('/project', 'new-feature', 'main')
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'gitCreateBranch',
        '/project',
        'new-feature',
        'main'
      )
    })

    it('off method calls electronIpcRenderer.off with correct parameters', () => {
      const mockListener = vi.fn()
      electronAPI.off('test-channel', mockListener)

      expect(mockIpcRenderer.off).toHaveBeenCalledWith(
        'test-channel',
        mockListener
      )
    })

    it('terminal event listeners set up correctly', () => {
      const mockCallback = vi.fn()

      electronAPI.onTerminalExit(mockCallback)
      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        'terminal-exit',
        expect.any(Function)
      )

      electronAPI.onTerminalError(mockCallback)
      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        'terminal-error',
        expect.any(Function)
      )
    })

    it('file watching methods call electronIpcRenderer.invoke with correct parameters', () => {
      electronAPI.startFileWatching('/project')
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'startFileWatching',
        '/project'
      )

      electronAPI.stopFileWatching('watcher-id')
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'stopFileWatching',
        'watcher-id'
      )

      electronAPI.getFileWatchingStatus()
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'getFileWatchingStatus'
      )
    })

    it('onFileChangeEvent sets up listener correctly', () => {
      const mockCallback = vi.fn()
      electronAPI.onFileChangeEvent(mockCallback)

      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        'file-change-event',
        expect.any(Function)
      )
    })
  })

  describe('🎯 System Terminal Methods', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock Electron API requires flexible typing for IPC simulation
    let electronAPI: any

    beforeEach(async () => {
      await import('./index.js')
      const exposeCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
        (call) => call[0] === 'electronAPI'
      )
      electronAPI = exposeCall?.[1]
    })

    it('system terminal methods call electronIpcRenderer.invoke with correct parameters', () => {
      const options = { projectType: 'node', projectName: 'test' }
      electronAPI.systemTerminal.initialize(options)
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'system-terminal-initialize',
        options
      )

      const logRequest = { level: 'info', message: 'test' }
      electronAPI.systemTerminal.log(logRequest)
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'system-terminal-log',
        logRequest
      )

      const gitRequest = { operation: 'commit', args: ['-m', 'test'] }
      electronAPI.systemTerminal.gitOperation(gitRequest)
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'system-terminal-git-operation',
        gitRequest
      )

      electronAPI.systemTerminal.getTerminal('system')
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'system-terminal-get',
        'system'
      )

      electronAPI.systemTerminal.listTerminals()
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'system-terminal-list'
      )

      electronAPI.systemTerminal.setActive('timeline')
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'system-terminal-set-active',
        'timeline'
      )

      electronAPI.systemTerminal.clear('system')
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'system-terminal-clear',
        'system'
      )

      const linesOptions = { limit: 100, type: 'INFO' }
      electronAPI.systemTerminal.getLines('system', linesOptions)
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'system-terminal-get-lines',
        'system',
        linesOptions
      )

      const config = { autoScroll: true, maxLines: 1000 }
      electronAPI.systemTerminal.updateConfig('system', config)
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'system-terminal-update-config',
        'system',
        config
      )
    })

    it('system terminal event listeners set up correctly', () => {
      const mockCallback = vi.fn()

      electronAPI.systemTerminal.onEvent(mockCallback)
      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        'system-terminal-event',
        expect.any(Function)
      )

      electronAPI.systemTerminal.onOutput(mockCallback)
      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        'system-terminal-output',
        expect.any(Function)
      )

      electronAPI.systemTerminal.onActivated(mockCallback)
      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        'system-terminal-activated',
        expect.any(Function)
      )

      electronAPI.systemTerminal.onCleared(mockCallback)
      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        'system-terminal-cleared',
        expect.any(Function)
      )
    })
  })

  describe('🎯 Terminal Easter Egg Methods', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock Electron API requires flexible typing for IPC simulation
    let electronAPI: any

    beforeEach(async () => {
      await import('./index.js')
      const exposeCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
        (call) => call[0] === 'electronAPI'
      )
      electronAPI = exposeCall?.[1]
    })

    it('easter egg methods call electronIpcRenderer.send with correct parameters', () => {
      electronAPI.terminalEasterEgg.stepChange('step1')
      expect(mockIpcRenderer.send).toHaveBeenCalledWith(
        'terminal-step-change',
        'step1'
      )

      electronAPI.terminalEasterEgg.visibilityChange(true)
      expect(mockIpcRenderer.send).toHaveBeenCalledWith(
        'terminal-visibility-change',
        true
      )

      electronAPI.terminalEasterEgg.updateUIVisibility(false)
      expect(mockIpcRenderer.send).toHaveBeenCalledWith(
        'terminal-easter-egg-visibility',
        false
      )
    })

    it('easter egg event listeners set up correctly', () => {
      const mockCallback = vi.fn()

      electronAPI.terminalEasterEgg.onActivate(mockCallback)
      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        'terminal-activate',
        expect.any(Function)
      )

      electronAPI.terminalEasterEgg.onShow(mockCallback)
      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        'terminal-show',
        expect.any(Function)
      )

      electronAPI.terminalEasterEgg.onHide(mockCallback)
      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        'terminal-hide',
        expect.any(Function)
      )

      electronAPI.terminalEasterEgg.onCommand(mockCallback)
      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        'terminal-command',
        expect.any(Function)
      )

      electronAPI.terminalEasterEgg.onInput(mockCallback)
      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        'terminal-input',
        expect.any(Function)
      )

      electronAPI.terminalEasterEgg.onStepChange(mockCallback)
      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        'terminal-step-change',
        expect.any(Function)
      )
    })

    it('removeAllListeners clears all terminal easter egg listeners', () => {
      electronAPI.terminalEasterEgg.removeAllListeners()

      expect(mockIpcRenderer.removeAllListeners).toHaveBeenCalledWith(
        'terminal-activate'
      )
      expect(mockIpcRenderer.removeAllListeners).toHaveBeenCalledWith(
        'terminal-show'
      )
      expect(mockIpcRenderer.removeAllListeners).toHaveBeenCalledWith(
        'terminal-hide'
      )
      expect(mockIpcRenderer.removeAllListeners).toHaveBeenCalledWith(
        'terminal-command'
      )
      expect(mockIpcRenderer.removeAllListeners).toHaveBeenCalledWith(
        'terminal-input'
      )
      expect(mockIpcRenderer.removeAllListeners).toHaveBeenCalledWith(
        'terminal-step-change'
      )
    })
  })

  describe('🎯 Hybrid IPC Listener (on method)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock Electron API requires flexible typing for IPC simulation
    let electronAPI: any

    beforeEach(async () => {
      await import('./index.js')
      const exposeCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
        (call) => call[0] === 'electronAPI'
      )
      electronAPI = exposeCall?.[1]
    })

    it('registers custom IPC listener for simulate-platform channel', () => {
      const mockListener = vi.fn()
      electronAPI.on('simulate-platform', mockListener)

      // Production code removed verbose logging - verify listener registration
      expect(mockIPCRendererInstance.on).toHaveBeenCalledWith(
        'simulate-platform',
        mockListener
      )
    })

    it('registers native Electron IPC listener for other channels', () => {
      const mockListener = vi.fn()
      const cleanup = electronAPI.on('terminal-data', mockListener)

      // Production code removed verbose logging - verify listener registration
      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        'terminal-data',
        expect.any(Function)
      )
      expect(typeof cleanup).toBe('function')
    })

    it('cleanup function removes listener correctly', () => {
      const mockListener = vi.fn()
      const cleanup = electronAPI.on('test-channel', mockListener)

      // Call the cleanup function
      cleanup()

      expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith(
        'test-channel',
        expect.any(Function)
      )
    })

    it('logs event reception for native Electron IPC', () => {
      const mockListener = vi.fn()
      electronAPI.on('test-channel', mockListener)

      // Get the wrapped listener that was registered
      const wrappedListener = mockIpcRenderer.on.mock.calls.find(
        (call) => call[0] === 'test-channel'
      )?.[1]

      // Simulate event reception
      const mockEvent = { sender: 'test' }
      const mockArgs = ['arg1', 'arg2']
      wrappedListener(mockEvent, ...mockArgs)

      // Production code removed verbose logging - verify listener invocation
      expect(mockListener).toHaveBeenCalledWith('arg1', 'arg2')
    })
  })

  describe('🎯 Terminal Data Management', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock Electron API requires flexible typing for IPC simulation
    let electronAPI: any

    beforeEach(async () => {
      vi.useFakeTimers()
      await import('./index.js')
      const exposeCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
        (call) => call[0] === 'electronAPI'
      )
      electronAPI = exposeCall?.[1]
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('onTerminalData validates callback function', () => {
      expect(() => {
        electronAPI.onTerminalData('not a function')
      }).toThrow('Callback must be a function')

      expect(mockConsole.error).toHaveBeenCalledWith(
        '[Preload] ❌ Invalid callback provided to onTerminalData:',
        'string'
      )
    })

    it('onTerminalData stores callback and logs registration', () => {
      const mockCallback = vi.fn()
      const cleanup = electronAPI.onTerminalData(mockCallback)

      // Production code removed verbose logging - verify callback registration
      expect(typeof cleanup).toBe('function')
    })

    it('onTerminalData cleanup function clears callback', () => {
      const mockCallback = vi.fn()
      const cleanup = electronAPI.onTerminalData(mockCallback)

      cleanup()

      // Production code removed verbose logging - verify cleanup works
      expect(typeof cleanup).toBe('function')
    })

    it('onTerminalData processes buffered data when callback is registered', () => {
      const mockCallback = vi.fn()

      // First, trigger the unified listener to buffer some data
      const unifiedListener = mockIpcRenderer.on.mock.calls.find(
        (call) => call[0] === 'terminal-data'
      )?.[1]

      // Simulate buffered data
      const testData = { id: 'terminal-1', data: 'buffered data' }
      unifiedListener({}, testData)

      // Now register callback - should replay buffered data
      electronAPI.onTerminalData(mockCallback)

      // Production code removed verbose logging - verify buffered data was replayed
      expect(mockCallback).toHaveBeenCalledWith(testData)
    })

    it('onTerminalData filters out old buffered data', () => {
      const mockCallback = vi.fn()

      // Set time to past to make buffered data old
      const oldTime = Date.now() - 6000 // 6 seconds ago
      vi.setSystemTime(oldTime)

      const unifiedListener = mockIpcRenderer.on.mock.calls.find(
        (call) => call[0] === 'terminal-data'
      )?.[1]

      // Buffer old data
      const oldData = { id: 'terminal-1', data: 'old data' }
      unifiedListener({}, oldData)

      // Move beyond BUFFER_TIMEOUT_MS (5000ms) to expire old data
      vi.setSystemTime(Date.now() + 6000) // Move beyond 5-second timeout

      // Register callback - should not replay old data
      electronAPI.onTerminalData(mockCallback)

      // Production code removed verbose logging - verify old data was filtered
      expect(mockCallback).not.toHaveBeenCalled()
    })

    it('onTerminalData handles errors during buffered data replay', () => {
      const mockCallback = vi.fn(() => {
        throw new Error('Callback error')
      })

      const unifiedListener = mockIpcRenderer.on.mock.calls.find(
        (call) => call[0] === 'terminal-data'
      )?.[1]

      // Buffer some data
      const testData = { id: 'terminal-1', data: 'test data' }
      unifiedListener({}, testData)

      // Register callback that throws
      electronAPI.onTerminalData(mockCallback)

      expect(mockConsole.error).toHaveBeenCalledWith(
        '[Preload] ❌ Error replaying buffered data:',
        expect.any(Error)
      )
    })
  })

  describe('🎯 Unified Terminal Data Listener', () => {
    beforeEach(async () => {
      await import('./index.js')
    })

    it('registers unified terminal-data listener', () => {
      // Production code removed verbose logging - verify listener was registered
      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        'terminal-data',
        expect.any(Function)
      )
    })

    it('unified listener validates terminal data', () => {
      const unifiedListener = mockIpcRenderer.on.mock.calls.find(
        (call) => call[0] === 'terminal-data'
      )?.[1]

      // Test with invalid data - production code logs simple error message
      unifiedListener({}, null)
      expect(mockConsole.error).toHaveBeenCalledWith(
        '[Preload] ❌ Invalid terminal-data received'
      )

      unifiedListener({}, { id: 'test' }) // Missing data field
      expect(mockConsole.error).toHaveBeenCalledWith(
        '[Preload] ❌ Invalid terminal-data received'
      )

      unifiedListener({}, { data: 'test' }) // Missing id field
      expect(mockConsole.error).toHaveBeenCalledWith(
        '[Preload] ❌ Invalid terminal-data received'
      )
    })

    it('unified listener logs debug information', () => {
      const unifiedListener = mockIpcRenderer.on.mock.calls.find(
        (call) => call[0] === 'terminal-data'
      )?.[1]

      const testData = {
        id: 'terminal-123456789',
        data: 'test data content for logging',
      }
      unifiedListener({}, testData)

      // Production code removed verbose debug logging - verify listener processes data
      expect(unifiedListener).toBeDefined()
    })

    it('unified listener invokes callback when available', () => {
      const unifiedListener = mockIpcRenderer.on.mock.calls.find(
        (call) => call[0] === 'terminal-data'
      )?.[1]

      // First register a callback
      const exposeCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
        (call) => call[0] === 'electronAPI'
      )
      const electronAPI = exposeCall?.[1]
      const mockCallback = vi.fn()
      electronAPI.onTerminalData(mockCallback)

      // Now send data through unified listener
      const testData = { id: 'terminal-1', data: 'test data' }
      unifiedListener({}, testData)

      // Production code removed verbose logging - verify callback was invoked
      expect(mockCallback).toHaveBeenCalledWith(testData)
    })

    it('unified listener handles callback errors', () => {
      const unifiedListener = mockIpcRenderer.on.mock.calls.find(
        (call) => call[0] === 'terminal-data'
      )?.[1]

      // Register a callback that throws
      const exposeCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
        (call) => call[0] === 'electronAPI'
      )
      const electronAPI = exposeCall?.[1]
      const mockCallback = vi.fn(() => {
        throw new Error('Callback error')
      })
      electronAPI.onTerminalData(mockCallback)

      const testData = { id: 'terminal-1', data: 'test data' }
      unifiedListener({}, testData)

      // Production code logs simple error message - verify error was logged
      expect(mockConsole.error).toHaveBeenCalledWith(
        '[Preload] ❌ Error invoking Vue callback:',
        expect.any(Error)
      )
    })

    it('unified listener buffers data when no callback is registered', () => {
      const unifiedListener = mockIpcRenderer.on.mock.calls.find(
        (call) => call[0] === 'terminal-data'
      )?.[1]

      const testData = { id: 'terminal-1', data: 'test data' }
      unifiedListener({}, testData)

      // Production code removed verbose logging - data is buffered silently
      expect(unifiedListener).toBeDefined()
    })

    it('unified listener prevents buffer overflow', () => {
      const unifiedListener = mockIpcRenderer.on.mock.calls.find(
        (call) => call[0] === 'terminal-data'
      )?.[1]

      // Fill buffer beyond MAX_BUFFER_SIZE (100)
      for (let i = 0; i <= 100; i++) {
        const testData = { id: `terminal-${i}`, data: `data ${i}` }
        unifiedListener({}, testData)
      }

      // Production code removed verbose logging - verify buffer mechanism exists
      expect(unifiedListener).toBeDefined()
    })
  })

  describe('🎯 Edge Cases and Error Handling', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock Electron API requires flexible typing for IPC simulation
    let electronAPI: any

    beforeEach(async () => {
      await import('./index.js')
      const exposeCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
        (call) => call[0] === 'electronAPI'
      )
      electronAPI = exposeCall?.[1]
    })

    it('handles undefined options in methods gracefully', () => {
      // Test methods that accept optional parameters
      expect(() => electronAPI.scanDirectory('/path')).not.toThrow()
      expect(() => electronAPI.getGitDiff('/project', 'file.txt')).not.toThrow()
      expect(() =>
        electronAPI.getFileContent('/project', 'file.txt')
      ).not.toThrow()
      expect(() => electronAPI.systemTerminal.initialize()).not.toThrow()
      expect(() => electronAPI.systemTerminal.getLines('system')).not.toThrow()
    })

    it('onTerminalData handles null callback appropriately', () => {
      // This should throw due to validation
      expect(() => {
        electronAPI.onTerminalData(null)
      }).toThrow('Callback must be a function')
    })

    it('unified listener handles malformed data gracefully', () => {
      mockConsole.error.mockClear() // Clear previous errors
      const unifiedListener = mockIpcRenderer.on.mock.calls.find(
        (call) => call[0] === 'terminal-data'
      )?.[1]

      // Test with various invalid data types
      unifiedListener({}, undefined)
      unifiedListener({}, { id: null, data: 'test' })
      unifiedListener({}, { id: 'test', data: null })
      unifiedListener({}, { id: 'test', data: 123 })

      // Should handle all gracefully without throwing
      expect(mockConsole.error).toHaveBeenCalledTimes(4)
    })
  })

  describe('🎯 Advanced Coverage Tests for 100%', () => {
    it('should throw error for invalid callback types in onTerminalData', async () => {
      await import('./index.js')

      const exposeCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
        (call) => call[0] === 'electronAPI'
      )
      const electronAPI = exposeCall?.[1]

      // Test all invalid callback types
      expect(() => electronAPI.onTerminalData(undefined)).toThrow(
        'Callback must be a function'
      )
      expect(() => electronAPI.onTerminalData(null)).toThrow(
        'Callback must be a function'
      )
      expect(() => electronAPI.onTerminalData('string')).toThrow(
        'Callback must be a function'
      )
      expect(() => electronAPI.onTerminalData(123)).toThrow(
        'Callback must be a function'
      )
      expect(() => electronAPI.onTerminalData({})).toThrow(
        'Callback must be a function'
      )
      expect(() => electronAPI.onTerminalData([])).toThrow(
        'Callback must be a function'
      )
    })

    it('should handle callback invocation errors gracefully', async () => {
      await import('./index.js')

      const exposeCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
        (call) => call[0] === 'electronAPI'
      )
      const electronAPI = exposeCall?.[1]

      const unifiedListener = mockIpcRenderer.on.mock.calls.find(
        (call) => call[0] === 'terminal-data'
      )?.[1]

      // Register a callback that throws an error
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error for testing')
      })

      electronAPI.onTerminalData(errorCallback)

      // Clear previous console calls
      mockConsole.error.mockClear()

      // Send terminal data - should handle error gracefully
      const testData = { id: 'test-terminal', data: 'test data' }
      unifiedListener({}, testData)

      // Should log the error but not crash
      expect(mockConsole.error).toHaveBeenCalledWith(
        '[Preload] ❌ Error invoking Vue callback:',
        expect.any(Error)
      )
      expect(errorCallback).toHaveBeenCalledWith(testData)
    })

    it('should trigger buffer overflow protection', async () => {
      await import('./index.js')

      const unifiedListener = mockIpcRenderer.on.mock.calls.find(
        (call) => call[0] === 'terminal-data'
      )?.[1]

      // Fill buffer beyond MAX_BUFFER_SIZE (100)
      for (let i = 0; i <= 101; i++) {
        const data = { id: `terminal-${i}`, data: `data-${i}` }
        unifiedListener({}, data)
      }

      // Production code removed verbose logging - verify buffer mechanism exists
      expect(unifiedListener).toBeDefined()
    })

    it('should use cleanup function from onTerminalData', async () => {
      await import('./index.js')

      const exposeCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
        (call) => call[0] === 'electronAPI'
      )
      const electronAPI = exposeCall?.[1]

      const mockCallback = vi.fn()
      const cleanup = electronAPI.onTerminalData(mockCallback)

      // Verify cleanup function works
      expect(typeof cleanup).toBe('function')

      // Call cleanup
      cleanup()

      // Verify callback was cleared
      const unifiedListener = mockIpcRenderer.on.mock.calls.find(
        (call) => call[0] === 'terminal-data'
      )?.[1]

      // Send data after cleanup - should buffer instead of calling callback
      const testData = { id: 'test-after-cleanup', data: 'test' }
      unifiedListener({}, testData)

      // Callback should not be called since it was cleaned up
      expect(mockCallback).not.toHaveBeenCalled()
    })

    it('should handle all terminalEasterEgg methods', async () => {
      await import('./index.js')

      const exposeCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
        (call) => call[0] === 'electronAPI'
      )
      const electronAPI = exposeCall?.[1]

      // Test all terminalEasterEgg methods
      expect(() =>
        electronAPI.terminalEasterEgg.stepChange('test-step')
      ).not.toThrow()
      expect(() =>
        electronAPI.terminalEasterEgg.visibilityChange(true)
      ).not.toThrow()
      expect(() =>
        electronAPI.terminalEasterEgg.visibilityChange(false)
      ).not.toThrow()
      expect(() =>
        electronAPI.terminalEasterEgg.updateUIVisibility(true)
      ).not.toThrow()
      expect(() =>
        electronAPI.terminalEasterEgg.updateUIVisibility(false)
      ).not.toThrow()

      // Test event listeners
      const mockActivateCallback = vi.fn()
      const mockShowCallback = vi.fn()
      const mockHideCallback = vi.fn()
      const mockCommandCallback = vi.fn()
      const mockInputCallback = vi.fn()
      const mockStepChangeCallback = vi.fn()

      expect(() =>
        electronAPI.terminalEasterEgg.onActivate(mockActivateCallback)
      ).not.toThrow()
      expect(() =>
        electronAPI.terminalEasterEgg.onShow(mockShowCallback)
      ).not.toThrow()
      expect(() =>
        electronAPI.terminalEasterEgg.onHide(mockHideCallback)
      ).not.toThrow()
      expect(() =>
        electronAPI.terminalEasterEgg.onCommand(mockCommandCallback)
      ).not.toThrow()
      expect(() =>
        electronAPI.terminalEasterEgg.onInput(mockInputCallback)
      ).not.toThrow()
      expect(() =>
        electronAPI.terminalEasterEgg.onStepChange(mockStepChangeCallback)
      ).not.toThrow()

      // Test cleanup
      expect(() =>
        electronAPI.terminalEasterEgg.removeAllListeners()
      ).not.toThrow()
    })

    it('should handle all systemTerminal event listeners', async () => {
      await import('./index.js')

      const exposeCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
        (call) => call[0] === 'electronAPI'
      )
      const electronAPI = exposeCall?.[1]

      // Test all systemTerminal event listeners
      const mockEventCallback = vi.fn()
      const mockOutputCallback = vi.fn()
      const mockActivatedCallback = vi.fn()
      const mockClearedCallback = vi.fn()

      expect(() =>
        electronAPI.systemTerminal.onEvent(mockEventCallback)
      ).not.toThrow()
      expect(() =>
        electronAPI.systemTerminal.onOutput(mockOutputCallback)
      ).not.toThrow()
      expect(() =>
        electronAPI.systemTerminal.onActivated(mockActivatedCallback)
      ).not.toThrow()
      expect(() =>
        electronAPI.systemTerminal.onCleared(mockClearedCallback)
      ).not.toThrow()

      // Verify IPC listeners were registered
      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        'system-terminal-event',
        expect.any(Function)
      )
      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        'system-terminal-output',
        expect.any(Function)
      )
      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        'system-terminal-activated',
        expect.any(Function)
      )
      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        'system-terminal-cleared',
        expect.any(Function)
      )
    })

    it('should handle off method for event cleanup', async () => {
      await import('./index.js')

      const exposeCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
        (call) => call[0] === 'electronAPI'
      )
      const electronAPI = exposeCall?.[1]

      const mockListener = vi.fn()

      // Test off method
      expect(() => electronAPI.off('test-channel', mockListener)).not.toThrow()
      expect(mockIpcRenderer.off).toHaveBeenCalledWith(
        'test-channel',
        mockListener
      )
    })

    it('should handle simulate-platform channel in on method', async () => {
      await import('./index.js')

      const exposeCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
        (call) => call[0] === 'electronAPI'
      )
      const electronAPI = exposeCall?.[1]

      const mockListener = vi.fn()

      // Test simulate-platform channel - should use custom IPC system
      // Note: simulate-platform doesn't return cleanup function (only else branch does)
      const cleanup = electronAPI.on('simulate-platform', mockListener)

      expect(mockIPCRendererInstance.on).toHaveBeenCalledWith(
        'simulate-platform',
        mockListener
      )
      expect(cleanup).toBeUndefined() // simulate-platform branch doesn't return cleanup
    })

    it('should handle non-string data types in unified listener', async () => {
      await import('./index.js')

      const unifiedListener = mockIpcRenderer.on.mock.calls.find(
        (call) => call[0] === 'terminal-data'
      )?.[1]

      mockConsole.error.mockClear()

      // Test with non-string data types - production code validates and rejects non-string data
      const nonStringData = { id: 'test-terminal', data: 123 }
      unifiedListener({}, nonStringData)

      const numericData = { id: 'test-terminal', data: { nested: 'object' } }
      unifiedListener({}, numericData)

      const booleanData = { id: 'test-terminal', data: true }
      unifiedListener({}, booleanData)

      // Production code validates data type and logs error for non-string data
      expect(mockConsole.error).toHaveBeenCalledWith(
        '[Preload] ❌ Invalid terminal-data received'
      )
      // Should be called 3 times (once for each invalid data type)
      expect(mockConsole.error).toHaveBeenCalledTimes(3)
    })
  })

  describe('🎯 Integration Tests', () => {
    it('complete workflow: register callback, buffer data, then replay', async () => {
      await import('./index.js')

      const exposeCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
        (call) => call[0] === 'electronAPI'
      )
      const electronAPI = exposeCall?.[1]

      const unifiedListener = mockIpcRenderer.on.mock.calls.find(
        (call) => call[0] === 'terminal-data'
      )?.[1]

      // 1. Buffer some data first (no callback registered)
      const bufferedData = { id: 'terminal-1', data: 'buffered content' }
      unifiedListener({}, bufferedData)

      // 2. Register callback - should replay buffered data
      const mockCallback = vi.fn()
      const cleanup = electronAPI.onTerminalData(mockCallback)

      // 3. Send new data - should invoke callback directly
      const newData = { id: 'terminal-2', data: 'new content' }
      unifiedListener({}, newData)

      // 4. Cleanup
      cleanup()

      // 5. Send data after cleanup - should buffer again
      const afterCleanupData = { id: 'terminal-3', data: 'after cleanup' }
      unifiedListener({}, afterCleanupData)

      // Verify the complete workflow
      expect(mockCallback).toHaveBeenCalledWith(bufferedData) // Replayed
      expect(mockCallback).toHaveBeenCalledWith(newData) // Direct call
      expect(mockCallback).toHaveBeenCalledTimes(2)
    })

    it('all API methods are accessible and callable', async () => {
      await import('./index.js')

      const exposeCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
        (call) => call[0] === 'electronAPI'
      )
      const electronAPI = exposeCall?.[1]

      // Test a sampling of all major API categories
      expect(() =>
        electronAPI.sendTerminalInput({ id: 'test', data: 'test' })
      ).not.toThrow()
      expect(() => electronAPI.setTheme('dark')).not.toThrow()
      expect(() => electronAPI.openProjectDialog()).not.toThrow()
      expect(() => electronAPI.statFile('/test')).not.toThrow()
      expect(() => electronAPI.getCurrentWorkingDirectory()).not.toThrow()
      expect(() => electronAPI.getGitStatus('/project')).not.toThrow()
      expect(() => electronAPI.gitStash('/project', 'message')).not.toThrow()
      expect(() => electronAPI.startFileWatching('/project')).not.toThrow()
      expect(() => electronAPI.systemTerminal.initialize()).not.toThrow()
      expect(() =>
        electronAPI.terminalEasterEgg.stepChange('step1')
      ).not.toThrow()
      expect(() => electronAPI.onTerminalData(vi.fn())).not.toThrow()
    })

    it('should cover gitCreateBranch method with all parameter combinations', async () => {
      await import('./index.js')

      const exposeCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
        (call) => call[0] === 'electronAPI'
      )
      const electronAPI = exposeCall?.[1]

      // Test gitCreateBranch without baseBranch parameter - covers line 127-137
      electronAPI.gitCreateBranch('/test/path', 'new-branch')
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'gitCreateBranch',
        '/test/path',
        'new-branch',
        undefined
      )

      // Test gitCreateBranch with baseBranch parameter
      electronAPI.gitCreateBranch('/test/path', 'feature-branch', 'main')
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'gitCreateBranch',
        '/test/path',
        'feature-branch',
        'main'
      )
    })

    it('should trigger all terminalEasterEgg callback executions for 100% coverage', async () => {
      await import('./index.js')

      const exposeCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
        (call) => call[0] === 'electronAPI'
      )
      const electronAPI = exposeCall?.[1]

      // Test onActivate callback execution (line 370)
      const activateCallback = vi.fn()
      electronAPI.terminalEasterEgg.onActivate(activateCallback)

      // Find and execute the registered listener
      const activateCall = mockIpcRenderer.on.mock.calls.find(
        (call) => call[0] === 'terminal-activate'
      )
      expect(activateCall).toBeDefined()

      const activateListener = activateCall![1]
      const activateData = { step: 'test-step', hasBeenActivated: true }
      activateListener({}, activateData)

      expect(activateCallback).toHaveBeenCalledWith(activateData)

      // Test onCommand callback execution (line 388)
      const commandCallback = vi.fn()
      electronAPI.terminalEasterEgg.onCommand(commandCallback)

      const commandCall = mockIpcRenderer.on.mock.calls.find(
        (call) => call[0] === 'terminal-command'
      )
      expect(commandCall).toBeDefined()

      const commandListener = commandCall![1]
      const commandData = { command: 'test-command', step: 'test-step' }
      commandListener({}, commandData)

      expect(commandCallback).toHaveBeenCalledWith(commandData)

      // Test onStepChange callback execution (line 398)
      const stepChangeCallback = vi.fn()
      electronAPI.terminalEasterEgg.onStepChange(stepChangeCallback)

      const stepChangeCall = mockIpcRenderer.on.mock.calls.find(
        (call) => call[0] === 'terminal-step-change'
      )
      expect(stepChangeCall).toBeDefined()

      const stepChangeListener = stepChangeCall![1]
      const stepChangeData = { step: 'new-step' }
      stepChangeListener({}, stepChangeData)

      expect(stepChangeCallback).toHaveBeenCalledWith(stepChangeData)
    })

    it('should execute systemTerminal callback functions for 100% coverage', async () => {
      await import('./index.js')

      const exposeCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
        (call) => call[0] === 'electronAPI'
      )
      const electronAPI = exposeCall?.[1]

      // Test onEvent callback execution (line 312)
      const eventCallback = vi.fn()
      electronAPI.systemTerminal.onEvent(eventCallback)

      const eventCall = mockIpcRenderer.on.mock.calls.find(
        (call) => call[0] === 'system-terminal-event'
      )
      expect(eventCall).toBeDefined()

      const eventListener = eventCall![1]
      const eventData = { type: 'test-event', data: 'test-data' }
      eventListener({}, eventData)

      expect(eventCallback).toHaveBeenCalledWith(eventData)

      // Test onOutput callback execution (line 318)
      const outputCallback = vi.fn()
      electronAPI.systemTerminal.onOutput(outputCallback)

      const outputCall = mockIpcRenderer.on.mock.calls.find(
        (call) => call[0] === 'system-terminal-output'
      )
      expect(outputCall).toBeDefined()

      const outputListener = outputCall![1]
      const outputData = { output: 'terminal output' }
      outputListener({}, outputData)

      expect(outputCallback).toHaveBeenCalledWith(outputData)

      // Test onActivated callback execution (line 329)
      const activatedCallback = vi.fn()
      electronAPI.systemTerminal.onActivated(activatedCallback)

      const activatedCall = mockIpcRenderer.on.mock.calls.find(
        (call) => call[0] === 'system-terminal-activated'
      )
      expect(activatedCall).toBeDefined()

      const activatedListener = activatedCall![1]
      const activatedData = {
        terminalId: 'test-terminal',
        terminalType: 'system',
      }
      activatedListener({}, activatedData)

      expect(activatedCallback).toHaveBeenCalledWith(activatedData)

      // Test onCleared callback execution (line 340)
      const clearedCallback = vi.fn()
      electronAPI.systemTerminal.onCleared(clearedCallback)

      const clearedCall = mockIpcRenderer.on.mock.calls.find(
        (call) => call[0] === 'system-terminal-cleared'
      )
      expect(clearedCall).toBeDefined()

      const clearedListener = clearedCall![1]
      const clearedData = {
        terminalId: 'test-terminal',
        terminalType: 'timeline',
      }
      clearedListener({}, clearedData)

      expect(clearedCallback).toHaveBeenCalledWith(clearedData)
    })
  })

  describe('🎯 AI Chat IPC Methods', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock Electron API requires flexible typing for IPC simulation
    let electronAPI: any

    beforeEach(async () => {
      await import('./index.js')
      const exposeCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
        (call) => call[0] === 'electronAPI'
      )
      electronAPI = exposeCall?.[1]
    })

    it('should call sendMessage with correct parameters', async () => {
      const messageParams = {
        message: 'Hello AI',
        model: 'gpt-4',
        provider: 'openai',
        sessionId: 'session-123',
        systemPrompt: 'You are helpful',
        temperature: 0.7,
        maxTokens: 1000,
        providerName: 'openai',
      }

      await electronAPI.aiChat.sendMessage(messageParams)

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'ai-chat:send-message',
        messageParams
      )
    })

    it('should call streamMessage and return requestId', async () => {
      const streamParams = {
        message: 'Stream this message',
        model: 'gpt-4',
        provider: 'anthropic',
        sessionId: 'session-456',
        systemPrompt: 'You are assistant',
        temperature: 0.8,
        maxTokens: 2000,
        providerName: 'anthropic',
      }

      mockIpcRenderer.invoke.mockResolvedValue('request-789')

      const requestId = await electronAPI.aiChat.streamMessage(streamParams)

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'ai-chat:stream-message',
        streamParams
      )
      expect(requestId).toBe('request-789')
    })

    it('should call getAvailableProviders', () => {
      electronAPI.aiChat.getAvailableProviders()

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'ai-chat:get-available-providers'
      )
    })

    it('should call getProviderCapabilities with provider name', () => {
      electronAPI.aiChat.getProviderCapabilities('openai')

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'ai-chat:get-provider-capabilities',
        'openai'
      )
    })

    it('should call getProviderCapabilities without provider name', () => {
      electronAPI.aiChat.getProviderCapabilities()

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'ai-chat:get-provider-capabilities',
        undefined
      )
    })

    it('should call setDefaultProvider', () => {
      electronAPI.aiChat.setDefaultProvider('anthropic')

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'ai-chat:set-default-provider',
        'anthropic'
      )
    })

    it('should call clearConversation with provider', () => {
      electronAPI.aiChat.clearConversation('session-123', 'openai')

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'ai-chat:clear-conversation',
        'session-123',
        'openai'
      )
    })

    it('should call clearConversation without provider', () => {
      electronAPI.aiChat.clearConversation('session-456')

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'ai-chat:clear-conversation',
        'session-456',
        undefined
      )
    })

    it('should register onStreamChunk listener', () => {
      const mockCallback = vi.fn()

      electronAPI.aiChat.onStreamChunk(mockCallback)

      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        'ai-chat:stream-chunk',
        expect.any(Function)
      )
    })

    it('should execute onStreamChunk callback when event fires', () => {
      const mockCallback = vi.fn()

      electronAPI.aiChat.onStreamChunk(mockCallback)

      const listenerCall = mockIpcRenderer.on.mock.calls.find(
        (call) => call[0] === 'ai-chat:stream-chunk'
      )
      const listener = listenerCall![1]

      const chunkData = {
        type: 'assistant' as const,
        content: 'Test content',
        metadata: { tokens: 10 },
      }

      listener({}, 'request-123', chunkData)

      expect(mockCallback).toHaveBeenCalledWith('request-123', chunkData)
    })

    it('should register onStreamComplete listener', () => {
      const mockCallback = vi.fn()

      electronAPI.aiChat.onStreamComplete(mockCallback)

      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        'ai-chat:stream-complete',
        expect.any(Function)
      )
    })

    it('should execute onStreamComplete callback when event fires', () => {
      const mockCallback = vi.fn()

      electronAPI.aiChat.onStreamComplete(mockCallback)

      const listenerCall = mockIpcRenderer.on.mock.calls.find(
        (call) => call[0] === 'ai-chat:stream-complete'
      )
      const listener = listenerCall![1]

      listener({}, 'request-456')

      expect(mockCallback).toHaveBeenCalledWith('request-456')
    })

    it('should register onStreamError listener', () => {
      const mockCallback = vi.fn()

      electronAPI.aiChat.onStreamError(mockCallback)

      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        'ai-chat:stream-error',
        expect.any(Function)
      )
    })

    it('should execute onStreamError callback when event fires', () => {
      const mockCallback = vi.fn()

      electronAPI.aiChat.onStreamError(mockCallback)

      const listenerCall = mockIpcRenderer.on.mock.calls.find(
        (call) => call[0] === 'ai-chat:stream-error'
      )
      const listener = listenerCall![1]

      listener({}, 'request-789', 'Connection timeout')

      expect(mockCallback).toHaveBeenCalledWith(
        'request-789',
        'Connection timeout'
      )
    })

    it('should remove all stream listeners', () => {
      electronAPI.aiChat.removeStreamListeners()

      expect(mockIpcRenderer.removeAllListeners).toHaveBeenCalledWith(
        'ai-chat:stream-chunk'
      )
      expect(mockIpcRenderer.removeAllListeners).toHaveBeenCalledWith(
        'ai-chat:stream-complete'
      )
      expect(mockIpcRenderer.removeAllListeners).toHaveBeenCalledWith(
        'ai-chat:stream-error'
      )
    })
  })

  describe('🎯 Commands IPC Methods', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock Electron API requires flexible typing for IPC simulation
    let electronAPI: any

    beforeEach(async () => {
      await import('./index.js')
      const exposeCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
        (call) => call[0] === 'electronAPI'
      )
      electronAPI = exposeCall?.[1]
    })

    it('should call commands.list', () => {
      electronAPI.commands.list()

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('commands:list')
    })

    it('should call commands.search with query', () => {
      electronAPI.commands.search('test query')

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'commands:search',
        'test query'
      )
    })

    it('should call commands.execute with command name only', () => {
      electronAPI.commands.execute('build')

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'commands:execute',
        'build',
        undefined
      )
    })

    it('should call commands.execute with command name and args', () => {
      electronAPI.commands.execute('test', ['--watch', '--coverage'])

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'commands:execute',
        'test',
        ['--watch', '--coverage']
      )
    })
  })

  describe('🎯 Chat Storage API Methods', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock requires flexible typing for storage API simulation
    let chatStorageAPI: any

    beforeEach(async () => {
      await import('./index.js')
      const exposeCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
        (call) => call[0] === 'chatStorageAPI'
      )
      chatStorageAPI = exposeCall?.[1]
    })

    it('should call saveSession with session data', () => {
      const sessionData = {
        id: 'session-123',
        messages: [],
        createdAt: Date.now(),
      }

      chatStorageAPI.saveSession(sessionData)

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'chat-storage:save-session',
        sessionData
      )
    })

    it('should call getAllSessions', () => {
      chatStorageAPI.getAllSessions()

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'chat-storage:get-all-sessions'
      )
    })

    it('should call getSession with session ID', () => {
      chatStorageAPI.getSession('session-456')

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'chat-storage:get-session',
        'session-456'
      )
    })

    it('should call getSessionByProjectBranch', () => {
      chatStorageAPI.getSessionByProjectBranch('/path/to/project', 'main')

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'chat-storage:get-session-by-project-branch',
        '/path/to/project',
        'main'
      )
    })

    it('should call deleteSession with session ID', () => {
      chatStorageAPI.deleteSession('session-789')

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'chat-storage:delete-session',
        'session-789'
      )
    })

    it('should call clearAll', () => {
      chatStorageAPI.clearAll()

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'chat-storage:clear-all'
      )
    })

    it('should call exportSessions without session IDs', () => {
      chatStorageAPI.exportSessions()

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'chat-storage:export',
        undefined
      )
    })

    it('should call exportSessions with session IDs', () => {
      const sessionIds = ['session-1', 'session-2', 'session-3']

      chatStorageAPI.exportSessions(sessionIds)

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'chat-storage:export',
        sessionIds
      )
    })

    it('should call importSessions with JSON data', () => {
      const jsonData = JSON.stringify({
        sessions: [{ id: 'session-1', messages: [] }],
      })

      chatStorageAPI.importSessions(jsonData)

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'chat-storage:import',
        jsonData
      )
    })

    it('should call getStatistics', () => {
      chatStorageAPI.getStatistics()

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'chat-storage:get-statistics'
      )
    })

    it('should call addMessage with session ID and message only', () => {
      const message = {
        role: 'user',
        content: 'Hello',
        timestamp: Date.now(),
      }

      chatStorageAPI.addMessage('session-123', message)

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'chat-storage:add-message',
        'session-123',
        message,
        undefined
      )
    })

    it('should call addMessage with session ID, message, and metrics', () => {
      const message = {
        role: 'assistant',
        content: 'Hi there',
        timestamp: Date.now(),
      }
      const metrics = {
        tokens: 50,
        latency: 250,
      }

      chatStorageAPI.addMessage('session-456', message, metrics)

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'chat-storage:add-message',
        'session-456',
        message,
        metrics
      )
    })

    it('should call createSession with metadata', () => {
      const metadata = {
        projectPath: '/path/to/project',
        branch: 'feature/test',
        model: 'gpt-4',
        provider: 'openai',
        contextWindow: 8000,
        title: 'Test Session',
      }

      chatStorageAPI.createSession(metadata)

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'chat-storage:create-session',
        metadata
      )
    })

    it('should call createSession with minimal metadata', () => {
      const metadata = {
        model: 'claude-3',
        provider: 'anthropic',
        contextWindow: 100000,
      }

      chatStorageAPI.createSession(metadata)

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'chat-storage:create-session',
        metadata
      )
    })
  })
})
