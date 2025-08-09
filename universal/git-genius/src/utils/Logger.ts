/**
 * @fileoverview Logger utility for Git Genius operations.
 *
 * @description
 * Provides a lightweight logging utility for debugging and monitoring
 * Git Genius operations. Supports different log levels and formatters.
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

/**
 * Log level enumeration.
 *
 * @public
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Log entry interface.
 *
 * @public
 */
export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: number
  context?: string
  data?: unknown
}

/**
 * Logger configuration options.
 *
 * @public
 */
export interface LoggerConfig {
  /**
   * Minimum log level to output
   * @default LogLevel.INFO
   */
  level: LogLevel

  /**
   * Whether to include timestamps
   * @default true
   */
  includeTimestamp: boolean

  /**
   * Custom formatter function
   */
  formatter?: (entry: LogEntry) => string

  /**
   * Custom output function (defaults to console)
   */
  output?: (level: LogLevel, message: string) => void
}

/**
 * Lightweight logger for Git Genius operations.
 *
 * @remarks
 * The Logger provides structured logging with different levels and contexts.
 * It's designed to be lightweight and configurable for both development
 * and production environments.
 *
 * @public
 */
export class Logger {
  /** Logger configuration */
  private readonly config: Required<LoggerConfig>

  /** Logger context (e.g., class name) */
  private readonly context: string

  /**
   * Creates a new Logger instance.
   *
   * @param context - Logger context (typically class or module name)
   * @param config - Logger configuration options
   *
   * @example
   * ```typescript
   * const logger = new Logger('GitEngine', {
   *   level: LogLevel.DEBUG,
   *   includeTimestamp: true
   * })
   * ```
   */
  constructor(context = 'GitGenius', config: Partial<LoggerConfig> = {}) {
    this.context = context
    this.config = {
      level: config.level ?? LogLevel.INFO,
      includeTimestamp: config.includeTimestamp ?? true,
      formatter: config.formatter ?? this.defaultFormatter.bind(this),
      output: config.output ?? this.defaultOutput.bind(this),
    }
  }

  /**
   * Logs a debug message.
   *
   * @param message - Log message
   * @param data - Additional data to log
   */
  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data)
  }

  /**
   * Logs an info message.
   *
   * @param message - Log message
   * @param data - Additional data to log
   */
  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data)
  }

  /**
   * Logs a warning message.
   *
   * @param message - Log message
   * @param data - Additional data to log
   */
  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data)
  }

  /**
   * Logs an error message.
   *
   * @param message - Log message
   * @param error - Error object or additional data
   */
  error(message: string, error?: Error | unknown): void {
    this.log(LogLevel.ERROR, message, error)
  }

  /**
   * Creates a child logger with additional context.
   *
   * @param childContext - Additional context to append
   * @returns New logger with combined context
   */
  child(childContext: string): Logger {
    return new Logger(`${this.context}:${childContext}`, {
      level: this.config.level,
      includeTimestamp: this.config.includeTimestamp,
      formatter: this.config.formatter,
      output: this.config.output,
    })
  }

  /**
   * Times an operation and logs the duration.
   *
   * @param operation - Operation name
   * @param fn - Function to time
   * @returns Result of the function
   */
  async time<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now()
    this.debug(`Starting: ${operation}`)

    try {
      const result = await fn()
      const duration = Date.now() - startTime
      this.debug(`Completed: ${operation} (${duration}ms)`)
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      this.error(`Failed: ${operation} (${duration}ms)`, error)
      throw error
    }
  }

  /**
   * Core logging method.
   */
  private log(level: LogLevel, message: string, data?: unknown): void {
    if (level < this.config.level) {
      return
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context: this.context,
      data,
    }

    const formattedMessage = this.config.formatter(entry)
    this.config.output(level, formattedMessage)
  }

  /**
   * Default formatter for log entries.
   */
  private defaultFormatter(entry: LogEntry): string {
    const levelNames = {
      [LogLevel.DEBUG]: 'DEBUG',
      [LogLevel.INFO]: 'INFO',
      [LogLevel.WARN]: 'WARN',
      [LogLevel.ERROR]: 'ERROR',
    }

    const timestamp = this.config.includeTimestamp
      ? `[${new Date(entry.timestamp).toISOString()}] `
      : ''

    const levelName = levelNames[entry.level]
    const context = entry.context ? ` [${entry.context}]` : ''
    const dataStr = entry.data ? ` ${this.formatData(entry.data)}` : ''

    return `${timestamp}${levelName}${context}: ${entry.message}${dataStr}`
  }

  /**
   * Default output method using console.
   */
  private defaultOutput(level: LogLevel, message: string): void {
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(message)
        break
      case LogLevel.INFO:
        console.info(message)
        break
      case LogLevel.WARN:
        console.warn(message)
        break
      case LogLevel.ERROR:
        console.error(message)
        break
    }
  }

  /**
   * Formats additional data for logging.
   */
  private formatData(data: unknown): string {
    if (data instanceof Error) {
      return `Error: ${data.message}`
    }

    if (typeof data === 'object' && data !== null) {
      try {
        return JSON.stringify(data, null, 2)
      } catch {
        return '[Circular Object]'
      }
    }

    return String(data)
  }
}

/**
 * Creates a global logger instance for the Git Genius library.
 *
 * @param config - Logger configuration
 * @returns Global logger instance
 *
 * @public
 */
export function createGlobalLogger(config: Partial<LoggerConfig> = {}): Logger {
  return new Logger('GitGenius', config)
}

/**
 * Default global logger instance.
 *
 * @public
 */
export const logger = createGlobalLogger()
