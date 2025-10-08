import * as childProcess from 'node:child_process'
import * as os from 'node:os'
import { Logger } from '../utils/logger'
import { PlatformUtils } from '../utils/platform'
import type { TerminalCapabilities } from './BackendDetector'
import { EventEmitter } from './EventEmitter'
import {
  TerminalBackend,
  type BackendProcess,
  type BackendSpawnOptions,
} from './TerminalBackend'
import { TerminalReadyDetector } from './TerminalReadyDetector'

/**
 * Subprocess backend implementation
 * Fallback option when PTY is not available
 */
export class SubprocessBackend extends TerminalBackend {
  public readonly capabilities: TerminalCapabilities = {
    backend: 'subprocess',
    supportsResize: false,
    supportsColors: true,
    supportsInteractivity: true,
    supportsHistory: true,
    reliability: 'medium',
  }

  constructor() {
    super('subprocess')
  }

  async isAvailable(): Promise<boolean> {
    // Subprocess is always available as a fallback
    return true
  }

  async spawn(options: BackendSpawnOptions): Promise<BackendProcess> {
    try {
      const shell = options.shell || PlatformUtils.getDefaultShell()
      const shellArgs = this.getShellArgs()
      const env = this.getBaseEnvironment(options)
      const cwd = options.cwd || PlatformUtils.getHomeDirectory()

      this.logger.debug(`Spawning ${shell} with subprocess`, {
        shell,
        args: shellArgs,
        cwd,
      })

      const childProcessInstance = childProcess.spawn(shell, shellArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd,
        env,
        shell: false,
      })

      if (!childProcessInstance.pid) {
        throw new Error('Failed to spawn subprocess: no PID')
      }

      const process = new SubprocessProcess(
        childProcessInstance,
        this.logger,
        options.welcomeMessage,
        true // Enable manual echo for interactive shells
      )

      return process
    } catch (error) {
      this.logger.error('Failed to spawn subprocess', error as Error)
      throw error
    }
  }

  private getShellArgs(): string[] {
    const platformType = os.platform()

    if (platformType === 'win32') {
      const shell = PlatformUtils.getDefaultShell().toLowerCase()
      if (shell.includes('powershell') || shell.includes('pwsh')) {
        return ['-NoLogo', '-NoProfile', '-Interactive']
      } else if (shell.includes('cmd') || shell.includes('command')) {
        return ['/Q', '/K']
      }
    } else {
      // Unix-like systems
      const shell = PlatformUtils.getDefaultShell()
      if (shell.includes('bash')) {
        return ['--login', '-i']
      } else if (shell.includes('zsh')) {
        return ['-l', '-i']
      } else if (shell.includes('fish')) {
        return ['--login', '--interactive']
      }
    }
    return []
  }
}

/**
 * Subprocess process wrapper
 */
