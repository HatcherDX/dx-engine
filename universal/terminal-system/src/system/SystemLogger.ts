/**
 * @fileoverview System Logger for structured logging with tslog integration.
 *
 * @description
 * Professional logging system for DX Engine system events using tslog.
 * Implements structured logging with custom templates, levels, and transports
 * for System and Timeline terminals.
 *
 * @example
 * ```typescript
 * const logger = SystemLogger.getInstance()
 * logger.logCommand('git-genius.status', [])
 * logger.logResult('GIT', 'Status updated: 3 files modified, 1 staged')
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import { Logger } from 'tslog'
import { EventEmitter } from '../core/EventEmitter'

/**
 * System event types for structured logging.
 *
 * @public
 */
export type SystemEventType =
  | 'CMD'
  | 'GIT'
  | 'INFO'
  | 'WARN'
  | 'ERROR'
  | 'FATAL'

/**
 * System terminal types for event routing.
 *
 * @public
 */
export type SystemTerminalType = 'system' | 'timeline'

/**
 * Structured system event interface.
 *
 * @public
 */
export interface SystemEvent {
  /** Event type for categorization */
  type: SystemEventType
  /** Terminal where event should be displayed */
  terminal: SystemTerminalType
  /** Human-readable message */
  message: string
  /** Optional structured context data */
  context?: Record<string, unknown>
  /** Event timestamp */
  timestamp: Date
  /** Unique event ID for tracking */
  id: string
}

/**
 * System Logger configuration options.
 *
 * @public
 */
export interface SystemLoggerConfig {
  /** Minimum log level */
  minLevel?: 'silly' | 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  /** Enable pretty formatting for console output */
  prettyLogs?: boolean
  /** Enable file logging */
  fileLogging?: boolean
  /** Log file path (if file logging enabled) */
  logFilePath?: string
  /** Maximum events to keep in memory */
  maxEvents?: number
}

/**
 * SystemLogger - Professional logging system for DX Engine.
 *
 * @remarks
 * Implements Causa-Efecto pattern for complete traceability:
 * 1. Log command execution with logCommand()
 * 2. Log result with logResult()
 *
 * Events are routed to appropriate terminals (system vs timeline)
 * and formatted with professional tslog templates.
 *
 * @example
 * ```typescript
 * const logger = SystemLogger.getInstance()
 *
 * // Causa-Efecto pattern
 * logger.logCommand('git-genius.status', [])
 * const result = await gitRunner.status()
 * logger.logResult('GIT', 'Status updated: 3 files modified')
 * ```
 *
 * @public
 */
