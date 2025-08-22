/**
 * @fileoverview Browser-compatible Read-Only Terminal Manager for System and Timeline terminals.
 *
 * @description
 * Browser-compatible terminal manager for read-only system terminals that display
 * structured logs without Node.js dependencies. Works with BrowserSystemLogger
 * to provide system and timeline terminals in web environments.
 *
 * @example
 * ```typescript
 * const manager = new BrowserReadOnlyTerminalManager()
 * await manager.initializeSystemTerminals()
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import type {
  SystemEvent,
  SystemTerminalType,
  BrowserSystemLogger,
} from './BrowserSystemLogger'
import { browserSystemLogger } from './BrowserSystemLogger'

/**
 * Read-only terminal state interface.
 *
 * @public
 */
export interface ReadOnlyTerminalState {
  /** Terminal unique identifier */
  id: string
  /** Terminal display name */
  name: string
  /** Terminal type (system | timeline) */
  type: SystemTerminalType
  /** Whether terminal is currently active/visible */
  isActive: boolean
  /** Terminal creation timestamp */
  createdAt: Date
  /** Last activity timestamp */
  lastActivity: Date
  /** Terminal output lines */
  lines: ReadOnlyTerminalLine[]
  /** Auto-scroll enabled */
  autoScroll: boolean
  /** Maximum lines to keep in memory */
  maxLines: number
  /** Terminal status */
  status: 'initializing' | 'ready' | 'error'
}

/**
 * Read-only terminal line interface.
 *
 * @public
 */
