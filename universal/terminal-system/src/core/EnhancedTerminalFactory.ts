/**
 * @fileoverview Enhanced terminal factory with intelligent backend selection and caching.
 *
 * @description
 * This module provides a high-level factory for creating terminal processes with automatic
 * backend detection, intelligent fallbacks, and performance caching. It implements VS Code-like
 * backend selection strategy and provides utilities for testing and debugging backend availability.
 *
 * @example
 * ```typescript
 * // Create a terminal with automatic backend selection
 * const { process, capabilities } = await EnhancedTerminalFactory.createTerminal({
 *   cols: 120,
 *   rows: 30,
 *   cwd: '/path/to/working/directory'
 * })
 *
 * console.log(`Using ${capabilities.backend} backend`)
 * console.log(`Supports resize: ${capabilities.supportsResize}`)
 *
 * // Write to terminal
 * process.write('echo "Hello World"\r')
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { Logger } from '../utils/logger'
import { BackendDetector, type TerminalCapabilities } from './BackendDetector'
import { NodePtyBackend } from './NodePtyBackend'
import { SubprocessBackend } from './SubprocessBackend'
import { SimpleSubprocessBackend } from './SimpleSubprocessBackend'
import {
  TerminalBackend,
  type BackendProcess,
  type BackendSpawnOptions,
} from './TerminalBackend'

/**
 * Enhanced terminal factory with automatic backend detection and intelligent fallbacks.
 *
 * @remarks
 * This factory implements VS Code-like backend selection strategy with performance caching.
 * It automatically detects the best available backend, handles fallbacks gracefully,
 * and provides utilities for testing backend availability. The factory caches detection
 * results for improved performance on subsequent calls.
 *
 * Key features:
 * - Automatic backend detection with intelligent fallbacks
 * - Performance caching of detection results
 * - Comprehensive error handling and logging
 * - Testing utilities for debugging backend issues
 * - Platform-aware backend selection
 *
 * @public
 */
export class EnhancedTerminalFactory {
  private static logger = new Logger('EnhancedTerminalFactory')
  private static cachedBackend: TerminalBackend | null = null
  private static cachedCapabilities: TerminalCapabilities | null = null

  /**
   * Creates a terminal process using the best available backend with automatic detection.
   *
   * @remarks
   * This method automatically detects and selects the best available terminal backend,
   * creates a terminal process with the specified options, and returns both the process
   * and its capabilities. It uses intelligent caching to improve performance on subsequent
   * calls and includes comprehensive error handling.
   *
   * The selection process:
   * 1. Check cache for previous detection results
   * 2. Detect best backend using BackendDetector
   * 3. Verify backend availability and fallback if needed
   * 4. Create and return terminal process
   *
   * @param options - Configuration options for terminal creation
   * @returns Promise resolving to object with terminal process and capabilities
   *
   * @throws Will throw if all backends fail to create a terminal process
   *
   * @example
   * ```typescript
   * // Basic terminal creation
   * const { process, capabilities } = await EnhancedTerminalFactory.createTerminal()
   *
   * // Terminal with custom options
   * const { process, capabilities } = await EnhancedTerminalFactory.createTerminal({
   *   cols: 120,
   *   rows: 30,
   *   cwd: '/path/to/project',
   *   env: { CUSTOM_VAR: 'value' },
   *   welcomeMessage: 'Welcome to my terminal!'
   * })
   *
   * // Check capabilities
   * if (capabilities.supportsResize) {
   *   process.resize(140, 40)
   * }
   * ```
   *
   * @public
   */
  static async createTerminal(options: BackendSpawnOptions = {}): Promise<{
    process: BackendProcess
    capabilities: TerminalCapabilities
  }> {
    try {
      // Get or detect the best backend
      const backend = await this.getBestBackend()
      const capabilities = backend.capabilities

      this.logger.info(`Creating terminal with ${capabilities.backend} backend`)
      this.logger.debug('Backend capabilities:', capabilities)
      if (options.welcomeMessage) {
        this.logger.debug(
          'Welcome message requested:',
          options.welcomeMessage.substring(0, 50) + '...'
        )
      }

      // Spawn the process with all options including welcome message
      const process = await backend.spawn(options)

      return { process, capabilities }
    } catch (error) {
      this.logger.error('Failed to create terminal', error as Error)
      throw error
    }
  }

