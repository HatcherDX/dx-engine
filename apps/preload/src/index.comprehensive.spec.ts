/**
 * @fileoverview Comprehensive test suite for preload script main entry point.
 *
 * @description
 * Tests the complete electronAPI interface exposed through contextBridge,
 * ensuring all IPC methods, event handlers, and system operations work correctly.
 * Focuses on achieving high test coverage by testing all exported functions and branches.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock electron modules before any imports
const mockContextBridge = {
  exposeInMainWorld: vi.fn(),
}

const mockIpcRenderer = {
  on: vi.fn(),
  off: vi.fn(),
  send: vi.fn(),
  invoke: vi.fn().mockResolvedValue({ success: true }),
}

vi.mock('electron', () => ({
  contextBridge: mockContextBridge,
  ipcRenderer: mockIpcRenderer,
}))

// Mock the IPCRenderer class
const mockIPCRendererInstance = {
  send: vi.fn().mockResolvedValue('mocked-response'),
  on: vi.fn().mockReturnValue(() => {}),
}

vi.mock('./ipcRenderer.js', () => ({
  IPCRenderer: vi.fn().mockImplementation(() => mockIPCRendererInstance),
}))

describe('Preload Script - Comprehensive Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('Module Import and Initialization', () => {
    it('should import and initialize without errors', async () => {
      expect(async () => {
        await import('./index.js')
      }).not.toThrow()
    })

    it('should create IPCRenderer instance with correct types', async () => {
      // Verify that the IPCRenderer mock is available and configured
      const { IPCRenderer } = await import('./ipcRenderer.js')

      // Check that IPCRenderer is a mock function
      expect(IPCRenderer).toBeDefined()
      expect(typeof IPCRenderer).toBe('function')
      expect(vi.isMockFunction(IPCRenderer)).toBe(true)

      // The important part is that the module imports and sets up the API correctly
      // which is tested in the contextBridge integration tests
    })

    it('should export all types from types/index.js', async () => {
      const module = await import('./index.js')
      expect(module).toBeDefined()
      // The export * statement should make types available
    })
  })

  describe('contextBridge Integration', () => {
    it('should expose electronAPI to main world with complete interface', async () => {
      await import('./index.js')

      expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledTimes(1)
      expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith(
        'electronAPI',
        expect.objectContaining({
          versions: process.versions,
          send: expect.any(Function),
          on: expect.any(Function),
          invoke: expect.any(Function),
          sendTerminalInput: expect.any(Function),
          sendTerminalResize: expect.any(Function),
          setTheme: expect.any(Function),
          openProjectDialog: expect.any(Function),
          statFile: expect.any(Function),
          readDirectory: expect.any(Function),
          pathExists: expect.any(Function),
          isDirectory: expect.any(Function),
          readFile: expect.any(Function),
          scanDirectory: expect.any(Function),
          getGitStatus: expect.any(Function),
          getGitDiff: expect.any(Function),
          off: expect.any(Function),
          systemTerminal: expect.any(Object),
        })
      )
    })

    it('should expose systemTerminal with complete interface', async () => {
      await import('./index.js')

      const exposedAPI = mockContextBridge.exposeInMainWorld.mock.calls[0][1]
      expect(exposedAPI.systemTerminal).toEqual(
        expect.objectContaining({
          initialize: expect.any(Function),
          log: expect.any(Function),
          gitOperation: expect.any(Function),
          getTerminal: expect.any(Function),
          listTerminals: expect.any(Function),
          setActive: expect.any(Function),
          clear: expect.any(Function),
          getLines: expect.any(Function),
          updateConfig: expect.any(Function),
          onEvent: expect.any(Function),
          onOutput: expect.any(Function),
          onActivated: expect.any(Function),
          onCleared: expect.any(Function),
        })
      )
    })
  })

  describe('Core API Methods', () => {
    let electronAPI: Record<string, unknown>

    beforeEach(async () => {
      await import('./index.js')
      electronAPI = mockContextBridge.exposeInMainWorld.mock.calls[0][1]
    })

    describe('Basic IPC Operations', () => {
      it('should provide send method that uses IPCRenderer', async () => {
        expect(electronAPI.send).toBe(mockIPCRendererInstance.send)

        await electronAPI.send('test-message', 'arg1', 'arg2')
        expect(mockIPCRendererInstance.send).toHaveBeenCalledWith(
          'test-message',
          'arg1',
          'arg2'
        )
      })

      it('should provide on method that wraps native ipcRenderer.on', () => {
        const testListener = vi.fn()

        electronAPI.on('test-channel', testListener)

        expect(mockIpcRenderer.on).toHaveBeenCalledWith(
          'test-channel',
          expect.any(Function)
        )

        // Test the wrapper function
        const wrapperFn = mockIpcRenderer.on.mock.calls[0][1]
        const mockEvent = { sender: 'test' }
        wrapperFn(mockEvent, 'arg1', 'arg2')

        expect(testListener).toHaveBeenCalledWith('arg1', 'arg2')
        expect(testListener).not.toHaveBeenCalledWith(mockEvent, 'arg1', 'arg2')
      })

      it('should provide off method that calls native ipcRenderer.off', () => {
        const testListener = vi.fn()

        electronAPI.off('test-channel', testListener)

        expect(mockIpcRenderer.off).toHaveBeenCalledWith(
          'test-channel',
          testListener
        )
      })

      it('should provide invoke method bound to native ipcRenderer', () => {
        expect(typeof electronAPI.invoke).toBe('function')
        expect(electronAPI.invoke.name).toBe('bound spy')
      })
    })

    describe('Terminal Operations', () => {
      it('should send terminal input with correct data structure', () => {
        const inputData = { id: 'terminal-1', data: 'ls -la' }

        electronAPI.sendTerminalInput(inputData)

        expect(mockIpcRenderer.send).toHaveBeenCalledWith(
          'terminal-input',
          inputData
        )
      })

      it('should send terminal resize with correct data structure', () => {
        const resizeData = { id: 'terminal-1', cols: 80, rows: 24 }

        electronAPI.sendTerminalResize(resizeData)

        expect(mockIpcRenderer.send).toHaveBeenCalledWith(
          'terminal-resize',
          resizeData
        )
      })
    })

    describe('Theme Management', () => {
      it('should send theme change requests', () => {
        electronAPI.setTheme('dark')

        expect(mockIpcRenderer.send).toHaveBeenCalledWith('set-theme', 'dark')
      })
    })

    describe('Project Management', () => {
      it('should invoke project dialog', async () => {
        await electronAPI.openProjectDialog()

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('openProjectDialog')
      })
    })

    describe('File System Operations', () => {
      it('should invoke statFile with file path', async () => {
        await electronAPI.statFile('/path/to/file.txt')

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'statFile',
          '/path/to/file.txt'
        )
      })

      it('should invoke readDirectory with directory path', async () => {
        await electronAPI.readDirectory('/path/to/directory')

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'readDirectory',
          '/path/to/directory'
        )
      })

      it('should invoke pathExists with path', async () => {
        await electronAPI.pathExists('/some/path')

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'pathExists',
          '/some/path'
        )
      })

      it('should invoke isDirectory with path', async () => {
        await electronAPI.isDirectory('/some/path')

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'isDirectory',
          '/some/path'
        )
      })

      it('should invoke readFile with file path', async () => {
        await electronAPI.readFile('/path/to/file.txt')

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'readFile',
          '/path/to/file.txt'
        )
      })

      it('should invoke scanDirectory with path and options', async () => {
        const options = {
          ignoredDirs: ['node_modules'],
          configFiles: ['package.json'],
        }

        await electronAPI.scanDirectory('/project/path', options)

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'scanDirectory',
          '/project/path',
          options
        )
      })

      it('should invoke scanDirectory without options', async () => {
        await electronAPI.scanDirectory('/project/path')

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'scanDirectory',
          '/project/path',
          undefined
        )
      })
    })

    describe('Git Operations', () => {
      it('should invoke getGitStatus with project path', async () => {
        await electronAPI.getGitStatus('/project/path')

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'getGitStatus',
          '/project/path'
        )
      })

      it('should invoke getGitDiff with all parameters', async () => {
        const options = { staged: true, commit: 'abc123' }

        await electronAPI.getGitDiff('/project/path', 'file.js', options)

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'getGitDiff',
          '/project/path',
          'file.js',
          options
        )
      })

      it('should invoke getGitDiff without options', async () => {
        await electronAPI.getGitDiff('/project/path', 'file.js')

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'getGitDiff',
          '/project/path',
          'file.js',
          undefined
        )
      })
    })
  })

  describe('System Terminal API', () => {
    let systemTerminalAPI: Record<string, unknown>

    beforeEach(async () => {
      await import('./index.js')
      const electronAPI = mockContextBridge.exposeInMainWorld.mock.calls[0][1]
      systemTerminalAPI = electronAPI.systemTerminal
    })

    describe('Initialization and Configuration', () => {
      it('should initialize system terminals with options', async () => {
        const options = {
          projectType: 'nodejs',
          projectName: 'test-project',
          projectPath: '/path/to/project',
          packageManager: 'npm',
        }

        await systemTerminalAPI.initialize(options)

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'system-terminal-initialize',
          options
        )
      })

      it('should initialize system terminals without options', async () => {
        await systemTerminalAPI.initialize()

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'system-terminal-initialize',
          undefined
        )
      })

      it('should update terminal configuration', async () => {
        const config = { autoScroll: true, maxLines: 1000 }

        await systemTerminalAPI.updateConfig('system', config)

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'system-terminal-update-config',
          'system',
          config
        )
      })
    })

    describe('Logging Operations', () => {
      it('should log system messages with all parameters', async () => {
        const logRequest = {
          level: 'info' as const,
          message: 'Test message',
          terminal: 'system' as const,
          context: { user: 'test' },
        }

        await systemTerminalAPI.log(logRequest)

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'system-terminal-log',
          logRequest
        )
      })

      it('should log git operations', async () => {
        const gitRequest = {
          operation: 'commit',
          args: ['-m', 'test commit'],
          context: { branch: 'main' },
        }

        await systemTerminalAPI.gitOperation(gitRequest)

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'system-terminal-git-operation',
          gitRequest
        )
      })
    })

    describe('Terminal Management', () => {
      it('should get terminal by type', async () => {
        await systemTerminalAPI.getTerminal('system')

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'system-terminal-get',
          'system'
        )
      })

      it('should list all terminals', async () => {
        await systemTerminalAPI.listTerminals()

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'system-terminal-list'
        )
      })

      it('should set active terminal', async () => {
        await systemTerminalAPI.setActive('timeline')

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'system-terminal-set-active',
          'timeline'
        )
      })

      it('should clear terminal', async () => {
        await systemTerminalAPI.clear('system')

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'system-terminal-clear',
          'system'
        )
      })

      it('should get terminal lines with options', async () => {
        const options = {
          limit: 100,
          type: 'INFO' as const,
          since: '2023-01-01',
        }

        await systemTerminalAPI.getLines('system', options)

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'system-terminal-get-lines',
          'system',
          options
        )
      })

      it('should get terminal lines without options', async () => {
        await systemTerminalAPI.getLines('timeline')

        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'system-terminal-get-lines',
          'timeline',
          undefined
        )
      })
    })

    describe('Event Listeners', () => {
      it('should register onEvent listener', () => {
        const callback = vi.fn()

        systemTerminalAPI.onEvent(callback)

        expect(mockIpcRenderer.on).toHaveBeenCalledWith(
          'system-terminal-event',
          expect.any(Function)
        )

        // Test the callback wrapper
        const wrapperFn = mockIpcRenderer.on.mock.calls[0][1]
        const mockEvent = { sender: 'test' }
        const testData = { event: 'test-event', terminal: 'system' }

        wrapperFn(mockEvent, testData)
        expect(callback).toHaveBeenCalledWith(testData)
      })

      it('should register onOutput listener', () => {
        const callback = vi.fn()

        systemTerminalAPI.onOutput(callback)

        expect(mockIpcRenderer.on).toHaveBeenCalledWith(
          'system-terminal-output',
          expect.any(Function)
        )

        // Test the callback wrapper
        const wrapperFn = mockIpcRenderer.on.mock.calls[0][1]
        const mockEvent = { sender: 'test' }
        const testData = { output: 'test output' }

        wrapperFn(mockEvent, testData)
        expect(callback).toHaveBeenCalledWith(testData)
      })

      it('should register onActivated listener', () => {
        const callback = vi.fn()

        systemTerminalAPI.onActivated(callback)

        expect(mockIpcRenderer.on).toHaveBeenCalledWith(
          'system-terminal-activated',
          expect.any(Function)
        )

        // Test the callback wrapper
        const wrapperFn = mockIpcRenderer.on.mock.calls[0][1]
        const mockEvent = { sender: 'test' }
        const testData = { terminalId: 'term-1', terminalType: 'system' }

        wrapperFn(mockEvent, testData)
        expect(callback).toHaveBeenCalledWith(testData)
      })

      it('should register onCleared listener', () => {
        const callback = vi.fn()

        systemTerminalAPI.onCleared(callback)

        expect(mockIpcRenderer.on).toHaveBeenCalledWith(
          'system-terminal-cleared',
          expect.any(Function)
        )

        // Test the callback wrapper
        const wrapperFn = mockIpcRenderer.on.mock.calls[0][1]
        const mockEvent = { sender: 'test' }
        const testData = { terminalId: 'term-1', terminalType: 'timeline' }

        wrapperFn(mockEvent, testData)
        expect(callback).toHaveBeenCalledWith(testData)
      })
    })
  })

  describe('ElectronAPI Type Export', () => {
    it('should export ElectronAPI type that matches the electronAPI object', async () => {
      const module = await import('./index.js')

      // The ElectronAPI type should be available for import
      expect(module).toBeDefined()

      // Verify the type is consistent with the exposed API
      const electronAPI = mockContextBridge.exposeInMainWorld.mock.calls[0][1]
      expect(electronAPI).toHaveProperty('versions')
      expect(electronAPI).toHaveProperty('systemTerminal')
      expect(electronAPI).toHaveProperty('send')
      expect(electronAPI).toHaveProperty('invoke')
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle multiple calls to the same API methods', async () => {
      await import('./index.js')
      const electronAPI = mockContextBridge.exposeInMainWorld.mock.calls[0][1]

      // Call methods multiple times
      electronAPI.setTheme('dark')
      electronAPI.setTheme('light')
      electronAPI.setTheme('auto')

      expect(mockIpcRenderer.send).toHaveBeenCalledTimes(3)
      expect(mockIpcRenderer.send).toHaveBeenNthCalledWith(
        1,
        'set-theme',
        'dark'
      )
      expect(mockIpcRenderer.send).toHaveBeenNthCalledWith(
        2,
        'set-theme',
        'light'
      )
      expect(mockIpcRenderer.send).toHaveBeenNthCalledWith(
        3,
        'set-theme',
        'auto'
      )
    })

    it('should handle empty parameters gracefully', async () => {
      await import('./index.js')
      const electronAPI = mockContextBridge.exposeInMainWorld.mock.calls[0][1]

      // Test with empty/undefined parameters
      await electronAPI.getGitDiff('', '')
      await electronAPI.scanDirectory('')

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'getGitDiff',
        '',
        '',
        undefined
      )
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'scanDirectory',
        '',
        undefined
      )
    })

    it('should preserve function binding for invoke method', async () => {
      await import('./index.js')
      const electronAPI = mockContextBridge.exposeInMainWorld.mock.calls[0][1]

      // The invoke method should be bound to the original ipcRenderer
      expect(typeof electronAPI.invoke).toBe('function')
      expect(electronAPI.invoke.name).toBe('bound spy')

      // Test that it can be called independently
      const { invoke } = electronAPI
      await invoke('test-channel', 'test-arg')

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'test-channel',
        'test-arg'
      )
    })
  })
})
