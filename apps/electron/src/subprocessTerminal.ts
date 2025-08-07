/**
 * Subprocess-based Terminal - C++20 Compatibility Fallback
 * Uses Node.js child_process instead of node-pty for Electron v35 compatibility
 */

import { spawn, ChildProcess } from 'node:child_process'
import * as os from 'node:os'
import { EventEmitter } from 'node:events'
import type { TerminalInterface } from './terminalStrategy'
import { TerminalBufferManager } from './terminalBufferManager'

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
  private process: ChildProcess | null = null
  private id: string
  private shell: string
  private cwd: string
  private cols: number
  private rows: number
  private bufferManager: TerminalBufferManager

  constructor(id: string, options: SubprocessTerminalOptions = {}) {
    super()
    this.id = id
    this.shell = options.shell || this.detectShell()
    this.cwd = options.cwd || process.env.HOME || process.cwd()
    this.cols = options.cols || 80
    this.rows = options.rows || 24

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

  spawn(): void {
    try {
      console.log(`[Subprocess Terminal] Spawning shell: ${this.shell}`)

      // Prepare environment
      const env = {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        COLUMNS: this.cols.toString(),
        LINES: this.rows.toString(),
      }

      // Spawn shell process
      this.process = spawn(this.shell, [], {
        cwd: this.cwd,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      if (!this.process.stdin || !this.process.stdout || !this.process.stderr) {
        throw new Error('Failed to create stdio streams')
      }

      // Setup data handlers with safety filtering
      this.process.stdout.on('data', (data: Buffer) => {
        const dataStr = data.toString()
        console.log(
          `[Subprocess] Raw stdout received (${dataStr.length} chars):`,
          dataStr.slice(0, 100)
        )
        const filteredData = this.filterTerminalOutput(dataStr)

        if (filteredData.trim()) {
          console.log(
            '[Subprocess] Stdout filtered and emitted:',
            filteredData.slice(0, 50)
          )
          this.bufferManager.write(filteredData)
        } else {
          console.log('[Subprocess] Stdout data was completely filtered out')
        }
      })

      this.process.stderr.on('data', (data: Buffer) => {
        const dataStr = data.toString()
        console.log(
          `[Subprocess] Raw stderr received (${dataStr.length} chars):`,
          dataStr.slice(0, 100)
        )
        const filteredData = this.filterTerminalOutput(dataStr)

        if (filteredData.trim()) {
          console.log(
            '[Subprocess] Stderr filtered and emitted:',
            filteredData.slice(0, 50)
          )
          this.bufferManager.write(filteredData)
        } else {
          console.log('[Subprocess] Stderr data was completely filtered out')
        }
      })

      this.process.on('error', (error: Error) => {
        console.error(`[Subprocess Terminal] Error in ${this.id}:`, error)
        this.emit('error', error)
      })

      this.process.on('exit', (code: number | null, signal: string | null) => {
        console.log(
          `[Subprocess Terminal] Process ${this.id} exited with code ${code}, signal ${signal}`
        )
        this.emit('exit', code || 0, signal)
        this.process = null
      })

      // Send an initial prompt since shell might not generate one immediately
      setTimeout(() => {
        console.log(
          `[Subprocess Terminal] Sending initial prompt for ${this.id}`
        )
        // Let the shell settle first, then send a simple prompt to activate the terminal
        this.emit('data', '$ ')
      }, 500)

      // Add periodic debug info to verify our changes are working
      setInterval(() => {
        console.log(
          `[Subprocess Debug] Terminal ${this.id} is running with PID ${this.process?.pid}`
        )
      }, 10000)

      console.log(
        `[Subprocess Terminal] Successfully spawned terminal ${this.id} with PID ${this.process.pid}`
      )
    } catch (error) {
      console.error(
        `[Subprocess Terminal] Failed to spawn terminal ${this.id}:`,
        error
      )
      this.emit('error', error)
    }
  }

  private getWelcomeMessage(): string {
    const hostname = os.hostname()
    const username = os.userInfo().username

    return `\r\nWelcome to DX Engine Terminal\r\n${username}@${hostname}:${this.cwd}$ `
  }

  /**
   * Filter terminal output to remove problematic sequences
   */
  private filterTerminalOutput(data: string): string {
    // Remove null bytes
    let filtered = data.replace(/\0/g, '')

    // Filter out ANY repeating characters (especially W's)
    filtered = filtered.replace(/(.)\1{9,}/g, '') // Remove any character repeated 10+ times

    // Remove most escape sequences but keep basic formatting
    // eslint-disable-next-line no-control-regex
    filtered = filtered.replace(/\x1b\[[0-9;]*[mK]/g, '') // Color codes
    // eslint-disable-next-line no-control-regex
    filtered = filtered.replace(/\x1b\[[ABCD]/g, '') // Cursor movement
    // eslint-disable-next-line no-control-regex
    filtered = filtered.replace(/\x1b\[2J/g, '') // Clear screen

    // Remove bell and other control characters
    // eslint-disable-next-line no-control-regex
    filtered = filtered.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

    // Keep only printable ASCII + basic whitespace (space, tab, newline, carriage return)
    filtered = filtered.replace(/[^\x20-\x7E\t\n\r]/g, '')

    // Remove excessive whitespace
    filtered = filtered.replace(/\n{3,}/g, '\n\n')
    filtered = filtered.replace(/ {10,}/g, '    ') // Replace long spaces with 4 spaces

    return filtered
  }

  write(data: string): void {
    if (this.process && this.process.stdin) {
      console.log(
        `[Subprocess Terminal] Writing user input to shell:`,
        JSON.stringify(data)
      )

      // Echo the input back to the terminal first (simulate terminal echo)
      // This is needed because zsh in non-interactive mode doesn't echo by default
      if (data === '\r') {
        // Handle Enter key - echo newline and execute command
        this.emit('data', '\r\n')
        this.process.stdin.write('\n')
      } else if (data === '\x7f' || data === '\b') {
        // Handle backspace - move cursor back and erase character
        this.emit('data', '\b \b')
      } else if (data.length === 1 && data >= ' ' && data <= '~') {
        // Echo printable characters back to terminal
        this.emit('data', data)
        this.process.stdin.write(data)
      } else {
        // Send non-printable characters directly to shell
        this.process.stdin.write(data)
      }
    } else {
      console.error(
        `[Subprocess Terminal] Cannot write - no process or stdin available for terminal ${this.id}`
      )
    }
  }

  resize(cols: number, rows: number): void {
    this.cols = cols
    this.rows = rows

    // Send resize signal if supported (Unix-like systems)
    if (this.process && this.process.pid && os.platform() !== 'win32') {
      try {
        process.kill(this.process.pid, 'SIGWINCH')
      } catch (error) {
        console.warn(
          `[Subprocess Terminal] Failed to send resize signal:`,
          error
        )
      }
    }
  }

  kill(): void {
    if (this.process) {
      console.log(`[Subprocess Terminal] Killing terminal ${this.id}`)

      // Cleanup buffer manager first
      this.bufferManager.destroy()

      this.process.kill('SIGTERM')

      // Force kill after timeout
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          console.log(`[Subprocess Terminal] Force killing terminal ${this.id}`)
          this.process.kill('SIGKILL')
        }
      }, 5000)
    }
  }

  get pid(): number | undefined {
    return this.process?.pid
  }

  get isRunning(): boolean {
    return this.process !== null && !this.process.killed
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