export class SystemLogger extends EventEmitter<{
  systemEvent: [SystemEvent]
  commandLogged: [SystemEvent]
  resultLogged: [SystemEvent]
}> {
  private static instance: SystemLogger | null = null
  private tslogger: Logger<SystemEvent>
  private events: SystemEvent[] = []
  private eventCounter = 0
  private config: Required<SystemLoggerConfig>

  private constructor(config: SystemLoggerConfig = {}) {
    super()

    // Apply default configuration
    this.config = {
      minLevel: 'info',
      prettyLogs: true,
      fileLogging: false,
      logFilePath: './logs/system.log',
      maxEvents: 1000,
      ...config,
    }

    // Initialize tslog with custom configuration
    this.tslogger = new Logger<SystemEvent>({
      type: this.config.prettyLogs ? 'pretty' : 'json',
      minLevel: this.getLogLevel(this.config.minLevel),
      name: 'SystemLogger',
      prettyLogTemplate:
        '{{yyyy}}-{{mm}}-{{dd}} {{hh}}:{{MM}}:{{ss}}.{{ms}}\t{{logLevelName}}\t{{name}}\t',
      prettyErrorTemplate: '\n{{errorName}}: {{errorMessage}}\n{{errorStack}}',
      stylePrettyLogs: true,
      prettyLogStyles: {
        logLevelName: {
          '*': ['bold', 'black', 'bgWhiteBright'],
          CMD: ['bold', 'white', 'bgBlueBright'],
          GIT: ['bold', 'white', 'bgGreenBright'],
          INFO: ['bold', 'white', 'bgCyanBright'],
          WARN: ['bold', 'black', 'bgYellowBright'],
          ERROR: ['bold', 'white', 'bgRedBright'],
          FATAL: ['bold', 'white', 'bgRed'],
        },
        name: ['white', 'bold'],
        dateIsoStr: 'white',
      },
    })

    this.setupFileLogging()
  }

  /**
   * Get singleton instance of SystemLogger.
   *
   * @param config - Optional configuration for first-time initialization
   * @returns SystemLogger singleton instance
   *
   * @public
   */
  public static getInstance(config?: SystemLoggerConfig): SystemLogger {
    if (!SystemLogger.instance) {
      SystemLogger.instance = new SystemLogger(config)
    }
    return SystemLogger.instance
  }

  /**
   * Log a command execution (Causa part of Causa-Efecto pattern).
   *
   * @param functionName - Name of function being called
   * @param args - Function arguments (optional)
   * @param terminal - Target terminal ('system' | 'timeline')
   * @returns SystemEvent created
   *
   * @example
   * ```typescript
   * logger.logCommand('git-genius.status', [], 'timeline')
   * logger.logCommand('project.initialize', ['/path/to/project'], 'system')
   * ```
   *
   * @public
   */
  public logCommand(
    functionName: string,
    args?: unknown[],
    terminal: SystemTerminalType = 'timeline'
  ): SystemEvent {
    const argsStr =
      args && args.length > 0
        ? `(${args.map((arg) => JSON.stringify(arg)).join(', ')})`
        : '()'

    const message = `${functionName}${argsStr}`

    return this.createEvent('CMD', terminal, message, {
      functionName,
      args,
    })
  }

  /**
   * Log a command result (Efecto part of Causa-Efecto pattern).
   *
   * @param type - Result type ('GIT' | 'INFO' | 'WARN' | 'ERROR')
   * @param message - Human-readable result message
   * @param terminal - Target terminal ('system' | 'timeline')
   * @param context - Additional structured data
   * @returns SystemEvent created
   *
   * @example
   * ```typescript
   * logger.logResult('GIT', 'Status updated: 3 files modified, 1 staged')
   * logger.logResult('INFO', 'Project initialized successfully')
   * logger.logResult('ERROR', 'Failed to read package.json', 'system', { error })
   * ```
   *
   * @public
   */
  public logResult(
    type: Exclude<SystemEventType, 'CMD'>,
    message: string,
    terminal: SystemTerminalType = 'timeline',
    context?: Record<string, unknown>
  ): SystemEvent {
    return this.createEvent(type, terminal, message, context)
  }

  /**
   * Log an informational message to System terminal.
   *
   * @param message - Info message
   * @param context - Additional context data
   * @returns SystemEvent created
   *
   * @example
   * ```typescript
   * logger.info('Initializing Hatcher workspace...')
   * logger.info('Package.json detected. Project type: [Node.js]')
   * ```
   *
   * @public
   */
  public info(message: string, context?: Record<string, unknown>): SystemEvent {
    return this.createEvent('INFO', 'system', message, context)
  }

  /**
   * Log a warning message.
   *
   * @param message - Warning message
   * @param terminal - Target terminal
   * @param context - Additional context data
   * @returns SystemEvent created
   *
   * @public
   */
  public warn(
    message: string,
    terminal: SystemTerminalType = 'system',
    context?: Record<string, unknown>
  ): SystemEvent {
    return this.createEvent('WARN', terminal, message, context)
  }

  /**
   * Log an error message.
   *
   * @param message - Error message
   * @param terminal - Target terminal
   * @param context - Additional context data (should include error object)
   * @returns SystemEvent created
   *
   * @example
   * ```typescript
   * logger.error('Failed to initialize project', 'system', { error, path })
   * ```
   *
   * @public
   */
  public error(
    message: string,
    terminal: SystemTerminalType = 'system',
    context?: Record<string, unknown>
  ): SystemEvent {
    return this.createEvent('ERROR', terminal, message, context)
  }

  /**
   * Log a fatal error message.
   *
   * @param message - Fatal error message
   * @param terminal - Target terminal
   * @param context - Additional context data
   * @returns SystemEvent created
   *
   * @public
   */
  public fatal(
    message: string,
    terminal: SystemTerminalType = 'system',
    context?: Record<string, unknown>
  ): SystemEvent {
    return this.createEvent('FATAL', terminal, message, context)
  }

  /**
   * Get all logged events.
   *
   * @param terminal - Filter by terminal type (optional)
   * @param limit - Maximum number of events to return (optional)
   * @returns Array of system events
   *
   * @public
   */
  public getEvents(
    terminal?: SystemTerminalType,
    limit?: number
  ): SystemEvent[] {
    let filtered = terminal
      ? this.events.filter((event) => event.terminal === terminal)
      : this.events

    if (limit && limit > 0) {
      filtered = filtered.slice(-limit)
    }

    return filtered
  }

  /**
   * Clear all logged events from memory.
   *
   * @public
   */
  public clearEvents(): void {
    this.events = []
    this.eventCounter = 0
  }

  /**
   * Get current logger configuration.
   *
   * @returns Current configuration
   *
   * @public
   */
  public getConfig(): Required<SystemLoggerConfig> {
    return { ...this.config }
  }

  /**
   * Update logger configuration.
   *
   * @param config - New configuration options
   *
   * @public
   */
  public updateConfig(config: Partial<SystemLoggerConfig>): void {
    this.config = { ...this.config, ...config }

    // Recreate tslog instance with new config
    this.tslogger = new Logger<SystemEvent>({
      type: this.config.prettyLogs ? 'pretty' : 'json',
      minLevel: this.getLogLevel(this.config.minLevel),
      name: 'SystemLogger',
    })

    this.setupFileLogging()
  }

  /**
   * Create a system event and emit it.
   *
   * @param type - Event type
   * @param terminal - Target terminal
   * @param message - Event message
   * @param context - Additional context
   * @returns Created SystemEvent
   *
   * @private
   */
  private createEvent(
    type: SystemEventType,
    terminal: SystemTerminalType,
    message: string,
    context?: Record<string, unknown>
  ): SystemEvent {
    this.eventCounter++

    const event: SystemEvent = {
      type,
      terminal,
      message,
      context,
      timestamp: new Date(),
      id: `system-${this.eventCounter.toString().padStart(6, '0')}`,
    }

    // Add to events array (with size limit)
    this.events.push(event)
    if (this.events.length > this.config.maxEvents) {
      this.events.shift() // Remove oldest event
    }

    // Log through tslog with appropriate level
    this.logToTslog(event)

    // Emit events for subscribers
    this.emit('systemEvent', event)

    if (type === 'CMD') {
      this.emit('commandLogged', event)
    } else {
      this.emit('resultLogged', event)
    }

    return event
  }

  /**
   * Log event through tslog with appropriate level.
   *
   * @param event - System event to log
   *
   * @private
   */
  private logToTslog(event: SystemEvent): void {
    const logData = {
      terminal: event.terminal,
      id: event.id,
      context: event.context,
    }

    switch (event.type) {
      case 'CMD':
        this.tslogger.info(`[CMD] ${event.message}`, logData)
        break
      case 'GIT':
        this.tslogger.info(`[GIT] ${event.message}`, logData)
        break
      case 'INFO':
        this.tslogger.info(`[INFO] ${event.message}`, logData)
        break
      case 'WARN':
        this.tslogger.warn(`[WARN] ${event.message}`, logData)
        break
      case 'ERROR':
        this.tslogger.error(`[ERROR] ${event.message}`, logData)
        break
      case 'FATAL':
        this.tslogger.fatal(`[FATAL] ${event.message}`, logData)
        break
    }
  }

  /**
   * Convert string log level to numeric level for tslog.
   *
   * @param level - String log level
   * @returns Numeric log level
   *
   * @private
   */
  private getLogLevel(level: string): number {
    const levels = {
      silly: 0,
      trace: 1,
      debug: 2,
      info: 3,
      warn: 4,
      error: 5,
      fatal: 6,
    }
    return levels[level as keyof typeof levels] || 3
  }

  /**
   * Setup file logging transport if enabled.
   *
   * @private
   */
  private setupFileLogging(): void {
    if (this.config.fileLogging) {
      // File logging will be implemented when needed
      // For now, focus on console and UI terminal output
    }
  }
}

/**
 * Default system logger instance for convenience.
 *
 * @example
 * ```typescript
 * import { systemLogger } from './SystemLogger'
 *
 * systemLogger.info('Application started')
 * systemLogger.logCommand('git-genius.status')
 * ```
 *
 * @public
 */
export const systemLogger = SystemLogger.getInstance()
