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
    console.log('[PTY Host] 🚀 PTY Host Manager constructor called')
    console.log('[PTY Host] Process info:', {
      pid: process.pid,
      execPath: process.execPath,
      ELECTRON_RUN_AS_NODE: process.env.ELECTRON_RUN_AS_NODE,
      NODE_ENV: process.env.NODE_ENV,
    })
    this.setupMessageHandlers()
    console.log('[PTY Host] Message handlers set up successfully')
  }

  private setupMessageHandlers(): void {
    console.log('[PTY Host] Setting up message handlers...')

    // Handle messages from main process
    process.on('message', async (message: PtyMessageTypes) => {
      console.log('[PTY Host] Received message from main process:', {
        type: message.type,
        id: message.id,
      })
      try {
        await this.handleMessage(message)
      } catch (error) {
        console.error('[PTY Host] Error handling message:', error)
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
      console.log('[PTY Host] 🚀 SENDING MESSAGE to main process:', {
        type: message.type,
        id: message.id,
        dataLength:
          message.type === 'data'
            ? (message.data as string)?.length
            : undefined,
        dataPreview:
          message.type === 'data'
            ? (message.data as string)
                ?.substring(0, 50)
                .replace(/\r/g, '\\r')
                .replace(/\n/g, '\\n')
            : undefined,
        timestamp: new Date().toISOString(),
        pid: process.pid,
      })

      try {
        process.send(message)
        console.log(
          `[PTY Host] ✅ Message sent successfully: ${message.type} for ${message.id}`
        )
      } catch (error) {
        console.error(`[PTY Host] ❌ FAILED to send message:`, error)
        console.error(
          `[PTY Host] Message details:`,
          JSON.stringify(message, null, 2)
        )
      }
    } else {
      console.error(
        '[PTY Host] ❌ CRITICAL ERROR: process.send is not available!'
      )
      console.error('[PTY Host] Process state:', {
        connected: process.connected,
        pid: process.pid,
        env: {
          ELECTRON_RUN_AS_NODE: process.env.ELECTRON_RUN_AS_NODE,
          NODE_ENV: process.env.NODE_ENV,
        },
      })
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
      const cols = options.cols || 45 // Further reduced to 45 to eliminate prompt spacing
      const rows = options.rows || 24

      // Prepare environment variables to fix zsh prompt spacing issues
      const envVars = {
        ...process.env,
        ...options.env,
        // CRITICAL FIX: Set locale to fix character width calculation
        LC_CTYPE: 'en_US.UTF-8',
        LC_ALL: 'en_US.UTF-8',
        LANG: 'en_US.UTF-8',
        // Fix zsh end-of-line marker to prevent excessive spacing
        PROMPT_EOL_MARK: '',
        // Remove right prompt indent that can cause spacing issues
        ZLE_RPROMPT_INDENT: '0',
        // Ensure proper terminal type
        TERM: 'xterm-256color',
        // Set reasonable terminal width to prevent width miscalculation
        COLUMNS: cols.toString(),
        LINES: rows.toString(),
        // Additional zsh configuration to prevent prompt issues
        ZDOTDIR: process.env.ZDOTDIR || process.env.HOME,
        // Disable zsh startup files that might interfere with our terminal
        DISABLE_AUTO_UPDATE: 'true',
        // Force non-interactive mode initially to skip startup commands
        ZSH_AUTOSUGGEST_MANUAL_REBIND: '1',
        // FIXED: Add missing PATH from parent process
        PATH:
          process.env.PATH || '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
        // FIXED: Ensure HOME is set properly
        HOME: process.env.HOME || os.homedir(),
        // FIXED: Set USER variable if missing
        USER: process.env.USER || process.env.USERNAME || 'user',
        // FIXED: Add SHELL variable consistency
        SHELL: shell,
        // FIXED: Disable problematic shell features that can interfere
        ZSH_DISABLE_COMPFIX: 'true',
        // FIXED: Prevent interactive shell initialization delays
        DISABLE_MAGIC_FUNCTIONS: 'true',
      }

      console.log(`[PTY Host] 🔧 Creating terminal ${id} with config:`, {
        shell,
        cwd,
        cols,
        rows,
        envKeys: Object.keys(envVars).length,
      })

      // DEBUG: Log critical environment variables for debugging
      console.log(`[PTY Host] 🔍 Environment variables for ${id}:`, {
        PATH: envVars.PATH ? envVars.PATH.substring(0, 100) + '...' : 'MISSING',
        HOME: envVars.HOME,
        USER: envVars.USER,
        SHELL: envVars.SHELL,
        TERM: envVars.TERM,
        LANG: envVars.LANG,
        LC_ALL: envVars.LC_ALL,
        COLUMNS: envVars.COLUMNS,
        LINES: envVars.LINES,
      })

      // Use enhanced strategy to create best available terminal
      console.log(`[PTY Host] Calling createTerminal for ${id}...`)
      const result = await createTerminal(id, {
        shell,
        cwd,
        env: envVars,
        cols,
        rows,
      })
      console.log(
        `[PTY Host] createTerminal returned for ${id}, setting up handlers...`
      )

      console.log(
        `[PTY Host] ✅ Terminal ${id} configured with ${result.strategy} strategy`
      )
      console.log(
        `[PTY Host] Backend: ${result.capabilities.backend}, Reliability: ${result.capabilities.reliability}`
      )
      console.log(`[PTY Host] Features:`, {
        resize: result.capabilities.supportsResize,
        colors: result.capabilities.supportsColors,
        interactive: result.capabilities.supportsInteractivity,
        history: result.capabilities.supportsHistory,
      })

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

      // DEBUG: Track if we ever receive any data
      let hasReceivedData = false
      let dataEventCount = 0

      // Setup data handlers with proper backpressure (Context7 research)
      let dataBuffer = ''
      let isProcessing = false

      const processDataBuffer = () => {
        if (isProcessing || dataBuffer.length === 0) {
          if (isProcessing) {
            console.log(
              `[PTY Host] 🔄 Buffer processing already in progress for ${id}, queue length: ${dataBuffer.length}`
            )
          } else {
            console.log(
              `[PTY Host] 📭 Empty buffer for ${id}, nothing to process`
            )
          }
          return
        }

        isProcessing = true
        console.log(`[PTY Host] 🚀 PROCESSING BUFFER for ${id}:`, {
          bufferLength: dataBuffer.length,
          bufferStart: dataBuffer
            .substring(0, 50)
            .replace(/\r/g, '\\r')
            .replace(/\n/g, '\\n'),
          timestamp: new Date().toISOString(),
        })

        // Send data in controlled chunks to prevent Electron IPC overflow
        const chunkSize = 1024 // 1KB chunks based on Context7 best practices
        const chunk = dataBuffer.substring(0, chunkSize)
        dataBuffer = dataBuffer.substring(chunkSize)

        console.log(`[PTY Host] 📤 SENDING CHUNK to main process for ${id}:`, {
          chunkLength: chunk.length,
          remainingBuffer: dataBuffer.length,
          chunkPreview: chunk
            .substring(0, 100)
            .replace(/\r/g, '\\r')
            .replace(/\n/g, '\\n'),
          sendAvailable: !!process.send,
        })

        this.sendMessage({
          type: 'data',
          id,
          data: chunk,
        })

        console.log(
          `[PTY Host] ✅ CHUNK SENT for ${id}, remaining: ${dataBuffer.length} bytes`
        )

        // Use process.nextTick for better performance than setTimeout
        // (queueMicrotask is not available in all Node.js environments)
        if (dataBuffer.length > 0) {
          process.nextTick(() => {
            isProcessing = false
            console.log(
              `[PTY Host] 🔄 Ready for next chunk processing for ${id}`
            )
            processDataBuffer()
          })
        } else {
          isProcessing = false
          console.log(`[PTY Host] 🏁 Buffer processing complete for ${id}`)
        }
      }

      // ENHANCED: WINCH signal loop prevention with more precise detection
      let winchBuffer = ''
      let winchCount = 0
      let lastWinchTime = 0
      const MAX_WINCH_SIGNALS = 15 // Allow more legitimate WINCH signals
      const WINCH_RESET_INTERVAL = 1000 // Reset count after 1 second

      result.terminal.on('data', (data: string) => {
        console.log(`[PTY Host] 🔥 DATA EVENT from terminal ${id}:`, {
          dataLength: data.length,
          first100: data
            .substring(0, 100)
            .replace(/\r/g, '\\r')
            .replace(/\n/g, '\\n'),
          hasData: !!data,
          timestamp: new Date().toISOString(),
          isRunning: result.terminal.isRunning,
          pid: result.terminal.pid,
          rawHex: Buffer.from(data.substring(0, 50)).toString('hex'),
        })

        // DEBUG: Track data events
        dataEventCount++
        if (!hasReceivedData) {
          hasReceivedData = true
          console.log(
            `[PTY Host] 🎉 FIRST DATA received for terminal ${id} after spawn!`
          )
        }
        console.log(
          `[PTY Host] Data event #${dataEventCount} for terminal ${id}`
        )

        // Track recent WINCH signals in buffer
        winchBuffer += data
        if (winchBuffer.length > 1000) {
          winchBuffer = winchBuffer.slice(-500)
        }

        // ENHANCED: More precise WINCH loop detection
        const winchTime = Date.now()

        // Reset WINCH count after time interval to avoid permanent blocking
        if (winchTime - lastWinchTime > WINCH_RESET_INTERVAL) {
          winchCount = 0
          console.log(
            `[PTY Host] Reset WINCH count for terminal ${id} after timeout`
          )
        }

        // Detect multiple WINCH patterns that cause loops
        const isWinchLoop =
          // Original problematic pattern
          (data.includes('\r\r\u001b[m\u001b[m\u001b[m\u001b[J') ||
            // Alternative WINCH patterns
            data.includes('\u001b[0K\u001b[m\u001b[m\u001b[m') ||
            data.includes('\u001b[J\u001b[m\u001b[m\u001b[m') ||
            // Empty prompt redraws
            // eslint-disable-next-line no-control-regex -- ANSI escape sequences required for terminal control sequence detection
            /^\r+\u001b\[.*?J.*?%\s*$/.test(data)) &&
          data.includes('% ') && // Shell prompt present
          data.length < 300 && // Reasonable size limit
          !data.includes('\n') && // No actual command output
          data.trim().length < 100 // Excludes real command responses

        // Track WINCH buffer with size limit
        winchBuffer += data
        if (winchBuffer.length > 2000) {
          winchBuffer = winchBuffer.slice(-1000) // Keep last 1KB
        }

        // Count WINCH sequences in recent buffer
        const winchPatterns = [
          // eslint-disable-next-line no-control-regex -- ANSI escape sequences required for terminal control
          /\r\r\u001b\[m\u001b\[m\u001b\[m\u001b\[J/g,
          // eslint-disable-next-line no-control-regex -- ANSI escape sequences required for terminal control
          /\u001b\[0K\u001b\[m\u001b\[m\u001b\[m/g,
          // eslint-disable-next-line no-control-regex -- ANSI escape sequences required for terminal control
          /\u001b\[J\u001b\[m\u001b\[m\u001b\[m/g,
        ]

        let totalWinchCount = 0
        winchPatterns.forEach((pattern) => {
          const matches = winchBuffer.match(pattern)
          if (matches) {
            totalWinchCount += matches.length
          }
        })

        if (isWinchLoop) {
          winchCount++
          lastWinchTime = winchTime

          console.log(
            `[PTY Host] WINCH signal ${winchCount}/${MAX_WINCH_SIGNALS} detected for terminal ${id}`,
            {
              dataLength: data.length,
              bufferWinchCount: totalWinchCount,
              pattern: data
                .substring(0, 50)
                .replace(/\r/g, '\\r')
                .replace(/\n/g, '\\n'),
            }
          )

          // Block excessive WINCH loops but be less aggressive
          if (
            winchCount > MAX_WINCH_SIGNALS ||
            totalWinchCount > MAX_WINCH_SIGNALS * 2
          ) {
            console.log(
              `[PTY Host] BLOCKING WINCH loop - count: ${winchCount}, buffer: ${totalWinchCount}`
            )
            // Clear buffer to break the cycle
            winchBuffer = ''
            return // Block this specific problematic data
          }
        } else {
          // Reset for substantial non-WINCH data
          if (data.trim().length > 20 && !data.match(/^\s*%\s*$/)) {
            winchCount = Math.max(0, winchCount - 1) // Gradually reduce count
            console.log(
              `[PTY Host] Non-WINCH data detected, reducing count to ${winchCount}`
            )
          }
        }

        // CRITICAL FIX: Clean zsh prompt spacing issues
        let cleanedData = data

        // Fix zsh end-of-line marker excessive spacing
        // Pattern: "%" followed by many spaces followed by username/hostname
        const zshPromptSpacingPattern = /%\s{20,}([a-zA-Z0-9@_.-]+)/g
        if (zshPromptSpacingPattern.test(cleanedData)) {
          console.log(
            '[PTY Host] Detected zsh prompt spacing issue, cleaning...'
          )
          cleanedData = cleanedData.replace(zshPromptSpacingPattern, '% $1')
        }

        // Fix excessive spaces in general terminal output (keep max 2 consecutive spaces)
        const excessiveSpacesPattern = /\s{3,}/g
        if (
          excessiveSpacesPattern.test(cleanedData) &&
          cleanedData.includes('%')
        ) {
          console.log('[PTY Host] Cleaning excessive spaces in terminal output')
          cleanedData = cleanedData.replace(excessiveSpacesPattern, '  ')
        }

        // Clean zsh EOL marker with excessive padding
        // Pattern: CR + many spaces + CR + escape sequences
        const zshEOLPattern = /\r\s{10,}\r/g
        if (zshEOLPattern.test(cleanedData)) {
          console.log('[PTY Host] Cleaning zsh EOL marker excessive padding')
          cleanedData = cleanedData.replace(zshEOLPattern, '\r\r')
        }

        // Fix zsh partial line marker pattern specifically
        // Matches: % + 79 spaces + username pattern common on macOS
        const zshPartialLinePattern =
          /%\s{70,}([a-zA-Z0-9@_.-]+@[a-zA-Z0-9._-]+\s+[~//][^\s]*\s+%)/g
        if (zshPartialLinePattern.test(cleanedData)) {
          console.log('[PTY Host] Cleaning zsh partial line marker pattern')
          cleanedData = cleanedData.replace(zshPartialLinePattern, '$1')
        }

        // Clean up ANSI escape sequences that may cause width miscalculation
        // Remove sequences that zsh might use for prompt calculation but aren't visible
        // eslint-disable-next-line no-control-regex
        const invisibleEscapePattern = /\u001b\[m\u001b\[m\u001b\[m/g
        if (invisibleEscapePattern.test(cleanedData)) {
          console.log('[PTY Host] Cleaning invisible ANSI escape sequences')
          cleanedData = cleanedData.replace(invisibleEscapePattern, '')
        }

        // Clean up the specific pattern from user's issue: excessive spaces between %
        const doublePercentSpacingPattern = /%(\s{10,})([a-zA-Z0-9@_.-]+.*%)/g
        if (doublePercentSpacingPattern.test(cleanedData)) {
          console.log('[PTY Host] Cleaning double percent spacing pattern')
          cleanedData = cleanedData.replace(doublePercentSpacingPattern, '% $2')
        }

        // ENHANCED: Data processing with comprehensive debugging
        dataBuffer += cleanedData
        console.log(`[PTY Host] 📊 BUFFER UPDATE for ${id}:`, {
          addedLength: cleanedData.length,
          totalBufferLength: dataBuffer.length,
          isProcessing,
          bufferPreview: dataBuffer
            .substring(0, 100)
            .replace(/\r/g, '\\r')
            .replace(/\n/g, '\\n'),
          dataPreview: cleanedData
            .substring(0, 100)
            .replace(/\r/g, '\\r')
            .replace(/\n/g, '\\n'),
        })

        // CRITICAL DEBUG: Verify data is actually being processed
        console.log(`[PTY Host] 🚀 About to call processDataBuffer for ${id}`)
        processDataBuffer()
        console.log(`[PTY Host] ✅ processDataBuffer call completed for ${id}`)
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

      console.log(
        `[PTY Host] Terminal ${id} spawned, PID: ${result.terminal.pid}`
      )
      console.log(
        `[PTY Host] Terminal ${id} isRunning: ${result.terminal.isRunning}`
      )

      // CRITICAL DEBUG: Force initial prompt to appear
      // Send a newline after a short delay to trigger the shell prompt
      setTimeout(() => {
        console.log(
          `[PTY Host] Sending initial newline to trigger prompt for terminal ${id}`
        )
        try {
          result.terminal.write('\n')
          console.log(
            `[PTY Host] Initial newline sent successfully to terminal ${id}`
          )
        } catch (error) {
          console.error(
            `[PTY Host] Failed to send initial newline to terminal ${id}:`,
            error
          )
        }
      }, 500) // Give the shell 500ms to fully initialize

      // Don't clear the terminal - let the initial prompt show
      // The clearing was causing the terminal to appear empty

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
console.log('[PTY Host] Starting PTY Host Manager...')
const manager = new PtyHostManager()
console.log(
  '[PTY Host] PTY Host Manager created successfully, process ready for messages'
)

// Keep the process alive
process.on('SIGINT', () => {
  console.log('[PTY Host] Received SIGINT, cleaning up...')
  manager.cleanup()
  process.exit(0)
})

// Keep the process alive
// Use setInterval instead of stdin.resume() which may not work when stdin is ignored
setInterval(
  () => {
    // Keep-alive interval - does nothing but prevents exit
  },
  1000 * 60 * 60
) // Check every hour
