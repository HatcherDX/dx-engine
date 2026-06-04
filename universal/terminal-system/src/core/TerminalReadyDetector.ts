/**
 * @fileoverview Terminal Ready Detector - Intelligent shell prompt detection
 *
 * @description
 * This module provides intelligent detection of when a terminal is ready to receive input
 * by monitoring output for shell prompt patterns. It replaces unreliable timeout-based
 * approaches with event-driven detection, ensuring welcome messages are displayed at
 * the right time.
 *
 * @example
 * ```typescript
 * const detector = new TerminalReadyDetector()
 *
 * process.on('data', (data) => {
 *   if (detector.checkData(data)) {
 *     console.log('Terminal is ready!')
 *     // Send welcome message
 *   }
 * })
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { Logger } from '../utils/logger'

/**
 * Configuration options for terminal ready detection
 *
 * @remarks
 * Allows customization of detection behavior including custom patterns,
 * timeouts, and sensitivity settings.
 *
 * @public
 * @since 1.0.0
 */
export interface TerminalReadyDetectorOptions {
  /**
   * Maximum time to wait for ready detection (ms)
   * @defaultValue 5000
   */
  timeout?: number

  /**
   * Additional custom patterns to detect readiness
   * @defaultValue []
   */
  customPatterns?: RegExp[]

  /**
   * Minimum data length to consider as activity
   * @defaultValue 1
   */
  minDataLength?: number

  /**
   * Enable debug logging
   * @defaultValue false
   */
  debug?: boolean
}

/**
 * Detects when a terminal is ready to receive input
 *
 * @remarks
 * Uses pattern matching and heuristics to detect shell prompts across
 * different shells and platforms. Provides both synchronous checking
 * and promise-based waiting for terminal readiness.
 *
 * @public
 * @since 1.0.0
 */
export class TerminalReadyDetector {
  private logger: Logger
  private isReady = false
  private buffer = ''
  private lastDataTime = 0
  private options: Required<TerminalReadyDetectorOptions>
  private readyCallbacks: Array<() => void> = []
  private timeoutHandle?: NodeJS.Timeout

