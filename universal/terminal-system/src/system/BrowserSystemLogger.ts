/**
 * @fileoverview Browser-compatible System Logger for DX Engine web interface.
 *
 * @description
 * Simple browser-compatible logging system that provides the same API as
 * SystemLogger but works without Node.js dependencies. Used for system
 * terminals in web/browser environments.
 *
 * @example
 * ```typescript
 * import { BrowserSystemLogger } from './BrowserSystemLogger'
 *
 * const logger = new BrowserSystemLogger()
 * logger.info('Application started')
 * logger.logCommand('git.status', [])
 * logger.logResult('GIT', 'Status updated')
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

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
 * Simple event emitter for browser environments.
 *
 * @private
 */
class SimpleEventEmitter<
  T extends Record<string, unknown[]> = Record<string, unknown[]>,
> {
  private listeners = new Map<keyof T, Set<(...args: unknown[]) => void>>()

  on<K extends keyof T>(event: K, listener: (...args: T[K]) => void): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener as (...args: unknown[]) => void)
    return this
  }

  emit<K extends keyof T>(event: K, ...args: T[K]): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.forEach((listener) => listener(...args))
    }
  }

  removeAllListeners(): void {
    this.listeners.clear()
  }
}

/**
 * Browser-compatible System Logger for DX Engine web interface.
 *
 * @remarks
 * This is a simplified version of SystemLogger that works in browser
 * environments without Node.js dependencies. Provides the same API
 * as the full SystemLogger but uses console logging and simple event emission.
 *
 * @public
 */
export class BrowserSystemLogger extends SimpleEventEmitter<{
  systemEvent: [SystemEvent]
  commandLogged: [SystemEvent]
  resultLogged: [SystemEvent]
}> {
  private events: SystemEvent[] = []
  private eventCounter = 0
  private maxEvents = 1000

  /**
   * Create BrowserSystemLogger instance.
   *
   * @public
   */
  constructor() {
    super()
  }

  /**
   * Log a command execution (Causa part of Causa-Efecto pattern).
   *
   * @param functionName - Name of function being called
   * @param args - Function arguments (optional)
   * @param terminal - Target terminal ('system' | 'timeline')
   * @returns SystemEvent created
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
   * @param context - Additional context data
   * @returns SystemEvent created
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
    if (this.events.length > this.maxEvents) {
      this.events.shift() // Remove oldest event
    }

    // Log to browser console for debugging
    const logLevel =
      type === 'ERROR' || type === 'FATAL'
        ? 'error'
        : type === 'WARN'
          ? 'warn'
          : 'log'

    console[logLevel](
      `[${type}] [${terminal.toUpperCase()}] ${message}`,
      context
    )

    // Emit events for subscribers
    this.emit('systemEvent', event)

    if (type === 'CMD') {
      this.emit('commandLogged', event)
    } else {
      this.emit('resultLogged', event)
    }

    return event
  }
}

/**
 * Default browser system logger instance for convenience.
 *
 * @public
 */
export const browserSystemLogger = new BrowserSystemLogger()
