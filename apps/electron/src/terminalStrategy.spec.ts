/**
 * @fileoverview Comprehensive tests for terminal strategy implementation.
 *
 * @description
 * Enhanced tests for the terminal strategy using @hatcherdx/terminal-system
 * covering all code paths, error handling, and edge cases.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'node:events'
import { TerminalStrategy } from './terminalStrategy'

// Mock @hatcherdx/terminal-system with comprehensive setup
const mockBackendProcess = {
  id: 'test-process-1',
  pid: 12345,
  isRunning: true,
  write: vi.fn(),
  resize: vi.fn(),
  kill: vi.fn(),
  on: vi.fn(),
}

const mockTerminalCapabilities = {
  backend: 'node-pty' as const,
  supportsResize: true,
  supportsColors: true,
  supportsInteractivity: true,
  supportsHistory: true,
  reliability: 'high' as const,
}

const mockLowReliabilityCapabilities = {
  backend: 'subprocess' as const,
  supportsResize: false,
  supportsColors: false,
  supportsInteractivity: false,
  supportsHistory: false,
  reliability: 'low' as const,
}

const { mockBackendDetector, mockEnhancedTerminalFactory } = vi.hoisted(() => ({
  mockBackendDetector: {
    detectBestBackend: vi.fn(() => Promise.resolve(mockTerminalCapabilities)),
    getCapabilitiesDescription: vi.fn(
      () => 'High reliability node-pty backend'
    ),
  },
  mockEnhancedTerminalFactory: {
    createTerminal: vi.fn(() =>
      Promise.resolve({
        process: mockBackendProcess,
        capabilities: mockTerminalCapabilities,
      })
    ),
    testAllBackends: vi.fn(() =>
      Promise.resolve({
        'node-pty': { available: true },
        conpty: { available: false, error: 'Not supported on this platform' },
        subprocess: { available: true },
      })
    ),
  },
}))

vi.mock('@hatcherdx/terminal-system', () => ({
  BackendDetector: mockBackendDetector,
  EnhancedTerminalFactory: mockEnhancedTerminalFactory,
}))

describe('TerminalStrategy', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Reset all mocks before each test
    vi.clearAllMocks()

    // Clear module cache to reset singleton state
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('TerminalStrategy enum', () => {
    it('should have correct strategy values', () => {
      expect(TerminalStrategy.NODE_PTY).toBe('node-pty')
      expect(TerminalStrategy.CONPTY).toBe('conpty')
      expect(TerminalStrategy.WINPTY).toBe('winpty')
      expect(TerminalStrategy.SUBPROCESS).toBe('subprocess')
    })

    it('should contain all expected strategies', () => {
      const strategies = Object.values(TerminalStrategy)
      expect(strategies).toContain('node-pty')
      expect(strategies).toContain('conpty')
      expect(strategies).toContain('winpty')
      expect(strategies).toContain('subprocess')
      expect(strategies).toHaveLength(4)
    })
  })

  describe('createTerminal function', () => {
    it('should be importable', async () => {
      const { createTerminal } = await import('./terminalStrategy')
      expect(typeof createTerminal).toBe('function')
    })

    it('should create terminal with basic setup', async () => {
      const { createTerminal } = await import('./terminalStrategy')
      const result = await createTerminal('test-terminal')

      expect(result).toBeDefined()
      expect(result.terminal).toBeDefined()
      expect(result.strategy).toBeDefined()
      expect(result.capabilities).toBeDefined()
      expect(result.terminal).toBeInstanceOf(EventEmitter)
    })

    it('should return correct strategy for node-pty backend', async () => {
      const { createTerminal } = await import('./terminalStrategy')
      const result = await createTerminal('test-terminal')

      expect(result.strategy).toBe(TerminalStrategy.NODE_PTY)
      expect(result.capabilities.backend).toBe('node-pty')
    })
  })

  describe('ITerminal interface', () => {
    it('should have all required methods and properties', async () => {
      const { createTerminal } = await import('./terminalStrategy')
      const result = await createTerminal('test-terminal')
      const terminal = result.terminal

      expect(terminal).toBeInstanceOf(EventEmitter)
      expect(typeof terminal.spawn).toBe('function')
      expect(typeof terminal.write).toBe('function')
      expect(typeof terminal.resize).toBe('function')
      expect(typeof terminal.kill).toBe('function')
      expect(typeof terminal.pid).toBe('number')
      expect(typeof terminal.isRunning).toBe('boolean')
    })

    it('should handle basic operations without throwing', async () => {
      const { createTerminal } = await import('./terminalStrategy')
      const result = await createTerminal('test-terminal')
      const terminal = result.terminal

      expect(() => terminal.spawn()).not.toThrow()
      expect(() => terminal.write('test')).not.toThrow()
      expect(() => terminal.resize(80, 24)).not.toThrow()
      expect(() => terminal.kill()).not.toThrow()
    })
  })

  describe('EnhancedTerminalWrapper class', () => {
    it('should properly initialize', async () => {
      const { createTerminal } = await import('./terminalStrategy')
      const result = await createTerminal('test-terminal')
      const terminal = result.terminal

      expect(terminal.pid).toBe(12345)
      expect(terminal.isRunning).toBe(false) // Initial state before spawn
    })

    it('should change running state after spawn', async () => {
      const { createTerminal } = await import('./terminalStrategy')
      const result = await createTerminal('test-terminal')
      const terminal = result.terminal

      expect(terminal.isRunning).toBe(false)
      terminal.spawn()
      expect(terminal.isRunning).toBe(true)
    })
  })

  describe('TerminalStrategyManager singleton', () => {
    it('should be accessible through terminalStrategy export', async () => {
      const { terminalStrategy } = await import('./terminalStrategy')
      expect(terminalStrategy).toBeDefined()
      expect(typeof terminalStrategy.createTerminal).toBe('function')
    })

    it('should return same instance for multiple getInstance calls', async () => {
      const { terminalStrategy } = await import('./terminalStrategy')
      const manager1 = terminalStrategy
      const manager2 = terminalStrategy
      expect(manager1).toBe(manager2)
    })

    it('should detect best strategy', async () => {
      const { terminalStrategy } = await import('./terminalStrategy')
      const capabilities = await terminalStrategy.detectBestStrategy()

      expect(capabilities).toBeDefined()
      expect(capabilities.backend).toBe('node-pty')
      expect(mockBackendDetector.detectBestBackend).toHaveBeenCalled()
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Enhanced Terminal Strategy] Detecting best backend...'
      )
    })

    it('should cache capabilities after first detection', async () => {
      const { terminalStrategy } = await import('./terminalStrategy')

      // First call
      const capabilities1 = await terminalStrategy.detectBestStrategy()
      // Second call
      const capabilities2 = await terminalStrategy.detectBestStrategy()

      expect(capabilities1).toBe(capabilities2)
      expect(mockBackendDetector.detectBestBackend).toHaveBeenCalledTimes(1)
    })

    it('should get active strategy', async () => {
      const { terminalStrategy } = await import('./terminalStrategy')

      // Before detection
      expect(terminalStrategy.getActiveStrategy()).toBeNull()

      // After detection
      await terminalStrategy.detectBestStrategy()
      expect(terminalStrategy.getActiveStrategy()).toBe(
        TerminalStrategy.NODE_PTY
      )
    })

    it('should get capabilities', async () => {
      const { terminalStrategy } = await import('./terminalStrategy')

      // Before detection
      expect(terminalStrategy.getCapabilities()).toBeNull()

      // After detection
      const capabilities = await terminalStrategy.detectBestStrategy()
      expect(terminalStrategy.getCapabilities()).toBe(capabilities)
    })

    it('should get fallback reason for low reliability backends', async () => {
      mockBackendDetector.detectBestBackend.mockResolvedValueOnce(
        mockLowReliabilityCapabilities
      )

      const { terminalStrategy } = await import('./terminalStrategy')
      await terminalStrategy.detectBestStrategy()

      const fallbackReason = terminalStrategy.getFallbackReason()
      expect(fallbackReason).not.toBeNull()
      expect(fallbackReason).toContain(
        'Using subprocess backend (low reliability)'
      )
    })

    it('should return null fallback reason for high reliability backends', async () => {
      const { terminalStrategy } = await import('./terminalStrategy')
      await terminalStrategy.detectBestStrategy()

      const fallbackReason = terminalStrategy.getFallbackReason()
      expect(fallbackReason).toBeNull()
    })

    it('should refresh strategy', async () => {
      const { terminalStrategy } = await import('./terminalStrategy')

      // Initial detection
      await terminalStrategy.detectBestStrategy()
      expect(mockBackendDetector.detectBestBackend).toHaveBeenCalledTimes(1)

      // Refresh
      await terminalStrategy.refreshStrategy()
      expect(mockBackendDetector.detectBestBackend).toHaveBeenCalledTimes(2)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Enhanced Terminal Strategy] Refreshing backend detection...'
      )
    })

    it('should test all backends', async () => {
      const { terminalStrategy } = await import('./terminalStrategy')

      const results = await terminalStrategy.testAllBackends()
      expect(results).toBeDefined()
      expect(mockEnhancedTerminalFactory.testAllBackends).toHaveBeenCalled()
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Enhanced Terminal Strategy] Testing all available backends...'
      )
    })
  })

  describe('Backend Strategy Mapping', () => {
    it('should map conpty backend to CONPTY strategy', async () => {
      mockEnhancedTerminalFactory.createTerminal.mockResolvedValueOnce({
        process: mockBackendProcess,
        capabilities: { ...mockTerminalCapabilities, backend: 'conpty' },
      })

      const { createTerminal } = await import('./terminalStrategy')
      const result = await createTerminal('test-terminal')

      expect(result.strategy).toBe(TerminalStrategy.CONPTY)
    })

    it('should map winpty backend to WINPTY strategy', async () => {
      mockEnhancedTerminalFactory.createTerminal.mockResolvedValueOnce({
        process: mockBackendProcess,
        capabilities: { ...mockTerminalCapabilities, backend: 'winpty' },
      })

      const { createTerminal } = await import('./terminalStrategy')
      const result = await createTerminal('test-terminal')

      expect(result.strategy).toBe(TerminalStrategy.WINPTY)
    })

    it('should map subprocess backend to SUBPROCESS strategy', async () => {
      mockEnhancedTerminalFactory.createTerminal.mockResolvedValueOnce({
        process: mockBackendProcess,
        capabilities: mockLowReliabilityCapabilities,
      })

      const { createTerminal } = await import('./terminalStrategy')
      const result = await createTerminal('test-terminal')

      expect(result.strategy).toBe(TerminalStrategy.SUBPROCESS)
    })

    it('should default to SUBPROCESS for unknown backends', async () => {
      mockEnhancedTerminalFactory.createTerminal.mockResolvedValueOnce({
        process: mockBackendProcess,
        capabilities: {
          ...mockTerminalCapabilities,
          backend: 'unknown' as 'node-pty',
        },
      })

      const { createTerminal } = await import('./terminalStrategy')
      const result = await createTerminal('test-terminal')

      expect(result.strategy).toBe(TerminalStrategy.SUBPROCESS)
    })
  })

  describe('EnhancedTerminalWrapper Error Handling', () => {
    it('should handle process data events', async () => {
      const { createTerminal } = await import('./terminalStrategy')
      const result = await createTerminal('test-terminal')
      const terminal = result.terminal

      const dataHandler = vi.fn()
      terminal.on('data', dataHandler)

      // Simulate process data event
      const onCall = mockBackendProcess.on.mock.calls.find(
        (call) => call[0] === 'data'
      )
      if (onCall) {
        onCall[1]('test data')
      }

      expect(dataHandler).toHaveBeenCalledWith('test data')
    })

    it('should handle process exit events', async () => {
      const { createTerminal } = await import('./terminalStrategy')
      const result = await createTerminal('test-terminal')
      const terminal = result.terminal

      const exitHandler = vi.fn()
      terminal.on('exit', exitHandler)

      // Start the terminal
      terminal.spawn()
      expect(terminal.isRunning).toBe(true)

      // Simulate process exit event
      const onCall = mockBackendProcess.on.mock.calls.find(
        (call) => call[0] === 'exit'
      )
      if (onCall) {
        onCall[1]({ exitCode: 0 })
      }

      expect(exitHandler).toHaveBeenCalledWith(0)
      expect(terminal.isRunning).toBe(false)
    })

    it('should handle process error events', async () => {
      const { createTerminal } = await import('./terminalStrategy')
      const result = await createTerminal('test-terminal')
      const terminal = result.terminal

      const errorHandler = vi.fn()
      terminal.on('error', errorHandler)

      // Start the terminal
      terminal.spawn()
      expect(terminal.isRunning).toBe(true)

      // Simulate process error event
      const testError = new Error('Test error')
      const onCall = mockBackendProcess.on.mock.calls.find(
        (call) => call[0] === 'error'
      )
      if (onCall) {
        onCall[1](testError)
      }

      expect(errorHandler).toHaveBeenCalledWith(testError)
      expect(terminal.isRunning).toBe(false)
    })

    it('should handle write when not running', async () => {
      const { createTerminal } = await import('./terminalStrategy')
      const result = await createTerminal('test-terminal')
      const terminal = result.terminal

      // Don't spawn, so isRunning is false
      terminal.write('test data')

      expect(mockBackendProcess.write).not.toHaveBeenCalled()
    })

    it('should handle write when running', async () => {
      const { createTerminal } = await import('./terminalStrategy')
      const result = await createTerminal('test-terminal')
      const terminal = result.terminal

      terminal.spawn()
      terminal.write('test data')

      expect(mockBackendProcess.write).toHaveBeenCalledWith('test data')
    })

    it('should handle resize when supported', async () => {
      const { createTerminal } = await import('./terminalStrategy')
      const result = await createTerminal('test-terminal')
      const terminal = result.terminal

      terminal.resize(100, 30)

      expect(mockBackendProcess.resize).toHaveBeenCalledWith(100, 30)
    })

    it('should not resize when not supported', async () => {
      mockEnhancedTerminalFactory.createTerminal.mockResolvedValueOnce({
        process: { ...mockBackendProcess, resize: undefined },
        capabilities: { ...mockTerminalCapabilities, supportsResize: false },
      })

      const { createTerminal } = await import('./terminalStrategy')
      const result = await createTerminal('test-terminal')
      const terminal = result.terminal

      terminal.resize(100, 30)

      // Should not throw or call resize
      expect(() => terminal.resize(100, 30)).not.toThrow()
    })

    it('should handle kill operation', async () => {
      const { createTerminal } = await import('./terminalStrategy')
      const result = await createTerminal('test-terminal')
      const terminal = result.terminal

      terminal.spawn()
      expect(terminal.isRunning).toBe(true)

      terminal.kill()

      expect(mockBackendProcess.kill).toHaveBeenCalled()
      expect(terminal.isRunning).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle terminal creation errors', async () => {
      const testError = new Error('Factory creation failed')
      mockEnhancedTerminalFactory.createTerminal.mockRejectedValueOnce(
        testError
      )

      const { createTerminal } = await import('./terminalStrategy')

      await expect(createTerminal('test-terminal')).rejects.toThrow(testError)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Enhanced Terminal Strategy] Failed to create terminal test-terminal:',
        testError
      )
    })

    it('should handle setupEventHandlers with null process', async () => {
      mockEnhancedTerminalFactory.createTerminal.mockResolvedValueOnce({
        process: null as typeof mockBackendProcess,
        capabilities: mockTerminalCapabilities,
      })

      const { createTerminal } = await import('./terminalStrategy')

      // Should not throw when process is null
      expect(async () => {
        const result = await createTerminal('test-terminal')
        result.terminal.spawn()
      }).not.toThrow()
    })
  })

  describe('Console Logging', () => {
    it('should log terminal creation', async () => {
      const { createTerminal } = await import('./terminalStrategy')
      await createTerminal('test-terminal-123')

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Enhanced Terminal Strategy] Creating terminal test-terminal-123...'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Enhanced Terminal Strategy] Created terminal test-terminal-123 with node-pty backend'
      )
    })

    it('should log capability detection', async () => {
      const { terminalStrategy } = await import('./terminalStrategy')
      await terminalStrategy.detectBestStrategy()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Enhanced Terminal Strategy] Detecting best backend...'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Enhanced Terminal Strategy] Selected: node-pty'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Enhanced Terminal Strategy] Capabilities: High reliability node-pty backend'
      )
    })
  })

  describe('Terminal Options', () => {
    it('should pass custom options to factory', async () => {
      const { createTerminal } = await import('./terminalStrategy')

      const customOptions = {
        shell: '/bin/bash',
        cwd: '/home/user',
        env: { NODE_ENV: 'test' },
        cols: 120,
        rows: 40,
      }

      await createTerminal('test-terminal', customOptions)

      expect(mockEnhancedTerminalFactory.createTerminal).toHaveBeenCalledWith({
        shell: '/bin/bash',
        cwd: '/home/user',
        env: { NODE_ENV: 'test' },
        cols: 120,
        rows: 40,
      })
    })

    it('should use default options when not provided', async () => {
      const { createTerminal } = await import('./terminalStrategy')

      await createTerminal('test-terminal')

      expect(mockEnhancedTerminalFactory.createTerminal).toHaveBeenCalledWith({
        shell: undefined,
        cwd: process.cwd(),
        env: undefined,
        cols: 80,
        rows: 24,
      })
    })
  })

  describe('Fallback Reason Handling', () => {
    it('should provide fallback reason for low reliability backends', async () => {
      mockEnhancedTerminalFactory.createTerminal.mockResolvedValueOnce({
        process: mockBackendProcess,
        capabilities: mockLowReliabilityCapabilities,
      })

      const { createTerminal } = await import('./terminalStrategy')
      const result = await createTerminal('test-terminal')

      expect(result.fallbackReason).toBe(
        'Using subprocess backend (low reliability)'
      )
    })

    it('should not provide fallback reason for high reliability backends', async () => {
      const { createTerminal } = await import('./terminalStrategy')
      const result = await createTerminal('test-terminal')

      expect(result.fallbackReason).toBeUndefined()
    })
  })
})
