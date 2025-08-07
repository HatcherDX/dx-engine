/**
 * @fileoverview Simple tests for terminal strategy implementation.
 *
 * @description
 * Basic tests for the enhanced terminal strategy using @hatcherdx/terminal-system
 * including enum values and basic functionality.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventEmitter } from 'node:events'
import { TerminalStrategy } from './terminalStrategy'

// Mock @hatcherdx/terminal-system with minimal setup
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

vi.mock('@hatcherdx/terminal-system', () => ({
  BackendDetector: {
    detectBestBackend: vi.fn(() => Promise.resolve(mockTerminalCapabilities)),
    getCapabilitiesDescription: vi.fn(
      () => 'High reliability node-pty backend'
    ),
  },
  EnhancedTerminalFactory: {
    createTerminal: vi.fn(() =>
      Promise.resolve({
        process: mockBackendProcess,
        capabilities: mockTerminalCapabilities,
      })
    ),
  },
}))

describe('TerminalStrategy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
  })
})
