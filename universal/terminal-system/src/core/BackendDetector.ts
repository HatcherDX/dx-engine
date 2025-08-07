/**
 * @fileoverview Terminal backend detection with intelligent fallback system.
 *
 * @description
 * This module provides intelligent detection of the best available terminal backend
 * using VS Code-like logic. It tests for node-pty availability, Windows-specific
 * backends (ConPTY, winpty), and falls back to subprocess when needed. The detection
 * is platform-aware and includes comprehensive error handling.
 *
 * @example
 * ```typescript
 * // Detect best available backend
 * const capabilities = await BackendDetector.detectBestBackend()
 * console.log(`Using ${capabilities.backend} with ${capabilities.reliability} reliability`)
 *
 * // Get human-readable description
 * const description = BackendDetector.getCapabilitiesDescription(capabilities)
 * console.log(`Backend: ${description}`)
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { execSync } from 'node:child_process'
import { platform, release } from 'node:os'
import { Logger } from '../utils/logger'

/**
 * Available terminal backend types in order of preference.
 * @public
 */
export type TerminalBackend = 'node-pty' | 'conpty' | 'winpty' | 'subprocess'

/**
 * Comprehensive terminal backend capabilities information.
 *
 * @remarks
 * This interface describes what features a terminal backend supports
 * and its reliability level. Used for making informed decisions about
 * which backend to use in different scenarios.
 *
 * @public
 */
export interface TerminalCapabilities {
  /** The backend type being used */
  backend: TerminalBackend
  /** Whether the backend supports terminal resizing */
  supportsResize: boolean
  /** Whether the backend supports ANSI colors */
  supportsColors: boolean
  /** Whether the backend supports interactive input */
  supportsInteractivity: boolean
  /** Whether the backend supports command history */
  supportsHistory: boolean
  /** Overall reliability assessment of the backend */
  reliability: 'high' | 'medium' | 'low'
}

/**
 * Enhanced backend detector with VS Code-like fallback logic.
 *
 * @remarks
 * This class implements intelligent detection of terminal backends following
 * the same priority system as VS Code: node-pty > ConPTY > winpty > subprocess.
 * It includes comprehensive testing and graceful fallbacks for maximum compatibility.
 *
 * @public
 */
export class BackendDetector {
  private static logger = new Logger('BackendDetector')

  /**
   * Detects the best available terminal backend with intelligent fallbacks.
   *
   * @remarks
   * This method tests backends in priority order: node-pty (highest) > ConPTY (Windows) >
   * winpty (older Windows) > subprocess (fallback). Each backend is tested for availability
   * and functionality before selection. The detection is platform-aware and includes
   * comprehensive error handling.
   *
   * @returns Promise resolving to {@link TerminalCapabilities} with the best available backend
   *
   * @throws Does not throw - always returns a valid backend, falling back to subprocess if needed
   *
   * @example
   * ```typescript
   * const capabilities = await BackendDetector.detectBestBackend()
   *
   * switch (capabilities.backend) {
   *   case 'node-pty':
   *     console.log('Using native PTY with full features')
   *     break
   *   case 'subprocess':
   *     console.log('Using basic subprocess backend')
   *     break
   * }
   *
   * console.log(`Reliability: ${capabilities.reliability}`)
   * console.log(`Supports resize: ${capabilities.supportsResize}`)
   * ```
   *
   * @public
   */
  static async detectBestBackend(): Promise<TerminalCapabilities> {
    const platformType = platform()

    this.logger.info(`Detecting best terminal backend for ${platformType}...`)

    // Priority 1: node-pty (cross-platform, most features)
    if (await this.canUseNodePty()) {
      this.logger.info('✅ Using node-pty backend')
      return {
        backend: 'node-pty',
        supportsResize: true,
        supportsColors: true,
        supportsInteractivity: true,
        supportsHistory: true,
        reliability: 'high',
      }
    }

    // Windows-specific backends
    if (platformType === 'win32') {
      // Priority 2: ConPTY (Windows 10+)
      if (this.canUseConPty()) {
        this.logger.info('✅ Using ConPTY backend')
        return {
          backend: 'conpty',
          supportsResize: true,
          supportsColors: true,
          supportsInteractivity: true,
          supportsHistory: true,
          reliability: 'high',
        }
      }

      // Priority 3: winpty (older Windows)
      if (this.canUseWinPty()) {
        this.logger.info('✅ Using winpty backend')
        return {
          backend: 'winpty',
          supportsResize: true,
          supportsColors: true,
          supportsInteractivity: true,
          supportsHistory: false,
          reliability: 'medium',
        }
      }
    }

    // Fallback: subprocess (cross-platform, basic features)
    this.logger.warn('⚠️ Falling back to subprocess backend')
    return {
      backend: 'subprocess',
      supportsResize: false,
      supportsColors: true,
      supportsInteractivity: true,
      supportsHistory: true,
      reliability: 'medium',
    }
  }

