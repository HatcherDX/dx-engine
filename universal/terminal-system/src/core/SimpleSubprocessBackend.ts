/**
 * @fileoverview Simple subprocess backend that executes commands individually.
 *
 * @description
 * SimpleSubprocessBackend provides terminal functionality by executing commands
 * one at a time, similar to the demo implementation. This approach is more reliable
 * than trying to maintain an interactive shell session without a PTY.
 *
 * @example
 * ```typescript
 * const backend = new SimpleSubprocessBackend()
 * const process = await backend.spawn({
 *   shell: '/bin/bash',
 *   cwd: '/home/user'
 * })
 * process.write('ls\n')
 * ```
 *
 * @author Hatcher DX Team
 * @since 1.0.0
 * @public
 */

import * as childProcess from 'node:child_process'
import * as os from 'node:os'
import * as path from 'node:path'
import * as fs from 'node:fs'
import { Logger } from '../utils/logger'
import { PlatformUtils } from '../utils/platform'
import type { TerminalCapabilities } from './BackendDetector'
import { EventEmitter } from './EventEmitter'
import {
  TerminalBackend,
  type BackendProcess,
  type BackendSpawnOptions,
} from './TerminalBackend'

/**
 * Simple subprocess backend that executes commands individually.
 *
 * @remarks
 * This backend simulates a terminal session by executing each command
 * separately and maintaining state between commands (like current directory).
 * It's more reliable than interactive shells for subprocess-based terminals.
 *
 * @public
 * @since 1.0.0
 */
export class SimpleSubprocessBackend extends TerminalBackend {
  public readonly capabilities: TerminalCapabilities = {
    backend: 'subprocess', // Use 'subprocess' as backend type
    supportsResize: false,
    supportsColors: true,
    supportsInteractivity: false,
    supportsHistory: false,
    reliability: 'high',
  }

  constructor() {
    super('simple-subprocess')
  }

  async isAvailable(): Promise<boolean> {
    // Simple subprocess is always available as a fallback
    return true
  }

  async spawn(options: BackendSpawnOptions): Promise<BackendProcess> {
    const shell = options.shell || PlatformUtils.getDefaultShell()
    const cwd = options.cwd || PlatformUtils.getHomeDirectory()

    this.logger.debug(`Creating simple subprocess terminal`, {
      shell,
      cwd,
    })

    const process = new SimpleSubprocessProcess(
      shell,
      cwd,
      this.logger,
      options.welcomeMessage
    )

    // Initialize the terminal
    await process.initialize()

    return process
  }
}

/**
 * Simple subprocess process that executes commands individually.
 *
 * @internal
 */
