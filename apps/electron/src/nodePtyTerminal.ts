/**
 * Node-pty Terminal Implementation - VSCode Style
 * Uses real PTY for optimal performance when node-pty compiles successfully
 */

import { EventEmitter } from 'node:events'
import * as os from 'node:os'
import { TerminalBufferManager } from './terminalBufferManager'
import type { TerminalInterface } from './terminalStrategy'

interface NodePtyTerminalOptions {
  shell?: string
  cwd?: string
  env?: Record<string, string>
  cols?: number
  rows?: number
}

// Node-pty types (since we can't always rely on @types/node-pty being available)
interface PtyProcess {
  write(data: string): void
  resize(cols: number, rows: number): void
  kill(signal?: string): void
  pid: number
  process: string | (() => ProcessInfo[])
  killed?: boolean
  onData(callback: (data: string) => void): void
  onExit(callback: (code: number, signal: number) => void): void
  on?(event: string, callback: (...args: unknown[]) => void): void
  clear?(): void
  pause?(): void
  resume?(): void
}

interface ProcessInfo {
  pid: number
  ppid: number
  command: string
  arguments: string[]
  children?: ProcessInfo[]
}

export class NodePtyTerminal extends EventEmitter implements TerminalInterface {
  private ptyProcess: PtyProcess | null = null
  private id: string
  private shell: string
  private cwd: string
  private cols: number
  private rows: number
  private env: Record<string, string>
  private pty: unknown = null
  private bufferManager: TerminalBufferManager

  constructor(id: string, options: NodePtyTerminalOptions = {}) {
    super()
    this.id = id
    this.shell = options.shell || this.detectShell()
    this.cwd = options.cwd || process.env.HOME || process.cwd()
    this.cols = options.cols || 80
    this.rows = options.rows || 24
    this.env = options.env || {}

    // Initialize buffer manager with optimized settings for node-pty
    this.bufferManager = new TerminalBufferManager(id, {
      maxBufferSize: 16 * 1024 * 1024, // 16MB for node-pty high performance
      chunkSize: 128 * 1024, // Larger chunks for PTY efficiency
      maxChunksPerFlush: 100, // More chunks per flush for PTY
      flushInterval: 8, // Faster flush for real-time PTY data
      dropThreshold: 0.85, // Higher threshold for PTY reliability
    })

    // Setup buffer manager event handling
    this.bufferManager.on('dataReady', (data: string) => {
      this.emit('data', data)
    })

    this.bufferManager.on('chunksDropped', (info) => {
      console.warn(
        `[Node-pty Terminal] Buffer dropped ${info.droppedCount} chunks due to high load`
      )
    })
  }

  private detectShell(): string {
    const platform = os.platform()

    switch (platform) {
      case 'win32':
        // Windows: prefer PowerShell, fallback to cmd
        return process.env.SHELL ||
          (process.env.COMSPEC && process.env.COMSPEC.includes('powershell'))
          ? 'powershell.exe'
          : process.env.COMSPEC || 'cmd.exe'

      case 'darwin':
        // macOS: prefer zsh (default since Catalina), fallback to bash
        return process.env.SHELL || '/bin/zsh'

      default:
        // Linux/Unix: prefer bash
        return process.env.SHELL || '/bin/bash'
    }
  }

