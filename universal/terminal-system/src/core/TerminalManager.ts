import type {
  TerminalState,
  CreateTerminalOptions,
  TerminalDataEvent,
  TerminalLifecycleEvent,
  TerminalResize,
} from '../types/terminal'
import { ProcessManager } from './ProcessManager'
import { EventEmitter } from './EventEmitter'
import { Logger } from '../utils/logger'

/**
 * Terminal Manager - Main controller for terminal instances
 * Follows VSCode architecture with Map-based process management
 */
export class TerminalManager extends EventEmitter<{
  terminalCreated: [TerminalState]
  terminalData: [TerminalDataEvent]
  terminalExit: [TerminalLifecycleEvent]
  terminalError: [TerminalLifecycleEvent]
}> {
  private terminals = new Map<string, TerminalState>()
  private processManager: ProcessManager
  private logger = new Logger('TerminalManager')
  private terminalCounter = 0

  constructor() {
    super()
    this.processManager = new ProcessManager()
    this.setupProcessManagerEvents()
  }

  /**
   * Create a new terminal instance
   */
  async createTerminal(
    options: CreateTerminalOptions = {}
  ): Promise<TerminalState> {
    this.terminalCounter++
    const name = options.name || `Terminal ${this.terminalCounter}`

    this.logger.info(`Creating terminal: ${name}`)

    try {
      // Spawn process through ProcessManager
      const process = await this.processManager.spawn({
        shell: options.shell,
        cwd: options.cwd,
        env: options.env,
        cols: options.cols,
        rows: options.rows,
      })

      // Create terminal state
      const terminalState: TerminalState = {
        id: process.id,
        name,
        isActive: false,
        isRunning: true,
        pid: process.info.pid,
        createdAt: process.info.startTime,
        lastActivity: new Date(),
      }

      // Store terminal state
      this.terminals.set(process.id, terminalState)

      this.logger.info(`Terminal created: ${name} (${process.id})`)
      this.emit('terminalCreated', terminalState)

      return terminalState
    } catch (error) {
      this.logger.error(`Failed to create terminal: ${name}`, error as Error)
      throw error
    }
  }

  /**
   * Send input to a terminal
   */
  sendData(id: string, data: string): boolean {
    const terminal = this.terminals.get(id)
    if (!terminal) {
      this.logger.warn(`Terminal not found: ${id}`)
      return false
    }

    if (!terminal.isRunning) {
      this.logger.warn(`Terminal not running: ${id}`)
      return false
    }

    // Update last activity
    terminal.lastActivity = new Date()

    // Send data through ProcessManager
    return this.processManager.write(id, data)
  }

  /**
   * Resize a terminal
   */
  resizeTerminal(resize: TerminalResize): boolean {
    const terminal = this.terminals.get(resize.id)
    if (!terminal) {
      this.logger.warn(`Terminal not found: ${resize.id}`)
      return false
    }

    this.logger.debug(
      `Resizing terminal: ${resize.id} (${resize.cols}x${resize.rows})`
    )
    return this.processManager.resize(resize.id, resize.cols, resize.rows)
  }

  /**
   * Close a terminal
   */
  closeTerminal(id: string): boolean {
    const terminal = this.terminals.get(id)
    if (!terminal) {
      this.logger.warn(`Terminal not found: ${id}`)
      return false
    }

    this.logger.info(`Closing terminal: ${terminal.name} (${id})`)

    // Kill the process
    const success = this.processManager.kill(id)

    if (success) {
      // Update terminal state
      terminal.isRunning = false
      terminal.lastActivity = new Date()
    }

    return success
  }

  /**
   * Set active terminal
   */
  setActiveTerminal(id: string): boolean {
    const terminal = this.terminals.get(id)
    if (!terminal) {
      this.logger.warn(`Terminal not found: ${id}`)
      return false
    }

    // Deactivate all terminals
    for (const t of this.terminals.values()) {
      t.isActive = false
    }

    // Activate the specified terminal
    terminal.isActive = true
    terminal.lastActivity = new Date()

    this.logger.debug(`Active terminal changed: ${terminal.name} (${id})`)
    return true
  }

  /**
   * Get terminal by ID
   */
  getTerminal(id: string): TerminalState | undefined {
    return this.terminals.get(id)
  }

  /**
   * Get all terminals
   */
  getAllTerminals(): TerminalState[] {
    return Array.from(this.terminals.values())
  }

  /**
   * Get active terminal
   */
  getActiveTerminal(): TerminalState | undefined {
    return Array.from(this.terminals.values()).find((t) => t.isActive)
  }

  /**
   * Get running terminals count
   */
  getRunningCount(): number {
    return Array.from(this.terminals.values()).filter((t) => t.isRunning).length
  }

  /**
   * Clean up all terminals
   */
  cleanup(): void {
    this.logger.info(`Cleaning up ${this.terminals.size} terminals`)

    // Cleanup ProcessManager (will kill all processes)
    this.processManager.cleanup()

    // Clear terminal states
    this.terminals.clear()

    // Remove all event listeners
    this.removeAllListeners()
  }

  /**
   * Setup ProcessManager event handlers
   */
  private setupProcessManagerEvents(): void {
    // Handle process data
    this.processManager.on('processData', (id: string, data: string) => {
      const terminal = this.terminals.get(id)
      if (terminal) {
        terminal.lastActivity = new Date()

        const dataEvent: TerminalDataEvent = {
          id,
          data,
          timestamp: new Date(),
        }

        this.emit('terminalData', dataEvent)
      }
    })

    // Handle process exit
    this.processManager.on('processExit', (id: string, exitCode: number) => {
      const terminal = this.terminals.get(id)
      if (terminal) {
        terminal.isRunning = false
        terminal.exitCode = exitCode
        terminal.lastActivity = new Date()

        const exitEvent: TerminalLifecycleEvent = {
          id,
          event: 'exited',
          data: { exitCode },
          timestamp: new Date(),
        }

        this.emit('terminalExit', exitEvent)

        // Remove terminal state after exit
        this.terminals.delete(id)
      }
    })

    // Handle process errors
    this.processManager.on('processError', (id: string, error: Error) => {
      const terminal = this.terminals.get(id)
      if (terminal) {
        terminal.isRunning = false
        terminal.lastActivity = new Date()

        const errorEvent: TerminalLifecycleEvent = {
          id,
          event: 'error',
          data: { error: error.message },
          timestamp: new Date(),
        }

        this.emit('terminalError', errorEvent)
      }
    })
  }
}