class SimpleSubprocessProcess
  extends EventEmitter<{
    data: [string]
    exit: [{ exitCode: number }]
    error: [Error]
  }>
  implements BackendProcess
{
  public readonly pid: number = process.pid || 0
  private cwd: string
  private commandBuffer: string = ''
  private currentProcess: childProcess.ChildProcess | null = null
  private welcomeSent = false
  private env: Record<string, string>

  constructor(
    _shellPath: string,
    cwd: string,
    private logger: Logger,
    private welcomeMessage?: string
  ) {
    super()
    // Note: _shellPath is currently unused but kept for API compatibility
    // Commands are executed with shell: true which uses the system default
    this.cwd = cwd
    this.env = {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
    }
  }

  async initialize(): Promise<void> {
    // Send welcome message and initial prompt
    if (this.welcomeMessage && !this.welcomeSent) {
      this.welcomeSent = true
      this.emit('data', this.welcomeMessage)
    }

    // Send initial prompt
    this.sendPrompt()
  }

  private sendPrompt(): void {
    const user = process.env.USER || 'user'
    const hostname = os.hostname().split('.')[0]
    const homeDir = os.homedir()

    // Simplify path display
    let displayPath = this.cwd
    if (this.cwd.startsWith(homeDir)) {
      displayPath = '~' + this.cwd.slice(homeDir.length)
    }

    const promptStr = `\x1b[32m${user}@${hostname}\x1b[0m \x1b[36m${displayPath}\x1b[0m $ `
    this.emit('data', promptStr)
  }

  write(data: string): void {
    const charCode = data.charCodeAt(0)

    // Handle Ctrl+C
    if (charCode === 3) {
      if (this.currentProcess) {
        this.currentProcess.kill('SIGINT')
        this.currentProcess = null
      }
      this.commandBuffer = ''
      this.emit('data', '^C\r\n')
      this.sendPrompt()
      return
    }

    // Handle Enter key
    if (data === '\r' || data === '\n') {
      this.emit('data', '\r\n')
      const command = this.commandBuffer.trim()
      this.commandBuffer = ''

      if (command) {
        this.executeCommand(command)
      } else {
        this.sendPrompt()
      }
      return
    }

    // Handle Backspace
    if (charCode === 127 || charCode === 8) {
      if (this.commandBuffer.length > 0) {
        this.commandBuffer = this.commandBuffer.slice(0, -1)
        this.emit('data', '\b \b')
      }
      return
    }

    // Handle Ctrl+D (EOF)
    if (charCode === 4) {
      this.emit('exit', { exitCode: 0 })
      return
    }

    // Handle regular printable characters
    if (charCode >= 32 && charCode <= 126) {
      this.commandBuffer += data
      this.emit('data', data)
      return
    }
  }

  private executeCommand(command: string): void {
    this.logger.debug(`Executing command: ${command}`)

    // Handle cd command specially
    if (command.startsWith('cd ')) {
      const newDir = command.slice(3).trim()
      this.handleCd(newDir)
      return
    }

    // Handle clear command
    if (command === 'clear') {
      this.emit('data', '\x1b[2J\x1b[H')
      // Send prompt after a small delay
      setTimeout(() => this.sendPrompt(), 10)
      return
    }

    // Handle exit command
    if (command === 'exit') {
      this.emit('exit', { exitCode: 0 })
      return
    }

    // Execute command using spawn with shell
    try {
      this.currentProcess = childProcess.spawn(command, [], {
        shell: true,
        cwd: this.cwd,
        env: { ...this.env, PWD: this.cwd },
      })

      // Handle stdout
      this.currentProcess.stdout?.on('data', (chunk: Buffer) => {
        const output = chunk.toString()
        this.emit('data', output)
      })

      // Handle stderr
      this.currentProcess.stderr?.on('data', (chunk: Buffer) => {
        const output = chunk.toString()
        this.emit('data', output)
      })

      // Handle process exit
      this.currentProcess.on('exit', (code: number | null) => {
        this.logger.debug(`Command exited with code ${code}`)
        this.currentProcess = null
        this.sendPrompt()
      })

      // Handle process error
      this.currentProcess.on('error', (error: Error) => {
        this.logger.error(`Command error: ${error.message}`)
        this.emit('data', `Error: ${error.message}\r\n`)
        this.currentProcess = null
        this.sendPrompt()
      })
    } catch (error) {
      this.logger.error('Failed to execute command', error as Error)
      this.emit('data', `Error: ${(error as Error).message}\r\n`)
      this.sendPrompt()
    }
  }

  private handleCd(newDir: string): void {
    try {
      let targetDir: string

      if (newDir.startsWith('/')) {
        targetDir = newDir
      } else if (newDir === '~') {
        targetDir = os.homedir()
      } else if (newDir.startsWith('~/')) {
        targetDir = path.join(os.homedir(), newDir.slice(2))
      } else if (newDir === '-') {
        // For simplicity, just stay in current dir
        targetDir = this.cwd
      } else {
        targetDir = path.join(this.cwd, newDir)
      }

      // Check if directory exists
      if (fs.existsSync(targetDir) && fs.statSync(targetDir).isDirectory()) {
        this.cwd = path.resolve(targetDir)
        this.logger.debug(`Changed directory to: ${this.cwd}`)
      } else {
        this.emit('data', `cd: no such file or directory: ${newDir}\r\n`)
      }
    } catch (error) {
      this.emit('data', `cd: ${(error as Error).message}\r\n`)
    }

    this.sendPrompt()
  }

  resize(cols: number, rows: number): void {
    // Simple subprocess doesn't support resize
    this.logger.debug(
      `Resize requested to ${cols}x${rows} but not supported in simple subprocess mode`
    )
  }

  kill(signal?: string): void {
    if (this.currentProcess) {
      this.currentProcess.kill((signal as NodeJS.Signals) || 'SIGTERM')
      this.currentProcess = null
    }
    this.emit('exit', { exitCode: 0 })
  }
}