  /**
   * Get the best available backend (with caching for performance)
   */
  private static async getBestBackend(): Promise<TerminalBackend> {
    // Return cached backend if available and valid
    if (this.cachedBackend && this.cachedCapabilities) {
      return this.cachedBackend
    }

    // Detect the best backend
    const capabilities = await BackendDetector.detectBestBackend()

    let backend: TerminalBackend

    switch (capabilities.backend) {
      case 'node-pty':
        backend = new NodePtyBackend()
        break

      case 'subprocess':
      default:
        // Use SimpleSubprocessBackend which is more reliable for command execution
        backend = new SimpleSubprocessBackend()
        break
    }

    // Verify the backend is actually available with comprehensive fallback
    const isAvailable = await backend.isAvailable()
    if (!isAvailable) {
      this.logger.warn(
        `Selected backend ${capabilities.backend} is not available, attempting fallback...`
      )

      // FIXED: Try node-pty as primary fallback
      if (capabilities.backend !== 'node-pty') {
        this.logger.info('Trying node-pty as fallback backend')
        const nodePtyBackend = new NodePtyBackend()
        const nodePtyAvailable = await nodePtyBackend.isAvailable()

        if (nodePtyAvailable) {
          this.logger.info('Successfully fell back to node-pty backend')
          backend = nodePtyBackend
        } else {
          this.logger.warn(
            'node-pty fallback failed, using simple subprocess as final fallback'
          )
          backend = new SimpleSubprocessBackend()
        }
      } else {
        // If node-pty was selected but failed, fall back to simple subprocess
        this.logger.info('Falling back to simple subprocess backend')
        backend = new SimpleSubprocessBackend()
      }

      // FIXED: Verify final fallback backend is available
      const fallbackAvailable = await backend.isAvailable()
      if (!fallbackAvailable) {
        const errorMsg =
          'All terminal backends failed - no working terminal backend available'
        this.logger.error(errorMsg)
        throw new Error(errorMsg)
      }
    }

    // Cache the result
    this.cachedBackend = backend
    this.cachedCapabilities = capabilities

    this.logger.info(
      `Selected terminal backend: ${BackendDetector.getCapabilitiesDescription(capabilities)}`
    )

    return backend
  }

  /**
   * Clear cached backend (useful for testing or when environment changes)
   */
  static clearCache(): void {
    this.cachedBackend = null
    this.cachedCapabilities = null
    this.logger.debug('Backend cache cleared')
  }

  /**
   * Get the current backend capabilities without creating a terminal
   */
  static async getCapabilities(): Promise<TerminalCapabilities> {
    if (this.cachedCapabilities) {
      return this.cachedCapabilities
    }

    const backend = await this.getBestBackend()
    return backend.capabilities
  }

  /**
   * Test all available backends and return their status
   */
  static async testAllBackends(): Promise<{
    [K in 'node-pty' | 'subprocess']: {
      available: boolean
      capabilities: TerminalCapabilities
      error?: string
    }
  }> {
    const results = {
      'node-pty': {
        available: false,
        capabilities: {
          backend: 'node-pty' as const,
          supportsResize: true,
          supportsColors: true,
          supportsInteractivity: true,
          supportsHistory: true,
          reliability: 'high' as const,
        },
        error: undefined as string | undefined,
      },
      subprocess: {
        available: false,
        capabilities: {
          backend: 'subprocess' as const,
          supportsResize: false,
          supportsColors: true,
          supportsInteractivity: true,
          supportsHistory: true,
          reliability: 'medium' as const,
        },
        error: undefined as string | undefined,
      },
    }

    // Test node-pty
    try {
      const nodePtyBackend = new NodePtyBackend()
      results['node-pty'].available = await nodePtyBackend.isAvailable()
    } catch (error) {
      results['node-pty'].error =
        error instanceof Error ? error.message : String(error)
    }

    // Test subprocess (should always be available)
    try {
      const subprocessBackend = new SubprocessBackend()
      results['subprocess'].available = await subprocessBackend.isAvailable()
    } catch (error) {
      results['subprocess'].error =
        error instanceof Error ? error.message : String(error)
    }

    return results
  }
}