class SubprocessProcess
  extends EventEmitter<{
    data: [string]
    exit: [{ exitCode: number }]
    error: [Error]
  }>
  implements BackendProcess
{
  public readonly pid: number
  private readyDetector: TerminalReadyDetector
  private welcomeMessage?: string
  private welcomeSent = false
  private commandBuffer: string = ''
  private isInteractiveShell: boolean

  constructor(
    private childProcess: childProcess.ChildProcess,
    private logger: Logger,
    welcomeMessage?: string,
    isInteractiveShell: boolean = true
  ) {
    super()
    this.pid = childProcess.pid || 0
    this.welcomeMessage = welcomeMessage
    this.isInteractiveShell = isInteractiveShell
    this.readyDetector = new TerminalReadyDetector({
      timeout: 5000, // Increased timeout for slower systems
      debug: true, // Enable debug to see what's happening
    })

    this.setupEvents()
  }

  private setupEvents(): void {
    // Set up a fallback timer for welcome message
    let fallbackTimer: NodeJS.Timeout | null = null
    if (this.welcomeMessage) {
      fallbackTimer = setTimeout(() => {
        if (!this.welcomeSent) {
          this.welcomeSent = true
          this.emit('data', this.welcomeMessage!)
          this.logger.debug(
            'Sent welcome message using fallback timer after 500ms'
          )
        }
      }, 500) // Fallback after 500ms if no prompt detected
    }

    // Handle stdout data
    this.childProcess.stdout?.on('data', (data: Buffer) => {
      const processed = this.processOutput(data.toString())

      // Check if terminal is ready for welcome message
      if (this.welcomeMessage && !this.welcomeSent) {
        if (this.readyDetector.checkData(processed)) {
          // Terminal is ready, send welcome message
          this.welcomeSent = true
          // Clear the fallback timer since we detected the prompt
          if (fallbackTimer) {
            clearTimeout(fallbackTimer)
            fallbackTimer = null
          }
          this.emit('data', processed)
          // Send welcome message after a tiny delay to ensure prompt is displayed
          setTimeout(() => {
            this.emit('data', this.welcomeMessage!)
            this.logger.debug(
              'Sent welcome message after detecting terminal ready'
            )
          }, 50)
          return
        }
      }

      this.emit('data', processed)
    })

    // Handle stderr data
    this.childProcess.stderr?.on('data', (data: Buffer) => {
      const processed = this.processOutput(data.toString())

      // Also check stderr for ready detection (some shells output prompt to stderr)
      if (this.welcomeMessage && !this.welcomeSent) {
        this.readyDetector.checkData(processed)
      }

      this.emit('data', processed)
    })

    // Handle process exit
    this.childProcess.on('exit', (code: number | null) => {
      const exitCode = code ?? 0
      this.logger.debug(`Subprocess exited with code ${exitCode}`)
      this.emit('exit', { exitCode })
    })

    // Handle process errors
    this.childProcess.on('error', (error: Error) => {
      this.logger.error('Subprocess error', error)
      this.emit('error', error)
    })
  }

  private processOutput(data: string): string {
    // Basic output processing for cross-platform compatibility
    return data.replace(/\r\n/g, '\n').replace(/\r/g, '')
  }

  write(data: string): void {
    if (!this.childProcess.stdin || this.childProcess.stdin.destroyed) {
      return
    }

    // For interactive shells without PTY, we need to handle echo manually
    if (this.isInteractiveShell) {
      const charCode = data.charCodeAt(0)

      // Handle Enter key
      if (data === '\r' || data === '\n') {
        // Echo newline
        this.emit('data', '\r\n')
        // Send buffered command with newline
        this.childProcess.stdin.write(this.commandBuffer + '\n')
        this.commandBuffer = ''
        return
      }

      // Handle Backspace
      if (charCode === 127 || charCode === 8) {
        if (this.commandBuffer.length > 0) {
          this.commandBuffer = this.commandBuffer.slice(0, -1)
          // Send visual backspace sequence
          this.emit('data', '\b \b')
        }
        return
      }

      // Handle Ctrl+C
      if (charCode === 3) {
        this.commandBuffer = ''
        this.emit('data', '^C\r\n')
        this.childProcess.stdin.write(data)
        return
      }

      // Handle Ctrl+D
      if (charCode === 4) {
        this.childProcess.stdin.write(data)
        return
      }

      // Handle regular printable characters
      if (charCode >= 32 && charCode <= 126) {
        this.commandBuffer += data
        // Echo the character back
        this.emit('data', data)
        return
      }

      // Other control characters - send directly
      this.childProcess.stdin.write(data)
    } else {
      // Non-interactive mode, just pass through
      this.childProcess.stdin.write(data)
    }
  }

  resize(cols: number, rows: number): void {
    // Subprocess doesn't support true resize, but we store the values
    this.logger.debug(
      `Resize requested to ${cols}x${rows} but not supported in subprocess mode`
    )
  }

  kill(signal?: string): void {
    this.childProcess.kill((signal as NodeJS.Signals) || 'SIGTERM')
  }
}
