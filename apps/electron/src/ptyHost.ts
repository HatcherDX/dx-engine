/**
 * PTY Host Process - VSCode Style Architecture with Hybrid Strategy
 * Runs with ELECTRON_RUN_AS_NODE for optimal performance
 * Auto-detects best terminal implementation (node-pty vs subprocess)
 */

import * as os from 'node:os'
import {
  createTerminal,
  TerminalStrategy,
  type ITerminal,
} from './terminalStrategy'

interface PtyProcessOptions {
  shell?: string
  cwd?: string
  env?: Record<string, string>
  cols?: number
  rows?: number
}

interface PtyMessage {
  type: 'create' | 'write' | 'resize' | 'kill' | 'list'
  id: string
  options?: PtyProcessOptions
  data?: string
  cols?: number
  rows?: number
}

interface PtyCreateMessage extends PtyMessage {
  type: 'create'
  options: PtyProcessOptions
}

interface PtyWriteMessage extends PtyMessage {
  type: 'write'
  data: string
}

interface PtyResizeMessage extends PtyMessage {
  type: 'resize'
  cols: number
  rows: number
}

interface PtyKillMessage extends PtyMessage {
  type: 'kill'
}

interface PtyListMessage extends PtyMessage {
  type: 'list'
}

type PtyMessageTypes =
  | PtyCreateMessage
  | PtyWriteMessage
  | PtyResizeMessage
  | PtyKillMessage
  | PtyListMessage

interface PtyResponse {
  type: 'created' | 'data' | 'exit' | 'error' | 'list' | 'killed'
  id?: string
  data?: unknown
  error?: string
  code?: number
  signal?: string
  terminals?: Array<{ id: string; pid?: number }>
  exitCode?: number
  shell?: string
  requestId?: string
  cwd?: string
  pid?: number
  strategy?: string
  backend?: string
  capabilities?: unknown
  fallbackReason?: string
}

interface PtyProcess {
  id: string
  terminal: ITerminal
  shell: string
  cwd: string
  strategy: TerminalStrategy
  // Data throttling to prevent infinite loops
  lastDataSent?: string
  lastDataTimestamp?: number
  duplicateCount?: number
}

class PtyHostManager {
  private processes = new Map<string, PtyProcess>()

  constructor() {
    this.setupMessageHandlers()
  }