  async spawn(): Promise<void> {
    try {
      // Dynamic import to handle potential compilation issues gracefully
      this.pty = await import('node-pty')

      console.log(`[Node-pty Terminal] Spawning shell: ${this.shell}`)

      // Prepare environment with terminal capabilities
      const env = {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        // Allow environment overrides
        ...this.env,
      }

      // Spawn PTY process with optimal settings
      this.ptyProcess = (
        this.pty as {
          spawn: (shell: string, args: string[], options: unknown) => PtyProcess
        }
      ).spawn(this.shell, [], {
        name: 'xterm-color',
        cols: this.cols,
        rows: this.rows,
        cwd: this.cwd,
        env,
        // Windows-specific options
        useConpty: process.platform === 'win32',
        // Encoding for proper Unicode support
        encoding: 'utf8',
      })

      // Setup event handlers with buffer management
      this.ptyProcess.onData((data: string) => {
        // Route data through buffer manager for optimization
        this.bufferManager.addData(data)
      })

      this.ptyProcess.onExit((exitCode: number, signal?: number) => {
        console.log(
          `[Node-pty Terminal] Process ${this.id} exited with code ${exitCode}, signal ${signal}`
        )
        this.emit('exit', exitCode, signal)
        this.ptyProcess = null
      })

      // Handle PTY errors (optional method)
      if (this.ptyProcess.on) {
        this.ptyProcess.on('error', (...args: unknown[]) => {
          const error =
            args[0] instanceof Error ? args[0] : new Error(String(args[0]))
          console.error(`[Node-pty Terminal] Error in ${this.id}:`, error)
          this.emit('error', error)
        })
      }

      console.log(
        `[Node-pty Terminal] Successfully spawned terminal ${this.id} with PID ${this.ptyProcess.pid}`
      )
    } catch (error) {
      console.error(
        `[Node-pty Terminal] Failed to spawn terminal ${this.id}:`,
        error
      )
      this.emit('error', error)
      throw error
    }
  }

  write(data: string): void {
    if (this.ptyProcess) {
      this.ptyProcess.write(data)
    } else {
      console.warn(
        `[Node-pty Terminal] Cannot write to terminal ${this.id}: process not running`
      )
    }
  }

  resize(cols: number, rows: number): void {
    this.cols = cols
    this.rows = rows

    if (this.ptyProcess) {
      try {
        this.ptyProcess.resize(cols, rows)
        console.log(
          `[Node-pty Terminal] Resized terminal ${this.id} to ${cols}x${rows}`
        )
      } catch (error) {
        console.warn(
          `[Node-pty Terminal] Failed to resize terminal ${this.id}:`,
          error
        )
      }
    }
  }

  kill(): void {
    if (this.ptyProcess) {
      console.log(`[Node-pty Terminal] Killing terminal ${this.id}`)

      try {
        // Cleanup buffer manager first
        this.bufferManager.destroy()

        // Graceful shutdown
        this.ptyProcess.kill()

        // Force kill after timeout if needed
        setTimeout(() => {
          if (this.ptyProcess && this.isRunning) {
            console.log(`[Node-pty Terminal] Force killing terminal ${this.id}`)
            this.ptyProcess.kill('SIGKILL')
          }
        }, 5000)
      } catch (error) {
        console.error(
          `[Node-pty Terminal] Error killing terminal ${this.id}:`,
          error
        )
      }
    }
  }

  get pid(): number | undefined {
    return this.ptyProcess?.pid
  }

  get isRunning(): boolean {
    return this.ptyProcess !== null && !this.ptyProcess.killed
  }

  // Advanced node-pty specific features

  /**
   * Clear the terminal screen (node-pty specific optimization)
   */
  clear(): void {
    if (this.ptyProcess && this.ptyProcess.clear) {
      this.ptyProcess.clear()
    }
  }

  /**
   * Pause/resume PTY data flow (node-pty specific)
   */
  pause(): void {
    if (this.ptyProcess && typeof this.ptyProcess.pause === 'function') {
      this.ptyProcess.pause()
    }
  }

  resume(): void {
    if (this.ptyProcess && typeof this.ptyProcess.resume === 'function') {
      this.ptyProcess.resume()
    }
  }

  /**
   * Get process tree (node-pty specific feature)
   */
  getProcessTree(): ProcessInfo[] {
    if (this.ptyProcess && typeof this.ptyProcess.process === 'function') {
      return this.ptyProcess.process()
    }
    return []
  }

  /**
   * Get terminal name/title (node-pty specific)
   */
  getTitle(): string {
    if (this.ptyProcess && this.ptyProcess.process) {
      return typeof this.ptyProcess.process === 'string'
        ? this.ptyProcess.process
        : this.shell
    }
    return this.shell
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
