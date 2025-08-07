/**
 * @fileoverview Tests for EnhancedTerminalFactory class.
 *
 * @description
 * Comprehensive tests for the terminal factory including backend selection,
 * caching behavior, error handling, and testing utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EnhancedTerminalFactory } from './EnhancedTerminalFactory'
import { BackendDetector } from './BackendDetector'
import { NodePtyBackend } from './NodePtyBackend'
import { SubprocessBackend } from './SubprocessBackend'
import type {
  BackendSpawnOptions,
  BackendProcess,
  TerminalCapabilities,
  TerminalBackend,
} from './TerminalBackend'

// Mock types
interface MockTerminalBackend
  extends Omit<TerminalBackend, 'spawn' | 'isAvailable'> {
  capabilities: TerminalCapabilities
  isAvailable: ReturnType<typeof vi.fn>
  spawn: ReturnType<typeof vi.fn>
}

interface MockLogger {
  info: ReturnType<typeof vi.fn>
  warn: ReturnType<typeof vi.fn>
  error: ReturnType<typeof vi.fn>
  debug: ReturnType<typeof vi.fn>
}

// Mock dependencies with proper implementations
vi.mock('../BackendDetector', () => ({
  BackendDetector: {
    detectBestBackend: vi.fn(),
    getCapabilitiesDescription: vi.fn(),
  },
}))

vi.mock('../NodePtyBackend', () => ({
  NodePtyBackend: vi.fn(),
}))

vi.mock('../SubprocessBackend', () => ({
  SubprocessBackend: vi.fn(),
}))

describe('EnhancedTerminalFactory', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>
    error: ReturnType<typeof vi.spyOn>
    info: ReturnType<typeof vi.spyOn>
    warn: ReturnType<typeof vi.spyOn>
    debug: ReturnType<typeof vi.spyOn>
  }

  const mockLogger: MockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }

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
    // Mock console methods
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
    }

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
        logger: mockLogger,
      }
      vi.mocked(NodePtyBackend).mockImplementation(
        () => mockBackend as TerminalBackend
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
        logger: mockLogger,
      }
      vi.mocked(NodePtyBackend).mockImplementation(
        () => mockNodePtyBackend as TerminalBackend
      )

      // Mock SubprocessBackend as available
      const mockProcess: Partial<BackendProcess> = {
        pid: 12345,
        write: vi.fn(),
        kill: vi.fn(),
      }
      const mockSubprocessBackend: MockTerminalBackend = {
        capabilities: mockSubprocessCapabilities,
        isAvailable: vi.fn().mockResolvedValue(true),
        spawn: vi.fn().mockResolvedValue(mockProcess),
        name: 'subprocess',
        logger: mockLogger,
      }
      vi.mocked(SubprocessBackend).mockImplementation(
        () => mockSubprocessBackend as TerminalBackend
      )

      const result = await EnhancedTerminalFactory.createTerminal()

      expect(result.process).toBe(mockProcess)
      expect(mockSubprocessBackend.spawn).toHaveBeenCalled()
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('falling back to subprocess')
      )
    })

    it('should use cached backend on subsequent calls', async () => {
      // Mock BackendDetector
      vi.mocked(BackendDetector.detectBestBackend).mockResolvedValue(
        mockSubprocessCapabilities
      )

      // Mock SubprocessBackend
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
        logger: mockLogger,
      }
      vi.mocked(SubprocessBackend).mockImplementation(
        () => mockBackend as TerminalBackend
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

      // Mock SubprocessBackend to throw error
      const mockBackend: MockTerminalBackend = {
        capabilities: mockSubprocessCapabilities,
        isAvailable: vi.fn().mockResolvedValue(true),
        spawn: vi.fn().mockRejectedValue(new Error('Spawn failed')),
        name: 'subprocess',
        logger: mockLogger,
      }
      vi.mocked(SubprocessBackend).mockImplementation(
        () => mockBackend as TerminalBackend
      )

      await expect(EnhancedTerminalFactory.createTerminal()).rejects.toThrow(
        'Spawn failed'
      )
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create terminal'),
        expect.any(Error)
      )
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
        logger: mockLogger,
      }
      vi.mocked(SubprocessBackend).mockImplementation(
        () => mockBackend as TerminalBackend
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
        logger: mockLogger,
      }
      vi.mocked(NodePtyBackend).mockImplementation(
        () => mockBackend as TerminalBackend
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
        logger: mockLogger,
      }
      vi.mocked(SubprocessBackend).mockImplementation(
        () => mockBackend as TerminalBackend
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
        logger: mockLogger,
      }
      vi.mocked(NodePtyBackend).mockImplementation(
        () => mockNodePtyBackend as TerminalBackend
      )

      // Mock SubprocessBackend
      const mockSubprocessBackend: MockTerminalBackend = {
        isAvailable: vi.fn().mockResolvedValue(true),
        capabilities: mockSubprocessCapabilities,
        spawn: vi.fn(), // Add missing spawn property
        name: 'subprocess',
        logger: mockLogger,
      }
      vi.mocked(SubprocessBackend).mockImplementation(
        () => mockSubprocessBackend as TerminalBackend
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
        logger: mockLogger,
      }
      vi.mocked(SubprocessBackend).mockImplementation(
        () => mockSubprocessBackend as TerminalBackend
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
        logger: mockLogger,
      }
      vi.mocked(NodePtyBackend).mockImplementation(
        () => mockNodePtyBackend as TerminalBackend
      )

      // Mock SubprocessBackend
      const mockSubprocessBackend: MockTerminalBackend = {
        isAvailable: vi.fn().mockResolvedValue(true),
        capabilities: mockSubprocessCapabilities,
        spawn: vi.fn(), // Add missing spawn property
        name: 'subprocess',
        logger: mockLogger,
      }
      vi.mocked(SubprocessBackend).mockImplementation(
        () => mockSubprocessBackend as TerminalBackend
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

      // Mock SubprocessBackend (since ConPTY isn't implemented yet)
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
        logger: mockLogger,
      }
      vi.mocked(SubprocessBackend).mockImplementation(
        () => mockBackend as TerminalBackend
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

      // Mock SubprocessBackend (since winpty isn't implemented yet)
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
        logger: mockLogger,
      }
      vi.mocked(SubprocessBackend).mockImplementation(
        () => mockBackend as TerminalBackend
      )

      const result = await EnhancedTerminalFactory.createTerminal()

      expect(result.process).toBe(mockProcess)
      expect(mockBackend.spawn).toHaveBeenCalled()
    })
  })
})
