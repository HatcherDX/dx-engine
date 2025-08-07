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

interface PtyProcess {
  pid: number
  onData(callback: (data: string) => void): void
  onExit(callback: (event: { exitCode: number }) => void): void
  onError?(callback: (error: Error) => void): void
  write(data: string): void
  resize?(cols: number, rows: number): void
  kill(signal?: string): void
}

/**
 * PTY spawn options interface
 */
interface PtySpawnOptions {
  name: string
  cols: number
  rows: number
  cwd: string
  env: Record<string, string>
  useConpty?: boolean
}

/**
 * Node-PTY backend implementation
 * Provides full PTY functionality with native terminal support
 */
export class NodePtyBackend extends TerminalBackend {
  public readonly capabilities: TerminalCapabilities = {
    backend: 'node-pty',
    supportsResize: true,
    supportsColors: true,
    supportsInteractivity: true,
    supportsHistory: true,
    reliability: 'high',
  }

  constructor() {
    super('NodePtyBackend')
  }

  async isAvailable(): Promise<boolean> {
    try {
      const pty = await import('node-pty')

      // Test basic functionality
      const testTerminal = pty.spawn('echo', ['test'], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: process.cwd(),
        env: this.getBaseEnvironment({}),
      })

      testTerminal.kill()
      this.logger.debug('node-pty test successful')
      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      this.logger.debug(`node-pty unavailable: ${errorMessage}`)
      return false
    }
  }

  async spawn(options: BackendSpawnOptions): Promise<BackendProcess> {
    try {
      const pty = await import('node-pty')
      const platformType = os.platform()

      const shell = options.shell || PlatformUtils.getDefaultShell()
      const shellArgs = PlatformUtils.getShellArgs()
      const env = this.getBaseEnvironment(options)

      const ptyOptions: PtySpawnOptions = {
        name: 'xterm-256color',
        cols: options.cols || 80,
        rows: options.rows || 24,
        cwd: options.cwd || PlatformUtils.getHomeDirectory(),
        env,
      }

      // Always include useConpty property on Windows for consistency
      if (platformType === 'win32') {
        ptyOptions.useConpty = this.shouldUseConPty()
      }

      this.logger.debug(`Spawning ${shell} with node-pty`, ptyOptions)

      const ptyProcess = pty.spawn(shell, shellArgs, ptyOptions)

      return new NodePtyProcess(ptyProcess, this.logger)
    } catch (error) {
      this.logger.error('Failed to spawn node-pty process', error as Error)
      throw error
    }
  }

  private shouldUseConPty(): boolean {
    try {
      const windowsRelease = os.release()
      const [major, , build] = windowsRelease.split('.').map(Number)

      // ConPTY requires Windows 10 1809+ (build 17763)
      return major > 10 || (major === 10 && build >= 17763)
    } catch {
      return false
    }
  }
}

/**
 * Node-PTY process wrapper
 */
class NodePtyProcess
  extends EventEmitter<{
    data: [string]
    exit: [{ exitCode: number }]
    error: [Error]
  }>
  implements BackendProcess
{
  public readonly pid: number

  constructor(
    private ptyProcess: PtyProcess,
    private logger: Logger
  ) {
    super()
    this.pid = ptyProcess.pid

    this.setupEvents()
  }

  private setupEvents(): void {
    // Simple data passthrough - NO FILTERING
    this.ptyProcess.onData((data: string) => {
      try {
        // Log data chunks to diagnose fragmentation
        if (data.length > 100) {
          this.logger.debug(`[PTY] Large chunk received: ${data.length} chars`)
        } else {
          this.logger.debug(
            `[PTY] Small chunk: "${data.replace(/\r/g, '\\r').replace(/\n/g, '\\n')}"`
          )
        }

        // Direct passthrough without any modification
        this.emit('data', data)
      } catch (error) {
        this.logger.error('Failed to emit terminal data', error as Error)
      }
    })

    // Handle process exit
    this.ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
      this.logger.debug(`node-pty process exited with code ${exitCode}`)
      this.emit('exit', { exitCode })
    })

    // Handle errors if available
    if (
      this.ptyProcess.onError &&
      typeof this.ptyProcess.onError === 'function'
    ) {
      this.ptyProcess.onError((error: Error) => {
        this.logger.error('node-pty process error', error)
        this.emit('error', error)
      })
    }
  }

  write(data: string): void {
    this.ptyProcess.write(data)
  }

  resize(cols: number, rows: number): void {
    if (this.ptyProcess.resize) {
      this.ptyProcess.resize(cols, rows)
      this.logger.debug(`Resized to ${cols}x${rows}`)
    }
  }

  kill(signal?: string): void {
    this.ptyProcess.kill(signal)
  }
}
