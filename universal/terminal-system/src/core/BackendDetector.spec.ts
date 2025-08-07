/**
 * @fileoverview Tests for BackendDetector class.
 *
 * @description
 * Tests for the backend detection logic using integration testing approach.
 * This focuses on testing the actual behavior rather than mocking private methods.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { BackendDetector, type TerminalCapabilities } from './BackendDetector'

describe('BackendDetector', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>
    error: ReturnType<typeof vi.spyOn>
    info: ReturnType<typeof vi.spyOn>
    warn: ReturnType<typeof vi.spyOn>
    debug: ReturnType<typeof vi.spyOn>
  }

  beforeEach(() => {
    // Mock console methods to avoid noise in tests
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('detectBestBackend', () => {
    it('should always return a valid backend configuration', async () => {
      const result = await BackendDetector.detectBestBackend()

      expect(result).toBeDefined()
      expect(['node-pty', 'conpty', 'winpty', 'subprocess']).toContain(
        result.backend
      )
      expect(['high', 'medium', 'low']).toContain(result.reliability)
      expect(typeof result.supportsResize).toBe('boolean')
      expect(typeof result.supportsColors).toBe('boolean')
      expect(typeof result.supportsInteractivity).toBe('boolean')
      expect(typeof result.supportsHistory).toBe('boolean')
    })

    it('should return consistent results for the same environment', async () => {
      const result1 = await BackendDetector.detectBestBackend()
      const result2 = await BackendDetector.detectBestBackend()

      expect(result1).toEqual(result2)
    })

    it('should never fail (always return a backend)', async () => {
      // This tests the fallback behavior
      const result = await BackendDetector.detectBestBackend()

      expect(result).toBeDefined()
      expect(result.backend).toBeDefined()
    })

    it('should log detection process', async () => {
      await BackendDetector.detectBestBackend()

      // Should log the detection process
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('Detecting best terminal backend for')
      )
    })

    it('should handle backend detection gracefully', async () => {
      // Even if all detection fails, should return subprocess as fallback
      const result = await BackendDetector.detectBestBackend()

      expect(result).toBeDefined()
      expect(result.backend).toBeDefined()
      // Should be either a detected backend or subprocess fallback
      expect(['node-pty', 'conpty', 'winpty', 'subprocess']).toContain(
        result.backend
      )
    })
  })

  describe('getCapabilitiesDescription', () => {
    it('should generate correct description for node-pty backend', () => {
      const capabilities: TerminalCapabilities = {
        backend: 'node-pty',
        supportsResize: true,
        supportsColors: true,
        supportsInteractivity: true,
        supportsHistory: true,
        reliability: 'high',
      }

      const description =
        BackendDetector.getCapabilitiesDescription(capabilities)

      expect(description).toBe(
        'node-pty (high reliability, resize, colors, interactive, history)'
      )
    })

    it('should generate correct description for conpty backend', () => {
      const capabilities: TerminalCapabilities = {
        backend: 'conpty',
        supportsResize: true,
        supportsColors: true,
        supportsInteractivity: true,
        supportsHistory: true,
        reliability: 'high',
      }

      const description =
        BackendDetector.getCapabilitiesDescription(capabilities)

      expect(description).toBe(
        'conpty (high reliability, resize, colors, interactive, history)'
      )
    })

    it('should generate correct description for winpty backend', () => {
      const capabilities: TerminalCapabilities = {
        backend: 'winpty',
        supportsResize: true,
        supportsColors: true,
        supportsInteractivity: true,
        supportsHistory: false,
        reliability: 'medium',
      }

      const description =
        BackendDetector.getCapabilitiesDescription(capabilities)

      expect(description).toBe(
        'winpty (medium reliability, resize, colors, interactive)'
      )
    })

    it('should generate correct description for subprocess backend', () => {
      const capabilities: TerminalCapabilities = {
        backend: 'subprocess',
        supportsResize: false,
        supportsColors: true,
        supportsInteractivity: true,
        supportsHistory: true,
        reliability: 'medium',
      }

      const description =
        BackendDetector.getCapabilitiesDescription(capabilities)

      expect(description).toBe(
        'subprocess (medium reliability, colors, interactive, history)'
      )
    })

    it('should handle backend with no features', () => {
      const capabilities: TerminalCapabilities = {
        backend: 'subprocess',
        supportsResize: false,
        supportsColors: false,
        supportsInteractivity: false,
        supportsHistory: false,
        reliability: 'low',
      }

      const description =
        BackendDetector.getCapabilitiesDescription(capabilities)

      expect(description).toBe('subprocess (low reliability, )')
    })

    it('should handle all backend types', () => {
      const backends: TerminalCapabilities['backend'][] = [
        'node-pty',
        'conpty',
        'winpty',
        'subprocess',
      ]

      backends.forEach((backend) => {
        const capabilities: TerminalCapabilities = {
          backend,
          supportsResize: true,
          supportsColors: true,
          supportsInteractivity: true,
          supportsHistory: true,
          reliability: 'high',
        }

        const description =
          BackendDetector.getCapabilitiesDescription(capabilities)
        expect(description).toContain(backend)
        expect(description).toContain('high reliability')
      })
    })

    it('should handle all reliability levels', () => {
      const reliabilities: TerminalCapabilities['reliability'][] = [
        'high',
        'medium',
        'low',
      ]

      reliabilities.forEach((reliability) => {
        const capabilities: TerminalCapabilities = {
          backend: 'subprocess',
          supportsResize: true,
          supportsColors: true,
          supportsInteractivity: true,
          supportsHistory: true,
          reliability,
        }

        const description =
          BackendDetector.getCapabilitiesDescription(capabilities)
        expect(description).toContain(`${reliability} reliability`)
      })
    })
  })

  describe('Backend types and interfaces', () => {
    it('should have proper type definitions', () => {
      // Test that our types are working correctly
      const capability: TerminalCapabilities = {
        backend: 'node-pty',
        supportsResize: true,
        supportsColors: true,
        supportsInteractivity: true,
        supportsHistory: true,
        reliability: 'high',
      }

      expect(capability.backend).toBe('node-pty')
      expect(capability.reliability).toBe('high')
    })
  })

  describe('Integration tests', () => {
    it('should work in current environment', async () => {
      // Test that the detector works in the actual environment
      const result = await BackendDetector.detectBestBackend()
      const description = BackendDetector.getCapabilitiesDescription(result)

      expect(result).toBeDefined()
      expect(description).toContain(result.backend)
      expect(description).toContain(result.reliability)
    })

    it('should provide consistent capability descriptions', async () => {
      const result = await BackendDetector.detectBestBackend()
      const description = BackendDetector.getCapabilitiesDescription(result)

      // Should contain the backend name and reliability
      expect(description).toMatch(
        new RegExp(`${result.backend}.*${result.reliability} reliability`)
      )

      // Should contain features based on capability flags
      if (result.supportsResize) expect(description).toContain('resize')
      if (result.supportsColors) expect(description).toContain('colors')
      if (result.supportsInteractivity)
        expect(description).toContain('interactive')
      if (result.supportsHistory) expect(description).toContain('history')
    })
  })
})

// Unit tests for Windows version detection logic
describe('Windows Version Detection Logic', () => {
  /**
   * Test the ConPTY support detection logic separately.
   * This replicates the logic from BackendDetector.canUseConPty() for unit testing.
   *
   * @param windowsRelease - Windows version string (e.g., '10.0.17763')
   * @returns Whether ConPTY is supported on this version
   */
  function testConPtySupport(windowsRelease: string): boolean {
    try {
      const [major, , build] = windowsRelease.split('.').map(Number)
      return major > 10 || (major === 10 && build >= 17763)
    } catch {
      return false
    }
  }

  it('should detect ConPTY support on Windows 10 1809+', () => {
    expect(testConPtySupport('10.0.17763')).toBe(true)
    expect(testConPtySupport('10.0.18362')).toBe(true)
    expect(testConPtySupport('10.0.19041')).toBe(true)
    expect(testConPtySupport('10.0.22000')).toBe(true)
  })

  it('should detect ConPTY support on Windows 11', () => {
    expect(testConPtySupport('11.0.22000')).toBe(true)
    expect(testConPtySupport('11.0.22621')).toBe(true)
  })

  it('should not detect ConPTY support on older Windows versions', () => {
    expect(testConPtySupport('10.0.15063')).toBe(false)
    expect(testConPtySupport('10.0.16299')).toBe(false)
    expect(testConPtySupport('10.0.17134')).toBe(false)
    expect(testConPtySupport('6.1.7601')).toBe(false) // Windows 7
  })

  it('should handle invalid version strings gracefully', () => {
    expect(testConPtySupport('invalid')).toBe(false)
    expect(testConPtySupport('10')).toBe(false)
    expect(testConPtySupport('')).toBe(false)
    expect(testConPtySupport('10.0')).toBe(false)
    expect(testConPtySupport('10.0.abc')).toBe(false)
  })

  it('should handle edge cases around the ConPTY threshold', () => {
    // Just below threshold
    expect(testConPtySupport('10.0.17762')).toBe(false)
    // Exactly at threshold
    expect(testConPtySupport('10.0.17763')).toBe(true)
    // Just above threshold
    expect(testConPtySupport('10.0.17764')).toBe(true)
  })
})
