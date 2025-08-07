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

      return new SubprocessProcess(childProcessInstance, this.logger)
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

  constructor(
    private childProcess: childProcess.ChildProcess,
    private logger: Logger
  ) {
    super()
    this.pid = childProcess.pid || 0

    this.setupEvents()
  }

  private setupEvents(): void {
    // Handle stdout data
    this.childProcess.stdout?.on('data', (data: Buffer) => {
      const processed = this.processOutput(data.toString())
      this.emit('data', processed)
    })

    // Handle stderr data
    this.childProcess.stderr?.on('data', (data: Buffer) => {
      const processed = this.processOutput(data.toString())
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
    if (this.childProcess.stdin && !this.childProcess.stdin.destroyed) {
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
