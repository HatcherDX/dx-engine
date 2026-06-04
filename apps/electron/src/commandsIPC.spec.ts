/**
 * @fileoverview Comprehensive tests for Commands IPC handlers.
 *
 * @description
 * Tests for the Commands IPC system that bridges command palette
 * functionality between renderer and main processes.
 * - Command listing
 * - Command searching
 * - Command execution
 * - IPC handler registration
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Command, CommandResult } from '@hatcherdx/ai-cli'

// Mock CommandRegistry
const { mockCommandRegistry } = vi.hoisted(() => ({
  mockCommandRegistry: {
    list: vi.fn(),
    search: vi.fn(),
    execute: vi.fn(),
  },
}))

// Mock @hatcherdx/ai-cli
vi.mock('@hatcherdx/ai-cli', () => ({
  CommandRegistry: class MockCommandRegistry {
    list() {
      return mockCommandRegistry.list()
    }
    search(query: string) {
      return mockCommandRegistry.search(query)
    }
    execute(commandName: string, args?: string[]) {
      return mockCommandRegistry.execute(commandName, args)
    }
  },
}))

// Mock Electron ipcMain
const { mockIpcMain } = vi.hoisted(() => ({
  mockIpcMain: {
    handle: vi.fn(),
  },
}))

vi.mock('electron', () => ({
  ipcMain: mockIpcMain,
}))

describe('Commands IPC Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('setupCommandsIPC', () => {
    it('should register all IPC handlers', async () => {
      const { setupCommandsIPC } = await import('./commandsIPC')

      setupCommandsIPC()

      // Verify all three handlers were registered
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'commands:list',
        expect.any(Function)
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'commands:search',
        expect.any(Function)
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'commands:execute',
        expect.any(Function)
      )
      expect(mockIpcMain.handle).toHaveBeenCalledTimes(3)
    })
  })

  describe('commands:list handler', () => {
    it('should list all commands without execute functions', async () => {
      // Mock command data with execute functions
      const mockCommands: Command[] = [
        {
          name: 'test-command-1',
          description: 'Test command 1',
          category: 'test',
          execute: vi.fn(),
        },
        {
          name: 'test-command-2',
          description: 'Test command 2',
          category: 'utility',
          execute: vi.fn(),
        },
      ]

      mockCommandRegistry.list.mockReturnValue(mockCommands)

      const { setupCommandsIPC } = await import('./commandsIPC')
      setupCommandsIPC()

      // Get the handler function
      const listHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'commands:list'
      )?.[1]

      expect(listHandler).toBeDefined()

      // Execute the handler
      const result = await listHandler()

      // Verify the result excludes execute functions
      expect(result).toEqual([
        {
          name: 'test-command-1',
          description: 'Test command 1',
          category: 'test',
        },
        {
          name: 'test-command-2',
          description: 'Test command 2',
          category: 'utility',
        },
      ])

      expect(mockCommandRegistry.list).toHaveBeenCalledTimes(1)
    })

    it('should handle empty command list', async () => {
      mockCommandRegistry.list.mockReturnValue([])

      const { setupCommandsIPC } = await import('./commandsIPC')
      setupCommandsIPC()

      const listHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'commands:list'
      )?.[1]

      const result = await listHandler()

      expect(result).toEqual([])
    })
  })

  describe('commands:search handler', () => {
    it('should search commands by query', async () => {
      const mockSearchResults: Command[] = [
        {
          name: 'search-result',
          description: 'Matching command',
          category: 'test',
          execute: vi.fn(),
        },
      ]

      mockCommandRegistry.search.mockReturnValue(mockSearchResults)

      const { setupCommandsIPC } = await import('./commandsIPC')
      setupCommandsIPC()

      // Get the handler function
      const searchHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'commands:search'
      )?.[1]

      expect(searchHandler).toBeDefined()

      // Execute the handler with a query
      const result = await searchHandler(null, 'search term')

      expect(result).toEqual(mockSearchResults)
      expect(mockCommandRegistry.search).toHaveBeenCalledWith('search term')
    })

    it('should return empty array when no matches found', async () => {
      mockCommandRegistry.search.mockReturnValue([])

      const { setupCommandsIPC } = await import('./commandsIPC')
      setupCommandsIPC()

      const searchHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'commands:search'
      )?.[1]

      const result = await searchHandler(null, 'nonexistent')

      expect(result).toEqual([])
      expect(mockCommandRegistry.search).toHaveBeenCalledWith('nonexistent')
    })
  })

  describe('commands:execute handler', () => {
    it('should execute command without arguments', async () => {
      const mockResult: CommandResult = {
        success: true,
        output: 'Command executed successfully',
      }

      mockCommandRegistry.execute.mockResolvedValue(mockResult)

      const { setupCommandsIPC } = await import('./commandsIPC')
      setupCommandsIPC()

      // Get the handler function
      const executeHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'commands:execute'
      )?.[1]

      expect(executeHandler).toBeDefined()

      // Execute the handler
      const result = await executeHandler(null, 'test-command')

      expect(result).toEqual(mockResult)
      expect(mockCommandRegistry.execute).toHaveBeenCalledWith(
        'test-command',
        undefined
      )
    })

    it('should execute command with arguments', async () => {
      const mockResult: CommandResult = {
        success: true,
        output: 'Command executed with args',
      }

      mockCommandRegistry.execute.mockResolvedValue(mockResult)

      const { setupCommandsIPC } = await import('./commandsIPC')
      setupCommandsIPC()

      const executeHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'commands:execute'
      )?.[1]

      const result = await executeHandler(null, 'test-command', [
        'arg1',
        'arg2',
      ])

      expect(result).toEqual(mockResult)
      expect(mockCommandRegistry.execute).toHaveBeenCalledWith('test-command', [
        'arg1',
        'arg2',
      ])
    })

    it('should handle command execution failure', async () => {
      const mockErrorResult: CommandResult = {
        success: false,
        output: '',
        error: 'Command failed',
      }

      mockCommandRegistry.execute.mockResolvedValue(mockErrorResult)

      const { setupCommandsIPC } = await import('./commandsIPC')
      setupCommandsIPC()

      const executeHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'commands:execute'
      )?.[1]

      const result = await executeHandler(null, 'failing-command')

      expect(result).toEqual(mockErrorResult)
      expect(result.success).toBe(false)
    })
  })

  describe('Console Logging', () => {
    it('should log when IPC handlers are registered', async () => {
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {})

      const { setupCommandsIPC } = await import('./commandsIPC')
      setupCommandsIPC()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[commandsIPC] Commands IPC handlers registered'
      )

      consoleLogSpy.mockRestore()
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete workflow: list -> search -> execute', async () => {
      // Setup mock data
      const mockCommands: Command[] = [
        {
          name: 'workflow-command',
          description: 'Test workflow',
          category: 'test',
          execute: vi.fn(),
        },
      ]

      const mockSearchResult: Command[] = [mockCommands[0]]

      const mockExecuteResult: CommandResult = {
        success: true,
        output: 'Workflow completed',
      }

      mockCommandRegistry.list.mockReturnValue(mockCommands)
      mockCommandRegistry.search.mockReturnValue(mockSearchResult)
      mockCommandRegistry.execute.mockResolvedValue(mockExecuteResult)

      const { setupCommandsIPC } = await import('./commandsIPC')
      setupCommandsIPC()

      // Get all handlers
      const listHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'commands:list'
      )?.[1]

      const searchHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'commands:search'
      )?.[1]

      const executeHandler = mockIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'commands:execute'
      )?.[1]

      // Execute workflow
      const listResult = await listHandler()
      expect(listResult).toHaveLength(1)

      const searchResult = await searchHandler(null, 'workflow')
      expect(searchResult).toHaveLength(1)

      const executeResult = await executeHandler(null, 'workflow-command')
      expect(executeResult.success).toBe(true)
    })
  })
})
