import { v4 as uuidv4 } from 'uuid'
import type { ProcessSpawnOptions, TerminalProcess } from '../types/process'
import { Logger } from '../utils/logger'
import { EnhancedTerminalFactory } from './EnhancedTerminalFactory'
import { EventEmitter } from './EventEmitter'
import type { BackendProcess } from './TerminalBackend'

/**
 * Process manager for handling PTY processes
 * Based on VSCode terminal architecture
 */
export class ProcessManager extends EventEmitter<{
  processCreated: [TerminalProcess]
  processData: [string, string] // id, data
  processExit: [string, number] // id, exitCode
  processError: [string, Error] // id, error
}> {
  private processes = new Map<string, TerminalProcess>()
  private logger = new Logger('ProcessManager')

  /**
   * Spawn a new PTY process
   */
  async spawn(options: ProcessSpawnOptions = {}): Promise<TerminalProcess> {
    const id = uuidv4()

    this.logger.debug(
      `Spawning terminal process with enhanced backend detection`,
      {
        id,
        options,
      }
    )

    try {
      // Use the enhanced terminal factory to create a process with automatic backend detection
      const { process: backendProcess, capabilities } =
        await EnhancedTerminalFactory.createTerminal({
          shell: options.shell,
          cwd: options.cwd,
          env: options.env,
          cols: options.cols || 80,
          rows: options.rows || 24,
          encoding: options.encoding || 'utf8',
        })

      // Create terminal process wrapper
      const terminalProcess: TerminalProcess = {
        id,
        pty: backendProcess, // Use BackendProcess directly
        info: {
          pid: backendProcess.pid,
          name: options.shell || 'shell',
          cmd: options.shell || 'shell',
          cwd: options.cwd || process.cwd(),
          env: options.env || {},
          startTime: new Date(),
        },
        state: 'starting',
        capabilities, // Add capabilities to track what backend is being used
      }

      // Setup event handlers for the backend process
      this.setupEnhancedProcessEvents(terminalProcess, backendProcess)

      // Store process
      this.processes.set(id, terminalProcess)

      // Mark as running
      terminalProcess.state = 'running'

      this.logger.info(
        `Terminal process created with ${capabilities.backend}: ${id} (PID: ${backendProcess.pid})`
      )
      this.emit('processCreated', terminalProcess)

      return terminalProcess
    } catch (error) {
      this.logger.error(
        `Failed to spawn terminal process: ${id}`,
        error as Error
      )
      throw error
    }
  }

  /**
   * Write data to a terminal process
   */
  write(id: string, data: string): boolean {
    const process = this.processes.get(id)
    if (!process) {
      this.logger.warn(`Terminal process not found: ${id}`)
      return false
    }

    if (process.state !== 'running') {
      this.logger.warn(
        `Terminal process not running: ${id} (state: ${process.state})`
      )
      return false
    }

    try {
      // Both legacy IPty and new BackendProcess have write method
      process.pty.write(data)
      return true
    } catch (error) {
      this.logger.error(
        `Failed to write to terminal process: ${id}`,
        error as Error
      )
      return false
    }
  }

  /**
   * Resize a terminal process
   */
  resize(id: string, cols: number, rows: number): boolean {
    const process = this.processes.get(id)
    if (!process) {
      this.logger.warn(`Terminal process not found: ${id}`)
      return false
    }

    try {
      // Handle both legacy IPty and new BackendProcess resize
      if (process.pty.resize) {
        process.pty.resize(cols, rows)
      }
      this.logger.debug(`Terminal process resized: ${id} (${cols}x${rows})`)
      return true
    } catch (error) {
      this.logger.error(
        `Failed to resize terminal process: ${id}`,
        error as Error
      )
      return false
    }
  }

  /**
   * Kill a terminal process
   */
  kill(id: string, signal?: string): boolean {
    const process = this.processes.get(id)
    if (!process) {
      this.logger.warn(`Terminal process not found: ${id}`)
      return false
    }

    try {
      process.pty.kill(signal)
      this.logger.info(`Terminal process killed: ${id}`)
      return true
    } catch (error) {
      this.logger.error(
        `Failed to kill terminal process: ${id}`,
        error as Error
      )
      return false
    }
  }

  /**
   * Get a terminal process by ID
   */
  getProcess(id: string): TerminalProcess | undefined {
    return this.processes.get(id)
  }

  /**
   * Get all terminal processes
   */
  getAllProcesses(): TerminalProcess[] {
    return Array.from(this.processes.values())
  }

  /**
   * Clean up all processes
   */
  cleanup(): void {
    this.logger.info(`Cleaning up ${this.processes.size} terminal processes`)

    for (const [id, process] of this.processes) {
      try {
        if (process.state === 'running') {
          process.pty.kill()
        }
      } catch (error) {
        this.logger.error(
          `Failed to cleanup terminal process: ${id}`,
          error as Error
        )
      }
    }

    this.processes.clear()
    this.removeAllListeners()
  }

  /**
   * Setup event handlers for enhanced backend processes
   */
  private setupEnhancedProcessEvents(
    terminalProcess: TerminalProcess,
    backendProcess: BackendProcess
  ): void {
    const { id } = terminalProcess

    // Handle data output
    backendProcess.on('data', (data: string) => {
      this.emit('processData', id, data)
    })

    // Handle process exit
    backendProcess.on('exit', ({ exitCode }: { exitCode: number }) => {
      terminalProcess.state = 'exited'
      terminalProcess.exitCode = exitCode

      this.logger.info(`Terminal process exited: ${id} (code: ${exitCode})`)
      this.emit('processExit', id, exitCode)

      // Clean up process after exit
      this.processes.delete(id)
    })

    // Handle process errors
    backendProcess.on('error', (error: Error) => {
      terminalProcess.state = 'error'
      terminalProcess.error = error

      this.logger.error(`Terminal process error: ${id}`, error)
      this.emit('processError', id, error)
    })
  }
}
