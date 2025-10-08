/**
 * Subprocess-based Terminal - C++20 Compatibility Fallback
 * Uses Node.js child_process instead of node-pty for Electron v35 compatibility
 * Now delegates to SubprocessBackend from terminal-system for consistency
 */

import { EventEmitter } from 'node:events'
import type { TerminalInterface } from './terminalStrategy'
import { TerminalBufferManager } from './terminalBufferManager'
// Import all modules from main export (Electron app can use Node.js APIs)
import {
  SubprocessBackend,
  type BackendProcess,
  WelcomeMessageProvider,
} from '@hatcherdx/terminal-system'

interface SubprocessTerminalOptions {
  shell?: string
  cwd?: string
  env?: Record<string, string>
  cols?: number
  rows?: number
}

export class SubprocessTerminal
  extends EventEmitter
  implements TerminalInterface
{
  private backend: SubprocessBackend
  private process: BackendProcess | null = null
  private id: string
  private shell: string
  private cwd: string
  private cols: number
  private rows: number
  private bufferManager: TerminalBufferManager

  constructor(id: string, options: SubprocessTerminalOptions = {}) {
    super()
    this.id = id
    this.shell = options.shell || process.env.SHELL || '/bin/bash'
    this.cwd = options.cwd || process.env.HOME || process.cwd()
    this.cols = options.cols || 80
    this.rows = options.rows || 24

    // Initialize the subprocess backend from terminal-system
    this.backend = new SubprocessBackend()

    // Initialize buffer manager with conservative settings for subprocess
    this.bufferManager = new TerminalBufferManager(id, {
      maxBufferSize: 8 * 1024 * 1024, // 8MB for subprocess compatibility
      chunkSize: 32 * 1024, // Smaller chunks for subprocess
      maxChunksPerFlush: 50, // Moderate flush rate
      flushInterval: 16, // Standard 60fps timing
      dropThreshold: 0.75, // Lower threshold for subprocess
    })

    // Setup buffer manager event handling
    this.bufferManager.on('dataReady', (data: string) => {
      this.emit('data', data)
    })

    this.bufferManager.on('chunksDropped', (info) => {
      console.warn(
        `[Subprocess Terminal] Buffer dropped ${info.droppedCount} chunks due to high load`
      )
    })
  }

  async spawn(): Promise<void> {
    try {
      console.log(
        `[Subprocess Terminal] 🚀 SPAWNING SHELL using SubprocessBackend: ${this.shell}`
      )

      // Generate welcome message
      const welcomeProvider = new WelcomeMessageProvider()
      const welcomeMessage = welcomeProvider.getWelcomeMessage()

      // Use SubprocessBackend to spawn the shell
      this.process = await this.backend.spawn({
        shell: this.shell,
        cwd: this.cwd,
        cols: this.cols,
        rows: this.rows,
        welcomeMessage,
        env: {
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
          COLUMNS: this.cols.toString(),
          LINES: this.rows.toString(),
        },
      })

      console.log(
        `[Subprocess Terminal] ✅ SPAWN SUCCEEDED with PID: ${this.process.pid}`
      )

      // Setup event handlers
      this.process.on('data', (data: string) => {
        console.log(
          `[Subprocess Terminal] Received data from backend (${data.length} chars)`
        )
        // Send data through buffer manager
        this.bufferManager.write(data)
      })

      this.process.on('error', (error: Error) => {
        console.error(`[Subprocess Terminal] Error in ${this.id}:`, error)
        this.emit('error', error)
      })

      this.process.on('exit', ({ exitCode }: { exitCode: number }) => {
        console.log(
          `[Subprocess Terminal] Process ${this.id} exited with code ${exitCode}`
        )
        this.emit('exit', exitCode, null)
        this.process = null
      })

      console.log(
        `[Subprocess Terminal] Successfully initialized terminal ${this.id}`
      )
    } catch (error) {
      console.error(
        `[Subprocess Terminal] Failed to spawn terminal ${this.id}:`,
        error
      )
      this.emit('error', error)
    }
  }

  write(data: string): void {
    if (!this.process) {
      console.error(
        `[Subprocess Terminal] Cannot write - no process available for terminal ${this.id}`
      )
      return
    }

    console.log(
      `[Subprocess Terminal] Writing to backend:`,
      JSON.stringify(data)
    )

    // SubprocessBackend now handles echo internally
    this.process.write(data)
  }

  resize(cols: number, rows: number): void {
    this.cols = cols
    this.rows = rows

    // SubprocessBackend handles resize
    if (this.process) {
      this.process.resize(cols, rows)
    }
  }

  kill(): void {
    if (this.process) {
      console.log(`[Subprocess Terminal] Killing terminal ${this.id}`)

      // Cleanup buffer manager first
      this.bufferManager.destroy()

      // Kill the process through backend
      this.process.kill('SIGTERM')
      this.process = null
    }
  }

  get pid(): number | undefined {
    return this.process?.pid
  }

  get isRunning(): boolean {
    return this.process !== null
  }

  /**
   * Get buffer manager metrics for performance monitoring
   */
  getBufferMetrics() {
    return this.bufferManager.getMetrics()
  }

  /**
   * Get buffer health status
   */
  getBufferHealth() {
    return this.bufferManager.getHealthStatus()
  }

  /**
   * Pause buffer processing (for debugging or performance tuning)
   */
  pauseBuffer(): void {
    this.bufferManager.pause()
  }

  /**
   * Resume buffer processing
   */
  resumeBuffer(): void {
    this.bufferManager.resume()
  }
}
