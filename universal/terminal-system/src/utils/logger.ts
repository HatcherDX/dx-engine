/**
 * @fileoverview Simple logging utility for the terminal system.
 *
 * @description
 * Provides a lightweight logging system with structured message formatting,
 * multiple log levels, and environment-aware debug logging. All log messages
 * include timestamps, component prefixes, and log levels for easy debugging.
 *
 * @example
 * ```typescript
 * const logger = new Logger('MyComponent')
 *
 * logger.info('Component initialized')
 * logger.warn('Deprecated API usage detected')
 * logger.error('Failed to connect', new Error('Connection timeout'))
 * logger.debug('Debug info', { state: 'active' }) // Only in development
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

/**
 * Lightweight logger with structured message formatting and multiple log levels.
 *
 * @remarks
 * The Logger class provides consistent logging across the terminal system with
 * automatic message formatting that includes timestamps, component identification,
 * and log levels. Debug messages are only output in development environments.
 *
 * @public
 */
export class Logger {
  /** Component identifier used in log message prefixes */
  private prefix: string

  /**
   * Creates a new Logger instance with the specified prefix.
   *
   * @param prefix - Component name to include in log messages
   *
   * @example
   * ```typescript
   * const logger = new Logger('GitRunner')
   * logger.info('Git operation started')
   * // Output: [2024-01-01T12:00:00.000Z] [GitRunner] [INFO] Git operation started
   * ```
   */
  constructor(prefix = 'TerminalSystem') {
    this.prefix = prefix
  }

  /**
   * Formats a log message with timestamp, prefix, and level.
   *
   * @param level - Log level (DEBUG, INFO, WARN, ERROR)
   * @param message - The message to format
   * @returns Formatted log message string
   *
   * @internal
   */
  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString()
    return `[${timestamp}] [${this.prefix}] [${level}] ${message}`
  }

  /**
   * Logs a debug message (only in development environment).
   *
   * @remarks
   * Debug messages are only output when `NODE_ENV` is set to 'development'.
   * This helps keep production logs clean while providing detailed debugging
   * information during development.
   *
   * @param message - The debug message to log
   * @param args - Additional arguments to include in the log
   *
   * @example
   * ```typescript
   * logger.debug('Processing file', { filename: 'data.json', size: 1024 })
   * ```
   *
   * @public
   */
  debug(message: string, ...args: unknown[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('DEBUG', message), ...args)
    }
  }

  /**
   * Logs an informational message.
   *
   * @param message - The informational message to log
   * @param args - Additional arguments to include in the log
   *
   * @example
   * ```typescript
   * logger.info('Server started on port 3000')
   * logger.info('User logged in', { userId: 123, timestamp: Date.now() })
   * ```
   *
   * @public
   */
  info(message: string, ...args: unknown[]): void {
    console.info(this.formatMessage('INFO', message), ...args)
  }

  /**
   * Logs a warning message.
   *
   * @param message - The warning message to log
   * @param args - Additional arguments to include in the log
   *
   * @example
   * ```typescript
   * logger.warn('API rate limit approaching')
   * logger.warn('Deprecated function used', { function: 'oldApi', alternative: 'newApi' })
   * ```
   *
   * @public
   */
  warn(message: string, ...args: unknown[]): void {
    console.warn(this.formatMessage('WARN', message), ...args)
  }

  /**
   * Logs an error message with optional Error object.
   *
   * @param message - The error message to log
   * @param error - Optional Error object with stack trace
   * @param args - Additional arguments to include in the log
   *
   * @example
   * ```typescript
   * logger.error('Database connection failed')
   * logger.error('Failed to process request', new Error('Connection timeout'))
   * logger.error('Validation failed', error, { input: userInput, rules: validationRules })
   * ```
   *
   * @public
   */
  error(message: string, error?: Error, ...args: unknown[]): void {
    console.error(this.formatMessage('ERROR', message), error, ...args)
  }
}
