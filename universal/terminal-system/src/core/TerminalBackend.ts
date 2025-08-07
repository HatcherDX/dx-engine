import { Logger } from '../utils/logger'
import type { TerminalCapabilities } from './BackendDetector'
import { EventEmitter } from './EventEmitter'

export interface BackendSpawnOptions {
  shell?: string
  cwd?: string
  env?: Record<string, string>
  cols?: number
  rows?: number
  encoding?: BufferEncoding
}

export interface BackendProcess
  extends EventEmitter<{
    data: [string]
    exit: [{ exitCode: number }]
    error: [Error]
  }> {
  readonly pid: number
  write(data: string): void
  resize?(cols: number, rows: number): void
  kill(signal?: string): void
}

/**
 * Abstract base class for terminal backends
 */
export abstract class TerminalBackend {
  protected logger: Logger
  public abstract readonly capabilities: TerminalCapabilities
  public readonly name: string

  constructor(protected loggerName: string) {
    this.logger = new Logger(loggerName)
    this.name = loggerName
  }

  /**
   * Spawn a new terminal process
   */
  abstract spawn(options: BackendSpawnOptions): Promise<BackendProcess>

  /**
   * Check if this backend is available
   */
  abstract isAvailable(): Promise<boolean>

  /**
   * Get backend-specific environment variables
   */
  protected getBaseEnvironment(
    options: BackendSpawnOptions
  ): Record<string, string> {
    return {
      ...Object.fromEntries(
        Object.entries(process.env).filter(([, value]) => value !== undefined)
      ),
      ...options.env,
      // Terminal identification
      TERM: process.platform === 'win32' ? 'xterm' : 'xterm-256color',
      COLORTERM: 'truecolor',
      // Size information
      COLUMNS: (options.cols || 80).toString(),
      LINES: (options.rows || 24).toString(),
      // Application identification
      TERM_PROGRAM: 'Hatcher',
      TERM_PROGRAM_VERSION: '0.3.5',
      // Force color output
      FORCE_COLOR: '1',
      // UTF-8 support
      LC_ALL: 'en_US.UTF-8',
      LANG: 'en_US.UTF-8',
    }
  }
}