  private setupMessageHandlers(): void {
    // Handle messages from main process
    process.on('message', async (message: PtyMessageTypes) => {
      try {
        await this.handleMessage(message)
      } catch (error) {
        this.sendMessage({
          type: 'error',
          id: message.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    })

    process.on('disconnect', () => {
      console.log('[PTY Host] Disconnected from main process, cleaning up...')
      this.cleanup()
      process.exit(0)
    })

    process.on('SIGTERM', () => {
      console.log('[PTY Host] Received SIGTERM, cleaning up...')
      this.cleanup()
      process.exit(0)
    })
  }

  private async handleMessage(message: PtyMessageTypes): Promise<void> {
    switch (message.type) {
      case 'create':
        await this.createTerminal(message.id, message.options)
        break
      case 'write':
        this.writeToTerminal(message.id, message.data)
        break
      case 'resize':
        this.resizeTerminal(message.id, message.cols, message.rows)
        break
      case 'kill':
        this.killTerminal(message.id)
        break
      case 'list':
        this.listTerminals(message.id)
        break
      default: {
        // TypeScript ensures this case is never reached with proper union types
        const _exhaustiveCheck: never = message
        console.warn('[PTY Host] Unknown message type:', _exhaustiveCheck)
      }
    }
  }

  private sendMessage(message: PtyResponse): void {
    if (process.send) {
      process.send(message)
    }
  }

  private shouldThrottleData(terminalId: string, data: string): boolean {
    const process = this.processes.get(terminalId)
    if (!process) return false

    const now = Date.now()
    const isDuplicate = process.lastDataSent === data
    const isWithinThrottleWindow = now - (process.lastDataTimestamp || 0) < 100 // 100ms window

    if (isDuplicate && isWithinThrottleWindow) {
      process.duplicateCount = (process.duplicateCount || 0) + 1

      // Allow first few duplicates but throttle excessive ones
      if (process.duplicateCount > 3) {
        return true // Throttle this data
      }
    } else {
      // Reset counters for different data or after time window
      process.duplicateCount = 0
    }

    // Update tracking
    process.lastDataSent = data
    process.lastDataTimestamp = now

    return false // Don't throttle
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
        // Linux/Unix: prefer bash, check common shells
        return process.env.SHELL || '/bin/bash'
    }
  }

  private async createTerminal(
    id: string,
    options: PtyProcessOptions = {}
  ): Promise<void> {
    try {
      const shell = options.shell || this.detectShell()
      const cwd = options.cwd || process.env.HOME || process.cwd()
      const cols = options.cols || 80
      const rows = options.rows || 24

      console.log(`[PTY Host] Creating terminal ${id} with shell: ${shell}`)

      // Use enhanced strategy to create best available terminal
      const result = await createTerminal(id, {
        shell,
        cwd,
        env: options.env,
        cols,
        rows,
      })

      console.log(
        `[PTY Host] Using ${result.strategy} strategy for terminal ${id}`
      )
      console.log(
        `[PTY Host] Capabilities: ${result.capabilities.backend} backend`
      )
      console.log(
        `[PTY Host] Features: resize=${result.capabilities.supportsResize}, colors=${result.capabilities.supportsColors}, interactive=${result.capabilities.supportsInteractivity}, history=${result.capabilities.supportsHistory}, reliability=${result.capabilities.reliability}`
      )

      if (result.fallbackReason) {
        console.warn(`[PTY Host] Fallback reason: ${result.fallbackReason}`)
      }

      // Store process with enhanced strategy info
      this.processes.set(id, {
        id,
        terminal: result.terminal,
        shell,
        cwd,
        strategy: result.strategy,
      })

      // Setup data handlers with proper backpressure (Context7 research)
      let dataBuffer = ''
      let isProcessing = false

      const processDataBuffer = () => {
        if (isProcessing || dataBuffer.length === 0) return

        isProcessing = true

        // Send data in controlled chunks to prevent Electron IPC overflow
        const chunkSize = 1024 // 1KB chunks based on Context7 best practices
        const chunk = dataBuffer.substring(0, chunkSize)
        dataBuffer = dataBuffer.substring(chunkSize)

        this.sendMessage({
          type: 'data',
          id,
          data: chunk,
        })

        // Use microtask for better performance than setTimeout
        if (dataBuffer.length > 0) {
          queueMicrotask(() => {
            isProcessing = false
            processDataBuffer()
          })
        } else {
          isProcessing = false
        }
      }

      // CRITICAL: WINCH signal loop prevention - exact pattern from logs
      let winchBuffer = ''
      let winchCount = 0
      let lastWinchTime = 0
      const MAX_WINCH_SIGNALS = 2 // Very aggressive

      result.terminal.on('data', (data: string) => {
        // Track recent WINCH signals in buffer
        winchBuffer += data
        if (winchBuffer.length > 1000) {
          winchBuffer = winchBuffer.slice(-500)
        }

        const now = Date.now()

        // Detect the EXACT problematic WINCH loop pattern from user logs
        const isWinchLoop =
          data.includes('\r\r\u001b[m\u001b[m\u001b[m\u001b[J') && // Exact pattern
          data.includes('% ') && // Shell prompt
          data.length < 200 // Short repetitive signal

        // Count WINCH sequences in buffer
        const winchPatternStr =
          '\\r\\r\\u001b\\[m\\u001b\\[m\\u001b\\[m\\u001b\\[J'
        const winchPattern = new RegExp(winchPatternStr, 'g')
        const bufferWinchCount = (winchBuffer.match(winchPattern) || []).length

        if (isWinchLoop && bufferWinchCount > MAX_WINCH_SIGNALS) {
          console.log(
            `[PTY Host] CRITICAL: Blocking WINCH loop - ${bufferWinchCount} WINCH signals in buffer`
          )

          // Clear buffer to break the cycle
          winchBuffer = ''
          winchCount = 0

          // Block this problematic WINCH data completely
          return
        }

        if (isWinchLoop) {
          if (now - lastWinchTime < 100) {
            winchCount++
          } else {
            winchCount = 1
          }
          lastWinchTime = now

          // Aggressive WINCH blocking
          if (winchCount > MAX_WINCH_SIGNALS) {
            console.log(
              `[PTY Host] Blocking rapid WINCH signals - ${winchCount} detected`
            )
            return // Block without trying to fix
          }
        } else {
          // Reset for substantial non-WINCH data
          if (data.trim().length > 20 && !data.includes('\u001b[')) {
            winchCount = 0
          }
        }

        // Normal data processing with buffering
        dataBuffer += data
        processDataBuffer()
      })

      result.terminal.on('exit', (exitCode: number, signal?: string) => {
        console.log(
          `[PTY Host] Terminal ${id} exited with code ${exitCode}, signal ${signal}`
        )

        // Send any remaining buffered data before exit
        if (dataBuffer.length > 0) {
          this.sendMessage({
            type: 'data',
            id,
            data: dataBuffer,
          })
          dataBuffer = ''
        }

        this.processes.delete(id)
        this.sendMessage({
          type: 'exit',
          id,
          exitCode,
          signal,
        })
      })

      result.terminal.on('error', (error: Error) => {
        console.error(`[PTY Host] Terminal ${id} error:`, error)

        // Clear buffer on error to prevent memory leaks
        dataBuffer = ''
        isProcessing = false

        this.sendMessage({
          type: 'error',
          id,
          error: error.message,
        })
      })

      // Spawn the terminal
      result.terminal.spawn()

      // Send success response with enhanced strategy info
      this.sendMessage({
        type: 'created',
        id,
        shell,
        cwd,
        pid: result.terminal.pid || 0,
        strategy: result.strategy,
        backend: result.capabilities.backend,
        capabilities: result.capabilities,
        fallbackReason: result.fallbackReason,
      })
    } catch (error) {
      console.error(`[PTY Host] Failed to create terminal ${id}:`, error)
      this.sendMessage({
        type: 'error',
        id,
        error:
          error instanceof Error ? error.message : 'Failed to create terminal',
      })
    }
  }

  private writeToTerminal(id: string, data: string): void {
    const process = this.processes.get(id)
    if (!process) {
      console.warn(`[PTY Host] Terminal ${id} not found for write`)
      return
    }

    try {
      process.terminal.write(data)
    } catch (error) {
      console.error(`[PTY Host] Failed to write to terminal ${id}:`, error)
      this.sendMessage({
        type: 'error',
        id,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to write to terminal',
      })
    }
  }

  private resizeTerminal(id: string, cols: number, rows: number): void {
    const process = this.processes.get(id)
    if (!process) {
      console.warn(`[PTY Host] Terminal ${id} not found for resize`)
      return
    }

    try {
      process.terminal.resize(cols, rows)
      console.log(`[PTY Host] Resized terminal ${id} to ${cols}x${rows}`)
    } catch (error) {
      console.error(`[PTY Host] Failed to resize terminal ${id}:`, error)
    }
  }

  private killTerminal(id: string): void {
    const process = this.processes.get(id)
    if (!process) {
      console.warn(`[PTY Host] Terminal ${id} not found for kill`)
      return
    }

    try {
      process.terminal.kill()
      this.processes.delete(id)
      console.log(`[PTY Host] Killed terminal ${id}`)

      this.sendMessage({
        type: 'killed',
        id,
      })
    } catch (error) {
      console.error(`[PTY Host] Failed to kill terminal ${id}:`, error)
    }
  }

  private listTerminals(requestId: string): void {
    const terminals = Array.from(this.processes.values()).map((proc) => ({
      id: proc.id,
      shell: proc.shell,
      cwd: proc.cwd,
      pid: proc.terminal.pid,
    }))

    this.sendMessage({
      type: 'list',
      requestId,
      terminals,
    })
  }

  private cleanup(): void {
    console.log(`[PTY Host] Cleaning up ${this.processes.size} processes...`)

    for (const [id, process] of this.processes) {
      try {
        process.terminal.kill()
        console.log(`[PTY Host] Cleaned up terminal ${id}`)
      } catch (error) {
        console.error(`[PTY Host] Error cleaning up terminal ${id}:`, error)
      }
    }

    this.processes.clear()
  }
}

// Start PTY Host Manager
new PtyHostManager()
