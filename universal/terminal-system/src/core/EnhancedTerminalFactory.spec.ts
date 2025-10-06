/**
 * @fileoverview Tests for EnhancedTerminalFactory class.
 *
 * @description
 * Comprehensive tests for the terminal factory including backend selection,
 * caching behavior, error handling, and testing utilities.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BackendDetector, type TerminalCapabilities } from './BackendDetector'
import { EnhancedTerminalFactory } from './EnhancedTerminalFactory'
import { NodePtyBackend } from './NodePtyBackend'
import { SimpleSubprocessBackend } from './SimpleSubprocessBackend'
import { SubprocessBackend } from './SubprocessBackend'
import type { BackendProcess, BackendSpawnOptions } from './TerminalBackend'

// Mock types - using Partial to avoid strict typing issues
interface MockTerminalBackend {
  capabilities: TerminalCapabilities
  isAvailable: ReturnType<typeof vi.fn>
  spawn: ReturnType<typeof vi.fn>
  name: string
}

// Mock Logger to avoid console conflicts
vi.mock('../utils/logger', () => ({
  Logger: class MockLogger {
    debug = vi.fn()
    info = vi.fn()
    warn = vi.fn()
    error = vi.fn()
  },
}))

// Mock dependencies with proper implementations
vi.mock('./BackendDetector', () => ({
  BackendDetector: {
    detectBestBackend: vi.fn(),
    getCapabilitiesDescription: vi.fn(),
  },
}))

vi.mock('./NodePtyBackend', () => ({
  NodePtyBackend: vi.fn(),
}))

vi.mock('./SimpleSubprocessBackend', () => ({
  SimpleSubprocessBackend: vi.fn(),
}))

vi.mock('./SimpleSimpleSubprocessBackend', () => ({
  SimpleSimpleSubprocessBackend: vi.fn(),
}))

vi.mock('./SubprocessBackend', () => ({
  SubprocessBackend: vi.fn(),
}))

describe('EnhancedTerminalFactory', () => {
  const mockNodePtyCapabilities: TerminalCapabilities = {
    backend: 'node-pty',
    supportsResize: true,
    supportsColors: true,
    supportsInteractivity: true,
    supportsHistory: true,
    reliability: 'high',
  }

  const mockSubprocessCapabilities: TerminalCapabilities = {
    backend: 'subprocess',
    supportsResize: false,
    supportsColors: true,
    supportsInteractivity: true,
    supportsHistory: true,
    reliability: 'medium',
  }

  beforeEach(() => {
    // Mock console methods to suppress output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'debug').mockImplementation(() => {})

    // Clear cache before each test
    EnhancedTerminalFactory.clearCache()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    EnhancedTerminalFactory.clearCache()
  })

  describe('createTerminal', () => {
    it('should create terminal with node-pty backend when available', async () => {
      // Mock BackendDetector to return node-pty
      vi.mocked(BackendDetector.detectBestBackend).mockResolvedValue(
        mockNodePtyCapabilities
      )
      vi.mocked(BackendDetector.getCapabilitiesDescription).mockReturnValue(
        'node-pty (high reliability, resize, colors, interactive, history)'
      )

      // Mock NodePtyBackend
      const mockProcess: Partial<BackendProcess> = {
        pid: 12345,
        write: vi.fn(),
        kill: vi.fn(),
      }
      const mockBackend: MockTerminalBackend = {
        capabilities: mockNodePtyCapabilities,
        isAvailable: vi.fn().mockResolvedValue(true),
        spawn: vi.fn().mockResolvedValue(mockProcess),
        name: 'node-pty',
      }
      vi.mocked(NodePtyBackend).mockImplementation(
        () => mockBackend as unknown as NodePtyBackend
      )

      const options: BackendSpawnOptions = { cols: 120, rows: 30 }
      const result = await EnhancedTerminalFactory.createTerminal(options)

      expect(result.process).toBe(mockProcess)
      expect(result.capabilities).toEqual(mockNodePtyCapabilities)
      expect(mockBackend.spawn).toHaveBeenCalledWith(options)
    })

    it('should create terminal with subprocess backend when node-pty fails', async () => {
      // Mock BackendDetector to return node-pty
      vi.mocked(BackendDetector.detectBestBackend).mockResolvedValue(
        mockNodePtyCapabilities
      )

      // Mock NodePtyBackend as not available
      const mockNodePtyBackend: MockTerminalBackend = {
        capabilities: mockNodePtyCapabilities,
        isAvailable: vi.fn().mockResolvedValue(false),
        spawn: vi.fn(),
        name: 'node-pty',
      }
      vi.mocked(NodePtyBackend).mockImplementation(
        () => mockNodePtyBackend as unknown as NodePtyBackend
      )

      // Mock SimpleSubprocessBackend as available
      const mockProcess: Partial<BackendProcess> = {
        pid: 12345,
        write: vi.fn(),
        kill: vi.fn(),
      }
      const mockSimpleSubprocessBackend: MockTerminalBackend = {
        capabilities: mockSubprocessCapabilities,
        isAvailable: vi.fn().mockResolvedValue(true),
        spawn: vi.fn().mockResolvedValue(mockProcess),
        name: 'subprocess',
      }
      vi.mocked(SimpleSubprocessBackend).mockImplementation(
        () => mockSimpleSubprocessBackend as unknown as SimpleSubprocessBackend
      )

      const result = await EnhancedTerminalFactory.createTerminal()

      expect(result.process).toBe(mockProcess)
      expect(mockSimpleSubprocessBackend.spawn).toHaveBeenCalled()
      // Logger is mocked - skipping console assertion
    })

    it('should use cached backend on subsequent calls', async () => {
      // Mock BackendDetector
      vi.mocked(BackendDetector.detectBestBackend).mockResolvedValue(
        mockSubprocessCapabilities
      )

      // Mock SimpleSubprocessBackend
      const mockProcess: Partial<BackendProcess> = {
        pid: 12345,
        write: vi.fn(),
        kill: vi.fn(),
      }
      const mockBackend: MockTerminalBackend = {
        capabilities: mockSubprocessCapabilities,
        isAvailable: vi.fn().mockResolvedValue(true),
        spawn: vi.fn().mockResolvedValue(mockProcess),
        name: 'subprocess',
      }
      vi.mocked(SimpleSubprocessBackend).mockImplementation(
        () => mockBackend as unknown as SimpleSubprocessBackend
      )

      // First call
      await EnhancedTerminalFactory.createTerminal()
      expect(BackendDetector.detectBestBackend).toHaveBeenCalledTimes(1)

      // Second call should use cache
      await EnhancedTerminalFactory.createTerminal()
      expect(BackendDetector.detectBestBackend).toHaveBeenCalledTimes(1) // Not called again
    })

    it('should handle terminal creation errors', async () => {
      // Mock BackendDetector
      vi.mocked(BackendDetector.detectBestBackend).mockResolvedValue(
        mockSubprocessCapabilities
      )

      // Mock SimpleSubprocessBackend to throw error
      const mockBackend: MockTerminalBackend = {
        capabilities: mockSubprocessCapabilities,
        isAvailable: vi.fn().mockResolvedValue(true),
        spawn: vi.fn().mockRejectedValue(new Error('Spawn failed')),
        name: 'subprocess',
      }
      vi.mocked(SimpleSubprocessBackend).mockImplementation(
        () => mockBackend as unknown as SimpleSubprocessBackend
      )

      await expect(EnhancedTerminalFactory.createTerminal()).rejects.toThrow(
        'Spawn failed'
      )
      // Logger is mocked - skipping console assertion
    })
  })

  describe('clearCache', () => {
    it('should clear cached backend and capabilities', async () => {
      // Create a terminal to populate cache
      vi.mocked(BackendDetector.detectBestBackend).mockResolvedValue(
        mockSubprocessCapabilities
      )
      const mockBackend: MockTerminalBackend = {
        capabilities: mockSubprocessCapabilities,
        isAvailable: vi.fn().mockResolvedValue(true),
        spawn: vi.fn().mockResolvedValue({ pid: 12345 }),
        name: 'subprocess',
      }
      vi.mocked(SimpleSubprocessBackend).mockImplementation(
        () => mockBackend as unknown as SimpleSubprocessBackend
      )

      await EnhancedTerminalFactory.createTerminal()
      expect(BackendDetector.detectBestBackend).toHaveBeenCalledTimes(1)

      // Clear cache
      EnhancedTerminalFactory.clearCache()

      // Next call should detect backend again
      await EnhancedTerminalFactory.createTerminal()
      expect(BackendDetector.detectBestBackend).toHaveBeenCalledTimes(2)
    })
  })

  describe('getCapabilities', () => {
    it('should return cached capabilities when available', async () => {
      // Mock BackendDetector
      vi.mocked(BackendDetector.detectBestBackend).mockResolvedValue(
        mockNodePtyCapabilities
      )
      const mockBackend: MockTerminalBackend = {
        capabilities: mockNodePtyCapabilities,
        isAvailable: vi.fn().mockResolvedValue(true),
        spawn: vi.fn().mockResolvedValue({ pid: 12345 }),
        name: 'node-pty',
      }
      vi.mocked(NodePtyBackend).mockImplementation(
        () => mockBackend as unknown as NodePtyBackend
      )

      // Create terminal to populate cache
      await EnhancedTerminalFactory.createTerminal()

      // Get capabilities should return cached value
      const capabilities = await EnhancedTerminalFactory.getCapabilities()
      expect(capabilities).toEqual(mockNodePtyCapabilities)
    })

    it('should detect backend when cache is empty', async () => {
      vi.mocked(BackendDetector.detectBestBackend).mockResolvedValue(
        mockSubprocessCapabilities
      )
      const mockBackend: MockTerminalBackend = {
        capabilities: mockSubprocessCapabilities,
        isAvailable: vi.fn().mockResolvedValue(true),
        spawn: vi.fn(), // Add missing spawn property
        name: 'subprocess',
      }
      vi.mocked(SimpleSubprocessBackend).mockImplementation(
        () => mockBackend as unknown as SimpleSubprocessBackend
      )

      const capabilities = await EnhancedTerminalFactory.getCapabilities()
      expect(capabilities).toEqual(mockSubprocessCapabilities)
      expect(BackendDetector.detectBestBackend).toHaveBeenCalled()
    })
  })

  describe('testAllBackends', () => {
    it('should test all backends and return their status', async () => {
      // Mock NodePtyBackend
      const mockNodePtyBackend: MockTerminalBackend = {
        isAvailable: vi.fn().mockResolvedValue(true),
        capabilities: mockNodePtyCapabilities,
        spawn: vi.fn(), // Add missing spawn property
        name: 'node-pty',
      }
      vi.mocked(NodePtyBackend).mockImplementation(
        () => mockNodePtyBackend as unknown as NodePtyBackend
      )

      // Mock SubprocessBackend
      const mockSubprocessBackend: MockTerminalBackend = {
        isAvailable: vi.fn().mockResolvedValue(true),
        capabilities: mockSubprocessCapabilities,
        spawn: vi.fn(), // Add missing spawn property
        name: 'subprocess',
      }
      vi.mocked(SubprocessBackend).mockImplementation(
        () => mockSubprocessBackend as unknown as SubprocessBackend
      )

      const results = await EnhancedTerminalFactory.testAllBackends()

      expect(results['node-pty']).toEqual({
        available: true,
        capabilities: expect.objectContaining({
          backend: 'node-pty',
          reliability: 'high',
        }),
        error: undefined,
      })

      expect(results['subprocess']).toEqual({
        available: true,
        capabilities: expect.objectContaining({
          backend: 'subprocess',
          reliability: 'medium',
        }),
        error: undefined,
      })
    })

    it('should handle backend testing errors', async () => {
      // Mock NodePtyBackend to throw error
      vi.mocked(NodePtyBackend).mockImplementation(() => {
        throw new Error('node-pty not found')
      })

      // Mock SubprocessBackend
      const mockSubprocessBackend: MockTerminalBackend = {
        isAvailable: vi.fn().mockResolvedValue(true),
        capabilities: mockSubprocessCapabilities,
        spawn: vi.fn(), // Add missing spawn property
        name: 'subprocess',
      }
      vi.mocked(SubprocessBackend).mockImplementation(
        () => mockSubprocessBackend as unknown as SubprocessBackend
      )

      const results = await EnhancedTerminalFactory.testAllBackends()

      expect(results['node-pty']).toEqual({
        available: false,
        capabilities: expect.any(Object),
        error: 'node-pty not found',
      })

      expect(results['subprocess']).toEqual({
        available: true,
        capabilities: expect.any(Object),
        error: undefined,
      })
    })

    it('should handle isAvailable method errors', async () => {
      // Mock NodePtyBackend with isAvailable throwing error
      const mockNodePtyBackend: MockTerminalBackend = {
        isAvailable: vi
          .fn()
          .mockRejectedValue(new Error('Availability check failed')),
        capabilities: mockNodePtyCapabilities,
        spawn: vi.fn(), // Add missing spawn property
        name: 'node-pty',
      }
      vi.mocked(NodePtyBackend).mockImplementation(
        () => mockNodePtyBackend as unknown as NodePtyBackend
      )

      // Mock SimpleSubprocessBackend
      const mockSimpleSubprocessBackend: MockTerminalBackend = {
        isAvailable: vi.fn().mockResolvedValue(true),
        capabilities: mockSubprocessCapabilities,
        spawn: vi.fn(), // Add missing spawn property
        name: 'subprocess',
      }
      vi.mocked(SimpleSubprocessBackend).mockImplementation(
        () => mockSimpleSubprocessBackend as unknown as SimpleSubprocessBackend
      )

      const results = await EnhancedTerminalFactory.testAllBackends()

      expect(results['node-pty'].available).toBe(false)
      expect(results['node-pty'].error).toBe('Availability check failed')
    })
  })

  describe('Backend selection logic', () => {
    it('should handle ConPTY backend (fallback to subprocess)', async () => {
      const conptyCapabilities: TerminalCapabilities = {
        backend: 'conpty',
        supportsResize: true,
        supportsColors: true,
        supportsInteractivity: true,
        supportsHistory: true,
        reliability: 'high',
      }

      vi.mocked(BackendDetector.detectBestBackend).mockResolvedValue(
        conptyCapabilities
      )

      // Mock SimpleSubprocessBackend (since ConPTY isn't implemented yet)
      const mockProcess: Partial<BackendProcess> = {
        pid: 12345,
        write: vi.fn(),
        kill: vi.fn(),
      }
      const mockBackend: MockTerminalBackend = {
        capabilities: mockSubprocessCapabilities,
        isAvailable: vi.fn().mockResolvedValue(true),
        spawn: vi.fn().mockResolvedValue(mockProcess),
        name: 'subprocess',
      }
      vi.mocked(SimpleSubprocessBackend).mockImplementation(
        () => mockBackend as unknown as SimpleSubprocessBackend
      )

      const result = await EnhancedTerminalFactory.createTerminal()

      expect(result.process).toBe(mockProcess)
      expect(mockBackend.spawn).toHaveBeenCalled()
    })

    it('should handle winpty backend (fallback to subprocess)', async () => {
      const winptyCapabilities: TerminalCapabilities = {
        backend: 'winpty',
        supportsResize: true,
        supportsColors: true,
        supportsInteractivity: true,
        supportsHistory: false,
        reliability: 'medium',
      }

      vi.mocked(BackendDetector.detectBestBackend).mockResolvedValue(
        winptyCapabilities
      )

      // Mock SimpleSubprocessBackend (since winpty isn't implemented yet)
      const mockProcess: Partial<BackendProcess> = {
        pid: 12345,
        write: vi.fn(),
        kill: vi.fn(),
      }
      const mockBackend: MockTerminalBackend = {
        capabilities: mockSubprocessCapabilities,
        isAvailable: vi.fn().mockResolvedValue(true),
        spawn: vi.fn().mockResolvedValue(mockProcess),
        name: 'subprocess',
      }
      vi.mocked(SimpleSubprocessBackend).mockImplementation(
        () => mockBackend as unknown as SimpleSubprocessBackend
      )

      const result = await EnhancedTerminalFactory.createTerminal()

      expect(result.process).toBe(mockProcess)
      expect(mockBackend.spawn).toHaveBeenCalled()
    })
  })

  describe('Advanced error handling and edge cases', () => {
    it('should handle welcome message logging during terminal creation', async () => {
      vi.mocked(BackendDetector.detectBestBackend).mockResolvedValue(
        mockSubprocessCapabilities
      )

      const mockProcess: Partial<BackendProcess> = {
        pid: 12345,
        write: vi.fn(),
        kill: vi.fn(),
      }
      const mockBackend: MockTerminalBackend = {
        capabilities: mockSubprocessCapabilities,
        isAvailable: vi.fn().mockResolvedValue(true),
        spawn: vi.fn().mockResolvedValue(mockProcess),
        name: 'subprocess',
      }
      vi.mocked(SimpleSubprocessBackend).mockImplementation(
        () => mockBackend as unknown as SimpleSubprocessBackend
      )

      const options: BackendSpawnOptions = {
        cols: 120,
        rows: 30,
        welcomeMessage:
          'This is a very long welcome message that should be truncated in logs for security and readability purposes when displayed in debug output',
      }

      await EnhancedTerminalFactory.createTerminal(options)

      expect(mockBackend.spawn).toHaveBeenCalledWith(options)
    })

    it('should handle node-pty fallback when initial backend is not node-pty and fails', async () => {
      vi.mocked(BackendDetector.detectBestBackend).mockResolvedValue(
        mockSubprocessCapabilities
      )

      const failingSubprocessBackend: MockTerminalBackend = {
        capabilities: mockSubprocessCapabilities,
        isAvailable: vi.fn().mockResolvedValue(false),
        spawn: vi.fn(),
        name: 'subprocess',
      }
      vi.mocked(SimpleSubprocessBackend).mockImplementation(
        () => failingSubprocessBackend as unknown as SimpleSubprocessBackend
      )

      const mockProcess: Partial<BackendProcess> = {
        pid: 12345,
        write: vi.fn(),
        kill: vi.fn(),
      }
      const workingNodePtyBackend: MockTerminalBackend = {
        capabilities: mockNodePtyCapabilities,
        isAvailable: vi.fn().mockResolvedValue(true),
        spawn: vi.fn().mockResolvedValue(mockProcess),
        name: 'node-pty',
      }
      vi.mocked(NodePtyBackend).mockImplementation(
        () => workingNodePtyBackend as unknown as NodePtyBackend
      )

      const result = await EnhancedTerminalFactory.createTerminal()

      expect(result.process).toBe(mockProcess)
      expect(workingNodePtyBackend.spawn).toHaveBeenCalled()
    })

    it('should handle node-pty primary backend failure with simple subprocess fallback', async () => {
      vi.mocked(BackendDetector.detectBestBackend).mockResolvedValue(
        mockNodePtyCapabilities
      )

      const failingNodePtyBackend: MockTerminalBackend = {
        capabilities: mockNodePtyCapabilities,
        isAvailable: vi.fn().mockResolvedValue(false),
        spawn: vi.fn(),
        name: 'node-pty',
      }
      vi.mocked(NodePtyBackend).mockImplementation(
        () => failingNodePtyBackend as unknown as NodePtyBackend
      )

      const mockProcess: Partial<BackendProcess> = {
        pid: 12345,
        write: vi.fn(),
        kill: vi.fn(),
      }
      const workingSimpleSubprocessBackend: MockTerminalBackend = {
        capabilities: mockSubprocessCapabilities,
        isAvailable: vi.fn().mockResolvedValue(true),
        spawn: vi.fn().mockResolvedValue(mockProcess),
        name: 'subprocess',
      }
      vi.mocked(SimpleSubprocessBackend).mockImplementation(
        () =>
          workingSimpleSubprocessBackend as unknown as SimpleSubprocessBackend
      )

      const result = await EnhancedTerminalFactory.createTerminal()

      expect(result.process).toBe(mockProcess)
      expect(workingSimpleSubprocessBackend.spawn).toHaveBeenCalled()
    })

    it('should handle node-pty fallback failure and use simple subprocess', async () => {
      vi.mocked(BackendDetector.detectBestBackend).mockResolvedValue(
        mockSubprocessCapabilities
      )

      const failingInitialBackend: MockTerminalBackend = {
        capabilities: mockSubprocessCapabilities,
        isAvailable: vi.fn().mockResolvedValue(false),
        spawn: vi.fn(),
        name: 'subprocess',
      }

      const failingNodePtyBackend: MockTerminalBackend = {
        capabilities: mockNodePtyCapabilities,
        isAvailable: vi.fn().mockResolvedValue(false),
        spawn: vi.fn(),
        name: 'node-pty',
      }

      const mockProcess: Partial<BackendProcess> = {
        pid: 12345,
        write: vi.fn(),
        kill: vi.fn(),
      }
      const workingFinalBackend: MockTerminalBackend = {
        capabilities: mockSubprocessCapabilities,
        isAvailable: vi.fn().mockResolvedValue(true),
        spawn: vi.fn().mockResolvedValue(mockProcess),
        name: 'subprocess',
      }

      let callCount = 0
      vi.mocked(SimpleSubprocessBackend).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return failingInitialBackend as unknown as SimpleSubprocessBackend
        }
        return workingFinalBackend as unknown as SimpleSubprocessBackend
      })

      vi.mocked(NodePtyBackend).mockImplementation(
        () => failingNodePtyBackend as unknown as NodePtyBackend
      )

      const result = await EnhancedTerminalFactory.createTerminal()

      expect(result.process).toBe(mockProcess)
      expect(workingFinalBackend.spawn).toHaveBeenCalled()
    })

    it('should throw error when all backends fail availability check', async () => {
      vi.mocked(BackendDetector.detectBestBackend).mockResolvedValue(
        mockSubprocessCapabilities
      )

      const failingInitialBackend: MockTerminalBackend = {
        capabilities: mockSubprocessCapabilities,
        isAvailable: vi.fn().mockResolvedValue(false),
        spawn: vi.fn(),
        name: 'subprocess',
      }

      const failingNodePtyBackend: MockTerminalBackend = {
        capabilities: mockNodePtyCapabilities,
        isAvailable: vi.fn().mockResolvedValue(false),
        spawn: vi.fn(),
        name: 'node-pty',
      }

      const failingFinalBackend: MockTerminalBackend = {
        capabilities: mockSubprocessCapabilities,
        isAvailable: vi.fn().mockResolvedValue(false),
        spawn: vi.fn(),
        name: 'subprocess',
      }

      let callCount = 0
      vi.mocked(SimpleSubprocessBackend).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return failingInitialBackend as unknown as SimpleSubprocessBackend
        }
        return failingFinalBackend as unknown as SimpleSubprocessBackend
      })

      vi.mocked(NodePtyBackend).mockImplementation(
        () => failingNodePtyBackend as unknown as NodePtyBackend
      )

      await expect(EnhancedTerminalFactory.createTerminal()).rejects.toThrow(
        'All terminal backends failed - no working terminal backend available'
      )
    })

    it('should include SubprocessBackend in testAllBackends', async () => {
      const mockNodePtyBackend: MockTerminalBackend = {
        isAvailable: vi.fn().mockResolvedValue(true),
        capabilities: mockNodePtyCapabilities,
        spawn: vi.fn(),
        name: 'node-pty',
      }
      vi.mocked(NodePtyBackend).mockImplementation(
        () => mockNodePtyBackend as unknown as NodePtyBackend
      )

      const mockSubprocessBackend: MockTerminalBackend = {
        isAvailable: vi.fn().mockResolvedValue(true),
        capabilities: mockSubprocessCapabilities,
        spawn: vi.fn(),
        name: 'subprocess',
      }
      vi.mocked(SubprocessBackend).mockImplementation(
        () => mockSubprocessBackend as unknown as SubprocessBackend
      )

      const results = await EnhancedTerminalFactory.testAllBackends()

      expect(results['subprocess'].available).toBe(true)
      expect(mockSubprocessBackend.isAvailable).toHaveBeenCalled()
    })

    it('should handle non-Error exceptions in testAllBackends', async () => {
      vi.mocked(NodePtyBackend).mockImplementation(() => {
        throw 'String error instead of Error object'
      })

      const mockSubprocessBackend: MockTerminalBackend = {
        isAvailable: vi.fn().mockResolvedValue(true),
        capabilities: mockSubprocessCapabilities,
        spawn: vi.fn(),
        name: 'subprocess',
      }
      vi.mocked(SubprocessBackend).mockImplementation(
        () => mockSubprocessBackend as unknown as SubprocessBackend
      )

      const results = await EnhancedTerminalFactory.testAllBackends()

      expect(results['node-pty'].available).toBe(false)
      expect(results['node-pty'].error).toBe(
        'String error instead of Error object'
      )
      expect(results['subprocess'].available).toBe(true)
    })

    it('should handle isAvailable promise rejection in testAllBackends', async () => {
      const mockNodePtyBackend: MockTerminalBackend = {
        isAvailable: vi
          .fn()
          .mockRejectedValue(new Error('Availability check failed')),
        capabilities: mockNodePtyCapabilities,
        spawn: vi.fn(),
        name: 'node-pty',
      }
      vi.mocked(NodePtyBackend).mockImplementation(
        () => mockNodePtyBackend as unknown as NodePtyBackend
      )

      const mockSubprocessBackend: MockTerminalBackend = {
        isAvailable: vi.fn().mockResolvedValue(true),
        capabilities: mockSubprocessCapabilities,
        spawn: vi.fn(),
        name: 'subprocess',
      }
      vi.mocked(SubprocessBackend).mockImplementation(
        () => mockSubprocessBackend as unknown as SubprocessBackend
      )

      const results = await EnhancedTerminalFactory.testAllBackends()

      expect(results['node-pty'].available).toBe(false)
      expect(results['node-pty'].error).toBe('Availability check failed')
    })

    it('should handle SubprocessBackend Error exceptions in testAllBackends', async () => {
      const mockNodePtyBackend: MockTerminalBackend = {
        isAvailable: vi.fn().mockResolvedValue(true),
        capabilities: mockNodePtyCapabilities,
        spawn: vi.fn(),
        name: 'node-pty',
      }
      vi.mocked(NodePtyBackend).mockImplementation(
        () => mockNodePtyBackend as unknown as NodePtyBackend
      )

      // Mock SubprocessBackend to throw Error
      vi.mocked(SubprocessBackend).mockImplementation(() => {
        throw new Error('SubprocessBackend initialization failed')
      })

      const results = await EnhancedTerminalFactory.testAllBackends()

      expect(results['subprocess'].available).toBe(false)
      expect(results['subprocess'].error).toBe(
        'SubprocessBackend initialization failed'
      )
      expect(results['node-pty'].available).toBe(true)
    })
  })
})
