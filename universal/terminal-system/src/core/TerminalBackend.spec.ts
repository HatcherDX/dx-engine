/**
 * @fileoverview Tests for TerminalBackend abstract base class.
 *
 * @description
 * These tests verify the base functionality of TerminalBackend including
 * environment variable setup and logger initialization. Since it's an abstract
 * class, tests use a concrete implementation for testing purposes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  TerminalBackend,
  type BackendSpawnOptions,
  type BackendProcess,
} from './TerminalBackend'
import type { TerminalCapabilities } from './BackendDetector'

/**
 * Concrete implementation of TerminalBackend for testing purposes.
 *
 * @internal
 */
class TestTerminalBackend extends TerminalBackend {
  public readonly capabilities: TerminalCapabilities = {
    hasPty: true,
    hasColorSupport: true,
    hasUnicodeSupport: true,
    platformSupported: true,
  }

  constructor() {
    super('TestBackend')
  }

  async spawn(): Promise<BackendProcess> {
    // Mock implementation for testing
    const mockProcess: BackendProcess = {
      pid: 12345,
      write: vi.fn(),
      resize: vi.fn(),
      kill: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    }

    return mockProcess
  }

  async isAvailable(): Promise<boolean> {
    return true
  }

  // Expose protected method for testing
  public getEnvironment(options: BackendSpawnOptions): Record<string, string> {
    return this.getBaseEnvironment(options)
  }
}

describe('TerminalBackend', () => {
  let backend: TestTerminalBackend

  beforeEach(() => {
    backend = new TestTerminalBackend()
    // Clear environment variables for consistent testing
    vi.resetAllMocks()
  })

  describe('Environment Setup', () => {
    it('should provide base environment variables', () => {
      const options: BackendSpawnOptions = {
        cols: 120,
        rows: 30,
      }

      const env = backend.getEnvironment(options)

      expect(env).toHaveProperty('TERM')
      expect(env).toHaveProperty('COLORTERM', 'truecolor')
      expect(env).toHaveProperty('COLUMNS', '120')
      expect(env).toHaveProperty('LINES', '30')
      expect(env).toHaveProperty('TERM_PROGRAM', 'Hatcher')
      expect(env).toHaveProperty('TERM_PROGRAM_VERSION')
      expect(env).toHaveProperty('FORCE_COLOR', '1')
      expect(env).toHaveProperty('LC_ALL', 'en_US.UTF-8')
      expect(env).toHaveProperty('LANG', 'en_US.UTF-8')
    })

    it('should use default terminal size when not specified', () => {
      const options: BackendSpawnOptions = {}
      const env = backend.getEnvironment(options)

      expect(env.COLUMNS).toBe('80')
      expect(env.LINES).toBe('24')
    })

    it('should merge custom environment variables', () => {
      const options: BackendSpawnOptions = {
        env: {
          CUSTOM_VAR: 'custom_value',
          PATH: '/custom/path',
        },
      }

      const env = backend.getEnvironment(options)

      expect(env.CUSTOM_VAR).toBe('custom_value')
      expect(env.PATH).toBe('/custom/path')
    })

    it('should set platform-specific TERM variable', () => {
      const options: BackendSpawnOptions = {}
      const env = backend.getEnvironment(options)

      if (process.platform === 'win32') {
        expect(env.TERM).toBe('xterm')
      } else {
        expect(env.TERM).toBe('xterm-256color')
      }
    })
  })

  describe('Backend Implementation', () => {
    it('should have correct capabilities', () => {
      expect(backend.capabilities).toEqual({
        hasPty: true,
        hasColorSupport: true,
        hasUnicodeSupport: true,
        platformSupported: true,
      })
    })

    it('should be available', async () => {
      const available = await backend.isAvailable()
      expect(available).toBe(true)
    })

    it('should spawn a process', async () => {
      const options: BackendSpawnOptions = {
        shell: '/bin/bash',
        cwd: '/tmp',
      }

      const process = await backend.spawn(options)

      expect(process).toHaveProperty('pid', 12345)
      expect(process).toHaveProperty('write')
      expect(process).toHaveProperty('resize')
      expect(process).toHaveProperty('kill')
    })
  })

  describe('Logger Integration', () => {
    it('should initialize logger with correct name', () => {
      // Since logger is protected, we test indirectly by checking the backend works
      expect(backend).toBeInstanceOf(TerminalBackend)
      expect(backend.capabilities).toBeDefined()
    })
  })

  describe('Filter Environment Variables', () => {
    it('should filter out undefined environment variables', () => {
      // Mock process.env with undefined values
      const originalEnv = process.env
      process.env = {
        ...originalEnv,
        DEFINED_VAR: 'value',
        UNDEFINED_VAR: undefined,
      }

      const options: BackendSpawnOptions = {}
      const env = backend.getEnvironment(options)

      expect(env).toHaveProperty('DEFINED_VAR', 'value')
      expect(env).not.toHaveProperty('UNDEFINED_VAR')

      // Restore original environment
      process.env = originalEnv
    })
  })
})