export interface ReadOnlyTerminalLine {
  /** Unique line identifier */
  id: string
  /** Line content/text */
  content: string
  /** Line type/level for styling */
  type: 'CMD' | 'GIT' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL'
  /** Line timestamp */
  timestamp: Date
  /** Source system event ID */
  eventId?: string
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Terminal output event interface.
 *
 * @public
 */
export interface TerminalOutputEvent {
  /** Terminal ID that received output */
  terminalId: string
  /** Terminal type */
  terminal: SystemTerminalType
  /** New line added */
  line: ReadOnlyTerminalLine
  /** Full content if multiple lines */
  content: string
  /** Event timestamp */
  timestamp: Date
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
 * BrowserReadOnlyTerminalManager - Manager for System and Timeline terminals in browser.
 *
 * @public
 */
export class BrowserReadOnlyTerminalManager extends SimpleEventEmitter<{
  terminalCreated: [ReadOnlyTerminalState]
  terminalOutput: [TerminalOutputEvent]
  terminalActivated: [ReadOnlyTerminalState]
  terminalCleared: [ReadOnlyTerminalState]
}> {
  private terminals = new Map<string, ReadOnlyTerminalState>()
  private logger: BrowserSystemLogger
  private lineCounter = 0

  /**
   * Create BrowserReadOnlyTerminalManager instance.
   *
   * @param logger - BrowserSystemLogger instance (optional, uses default)
   *
   * @public
   */
  constructor(logger?: BrowserSystemLogger) {
    super()
    this.logger = logger || browserSystemLogger
    this.setupLoggerEventHandlers()
  }

  /**
   * Initialize both System and Timeline terminals.
   *
   * @returns Promise resolving when both terminals are ready
   *
   * @public
   */
  public async initializeSystemTerminals(): Promise<void> {
    // Create System terminal
    const systemTerminal = this.createTerminal('system', 'Terminal [System]', {
      maxLines: 500,
      autoScroll: true,
    })

    // Create Timeline terminal
    const timelineTerminal = this.createTerminal(
      'timeline',
      'Terminal [Timeline]',
      {
        maxLines: 1000,
        autoScroll: true,
      }
    )

    // Add initialization messages
    this.addInitializationMessages(systemTerminal)
    this.addInitializationMessages(timelineTerminal)

    // Set System terminal as initially active
    systemTerminal.isActive = true
    this.emit('terminalActivated', systemTerminal)

    // Log initialization completion
    this.logger.info('System terminals initialized successfully')
  }

  /**
   * Create a new read-only terminal.
   *
   * @param type - Terminal type (system | timeline)
   * @param name - Terminal display name
   * @param options - Terminal configuration options
   * @returns Created terminal state
   *
   * @public
   */
  public createTerminal(
    type: SystemTerminalType,
    name: string,
    options: {
      maxLines?: number
      autoScroll?: boolean
    } = {}
  ): ReadOnlyTerminalState {
    const terminal: ReadOnlyTerminalState = {
      id: type, // Use type as ID for system terminals
      name,
      type,
      isActive: false,
      createdAt: new Date(),
      lastActivity: new Date(),
      lines: [],
      autoScroll: options.autoScroll ?? true,
      maxLines: options.maxLines ?? 1000,
      status: 'ready',
    }

    this.terminals.set(terminal.id, terminal)
    this.emit('terminalCreated', terminal)

    return terminal
  }

  /**
   * Get terminal by ID or type.
   *
   * @param idOrType - Terminal ID or type
   * @returns Terminal state if found
   *
   * @public
   */
  public getTerminal(idOrType: string): ReadOnlyTerminalState | undefined {
    return this.terminals.get(idOrType)
  }

  /**
   * Get all terminals.
   *
   * @returns Array of all terminal states
   *
   * @public
   */
  public getAllTerminals(): ReadOnlyTerminalState[] {
    return Array.from(this.terminals.values())
  }

  /**
   * Set active terminal.
   *
   * @param idOrType - Terminal ID or type to activate
   * @returns Success status
   *
   * @public
   */
  public setActiveTerminal(idOrType: string): boolean {
    const terminal = this.terminals.get(idOrType)
    if (!terminal) {
      return false
    }

    // Deactivate all terminals
    for (const t of this.terminals.values()) {
      t.isActive = false
    }

    // Activate selected terminal
    terminal.isActive = true
    terminal.lastActivity = new Date()

    this.emit('terminalActivated', terminal)
    return true
  }

  /**
   * Add line to specific terminal.
   *
   * @param terminalId - Target terminal ID
   * @param content - Line content
   * @param type - Line type/level
   * @param metadata - Optional metadata
   * @returns Created terminal line
   *
   * @public
   */
  public addLine(
    terminalId: string,
    content: string,
    type: ReadOnlyTerminalLine['type'] = 'INFO',
    metadata?: Record<string, unknown>
  ): ReadOnlyTerminalLine | null {
    const terminal = this.terminals.get(terminalId)
    if (!terminal) {
      return null
    }

    this.lineCounter++
    const line: ReadOnlyTerminalLine = {
      id: `line-${this.lineCounter.toString().padStart(6, '0')}`,
      content,
      type,
      timestamp: new Date(),
      metadata,
    }

    // Add line to terminal
    terminal.lines.push(line)
    terminal.lastActivity = new Date()

    // Enforce line limits
    if (terminal.lines.length > terminal.maxLines) {
      terminal.lines.shift() // Remove oldest line
    }

    // Emit output event
    const outputEvent: TerminalOutputEvent = {
      terminalId,
      terminal: terminal.type,
      line,
      content,
      timestamp: line.timestamp,
    }

    this.emit('terminalOutput', outputEvent)
    return line
  }

  /**
   * Clear all lines from a terminal.
   *
   * @param idOrType - Terminal ID or type
   * @returns Success status
   *
   * @public
   */
  public clearTerminal(idOrType: string): boolean {
    const terminal = this.terminals.get(idOrType)
    if (!terminal) {
      return false
    }

    terminal.lines = []
    terminal.lastActivity = new Date()

    this.emit('terminalCleared', terminal)
    return true
  }

  /**
   * Get terminal lines with optional filtering.
   *
   * @param terminalId - Terminal ID
   * @param options - Filter options
   * @returns Array of terminal lines
   *
   * @public
   */
  public getTerminalLines(
    terminalId: string,
    options: {
      limit?: number
      type?: ReadOnlyTerminalLine['type']
      since?: Date
    } = {}
  ): ReadOnlyTerminalLine[] {
    const terminal = this.terminals.get(terminalId)
    if (!terminal) {
      return []
    }

    let lines = [...terminal.lines]

    // Filter by type
    if (options.type) {
      lines = lines.filter((line) => line.type === options.type)
    }

    // Filter by date
    if (options.since) {
      lines = lines.filter((line) => line.timestamp >= options.since!)
    }

    // Apply limit
    if (options.limit && options.limit > 0) {
      lines = lines.slice(-options.limit)
    }

    return lines
  }

  /**
   * Update terminal configuration.
   *
   * @param terminalId - Terminal ID
   * @param config - Configuration updates
   * @returns Success status
   *
   * @public
   */
  public updateTerminalConfig(
    terminalId: string,
    config: {
      autoScroll?: boolean
      maxLines?: number
    }
  ): boolean {
    const terminal = this.terminals.get(terminalId)
    if (!terminal) {
      return false
    }

    if (config.autoScroll !== undefined) {
      terminal.autoScroll = config.autoScroll
    }

    if (config.maxLines !== undefined) {
      terminal.maxLines = config.maxLines

      // Enforce new line limit
      if (terminal.lines.length > terminal.maxLines) {
        const excess = terminal.lines.length - terminal.maxLines
        terminal.lines.splice(0, excess)
      }
    }

    return true
  }

  /**
   * Cleanup all terminals and event listeners.
   *
   * @public
   */
  public cleanup(): void {
    this.terminals.clear()
    this.lineCounter = 0
    this.removeAllListeners()
  }

  /**
   * Setup BrowserSystemLogger event handlers.
   *
   * @private
   */
  private setupLoggerEventHandlers(): void {
    this.logger.on('systemEvent', (event: SystemEvent) => {
      this.handleSystemEvent(event)
    })
  }

  /**
   * Handle system event and route to appropriate terminal.
   *
   * @param event - System event from logger
   *
   * @private
   */
  private handleSystemEvent(event: SystemEvent): void {
    const terminal = this.terminals.get(event.terminal)
    if (!terminal) {
      return
    }

    // Format content with timestamp and type
    const timestamp = this.formatTimestamp(event.timestamp)
    const content = `${timestamp} [${event.type}] ${event.message}`

    // Add line to terminal
    this.addLine(terminal.id, content, event.type, {
      eventId: event.id,
      context: event.context,
    })
  }

  /**
   * Add initialization messages to terminal.
   *
   * @param terminal - Terminal to initialize
   *
   * @private
   */
  private addInitializationMessages(terminal: ReadOnlyTerminalState): void {
    const timestamp = this.formatTimestamp(new Date())

    if (terminal.type === 'system') {
      this.addLine(
        terminal.id,
        `${timestamp} [INFO] ${terminal.name} ready - monitoring IDE lifecycle events`,
        'INFO'
      )
    } else if (terminal.type === 'timeline') {
      this.addLine(
        terminal.id,
        `${timestamp} [INFO] ${terminal.name} ready - monitoring Git activity with complete traceability`,
        'INFO'
      )
    }
  }

  /**
   * Format timestamp for terminal output.
   *
   * @param date - Date to format
   * @returns Formatted timestamp string
   *
   * @private
   */
  private formatTimestamp(date: Date): string {
    return date.toISOString().replace('T', ' ').substring(0, 23)
  }
}

/**
 * Default browser read-only terminal manager instance for convenience.
 *
 * @public
 */
export const browserReadOnlyTerminalManager =
  new BrowserReadOnlyTerminalManager()