  /**
   * Check if node-pty is available and working
   */
  private static async canUseNodePty(): Promise<boolean> {
    try {
      // Use dynamic import for ES modules compatibility
      const pty = await import('node-pty')

      // Test basic functionality
      const testTerminal = pty.spawn('echo', ['test'], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: process.cwd(),
        env: Object.fromEntries(
          Object.entries(process.env).filter(([, value]) => value !== undefined)
        ) as Record<string, string>,
      })

      testTerminal.kill()
      this.logger.debug('node-pty test successful')
      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      this.logger.debug(`node-pty unavailable: ${errorMessage}`)
      return false
    }
  }

  /**
   * Check if ConPTY is available (Windows 10 1809+)
   */
  private static canUseConPty(): boolean {
    try {
      const windowsRelease = release()
      const [major, , build] = windowsRelease.split('.').map(Number)

      // ConPTY requires Windows 10 1809+ (build 17763)
      const supportsConPty = major > 10 || (major === 10 && build >= 17763)

      if (supportsConPty) {
        this.logger.debug(`ConPTY available (Windows ${windowsRelease})`)
      } else {
        this.logger.debug(`ConPTY not supported (Windows ${windowsRelease})`)
      }

      return supportsConPty
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      this.logger.debug(`ConPTY detection failed: ${errorMessage}`)
      return false
    }
  }

  /**
   * Check if winpty is available in PATH
   */
  private static canUseWinPty(): boolean {
    try {
      execSync('where winpty', { stdio: 'ignore' })
      this.logger.debug('winpty is available')
      return true
    } catch {
      this.logger.debug('winpty not found in PATH')
      return false
    }
  }

  /**
   * Generates a human-readable description of terminal backend capabilities.
   *
   * @remarks
   * This method creates a formatted string describing the backend type, reliability level,
   * and supported features. Useful for logging, debugging, and user-facing messages about
   * the selected terminal backend configuration.
   *
   * @param capabilities - The {@link TerminalCapabilities} object to describe
   * @returns A formatted string describing the backend and its features
   *
   * @example
   * ```typescript
   * const capabilities = await BackendDetector.detectBestBackend()
   * const description = BackendDetector.getCapabilitiesDescription(capabilities)
   * console.log(description)
   * // Output: "node-pty (high reliability, resize, colors, interactive, history)"
   *
   * // For limited backend:
   * // Output: "subprocess (medium reliability, colors, interactive)"
   * ```
   *
   * @public
   */
  static getCapabilitiesDescription(
    capabilities: TerminalCapabilities
  ): string {
    const features = []

    if (capabilities.supportsResize) features.push('resize')
    if (capabilities.supportsColors) features.push('colors')
    if (capabilities.supportsInteractivity) features.push('interactive')
    if (capabilities.supportsHistory) features.push('history')

    return `${capabilities.backend} (${capabilities.reliability} reliability, ${features.join(', ')})`
  }
}