  /**
   * Common shell prompt patterns
   */
  private static readonly PROMPT_PATTERNS = [
    // Bash/Zsh prompts
    /\$\s*$/,
    />\s*$/,
    /#\s*$/,

    // PowerShell prompts
    /PS\s+[A-Z]:[\\].*>\s*$/i,
    /PS>\s*$/,

    // Fish shell
    /~\s*>\s*$/,
    /→\s*$/,

    // Command prompt (Windows)
    /[A-Z]:[\\].*>\s*$/i,

    // Custom prompts with common endings
    /\]\$\s*$/, // [user@host]$
    /\)>\s*$/, // (env)>
    /❯\s*$/, // Starship/Oh My Zsh
    /➜\s*$/, // Oh My Zsh
    /λ\s*$/, // Lambda prompt

    // Node.js REPL
    />\s*$/,

    // Python REPL
    />>>\s*$/,

    // Ruby IRB
    /irb\([^)]+\):[0-9]+:[0-9]+>\s*$/,
  ]

  /**
   * Patterns that indicate the shell is still initializing
   */
  private static readonly INIT_PATTERNS = [
    /Loading\.\.\./i,
    /Initializing/i,
    /Starting/i,
    /Welcome to/i,
    /Last login:/i,
    /^[A-Za-z]+\s+\d+\s+\d+:\d+:\d+/, // Date/time output
  ]

  /**
   * Creates a new terminal ready detector
   *
   * @param options - Configuration options
   *
   * @example
   * ```typescript
   * const detector = new TerminalReadyDetector({
   *   timeout: 3000,
   *   debug: true
   * })
   * ```
   */
  constructor(options: TerminalReadyDetectorOptions = {}) {
    this.options = {
      timeout: options.timeout ?? 5000,
      customPatterns: options.customPatterns ?? [],
      minDataLength: options.minDataLength ?? 1,
      debug: options.debug ?? false,
    }

    this.logger = new Logger('TerminalReadyDetector')
  }

  /**
   * Check if data indicates the terminal is ready
   *
   * @param data - Output data from the terminal
   * @returns True if terminal appears ready
   *
   * @example
   * ```typescript
   * process.on('data', (data) => {
   *   if (detector.checkData(data)) {
   *     // Terminal is ready
   *   }
   * })
   * ```
   */
  checkData(data: string): boolean {
    if (this.isReady) {
      return true
    }

    // Skip empty or minimal data
    if (data.length < this.options.minDataLength) {
      return false
    }

    // Add to buffer for pattern matching
    this.buffer += data
    // Keep only last 500 chars to prevent memory issues
    if (this.buffer.length > 500) {
      this.buffer = this.buffer.slice(-500)
    }

    this.lastDataTime = Date.now()
    this.logger.debug('Checking data:', data.slice(0, 100))

    // Check if still initializing
    const isInitializing = TerminalReadyDetector.INIT_PATTERNS.some((pattern) =>
      pattern.test(this.buffer)
    )

    if (isInitializing) {
      this.logger.debug('Still initializing, detected init pattern')
      return false
    }

    // Check for prompt patterns
    const allPatterns = [
      ...TerminalReadyDetector.PROMPT_PATTERNS,
      ...this.options.customPatterns,
    ]

    const hasPrompt = allPatterns.some((pattern) => pattern.test(this.buffer))

    if (hasPrompt) {
      this.logger.info('Terminal ready - prompt detected')
      this.setReady()
      return true
    }

    // Heuristic: If we get a short line ending with space after some output
    // it might be a prompt waiting for input
    const lines = this.buffer.split('\n')
    const lastLine = lines[lines.length - 1]

    if (
      lines.length > 1 && // Had some output before
      lastLine.length > 0 && // Non-empty last line
      lastLine.length < 100 && // Reasonably short
      /\s$/.test(lastLine) && // Ends with space
      !/</.test(lastLine) && // Not HTML/XML
      !/\[/.test(lastLine) // Not ANSI escape
    ) {
      this.logger.info('Terminal ready - heuristic match')
      this.setReady()
      return true
    }

    return false
  }

  /**
   * Wait for the terminal to become ready
   *
   * @returns Promise that resolves when ready or times out
   *
   * @example
   * ```typescript
   * await detector.waitForReady()
   * console.log('Terminal is ready!')
   * ```
   */
  waitForReady(): Promise<void> {
    if (this.isReady) {
      return Promise.resolve()
    }

    return new Promise((resolve) => {
      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        this.logger.warn('Terminal ready detection timed out')
        this.setReady() // Consider it ready after timeout
        resolve()
      }, this.options.timeout)

      // Add callback
      this.readyCallbacks.push(() => {
        clearTimeout(timeoutHandle)
        resolve()
      })
    })
  }

  /**
   * Mark terminal as ready and trigger callbacks
   */
  private setReady(): void {
    if (this.isReady) {
      return
    }

    this.isReady = true

    // Clear timeout if set
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle)
      this.timeoutHandle = undefined
    }

    // Trigger all waiting callbacks
    const callbacks = this.readyCallbacks.slice()
    this.readyCallbacks = []
    callbacks.forEach((cb) => cb())
  }

  /**
   * Reset the detector state
   *
   * @remarks
   * Useful when reusing the detector for a new terminal session
   *
   * @example
   * ```typescript
   * detector.reset()
   * // Detector is ready for new session
   * ```
   */
  reset(): void {
    this.isReady = false
    this.buffer = ''
    this.lastDataTime = 0
    this.readyCallbacks = []

    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle)
      this.timeoutHandle = undefined
    }

    this.logger.debug('Detector reset')
  }

  /**
   * Get current ready state
   *
   * @returns True if terminal is ready
   */
  getIsReady(): boolean {
    return this.isReady
  }

  /**
   * Force mark as ready
   *
   * @remarks
   * Useful for bypassing detection in specific scenarios
   */
  forceReady(): void {
    this.logger.debug('Forcing ready state')
    this.setReady()
  }

  /**
   * Get time since last data received
   *
   * @returns Milliseconds since last data, or -1 if no data received
   */
  getTimeSinceLastData(): number {
    if (this.lastDataTime === 0) {
      return -1
    }
    return Date.now() - this.lastDataTime
  }
}
